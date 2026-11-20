import { dialogueText } from '../dialogues/DialogueText.js';
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';
import { johnConfrontationData as DATA, getJohnConfrontation, performJohnConfrontation } from '../johnConfrontationService.js';
import { normalizeConfrontation, confrontationAction } from './pi-office/JohnConfrontationModel.js';
const T=id=>dialogueText('scenes/JohnConfrontationScene.js',id);

class ConfrontationPanel extends LocationDialoguePanel {
 constructor(scene,options){
  super(scene,options);
  this.clearPortrait();
  this.nameText=this.makeText(0,0,'',10,'#ffd86b',true);
  this.bubble=scene.add.graphics();
  this.root.addAt(this.bubble,this.root.getIndex(this.text));
  this.bubbleStyleReady=true;
  this.relayout();
 }
 get playerSpeaking(){return this.speaker.name==='DETECTIVE';}
 renderSpeaker(){
  if(!this.bubbleStyleReady){super.renderSpeaker();return;}
  if(!this.isOpen)return;
  const L=this.layout;
  this.nameText.setText(this.speaker.name||'').setPosition(L.textX,L.panelY+22)
   .setFontSize(L.width<700?8:10).setColor(this.playerSpeaking?'#9fd9a0':'#f0c75e')
   .setWordWrapWidth(L.textWidth,true);
 }
 setSpeaker(speaker={}){
  super.setSpeaker(speaker);
  if(this.bubbleStyleReady&&this.isOpen)this.relayout();
 }
 relayout(){
  if(!this.bubbleStyleReady){super.relayout();return;}
  if(!this.isOpen)return;
  const offset=this.textPages[this.textPage]?.start||0;
  const{width:w,height:h}=this.scene.scale;
  const small=w<700,ph=Math.min(h,small?340:272),y=h-ph,pad=small?18:26;
  const menu=Math.min(this.options.menuWidth,small?Math.max(116,w*.35):w*.28);
  const divider=w-menu-20,textWidth=Math.max(16,(divider-pad-34)*.88);
  const textX=this.playerSpeaking?divider-24-textWidth:pad+10;
  this.layout={width:w,height:h,panelHeight:ph,panelY:y,portraitSize:0,portraitX:pad,
   portraitY:y+12,centerX:pad,centerY:y+12,textX,textEndX:divider,menuWidth:menu,
   menuX:divider+16,textWidth,font:small?17:22};
  this.overlay.setSize(w,h);
  this.background.setPosition(0,y).setSize(w,ph);
  this.border.clear().lineStyle(4,0xd4af37,1)
   .strokeRect(6,y+6,Math.max(1,w-12),Math.max(1,ph-12))
   .lineStyle(1,0x8a6d1f,.9)
   .strokeRect(12,y+12,Math.max(1,w-24),Math.max(1,ph-24));
  this.border.lineBetween(divider,y+16,divider,h-16);
  this.portraitFrame.clear().setVisible(false);
  this.text.setPosition(textX,y+58).setFontSize(this.layout.font).setWordWrapWidth(textWidth,true).setScale(1);
  this.footer.setPosition(textX,h-72).setFontSize(small?9:11).setWordWrapWidth(textWidth,true);
  this.previousText.setPosition(pad+10,h-37);
  this.pageLabel.setPosition(pad+38,h-37);
  this.nextText.setPosition(divider-24,h-37);
  this.leaveButton.setPosition(divider+16,h-37).setFontSize(small?16:18).setText(this.options.leaveLabel);
  this.leaveButton.setScale(Math.min(1,Math.max(1,menu-18)/Math.max(1,this.leaveButton.width)));
  this.renderSpeaker();this.repaginate(offset);this.renderPage(true);this.renderTopics();
 }
 repaginate(offset=0){
  if(!this.bubbleStyleReady){super.repaginate(offset);return;}
  const height=this.layout.panelHeight;
  this.layout.panelHeight=height-42;
  try{super.repaginate(offset);}finally{this.layout.panelHeight=height;}
 }
 renderPage(instant=false){
  if(this.bubbleStyleReady&&this.isOpen){
   const L=this.layout,player=this.playerSpeaking;
   this.bubble.clear().fillStyle(player?0x263729:0x2a2012,1)
    .fillRoundedRect(L.textX-10,L.panelY+48,L.textWidth+20,Math.max(1,L.panelHeight-102),8)
    .lineStyle(1,player?0x88b589:0xb58a42,1)
    .strokeRoundedRect(L.textX-10,L.panelY+48,L.textWidth+20,Math.max(1,L.panelHeight-102),8);
   this.text.setColor(player?'#e3f0d7':'#f3e7c4');
  }
  super.renderPage(instant);
 }
}

