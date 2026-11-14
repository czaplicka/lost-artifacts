import test from 'node:test';
import assert from 'node:assert/strict';
import {audit} from './engine.mjs';
import {makeGithub,safeFailure} from './github.mjs';
import {validRequest,localPath} from './registry.mjs';
const index='assets/manifests/index.json',part='assets/manifests/test.json';
const clone=v=>structuredClone(v);
function fixture(){return new Map([
[index,{version:2,files:[part],bundles:{shared:['image:npc']},startup:{npcPortraits:['image:npc']}}],
[part,{assets:[{type:'image',key:'npc',url:'assets/art/npc.webp',groups:['npcPortraits']}]}],
['assets/data/npcs.json',{version:1,npcs:{bankier:{id:'bankier',dialogueId:'bankier',portraits:{white:{key:'npc'}}}}}],
['assets/data/dialogue/banker.json',{bankerClues:{locationVariants:{default:{}}}}],
['assets/data/locations.json',[{id:'city',encounterPool:[{npcId:'bankier'}]}]],
['assets/data/piCases.json',{cases:[{id:'pi_test',kind:'side',requiresBoard:true,objectives:[{id:'find',text:'Find'}],initialItems:[{id:'note',type:'note'}],initialLinks:[]}]}],
['assets/data/piClassifieds.json',{advertisements:[{id:'ad',kind:'pi',missionId:'pi_test'}]}],
['assets/data/piPhotoQuest.json',{searchCaseId:'search_photo',definition:{id:'pi_photo',kind:'side',objectives:[{id:'goal',text:'Goal'}]},advert:{id:'photo_ad',missionId:'pi_photo'}}],
['assets/data/piSearch.json',{cases:[{id:'search_photo',keywords:[{id:'key'}],pages:[{id:'home',links:[{pageId:'home'}],blocks:[[{keywordId:'key'}]]}]}]}],
['assets/data/piMail.json',{messages:[]}],
['assets/data/piPhoneInvestigations.json',{contacts:[]}],
['assets/data/reedContact.json',{questId:'pi_photo',searchCaseId:'search_photo'}],
['assets/data/reedFinale.json',{questId:'pi_photo',requiredObjectives:['goal']}]
]);}
function io(docs=fixture(),options={}){const infoCalls=[];return{text:async p=>{if(options.fail===p)throw Error('network secret');const d=docs.get(p);return d===undefined?null:typeof d==='string'?d:JSON.stringify(d);},info:async p=>{infoCalls.push(p);if(options.infoFail)throw Error('network');return options.missing===p?null:p==='assets/art/npc.webp'||docs.has(p)?{type:'blob',size:20}:null;},infoCalls};}
const find=(r,code)=>r.issues.find(i=>i.code===code);
for(const phase of ['assets','npcs','cases','documents'])test('clean fixture '+phase,async()=>{const r=await audit(phase,io());assert.equal(r.totals.error,0,JSON.stringify(r.issues));assert.equal(r.totals.unknown,0);assert.equal(r.complete,true);});
test('reject mutation and arbitrary destinations',()=>{assert.ok(validRequest({action:'access'}));assert.ok(validRequest({action:'start'}));assert.ok(validRequest({action:'check',phase:'assets',head:'a'.repeat(40)}));for(const r of [{action:'publish'},{action:'start',url:'https://evil.test'},{action:'check',phase:'unknown',head:'a'.repeat(40)},{action:'check',phase:'assets',head:'main'},{action:'access',path:'secret'}])assert.equal(validRequest(r),false);});
test('safe paths and external distinction',()=>{assert.deepEqual(localPath('assets/art/npc.webp?v=1'),{kind:'local',path:'assets/art/npc.webp'});assert.equal(localPath('https://example.test/x').kind,'external');for(const p of ['assets/../secret','assets/%2e%2e/secret','assets/\\secret','supabase/client'])assert.equal(localPath(p).kind,'invalid');});
test('missing image file definitive error',async()=>{const r=await audit('assets',io(fixture(),{missing:'assets/art/npc.webp'}));assert.equal(find(r,'FILE_MISSING').severity,'error');});
test('unconfirmed existence never reported missing',async()=>{const r=await audit('assets',io(fixture(),{infoFail:true}));assert.equal(find(r,'FILE_MISSING'),undefined);assert.ok(find(r,'EXISTENCE_UNKNOWN'));assert.equal(r.complete,false);});
test('duplicate asset rejected',async()=>{const d=fixture();d.get(part).assets.push(clone(d.get(part).assets[0]));assert.ok(find(await audit('assets',io(d)),'ASSET_DUPLICATE'));});
test('missing manifest part yields incomplete',async()=>{const d=fixture();d.delete(part);const r=await audit('assets',io(d));assert.equal(r.complete,false);assert.ok(find(r,'SOURCE_MISSING'));assert.equal(find(r,'BUNDLE_REFERENCE').severity,'unknown');});
test('bundle key missing definitive with complete index',async()=>{const d=fixture();d.get(index).bundles.shared.push('image:missing');assert.equal(find(await audit('assets',io(d)),'BUNDLE_REFERENCE').severity,'error');});
test('invalid startup group',async()=>{const d=fixture();d.get(index).startup={backgrounds:['image:npc']};assert.ok(find(await audit('assets',io(d)),'STARTUP_GROUP'));});
test('external resources not fetched',async()=>{const d=fixture();d.get(part).assets[0].url='https://example.test/npc.webp';const f=io(d);const r=await audit('assets',f);assert.ok(find(r,'EXTERNAL_NOT_CHECKED'));assert.equal(f.infoCalls.length,0);});
test('bankier maps to banker file, no filename guess',async()=>{const r=await audit('npcs',io());assert.equal(find(r,'SOURCE_MISSING'),undefined);});
test('missing NPC dialogue root',async()=>{const d=fixture();d.set('assets/data/dialogue/banker.json',{});assert.ok(find(await audit('npcs',io(d)),'NPC_DIALOGUE_ROOT'));});
test('unknown dialogue mapping warning not invented missing file',async()=>{const d=fixture();d.get('assets/data/npcs.json').npcs.bankier.dialogueId='custom_runtime';const r=await audit('npcs',io(d));assert.equal(find(r,'NPC_DIALOGUE_UNKNOWN').severity,'warning');assert.equal(find(r,'SOURCE_MISSING'),undefined);});
test('city unknown NPC',async()=>{const d=fixture();d.get('assets/data/locations.json')[0].encounterPool[0].npcId='absent';assert.ok(find(await audit('npcs',io(d)),'CITY_NPC_MISSING'));});
test('missing nondefault portrait inherits, no error',async()=>{const r=await audit('npcs',io());assert.equal(r.totals.error,0);});
test('missing default portrait error',async()=>{const d=fixture();d.get('assets/data/npcs.json').npcs.bankier.portraits={};assert.ok(find(await audit('npcs',io(d)),'NPC_DEFAULT_PORTRAIT'));});
test('unregistered explicit NPC portrait error',async()=>{const d=fixture();d.get('assets/data/npcs.json').npcs.bankier.portraits.white.key='bad';assert.ok(find(await audit('npcs',io(d)),'NPC_PORTRAIT_KEY'));});
test('PI ad without case error',async()=>{const d=fixture();delete d.get('assets/data/piClassifieds.json').advertisements[0].missionId;assert.ok(find(await audit('cases',io(d)),'AD_NO_CASE'));});
test('PI ad with nonexistent case error',async()=>{const d=fixture();d.get('assets/data/piClassifieds.json').advertisements[0].missionId='absent';assert.ok(find(await audit('cases',io(d)),'AD_CASE_MISSING'));});
test('oddity needs no case',async()=>{const d=fixture();d.get('assets/data/piClassifieds.json').advertisements=[{id:'odd',kind:'oddity',missionId:null}];assert.equal((await audit('cases',io(d))).totals.error,0);});
test('unreadable PI catalog not mistaken for missing case',async()=>{const r=await audit('cases',io(fixture(),{fail:'assets/data/piCases.json'}));assert.equal(find(r,'AD_CASE_MISSING'),undefined);assert.ok(find(r,'AD_CASE_UNCONFIRMED'));assert.equal(r.complete,false);});
test('photo case distinct source handled',async()=>{const r=await audit('cases',io());assert.equal(find(r,'QUEST_ID_UNCONFIRMED'),undefined);});
test('required finale objective absent',async()=>{const d=fixture();d.get('assets/data/reedFinale.json').requiredObjectives=['not_real'];assert.ok(find(await audit('cases',io(d)),'OBJECTIVE_MISSING'));});
test('search IDs are not quest IDs',async()=>{const r=await audit('documents',io());assert.equal(find(r,'SEARCH_CASE_UNRESOLVED'),undefined);});
test('runtime-injected search scope warning not hard error',async()=>{const d=fixture();d.get('assets/data/reedContact.json').searchCaseId='generated';const r=await audit('documents',io(d));assert.equal(find(r,'SEARCH_CASE_UNRESOLVED').severity,'warning');});
test('missing static page link is qualified',async()=>{const d=fixture();d.get('assets/data/piSearch.json').cases[0].pages[0].links=[{pageId:'generated'}];const r=await audit('documents',io(d));assert.equal(find(r,'PAGE_UNRESOLVED').severity,'warning');});
test('missing file attachment error',async()=>{const d=fixture();d.get('assets/data/piMail.json').messages=[{id:'mail',attachments:[{path:'assets/data/absent.pdf'}]}];assert.ok(find(await audit('documents',io(d)),'FILE_MISSING'));});
test('runtime attachment ID not guessed as file',async()=>{const d=fixture();d.get('assets/data/piMail.json').messages=[{id:'mail',attachments:[{id:'generated'}]}];const r=await audit('documents',io(d));assert.ok(find(r,'ATTACHMENT_UNRESOLVED'));assert.equal(find(r,'FILE_MISSING'),undefined);});
test('dynamic image with explicit URL allowed without manifest key',async()=>{const d=fixture();d.get('assets/data/piSearch.json').cases[0].pages[0].imageKey='dynamic';d.get('assets/data/piSearch.json').cases[0].pages[0].imageUrl='assets/art/npc.webp';assert.equal(find(await audit('documents',io(d)),'IMAGE_KEY_UNREGISTERED'),undefined);});
test('malformed source JSON incomplete',async()=>{const d=fixture();d.set('assets/data/npcs.json','{oops');const r=await audit('npcs',io(d));assert.ok(find(r,'JSON_INVALID'));assert.equal(r.complete,false);});
test('null records do not crash phases',async()=>{const d=fixture();d.get('assets/data/piCases.json').cases.push(null);d.get('assets/data/piClassifieds.json').advertisements.push(null);d.get('assets/data/locations.json').push(null);for(const phase of ['npcs','cases'])assert.ok((await audit(phase,io(d))).issues.length);assert.ok(await audit('documents',io(d)));});
const head='a'.repeat(40),rootSha='b'.repeat(40),assetSha='c'.repeat(40),dataSha='d'.repeat(40),blobSha='e'.repeat(40);
function githubMock(){const calls=[];const req=async(url,options)=>{calls.push({url,options});let data;if(url.endsWith('lost-artifacts'))data={default_branch:'main'};else if(url.includes('/git/ref/heads/'))data={object:{sha:head}};else if(url.endsWith('/git/commits/'+head))data={tree:{sha:rootSha}};else if(url.endsWith('/git/trees/'+rootSha))data={tree:[{path:'assets',type:'tree',sha:assetSha}]};else if(url.endsWith('/git/trees/'+assetSha))data={tree:[{path:'data',type:'tree',sha:dataSha}]};else if(url.endsWith('/git/trees/'+dataSha))data={tree:[{path:'test.json',type:'blob',sha:blobSha,size:2}]};else if(url.endsWith('/git/blobs/'+blobSha))data={encoding:'base64',content:Buffer.from('{}').toString('base64')};else throw Error('unexpected');return{ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(data)};};return{calls,req};}
test('GitHub reads pinned trees and caches file lookups',async()=>{const m=githubMock(),g=makeGithub({token:'secret',request:m.req}),s=await g.start(),snap=g.snapshot(s.head);assert.equal(await snap.text('assets/data/test.json'),'{}');assert.equal(await snap.text('assets/data/test.json'),'{}');assert.ok(m.calls.every(c=>c.options.method==='GET'));assert.equal(m.calls.filter(c=>c.url.includes('/git/blobs/')).length,1);assert.equal(await snap.info('assets/data/Test.json'),null);});
test('no recursive tree truncation assumed complete',async()=>{const g=makeGithub({token:'x',request:async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({tree:{sha:rootSha}})})});await assert.rejects(()=>g.snapshot(head).info('assets/x'));});
test('request budget enforced',async()=>{const m=githubMock(),g=makeGithub({token:'x',maxCalls:1,request:m.req});await assert.rejects(()=>g.start());assert.equal(m.calls.length,1);});
test('transport refuses paths outside assets',async()=>{const m=githubMock(),g=makeGithub({token:'x',request:m.req});await assert.rejects(()=>g.snapshot(head).text('supabase/secret'));assert.equal(m.calls.length,0);});
test('sanitized failures do not echo secrets',()=>assert.ok(!safeFailure(Error('secret-value')).includes('secret-value')));

test('truncated shallow tree is rejected instead of claiming missing',async()=>{const m=githubMock();const request=async(url,options)=>url.includes('/git/trees/')?{ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({truncated:true,tree:[]})}:m.req(url,options);const g=makeGithub({token:'x',request});await assert.rejects(()=>g.snapshot(head).info('assets/x'));});
test('response byte budget enforced',async()=>{const m=githubMock(),g=makeGithub({token:'x',request:m.req,maxBytes:1});await assert.rejects(()=>g.start());});
test('invalid asset groups do not crash audit',async()=>{const d=fixture();d.get(part).assets[0].groups='npcPortraits';const r=await audit('assets',io(d));assert.ok(find(r,'ASSET_GROUP'));});
test('empty asset is definitive error',async()=>{const f=io();f.info=async()=>({type:'blob',size:0});const r=await audit('assets',f);assert.ok(find(r,'FILE_EMPTY'));});
