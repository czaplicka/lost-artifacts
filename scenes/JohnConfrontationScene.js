import { dialogueText } from '../dialogues/DialogueText.js';
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';
import { johnConfrontationData as DATA, getJohnConfrontation, performJohnConfrontation } from '../johnConfrontationService.js';
import { normalizeConfrontation, confrontationAction } from './pi-office/JohnConfrontationModel.js';
const T=id=>dialogueText('scenes/JohnConfrontationScene.js',id);
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
  view=new LocationDialoguePanel(this,{depth:6000,modal:true,keyboard:false,leaveLabel:'Leave',
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
