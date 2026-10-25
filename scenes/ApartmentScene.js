import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { CrimeCityTutorial, advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { ApartmentObject } from './apartament/ApartmentObject.js';
import { ApartmentInventoryUI } from './apartament/ApartmentInventoryUI.js';
import { ApartmentRoomSystem } from './apartament/ApartmentRoomSystem.js';
import { generateApartment } from './apartament/ApartmentGenerator.js';
import { saveGameState, requestAutosave, flushAutosave } from '../gameStatePersistence.js';

const DEFAULT_APARTMENT_MODIFIER={id:'empty_clues',effect:{state:'empty',clueCount:4,artifactState:'left_behind',artifactRequired:true,artifactRecoveryBonus:30,escapeMethod:'direct'}};
export class ApartmentScene extends BaseScene {
 constructor(){super({key:'ApartmentScene'});this.crimeTutorial=null;this.apartmentObjects=[];this.roomSystem=null;}
 init(data={}){
  this.destroyCrimeTutorial();this.roomSystem?.destroy();this.roomSystem=null;
  this.mission=data.mission||gameState.currentMission||{};this.cityId=data.cityId||gameState.crimeCityId||null;
  this.suspectId=data.suspectId||this.mission.thiefId||gameState.currentThiefId||'suspect_001';
  this.caseKey=data.caseKey||this.getAlibiCaseKey();this.suspectName=this.resolveSuspectName();
  this.motive=data.motive||this.mission.motive||gameState.caseData?.motiveId||'gambling_debt';
  this.apartmentModifier=data.apartmentModifier||this.mission.caseModifiers?.apartment||DEFAULT_APARTMENT_MODIFIER;
  this.apartmentEffect={...DEFAULT_APARTMENT_MODIFIER.effect,...(this.apartmentModifier.effect||{})};
  this.requiredClueCount=this.getRequiredClueCount(this.apartmentEffect.clueCount);
  this.missionId=String(this.mission.id||this.mission.missionId||'unknown_mission');
  this.missionArtifact=this.resolveMissionArtifact();
  this.artifactRecovered=Boolean(this.mission.artifactRecovered||this.mission.artifact?.recovered||gameState.hasRecoveredArtifact(this.missionId));
  this.isTransitioning=false;this.isOpeningInventory=false;this.apartmentObjects=[];this.playerInventory=null;
  this.descriptionBox=this.messageBox=this.messageTimer=this.leaveDialog=this.hudReadyHandler=this.apartmentHud=null;
  this.migrationRunning=false;this.migrationTimer=null;this.exitButton=null;this.assetWarning='';
  this.generationError=null;this.failureRoot=null;
  try{
   this.apartmentConfig=generateApartment(this.suspectId,this.motive,{
    mission:{...this.mission,artifact:this.missionArtifact},apartmentModifier:this.apartmentModifier,
    caseIndex:this.mission.caseIndex??gameState.caseIndex??0,locations:this.cache.json.get('locations')
   });
   this.apartmentConfig.title=this.suspectName?`${this.suspectName}'s Apartment`:"Suspect's Apartment";
   this.apartmentConfig.objects=(this.apartmentConfig.objects||[]).map(object=>({...object,unlocks:(object.unlocks||[]).flatMap(item=>{
    if(!item||!(item.isArtifact||item.type==='artifact'))return item?[item]:[];
    return this.missionArtifact?[{...item,...this.missionArtifact}]:[];
   })}));
   this.roomSystem=new ApartmentRoomSystem(this);
  }catch(error){this.generationError=error;this.apartmentConfig={title:"Suspect's Apartment",objects:[]};console.error('[ApartmentScene] Apartment preparation failed:',error);}
 }
 preload(){this.roomSystem?.preload();if(!this.textures.exists('btnExit'))this.load.image('btnExit','assets/exit.png');}
 getAlibiCaseKey(){const m=this.mission||{},raw=m.artifact,label=typeof raw==='string'?raw:raw?.label||raw?.name||m.artifactName||'default';return String(m.id||m.caseId||`${this.cityId}_${label}`);}
 resolveSuspectName(){
  const current=gameState.caseData?.alibiCases?.[this.caseKey],entry=current?.suspects?.find(i=>i.suspectId===this.suspectId);
  if(typeof entry?.suspectName==='string'&&entry.suspectName.trim())return entry.suspectName.trim();
  const encounters=gameState.crimeCityEncounterState?.[this.caseKey],encounter=Array.isArray(encounters)?encounters.find(i=>i?.suspectId===this.suspectId&&i.alibiWitness===true):null;
  if(typeof encounter?.suspectName==='string'&&encounter.suspectName.trim())return encounter.suspectName.trim();
  const suspect=getCaseSuspects(gameState).find(i=>i?.id===this.suspectId);
  if(typeof suspect?.name==='string'&&suspect.name.trim())return suspect.name.trim();
  console.warn('[ApartmentScene] Missing public/alibi identity:',this.suspectId,this.caseKey);return null;
 }
 resolveMissionArtifact(){
  const m=this.mission||{},raw=m.artifact,o=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const label=typeof raw==='string'?raw.trim():String(o.label||o.name||m.artifactName||'').trim(),key=m.artifactKey||o.artifactKey||o.id||null;
  if(m.artifactKey&&o.artifactKey&&m.artifactKey!==o.artifactKey){console.error('[ApartmentScene] Conflicting artefact keys.',m);return null;}
  if(!label||!key){console.error('[ApartmentScene] Missing mission artefact name/key.',m);return null;}
  return {...o,id:String(o.id||key),artifactKey:String(key),type:'artifact',label,name:label,description:o.description||m.description||'',significance:o.significance||m.significance||'',city:o.city||m.city||gameState.crimeCity||'',country:o.country||m.country||'',condition:o.condition||'intact',recovered:Boolean(o.recovered||m.artifactRecovered),isArtifact:true,isClue:false,isEscapeClue:false,isEscapeFragment:false,isRedHerring:false,quantity:1};
 }
 create(){
  super.create();this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.onShutdown,this);
  if(this.generationError){this.showFailureView();return;}
  try{
   this.playerInventory=new ApartmentInventoryUI(this);this.createBackground();this.createHeader();this.createControls();this.restoreInventory();this.createApartmentObjects();
  }catch(error){this.generationError=error;console.error('[ApartmentScene] Apartment rendering failed:',error);this.showFailureView();return;}
  this.onBus('inventoryUpdated',this.onInventoryUpdated,this);this.onBus('itemCombined',this.onItemCombined,this);
  this.trackInputEvent(this.events,Phaser.Scenes.Events.WAKE,this.setupSharedHud,this);
  this.trackInputEvent(this.events,Phaser.Scenes.Events.RESUME,this.setupSharedHud,this);
  void this.setupSharedHud();this.cameras.main.fadeIn(400,0,0,0);
  if(advanceCrimeTutorial(gameState,'arrest'))requestAutosave();this.startCrimeTutorial();
  if(!this.missionArtifact)this.showMessage('The case file has no valid stolen artefact. No replacement item has been generated.',5000,'#8b3030');
 }
 showFailureView(){
  this.destroyCrimeTutorial();this.failureRoot?.destroy(true);
  const hud=this.getPlayerHudScene();hud?.closeAllUIPanels();inventoryManager.close();
  const host=hud?.sys?.isActive()?hud:this;if(host===hud){hud.scene.setVisible(true);hud.scene.bringToTop();}
  const {width,height}=host.scale,w=Math.max(100,Math.min(650,width-32));
  const root=host.add.container(width/2,height/2).setDepth(60000).setScrollFactor(0);this.failureRoot=root;
  root.add(host.add.rectangle(0,0,width,height,0x14100e,1).setInteractive());
  root.add(host.add.text(0,-100,'APARTMENT UNAVAILABLE',{fontFamily:'SpecialElite',fontSize:'26px',color:'#ffd788',align:'center',wordWrap:{width:w}}).setOrigin(0.5));
  root.add(host.add.text(0,-10,'This apartment could not be prepared.\nNo replacement evidence or destination has been invented.\nReturn to the city and check the case configuration.',{fontFamily:'SpecialElite',fontSize:'19px',color:'#eee1c9',align:'center',wordWrap:{width:w}}).setOrigin(0.5));
  const back=host.add.text(0,110,'[ BACK TO CITY ]',{fontFamily:'SpecialElite',fontSize:'23px',color:'#ffd788',backgroundColor:'#493c2e',padding:{x:16,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
  root.add(back);back.on('pointerdown',()=>void this.returnFromFailure());
 }
 async returnFromFailure(){
  if(this.isTransitioning)return;this.isTransitioning=true;
  try{const started=await this.goto('CrimeCityScene',{cityId:gameState.crimeCityId||this.cityId});if(started===false&&this.sys.isActive())this.isTransitioning=false;}
  catch(error){this.isTransitioning=false;console.error('[ApartmentScene] Cannot return from failure:',error);}
 }
 getState(){return gameState;}
 getRequiredClueCount(value){const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(6,Math.floor(n))):3;}
 async setupSharedHud(){
  try{const hud=await this.restorePlayerHud();if(!hud||this._cleanupDone||!this.sys.isActive())return null;
   if(this.apartmentHud&&this.hudReadyHandler)this.apartmentHud.events.off('hud-ready',this.hudReadyHandler);
   this.apartmentHud=hud;hud.setCurrentGameplayScene('ApartmentScene');hud.closeAllUIPanels();
   if(!hud.isHudReady){this.hudReadyHandler=()=>{this.hudReadyHandler=null;if(!this._cleanupDone&&this.sys.isActive())hud.setCurrentGameplayScene('ApartmentScene');};hud.events.once('hud-ready',this.hudReadyHandler);}return hud;
  }catch(error){console.error('[ApartmentScene] Shared HUD failed:',error);return null;}
 }
 async openSharedInventory(){
  if(this.isTransitioning||this.isOpeningInventory||this.leaveDialog)return false;this.isOpeningInventory=true;
  try{const hud=this.getPlayerHudScene()||await this.setupSharedHud();if(!hud||this._cleanupDone||!this.sys.isActive())return false;const panel=await hud.ensurePanel('inventoryUI');if(!panel||this._cleanupDone||!this.sys.isActive())return false;hud.setCurrentGameplayScene('ApartmentScene');hud.closeAllUIPanels();panel.open();return true;}
  catch(error){console.error('[ApartmentScene] Cannot open inventory:',error);this.showMessage('Your inventory could not be opened. Please try again.',2500,'#8b3030');return false;}finally{this.isOpeningInventory=false;}
 }
 getProgress(){return gameState.apartmentProgress?.[this.missionId]||{};}
 updateProgress(patch){gameState.updateState({apartmentProgress:{...(gameState.apartmentProgress||{}),[this.missionId]:{...this.getProgress(),...patch,updatedAt:new Date().toISOString()}}});requestAutosave();}
 getSavedItems(){return Array.isArray(this.getProgress().items)?this.getProgress().items:[];}
 restoreInventory(){const collected={...(this.getProgress().collectedItems||{})};for(const item of this.getSavedItems())if(item?.id)collected[item.id]=true;this.updateProgress({collectedItems:collected});this.migrateLegacyInventory();}
 migrateLegacyInventory(){
  if(this.migrationRunning||!this.playerInventory)return;this.migrationRunning=true;
  try{const pending=[];for(const item of this.getSavedItems()){if(!item?.id)continue;if((item.isArtifact||item.type==='artifact')&&this.artifactRecovered)continue;if(!this.playerInventory.addItem(item))pending.push(item);}this.updateProgress({items:pending,inventoryVersion:2});if(pending.length)this.showMessage('Some evidence from your old save is waiting for room in your inventory. Nothing has been discarded.',4000,'#795548');}finally{this.migrationRunning=false;}
 }
 onInventoryUpdated(){if(this._cleanupDone||!this.playerInventory)return;this.playerInventory.save();if(this.migrationRunning||this.migrationTimer||!this.getSavedItems().length)return;this.migrationTimer=this.time.delayedCall(0,()=>{this.migrationTimer=null;if(!this._cleanupDone)this.migrateLegacyInventory();});}
 persistApartmentState(){this.playerInventory?.save();this.updateProgress({});}
 getObjectProgress(id){return this.getProgress().objects?.[id]||null;}
 onObjectStateChanged(id,data){this.updateProgress({objects:{...(this.getProgress().objects||{}),[id]:data}});}
 markItemCollected(item){this.updateProgress({collectedItems:{...(this.getProgress().collectedItems||{}),[item.id]:true}});}
 hasItemAlready(id){return Boolean(this.getProgress().collectedItems?.[id]||this.playerInventory?.hasItem(id));}
 addClueToNotebook(item){
  if(!item?.id||item.isRedHerring||item.isArtifact||(item.isClue!==true&&item.isEscapeClue!==true))return;
  const label=item.label||item.name||'Apartment clue',description=item.description||item.hint||'';
  gameState.addClue({id:`apartment_${this.missionId}_${item.id}`,type:'apartment',category:'apartment',key:item.id,value:label,text:description?`${label} - ${description}`:label,cityId:gameState.crimeCityId||null,missionId:this.missionId,source:'suspect_apartment',isEscapeClue:item.isEscapeClue===true});
 }
 collectApartmentItem(item,sourceObject={}){
  if(!item?.id||this.isTransitioning||this.leaveDialog)return false;if(item.isArtifact||item.type==='artifact')return this.collectMissionArtifact(item,sourceObject);
  const label=item.label||item.name||'Unknown item';if(this.hasItemAlready(item.id)){this.showMessage(`You already collected the ${label}.`,1600);return true;}
  if(!this.playerInventory.addItem(item)){this.showMessage('Your inventory is full. Make room and search here again. The item is still here.',3000,'#795548');return false;}
  this.markItemCollected(item);this.addClueToNotebook(item);this.persistApartmentState();
  if(item.isEscapeClue||item.isEscapeFragment)this.showMessage(`Found: ${label}\n\nAdded to your inventory. The crime lab may be able to examine it.`,3200,'#795548');else this.showMessage(`Found: ${label}\n\nAdded to your inventory.`,2300,item.isRedHerring?'#607d8b':'#3e683d');return true;
 }
 collectMissionArtifact(item,sourceObject={}){
  if(this.artifactRecovered){this.markItemCollected(item);this.showMessage('The recovered artefact has already been logged.',1800);return true;}
  if(!this.missionArtifact){this.showMessage('The stolen artefact is missing from the case file. Nothing has been logged.',3500,'#8b3030');return false;}
  const artifact={...this.missionArtifact,recovered:true,recoveredAt:new Date().toISOString(),recoveredFrom:sourceObject.id||'suspect_apartment',recoveredLocation:sourceObject.label||'Suspect Apartment'};
  const before=gameState.currentMission,original=before?.artifact;
  const recovered=gameState.recoverArtifact({missionId:this.missionId,artifact,recoveredAt:artifact.recoveredAt,recoveredFrom:artifact.recoveredFrom,recoveredLocation:artifact.recoveredLocation,condition:artifact.condition});
  this.artifactRecovered=Boolean(recovered||gameState.hasRecoveredArtifact(this.missionId));
  if(!this.artifactRecovered){this.showMessage('The artefact could not be logged. It has not been removed.',2800,'#8b3030');return false;}
  if(recovered&&before)gameState.updateState({currentMission:{...gameState.currentMission,artifact:original,artifactRecovered:true}});
  this.markItemCollected(artifact);this.persistApartmentState();if(recovered){EventBus.emit('artifactRecovered',{missionId:this.missionId,artifact,sourceObject});this.showArtifactRecovered(artifact);}else this.showMessage('The recovered artefact has already been logged.',1800);return true;
 }
 showArtifactRecovered(artifact){
  this.closeLeaveWarning();const hud=this.getPlayerHudScene();hud?.closeAllUIPanels();hud?.playerMenu?.close?.();inventoryManager.close();const host=hud||this;
  if(hud){hud.scene.setVisible(true);hud.scene.bringToTop();}const {width,height}=host.scale,w=Math.min(620,width-32),h=Math.min(390,height-32),root=host.add.container(width/2,height/2).setDepth(50000).setScrollFactor(0);this.leaveDialog=root;
  root.add(host.add.rectangle(0,0,width,height,0x000000,0.82).setInteractive());root.add(host.add.rectangle(0,0,w,h,0x241b16,1).setStrokeStyle(3,0xd4af37).setInteractive());
  root.add(host.add.text(0,-h/2+30,'ARTEFACT RECOVERED!',{fontFamily:'PressStart2P',fontSize:'14px',color:'#ffd76b',align:'center',wordWrap:{width:w-40}}).setOrigin(0.5,0));
  if(host.textures.exists(artifact.artifactKey)){const image=host.add.image(0,-22,artifact.artifactKey);image.setScale(Math.min(140/image.width,Math.max(55,h-210)/image.height));root.add(image);}
  root.add(host.add.text(0,h/2-112,artifact.label+'\nLogged in recovered artefacts.',{fontFamily:'SpecialElite',fontSize:'21px',color:'#fff3d6',align:'center',wordWrap:{width:w-40}}).setOrigin(0.5));
  const button=host.add.rectangle(0,h/2-38,190,44,0x493d30).setStrokeStyle(2,0xd4af37).setInteractive({useHandCursor:true});root.add([button,host.add.text(0,h/2-38,'Continue',{fontFamily:'SpecialElite',fontSize:'22px',color:'#fff3d6'}).setOrigin(0.5)]);button.on('pointerdown',()=>this.closeLeaveWarning());
 }
 onItemCombined(data={}){if(!this.sys.isActive()||this.isTransitioning||!data.result||data.missionId!==this.missionId)return;this.markItemCollected(data.result);this.addClueToNotebook(data.result);this.persistApartmentState();}
 createBackground(){this.roomSystem.create();}
 createHeader(){
  const {width}=this.scale,x=Math.min(270,width*0.34),textWidth=Math.max(80,width-x-20);
  this.add.rectangle(width/2,0,width,108,0x000000,0.65).setOrigin(0.5,0).setDepth(8);
  const title=this.add.text(x,20,this.apartmentConfig.title,{fontFamily:'PressStart2P',fontSize:'18px',color:'#ffd700',wordWrap:{width:textWidth}}).setDepth(10);while(title.height>44&&parseInt(title.style.fontSize,10)>10)title.setFontSize(parseInt(title.style.fontSize,10)-1);
  this.add.text(x,72,this.apartmentConfig.subtitle||'What can you find?',{fontFamily:'SpecialElite',fontSize:'16px',color:'#eee4cf',wordWrap:{width:textWidth}}).setDepth(10);
  if(this.textures.exists('btnExit')){this.exitButton=this.add.image(Math.min(140,width*0.17),70,'btnExit').setScale(0.5).setOrigin(0.5).setDepth(55).setInteractive({useHandCursor:true});this.exitButton.on('pointerover',()=>{if(!this.isTransitioning&&!this.leaveDialog)this.exitButton.setScale(0.6);});this.exitButton.on('pointerout',()=>this.exitButton?.setScale(0.5));}
  else{this.exitButton=this.add.rectangle(Math.min(140,width*0.17),70,100,44,0x493d30).setStrokeStyle(2,0xd4af37).setDepth(55).setInteractive({useHandCursor:true});this.add.text(this.exitButton.x,this.exitButton.y,'EXIT',{fontFamily:'SpecialElite',fontSize:'20px',color:'#fff3d6'}).setOrigin(0.5).setDepth(56);}
  this.exitButton.on('pointerdown',()=>this.exitApartment());
 }
 createControls(){this.descriptionBox=this.add.text(20,this.scale.height-60,this.assetWarning,{fontFamily:'SpecialElite',fontSize:'13px',color:'#d9d9d9',backgroundColor:'#000000aa',padding:{x:6,y:4},wordWrap:{width:this.scale.width-40}}).setDepth(110);}
 createApartmentObjects(){this.apartmentObjects=(this.apartmentConfig?.objects||[]).map(c=>new ApartmentObject(this,c));this.roomSystem.applyObjectVisibility();}
 showDescription(text){this.descriptionBox?.setText(text||this.assetWarning||'');}
 showMessage(text,duration=2000,color='#37474f'){
  if(!text||!this.sys.isActive()||this._cleanupDone)return null;this.messageTimer?.remove(false);this.messageBox?.destroy();inventoryManager.close();
  const popup=this.add.text(this.scale.width/2,this.scale.height/2,text,{fontFamily:'SpecialElite',fontSize:'18px',color:'#ffffff',backgroundColor:color,padding:{x:20,y:15},align:'center',wordWrap:{width:Math.max(100,this.scale.width-60)}}).setOrigin(0.5).setDepth(20000);this.messageBox=popup;
  this.messageTimer=this.time.delayedCall(duration,()=>{popup.destroy();if(this.messageBox===popup)this.messageBox=null;this.messageTimer=null;});return popup;
 }
 hasUncollectedEvidence(){return (this.apartmentConfig?.objects||[]).some(object=>(object.unlocks||[]).some(item=>{if(!item||item.isRedHerring)return false;if(item.isArtifact||item.type==='artifact')return !this.artifactRecovered;return (item.isClue||item.isEscapeClue||item.isEscapeFragment)&&!this.hasItemAlready(item.id);}));}
 exitApartment(){if(this.isTransitioning||this.leaveDialog||!this.sys.isActive())return;if(this.hasUncollectedEvidence())this.showLeaveWarning();else this.leaveApartment();}
 showLeaveWarning(){
  this.getPlayerHudScene()?.closeAllUIPanels();const {width,height}=this.scale,pw=Math.min(560,width-30),root=this.add.container(0,0).setDepth(25000);this.leaveDialog=root;
  root.add(this.add.rectangle(width/2,height/2,width,height,0x000000,0.75).setInteractive());root.add(this.add.rectangle(width/2,height/2,pw,240,0x28221b).setStrokeStyle(3,0xbfa065).setInteractive());
  root.add(this.add.text(width/2,height/2-60,'Leaving already?\nThere may still be useful evidence in this apartment.',{fontFamily:'SpecialElite',fontSize:'22px',color:'#fff3d6',align:'center',wordWrap:{width:pw-40}}).setOrigin(0.5));
  const button=(x,label,callback)=>{const bg=this.add.rectangle(x,height/2+65,(pw-60)/2,48,0x493d30).setStrokeStyle(2,0xbfa065).setInteractive({useHandCursor:true}),text=this.add.text(x,height/2+65,label,{fontFamily:'SpecialElite',fontSize:'19px',color:'#fff3d6'}).setOrigin(0.5);bg.on('pointerdown',()=>{this.closeLeaveWarning();callback();});root.add([bg,text]);};
  button(width/2-pw/4+5,'Keep searching',()=>{});button(width/2+pw/4-5,'Leave anyway',()=>this.leaveApartment());
 }
 closeLeaveWarning(){this.leaveDialog?.destroy(true);this.leaveDialog=null;}
 leaveApartment(){if(this.isTransitioning)return;this.persistApartmentState();saveGameState();this.transitionToScene('CrimeCityScene',{cityId:gameState.crimeCityId});}
 transitionToScene(key,data={}){if(this.isTransitioning||!this.sys.isActive())return;this.isTransitioning=true;inventoryManager.close();this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{if(this.sys.isActive())void this.performSceneTransition(key,data);});this.cameras.main.fadeOut(400,0,0,0);}
 async performSceneTransition(key,data){try{const started=await this.goto(key,data);if(started===false&&this.sys.isActive())this.restoreAfterTransitionFailure();}catch(error){console.error('[ApartmentScene] Navigation failed:',error);if(this.sys.isActive())this.restoreAfterTransitionFailure();}}
 restoreAfterTransitionFailure(){this.isTransitioning=false;this.cameras.main.fadeIn(200,0,0,0);this.showMessage('Could not leave the apartment. Try EXIT again.',2500,'#8b3030');}
 startCrimeTutorial(){this.destroyCrimeTutorial();const saved=gameState.onboarding?.crimeCity;if(!saved||saved.completed||saved.step!=='search_apartment')return;this.crimeTutorial=new CrimeCityTutorial(this,gameState);this.crimeTutorial.start();}
 destroyCrimeTutorial(){try{this.crimeTutorial?.destroy();}catch(error){console.warn('[ApartmentScene] Tutorial cleanup failed:',error);}this.crimeTutorial=null;}
 onShutdown(){
  this.destroyCrimeTutorial();this.roomSystem?.destroy();this.roomSystem=null;this.messageTimer?.remove(false);this.migrationTimer?.remove(false);this.messageTimer=this.migrationTimer=null;this.closeLeaveWarning();
  this.failureRoot?.destroy(true);this.failureRoot=null;
  if(this.apartmentHud&&this.hudReadyHandler)this.apartmentHud.events.off('hud-ready',this.hudReadyHandler);this.hudReadyHandler=null;this.apartmentHud=null;
  inventoryManager.close();flushAutosave();this.apartmentObjects.forEach(o=>o.destroy());this.apartmentObjects=[];this.playerInventory?.destroy();this.playerInventory=null;this.messageBox?.destroy();this.messageBox=null;this.descriptionBox=null;this.exitButton=null;
 }
}
export default ApartmentScene;
