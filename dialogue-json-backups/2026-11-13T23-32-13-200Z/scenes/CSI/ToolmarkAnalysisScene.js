import {BaseScene} from '../BaseScene.js';
import {LabTerminal,TERM} from './LabTerminal.js';
import {getDustProfile} from '../../suspects/DustEvidence.js';
const BAR=41,ZONE=7;
// Legacy scene key retained: both handedness and microtraces reuse the focus game.
export class ToolmarkAnalysisScene extends BaseScene {
  constructor(){
    super('ToolmarkAnalysisScene');
    this._toolmarkSession=0;this._toolmarkDisposed=true;
    this.term=null;this.mover=null;this.barText=null;this.statusText=null;this.focusButton=null;
  }
  init(data={}){
    const config=data.evidenceConfig||{};
    this.stationId=data.stationId||config.stationId||'trace_0';
    this.evidenceType=data.evidenceType||config.evidenceType||config.attribute||'handedness';
    const raw=data.correctValue??config.correctValue??config.thief_value;
    if(this.evidenceType==='handedness'){
      const value=String(raw??'').trim().toLowerCase().replace(/[-_ ]handed$/,'');
      if(!['left','right'].includes(value))throw new Error('Handedness analysis needs left or right.');
      this.correctValue=value;this.reportLabel=`${value.toUpperCase()}-HANDED USE`;
      this.reportText=`The contact pattern indicates ${value}-handed use.`;
      this.reportComposition=null;
    }else if(this.evidenceType==='dust_profile'){
      const profile=getDustProfile(raw);this.correctValue=profile.id;
      this.reportLabel=profile.label.toUpperCase();this.reportText=profile.report;this.reportComposition=profile.composition;
    }else{
      throw new Error(`Unsupported focus analysis: ${this.evidenceType}. This scene no longer invents a tool profile.`);
    }
    this.caseKey=data.caseKey??null;this.cityId=data.cityId??null;
    this.evidenceConfig={...config,evidenceType:this.evidenceType,attribute:this.evidenceType,
      correctValue:this.correctValue,thief_value:this.correctValue,
      label:this.evidenceType==='dust_profile'?'Microtrace Analysis':'Handedness Analysis',
      clueType:data.clueType||config.clueType||'trace',
      clueText:this.evidenceType==='dust_profile'
        ? [this.reportText,config.sourceText].filter(Boolean).join(' ')
        : this.reportText};
    this.clue={id:config.id||`${this.evidenceType}_${this.correctValue}`,type:this.evidenceConfig.clueType,
      text:this.evidenceConfig.clueText,facts:this.evidenceType==='dust_profile'
        ? {profile:this.correctValue,composition:this.reportComposition}:{hand:this.correctValue}};
    this.term=null;this.mover=null;this.barText=null;this.statusText=null;this.focusButton=null;
    this.score=data.startScore??100;this.mistakes=0;this.startedAt=0;this.completedSeconds=null;
    this.locks=0;this.pos=0;this.dir=1;this.speed=55;this.zoneStart=Phaser.Math.Between(4,BAR-ZONE-4);
    this.finished=false;this.returningToLab=false;this._busy=false;
    this._toolmarkDisposed=true;this._toolmarkSession+=1;
  }
  create(){
    super.create();this._toolmarkDisposed=false;this._toolmarkSession+=1;this.startedAt=this.time.now;
    this.term=new LabTerminal(this,{title:this.evidenceType==='dust_profile'
      ? 'MARK AGENCY // MICROTRACE SCANNER MS-12':'MARK AGENCY // CONTACT PATTERN SCANNER',maxLines:10});
    this.showIntro();
  }
  isCurrentSession(session,terminal=this.term){
    return !this._toolmarkDisposed&&!this._cleanupDone&&!this.returningToLab&&session===this._toolmarkSession&&terminal===this.term&&Boolean(terminal)&&!terminal.destroyed;
  }
  async terminalAction(session,terminal,action){
    if(!this.isCurrentSession(session,terminal))return false;
    const result=await action();return result!==false&&this.isCurrentSession(session,terminal);
  }
  async printLines(session,terminal,lines){
    for(const[text,options={}]of lines)if(!await this.terminalAction(session,terminal,()=>terminal.print(text,options)))return false;
    return true;
  }
  async showIntro(){
    const t=this.term,s=this._toolmarkSession;
    const lines=[
      [this.evidenceType==='dust_profile'?'> SAMPLE LOADED: recovered microscopic residue.' : '> SAMPLE LOADED: recovered contact pattern.'],
      ['> MAGNIFICATION: unstable. probably haunted.'],
      ['> LOCK FOCUS WHEN # IS INSIDE THE <===> ZONE.'],
      ['> PRESS SPACE OR TAP [LOCK FOCUS].'],
      ['> THREE CLEAN SCANS REQUIRED.',{color:TERM.amber}]
    ];
    if(await this.printLines(s,t,lines))this.startFocusGame();
  }
  startFocusGame(){
    const t=this.term;if(!this.isCurrentSession(this._toolmarkSession,t)||this.finished||this.mover)return;
    this.barText=this.add.text(t.x+16,t.y+t.h-170,'',{fontFamily:'"Courier New"',fontSize:'24px',color:TERM.green});
    this.statusText=this.add.text(t.x+16,t.y+t.h-128,'',{fontFamily:'PressStart2P',fontSize:'10px',color:TERM.amber});
    this.focusButton=this.add.text(t.x+t.w/2,t.y+t.h-64,'[ LOCK FOCUS ]',{
      fontFamily:'PressStart2P',fontSize:'11px',color:TERM.green,backgroundColor:'#07110d',padding:{x:14,y:12}
    }).setOrigin(.5).setInteractive({useHandCursor:true});
    const session=this._toolmarkSession;
    this.focusButton.on('pointerdown',(pointer,x,y,event)=>{event?.stopPropagation();if(this.isCurrentSession(session))this.tryFocusLock();});
    this.renderFocusBar();this.startMover();
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-SPACE',this.tryFocusLock,this);
  }
  stopMover(){this.mover?.remove(false);this.mover=null;}
  startMover(){
    this.stopMover();if(this._toolmarkDisposed||this.finished)return;
    const s=this._toolmarkSession;
    this.mover=this.time.addEvent({delay:this.speed,loop:true,callback:()=>{if(this.isCurrentSession(s))this.tickFocus();}});
  }
  detachFocusInput(){if(this.input?.keyboard)this.offTrackedInputEvent(this.input.keyboard,'keydown-SPACE',this.tryFocusLock,this);}
  tickFocus(){
    if(this._toolmarkDisposed||this.finished)return;
    this.pos+=this.dir;if(this.pos<=0){this.pos=0;this.dir=1;}else if(this.pos>=BAR-1){this.pos=BAR-1;this.dir=-1;}
    this.renderFocusBar();
  }
  renderFocusBar(){
    if(this._toolmarkDisposed||!this.barText?.scene||!this.statusText?.scene)return;
    const chars=new Array(BAR).fill('-');for(let i=this.zoneStart;i<this.zoneStart+ZONE;i++)chars[i]='=';
    chars[this.zoneStart]='<';chars[this.zoneStart+ZONE-1]='>';chars[this.pos]='#';
    this.barText.setText(chars.join(''));this.statusText.setText(`SCANS: ${this.locks}/3 | SCORE: ${this.score}`);
    const room=Math.min(this.term.w-32,this.scale.width-32);
    this.barText.setScale(Math.min(1,room/Math.max(1,this.barText.width)));
  }
  async tryFocusLock(){
    const t=this.term,s=this._toolmarkSession;
    if(this._busy||this.finished||this.locks>=3||!this.isCurrentSession(s,t))return;
    this._busy=true;
    try{
      const hit=this.pos>=this.zoneStart&&this.pos<this.zoneStart+ZONE;
      if(!hit){
        this.registerMistake();await this.terminalAction(s,t,()=>t.print('> FOCUS LOST. approximately one blur identified. (-15 PTS)',{color:TERM.red}));return;
      }
      this.locks++;this.renderFocusBar();t.blip(1200,.09);
      if(!await this.terminalAction(s,t,()=>t.print(`> SCAN ${this.locks}/3 LOCKED. THE MACHINE APPROVES.`)))return;
      if(this.locks>=3){await this.finishAnalysis();return;}
      this.zoneStart=Phaser.Math.Between(4,BAR-ZONE-4);this.increaseSpeed();this.renderFocusBar();
    }finally{if(this.isCurrentSession(s,t))this._busy=false;}
  }
  registerMistake(){if(this._toolmarkDisposed||this.finished)return;this.mistakes++;this.score=Math.max(0,this.score-15);this.term?.blip(140,.15,'sawtooth');this.renderFocusBar();}
  increaseSpeed(){this.speed=Math.max(25,this.speed-10);this.startMover();}
  getSecondsElapsed(){return this.completedSeconds??Math.floor((this.time.now-this.startedAt)/1000);}
  getTimeBonus(){const s=this.getSecondsElapsed();return s<=15?20:s<=30?10:0;}
  async finishAnalysis(){
    const t=this.term,s=this._toolmarkSession;if(this.finished||!this.isCurrentSession(s,t))return;
    this.completedSeconds=this.getSecondsElapsed();this.finished=true;this.stopMover();this.detachFocusInput();
    this.barText?.setVisible(false);this.statusText?.setVisible(false);this.focusButton?.disableInteractive();this.focusButton?.setVisible(false);
    const bonus=this.getTimeBonus();this.score=Math.min(120,this.score+bonus);
    if(!await this.terminalAction(s,t,()=>t.progress(this.evidenceType==='dust_profile'?'CLASSIFYING MICROTRACE':'COMPARING CONTACT PATTERNS',1600)))return;
    const lines=[['> LABORATORY REPORT'],[`> RESULT: ${this.reportLabel}.`],[`> ${this.reportText}`]];
    if(this.evidenceType==='dust_profile'&&this.evidenceConfig.sourceText)lines.push([`> ${this.evidenceConfig.sourceText}`]);
    lines.push(['> SCIENCE HAS DONE ITS PART. YOUR EYEBROW MAY NOW RISE.',{color:TERM.amber}]);
    if(bonus>0)lines.push([`> SPEED BONUS: +${bonus} PTS.`,{color:TERM.amber}]);
    lines.push(['> CLUE READY FOR CASE FILE.',{color:TERM.amber}]);
    if(!await this.printLines(s,t,lines))return;
    t.button('ADD TO CASE FILE',TERM.green,()=>{if(this.isCurrentSession(s,t))this.returnResultToCrimeLab();});
  }
  returnResultToCrimeLab(){
    if(this.returningToLab||this._toolmarkDisposed||!this.finished)return;this.returningToLab=true;
    const payload={aborted:false,completed:true,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId,
      evidenceType:this.evidenceType,evidenceConfig:this.evidenceConfig,value:this.correctValue,
      correctValue:this.correctValue,result:this.correctValue,selectedValue:this.correctValue,
      clueType:this.evidenceConfig.clueType,clueText:this.clue.text,label:this.evidenceConfig.label,
      isValuable:false,score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed(),clue:this.clue,
      sourceConfirmed:this.evidenceConfig.sourceConfirmed===true,sourceText:this.evidenceConfig.sourceText||''};
    this.events.emit('minigame-complete',payload);this.events.emit('minigame-closed',{aborted:false,payload});this.scene.stop();
  }
  cleanup(){
    if(this._toolmarkDisposed){super.cleanup();return;}
    this._toolmarkDisposed=true;this._toolmarkSession++;this.returningToLab=true;this._busy=false;
    const terminal=this.term;this.term=null;
    try{this.stopMover();this.detachFocusInput();terminal?.destroy();}
    finally{
      super.cleanup();
      for(const key of['barText','statusText','focusButton']){this[key]?.removeAllListeners?.();this[key]?.destroy();this[key]=null;}
    }
  }
}
