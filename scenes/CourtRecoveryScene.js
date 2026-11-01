import { CourtScene as OriginalCourtScene } from './CourtScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';
import { audioManager } from '../managers/AudioManager.js';
import { buildCourtFacts } from '../systems/courtLogic.js';
import { currentChase, persistChase } from '../systems/chasePersistence.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import { buildArtifactFinalePlan, createArtifactFinaleRecord, validArtifactFinaleRecord,
  advanceArtifactFinale, makeFinaleRecoveryData, recoveryEntryMatches } from '../systems/artifactFinaleLogic.js';
import { ensureArtifactTrail, revealArtifactTrail, checkArtifactTrail } from '../systems/ArtifactTrailService.js';
import { trailSummary } from '../systems/artifactTrailModel.js';
import { renderTrailPanel } from '../systems/ArtifactTrailPanel.js';

export class CourtScene extends OriginalCourtScene {
  init(data={}){
    super.init(data);this.recoveryPlan=null;this.recoveryRecord=null;this.recoveryRoot=null;
    this.recoveryBusy=false;this.recoveryNotice='';this.recoveryError=null;
    this.trail=null;this.trailSelection={contact:0,reference:0};
  }
  create(){
    const effect=gameState.currentMission?.caseModifiers?.apartment?.effect,trial=gameState.courtState;
    const existingTrial=trial&&String(trial.caseId)===String(gameState.currentCaseId)&&
      trial.campaignId===gameState._createdAt&&String(trial.suspectId)===String(this.requestedSuspectId);
    if(effect?.artifactState!=='carried_away'||existingTrial){super.create();return;}
    try{
      const plan=buildArtifactFinalePlan(gameState,buildCourtFacts(gameState,this.requestedSuspectId),getEvidenceCaseKey(gameState));
      if(!plan){super.create();return;}
      const entry=gameState.getRecoveredArtifact(plan.missionId);
      if(entry){if(!recoveryEntryMatches(entry,plan))throw new Error('The recovered collection entry belongs to another artefact.');super.create();return;}
      const saved=gameState.apartmentProgress?.[plan.missionId]?.artifactFinale;
      if(saved?.caseKey===plan.caseKey&&!validArtifactFinaleRecord(saved,plan))throw new Error('The saved recovery stage is inconsistent. It was not overwritten.');
      this.recoveryPlan=plan;
      this.recoveryRecord=saved?.caseKey===plan.caseKey?structuredClone(saved):createArtifactFinaleRecord(plan);
      if(this.recoveryRecord.phase==='secured')throw new Error('The recovery record has no matching collection entry.');
      this.trail=ensureArtifactTrail();
      if(!this.trail||this.trail.plan.kind!==plan.kind||this.trail.plan.finaleCityId!==String(plan.cityId))throw new Error('Recovery and contact records disagree.');
      this.decorateSource();
    }catch(error){this.recoveryError=error.message;}
    BaseScene.prototype.create.call(this);EventBus.emit('hideHUD');
    for(const key of ['PlayerHudScene','UIScene','NewsHud']){
      const hud=this.getRegisteredScene(key);hud?.closeAllUIPanels?.();hud?.hideHud?.();if(hud)this.scene.setVisible(false,key);}
    audioManager.init(this);audioManager.stopAllMusic();audioManager.stopAllNonMusic();
    this.onRecoveryResize=()=>this.renderRecovery();this.scale.on('resize',this.onRecoveryResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.scale.off('resize',this.onRecoveryResize);this.recoveryRoot?.destroy(true);this.recoveryRoot=null;});
    if(!this.recoveryError&&!this.saveRecovery())this.recoveryNotice='Save failed. Retry before closing this tab.';
    this.renderRecovery();
  }
  decorateSource(){
    if(!this.trail||!this.recoveryPlan)return;
    this.recoveryPlan.source={...this.recoveryPlan.source,
      place:`${this.trail.plan.contact.name} — ${this.trail.plan.reference}`};
  }
  saveRecovery(){
    const p=this.recoveryPlan,r=this.recoveryRecord;
    if(!p||!r||p.caseKey!==getEvidenceCaseKey(gameState)||!validArtifactFinaleRecord(r,p))return false;
    gameState.updateState({apartmentProgress:{...(gameState.apartmentProgress||{}),
      [p.missionId]:{...(gameState.apartmentProgress?.[p.missionId]||{}),artifactFinale:structuredClone(r)}}});
    const chase=currentChase();
    if(chase&&String(chase.suspectId)===String(p.suspectId)&&['caught','review'].includes(chase.phase))
      return persistChase({...structuredClone(chase),phase:'review',terminalScene:'CourtScene'})===true;
    return saveGameState()===true;
  }
  applyRecoveryAction(action){
    if(this.recoveryBusy||!this.recoveryPlan||this.recoveryError)return;
    try{
      if(getEvidenceCaseKey(gameState)!==this.recoveryPlan.caseKey)throw new Error('The active case changed.');
      if(action==='brief'){
        this.trail=revealArtifactTrail(this.recoveryPlan.witnessLead?'occupant':'detainee');
      }else if(action==='select'){
        this.trail=ensureArtifactTrail();if(this.trail?.status!=='verified')throw new Error('Verify the transaction record first.');
      }
      const result=advanceArtifactFinale(this.recoveryRecord,this.recoveryPlan,action,this.recoveryPlan.kind);
      if(result.record)this.recoveryRecord=result.record;
      this.recoveryNotice=result.message||'';
      if(result.record&&!this.saveRecovery())this.recoveryNotice='Save failed. Please retry.';
    }catch(error){this.recoveryNotice=error.message;}
    this.renderRecovery();
  }
  verifyContact(contactId,reference){
    if(this.recoveryBusy)return;
    try{
      const result=checkArtifactTrail(contactId,reference);this.trail=ensureArtifactTrail();
      this.recoveryNotice=result.ok?'Transaction record confirmed.':result.message;
      if(!this.saveRecovery())this.recoveryNotice='Save failed. Please retry before continuing.';
    }catch(error){this.recoveryNotice=error.message;}
    this.renderRecovery();
  }
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
      this.recoveryNotice=this.saveRecovery()?'':'Artefact secured in memory, but saving failed. Retry before continuing.';
      if(recovered)EventBus.emit('artifactRecovered',{missionId:p.missionId,artifact:data.artifact,
        sourceObject:{id:data.recoveredFrom,label:data.recoveredLocation}});
    }catch(error){console.error('[ArtefactFinale]',error);this.recoveryNotice=error.message;}
    finally{this.recoveryBusy=false;this.renderRecovery();}
  }
  continueToCourt(){
    if(this.recoveryBusy||this.recoveryRecord?.phase!=='secured')return;const p=this.recoveryPlan;
    if(getEvidenceCaseKey(gameState)!==p.caseKey||!recoveryEntryMatches(gameState.getRecoveredArtifact(p.missionId),p)){
      this.recoveryNotice='No matching recovered artefact is registered.';this.renderRecovery();return;}
    if(!this.saveRecovery()){this.recoveryNotice='Save failed. Please retry.';this.renderRecovery();return;}
    this.recoveryBusy=true;this.scene.restart({suspectId:this.requestedSuspectId});
  }
  renderRecovery(){
    this.recoveryRoot?.destroy(true);this.recoveryRoot=null;
    const p=this.recoveryPlan,r=this.recoveryRecord;
    if(!this.recoveryError&&p&&r&&['source','inspect'].includes(r.phase)){
      try{
        this.trail=ensureArtifactTrail();
        if(this.trail.status==='hidden')this.trail=revealArtifactTrail(p.witnessLead?'occupant':'detainee');
      }catch(error){this.recoveryError=error.message;}
      if(!this.recoveryError&&(r.phase==='source'||this.trail.status!=='verified')){
        this.recoveryRoot=renderTrailPanel(this,this.trail,{
          selection:this.trailSelection,notice:this.recoveryNotice,
          onSelection:value=>{this.trailSelection=value;this.recoveryNotice='';this.renderRecovery();},
          onVerify:(contact,ref)=>this.verifyContact(contact,ref),
          onClose:()=>{this.recoveryRecord={...this.recoveryRecord,phase:'briefing'};this.saveRecovery();this.renderRecovery();},
          onContinue:()=>{
            if(r.phase==='source')this.applyRecoveryAction('select');else this.renderRecovery();
          },footer:'The recovery team will inspect the actual object before registering it.'
        });return;
      }
    }
    const {width,height}=this.scale,scale=Math.min(width/1000,height/760);
    const root=this.add.container((width-1000*scale)/2,(height-760*scale)/2).setScale(scale);this.recoveryRoot=root;
    const text=(y,value,size=23,color='#f4e6cd',maxHeight=140)=>{
      const t=this.add.text(500,y,value,{fontFamily:'SpecialElite',fontSize:`${size}px`,color,align:'center',wordWrap:{width:880}}).setOrigin(0.5,0);
      while(t.height>maxHeight&&parseInt(t.style.fontSize,10)>12)t.setFontSize(parseInt(t.style.fontSize,10)-1);root.add(t);return t;};
    const button=(y,label,callback)=>{
      const bg=this.add.rectangle(500,y,850,54,0x4d3828).setStrokeStyle(2,0xcba564).setInteractive({useHandCursor:true});
      root.add(bg);text(y-14,label,22,'#ffdda1',40);bg.on('pointerdown',()=>{if(!this.recoveryBusy)callback();});};
    root.add(this.add.rectangle(500,380,1000,760,0x1c1713));text(24,'ARTEFACT RECOVERY',30,'#ffcf78');
    if(this.recoveryError){text(150,this.recoveryError,24,'#ffb4a1',300);
      text(490,'Recovery is blocked by inconsistent case data. No substitute artefact or destination was generated.',21);
      button(650,'RETRY',()=>this.scene.restart({suspectId:this.requestedSuspectId}));return;}
    text(76,p.artifact.label,25,'#ffdda1',65);
    const city=gameState.currentCityData?.city||(typeof gameState.currentCity==='string'?gameState.currentCity:p.cityId);
    text(146,`Recovery operation: ${city}`,20);
    if(r.phase==='briefing'){
      text(205,p.witnessLead?'Your apartment interview established a contact and reference. Verify the transaction before dispatching the recovery team.':
        'The thief is detained. Question the suspect to obtain the contact and transaction reference.',25,'#f4e6cd',150);
      if(this.trail?.status!=='hidden')text(380,trailSummary(this.trail.plan),21,'#ffdda1',125);
      button(585,p.witnessLead?'CHECK THE CONTACT RECORD':'QUESTION THE DETAINED SUSPECT',()=>this.applyRecoveryAction('brief'));
    }else if(r.phase==='inspect'){
      text(205,`${p.source.search}\n\n${trailSummary(this.trail.plan)}`,23,'#f4e6cd',185);
      text(405,`CASE FILE: ${p.artifact.label}\n\n${p.artifact.description||'Compare the object with the stolen artefact in the case file.'}`,22,'#ffdda1',135);
      button(610,'COMPARE WITH CASE FILE AND SECURE THE ARTEFACT',()=>this.secureArtifact());
    }else{
      text(215,'ARTEFACT SECURED',30,'#d9edb2');text(300,`${p.artifact.label}\n\nRecovered at: ${p.source.place}\n\nLogged in recovered artefacts.`,25,'#f4e6cd',230);
      button(610,'CONTINUE TO COURT',()=>this.continueToCourt());
    }
    if(this.recoveryNotice){text(660,this.recoveryNotice,19,'#ffb4a1',50);
      button(730,'RETRY SAVE',()=>{this.recoveryNotice=this.saveRecovery()?'Saved.':'Save failed.';this.renderRecovery();});}
  }
}
