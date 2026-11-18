import { dialogueText } from '../dialogues/DialogueText.js';
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';
import { hollyFinaleData as DATA, getHollyFinale, performHollyFinale } from '../hollyFinaleService.js';
import { normalizeFinale, finaleAction } from './pi-office/HollyFinaleModel.js';
const T=id=>dialogueText('scenes/HollyFinaleScene.js',id);
export class HollyFinaleScene extends WarsawMeetingScene {
 constructor(){super({key:'HollyFinaleScene'});}
 init(data={}){super.init(data);this.documentId=null;this.confirmExit=false;this.conversationPanel=null;}
 preload(){if(!this.textures.exists('holly'))this.load.image('holly','assets/pi/holly.webp');}
 create(){
  const story=getHollyFinale();this.allowed=this.preview||story.eligible;
  this.progress=normalizeFinale(DATA,this.preview?null:story);if(!this.preview&&story.endingSavePending)this.saved=false;
  this.cameras.main.setBackgroundColor('#122018');this.root=this.add.container(0,0);
  this.root.add(this.add.rectangle(720,490,1440,980,0x1b2b22));
  this.text(720,55,T('t_61f3956708a5a8cb07f9'),24,1320,'#efd299',this.root,'PressStart2P');
  this.content=this.add.container(0,0);this.root.add(this.content);
  this.returnButton=this.button(1210,910,'BACK',()=>this.requestBack(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();
  this.keyHandler=e=>{
   if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
   const target=e.target;if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
   if(e.code==='Escape'){
    e.preventDefault();if(this.confirmExit){this.confirmExit=false;this.render();}
    else if(this.progress.candidate)this.change('cancel');else this.requestBack();return;
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
  this.returnButton?.setText(this.progress.completed?T('t_2fcba4e453cf5cec2a50'):T('t_639807a2e01886a2236b'));
  if(!this.allowed){this.text(720,440,T('t_05cf6d079071fa62fd69'),29);return;}
  if(this.confirmExit){
   this.text(720,260,T('t_ae0f3b375dae1b0e2590'),29,1280,'#efd299');this.text(720,450,T('t_1860d4e10ba0c6c3c0a0'),29,1250);
   this.button(400,720,T('t_2b2db463584f8f8626e6'),()=>{this.confirmExit=false;this.change('retry_save');});
   this.button(1040,720,T('t_2638758076ae840a95a3'),()=>this.returnToOffice());this.footer();return;
  }
  if(this.progress.completed){
   const ending=DATA.endings[this.progress.outcome];
   this.text(720,220,ending.title,29,1290,'#efd299');this.text(720,435,ending.text,29,1260);this.text(720,675,ending.epilogue,25,1260);
   if(this.saved===false)this.button(720,810,T('t_4737fde6ff551c004b64'),()=>this.change('retry_save'));this.footer();return;
  }
  if(!this.progress.ready){
   this.text(720,125,`${T('t_54f470a731ce0e13820b')}${this.progress.reviewed.length}${T('t_8a5edab282632443219e')}${DATA.review.length}${T('t_03ec43e80c26808ecd25')}`,22);
   DATA.review.forEach((r,i)=>{
    const b=this.button(300,280+i*135,(this.progress.reviewed.includes(r.id)?T('t_78c78dd961773adf990b'):'')+r.title,()=>{if(this.change('read',r.id)){this.documentId=r.id;this.render();}});b.setFontSize(20);
   });
   this.content.add(this.add.rectangle(990,470,770,600,0xe2d7bc).setStrokeStyle(3,0x9f875d));
   const doc=DATA.review.find(r=>r.id===this.documentId);
   this.text(990,230,doc?.title||T('t_57ab7f469418af7b2669'),25,700,'#684a31');
   this.text(990,485,doc?.text||T('t_3ccdc1258c0e1da07445'),28,695,'#302b25');
   this.button(720,820,T('t_a513713e38bde1212feb'),()=>this.change('prepare'));this.footer();return;
  }
  if(this.progress.line<DATA.dialogue.length){this.showFinalSpeech();return;}
  if(this.progress.candidate){
   const choice=DATA.choices.find(c=>c.id===this.progress.candidate);
   this.text(720,230,choice.label,31,1250,'#efd299');this.text(720,450,choice.confirmation,30,1250);
   this.button(400,730,T('t_cc6eaeda1473c39a0346'),()=>this.change('cancel'));
   this.button(1040,730,T('t_15a214b54415ce730f3d'),()=>this.change('confirm',choice.id));this.footer();return;
  }
  this.showFinalDecision();
 }
 makeFinalPanel(text,{speaker='DETECTIVE',portraitKey=null,topics=[],onAdvance=null}={}){
  if(typeof LocationDialoguePanel.prototype.advance!=='function')throw new Error('Install LocationDialoguePanel from dialogue migration stage 1.');
  let view=null;
  view=new LocationDialoguePanel(this,{depth:6000,modal:true,keyboard:false,leaveLabel:'Leave',
   onLeave:()=>{if(this.conversationPanel===view)this.requestBack();},
   onAdvance:()=>{if(this.conversationPanel===view)onAdvance?.();}});
  this.conversationPanel=view;
  view.setSpeaker({name:speaker,portrait:{kind:'texture',key:portraitKey||(speaker==='HOLLY'?'holly':'portrait_fallback')}});
  view.setText([text,this.feedback,this.saved===false?T('t_f8bcf4a6b2fed2087321'):'',this.preview?T('t_c36a98bd14da8b295adf'):''].filter(Boolean).join('\n\n'));
  view.setTopics(topics.map(topic=>({...topic,onSelect:()=>{if(this.conversationPanel===view)topic.onSelect?.();}})));return view;
 }
 runFinalPanelAction(callback){
  if(this.closing||this.time.now<this.clickAfter)return;this.clickAfter=this.time.now+180;callback();
 }
 showFinalSpeech(){
  const line=DATA.dialogue[this.progress.line];
  this.makeFinalPanel(line.text,{speaker:line.speaker,portraitKey:line.portraitKey,
   topics:[{id:'continue',label:'Continue',onSelect:()=>this.conversationPanel?.advance()}],
   onAdvance:()=>this.runFinalPanelAction(()=>this.change('next'))});
 }
 showFinalDecision(){
  this.makeFinalPanel(T('t_55df0fb5e1f043bd776c')+'\n\n'+T('t_b7ab572d7b723265b24e'),{
   topics:DATA.choices.map(choice=>({id:choice.id,label:choice.label,
    onSelect:()=>this.runFinalPanelAction(()=>this.change('choose',choice.id))}))
  });
 }
 footer(){
  this.text(720,854,this.feedback,19,1320,'#e5c58e');
  this.text(720,964,(this.preview?T('t_c36a98bd14da8b295adf'):'')+(this.saved===false?T('t_f8bcf4a6b2fed2087321'):this.progress.completed?T('t_f95e09c23d90b2d8667d'):T('t_37055f758b668cc4a26a')),16,1350,'#bec7aa');
 }
 change(action,id=null){
  let r;if(this.preview&&action==='retry_save')r={ok:true,state:this.progress,saved:null,message:''};
  else r=this.preview?finaleAction(DATA,this.progress,action,id):performHollyFinale(action,id);
  this.progress=normalizeFinale(DATA,r.state);this.feedback=r.message;if(typeof r.saved==='boolean')this.saved=r.saved;
  this.render();return r.ok;
 }
 requestBack(){
  if(this.progress.completed){if(!this.preview&&this.saved===false){this.confirmExit=true;this.render();}else this.returnToOffice();}
  else this.closeVisit();
 }
 returnToOffice(){
  const office=this.scene.manager.keys.DetectiveOfficeScene;
  if(!office||(!this.scene.isActive('DetectiveOfficeScene')&&!this.scene.isPaused('DetectiveOfficeScene'))){this.closeVisit();return;}
  const keys=['HollyFinaleScene','JohnConfrontationScene','JohnIncidentFilesScene','JohnPrimaryRecordsScene','JohnAccountReviewScene','WarsawMeetingScene'];
  const chain=keys.map(key=>({key,target:this.scene.manager.keys[key]})).filter(({key,target})=>target&&(this.scene.isActive(key)||this.scene.isPaused(key)));
  for(const{target}of chain)target.closing=true;
  for(const{key,target}of chain){target.restore?.();this.scene.stop(key);}
 }
 notifyFinished(){
  const callback=this.onFinished;this.onFinished=null;
  try{callback?.({preview:this.preview,completed:this.progress?.completed===true,outcome:this.progress?.outcome??null,saved:this.saved});}
  catch(error){console.error('[Holly finale] Completion callback failed:',error);}
 }
 clearConversation(){this.conversationPanel?.destroy();this.conversationPanel=null;}
 closeVisit(){this.clearConversation();super.closeVisit();}
}
