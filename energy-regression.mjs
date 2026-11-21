import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const source=(relative,flat)=>fs.readFileSync(fs.existsSync(path.join(root,relative))?path.join(root,relative):path.join(here,flat),'utf8');
const strip=s=>s.replace(/^import\s+[\s\S]*?;\s*$/gm,'').replace(/export default EnergyManager;/g,'').replace(/\bexport (?=(?:function|const|class)\b)/g,'');
const listeners=new Map();
const EventBus={on(k,fn){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);},off(k,fn){listeners.get(k)?.delete(fn);},emit(k,...args){for(const fn of [...(listeners.get(k)||[])])fn(...args);}};
let state={};
const methods={updateState(v){Object.assign(state,structuredClone(v));},getState(){return structuredClone(state);},
 exportForSave(){return structuredClone(state);},importFromSave(v){state=structuredClone(v.state??v);return true;}};
const gameState=new Proxy({}, {get(_t,k){return k==='state'?state:k in methods?methods[k]:state[k];},set(_t,k,v){state[k]=v;return true;}});
let nextTimer=1;const timers=new Map();
const setTimeoutFake=fn=>{const id=nextTimer++;timers.set(id,fn);return id;};
const clearTimeoutFake=id=>timers.delete(id);
function flushTimers(){const batch=[...timers.values()];timers.clear();for(const fn of batch)fn();}
class HQExhaustionCallUI{constructor(){this.isOpen=false;}destroy(){this.isOpen=false;this.done=null;}open({onDone}){this.isOpen=true;this.done=onDone;return true;}finish(){const done=this.done;this.destroy();done?.();}}
const __dialogueText=(_p,id)=>`text:${id}`;
const resourcefulnessManager={getSearchEnergyQuote:(_t,n)=>({finalCost:n}),formatSearchEnergyQuote:()=>''};
const dependencies={__dialogueText,EventBus,gameState,resourcefulnessManager,HQExhaustionCallUI,
 DEFAULT_DIFFICULTY:'field',getDifficultyConfig:()=>({energyCostMultiplier:1,sleepRecoveryMultiplier:1,randomEvents:{illness:{}}}),isValidDifficulty:x=>x==='field',
 setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake};
const energyModule=new Function(...Object.keys(dependencies),strip(source('managers/EnergyManager.js','EnergyManager.js'))+'\nreturn {EnergyManager,getEnergyManager,resetEnergyManager,energyRestoreData};')(...Object.values(dependencies));
const {EnergyManager,getEnergyManager,resetEnergyManager,energyRestoreData}=energyModule;
EnergyManager.prototype._requestAutosave=function(){};
const manager=getEnergyManager();
const fresh=()=>{timers.clear();state={energy:100,maxEnergy:100,difficulty:'field',isGameActive:true,caseFailed:false,caseResolved:false,
 currentMission:{id:'mission',energyBalance:{awakeMinutes:0,fatigueRemainder:0,lastSleepMinutes:null}},
 hqExhaustionIncidents:0,hqExhaustionCallPending:false,hqExhaustionWarningSeen:false,forcedSleepSession:null,energyModifiers:[]};manager.init('field');timers.clear();};
