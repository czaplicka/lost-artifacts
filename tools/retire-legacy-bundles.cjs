#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CONFIG='assets/manifests/source/project.json',INDEX='assets/manifests/index.json',STATE='assets/manifests/source/state.json';
const LEGACY='assets/manifests/source/bundles/legacy/',ARCHIVE='assets/manifests/source/archive/legacy-bundles/';
const json=x=>JSON.stringify(x,null,2)+'\n';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const must=(ok,msg)=>{if(!ok)throw Error(msg);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>a===null?b===null:b!==null&&a.equals(b);
function env(root=process.cwd()){
 root=fs.realpathSync(path.resolve(root));
 for(const f of ['tools/manifest-workspace.cjs','tools/catalog-sources.cjs','tools/check-manifest-links.cjs'])must(fs.existsSync(path.join(root,f)),'Missing '+f+'. Complete the earlier stages first.');
 let links;try{links=require(path.join(root,'tools/check-manifest-links.cjs'));}catch(e){throw Error('Cannot load check-manifest-links.cjs: '+e.message);}
 const ws=require(path.join(root,'tools/manifest-workspace.cjs')),catalogs=require(path.join(root,'tools/catalog-sources.cjs'));
 for(const n of ['context','assemble','equal'])must(typeof ws[n]==='function','Unsupported workspace API: '+n);
 must(typeof catalogs.build==='function'&&typeof links.audit==='function','Unsupported tool API');
 return {root,ws,catalogs,links,c:ws.context(root)};
}
const raw=(c,f)=>c.exists(f)?c.raw(f):null;
function watch(c,files){return new Map([...new Set([CONFIG,INDEX,STATE,...files])].map(f=>[f,raw(c,f)]));}
function atomic(c,f,data){const p=c.full(f);fs.mkdirSync(path.dirname(p),{recursive:true});const t=p+'.retire-'+crypto.randomBytes(5).toString('hex')+'.tmp';try{fs.writeFileSync(t,data,{flag:'wx'});fs.renameSync(t,p);}finally{if(fs.existsSync(t))fs.unlinkSync(t);}}
function apply(c,entries){
 const done=[];
 try{for(const e of [...entries.filter(e=>e.after!==null),...entries.filter(e=>e.after===null)]){must(same(raw(c,e.file),e.before),'File changed before write: '+e.file);if(e.after===null)fs.unlinkSync(c.full(e.file));else atomic(c,e.file,e.after);done.push(e);}}
 catch(error){const errors=[];for(const e of done.reverse())try{if(e.before===null)fs.rmSync(c.full(e.file),{force:true});else atomic(c,e.file,e.before);}catch(x){errors.push(x.message);}if(errors.length)throw Error(error.message+'; rollback problems: '+errors.join('; '));throw error;}
 return done;
}
function transaction(c,changes,inputs=new Map()){
 const entries=[...changes].map(([file,after])=>({file,after,before:raw(c,file)})).filter(e=>!same(e.before,e.after));
 if(!entries.length)return {folder:null,entries:[]};
 for(const [f,b]of inputs)must(same(raw(c,f),b),'File changed during planning: '+f);
 const folder='manifest-backups/legacy-retire-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
 fs.mkdirSync(c.full(folder),{recursive:true});
 fs.writeFileSync(c.full(folder+'/backup.json'),json({version:1,files:entries.map(e=>({file:e.file,before:e.before===null?null:e.before.toString('base64'),afterHash:e.after===null?null:hash(e.after)}))}),{flag:'wx'});
 apply(c,entries);return {folder,entries};
}
function cleanup(c,dir){if(!c.exists(dir))return;for(const e of fs.readdirSync(c.full(dir),{withFileTypes:true}))if(e.isDirectory()&&!e.isSymbolicLink())cleanup(c,dir+'/'+e.name);if(!fs.readdirSync(c.full(dir)).length)fs.rmdirSync(c.full(dir));}
function ids(c,index){const all=new Set();for(const f of index.files)for(const a of c.read(f).assets)all.add(a.type+':'+a.key);return all;}
function boundSet(index){return new Set([...Object.values(index.bundles).flat(),...Object.values(index.startup).flat()]);}
function plan(root=process.cwd()){
 const e=env(root),{c,ws}=e;
 must(e.catalogs.build(e.root,false).upToDate,'Pending source changes. Run node tools/build-manifests.cjs first.');
 const cfg=c.read(CONFIG),index=c.read(INDEX);must(Array.isArray(cfg.bundleFiles)&&plain(index.bundles),'Invalid manifest sources');
 const legacyFiles=cfg.bundleFiles.filter(f=>typeof f==='string'&&f.startsWith(LEGACY));
 const names=Object.keys(index.bundles).filter(n=>n.startsWith('auto:'));
 if(!legacyFiles.length){must(!names.length,'auto:* bundles still exist, but legacy source files are not registered as expected.');return {...e,alreadyRetired:true,changes:new Map(),inputs:new Map(),removed:[],archived:[],index,after:index,newlyUnbound:[]};}
 must(new Set(legacyFiles).size===legacyFiles.length,'Repeated legacy bundle source');
 const audit=e.links.audit(e.root);must(audit.summary.scanErrors===0,'Code scan has errors; legacy retirement stopped.');must(audit.summary.legacyMentions===0,'Code mentions an auto:* bundle; legacy retirement stopped.');
 const removed=[],changes=new Map(),archived=[];
 for(const file of legacyFiles){
  const doc=c.read(file);must(plain(doc)&&plain(doc.bundles),'Invalid legacy bundle source: '+file);
  for(const [name,refs]of Object.entries(doc.bundles)){must(name.startsWith('auto:')&&Array.isArray(refs)&&Object.hasOwn(index.bundles,name),'Unexpected legacy bundle: '+name);removed.push(name);}
  const target=ARCHIVE+file.slice(LEGACY.length);must(!c.exists(target),'Archive target already exists; refusing overwrite: '+target);
  changes.set(target,c.raw(file));changes.set(file,null);archived.push({from:file,to:target});
 }
 must(new Set(removed).size===removed.length,'Repeated legacy bundle name');
 const removedSet=new Set(removed);
 must(names.length===removed.length&&names.every(n=>removedSet.has(n)),'Some auto:* bundles are outside registered legacy sources.');
 const nextCfg={...cfg,bundleFiles:cfg.bundleFiles.filter(f=>!legacyFiles.includes(f))};
 if(Array.isArray(cfg.bundleOrder))nextCfg.bundleOrder=cfg.bundleOrder.filter(n=>!removedSet.has(n));
 changes.set(CONFIG,Buffer.from(json(nextCfg)));
 const after={...index,bundles:Object.fromEntries(Object.entries(index.bundles).filter(([n])=>!removedSet.has(n)))};
 const view={...c,read:f=>changes.has(f)&&changes.get(f)!==null&&f===CONFIG?JSON.parse(changes.get(f).toString('utf8')):c.read(f)};
 must(ws.equal(ws.assemble(view),after),'Future index differs from expected; no files changed.');
 const catalog=ids(c,index),beforeBound=boundSet(index),afterBound=boundSet(after);
 const newlyUnbound=[...catalog].filter(id=>beforeBound.has(id)&&!afterBound.has(id)).sort();
 const inputs=watch(c,[...legacyFiles,...archived.map(a=>a.to),...index.files]);
 return {...e,alreadyRetired:false,changes,inputs,removed,archived,index,after,newlyUnbound};
}
function run(root=process.cwd(),write=false){
 const p=plan(root);
 const result={mode:write?'apply':'preview',alreadyRetired:p.alreadyRetired,retiredBundles:p.removed.length,retiredReferences:p.removed.reduce((n,x)=>n+p.index.bundles[x].length,0),archivedFiles:p.archived.length,indexBytesBefore:Buffer.byteLength(json(p.index)),indexBytesAfter:Buffer.byteLength(json(p.after)),assetRegistrationsRemoved:0,assetsNoLongerInAnyBundle:p.newlyUnbound.length,sampleAssetsNoLongerInAnyBundle:p.newlyUnbound.slice(0,12),backup:null};
 if(!write||p.alreadyRetired)return result;
 const tx=transaction(p.c,p.changes,p.inputs);result.backup=tx.folder;
 try{
  const built=p.catalogs.build(p.root,true);must(built.upToDate,'Index rebuild did not finish.');
  const index=p.c.read(INDEX);must(!Object.keys(index.bundles).some(n=>n.startsWith('auto:')),'Rebuilt index still contains auto:* bundles.');
  must(p.catalogs.build(p.root,false).upToDate,'Final manifest check failed.');
  result.indexBytesAfter=Buffer.byteLength(json(index));
 }catch(error){
  const rollbackErrors=[];
  try{apply(p.c,tx.entries.map(x=>({file:x.file,before:raw(p.c,x.file),after:x.before})));}catch(x){rollbackErrors.push(x.message);}
  try{p.catalogs.build(p.root,true);}catch(x){rollbackErrors.push('rebuild after rollback: '+x.message);}
  throw Error(error.message+(rollbackErrors.length?'; recovery needed from '+tx.folder+': '+rollbackErrors.join('; '):'; source files were restored.'));
 }
 return result;
}
function restore(root,folder){
 const e=env(root),{c}=e;must(e.catalogs.build(e.root,false).upToDate,'Pending source changes. Run node tools/build-manifests.cjs first.');
 must(typeof folder==='string'&&/^manifest-backups\/legacy-retire-[A-Za-z0-9-]+$/.test(folder),'Invalid legacy retirement backup path');
 const doc=c.read(folder+'/backup.json');must(doc.version===1&&Array.isArray(doc.files),'Invalid backup');const changes=new Map();
 for(const f of doc.files){must(f&&typeof f.file==='string'&&!changes.has(f.file),'Invalid/duplicate backup entry');must(f.file===CONFIG||f.file.startsWith(LEGACY)||f.file.startsWith(ARCHIVE),'Unexpected backup path');const current=raw(c,f.file);must(f.afterHash===null?current===null:current!==null&&hash(current)===f.afterHash,'Changed since backup; refusing restore: '+f.file);must(f.before===null||typeof f.before==='string','Invalid backup bytes');changes.set(f.file,f.before===null?null:Buffer.from(f.before,'base64'));}
 const tx=transaction(c,changes);
 try{const built=e.catalogs.build(e.root,true);must(built.upToDate,'Index rebuild did not finish.');must(e.catalogs.build(e.root,false).upToDate,'Final manifest check failed.');}
 catch(error){const x=[];try{apply(c,tx.entries.map(en=>({file:en.file,before:raw(c,en.file),after:en.before})));}catch(ex){x.push(ex.message);}try{e.catalogs.build(e.root,true);}catch(ex){x.push(ex.message);}throw Error(error.message+(x.length?'; recovery needed from '+tx.folder+': '+x.join('; '):'; restore was undone.'));}
 cleanup(c,ARCHIVE.slice(0,-1));cleanup(c,'assets/manifests/source/archive');
 return {mode:'restored',backup:folder,redoBackup:tx.folder};
}
function main(){const args=process.argv.slice(2);let root=process.cwd(),write=false,backup;while(args.length){const a=args.shift();if(a==='--apply')write=true;else if(a==='--root'){root=args.shift();must(root,'Missing root');}else if(a==='--restore'){backup=args.shift();must(backup,'Missing backup path');}else throw Error('Unknown argument: '+a);}must(!(write&&backup),'Use --apply or --restore, not both');console.log(JSON.stringify(backup?restore(root,backup):run(root,write),null,2));}
module.exports={plan,run,restore};
if(require.main===module){try{main();}catch(e){console.error('[retire-legacy-bundles] '+e.message);process.exitCode=2;}}
