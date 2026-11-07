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
  this.slotLabels=this.claims.length?this.claims.map(c=>c.prompt||c.questionId||'UNKNOWN QUESTION'):['HOW DID THEY GET IN?','HOW DID THEY DO IT?','HOW DID THEY GET AWAY?'];
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
 buildSlotSentence(card,index){if(!card)return '[ empty ]';const u=this.getReconstructionUse(card,index);return u?.slotSentence||u?.answer||u?.text||u?.label||card.slotSentence||card.answer||card.item||'[ clue ]';}
 handleCardTap(index){
  if(this.hypothesisState?.uiLocked)return;const result=this.hypothesisState.selectCard(index);if(!result.ok){this.handleMoveFailure(result);return;}
  const card=this.availableCards[index];this.boardUI?.refresh();this.boardUI?.showFeedback(result.selected?`"${card?.item||'Clue'}" selected. Now click a question.`:'Clue selection cleared.',result.selected?'#ffd966':'#ccb98c');
 }
 handleSlotTap(index){
  if(this.hypothesisState?.uiLocked)return;
  if(this.hypothesisState.getPlacedCardIndex(index)!==null){this.handleSlotRemove(index);return;}
  const selected=this.hypothesisState.selectedCardIndex;
  if(selected!==null&&selected!==undefined){const result=this.hypothesisState.placeSelectedCard(index);if(!result.ok){this.handleMoveFailure(result);return;}
   this.boardUI?.refresh();this.boardUI?.showFeedback(`"${this.slotLabels[index]}" answered.`,'#f0ddb0');return;}
  const result=this.hypothesisState.toggleSelectedSlot(index);if(!result.ok){this.handleMoveFailure(result);return;}
  this.boardUI?.refresh();this.boardUI?.showFeedback(result.selected?`"${this.slotLabels[index]}" selected. Choose a clue below.`:'Question selection cleared.',result.selected?'#ffd966':'#ccb98c');
 }
 handleSlotRemove(index){
  if(this.hypothesisState?.uiLocked)return;const result=this.hypothesisState.removeCard(index);
  if(!result.ok){if(result.reason==='slot_locked')this.boardUI?.showFeedback('That answer is confirmed and cannot be changed.','#7CFC00');
   else if(result.reason==='slot_empty')this.boardUI?.showFeedback('Nothing to remove there.','#ffb347');return;}
  this.boardUI?.flashSlot(index);this.boardUI?.refresh();this.boardUI?.showFeedback(`Answer removed from "${this.slotLabels[index]}".`,'#f0ddb0');
 }
 handleMoveFailure(result={}){
  const messages={ui_locked:'The reconstruction has already been submitted.',invalid_card:'That clue is unavailable.',
   no_available_slot:'Every question already has an answer. Remove one first.',target_slot_locked:'That answer is confirmed. Choose another question.',
   card_locked:'This clue is locked into a confirmed answer.',card_already_used:'That clue has already been assigned to a question.',
   no_card_selected:'Select a clue from the evidence tray first.',slot_occupied:'That question already has an answer. Remove it first.',
   slot_locked:'That answer is confirmed and cannot be changed.',invalid_slot:'That question is unavailable.',slot_unavailable:'That question is locked or already has an answer.'};
  this.boardUI?.showFeedback(messages[result.reason]||'That move is not possible.','#ffb347');
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
  let message=evaluation.message+`\n\nScore: ${delta>0?'+':''}${delta}`;
  if(energyResult?.energyReachedZero)message+='\n\nYou solved the theory, then promptly collapsed into a very convincing detective-shaped nap.';
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