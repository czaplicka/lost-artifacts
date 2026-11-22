import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { TV_WORDS } from '../dialogues/TVChannelContent.js';
import { gameState } from '../GameData.js';
import { getTimeChangedPayload } from '../CaseTimeHelper.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { createTvBroadcastLayout } from './tv/TvBroadcastLayout.js';
import { TvBroadcastEffects } from './tv/TvBroadcastEffects.js';
import { TvChannelView as TvBroadcastView } from './tv/TvChannelView.js';
import { TvBroadcastControls } from './tv/TvBroadcastControls.js';
import { TvBroadcastAudio } from './tv/TvBroadcastAudio.js';
import { preloadTVEditorialAssets } from './tv/TvEditorialPreload.js';
import { TvChannelMoviePlayer as TvMoviePlayer } from './tv/TvChannelMoviePlayer.js';
import { TV_CHANNELS as CHANNELS, buildTVChannelQueue } from '../systems/TVChannelSchedule.js';

const SOURCE = 'scenes/TvBroadcastScene.js';
const text = id => __dialogueText(SOURCE,id);
const VOLUME_LEVELS = [1,0.5,0];

export class TvBroadcastScene extends BaseScene {
  constructor() { super({key:'TvBroadcastScene'}); this.resetState(); }

  resetState() {
    Object.assign(this,{
      returnSceneKey:null,pauseBelowScene:true,onClose:null,
      segmentQueue:[],currentSegmentIndex:0,currentLineIndex:0,currentCharIndex:0,
      typingEvent:null,advanceEvent:null,clockEvent:null,startupFallback:null,
      closeFallback:null,transitionEvent:null,isTyping:false,isTransitioning:false,
      isBroadcastPaused:false,isClosing:false,hasStarted:false,closeCompleted:false,
      currentLineFullText:'',currentLinePrefix:'',currentSegment:null,
      layout:null,tvView:null,tvEffects:null,tvControls:null,tvAudio:null,
      moviePlayer:null,anchorTextureKey:null,anchorDisplayName:'',
      hasPausedReturnScene:false,hudSleptByTv:false,minimumSegmentHold:5000,
      volumeIndex:0,channelIndex:0,lastAdId:null,channelOsdPending:false,
      lastChannelIndex:null,channelCycles:{}
    });
  }

  init(data = {}) {
    this.resetState();
    this.returnSceneKey = data.returnSceneKey || null;
    this.pauseBelowScene = data.pauseBelowScene !== undefined ? Boolean(data.pauseBelowScene) : true;
    this.onClose = typeof data.onClose === 'function' ? data.onClose : null;
  }

  preload() { preloadTVEditorialAssets(this); }

  create() {
    super.create();
    EventBus.emit('hideHUD');
    audioManager.init(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown,this);
    this.setupSceneState();this.selectBroadcastAnchor();
    this.tvAudio = new TvBroadcastAudio(this);
    this.createTvInterface();this.createTvControls();
    this.moviePlayer = new TvMoviePlayer(this);
    this.buildChannelQueue();this.hideUnderlyingHud();
    this.tvView.onScreenClick = () => this.onAdvancePressed();
    this.updateClock();
    this.clockEvent = this.time.addEvent({delay:1000,loop:true,callback:()=>this.updateClock()});
    this.playOpenAnimation();
  }

  getChannel() { return CHANNELS[this.channelIndex]; }

  buildChannelQueue() {
    const config = this.cache.json.get('tv-config') || {};
    const cycle = this.channelCycles[this.channelIndex] || 0;
    this.segmentQueue = buildTVChannelQueue(gameState,config,this.channelIndex,cycle);
    this.channelCycles[this.channelIndex] = cycle+1;
    this.selectBroadcastAnchor();
  }

