#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {run,restore}=require('./retire-legacy-bundles.cjs');
const C='assets/manifests/source/project.json',I='assets/manifests/index.json',S='assets/manifests/source/state.json';
const L='assets/manifests/source/bundles/legacy/',A='assets/manifests/source/archive/legacy-bundles/';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const workspace=String.raw`const fs=require('node:fs'),path=require('node:path');
function context(root){function full(f){const p=path.resolve(root,f),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('Path outside project');return p;}const raw=f=>fs.readFileSync(full(f));return {root,full,raw,exists:f=>fs.existsSync(full(f)),read:f=>JSON.parse(raw(f))};}
const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
function assemble(c){const cfg=c.read('assets/manifests/source/project.json'),bundles=Object.create(null);for(const f of cfg.bundleFiles)for(const [k,v]of Object.entries(c.read(f).bundles)){if(Object.hasOwn(bundles,k))throw Error('Duplicate bundle');bundles[k]=v;}const startup=c.read(cfg.startupFile);bundles.startup=Object.values(startup).flat();const ordered=Object.create(null);for(const k of cfg.bundleOrder||[])if(Object.hasOwn(bundles,k))ordered[k]=bundles[k];for(const k of Object.keys(bundles))if(!Object.hasOwn(ordered,k))ordered[k]=bundles[k];return {...cfg.indexFields,startup,bundles:ordered};}
module.exports={context,equal,assemble};`;
const catalogs=String.raw`const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ws=require('./manifest-workspace.cjs');const I='assets/manifests/index.json',S='assets/manifests/source/state.json';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
module.exports.build=(root,write)=>{if(fs.existsSync(path.join(root,'FAIL_BUILD')))throw Error('simulated build failure');const c=ws.context(root),state=c.read(S);if(hash(c.raw(I))!==state.lastIndexHash)throw Error('Generated index edited externally');const next=ws.assemble(c),equal=ws.equal(next,c.read(I));if(write&&!equal){const bytes=Buffer.from(JSON.stringify(next,null,2)+'\n');fs.writeFileSync(path.join(root,I),bytes);fs.writeFileSync(path.join(root,S),JSON.stringify({...state,lastIndexHash:hash(bytes)},null,2)+'\n');}return {upToDate:write?true:equal};};`;
const links=String.raw`const fs=require('node:fs'),path=require('node:path');
module.exports.audit=root=>({summary:{scanErrors:fs.existsSync(path.join(root,'SCAN_ERROR'))?1:0,legacyMentions:fs.existsSync(path.join(root,'MENTION'))?1:0}});`;
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ma-retire-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 function put(f,data){const p=path.join(root,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(data)?data:typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');}
 const raw=f=>fs.readFileSync(path.join(root,f)),read=f=>JSON.parse(raw(f));
 put('tools/manifest-workspace.cjs',workspace);put('tools/catalog-sources.cjs',catalogs);put('tools/check-manifest-links.cjs',links);
 put('assets/manifests/catalog/core.json',{assets:[{type:'image',key:'first',url:'a.webp'},{type:'image',key:'second',url:'b.webp'},{type:'audio',key:'third',url:'c.mp3'},{type:'json',key:'fourth',url:'d.json'}]});
 put('assets/manifests/source/startup.json',{backgrounds:['image:first']});
 put('assets/manifests/source/bundles/main.json',{bundles:{shared:['image:first'],'scene:A':['image:second']}});
 put(L+'all-assets.json',{bundles:{'auto:assets':['image:first','image:second','audio:third','json:fourth']}});
 put(L+'discovered.json',{bundles:{'auto:discovered':['image:first']}});
 put(L+'folders/x-111.json',{bundles:{'auto:folder:x':['audio:third']}});
 const cfg={version:1,indexFields:{version:2,files:['assets/manifests/catalog/core.json']},startupFile:'assets/manifests/source/startup.json',bundleFiles:['assets/manifests/source/bundles/main.json',L+'all-assets.json',L+'discovered.json',L+'folders/x-111.json'],bundleOrder:['startup','shared','scene:A','auto:assets','auto:discovered','auto:folder:x']};put(C,cfg);
 const ws=require(path.join(root,'tools/manifest-workspace.cjs')),idx=ws.assemble(ws.context(root));put(I,idx);put(S,{version:1,lastIndexHash:sha(raw(I))});
 return {root,put,raw,read,exists:f=>fs.existsSync(path.join(root,f)),bundles:()=>Object.keys(read(I).bundles)};
}
test('preview writes nothing and reports practical effect',t=>{const f=fixture(t),idx=f.raw(I),cfg=f.raw(C);const r=run(f.root);assert.equal(r.retiredBundles,3);assert.equal(r.retiredReferences,6);assert.equal(r.assetsNoLongerInAnyBundle,2);assert.ok(r.indexBytesAfter<r.indexBytesBefore);assert.deepEqual(f.raw(I),idx);assert.deepEqual(f.raw(C),cfg);assert.equal(f.exists('manifest-backups'),false);});
test('apply removes only auto bundles from generated index',t=>{const f=fixture(t),before=f.read(I);const r=run(f.root,true);const after=f.read(I);assert.equal(r.backup.startsWith('manifest-backups/legacy-retire-'),true);assert.deepEqual(Object.keys(after.bundles),['startup','shared','scene:A']);assert.deepEqual(after.bundles.shared,before.bundles.shared);assert.deepEqual(after.startup,before.startup);assert.deepEqual(after.files,before.files);});
test('legacy source files are archived byte-for-byte, not deleted',t=>{const f=fixture(t),a=f.raw(L+'all-assets.json'),b=f.raw(L+'folders/x-111.json');run(f.root,true);assert.deepEqual(f.raw(A+'all-assets.json'),a);assert.deepEqual(f.raw(A+'folders/x-111.json'),b);assert.equal(f.exists(L+'all-assets.json'),false);});
test('asset catalogs and startup remain unchanged',t=>{const f=fixture(t),catalog=f.raw('assets/manifests/catalog/core.json'),startup=f.raw('assets/manifests/source/startup.json');run(f.root,true);assert.deepEqual(f.raw('assets/manifests/catalog/core.json'),catalog);assert.deepEqual(f.raw('assets/manifests/source/startup.json'),startup);});
test('state hash matches rebuilt index',t=>{const f=fixture(t);run(f.root,true);assert.equal(f.read(S).lastIndexHash,sha(f.raw(I)));});
test('second apply is a no-op',t=>{const f=fixture(t);run(f.root,true);const idx=f.raw(I),r=run(f.root,true);assert.equal(r.alreadyRetired,true);assert.equal(r.backup,null);assert.deepEqual(f.raw(I),idx);});
test('restore recreates original source and index semantics',t=>{const f=fixture(t),before=f.read(I),r=run(f.root,true);restore(f.root,r.backup);assert.deepEqual(f.read(I),before);assert.equal(f.exists(L+'all-assets.json'),true);assert.equal(f.exists(A+'all-assets.json'),false);assert.equal(f.exists('assets/manifests/source/archive'),false);});
test('restore refuses to overwrite later archive edits',t=>{const f=fixture(t),r=run(f.root,true);f.put(A+'all-assets.json',{bundles:{}});assert.throws(()=>restore(f.root,r.backup),/Changed since backup/);});
test('code mention of auto bundle blocks apply',t=>{const f=fixture(t);f.put('MENTION','x');assert.throws(()=>run(f.root,true),/mentions an auto:/);assert.equal(f.exists(L+'all-assets.json'),true);});
test('code scan errors block apply',t=>{const f=fixture(t);f.put('SCAN_ERROR','x');assert.throws(()=>run(f.root,true),/scan has errors/);assert.equal(f.exists(L+'all-assets.json'),true);});
test('non-auto bundle in legacy source blocks apply',t=>{const f=fixture(t);f.put(L+'discovered.json',{bundles:{'scene:Accidental':['image:first']}});const ws=require(path.join(f.root,'tools/manifest-workspace.cjs'));f.put(I,ws.assemble(ws.context(f.root)));f.put(S,{version:1,lastIndexHash:sha(f.raw(I))});assert.throws(()=>run(f.root,true),/Unexpected legacy bundle/);assert.equal(f.exists(A),false);});
test('archive collision blocks overwrite',t=>{const f=fixture(t);f.put(A+'all-assets.json','mine');assert.throws(()=>run(f.root,true),/already exists/);assert.equal(f.raw(A+'all-assets.json').toString(),'mine');});
test('pending sources are not silently built',t=>{const f=fixture(t),d=f.read('assets/manifests/source/bundles/main.json');d.bundles.shared.push('image:second');f.put('assets/manifests/source/bundles/main.json',d);assert.throws(()=>run(f.root,true),/Pending source changes/);});
test('build failure restores legacy source files and index',t=>{const f=fixture(t),idx=f.raw(I),cfg=f.raw(C);f.put('FAIL_BUILD','x');assert.throws(()=>run(f.root,true),/simulated build failure/);fs.unlinkSync(path.join(f.root,'FAIL_BUILD'));assert.deepEqual(f.raw(I),idx);assert.deepEqual(f.raw(C),cfg);assert.equal(f.exists(L+'all-assets.json'),true);assert.equal(f.exists(A),false);});
test('auto bundle outside registered legacy sources blocks migration',t=>{const f=fixture(t),d=f.read('assets/manifests/source/bundles/main.json');d.bundles['auto:hidden']=['image:first'];f.put('assets/manifests/source/bundles/main.json',d);const ws=require(path.join(f.root,'tools/manifest-workspace.cjs'));f.put(I,ws.assemble(ws.context(f.root)));f.put(S,{version:1,lastIndexHash:sha(f.raw(I))});assert.throws(()=>run(f.root,true),/outside registered legacy/);});
test('no older backups are required',t=>{const f=fixture(t);assert.equal(f.exists('manifest-backups'),false);assert.equal(run(f.root,true).alreadyRetired,false);});
