import { dialogueText as t } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { HomeTownDialogue } from '../../ui/HomeTownDialogue.js';
import { ensureArtifactTrail, revealArtifactTrail } from '../../systems/ArtifactTrailService.js';
import { trailSummary } from '../../systems/artifactTrailModel.js';
import { renderTrailPanel } from '../../systems/ArtifactTrailPanel.js';
const text=id=>t('scenes/CourtRecoveryScene.js',id);
export const courtRecoveryView={
  clearRecoveryView(){
    this.recoveryDialogue?.destroy();this.recoveryDialogue=null;
    this.recoveryRoot?.destroy(true);this.recoveryRoot=null;
  },
  renderRecovery(){
    this.clearRecoveryView();
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
          onContinue:()=>{if(r.phase==='source')this.applyRecoveryAction('select');else this.renderRecovery();},
          footer:text('t_30870d55edf3fe545c1b')
        });return;
      }
    }
    const messages=[],choices=[];
    const add=(value,speaker='npc')=>messages.push({speaker,text:String(value??'')});
    const choose=(label,action)=>choices.push({label,action,scoreTrust:false});
    if(this.recoveryError){
      add(this.recoveryError);add(text('t_a3be2a1ee4ef2548560a'),'note');
      choose('RETRY',()=>this.scene.restart({suspectId:this.requestedSuspectId}));
    }else{
      add(p.artifact.label,'note');
      const city=gameState.currentCityData?.city||(typeof gameState.currentCity==='string'?gameState.currentCity:p.cityId);
      add(`${text('t_53539c76d9bba3a999ba')}${city}`,'note');
      if(r.phase==='briefing'){
        add(p.witnessLead?text('t_c1fe6cc039b68de24311'):text('t_b414ad06d201d7d68e8e'));
        if(this.trail?.status!=='hidden')add(trailSummary(this.trail.plan),'note');
        choose(p.witnessLead?text('t_3fed9b22cd069fd99ff4'):text('t_fdc6664ff1fd795d3aa6'),()=>this.applyRecoveryAction('brief'));
      }else if(r.phase==='inspect'){
        add(`${p.source.search}\n\n${trailSummary(this.trail.plan)}`);
        add(`${text('t_41d841bcbe6545c46bb2')}${p.artifact.label}${text('t_75a11da44c802486bc6f')}${p.artifact.description||text('t_80d73a7e37a0ed1c0aa3')}`,'note');
        choose(text('t_6ed32addcb09e5953d91'),()=>this.secureArtifact());
      }else{
        add(text('t_91b6f65de72e3043e351'));
        add(`${p.artifact.label}${text('t_cc9d200d27e0127e6a27')}${p.source.place}${text('t_5ced6fa4c6ff014c43d6')}`,'note');
        choose(text('t_6d31770d1a065487aaa2'),()=>this.continueToCourt());
      }
      if(this.recoveryNotice){
        add(this.recoveryNotice,'note');choose(text('t_4737fde6ff551c004b64'),()=>{
          this.recoveryNotice=this.saveRecovery()?text('t_fca046ccd586c67f7fe0'):text('t_19b9455ce71a631f52e7');this.renderRecovery();
        });
      }
    }
    const d=new HomeTownDialogue(this,()=>{});this.recoveryDialogue=d;
    d.show({title:text('t_cee676097a33f5f89ef3'),messages,choices:choices.map(c=>({...c,action:()=>{
      if(this.recoveryDialogue===d&&!this.recoveryBusy)c.action();
    }})),showTrust:false,scoreTrust:false,depth:5000,onDraw:()=>{
      this.recoveryRoot=d.root;const panel=d.panel;
      panel.onLeave=()=>{};panel.byeBtn.rect.setVisible(false);panel.byeBtn.rect.input.enabled=false;panel.byeBtn.text.setVisible(false);
    }});
  }
};