  setupSceneState() {
    if (this.pauseBelowScene && this.returnSceneKey && this.isSceneActive(this.returnSceneKey)) {
      this.scene.pause(this.returnSceneKey);this.hasPausedReturnScene = true;
    }
    this.layout = createTvBroadcastLayout(this,{televisionTextureKey:'television'});
    const bindings = [
      ['keydown-SPACE',this.onAdvancePressed],['keydown-ENTER',this.onAdvancePressed],
      ['keydown-RIGHT',this.onAdvancePressed],['keydown-LEFT',this.onPrevPressed],
      ['keydown-X',this.onSkipPressed],['keydown-P',this.toggleBroadcastPause],
      ['keydown-ESC',this.onClosePressed],['keydown-ONE',this.onChannelOne],
      ['keydown-TWO',this.onChannelTwo],['keydown-THREE',this.onChannelThree],
      ['keydown-NUMPAD_ONE',this.onChannelOne],['keydown-NUMPAD_TWO',this.onChannelTwo],
      ['keydown-NUMPAD_THREE',this.onChannelThree]
    ];
    for (const [event,handler] of bindings) this.trackInputEvent(this.input.keyboard,event,handler);
  }

  onChannelOne() { this.switchChannel(0); }
  onChannelTwo() { this.switchChannel(1); }
  onChannelThree() { this.switchChannel(2); }

  createTvInterface() {
    this.tvView = new TvBroadcastView(this,this.layout);this.tvView.create(this.anchorTextureKey);
    this.tvEffects = new TvBroadcastEffects(this);
    this.tvView.addScreenEffects(this.tvEffects.create(this.layout.screenWidth,this.layout.screenHeight));
    this.tvEffects.setJitterTarget(this.tvView.ui.screenInner);this.tvEffects.start();
  }

  createTvControls() {
    this.tvControls = new TvBroadcastControls(this,{
      onClose:()=>this.onClosePressed(),onSkip:()=>this.onSkipPressed(),
      onNext:()=>this.onAdvancePressed(),onPauseToggle:()=>this.toggleBroadcastPause(),
      onVolume:()=>this.onVolumeKnob(),onTune:()=>this.onTuneKnob(),
      isActionAllowed:()=>!this.isTransitioning && !this.isClosing,
      isBroadcastPaused:()=>this.isBroadcastPaused,
      getTooltip:id=>this.getControlTooltip(id)
    });
    this.tvControls.create(this.layout);
  }

  getControlTooltip(id) {
    switch(id) {
      case 'close':return 'Switch off TV [Esc]';
      case 'skip':return 'Jump to the next news bulletin [X]';
      case 'next':return this.currentSegment?.type === 'movie' ? 'Skip film [Right]' : 'Continue [Space / Right]';
      case 'pause':return this.isBroadcastPaused ? 'Resume [P]' : 'Pause [P]';
      case 'volume':return VOLUME_LEVELS[this.volumeIndex] === 0 ? 'Muted' : `Volume ${Math.round(VOLUME_LEVELS[this.volumeIndex]*100)}%`;
      case 'tune':return `Change channel · ${this.getChannel().name} [1 / 2 / 3]`;
      default:return '';
    }
  }

  hideUnderlyingHud() {
    const hud = this.getRegisteredScene('PlayerHudScene');if (!hud) return;
    hud.closeAllUIPanels?.();hud.playerMenu?.close?.();
    if (this.isSceneActive('PlayerHudScene')) {this.scene.sleep('PlayerHudScene');this.hudSleptByTv = true;}
  }

  restoreUnderlyingHud() {
    if (this.hudSleptByTv) {
      this.hudSleptByTv = false;
      if (this.isSceneSleeping('PlayerHudScene')) this.scene.wake('PlayerHudScene');
    }
    this.getRegisteredScene('PlayerHudScene')?.scene?.setVisible?.(true);EventBus.emit('showHUD');
  }

  selectBroadcastAnchor() {
    const station = this.getChannel();
    this.anchorTextureKey = station.anchorKey;this.anchorDisplayName = station.anchorName;
  }

  getClockText() {
    try {
      const p = getTimeChangedPayload(gameState),pad = n=>String(n).padStart(2,'0');
      return text('t_eb7444abbca4a79ed61b')+p.day+text('t_6c179f21e6f62b629055')
        +pad(p.hour)+text('t_e7ac0786668e0ff0f02b')+pad(p.minute);
    } catch {return '';}
  }

  getDeadlineText() {
    try {
      const p = getTimeChangedPayload(gameState);
      if (!p.caseClockValid || p.caseTimeRemaining === null) return null;
      const minutes = Math.floor(p.caseTimeRemaining/60);
      if (minutes<=0) return text('t_ee8351916c641b8ae78f');
      return text('t_07052aa16fd8ebd499ca')+Math.floor(minutes/1440)
        +text('t_f0a768c6fe5fff5a5d19')+Math.floor((minutes%1440)/60)+text('t_0befe6f9c9330c84c378');
    } catch {return null;}
  }

