#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const INDEX = 'assets/manifests/index.json';
const SOURCE = 'assets/manifests/source';
const CONFIG = SOURCE + '/project.json';
const STATE = SOURCE + '/state.json';
const TYPES = {image:'backgrounds',audio:'audio',json:'json',tilemap:'tilemaps',video:'videos',css:'css',html:'html'};
const IMAGES = new Set(['backgrounds','sidequests','npcPortraits','ui','artifacts','newspapers','suspects','wantedPosters','suspectThumbnails','csi','portraits']);
const TOOLS = ['tools/scan-assets.cjs','tools/audit-assets.cjs'];
const json = x => JSON.stringify(x,null,2)+'\n';
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const canonical = x => Array.isArray(x) ? x.map(canonical) : plain(x) ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])) : x;
const equal = (a,b) => JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const must = (ok,msg) => {if(!ok)throw Error(msg);};
function context(root=process.cwd()) {
 root=fs.realpathSync(root);
 function full(relative) {
  must(typeof relative==='string' && relative && !path.isAbsolute(relative) && !relative.includes('\\'),'Invalid relative path: '+relative);
  const p=path.resolve(root,relative), rel=path.relative(root,p);
  must(rel && rel!=='..' && !rel.startsWith('..'+path.sep) && !path.isAbsolute(rel),'Path outside project: '+relative);
  let current=root;
  for(const part of rel.split(path.sep)){current=path.join(current,part);if(fs.existsSync(current))must(!fs.lstatSync(current).isSymbolicLink(),'Symlink refused: '+relative);}
  return p;
 }
 const raw = f => fs.readFileSync(full(f));
 const read = f => JSON.parse(raw(f).toString('utf8').replace(/^\uFEFF/,''));
 return {root,full,raw,read,exists:f=>fs.existsSync(full(f))};
}
function local(raw) {
 must(typeof raw==='string' && raw.length,'Invalid asset URL');
 if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw))return null;
 return decodeURIComponent(raw.split(/[?#]/)[0]).replace(/^\/+|^\.\//g,'');
}
function validate(c,index,allowedMissing=[]) {
 must(index.version===2 && Array.isArray(index.files),'Expected manifest version 2');
 must(plain(index.startup) && plain(index.bundles),'Invalid startup/bundles');
 const catalog=new Map(), warnings=[], missing=new Set(), external=[];
 const listed=new Set();
 for(const file of index.files){
  must(typeof file==='string' && file.startsWith('assets/manifests/') && !listed.has(file),'Repeated/invalid manifest part: '+file);
  listed.add(file);
  const part=c.read(file);must(Array.isArray(part.assets),'Missing assets array: '+file);
  for(const a of part.assets){
   must(plain(a) && Object.hasOwn(TYPES,a.type) && typeof a.key==='string' && a.key && a.url,'Invalid asset in '+file);
   const id=a.type+':'+a.key;must(!catalog.has(id),'Duplicate asset key: '+id);
   const groups=a.groups??[TYPES[a.type]];
   must(Array.isArray(groups)&&groups.length&&groups.every(g=>a.type==='image'?IMAGES.has(g):g===TYPES[a.type]),'Invalid groups: '+id);
   catalog.set(id,{...a,groups});
   const urls=Array.isArray(a.url)?a.url:[a.url];must(urls.length,'Empty URLs: '+id);
   for(const u of urls){const p=local(u);if(p===null){external.push(u);continue;}if(!c.exists(p)||!fs.statSync(c.full(p)).isFile())missing.add(p);}
  }
 }
 for(const [name,refs] of Object.entries(index.bundles)){
  must(Array.isArray(refs),'Invalid bundle: '+name);
  if(new Set(refs).size!==refs.length)warnings.push('Repeated references preserved: '+name);
  for(const ref of refs)must(catalog.has(ref),'Unknown reference '+ref+' in '+name);
 }
 for(const [group,refs] of Object.entries(index.startup)){
  must(Array.isArray(refs),'Invalid startup group: '+group);
  for(const ref of refs){must(catalog.has(ref),'Unknown startup reference: '+ref);must(catalog.get(ref).groups.includes(group),'Startup group mismatch: '+ref+' / '+group);}
 }
 const newMissing=[...missing].filter(p=>!allowedMissing.includes(p));
 return {catalog,missing:[...missing].sort(),newMissing,warnings,external:[...new Set(external)]};
}
function startupBundle(startup){return Object.values(startup).flat();}
function bucket(name){
 if(name==='shared')return 'shared';
 if(name.startsWith('city:'))return 'cities';
 if(name.startsWith('crime:'))return 'crime-scenes';
 if(name.startsWith('auto:'))return 'legacy-auto';
 if(/Analysis|Fingerprint|Shoeprint|Dna|CrimeLab/.test(name))return 'crime-lab';
 if(/DetectiveOffice|HomeCity|HomeTown|PI[A-Z]|SpyShop|BusinessCenter/.test(name))return 'home-town';
 if(/OfficeScene|ArchiveScene|AgencyStorage|HotelScene|NewsstandScene|ShopScene|Highscore/.test(name))return 'agency';
 return 'story-and-other';
}
function assemble(c){
 const cfg=c.read(CONFIG);must(cfg.version===1,'Unsupported workspace version');
 must(plain(cfg.indexFields)&&Array.isArray(cfg.bundleFiles),'Invalid project.json');
 must(typeof cfg.startupFile==='string'&&cfg.startupFile.startsWith(SOURCE+'/'),'Invalid startupFile');
 const startup=c.read(cfg.startupFile), bundles=Object.create(null),seen=new Set();
 for(const file of cfg.bundleFiles){
  must(typeof file==='string'&&file.startsWith(SOURCE+'/bundles/')&&!seen.has(file),'Invalid/repeated bundle source: '+file);seen.add(file);
  const doc=c.read(file);must(plain(doc.bundles),'Expected bundles object: '+file);
  for(const [name,refs]of Object.entries(doc.bundles)){must(!Object.hasOwn(bundles,name)&&name!=='startup','Duplicate/reserved bundle: '+name);bundles[name]=refs;}
 }
 bundles.startup=startupBundle(startup);
 const ordered=Object.create(null);
 for(const name of cfg.bundleOrder||[])if(Object.hasOwn(bundles,name))ordered[name]=bundles[name];
 for(const name of Object.keys(bundles).sort())if(!Object.hasOwn(ordered,name))ordered[name]=bundles[name];
 return {...cfg.indexFields,startup,bundles:ordered};
}
function transaction(c,changes,label){
 const pending=Object.entries(changes).filter(([f,data])=>!c.exists(f)||!c.raw(f).equals(Buffer.from(data)));
 if(!pending.length)return null;
 const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
 const folder='manifest-backups/workspace-'+stamp;
 const backup={version:1,label,files:pending.map(([file,data])=>({file,before:c.exists(file)?c.raw(file).toString('base64'):null,afterHash:hash(data)}))};
 fs.mkdirSync(c.full(folder),{recursive:true});
 fs.writeFileSync(c.full(folder+'/backup.json'),json(backup),{flag:'wx'});
 const written=[];
 try{
  for(const [file,data]of pending){
   const dest=c.full(file);fs.mkdirSync(path.dirname(dest),{recursive:true});
   const temp=dest+'.workspace-'+crypto.randomBytes(4).toString('hex')+'.tmp';
   try{fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,dest);written.push(file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  }
 }catch(e){
  for(const file of written.reverse()){const item=backup.files.find(x=>x.file===file);if(item.before===null)fs.rmSync(c.full(file),{force:true});else fs.writeFileSync(c.full(file),Buffer.from(item.before,'base64'));}
  throw e;
 }
 return folder;
}
function guard(c,file){
 const original=c.raw(file).toString('utf8');
 must(!original.includes('MANIFEST_WORKSPACE_GUARD'),'Tool already guarded: '+file);
 const code="\n// MANIFEST_WORKSPACE_GUARD\nif (require('node:fs').existsSync(require('node:path').join(__dirname, '../"+CONFIG+"'))) {\n  throw new Error('Manifest workspace active. Use node tools/manifest-workspace.cjs scan/check/build. Legacy tool blocked to protect generated index.');\n}\n";
 const strict=/(['"\x22])use strict\1;/;
 if(strict.test(original))return original.replace(strict,match=>match+code);
 return original.startsWith('#!')?original.replace(/^(#![^\n]*\n)/,'$1'+code):code+original;
}
function summary(report){return {assets:report.catalog.size,missingFiles:report.missing,warnings:report.warnings,externalURLsNotChecked:report.external};}
function init(c,dry=false){
 must(!c.exists(SOURCE),'Source directory already exists; initialization refused. Use check.');
 const before=c.read(INDEX),report=validate(c,before);
 must(equal(before.bundles.startup,startupBundle(before.startup)),'startup and bundles.startup differ. No changes made; reconcile explicitly first.');
 const grouped=Object.create(null);
 for(const [name,refs]of Object.entries(before.bundles)){if(name==='startup')continue;const b=bucket(name);grouped[b]??=Object.create(null);grouped[b][name]=refs;}
 const files=Object.keys(grouped).sort().map(n=>SOURCE+'/bundles/'+n+'.json');
 const {startup,bundles,...indexFields}=before;
 const cfg={version:1,indexFields,startupFile:SOURCE+'/startup.json',bundleFiles:files,bundleOrder:Object.keys(bundles)};
 const changes={};changes[CONFIG]=json(cfg);changes[cfg.startupFile]=json(startup);
 for(const file of files){const name=path.basename(file,'.json');changes[file]=json({bundles:grouped[name]});}
 const view={...c,read:f=>Object.hasOwn(changes,f)?JSON.parse(changes[f]):c.read(f)};
 const generated=assemble(view);must(equal(before,generated),'Semantic equivalence failed; no changes made.');
 const protectedTools={};
 for(const f of TOOLS)if(c.exists(f)){changes[f]=guard(c,f);protectedTools[f]=hash(changes[f]);}
 changes[STATE]=json({version:1,lastIndexHash:hash(c.raw(INDEX)),allowedMissing:report.missing,protectedTools});
 if(dry)return {mode:'dry-run',equivalent:true,indexUnchanged:true,plannedFiles:Object.keys(changes),...summary(report)};
 const backup=transaction(c,changes,'init');
 return {mode:'initialized',equivalent:true,indexUnchanged:true,backup,...summary(report)};
}
function verifyGuards(c,state){for(const [file,expected]of Object.entries(state.protectedTools||{}))must(c.exists(file)&&hash(c.raw(file))===expected,'Legacy tool changed after migration: '+file+'. Reconcile before building.');}
function check(c,write=false){
 must(c.exists(CONFIG),'Run init first.');const state=c.read(STATE);must(state.version===1,'Invalid state');verifyGuards(c,state);
 must(hash(c.raw(INDEX))===state.lastIndexHash,'Generated index was edited outside the workspace. No overwrite. Compare with source files first.');
 const next=assemble(c), report=validate(c,next,state.allowedMissing||[]);
 must(!report.newMissing.length,'New missing asset files: '+report.newMissing.join(', '));
 const equivalent=equal(next,c.read(INDEX));
 if(!write)return {mode:'check',upToDate:equivalent,...summary(report)};
 const changes={};
 if(!equivalent){const output=json(next);changes[INDEX]=output;changes[STATE]=json({...state,lastIndexHash:hash(output)});}
 const backup=transaction(c,changes,'build');
 return {mode:'build',changed:!equivalent,backup,...summary(report)};
}
function scan(c){
 const index=c.exists(CONFIG)?assemble(c):c.read(INDEX);
 const state=c.exists(STATE)?c.read(STATE):{};
 const report=validate(c,index,state.allowedMissing||[]),known=new Set();
 for(const a of report.catalog.values())for(const u of Array.isArray(a.url)?a.url:[a.url]){const p=local(u);if(p)known.add(p);}
 const ext=new Set(['.webp','.png','.jpg','.jpeg','.svg','.gif','.avif','.mp3','.wav','.ogg','.m4a','.json','.css','.html','.mp4','.webm']);
 const unregistered=[];
 function walk(rel){for(const e of fs.readdirSync(c.full(rel),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(e.isSymbolicLink()||e.name.startsWith('.')||/^(node_modules|backups?|manifest-backups)$/i.test(e.name))continue;
  const f=rel+'/'+e.name;if(f==='assets/manifests')continue;
  if(e.isDirectory())walk(f);else if(e.isFile()&&ext.has(path.extname(f).toLowerCase())&&!known.has(f))unregistered.push(f);
 }}walk('assets');
 return {mode:'scan-report-only',...summary(report),unregistered,notice:'No keys inferred, no bundles modified, no files deleted. Unregistered does not mean unused.'};
}
function restore(c,folder){
 must(typeof folder==='string'&&folder.startsWith('manifest-backups/workspace-'),'Expected a workspace backup folder');
 const b=c.read(folder.replace(/\/$/,'')+'/backup.json');must(b.version===1&&Array.isArray(b.files),'Invalid backup');
 const seen=new Set();
 for(const f of b.files){must(!seen.has(f.file),'Duplicate backup path');seen.add(f.file);c.full(f.file);must(c.exists(f.file)&&hash(c.raw(f.file))===f.afterHash,'File changed since backup; refusing restore: '+f.file);}
 const recovery={version:1,files:b.files.map(f=>({file:f.file,data:c.raw(f.file).toString('base64')}))};
 fs.writeFileSync(c.full(folder+'/before-restore-'+Date.now()+'.json'),json(recovery));
 const done=[];
 try{for(const f of [...b.files].reverse()){if(f.before===null)fs.unlinkSync(c.full(f.file));else fs.writeFileSync(c.full(f.file),Buffer.from(f.before,'base64'));done.push(f.file);}}
 catch(e){for(const file of done){const x=recovery.files.find(f=>f.file===file);fs.writeFileSync(c.full(file),Buffer.from(x.data,'base64'));}throw e;}
 // Remove only empty workspace source directories, so init may be run again.
 function clean(rel){if(!c.exists(rel))return;for(const e of fs.readdirSync(c.full(rel),{withFileTypes:true}))if(e.isDirectory()&&!e.isSymbolicLink())clean(rel+'/'+e.name);if(!fs.readdirSync(c.full(rel)).length)fs.rmdirSync(c.full(rel));}
 clean(SOURCE);
 return {mode:'restored',backup:folder,files:done};
}
function main(){
 const args=process.argv.slice(2),command=args.shift()||'check';let root=process.cwd(),dry=false,folder;
 while(args.length){const a=args.shift();if(a==='--root'){root=args.shift();must(root,'Missing --root');}else if(a==='--dry-run')dry=true;else if(command==='restore'&&!folder)folder=a;else throw Error('Unknown argument: '+a);}
 const c=context(root);let result;
 if(command==='init')result=init(c,dry);
 else if(command==='check')result=check(c);
 else if(command==='build')result=check(c,true);
 else if(command==='scan')result=scan(c);
 else if(command==='restore')result=restore(c,folder);
 else throw Error('Usage: node tools/manifest-workspace.cjs init [--dry-run] | check | build | scan | restore BACKUP [--root PROJECT]');
 console.log(JSON.stringify(result,null,2));
 if(command==='check'&&!result.upToDate)process.exitCode=1;
}
module.exports={context,init,check,scan,restore,assemble,validate,equal};
if(require.main===module){try{main();}catch(e){console.error('[manifest-workspace] '+e.message);process.exitCode=2;}}
