import { gameState } from '../GameData.js';
import { getTVBroadcast } from '../tvBroadcastData.js';
import { getTimeChangedPayload } from '../CaseTimeHelper.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';

import {
  createTvBroadcastLayout
} from './tv/TvBroadcastLayout.js';

import {
  TvBroadcastEffects
} from './tv/TvBroadcastEffects.js';

import {
  TvBroadcastView
} from './tv/TvBroadcastView.js';

import {
  TvBroadcastControls
} from './tv/TvBroadcastControls.js';

import {
  TvBroadcastAudio
} from './tv/TvBroadcastAudio.js';

const VOLUME_LEVELS = [1, 0.5, 0];

const TUNE_MESSAGES = [
  'FINE TUNING...',
  'ADJUSTING ANTENNA...',
  'HITTING THE TV (IT HELPED)',
  'RECEPTION: SUSPICIOUS',
  'SIGNAL: 3 BARS OF 7'
];

export class TvBroadcastScene extends BaseScene {
  constructor() {
    super({ key: 'TvBroadcastScene' });

    this.resetState();
  }

  resetState() {
    this.returnSceneKey = null;
    this.pauseBelowScene = true;
    this.onClose = null;

    this.segmentQueue = [];
    this.currentSegmentIndex = 0;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.typingEvent = null;
    this.advanceEvent = null;
    this.clockEvent = null;
    this.startupFallback = null;
    this.closeFallback = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;
    this.hasStarted = false;
    this.closeCompleted = false;

    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;

    this.tvView = null;
    this.tvEffects = null;
    this.tvControls = null;
    this.tvAudio = null;

    this.anchorTextureKey = null;
    this.anchorDisplayName = '';

    this.hasPausedReturnScene = false;
    this.hudSleptByTv = false;
    this.minimumSegmentHold = 5000;

    this.volumeIndex = 0;
  }

  init(data = {}) {
    this.resetState();

    this.returnSceneKey = data.returnSceneKey || null;

    this.pauseBelowScene =
      data.pauseBelowScene !== undefined
        ? Boolean(data.pauseBelowScene)
        : true;

    this.onClose =
      typeof data.onClose === 'function'
        ? data.onClose
        : null;
  }

  preload() {
    if (!this.cache.json.exists('tv-config')) {
      this.load.json(
        'tv-config',
        'assets/data/tv-config.json'
      );
    }
  }