  updateClock() {this.tvView?.setClock(this.getClockText());}

  playOpenAnimation() {
    const {root,backdrop} = this.tvView.ui;
    this.addTrackedTween(this.tweens.add({targets:backdrop,alpha:1,duration:150,ease:'Quad.Out'}));
    this.isTransitioning = true;
    this.addTrackedTween(this.tweens.add({targets:root,alpha:1,duration:180,ease:'Quad.Out',onComplete:()=>this.runStartupSequence()}));
    this.startupFallback = this.time.delayedCall(3000,()=>this.startFirstSegment());
  }

  runStartupSequence() {
    if (!this.sys.isActive() || this.isClosing || this.hasStarted) return;
    this.tvAudio?.powerOn();this.tvEffects?.powerOn(()=>{
      if (!this.sys.isActive() || this.isClosing || this.hasStarted) return;
      this.tvAudio?.beep(1000,0.28);this.tvEffects?.showBars(420,()=>{
        if (!this.sys.isActive() || this.isClosing || this.hasStarted) return;
        this.tvEffects?.burst(160);this.tvAudio?.staticBurst(0.16);
        this.time.delayedCall(140,()=>this.startFirstSegment());
      });
    });
  }

  startFirstSegment() {
    if (this.hasStarted || !this.sys.isActive() || this.isClosing) return;
    this.hasStarted = true;this.isTransitioning = false;
    this.startupFallback?.remove?.(false);this.startupFallback = null;
    this.tvAudio?.startHum();this.channelOsdPending = true;this.playSegment(0);
    this.tvView?.showHint(TV_WORDS.controls,4000);
  }

  getSegmentHoldDuration(segment) {return Math.max(segment?.hold || 0,this.minimumSegmentHold);}

  scheduleSegmentAdvance(segment) {
    if (segment?.type === 'movie') return;
    this.advanceEvent?.remove?.(false);
    const duration = this.getSegmentHoldDuration(segment);this.tvView?.startProgress(duration);
    this.advanceEvent = this.time.delayedCall(duration,()=>{
      if (this.sys.isActive() && !this.isBroadcastPaused && !this.isClosing) this.advanceSegment();
    });
    this.advanceEvent.paused = this.isBroadcastPaused;
  }

  playSegment(index) {
    if (this.isClosing || !this.segmentQueue.length || index<0 || index>=this.segmentQueue.length) return;
    this.clearTimers();this.moviePlayer?.stop();this.tvAudio?.stopSegment();
    this.isBroadcastPaused = false;this.tvView?.setPaused(false);this.tvControls?.refreshPauseVisual?.();
    this.currentSegmentIndex = index;this.currentSegment = this.segmentQueue[index];
    this.currentLineIndex = 0;this.currentCharIndex = 0;this.currentLinePrefix = '';this.currentLineFullText = '';
    this.isTyping = false;this.isTransitioning = false;
    const segment = this.currentSegment,deadline = this.channelIndex === 0 ? this.getDeadlineText() : null;
    this.tvView.applySegment(segment,{
      anchorTextureKey:this.anchorTextureKey,anchorDisplayName:this.anchorDisplayName,
      isFirstSegment:index===0,tickerExtras:deadline?[deadline]:[]
    });
    this.tvView.setSegmentIndicator(index,this.segmentQueue.length);this.tvView.setBodyText('');
    if (segment.type === 'movie') {
      this.tvAudio?.stopHum();this.moviePlayer.start(segment.videoUrl,()=>{
        if (this.sys.isActive() && !this.isClosing && this.currentSegment === segment) this.advanceSegment();
      });
    } else {
      this.tvAudio?.startHum();
      if (segment.instant) {
        this.tvView.setBodyText((segment.lines || []).join('\n'));this.scheduleSegmentAdvance(segment);
      } else this.typeNextLine();
    }
    if (this.channelOsdPending) {
      this.channelOsdPending = false;const c = this.getChannel();
      this.tvView.showOsd(`CH ${c.number} · ${c.name.toUpperCase()}`,2400);
    }
  }

