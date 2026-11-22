#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const base='assets/manifests/source/',backup='manifest-backups/stage2-audio-before/';
const p=read(base+'project.json'),s=read(base+'bundles/shared.json'),a=read(base+'bundles/agency.json'),l=read(base+'bundles/location-audio.json');
const op=read(backup+base+'project.json'),os=read(backup+base+'bundles/shared.json'),oa=read(backup+base+'bundles/agency.json');
const location=['alleysound','banksound','hotelsound','parkingsound','policesound','restaurantsound'].map(k=>'audio:'+k);
const moved=[...location,'audio:officescenesound'];
let passed=0;
function check(name,fn){fn();passed++;console.log('OK '+name);}
check('all moved refs existed once in original shared',()=>{for(const r of moved)assert.equal(os.bundles.shared.filter(x=>x===r).length,1);});
check('shared changed only by removing seven audio refs',()=>assert.deepEqual(s,{bundles:{shared:os.bundles.shared.filter(r=>!moved.includes(r))}}));
check('other shared refs keep their original order',()=>assert.equal(s.bundles.shared.length,os.bundles.shared.length-7));
check('agency changed only by adding office audio',()=>{const expected=structuredClone(oa);expected.bundles['scene:OfficeScene'].push('audio:officescenesound');assert.deepEqual(a,expected);});
check('LocationScene owns precisely six known ambient refs',()=>assert.deepEqual(l,{bundles:{'scene:LocationScene':location}}));
check('project changed only by registering new source and bundle',()=>{const expected=structuredClone(op);expected.bundleFiles.push(base+'bundles/location-audio.json');expected.bundleOrder.push('scene:LocationScene');assert.deepEqual(p,expected);});
check('source list has no duplicate paths',()=>assert.equal(new Set(p.bundleFiles).size,p.bundleFiles.length));
check('new scene bundle was not present in original bundleOrder',()=>assert.equal(op.bundleOrder.includes('scene:LocationScene'),false));
check('no duplicate bundle names across the changed documents',()=>{const names=[...Object.keys(s.bundles),...Object.keys(a.bundles),...Object.keys(l.bundles)];assert.equal(new Set(names).size,names.length);});
check('complete ref union preserved',()=>{const flatten=(...docs)=>new Set(docs.flatMap(d=>Object.values(d.bundles).flat()));assert.deepEqual(flatten(s,a,l),flatten(os,oa));});
check('remaining global phone audio and lab audio unchanged',()=>{for(const r of ['sfx_dial','sfx_ring','sfx_ringing','sfx_busy','sfx_pickup','new_mail','crimelab_ambient'])assert.equal(s.bundles.shared.includes('audio:'+r),os.bundles.shared.includes('audio:'+r));});
check('office and location audio not required by shared anymore',()=>{for(const r of moved)assert.equal(s.bundles.shared.includes(r),false);});
console.log(passed+' structural checks passed. Browser/Phaser integration was NOT tested.');
