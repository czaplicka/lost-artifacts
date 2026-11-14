import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gordonInterviewData as DATA,getGordonInterviewState,beginGordonQuestion,completeGordonReply,completeGordonDismissal } from '../gordonInterviewService.js';
import { normalizeGordonInterview,planGordonQuestion,acknowledgeGordonReply } from '../gordonInterviewModel.js';
import { GordonHotspotDebug } from './gordon/GordonHotspotDebug.js';
import { installGordonEthicsInterview } from './gordon/GordonEthicsUI.js';
export class GordonInterviewScene extends BaseScene {
 constructor(){super({key:'GordonInterviewScene'});}
 init(data={}){
  this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
  this.local=normalizeGordonInterview(DATA,{});this.modal=null;this.dialogue=null;this.hotspots=[];this.definitions=DATA.hotspots.map(def=>({...def}));
  this.closing=false;this.introShown=false;this.savedOk=null;this.hotspotDebug=null;this.layerStates=[];this.parentPausedByMe=false;this.statusTimer=null;
 }
 preload(){for(const asset of Object.values(DATA.backgrounds))if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);}
 state(){return this.preview?{...this.local,unlocked:true}:getGordonInterviewState();}
 create(){
  super.create();this.cameras.main.setBackgroundColor('#080b08');this.root=this.add.container(0,0);
  if(this.textures.exists(DATA.backgrounds.occupied.key))this.root.add(this.add.image(960,540,DATA.backgrounds.occupied.key).setDisplaySize(1920,1080));
  else this.root.add(this.add.text(100,150,`${__dialogueText("scenes/GordonInterviewScene.js", "t_f10ce971f188a51de4e6")}${DATA.backgrounds.occupied.url}`,{fontFamily:'SpecialElite',fontSize:'30px',color:'#ffaaaa'}));
  this.label(35,25,__dialogueText("scenes/GordonInterviewScene.js", "t_0ee4e045609ac508cc86"),22).setOrigin(0,0);this.outline=this.add.graphics();this.root.add(this.outline);this.tooltip=this.label(0,0,'',20).setVisible(false);
  this.definitions.forEach(def=>{
   const zone=this.add.zone(def.x,def.y,def.w,def.h).setOrigin(0).setInteractive({useHandCursor:true});this.root.add(zone);const hotspot={def,zone};this.hotspots.push(hotspot);
   zone.on('pointerover',()=>{if(this.blocked()||this.hotspotDebug?.enabled)return;this.drawHotspots(def);this.tooltip.setText(def.label).setPosition(def.x+def.w/2,Math.max(90,def.y-12)).setVisible(true);this.root.bringToTop(this.tooltip);});
   zone.on('pointerout',()=>{this.tooltip.setVisible(false);this.drawHotspots();});
   zone.on('pointerdown',()=>{if(this.hotspotDebug?.enabled){this.hotspotDebug.select(hotspot);return;}if(!this.blocked())this.activate(def.id);});
  });
  this.status=this.label(960,80,'',24).setVisible(false);this.back=this.label(175,1028,__dialogueText("scenes/GordonInterviewScene.js", "t_db26b7d387791ba818bb"),23).setInteractive({useHandCursor:true});
  this.back.on('pointerdown',()=>{if(!this.blocked()&&!this.hotspotDebug?.enabled)this.closeInterview();});
  this.mode=this.label(960,1028,this.preview?__dialogueText("scenes/GordonInterviewScene.js", "t_db1d7313ec962ed15287"):__dialogueText("scenes/GordonInterviewScene.js", "t_5324b7d9c4590071b905"),19);
  this.hotspotDebug=new GordonHotspotDebug(this,this.hotspots);this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{
   if(event.repeat)return;if(this.hotspotDebug.enabled){event.preventDefault();this.hotspotDebug.setEnabled(false);return;}
   if(this.dialogue)this.abortDialogue();else if(this.modal)this.closeModal();else this.closeInterview();
  });
  this.suspendBackground();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.statusTimer?.remove(false);this.hotspotDebug?.destroy();this.restoreBackground();this.onFinished=null;});
  if(!this.state().unlocked)this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_688af0b65933da3d502e"));
  else if(this.state().pendingTopic)this.resumeReply();else if(this.state().dismissalPending)this.showDismissal();
  else if(this.state().completed)this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_5a95c071d7f7aac3f18c"));
 }
 blocked(){return this.closing||Boolean(this.modal)||Boolean(this.dialogue);}
 label(x,y,text,size=25){const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#ffe2ae',backgroundColor:'#10231a',padding:{x:12,y:8},align:'center',wordWrap:{width:1500}}).setOrigin(.5);this.root.add(object);return object;}
 drawHotspots(hover=null){this.outline.clear();if(this.hotspotDebug?.enabled)return;for(const{def}of this.hotspots){if(hover?.id!==def.id)continue;this.outline.lineStyle(3,0xffd176,.9);this.outline.strokeRect(def.x,def.y,def.w,def.h);}}
 showStatus(text){this.statusTimer?.remove(false);this.status.setText(text).setVisible(true);this.root.bringToTop(this.status);this.statusTimer=this.time.delayedCall(8500,()=>this.status?.setVisible(false));}
 activate(id){
  if(this.hotspotDebug?.enabled)return;if(id==='door'){this.closeInterview();return;}if(id==='gordon'){this.talk();return;}
  this.showStatus({safe:__dialogueText("scenes/GordonInterviewScene.js", "t_f7295f6e9bc89b684e62"),access:__dialogueText("scenes/GordonInterviewScene.js", "t_b464a1bc08146bede35a"),folder:__dialogueText("scenes/GordonInterviewScene.js", "t_2ddc7b1d7a547ee534b4"),telephone:__dialogueText("scenes/GordonInterviewScene.js", "t_a8aba9cb629395497989")}[id]);
 }
 shield(parent){const shade=this.add.rectangle(960,540,1920,1080,0,.35).setInteractive();shade.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());parent.add(shade);}
 text(parent,x,y,value,size=30,width=1660,color='#f1e6cf'){const object=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:8}).setOrigin(.5);parent.add(object);return object;}
 button(parent,x,y,value,callback,width=0){
  const object=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:'26px',color:'#ffe2ae',backgroundColor:'#294331',padding:{x:22,y:12},align:'center',...(width?{fixedWidth:width}:{})}).setOrigin(.5).setInteractive({useHandCursor:true});
  object.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(!this.closing)callback();});parent.add(object);return object;
 }
 talk(){
  if(this.hotspotDebug?.enabled)return;const state=this.state();if(!state.unlocked){this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_b247af68678afdae98a3"));return;}
  if(state.completed){this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_3b32e934b17bb81957d3"));return;}
  if(state.pendingTopic){this.resumeReply();return;}if(state.dismissalPending){this.showDismissal();return;}
  if(!this.introShown&&!state.asked.length){this.introShown=true;this.openDialogue(DATA.opening.map(text=>({speaker:DATA.speaker,text})),__dialogueText("scenes/GordonInterviewScene.js", "t_a70cc5302c043cd93e8b"),()=>this.openTopics());}else this.openTopics();
 }
 openTopics(){
  if(this.blocked()||this.hotspotDebug?.enabled)return;const state=this.state();if(state.pendingTopic){this.resumeReply();return;}if(state.dismissalPending){this.showDismissal();return;}
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.shield(panel);panel.add(this.add.rectangle(515,490,900,650,0x10231a,.98).setStrokeStyle(3,0xd0a663));this.text(panel,515,240,__dialogueText("scenes/GordonInterviewScene.js", "t_c83191c95d809121091d"),32,800,'#ffcf84');
  DATA.topics.filter(topic=>!state.asked.includes(topic.id)).forEach((topic,index)=>this.button(panel,515,350+index*105,topic.label,()=>this.ask(topic.id),750));
  this.button(panel,515,745,__dialogueText("scenes/GordonInterviewScene.js", "t_b8de0355b887f7441ed9"),()=>this.closeModal());this.tooltip.setVisible(false);
 }
 closeModal(){const old=this.modal;this.modal=null;old?.destroy(true);}
 ask(topicId){
  if(this.hotspotDebug?.enabled)return;const result=this.preview?planGordonQuestion(DATA,this.local,topicId):beginGordonQuestion(topicId);
  if(!(result.ok||result.success)){this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_83814c921bdaf0b38351"));return;}
  if(this.preview)this.local=result.state;else this.savedOk=result.saved;this.closeModal();this.resumeReply();
 }
 resumeReply(){
  const state=this.state(),topic=DATA.topics.find(topic=>topic.id===state.pendingTopic);if(!topic)return;
  this.openDialogue([{speaker:__dialogueText("scenes/GordonInterviewScene.js", "t_1e954e77ee4e5253c6c5"),text:topic.question},...topic.reply.map(text=>({speaker:DATA.speaker,text}))],__dialogueText("scenes/GordonInterviewScene.js", "t_cb96474abe56715a0ada"),()=>{
   const result=this.preview?acknowledgeGordonReply(DATA,this.local):completeGordonReply();
   if(!(result.ok||result.success)){this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_5af7c548e29a53abf0ce"));return;}
   if(this.preview)this.local=result.state;else this.savedOk=result.saved;if(this.state().dismissalPending)this.showDismissal();else this.openTopics();
  });
 }
 showDismissal(){
  this.openDialogue(DATA.dismissal.map(text=>({speaker:DATA.speaker,text})),__dialogueText("scenes/GordonInterviewScene.js", "t_f99ff8d8fd890cd4e4e9"),()=>{
   const result=this.preview?{success:true,saved:true}:completeGordonDismissal();if(!result.success){this.showStatus(__dialogueText("scenes/GordonInterviewScene.js", "t_654e28adde46eaa4c30d"));return;}
   if(this.preview)this.local={...this.local,completed:true,dismissalPending:false};else this.savedOk=result.saved;this.closeInterview();
  });
 }
 openDialogue(lines,finalLabel,onComplete){
  if(this.blocked()||this.hotspotDebug?.enabled)return;const container=this.add.container(0,0);this.dialogue={container,lines,index:0,finalLabel,onComplete};this.root.add(container);this.shield(container);
  container.add(this.add.rectangle(960,892,1840,310,0x0d1b14,.98).setStrokeStyle(3,0xd0a663));this.dialogue.speaker=this.text(container,960,779,lines[0].speaker,29,1660,'#ffcf84');this.dialogue.body=this.text(container,960,875,lines[0].text,30);
  this.dialogue.next=this.button(container,960,997,lines.length===1?finalLabel:'CONTINUE',()=>this.nextDialogue());this.tooltip.setVisible(false);
 }
 nextDialogue(){
  const current=this.dialogue;if(!current)return;
  if(current.index<current.lines.length-1){current.index++;const line=current.lines[current.index];current.speaker.setText(line.speaker);current.body.setText(line.text);current.next.setText(current.index===current.lines.length-1?current.finalLabel:__dialogueText("scenes/GordonInterviewScene.js", "t_628db0c7598820b10176"));return;}
  const callback=current.onComplete;current.onComplete=null;this.abortDialogue();callback?.();
 }
 abortDialogue(){const old=this.dialogue;this.dialogue=null;old?.container.destroy(true);}
 layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1920,height/1080);this.root.setScale(s).setPosition((width-1920*s)/2,(height-1080*s)/2);}
 suspendBackground(){
  this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
  if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
 }
 restoreBackground(){
  for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
  this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
 }
 closeInterview(){
  if(this.closing)return;this.closing=true;const result={completed:this.state().completed,preview:this.preview,saved:this.savedOk},callback=this.onFinished;this.onFinished=null;this.restoreBackground();try{callback?.(result);}finally{this.scene.stop();}
 }
}
installGordonEthicsInterview(GordonInterviewScene);