  typeNextLine() {
    if (this.isClosing || this.isBroadcastPaused || !this.currentSegment || this.currentSegment.type === 'movie' || !this.tvView?.isBodyTextActive()) return;
    const lines = this.currentSegment.lines || [];
    if (this.currentLineIndex>=lines.length) {this.scheduleSegmentAdvance(this.currentSegment);return;}
    this.currentLineFullText = String(lines[this.currentLineIndex]);
    const existing = this.tvView.getBodyText().trim();this.currentLinePrefix = existing?`${existing}\n`:'';
    this.currentCharIndex = 0;this.isTyping = true;
    const event = this.time.addEvent({delay:this.currentSegment.charDelay || 20,loop:true,callback:()=>{
      if (!this.sys.isActive() || this.isClosing || this.isBroadcastPaused || !this.currentSegment || !this.tvView?.isBodyTextActive() || this.typingEvent!==event) return;
      this.currentCharIndex++;
      this.tvView.setBodyText(this.currentLinePrefix+this.currentLineFullText.slice(0,this.currentCharIndex));
      if (this.currentCharIndex<this.currentLineFullText.length) return;
      event.remove(false);if (this.typingEvent===event) this.typingEvent = null;
      this.isTyping = false;this.currentLineIndex++;this.scheduleNextLine();
    }});
    event.paused = this.isBroadcastPaused;this.typingEvent = event;
  }

  scheduleNextLine() {
    this.advanceEvent?.remove?.(false);
    this.advanceEvent = this.time.delayedCall(this.currentSegment?.linePause || 250,()=>{
      if (this.sys.isActive() && !this.isBroadcastPaused && !this.isClosing) this.typeNextLine();
    });this.advanceEvent.paused = this.isBroadcastPaused;
  }

  onAdvancePressed() {
    if (this.isClosing || this.isTransitioning || this.isBroadcastPaused) return;
    if (this.currentSegment?.type === 'movie' && this.moviePlayer?.blocked) {this.moviePlayer.tryPlay();return;}
    if (this.isTyping) {this.finishCurrentLine();return;}this.advanceSegment();
  }

  onPrevPressed() {
    if (this.isClosing || this.isTransitioning || this.isBroadcastPaused) return;
    this.transitionToSegment((this.currentSegmentIndex-1+this.segmentQueue.length)%this.segmentQueue.length);
  }

  onSkipPressed() {
    if (this.isClosing || this.isTransitioning || this.isBroadcastPaused) return;
    for (let offset=1;offset<=this.segmentQueue.length;offset++) {
      const index = (this.currentSegmentIndex+offset)%this.segmentQueue.length;
      if (this.segmentQueue[index].type === 'news') {this.transitionToSegment(index);return;}
    }
  }

  onClosePressed() {if (!this.isClosing) this.finishBroadcast();}

  onVolumeKnob() {
    this.volumeIndex = (this.volumeIndex+1)%VOLUME_LEVELS.length;
    const level = VOLUME_LEVELS[this.volumeIndex];
    this.tvAudio?.setLevel(level);this.moviePlayer?.syncVolume();this.tvAudio?.click();
    this.tvView?.showOsd(level === 0?'MUTED':`VOLUME ${Math.round(level*100)}%`);
  }

  onTuneKnob() {this.switchChannel((this.channelIndex+1)%CHANNELS.length);}

  switchChannel(index) {
    if (!this.hasStarted || this.isClosing || this.isTransitioning || !Number.isInteger(index) || !CHANNELS[index]) return;
    if (index === this.channelIndex) {
      const c = this.getChannel();this.tvView?.showOsd(`CH ${c.number} · ${c.name.toUpperCase()}`,1800);return;
    }
    this.isBroadcastPaused = false;this.tvView?.setPaused(false);this.tvControls?.refreshPauseVisual?.();
    this.channelIndex = index;this.lastAdId = null;this.buildChannelQueue();this.channelOsdPending = true;this.transitionToSegment(0);
  }

  toggleBroadcastPause() {
    if (this.isClosing || this.isTransitioning) return;
    this.isBroadcastPaused = !this.isBroadcastPaused;
    if (this.typingEvent) this.typingEvent.paused = this.isBroadcastPaused;
    if (this.advanceEvent) this.advanceEvent.paused = this.isBroadcastPaused;
    this.moviePlayer?.setPaused(this.isBroadcastPaused);this.tvAudio?.click();
    this.tvView?.setPaused(this.isBroadcastPaused);this.tvControls?.refreshPauseVisual?.();
  }