export class JohnConfrontationScene extends WarsawMeetingScene {
 constructor(){super({key:'JohnConfrontationScene'});}
 init(data={}){
  super.init(data);this.replayTopic=null;this.replayCursor=0;this.finaleOpening=false;this.conversationPanel=null;
 }
 create(){
  const story=getJohnConfrontation();this.allowed=this.preview||story.eligible;
  this.progress=normalizeConfrontation(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#142019');this.root=this.add.container(0,0);
  this.root.add(this.add.rectangle(720,490,1440,980,0x1a2921));
  this.text(720,55,T('t_bcf5db403a1e1ab2b64b'),23,1320,'#efd299',this.root,'PressStart2P');
  this.content=this.add.container(0,0);this.root.add(this.content);
  this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();
  this.keyHandler=e=>{
   if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
   const target=e.target;if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
   if(e.code==='Escape'){
    e.preventDefault();if(this.sourceOpen){this.sourceOpen=false;this.render();}
    else if(this.replayTopic){this.replayTopic=null;this.render();}else this.closeVisit();return;
   }
   const view=this.conversationPanel;if(!view?.isOpen)return;
   if(['Enter','Space','NumpadEnter'].includes(e.code)){e.preventDefault();view.advance();return;}
   const match=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);if(!match)return;e.preventDefault();
   if(view.isTyping){view.completeTypewriter();return;}
   const topic=view.pageTopics?.[Number(match[1])-1];if(topic&&topic.state!=='disabled'&&!view.topicsLocked())topic.onSelect?.(topic);
  };
  this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();
  this.events.once('shutdown',()=>{
   this.clearConversation();this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);
   this.restore();this.notifyFinished();
  });
 }
 render(){
  this.clearConversation();this.content.removeAll(true);
  if(!this.allowed){this.text(720,450,T('t_870badc4d9fe67513771'),29);return;}
  if(this.sourceOpen){
   this.text(720,230,T('t_e43f0e982aed27a965dd'),27,1260,'#efd299');this.text(720,455,DATA.evidenceNotes,29,1250);
   this.button(720,760,T('t_3e8b939c1330f81337bc'),()=>{this.sourceOpen=false;this.render();});this.footer();return;
  }
  if(this.replayTopic){
   const topic=DATA.topics.find(t=>t.id===this.replayTopic);this.showLine(topic,topic.lines[this.replayCursor],true);return;
  }
  if(this.progress.completed){
   this.text(720,210,T('t_79610b7a32ef22707c53'),31,1250,'#efd299');this.text(720,380,DATA.success,29,1250);
   this.text(720,510,DATA.nextObjective,24,1250);
   DATA.topics.forEach((t,i)=>this.button(720,590+i*70,T('t_60f03994dc870e4d48ca')+t.title,()=>this.startReplay(t.id)));
   this.button(240,910,T('t_eeaa1a1d8e66e91c0c59'),()=>{this.sourceOpen=true;this.render();});
   this.button(720,820,T('t_4b519c4c965d280b9369'),()=>{void this.openFinalReview();});this.footer();return;
  }
  if(!this.progress.started){
   this.text(720,260,T('t_741ae3f0e329f3cfb03f'),31,1250,'#efd299');this.text(720,450,DATA.intro,30,1250);
   this.button(720,730,T('t_07cc0078e8c19d56be69'),()=>this.change('start'));
   this.button(240,910,T('t_eeaa1a1d8e66e91c0c59'),()=>{this.sourceOpen=true;this.render();});this.footer();return;
  }
  const topic=DATA.topics.find(t=>t.id===this.progress.active);
  if(!topic){this.showTopicMenu();return;}
  const state=this.progress.topics[topic.id];
  if(state.evidence!==topic.evidence){this.showEvidenceMenu(topic);return;}
  this.showLine(topic,topic.lines[state.cursor],false);
 }
 makeConversation(text,{speaker='JOHN',portraitKey=null,topics=[],onAdvance=null}={}){
  if(typeof LocationDialoguePanel.prototype.advance!=='function')throw new Error('Install LocationDialoguePanel from dialogue migration stage 1.');
  let view=null;
  view=new ConfrontationPanel(this,{depth:6000,modal:true,keyboard:false,leaveLabel:'Leave',
   onLeave:()=>{if(this.conversationPanel===view)this.closeVisit();},
   onAdvance:()=>{if(this.conversationPanel===view)onAdvance?.();}});
  this.conversationPanel=view;
  view.setSpeaker({name:speaker,portrait:{kind:'texture',key:portraitKey||(speaker==='JOHN'?DATA.portraitKey:null)||'portrait_fallback'}});
  view.setText([text,this.feedback,this.saved===false?T('t_d1085e77824b8b9592f6'):'',
   this.preview?T('t_50d1058f5474fe46bb88'):''].filter(Boolean).join('\n\n'));
  view.setTopics(topics.map(topic=>({...topic,onSelect:()=>{if(this.conversationPanel===view)topic.onSelect?.();}})));
  return view;
 }
 runPanelAction(callback){
  if(this.closing||this.time.now<this.clickAfter)return;
  this.clickAfter=this.time.now+180;callback();
 }
 sourceTopic(){return{id:'source',label:T('t_eeaa1a1d8e66e91c0c59'),state:'accent',
  onSelect:()=>this.runPanelAction(()=>{this.sourceOpen=true;this.render();})};}
 showTopicMenu(){
  const topics=DATA.topics.map(t=>({id:t.id,label:t.title,state:this.progress.topics[t.id].heard?'used':'normal',
   onSelect:()=>this.runPanelAction(()=>{if(this.progress.topics[t.id].heard)this.startReplay(t.id);else this.change('topic',t.id);})}));
  if(DATA.topics.every(t=>this.progress.topics[t.id].heard))topics.push({id:'finish',label:T('t_9ae539a35dfb4c3d1dd9'),state:'accent',
   onSelect:()=>this.runPanelAction(()=>this.change('finish'))});
  topics.push(this.sourceTopic());this.makeConversation(T('t_eb7dfdc9069bfed36996'),{topics});
 }
 showEvidenceMenu(topic){
  const topics=DATA.evidence.map(e=>({id:e.id,label:e.label,onSelect:()=>this.runPanelAction(()=>this.change('evidence',e.id))}));
  topics.push({id:'topics',label:'Topics',onSelect:()=>this.runPanelAction(()=>this.change('menu'))},this.sourceTopic());
  this.makeConversation(topic.title+'\n\n'+T('t_4b81d88cd17e1e472cde'),{topics});
 }
 startReplay(id){this.replayTopic=id;this.replayCursor=0;this.render();}
 showLine(topic,line,replay){
  const topics=[{id:'continue',label:replay?T('t_2d2eb222bfcdaca1ff31'):'Continue',onSelect:()=>this.conversationPanel?.advance()},
   {id:'topics',label:'Topics',onSelect:()=>this.runPanelAction(()=>{
    if(replay){this.replayTopic=null;this.render();}else this.change('menu');
   })},this.sourceTopic()];
  this.makeConversation(topic.title+'\n\n'+line.text,{speaker:line.speaker,portraitKey:line.portraitKey,topics,
   onAdvance:()=>this.runPanelAction(()=>{
    if(replay){this.replayCursor++;if(this.replayCursor>=topic.lines.length)this.replayTopic=null;this.render();}
    else this.change('next');
   })});
 }
 footer(){
  this.text(720,850,this.feedback,20,1320,'#e5c58e');
  this.text(720,964,(this.preview?T('t_50d1058f5474fe46bb88'):'')+(this.saved===false?T('t_d1085e77824b8b9592f6'):T('t_a0fe8ef179b445ac8cab')),16,1350,'#b8c4a5');
 }
 change(action,id=null){
  const r=this.preview?confrontationAction(DATA,this.progress,action,id):performJohnConfrontation(action,id);
  this.progress=normalizeConfrontation(DATA,r.state);this.feedback=this.progress.completed?'':r.message;
  if(typeof r.saved==='boolean')this.saved=r.saved;this.render();return r.ok;
 }
 async openFinalReview(){
  if(this.closing||this.finaleOpening||!this.progress.completed)return false;this.finaleOpening=true;
  try{
   const{openHollyFinale}=await import('../hollyFinaleLauncher.js');if(this.closing||!this.sys.isActive())return false;
   const opened=openHollyFinale(this.game,{preview:this.preview,returnSceneKey:'JohnConfrontationScene',onFinished:()=>{this.finaleOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});
   if(!opened){this.finaleOpening=false;this.feedback=T('t_fe9f3ae6373fbc3a63c2');this.render();}return opened;
  }catch(error){this.finaleOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback=T('t_b500a0e3a855d8334580');this.render();}console.error('[Holly finale]',error);return false;}
 }
 clearConversation(){this.conversationPanel?.destroy();this.conversationPanel=null;}
 closeVisit(){this.clearConversation();super.closeVisit();}
}
