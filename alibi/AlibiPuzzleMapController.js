import {gameState} from '../GameData.js';
import {EventBus} from '../EventBus.js';
import {saveGameState,getPersistenceStatus} from '../gameStatePersistence.js';
import {isStateRestoreInProgress} from '../gameState/saveRestore.js';
import {createPuzzle} from './AlibiPuzzleModel.js';
import {mountPuzzle} from './AlibiPuzzleView.js';
import {completeAlibiPuzzle} from './AlibiPuzzleGameBridge.js';
import {readPuzzleConclusion} from './AlibiPuzzleCompletion.js';
import {selectAlibiCandidates,usePuzzleAlibi} from './AlibiPuzzleRouting.js';
import {commitPuzzleProgress,ALIBI_FAILURE_MESSAGE} from './AlibiPuzzlePersistence.js';
function writable(){const s=getPersistenceStatus();return !s.busy&&!s.rollbackUnsafe&&!s.automaticSaveBlocked&&!isStateRestoreInProgress();}
export class AlibiPuzzleMapController {
 constructor(scene){
  this.scene=scene;this.pin=null;this.modal=null;this.view=null;this.closed=false;this.navigating=false;this.followUp=null;
  this.resize=()=>this.layoutPin();this.shutdown=()=>this.destroy();this.restored=()=>{this.close(false);if(!this.closed)this.scene.createCrimeCityContent?.({force:true});};
  scene.scale.on('resize',this.resize);scene.events.once('shutdown',this.shutdown);EventBus.on('gameState:restored',this.restored);
 }
 enabled(){return usePuzzleAlibi(gameState,this.scene.getCaseKey());}
 refresh(){
  this.pin?.destroy();this.pin=null;const s=this.scene,key=s.getCaseKey();
  if(this.closed||s._cleanupDone||s.hasVisitedApartment()||!this.enabled()||!s.isCrimeLabCompleted()||!s.isGridCompleted())return;
  const p=gameState.caseData?.alibiPuzzles?.[key],filed=readPuzzleConclusion(gameState,{caseKey:key,activeCaseKey:key});
  const label=p?.status==='failed'?'ALIBI FAILED / VIEW RESULT':filed?'ALIBI FILED / FOLLOW UP':'OPEN ALIBI DESK';
  this.pin=s.add.text(0,0,label,{fontFamily:'SpecialElite',fontSize:'22px',color:'#fff2d3',backgroundColor:'#28463d',padding:{x:16,y:12}}).setOrigin(.5).setDepth(80).setScrollFactor(0).setInteractive({useHandCursor:true});this.pin.on('pointerdown',()=>this.open());this.layoutPin();
 }
 layoutPin(){if(this.pin){this.pin.setPosition(this.scene.scale.width/2,95);this.pin.setScale(Math.min(1,Math.max(1,this.scene.scale.width-30)/this.pin.width));}}
 contextValid(c){const s=this.scene;return !this.closed&&!s._cleanupDone&&s.getCaseKey()===c.caseKey&&gameState.currentCaseId===c.caseId&&gameState._createdAt===c.campaignId;}
 open(){
  const s=this.scene;if(this.modal||this.closed||s._cleanupDone||s.isTransitioning||this.navigating)return;
  const context={caseKey:s.getCaseKey(),caseId:gameState.currentCaseId,campaignId:gameState._createdAt};
  const candidates=selectAlibiCandidates(gameState,context.caseKey),old=gameState.caseData?.alibiPuzzles?.[context.caseKey];
  if(gameState.caseFailed&&old?.status!=='failed')return;
  if(!this.enabled()||!s.isCrimeLabCompleted()||!s.isGridCompleted()||![3,5].includes(candidates.length)){s.showMessage?.('The alibi desk requires three or five candidates.',3500);return;}
  try{
   if(!writable())throw Error('Saving is paused or busy. Enable saving before opening this desk.');
   if(old&&(old.caseId!==context.caseId||old.campaignId!==context.campaignId))throw Error('A mismatched prototype save was preserved. Load a save from before opening that prototype.');
   if(old&&(!Array.isArray(old.people)||old.people.length!==candidates.length||!old.people.every(p=>candidates.some(c=>c.id===p.id))))throw Error('The saved puzzle has a different shortlist.');
   const catalog=s.cache.json.get('suspects');if(!Array.isArray(catalog))throw Error('The suspects catalogue is not loaded.');
   const puzzle=old?structuredClone(old):{...createPuzzle({caseKey:context.caseKey,suspects:candidates,accents:catalog.map(x=>x.accent),features:catalog.map(x=>x.features),crimeWindow:gameState.caseData?.crimeWindow}),caseId:context.caseId,campaignId:context.campaignId};
   const persist=()=>{
    if(!this.contextValid(context))throw Error('The active case changed.');
    commitPuzzleProgress(gameState,puzzle,{caseKey:context.caseKey,activeCaseKey:s.getCaseKey(),canWrite:writable,save:saveGameState,exportState:()=>gameState.exportForSave()});
    if(puzzle.status==='failed')queueMicrotask(()=>{if(this.contextValid(context))void this.showFailure(context);});
   };
   persist();s.closeAllUIPanels?.();this.context=context;
   const host=document.createElement('div');host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Alibi investigation');Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483000',overflow:'auto',background:'#17272b',pointerEvents:'auto'});document.body.append(host);this.modal=host;
   this.savedInput=s.input.enabled;s.input.enabled=false;this.hud=s.scene.manager?.keys?.PlayerHudScene||null;this.hudInput=this.hud?.input?.enabled;if(this.hud?.input)this.hud.input.enabled=false;
   this.view=mountPuzzle(host,puzzle,{save:persist,filed:!!readPuzzleConclusion(gameState,{caseKey:context.caseKey,activeCaseKey:context.caseKey}),onClose:()=>{if(puzzle.status==='failed')void this.showFailure(context);else this.close();},onComplete:()=>{
    if(!this.contextValid(context))return {accepted:false,message:'The active case changed.'};const result=completeAlibiPuzzle(context.caseKey);if(!result.accepted)return {...result,message:result.message||'Could not save the conclusions. Try again.'};this.addFollowUp(result.conclusion,context);return result;
   }});
   const filed=readPuzzleConclusion(gameState,{caseKey:context.caseKey,activeCaseKey:context.caseKey});if(filed)this.addFollowUp(filed,context);host.querySelector('button')?.focus();
  }catch(error){this.close(false);console.error('[AlibiPuzzleMapController]',error);s.showMessage?.(error.message,5000);}
 }
 addFollowUp(conclusion,context){
  this.followUp?.remove();this.followUp=null;const lead=conclusion.subjects.find(x=>x.status==='uncorroborated');if(!lead||!this.modal)return;
  const b=document.createElement('button');b.type='button';b.textContent='FOLLOW UP AT THE APARTMENT';Object.assign(b.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'2147483001',padding:'14px',fontFamily:'SpecialElite',fontSize:'18px'});b.onclick=()=>{if(!this.contextValid(context))return;this.close();this.scene.visitApartment(lead.suspectId);};this.modal.after(b);this.followUp=b;
 }
 async showFailure(context){
  const s=this.scene;if(this.navigating||!this.contextValid(context))return false;const puzzle=gameState.caseData?.alibiPuzzles?.[context.caseKey];if(puzzle?.status!=='failed'||puzzle.mistakes!==3||!gameState.caseFailed)return false;
  this.navigating=true;this.failureRetry?.remove();this.failureRetry=null;
  try{
   if(s.game.sceneLoader)await s.game.sceneLoader.ensure('GameOverScene');if(!this.contextValid(context))return false;
   if(typeof s.hasScene==='function'&&!s.hasScene('GameOverScene'))throw Error('GameOverScene could not be loaded.');
   const opened=await s.goto('GameOverScene',{caseId:context.caseId,title:'ALIBI INVESTIGATION FAILED',message:ALIBI_FAILURE_MESSAGE,reason:ALIBI_FAILURE_MESSAGE});
   if(!opened&&!this.closed&&!s._cleanupDone)throw Error('The result screen could not be opened.');if(!this.closed)this.close(false);return true;
  }catch(error){console.error('[AlibiPuzzleMapController] Failed to open result:',error);if(this.contextValid(context)&&this.modal){const b=document.createElement('button');b.type='button';b.textContent='RETRY OPENING CASE RESULT';Object.assign(b.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'2147483002',padding:'16px',background:'#eadfc4',color:'#663329'});b.onclick=()=>void this.showFailure(context);this.modal.after(b);this.failureRetry=b;}return false;}
  finally{this.navigating=false;}
 }
 close(refresh=true){this.failureRetry?.remove();this.failureRetry=null;this.followUp?.remove();this.followUp=null;this.view?.destroy();this.view=null;this.modal?.remove();this.modal=null;if(this.savedInput!==undefined){this.scene.input.enabled=this.savedInput;this.savedInput=undefined;}if(this.hud?.input&&this.hudInput!==undefined)this.hud.input.enabled=this.hudInput;this.hud=null;this.hudInput=undefined;if(refresh&&!this.closed&&!this.scene._cleanupDone)this.scene.createCrimeCityContent?.({force:true});}
 destroy(){if(this.closed)return;this.closed=true;this.close(false);this.pin?.destroy();this.pin=null;this.scene.scale.off('resize',this.resize);this.scene.events.off('shutdown',this.shutdown);EventBus.off('gameState:restored',this.restored);}
}
