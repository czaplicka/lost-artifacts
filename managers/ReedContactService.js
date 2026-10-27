import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getGameTimeManager } from './GameTimeManager.js';
import { inventoryManager } from './InventoryManager.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { addPIEvidence } from './PIInvestigationManager.js';
import { validateReedMailSelection } from './ReedMailContent.js';
const instances=new WeakMap(),KEY='reedContact';
export const REED_CONTACT_CHANGED='reed:contactChanged';
export function absoluteGameMinute(s){return(Math.max(1,Number(s.day)||1)-1)*1440+(Number(s.hour)||0)*60+(Number(s.minute)||0);}
export function nextReedCallMinute(now,delay,c){const v=Math.floor(now+delay),day=Math.floor(v/1440),tod=v%1440;if(tod<c.firstCallHour*60)return day*1440+c.firstCallHour*60;if(tod>=c.lastCallHour*60)return(day+1)*1440+c.firstCallHour*60;return v;}
export function getReedContactRecord(){return gameState[KEY]||null;}
export function ownedMobileLine(){const item=inventoryManager.getAllItems().find(i=>i.metadata?.canReceivePICalls===true&&typeof i.metadata?.phoneNumber==='string'&&i.metadata.phoneNumber.trim());return item?{itemId:item.id,number:item.metadata.phoneNumber.trim()}:null;}
export function getReedContactService(game){if(!instances.has(game))instances.set(game,new ReedContactService(game));return instances.get(game);}
export class ReedContactService{
 constructor(game){Object.assign(this,{game,data:null,loading:null,dead:false,panel:null,panelScene:null,session:null,ringSound:null,controller:null});this.onStep=()=>this.step();this.onDestroy=()=>this.destroy();game.events.on('poststep',this.onStep);game.events.once('destroy',this.onDestroy);void this.load();}
 now(){return absoluteGameMinute(getGameTimeManager().getState());}
 async load(){
  if(this.dead||this.data||this.loading)return this.loading;this.controller=new AbortController();
  this.loading=(async()=>{try{
   const r=await fetch('assets/data/reedContact.json',{signal:this.controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);const c=await r.json();
   if(c.version!==1||!Array.isArray(c.lines)||!c.lines.length||!c.lines.every(l=>typeof l.text==='string')||!Number.isFinite(c.delayMinutes)||c.delayMinutes<1||!Number.isFinite(c.retryMinutes)||c.retryMinutes<1||!Number.isFinite(c.ringWindowMinutes)||c.ringWindowMinutes<1||c.firstCallHour<0||c.lastCallHour>24||c.firstCallHour>=c.lastCallHour)throw Error('Invalid Reed contact configuration');
   if(this.dead)return;this.data=c;EventBus.emit(REED_CONTACT_CHANGED);
  }catch(e){if(!this.dead&&e.name!=='AbortError')console.error('[ReedContactService]',e);}finally{this.loading=null;}})();return this.loading;
 }
 canSend(){if(!this.data)return false;return gameState.piQuests?.quests?.[this.data.questId]?.status==='active'&&(gameState.piKeywordSearch?.cases?.[this.data.searchCaseId]?.known||[]).includes(this.data.requiredKeyword)&&!getReedContactRecord();}
 save(record){gameState[KEY]=record;requestAutosave();EventBus.emit(REED_CONTACT_CHANGED);}
 send(route,officeNumber,selection){
  if(!this.canSend()||!['office','mobile'].includes(route))return{ok:false,message:'This message cannot be sent.'};
  const mobile=ownedMobileLine();if(route==='mobile'&&!mobile)return{ok:false,message:'No mobile telephone with a number is available.'};
  const number=route==='mobile'?mobile.number:String(officeNumber||'').trim();if(!number)return{ok:false,message:'No office telephone number is available.'};
  const chosen=validateReedMailSelection(this.data,selection,number,gameState.playerName);if(!chosen.ok)return chosen;
  const now=this.now(),c=this.data;
  this.save({version:1,status:'waiting',route,number,mobileItemId:route==='mobile'?mobile.itemId:null,sentAt:now,nextAttemptAt:nextReedCallMinute(now,c.delayMinutes,c),attempts:0,body:chosen.body,to:chosen.to,variantId:chosen.variantId});
  return{ok:true,message:'Message sent.'};
 }
 eligibleScene(){
  const c=this.data,s=getReedContactRecord();if(!c||!s||gameState.isGameActive===false)return null;
  const active=this.game.scene.getScenes(true),allowed=s.route==='office'?[c.officeSceneKey]:[c.officeSceneKey,...c.safeMobileScenes];
  const scene=active.find(v=>allowed.includes(v.sys.settings.key)&&v.sys.isActive()&&!v._cleanupDone);if(!scene)return null;
  const passive=new Set(['UIScene','PlayerHudScene','NewsHud']);if(active.some(v=>v!==scene&&!passive.has(v.sys.settings.key)))return null;
  if(scene.navigating||scene.exiting||scene.buying||scene.hudPanelOpen||scene.computerChild||scene.childLoading||scene.activeDevice==='phone'||scene.dialogueOpen||scene.dialogOpen||scene.isTalking)return null;
  if(s.route==='mobile'&&!inventoryManager.hasItem(s.mobileItemId))return null;return scene;
 }
 step(){
  if(this.dead||!this.data)return;if(gameState.isGameActive===false){this.clearPanel();return;}const s=getReedContactRecord();
  if(this.session){if(!s||s.status!=='in_call'||s.sentAt!==this.session.sentAt){this.endSession(false);return;}if(!this.session.scene.sys.isActive()||this.session.scene._cleanupDone)this.interrupt();return;}
  if(!s||s.status==='completed'){this.clearPanel();return;}
  if(s.status==='in_call'){this.save({...s,status:'waiting',nextAttemptAt:nextReedCallMinute(this.now(),this.data.retryMinutes,this.data)});return;}
  const now=this.now();if(now<s.nextAttemptAt){this.clearPanel();return;}
  if(now>=s.nextAttemptAt+this.data.ringWindowMinutes){this.clearPanel();this.save({...s,status:'waiting',attempts:s.attempts+1,lastMissedAt:now,nextAttemptAt:nextReedCallMinute(now,this.data.retryMinutes,this.data)});return;}
  const scene=this.eligibleScene();if(!scene){this.clearPanel();return;}if(this.panelScene!==scene||!this.panel?.scene)this.showRing(scene);
 }
 clearPanel(){this.panel?.destroy(true);this.panel=null;this.panelScene=null;this.ringSound?.stop?.();this.ringSound?.destroy?.();this.ringSound=null;}
 showRing(scene){
  this.clearPanel();this.panelScene=scene;const{width,height}=scene.scale,w=Math.min(340,width-24),root=scene.add.container(width-w-12,Math.max(12,height-112)).setDepth(10000);this.panel=root;
  root.add(scene.add.rectangle(0,0,w,98,0x24372f,.98).setOrigin(0).setInteractive());root.add(scene.add.text(12,10,'Incoming call',{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#fff0bf'}));
  const a=scene.add.text(12,55,'[ ANSWER ]',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#a9e3bd'}).setInteractive({useHandCursor:true}),i=scene.add.text(w-12,55,'[ IGNORE ]',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#e2b58a'}).setOrigin(1,0).setInteractive({useHandCursor:true});root.add(a);root.add(i);a.on('pointerdown',()=>this.answer());i.on('pointerdown',()=>this.ignore());
  if(scene.cache.audio.exists('sfx_ringing'))try{this.ringSound=scene.sound.add('sfx_ringing',{loop:true,volume:.35});this.ringSound.play();}catch(_){}
 }
 ignore(){const s=getReedContactRecord();this.clearPanel();if(!s||s.status!=='waiting')return;this.save({...s,attempts:s.attempts+1,lastMissedAt:this.now(),nextAttemptAt:nextReedCallMinute(this.now(),this.data.retryMinutes,this.data)});}
 answer(){
  const s=getReedContactRecord(),scene=this.eligibleScene();if(!s||s.status!=='waiting'||!scene||this.now()<s.nextAttemptAt||this.now()>=s.nextAttemptAt+this.data.ringWindowMinutes)return;
  this.clearPanel();this.save({...s,status:'in_call'});this.session={scene,sentAt:s.sentAt,index:0,cleanup:null};
  if(scene.sys.settings.key===this.data.officeSceneKey&&scene.phoneUI){scene.computerUI?.close();this.openDeskCall(scene.phoneUI);}else this.openMobileCall();
 }
 openDeskCall(p){
  p.open();p.investigation?.resetCall();p.cancelActivity();const original={nextLine:p.nextLine,hangUp:p.hangUp,close:p.close};
  this.session.cleanup=()=>{p.nextLine=original.nextLine;p.hangUp=original.hangUp;p.close=original.close;};
  p.nextLine=()=>{if(p.typingItem)return original.nextLine.call(p);if(p.lineIndex>=p.lines.length-1){this.complete();return original.nextLine.call(p);}return original.nextLine.call(p);};
  p.hangUp=()=>{this.interrupt();return original.hangUp.call(p);};p.close=()=>{this.interrupt();return original.close.call(p);};
  p.state='connected';p.contactName='Claire Sutton';p.number='';p.lines=JSON.parse(JSON.stringify(this.data.lines));p.lineIndex=0;p.callStart=p.scene.time.now;p.clearLog();p.showDialogueLine();
 }
 openMobileCall(){
  const session=this.session;if(!session)return;const scene=session.scene,{width:W,height:H}=scene.scale,root=scene.add.container(0,0).setDepth(11000);this.panel=root;this.panelScene=scene;
  root.add(scene.add.rectangle(0,0,W,H,0x070d0a,.96).setOrigin(0).setInteractive());const w=Math.min(650,W-32),x=(W-w)/2,y=Math.max(20,(H-300)/2);
  root.add(scene.add.text(x,y,'MOBILE — Claire Sutton',{fontFamily:'SpecialElite, monospace',fontSize:'22px',color:'#ffd18b'}));const line=this.data.lines[session.index];
  root.add(scene.add.text(x,y+52,line.speaker,{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#9cdfb3'}));root.add(scene.add.text(x,y+85,line.text,{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#eee4c9',wordWrap:{width:w}}));
  const next=scene.add.text(x,y+245,session.index===this.data.lines.length-1?'[ END CALL ]':'[ CONTINUE ]',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#ffe2a0'}).setInteractive({useHandCursor:true});root.add(next);
  next.on('pointerdown',()=>{if(!this.session)return;if(this.session.index>=this.data.lines.length-1){this.complete();return;}this.session.index++;this.clearPanel();this.openMobileCall();});
  const end=scene.add.text(x+w,y+245,'[ HANG UP ]',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#d6a894'}).setOrigin(1,0).setInteractive({useHandCursor:true});root.add(end);end.on('pointerdown',()=>this.interrupt());
 }
 endSession(retry){const session=this.session;this.session=null;session?.cleanup?.();this.clearPanel();const s=getReedContactRecord();if(retry&&s?.status==='in_call')this.save({...s,status:'waiting',nextAttemptAt:nextReedCallMinute(this.now(),this.data.retryMinutes,this.data)});}
 interrupt(){this.endSession(true);}
 complete(){
  const s=getReedContactRecord();if(!this.session||s?.status!=='in_call')return;this.endSession(false);this.save({...s,status:'completed',completedAt:this.now()});
  const previous=gameState.piPhoneInvestigations||{version:1,cases:{}},p=previous.cases?.[this.data.searchCaseId]||{flags:[],completedTopics:[]};
  gameState.piPhoneInvestigations={...previous,cases:{...(previous.cases||{}),[this.data.searchCaseId]:{...p,flags:[...new Set([...(p.flags||[]),'claire_callback_completed','daniel_relationship_confirmed','widower_story'])]}}};
  addPIEvidence(this.data.questId,this.data.evidence);const q=gameState.piQuests?.quests?.[this.data.questId];
  if(q)gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[q.id]:{...q,objectives:q.objectives.map(o=>o.id==='investigate_trip'?{...o,completed:true}:o)}}};
  requestAutosave();EventBus.emit(REED_CONTACT_CHANGED);
 }
 destroy(){if(this.dead)return;this.dead=true;this.controller?.abort();this.endSession(false);this.game.events.off('poststep',this.onStep);this.game.events.off('destroy',this.onDestroy);instances.delete(this.game);}
}