let passed=0;
const check=(name,fn)=>{fresh();fn();passed++;console.log('PASS '+name);};
check('restore energy rather than default 100',()=>{manager.restore({energy:37},{resumeEffects:false});assert.equal(manager.getCurrentEnergy(),37);assert.equal(gameState.energy,37);});
check('interview UI and consumption both require sleep',()=>{gameState.currentMission.energyBalance.awakeMinutes=1200;assert.equal(manager.canPerformInterview().reason,'sleep_required');assert.equal(manager.consumeInterview().reason,'sleep_required');assert.equal(manager.currentEnergy,100);});
check('activity and interview share block precedence',()=>{gameState.currentMission.energyBalance.awakeMinutes=1200;manager.hqExhaustionCallPending=true;assert.equal(manager.canPerformInterview().reason,'hq_call_active');assert.equal(manager.consumeInterview().reason,'hq_call_active');assert.equal(manager.canPerformActivity().reason,'hq_call_active');});
check('critical restore never increments incidents',()=>{manager.restore({energy:1,hqExhaustionIncidents:1,forcedSleepSession:null});flushTimers();assert.equal(manager.hqExhaustionIncidents,1);assert.equal(manager.isForcedSleepActive(),true);const snap=manager.serialize();manager.restore(snap);flushTimers();assert.equal(manager.hqExhaustionIncidents,1);assert.equal(gameState.caseFailed,false);});
check('legacy zero incidents remain zero on restore',()=>{manager.restore({energy:0,hqExhaustionIncidents:0,forcedSleepSession:null});flushTimers();assert.equal(manager.hqExhaustionIncidents,0);});
check('restored sleep charges time once',()=>{let minutes=0;const fn=h=>{minutes+=h*60;};EventBus.on('advanceTime',fn);try{manager.restore({energy:0,hqExhaustionIncidents:1,forcedSleepSession:null});flushTimers();assert.equal(minutes,360);manager.restore(manager.serialize());flushTimers();assert.equal(minutes,360);}finally{EventBus.off('advanceTime',fn);}});
check('fresh exhaustion counts and second fresh exhaustion fails',()=>{manager.currentEnergy=2;manager._consumeEnergy(1,'first',{activityType:'time_fatigue'});assert.equal(manager.hqExhaustionIncidents,1);manager._finishForcedSleep();manager.hqCallUI.finish();manager._consumeEnergy(100,'second',{activityType:'time_fatigue'});assert.equal(manager.hqExhaustionIncidents,2);assert.equal(gameState.gameOverReason,'exhaustion_repeat');assert.equal(gameState.caseFailed,true);});
check('HQ fatigue is retained and settled exactly once',()=>{manager.hqExhaustionCallPending=true;gameState.currentMission.energyBalance.fatigueRemainder=.5;manager._openHQCall();manager._onTimeAdvanced({addedMinutes:60});assert.equal(manager.currentEnergy,100);assert.equal(gameState.currentMission.energyBalance.fatigueRemainder,3.5);manager.hqCallUI.finish();assert.equal(manager.currentEnergy,97);assert.equal(gameState.currentMission.energyBalance.fatigueRemainder,.5);manager._settleTimeFatigue();assert.equal(manager.currentEnergy,97);});
check('rejected fatigue consumption retains entire debt',()=>{gameState.currentMission.energyBalance.fatigueRemainder=4.5;const original=manager._consumeEnergy;manager._consumeEnergy=()=>({success:false});try{manager._settleTimeFatigue();assert.equal(gameState.currentMission.energyBalance.fatigueRemainder,4.5);}finally{manager._consumeEnergy=original;}});
check('HQ fatigue debt survives serialization and restore',()=>{manager.hqExhaustionCallPending=true;manager._syncToGameState();manager._onTimeAdvanced({addedMinutes:60});const snapshot=structuredClone(state);manager.init();state=snapshot;manager.restore(snapshot,{resumeEffects:false});assert.equal(gameState.currentMission.energyBalance.fatigueRemainder,3);manager._openHQCall();manager.hqCallUI.finish();assert.equal(manager.currentEnergy,97);});
check('sleep does not add awake fatigue',()=>{manager.isSleepingManual=true;manager._onTimeAdvanced({addedMinutes:480});assert.equal(gameState.currentMission.energyBalance.awakeMinutes,0);assert.equal(manager.currentEnergy,100);});
check('singleton reset keeps references and listener count',()=>{const before=listeners.get('gameTime:advanced').size;resetEnergyManager();assert.equal(getEnergyManager(),manager);assert.equal(listeners.get('gameTime:advanced').size,before);});
check('partial slot payload preserves imported exhaustion fields',()=>{Object.assign(state,{hqExhaustionIncidents:1,hqExhaustionWarningSeen:true,forcedSleepSession:{hotelId:'agency',timeCharged:true}});manager.restore({energy:0,maxEnergy:100,difficulty:'field',energyLog:[],energyModifiers:[]},{resumeEffects:false});assert.equal(manager.hqExhaustionIncidents,1);assert.equal(manager.hqExhaustionWarningSeen,true);assert.equal(manager.forcedSleepSession.timeCharged,true);});
check('nested payload and explicit null',()=>{state.forcedSleepSession={hotelId:'agency'};const data=energyRestoreData({state:{energy:44,forcedSleepSession:null}});assert.equal(data.energy,44);assert.equal(data.forcedSleepSession,null);});
check('reset cancels deferred restore effects',()=>{manager.restore({energy:0,hqExhaustionIncidents:1});manager.init();flushTimers();assert.equal(manager.isSleepingForced,false);assert.equal(manager.hqExhaustionIncidents,0);});
const storage=new Map();
const windowFake={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
let story={},inventory={version:1,items:[]},rejectInventory=false;
const MainStoryManager={serialize:()=>structuredClone(story),deserialize:v=>{story=structuredClone(v);return true;},resetProgress:()=>{story={};}};
const inventoryManager={exportState:()=>structuredClone(inventory),importState:v=>{if(rejectInventory)return false;inventory=structuredClone(v);return true;}};
const persistenceDependencies={gameState,EventBus,MainStoryManager,inventoryManager,getEnergyManager,energyRestoreData,
 createCaseDirectorFromState:()=>null,captureInvestigationAudit:()=>{},window:windowFake,setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake};
const persistenceModule=new Function(...Object.keys(persistenceDependencies),strip(source('gameStatePersistence.js','gameStatePersistence.js'))+'\nreturn {loadGameState,saveGameState};')(...Object.values(persistenceDependencies));
check('autosave load restores manager and saved modifiers',()=>{const snap={...structuredClone(state),energy:29,energyModifiers:[{id:'illness',multiplier:1.5,remainingHours:2}]};storage.set('detectiveSaveData',JSON.stringify(snap));assert.equal(persistenceModule.loadGameState(),true);assert.equal(manager.currentEnergy,29);assert.equal(gameState.energy,29);assert.equal(manager.energyModifiers[0].multiplier,1.5);});
check('nested autosave restores zero without losing incident state',()=>{const snap={...structuredClone(state),energy:0,hqExhaustionIncidents:1,forcedSleepSession:{hotelId:'agency',timeCharged:true,sleepHours:6}};storage.set('detectiveSaveData',JSON.stringify({state:snap}));assert.equal(persistenceModule.loadGameState(),true);flushTimers();assert.equal(manager.currentEnergy,0);assert.equal(manager.hqExhaustionIncidents,1);assert.equal(manager.isSleepingForced,true);});
check('invalid inventory rejects load without replacing manager energy',()=>{manager.currentEnergy=66;manager._syncToGameState();const snap={...structuredClone(state),energy:13};storage.set('detectiveSaveData',JSON.stringify(snap));rejectInventory=true;const oldError=console.error;console.error=()=>{};try{assert.equal(persistenceModule.loadGameState(),false);assert.equal(manager.currentEnergy,66);assert.equal(gameState.energy,66);}finally{rejectInventory=false;console.error=oldError;}});

check('failure after energy import rolls back manager and game state',()=>{
 manager.currentEnergy=64;manager._syncToGameState();
 const snap={...structuredClone(state),energy:12,hqExhaustionIncidents:1};
 storage.set('detectiveSaveData',JSON.stringify(snap));
 const original=manager._emitEnergyChanged;let first=true;
 manager._emitEnergyChanged=function(){if(first){first=false;throw new Error('Injected notification failure');}return original.call(this);};
 const oldError=console.error;console.error=()=>{};
 try{assert.equal(persistenceModule.loadGameState(),false);assert.equal(manager.currentEnergy,64);assert.equal(gameState.energy,64);assert.equal(manager.hqExhaustionIncidents,0);}
 finally{manager._emitEnergyChanged=original;console.error=oldError;}
});
check('serialize restore preserves modifiers logs and warning flags',()=>{
 manager.energyModifiers=[{id:'illness',multiplier:1.5,remainingHours:2}];
 manager.energyLog=[{label:'history',amount:-7}];manager.lastEnergyChange={label:'last'};
 manager.hqExhaustionIncidents=1;manager.hqExhaustionWarningSeen=true;
 const snap=manager.serialize();manager.init();manager.restore(snap,{resumeEffects:false});
 assert.deepEqual(manager.serialize(),snap);
});

let restored=null;
const saveManager={applyState:data=>gameState.importFromSave(data),restoreEnergyManager:data=>{restored=structuredClone(data);},getLastUsedSlot:()=> 'slot_1',getState:()=>structuredClone(state)};
const chaseDependencies={__dialogueText,gameState,saveGameState:()=>true,saveManager,progressionManager:{grantReward:()=>({success:true})},energyRestoreData,
 validChase:()=>true,localStorage:windowFake.localStorage};
const chaseModule=new Function(...Object.keys(chaseDependencies),strip(source('systems/chasePersistence.js','chasePersistence.js'))+'\nreturn {restoreExplicitChaseCheckpoint};')(...Object.values(chaseDependencies));
check('checkpoint forwards the complete energy snapshot',()=>{const data={...structuredClone(state),currentCaseId:'case',_createdAt:123,chaseState:{},energy:42,hqExhaustionIncidents:1,hqExhaustionCallPending:true,hqExhaustionWarningSeen:true,energyModifiers:[{id:'x',multiplier:2,remainingHours:1}],lastEnergyChange:{label:'last'}};const payload={version:2,caseId:'case',campaignId:123,updatedAt:10,data};assert.equal(chaseModule.restoreExplicitChaseCheckpoint(payload),true);assert.equal(restored.energy,42);assert.equal(restored.hqExhaustionIncidents,1);assert.equal(restored.hqExhaustionCallPending,true);assert.equal(restored.energyModifiers[0].id,'x');assert.equal(restored.lastEnergyChange.label,'last');});
manager.destroy();timers.clear();
console.log(JSON.stringify({testsPassed:passed}));
