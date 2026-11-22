#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {run,restore}=require('./organize-manifest-catalogs.cjs');
const sourceRoot=path.resolve(__dirname,'..');
const INDEX='assets/manifests/index.json',CONFIG='assets/manifests/source/project.json',STATE='assets/manifests/source/state.json';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ma-catalogs-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 function put(f,data){const target=path.join(root,f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,Buffer.isBuffer(data)?data:typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');}
 const raw=f=>fs.readFileSync(path.join(root,f)),read=f=>JSON.parse(raw(f).toString('utf8').replace(/^\uFEFF/,''));
 for(const f of ['tools/manifest-workspace.cjs','managers/ManifestLoader.js'])put(f,fs.readFileSync(path.join(sourceRoot,f)));
 put('assets/ui/menu.webp','image fixture');put('assets/audio/parking.mp3','audio fixture');
 put('assets/manifests/core.json',{note:'metadata preserved',assets:[{type:'image',key:'menu',url:'assets/ui/menu.webp',groups:['ui'],custom:'keep'}]});
 put('assets/manifests/auto-discovered.json',{assets:[{type:'audio',key:'parkingsound',url:['assets/audio/parking.mp3']}]});
 const cfg={version:1,indexFields:{version:2,custom:'keep',files:['assets/manifests/core.json','assets/manifests/auto-discovered.json']},startupFile:'assets/manifests/source/startup.json',bundleFiles:['assets/manifests/source/bundles/scenes.json'],bundleOrder:['startup','shared','scene:LocationScene']};
 put(CONFIG,cfg);put(cfg.startupFile,{ui:['image:menu']});
 put(cfg.bundleFiles[0],{bundles:{shared:['image:menu'],'scene:LocationScene':['audio:parkingsound']}});
 const ws=require(path.join(root,'tools/manifest-workspace.cjs')),c=ws.context(root);
 function rebuild(){const idx=ws.assemble(c);put(INDEX,idx);put(STATE,{version:1,lastIndexHash:hash(raw(INDEX)),allowedMissing:[],protectedTools:{}});}
 rebuild();return {root,put,raw,read,ws,c,rebuild,exists:f=>fs.existsSync(path.join(root,f))};
}
test('preview changes no source files and creates no backup',t=>{const f=fixture(t),before=f.raw(INDEX);const p=run(f.root);assert.equal(p.runtimeEquivalent,true);assert.equal(p.movedCatalogs.length,2);assert.deepEqual(f.raw(INDEX),before);assert.equal(f.exists('assets/manifests/catalog'),false);assert.equal(f.exists('manifest-backups'),false);});
test('apply moves catalog bytes exactly and keeps metadata',t=>{const f=fixture(t),raw=f.raw('assets/manifests/core.json');const r=run(f.root,true);assert.equal(r.movedCatalogs.length,2);assert.equal(f.exists('assets/manifests/core.json'),false);assert.deepEqual(f.raw('assets/manifests/catalog/core.json'),raw);assert.equal(f.read('assets/manifests/catalog/core.json').note,'metadata preserved');assert.equal(f.ws.check(f.c).upToDate,true);});
test('startup and all bundle references remain unchanged',t=>{const f=fixture(t),before=f.read(INDEX);run(f.root,true);const after=f.read(INDEX);assert.deepEqual(after.startup,before.startup);assert.deepEqual(after.bundles,before.bundles);assert.equal(after.custom,'keep');});
test('second apply is idempotent',t=>{const f=fixture(t);run(f.root,true);const before=f.raw(INDEX),r=run(f.root,true);assert.equal(r.alreadyOrganized,true);assert.equal(r.backup,null);assert.deepEqual(f.raw(INDEX),before);});
test('rollback restores exact original catalog, config, state and index bytes',t=>{const f=fixture(t),files=[INDEX,CONFIG,STATE,'assets/manifests/core.json','assets/manifests/auto-discovered.json'];const before=new Map(files.map(n=>[n,f.raw(n)]));const r=run(f.root,true);restore(f.root,r.backup);for(const [n,b]of before)assert.deepEqual(f.raw(n),b,n);assert.equal(f.exists('assets/manifests/catalog/core.json'),false);assert.equal(f.ws.check(f.c).upToDate,true);});
test('rollback refuses to overwrite later catalog edits',t=>{const f=fixture(t),r=run(f.root,true);f.put('assets/manifests/catalog/core.json',{assets:[]});assert.throws(()=>restore(f.root,r.backup),/Changed since migration/);});
test('target collision is refused without overwriting either file',t=>{const f=fixture(t);f.put('assets/manifests/catalog/core.json','DO NOT OVERWRITE');assert.throws(()=>run(f.root,true),/Target exists/);assert.equal(f.raw('assets/manifests/catalog/core.json').toString(),'DO NOT OVERWRITE');assert.equal(f.exists('assets/manifests/core.json'),true);});
test('pending source changes are not silently built',t=>{const f=fixture(t),d=f.read(CONFIG);d.indexFields.custom='pending';f.put(CONFIG,d);assert.throws(()=>run(f.root,true),/pending source/);assert.equal(f.exists('assets/manifests/catalog'),false);});
test('externally edited generated index is protected',t=>{const f=fixture(t),d=f.read(INDEX);d.custom='edited';f.put(INDEX,d);assert.throws(()=>run(f.root,true),/edited outside/);});
test('duplicate asset keys block migration',t=>{const f=fixture(t);const doc=f.read('assets/manifests/auto-discovered.json');doc.assets.push(f.read('assets/manifests/core.json').assets[0]);f.put('assets/manifests/auto-discovered.json',doc);assert.throws(()=>run(f.root,true),/Duplicate asset/);});
test('BOM and original formatting are preserved',t=>{const f=fixture(t),doc=f.read('assets/manifests/core.json'),bytes=Buffer.from('\uFEFF'+JSON.stringify(doc));f.put('assets/manifests/core.json',bytes);run(f.root,true);assert.deepEqual(f.raw('assets/manifests/catalog/core.json'),bytes);});
test('new missing asset blocks migration',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.root,'assets/ui/menu.webp'));assert.throws(()=>run(f.root,true),/New missing/);});
test('existing missing-asset baseline is not expanded or deleted',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.root,'assets/ui/menu.webp'));const state=f.read(STATE);state.allowedMissing=['assets/ui/menu.webp'];f.put(STATE,state);run(f.root,true);assert.deepEqual(f.read(STATE).allowedMissing,state.allowedMissing);});
test('partial migration retains already organized catalog paths',t=>{const f=fixture(t);const d=f.read(CONFIG);f.put('assets/manifests/catalog/core.json',f.raw('assets/manifests/core.json'));fs.unlinkSync(path.join(f.root,'assets/manifests/core.json'));d.indexFields.files[0]='assets/manifests/catalog/core.json';f.put(CONFIG,d);f.rebuild();const r=run(f.root,true);assert.equal(r.movedCatalogs.length,1);assert.equal(f.ws.check(f.c).upToDate,true);});
test('migration backup can be redone after restore',t=>{const f=fixture(t),r=run(f.root,true),s=restore(f.root,r.backup);restore(f.root,s.redoBackup);assert.equal(f.exists('assets/manifests/catalog/core.json'),true);assert.equal(f.exists('assets/manifests/core.json'),false);});
test('no backups from earlier audio stages are required',t=>{const f=fixture(t);assert.equal(f.exists('manifest-backups/stage2b-before'),false);assert.equal(run(f.root,true).runtimeEquivalent,true);});
