#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CONFIG='assets/manifests/source/project.json';
const INDEX='assets/manifests/index.json';
const STATE='assets/manifests/source/state.json';
const OLD='assets/manifests/source/bundles/legacy-auto.json';
const DEST='assets/manifests/source/bundles/legacy';
const CATALOG_PROJECT='assets/manifests/source/catalog/auto-discovered/project.json';
const json=x=>JSON.stringify(x,null,2)+'\n';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const must=(ok,msg)=>{if(!ok)throw Error(msg);};
function setup(root=process.cwd()){
 root=fs.realpathSync(path.resolve(root));
 for(const f of ['tools/manifest-workspace.cjs','tools/catalog-sources.cjs'])must(fs.existsSync(path.join(root,f)),'Missing '+f+'. Complete stage 4 first.');
 const ws=require(path.join(root,'tools/manifest-workspace.cjs'));
 const catalogs=require(path.join(root,'tools/catalog-sources.cjs'));
 must(typeof ws.context==='function'&&typeof ws.assemble==='function'&&typeof ws.equal==='function'&&typeof catalogs.build==='function','Unsupported builder API');
 return {ws,catalogs,c:ws.context(root),root};
}
function beforeCheck(e){must(e.catalogs.build(e.root,false).upToDate,'Pending source changes. Run node tools/build-manifests.cjs first.');}
function raw(c,f){return c.exists(f)?c.raw(f):null;}
const same=(a,b)=>a===null?b===null:b!==null&&a.equals(b);
function snapshot(c){
 const cfg=c.read(CONFIG),state=c.read(STATE),project=c.read(CATALOG_PROJECT);
 const files=[CONFIG,INDEX,STATE,CATALOG_PROJECT,cfg.startupFile,...cfg.bundleFiles,...cfg.indexFields.files,...project.files,...Object.keys(state.protectedTools||{}),'tools/manifest-workspace.cjs','tools/catalog-sources.cjs'];
 return new Map([...new Set(files)].map(f=>[f,raw(c,f)]));
}
function destination(name){
 if(name==='auto:assets')return DEST+'/all-assets.json';
 if(name==='auto:discovered')return DEST+'/discovered.json';
 must(name.startsWith('auto:folder:'),'Unexpected non-folder legacy bundle: '+name);
 const folder=name.slice('auto:folder:'.length);
 const label=(folder||'root').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'folder';
 return DEST+'/folders/'+label+'-'+hash(name).slice(0,10)+'.json';
}
function plan(root=process.cwd()){
 const e=setup(root);beforeCheck(e);
 const {c,ws}=e,cfg=c.read(CONFIG),inputs=snapshot(c),current=ws.assemble(c);
 must(ws.equal(current,c.read(INDEX)),'Generated index differs from current sources.');
 must(Array.isArray(cfg.bundleFiles),'Invalid bundleFiles');
 const occurrences=cfg.bundleFiles.filter(f=>f===OLD).length;
 if(!occurrences){
  const organized=cfg.bundleFiles.filter(f=>typeof f==='string'&&f.startsWith(DEST+'/'));
  must(organized.length>0&&!c.exists(OLD),'legacy-auto.json is not registered, but migration is not recognizable.');
  return {...e,changes:new Map(),inputs,alreadyOrganized:true,bundles:organized.map(file=>({file})),indexBytes:c.raw(INDEX),stateBytes:c.raw(STATE)};
 }
 must(occurrences===1,'Repeated legacy source entry');
 must(!c.exists(DEST),'Destination folder already exists; refusing to merge or overwrite.');
 const doc=c.read(OLD);must(doc&&doc.bundles&&typeof doc.bundles==='object'&&!Array.isArray(doc.bundles),'Invalid legacy-auto.json');
 const changes=new Map(),files=[],bundles=[],targets=new Set();
 for(const [name,refs]of Object.entries(doc.bundles)){
  must(name.startsWith('auto:')&&Array.isArray(refs),'Invalid legacy bundle: '+name);
  const file=destination(name);must(!targets.has(file)&&!c.exists(file),'Destination collision: '+file);targets.add(file);
  files.push(file);bundles.push({name,file,references:refs.length});
  changes.set(file,Buffer.from(json({...doc,bundles:{[name]:refs}})));
 }
 const nextCfg={...cfg,bundleFiles:cfg.bundleFiles.flatMap(f=>f===OLD?files:[f])};
 changes.set(CONFIG,Buffer.from(json(nextCfg)));
 const view={...c,read:f=>changes.has(f)?JSON.parse(changes.get(f).toString('utf8')):c.read(f)};
 must(ws.equal(ws.assemble(view),current),'Reconstructed index differs; no files changed.');
 changes.set(OLD,null);
 return {...e,changes,inputs,alreadyOrganized:false,bundles,indexBytes:c.raw(INDEX),stateBytes:c.raw(STATE)};
}
function atomic(c,f,data){const dest=c.full(f);fs.mkdirSync(path.dirname(dest),{recursive:true});const temp=dest+'.legacy-'+crypto.randomBytes(5).toString('hex')+'.tmp';try{fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,dest);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
function transaction(c,changes,verify,inputs=new Map()){
 const entries=[...changes].map(([file,after])=>({file,after,before:raw(c,file)})).filter(e=>!same(e.before,e.after));
 if(!entries.length)return null;
 for(const [f,b]of inputs)must(same(raw(c,f),b),'Source changed during operation: '+f);
 const folder='manifest-backups/legacy-bundles-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
 fs.mkdirSync(c.full(folder),{recursive:true});
 fs.writeFileSync(c.full(folder+'/backup.json'),json({version:1,files:entries.map(e=>({file:e.file,before:e.before===null?null:e.before.toString('base64'),afterHash:e.after===null?null:hash(e.after)}))}),{flag:'wx'});
 const done=[];
 try{
  for(const e of [...entries.filter(e=>e.after!==null),...entries.filter(e=>e.after===null)]){
   must(same(raw(c,e.file),e.before),'Source changed before write: '+e.file);
   if(e.after===null)fs.unlinkSync(c.full(e.file));else atomic(c,e.file,e.after);done.push(e);
  }
  verify();
 }catch(error){
  const errors=[];for(const e of done.reverse())try{if(e.before===null)fs.rmSync(c.full(e.file),{force:true});else atomic(c,e.file,e.before);}catch(ex){errors.push(ex.message);}
  if(errors.length)throw Error(error.message+'; recover from '+folder+': '+errors.join('; '));throw error;
 }
 return folder;
}
function run(root=process.cwd(),apply=false){
 const p=plan(root),result={mode:apply?'apply':'preview',alreadyOrganized:p.alreadyOrganized,bundlesUnchanged:true,indexUnchanged:true,bundleFiles:p.bundles.length,files:p.bundles,backup:null};
 if(apply&&!p.alreadyOrganized)result.backup=transaction(p.c,p.changes,()=>{
  beforeCheck(p);
  must(p.c.raw(INDEX).equals(p.indexBytes),'Runtime index changed unexpectedly.');
  must(p.c.raw(STATE).equals(p.stateBytes),'Workspace state changed unexpectedly.');
 },p.inputs);
 return result;
}
function restore(root,folder){
 const e=setup(root),{c}=e;beforeCheck(e);
 must(typeof folder==='string'&&/^manifest-backups\/legacy-bundles-[A-Za-z0-9-]+$/.test(folder),'Invalid legacy backup path');
 const doc=c.read(folder+'/backup.json');must(doc.version===1&&Array.isArray(doc.files),'Invalid backup');const changes=new Map();
 for(const f of doc.files){must(f&&typeof f.file==='string'&&!changes.has(f.file),'Invalid/duplicate backup entry');must(f.file===CONFIG||f.file===OLD||(f.file.startsWith(DEST+'/')&&f.file.endsWith('.json')),'Unexpected backup path');const current=raw(c,f.file);must(f.afterHash===null?current===null:current!==null&&hash(current)===f.afterHash,'Changed since backup; refusing restore: '+f.file);must(f.before===null||typeof f.before==='string','Invalid backup bytes');changes.set(f.file,f.before===null?null:Buffer.from(f.before,'base64'));}
 const redo=transaction(c,changes,()=>beforeCheck(e));
 function clean(f){if(!c.exists(f))return;for(const d of fs.readdirSync(c.full(f),{withFileTypes:true}))if(d.isDirectory()&&!d.isSymbolicLink())clean(f+'/'+d.name);if(!fs.readdirSync(c.full(f)).length)fs.rmdirSync(c.full(f));}clean(DEST);
 return {mode:'restored',backup:folder,redoBackup:redo};
}
function main(){const args=process.argv.slice(2);let root=process.cwd(),apply=false,backup;while(args.length){const a=args.shift();if(a==='--apply')apply=true;else if(a==='--root'){root=args.shift();must(root,'Missing root');}else if(a==='--restore'){backup=args.shift();must(backup,'Missing backup path');}else throw Error('Unknown argument: '+a);}must(!(apply&&backup),'Use --apply or --restore, not both');console.log(JSON.stringify(backup?restore(root,backup):run(root,apply),null,2));}
module.exports={run,plan,restore,destination};
if(require.main===module){try{main();}catch(e){console.error('[organize-legacy-bundles] '+e.message);process.exitCode=2;}}
