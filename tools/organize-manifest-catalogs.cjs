#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const INDEX='assets/manifests/index.json';
const CONFIG='assets/manifests/source/project.json';
const STATE='assets/manifests/source/state.json';
const CATALOG='assets/manifests/catalog/';
const WORKSPACE='tools/manifest-workspace.cjs';
const LOADER='managers/ManifestLoader.js';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const must=(ok,msg)=>{if(!ok)throw Error(msg);};
function setup(root){
 const resolved=fs.realpathSync(path.resolve(root));
 const workspacePath=path.join(resolved,WORKSPACE);
 must(fs.existsSync(workspacePath),'Missing '+WORKSPACE);
 const ws=require(workspacePath);
 for(const name of ['context','check','assemble','validate','equal'])must(typeof ws[name]==='function','Unsupported workspace API: '+name);
 return {ws,c:ws.context(resolved)};
}
function compileLoader(c){
 let source=c.raw(LOADER).toString('utf8').replace(/^\uFEFF/,'');
 const line=/^import \{ dialogueText as __dialogueText \} from ['"]\.\.\/dialogues\/DialogueText\.js['"];\r?\n/m;
 must(line.test(source),'ManifestLoader imports changed; migration stopped.');
 source=source.replace(line,'').replace(/^export (?=(?:async )?function )/gm,'');
 return new Function('__dialogueText',source+'\nreturn compileManifest;')((_file,id)=>id);
}
function snapshot(c,file){return c.exists(file)?c.raw(file):null;}
function same(a,b){return a===null?b===null:b!==null&&a.equals(b);}
function collectInputs(c,cfg){
 const names=new Set([INDEX,CONFIG,STATE,WORKSPACE,LOADER,cfg.startupFile,...cfg.bundleFiles,...cfg.indexFields.files]);
 const state=c.read(STATE);for(const f of Object.keys(state.protectedTools||{}))names.add(f);
 return new Map([...names].map(f=>[f,snapshot(c,f)]));
}
function assertInputs(c,inputs){for(const [f,bytes]of inputs)must(same(snapshot(c,f),bytes),'File changed during operation: '+f);}
function plan(root=process.cwd()){
 const {ws,c}=setup(root),status=ws.check(c);
 must(status.upToDate,'Workspace has pending source changes. Run its build/check first.');
 const cfg=c.read(CONFIG),index=c.read(INDEX),state=c.read(STATE),inputs=collectInputs(c,cfg);
 const changes=new Map(),moved=[],targets=new Set();
 const files=index.files.map(file=>{
  if(file.startsWith(CATALOG)){c.full(file);return file;}
  must(/^assets\/manifests\/[^/]+\.json$/.test(file)&&file!==INDEX,'Unexpected catalog path: '+file);
  const target=CATALOG+path.posix.basename(file);
  must(!targets.has(target)&&!index.files.includes(target),'Catalog target collision: '+target);targets.add(target);
  must(!c.exists(target),'Target exists; refusing overwrite: '+target);
  const bytes=c.raw(file),part=c.read(file);
  must(Array.isArray(part.assets),'Missing assets array: '+file);
  moved.push({from:file,to:target,assets:part.assets.length,sha256:hash(bytes)});
  changes.set(target,bytes);
  return target;
 });
 if(!moved.length)return {ws,c,changes,inputs,moved,runtimeEquivalent:true,alreadyOrganized:true,assetCount:status.assets};
 const nextCfg={...cfg,indexFields:{...cfg.indexFields,files}};
 changes.set(CONFIG,Buffer.from(json(nextCfg)));
 const view={...c,read:file=>changes.has(file)?JSON.parse(changes.get(file).toString('utf8').replace(/^\uFEFF/,'')):c.read(file),exists:file=>changes.has(file)?changes.get(file)!==null:c.exists(file)};
 const nextIndex=ws.assemble(view);
 must(ws.equal(index.startup,nextIndex.startup)&&ws.equal(index.bundles,nextIndex.bundles),'Startup or bundles changed; stopped.');
 const validation=ws.validate(view,nextIndex,state.allowedMissing||[]);
 must(!validation.newMissing.length,'New missing assets: '+validation.newMissing.join(', '));
 const compile=compileLoader(c);
 const before=compile(index,index.files.map(f=>c.read(f)));
 const after=compile(nextIndex,nextIndex.files.map(f=>view.read(f)));
 must(ws.equal(before,after),'Compiled runtime manifest differs; no files changed.');
 const indexBytes=Buffer.from(json(nextIndex));
 changes.set(INDEX,indexBytes);
 changes.set(STATE,Buffer.from(json({...state,lastIndexHash:hash(indexBytes)})));
 for(const entry of moved)changes.set(entry.from,null);
 return {ws,c,changes,inputs,moved,runtimeEquivalent:true,alreadyOrganized:false,assetCount:validation.catalog.size};
}
function atomic(c,file,data){
 const dest=c.full(file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 const temp=dest+'.catalog-'+crypto.randomBytes(5).toString('hex')+'.tmp';
 try{fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,dest);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function transaction(c,changes,label,verify,inputs=new Map()){
 const entries=[...changes].map(([file,after])=>({file,before:snapshot(c,file),after})).filter(e=>!same(e.before,e.after));
 if(!entries.length)return null;
 assertInputs(c,inputs);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
 const folder='manifest-backups/catalogs-'+stamp;
 fs.mkdirSync(c.full(folder),{recursive:true});
 const doc={version:1,label,files:entries.map(e=>({file:e.file,before:e.before===null?null:e.before.toString('base64'),afterHash:e.after===null?null:hash(e.after)}))};
 fs.writeFileSync(c.full(folder+'/backup.json'),json(doc),{flag:'wx'});
 const done=[];
 try{
  for(const e of [...entries.filter(e=>e.after!==null),...entries.filter(e=>e.after===null)]){
   must(same(snapshot(c,e.file),e.before),'File changed before write: '+e.file);
   if(e.after===null)fs.unlinkSync(c.full(e.file));else atomic(c,e.file,e.after);
   done.push(e);
  }
  verify();
 }catch(error){
  const rollbackErrors=[];
  for(const e of done.reverse())try{if(e.before===null)fs.rmSync(c.full(e.file),{force:true});else atomic(c,e.file,e.before);}catch(e){rollbackErrors.push(e.message);}
  if(rollbackErrors.length)throw Error(error.message+'; rollback needs backup '+folder+': '+rollbackErrors.join('; '));
  throw error;
 }
 return folder;
}
function run(root=process.cwd(),apply=false){
 const p=plan(root);
 const result={mode:apply?'apply':'preview',alreadyOrganized:p.alreadyOrganized,runtimeEquivalent:p.runtimeEquivalent,assets:p.assetCount,movedCatalogs:p.moved,backup:null};
 if(!apply||p.alreadyOrganized)return result;
 const compile=compileLoader(p.c),beforeIndex=p.c.read(INDEX);
 const before=compile(beforeIndex,beforeIndex.files.map(f=>p.c.read(f)));
 result.backup=transaction(p.c,p.changes,'organize-catalogs',()=>{
  must(p.ws.check(p.c).upToDate,'Workspace check failed after migration.');
  const index=p.c.read(INDEX),after=compile(index,index.files.map(f=>p.c.read(f)));
  must(p.ws.equal(before,after),'Runtime manifest changed during write.');
 },p.inputs);
 return result;
}
function restore(root,folder){
 const {ws,c}=setup(root);
 must(typeof folder==='string'&&/^manifest-backups\/catalogs-[A-Za-z0-9-]+$/.test(folder),'Invalid catalogs backup folder');
 const doc=c.read(folder+'/backup.json');must(doc.version===1&&Array.isArray(doc.files),'Invalid backup');
 const changes=new Map();
 for(const e of doc.files){
  must(e&&typeof e.file==='string'&&!changes.has(e.file),'Invalid/duplicate backup entry');
  must(e.file===CONFIG||e.file===STATE||e.file===INDEX||(/^assets\/manifests\/(?:catalog\/)?[^/]+\.json$/).test(e.file),'Unexpected backup path');
  const current=snapshot(c,e.file);
  must(e.afterHash===null?current===null:current!==null&&hash(current)===e.afterHash,'Changed since migration; refusing restore: '+e.file);
  must(e.before===null||typeof e.before==='string','Invalid backup data');
  changes.set(e.file,e.before===null?null:Buffer.from(e.before,'base64'));
 }
 const redo=transaction(c,changes,'restore-catalogs',()=>must(ws.check(c).upToDate,'Restored workspace check failed.'));
 return {mode:'restored',backup:folder,redoBackup:redo};
}
function main(){
 const args=process.argv.slice(2);let root=process.cwd(),apply=false,folder;
 while(args.length){const a=args.shift();if(a==='--apply')apply=true;else if(a==='--root'){root=args.shift();must(root,'Missing --root');}else if(a==='--restore'){folder=args.shift();must(folder,'Missing backup path');}else throw Error('Unknown argument: '+a);}
 must(!(apply&&folder),'Use --apply or --restore, not both.');
 console.log(JSON.stringify(folder?restore(root,folder):run(root,apply),null,2));
}
module.exports={plan,run,restore};
if(require.main===module){try{main();}catch(e){console.error('[organize-manifest-catalogs] '+e.message);process.exitCode=2;}}
