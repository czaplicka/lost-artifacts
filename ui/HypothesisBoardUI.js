import { audioManager } from '../managers/AudioManager.js';
import { FONT_TEXT } from './hypothesisBoard/BoardConstants.js';
import { BoardElements } from './hypothesisBoard/BoardElements.js';
import { BoardLayout } from './hypothesisBoard/BoardLayout.js';
import { BoardEffects } from './hypothesisBoard/BoardEffects.js';
import { BoardRefresh } from './hypothesisBoard/BoardRefresh.js';
import { BoardDeduction } from './hypothesisBoard/BoardDeduction.js';

export class HypothesisBoardUI {
  constructor(scene, {
    state,
    cards = [],
    slotLabels = [],
    buildSlotSentence = null,
    onCardTap = null,
    onSlotTap = null,
    onSlotRemove = null,
    onConfirm = null,
    onClose = null
  } = {}) {
    this.scene = scene;
    this.state = state;
    this.cards = Array.isArray(cards) ? cards : [];
    this.slotLabels = Array.isArray(slotLabels) ? slotLabels : [];

    this.buildSlotSentence =
      typeof buildSlotSentence === 'function'
        ? buildSlotSentence
        : null;

    this.onCardTap =
      typeof onCardTap === 'function'
        ? onCardTap
        : null;

    this.onSlotTap =
      typeof onSlotTap === 'function'
        ? onSlotTap
        : null;

    this.onSlotRemove =
      typeof onSlotRemove === 'function'
        ? onSlotRemove
        : null;

    this.onConfirm =
      typeof onConfirm === 'function'
        ? onConfirm
        : null;

    this.onClose =
      typeof onClose === 'function'
        ? onClose
        : null;

    this.overlay = null;
    this.panel = null;

    this.titleText = null;
    this.subtitleText = null;
    this.attemptsText = null;
    this.attemptsIcons = null;
    this.legendContainer = null;
    this.legendItems = [];
    this.feedbackText = null;
    this.stringGfx = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.slotViews = [];
    this.cardViews = [];

    this.layout = null;
    this.resizeHandler = null;
    this.isDestroyed = false;

    this._maxAttempts = 0;
    this._lastAttempts = null;
    this._lastFeedback = [];
    this._prevPlaced = [];
    this._stringProg = {};
    this._stringHolders = {};
    this._confirmPulseOn = false;
    this._keysBound = false;

    this._onEsc = () => {
      if (this.isDestroyed || this.state?.uiLocked) return;
      this.onClose?.();
    };

    this._onEnter = () => {
      if (this.isDestroyed) return;
      this._tryConfirm();
    };
  }

  _tween(config) {
    const s = this.scene;
    if (!s?.tweens || this.isDestroyed) return null;
    return typeof s.createTrackedTween === 'function'
      ? s.createTrackedTween(config)
      : s.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;
    const s = this.scene;
    if (typeof s?.killTrackedTweensOf === 'function') {
      s.killTrackedTweensOf(target);
    } else {
      s?.tweens?.killTweensOf(target);
    }
  }

  _sfx(key, volume = 0.5) {
    try {
      audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }
  }

  _setHit(obj, width, height, hand = true) {
    if (!obj) return;

    obj.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: hand
    });
  }

  create() {
    if (this.isDestroyed) {
      return;
    }

    const { width, height } = this.scene.scale;

    /*
     * Blokuje kliknięcia w scenę pod spodem.
     * Wszystkie elementy minigry mają większy depth.
     */
    this.overlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.86)
      .setOrigin(0)
      .setDepth(3000)
      .setInteractive();

    // Korkowa tablica śledczego (rysowana w drawBoard)
    this.panel = this.scene.add
      .graphics()
      .setDepth(3001);

    this.titleText = this.scene.add
      .text(width / 2, 0, 'RECONSTRUCT THE HEIST', {
        fontFamily: FONT_TEXT,
        fontSize: '36px',
        color: '#f7f1dc',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.subtitleText = this.scene.add
      .text(
        width / 2,
        0,
        'Select one clue below, then select the question it answers.',
        {
          fontFamily: FONT_TEXT,
          fontSize: '19px',
          color: '#e8d7a8',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(3010);

    this.attemptsText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: FONT_TEXT,
        fontSize: '21px',
        color: '#ffd966',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(3010);

    // Lupki: jedna na każdą pozostałą próbę
    this.attemptsIcons = this.scene.add
      .graphics()
      .setDepth(3010);

    this._maxAttempts = Math.max(
      this.state?.attemptsLeft ?? 0,
      1
    );

    this.createQuestionSlots();
    this.createEvidenceCards();
    this.createButtons();
    this.createDeductionControls();

    // Sznurki nad kartkami i slotami
    this.stringGfx = this.scene.add
      .graphics()
      .setDepth(3014);

    this.createLegend();

    this.feedbackText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: FONT_TEXT,
        fontSize: '19px',
        color: '#ffd966',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        wordWrap: {
          width: 700,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.resizeHandler = () => {
      if (this.isDestroyed) {
        return;
      }

      this.applyLayout();
      this.refresh();
    };

    this.scene.scale.on(
      'resize',
      this.resizeHandler,
      this
    );

    this._bindKeys();

    this.applyLayout();
    this.refresh();
    this._playIntro();
  }

  _bindKeys() {
    const kb = this.scene.input?.keyboard;
    if (!kb || this._keysBound) return;

    kb.on('keydown-ESC', this._onEsc);
    kb.on('keydown-ENTER', this._onEnter);
    this._keysBound = true;
  }

  _unbindKeys() {
    if (!this._keysBound) return;

    const kb = this.scene.input?.keyboard;
    kb?.off('keydown-ESC', this._onEsc);
    kb?.off('keydown-ENTER', this._onEnter);
    this._keysBound = false;
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.destroyDeductionControls();
    this.isDestroyed = true;

    this._unbindKeys();

    if (this.resizeHandler) {
      this.scene.scale.off(
        'resize',
        this.resizeHandler,
        this
      );
    }

    Object.values(this._stringHolders).forEach(h => this._kill(h));
    this._stringHolders = {};
    this._stringProg = {};

    this.slotViews.forEach(view => {
      this._kill(view.container);
      this._kill(view.glow);
      this._kill(view.box);

      [view.box, view.removeButton].forEach(item => {
        item?.removeAllListeners?.();
      });

      view.container?.destroy?.(true);
    });

    this.cardViews.forEach(view => {
      this._kill(view.container);

      view.box?.removeAllListeners?.();
      view.container?.destroy?.(true);
    });

    [
      this.overlay,
      this.panel,
      this.titleText,
      this.subtitleText,
      this.attemptsText,
      this.attemptsIcons,
      this.feedbackText,
      this.legendContainer,
      this.stringGfx,
      this.closeButton,
      this.confirmButton
    ].forEach(item => {
      this._kill(item);
      item?.removeAllListeners?.();
      item?.destroy?.();
    });

    this.slotViews = [];
    this.cardViews = [];
    this.legendItems = [];
    this.cards = [];
    this.layout = null;
    this.resizeHandler = null;
  }
}

Object.assign(
  HypothesisBoardUI.prototype,
  BoardElements,
  BoardLayout,
  BoardEffects,
  BoardRefresh,
  BoardDeduction
);
