import { BaseScene } from './BaseScene.js';
import { gordonInterviewData as DATA,getGordonInterviewState,beginGordonQuestion,
  completeGordonReply,completeGordonDismissal } from '../gordonInterviewService.js';
import { normalizeGordonInterview,planGordonQuestion,acknowledgeGordonReply } from '../gordonInterviewModel.js';
import { GordonHotspotDebug } from './gordon/GordonHotspotDebug.js';

export class GordonInterviewScene extends BaseScene {
  constructor(){super({key:'GordonInterviewScene'});}
  init(data={}){
    this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;
    this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.local=normalizeGordonInterview(DATA,{});this.modal=null;this.dialogue=null;this.hotspots=[];
    this.definitions=DATA.hotspots.map(def=>({...def}));
    this.closing=false;this.introShown=false;this.savedOk=null;this.hotspotDebug=null;
    this.layerStates=[];this.parentPausedByMe=false;this.statusTimer=null;
  }
  preload(){for(const asset of Object.values(DATA.backgrounds))if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);}
  state(){return this.preview?{...this.local,unlocked:true}:getGordonInterviewState();}
  create(){
    super.create();this.cameras.main.setBackgroundColor('#080b08');this.root=this.add.container(0,0);
    if(this.textures.exists(DATA.backgrounds.occupied.key))this.root.add(this.add.image(960,540,DATA.backgrounds.occupied.key).setDisplaySize(1920,1080));
    else this.root.add(this.add.text(100,150,`Could not load ${DATA.backgrounds.occupied.url}`,{fontFamily:'SpecialElite',fontSize:'30px',color:'#ffaaaa'}));
    this.label(35,25,'MARK AGENCY / SUPERVISOR',22).setOrigin(0,0);
    this.outline=this.add.graphics();this.root.add(this.outline);this.tooltip=this.label(0,0,'',20).setVisible(false);
    this.definitions.forEach(def=>{
      const zone=this.add.zone(def.x,def.y,def.w,def.h).setOrigin(0).setInteractive({useHandCursor:true});this.root.add(zone);
      const hotspot={def,zone};this.hotspots.push(hotspot);
      zone.on('pointerover',()=>{
        if(this.blocked()||this.hotspotDebug?.enabled)return;
        this.drawHotspots(def);this.tooltip.setText(def.label).setPosition(def.x+def.w/2,Math.max(90,def.y-12)).setVisible(true);this.root.bringToTop(this.tooltip);
      });
      zone.on('pointerout',()=>{this.tooltip.setVisible(false);this.drawHotspots();});
      zone.on('pointerdown',()=>{
        if(this.hotspotDebug?.enabled){this.hotspotDebug.select(hotspot);return;}
        if(!this.blocked())this.activate(def.id);
      });
    });
    this.status=this.label(960,80,'',24).setVisible(false);
    this.back=this.label(175,1028,'< UPPER FLOOR',23).setInteractive({useHandCursor:true});
    this.back.on('pointerdown',()=>{if(!this.blocked()&&!this.hotspotDebug?.enabled)this.closeInterview();});
    this.mode=this.label(960,1028,this.preview?'PREVIEW / no story changes':'Click Gordon to discuss the authorization.',19);
    this.hotspotDebug=new GordonHotspotDebug(this,this.hotspots);
    this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{
      if(event.repeat)return;
      if(this.hotspotDebug.enabled){event.preventDefault();this.hotspotDebug.setEnabled(false);return;}
      if(this.dialogue)this.abortDialogue();else if(this.modal)this.closeModal();else this.closeInterview();
    });
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.statusTimer?.remove(false);this.hotspotDebug?.destroy();this.restoreBackground();this.onFinished=null;});
    if(!this.state().unlocked)this.showStatus('Speak to Marge and complete the sixth mission before this interview.');
    else if(this.state().pendingTopic)this.resumeReply();
    else if(this.state().dismissalPending)this.showDismissal();
    else if(this.state().completed)this.showStatus('Gordon has already ended this meeting. The next story step follows mission seven.');
  }
  blocked(){return this.closing||Boolean(this.modal)||Boolean(this.dialogue);}
  label(x,y,text,size=25){
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#ffe2ae',backgroundColor:'#10231a',padding:{x:12,y:8},align:'center',wordWrap:{width:1500}}).setOrigin(0.5);this.root.add(object);return object;
  }
  drawHotspots(hover=null){
    this.outline.clear();if(this.hotspotDebug?.enabled)return;
    for(const{def}of this.hotspots){if(hover?.id!==def.id)continue;this.outline.lineStyle(3,0xffd176,0.9);this.outline.strokeRect(def.x,def.y,def.w,def.h);}
  }
  showStatus(text){
    this.statusTimer?.remove(false);this.status.setText(text).setVisible(true);this.root.bringToTop(this.status);
    this.statusTimer=this.time.delayedCall(8500,()=>this.status?.setVisible(false));
  }
  activate(id){
    if(this.hotspotDebug?.enabled)return;
    if(id==='door'){this.closeInterview();return;}if(id==='gordon'){this.talk();return;}
    this.showStatus({safe:'The safe is closed. Gordon is sitting right there.',access:'The entrance access panel is not an invitation to tamper with it.',folder:'A closed folder on Gordon\'s desk. It has not been offered to you.',telephone:'Gordon\'s telephone. This is not a public line.'}[id]);
  }
  shield(parent){
    const shade=this.add.rectangle(960,540,1920,1080,0x000000,0.35).setInteractive();shade.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());parent.add(shade);
  }
  text(parent,x,y,value,size=30,width=1660,color='#f1e6cf'){
    const object=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:8}).setOrigin(0.5);parent.add(object);return object;
  }
  button(parent,x,y,value,callback,width=0){
    const object=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:'26px',color:'#ffe2ae',backgroundColor:'#294331',padding:{x:22,y:12},align:'center',...(width?{fixedWidth:width}:{})}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(!this.closing)callback();});parent.add(object);return object;
  }
  talk(){
    if(this.hotspotDebug?.enabled)return;
    const state=this.state();if(!state.unlocked){this.showStatus('This interview is not unlocked yet.');return;}
    if(state.completed){this.showStatus('The meeting is over. Return to your assigned case.');return;}
    if(state.pendingTopic){this.resumeReply();return;}if(state.dismissalPending){this.showDismissal();return;}
    if(!this.introShown&&!state.asked.length){
      this.introShown=true;this.openDialogue(DATA.opening.map(text=>({speaker:DATA.speaker,text})),'ASK A QUESTION',()=>this.openTopics());
    }else this.openTopics();
  }
  openTopics(){
    if(this.blocked()||this.hotspotDebug?.enabled)return;const state=this.state();
    if(state.pendingTopic){this.resumeReply();return;}if(state.dismissalPending){this.showDismissal();return;}
    const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.shield(panel);
    panel.add(this.add.rectangle(515,490,900,650,0x10231a,0.98).setStrokeStyle(3,0xd0a663));this.text(panel,515,240,'WHAT DO YOU ASK?',32,800,'#ffcf84');
    DATA.topics.filter(topic=>!state.asked.includes(topic.id)).forEach((topic,index)=>this.button(panel,515,350+index*105,topic.label,()=>this.ask(topic.id),750));
    this.button(panel,515,745,'PAUSE MEETING',()=>this.closeModal());this.tooltip.setVisible(false);
  }
  closeModal(){const old=this.modal;this.modal=null;old?.destroy(true);}
  ask(topicId){
    if(this.hotspotDebug?.enabled)return;
    const result=this.preview?planGordonQuestion(DATA,this.local,topicId):beginGordonQuestion(topicId);
    if(!(result.ok||result.success)){this.showStatus('Finish the pending response first.');return;}
    if(this.preview)this.local=result.state;else this.savedOk=result.saved;this.closeModal();this.resumeReply();
  }
  resumeReply(){
    const state=this.state(),topic=DATA.topics.find(topic=>topic.id===state.pendingTopic);if(!topic)return;
    this.openDialogue([{speaker:'DETECTIVE',text:topic.question},...topic.reply.map(text=>({speaker:DATA.speaker,text}))],'END RESPONSE',()=>{
      const result=this.preview?acknowledgeGordonReply(DATA,this.local):completeGordonReply();
      if(!(result.ok||result.success)){this.showStatus('The response could not be recorded.');return;}
      if(this.preview)this.local=result.state;else this.savedOk=result.saved;
      if(this.state().dismissalPending)this.showDismissal();else this.openTopics();
    });
  }
  showDismissal(){
    this.openDialogue(DATA.dismissal.map(text=>({speaker:DATA.speaker,text})),'LEAVE THE OFFICE',()=>{
      const result=this.preview?{success:true,saved:true}:completeGordonDismissal();
      if(!result.success){this.showStatus('The interview has not been completed.');return;}
      if(this.preview)this.local={...this.local,completed:true,dismissalPending:false};else this.savedOk=result.saved;this.closeInterview();
    });
  }
  openDialogue(lines,finalLabel,onComplete){
    if(this.blocked()||this.hotspotDebug?.enabled)return;
    const container=this.add.container(0,0);this.dialogue={container,lines,index:0,finalLabel,onComplete};this.root.add(container);this.shield(container);
    container.add(this.add.rectangle(960,892,1840,310,0x0d1b14,0.98).setStrokeStyle(3,0xd0a663));
    this.dialogue.speaker=this.text(container,960,779,lines[0].speaker,29,1660,'#ffcf84');
    this.dialogue.body=this.text(container,960,875,lines[0].text,30);
    this.dialogue.next=this.button(container,960,997,lines.length===1?finalLabel:'CONTINUE',()=>this.nextDialogue());this.tooltip.setVisible(false);
  }
  nextDialogue(){
    const current=this.dialogue;if(!current)return;
    if(current.index<current.lines.length-1){current.index++;const line=current.lines[current.index];current.speaker.setText(line.speaker);current.body.setText(line.text);current.next.setText(current.index===current.lines.length-1?current.finalLabel:'CONTINUE');return;}
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
    if(this.closing)return;this.closing=true;const result={completed:this.state().completed,preview:this.preview,saved:this.savedOk};
    const callback=this.onFinished;this.onFinished=null;this.restoreBackground();try{callback?.(result);}finally{this.scene.stop();}
  }
}
