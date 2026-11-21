#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {context,init,check,scan,restore,assemble}=require('./manifest-workspace.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-workspace-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(f,x)=>{const p=path.join(root,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');};
 put('assets/ui/menu.webp','image fixture');put('assets/audio/parking.mp3','audio fixture');
 put('assets/manifests/core.json',{assets:[{key:'menu',type:'image',url:'assets/ui/menu.webp',groups:['ui']},{key:'parking',type:'audio',url:'assets/audio/parking.mp3'}]});
 const index={version:2,files:['assets/manifests/core.json'],custom:{keep:true},startup:{ui:['image:menu']},bundles:{startup:['image:menu'],shared:['audio:parking'],'scene:IntroScene':['image:menu'],'auto:assets':['image:menu','audio:parking']}};
 put('assets/manifests/index.json',index);
 for(const f of ['scan-assets','audit-assets'])put('tools/'+f+'.cjs',"#!/usr/bin/env node\n'use strict';\nmodule.exports={};\n");
 const c=context(root);return {root,put,index,c};
}
test('dry run is read only',t=>{const {c}=fixture(t);const before=c.raw('assets/manifests/index.json');assert.equal(init(c,true).equivalent,true);assert.equal(c.exists('assets/manifests/source'),false);assert.deepEqual(c.raw('assets/manifests/index.json'),before);});
test('migration preserves complete runtime input and catalog bytes',t=>{const {c,index}=fixture(t);const before=c.raw('assets/manifests/core.json'),raw=c.raw('assets/manifests/index.json');init(c);assert.deepEqual(JSON.parse(JSON.stringify(assemble(c))),index);assert.deepEqual(c.raw('assets/manifests/core.json'),before);assert.deepEqual(c.raw('assets/manifests/index.json'),raw);assert.equal(check(c).upToDate,true);});
test('repeat initialization refused',t=>{const {c}=fixture(t);init(c);assert.throws(()=>init(c),/already exists/);});
test('legacy auto bundles retained, not loaded or deleted',t=>{const {c,index}=fixture(t);init(c);assert.deepEqual(assemble(c).bundles['auto:assets'],index.bundles['auto:assets']);});
test('inconsistent startup fails without writes',t=>{const {c,index,put}=fixture(t);index.bundles.startup=[];put('assets/manifests/index.json',index);assert.throws(()=>init(c),/startup.*differ/);assert.equal(c.exists('assets/manifests/source'),false);});
test('duplicate asset keys fail without writes',t=>{const {c,put}=fixture(t);const d=c.read('assets/manifests/core.json');d.assets.push(d.assets[0]);put('assets/manifests/core.json',d);assert.throws(()=>init(c),/Duplicate asset/);assert.equal(c.exists('assets/manifests/source'),false);});
test('unknown reference fails without writes',t=>{const {c,index,put}=fixture(t);index.bundles.shared.push('image:unknown');put('assets/manifests/index.json',index);assert.throws(()=>init(c),/Unknown reference/);});
test('existing missing files reported and preserved as baseline debt',t=>{const {c}=fixture(t);fs.unlinkSync(c.full('assets/audio/parking.mp3'));const r=init(c);assert.deepEqual(r.missingFiles,['assets/audio/parking.mp3']);assert.equal(check(c).upToDate,true);});
test('new missing file blocks build',t=>{const {c}=fixture(t);init(c);fs.unlinkSync(c.full('assets/ui/menu.webp'));assert.throws(()=>check(c,true),/New missing/);});
test('manual generated index edits are not overwritten',t=>{const {c,put}=fixture(t);init(c);const d=c.read('assets/manifests/index.json');d.custom.keep=false;put('assets/manifests/index.json',d);assert.throws(()=>check(c,true),/edited outside/);assert.equal(c.read('assets/manifests/index.json').custom.keep,false);});
test('source edit produces build, second build unchanged, restore in reverse order',t=>{const {c,put}=fixture(t);const migrated=init(c);const f='assets/manifests/source/bundles/shared.json',originalSource=c.raw(f),d=c.read(f);d.bundles.shared.push('image:menu');put(f,d);assert.equal(check(c).upToDate,false);const built=check(c,true);assert.equal(built.changed,true);assert.equal(check(c,true).changed,false);restore(c,built.backup);put(f,originalSource.toString('utf8'));restore(c,migrated.backup);assert.equal(c.exists('assets/manifests/source'),false);});
test('modified source is protected during migration rollback',t=>{const {c,put}=fixture(t);const r=init(c);put('assets/manifests/source/startup.json',{ui:[]});assert.throws(()=>restore(c,r.backup),/changed since backup/);});
test('legacy writer guard is installed, strict mode preserved, rollback restores bytes',t=>{const {c}=fixture(t);const before=c.raw('tools/scan-assets.cjs');const r=init(c);assert.match(c.raw('tools/scan-assets.cjs').toString(),/^#![^\n]*\n'use strict';\n/);const run=require('node:child_process').spawnSync(process.execPath,[c.full('tools/scan-assets.cjs')],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/workspace active/);restore(c,r.backup);assert.deepEqual(c.raw('tools/scan-assets.cjs'),before);});
test('overwritten legacy guard is detected',t=>{const {c,put}=fixture(t);init(c);put('tools/audit-assets.cjs','module.exports={};');assert.throws(()=>check(c,true),/Legacy tool changed/);});
test('scanner reports without inventing keys or changing files',t=>{const {c,put}=fixture(t);init(c);put('assets/ui/extra.webp','image');const before=c.raw('assets/manifests/index.json');assert.deepEqual(scan(c).unregistered,['assets/ui/extra.webp']);assert.deepEqual(c.raw('assets/manifests/index.json'),before);});
test('local path escape rejected',t=>{const {c,put}=fixture(t);const d=c.read('assets/manifests/core.json');d.assets[0].url='../../escape.webp';put('assets/manifests/core.json',d);assert.throws(()=>init(c),/outside project/);});
test('shared duplicate references preserved in phase one',t=>{const {c,index,put}=fixture(t);index.bundles.shared.push('audio:parking');put('assets/manifests/index.json',index);const r=init(c);assert.equal(r.warnings.length,1);assert.deepEqual(assemble(c).bundles.shared,index.bundles.shared);});
