import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { BaseScene } from '../BaseScene.js';

const text=key=>__dialogueText('scenes/CSI/BaseForensicMinigame.js',key);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

export class BaseForensicMinigame extends BaseScene {
  constructor(sceneKey='BaseForensicMinigame') {
    super(sceneKey);
    this.evidenceType='generic';this.correctValue=null;this.evidenceConfig={};
    this.clueType='forensic';this.clueText='';this.cityId=null;this.caseKey=null;
    this.onComplete=null;this.onAbort=null;this.gameState=null;this.stationId=null;
    this.score=100;this.maxScore=120;this.mistakes=0;this.resolved=false;this.selectedValue=null;
    this.optionButtons=[];this.stageObjects=[];this.progressNodes=[];this.currentStep=0;this.totalSteps=3;
    this.timerEvent=null;this.secondsElapsed=0;
    for(const key of ['titleText','subtitleText','instructionsText','instructionsBg','dialogueText','dialogueBg','scoreText','timerText','progressGroup','hudBg','playArea','playAreaBg','exitButton'])this[key]=null;
    this._forensicCleanupDone=false;this._minigameClosing=false;
    this._choiceButtonContext=null;this._optionSequence=0;this._forensicRunToken=null;
  }
  init(data={}) {
    this.evidenceConfig=data.evidenceConfig||{};
    this.evidenceType=data.evidenceType||this.evidenceConfig.evidenceType||'generic';
    this.correctValue=data.correctValue??this.evidenceConfig.correctValue??null;
    this.clueType=data.clueType||this.evidenceConfig.clueType||'forensic';
    this.clueText=data.clueText||this.evidenceConfig.clueText||'';
    this.cityId=data.cityId??null;this.caseKey=data.caseKey??null;
    this.onComplete=typeof data.onComplete==='function'?data.onComplete:null;
    this.onAbort=typeof data.onAbort==='function'?data.onAbort:null;
    this.gameState=data.gameState||null;this.stationId=data.stationId??null;
    this.score=data.startScore??100;this.maxScore=data.maxScore??120;this.mistakes=0;
    this.resolved=false;this.selectedValue=null;
    this.optionButtons=[];this.stageObjects=[];this.progressNodes=[];this.currentStep=0;this.totalSteps=data.totalSteps??3;
    this.secondsElapsed=0;this.timerEvent=null;
    this.hudBg=null;this.instructionsBg=null;this.dialogueBg=null;this.exitButton=null;
    this._forensicCleanupDone=false;this._minigameClosing=false;
    this._choiceButtonContext=null;this._optionSequence=0;this._forensicRunToken=Symbol('forensic-run');
  }
  create() {
    super.create();this._forensicCleanupDone=false;
    this.createBackdrop();this.createHeader();this.createFrame();this.createFooter();
    this.createExitButton();this.startTimer();this.startEvidenceFlow();
  }
  createExitButton() {
    const {width}=this.scale;
    this.exitButton=this.add.text(width-24,18,'X',{fontFamily:'PressStart2P',fontSize:'12px',color:'#ff6666',backgroundColor:'#200808',padding:{left:6,right:6,top:4,bottom:4}})
      .setOrigin(1,0).setScrollFactor(0).setDepth(999).setInteractive({useHandCursor:true});
    this.exitButton.on('pointerover',()=>this.exitButton?.setStyle({color:'#ffaaaa'}));
    this.exitButton.on('pointerout',()=>this.exitButton?.setStyle({color:'#ff6666'}));
    this.exitButton.on('pointerdown',()=>this.abortMinigame());
  }
  getCloseEnvelope(payload,aborted) {
    return {schemaVersion:1,aborted,completed:!aborted&&payload.completed===true,payload};
  }
  notifySafely(name,payload) {
    try { this.events.emit(name,payload); }
    catch(error) { console.error('[BaseForensicMinigame] Event listener failed:',name,error); }
  }
  invokeResultCallback(callback,payload) {
    if(typeof callback!=='function')return;
    try { callback(payload); }
    catch(error) { console.error('[BaseForensicMinigame] Result callback failed:',error); }
  }
  abortMinigame() {
    if(this.resolved||this._minigameClosing)return;
    this._minigameClosing=true;this.timerEvent?.remove(false);this.timerEvent=null;
    // Cancellation does not need to broadcast the answer or the secret config.
    const payload={aborted:true,completed:false,stationId:this.stationId,cityId:this.cityId,caseKey:this.caseKey,
      evidenceType:this.evidenceType,score:this.score,mistakes:this.mistakes,secondsElapsed:this.secondsElapsed};
    try {
      this.invokeResultCallback(this.onAbort,payload);
      this.notifySafely('minigame-closed',this.getCloseEnvelope(payload,true));
    } finally { this.scene.stop(); }
  }
  createBackdrop() {
    const {width,height}=this.scale;
    this.add.rectangle(width/2,height/2,width,height,0x07110d,.96).setDepth(-10);
    for(let i=0;i<12;i++)this.add.rectangle(40+i*64,0,2,height,0x113225,.15).setOrigin(.5,0).setDepth(-9);
    this.add.rectangle(width/2,height/2,width-40,height-40,0x0d1713,.92).setStrokeStyle(2,0x39ff14,.45).setDepth(-8);
  }
  createHeader() {
    const {width}=this.scale;
    this.hudBg=this.add.rectangle(width/2,58,width,112,0x000000,.78).setOrigin(.5).setDepth(100);
    this.titleText=this.add.text(28,24,this.getTitle(),{fontFamily:'PressStart2P',fontSize:'14px',color:'#39ff14'}).setOrigin(0,.5).setDepth(110);
    this.subtitleText=this.add.text(28,46,this.getSubtitle(),{fontFamily:'SpecialElite',fontSize:'17px',color:'#d5e6dc'}).setOrigin(0,.5).setDepth(110);
    this.instructionsBg=this.add.rectangle(28,78,width-250,38,0x07110d,.97).setOrigin(0,.5).setDepth(109);
    this.instructionsText=this.add.text(38,78,'',{fontFamily:'SpecialElite',fontSize:'15px',color:'#ffe8a3',align:'left',wordWrap:{width:width-275}}).setOrigin(0,.5).setDepth(110);
    this.progressGroup=this.add.container(0,0).setDepth(110);
    const startX=width/2-((this.totalSteps-1)*90)/2;
    for(let i=0;i<this.totalSteps;i++){
      const circle=this.add.circle(startX+i*90,116,12,0x20362c,1).setStrokeStyle(2,0x5f8f78);
      const label=this.add.text(circle.x,circle.y,String(i+1),{fontFamily:'PressStart2P',fontSize:'10px',color:'#b8cfc2'}).setOrigin(.5);
      this.progressNodes.push({circle,label});this.progressGroup.add([circle,label]);
      if(i<this.totalSteps-1)this.progressGroup.add(this.add.rectangle(startX+45+i*90,116,50,3,0x375c4b,1));
    }
    this.setStep(0);
  }
  createFrame() {
    const {width,height}=this.scale;
    this.playArea=this.add.container(0,0).setDepth(-1);
    this.playAreaBg=this.add.rectangle(width/2,320,700,300,0x122019,.95).setStrokeStyle(2,0x5da17f,.7);
    this.playArea.add(this.playAreaBg);
    this.dialogueBg=this.add.rectangle(width/2,height-92,width-100,66,0x07110d,.97).setOrigin(.5).setStrokeStyle(2,0x39ff14,.8).setDepth(120);
    this.dialogueText=this.add.text(width/2,height-92,'',{fontFamily:'SpecialElite',fontSize:'18px',color:'#f3f3f3',align:'center',wordWrap:{width:width-140}}).setOrigin(.5).setDepth(121);
  }
  createFooter() {
    const {width,height}=this.scale;
    const style={fontFamily:'PressStart2P',fontSize:'10px',color:'#ffcc00',backgroundColor:'#07110d',padding:{left:6,right:6,top:4,bottom:4}};
    this.scoreText=this.add.text(40,height-36,text('t_e50a13857c6ce3f1da58'),style).setDepth(130);
    this.timerText=this.add.text(width-40,height-36,'Time: 00',style).setOrigin(1,0).setDepth(130);
    this.setScore(this.score);
  }
  startTimer() {
    this.timerEvent=this.time.addEvent({delay:1000,loop:true,callback:()=>{
      this.secondsElapsed+=1;
      this.timerText?.setText(`${text('t_ae366f54a2519da16b6f')}${String(this.secondsElapsed).padStart(2,text('t_5feceb66ffc86f38d952'))}`);
    }});
  }
  startEvidenceFlow() {
    if(typeof this.createEvidenceFlow==='function'){this.createEvidenceFlow();return;}
    this.setInstructions(text('t_1f90654651ab4953d1c2'));this.setDialogue(text('t_37767c0a0e3402ffbdc5'));
  }
  clearStage() {
    this.destroyOptionButtons();
    this.stageObjects.forEach(object=>{object?.removeAllListeners?.();object?.destroy?.();});this.stageObjects=[];
  }
  destroyOptionButtons() {
    this.optionButtons.forEach(button=>{button?.bg?.removeAllListeners?.();button?.destroy?.();});
    this.optionButtons=[];this._choiceButtonContext=null;
  }
  addStageObject(object){if(object)this.stageObjects.push(object);return object;}
  setStep(stepIndex) {
    this.currentStep=Phaser.Math.Clamp(stepIndex,0,this.totalSteps);
    this.progressNodes.forEach((node,index)=>{
      if(index<this.currentStep){node.circle.setFillStyle(0x2ea866,1);node.circle.setStrokeStyle(2,0x8df7b4,1);return;}
      if(index===this.currentStep&&this.currentStep<this.totalSteps){node.circle.setFillStyle(0x8d6f16,1);node.circle.setStrokeStyle(2,0xffcc00,1);return;}
      node.circle.setFillStyle(0x20362c,1);node.circle.setStrokeStyle(2,0x5f8f78,1);
    });
  }
  completeStep(){this.setStep(this.currentStep+1);}
  buildOptions(values,ensureValue){const unique=[...new Set(values)];if(ensureValue!=null&&!unique.includes(ensureValue))unique[0]=ensureValue;return Phaser.Utils.Array.Shuffle(unique);}
  setInstructions(value){this.instructionsText?.setText(value);}
  setDialogue(value){this.dialogueText?.setText(value);}
  setScore(score){this.score=Phaser.Math.Clamp(score,0,this.maxScore);this.scoreText?.setText(`${text('t_c758dd2ae5d2cfa7b0aa')}${this.score}`);}
  penalize(amount=10){this.mistakes+=1;this.setScore(this.score-amount);}
  reward(amount=0){this.setScore(this.score+amount);}
  applyTimeBonus(){const bonus=this.secondsElapsed<=15?20:this.secondsElapsed<=30?10:0;if(bonus>0)this.reward(bonus);return bonus;}
  createButton(x,y,w,h,label,onClick,opts={}) {
    const bgColor=opts.bgColor??0x22382e,borderColor=opts.borderColor??0x7cc89f;
    const container=this.add.container(x,y).setDepth(opts.depth??150);
    const bg=this.add.rectangle(0,0,w,h,bgColor,1).setStrokeStyle(2,borderColor,1);
    const labelText=this.add.text(0,0,label,{fontFamily:opts.fontFamily||'SpecialElite',fontSize:opts.fontSize||'18px',color:opts.textColor??'#ffffff',align:'center',wordWrap:{width:w-16}}).setOrigin(.5);
    container.add([bg,labelText]);container.bg=bg;container.text=labelText;
    container.optionId=opts.optionId??`option_${this._optionSequence++}`;
    container.optionBaseColor=bgColor;container.optionFeedback=null;
    container.hasOptionValue=own(opts,'optionValue');
    if(container.hasOptionValue)container.optionValue=opts.optionValue;
    bg.setInteractive({useHandCursor:true});
    const canUse=()=>!this._minigameClosing&&(!this.resolved||opts.allowAfterResolve);
    bg.on('pointerover',()=>{if(canUse()&&!container.optionFeedback)bg.setFillStyle(0x335244,1);});
    bg.on('pointerout',()=>{if(!container.optionFeedback)bg.setFillStyle(bgColor,1);});
    bg.on('pointerdown',()=>{
      if(!canUse())return;
      const previous=this._choiceButtonContext;
      this._choiceButtonContext=container;
      try { onClick(container); }
      finally { this._choiceButtonContext=previous; }
    });
    this.optionButtons.push(container);return container;
  }
  // New callers may explicitly associate a value. Existing synchronous choice
  // callbacks are associated automatically by resolveChoice().
  createChoiceButton(x,y,w,h,label,value,onClick,opts={}) {
    return this.createButton(x,y,w,h,label,onClick,{...opts,optionValue:value});
  }
  getChoiceButtons(value) {
    return this.optionButtons.filter(button=>button.hasOptionValue&&Object.is(button.optionValue,value));
  }
  createLampTag(value) {
    return this.addStageObject(this.add.text(400,170,value,{fontFamily:'SpecialElite',fontSize:'20px',color:'#0a0a0a',backgroundColor:'#d8c58c',padding:{left:12,right:12,top:8,bottom:8}}).setOrigin(.5));
  }
  resolveChoice(value,isCorrect,penalty=10) {
    if(this.resolved||this._minigameClosing)return;
    const clicked=this._choiceButtonContext;
    if(clicked&&this.optionButtons.includes(clicked)){
      clicked.optionValue=value;clicked.hasOptionValue=true;
    }
    if(!isCorrect){this.penalize(penalty);this.flashWrongSelection(value);this.onWrongChoice(value);return;}
    this.resolved=true;this.selectedValue=value;this.timerEvent?.remove(false);this.timerEvent=null;
    const bonus=this.applyTimeBonus();this.onCorrectChoice(value);this.setDialogue(this.getSuccessMessage(value,bonus));
    const {width,height}=this.scale;
    return this.createButton(width/2,height-148,310,52,text('t_d8c6f6bc46d3b7948ad7'),()=>this.finishMinigame(),{
      fontFamily:'PressStart2P',fontSize:'11px',bgColor:0x18452d,borderColor:0x77ffb0,allowAfterResolve:true,depth:150});
  }
  onWrongChoice(){this.setDialogue(`${text('t_9c3db31b7b9b0c337ece')}${this.getRetryHint()}`);}
  onCorrectChoice(value) {
    const chosen=new Set(this.getChoiceButtons(value));
    for(const button of this.optionButtons){
      if(chosen.has(button)){
        button.optionFeedback='correct';button._wrongFlashToken=null;
        button.bg.setFillStyle(0x176136,1);button.bg.setStrokeStyle(2,0x77ffb0,1);
      }
      button.bg.disableInteractive();
    }
  }
  flashWrongSelection(value) {
    const run=this._forensicRunToken;
    for(const button of this.getChoiceButtons(value)){
      const token=Symbol('wrong-flash');button._wrongFlashToken=token;button.optionFeedback='wrong';
      button.bg.setFillStyle(0x6b1f1f,1);
      this.time.delayedCall(220,()=>{
        if(this._forensicRunToken!==run||button._wrongFlashToken!==token||!button?.bg?.scene||this.resolved||this._minigameClosing)return;
        button.optionFeedback=null;button._wrongFlashToken=null;button.bg.setFillStyle(button.optionBaseColor,1);
      });
    }
  }
  getResultPayload() {
    return {aborted:false,completed:this.resolved,stationId:this.stationId,cityId:this.cityId,caseKey:this.caseKey,
      evidenceConfig:this.evidenceConfig,evidenceType:this.evidenceType,correctValue:this.correctValue,clueType:this.clueType,clueText:this.clueText,
      value:this.selectedValue,selectedValue:this.selectedValue,score:this.score,mistakes:this.mistakes,secondsElapsed:this.secondsElapsed};
  }
  finishMinigame() {
    if(!this.resolved||this._minigameClosing)return;
    this._minigameClosing=true;
    const payload=this.getResultPayload();
    try {
      this.invokeResultCallback(this.onComplete,payload);
      this.notifySafely('minigame-complete',payload);
      this.notifySafely('minigame-closed',this.getCloseEnvelope(payload,false));
    } finally { this.scene.stop(); }
  }
  cleanup() {
    if(this._forensicCleanupDone)return;
    this._forensicCleanupDone=true;this._minigameClosing=true;this._forensicRunToken=null;
    super.cleanup();this.timerEvent?.remove(false);this.timerEvent=null;
    this.destroyOptionButtons();
    this.stageObjects.forEach(object=>{object?.removeAllListeners?.();object?.destroy?.();});this.stageObjects=[];
    this.exitButton?.removeAllListeners?.();this.exitButton?.destroy?.();this.exitButton=null;
    for(const key of ['hudBg','instructionsBg','dialogueBg','progressGroup','titleText','subtitleText','instructionsText','dialogueText','scoreText','timerText']){
      this[key]?.destroy?.();this[key]=null;
    }
    this.playArea?.destroy?.();this.playArea=null;this.playAreaBg=null;this.progressNodes=[];
    this.onComplete=null;this.onAbort=null;
  }
  getTitle(){return text('t_963463549c0c4ab6c8b2');}
  getSubtitle(){return text('t_e349c339faad014cb48f');}
  getRetryHint(){return text('t_c6a85b8433df4749c7fa');}
  getSuccessMessage(value,timeBonus=0){
    const bonusText=timeBonus>0?`${text('t_28832618483a10e804ba')}${timeBonus}${text('t_d317b64a5b36e260196b')}`:'';
    return `${text('t_e813f248c62c5e3c3bcb')}${this.toDisplayText(value).toUpperCase()}${text('t_8dccf256f6d5783e62bb')}${text('t_58cc04138f9dca8276ce')}${bonusText}`;
  }
  toDisplayText(value){if(value==null)return text('t_b764cdc0eab713746721');if(typeof value!=='string')return String(value);return value.split('_').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}
  getSexDisplay(value){return {M:text('t_03f8c1273e3da99bb315'),F:text('t_e8cca808ae5aaa03a7fc'),NB:'Non-binary'}[value]||value;}
}
