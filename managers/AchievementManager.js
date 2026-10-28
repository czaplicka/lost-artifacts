import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { saveGameState, requestAutosave, flushAutosave } from '../gameStatePersistence.js';

const list=value=>Array.isArray(value)?value:[];
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const id=value=>{
 const raw=record(value)?value.id:value;
 if(typeof raw==='string'&&raw.trim())return raw.trim();
 if(typeof raw==='number'&&Number.isFinite(raw))return String(raw);
 return null;
};
const unique=values=>[...new Set(values.map(id).filter(Boolean))];
let sampleClock=null;
function syncProgress(){
 const previous=record(gameState.achievementProgress)?gameState.achievementProgress:{};
 const cityIds=unique([...list(previous.cityIds),...list(gameState.visitedCities),...list(gameState.travelHistory).map(t=>record(t)?(t.toCityId??t.cityId??t.destinationId):t)]);
 let caseProgress=gameState.achievementCase;
 if(!record(caseProgress)){
  caseProgress={version:1,elapsedSeconds:0,timingEligible:false,cityIds:[],clueIds:[]};gameState.achievementCase=caseProgress;
 }
 const caseCities=unique([...list(caseProgress.cityIds),gameState.currentCityId]);
 const previousClues=unique(list(caseProgress.clueIds));
 const caseClues=unique([...previousClues,...list(gameState.cluesCollected)]);
 const clueCount=Math.max(0,Number(previous.clueCount)||0)+caseClues.length-previousClues.length;
 const allCities=unique([...cityIds,...caseCities]);
 const changed=JSON.stringify(list(previous.cityIds))!==JSON.stringify(allCities)||previous.clueCount!==clueCount||
  JSON.stringify(list(caseProgress.cityIds))!==JSON.stringify(caseCities)||JSON.stringify(list(caseProgress.clueIds))!==JSON.stringify(caseClues);
 if(changed){gameState.achievementProgress={version:1,cityIds:allCities,clueCount};gameState.achievementCase={...caseProgress,cityIds:caseCities,clueIds:caseClues};}
 return changed;
}
export const ACHIEVEMENTS={
 first_game:{id:'first_game',icon:'🪪',title:'First Game',description:'Start your first investigation. The paperwork starts here.',
  isUnlocked:()=>Boolean(gameState.currentMission)&&(gameState.isGameActive===true||gameState.caseResolved===true||gameState.caseFailed===true)},
 the_dream:{id:'the_dream',icon:'🌙',title:'The Dream',description:'Meet Holly. Some dreams come with a case file.',isUnlocked:()=>gameState.hollyIntroSeen===true},
 first_travel:{id:'first_travel',icon:'🧳',title:'First Travel',description:'Complete your first journey to another city.',
  isUnlocked:()=>gameState.firstTravelCompleted===true||[...list(gameState.travelHistory),gameState.lastTravel].some(t=>{
   if(!record(t))return false;const destination=id(t.toCityId),origin=id(t.fromCityId);return destination!==null&&origin!==null&&destination!==origin;
  })},
 first_case:{id:'first_case',icon:'🔎',title:'Eagle Eye',description:'Close your first case.',isUnlocked:()=>gameState.casesSolved>=1},
 first_arrest:{id:'first_arrest',icon:'🚔',title:'Cuffed',description:'Make your first successful arrest.',isUnlocked:()=>gameState.arrests>=1},
 swift_detective:{id:'swift_detective',icon:'⏱',title:'Swift',description:'Close a case in under 30 minutes of real-world play time.',
  isUnlocked:()=>gameState.caseResolved===true&&gameState.achievementCase?.timingEligible===true&&Number.isFinite(gameState.achievementCase.elapsedSeconds)&&gameState.achievementCase.elapsedSeconds>0&&gameState.achievementCase.elapsedSeconds<30*60},
 frequent_flyer:{id:'frequent_flyer',icon:'✈️',title:'Frequent Flyer',description:'Visit five cities in one investigation.',isUnlocked:()=>unique(list(gameState.achievementCase?.cityIds)).length>=5},
 clue_hound:{id:'clue_hound',icon:'🕵️',title:'Clue Hound',description:'Collect twenty clues across your investigations.',isUnlocked:()=>gameState.achievementProgress?.clueCount>=20},
 globe_trotter:{id:'globe_trotter',icon:'🌍',title:'Globe Trotter',description:'Travel to ten different cities.',isUnlocked:()=>unique(list(gameState.achievementProgress?.cityIds)).length>=10},
 master_detective:{id:'master_detective',icon:'🏆',title:'Master Detective',description:'Close five cases.',isUnlocked:()=>gameState.casesSolved>=5},
 chief_inspector:{id:'chief_inspector',icon:'⭐',title:'Chief Inspector',description:'Make five successful arrests.',isUnlocked:()=>gameState.arrests>=5},
 dead_mail_return_to_sender:{id:'dead_mail_return_to_sender',icon:'✉️',title:'Return to Sender',
  description:'Solve the Blackthorn Cemetery case. The recipient remains alive.',
  isUnlocked:()=>gameState.deadMailPreview?.finale?.completed===true}
};
export function getAchievementList(){return Object.values(ACHIEVEMENTS);}
export function hasAchievement(achievementId){return list(gameState.achievements).includes(achievementId);}
export function checkAndAwardAchievements(){
 sampleClock?.();const changed=syncProgress();
 const newlyUnlocked=getAchievementList().filter(a=>!hasAchievement(a.id)&&a.isUnlocked());
 if(newlyUnlocked.length>0){
  gameState.achievements=[...new Set([...list(gameState.achievements),...newlyUnlocked.map(a=>a.id)])];
  saveGameState();EventBus.emit('agentStatsChanged',{achievements:gameState.achievements,newlyUnlocked});
  newlyUnlocked.forEach(a=>EventBus.emit('achievementUnlocked',a));
 }else if(changed)requestAutosave();
 return newlyUnlocked;
}
const installations=new WeakMap();
const NON_PLAY_SCENES=new Set(['BootScene','PreloaderScene','MenuScene','SettingsScene','EnterScene','EnterChaseScene','PlayerHudScene','UIScene','NewsHud','LoadingOverlayScene','SuccessScene','GameOverScene','AgainScene']);
export function installAchievementSystem(game){
 if(installations.has(game))return installations.get(game);
 let disposed=false,lastTime=performance.now(),lastCase=null,wasRunning=false,paused=false;
 let checkAt=lastTime,saveAt=lastTime,toastRoot=null,toastTimer=null;const toastQueue=[];
 const canRun=()=>{
  if(paused||!gameState.currentMission||gameState.caseResolved||gameState.caseFailed||gameState.finalArrestResult==='SUCCESS'||gameState.finalArrestResult==='FAILURE'||(typeof document!=='undefined'&&document.hidden))return false;
  const scenes=game.scene.getScenes(true);
  if(scenes.some(s=>s.sys.settings.key==='SettingsScene'))return false;
  return scenes.some(s=>!NON_PLAY_SCENES.has(s.sys.settings.key));
 };
 const tick=()=>{
  const now=performance.now(),current=gameState.achievementCase,delta=Math.max(0,now-lastTime)/1000;
  if(record(current)&&current===lastCase&&wasRunning&&Number.isFinite(delta)){
   const elapsed=Math.max(0,Number(current.elapsedSeconds)||0)+delta;current.elapsedSeconds=elapsed;gameState.timeSpent=elapsed;
  }
  lastTime=now;lastCase=current;wasRunning=canRun();
 };
 sampleClock=tick;
 const showNextToast=()=>{
  if(disposed||toastTimer!==null||!toastQueue.length||typeof document==='undefined')return;
  const achievement=toastQueue.shift();
  if(!toastRoot){
   toastRoot=document.createElement('div');toastRoot.setAttribute('role','status');toastRoot.setAttribute('aria-live','polite');
   Object.assign(toastRoot.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'100001',maxWidth:'min(380px, calc(100vw - 32px))',boxSizing:'border-box',background:'#181511',color:'#ffe7ab',border:'2px solid #d4af37',padding:'16px',fontFamily:'SpecialElite, monospace',fontSize:'18px',whiteSpace:'pre-line',pointerEvents:'none',boxShadow:'0 4px 24px #0009'});
   document.body.appendChild(toastRoot);
  }
  toastRoot.textContent=[`${achievement.icon} ACHIEVEMENT UNLOCKED`,achievement.title,achievement.description].join('\n');toastRoot.hidden=false;
  toastTimer=setTimeout(()=>{toastTimer=null;if(toastRoot)toastRoot.hidden=true;showNextToast();},4500);
 };
 const onUnlocked=a=>{toastQueue.push(a);showNextToast();};
 const onTravelCompleted=travel=>{
  if(!travel||typeof travel.fromCity!=='string'||typeof travel.toCity!=='string'||!travel.fromCity.trim()||!travel.toCity.trim()||travel.fromCity===travel.toCity)return;
  gameState.firstTravelCompleted=true;checkAndAwardAchievements();
 };
 const step=()=>{
  tick();const now=performance.now();
  if(now>=checkAt){checkAt=now+250;if(gameState.currentMission)checkAndAwardAchievements();}
  if(now>=saveAt){saveAt=now+5000;if(wasRunning)requestAutosave();}
 };
 const pause=()=>{tick();paused=true;wasRunning=false;};
 const resume=()=>{paused=false;lastTime=performance.now();wasRunning=false;};
 const visibility=()=>{tick();wasRunning=false;if(document.hidden){requestAutosave();flushAutosave();}};
 const pagehide=()=>{pause();requestAutosave();flushAutosave();};
 const cleanup=()=>{
  if(disposed)return;tick();disposed=true;if(sampleClock===tick)sampleClock=null;
  game.events.off('prestep',step);game.events.off('pause',pause);game.events.off('resume',resume);
  game.events.off('blur',pause);game.events.off('focus',resume);game.events.off('destroy',cleanup);
  EventBus.off('achievementUnlocked',onUnlocked);EventBus.off('travelCompleted',onTravelCompleted);
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);
  if(typeof window!=='undefined'){window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',resume);}
  if(toastTimer!==null)clearTimeout(toastTimer);toastQueue.length=0;toastRoot?.remove();toastRoot=null;installations.delete(game);
 };
 game.events.on('prestep',step);game.events.on('pause',pause);game.events.on('resume',resume);game.events.on('blur',pause);game.events.on('focus',resume);game.events.once('destroy',cleanup);
 EventBus.on('achievementUnlocked',onUnlocked);EventBus.on('travelCompleted',onTravelCompleted);
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
 if(typeof window!=='undefined'){window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',resume);}
 installations.set(game,cleanup);return cleanup;
}
