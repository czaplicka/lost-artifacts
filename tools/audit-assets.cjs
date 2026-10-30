#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const GROUP={image:'backgrounds',audio:'audio',json:'json',tilemap:'tilemaps',video:'videos',css:'css',html:'html'};
const IG=new Set(['backgrounds','sidequests','npcPortraits','ui','artifacts','newspapers','suspects','wantedPosters','suspectThumbnails','csi','portraits']);
const EXT={'.png':'image','.jpg':'image','.jpeg':'image','.webp':'image','.gif':'image','.svg':'image','.avif':'image','.bmp':'image','.mp3':'audio','.ogg':'audio','.wav':'audio','.m4a':'audio','.aac':'audio','.flac':'audio','.mp4':'video','.webm':'video','.ogv':'video','.json':'json','.css':'css','.html':'html','.htm':'html'};
const OLD=new Set(['.png','.jpg','.jpeg']);
const slash=s=>s.split(path.sep).join('/');
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const inside=(r,p)=>{const v=path.relative(r,p);return !v||(!v.startsWith('..'+path.sep)&&v!=='..'&&!path.isAbsolute(v));};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function oneEdit(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,n=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++n>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return n+a.length-i+b.length-j<=1;}
function runAudit(options={}){
 const root=fs.realpathSync(path.resolve(options.root||process.cwd()));
 const docs=new Map(),issues=[],changes=[],disk=new Set(),types=new Map(),jsons=new Map(),catalog=new Map(),claimed=new Set(),pairs=new Map(),unsupported=[],external=[];
 let structural=false;
 const issue=(level,code,details={})=>issues.push({level,code,...details});
 const fatal=(code,details)=>{structural=true;issue('error',code,details);};
 const change=(code,details)=>changes.push({code,...details});
 function local(raw){
  if(typeof raw!=='string'||!raw.trim())throw Error('Invalid URL');
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw))return null;
  const clean=decodeURIComponent(raw.split(/[?#]/)[0].replace(/\\/g,'/')).replace(/^\/+/,''),p=path.resolve(root,clean);
  if(!inside(root,p))throw Error('Path escapes project');return slash(path.relative(root,p));
 }
 function read(file){
  if(docs.has(file))return docs.get(file);
  try{const p=path.join(root,file);if(!inside(root,fs.realpathSync(p)))throw Error('Symlink escapes project');const original=fs.readFileSync(p,'utf8'),data=JSON.parse(original.replace(/^\uFEFF/,''));const d={file,original,data};docs.set(file,d);return d;}
  catch(e){fatal('invalid_manifest',{file,message:e.message});return null;}
 }
 const indexDoc=read('assets/manifests/index.json'),index=indexDoc?.data;
 if(!index||index.version!==2||!Array.isArray(index.files)||!plain(index.startup)||!plain(index.bundles)){fatal('invalid_index',{});return finish();}
 const assetDir=path.join(root,'assets');if(!fs.existsSync(assetDir)||!inside(root,fs.realpathSync(assetDir))){fatal('invalid_assets_directory',{});return finish();}
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name),file=slash(path.relative(root,p));if(e.isSymbolicLink()){issue('warning','symlink_skipped',{file});continue;}if(e.isDirectory()){if(file==='assets/manifests'||/^(?:\.git|node_modules|backups?|manifest-backups)$/i.test(e.name))continue;walk(p);}else if(e.isFile())disk.add(file);}}
 walk(assetDir);
 for(const file of disk){let type=EXT[path.extname(file).toLowerCase()];if(!type){unsupported.push(file);continue;}if(!fs.statSync(path.join(root,file)).size){issue('error','empty_asset',{file});continue;}if(type==='json'){try{const d=JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));jsons.set(file,d);if(d?.type==='map'&&Array.isArray(d.layers)&&Array.isArray(d.tilesets))type='tilemap';}catch(e){issue('error','invalid_asset_json',{file,message:e.message});continue;}}types.set(file,type);}
 const parts=[],listed=new Set();
 for(const raw of index.files){try{const file=local(raw);if(!file||!file.startsWith('assets/manifests/'))throw Error('Invalid manifest location');if(listed.has(file)){change('deduplicate_manifest_part',{file});continue;}listed.add(file);const d=read(file);if(d){if(!Array.isArray(d.data?.assets))fatal('invalid_manifest_part',{file});else parts.push(d);}}catch(e){fatal('invalid_manifest_url',{url:raw,message:e.message});}}
 index.files=[...listed];
 // Read every direct manifest JSON, including unlisted parts, before any deletion.
 for(const e of fs.readdirSync(path.join(root,'assets/manifests'),{withFileTypes:true})){
  const file='assets/manifests/'+e.name;
  if(e.isSymbolicLink()){fatal('manifest_symlink',{file});continue;}
  if(!e.isFile()||!e.name.endsWith('.json')||file==='assets/manifests/index.json'||listed.has(file))continue;
  const d=read(file);if(d&&Array.isArray(d.data?.assets)){parts.push(d);listed.add(file);index.files.push(file);change('register_manifest_part',{file});}
 }
 function valid(a,file){if(types.get(file)!==a.type)return false;const m=/^newspaper_(time|daily|tabloid)_/.exec(a.key);if(m){if(!file.toLowerCase().split('/').includes(m[1]))return false;return m[1]==='time'?Array.isArray(jsons.get(file)?.coverLines):Array.isArray(jsons.get(file)?.articles);}return true;}
 function candidates(a,url){
  const lower=url.toLowerCase(),dir=path.posix.dirname(lower),stem=path.posix.basename(lower,path.posix.extname(lower)),pool=[...types.keys()].filter(f=>valid(a,f));
  const exact=pool.filter(f=>f.toLowerCase()===lower);if(exact.length)return exact;
  const same=pool.filter(f=>path.posix.dirname(f).toLowerCase()===dir&&path.posix.basename(f,path.posix.extname(f)).toLowerCase()===stem);if(same.length)return same;
  if(a.type==='json'||a.type==='tilemap')return [];
  const original=dir.split('/');return pool.filter(f=>{if(path.posix.basename(f).toLowerCase()!==path.posix.basename(lower))return false;const other=path.posix.dirname(f).toLowerCase().split('/');if(other.length!==original.length)return false;let n=0;for(let i=0;i<other.length;i++)if(other[i]!==original[i]){if(!oneEdit(other[i],original[i]))return false;n++;}return n===1;});
 }
 const webps=[...types.keys()].filter(f=>path.extname(f).toLowerCase()==='.webp'&&types.get(f)==='image');
 const webpValid=new Map();
 function checkedWebp(file){
  if(webpValid.has(file))return webpValid.get(file);
  const fd=fs.openSync(path.join(root,file),'r'),header=Buffer.alloc(12);let n;try{n=fs.readSync(fd,header,0,12,0);}finally{fs.closeSync(fd);}
  const ok=n===12&&header.toString('ascii',0,4)==='RIFF'&&header.toString('ascii',8,12)==='WEBP'&&fs.statSync(path.join(root,file)).size>12;
  webpValid.set(file,ok);if(!ok)issue('error','invalid_webp_header',{file,message:'Source image will not be deleted.'});return ok;
 }
 for(const file of disk){
  const ext=path.extname(file).toLowerCase();if(!OLD.has(ext))continue;
  const stem=file.slice(0,-path.extname(file).length).toLowerCase();const matches=webps.filter(f=>f.toLowerCase()===stem+'.webp');
  if(matches.length>1){issue('warning','ambiguous_webp',{file,candidates:matches});continue;}
  if(matches.length===1&&checkedWebp(matches[0]))pairs.set(file,matches[0]);
 }
 const suffixOf=raw=>raw.match(/[?#].*$/)?.[0]||'';
 for(const doc of parts)for(const [position,a]of doc.data.assets.entries()){
  if(!plain(a)||!GROUP[a.type]||typeof a.key!=='string'||!a.key||!a.url){fatal('invalid_asset_entry',{file:doc.file,position});continue;}
  const id=`${a.type}:${a.key}`;if(catalog.has(id)){fatal('duplicate_asset_key',{id,file:doc.file});continue;}catalog.set(id,{a,doc});
  const groups=a.groups??[GROUP[a.type]];if(!Array.isArray(groups)||!groups.length||groups.some(g=>a.type==='image'?!IG.has(g):g!==GROUP[a.type]))fatal('invalid_groups',{id,file:doc.file});
  const urls=Array.isArray(a.url)?a.url:[a.url];if(!urls.length){fatal('empty_urls',{id});continue;}
  for(const [i,raw]of urls.entries()){
   let url;try{url=local(raw);}catch(e){fatal('invalid_url',{id,url:raw,message:e.message});continue;}
   if(url===null){external.push({id,url:raw});continue;}let target=null;
   if(disk.has(url)){
    if(a.type!=='image'&&pairs.has(url))fatal('non_image_reference_to_source',{id,url});
    claimed.add(url);if(types.has(url)&&!valid(a,url))issue('error','type_or_content_mismatch',{id,url});
    if(a.type==='image'&&pairs.has(url)){target=pairs.get(url);change('prefer_webp',{file:doc.file,id,from:raw,to:target});}
   }else{
    const matches=candidates(a,url);
    if(matches.length===1){target=matches[0];if(a.type==='image')target=pairs.get(target)||target;change('correct_url',{file:doc.file,id,from:raw,to:target});}
    else issue('error',matches.length?'ambiguous_missing_file':'missing_file',{id,url,file:doc.file,candidates:matches});
   }
   if(target){claimed.add(target);const value=target+suffixOf(raw);if(Array.isArray(a.url))a.url[i]=value;else a.url=value;}
  }
 }
 // Rewrite remaining literal asset URLs in manifest JSON only; never touch game JS/CSS/data.
 function replaceManifestPaths(value){
  if(typeof value==='string'){
   let url;try{url=local(value);}catch{return value;}
   if(url&&pairs.has(url))return pairs.get(url)+suffixOf(value);return value;
  }
  if(Array.isArray(value))return value.map(replaceManifestPaths);
  if(plain(value)){for(const k of Object.keys(value))value[k]=replaceManifestPaths(value[k]);}return value;
 }
 for(const doc of docs.values())doc.data=replaceManifestPaths(doc.data);
 for(const [bundle,refs]of Object.entries(index.bundles)){
  if(!Array.isArray(refs)){fatal('invalid_bundle',{bundle});continue;}
  if(new Set(refs).size!==refs.length){index.bundles[bundle]=[...new Set(refs)];change('deduplicate_bundle',{bundle});}
  for(const ref of refs)if(!catalog.has(ref))fatal('unknown_bundle_reference',{bundle,ref});
 }
 for(const [group,refs]of Object.entries(index.startup)){
  if(!Array.isArray(refs)){fatal('invalid_startup',{group});continue;}
  if(new Set(refs).size!==refs.length){index.startup[group]=[...new Set(refs)];change('deduplicate_startup',{group});}
  for(const ref of refs){const r=catalog.get(ref);if(!r){fatal('unknown_startup_reference',{group,ref});continue;}const a=r.a;if(!(a.type==='image'?IG.has(group):group===GROUP[a.type])){fatal('startup_type_mismatch',{group,ref});continue;}const groups=a.groups??[GROUP[a.type]];if(!groups.includes(group)){a.groups=[...groups,group];change('add_startup_group',{file:r.doc.file,id:ref,group});}}
 }
 const variant=f=>path.posix.dirname(f).toLowerCase()+'/'+path.posix.basename(f,path.posix.extname(f)).toLowerCase()+'|'+types.get(f);
 const variants=new Set([...claimed].map(variant));let auto=docs.get('assets/manifests/auto-discovered.json');const newRefs=[];
 for(const [file,type]of [...types].sort(([a],[b])=>Number(path.extname(b).toLowerCase()==='.webp')-Number(path.extname(a).toLowerCase()==='.webp')||a.localeCompare(b))){
  if(pairs.has(file)||claimed.has(file))continue;
  if(type==='image'&&variants.has(variant(file))){issue('info','alternate_format',{file});continue;}
  issue('info','not_in_manifest',{file,type});if(!options.add)continue;
  const key=path.posix.basename(file,path.posix.extname(file)),id=`${type}:${key}`;if(catalog.has(id)){issue('warning','key_collision_not_added',{file,key});continue;}
  if(!auto){const file='assets/manifests/auto-discovered.json';auto={file,original:null,data:{assets:[]}};docs.set(file,auto);index.files.push(file);change('register_manifest_part',{file});}
  const a={key,url:file,type,groups:[GROUP[type]]};if(type==='video')a.noAudio=false;auto.data.assets.push(a);catalog.set(id,{a,doc:auto});newRefs.push(id);claimed.add(file);variants.add(variant(file));change('register_asset',{file:auto.file,id,url:file});
 }
 if(newRefs.length){if(index.bundles['auto:discovered']!==undefined&&!Array.isArray(index.bundles['auto:discovered']))fatal('invalid_auto_bundle',{});else index.bundles['auto:discovered']=[...new Set([...(index.bundles['auto:discovered']||[]),...newRefs])];}
 const bound=new Set([...Object.values(index.bundles).filter(Array.isArray).flat(),...Object.values(index.startup).filter(Array.isArray).flat()]);for(const id of catalog.keys())if(!bound.has(id))issue('warning','registered_but_unbound',{id});
 for(const [from,to]of pairs)change('archive_and_delete_source_image',{from,to});
 return finish();
 function finish(){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
  const pending=[...docs.values()].filter(d=>d.original===null||JSON.stringify(JSON.parse(d.original.replace(/^\uFEFF/,'')))!==JSON.stringify(d.data));
  const deletions=[...pairs].map(([file,replacement])=>({file,replacement,hash:hash(path.join(root,file)),replacementHash:hash(path.join(root,replacement))}));
  let applied=false,backup=null;
  if(options.fix&&!structural&&(pending.length||deletions.length)){
   for(const d of pending){const p=path.join(root,d.file);if(d.original===null?fs.existsSync(p):fs.readFileSync(p,'utf8')!==d.original)throw Error('Manifest changed during audit: '+d.file);}
   for(const d of deletions)if(hash(path.join(root,d.file))!==d.hash||hash(path.join(root,d.replacement))!==d.replacementHash)throw Error('Image changed during audit: '+d.file);
   backup=path.join(root,'manifest-backups','asset-audit-v4-'+stamp);fs.mkdirSync(backup,{recursive:true});
   for(const d of pending)if(d.original!==null){const p=path.join(backup,d.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,d.original);}
   for(const d of deletions){const p=path.join(backup,d.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,d.file),p);if(hash(p)!==d.hash)throw Error('Backup verification failed: '+d.file);}
   fs.writeFileSync(path.join(backup,'backup.json'),JSON.stringify({version:4,manifests:pending.map(d=>({file:d.file,existed:d.original!==null})),images:deletions},null,2));
   const written=[],deleted=[];
   try{
    for(const d of [...pending].sort((a,b)=>Number(a.file==='assets/manifests/index.json')-Number(b.file==='assets/manifests/index.json'))){const p=path.join(root,d.file),temp=p+'.audit-tmp';fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(temp,JSON.stringify(d.data,null,2)+'\n');try{fs.renameSync(temp,p);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}written.push(d);}
    for(const d of deletions){if(hash(path.join(root,d.file))!==d.hash||hash(path.join(root,d.replacement))!==d.replacementHash)throw Error('Image changed before deletion: '+d.file);fs.unlinkSync(path.join(root,d.file));deleted.push(d);}
    applied=true;
   }catch(e){
    for(const d of deleted)fs.copyFileSync(path.join(backup,d.file),path.join(root,d.file));
    for(const d of written.reverse()){const p=path.join(root,d.file);if(d.original===null)fs.rmSync(p,{force:true});else fs.writeFileSync(p,d.original);}
    throw e;
   }
  }
  const report={version:4,mode:options.fix?'fix':'report',applied,structuralWriteBlock:structural,remainingErrors:issues.filter(i=>i.level==='error').length,changes,issues,deletions,deletedCount:applied?deletions.length:0,unsupported,externalUrlsNotChecked:external,backup,changedFiles:pending.map(d=>d.file)};
  const dir=path.join(root,'asset-audit-reports');fs.mkdirSync(dir,{recursive:true});report.reportFile=path.join(dir,stamp+'.json');fs.writeFileSync(report.reportFile,JSON.stringify(report,null,2)+'\n');return report;
 }
}
function main(){const options={},args=process.argv.slice(2);for(let i=0;i<args.length;i++){if(args[i]==='--fix')options.fix=true;else if(args[i]==='--check')options.fix=false;else if(args[i]==='--add')options.add=true;else if(args[i]==='--root'){if(!args[i+1])throw Error('Missing root');options.root=args[++i];}else if(args[i]==='--help'){console.log('node tools/audit-assets.cjs [--fix] [--add] [--root PROJECT]\nDefault: report only. --fix updates manifests and archives/removes PNG/JPG/JPEG when a same-folder WEBP exists.\nGame JS/CSS and non-manifest JSON are NOT edited or checked for references.');return;}else throw Error('Unknown option '+args[i]);}
 const r=runAudit(options);console.log('\nASSET AUDIT v4: '+(r.applied?'SAFE CHANGES APPLIED':options.fix?'NO CHANGES':'REPORT ONLY'));console.log(`Operations: ${r.changes.length}; deleted images: ${r.deletedCount}; remaining errors: ${r.remainingErrors}; structural block: ${r.structuralWriteBlock}`);for(const c of r.changes)console.log((r.applied?'APPLIED ':'PLAN ')+JSON.stringify(c));for(const i of r.issues.filter(i=>i.level!=='info'))console.log(i.level.toUpperCase()+' '+JSON.stringify(i));console.log('Report: '+r.reportFile);if(r.backup)console.log('Verified backups: '+r.backup);console.log('Only manifests/index and superseded image files are modified. No game-code rewrite.');process.exitCode=r.remainingErrors?2:(!options.fix&&r.changes.length?1:0);
}
module.exports={runAudit};if(require.main===module){try{main();}catch(e){console.error('[Asset audit v4] '+e.message);process.exitCode=2;}}
