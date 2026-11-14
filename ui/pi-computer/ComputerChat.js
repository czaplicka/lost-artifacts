import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { thiefdokuService,installThiefdokuIntegration } from '../../systems/thiefdoku/ThiefdokuService.js';
import { CONTACTS,PROPOSAL,NORMAL_REPLIES,normalise,chiefReply,normalReply } from './ComputerChatContent.js';
import { computerUiCanInteract,playComputerUiClick } from './ComputerUiAudio.js';
import { prepareComputerChatAudio,playComputerChatKey } from './ComputerChatAudio.js';
const KEY='piChat';
function readState(){
 const saved=gameState[KEY]||{};
 return{version:1,selected:'commandant',contacts:{},unread:{},...saved,contacts:saved.contacts||{},unread:saved.unread||{}};
}
function saveState(state){gameState[KEY]=state;requestAutosave();}
function conversationFor(state,id){
 if(!state.contacts[id])state.contacts[id]={messages:[],asked:[],facts:[]};
 const conversation=state.contacts[id];conversation.messages||=[];conversation.asked||=[];conversation.facts||=[];return conversation;
}
function ensureProposal(state){
 if(state.thiefdokuProposalVersion===1)return;
 const conversation=conversationFor(state,'commandant');
 conversation.messages.push({from:__dialogueText("ui/pi-computer/ComputerChat.js", "t_4f59fed9897dd6d2e4a2"),text:thiefdokuService.isInstalled()?__dialogueText("ui/pi-computer/ComputerChat.js", "t_fe05523f9704f6566f9c")+__dialogueText("ui/pi-computer/ComputerChat.js", "t_f6ed2453cfe75207bd87"):PROPOSAL,at:Date.now()});
 state.thiefdokuProposalVersion=1;state.unread.commandant=(state.unread.commandant||0)+1;saveState(state);
}
export class ComputerChat{
 constructor(ui){
  this.ui=ui;this.input='';this.page=0;this.followLatest=true;this.dead=false;
  prepareComputerChatAudio(ui.scene);this.integration=installThiefdokuIntegration(ui);
  this.onKeyDown=event=>this.handleKeyDown(event);ui.scene.input.keyboard?.on('keydown',this.onKeyDown);
 }
 live(){const ui=this.ui;return !this.dead&&computerUiCanInteract(ui)&&!ui.booting&&ui.app==='chat'&&(!ui.shell?.focusedApp||ui.shell.focusedApp==='chat');}
 destroy(){this.dead=true;this.ui.scene.input.keyboard?.off('keydown',this.onKeyDown);this.integration?.destroy();}
 redraw(){if(!this.ui.destroyed&&this.ui.isOpen&&!this.ui.suspended)this.ui.render();}
 handleKeyDown(event){
  const ui=this.ui,tag=event.target?.tagName;
  if(!this.live()||event.defaultPrevented||event.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(tag))return;
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.key===__dialogueText("ui/pi-computer/ComputerChat.js", "t_dc8659db6d416dc32fca")){event.preventDefault();this.send();return;}
  if(event.key===__dialogueText("ui/pi-computer/ComputerChat.js", "t_292fffe328d07afdaba6")){
   event.preventDefault();if(!this.input)return;this.input=this.input.slice(0,-1);playComputerChatKey(ui);this.redraw();return;
  }
  if(event.key?.length===1&&!event.repeat&&this.input.length<180){this.input+=event.key;playComputerChatKey(ui);this.redraw();}
 }
 send(text=this.input){
  if(!this.live())return;
  const value=String(text||'').trim().slice(0,180);if(!value)return;
  const state=readState();ensureProposal(state);
  const contact=CONTACTS.find(item=>item.id===state.selected)||CONTACTS[0],conversation=conversationFor(state,contact.id);
  const answer=contact.id==='commandant'?chiefReply(value):normalReply(contact,value,conversation);
  conversation.messages.push({from:__dialogueText("ui/pi-computer/ComputerChat.js", "t_bb0347a468d97e98a9c0"),text:value,at:Date.now()},{from:contact.id,text:answer,at:Date.now()});
  if(/where|alibi|last night|that night|yesterday/.test(normalise(value))&&!conversation.asked.includes('alibi'))conversation.asked.push('alibi');
  state.unread[contact.id]=0;saveState(state);this.input='';this.followLatest=true;
  playComputerUiClick(this.ui);this.redraw();
 }
 button(x,y,w,h,label,callback,enabled=true,sound=true){
  const d=this.ui.drawing;
  d.rectangle(x,y,w,h,enabled?0xd7dfcc:0xb9b9ad);d.frame(x,y,w,h,0x52636a,1,1);
  d.text(x+w/2,y+6,label,12,enabled?'#24343a':'#747870',w-12).setOrigin(0.5,0);
  if(!enabled)return;
  const token=this.ui.viewToken,hit=d.rectangle(x,y,w,h,0x000000,0).setInteractive({useHandCursor:true});
  hit.on('pointerdown',()=>{
   if(!this.live()||this.ui.viewToken!==token||hit.active===false||!hit.scene)return;
   if(sound)playComputerUiClick(this.ui);callback();
  });
 }
 selectContact(id){
  if(!this.live()||!CONTACTS.some(c=>c.id===id))return;
  const state=readState(),changed=state.selected!==id||this.input.length>0;
  state.selected=id;state.unread[id]=0;saveState(state);this.input='';this.followLatest=true;
  if(changed)playComputerUiClick(this.ui);this.redraw();
 }
 repliesFor(contact){
  if(contact.id!=='commandant')return NORMAL_REPLIES;
  if(!thiefdokuService.isInstalled())return[[__dialogueText("ui/pi-computer/ComputerChat.js", "t_c3f15799af503a465b85"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_da21ccabb31dcf3d9ea4")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_9175a148da2aa88058f3"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_5d7e13324bc417db89d0")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_7991fb97920105ebad05"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_454ef869e496507c4d80")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_80495816f7f221579a47"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_0f25fa68a636681ce51a")]];
  return[[__dialogueText("ui/pi-computer/ComputerChat.js", "t_2e45f9ce80a62664b17f"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_a5550b15ed564303dbf5")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_291abbacc57de3b48c61"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_070ed736ab565f9c06e3")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_953c1c362bb4c3524b34"),__dialogueText("ui/pi-computer/ComputerChat.js", "t_da21ccabb31dcf3d9ea4")],[__dialogueText("ui/pi-computer/ComputerChat.js", "t_5115527789198abdde52"),null]];
 }
 paginate(messages,width,height){
  const pages=[];let page=[],used=0;
  const probe=this.ui.scene.add.text(-10000,-10000,'',{fontFamily:'Special Elite',fontSize:'14px',lineSpacing:3,wordWrap:{width}});
  const lineHeight=19,maxLines=Math.max(1,Math.floor((height-22)/lineHeight)),chunks=[];
  for(const message of messages){
   const lines=probe.getWrappedText(message.text);
   for(let i=0;i<lines.length;i+=maxLines){const text=lines.slice(i,i+maxLines).join('\n');probe.setText(text);chunks.push({...message,text,height:Math.max(36,Math.ceil(probe.height)+18)});}
  }
  probe.destroy();
  for(const chunk of chunks){if(page.length&&used+chunk.height+8>height){pages.push(page);page=[];used=0;}page.push(chunk);used+=chunk.height+8;}
  if(page.length)pages.push(page);return pages.length?pages:[[]];
 }
 render(){
  const ui=this.ui;if(!ui.window||ui.destroyed)return;
  const d=ui.drawing,box=ui.window,x=box.x+10,y=box.y+44,w=box.w-20,h=box.h-88;
  if(w<650||h<340){d.text(x+16,y+16,__dialogueText("ui/pi-computer/ComputerChat.js", "t_26a19495fb4cfcecc6c7"),15,'#273238',w-32);return;}
  const state=readState();ensureProposal(state);
  const selected=CONTACTS.find(contact=>contact.id===state.selected)||CONTACTS[0];
  if(state.unread[selected.id]){state.unread[selected.id]=0;saveState(state);}
  const sidebarW=205,px=x+sidebarW+12,pw=w-sidebarW-12;
  d.rectangle(x,y,sidebarW,h,0x26394a);d.pixel(x+12,y+12,'CONTACTS',9,'#e8d9b4');
  const token=ui.viewToken;
  CONTACTS.forEach((contact,index)=>{
   const cy=y+37+index*59,active=contact.id===selected.id,unread=state.unread[contact.id]||0;
   d.rectangle(x+6,cy,sidebarW-12,53,active?0x526a70:0x344b5b);d.rectangle(x+13,cy+9,32,32,0xb7bea3);
   d.pixel(x+18,cy+21,contact.initials,8,'#17232b');
   d.text(x+54,cy+8,contact.name,12,'#f2e9d5',sidebarW-66);
   d.text(x+54,cy+29,contact.role+(unread?` (${unread})`:''),10,'#c2ceca',sidebarW-66);
   const hit=d.rectangle(x+6,cy,sidebarW-12,53,0x000000,0).setInteractive({useHandCursor:true});
   hit.on('pointerdown',()=>{if(hit.active!==false&&hit.scene&&ui.viewToken===token)this.selectContact(contact.id);});
  });
  d.rectangle(px,y,pw,h,0xd8d3c2);d.rectangle(px,y,pw,38,0x425b66);
  const header=d.text(px+12,y+11,selected.name,14,'#fff0cf',pw-100);
  if(selected.id==='commandant'){
   const barX=Math.min(px+16+header.width,px+pw-78),bar=d.rectangle(barX,y+11,62,15,0x111111).setInteractive({useHandCursor:true});
   bar.on('pointerdown',()=>{if(bar.active!==false&&bar.scene&&ui.viewToken===token)this.send(__dialogueText("ui/pi-computer/ComputerChat.js", "t_9b0ea877b05258c7a9ef"));});
  }
  const inputY=y+h-104,pagerY=inputY-30,messageTop=y+49,messageH=Math.max(80,pagerY-messageTop-8);
  const conversation=conversationFor(state,selected.id),messages=conversation.messages.length?conversation.messages:[{from:selected.id,text:selected.intro,at:0}];
  const bubbleW=Math.min(450,pw-24),pages=this.paginate(messages,bubbleW-20,messageH);
  if(this.followLatest)this.page=pages.length-1;
  this.page=Math.max(0,Math.min(this.page,pages.length-1));let yy=messageTop;
  for(const message of pages[this.page]){
   const own=message.from==='you',bx=own?px+pw-bubbleW-12:px+12;
   d.rectangle(bx,yy,bubbleW,message.height,own?0xb8c9b2:0xf2ecda);
   d.text(bx+10,yy+8,message.text,14,'#273238',bubbleW-20).setLineSpacing(3);yy+=message.height+8;
  }
  this.button(px+12,pagerY,66,24,'PREV',()=>{this.followLatest=false;this.page--;this.redraw();},this.page>0);
  d.text(px+pw/2,pagerY+6,`${this.page+1} / ${pages.length}`,11,'#53615d').setOrigin(0.5,0);
  this.button(px+pw-78,pagerY,66,24,'NEXT',()=>{this.followLatest=false;this.page++;this.redraw();},this.page<pages.length-1);
  d.rectangle(px+12,inputY,pw-98,31,0xf4f0e4);d.frame(px+12,inputY,pw-98,31,0x66777b,1,1);
  d.text(px+20,inputY+8,this.input.slice(-65)||__dialogueText("ui/pi-computer/ComputerChat.js", "t_69518e684f065f0c39a2"),12,this.input?'#263238':'#85877f',pw-122);
  this.button(px+pw-78,inputY,66,31,'SEND',()=>this.send(),true,false);
  const gap=8,replyW=Math.floor((pw-24-gap)/2);
  this.repliesFor(selected).forEach(([label,text],index)=>{
   const col=index%2,row=Math.floor(index/2);
   this.button(px+12+col*(replyW+gap),inputY+39+row*29,replyW,25,label,()=>{
    if(text===null)ui.openApp('thiefdoku');else this.send(text);
   },true,text===null);
  });
 }
}
