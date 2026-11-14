import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
   return[{id:REPLY,from:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_513833eba3a4389aeb86"),subject:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_ecdf3d42a8140a115849"),date:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_9a264749f9d43669aac5"),body:p.reply},
    {id:SENT,from:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_a6cd4a7f9ea8eb99f4a2")+p.deliveries.join(__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_0a2d3f8f9b727cf73e6c")),subject:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_c318182defe4f220a884"),date:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_aa56ad4b2d1623d94be8"),body:p.report+(p.dossier?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_7eec7739424792c110c9")+p.dossier:'')},...normal];
  }
  if(q.status!=='active'&&!s.settlement)return normal;
  const offer=alibiSilenceOfferKnown(gameState)?[{id:OFFER,from:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_e3b7fbadff64acdaace3"),
   subject:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_2660d83bc184539a92c8"),date:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_e6f27a7215450f170c85"),
   body:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_647ef94cfb7b88e4deac")}]:[];
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
   if(u.app==='mail'&&active&&u.window&&!u[Symbol.for(__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_56dd81d3a5ec0a99278e"))]){
    const b=u.window;u.drawing.button(b.x+b.w-(b.w>=600?190:120),b.y+b.h-77,b.w>=600?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_29304bf6838d0fc4a1c1"):'REVIEW',()=>this.open());
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
   const a=this.frame(__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_e6758d352cd7838ae0f4"));
   this.paged(__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_381f867f31b6b8c4740f"),a.x,a.y,a.w,Math.max(80,a.bottom-a.y-10));return;
  }
  this.renderReconstruction();
 }
 renderReconstruction(){
  const u=this.ui,d=u.drawing,s=getAlibiFinale(),step=Math.max(0,Math.min(2,s.draft.step)),q=ALIBI_QUESTIONS[step],answer=s.draft.selections[q.id]||{},locked=s.draft.checked.includes(q.id);
  const a=this.frame(`${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_eccb2dabbea4e5fb6a73")}${step+1}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_005e1574a2b5c8163046")}${ALIBI_QUESTIONS.length}`);d.text(a.x,a.y,q.question,19,'#303d35',a.w);
  const row=(kind,label,options,y)=>{
   d.text(a.x,y,label,13,'#756447',a.w);d.bevel(a.x,y+23,a.w-110,70,0xffffff,true);
   const selected=options.find(o=>o.id===answer[kind]);d.text(a.x+12,y+35,selected?.text||__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_205cb904ff7e3556daa5"),16,'#303d35',a.w-140);
   const cycle=dir=>{const current=options.findIndex(o=>o.id===answer[kind]),i=current<0?(dir>0?0:options.length-1):(current+dir+options.length)%options.length;selectAlibiAnswer(q.id,kind,options[i].id);this.notice='';this.refresh();};
   d.button(a.x+a.w-98,y+25,'<',()=>cycle(-1),!locked);d.button(a.x+a.w-48,y+25,'>',()=>cycle(1),!locked);
  };
  row('claimId','CONCLUSION',q.claims,a.y+62);row('evidenceId',__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_378d38461f81d26f828c"),q.evidence,a.y+166);
  d.text(a.x,a.y+270,locked?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_0644be1700ea6f761e94"):this.notice||__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_37cd198b7856fb3484d6"),14,locked?'#345b3f':'#725a3a',a.w);
  const y=a.bottom-36;
  d.button(a.x,y,'PREVIOUS',()=>{setAlibiStep(step-1);this.notice='';this.refresh();},step>0);
  d.button(a.x+175,y,'CHECK',()=>{const r=checkAlibiAnswer(q.id);this.notice=r.message;u.bodyPage=0;this.refresh();},!locked&&Boolean(answer.claimId&&answer.evidenceId));
  d.button(a.x+a.w-175,y,step===2?'REPORT':'NEXT',()=>{setAlibiStep(Math.min(2,step+1));this.notice='';u.bodyPage=0;this.refresh();},locked&&(step<2||isAlibiReconstructed()));
 }
 renderReports(){
  const u=this.ui,d=u.drawing,s=getAlibiFinale(),locked=Boolean(s.settlement),a=this.frame(locked?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_dee229c45fd61614aaa7"):__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_62bf85b7159195da4d71"));
  const endings=ALIBI_ENDINGS.filter(e=>e.id!=='silence'||alibiSilenceOfferKnown(gameState));
  endings.forEach((e,i)=>d.button(a.x+i*230,a.y,e.label,()=>{selectAlibiEnding(e.id);this.notice='';u.bodyPage=0;this.refresh();},!locked));
  const p=getAlibiPreview();
  const descriptions={discreet:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_e31241494fa9a28726af"),full:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_be7ccb143055ca9a6fd8"),silence:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_70384477e0f8a888f0c0")};
  const text=p?`${p.title}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_75a11da44c802486bc6f")}${p.report}${p.dossier?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_2b07d853cb4f6873d173")+p.dossier:''}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_7b63efc9010a3689943b")}${p.deliveries.join('; ')}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_1e871794ea3313aa063c")}${p.privacy}`:__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_d8d6f7bff581fedaa038")+endings.map(e=>e.label+': '+descriptions[e.id]).join('\n\n');
  this.paged(text,a.x,a.y+52,a.w,Math.max(70,a.bottom-a.y-165));
  if(p)d.text(a.x,a.bottom-100,`${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_723f6d822ee1d710cbe4")}${p.fee}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_41b89a5f576be612a82c")}${p.bonus}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_a4b3fe66f998dabab46e")}${p.total}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_146b748513b8074625c2")}${p.nominalIntegrity>=0?'+':''}${p.nominalIntegrity}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_dc633fbd2a8593445b65")}`,14,'#514c39',a.w);
  d.text(a.x,a.bottom-60,this.notice||s.settlement?.lastError||__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_c57c39953c556f1a9fec"),13,'#725a3a',a.w);
  d.button(a.x,a.bottom-29,locked?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_8f8babf3332e9e96ffcd"):__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_9d949327d5cab0577260"),()=>{const preview=getAlibiPreview();if(preview){this.confirmedPreview=JSON.parse(JSON.stringify(preview));u.bodyPage=0;this.refresh();}},Boolean(p));
 }
 renderConfirmation(){
  const u=this.ui,d=u.drawing,p=this.confirmedPreview,a=this.frame(__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_ade18bad888b89c53b7a"));
  const full=`${p.title}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_e4c7df841bcbce96d287")}${p.deliveries.join('; ')}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_75a11da44c802486bc6f")}${p.report}${p.dossier?__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_2b07d853cb4f6873d173")+p.dossier:''}`;
  this.paged(full,a.x,a.y,a.w,Math.max(70,a.bottom-a.y-135));
  d.text(a.x,a.bottom-116,`${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_37822a7a7007f0f98917")}${p.fee}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_f34e11f4c999c76dd2f1")}${p.bonus}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_6dcb01bbbb7bade44f5b")}${p.total}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_bcc9e94bf13396b1511c")}${p.nominalIntegrity>=0?'+':''}${p.nominalIntegrity}${__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_bf1fc3c3873469651aa9")}`,14,'#514c39',a.w);
  reportCompletionButton(u,a.x,a.bottom-29,__dialogueText("ui/pi-computer/AlibiReportUI.js", "t_6d9d27aa72341952c099"),()=>{
   if(this.confirmedPreview!==p)return false;
   const completedBefore=getAlibiFinale().settlement?.phase==='completed';
   const result=finishAlibiReport(p.endingId,alibiPreviewToken(p));this.confirmedPreview=null;this.notice=result.message;u.notice=result.message;
   const newlyCompleted=result.ok&&!completedBefore&&getAlibiFinale().settlement?.phase==='completed';
   if(result.ok){this.opened=false;u.selectedId=REPLY;u.listPage=0;}u.bodyPage=0;this.refresh();return Boolean(newlyCompleted);
  });
  d.button(a.x+a.w-120,a.bottom-29,'CANCEL',()=>{this.confirmedPreview=null;u.bodyPage=0;this.refresh();});
 }
}
