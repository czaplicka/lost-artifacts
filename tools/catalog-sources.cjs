#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const INDEX='assets/manifests/index.json',CFG='assets/manifests/source/project.json',STATE='assets/manifests/source/state.json';
const DIR='assets/manifests/source/catalog/auto-discovered',PROJECT=DIR+'/project.json';
const TARGET='assets/manifests/catalog/auto-discovered.json';
const json=x=>JSON.stringify(x,null,2)+'\n';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const must=(ok,msg)=>{if(!ok)throw Error(msg);};
const id=a=>a.type+':'+a.key;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function env(root=process.cwd()){
 root=fs.realpathSync(path.resolve(root));
 const ws=require(path.join(root,'tools/manifest-workspace.cjs'));
 for(const n of ['context','assemble','validate','equal','check'])must(typeof ws[n]==='function','Unsupported workspace: '+n);
 return {ws,c:ws.context(root)};
}
function compiler(c){
 let s=c.raw('managers/ManifestLoader.js').toString('utf8').replace(/^\uFEFF/,'');
 const re=/^import \{ dialogueText as __dialogueText \} from ['"]\.\.\/dialogues\/DialogueText\.js['"];\r?\n/m;
 must(re.test(s),'ManifestLoader changed; operation stopped.');
 s=s.replace(re,'').replace(/^export (?=(?:async )?function )/gm,'');
 return new Function('__dialogueText',s+'\nreturn compileManifest;')((_f,k)=>k);
}
function raw(c,f){return c.exists(f)?c.raw(f):null;}
function same(a,b){return a===null?b===null:b!==null&&a.equals(b);}
function write(c,f,data){const p=c.full(f);fs.mkdirSync(path.dirname(p),{recursive:true});const t=p+'.source-'+crypto.randomBytes(5).toString('hex')+'.tmp';try{fs.writeFileSync(t,data,{flag:'wx'});fs.renameSync(t,p);}finally{if(fs.existsSync(t))fs.unlinkSync(t);}}
function assertState(c){
 const state=c.read(STATE);must(state.version===1,'Unsupported workspace state');
 must(hash(c.raw(INDEX))===state.lastIndexHash,'Generated index edited externally; no overwrite.');
 for(const [f,h]of Object.entries(state.protectedTools||{}))must(c.exists(f)&&hash(c.raw(f))===h,'Protected tool changed: '+f);
 return state;
}
function watch(c,extra=[]){
 const cfg=c.read(CFG),state=c.read(STATE);
 return new Map([...new Set([INDEX,CFG,STATE,'tools/manifest-workspace.cjs','managers/ManifestLoader.js',cfg.startupFile,...cfg.bundleFiles,...cfg.indexFields.files,...Object.keys(state.protectedTools||{}),...extra])].map(f=>[f,raw(c,f)]));
}
function transact(c,changes,verify,inputs=new Map()){
 const entries=[...changes].map(([file,after])=>({file,before:raw(c,file),after})).filter(e=>!same(e.before,e.after));
 if(!entries.length)return null;
 for(const [f,b]of inputs)must(same(raw(c,f),b),'File changed during planning: '+f);
 const folder='manifest-backups/catalog-sources-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
 fs.mkdirSync(c.full(folder),{recursive:true});
 fs.writeFileSync(c.full(folder+'/backup.json'),json({version:1,files:entries.map(e=>({file:e.file,before:e.before===null?null:e.before.toString('base64'),afterHash:e.after===null?null:hash(e.after)}))}),{flag:'wx'});
 const done=[];
 try{
  for(const e of [...entries.filter(e=>e.after!==null),...entries.filter(e=>e.after===null)]){
   must(same(raw(c,e.file),e.before),'File changed before write: '+e.file);
   if(e.after===null)fs.unlinkSync(c.full(e.file));else write(c,e.file,e.after);done.push(e);
  }
  verify();
 }catch(error){
  const errors=[];for(const e of done.reverse())try{if(e.before===null)fs.rmSync(c.full(e.file),{force:true});else write(c,e.file,e.before);}catch(ex){errors.push(ex.message);}
  if(errors.length)throw Error(error.message+'; recover from '+folder+': '+errors.join('; '));throw error;
 }
 return folder;
}
function slug(text){const result=String(text).toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'other';return result;}
function category(a){
 const url=Array.isArray(a.url)?a.url[0]:a.url;
 if(typeof url!=='string'||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url))return slug(a.type)+'/external';
 const p=url.replace(/\\/g,'/').replace(/^[/.]+/,'').split('/');if(p[0]==='assets')p.shift();
 let group=p.length>1?p[0]:'root';if(group==='side_quests'&&p.length>2)group+='-'+p[1];
 return slug(a.type)+'/'+slug(group);
}
function init(root=process.cwd(),apply=false){
 const {ws,c}=env(root);must(!c.exists(DIR),'Catalog sources already exist. Use build-manifests.cjs.');
 must(ws.check(c).upToDate,'Pending workspace changes; build/check them first.');
 const idx=c.read(INDEX);must(idx.files.includes(TARGET),'Stage 3 required: catalog/auto-discovered.json must be registered.');
 const before=c.read(TARGET);must(plain(before)&&Array.isArray(before.assets),'Invalid auto-discovered catalog');
 const inputs=watch(c),buckets=new Map(),order=[],seen=new Set();
 for(const a of before.assets){must(a&&typeof a.type==='string'&&typeof a.key==='string','Invalid asset');const key=id(a);must(!seen.has(key),'Duplicate asset: '+key);seen.add(key);order.push(key);const group=category(a);if(!buckets.has(group))buckets.set(group,[]);buckets.get(group).push(a);}
 const changes=new Map(),files=[];
 for(const [group,assets]of buckets)for(let offset=0;offset<assets.length;offset+=60){
  const f=DIR+'/'+group+'-'+String(offset/60+1).padStart(3,'0')+'.json';files.push(f);must(!c.exists(f),'Source file already exists: '+f);changes.set(f,Buffer.from(json({assets:assets.slice(offset,offset+60)})));
 }
 const {assets,...metadata}=before;
 const project={version:1,target:TARGET,files,order,metadata,outputHash:hash(c.raw(TARGET))};
 changes.set(PROJECT,Buffer.from(json(project)));
 const view={...c,read:f=>changes.has(f)?JSON.parse(changes.get(f).toString()):c.read(f)};
 const assembled=assembleSources(view);
 must(ws.equal(assembled.output,before),'Source split changed original catalog.');
 const compile=compiler(c),original=compile(idx,idx.files.map(f=>c.read(f)));
 const after=compile(idx,idx.files.map(f=>f===TARGET?assembled.output:c.read(f)));
 must(ws.equal(original,after),'Runtime output differs; no write.');
 const result={mode:apply?'init':'preview',assets:assets.length,sourceFiles:files.length,runtimeEquivalent:true,outputUnchanged:true,backup:null};
 if(apply)result.backup=transact(c,changes,()=>{must(ws.equal(assembleSources(c).output,c.read(TARGET)),'Source verification failed.');must(ws.check(c).upToDate,'Workspace verification failed.');},inputs);
 return result;
}
function assembleSources(c){
 const p=c.read(PROJECT);must(p.version===1&&p.target===TARGET&&Array.isArray(p.files)&&Array.isArray(p.order)&&plain(p.metadata),'Invalid catalog source configuration');
 must(!Object.hasOwn(p.metadata,'assets'),'metadata cannot contain assets');
 const seenFiles=new Set(),assets=new Map(),encounter=[];
 for(const f of p.files){must(typeof f==='string'&&f.startsWith(DIR+'/')&&f!==PROJECT&&!seenFiles.has(f),'Invalid/duplicate source file: '+f);seenFiles.add(f);const doc=c.read(f);must(Array.isArray(doc.assets),'Missing assets array: '+f);for(const a of doc.assets){must(plain(a)&&typeof a.type==='string'&&typeof a.key==='string'&&a.key,'Invalid asset: '+f);const key=id(a);must(!assets.has(key),'Duplicate asset: '+key);assets.set(key,a);encounter.push(key);}}
 must(new Set(p.order).size===p.order.length&&p.order.every(k=>typeof k==='string'),'Invalid order list');
 const ordered=[];for(const key of [...p.order,...encounter])if(assets.has(key)){ordered.push(assets.get(key));assets.delete(key);}
 return {project:p,output:{...p.metadata,assets:ordered}};
}
function build(root=process.cwd(),apply=false){
 const {ws,c}=env(root),state=assertState(c);must(c.exists(PROJECT),'Run catalog-sources.cjs init --apply first.');
 const source=assembleSources(c),p=source.project,inputs=watch(c,[PROJECT,...p.files]);
 must(hash(c.raw(TARGET))===p.outputHash,'Generated auto-discovered.json edited outside sources; no overwrite.');
 const cfg=c.read(CFG);must(cfg.indexFields.files.includes(TARGET),'Generated catalog is no longer registered.');
 const catalogChanged=!ws.equal(source.output,c.read(TARGET));
 const future={...c,read:f=>f===TARGET?source.output:c.read(f)};
 const idx=ws.assemble(future),report=ws.validate(future,idx,state.allowedMissing||[]);
 must(!report.newMissing.length,'New missing assets: '+report.newMissing.join(', '));
 compiler(c)(idx,idx.files.map(f=>future.read(f)));
 const indexChanged=!ws.equal(idx,c.read(INDEX)),changes=new Map();
 if(catalogChanged){const bytes=Buffer.from(json(source.output));changes.set(TARGET,bytes);changes.set(PROJECT,Buffer.from(json({...p,order:source.output.assets.map(id),outputHash:hash(bytes)})));}
 if(indexChanged){const bytes=Buffer.from(json(idx));changes.set(INDEX,bytes);changes.set(STATE,Buffer.from(json({...state,lastIndexHash:hash(bytes)})));}
 const result={mode:apply?'build':'check',upToDate:!catalogChanged&&!indexChanged,catalogChanged,indexChanged,assets:report.catalog.size,backup:null};
 if(apply){result.backup=transact(c,changes,()=>{must(ws.check(c).upToDate,'Workspace check failed after build.');const s=assembleSources(c);must(hash(c.raw(TARGET))===s.project.outputHash&&ws.equal(s.output,c.read(TARGET)),'Catalog source check failed after build.');},inputs);result.upToDate=true;}
 return result;
}
function restore(root,folder){
 const {ws,c}=env(root);must(typeof folder==='string'&&/^manifest-backups\/catalog-sources-[A-Za-z0-9-]+$/.test(folder),'Invalid source backup folder');
 const doc=c.read(folder+'/backup.json');must(doc.version===1&&Array.isArray(doc.files),'Invalid backup');const changes=new Map();
 for(const e of doc.files){must(e&&typeof e.file==='string'&&!changes.has(e.file),'Invalid backup entry');must([TARGET,PROJECT,INDEX,STATE].includes(e.file)||e.file.startsWith(DIR+'/'),'Unexpected backup path');const b=raw(c,e.file);must(e.afterHash===null?b===null:b!==null&&hash(b)===e.afterHash,'Changed since backup: '+e.file);must(e.before===null||typeof e.before==='string','Invalid backup bytes');changes.set(e.file,e.before===null?null:Buffer.from(e.before,'base64'));}
 const redo=transact(c,changes,()=>must(ws.check(c).upToDate,'Restored workspace check failed.'));
 function clean(f){if(!c.exists(f))return;for(const e of fs.readdirSync(c.full(f),{withFileTypes:true}))if(e.isDirectory()&&!e.isSymbolicLink())clean(f+'/'+e.name);if(!fs.readdirSync(c.full(f)).length)fs.rmdirSync(c.full(f));}clean(DIR);
 return {mode:'restored',backup:folder,redoBackup:redo};
}
function main(){const args=process.argv.slice(2),cmd=args.shift()||'check';let root=process.cwd(),apply=false,folder;while(args.length){const a=args.shift();if(a==='--root'){root=args.shift();must(root,'Missing root');}else if(a==='--apply')apply=true;else if(cmd==='restore'&&!folder)folder=a;else throw Error('Unknown argument: '+a);}let r;if(cmd==='init')r=init(root,apply);else if(cmd==='build')r=build(root,true);else if(cmd==='check')r=build(root,false);else if(cmd==='restore')r=restore(root,folder);else throw Error('Usage: catalog-sources.cjs init [--apply] | check | build | restore BACKUP');console.log(JSON.stringify(r,null,2));if(cmd==='check'&&!r.upToDate)process.exitCode=1;}
module.exports={init,build,restore,assembleSources};
if(require.main===module){try{main();}catch(e){console.error('[catalog-sources] '+e.message);process.exitCode=2;}}
