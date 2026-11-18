import { dialogueText } from '../../dialogues/DialogueText.js';
import { margeTrustData as DATA, startMargeTrustFollowup, completeMargeTrustIntro, selectMargeTrustReply,
 completeMargeTrustResponse, getMargeTrustState, requestMargeInformalRecap } from '../../margeTrustService.js';
import { beginMargeTrust, acknowledgeMargeTrustIntro, chooseMargeTrustReply, acknowledgeMargeTrustResponse,
 margeTrustAccess, getMargeTrustPreviewSource } from '../../margeTrustModel.js';
const T=id=>dialogueText('scenes/hr/MargeTrustController.js',id);
export class MargeTrustController {
 constructor(scene,data={}){
  this.scene=scene;this.local=null;this.previewCase=scene.preview?data.previewMargeFollowup??null:null;this.lastSaved=true;
  if(this.previewCase){getMargeTrustPreviewSource(this.previewCase);scene.previewGiftGiven=true;scene.previewHelpCompleted=true;if(scene.local)scene.local.completed=true;}
 }
 state(){return this.scene.preview?structuredClone(this.local):getMargeTrustState();}
 apply(action,id){
  let result;
  if(this.scene.preview){
   if(action==='start')result=this.previewCase?beginMargeTrust(DATA,this.local,getMargeTrustPreviewSource(this.previewCase),{interviewCompleted:true,helpCompleted:true}):{ok:false,reason:'no_preview'};
   else if(action==='intro')result=acknowledgeMargeTrustIntro(this.local);
   else if(action==='reply')result=chooseMargeTrustReply(this.local,id);
   else result=acknowledgeMargeTrustResponse(this.local);
   if(result.ok){this.local=result.state;result={...result,saved:true};}
  }else{
   if(action==='start')result=startMargeTrustFollowup();else if(action==='intro')result=completeMargeTrustIntro();
   else if(action==='reply')result=selectMargeTrustReply(id);else result=completeMargeTrustResponse();
  }
  if(result.ok){this.lastSaved=result.saved!==false;if(!this.lastSaved)this.scene.showStatus(DATA.messages.saveFailed);}return result;
 }
 handleTalk(){
  if(this.scene.preview&&!this.previewCase)return false;
  try{const result=this.apply('start');if(!result.ok)return false;this.resume();return true;}
  catch(error){console.error('[Marge trust] Follow-up unavailable:',error);this.scene.showStatus(DATA.messages.retry);return false;}
 }
 safely(callback){try{callback();}catch(error){console.error('[Marge trust] Conversation action failed:',error);this.scene.showStatus(DATA.messages.retry);}}
 dialogue(lines,onComplete,finalLabel='CONTINUE'){
  const s=this.scene;if(s.modal||s.dialogue||s.closing)return;
  if(!lines.length){onComplete?.();return;}
  s.openMargeDialogue(lines,{finalLabel,onComplete:()=>this.safely(()=>onComplete?.())});
  if(!this.lastSaved)s.showStatus(DATA.messages.saveFailed);
 }
 resume(){
  const state=this.state();if(!state)return;
  if(state.stage==='intro_pending'){
   const c=state.snapshot.cases[state.caseId],intro=[...c.intro];
   if(c.notice)intro.unshift({speaker:c.notice.title,text:`${T('t_a981d4a44a43ec090df9')}${c.notice.sender}${T('t_c5aee2970d50b2fe70b8')}${c.notice.recipient}${T('t_8dccf256f6d5783e62bb')}${c.notice.text}`});
   this.dialogue(intro,()=>{const r=this.apply('intro');if(!r.ok){this.scene.showStatus(DATA.messages.retry);return;}this.resume();},c.requiresReply?T('t_426cce10880df57da960'):T('t_1cad2a01acc725060cad'));
  }else if(state.stage==='awaiting_reply')this.openReplies();
  else if(state.stage==='response_pending'){
   const response=state.snapshot.responses.find(r=>r.id===state.responseId);
   this.dialogue([{speaker:T('t_1e954e77ee4e5253c6c5'),text:response.label},...response.lines],()=>{
    const r=this.apply('response');if(!r.ok){this.scene.showStatus(DATA.messages.retry);return;}
    this.scene.showStatus(this.lastSaved?DATA.messages.recorded:DATA.messages.saveFailed);
   },T('t_1cad2a01acc725060cad'));
  }else this.openHub();
 }
 openReplies(){
  const s=this.scene,state=this.state();if(s.modal||s.dialogue||!state)return;let root=null;
  root=s.openMargeChoicePanel({text:[state.snapshot.title,DATA.messages.choose,T('t_bce4b72a585a485dcd44')].join('\n\n'),
   topics:state.snapshot.responses.map(reply=>({id:reply.id,label:reply.label,onSelect:()=>{
    if(s.modal!==root||s.closing)return;this.safely(()=>{
     const result=this.apply('reply',reply.id);if(!result.ok){s.showStatus(DATA.messages.retry);return;}
     s.closeModal();this.resume();
    });
   }})),onLeave:()=>{s.closeModal();s.showStatus(DATA.messages.cancelled);}
  });
  if(!this.lastSaved)s.showStatus(DATA.messages.saveFailed);
 }
 openHub(){
  const s=this.scene,state=this.state();if(s.modal||s.dialogue||!state)return;let root=null;
  const run=callback=>()=>{if(s.modal===root&&!s.closing)this.safely(callback);};
  root=s.openMargeChoicePanel({text:[T('t_0b78da0157661296b7b4'),state.snapshot.cases[state.caseId].summary,
   !this.lastSaved?DATA.messages.saveFailed:''].filter(Boolean).join('\n\n'),topics:[
    {id:'review',label:T('t_94a6c3f774112c839473'),onSelect:run(()=>{s.closeModal();this.review();})},
    {id:'disclosure',label:T('t_28cbe632eda4deacff85'),onSelect:run(()=>{s.closeModal();s.reviewDisclosure();})},
    {id:'recap',label:T('t_74be0bdf04e8acd0f9d0'),onSelect:run(()=>{
     let result;
     if(s.preview){const allowed=margeTrustAccess(state).informalRecapAllowed;result={ok:allowed,lines:allowed?state.snapshot.recap.lines:state.snapshot.recap.denied};}
     else result=requestMargeInformalRecap();
     s.closeModal();this.dialogue(result.lines,()=>this.openHub(),'BACK');
    })}
   ],onLeave:()=>s.closeModal()});
 }
 review(){
  const state=this.state(),c=state.snapshot.cases[state.caseId],lines=[];
  if(c.notice)lines.push({speaker:c.notice.title,text:c.notice.text});lines.push(...c.intro);
  if(state.responseId){const r=state.snapshot.responses.find(r=>r.id===state.responseId);lines.push({speaker:T('t_1e954e77ee4e5253c6c5'),text:r.label},...r.lines);}
  this.dialogue(lines,()=>this.openHub(),'BACK');
 }
}
