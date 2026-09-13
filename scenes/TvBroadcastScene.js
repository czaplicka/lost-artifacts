import { gameState } from '../GameData.js';
import { getTVBroadcast } from '../tvBroadcastData.js';
import { EventBus } from '../EventBus.js';
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

export class TvBroadcastScene extends BaseScene {
  constructor() {
    super({ key: 'TvBroadcastScene' });

    this.returnSceneKey = null;
    this.pauseBelowScene = true;
    this.onClose = null;

    this.segmentQueue = [];
    this.currentSegmentIndex = 0;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.typingEvent = null;
    this.advanceEvent = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;

    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;

    this.tvView = null;
    this.tvEffects = null;
    this.tvControls = null;

    this.anchorTextureKey = null;
    this.anchorDisplayName = '';

    this.hasPausedReturnScene = false;

    this.minimumSegmentHold = 5000;
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey || null;

    this.pauseBelowScene =
      data.pauseBelowScene !== undefined
        ? Boolean(data.pauseBelowScene)
        : true;

    this.onClose =
      typeof data.onClose === 'function'
        ? data.onClose
        : null;

    this.segmentQueue = [];
    this.currentSegmentIndex = 0;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.typingEvent = null;
    this.advanceEvent = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;

    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;

    this.tvView = null;
    this.tvEffects = null;
    this.tvControls = null;

    this.anchorTextureKey = null;
    this.anchorDisplayName = '';

    this.hasPausedReturnScene = false;

    this.minimumSegmentHold = 5000;
  }

  preload() {
    if (!window.WebFont) {
      this.load.script(
        'webfont',
        'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
      );
    }

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

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    this.ensureFontsLoaded(() => {
      if (!this.sys.isActive()) {
        return;
      }

      this.setupSceneState();
      this.selectBroadcastAnchor();
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

      this.playOpenAnimation();
    });
  }

  ensureFontsLoaded(onReady) {
    if (!window.WebFont) {
      onReady();
      return;
    }

    window.WebFont.load({
      google: {
        families: [
          'PressStart2P',
          'SpecialElite'
        ]
      },
      active: onReady,
      inactive: onReady
    });
  }

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

    const effects =
      this.tvEffects.create(
        this.layout.screenWidth,
        this.layout.screenHeight
      );

    this.tvView.addScreenEffects(effects);

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

        isActionAllowed: () =>
          !this.isTransitioning &&
          !this.isClosing,

        isBroadcastPaused: () =>
          this.isBroadcastPaused
      }
    );

    this.tvControls.create(this.layout);
  }

  getRegisteredScene(sceneKey) {
    if (!this.hasScene(sceneKey)) {
      return null;
    }

    return this.scene.manager.keys[sceneKey] || null;
  }

  hideUnderlyingHud() {
    const playerHud = this.getRegisteredScene(
      'PlayerHudScene'
    );

    if (!playerHud) {
      return;
    }

    playerHud.closeAllUIPanels?.();
    playerHud.playerMenu?.close?.();

    if (this.isSceneActive('PlayerHudScene')) {
      playerHud.scene.setVisible(false);
    }
  }

  restoreUnderlyingHud() {
    const playerHud = this.getRegisteredScene(
      'PlayerHudScene'
    );

    if (playerHud) {
      playerHud.scene.setVisible(true);
    }

    EventBus.emit('showHUD');
  }

  setNewsHudButtonsVisible(visible) {
    const newsHud = this.getRegisteredScene('NewsHud');

    if (!newsHud?.events) {
      return;
    }

    newsHud.events.emit(
      'setNewspaperVisible',
      visible
    );

    newsHud.events.emit(
      'setTvVisible',
      visible
    );
  }

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

    this.addTrackedTween(
      this.tweens.add({
        targets: root,
        alpha: 1,
        scale: 1,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => {
          if (this.sys.isActive()) {
            this.playSegment(0);
          }
        }
      })
    );
  }

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

    this.advanceEvent = this.time.delayedCall(
      this.getSegmentHoldDuration(segment),
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

    this.tvView.applySegment(
      segment,
      {
        anchorTextureKey: this.anchorTextureKey,
        anchorDisplayName: this.anchorDisplayName,
        isFirstSegment: index === 0
      }
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

  onSkipPressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused
    ) {
      return;
    }

    const newsIndex = this.segmentQueue.findIndex(
      (segment) => segment.type === 'news'
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

  toggleBroadcastPause() {
    if (this.isClosing) {
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

    this.time.delayedCall(130, () => {
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

    const {
      root,
      backdrop
    } = this.tvView.ui;

    this.addTrackedTween(
      this.tweens.add({
        targets: [
          root,
          backdrop
        ],
        alpha: 0,
        duration: 180,
        ease: 'Quad.In',
        onComplete: () => {
          this.restoreReturnScene();

          this.setNewsHudButtonsVisible(true);

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
      })
    );
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

    this.isTyping = false;
  }

  handleShutdown() {
    this.clearTimers();

    this.tvEffects?.destroy?.();
    this.tvEffects = null;

    this.tvControls?.destroy?.();
    this.tvControls = null;

    this.tvView?.destroy?.();
    this.tvView = null;

    this.restoreReturnScene();

    this.restoreUnderlyingHud();

    this.setNewsHudButtonsVisible(true);

    this.layout = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;
  }
}