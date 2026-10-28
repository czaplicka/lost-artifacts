import { gameState } from '../../GameData.js';
import {
 ALIBI_QUEST_ID,ALIBI_QUESTIONS,ALIBI_ENDINGS,getAlibiFinale,getAlibiMissing,
 isAlibiReady,isAlibiReconstructed,setAlibiStep,selectAlibiAnswer,checkAlibiAnswer,
 selectAlibiEnding,getAlibiPreview,alibiPreviewToken,finishAlibiReport
} from '../../managers/AlibiResolutionService.js';
const DRAFT='alibi_final_report_draft',SENT='alibi_final_report_sent',REPLY='alibi_final_report_reply',OFFER='alibi_club_silence_offer';
const IDS=new Set([DRAFT,SENT,REPLY,OFFER]);
export class AlibiReportUI{
 constructor(ui){this.ui=ui;this.confirmedPreview=null;this.notice='';this.install();}
 refresh(){const u=this.ui;if(u.isOpen&&!u.suspended&&!u.destroyed&&u.app==='mail')u.render();}
 mail(items){
  const normal=items.filter(m=>!IDS.has(m.id)),q=gameState.piQuests?.quests?.[ALIBI_QUEST_ID],s=getAlibiFinale();
  if(!q)return normal;
  if(s.settlement?.phase==='completed'){
   const p=s.settlement.preview;
   return[{id:REPLY,from:'Arthur Finch',subject:'Re: The Borrowed Alibi — case closed',date:'Case correspondence',body:p.reply},
    {id:SENT,from:'You → '+p.deliveries.join('; '),subject:'Sent: The Borrowed Alibi — final report',date:'Case closed',body:p.report+(p.dossier?'\n\nREFERRAL DOSSIER\n'+p.dossier:'')},...normal];
  }
  const flags=gameState.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
  if(q.status!=='active'&&!s.settlement)return normal;
  if(!flags.includes('club_sample_received')&&!s.settlement)return normal;
  const result=[{id:DRAFT,from:'Your case file',subject:'Case review — The Borrowed Alibi',date:s.settlement?'Settlement pending':'Reconstruction / final report',body:'Review the evidence, reconstruct the case and choose a report.'}];
  if(isAlibiReady()||s.settlement)result.push({id:OFFER,from:'Tuesday Alibi Club — Membership',subject:'A private customer-feedback arrangement',date:'Follow-up to your sample request',body:'Dear prospective customer,\n\nFollowing your demonstration request, we can offer $120 for keeping our package and any findings about its use out of further reports. Send your client an inconclusive account instead.\n\nThis is a payment for silence, not a purchase refund. If you accept, your own contract fee is separate. The offer cannot erase anything you have already told other people.\n\nNo money will be transferred unless you explicitly accept this arrangement in your final report.\n\nTuesday Alibi Club'});
  return[...result,...normal];
 }
 install(){
  const u=this.ui,docs=u.documents,mail=docs.getMail.bind(docs);docs.getMail=()=>this.mail(mail());
  this.paged=docs.renderPagedText.bind(docs);
  const render=docs.render.bind(docs);
  docs.render=()=>{
   if(u.app==='mail'){
    const items=docs.getMail(),per=Math.max(1,Math.floor((u.window.h-150)/64));
    const pages=Math.max(1,Math.ceil(items.length/per));
    u.listPage=Math.max(0,Math.min(u.listPage||0,pages-1));
    const visible=items.slice(u.listPage*per,(u.listPage+1)*per);
    const selected=visible.find(m=>m.id===u.selectedId)||visible[0];
    if(selected?.id===DRAFT){u.selectedId=DRAFT;this.render();return;}
   }
   render();
  };
 }
 back(){
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
  const missing=getAlibiMissing();
  if(missing.length){const a=this.frame('THE BORROWED ALIBI — CASE REVIEW');this.paged('Before reconstruction:\n\n'+missing.map(t=>'• '+t).join('\n\n')+'\n\nFinish each phone response through RETURN TO NOTES. Collect highlighted clues manually.',a.x,a.y,a.w,Math.max(80,a.bottom-a.y-10));return;}
  this.renderReconstruction();
 }
 renderReconstruction(){
  const u=this.ui,d=u.drawing,s=getAlibiFinale(),step=Math.max(0,Math.min(2,s.draft.step)),q=ALIBI_QUESTIONS[step],answer=s.draft.selections[q.id]||{},locked=s.draft.checked.includes(q.id);
  const a=this.frame(`RECONSTRUCTION ${step+1} / ${ALIBI_QUESTIONS.length}`);
  d.text(a.x,a.y,q.question,19,'#303d35',a.w);
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
  ALIBI_ENDINGS.forEach((e,i)=>d.button(a.x+i*230,a.y,e.label,()=>{selectAlibiEnding(e.id);this.notice='';u.bodyPage=0;this.refresh();},!locked));
  const p=getAlibiPreview();
  const text=p?`${p.title}\n\n${p.report}${p.dossier?'\n\nSEPARATE COMPANY DOSSIER\n'+p.dossier:''}\n\nDelivery: ${p.deliveries.join('; ')}\n\nPrivacy: ${p.privacy}`:'Choose a report above.\n\nRELEVANT FACTS: preserve the relevant findings, omit unnecessary private explanations.\n\nFULL DISCLOSURE: include the two embarrassing personal explanations in the client report.\n\nTAKE THE OFFER: accept $120 for silence and withhold the findings. This does not erase earlier conversations.';
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
  d.button(a.x,a.bottom-29,'SEND & CLOSE',()=>{
   const result=finishAlibiReport(p.endingId,alibiPreviewToken(p));this.confirmedPreview=null;this.notice=result.message;u.notice=result.message;
   if(result.ok){u.selectedId=REPLY;u.listPage=0;}u.bodyPage=0;this.refresh();
  });
  d.button(a.x+a.w-120,a.bottom-29,'CANCEL',()=>{this.confirmedPreview=null;u.bodyPage=0;this.refresh();});
 }
}
