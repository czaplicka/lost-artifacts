import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { margeTrustData as DATA,startMargeTrustFollowup,completeMargeTrustIntro,selectMargeTrustReply,completeMargeTrustResponse,getMargeTrustState,requestMargeInformalRecap } from '../../margeTrustService.js';
import { beginMargeTrust,acknowledgeMargeTrustIntro,chooseMargeTrustReply,acknowledgeMargeTrustResponse,margeTrustAccess,getMargeTrustPreviewSource } from '../../margeTrustModel.js';
export class MargeTrustController{
 constructor(scene,data={}){
  this.scene=scene;this.local=null;this.previewCase=scene.preview?data.previewMargeFollowup??null:null;this.lastSaved=true;
  if(this.previewCase){
   getMargeTrustPreviewSource(this.previewCase);
   scene.previewGiftGiven=true;scene.previewHelpCompleted=true;
   if(scene.local)scene.local.completed=true;
  }
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
   if(action==='start')result=startMargeTrustFollowup();
   else if(action==='intro')result=completeMargeTrustIntro();
   else if(action==='reply')result=selectMargeTrustReply(id);
   else result=completeMargeTrustResponse();
  }
  if(result.ok){this.lastSaved=result.saved!==false;if(!this.lastSaved)this.scene.showStatus(DATA.messages.saveFailed);}
  return result;
 }
 handleTalk(){
  if(this.scene.preview&&!this.previewCase)return false;
  try{
   const result=this.apply('start');if(!result.ok)return false;
   this.resume();return true;
  }catch(error){console.error('[Marge trust] Follow-up unavailable:',error);this.scene.showStatus(DATA.messages.retry);return false;}
 }
 safely(callback){try{callback();}catch(error){console.error('[Marge trust] Conversation action failed:',error);this.scene.showStatus(DATA.messages.retry);}}
 panel(title,full=true){
  const s=this.scene,root=s.add.container(0,0);s.modal=root;s.root.add(root);s.root.bringToTop(root);s.makeShield(root);
  root.add(s.add.rectangle(960,full?540:875,full?1510:1840,full?900:350,full?0xe9daba:0x0e1d15,.99).setStrokeStyle(3,0xd7ad62));
  if(full)s.modalText(root,960,180,title,31,'#714f2e',1370);
  s.tooltip?.setVisible(false);s.refreshScene();return root;
 }
 button(parent,y,label,callback,width=1310){
  const s=this.scene,rectangle=s.add.rectangle(960,y,width,94,0x243a2d).setStrokeStyle(2,0x8b6842).setInteractive({useHandCursor:true});parent.add(rectangle);
  s.modalText(parent,960,y,label,25,'#ffe3a3',width-50);
  rectangle.on('pointerover',()=>rectangle.setFillStyle(0x38553f));rectangle.on('pointerout',()=>rectangle.setFillStyle(0x243a2d));
  rectangle.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(s.modal===parent&&!s.closing)this.safely(callback);});
 }
 dialogue(lines,onComplete,finalLabel='CONTINUE'){
  const s=this.scene;
  if(s.modal||s.dialogue||s.closing)return;
  const expanded=[];
  for(const line of lines){
   const words=line.text.split(/\s+/);let text='';
   for(const word of words){if(text&&(text+' '+word).length>265){expanded.push({speaker:line.speaker,text});text=word;}else text+=(text?' ':'')+word;}
   if(text)expanded.push({speaker:line.speaker,text});
  }
  if(!expanded.length){onComplete?.();return;}
  const root=this.panel('',false);let index=0;
  const speaker=s.modalText(root,960,770,expanded[0].speaker,28,'#ffce81',1680);
  const body=s.modalText(root,960,872,expanded[0].text,28,'#f3ead7',1640);
  const next=s.modalButton(root,960,1000,expanded.length===1?finalLabel:'CONTINUE',()=>{
   if(s.modal!==root||s.closing)return;
   this.safely(()=>{
    if(index<expanded.length-1){index++;speaker.setText(expanded[index].speaker);body.setText(expanded[index].text);next.setText(index===expanded.length-1?finalLabel:__dialogueText("scenes/hr/MargeTrustController.js", "t_628db0c7598820b10176"));}
    else{s.closeModal();onComplete?.();}
   });
  });
  if(!this.lastSaved)s.showStatus(DATA.messages.saveFailed);
 }
 resume(){
  const state=this.state();if(!state)return;
  if(state.stage==='intro_pending'){
   const c=state.snapshot.cases[state.caseId],intro=[...c.intro];
   if(c.notice)intro.unshift({speaker:c.notice.title,text:`${__dialogueText("scenes/hr/MargeTrustController.js", "t_a981d4a44a43ec090df9")}${c.notice.sender}${__dialogueText("scenes/hr/MargeTrustController.js", "t_c5aee2970d50b2fe70b8")}${c.notice.recipient}${__dialogueText("scenes/hr/MargeTrustController.js", "t_8dccf256f6d5783e62bb")}${c.notice.text}`});
   this.dialogue(intro,()=>{const r=this.apply('intro');if(!r.ok){this.scene.showStatus(DATA.messages.retry);return;}this.resume();},c.requiresReply?__dialogueText("scenes/hr/MargeTrustController.js", "t_426cce10880df57da960"):__dialogueText("scenes/hr/MargeTrustController.js", "t_1cad2a01acc725060cad"));
  }else if(state.stage==='awaiting_reply')this.openReplies();
  else if(state.stage==='response_pending'){
   const response=state.snapshot.responses.find(r=>r.id===state.responseId);
   this.dialogue([{speaker:__dialogueText("scenes/hr/MargeTrustController.js", "t_1e954e77ee4e5253c6c5"),text:response.label},...response.lines],()=>{const r=this.apply('response');if(!r.ok){this.scene.showStatus(DATA.messages.retry);return;}this.scene.showStatus(this.lastSaved?DATA.messages.recorded:DATA.messages.saveFailed);},__dialogueText("scenes/hr/MargeTrustController.js", "t_1cad2a01acc725060cad"));
  }else this.openHub();
 }
 openReplies(){
  const s=this.scene,state=this.state();if(s.modal||s.dialogue||!state)return;
  const root=this.panel(state.snapshot.title);
  s.modalText(root,960,285,DATA.messages.choose,26,'#3c3026',1300);
  s.modalText(root,960,350,__dialogueText("scenes/hr/MargeTrustController.js", "t_bce4b72a585a485dcd44"),23,'#71583c',1300);
  state.snapshot.responses.forEach((reply,index)=>this.button(root,465+index*130,reply.label,()=>{
   const result=this.apply('reply',reply.id);if(!result.ok){s.showStatus(DATA.messages.retry);return;}
   s.closeModal();this.resume();
  }));
  this.button(root,900,__dialogueText("scenes/hr/MargeTrustController.js", "t_095c9dd474d6ca229bb1"),()=>{s.closeModal();s.showStatus(DATA.messages.cancelled);},580);
  if(!this.lastSaved)s.showStatus(DATA.messages.saveFailed);
 }
 openHub(){
  const s=this.scene,state=this.state();if(s.modal||s.dialogue||!state)return;
  const root=this.panel(__dialogueText("scenes/hr/MargeTrustController.js", "t_0b78da0157661296b7b4"));
  s.modalText(root,960,290,state.snapshot.cases[state.caseId].summary,26,'#3c3026',1300);
  if(!this.lastSaved)s.modalText(root,960,365,DATA.messages.saveFailed,22,'#8b2d25',1300);
  this.button(root,470,__dialogueText("scenes/hr/MargeTrustController.js", "t_94a6c3f774112c839473"),()=>{s.closeModal();this.review();});
  this.button(root,595,__dialogueText("scenes/hr/MargeTrustController.js", "t_28cbe632eda4deacff85"),()=>{s.closeModal();s.reviewDisclosure();});
  this.button(root,720,__dialogueText("scenes/hr/MargeTrustController.js", "t_74be0bdf04e8acd0f9d0"),()=>{
   let result;
   if(s.preview){const allowed=margeTrustAccess(state).informalRecapAllowed;result={ok:allowed,lines:allowed?state.snapshot.recap.lines:state.snapshot.recap.denied};}
   else result=requestMargeInformalRecap();
   s.closeModal();this.dialogue(result.lines,()=>this.openHub(),'BACK');
  });
  this.button(root,895,__dialogueText("scenes/hr/MargeTrustController.js", "t_120dba1199e0363fa2ed"),()=>s.closeModal(),580);
 }
 review(){
  const state=this.state(),c=state.snapshot.cases[state.caseId],lines=[];
  if(c.notice)lines.push({speaker:c.notice.title,text:c.notice.text});
  lines.push(...c.intro);
  if(state.responseId){const r=state.snapshot.responses.find(r=>r.id===state.responseId);lines.push({speaker:__dialogueText("scenes/hr/MargeTrustController.js", "t_1e954e77ee4e5253c6c5"),text:r.label},...r.lines);}
  this.dialogue(lines,()=>this.openHub(),'BACK');
 }
}