  finishCurrentLine() {
    if (this.isClosing || this.isBroadcastPaused || !this.currentSegment || !this.tvView?.isBodyTextActive()) return;
    this.typingEvent?.remove?.(false);this.typingEvent = null;
    this.tvView.setBodyText(this.currentLinePrefix+this.currentLineFullText);
    this.isTyping = false;this.currentLineIndex++;this.scheduleNextLine();
  }

  advanceSegment() {
    if (this.isClosing || this.isBroadcastPaused || this.isTransitioning) return;
    const next = this.currentSegmentIndex+1;
    if (next>=this.segmentQueue.length) {this.buildChannelQueue();this.transitionToSegment(0);}
    else this.transitionToSegment(next);
  }

  transitionToSegment(index) {
    if (this.isClosing || this.isBroadcastPaused || this.isTransitioning) return;
    this.clearTimers();this.moviePlayer?.stop();this.tvAudio?.stopSegment();this.tvAudio?.stopHum();
    this.isTransitioning = true;this.tvEffects?.burst(170,1);this.tvAudio?.staticBurst(0.16);
    this.transitionEvent = this.time.delayedCall(140,()=>{
      this.transitionEvent = null;if (!this.sys.isActive() || this.isClosing) return;
      this.isTransitioning = false;this.playSegment(index);
    });
  }

  finishBroadcast() {
    if (this.isClosing) return;this.isClosing = true;this.clearTimers();this.moviePlayer?.stop();
    this.transitionEvent?.remove?.(false);this.transitionEvent = null;
    this.startupFallback?.remove?.(false);this.startupFallback = null;
    this.tvAudio?.stopSegment();this.tvAudio?.stopHum();this.tvAudio?.powerOff();
    this.closeFallback = this.time.delayedCall(1200,()=>this.completeClose());
    const fade = ()=>{
      if (!this.tvView?.ui?.root) {this.completeClose();return;}
      this.addTrackedTween(this.tweens.add({targets:[this.tvView.ui.root,this.tvView.ui.backdrop],alpha:0,
        duration:160,ease:'Quad.In',onComplete:()=>this.completeClose()}));
    };
    if (this.tvEffects) this.tvEffects.powerOff(fade);else fade();
  }

  completeClose() {
    if (this.closeCompleted) return;this.closeCompleted = true;
    this.closeFallback?.remove?.(false);this.closeFallback = null;
    this.restoreReturnScene();this.showNewsHudButtons?.();
    this.onClose?.({missionId:gameState.currentMission?.id || null,watched:true,lastSegmentType:this.currentSegment?.type || null});
    this.restoreUnderlyingHud();if (this.sys.isActive()) this.scene.stop();
  }

  restoreReturnScene() {
    if (!this.hasPausedReturnScene || !this.returnSceneKey || !this.hasScene(this.returnSceneKey)) return;
    if (this.isScenePaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    else if (this.isSceneSleeping(this.returnSceneKey)) this.scene.wake(this.returnSceneKey);
    this.hasPausedReturnScene = false;
  }

  clearTimers() {
    this.typingEvent?.remove?.(false);this.typingEvent = null;
    this.advanceEvent?.remove?.(false);this.advanceEvent = null;this.tvView?.stopProgress();this.isTyping = false;
  }

  handleShutdown() {
    this.clearTimers();
    for (const key of ['clockEvent','startupFallback','closeFallback','transitionEvent']) {
      this[key]?.remove?.(false);this[key] = null;
    }
    this.moviePlayer?.destroy();this.moviePlayer = null;this.tvEffects?.destroy?.();this.tvEffects = null;
    this.tvControls?.destroy?.();this.tvControls = null;this.tvView?.destroy?.();this.tvView = null;
    this.tvAudio?.destroy?.();this.tvAudio = null;
    this.restoreReturnScene();this.restoreUnderlyingHud();this.showNewsHudButtons?.();
    this.layout = null;this.isTyping = false;this.isTransitioning = false;this.isBroadcastPaused = false;this.isClosing = false;
  }
}
