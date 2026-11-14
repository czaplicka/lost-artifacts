import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getReedContactService, getReedContactRecord, ownedMobileLine, REED_CONTACT_CHANGED } from '../../managers/ReedContactService.js';
import { REED_MAIL_VARIANTS, buildReedMailBody } from '../../managers/ReedMailContent.js';
import { ReedReportUI } from './ReedReportUI.js';

const REED_MESSAGE_ID='reed_claire_outgoing',DRAFT_KEY='reedMailDraft',OUTGOING_KEY='piKeywordOutgoingMail';
const GENERIC_VARIANTS=[
 {id:'formal',label:'FORMAL',body:'Hello,\n\nI am a private investigator following up on an enquiry. I would appreciate an opportunity to ask you a few questions. Please reply when convenient.\n\nKind regards,\n'},
 {id:'discreet',label:'DISCREET',body:'Hello,\n\nI would like to speak with you about a private enquiry. I would prefer not to discuss the details in an unsolicited message. Please let me know whether you are willing to talk.\n\nThank you,\n'},
 {id:'direct',label:'DIRECT',body:'Hello,\n\nI am investigating a matter that may involve you. Can you contact me so I can ask a few questions?\n\nRegards,\n'}
];
function extractEmail(value){
 if(typeof value!=='string')return '';
 const match=value.match(/[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+/);
 return match?.[0]||'';
}
function normalizeEmail(value){return String(value||'').trim().toLowerCase();}

export class ReedContactMail{
 constructor(ui){
  Object.assign(this,{ui,dead:false,composing:false,sending:false,restorers:[]});
  this.service=getReedContactService(ui.scene.game);
  this.onChange=()=>this.refresh();
  EventBus.on(REED_CONTACT_CHANGED,this.onChange,null,this);
  this.installMailList();this.installComposer();this.installFieldNotes();
  this.reportUI=new ReedReportUI(ui);
  void this.loadReedService().catch(error=>console.error('[ReedContactMail] Contact load failed:',error));
 }
 wrap(target,method,factory){
  if(typeof target?.[method]!=='function')return;
  const original=target[method],replacement=factory(original.bind(target));
  target[method]=replacement;
  this.restorers.push(()=>{if(target[method]===replacement)target[method]=original;});
 }
 installMailList(){
  this.wrap(this.ui.documents,'getMail',original=>(...args)=>{
   const outgoing=this.getOutgoingMessages();
   const managedIds=new Set([REED_MESSAGE_ID,...outgoing.map(message=>message.id)]);
   const items=original(...args).filter(message=>!managedIds.has(message.id));
   const config=this.service.data,sent=getReedContactRecord(),reedMessages=[];
   if(config&&sent&&gameState.piQuests?.quests?.[config.questId])reedMessages.push({
    id:REED_MESSAGE_ID,from:`You → ${sent.to||config.email}`,subject:`Sent: ${config.subject}`,
    date:this.formatReedDate(sent.sentAt),body:sent.body
   });
   return [...outgoing.slice().reverse(),...reedMessages,...items];
  });
 }
 installComposer(){
  const ui=this.ui;
  this.wrap(ui.documents,'render',original=>(...args)=>{
   if(!this.dead&&ui.app==='mail'&&this.composing){this.renderComposer();return;}
   const result=original(...args);
   if(!this.dead&&ui.app==='mail'&&ui.window){
    // Keep the entire action button left of the title-bar controls.
    ui.drawing.button(ui.window.x+ui.window.w-300,ui.window.y+6,'NEW MAIL',()=>void this.openComposer());
   }
   return result;
  });
 }
 installFieldNotes(){
  const ui=this.ui;
  this.wrap(ui.search,'selectKeyword',original=>keywordId=>{
   if(!this.dead&&ui.app==='mail'&&this.composing){this.selectRecipient(keywordId);return;}
   return original(keywordId);
  });
  this.wrap(ui.search,'refresh',original=>(...args)=>{
   if(!this.dead&&ui.app==='mail'&&this.composing){this.refresh();return;}
   return original(...args);
  });
  this.wrap(ui.monitor,'render',original=>(...args)=>{
   const result=original(...args);
   if(this.isLive()&&this.composing&&!ui.booting&&ui.search.data){ui.search.renderNotebook();ui.pin?.();}
   return result;
  });
 }
 isLive(){const ui=this.ui;return Boolean(!this.dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='mail');}
 refresh(){if(this.isLive())this.ui.render();}
 async loadReedService(){return this.service.load();}
 formatReedDate(value){
  const minutes=Number.isFinite(value)?value:0,day=Math.floor(minutes/1440)+1;
  const hour=String(Math.floor((minutes%1440)/60)).padStart(2,'0'),minute=String(minutes%60).padStart(2,'0');
  return `Day ${day}, ${hour}:${minute}`;
 }
 available(){const config=this.service.data;return Boolean(config?.questId&&gameState.piQuests?.quests?.[config.questId]?.status==='active');}
 knownAddress(){
  const config=this.service.data;if(!config)return false;
  const known=gameState.piKeywordSearch?.cases?.[config.searchCaseId]?.known||[];
  return known.includes(config.requiredKeyword);
 }
 hasReedRecipient(){
  const config=this.service.data;
  return Boolean(config?.email&&this.available()&&this.knownAddress()&&normalizeEmail(this.draft.to)===normalizeEmail(config.email));
 }
 get draft(){return gameState[DRAFT_KEY]||{version:1,to:'',caseId:null,keywordId:null,variantId:null,route:null};}
 updateDraft(patch){if(this.dead)return;gameState[DRAFT_KEY]={...this.draft,...patch,version:1};requestAutosave();}
 getRecipients(){
  const recipients=[],definitions=this.ui.search.data?.cases||[];
  for(const definition of definitions){
   const known=gameState.piKeywordSearch?.cases?.[definition.id]?.known||[];
   for(const keyword of definition.keywords||[]){
    if(!known.includes(keyword.id))continue;
    const email=extractEmail(keyword.email)||extractEmail(keyword.label)||extractEmail(keyword.value);
    if(email)recipients.push({caseId:definition.id,keywordId:keyword.id,email});
   }
  }
  const config=this.service.data;
  if(config?.email&&this.knownAddress()&&!recipients.some(recipient=>recipient.caseId===config.searchCaseId&&recipient.keywordId===config.requiredKeyword)){
   recipients.push({caseId:config.searchCaseId,keywordId:config.requiredKeyword,email:config.email});
  }
  return recipients;
 }
 hasRecipient(){const email=normalizeEmail(this.draft.to);return Boolean(email&&this.getRecipients().some(recipient=>normalizeEmail(recipient.email)===email));}
 selectRecipient(keywordId){
  if(!this.isLive()||!this.composing)return;
  const currentCaseId=this.ui.search.definition?.id;
  const recipient=this.getRecipients().find(contact=>contact.caseId===currentCaseId&&contact.keywordId===keywordId);
  if(!recipient){this.ui.notice='Select a discovered email address from FIELD NOTES.';this.refresh();return;}
  this.updateDraft({to:recipient.email,caseId:recipient.caseId,keywordId:recipient.keywordId,variantId:null,route:null});
  this.ui.bodyPage=0;this.ui.notice='';this.refresh();
 }
 officeNumber(){
  const directory=this.ui.scene.cache.json.get('piPhoneDirectory')||{};
  return directory.contacts?.find(contact=>contact.id===directory.ownContactId)?.number||'';
 }
 replyNumber(){
  if(this.draft.route==='mobile')return ownedMobileLine()?.number||'';
  if(this.draft.route==='office')return this.officeNumber();
  return '';
 }
 isCurrentComposer(token){return Boolean(this.isLive()&&this.composing&&this.ui.viewToken===token);}
 async openComposer(){
  if(!this.isLive())return;
  const ui=this.ui,token=++ui.viewToken;ui.notice='';
  this.updateDraft({to:'',caseId:null,keywordId:null,variantId:null,route:null});
  this.composing=true;ui.selectedId=null;ui.bodyPage=0;ui.search.notesOpen=true;this.refresh();
  const results=await Promise.allSettled([this.loadReedService(),ui.search.load()]);
  if(!this.isCurrentComposer(token))return;
  for(const result of results)if(result.status==='rejected')console.error('[ReedContactMail] Could not load mail data:',result.reason);
  if(!ui.search.data)ui.notice='Field notes could not be loaded. Close this message and try again.';
  this.refresh();
 }
 closeComposer(){this.composing=false;this.ui.bodyPage=0;this.ui.selectedId=null;this.refresh();}
 getVariants(){return this.hasReedRecipient()?REED_MAIL_VARIANTS:GENERIC_VARIANTS;}
 chooseVariant(variantId){
  if(!this.isLive()||!this.composing||!this.hasRecipient()||!this.getVariants().some(variant=>variant.id===variantId))return;
  this.updateDraft({variantId});this.ui.bodyPage=0;this.refresh();
 }
 chooseReplyRoute(route){
  if(!this.isLive()||!this.composing||!this.hasReedRecipient()||!['office','mobile'].includes(route))return;
  this.updateDraft({route});this.ui.bodyPage=0;this.refresh();
 }
 getMessageBody(){
  const detective=String(gameState.playerName||'Detective');
  if(this.hasReedRecipient())return buildReedMailBody(this.draft.variantId,this.replyNumber()||'[reply number]',detective);
  const variant=GENERIC_VARIANTS.find(item=>item.id===this.draft.variantId);
  return variant?variant.body+detective:'';
 }
 canSend(){
  if(this.sending||!this.hasRecipient()||!this.getVariants().some(variant=>variant.id===this.draft.variantId))return false;
  if(this.hasReedRecipient())return Boolean(this.service.canSend()&&this.replyNumber());
  return true;
 }
 getOutgoingMessages(){const messages=gameState[OUTGOING_KEY]?.messages;return Array.isArray(messages)?messages.filter(message=>message?.id):[];}
 saveGenericMessage(){
  const previous=this.getOutgoingMessages(),oldSequence=Number(gameState[OUTGOING_KEY]?.sequence);
  let sequence=Math.max(Number.isSafeInteger(oldSequence)?oldSequence:0,previous.length)+1;
  const existingIds=new Set(previous.map(message=>message.id));
  while(existingIds.has(`pi_keyword_mail_${sequence}`))sequence++;
  const message={id:`pi_keyword_mail_${sequence}`,from:`You → ${this.draft.to}`,to:this.draft.to,subject:'Sent: Private enquiry',date:'Sent',body:this.getMessageBody(),caseId:this.draft.caseId||null,keywordId:this.draft.keywordId||null};
  gameState[OUTGOING_KEY]={version:1,sequence,messages:[...previous,message]};return message.id;
 }
 send(){
  if(!this.isLive()||!this.composing||!this.canSend())return;
  this.sending=true;
  try{
   let selectedId;
   if(this.hasReedRecipient()){
    const result=this.service.send(this.draft.route,this.officeNumber(),{to:this.draft.to,variantId:this.draft.variantId});
    this.ui.notice=result.message;if(!result.ok)return;selectedId=REED_MESSAGE_ID;
   }else{selectedId=this.saveGenericMessage();this.ui.notice='Message sent. A reply is not guaranteed.';}
   this.composing=false;gameState[DRAFT_KEY]=null;requestAutosave();
   this.ui.selectedId=selectedId;this.ui.bodyPage=0;this.ui.listPage=0;
  }catch(error){console.error('[ReedContactMail] Send failed:',error);this.ui.notice='The message could not be sent. Please try again.';}
  finally{this.sending=false;this.refresh();}
 }
 renderComposer(){
  if(this.dead||!this.composing)return;
  const ui=this.ui,drawing=ui.drawing,bounds=ui.window;if(!bounds)return;
  const x=bounds.x+14,y=bounds.y+47,width=bounds.w-28,bottom=bounds.y+bounds.h-43;
  drawing.rectangle(x,y,width,bottom-y,0xf2ecd6);
  drawing.pixel(x+14,y+10,'NEW MESSAGE',11,'#303b32');
  drawing.button(x+width-102,y+1,'BACK',()=>this.closeComposer());
  drawing.text(x+14,y+45,'TO:',15,'#303b32');
  drawing.bevel(x+60,y+36,width-76,31,0xffffff,true);
  const hasRecipient=this.hasRecipient(),address=drawing.text(x+70,y+44,'',15,'#303b32');
  drawing.fit(address,hasRecipient?this.draft.to:'',Math.max(20,width-90));
  if(!hasRecipient){
   drawing.text(x+14,y+76,'Select an email address from FIELD NOTES.\nUse the case tabs to find addresses from other enquiries.',13,'#6f6a53',width-28);
   drawing.button(x+width-102,bottom-56,'SEND',()=>this.send(),false);return;
  }
  this.renderReedMessage({x,y,width,bottom});
 }
 renderReedMessage({x,y,width,bottom}){
  const ui=this.ui,drawing=ui.drawing,isReed=this.hasReedRecipient(),step=Math.min(155,Math.floor((width-28)/3));
  this.getVariants().forEach((variant,index)=>{
   const selected=this.draft.variantId===variant.id;
   drawing.button(x+14+index*step,y+103,(selected?'• ':'')+variant.label,()=>this.chooseVariant(variant.id));
  });
  const bodyY=y+151,controlsY=bottom-65,body=this.getMessageBody();
  if(body)ui.documents.renderPagedText(body,x+14,bodyY,width-28,Math.max(46,controlsY-bodyY-24));
  else drawing.text(x+14,bodyY,'Select a message.',16,'#77715c');
  if(isReed){
   drawing.text(x+14,controlsY-13,'Reply telephone:',13,'#303b32');
   drawing.button(x+14,controlsY+9,(this.draft.route==='office'?'• ':'')+'OFFICE',()=>this.chooseReplyRoute('office'),Boolean(this.officeNumber()));
   drawing.button(x+155,controlsY+9,(this.draft.route==='mobile'?'• ':'')+'MOBILE',()=>this.chooseReplyRoute('mobile'),Boolean(ownedMobileLine()));
   drawing.text(x+305,controlsY+18,this.replyNumber(),14,'#575c4c');
  }else drawing.text(x+14,controlsY-13,'A reply is not guaranteed. Silence is not an alibi.',13,'#575c4c',Math.max(60,width-140));
  drawing.button(x+width-102,controlsY+9,'SEND',()=>this.send(),Boolean(this.canSend()));
 }
 destroy(){
  if(this.dead)return;this.dead=true;this.composing=false;
  this.reportUI.destroy();EventBus.clearScope(this);
  for(const restore of this.restorers.reverse())restore();
  this.restorers.length=0;
 }
}
