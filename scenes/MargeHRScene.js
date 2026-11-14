import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { margeBirthdayData as DATA, getMargeBirthdayState, completeMargeRefusal,
  collectMargeBirthdayClue, saveMargeBirthdayAnswers, submitMargeBirthdayDeduction } from '../margeBirthdayService.js';
import { evaluateMargeBirthday } from '../margeBirthdayModel.js';
import { MargeHRHelpController } from './hr/MargeHRHelpController.js';

export class MargeHRScene extends BaseScene {
  constructor(){super({key:'MargeHRScene'});}
  init(data={}){
    this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;
    this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.local={refused:false,clues:[],answers:{},completed:false};
    this.hotspots=[];this.modal=null;this.dialogue=null;this.finished=false;this.closing=false;
    this.layerStates=[];this.parentPausedByMe=false;this.statusTimer=null;this.debug=false;
    this.caseKey='holly_missing_husband';this.stationId='marge_birthday';this.evidenceConfig={id:'marge_birthday'};
  }
  preload(){
    for(const asset of Object.values(DATA.backgrounds))if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);
  }
  state(){return this.preview?{...this.local,unlocked:true,canExamine:this.local.refused}:getMargeBirthdayState();}
  create(){
    super.create();this.cameras.main.setBackgroundColor('#080c08');this.root=this.add.container(0,0);
    const key=DATA.backgrounds.occupied.key;
    if(this.textures.exists(key))this.root.add(this.add.image(960,540,key).setDisplaySize(1920,1080));
    else this.root.add(this.add.text(100,150,`${__dialogueText("scenes/MargeHRScene.js", "t_23dfbd5bcc7a498b401f")}${DATA.backgrounds.occupied.url}`,{fontFamily:'SpecialElite',fontSize:'28px',color:'#ffaaaa'}));
    this.label(36,25,__dialogueText("scenes/MargeHRScene.js", "t_4e9909f1a7a92f17ee23"),20,'#ffe3a3').setOrigin(0,0);
    this.hoverOutline=this.add.graphics();this.root.add(this.hoverOutline);
    this.tooltip=this.label(0,0,'',18,'#ffe4a1').setVisible(false);
    DATA.hotspots.forEach(def=>this.buildHotspot(def));
    this.status=this.label(960,62,'',23,'#fff0ce').setVisible(false);
    this.counter=this.label(960,979,'',18,'#fff0ce');
    this.makeSceneButton(165,1024,__dialogueText("scenes/MargeHRScene.js", "t_d325d6af9f47d2ef9d00"),()=>this.closeHR());
    this.deductionButton=this.makeSceneButton(960,1024,__dialogueText("scenes/MargeHRScene.js", "t_37f4344493ac1f45baeb"),()=>this.openDeduction());
    this.help=new MargeHRHelpController(this);this.help.create();
    this.finished=this.state().completed;this.refreshScene();this.layout();
    this.showStatus(this.state().unlocked?__dialogueText("scenes/MargeHRScene.js", "t_5ecf7a219e04afeef7d5"):__dialogueText("scenes/MargeHRScene.js", "t_0e1b9ca493d575bf05c8"));
    this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard){
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{
        if(event.repeat)return;
        if(this.help.modal)this.help.close();else if(this.modal)this.closeModal();else if(this.dialogue)this.abortDialogue();else this.closeHR();
      });
      this.trackInputEvent(this.input.keyboard,'keydown-D',event=>{if(!event.repeat){this.debug=!this.debug;this.drawHotspots();}});
    }
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.statusTimer?.remove(false);this.help?.destroy();this.restoreBackground();this.onFinished=null;
    });
  }
  label(x,y,text,size=23,color='#eadfc8'){
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',backgroundColor:'#101b15',padding:{x:10,y:7},wordWrap:{width:1500}}).setOrigin(0.5);
    this.root.add(object);return object;
  }
  makeSceneButton(x,y,label,callback){
    const object=this.label(x,y,label,23,'#ffe0a1').setInteractive({useHandCursor:true});
    object.on('pointerdown',()=>{if(!this.closing&&!this.modal&&!this.dialogue)callback();});return object;
  }
  buildHotspot(def){
    const zone=this.add.zone(def.x,def.y,def.w,def.h).setOrigin(0).setInteractive({useHandCursor:true});this.root.add(zone);
    zone.on('pointerover',()=>{
      if(!this.canExplore())return;this.drawHotspots(def);
      this.tooltip.setText(def.label).setPosition(def.x+def.w/2,Math.max(90,def.y-20)).setVisible(true);
      this.root.bringToTop(this.tooltip);
    });
    zone.on('pointerout',()=>{this.tooltip.setVisible(false);this.drawHotspots();});
    zone.on('pointerdown',()=>{if(this.canExplore()){if(def.id==='marge')this.talkToMarge();else this.inspect(def.id);}});
    this.hotspots.push({def,zone});
  }
  canExplore(){return !this.closing&&!this.modal&&!this.dialogue&&!this.help?.modal&&this.state().unlocked;}
  drawHotspots(hover=null){
    this.hoverOutline.clear();
    for(const{def}of this.hotspots){
      if(!this.debug&&hover?.id!==def.id)continue;
      this.hoverOutline.lineStyle(3,0xffd176,0.9);this.hoverOutline.strokeRect(def.x,def.y,def.w,def.h);
    }
  }
  refreshScene(){
    const state=this.state();this.finished=state.completed;
    for(const{zone}of this.hotspots)if(zone.input)zone.input.enabled=!this.modal&&!this.dialogue&&state.unlocked;
    this.deductionButton.setVisible(state.refused);
    this.deductionButton.setText(state.completed?__dialogueText("scenes/MargeHRScene.js", "t_7d44aa4870466b8abc43"):__dialogueText("scenes/MargeHRScene.js", "t_37f4344493ac1f45baeb"));
    this.counter.setText(this.preview?`${__dialogueText("scenes/MargeHRScene.js", "t_01284128f0deba03607c")}${state.clues.length}${__dialogueText("scenes/MargeHRScene.js", "t_005e1574a2b5c8163046")}${DATA.clues.length}`:`${__dialogueText("scenes/MargeHRScene.js", "t_cdbbe6cb6adbf314e0a9")}${state.clues.length}${__dialogueText("scenes/MargeHRScene.js", "t_005e1574a2b5c8163046")}${DATA.clues.length}`);
  }
  showStatus(text){
    this.statusTimer?.remove(false);this.status.setText(text).setVisible(true);this.root.bringToTop(this.status);
    this.statusTimer=this.time.delayedCall(8500,()=>this.status?.setVisible(false));
  }
  setDialogue(text){this.showStatus(`${__dialogueText("scenes/MargeHRScene.js", "t_e0e94082545fdad681ba")}${text}`);}
  makeShield(parent){
    const shield=this.add.rectangle(960,540,1920,1080,0x000000,0.45).setInteractive();
    shield.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());parent.add(shield);
  }
  modalText(parent,x,y,text,size=27,color='#3c3026',width=1050){
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:7}).setOrigin(0.5);
    parent.add(object);return object;
  }
  modalButton(parent,x,y,text,callback,width=0){
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'24px',color:'#ffe3a3',backgroundColor:'#243a2d',padding:{x:20,y:13},align:'center',...(width?{fixedWidth:width}:{})}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();callback();});parent.add(object);return object;
  }
  talkToMarge(){
    if(!this.canExplore())return;
    if(this.finished){this.showStatus(__dialogueText("scenes/MargeHRScene.js", "t_961b3307603d7efe42e2"));return;}
    const refusal=!this.state().refused;
    const lines=refusal?DATA.refusalLines:DATA.repeatLines;
    const container=this.add.container(0,0);this.root.add(container);this.root.bringToTop(container);
    this.dialogue={container,lines,index:0,refusal};
    this.makeShield(container);
    container.add(this.add.rectangle(960,890,1840,310,0x0e1d15,0.98).setStrokeStyle(3,0xd7ad62));
    this.modalText(container,960,780,DATA.speaker,30,'#ffce81',1700);
    this.dialogue.text=this.modalText(container,960,872,lines[0],30,'#f3ead7',1660);
    this.dialogue.next=this.modalButton(container,960,995,'CONTINUE',()=>this.nextDialogue());
    this.tooltip.setVisible(false);this.refreshScene();
  }
  nextDialogue(){
    const current=this.dialogue;if(!current)return;
    if(current.index<current.lines.length-1){current.index++;current.text.setText(current.lines[current.index]);current.next.setText(current.index===current.lines.length-1?__dialogueText("scenes/MargeHRScene.js", "t_1cad2a01acc725060cad"):__dialogueText("scenes/MargeHRScene.js", "t_628db0c7598820b10176"));return;}
    if(current.refusal){
      if(this.preview)this.local.refused=true;
      else{const result=completeMargeRefusal();if(!result.success){this.showStatus(__dialogueText("scenes/MargeHRScene.js", "t_121e42fbd286f8487658"));return;}}
    }
    this.abortDialogue();this.showStatus(__dialogueText("scenes/MargeHRScene.js", "t_6f875760bcf99237c2ff"));
  }
  abortDialogue(){const old=this.dialogue;this.dialogue=null;old?.container.destroy(true);this.refreshScene();}
  inspect(id){
    const state=this.state();if(!state.refused){this.showStatus(__dialogueText("scenes/MargeHRScene.js", "t_e5a9a80e00ba29bb6c76"));return;}
    const clue=DATA.clues.find(item=>item.id===id);if(!clue)return;
    if(this.preview){if(!this.local.clues.includes(id))this.local.clues.push(id);}
    else{const result=collectMargeBirthdayClue(id);if(!result.success)return;}
    const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);
    panel.add(this.add.rectangle(960,530,1230,610,0xe9daba).setStrokeStyle(4,0x8b6842));
    this.modalText(panel,960,300,clue.label.toUpperCase(),30,'#714f2e');
    this.modalText(panel,960,478,clue.text,31);
    this.modalText(panel,960,674,clue.note,24,'#71583c');
    this.modalButton(panel,960,770,__dialogueText("scenes/MargeHRScene.js", "t_f6a58363856de930519a"),()=>this.closeModal());
    this.tooltip.setVisible(false);this.refreshScene();
  }
  closeModal(){const old=this.modal;this.modal=null;old?.destroy(true);this.refreshScene();}
  openDeduction(){
    const state=this.state();if(!state.refused)return;
    const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);
    panel.add(this.add.rectangle(960,530,1500,830,0xe9daba).setStrokeStyle(4,0x8b6842));
    this.modalText(panel,960,165,__dialogueText("scenes/MargeHRScene.js", "t_d59503252a174c6f9576"),32,'#714f2e');
    if(state.completed){
      this.modalText(panel,960,480,DATA.success,32,'#3c3026',1200);
      this.modalText(panel,960,650,__dialogueText("scenes/MargeHRScene.js", "t_f22b7e9b838275e2c842"),25,'#71583c',1200);
      this.modalButton(panel,960,840,'BACK',()=>this.closeModal());this.refreshScene();return;
    }
    const answers={...state.answers};const options=[];
    const redraw=()=>options.forEach(({questionId,id,button})=>button.setBackgroundColor(answers[questionId]===id?'#705126':'#243a2d'));
    DATA.questions.forEach((question,index)=>{
      const y=280+index*245;
      this.modalText(panel,960,y,question.prompt,29);
      question.options.forEach((option,j)=>{
        const button=this.modalButton(panel,960,y+57+j*55,option.label,()=>{
          answers[question.id]=option.id;redraw();
          if(this.preview)this.local.answers={...answers};else saveMargeBirthdayAnswers(answers);
        },1190);
        options.push({questionId:question.id,id:option.id,button});
      });
    });
    const resultText=this.modalText(panel,960,777,`${__dialogueText("scenes/MargeHRScene.js", "t_087e7ee00d984c14d414")}${state.clues.length}${__dialogueText("scenes/MargeHRScene.js", "t_005e1574a2b5c8163046")}${DATA.clues.length}`,22,'#71583c',1320);
    this.modalButton(panel,720,866,__dialogueText("scenes/MargeHRScene.js", "t_3e5380953dd3ebd0ca3d"),()=>{
      const current=this.state();
      const result=this.preview?evaluateMargeBirthday(DATA,current.clues,answers):submitMargeBirthdayDeduction(answers);
      const ok=result.ok===true||result.success===true;
      if(ok){
        if(this.preview){this.local.completed=true;this.local.answers={...answers};}
        this.finished=true;this.closeModal();this.openDeduction();
        if(!this.preview)this.emitBus('mainStory:margeBirthdayDiscovered',{npcId:DATA.npcId});
      }else resultText.setText(result.message||__dialogueText("scenes/MargeHRScene.js", "t_b46b8c710c2238d170f3"));
    });
    this.modalButton(panel,1240,866,'BACK',()=>this.closeModal());
    redraw();this.refreshScene();
  }
  getForensicHelp(){
    const state=this.state(),instructions=__dialogueText("scenes/MargeHRScene.js", "t_8f6e83b347a7ab115024");
    if(!state.refused)return{id:'speak_to_marge',instructions,text:DATA.hints[0],targets:[this.hotspots.find(item=>item.def.id==='marge')?.zone].filter(Boolean)};
    const next=DATA.clues.find(clue=>!state.clues.includes(clue.id));
    if(next)return{id:`inspect_${next.id}`,instructions,text:`${__dialogueText("scenes/MargeHRScene.js", "t_137aaa51a676ee7ed407")}${next.label}${__dialogueText("scenes/MargeHRScene.js", "t_8dccf256f6d5783e62bb")}${DATA.hints[1]}`,targets:[this.hotspots.find(item=>item.def.id===next.id)?.zone].filter(Boolean)};
    return{id:'birthday_deduction',instructions,text:DATA.hints[2],targets:[this.deductionButton]};
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1920,height/1080);this.root.setScale(s).setPosition((width-1920*s)/2,(height-1080*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
  }
  closeHR(){
    if(this.closing)return;this.closing=true;this.help?.close();
    const callback=this.onFinished;this.onFinished=null;const result={completed:this.state().completed,preview:this.preview};this.restoreBackground();
    try{callback?.(result);}finally{this.scene.stop();}
  }
}
