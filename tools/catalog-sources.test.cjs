#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {init,build,restore}=require('./catalog-sources.cjs');
const T='assets/manifests/catalog/auto-discovered.json',P='assets/manifests/source/catalog/auto-discovered/project.json',I='assets/manifests/index.json',C='assets/manifests/source/project.json',S='assets/manifests/source/state.json';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fixtureWorkspace=String.raw`const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function context(root){function full(f){const p=path.resolve(root,f),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('Path outside project');return p;}const raw=f=>fs.readFileSync(full(f));return {root,full,raw,exists:f=>fs.existsSync(full(f)),read:f=>JSON.parse(raw(f).toString('utf8').replace(/^\uFEFF/,''))};}
function assemble(c){const cfg=c.read('assets/manifests/source/project.json'),bundles={};for(const f of cfg.bundleFiles)Object.assign(bundles,c.read(f).bundles);const startup=c.read(cfg.startupFile);bundles.startup=Object.values(startup).flat();return {...cfg.indexFields,startup,bundles};}
function validate(c,idx,allowed=[]){const catalog=new Map(),missing=new Set();for(const f of idx.files)for(const a of c.read(f).assets){if(!a.type||!a.key||!a.url)throw Error('Invalid asset');const id=a.type+':'+a.key;if(catalog.has(id))throw Error('Duplicate asset');catalog.set(id,a);for(const u of Array.isArray(a.url)?a.url:[a.url])if(!u.startsWith('https:')&&!c.exists(u))missing.add(u);}for(const refs of Object.values(idx.bundles))for(const r of refs)if(!catalog.has(r))throw Error('Unknown reference '+r);return {catalog,newMissing:[...missing].filter(x=>!allowed.includes(x))};}
function check(c){const state=c.read('assets/manifests/source/state.json');if(hash(c.raw('assets/manifests/index.json'))!==state.lastIndexHash)throw Error('Generated index edited externally');const idx=assemble(c),v=validate(c,idx,state.allowedMissing);if(v.newMissing.length)throw Error('New missing assets');return {upToDate:equal(idx,c.read('assets/manifests/index.json'))};}
module.exports={context,equal,assemble,validate,check};`;
const fixtureLoader=`import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";\nexport function compileManifest(index,parts){return {assets:parts.flatMap(p=>p.assets),startup:index.startup,bundles:index.bundles};}\n`;
function fixture(t,count=3){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ma-catalog-sources-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 function put(f,x){const p=path.join(root,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');}
 const raw=f=>fs.readFileSync(path.join(root,f)),read=f=>JSON.parse(raw(f).toString('utf8').replace(/^\uFEFF/,''));
 put('tools/manifest-workspace.cjs',fixtureWorkspace);put('managers/ManifestLoader.js',fixtureLoader);
 const assets=[];for(let i=0;i<count;i++){const type=i%2?'audio':'image',url='assets/'+(i%2?'audio':'ui')+'/'+i+'.dat';put(url,'fixture');assets.push({type,key:'key'+i,url,custom:{keep:i}});}
 put(T,{note:'metadata stays',assets});put(C,{version:1,indexFields:{version:2,files:[T]},startupFile:'assets/manifests/source/startup.json',bundleFiles:['assets/manifests/source/bundles/scenes.json']});
 put('assets/manifests/source/startup.json',{});put('assets/manifests/source/bundles/scenes.json',{bundles:{shared:[],scene:[]}});
 const ws=require(path.join(root,'tools/manifest-workspace.cjs'));put(I,ws.assemble(ws.context(root)));put(S,{version:1,lastIndexHash:sha(raw(I)),allowedMissing:[],protectedTools:{}});
 const project=()=>read(P),fileFor=(type)=>project().files.find(f=>f.includes('/'+type+'/'));
 return {root,put,raw,read,ws,project,fileFor,exists:f=>fs.existsSync(path.join(root,f))};
}
test('preview does not create sources or backups',t=>{const f=fixture(t);const b=f.raw(T);assert.equal(init(f.root).runtimeEquivalent,true);assert.equal(f.exists(P),false);assert.equal(f.exists('manifest-backups'),false);assert.deepEqual(f.raw(T),b);});
test('init preserves runtime catalog and index bytes',t=>{const f=fixture(t),b=f.raw(T),i=f.raw(I);const r=init(f.root,true);assert.equal(r.runtimeEquivalent,true);assert.deepEqual(f.raw(T),b);assert.deepEqual(f.raw(I),i);assert.equal(build(f.root).upToDate,true);});
test('grouped sources preserve originally interleaved asset order',t=>{const f=fixture(t);const before=f.read(T);init(f.root,true);assert.deepEqual(require('./catalog-sources.cjs').assembleSources(f.ws.context(f.root)).output,before);});
test('source fragment limit is 60 assets',t=>{const f=fixture(t,125);init(f.root,true);for(const file of f.project().files)assert.ok(f.read(file).assets.length<=60);});
test('repeat init refuses to overwrite sources',t=>{const f=fixture(t);init(f.root,true);assert.throws(()=>init(f.root,true),/already exist/);});
test('source edit is detected and built without index changes',t=>{const f=fixture(t);init(f.root,true);const file=f.fileFor('image'),d=f.read(file);d.assets[0].custom.keep='changed';f.put(file,d);assert.equal(build(f.root).upToDate,false);assert.equal(build(f.root,true).indexChanged,false);assert.equal(f.read(T).assets[0].custom.keep,'changed');assert.equal(build(f.root).upToDate,true);});
test('new asset and pending bundle reference build together',t=>{const f=fixture(t);init(f.root,true);const file=f.fileFor('image'),d=f.read(file);f.put('assets/ui/new.dat','asset');d.assets.push({type:'image',key:'new',url:'assets/ui/new.dat'});f.put(file,d);const scenes='assets/manifests/source/bundles/scenes.json',bundles=f.read(scenes);bundles.bundles.scene.push('image:new');f.put(scenes,bundles);const r=build(f.root,true);assert.equal(r.indexChanged,true);assert.equal(f.read(T).assets.at(-1).key,'new');assert.deepEqual(f.read(I).bundles.scene,['image:new']);});
test('duplicate asset across fragments is rejected',t=>{const f=fixture(t);init(f.root,true);const files=f.project().files,a=f.read(files[0]),b=f.read(files[1]);b.assets.push(a.assets[0]);f.put(files[1],b);assert.throws(()=>build(f.root,true),/Duplicate asset/);});
test('manual generated catalog edit cannot be overwritten',t=>{const f=fixture(t);init(f.root,true);const d=f.read(T);d.note='external edit';f.put(T,d);assert.throws(()=>build(f.root,true),/edited outside/);});
test('new missing files block catalog build',t=>{const f=fixture(t);init(f.root,true);const file=f.fileFor('image'),d=f.read(file);d.assets[0].url='assets/ui/missing.dat';f.put(file,d);assert.throws(()=>build(f.root,true),/New missing/);});
test('source removal still referenced by bundle is rejected',t=>{const f=fixture(t);init(f.root,true);const file=f.fileFor('image'),d=f.read(file),removed=d.assets.shift();f.put(file,d);const scenes='assets/manifests/source/bundles/scenes.json',b=f.read(scenes);b.bundles.scene.push(removed.type+':'+removed.key);f.put(scenes,b);assert.throws(()=>build(f.root,true),/Unknown reference/);});
test('second build without edits creates no backup',t=>{const f=fixture(t);init(f.root,true);const r=build(f.root,true);assert.equal(r.backup,null);assert.equal(r.upToDate,true);});
test('restore init deletes only its created source files',t=>{const f=fixture(t),before=f.raw(T),r=init(f.root,true);restore(f.root,r.backup);assert.equal(f.exists(P),false);assert.deepEqual(f.raw(T),before);});
test('restore protects later source edits',t=>{const f=fixture(t),r=init(f.root,true),file=f.fileFor('image');f.put(file,{assets:[]});assert.throws(()=>restore(f.root,r.backup),/Changed since backup/);});
test('external generated index edits still block build',t=>{const f=fixture(t);init(f.root,true);const d=f.read(I);d.custom='external';f.put(I,d);assert.throws(()=>build(f.root,true),/edited externally/);});
test('stage 3 target path is required before init',t=>{const f=fixture(t);const config=f.read(C);config.indexFields.files=[];f.put(C,config);const idx=f.ws.assemble(f.ws.context(f.root));f.put(I,idx);f.put(S,{version:1,lastIndexHash:sha(f.raw(I)),allowedMissing:[],protectedTools:{}});assert.throws(()=>init(f.root,true),/Stage 3 required/);});
