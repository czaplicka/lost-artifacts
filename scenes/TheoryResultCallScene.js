import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { getMissionCaseKey } from '../crimeCaseKey.js';

const text=key=>__dialogueText('scenes/TheoryResultCallScene.js',key);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const isRecord=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
function context() {
  const mission=gameState.currentMission;
  return [gameState.currentCaseId,gameState._createdAt,mission?.id,mission?.missionId,mission?.scene,gameState.currentCityId,gameState.crimeCityId];
}

export class TheoryResultCallScene extends BaseScene {
  constructor() {
    super('TheoryResultCallScene');
    this.sourceScene='CityScene'; this.mode='hq'; this.result='weak';
    this.resetViewState();
  }
  resetViewState() {
    this.overlay=null; this.panel=null; this.innerFrame=null; this.bubble=null;
    this.headerText=null; this.speakerText=null; this.bodyText=null;
    this.continueBtn=null; this.hintText=null; this.layout=null;
    this._resizeBound=false; this._finished=false; this._hudHidden=false;
    this.handleResizeBound=null; this.handleContinueBound=null;
    this.handleSpaceBound=null; this.handleEnterBound=null;
    this._viewToken=Symbol('theory-assessment');
    this._assessmentContext=null; this._assessmentRecord=null;
    this._assessmentKey=null; this._assessmentScoped=false; this._commentSaved=false;
  }
  init(data={}) {
    this.sourceScene=data.sourceScene||'CityScene'; this.mode=data.mode||'hq';
    this.result=data.result||'weak';
    this.resetViewState();
    this._assessmentContext=context();
    this._assessmentKey=String(getMissionCaseKey(gameState,gameState.crimeCityId));
    const records=gameState.reconstructedHeists;
    // HypothesisScene and HypothesisResultService use the active alias. Capture
    // that exact object; do not silently switch to a detached older cache copy.
    this._assessmentScoped=!isRecord(gameState.reconstructedHeist)&&isRecord(records)&&own(records,this._assessmentKey);
    const record=this._assessmentScoped?records[this._assessmentKey]:gameState.reconstructedHeist;
    this._assessmentRecord=isRecord(record)?record:null;
    this.result=data.result||this._assessmentRecord?.playerTheoryResult||'weak';
  }
  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.onShutdown,this);
    this._hudHidden=true; EventBus.emit('hideHUD');
    const {width,height}=this.scale, palette=this.getPalette(this.result), lines=this.getDialogue(this.result,this.mode);
    this.overlay=this.add.rectangle(0,0,width,height,0x000000,.72).setOrigin(0,0).setDepth(4000).setInteractive();
    this.panel=this.add.rectangle(width/2,height/2,960,520,0x17110a,.98).setStrokeStyle(3,0xd4af37,1).setDepth(4001);
    this.innerFrame=this.add.rectangle(width/2,height/2,948,508,0,0).setStrokeStyle(1,palette.border,.8).setDepth(4001);
    this.bubble=this.add.rectangle(0,0,1,1,0x2a2012,1).setOrigin(0).setStrokeStyle(1,0xb58a42).setDepth(4001);
    this.headerText=this.add.text(0,0,this.mode==='phone'?'Encrypted call':'HQ assessment',{
      fontFamily:'SpecialElite',fontSize:'38px',color:palette.title,align:'center'
    }).setOrigin(.5).setDepth(4002);
    this.speakerText=this.add.text(0,0,this.getSpeakerName(this.mode),{
      fontFamily:'PressStart2P',fontSize:'16px',color:'#f0c75e',align:'left'
    }).setOrigin(0).setDepth(4002);
    this.bodyText=this.add.text(0,0,lines.join('\n\n'),{
      fontFamily:'SpecialElite',fontSize:'28px',color:'#f3e7c4',align:'left',
      wordWrap:{width:760,useAdvancedWrap:true},lineSpacing:10
    }).setOrigin(0).setDepth(4002);
    this.continueBtn=this.add.text(0,0,'[ CONTINUE ]',{
      fontFamily:'SpecialElite',fontSize:'30px',color:'#e3f0d7',backgroundColor:'#263729',
      padding:{left:18,right:18,top:10,bottom:10}
    }).setOrigin(1,.5).setDepth(4002).setInteractive({useHandCursor:true});
    this.hintText=this.add.text(0,0,'Tap anywhere or press Enter / Space',{
      fontFamily:'SpecialElite',fontSize:'16px',color:'#ccb98c',align:'center'
    }).setOrigin(.5).setDepth(4002);
    const viewToken=this._viewToken;
    const continueView=()=>viewToken===this._viewToken?this.finishScene():false;
    this.handleContinueBound=continueView;
    this.handleSpaceBound=continueView;
    this.handleEnterBound=continueView;
    this.overlay.on('pointerup',this.handleContinueBound);
    this.continueBtn.on('pointerover',()=>this.continueBtn?.setColor('#ffffff').setBackgroundColor('#354b36'));
    this.continueBtn.on('pointerout',()=>this.continueBtn?.setColor('#e3f0d7').setBackgroundColor('#263729'));
    this.continueBtn.on('pointerup',this.handleContinueBound);
    // Keep retry keys available after a failed save; onShutdown removes them.
    this.input.keyboard?.on('keydown-SPACE',this.handleSpaceBound);
    this.input.keyboard?.on('keydown-ENTER',this.handleEnterBound);
    this.bindResize(); this.applyResponsiveLayout();
    this.createTrackedTween({targets:[this.panel,this.innerFrame,this.bubble,this.headerText,
      this.speakerText,this.bodyText,this.continueBtn,this.hintText],alpha:{from:0,to:1},duration:160,ease:'Quad.easeOut'});
  }
  restoreHud() {
    if (!this._hudHidden) return;
    this._hudHidden=false;
    try { EventBus.emit('showHUD'); }
    catch (error) { console.error('[TheoryResultCallScene] HUD notification failed:',error); }
  }
  getLayout() {
    const {width,height}=this.scale,isMobile=width<=900;
    const panelWidth=Math.max(1,Math.min(width-28,isMobile?700:960));
    const panelHeight=Math.max(1,Math.min(height-28,isMobile?700:520));
    const panelX=width/2,panelY=height/2,panelTop=panelY-panelHeight/2,panelBottom=panelY+panelHeight/2;
    const s=Math.max(.01,Math.min(1,panelWidth/700,panelHeight/520)),pad=26*s;
    const left=panelX-panelWidth/2+pad,headerY=panelTop+48*s,speakerY=panelTop+95*s;
    const bubbleY=panelTop+140*s,continueY=panelBottom-78*s,hintY=panelBottom-28*s;
    const bubbleW=Math.max(1,(panelWidth-pad*2)*.9),bubbleH=Math.max(1,continueY-48*s-bubbleY);
    return {width,height,isMobile,panelWidth,panelHeight,panelX,panelY,panelTop,panelBottom,
      headerY,speakerY,bodyY:bubbleY+14*s,continueY,hintY,s,pad,left,bubbleY,bubbleW,bubbleH,
      headerWrap:Math.max(1,panelWidth-pad*2),speakerWrap:Math.max(1,panelWidth-pad*2),bodyWrap:Math.max(1,bubbleW-28*s)};
  }
  applyResponsiveLayout() {
    this.layout=this.getLayout(); const L=this.layout;
    this.overlay.setSize(L.width,L.height).setPosition(0,0);
    this.panel.setPosition(L.panelX,L.panelY).setSize(L.panelWidth,L.panelHeight);
    this.innerFrame.setPosition(L.panelX,L.panelY).setSize(Math.max(1,L.panelWidth-12*L.s),Math.max(1,L.panelHeight-12*L.s));
    this.headerText.setPosition(L.panelX,L.headerY).setFontSize((L.isMobile?28:38)*L.s).setWordWrapWidth(L.headerWrap,true);
    this.speakerText.setPosition(L.left,L.speakerY).setFontSize(16*L.s).setWordWrapWidth(L.speakerWrap,true);
    this.bubble.setPosition(L.left,L.bubbleY).setSize(L.bubbleW,L.bubbleH);
    let font=(L.isMobile?22:28)*L.s;
    this.bodyText.setPosition(L.left+14*L.s,L.bodyY).setFontSize(font).setWordWrapWidth(L.bodyWrap,true).setLineSpacing(6*L.s);
    const available=Math.max(1,L.bubbleH-28*L.s);
    while (this.bodyText.height>available&&font>1) {font=Math.max(1,font-.5);this.bodyText.setFontSize(font);}
    this.continueBtn.setPosition(L.panelX+L.panelWidth/2-L.pad,L.continueY).setFontSize((L.isMobile?24:30)*L.s)
      .setPadding({left:18*L.s,right:18*L.s,top:10*L.s,bottom:10*L.s});
    this.hintText.setPosition(L.panelX,L.hintY).setFontSize((L.isMobile?13:16)*L.s).setWordWrapWidth(L.headerWrap,true);
  }
  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound=true; this.handleResizeBound=this.handleResize.bind(this);
    this.scale.on('resize',this.handleResizeBound,this);
  }
  handleResize() {this.applyResponsiveLayout();}
  getSpeakerName(mode) {return mode==='phone'?text('t_ec8e9ce1548e37725803'):text('t_4da03755c614084cbee4');}
  getPalette(result) {
    const map={
      exact:{border:0x7cfc00,title:text('t_07e2eb9fd5735102902e'),accent:'#7CFC00',buttonText:'#d8ffb8'},
      close:{border:0xd4af37,title:text('t_be0f3b849156ddc4795b'),accent:'#ffd966',buttonText:'#ffe6a3'},
      partial:{border:0xc98732,title:text('t_b18167e3f3f116ecc71b'),accent:'#ffb347',buttonText:'#ffd4a3'},
      weak:{border:0xb85c5c,title:text('t_67f0c667a89e3ff3f3e3'),accent:'#ff8f8f',buttonText:'#ffcccc'}
    }; return map[result]||map.weak;
  }
  getDialogue(result,mode) {
    const linesByMode={
      hq:{
        exact:[text('t_dfda1c7c435b429f8d67'),text('t_db7bc64955c1cf9de807')],
        close:[text('t_6cd90eeee53c54a32671'),text('t_a1a016e36f5f752531f9')],
        partial:[text('t_c1923ce679a2643ee8e2'),text('t_2f15bf559a1307b6c28b')],
        weak:[text('t_3844e63e0672c20b5cfc'),text('t_84a1d1c2035afb2618a5')]},
      phone:{
        exact:[text('t_dfb796d7867074c9a0e6'),text('t_79cdeb4c029e52e9b6ce')],
        close:[text('t_436b03754f2e0e037b92'),text('t_ea9df2c41fef51f2ed4d')],
        partial:[text('t_03d1d231368251ed520f'),text('t_22b4afc350300e4a098c')],
        weak:[text('t_eb204828f8ccf3f831ff'),text('t_8c5b113d70ceac8f1c97')]}
    }; return linesByMode[mode]?.[result]||linesByMode.hq.weak;
  }
  isAssessmentCurrent(token) {
    return token===this._viewToken&&!this._cleanupDone&&this.sys.isActive()&&
      this._assessmentContext!==null&&context().every((value,index)=>Object.is(value,this._assessmentContext[index]));
  }
  isAssessmentRecordCurrent() {
    if (!this._assessmentRecord) return false;
    if (this._assessmentScoped) return gameState.reconstructedHeists?.[this._assessmentKey]===this._assessmentRecord;
    return gameState.reconstructedHeist===this._assessmentRecord;
  }
  closeStaleAssessment(token) {
    if (token!==this._viewToken||this._cleanupDone||!this.sys.isActive()) return false;
    this._finished=true; this.restoreHud(); this.scene.stop();
    return false;
  }
  finishScene() {
    if (this._finished) return false;
    const token=this._viewToken;
    if (!this.isAssessmentCurrent(token)||!this.isAssessmentRecordCurrent()) return this.closeStaleAssessment(token);
    this._finished=true;
    try {
      if (!this._commentSaved) {
        this._assessmentRecord.resultCommentSeen=true;
        if (saveGameState()!==true) throw new Error('The theory assessment could not be saved.');
        if (!this.isAssessmentCurrent(token)) return this.closeStaleAssessment(token);
        if (!this.isAssessmentRecordCurrent()) return this.closeStaleAssessment(token);
        this._commentSaved=true;
      }
      if (this.hasScene(this.sourceScene)) {
        if (this.isSceneSleeping(this.sourceScene)) this.scene.wake(this.sourceScene);
        if (!this.isAssessmentCurrent(token)) return this.closeStaleAssessment(token);
        if (this.isScenePaused(this.sourceScene)) this.scene.resume(this.sourceScene);
      }
      if (!this.isAssessmentCurrent(token)) return this.closeStaleAssessment(token);
      this.restoreHud(); this.scene.stop(); return true;
    } catch (error) {
      if (token!==this._viewToken) return false;
      if (!this.isAssessmentCurrent(token)) return this.closeStaleAssessment(token);
      this._finished=false;
      console.error('[TheoryResultCallScene] Continue failed:',error);
      this.hintText?.setText(this._commentSaved?'Could not return. Press Continue to retry.':'Save failed. Press Continue / Enter / Space to retry.');
      return false;
    }
  }
  onShutdown() {
    this._viewToken=Symbol('closed-assessment');
    this._finished=true;
    this.restoreHud();
    if (this.handleResizeBound) this.scale.off('resize',this.handleResizeBound,this);
    if (this.overlay&&this.handleContinueBound) this.overlay.off('pointerup',this.handleContinueBound);
    this.continueBtn?.removeAllListeners();
    if (this.input.keyboard&&this.handleSpaceBound) this.input.keyboard.off('keydown-SPACE',this.handleSpaceBound);
    if (this.input.keyboard&&this.handleEnterBound) this.input.keyboard.off('keydown-ENTER',this.handleEnterBound);
    for (const name of ['overlay','panel','innerFrame','bubble','headerText','speakerText','bodyText','continueBtn','hintText']) {
      this[name]?.removeAllListeners?.(); this[name]?.destroy?.(); this[name]=null;
    }
    this.layout=null; this._resizeBound=false; this.handleResizeBound=null;
    this.handleContinueBound=null; this.handleSpaceBound=null; this.handleEnterBound=null;
    this._assessmentRecord=null; this._assessmentContext=null;
  }
}
