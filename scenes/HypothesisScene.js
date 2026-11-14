import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { saveGameState,flushAutosave } from '../gameStatePersistence.js';
import { getScoreManager } from '../managers/InvestigationManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { HypothesisEvaluator } from '../HypothesisEvaluator.js';
import { HypothesisState } from '../HypothesisState.js';
import { HypothesisResultService } from '../HypothesisResultService.js';
import { HypothesisBoardUI } from '../ui/HypothesisBoardUI.js';
import { CrimeCityTutorial,advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { recordHeistAttempt } from '../systems/InvestigationAudit.js';
export class HypothesisScene extends BaseScene {
 constructor(){
  super({key:'HypothesisScene'});this.sourceScene='CityScene';this.cityId=null;this.sceneId=null;
  this.claims=[];this.slotLabels=[];this.slotQuestionIds=[];this.availableCards=[];this.correctCards=[];this.distractorCards=[];
  this.energyManager=null;this.scoreManager=null;this.hypothesisState=null;this.resultService=null;this.boardUI=null;this.crimeTutorial=null;
  this.shutdownHandler=null;this.isReturning=false;this.isLaunchingResult=false;this.energyConsumed=false;
 }
 init(data={}){
  this.destroyCrimeTutorial();this.sourceScene=data.sourceScene||'CityScene';
  this.cityId=data.cityId||gameState.currentCityId||gameState.crimeCityId||gameState.reconstructedHeist?.cityId||null;
  this.sceneId=data.sceneId||gameState.reconstructedHeist?.sceneId||null;
  this.isReturning=false;this.isLaunchingResult=false;this.energyConsumed=false;this.ensureReconstructionState();
  this.claims=Array.isArray(gameState.reconstructedHeist.claims)?gameState.reconstructedHeist.claims:[];
  if(this.claims.length!==3)console.warn('[HypothesisScene] Expected exactly 3 reconstruction claims.',this.claims);
  this.slotLabels=this.claims.length?this.claims.map(c=>c.prompt||c.questionId||__dialogueText("scenes/HypothesisScene.js", "t_3d4821e17b5677673e55")):[__dialogueText("scenes/HypothesisScene.js", "t_fee8181d07a55905cd68"),__dialogueText("scenes/HypothesisScene.js", "t_810fa3b5d9418487cfa9"),__dialogueText("scenes/HypothesisScene.js", "t_aa53cb64f826209cc1ec")];
  this.slotQuestionIds=this.claims.length?this.claims.map(c=>c.questionId||null):[null,null,null];this.scoreManager=getScoreManager();
  this.hypothesisState=new HypothesisState({reconstruction:gameState.reconstructedHeist,activeSlotCount:3,attempts:3});
  this.resultService=new HypothesisResultService({cityId:this.cityId,sceneId:this.sceneId,scoreManager:this.scoreManager});
  this.availableCards=[];this.correctCards=[];this.distractorCards=[];this.energyManager=null;this.boardUI=null;this.shutdownHandler=null;
 }
 create(){
  super.create();this.energyManager=getEnergyManager();if(!this.energyManager)console.warn('[HypothesisScene] EnergyManager unavailable.');
  this.prepareCards();if(this.availableCards.length<6){console.error('[HypothesisScene] Not enough clue cards.',this.availableCards);this.returnToSourceScene();return;}
  this.hypothesisState.setCards(this.availableCards);
  this.boardUI=new HypothesisBoardUI(this,{state:this.hypothesisState,cards:this.availableCards,slotLabels:this.slotLabels,
   buildSlotSentence:(card,index)=>this.buildSlotSentence(card,index),onCardTap:index=>this.handleCardTap(index),
   onSlotTap:index=>this.handleSlotTap(index),onSlotRemove:index=>this.handleSlotRemove(index),onConfirm:()=>this.confirmTheory(),onClose:()=>this.closeScene()});
  this.boardUI.create();this.startCrimeTutorial();this.shutdownHandler=()=>this.onShutdown();
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdownHandler);
 }
 startCrimeTutorial(){
  this.destroyCrimeTutorial();const saved=gameState.onboarding?.crimeCity;if(!saved||saved.completed||saved.step!=='hypothesis')return;
  this.crimeTutorial=new CrimeCityTutorial(this,gameState);this.crimeTutorial.start();
 }
 destroyCrimeTutorial(){if(!this.crimeTutorial)return;try{this.crimeTutorial.destroy();}catch(error){console.warn('[HypothesisScene] Tutorial cleanup failed:',error);}this.crimeTutorial=null;}
 ensureReconstructionState(){if(!gameState.reconstructedHeist||typeof gameState.reconstructedHeist!=='object')gameState.reconstructedHeist={};}
 prepareCards(){const data=HypothesisEvaluator.prepareCards(gameState.reconstructedHeist,this.sceneId,this.cityId);this.correctCards=data.correctCards;this.distractorCards=data.distractorCards;this.availableCards=data.availableCards;}
 getQuestionId(index){return this.slotQuestionIds[index]||null;}
 getClaim(index){return this.claims[index]||null;}
 getReconstructionUse(card,index){
  const questionId=this.getQuestionId(index);if(!card||!questionId)return null;
  const uses=Array.isArray(card.reconstructionUses)?card.reconstructionUses:[],match=uses.find(u=>u&&typeof u==='object'&&u.questionId===questionId);
  if(match)return match;
  if(card.questionId===questionId)return {questionId,slotSentence:card.slotSentence||card.answer||card.item||null,
   answer:card.answer||card.slotSentence||card.item||null,heistExplanation:card.heistExplanation||card.trueExplanation||''};return null;
 }
 buildSlotSentence(card,index){if(!card)return __dialogueText("scenes/HypothesisScene.js", "t_41953e69788775d57264");const u=this.getReconstructionUse(card,index);return u?.slotSentence||u?.answer||u?.text||u?.label||card.slotSentence||card.answer||card.item||__dialogueText("scenes/HypothesisScene.js", "t_fc550bcc0aacb76e2101");}
 handleCardTap(index){
  if(this.hypothesisState?.uiLocked)return;const result=this.hypothesisState.selectCard(index);if(!result.ok){this.handleMoveFailure(result);return;}
  const card=this.availableCards[index];this.boardUI?.refresh();this.boardUI?.showFeedback(result.selected?`${__dialogueText("scenes/HypothesisScene.js", "t_8a331fdde7032f33a71e")}${card?.item||__dialogueText("scenes/HypothesisScene.js", "t_4faf9cda1911b5d77cee")}${__dialogueText("scenes/HypothesisScene.js", "t_d1174dfaf3a4d15405ba")}`:__dialogueText("scenes/HypothesisScene.js", "t_0f27a5c97b23a680c024"),result.selected?'#ffd966':'#ccb98c');
 }
 handleSlotTap(index){
  if(this.hypothesisState?.uiLocked)return;
  if(this.hypothesisState.getPlacedCardIndex(index)!==null){this.handleSlotRemove(index);return;}
  const selected=this.hypothesisState.selectedCardIndex;
  if(selected!==null&&selected!==undefined){const result=this.hypothesisState.placeSelectedCard(index);if(!result.ok){this.handleMoveFailure(result);return;}
   this.boardUI?.refresh();this.boardUI?.showFeedback(`${__dialogueText("scenes/HypothesisScene.js", "t_8a331fdde7032f33a71e")}${this.slotLabels[index]}${__dialogueText("scenes/HypothesisScene.js", "t_2d05ba1c749040be03b8")}`,'#f0ddb0');return;}
  const result=this.hypothesisState.toggleSelectedSlot(index);if(!result.ok){this.handleMoveFailure(result);return;}
  this.boardUI?.refresh();this.boardUI?.showFeedback(result.selected?`${__dialogueText("scenes/HypothesisScene.js", "t_8a331fdde7032f33a71e")}${this.slotLabels[index]}${__dialogueText("scenes/HypothesisScene.js", "t_1247a72bebb12f4944d9")}`:__dialogueText("scenes/HypothesisScene.js", "t_4128268b4fd04d62ee05"),result.selected?'#ffd966':'#ccb98c');
 }
 handleSlotRemove(index){
  if(this.hypothesisState?.uiLocked)return;const result=this.hypothesisState.removeCard(index);
  if(!result.ok){if(result.reason==='slot_locked')this.boardUI?.showFeedback(__dialogueText("scenes/HypothesisScene.js", "t_fcbf48f2a4419b240e37"),'#7CFC00');
   else if(result.reason==='slot_empty')this.boardUI?.showFeedback(__dialogueText("scenes/HypothesisScene.js", "t_314db98846d962650a52"),'#ffb347');return;}
  this.boardUI?.flashSlot(index);this.boardUI?.refresh();this.boardUI?.showFeedback(`${__dialogueText("scenes/HypothesisScene.js", "t_eddff93b68907f304232")}${this.slotLabels[index]}${__dialogueText("scenes/HypothesisScene.js", "t_1e4a1452ad4db45827a1")}`,'#f0ddb0');
 }
 handleMoveFailure(result={}){
  const messages={ui_locked:__dialogueText("scenes/HypothesisScene.js", "t_45e5dc057742c591e23b"),invalid_card:__dialogueText("scenes/HypothesisScene.js", "t_e65022e757f394b5d378"),
   no_available_slot:__dialogueText("scenes/HypothesisScene.js", "t_85e09551dfe0bb1d32d8"),target_slot_locked:__dialogueText("scenes/HypothesisScene.js", "t_720049dcf48f15a5a85f"),
   card_locked:__dialogueText("scenes/HypothesisScene.js", "t_f4daee963fa0dd3cafc2"),card_already_used:__dialogueText("scenes/HypothesisScene.js", "t_79d6876e1c53e0fe5a17"),
   no_card_selected:__dialogueText("scenes/HypothesisScene.js", "t_caf688e6b5146e4de198"),slot_occupied:__dialogueText("scenes/HypothesisScene.js", "t_27b3283f30d767e13a68"),
   slot_locked:__dialogueText("scenes/HypothesisScene.js", "t_fcbf48f2a4419b240e37"),invalid_slot:__dialogueText("scenes/HypothesisScene.js", "t_da75dedab035ad2c9638"),slot_unavailable:__dialogueText("scenes/HypothesisScene.js", "t_3e09a0d43b927ad09dcf")};
  this.boardUI?.showFeedback(messages[result.reason]||__dialogueText("scenes/HypothesisScene.js", "t_ea75bdc0365577055b9f"),'#ffb347');
 }
 confirmTheory(){
  if(this.hypothesisState?.uiLocked||!this.hypothesisState?.isTimelineComplete())return;
  const orderedCards=this.hypothesisState.getOrderedCards(),feedback=HypothesisEvaluator.evaluateGuess(orderedCards,this.hypothesisState.activeSlotCount);
  recordHeistAttempt(gameState,{cityId:this.cityId,sceneId:this.sceneId,orderedCards,feedback,claims:this.claims});
  saveGameState();
  this.hypothesisState.setFeedback(feedback);const locked=this.hypothesisState.lockGreenSlots(feedback);this.boardUI?.refresh();
  locked.forEach((slotIndex,index)=>{const card=orderedCards[slotIndex],use=this.getReconstructionUse(card,slotIndex);
   const narrative=use?.heistExplanation||card?.heistExplanation||card?.trueExplanation||'';if(narrative)this.boardUI?.showGreenNarrative(slotIndex,narrative,(index+1)*450);});
  if(!feedback.every(c=>c==='green'))this.hypothesisState.consumeAttempt();
  const evaluation=HypothesisEvaluator.determineResult(feedback,this.hypothesisState.attemptsLeft);
  if(!evaluation.isFinal){
   const redHerring=orderedCards.find((card,index)=>feedback[index]==='red'&&card?.isRedHerring);let message=evaluation.message;
   if(redHerring)message+=`\n\n${HypothesisEvaluator.getFunnyLine(redHerring)}`;
   this.boardUI?.refresh();this.boardUI?.showFeedback(message,evaluation.color);return;
  }this.finalizeTheory(orderedCards,evaluation);
 }
 consumeMastermindEnergy(){
  if(this.energyConsumed)return {success:true,skipped:true,reason:'already_consumed'};
  if(!this.energyManager)return {success:false,skipped:true,reason:'energy_manager_unavailable'};
  const result=this.energyManager.consumeActivity('minigame_mastermind');if(result?.success)this.energyConsumed=true;return result;
 }
 finalizeTheory(orderedCards,evaluation){
  this.hypothesisState.setUiLocked(true);const before=this.scoreManager.getSessionPoints();
  const result=this.resultService.finalizeTheory({orderedCards,slotFeedback:this.hypothesisState.slotFeedback,
   attemptsLeft:this.hypothesisState.attemptsLeft,resultLabel:evaluation.resultLabel,score:evaluation.score});
  const delta=this.scoreManager.getSessionPoints()-before,energyResult=this.consumeMastermindEnergy();
  this.destroyCrimeTutorial();advanceCrimeTutorial(gameState,'hypothesis');this.boardUI?.refresh();
  let message=evaluation.message+`${__dialogueText("scenes/HypothesisScene.js", "t_c2d850d8e4c374db099f")}${delta>0?'+':''}${delta}`;
  if(energyResult?.energyReachedZero)message+=__dialogueText("scenes/HypothesisScene.js", "t_ef7111e3eb0c650d97b8");
  this.boardUI?.showFeedback(message,evaluation.color);saveGameState();
  this.time.delayedCall(900,()=>{if(this.sys.isActive())void this.launchResultCommentScene();});return result;
 }
 restoreSourceScene(){
  const source=this.sourceScene||'CityScene';if(!this.hasScene(source)){console.warn('[HypothesisScene] Missing source scene.',source);return false;}
  if(this.isSceneSleeping(source))this.scene.wake(source);if(this.isScenePaused(source))this.scene.resume(source);
  const ref=this.scene.manager.keys[source];if(ref?.input){ref.input.enabled=true;ref.input.setTopOnly(true);}return true;
 }
 returnToSourceScene(){if(this.isReturning)return;this.isReturning=true;this.destroyCrimeTutorial();flushAutosave();this.restoreSourceScene();this.scene.stop();}
 async launchResultCommentScene(){
  if(this.isLaunchingResult)return;this.isLaunchingResult=true;flushAutosave();const source=this.sourceScene||'CityScene';
  if(!this.hasScene(source)){console.error('[HypothesisScene] Missing source scene.',source);this.scene.stop();return;}
  if(this.isSceneSleeping(source))this.scene.wake(source);if(this.isSceneActive(source)&&!this.isScenePaused(source))this.scene.pause(source);
  const launched=await this.launchOverlay('TheoryResultCallScene',{sourceScene:source,mode:'hq',result:gameState.reconstructedHeist?.playerTheoryResult||'weak'});
  if(!launched){console.error('[HypothesisScene] Result scene launch failed.');this.restoreSourceScene();this.isLaunchingResult=false;return;}
  if(this.sys.isActive())this.scene.stop();
 }
 closeScene(){this.returnToSourceScene();}
 onShutdown(){
  this.destroyCrimeTutorial();this.boardUI?.destroy();this.boardUI=null;this.energyManager=null;this.hypothesisState=null;this.resultService=null;
  this.availableCards=[];this.correctCards=[];this.distractorCards=[];this.claims=[];this.slotLabels=[];this.slotQuestionIds=[];
  this.shutdownHandler=null;this.energyConsumed=false;this.game.events.emit('setHudVisible',true);
 }
}