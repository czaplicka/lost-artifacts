import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { allWitnessesVisited,getWitnessTestimony,getTimelineBoardData,NO_ALIBI_LIAR } from '../alibi/AlibiEncounterSetup.js';
import { getFiledAlibiConclusion,fileAlibiConclusion,getAlibiEvidenceDossier } from '../alibi/AlibiConclusion.js';
import { getAlibiSourceRecords } from '../alibi/AlibiConclusionEvidence.js';
import { AlibiDeductionController } from '../alibi/AlibiDeductionController.js';
import { deductionManager } from '../managers/DeductionManager.js';
import { formatNoteTime,getAlibiTimeNote,getAlibiTimeDetail,getAlibiCardBody } from '../alibi/AlibiTimeNotes.js';
import { preloadPuzzleSfx,playPuzzleSfx,playPuzzlePaperChange } from './archive/PuzzleSfx.js';
const W=1100,H=1040,ERROR='#b3261e',NORMAL='#594a36',SUCCESS='#35633b';
export class AlibiTimelineScene extends BaseScene {
 constructor(){super({key:'AlibiTimelineScene'});}
 init(data={}){
  this.caseKey=data.caseKey||null;this.suspectId=data.suspectId||null;this.cityId=data.cityId||null;
  this.returnScene=data.returnScene||'CrimeCityScene';this.returnData=data.returnData||{cityId:this.cityId};
  this.cards=[];this.witnesses=[];this.slots=[null,null,null];this.choice=null;this.confirmationBasis=null;
  this.root=null;this.modal=null;this.messageText=null;this.busy=false;this.solved=false;this.result='pending';
  this.evidenceStatus=null;this.feedback='';this.feedbackColor=NORMAL;this.deduction=new AlibiDeductionController(this);
 }
 preload(){preloadPuzzleSfx(this,['paper','stamp','page']);}
 create(){super.create();this.stopSceneIfActive('NewsHud');this.getPlayerHudScene()?.closeAllUIPanels?.();
  this.cameras.main.resetFX();this.cameras.main.setAlpha(1).setBackgroundColor('#171b22');this.trackInputEvent(this.scale,'resize',this.fitView,this);
  try{this.loadBoard();this.render();}catch(error){console.error('[AlibiTimelineScene] Cannot open board',error);this.createRoot();
   this.text(this.root,60,160,'This board could not be opened. Record all three witness visits and try again.',960,{fontSize:'26px',color:ERROR});
   this.button(this.root,30,975,260,48,'RETURN TO CITY',()=>void this.returnToCity());}}
 loadBoard(){
  if(!this.caseKey||!this.suspectId||!allWitnessesVisited(this.caseKey,this.suspectId))throw new Error('Incomplete interviews or missing case.');
  const board=getTimelineBoardData(this.caseKey,this.suspectId);if(board.boardCards?.length!==3||!board.crimeWindow)throw new Error('Incomplete board data.');
  this.cards=board.boardCards;this.crimeWindow=board.crimeWindow;
  this.witnesses=(gameState.crimeCityEncounterState?.[this.caseKey]||[]).filter(e=>e.suspectId===this.suspectId&&e.alibiWitness===true)
   .map(e=>getWitnessTestimony(this.caseKey,this.suspectId,e.npcId));
  if(this.witnesses.length!==3||this.witnesses.some(w=>!w))throw new Error('Missing statements.');this.suspectName=this.witnesses[0].suspectName||'this person';
  const filed=getFiledAlibiConclusion(this.caseKey,this.suspectId);if(filed){this.solved=true;this.result=filed.status;this.choice=filed.choice;this.evidenceStatus=filed.evidenceStatus;
   if(filed.timelineIds.length===3)this.slots=[...filed.timelineIds];}
 }
 createRoot(){this.modal=null;this.root?.destroy(true);this.root=this.add.container(0,0);
  this.root.add(this.add.rectangle(W/2,H/2,W-16,H-16,0xede1c4).setStrokeStyle(3,0x8a7350));this.fitView();}
 fitView(){if(!this.root)return;const scale=Math.min(this.scale.width/W,this.scale.height/H);this.root.setScale(scale).setPosition((this.scale.width-W*scale)/2,(this.scale.height-H*scale)/2);}
 text(parent,x,y,content,width,options={}){const o=this.add.text(x,y,String(content??''),{fontFamily:'SpecialElite',fontSize:'19px',color:'#382e24',wordWrap:{width},...options});parent.add(o);return o;}
 fitText(o,h,min=14){while(o.height>h&&parseInt(o.style.fontSize,10)>min)o.setFontSize(parseInt(o.style.fontSize,10)-1);return o;}
 button(parent,x,y,w,h,label,callback,{selected=false,disabled=false}={}){
  const fill=selected?0x846a3f:0x493d30,bg=this.add.rectangle(x+w/2,y+h/2,w,h,fill).setStrokeStyle(selected?4:2,selected?0xe2bd71:0x9b815b);parent.add(bg);
  const t=this.text(parent,x+10,y+h/2,label,w-20,{fontSize:'18px',color:'#fff3d6',align:'center'}).setOrigin(0,0.5);t.setFixedSize(w-20,0);this.fitText(t,h-8,14);
  if(disabled){bg.setAlpha(0.5);return;}bg.setInteractive({useHandCursor:true}).on('pointerover',()=>bg.setFillStyle(0x705c42)).on('pointerout',()=>bg.setFillStyle(fill))
   .on('pointerdown',()=>{if(!this.busy&&!(parent===this.root&&this.modal))callback();});
 }
 getChoices(){return [...this.witnesses.map(w=>({id:w.npcId,label:`Challenge ${w.role}'s alibi account`})),{id:NO_ALIBI_LIAR,label:'The accounts establish an alibi'}];}
 cardBody(card){return getAlibiCardBody(this.caseKey,this.suspectId,card);}
 clearFeedback(){this.feedback='';this.feedbackColor=NORMAL;}
 render(){this.createRoot();this.text(this.root,30,24,'ALIBI / FINAL CONCLUSION',740,{fontFamily:'PressStart2P',fontSize:'17px'});
  this.text(this.root,30,60,`Subject: ${this.suspectName}`,740);this.text(this.root,30,92,`Theft window — day ${this.crimeWindow.day}: ${formatNoteTime(this.crimeWindow.startMinute)}–${formatNoteTime(this.crimeWindow.endMinute)}`,740);
  this.button(this.root,815,25,250,42,'READ STATEMENTS',()=>this.openStatements(0));this.button(this.root,815,78,250,42,'COMPARE TIMES',()=>this.openTimeComparison());
  if(this.solved){this.renderFiledConclusion();this.drawFooter();return;}
  this.text(this.root,30,135,'Arrange the recorded events from earliest to latest. This is your proposed timeline.',1030,{fontSize:'18px'});
  const checks=deductionManager.getSummary().unlocked;
  this.slots.forEach((id,i)=>{const card=this.cards.find(c=>c.id===id);this.drawCard(30+i*355,175,330,170,card?.role||['EARLIEST','MIDDLE','LATEST'][i],
   card?this.cardBody(card):'Choose a card below.',()=>{const before=[...this.slots];this.slots[i]=null;playPuzzlePaperChange(this,before,this.slots);this.clearFeedback();this.render();});
   if(checks)this.button(this.root,30+i*355,355,330,40,this.deduction.label('timeline',i),()=>this.deduction.run('timeline',i));});
  this.text(this.root,30,403,'Recorded cards — a statement is evidence of what was said, not automatic proof of truth.',1030,{fontSize:'17px'});
  this.cards.forEach((card,i)=>{const placed=this.slots.includes(card.id);this.drawCard(30+i*355,435,330,170,card.role,placed?'Already placed':this.cardBody(card),()=>this.placeCard(card.id),placed);});
  this.text(this.root,30,620,'Choose the conclusion you are prepared to file:',1000);
  this.getChoices().forEach((c,i)=>this.button(this.root,30+(i%2)*535,655+Math.floor(i/2)*65,510,54,c.label,()=>{this.choice=c.id;this.clearFeedback();this.render();},{selected:this.choice===c.id}));
  this.button(this.root,30,790,510,42,this.deduction.label('conclusion'),()=>this.deduction.run('conclusion'));
  this.button(this.root,560,790,505,42,this.choice===NO_ALIBI_LIAR?`ALIBI BASIS: ${this.confirmationBasis?'SELECTED':'NOT SELECTED'}`:'EVIDENCE / RECORDED COMPARISONS',
   ()=>this.choice===NO_ALIBI_LIAR?this.openConfirmationBasis():this.openEvidenceSummary(),{disabled:!this.choice});
  this.text(this.root,30,845,this.deduction.summaryText(),1030,{fontSize:'17px'});
  this.text(this.root,30,878,'Filing locks your claim. Documentation is not a guarantee that your conclusion is true.',1030,{fontSize:'17px'});this.drawFooter();
 }
 renderFiledConclusion(){this.text(this.root,60,185,'YOUR FILED CLAIM',980,{fontFamily:'PressStart2P',fontSize:'22px',align:'center'});
  const choice=this.getChoices().find(c=>c.id===this.choice),quality=this.evidenceStatus==='documented'?'SOURCES ATTACHED':this.evidenceStatus==='risky'?'RISKY / EXPLICITLY ACCEPTED':'LEGACY / NOT RE-EVALUATED';
  this.text(this.root,70,255,`${this.result==='confirmed'?'Alibi claimed':'Alibi challenged'}\n\n${choice?.label||''}\n\n${quality}\n\nThis records your conclusion, not a verdict on its truth.`,960,{fontSize:'24px',align:'center',lineSpacing:6});
  this.button(this.root,300,545,500,48,'READ FILED EVIDENCE DOSSIER',()=>this.openEvidenceSummary());
  const ordered=this.slots.map(id=>this.cards.find(c=>c.id===id)).filter(Boolean);
  if(ordered.length===3){const t=this.text(this.root,65,620,ordered.map((c,i)=>`${i+1}. ${c.role}\n${this.cardBody(c)}`).join('\n\n'),970,{fontSize:'20px'});this.fitText(t,255,14);}
 }
 drawCard(x,y,w,h,title,body,callback,disabled=false){const bg=this.add.rectangle(x+w/2,y+h/2,w,h,disabled?0xd2c5aa:0xfff5dc).setStrokeStyle(2,0xa38b63);this.root.add(bg);
  this.fitText(this.text(this.root,x+15,y+10,String(title||'Witness').toUpperCase(),w-30,{fontSize:'18px'}),35,13);
  this.fitText(this.text(this.root,x+15,y+48,body,w-30,{fontSize:'18px',lineSpacing:3}),h-58,13);
  if(!disabled)bg.setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(!this.busy&&!this.solved&&!this.modal)callback();});}
 drawFooter(){this.messageText=this.text(this.root,30,914,this.feedback,1030,{fontSize:'17px',color:this.feedbackColor});this.fitText(this.messageText,60,14);
  this.button(this.root,30,988,245,42,'RETURN TO CITY',()=>void this.returnToCity());if(this.solved)return;
  this.button(this.root,425,988,180,42,'CLEAR',()=>{const before=[...this.slots];this.slots=[null,null,null];this.choice=null;this.confirmationBasis=null;playPuzzlePaperChange(this,before,this.slots);this.clearFeedback();this.render();});
  this.button(this.root,745,988,320,42,'FILE CONCLUSION',()=>this.checkDeduction());}
 placeCard(id){if(this.solved||this.slots.includes(id))return;const i=this.slots.indexOf(null);if(i<0){this.setFeedback('Remove a placed card first.',ERROR);return;}
  const before=[...this.slots];this.slots[i]=id;playPuzzlePaperChange(this,before,this.slots);this.clearFeedback();this.render();}
 setFeedback(message,color=NORMAL){this.feedback=message;this.feedbackColor=color;this.messageText?.setText(message).setColor(color);}
 filingOptions(allowRisky=false){return {allowRisky,confirmation:this.choice===NO_ALIBI_LIAR&&this.confirmationBasis?{
  basis:this.confirmationBasis,witnessIds:this.witnesses.map(w=>w.npcId),crimeWindow:{...this.crimeWindow}}:null};}
 checkDeduction(){if(this.busy||this.solved||this.modal)return;this.submitConclusion(false);}
 submitConclusion(allowRisky=false){if(this.busy||this.solved||this.modal)return;this.busy=true;let warning=null;
  try{const result=fileAlibiConclusion(this.caseKey,this.suspectId,[...this.slots],this.choice,this.filingOptions(allowRisky));
   if(!result.accepted){if(result.requiresRiskConfirmation)warning=result;else this.setFeedback(result.message,ERROR);}
   else{this.result=result.status;this.evidenceStatus=result.evidenceStatus;this.solved=true;if(!result.alreadyFiled)playPuzzleSfx(this,'stamp',0.4);
    if(result.alreadyFiled)this.loadBoard();
    if(result.status==='contradicted'){advanceCrimeTutorial(gameState,'find_liar');saveGameState();}
    this.feedback=result.evidenceStatus==='risky'?'Risky claim filed. Missing support remains recorded.':'Conclusion filed. Sources are preserved; correctness is not revealed.';
    if(result.rewardSaved===false)this.feedback+=' Reward persistence needs a retry.';this.feedbackColor=SUCCESS;this.render();}}
  catch(error){console.error('[AlibiTimelineScene] Filing failed',error);const filed=getFiledAlibiConclusion(this.caseKey,this.suspectId);
   if(filed){this.loadBoard();this.render();}this.setFeedback('Filing could not be completed. Check the saved claim before retrying.',ERROR);}
  finally{this.busy=false;}if(warning)this.openRiskConfirmation(warning);
 }
 createModal(){this.modal?.destroy(true);this.modal=this.add.container(0,0);this.root.add(this.modal);this.modal.add(this.add.rectangle(W/2,H/2,W,H,0x171b22,0.99).setInteractive());return this.modal;}
 closeModal(){this.modal?.destroy(true);this.modal=null;}
 openTextPages(title,content,page=0){const modal=this.createModal(),body=this.text(modal,55,115,'',990,{fontSize:'23px',color:'#fff0ce',lineSpacing:5});
  this.text(modal,55,40,title,990,{fontSize:'28px',color:'#fff0ce'});const pages=[];let current='';
  for(const line of body.getWrappedText(String(content||'No record available.'))){const test=current?`${current}\n${line}`:line;body.setText(test);
   if(body.height>720&&current){pages.push(current);current=line;}else current=test;}pages.push(current);const index=Math.max(0,Math.min(page,pages.length-1));body.setText(pages[index]);
  this.button(modal,55,935,250,55,'PREVIOUS PAGE',()=>this.openTextPages(title,content,index-1),{disabled:index===0});
  this.button(modal,425,935,250,55,`CLOSE (${index+1}/${pages.length})`,()=>this.closeModal());
  this.button(modal,795,935,250,55,'NEXT PAGE',()=>this.openTextPages(title,content,index+1),{disabled:index===pages.length-1});}
 openRiskConfirmation(result){const modal=this.createModal();this.text(modal,55,55,'FILE AN UNSUPPORTED CLAIM?',990,{fontSize:'30px',color:'#ffcca8'});
  const body=this.text(modal,55,145,[result.message,...result.riskReasons.map(r=>`- ${r}`),
   'The missing support will remain in the case record. Filing will lock this conclusion. No correction or missing witness detail will be invented.'].join('\n\n'),990,{fontSize:'24px',color:'#fff0ce',lineSpacing:7});this.fitText(body,650,18);
  this.button(modal,55,920,450,65,'GO BACK / DO NOT FILE',()=>this.closeModal());
  this.button(modal,595,920,450,65,'FILE RISKY CLAIM',()=>{this.closeModal();this.submitConclusion(true);});}
 openConfirmationBasis(){const modal=this.createModal();this.text(modal,55,50,'WHAT SUPPORTS THIS ALIBI?',990,{fontSize:'30px',color:'#fff0ce'});
  this.text(modal,55,130,`Compare all three recorded accounts with day ${this.crimeWindow.day}, ${formatNoteTime(this.crimeWindow.startMinute)}–${formatNoteTime(this.crimeWindow.endMinute)}.\n\nChoose the basis of YOUR claim. This does not verify that the witnesses are truthful.`,990,{fontSize:'24px',color:'#fff0ce',lineSpacing:7});
  const choices=[['continuous_observation','The three direct observations cover the theft window'],['attendance_record','An attendance record, booking or receipt exists'],['familiarity','The witnesses know the suspect']];
  choices.forEach(([id,label],i)=>this.button(modal,55,410+i*95,990,70,label,()=>{this.confirmationBasis=id;this.closeModal();this.clearFeedback();this.render();},{selected:this.confirmationBasis===id}));
  this.button(modal,390,920,320,55,'CANCEL',()=>this.closeModal());}
 openEvidenceSummary(){const dossier=getAlibiEvidenceDossier(this.caseKey,this.suspectId);
  if(dossier){const e=dossier.evidence;
   if(!e){this.openTextPages('FILED EVIDENCE','This is a legacy conclusion. Its original evidence basis was not recorded and has not been reconstructed.');return;}
   const text=[`Documentation: ${dossier.evidenceStatus}. This is not a correctness verdict.`,...e.sources.map(s=>`${s.role}:\n${s.statement}`),
    e.comparison?`COMPARISON:\n${e.comparison.statement.role} versus ${e.comparison.evidence.role}\nReason: ${e.comparison.reason}`:'',
    e.confirmation?`ALIBI BASIS: ${e.confirmation.basis}\nCompared with day ${e.confirmation.crimeWindow.day}, ${formatNoteTime(e.confirmation.crimeWindow.startMinute)}–${formatNoteTime(e.confirmation.crimeWindow.endMinute)}`:'',
    e.retraction?`RECORDED CORRECTION:\n${e.retraction}`:'',...(e.riskReasons||[]).map(r=>`MISSING SUPPORT: ${r}`)].filter(Boolean).join('\n\n');
   this.openTextPages('FILED EVIDENCE',text);return;}
  const knownIds=new Set(getAlibiSourceRecords(this.caseKey,this.suspectId).map(r=>r.npcId));
  const records=this.witnesses.map(w=>{const c=gameState.caseData?.alibiCases?.[this.caseKey]?.cooperation?.[w.encounterId];
   const b=c?.correctedEvidence||c?.activeEvidence;return b&&knownIds.has(w.npcId)&&knownIds.has(b.evidence?.id)?`${w.role}\nSelected reason: ${b.reason}\n\n${b.statement.quote}\n\nCompared with:\n${b.evidence.quote}${c.revisedStatement?'\n\nCorrection: '+c.revisedStatement:''}`:null;}).filter(Boolean);
  this.openTextPages('RECORDED COMPARISONS',records.join('\n\n---\n\n')||'No submitted evidence comparison is attached yet. Return to the witnesses to present one.');}
 getRevision(w){return gameState.caseData?.alibiCases?.[this.caseKey]?.cooperation?.[w.encounterId]?.revisedStatement||null;}
 openStatements(index){const w=this.witnesses[index];if(!w)return;playPuzzleSfx(this,'page',0.25);const modal=this.createModal();
  this.text(modal,55,45,`${index+1}/3 — ${w.role}`,990,{fontSize:'29px',color:'#fff0ce'});
  this.fitText(this.text(modal,55,100,getAlibiTimeDetail(this.caseKey,this.suspectId,w.timelineCard),990,{fontSize:'20px',color:'#e9bd72',lineSpacing:4}),145,16);
  const revision=this.getRevision(w),text=['RECORDED ACCOUNT',w.statement,revision?'RECORDED CORRECTION:\n'+revision:''].filter(Boolean).join('\n\n');
  this.fitText(this.text(modal,55,270,text,990,{fontSize:'25px',color:'#fff0ce',lineSpacing:7}),605,15);
  this.button(modal,55,935,250,55,'PREVIOUS WITNESS',()=>this.openStatements((index+2)%3));this.button(modal,425,935,250,55,'CLOSE',()=>this.closeModal());this.button(modal,795,935,250,55,'NEXT WITNESS',()=>this.openStatements((index+1)%3));}
 openTimeComparison(){const modal=this.createModal();this.text(modal,45,35,'COMPARE THE RECORDED TIMES',1010,{fontFamily:'PressStart2P',fontSize:'17px',color:'#fff0ce'});
  this.text(modal,45,85,'Ranges describe collected testimony. They are not automatic verification.',1010,{fontSize:'20px',color:'#fff0ce'});
  const rows=this.witnesses.map(w=>({w,note:getAlibiTimeNote(this.caseKey,this.suspectId,w.timelineCard)}));
  const times=[this.crimeWindow.startMinute,this.crimeWindow.endMinute];rows.forEach(r=>{if(r.note.eventTime!==null)times.push(r.note.eventTime);r.note.ranges.forEach(t=>times.push(t.startMinute,t.endMinute));});
  const min=Math.max(0,Math.min(...times)-5),max=Math.min(1439,Math.max(...times)+5),left=95,right=1015,top=185,bottom=785,xFor=n=>left+(n-min)/Math.max(1,max-min)*(right-left);
  const start=xFor(this.crimeWindow.startMinute),end=xFor(this.crimeWindow.endMinute);modal.add(this.add.rectangle((start+end)/2,(top+bottom)/2,Math.max(2,end-start),bottom-top,0xa95045,0.25));
  this.text(modal,45,125,`THEFT: ${formatNoteTime(this.crimeWindow.startMinute)}–${formatNoteTime(this.crimeWindow.endMinute)}`,1010,{fontSize:'20px',color:'#f0a79b'});
  for(let i=0;i<=6;i++){const n=Math.round(min+(max-min)*i/6),x=xFor(n);modal.add(this.add.rectangle(x,(top+bottom)/2,1,bottom-top,0x897b64,0.45));this.text(modal,x-32,165,formatNoteTime(n),70,{fontSize:'16px',color:'#dfd2b8'});}
  rows.forEach((r,i)=>{const y=265+i*190,revision=this.getRevision(r.w);this.text(modal,55,y-48,`${i+1}. ${r.w.role}${revision?' / correction recorded':''}`,990,{fontSize:'21px',color:'#fff0ce'});
   modal.add(this.add.rectangle((left+right)/2,y,right-left,2,0x897b64));r.note.ranges.forEach(range=>{const a=xFor(range.startMinute),b=xFor(range.endMinute);modal.add(this.add.rectangle((a+b)/2,y,Math.max(3,b-a),24,revision?0x8a8170:0xd4ac61).setStrokeStyle(1,0xffe1a0));});
   if(r.note.eventTime!==null)modal.add(this.add.rectangle(xFor(r.note.eventTime),y,12,12,0xfff0ce).setAngle(45));
   const detail=r.note.ranges.length?r.note.ranges.map(t=>`${formatNoteTime(t.startMinute)}–${formatNoteTime(t.endMinute)}: ${t.label}`).join('\n'):r.note.eventLabel;
   this.fitText(this.text(modal,55,y+30,detail,990,{fontSize:'19px',color:'#dfd2b8'}),90,15);});
  this.text(modal,55,825,'A correction does not erase the original statement.',990,{fontSize:'21px',color:'#fff0ce'});this.button(modal,390,935,320,55,'CLOSE',()=>this.closeModal());}
 async returnToCity(){if(this.busy||this._cleanupDone||this.modal)return;this.busy=true;try{const opened=await this.goto(this.returnScene,this.returnData);
  if(!opened&&!this._cleanupDone){this.busy=false;this.setFeedback('Could not return. Please try again.',ERROR);}}
  catch(error){console.error('[AlibiTimelineScene] Navigation failed',error);if(!this._cleanupDone){this.busy=false;this.setFeedback('Could not return. Please try again.',ERROR);}}}
}
