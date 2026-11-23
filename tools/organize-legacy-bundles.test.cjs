#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {run,restore,destination}=require('./organize-legacy-bundles.cjs');
const C='assets/manifests/source/project.json',I='assets/manifests/index.json',S='assets/manifests/source/state.json';
const O='assets/manifests/source/bundles/legacy-auto.json',D='assets/manifests/source/bundles/legacy';
const adapter=String.raw`const fs=require('node:fs'),path=require('node:path');
function context(root){function full(f){const p=path.resolve(root,f),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('Path outside project');return p;}const raw=f=>fs.readFileSync(full(f));return {root,full,raw,exists:f=>fs.existsSync(full(f)),read:f=>JSON.parse(raw(f))};}
const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
function assemble(c){const cfg=c.read('assets/manifests/source/project.json'),bundles=Object.create(null);for(const f of cfg.bundleFiles)for(const [k,v]of Object.entries(c.read(f).bundles)){if(Object.hasOwn(bundles,k))throw Error('Duplicate bundle');bundles[k]=v;}const startup=c.read(cfg.startupFile);bundles.startup=Object.values(startup).flat();const ordered=Object.create(null);for(const k of cfg.bundleOrder)if(Object.hasOwn(bundles,k))ordered[k]=bundles[k];for(const k of Object.keys(bundles))if(!Object.hasOwn(ordered,k))ordered[k]=bundles[k];return {...cfg.indexFields,startup,bundles:ordered};}
module.exports={context,equal,assemble};`;
const catalogAdapter=`const ws=require('./manifest-workspace.cjs');module.exports.build=root=>{const c=ws.context(root);return {upToDate:ws.equal(ws.assemble(c),c.read('assets/manifests/index.json'))};};`;
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ma-legacy-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 function put(f,data){const p=path.join(root,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(data)?data:typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');}
 const raw=f=>fs.readFileSync(path.join(root,f)),read=f=>JSON.parse(raw(f));
 put('tools/manifest-workspace.cjs',adapter);put('tools/catalog-sources.cjs',catalogAdapter);
 const bundle={sourceMeta:{keep:true},bundles:{'auto:discovered':['image:first'],'auto:assets':['image:first','image:second','image:first'],'auto:folder:':['image:first'],'auto:folder:pi/office':['image:second'],'auto:folder:side_quests/Mom’s Not Proud':['image:second']}};
 put(O,bundle);put('assets/manifests/source/bundles/agency.json',{bundles:{'scene:OfficeScene':['image:first']}});
 put('assets/manifests/catalog/core.json',{assets:[]});put('assets/manifests/source/startup.json',{});
 put('assets/manifests/source/catalog/auto-discovered/project.json',{files:['assets/manifests/source/catalog/auto-discovered/image/ui-001.json']});
 put('assets/manifests/source/catalog/auto-discovered/image/ui-001.json',{assets:[]});
 const cfg={version:1,indexFields:{version:2,files:['assets/manifests/catalog/core.json']},startupFile:'assets/manifests/source/startup.json',bundleFiles:['assets/manifests/source/bundles/agency.json',O],bundleOrder:['startup','scene:OfficeScene',...Object.keys(bundle.bundles)]};put(C,cfg);put(S,{version:1,lastIndexHash:'unchanged-in-fixture',allowedMissing:[],protectedTools:{}});
 const ws=require(path.join(root,'tools/manifest-workspace.cjs'));
 const rebuild=()=>put(I,ws.assemble(ws.context(root)));rebuild();
 return {root,put,raw,read,rebuild,exists:f=>fs.existsSync(path.join(root,f))};
}
test('preview writes no source files and creates no backup',t=>{const f=fixture(t),before=f.raw(C);const r=run(f.root);assert.equal(r.bundleFiles,5);assert.equal(f.exists(D),false);assert.equal(f.exists('manifest-backups'),false);assert.deepEqual(f.raw(C),before);});
test('apply preserves generated index and state byte-for-byte',t=>{const f=fixture(t),index=f.raw(I),state=f.raw(S);run(f.root,true);assert.deepEqual(f.raw(I),index);assert.deepEqual(f.raw(S),state);assert.equal(f.exists(O),false);});
test('all bundle keys, refs, duplicates and array order are preserved',t=>{const f=fixture(t),before=f.read(I).bundles;run(f.root,true);const after={};for(const file of f.read(C).bundleFiles)Object.assign(after,f.read(file).bundles);after.startup=[];assert.deepEqual(after,before);});
test('other source docs remain unchanged',t=>{const f=fixture(t),name='assets/manifests/source/bundles/agency.json',before=f.raw(name);run(f.root,true);assert.deepEqual(f.raw(name),before);});
test('new files preserve legacy source metadata',t=>{const f=fixture(t),r=run(f.root,true);for(const entry of r.files)assert.deepEqual(f.read(entry.file).sourceMeta,{keep:true});});
test('safe filenames distinguish folder paths and Unicode',()=>{const names=['auto:folder:','auto:folder:pi/office','auto:folder:pi-office','auto:folder:Side Quests','auto:folder:side/quests','auto:folder:Mom’s Not Proud'];const files=names.map(destination);assert.equal(new Set(files).size,names.length);for(const f of files)assert.match(f,/^[a-z0-9/._-]+$/);});
test('second apply is a no-op',t=>{const f=fixture(t);run(f.root,true);const before=f.raw(C),r=run(f.root,true);assert.equal(r.alreadyOrganized,true);assert.equal(r.backup,null);assert.deepEqual(f.raw(C),before);});
test('rollback restores original bytes and deletes new source files',t=>{const f=fixture(t),old=f.raw(O),cfg=f.raw(C),r=run(f.root,true);restore(f.root,r.backup);assert.deepEqual(f.raw(O),old);assert.deepEqual(f.raw(C),cfg);assert.equal(f.exists(D),false);});
test('rollback protects edits made after migration',t=>{const f=fixture(t),r=run(f.root,true);f.put(r.files[0].file,{bundles:{[r.files[0].name]:['image:changed']}});f.rebuild();assert.throws(()=>restore(f.root,r.backup),/Changed since backup/);});
test('existing destination folder blocks accidental merging',t=>{const f=fixture(t);f.put(D+'/mine.json',{bundles:{}});assert.throws(()=>run(f.root,true),/already exists/);assert.equal(f.exists(O),true);});
test('pending source changes are not silently committed',t=>{const f=fixture(t),cfg=f.read(C);cfg.indexFields.custom='pending';f.put(C,cfg);assert.throws(()=>run(f.root,true),/Pending source changes/);});
test('unexpected non-auto bundle blocks migration',t=>{const f=fixture(t),d=f.read(O);d.bundles['scene:Accidental']=['image:first'];f.put(O,d);f.rebuild();assert.throws(()=>run(f.root,true),/Invalid legacy bundle/);assert.equal(f.exists(D),false);});
test('unknown auto namespace is not guessed',t=>{const f=fixture(t),d=f.read(O);d.bundles['auto:unknown']=['image:first'];f.put(O,d);f.rebuild();assert.throws(()=>run(f.root,true),/Unexpected non-folder/);});
test('operation needs no backup files from older stages',t=>{const f=fixture(t);assert.equal(f.exists('manifest-backups'),false);assert.equal(run(f.root,true).indexUnchanged,true);});
test('redo backup reapplies migration after restore',t=>{const f=fixture(t),r=run(f.root,true),s=restore(f.root,r.backup);restore(f.root,s.redoBackup);assert.equal(f.exists(O),false);assert.equal(run(f.root).alreadyOrganized,true);});
test('main source bundleOrder is not edited',t=>{const f=fixture(t),order=f.read(C).bundleOrder;run(f.root,true);assert.deepEqual(f.read(C).bundleOrder,order);});
