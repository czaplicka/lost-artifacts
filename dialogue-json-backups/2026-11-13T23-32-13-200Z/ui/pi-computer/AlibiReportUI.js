import { gameState } from '../../GameData.js';
import {
 ALIBI_QUEST_ID,ALIBI_QUESTIONS,ALIBI_ENDINGS,getAlibiFinale,
 isAlibiReady,isAlibiReconstructed,setAlibiStep,selectAlibiAnswer,checkAlibiAnswer,
 selectAlibiEnding,getAlibiPreview,alibiPreviewToken,finishAlibiReport
} from '../../managers/AlibiResolutionService.js';
import { alibiSilenceOfferKnown } from './AlibiGuidanceRules.js';
import { prepareReportCompletionAudio, reportCompletionButton } from './ReportCompletionAudio.js';
const DRAFT='alibi_final_report_draft',SENT='alibi_final_report_sent',REPLY='alibi_final_report_reply',OFFER='alibi_club_silence_offer';
const IDS=new Set([DRAFT,SENT,REPLY,OFFER]);
export class AlibiReportUI{
 constructor(ui){this.ui=ui;this.confirmedPreview=null;this.notice='';this.opened=false;prepareReportCompletionAudio(ui.scene);this.install();}
 refresh(){const u=this.ui;if(u.isOpen&&!u.suspended&&!u.destroyed&&u.app==='mail')u.render();}
 mail(items){
  const normal=items.filter(m=>!IDS.has(m.id)),q=gameState.piQuests?.quests?.[ALIBI_QUEST_ID],s=getAlibiFinale();
  if(!q)return normal;
  if(s.settlement?.phase==='completed'){
   const p=s.settlement.preview;
   return[{id:REPLY,from:'Arthur Finch',subject:'Re: The Borrowed Alibi — case closed',date:'Case correspondence',body:p.reply},
    {id:SENT,from:'You → '+p.deliveries.join('; '),subject:'Sent: The Borrowed Alibi — final report',date:'Case closed',body:p.report+(p.dossier?'\n\nREFERRAL DOSSIER\n'+p.dossier:'')},...normal];
  }
  if(q.status!=='active'&&!s.settlement)return normal;
  const offer=alibiSilenceOfferKnown(gameState)?[{id:OFFER,from:'Tuesday Alibi Club — Membership',
   subject:'The private feedback arrangement you discussed',date:'Following your telephone enquiry',
   body:'As discussed during your call, we offer $120 for keeping our package and findings about its use out of further reports. Send your client an inconclusive account instead.\n\nThis is payment for silence, not a refund. The client’s contract fee is separate. The offer cannot erase earlier conversations.\n\nNo money is transferred unless you explicitly accept this arrangement when confirming your final report.\n\nTuesday Alibi Club'}]:[];
  return [...offer,...normal];
 }
 open(){this.opened=true;this.confirmedPreview=null;this.ui.app='mail';this.ui.selectedId=null;this.ui.bodyPage=0;this.notice='';this.refresh();}
 install(){
  const u=this.ui,docs=u.documents,mail=docs.getMail.bind(docs);docs.getMail=()=>this.mail(mail());
  this.paged=docs.renderPagedText.bind(docs);
  const render=docs.render.bind(docs);
  docs.render=()=>{
   if(u.app!=='mail')this.opened=false;
   const active=gameState.piQuests?.quests?.[ALIBI_QUEST_ID]?.status==='active';
   if(u.app==='mail'&&this.opened&&active){this.render();return;}
   if(u.selectedId===DRAFT)u.selectedId=null;
   render();
   if(u.app==='mail'&&active&&u.window&&!u[Symbol.for('lostArtifacts.alibiDialogueUIV2')]){
    const b=u.window;u.drawing.button(b.x+b.w-(b.w>=600?190:120),b.y+b.h-77,b.w>=600?'CASE REVIEW':'REVIEW',()=>this.open());
   }
  };
 }
 back(){
  this.opened=false;
  const u=this.ui,items=u.documents.getMail(),target=items.find(m=>m.id!==DRAFT),per=Math.max(1,Math.floor((u.window.h-150)/64));
  u.selectedId=target?.id||null;u.listPage=Math.max(0,Math.floor(items.findIndex(m=>m.id===u.selectedId)/per));u.bodyPage=0;this.confirmedPreview=null;this.refresh();
 }
 frame(title){
  const u=this.ui,d=u.drawing,b=u.window,x=b.x+20,y=b.y+52,w=b.w-40,bottom=b.y+b.h-50;
  d.rectangle(b.x+9,b.y+48,b.w-18,b.h-95,0xf2ecd6).setInteractive();
  d.pixel(x+10,y+10,title,11,'#303d35',w-160);d.button(x+w-100,y,'BACK',()=>this.back());
  return{x:x+10,y:y+50,w:w-20,bottom};
 }
 render(){
  const s=getAlibiFinale();
  if(this.confirmedPreview){this.renderConfirmation();return;}
  if(s.settlement||isAlibiReconstructed()){this.renderReports();return;}
  if(!isAlibiReady()){
   const a=this.frame('THE BORROWED ALIBI — CASE RECORDS');
   this.paged('There are still unverified parts of the case.\n\nUse the relevant conversations to establish what each source can confirm: a sample supplies wording; the restaurant records a real visit; a person’s explanation is not independent attendance evidence.\n\nIf a comparison is unclear, ask the source about the document or the relevant incident. Keep statements, records and your conclusions separate.\n\nThis screen does not select a suspect or a keyword combination for you. Optional HINT assistance remains available from the normal case interface.',a.x,a.y,a.w,Math.max(80,a.bottom-a.y-10));return;
  }
  this.renderReconstruction();
 }
 renderReconstruction(){
  const u=this.ui,d=u.drawing,s=getAlibiFinale(),step=Math.max(0,Math.min(2,s.draft.step)),q=ALIBI_QUESTIONS[step],answer=s.draft.selections[q.id]||{},locked=s.draft.checked.includes(q.id);
  const a=this.frame(`RECONSTRUCTION ${step+1} / ${ALIBI_QUESTIONS.length}`);d.text(a.x,a.y,q.question,19,'#303d35',a.w);
  const row=(kind,label,options,y)=>{
   d.text(a.x,y,label,13,'#756447',a.w);d.bevel(a.x,y+23,a.w-110,70,0xffffff,true);
   const selected=options.find(o=>o.id===answer[kind]);d.text(a.x+12,y+35,selected?.text||'Choose an option with the arrows.',16,'#303d35',a.w-140);
   const cycle=dir=>{const current=options.findIndex(o=>o.id===answer[kind]),i=current<0?(dir>0?0:options.length-1):(current+dir+options.length)%options.length;selectAlibiAnswer(q.id,kind,options[i].id);this.notice='';this.refresh();};
   d.button(a.x+a.w-98,y+25,'<',()=>cycle(-1),!locked);d.button(a.x+a.w-48,y+25,'>',()=>cycle(1),!locked);
  };
  row('claimId','CONCLUSION',q.claims,a.y+62);row('evidenceId','SUPPORTING EVIDENCE',q.evidence,a.y+166);
  d.text(a.x,a.y+270,locked?'Supported and recorded.':this.notice||'Select a conclusion and the evidence that establishes it.',14,locked?'#345b3f':'#725a3a',a.w);
  const y=a.bottom-36;
  d.button(a.x,y,'PREVIOUS',()=>{setAlibiStep(step-1);this.notice='';this.refresh();},step>0);
  d.button(a.x+175,y,'CHECK',()=>{const r=checkAlibiAnswer(q.id);this.notice=r.message;u.bodyPage=0;this.refresh();},!locked&&Boolean(answer.claimId&&answer.evidenceId));
  d.button(a.x+a.w-175,y,step===2?'REPORT':'NEXT',()=>{setAlibiStep(Math.min(2,step+1));this.notice='';u.bodyPage=0;this.refresh();},locked&&(step<2||isAlibiReconstructed()));
 }
 renderReports(){
  const u=this.ui,d=u.drawing,s=getAlibiFinale(),locked=Boolean(s.settlement),a=this.frame(locked?'THE BORROWED ALIBI — FINISH SETTLEMENT':'THE BORROWED ALIBI — FINAL REPORT');
  const endings=ALIBI_ENDINGS.filter(e=>e.id!=='silence'||alibiSilenceOfferKnown(gameState));
  endings.forEach((e,i)=>d.button(a.x+i*230,a.y,e.label,()=>{selectAlibiEnding(e.id);this.notice='';u.bodyPage=0;this.refresh();},!locked));
  const p=getAlibiPreview();
  const descriptions={discreet:'Preserve relevant findings; omit unnecessary private explanations.',full:'Include the two personal explanations in the client report.',silence:'Accept the discussed $120 silence payment and withhold the findings. Earlier conversations are not erased.'};
  const text=p?`${p.title}\n\n${p.report}${p.dossier?'\n\nSEPARATE COMPANY DOSSIER\n'+p.dossier:''}\n\nDelivery: ${p.deliveries.join('; ')}\n\nPrivacy: ${p.privacy}`:'Choose a report above.\n\n'+endings.map(e=>e.label+': '+descriptions[e.id]).join('\n\n');
  this.paged(text,a.x,a.y+52,a.w,Math.max(70,a.bottom-a.y-165));
  if(p)d.text(a.x,a.bottom-100,`Contract: $${p.fee} | Silence payment: $${p.bonus} | Total: $${p.total}\nIntegrity: ${p.nominalIntegrity>=0?'+':''}${p.nominalIntegrity} (subject to the existing -100 / +100 limits).`,14,'#514c39',a.w);
  d.text(a.x,a.bottom-60,this.notice||s.settlement?.lastError||'Nothing is sent or paid until you confirm.',13,'#725a3a',a.w);
  d.button(a.x,a.bottom-29,locked?'FINISH SETTLEMENT':'REVIEW & SEND',()=>{const preview=getAlibiPreview();if(preview){this.confirmedPreview=JSON.parse(JSON.stringify(preview));u.bodyPage=0;this.refresh();}},Boolean(p));
 }
 renderConfirmation(){
  const u=this.ui,d=u.drawing,p=this.confirmedPreview,a=this.frame('CONFIRM THIS EXACT REPORT');
  const full=`${p.title}\n\nTO: ${p.deliveries.join('; ')}\n\n${p.report}${p.dossier?'\n\nSEPARATE COMPANY DOSSIER\n'+p.dossier:''}`;
  this.paged(full,a.x,a.y,a.w,Math.max(70,a.bottom-a.y-135));
  d.text(a.x,a.bottom-116,`Contract $${p.fee} + silence payment $${p.bonus} = $${p.total}.\nIntegrity ${p.nominalIntegrity>=0?'+':''}${p.nominalIntegrity}, clamped by the reputation system.\nThis closes the quest. A referral is not a conviction.`,14,'#514c39',a.w);
  reportCompletionButton(u,a.x,a.bottom-29,'SEND & CLOSE',()=>{
   if(this.confirmedPreview!==p)return false;
   const completedBefore=getAlibiFinale().settlement?.phase==='completed';
   const result=finishAlibiReport(p.endingId,alibiPreviewToken(p));this.confirmedPreview=null;this.notice=result.message;u.notice=result.message;
   const newlyCompleted=result.ok&&!completedBefore&&getAlibiFinale().settlement?.phase==='completed';
   if(result.ok){this.opened=false;u.selectedId=REPLY;u.listPage=0;}u.bodyPage=0;this.refresh();return Boolean(newlyCompleted);
  });
  d.button(a.x+a.w-120,a.bottom-29,'CANCEL',()=>{this.confirmedPreview=null;u.bodyPage=0;this.refresh();});
 }
}
