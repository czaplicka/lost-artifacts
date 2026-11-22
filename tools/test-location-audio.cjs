#!/usr/bin/env node
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pairs={alley:'alleysound',bank:'banksound',hotel:'hotelsound',parking:'parkingsound',policehq:'policesound',restaurant:'restaurantsound'};
const refs=Object.values(pairs).map(k=>'audio:'+k);
let select,AssetManager,OldAssetManager;
function compile(source){
 const stripped=source.replace(/^import .*;\r?\n/gm,'').replace('export class AssetManager','class AssetManager');
 return new Function('__dialogueText','gameState','Phaser','selectLocationAudioRefs',stripped+'\nreturn AssetManager;')(
  (_file,id)=>id,{}, {Scene:class{}},select);
}
test.before(async()=>{
 const url='data:text/javascript;base64,'+Buffer.from(read('managers/LocationAudioSelection.js')).toString('base64');
 select=(await import(url)).selectLocationAudioRefs;
 AssetManager=compile(read('managers/AssetManager.js'));
 OldAssetManager=compile(read('manifest-backups/stage2b-before/managers/AssetManager.js'));
});
function fixture(){
 const catalog=[...Object.values(pairs),'paper_rustle','officescenesound'].map(key=>({type:'audio',key,url:'assets/audio/'+key+'.mp3'}));
 catalog.push({type:'image',key:'extra',url:'extra.webp'},{type:'video',key:'in',url:'in.mp4'},{type:'video',key:'out',url:'out.mp4'});
 const manifest={bundleVersion:1,assetCatalog:catalog,bundles:{shared:['audio:paper_rustle'],'scene:LocationScene':[...refs],'scene:OfficeScene':['audio:officescenesound'],'scene:HollyIntroScene':[]}};
 const stores={audio:new Set(),image:new Set(),json:new Set(),video:new Set()},targets=new Map(),requests=[],pending=[];
 const game={events:new EventEmitter(),textures:{exists:k=>stores.image.has(k),remove:k=>stores.image.delete(k)},cache:{},scene:{scenes:[],keys:{},getScene:key=>{if(!targets.has(key))targets.set(key,{events:new EventEmitter()});return targets.get(key);}}};
 for(const [type,set]of Object.entries(stores))game.cache[type]={exists:k=>set.has(k),remove:k=>set.delete(k)};
 game.cache.json.get=k=>k==='assetManifest'?manifest:null;
 const loader=new EventEmitter();
 for(const type of ['audio','image','json','video'])loader[type]=(key,url)=>{pending.push({type,key,url});requests.push({type,key,url});};
 let fail=null;
 loader.start=()=>queueMicrotask(()=>{
  for(const a of pending.splice(0)){
   if(a.key===fail)loader.emit('loaderror',a);
   else stores[a.type].add(a.key);
  }
  loader.emit('complete');
 });
 loader.reset=()=>{pending.length=0;};
 const manager=new AssetManager(game);manager.workerPromise=Promise.resolve({load:loader});
 const enter=async locationId=>{await manager.prepareScene('LocationScene',{locationId});game.scene.getScene('LocationScene').events.emit('create');};
 const leave=()=>game.scene.getScene('LocationScene').events.emit('shutdown');
 const ambients=()=>requests.filter(a=>refs.includes('audio:'+a.key)).map(a=>a.key);
 return {manager,manifest,game,requests,stores,enter,leave,ambients,setFail:k=>{fail=k;}};
}
for(const [location,key]of Object.entries(pairs))test('selector: '+location+' chooses only '+key,()=>assert.deepEqual(select('scene:LocationScene',refs,{sceneKey:'LocationScene',locationId:location}),['audio:'+key]));
test('unknown location retains extra refs, but no unrelated ambient',()=>assert.deepEqual(select('scene:LocationScene',[...refs,'image:extra'],{sceneKey:'LocationScene',locationId:'museum'}),['image:extra']));
test('missing location has no ambient, matching LocationScene map',()=>assert.deepEqual(select('scene:LocationScene',refs,{sceneKey:'LocationScene'}),[]));
test('prototype key is not treated as a location',()=>assert.deepEqual(select('scene:LocationScene',refs,{sceneKey:'LocationScene',locationId:'constructor'}),[]));
test('other bundles are untouched',()=>assert.equal(select('shared',refs,{sceneKey:'LocationScene',locationId:'bank'}),refs));
test('generic calls without context keep existing full-bundle behavior',()=>assert.equal(select('scene:LocationScene',refs),refs));
test('different scene context cannot filter the bundle',()=>assert.equal(select('scene:LocationScene',refs,{sceneKey:'OfficeScene',locationId:'bank'}),refs));
test('original array is not mutated',()=>{const before=[...refs];select('scene:LocationScene',refs,{sceneKey:'LocationScene',locationId:'bank'});assert.deepEqual(refs,before);});
test('selected ambient missing from manifest gives explicit error',()=>assert.throws(()=>select('scene:LocationScene',[],{sceneKey:'LocationScene',locationId:'bank'}),/missing.*banksound/));
test('real assetsFor preserves extra non-ambient assets',()=>{const f=fixture();f.manifest.bundles['scene:LocationScene'].push('image:extra');assert.deepEqual(f.manager.assetsFor(['scene:LocationScene'],{sceneKey:'LocationScene',locationId:'parking'}).map(a=>a.key),['parkingsound','extra']);});
test('real prepareScene awaits precisely parking audio',async()=>{const f=fixture();await f.enter('parking');assert.deepEqual(f.ambients(),['parkingsound']);assert.equal(f.stores.audio.has('parkingsound'),true);assert.equal(f.stores.audio.has('banksound'),false);});
test('real transition parking -> bank selects fresh context',async()=>{const f=fixture();await f.enter('parking');f.leave();await f.enter('bank');assert.deepEqual(f.ambients(),['parkingsound','banksound']);});
test('reentry uses existing audio cache without another request',async()=>{const f=fixture();await f.enter('parking');f.leave();await f.enter('parking');assert.deepEqual(f.ambients(),['parkingsound']);});
test('unknown location does not request the six ambients',async()=>{const f=fixture();await f.enter('museum');assert.deepEqual(f.ambients(),[]);});
test('OfficeScene still loads office audio',async()=>{const f=fixture();await f.manager.prepareScene('OfficeScene');assert.equal(f.stores.audio.has('officescenesound'),true);assert.deepEqual(f.ambients(),[]);});
test('shared is still pinned and scene owner released on shutdown',async()=>{const f=fixture();await f.enter('bank');assert.equal(f.manager.owners.size,2);f.leave();assert.equal(f.manager.owners.size,1);assert.equal(f.manager.owners.has('shared'),true);});
test('mandatory HollyIntro videos still appended',()=>{const f=fixture();assert.deepEqual(f.manager.assetsFor(['scene:HollyIntroScene']).map(a=>a.key),['in','out']);});
test('unknown required references still fail',()=>{const f=fixture();f.manifest.bundles.extra=['audio:missing'];assert.throws(()=>f.manager.assetsFor(['extra']),/Unknown asset/);});
test('missing bundle still fails',()=>{const f=fixture();assert.throws(()=>f.manager.assetsFor(['missing']),/Missing bundle/);});
test('failed selected audio rejects; next attempt can retry',async()=>{const f=fixture();f.setFail('banksound');await assert.rejects(f.enter('bank'));assert.equal(f.manager.prepared.has('LocationScene'),false);f.setFail(null);await f.enter('bank');assert.equal(f.stores.audio.has('banksound'),true);});
test('other AssetManager methods are byte-equivalent function bodies',()=>{
 const changed=new Set(['constructor','assetsFor','ensureBundles','prepareScene','debugStatus']);
 const oldDescriptors=Object.getOwnPropertyDescriptors(OldAssetManager.prototype),newDescriptors=Object.getOwnPropertyDescriptors(AssetManager.prototype);
 assert.deepEqual(Object.keys(newDescriptors),Object.keys(oldDescriptors));
 for(const [name,descriptor]of Object.entries(oldDescriptors))if(!changed.has(name))for(const kind of ['value','get','set'])if(typeof descriptor[kind]==='function')assert.equal(String(newDescriptors[name][kind]),String(descriptor[kind]),name);
});
