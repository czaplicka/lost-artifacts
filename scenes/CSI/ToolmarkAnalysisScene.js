import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';
import { getDustProfile } from '../../suspects/DustEvidence.js';
import { toolmarkText } from './ToolmarkAnalysisText.js';
const BAR=41,ZONE=7;
const text=key=>__dialogueText('scenes/CSI/ToolmarkAnalysisScene.js',key);
const editable=event=>Boolean(event?.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
// Legacy key: a focus puzzle for handedness and microscopic residue, not tools.
export class ToolmarkAnalysisScene extends BaseScene {
  constructor(){
    super('ToolmarkAnalysisScene');this._toolmarkSession=0;this._toolmarkDisposed=true;
    this.term=this.mover=this.barText=this.statusText=this.focusButton=this.exitButton=null;
    this._spaceHandler=this._escapeHandler=this._scrollTarget=this._preventSpaceScroll=null;
  }
  init(data={}){
    this.detachFocusInput();this.detachExitInput();
    const config=data.evidenceConfig||{};
    this.stationId=data.stationId||config.stationId||'trace_0';
    this.evidenceType=data.evidenceType||config.evidenceType||config.attribute||'handedness';
    this.caseKey=data.caseKey??null;this.cityId=data.cityId??null;
    this.correctValue=null;this.evidenceConfig=null;this.clue=null;this._validationError=null;
    this.term=this.mover=this.barText=this.statusText=this.focusButton=this.exitButton=null;
    this.score=data.startScore??100;this.mistakes=0;this.startedAt=0;this.completedSeconds=null;
    this.locks=0;this.pos=0;this.dir=1;this.speed=55;this.zoneStart=Phaser.Math.Between(4,BAR-ZONE-4);
    this.finished=false;this.returningToLab=false;this._busy=false;this._toolmarkDisposed=true;this._toolmarkSession+=1;
    const raw=data.correctValue??config.correctValue??config.thief_value;
    try{
      if(this.evidenceType==='handedness'){
        const value=String(raw??'').trim().toLowerCase().replace(/[-_ ]handed$/,'');
        if(value==='ambidextrous'){
          const error=Error('Ambidextrous suspects require assigned material evidence, not a single-hand contact trace.');error.code='AMBIDEXTROUS_REQUIRES_MATERIAL';throw error;
        }
        if(!['left','right'].includes(value))throw Error('Handedness analysis needs left or right.');
        this.correctValue=value;this.reportLabel=`${value.toUpperCase()}${text('t_56f6aef6cc390505e613')}`;
        this.reportText=`${text('t_14c8326381834af9aa9e')}${value}${text('t_beffbd1acb69f6af9849')}`;this.reportComposition=null;
      }else if(this.evidenceType==='dust_profile'){
        const profile=getDustProfile(raw);if(!profile)throw Error('Missing dust profile.');
        this.correctValue=profile.id;this.reportLabel=profile.label.toUpperCase();this.reportText=profile.report;this.reportComposition=profile.composition;
      }else throw Error(`Unsupported focus analysis: ${this.evidenceType}. This scene does not invent tool profiles.`);
      const declared=[data.correctValue,config.correctValue,config.thief_value,config.value,config.normalizedValue].filter(value=>value!=null);
      for(const rawValue of declared){
        const normalized=this.evidenceType==='handedness'?String(rawValue).trim().toLowerCase().replace(/[-_ ]handed$/,''):getDustProfile(rawValue)?.id;
        if(normalized!==this.correctValue)throw Error('Conflicting values in focus evidence configuration.');
      }
      this.evidenceConfig={...config,evidenceType:this.evidenceType,attribute:this.evidenceType,correctValue:this.correctValue,thief_value:this.correctValue,
        label:this.evidenceType==='dust_profile'?text('t_8a1b0a09e53e7085462e'):text('t_89b130892214bc79b436'),clueType:data.clueType||config.clueType||'trace',
        clueText:this.evidenceType==='dust_profile'?[this.reportText,config.sourceText].filter(Boolean).join(' '):this.reportText};
      this.clue={id:config.id||`${this.evidenceType}_${this.correctValue}`,type:this.evidenceConfig.clueType,text:this.evidenceConfig.clueText,
        facts:this.evidenceType==='dust_profile'?{profile:this.correctValue,composition:this.reportComposition}:{hand:this.correctValue}};
    }catch(error){
      console.error('[ToolmarkAnalysisScene] Invalid evidence:',error);
      this._validationError={code:error.code||'INVALID_FOCUS_EVIDENCE'};this.correctValue=null;this.evidenceConfig=null;this.clue=null;
    }
  }
  create(){
    super.create();this._toolmarkDisposed=false;this._toolmarkSession+=1;this.startedAt=this.time.now;
    this.term=new LabTerminal(this,{title:this.evidenceType==='dust_profile'?text('t_945a8f18e98bb0ac274b'):text('t_39fefd4c1d0af584ad14'),maxLines:10});
    this.createExitControl();
    if(this._validationError){void this.term.print(toolmarkText(this._validationError.code==='AMBIDEXTROUS_REQUIRES_MATERIAL'?'ambidextrousSample':'invalidSample'),{color:TERM.red});return;}
    void this.showIntro();
  }
  createExitControl(){
    const terminal=this.term,session=this._toolmarkSession;
    this.exitButton=this.add.text(terminal.x+terminal.w-10,terminal.y+17,toolmarkText('exit'),{
      fontFamily:'PressStart2P',fontSize:'9px',color:TERM.amber,backgroundColor:'#07110d',padding:{x:6,y:6}
    }).setOrigin(1,.5).setDepth(10000).setInteractive({useHandCursor:true});
    this.exitButton.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(this.isCurrentSession(session,terminal))this.abortMinigame();});
    if(this.input.keyboard){
      this._escapeHandler=event=>{if(editable(event)||event?.repeat||!this.isCurrentSession(session,terminal))return;event?.preventDefault?.();this.abortMinigame();};
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',this._escapeHandler,this);
    }
  }
  isCurrentSession(session,terminal=this.term){return !this._toolmarkDisposed&&!this._cleanupDone&&!this.returningToLab&&session===this._toolmarkSession&&terminal===this.term&&Boolean(terminal)&&!terminal.destroyed;}
  async terminalAction(session,terminal,action){if(!this.isCurrentSession(session,terminal))return false;const result=await action();return result!==false&&this.isCurrentSession(session,terminal);}
  async printLines(session,terminal,lines){for(const[line,options={}]of lines)if(!await this.terminalAction(session,terminal,()=>terminal.print(line,options)))return false;return true;}
  async showIntro(){
    const t=this.term,s=this._toolmarkSession;
    const lines=[[this.evidenceType==='dust_profile'?'> SAMPLE LOADED: recovered microscopic residue.':'> SAMPLE LOADED: recovered contact pattern.'],
      ['> MAGNIFICATION: unstable. probably haunted.'],['> LOCK FOCUS WHEN # IS INSIDE THE <===> ZONE.'],['> PRESS SPACE OR TAP [LOCK FOCUS].'],['> THREE CLEAN SCANS REQUIRED.',{color:TERM.amber}]];
    if(await this.printLines(s,t,lines))this.startFocusGame();
  }
  startFocusGame(){
    const t=this.term;if(!this.isCurrentSession(this._toolmarkSession,t)||this.finished||this.mover||this._validationError)return;
    this.barText=this.add.text(t.x+16,t.y+t.h-170,'',{fontFamily:'"Courier New"',fontSize:'24px',color:TERM.green});
    this.statusText=this.add.text(t.x+16,t.y+t.h-128,'',{fontFamily:'PressStart2P',fontSize:'10px',color:TERM.amber});
    this.focusButton=this.add.text(t.x+t.w/2,t.y+t.h-64,'[ LOCK FOCUS ]',{fontFamily:'PressStart2P',fontSize:'11px',color:TERM.green,backgroundColor:'#07110d',padding:{x:14,y:12}}).setOrigin(.5).setInteractive({useHandCursor:true});
    const session=this._toolmarkSession;
    this.focusButton.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(this.isCurrentSession(session))void this.tryFocusLock();});
    this.renderFocusBar();this.startMover();this.attachFocusInput();
  }
  attachFocusInput(){
    const keyboard=this.input.keyboard;if(!keyboard||this._spaceHandler)return;
    const session=this._toolmarkSession;
    this._spaceHandler=event=>{
      if(editable(event)||!this.isCurrentSession(session)||this.finished||keyboard.enabled===false||this.input.enabled===false)return;
      event?.preventDefault?.();if(event?.repeat)return;
      void this.tryFocusLock();
    };
    this.trackInputEvent(keyboard,'keydown-SPACE',this._spaceHandler,this);
    // Native capture prevents the browser default synchronously, before Phaser
    // processes its queued input. It does not modify global keyboard captures.
    const target=keyboard.manager?.target??(typeof window!=='undefined'?window:null);
    if(target?.addEventListener){
      this._scrollTarget=target;
      this._preventSpaceScroll=event=>{
        if((event.code==='Space'||event.key===' '||event.keyCode===32)&&!editable(event)&&this.isCurrentSession(session)&&!this.finished&&this.sys.isActive()&&keyboard.enabled!==false&&this.input.enabled!==false)event.preventDefault();
      };
      target.addEventListener('keydown',this._preventSpaceScroll,{capture:true,passive:false});
    }
  }
  detachFocusInput(){
    if(this._spaceHandler&&this.input?.keyboard)this.offTrackedInputEvent(this.input.keyboard,'keydown-SPACE',this._spaceHandler,this);
    if(this._scrollTarget&&this._preventSpaceScroll)this._scrollTarget.removeEventListener('keydown',this._preventSpaceScroll,true);
    this._spaceHandler=this._preventSpaceScroll=this._scrollTarget=null;
  }
  detachExitInput(){if(this._escapeHandler&&this.input?.keyboard)this.offTrackedInputEvent(this.input.keyboard,'keydown-ESC',this._escapeHandler,this);this._escapeHandler=null;}
  stopMover(){this.mover?.remove(false);this.mover=null;}
  startMover(){
    this.stopMover();if(this._toolmarkDisposed||this.finished||this.returningToLab)return;
    const session=this._toolmarkSession;
    this.mover=this.time.addEvent({delay:this.speed,loop:true,callback:()=>{if(this.isCurrentSession(session))this.tickFocus();}});
  }
  tickFocus(){
    if(this._toolmarkDisposed||this.finished||this.returningToLab)return;
    this.pos+=this.dir;if(this.pos<=0){this.pos=0;this.dir=1;}else if(this.pos>=BAR-1){this.pos=BAR-1;this.dir=-1;}this.renderFocusBar();
  }
  renderFocusBar(){
    if(this._toolmarkDisposed||!this.barText?.scene||!this.statusText?.scene)return;
    const chars=new Array(BAR).fill('-');for(let i=this.zoneStart;i<this.zoneStart+ZONE;i++)chars[i]='=';
    chars[this.zoneStart]='<';chars[this.zoneStart+ZONE-1]='>';chars[this.pos]='#';this.barText.setText(chars.join(''));
    this.statusText.setText(`${text('t_05dc96d9a13364c0bb10')}${this.locks}${text('t_9aa0a4f13deef6019ce9')}${this.score}`);
    this.barText.setScale(Math.min(1,Math.min(this.term.w-32,this.scale.width-32)/Math.max(1,this.barText.width)));
  }
  async tryFocusLock(){
    const t=this.term,s=this._toolmarkSession;
    if(this._busy||this.finished||this.locks>=3||this._validationError||!this.isCurrentSession(s,t))return;
    this._busy=true;
    try{
      if(this.pos<this.zoneStart||this.pos>=this.zoneStart+ZONE){this.registerMistake();await this.terminalAction(s,t,()=>t.print('> FOCUS LOST. approximately one blur identified. (-15 PTS)',{color:TERM.red}));return;}
      this.locks++;this.renderFocusBar();t.blip(1200,.09);
      if(!await this.terminalAction(s,t,()=>t.print(`> SCAN ${this.locks}${text('t_b522c6468543b5591efc')}`)))return;
      if(this.locks>=3){await this.finishAnalysis();return;}
      this.zoneStart=Phaser.Math.Between(4,BAR-ZONE-4);this.increaseSpeed();this.renderFocusBar();
    }finally{if(this.isCurrentSession(s,t))this._busy=false;}
  }
  registerMistake(){if(this._toolmarkDisposed||this.finished||this.returningToLab)return;this.mistakes++;this.score=Math.max(0,this.score-15);this.term?.blip(140,.15,'sawtooth');this.renderFocusBar();}
  increaseSpeed(){this.speed=Math.max(25,this.speed-10);this.startMover();}
  getSecondsElapsed(){return this.completedSeconds??Math.max(0,Math.floor((this.time.now-this.startedAt)/1000));}
  getTimeBonus(){const seconds=this.getSecondsElapsed();return seconds<=15?20:seconds<=30?10:0;}
  async finishAnalysis(){
    const t=this.term,s=this._toolmarkSession;if(this.finished||this._validationError||!this.isCurrentSession(s,t))return;
    this.completedSeconds=this.getSecondsElapsed();this.finished=true;this.stopMover();this.detachFocusInput();
    this.barText?.setVisible(false);this.statusText?.setVisible(false);this.focusButton?.disableInteractive();this.focusButton?.setVisible(false);
    const bonus=this.getTimeBonus();this.score=Math.min(120,this.score+bonus);
    if(!await this.terminalAction(s,t,()=>t.progress(this.evidenceType==='dust_profile'?text('t_318430aa40b8c46bcdfa'):text('t_c5507035c477a11ab634'),1600)))return;
    const lines=[['> LABORATORY REPORT'],[`> RESULT: ${this.reportLabel}${text('t_cdb4ee2aea69cc6a8333')}`],[`> ${this.reportText}`]];
    if(this.evidenceType==='dust_profile'&&this.evidenceConfig.sourceText)lines.push([`> ${this.evidenceConfig.sourceText}`]);
    lines.push(['> SCIENCE HAS DONE ITS PART. YOUR EYEBROW MAY NOW RISE.',{color:TERM.amber}]);
    if(bonus>0)lines.push([`> SPEED BONUS: +${bonus}${text('t_eeb98a5625408b801794')}`,{color:TERM.amber}]);
    lines.push(['> CLUE READY FOR CASE FILE.',{color:TERM.amber}]);if(!await this.printLines(s,t,lines))return;
    t.button(text('t_d8c6f6bc46d3b7948ad7'),TERM.green,()=>{if(this.isCurrentSession(s,t))this.returnResultToCrimeLab();});
  }
  getResultPayload(){
    if(!this.finished||this._validationError||!this.evidenceConfig||!this.clue)throw Error('ToolmarkAnalysisScene: no completed, validated focus result.');
    // The evidence service verifies value against the assigned station config
    // and adds legacy aliases, labels, source metadata and valuation there.
    return {aborted:false,completed:true,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId,evidenceType:this.evidenceType,
      value:this.correctValue,score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed(),
      clue:{...this.clue,facts:{...this.clue.facts}}};
  }
  returnResultToCrimeLab(){if(this.returningToLab||this._toolmarkDisposed||!this.finished||this._validationError)return;this.closeAnalysis(false,this.getResultPayload());}
  abortMinigame(){
    if(this.returningToLab||this._toolmarkDisposed)return;
    const payload={aborted:true,completed:false,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId};
    if(this._validationError)payload.errorCode=this._validationError.code;
    this.closeAnalysis(true,payload);
  }
  closeAnalysis(aborted,payload){
    if(this.returningToLab||this._toolmarkDisposed)return;
    this.returningToLab=true;this._busy=false;this.stopMover();this.detachFocusInput();this.detachExitInput();this.exitButton?.disableInteractive();this.focusButton?.disableInteractive();
    this.term?.destroy();
    try{if(!aborted)this.events.emit('minigame-complete',payload);}
    finally{
      try{this.events.emit('minigame-closed',{schemaVersion:1,aborted,completed:!aborted,payload});}
      finally{this.scene.stop();}
    }
  }
  cleanup(){
    this._toolmarkDisposed=true;this._toolmarkSession++;this.returningToLab=true;this._busy=false;
    const terminal=this.term;this.term=null;
    try{this.stopMover();this.detachFocusInput();this.detachExitInput();terminal?.destroy();}
    finally{
      super.cleanup();
      for(const key of ['barText','statusText','focusButton','exitButton']){this[key]?.removeAllListeners?.();this[key]?.destroy();this[key]=null;}
    }
  }
}
