import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { buildCourtFacts } from '../../systems/courtLogic.js';
import { currentChase, persistChase } from '../../systems/chasePersistence.js';
import { getEvidenceCaseKey } from '../../managers/ApartmentEvidenceModel.js';
import { buildArtifactFinalePlan, createArtifactFinaleRecord, validArtifactFinaleRecord,
  advanceArtifactFinale, makeFinaleRecoveryData, recoveryEntryMatches } from '../../systems/artifactFinaleLogic.js';
import { ensureArtifactTrail, revealArtifactTrail, checkArtifactTrail } from '../../systems/ArtifactTrailService.js';
export const courtRecovery={
  tryCreateRecovery(){
    const effect=gameState.currentMission?.caseModifiers?.apartment?.effect,trial=gameState.courtState;
    const existingTrial=trial&&String(trial.caseId)===String(gameState.currentCaseId)&&
      trial.campaignId===gameState._createdAt&&String(trial.suspectId)===String(this.requestedSuspectId);
    if(effect?.artifactState!=='carried_away'||existingTrial)return false;
    try{
      const plan=buildArtifactFinalePlan(gameState,buildCourtFacts(gameState,this.requestedSuspectId),getEvidenceCaseKey(gameState));
      if(!plan)return false;
      const entry=gameState.getRecoveredArtifact(plan.missionId);
      if(entry){if(!recoveryEntryMatches(entry,plan))throw new Error('The recovered collection entry belongs to another artefact.');return false;}
      const saved=gameState.apartmentProgress?.[plan.missionId]?.artifactFinale;
      if(saved?.caseKey===plan.caseKey&&!validArtifactFinaleRecord(saved,plan))throw new Error('The saved recovery stage is inconsistent. It was not overwritten.');
      this.recoveryPlan=plan;
      this.recoveryRecord=saved?.caseKey===plan.caseKey?structuredClone(saved):createArtifactFinaleRecord(plan);
      if(this.recoveryRecord.phase==='secured')throw new Error('The recovery record has no matching collection entry.');
      this.trail=ensureArtifactTrail();
      if(!this.trail||this.trail.plan.kind!==plan.kind||this.trail.plan.finaleCityId!==String(plan.cityId))throw new Error('Recovery and contact records disagree.');
      this.decorateSource();
    }catch(error){this.recoveryError=error.message;}
    this.startCourtScene();this.recoveryMode=true;this.registerLifecycle();
    if(!this.recoveryError&&!this.saveRecovery())this.recoveryNotice=__dialogueText('scenes/CourtRecoveryScene.js','t_72652a996f873fcbc73d');
    this.renderRecovery();return true;
  },
  decorateSource(){
    if(!this.trail||!this.recoveryPlan)return;
    this.recoveryPlan.source={...this.recoveryPlan.source,place:`${this.trail.plan.contact.name} — ${this.trail.plan.reference}`};
  },
  saveRecovery(){
    const p=this.recoveryPlan,r=this.recoveryRecord;
    if(!p||!r||p.caseKey!==getEvidenceCaseKey(gameState)||!validArtifactFinaleRecord(r,p))return false;
    gameState.updateState({apartmentProgress:{...(gameState.apartmentProgress||{}),
      [p.missionId]:{...(gameState.apartmentProgress?.[p.missionId]||{}),artifactFinale:structuredClone(r)}}});
    const chase=currentChase();
    if(chase&&String(chase.suspectId)===String(p.suspectId)&&['caught','review'].includes(chase.phase))
      return persistChase({...structuredClone(chase),phase:'review',terminalScene:'CourtScene'})===true;
    return saveGameState()===true;
  },
  applyRecoveryAction(action){
    if(this.recoveryBusy||!this.recoveryPlan||this.recoveryError)return;
    try{
      if(getEvidenceCaseKey(gameState)!==this.recoveryPlan.caseKey)throw new Error('The active case changed.');
      if(action==='brief')this.trail=revealArtifactTrail(this.recoveryPlan.witnessLead?'occupant':'detainee');
      else if(action==='select'){this.trail=ensureArtifactTrail();if(this.trail?.status!=='verified')throw new Error('Verify the transaction record first.');}
      const result=advanceArtifactFinale(this.recoveryRecord,this.recoveryPlan,action,this.recoveryPlan.kind);
      if(result.record)this.recoveryRecord=result.record;
      this.recoveryNotice=result.message||'';
      if(result.record&&!this.saveRecovery())this.recoveryNotice=__dialogueText('scenes/CourtRecoveryScene.js','t_8f5d6a8051cbfd402072');
    }catch(error){this.recoveryNotice=error.message;}
    this.renderRecovery();
  },
  verifyContact(contactId,reference){
    if(this.recoveryBusy)return;
    try{
      const result=checkArtifactTrail(contactId,reference);this.trail=ensureArtifactTrail();
      this.recoveryNotice=result.ok?__dialogueText('scenes/CourtRecoveryScene.js','t_5299ae41078f943a47ca'):result.message;
      if(!this.saveRecovery())this.recoveryNotice=__dialogueText('scenes/CourtRecoveryScene.js','t_eb82c0988bba93614136');
    }catch(error){this.recoveryNotice=error.message;}
    this.renderRecovery();
  },
  secureArtifact(){
    if(this.recoveryBusy||this.recoveryRecord?.phase!=='inspect')return;this.recoveryBusy=true;
    try{
      const p=this.recoveryPlan;
      if(getEvidenceCaseKey(gameState)!==p.caseKey)throw new Error('The active case changed.');
      const fresh=buildArtifactFinalePlan(gameState,buildCourtFacts(gameState,this.requestedSuspectId),getEvidenceCaseKey(gameState));
      if(!fresh||fresh.artifact.id!==p.artifact.id||fresh.kind!==p.kind)throw new Error('The recovery context changed.');
      this.trail=ensureArtifactTrail();
      if(this.trail?.status!=='verified'||this.trail.plan.finaleCityId!==String(p.cityId))throw new Error('The matching transaction has not been verified.');
      this.decorateSource();let entry=gameState.getRecoveredArtifact(p.missionId),recovered=false;
      const data=makeFinaleRecoveryData(p,new Date().toISOString());
      if(!entry){recovered=gameState.recoverArtifact(data)===true;entry=gameState.getRecoveredArtifact(p.missionId);}
      if(!recoveryEntryMatches(entry,p))throw new Error('The artefact could not be registered. Nothing was marked as secured.');
      this.recoveryRecord={...this.recoveryRecord,phase:'secured',recoveredAt:entry.recoveredAt||data.recoveredAt};
      this.recoveryNotice=this.saveRecovery()?'':__dialogueText('scenes/CourtRecoveryScene.js','t_4702b4be0419cd94a909');
      if(recovered)EventBus.emit('artifactRecovered',{missionId:p.missionId,artifact:data.artifact,
        sourceObject:{id:data.recoveredFrom,label:data.recoveredLocation}});
    }catch(error){console.error('[ArtefactFinale]',error);this.recoveryNotice=error.message;}
    finally{this.recoveryBusy=false;this.renderRecovery();}
  },
  continueToCourt(){
    if(this.recoveryBusy||this.recoveryRecord?.phase!=='secured')return;const p=this.recoveryPlan;
    if(getEvidenceCaseKey(gameState)!==p.caseKey||!recoveryEntryMatches(gameState.getRecoveredArtifact(p.missionId),p)){
      this.recoveryNotice=__dialogueText('scenes/CourtRecoveryScene.js','t_fed9b62a518aa035647e');this.renderRecovery();return;}
    if(!this.saveRecovery()){this.recoveryNotice=__dialogueText('scenes/CourtRecoveryScene.js','t_8f5d6a8051cbfd402072');this.renderRecovery();return;}
    this.recoveryBusy=true;this.scene.restart({suspectId:this.requestedSuspectId});
  }
};
