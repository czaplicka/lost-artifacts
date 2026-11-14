import { ArrestSelectionScene as OriginalArrestSelectionScene } from './ArrestSelectionScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { ChaseScene } from './ChaseScene.js';
import { CHASE_EVENTS } from '../config/chaseEvents.js';
import { makeChase } from '../systems/chaseLogic.js';
import { ensureCaseIdentity } from '../systems/caseIdentity.js';
import { prepareTheorySubmission } from '../systems/CaseTheorySubmission.js';
import { currentChase,persistChase,terminalData,chaseFailureCode } from '../systems/chasePersistence.js';

export class ArrestSelectionScene extends OriginalArrestSelectionScene {
 init(...args){super.init(...args);this.chaseStarting=false;this.chasePassed=false;}
 create(){
  if(gameState.arrestWarrantIssued){
   try{if(ensureCaseIdentity(gameState)&&!saveGameState())console.warn('[ArrestSelectionScene] Restored case ID could not be saved.');}
   catch(error){console.error('[ArrestSelectionScene] Case identity:',error);super.create();this.dialogueText?.setText('The case file could not be restored. Reload your saved game.');return;}
  }
  const record=currentChase();
  if(record&&chaseFailureCode(record)){
   BaseScene.prototype.create.call(this);void this.goto('GameOverScene',terminalData(record));return;
  }
  if(record?.phase==='settled'){
   BaseScene.prototype.create.call(this);
   const target=record.terminalScene;
   if(target&&target!=='ChaseScene'&&target!=='ArrestSelectionScene')void this.goto(target,{caseId:record.caseId,suspectId:record.suspectId});
   else this.add.text(80,80,'The saved pursuit is already settled. Load its result checkpoint.',{fontFamily:'SpecialElite',fontSize:'26px',color:'#ffffff'});
   return;
  }
  if(record){
   try{
    prepareTheorySubmission(gameState,record.suspectId);
    if(!persistChase(record))throw new Error('Could not save the pursuit checkpoint.');
   }catch(error){super.create();this.dialogueText?.setText(error.message);this.bottomNoteText?.setText('No pursuit plan has been rerolled. Complete the theory at the office or hotel, then return.');return;}
   BaseScene.prototype.create.call(this);void this.resumePursuit(record);return;
  }
  super.create();
 }
 async resumePursuit(record){
  if(!record||this.chaseStarting)return;
  this.chaseStarting=true;
  try{
   const opened=await this.goto('ChaseScene',{sourceKey:null,resumeChase:true});
   if(opened===false&&!this._cleanupDone)throw new Error('Could not reopen the saved pursuit.');
  }catch(error){
   this.chaseStarting=false;console.error('[ArrestSelectionScene] Resume:',error);
   if(!this._cleanupDone)this.add.text(80,80,error.message,{fontFamily:'SpecialElite',fontSize:'26px',color:'#ffffff'});
  }
 }
 async confirmSelection(){
  if(this.resultCommitted||this.isLeaving||this.chaseStarting||this.selectedSuspectId==null)return;
  this.chaseStarting=true;
  try{
   ensureCaseIdentity(gameState);
   if(!gameState.arrestWarrantIssued)throw new Error('Issue an arrest warrant first.');
   let record=currentChase();
   if(record){
    if(String(record.suspectId)!==String(this.selectedSuspectId))throw new Error('The existing pursuit belongs to another suspect. It was not rerolled.');
    if(chaseFailureCode(record)||record.phase==='settled')throw new Error('This pursuit has already ended. Reload the saved result.');
   }else if(gameState.chaseState!=null)throw new Error('The saved pursuit does not match this case. Reload the saved game.');
   // Only completeness is checked here. Wrong answers remain available to the defence.
   prepareTheorySubmission(gameState,this.selectedSuspectId);
   if(!record){
    const seed=(Date.now()^Math.floor(Math.random()*4294967296))>>>0;
    record=makeChase({caseId:gameState.currentCaseId,campaignId:gameState._createdAt,
     suspectId:this.selectedSuspectId,difficulty:gameState.difficulty,seed,events:CHASE_EVENTS});
    record.slotKey=saveManager.getLastUsedSlot();
   }
   if(!this.hasScene('ChaseScene'))this.scene.add('ChaseScene',ChaseScene,false);
   if(!persistChase(record))throw new Error('Could not save the pursuit checkpoint. Check browser storage and try again.');
   this.scene.pause();this.scene.launch('ChaseScene',{sourceKey:this.sys.settings.key,resumeChase:true});
  }catch(error){
   console.error('[ArrestSelectionScene] Could not start chase:',error);
   if(this.scene.isPaused())this.scene.resume();this.restoreArrestAfterChaseError(error);
  }
 }
 restoreArrestAfterChaseError(error){
  this.chaseStarting=false;this.selectionLocked=false;this.orderStamp?.destroy();this.orderStamp=null;
  this.enableNavigation();this.arrestButton?.setInteractive({useHandCursor:true});
  this.arrestButton?.bg?.setFillStyle(this.arrestButton.fillNormal??0x8f1d14,1);
  this.arrestButtonText?.setAlpha(1);this.currentCard?.polaroidFrame?.setStrokeStyle(2,0xcfc2a0,1);
  this.startArrestPulse();this.dialogueText?.setText('The pursuit has not started. No arrest has been recorded.');
  this.bottomNoteText?.setText(error?.message||'Review the case file and try again.');
 }
 completeChase(){
  const record=currentChase();if(!record||!['caught','review'].includes(record.phase))return;
  this.chaseStarting=false;this.scene.resume();void this.resumePursuit(record);
 }
}