  create() {
    super.create();

    EventBus.emit('hideHUD');

    audioManager.init(this);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    this.setupSceneState();
    this.selectBroadcastAnchor();

    this.tvAudio = new TvBroadcastAudio(this);

    this.createTvInterface();
    this.createTvControls();

    const tvConfigJson =
      this.cache.json.get('tv-config') || {};

    this.segmentQueue =
      getTVBroadcast(
        gameState,
        tvConfigJson
      ).segments || [];

    this.hideUnderlyingHud();

    this.tvView.onScreenClick = () => this.onAdvancePressed();

    this.updateClock();

    this.clockEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.updateClock()
    });

    this.playOpenAnimation();
  }

  /* ========================================================
     SETUP
     ======================================================== */

  setupSceneState() {
    if (
      this.pauseBelowScene &&
      this.returnSceneKey &&
      this.isSceneActive(this.returnSceneKey)
    ) {
      this.scene.pause(this.returnSceneKey);
      this.hasPausedReturnScene = true;
    }

    this.layout = createTvBroadcastLayout(
      this,
      {
        televisionTextureKey: 'television'
      }
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-SPACE',
      this.onAdvancePressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ENTER',
      this.onAdvancePressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-RIGHT',
      this.onAdvancePressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-LEFT',
      this.onPrevPressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-X',
      this.onSkipPressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-P',
      this.toggleBroadcastPause
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ESC',
      this.onClosePressed
    );
  }

  createTvInterface() {
    this.tvView = new TvBroadcastView(
      this,
      this.layout
    );

    this.tvView.create(this.anchorTextureKey);

    this.tvEffects = new TvBroadcastEffects(this);

    const effects = this.tvEffects.create(
      this.layout.screenWidth,
      this.layout.screenHeight
    );

    this.tvView.addScreenEffects(effects);
    this.tvEffects.setJitterTarget(this.tvView.ui.screenInner);
    this.tvEffects.start();
  }

  createTvControls() {
    this.tvControls = new TvBroadcastControls(
      this,
      {
        onClose: () => this.onClosePressed(),
        onSkip: () => this.onSkipPressed(),
        onNext: () => this.onAdvancePressed(),
        onPauseToggle: () => this.toggleBroadcastPause(),
        onVolume: () => this.onVolumeKnob(),
        onTune: () => this.onTuneKnob(),

        isActionAllowed: () =>
          !this.isTransitioning &&
          !this.isClosing,

        isBroadcastPaused: () =>
          this.isBroadcastPaused,

        getTooltip: id => this.getControlTooltip(id)
      }
    );

    this.tvControls.create(this.layout);
  }

  getControlTooltip(id) {
    switch (id) {
      case 'close':
        return '[ESC] EXIT';
      case 'skip':
        return '[X] SKIP TO NEWS';
      case 'next':
        return '[SPACE] NEXT';
      case 'pause':
        return this.isBroadcastPaused
          ? '[P] PLAY'
          : '[P] PAUSE';
      case 'volume': {
        const level = VOLUME_LEVELS[this.volumeIndex];

        return level === 0
          ? 'VOLUME: MUTED'
          : `VOLUME: ${Math.round(level * 100)}%`;
      }
      case 'tune':
        return 'TUNE';
      default:
        return '';
    }
  }

  /* ========================================================
     HUD
     ======================================================== */

  hideUnderlyingHud() {
    const playerHud = this.getRegisteredScene(
      'PlayerHudScene'
    );

    if (!playerHud) {
      return;
    }

    playerHud.closeAllUIPanels?.();
    playerHud.playerMenu?.close?.();

    // Sen zamiast setVisible(false): PlayerHudScene ma globalne skróty
    // M / I / C / H, które inaczej działałyby pod włączonym telewizorem.
    if (this.isSceneActive('PlayerHudScene')) {
      this.scene.sleep('PlayerHudScene');
      this.hudSleptByTv = true;
    }
  }

  restoreUnderlyingHud() {
    if (this.hudSleptByTv) {
      this.hudSleptByTv = false;

      if (this.isSceneSleeping('PlayerHudScene')) {
        this.scene.wake('PlayerHudScene');
      }
    }

    this.getRegisteredScene('PlayerHudScene')
      ?.scene
      ?.setVisible?.(true);

    EventBus.emit('showHUD');
  }

  /* ========================================================
     DATA
     ======================================================== */

  selectBroadcastAnchor() {
    const anchors = [
      {
        textureKey: 'tv_anchor_generic',
        name: 'RICHARD VALE'
      },
      {
        textureKey: 'tv_anchor_genericf',
        name: 'EVELYN CROSS'
      }
    ];

    const selectedAnchor =
      Phaser.Utils.Array.GetRandom(anchors);

    this.anchorTextureKey =
      selectedAnchor.textureKey;

    this.anchorDisplayName =
      selectedAnchor.name;
  }

  getClockText() {
    try {
      const p = getTimeChangedPayload(gameState);
      const pad = n => String(n).padStart(2, '0');

      return `DAY ${p.day}  ${pad(p.hour)}:${pad(p.minute)}`;
    } catch (error) {
      return '';
    }
  }

  getDeadlineText() {
    try {
      const p = getTimeChangedPayload(gameState);

      if (!p.caseClockValid || p.caseTimeRemaining === null) {
        return null;
      }

      const minutes = Math.floor(p.caseTimeRemaining / 60);

      if (minutes <= 0) {
        return 'DETECTIVE ADVISORY: THE CASE CLOCK HAS RUN OUT. AWKWARD';
      }

      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);

      return `DETECTIVE ADVISORY: ${days}D ${hours}H LEFT ON THE CASE CLOCK. NO PRESSURE`;
    } catch (error) {
      return null;
    }
  }

  updateClock() {
    this.tvView?.setClock(this.getClockText());
  }

  /* ========================================================
     OPEN / START
     ======================================================== */

  playOpenAnimation() {
    const {
      root,
      backdrop
    } = this.tvView.ui;

    this.addTrackedTween(
      this.tweens.add({
        targets: backdrop,
        alpha: 1,
        duration: 150,
        ease: 'Quad.Out'
      })
    );

    this.isTransitioning = true;

    this.addTrackedTween(
      this.tweens.add({
        targets: root,
        alpha: 1,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => this.runStartupSequence()
      })
    );

    // zabezpieczenie: jeśli sekwencja startowa by się zawiesiła
    this.startupFallback = this.time.delayedCall(
      3000,
      () => this.startFirstSegment()
    );
  }

  runStartupSequence() {
    if (!this.sys.isActive() || this.isClosing) {
      return;
    }

    this.tvAudio?.powerOn();

    this.tvEffects?.powerOn(() => {
      if (!this.sys.isActive() || this.isClosing) {
        return;
      }

      this.tvAudio?.beep(1000, 0.28);

      this.tvEffects?.showBars(420, () => {
        if (!this.sys.isActive() || this.isClosing) {
          return;
        }

        this.tvEffects?.burst(160);
        this.tvAudio?.staticBurst(0.16);

        this.time.delayedCall(140, () => this.startFirstSegment());
      });
    });
  }

  startFirstSegment() {
    if (
      this.hasStarted ||
      !this.sys.isActive() ||
      this.isClosing
    ) {
      return;
    }

    this.hasStarted = true;
    this.isTransitioning = false;

    this.startupFallback?.remove?.(false);
    this.startupFallback = null;

    this.tvAudio?.startHum();

    this.playSegment(0);

    this.tvView?.showHint(
      'SPACE: NEXT   X: SKIP   P: PAUSE   ESC: EXIT',
      3200
    );
  }

  /* ========================================================
     SEGMENTS
     ======================================================== */

  getSegmentHoldDuration(segment) {
    return Math.max(
      segment?.hold || 0,
      this.minimumSegmentHold
    );
  }

  scheduleSegmentAdvance(segment) {
    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    const duration = this.getSegmentHoldDuration(segment);

    this.tvView?.startProgress(duration);

    this.advanceEvent = this.time.delayedCall(
      duration,
      () => {
        if (
          this.sys.isActive() &&
          !this.isBroadcastPaused &&
          !this.isClosing
        ) {
          this.advanceSegment();
        }
      }
    );

    this.advanceEvent.paused = this.isBroadcastPaused;
  }

  playSegment(index) {
    if (
      this.isClosing ||
      !this.segmentQueue.length ||
      index < 0 ||
      index >= this.segmentQueue.length
    ) {
      this.finishBroadcast();
      return;
    }

    this.clearTimers();

    this.isBroadcastPaused = false;

    this.tvView?.setPaused(false);
    this.tvControls?.refreshPauseVisual?.();

    this.currentSegmentIndex = index;
    this.currentSegment = this.segmentQueue[index];

    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.currentLinePrefix = '';
    this.currentLineFullText = '';

    this.isTyping = false;
    this.isTransitioning = false;

    const segment = this.currentSegment;

    const deadlineText = this.getDeadlineText();

    this.tvView.applySegment(
      segment,
      {
        anchorTextureKey: this.anchorTextureKey,
        anchorDisplayName: this.anchorDisplayName,
        isFirstSegment: index === 0,
        tickerExtras: deadlineText ? [deadlineText] : []
      }
    );

    this.tvView.setSegmentIndicator(
      index,
      this.segmentQueue.length
    );

    this.tvView.setBodyText('');

    if (segment.instant) {
      this.tvView.setBodyText(
        (segment.lines || []).join('\n')
      );

      this.scheduleSegmentAdvance(segment);
      return;
    }

    this.typeNextLine();
  }

  typeNextLine() {
    if (
      this.isClosing ||
      this.isBroadcastPaused ||
      !this.currentSegment ||
      !this.tvView?.isBodyTextActive()
    ) {
      return;
    }

    const lines = this.currentSegment.lines || [];

    if (this.currentLineIndex >= lines.length) {
      this.scheduleSegmentAdvance(
        this.currentSegment
      );

      return;
    }

    this.currentLineFullText =
      lines[this.currentLineIndex];

    const existingText =
      this.tvView.getBodyText().trim();

    this.currentLinePrefix = existingText
      ? `${existingText}\n`
      : '';

    this.currentCharIndex = 0;
    this.isTyping = true;

    const typingEvent = this.time.addEvent({
      delay: this.currentSegment.charDelay || 20,
      loop: true,
      callback: () => {
        if (
          !this.sys.isActive() ||
          this.isClosing ||
          this.isBroadcastPaused ||
          !this.currentSegment ||
          !this.tvView?.isBodyTextActive() ||
          this.typingEvent !== typingEvent
        ) {
          return;
        }

        this.currentCharIndex += 1;

        this.tvView.setBodyText(
          this.currentLinePrefix +
          this.currentLineFullText.slice(
            0,
            this.currentCharIndex
          )
        );

        if (
          this.currentCharIndex <
          this.currentLineFullText.length
        ) {
          return;
        }

        typingEvent.remove(false);

        if (this.typingEvent === typingEvent) {
          this.typingEvent = null;
        }

        this.isTyping = false;
        this.currentLineIndex += 1;

        this.advanceEvent = this.time.delayedCall(
          this.currentSegment.linePause || 250,
          () => {
            if (
              this.sys.isActive() &&
              !this.isBroadcastPaused &&
              !this.isClosing
            ) {
              this.typeNextLine();
            }
          }
        );
      }
    });

    typingEvent.paused = this.isBroadcastPaused;

    this.typingEvent = typingEvent;
  }

  /* ========================================================
     INPUT
     ======================================================== */

  onAdvancePressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused
    ) {
      return;
    }

    if (this.isTyping) {
      this.finishCurrentLine();
      return;
    }

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = null;

    this.advanceSegment();
  }

  onPrevPressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused ||
      this.currentSegmentIndex <= 0
    ) {
      return;
    }

    this.transitionToSegment(this.currentSegmentIndex - 1);
  }

  onSkipPressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused
    ) {
      return;
    }

    const newsIndex = this.segmentQueue.findIndex(
      segment => segment.type === 'news'
    );

    if (
      newsIndex === -1 ||
      (
        newsIndex === this.currentSegmentIndex &&
        !this.isTyping
      )
    ) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(newsIndex);
  }

  onClosePressed() {
    if (!this.isTransitioning && !this.isClosing) {
      this.finishBroadcast();
    }
  }

  onVolumeKnob() {
    this.volumeIndex =
      (this.volumeIndex + 1) % VOLUME_LEVELS.length;

    const level = VOLUME_LEVELS[this.volumeIndex];

    this.tvAudio?.setLevel(level);

    this.tvAudio?.click();

    this.tvView?.showOsd(
      level === 0
        ? 'VOLUME: MUTED'
        : `VOLUME: ${'|'.repeat(Math.round(level * 10))} ${Math.round(level * 100)}%`
    );
  }

  onTuneKnob() {
    this.tvEffects?.burst(220, 1);
    this.tvEffects?.glitch();

    this.tvAudio?.staticBurst(0.22, 0.6);

    this.tvView?.showOsd(
      Phaser.Utils.Array.GetRandom(TUNE_MESSAGES),
      1600
    );
  }

  toggleBroadcastPause() {
    if (this.isClosing || this.isTransitioning) {
      return;
    }

    this.isBroadcastPaused =
      !this.isBroadcastPaused;

    if (this.typingEvent) {
      this.typingEvent.paused =
        this.isBroadcastPaused;
    }

    if (this.advanceEvent) {
      this.advanceEvent.paused =
        this.isBroadcastPaused;
    }

    this.tvAudio?.click();

    this.tvView?.setPaused(this.isBroadcastPaused);
    this.tvControls?.refreshPauseVisual?.();
  }

  finishCurrentLine() {
    if (
      this.isClosing ||
      this.isBroadcastPaused ||
      !this.currentSegment ||
      !this.tvView?.isBodyTextActive()
    ) {
      return;
    }

    if (this.typingEvent?.remove) {
      this.typingEvent.remove(false);
    }

    this.typingEvent = null;

    this.tvView.setBodyText(
      this.currentLinePrefix +
      this.currentLineFullText
    );

    this.isTyping = false;
    this.currentLineIndex += 1;

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = this.time.delayedCall(
      this.currentSegment.linePause || 250,
      () => {
        if (
          this.sys.isActive() &&
          !this.isBroadcastPaused &&
          !this.isClosing
        ) {
          this.typeNextLine();
        }
      }
    );
  }

  /* ========================================================
     TRANSITIONS / CLOSE
     ======================================================== */

  advanceSegment() {
    if (
      this.isClosing ||
      this.isBroadcastPaused
    ) {
      return;
    }

    const nextIndex =
      this.currentSegmentIndex + 1;

    if (nextIndex >= this.segmentQueue.length) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(nextIndex);
  }

  transitionToSegment(index) {
    if (
      this.isClosing ||
      this.isBroadcastPaused
    ) {
      return;
    }

    this.clearTimers();

    this.isTransitioning = true;

    // "przełączenie kanału": szum + trzask
    this.tvEffects?.burst(170, 1);
    this.tvAudio?.staticBurst(0.16);

    this.time.delayedCall(140, () => {
      if (!this.sys.isActive() || this.isClosing) {
        return;
      }

      this.isTransitioning = false;

      this.playSegment(index);
    });
  }

  finishBroadcast() {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;

    this.clearTimers();

    this.tvView?.stopProgress();
    this.tvAudio?.stopHum();
    this.tvAudio?.powerOff();

    // zabezpieczenie, gdyby animacja power-off nigdy się nie zakończyła
    this.closeFallback = this.time.delayedCall(
      1200,
      () => this.completeClose()
    );

    const fadeOut = () => {
      const view = this.tvView;

      if (!view?.ui?.root) {
        this.completeClose();
        return;
      }

      this.addTrackedTween(
        this.tweens.add({
          targets: [
            view.ui.root,
            view.ui.backdrop
          ],
          alpha: 0,
          duration: 160,
          ease: 'Quad.In',
          onComplete: () => this.completeClose()
        })
      );
    };

    if (this.tvEffects) {
      this.tvEffects.powerOff(fadeOut);
    } else {
      fadeOut();
    }
  }

  completeClose() {
    if (this.closeCompleted) {
      return;
    }

    this.closeCompleted = true;

    this.closeFallback?.remove?.(false);
    this.closeFallback = null;

    this.restoreReturnScene();

    this.showNewsHudButtons?.();

    this.onClose?.({
      missionId:
        gameState.currentMission?.id || null,
      watched: true,
      lastSegmentType:
        this.currentSegment?.type || null
    });

    this.restoreUnderlyingHud();

    if (this.sys.isActive()) {
      this.scene.stop();
    }
  }

  restoreReturnScene() {
    if (
      !this.hasPausedReturnScene ||
      !this.returnSceneKey ||
      !this.hasScene(this.returnSceneKey)
    ) {
      return;
    }

    if (this.isScenePaused(this.returnSceneKey)) {
      this.scene.resume(this.returnSceneKey);
    } else if (this.isSceneSleeping(this.returnSceneKey)) {
      this.scene.wake(this.returnSceneKey);
    }

    this.hasPausedReturnScene = false;
  }

  clearTimers() {
    if (this.typingEvent?.remove) {
      this.typingEvent.remove(false);
    }

    this.typingEvent = null;

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = null;

    this.tvView?.stopProgress();

    this.isTyping = false;
  }

  handleShutdown() {
    this.clearTimers();

    this.clockEvent?.remove?.(false);
    this.clockEvent = null;

    this.startupFallback?.remove?.(false);
    this.startupFallback = null;

    this.closeFallback?.remove?.(false);
    this.closeFallback = null;

    this.tvEffects?.destroy?.();
    this.tvEffects = null;

    this.tvControls?.destroy?.();
    this.tvControls = null;

    this.tvView?.destroy?.();
    this.tvView = null;

    this.tvAudio?.destroy?.();
    this.tvAudio = null;

    this.restoreReturnScene();
    this.restoreUnderlyingHud();
    this.showNewsHudButtons?.();

    this.layout = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;
  }
}