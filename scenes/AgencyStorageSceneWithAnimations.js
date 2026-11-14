import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { AgencyStorageScene as OriginalStorageScene } from './AgencyStorageScene.js';
import { StorageManagerAnimations } from './storage/StorageManagerAnimations.js';
import { AlexMouthAnimation,alexMouthSource } from './storage/AlexMouthAnimation.js';
import { alexRecoveryData,getAlexRecoveryStory } from '../alexRecoveryInquiryService.js';
import { escapeTimelineData,getEscapeTimelineStory } from '../escapeTimelineService.js';
import { getHollySurvivalState,hollySurvivalData } from '../hollySurvivalUpdateService.js';
import { getHollyFinancialState,hollyFinancialData } from '../hollyFinancialLeadService.js';
import { getMicrofilmStory,microfilmData } from '../johnMicrofilmService.js';
export class AgencyStorageScene extends OriginalStorageScene{
 init(data={}){super.init(data);this.recoveryButton=null;this.escapeButton=null;this.microfilmButton=null;this._recoveryOpening=false;}
 preload(){super.preload();const a=alexMouthSource(this);if(!this.textures.exists(a.key))this.load.image(a.key,a.url);}
 create(){super.create();this.storageManagerAnimations=new StorageManagerAnimations(this);this.alexMouthAnimation=new AlexMouthAnimation(this);}
 createInterface(){
  super.createInterface();const make=(label,callback)=>{const b=this.add.text(0,0,label,{fontFamily:'SpecialElite',fontSize:'22px',color:'#f2d477',backgroundColor:'#17110e',padding:{x:14,y:10}}).setOrigin(.5,1).setDepth(100).setVisible(false).setInteractive({useHandCursor:true});b.on('pointerdown',callback);b.on('pointerover',()=>b.setColor('#ffffff'));b.on('pointerout',()=>b.setColor('#f2d477'));return b;};
  this.recoveryButton=make(__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_e35f1da1cfb8a0cba9f3"),()=>{void this.openRecoveryInquiry();});this.escapeButton=make(__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_c6e940e8d13f62979287"),()=>{void this.openEscapeTimeline();});this.microfilmButton=make(__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_a1efb13a95edc5ea14c1"),()=>{void this.openMicrofilmCopy();});
 }
 canOpenStorageInquiry(){return this.isCurrent()&&!this.isLeaving&&!this._conversationOpen&&!this._preparing&&!this._finishing&&!this._timelineOpen&&!this._recoveryOpening&&!this.storageDialog?.isOpen;}
 canOpenRecoveryInquiry(){return this.canOpenStorageInquiry()&&getAlexRecoveryStory(this.gameState).eligible;}
 canOpenEscapeTimeline(){return this.canOpenStorageInquiry()&&getEscapeTimelineStory(this.gameState).eligible;}
 canOpenMicrofilmCopy(){return this.canOpenStorageInquiry()&&getMicrofilmStory(this.gameState).eligible;}
 refreshInvestigationButtons(){
  const r=getAlexRecoveryStory(this.gameState),e=getEscapeTimelineStory(this.gameState),m=getMicrofilmStory(this.gameState);
  for(const[b,visible,label]of[[this.recoveryButton,this.canOpenRecoveryInquiry(),r.completed?__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_cd002c18926020d8ad47"):__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_e35f1da1cfb8a0cba9f3")],[this.escapeButton,this.canOpenEscapeTimeline(),e.completed?__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_ef543facdd57421faccb"):__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_c6e940e8d13f62979287")],[this.microfilmButton,this.canOpenMicrofilmCopy(),m.copyReceived?__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_c59ae1d44f415c677211"):__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_a1efb13a95edc5ea14c1")]]){if(!b)continue;b.setText(label).setVisible(visible);if(b.input)b.input.enabled=visible;}
 }
 refreshTimelineButton(){super.refreshTimelineButton();this.refreshInvestigationButtons();}
 async prepareVisit(explicitTalk=false){await super.prepareVisit(explicitTalk);this.refreshInvestigationButtons();if(this.canOpenStorageInquiry())this.showCurrentInvestigationStatus();}
 showCurrentInvestigationStatus(){
  const m=getMicrofilmStory(this.gameState);if(m.eligible){this.showStatus(m.completed?microfilmData.messages.complete:m.copyReceived?__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_4925dd7e337cc676adcb"):microfilmData.messages.ready);return;}
  const f=getHollyFinancialState(this.gameState),h=getHollySurvivalState(this.gameState),e=getEscapeTimelineStory(this.gameState),r=getAlexRecoveryStory(this.gameState);
  if(f.completed){this.showStatus(hollyFinancialData.messages.complete);return;}if(f.canContact){this.showStatus(__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_88591f4402b1bd99c990"));return;}
  if(h.completed){this.showStatus(hollySurvivalData.messages.complete);return;}if(h.canContact){this.showStatus(__dialogueText("scenes/AgencyStorageSceneWithAnimations.js", "t_0b69829c8e162978d58a"));return;}
  if(e.eligible)this.showStatus(e.completed?escapeTimelineData.messages.complete:escapeTimelineData.messages.ready);else if(r.eligible)this.showStatus(r.completed?alexRecoveryData.messages.complete:alexRecoveryData.messages.ready);
 }
 startConversation(){
  if(this.manualTemplate&&this.hasInventoryItem(this.manualTemplate.id)&&this.canOpenStorageInquiry()){
   const m=getMicrofilmStory(this.gameState);if(m.eligible){if(!m.copyReceived)void this.openMicrofilmCopy();else this.showCurrentInvestigationStatus();return true;}
   const e=getEscapeTimelineStory(this.gameState);if(e.eligible&&!e.completed){void this.openEscapeTimeline();return true;}
   if(e.completed&&getHollySurvivalState(this.gameState).eligible){this.showCurrentInvestigationStatus();return true;}if(this.canOpenRecoveryInquiry()){void this.openRecoveryInquiry();return true;}
  }return super.startConversation();
 }
 openRecoveryInquiry(){return this.openStorageInvestigation('recovery');}openEscapeTimeline(){return this.openStorageInvestigation('escape');}openMicrofilmCopy(){return this.openStorageInvestigation('microfilm');}
 async openStorageInvestigation(kind){
  const allowed=kind==='microfilm'?this.canOpenMicrofilmCopy():kind==='escape'?this.canOpenEscapeTimeline():this.canOpenRecoveryInquiry();if(!allowed)return false;
  const token=this._storageRunToken;this._recoveryOpening=true;this._timelineOpen=true;[this.backButton,this.retryButton,this.timelineButton,this.recoveryButton,this.escapeButton,this.microfilmButton,this.statusText].forEach(o=>o?.setVisible(false));
  try{this.storageHud?.closeAllUIPanels?.();const module=kind==='microfilm'?await import('../johnMicrofilmLauncher.js'):kind==='escape'?await import('../escapeTimelineLauncher.js'):await import('../alexRecoveryInquiryLauncher.js');if(!this.isCurrent(token)||this.isLeaving)return false;const open=kind==='microfilm'?module.openJohnMicrofilm:kind==='escape'?module.openEscapeTimeline:module.openAlexRecoveryInquiry;
   if(!open(this.game,{preview:false,mode:'receive',onFinished:()=>this.onInvestigationFinished(token,kind)}))throw new Error('The investigation is already open.');return true;
  }catch(error){console.error('[AgencyStorageScene] Investigation:',error);if(this.isCurrent(token)){this._recoveryOpening=false;this._timelineOpen=false;this.showRecovery((kind==='microfilm'?microfilmData:kind==='escape'?escapeTimelineData:alexRecoveryData).messages.loadFailed,error);this.refreshInvestigationButtons();}return false;}
 }
 onInvestigationFinished(token,kind){
  if(!this.isCurrent(token))return;this._recoveryOpening=false;this._timelineOpen=false;this.backButton?.setVisible(true);this.retryButton?.setVisible(true);this.showStorageHud();this.refreshTimelineButton();this.layoutStorage();
  if(getMicrofilmStory(this.gameState).eligible||getHollySurvivalState(this.gameState).eligible){this.showCurrentInvestigationStatus();return;}
  const e=getEscapeTimelineStory(this.gameState),r=getAlexRecoveryStory(this.gameState);if(kind==='escape')this.showStatus(e.completed?escapeTimelineData.messages.complete:escapeTimelineData.messages.unfinished);else this.showStatus(e.eligible?escapeTimelineData.messages.ready:r.completed?alexRecoveryData.messages.complete:alexRecoveryData.messages.unfinished);
 }
 layoutStorage(){super.layoutStorage();this.storageManagerAnimations?.layout();this.alexMouthAnimation?.layout();const{width,height}=this.scale;[this.recoveryButton,this.escapeButton,this.microfilmButton].forEach((b,i)=>b?.setFontSize(width<600?14:22).setPosition(width/2,height-(width<420?207:165)-i*60));}
 cleanupStorage(){if(this._storageDisposed)return;this._recoveryOpening=false;for(const b of[this.recoveryButton,this.escapeButton,this.microfilmButton])b?.removeAllListeners();this.recoveryButton=null;this.escapeButton=null;this.microfilmButton=null;this.alexMouthAnimation?.destroy();this.alexMouthAnimation=null;this.storageManagerAnimations?.destroy();this.storageManagerAnimations=null;super.cleanupStorage();}
}
