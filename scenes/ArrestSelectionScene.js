import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { ensureHud } from '../hudHelpers.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  getRandomSuspectLineup,
  isCorrectSuspectChoice,
  getSuspectImageKey
} from '../suspects/suspectHelpers.js';

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite';

// Final, irreversible decision -> ask "are you sure?" before ending the game.
// Set to false to restore the old one-click arrest.
const REQUIRE_ARREST_CONFIRMATION = true;

const SLIDE_DISTANCE = 140;
const SLIDE_DURATION = 240;
const ARREST_COMMIT_DELAY = 750;

const DESK_TEXTURE_KEY = 'arrest_desk_tex';
const VIGNETTE_TEXTURE_KEY = 'arrest_vignette_tex';

const PAL = {
  gold: 0xd4af37,
  goldCss: '#D4AF37',
  ink: '#2b1a0e',
  inkSoft: '#7a5a38',
  cream: '#f6e9c4',
  creamWarm: '#f1dfb0',
  red: 0x8f1d14,
  redBright: 0xb3281c,
  redCss: '#8f1d14',
  brown: 0x57391d,
  brownHover: 0x7a5229,
  brownDark: 0x3a2916
};

const DEFAULT_DIALOGUE =
  'Compare each file with your evidence. One of them took the artifact. ' +
  'Choose wisely, detective.';

const DEFAULT_NOTE =
  '<  >  browse files   |   ENTER  arrest   |   Cross-check means, motive and opportunity.';

// Fields shown on the "Subject Record" page. Add/remove rows freely:
// { label: 'short label', key: 'property in suspects.json' }
const DOSSIER_FIELDS = [
  { label: 'SEX', key: 'gender' },
  { label: 'HAIR', key: 'hair' },
  { label: 'EYES', key: 'eyes' },
  { label: 'MARKS', key: 'features' },
  { label: 'ACCENT', key: 'accent' },
  { label: 'SKILLS', key: 'skills' },
  { label: 'HABITS', key: 'habitus' },
  { label: 'HANDED', key: 'handedness' },
  { label: 'BLOOD', key: 'bloodType' },
  { label: 'SHOES', key: 'shoeSizeCategory' }
];

// Sticky-note jokes. One is picked per suspect, no repeats inside a lineup.
const FIELD_NOTE_QUIPS = [
  'Suspicious. Then again, so is anyone holding a sandwich that long.',
  'Gut feeling: guilty. Gut is also hungry, so double-check.',
  'Alibi: "I was at home." Nobody has ever been at home.',
  'Has the face of someone who says "not me" a bit too early.',
  'Keep this one away from the evidence room. And the biscuits.',
  'My horoscope says never trust that haircut. Scorpios know.',
  'Would look great on a Wanted poster. Not proof, but still.',
  'Warning: photo may be fashionably misleading.',
  'If we are wrong, we blame the intern. We have no intern. Yet.',
  'Probably innocent. Probably. Check the shoes.'
];

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */

export class ArrestSelectionScene extends BaseScene {
  constructor() {
    super({ key: 'ArrestSelectionScene' });
    this.resetState();
  }

  resetState() {
    this.dialogueText = null;
    this.resultOverlay = null;
    this.resultPanel = null;
    this.resultTitle = null;
    this.resultText = null;
    this.continueBtn = null;

    this.nextSceneKey = 'GameOverScene';
    this.isLeaving = false;

    this.selectedSuspectId = null;
    this.suspectsPool = [];
    this.displaySuspects = [];
    this.quipOrder = [];

    this.selectionLocked = false;
    this.resultCommitted = false;
    this.currentSuspectIndex = 0;
    this.currentCard = null;
    this.isAnimatingSlide = false;
    this.confirmOpen = false;

    this.backdropRoot = null;
    this.viewerRoot = null;
    this.stripRoot = null;
    this.cardSlot = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.arrestButton = null;
    this.arrestButtonText = null;
    this.arrestGlow = null;
    this.arrestPulse = null;
    this.orderStamp = null;
    this.counterText = null;
    this.thumbs = [];

    this.backBtn = null;
    this.backBtnLabel = null;

    this.zoomOverlay = null;
    this.zoomImage = null;
    this.zoomCaption = null;
    this.zoomHintText = null;

    this.confirmOverlay = null;
    this.confirmBody = null;

    this.caseNumberText = null;
    this.bottomNoteText = null;

    this.onLeftKeyDown = null;
    this.onRightKeyDown = null;
    this.onEnterKeyDown = null;
    this.onEscKeyDown = null;
  }

  init() {
    this.resetState();
  }

  create() {
    super.create();

    audioManager.stopSfx();
    audioManager.stopAllMusic();

    ensureHud(this);
    this.closeAllUIPanels();

    EventBus.emit('hideHUD');

    const hud = this.scene.manager.keys.PlayerHudScene;
    hud?.hideHud?.();

    const newsHud = this.scene.manager.keys.NewsHud;
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (!gameState.arrestWarrantIssued) {
      gameState.finalArrestSuspectId = null;
      gameState.finalArrestResult = 'FAILURE';
      gameState.caseResolved = false;
      gameState.caseFailed = true;
      gameState.isGameActive = false;

      gameState.gameOverReason =
        'Without a signed warrant, the agency could not act in time. ' +
        'The thief escaped before the arrest team arrived.';

      saveGameState();

      this.scene.stop('CityScene');

      this.goto('GameOverScene', {
        title: 'THIEF ESCAPED',
        reasonCode: 'missing_warrant',
        caseId: gameState.currentCaseId,
        message: gameState.gameOverReason
      });

      return;
    }

    const suspectsData = this.cache.json.get('suspects');

    if (!Array.isArray(suspectsData) || suspectsData.length < 5) {
      console.error('suspects.json must contain at least 5 suspects.');

      this.goto('GameScene');
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    if (thiefId == null) {
      console.error('Missing current thief in gameState.');

      this.goto('GameScene');
      return;
    }

    this.suspectsPool = suspectsData;

    try {
      this.displaySuspects = getRandomSuspectLineup(
        suspectsData,
        thiefId,
        5
      );
    } catch (error) {
      console.error(
        '[ArrestSelectionScene] Could not prepare the final suspect dossier:',
        error
      );

      this.goto('GameScene', {
        arrestSetupFailed: true,
        errorMessage:
          'The suspect dossier could not be prepared. ' +
          'Return to headquarters and review the case file.'
      });

      return;
    }

    this.quipOrder = Phaser.Utils.Array.Shuffle(
      FIELD_NOTE_QUIPS.map((_, index) => index)
    );

    this.createBackdrop();
    this.createFolder();
    this.createHeader();
    this.createBackButton();
    this.createCardSlot();
    this.createControlStrip();
    this.createZoomOverlay();
    this.createConfirmOverlay();
    this.createResultOverlay();
    this.registerKeyboard();
    this.registerSceneCleanup();

    this.updatePagination();
  }

  /* ------------------------------------------------------------------------ */
  /*  LIFECYCLE                                                               */
  /* ------------------------------------------------------------------------ */

  registerKeyboard() {
    this.onLeftKeyDown = () => {
      if (this.canNavigate()) this.changeSuspect(-1);
    };

    this.onRightKeyDown = () => {
      if (this.canNavigate()) this.changeSuspect(1);
    };

    this.onEnterKeyDown = () => {
      if (this.confirmOpen) {
        this.confirmArrestFromModal();
        return;
      }

      if (this.resultCommitted && this.resultOverlay?.visible) {
        this.proceedFromResult();
        return;
      }

      if (this.canNavigate()) this.requestArrest();
    };

    this.onEscKeyDown = () => {
      if (this.zoomOverlay?.visible) {
        this.closeZoom();
        return;
      }

      if (this.confirmOpen) this.closeConfirm();
    };

    this.input.keyboard?.on('keydown-LEFT', this.onLeftKeyDown);
    this.input.keyboard?.on('keydown-RIGHT', this.onRightKeyDown);
    this.input.keyboard?.on('keydown-ENTER', this.onEnterKeyDown);
    this.input.keyboard?.on('keydown-ESC', this.onEscKeyDown);
  }

  registerSceneCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input?.keyboard) {
        if (this.onLeftKeyDown) {
          this.input.keyboard.off('keydown-LEFT', this.onLeftKeyDown);
        }

        if (this.onRightKeyDown) {
          this.input.keyboard.off('keydown-RIGHT', this.onRightKeyDown);
        }

        if (this.onEnterKeyDown) {
          this.input.keyboard.off('keydown-ENTER', this.onEnterKeyDown);
        }

        if (this.onEscKeyDown) {
          this.input.keyboard.off('keydown-ESC', this.onEscKeyDown);
        }
      }

      this.arrestPulse?.stop?.();
      this.arrestPulse = null;

      this.onLeftKeyDown = null;
      this.onRightKeyDown = null;
      this.onEnterKeyDown = null;
      this.onEscKeyDown = null;
    });
  }

  /* ------------------------------------------------------------------------ */
  /*  SMALL HELPERS                                                           */
  /* ------------------------------------------------------------------------ */

  hexToCss(hex) {
    return `#${hex.toString(16).padStart(6, '0')}`;
  }

  fitImage(image, maxW, maxH) {
    const src = image.texture?.getSourceImage?.();

    if (!src?.width || !src?.height) {
      image.setDisplaySize(maxW, maxH);
      return image;
    }

    const scale = Math.min(maxW / src.width, maxH / src.height);
    image.setDisplaySize(src.width * scale, src.height * scale);

    return image;
  }

  drawDotted(graphics, x1, x2, y, dash = 6, gap = 6) {
    for (let x = x1; x < x2; x += dash + gap) {
      graphics.lineBetween(x, y, Math.min(x + dash, x2), y);
    }
  }

  getSuspectField(suspect, key) {
    return suspect?.[key] ?? suspect?.publicProfile?.[key];
  }

  getSuspectDisplayName(suspect, index) {
    return (
      suspect?.name ||
      suspect?.fullName ||
      suspect?.title ||
      `Suspect ${index + 1}`
    );
  }

  formatDossierValue(value) {
    const text = Array.isArray(value)
      ? value.join(', ')
      : String(value ?? '').trim();

    if (!text) return 'Unknown';

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  getQuipFor(index) {
    const pick =
      this.quipOrder[index % this.quipOrder.length] ?? 0;

    return FIELD_NOTE_QUIPS[pick];
  }

  createStamp(x, y, label, fontSize, colorHex, rotation = 0) {
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_PIXEL,
        fontSize: `${fontSize}px`,
        color: this.hexToCss(colorHex)
      })
      .setOrigin(0.5);

    const w = text.width + 34;
    const h = text.height + 26;

    const outer = this.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setStrokeStyle(4, colorHex, 1);

    const inner = this.add
      .rectangle(0, 0, w - 12, h - 12, 0x000000, 0)
      .setStrokeStyle(1.5, colorHex, 1);

    return this.add
      .container(x, y, [outer, inner, text])
      .setRotation(rotation);
  }

  createButton(x, y, w, h, label, options = {}) {
    const {
      fontSize = 18,
      fill = PAL.brown,
      fillHover = PAL.brownHover,
      stroke = PAL.gold,
      textColor = '#fff3d0',
      font = FONT_PIXEL
    } = options;

    const bg = this.add
      .rectangle(0, 0, w, h, fill, 1)
      .setStrokeStyle(3, stroke, 1);

    const inner = this.add
      .rectangle(0, 0, w - 12, h - 12, fill, 0)
      .setStrokeStyle(1, stroke, 0.45);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: font,
        fontSize: `${fontSize}px`,
        color: textColor
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, inner, text]);

    container.setSize(w, h);
    container.bg = bg;
    container.label = text;
    container.fillNormal = fill;
    container.fillHover = fillHover;

    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (!container.input?.enabled) return;

      bg.setFillStyle(container.fillHover, 1);
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1.04,
        duration: 90
      });
    });

    container.on('pointerout', () => {
      bg.setFillStyle(
        container.input?.enabled
          ? container.fillNormal
          : bg.fillColor,
        1
      );

      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 90
      });
    });

    return container;
  }

  /* ------------------------------------------------------------------------ */
  /*  BACKDROP: wooden desk, props, vignette                                  */
  /* ------------------------------------------------------------------------ */

  ensureDecorTextures() {
    const { width, height } = this.scale;

    if (!this.textures.exists(DESK_TEXTURE_KEY)) {
      const tex = this.textures.createCanvas(
        DESK_TEXTURE_KEY,
        width,
        height
      );

      const ctx = tex?.getContext();

      if (ctx) {
        const plankH = 120;

        for (let y = 0; y < height; y += plankH) {
          const r = 70 + Math.floor(Math.random() * 18);
          const g = 46 + Math.floor(Math.random() * 12);
          const b = 28 + Math.floor(Math.random() * 8);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(0, y, width, plankH);

          for (let i = 0; i < 70; i += 1) {
            const gx = Math.random() * width;
            const gy = y + 6 + Math.random() * (plankH - 12);
            const len = 140 + Math.random() * 520;

            ctx.strokeStyle = `rgba(0, 0, 0, ${
              0.05 + Math.random() * 0.09
            })`;
            ctx.lineWidth = 1 + Math.random() * 1.6;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.bezierCurveTo(
              gx + len * 0.3,
              gy + (Math.random() - 0.5) * 6,
              gx + len * 0.6,
              gy + (Math.random() - 0.5) * 6,
              gx + len,
              gy + (Math.random() - 0.5) * 4
            );
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, y, width, 3);

          ctx.fillStyle = 'rgba(255, 220, 160, 0.06)';
          ctx.fillRect(0, y + 3, width, 2);

          const jointX = Math.random() * width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.fillRect(jointX, y, 3, plankH);
        }

        tex.refresh();
      }
    }

    if (!this.textures.exists(VIGNETTE_TEXTURE_KEY)) {
      const tex = this.textures.createCanvas(
        VIGNETTE_TEXTURE_KEY,
        width,
        height
      );

      const ctx = tex?.getContext();

      if (ctx) {
        const warm = ctx.createRadialGradient(
          width * 0.5,
          height * 0.42,
          40,
          width * 0.5,
          height * 0.42,
          height * 0.9
        );

        warm.addColorStop(0, 'rgba(255, 205, 120, 0.16)');
        warm.addColorStop(1, 'rgba(255, 205, 120, 0)');

        ctx.fillStyle = warm;
        ctx.fillRect(0, 0, width, height);

        const dark = ctx.createRadialGradient(
          width / 2,
          height / 2,
          height * 0.38,
          width / 2,
          height / 2,
          height * 1.0
        );

        dark.addColorStop(0, 'rgba(0, 0, 0, 0)');
        dark.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, width, height);

        tex.refresh();
      }
    }
  }

  createBackdrop() {
    const { width, height } = this.scale;

    this.ensureDecorTextures();

    this.backdropRoot = this.add
      .container(0, 0)
      .setDepth(300);

    const desk = this.add.image(width / 2, height / 2, DESK_TEXTURE_KEY);

    const props = this.add.graphics();

    // coffee ring peeking out from under the folder
    props.fillStyle(0x2a1709, 0.1);
    props.fillCircle(1850, 880, 60);
    props.lineStyle(7, 0x2a1709, 0.38);
    props.strokeCircle(1850, 880, 64);
    props.lineStyle(3, 0x2a1709, 0.25);
    props.strokeCircle(1853, 884, 57);

    // pencil lying on the desk (bottom-left)
    const pencil = this.add
      .graphics({ x: 215, y: 1002 })
      .setRotation(-0.22);

    pencil.fillStyle(0x000000, 0.25);
    pencil.fillRect(-146, 6, 300, 20);
    pencil.fillStyle(0xe2b53a, 1);
    pencil.fillRect(-150, -10, 300, 20);
    pencil.fillStyle(0xb8861b, 1);
    pencil.fillRect(-150, -2, 300, 4);
    pencil.fillStyle(0xc9c2b0, 1);
    pencil.fillRect(-168, -10, 18, 20);
    pencil.fillStyle(0xd9667a, 1);
    pencil.fillRect(-186, -10, 18, 20);
    pencil.fillStyle(0xe8cfa0, 1);
    pencil.fillTriangle(150, -10, 150, 10, 190, 0);
    pencil.fillStyle(0x2b2b2b, 1);
    pencil.fillTriangle(176, -3, 176, 3, 190, 0);

    const vignette = this.add.image(
      width / 2,
      height / 2,
      VIGNETTE_TEXTURE_KEY
    );

    this.backdropRoot.add([desk, props, pencil, vignette]);
  }

  /* ------------------------------------------------------------------------ */
  /*  FOLDER (static layer: folder, sheets, clip, labels)                     */
  /* ------------------------------------------------------------------------ */

  createFolder() {
    this.viewerRoot = this.add
      .container(0, 0)
      .setDepth(320);

    const g = this.add.graphics();

    // drop shadow
    g.fillStyle(0x000000, 0.42);
    g.fillRoundedRect(112, 168, 1720, 740, 18);

    // folder tab + body
    g.fillStyle(0xc9a15c, 1);
    g.fillRoundedRect(130, 116, 360, 40, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillRoundedRect(100, 150, 1720, 730, { tl: 0, tr: 18, bl: 18, br: 18 });

    g.lineStyle(3, 0x8c6a33, 1);
    g.strokeRoundedRect(100, 150, 1720, 730, { tl: 0, tr: 18, bl: 18, br: 18 });
    g.strokeRoundedRect(130, 116, 360, 40, { tl: 14, tr: 14, bl: 0, br: 0 });

    g.lineStyle(2, 0xe3c487, 0.7);
    g.lineBetween(104, 154, 1812, 154);

    // paper stack hints
    g.fillStyle(0xe6d8b8, 1);
    g.fillRoundedRect(148, 186, 750, 676, 4);
    g.fillRoundedRect(923, 186, 865, 676, 4);

    // sheet shadows
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(145, 184, 750, 676, 4);
    g.fillRoundedRect(920, 184, 865, 676, 4);

    // sheets
    g.fillStyle(0xf5ebd2, 1);
    g.fillRoundedRect(140, 178, 750, 676, 4);
    g.fillRoundedRect(915, 178, 865, 676, 4);

    g.lineStyle(2, 0xcdb98a, 1);
    g.strokeRoundedRect(140, 178, 750, 676, 4);
    g.strokeRoundedRect(915, 178, 865, 676, 4);

    // right page: header + signature line
    g.lineStyle(3, 0x4a2e17, 1);
    g.lineBetween(975, 232, 1735, 232);

    g.lineStyle(2, 0x4a2e17, 0.8);
    g.lineBetween(975, 800, 1500, 800);

    // paper clip
    g.lineStyle(4, 0x8a8f98, 1);
    g.strokeRoundedRect(944, 160, 28, 86, 13);
    g.strokeRoundedRect(951, 176, 14, 70, 7);

    const caseId =
      gameState.currentCaseId ??
      gameState.caseId ??
      '017';

    const caseNumber = String(caseId).padStart(3, '0');

    const tabText = this.add
      .text(310, 136, `CASE ${caseNumber}`, {
        fontFamily: FONT_PIXEL,
        fontSize: '13px',
        color: PAL.ink
      })
      .setOrigin(0.5);

    const pageTitle = this.add.text(975, 206, 'SUBJECT RECORD', {
      fontFamily: FONT_PIXEL,
      fontSize: '17px',
      color: PAL.ink
    });

    this.counterText = this.add
      .text(1735, 208, '', {
        fontFamily: FONT_PIXEL,
        fontSize: '12px',
        color: PAL.redCss
      })
      .setOrigin(1, 0);

    const signCaption = this.add.text(
      975,
      808,
      "Arresting officer's signature",
      {
        fontFamily: FONT_TYPE,
        fontSize: '16px',
        color: PAL.inkSoft
      }
    );

    const signScribble = this.add
      .text(1000, 764, '(sign here, detective)', {
        fontFamily: FONT_TYPE,
        fontSize: '28px',
        fontStyle: 'italic',
        color: '#6c7396'
      })
      .setAlpha(0.45)
      .setRotation(-0.03);

    const confidential = this.createStamp(
      1610,
      730,
      'CONFIDENTIAL',
      22,
      PAL.red,
      -0.2
    ).setAlpha(0.2);

    this.viewerRoot.add([
      g,
      tabText,
      pageTitle,
      this.counterText,
      signCaption,
      signScribble,
      confidential
    ]);
  }

  /* ------------------------------------------------------------------------ */
  /*  HEADER + BACK BUTTON                                                    */
  /* ------------------------------------------------------------------------ */

  createHeader() {
    const { width } = this.scale;

    const band = this.add.graphics().setDepth(335);

    band.fillStyle(0x1b120a, 0.94);
    band.fillRect(0, 0, width, 112);

    band.fillStyle(PAL.gold, 1);
    band.fillRect(0, 108, width, 4);

    band.fillStyle(0x000000, 0.4);
    band.fillRect(0, 112, width, 6);

    this.add
      .text(width / 2, 36, 'MARK AGENCY', {
        fontFamily: FONT_PIXEL,
        fontSize: '18px',
        color: PAL.goldCss,
        stroke: '#2e1f10',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(340);

    this.add
      .text(width / 2, 78, 'FINAL SUSPECT DOSSIER', {
        fontFamily: FONT_TYPE,
        fontSize: '34px',
        color: PAL.creamWarm
      })
      .setOrigin(0.5)
      .setDepth(340);

    const caseId =
      gameState.currentCaseId ??
      gameState.caseId ??
      '017';

    this.caseNumberText = this.add
      .text(
        width - 210,
        34,
        `CASE FILE ${String(caseId).padStart(3, '0')}`,
        {
          fontFamily: FONT_PIXEL,
          fontSize: '13px',
          color: '#fff4cf',
          backgroundColor: '#6e1f17',
          padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }
      )
      .setOrigin(0.5)
      .setDepth(341);

    this.createStamp(
      width - 210,
      80,
      'TOP PRIORITY',
      12,
      0xc0392b,
      -0.07
    ).setDepth(341);
  }

  createBackButton() {
    const baseX = 80;
    const baseY = 56;

    if (this.textures.exists('back')) {
      this.backBtn = this.add
        .image(baseX, baseY, 'back')
        .setInteractive({ useHandCursor: true })
        .setScale(0.42)
        .setDepth(345);

      this.addHoverEffect(this.backBtn, 0.42, 0.48);
    } else {
      this.backBtn = this.add
        .text(baseX, baseY, '<', {
          fontFamily: FONT_PIXEL,
          fontSize: '22px',
          color: '#f6e7bc',
          backgroundColor: '#3a2916'
        })
        .setOrigin(0.5)
        .setPadding(12)
        .setInteractive({ useHandCursor: true })
        .setDepth(345);

      this.backBtn.on('pointerover', () => {
        this.backBtn.setScale(1.06);
      });

      this.backBtn.on('pointerout', () => {
        this.backBtn.setScale(1);
      });
    }

    this.backBtnLabel = this.add
      .text(baseX + 70, baseY, 'BACK', {
        fontFamily: FONT_TYPE,
        fontSize: '24px',
        color: '#f5e7bf'
      })
      .setOrigin(0, 0.5)
      .setDepth(345);

    this.backBtn.on('pointerdown', () => {
      if (
        this.selectionLocked ||
        this.isAnimatingSlide ||
        this.isLeaving ||
        this.confirmOpen
      ) {
        return;
      }

      this.isLeaving = true;

      this.closeAllUIPanels();
      this.closeZoom();

      this.scene.stop('ArrestSelectionScene');
      this.scene.resume('CityScene');
    });
  }

  /* ------------------------------------------------------------------------ */
  /*  CARD SLOT + SUSPECT CARD                                                */
  /* ------------------------------------------------------------------------ */

  createCardSlot() {
    // Absolute coordinates inside cards, so the slot sits at 0,0.
    this.cardSlot = this.add.container(0, 0);
    this.viewerRoot.add(this.cardSlot);

    this.currentCard = this.buildSuspectCard(
      this.displaySuspects[this.currentSuspectIndex],
      this.currentSuspectIndex,
      0
    );

    this.cardSlot.add(this.currentCard);
  }

  buildSuspectCard(suspect, index, offsetX = 0) {
    const card = this.add.container(offsetX, 0);

    const name = this.getSuspectDisplayName(suspect, index);
    const imageKey = getSuspectImageKey(suspect);
    const hasPhoto = Boolean(imageKey && this.textures.exists(imageKey));

    /* ---------- LEFT PAGE: polaroid with surveillance photo ---------- */

    const polaroid = this.add
      .container(515, 440)
      .setRotation(-0.012);

    const pShadow = this.add.rectangle(8, 10, 640, 470, 0x000000, 0.28);

    const pFrame = this.add
      .rectangle(0, 0, 640, 470, 0xfbf4e0, 1)
      .setStrokeStyle(2, 0xcfc2a0, 1);

    const photoBg = this.add
      .rectangle(0, -50, 580, 326, 0x1c1814, 1)
      .setStrokeStyle(2, 0x6e5433, 1);

    polaroid.add([pShadow, pFrame, photoBg]);

    if (hasPhoto) {
      const photo = this.add.image(0, -50, imageKey);
      this.fitImage(photo, 580, 326);
      photo.setInteractive({ useHandCursor: true });

      const hoverFrame = this.add
        .rectangle(0, -50, 580, 326, 0xffffff, 0)
        .setStrokeStyle(5, PAL.gold, 1)
        .setVisible(false);

      photo.on('pointerover', () => hoverFrame.setVisible(true));
      photo.on('pointerout', () => hoverFrame.setVisible(false));
      photo.on('pointerdown', () => this.openZoom(imageKey, name));

      polaroid.add([photo, hoverFrame]);
    } else {
      const missing = this.add
        .text(0, -50, 'PHOTO MISSING', {
          fontFamily: FONT_PIXEL,
          fontSize: '18px',
          color: '#f7ebc6'
        })
        .setOrigin(0.5);

      polaroid.add(missing);
    }

    const tagBg = this.add.rectangle(-160, -197, 260, 28, 0x000000, 0.65);

    const tagText = this.add
      .text(-160, -197, 'SURVEILLANCE PHOTO', {
        fontFamily: FONT_PIXEL,
        fontSize: '10px',
        color: PAL.goldCss
      })
      .setOrigin(0.5);

    const caption = this.add
      .text(0, 148, name, {
        fontFamily: FONT_TYPE,
        fontSize: '36px',
        color: PAL.ink,
        align: 'center',
        wordWrap: { width: 600 }
      })
      .setOrigin(0.5);

    polaroid.add([tagBg, tagText, caption]);

    if (hasPhoto) {
      const hint = this.add
        .text(0, 198, 'click photo to enlarge', {
          fontFamily: FONT_TYPE,
          fontSize: '18px',
          color: '#8a6a44'
        })
        .setOrigin(0.5);

      polaroid.add(hint);
    }

    const tapeLeft = this.add
      .rectangle(-250, -232, 120, 32, 0xe8d9a0, 0.78)
      .setRotation(-0.5);

    const tapeRight = this.add
      .rectangle(250, -232, 120, 32, 0xe8d9a0, 0.78)
      .setRotation(0.5);

    polaroid.add([tapeLeft, tapeRight]);

    /* ---------- LEFT PAGE: sticky note ---------- */

    const sticky = this.add
      .container(515, 772)
      .setRotation(0.012);

    const stickyShadow = this.add.rectangle(5, 7, 560, 140, 0x000000, 0.25);

    const stickyBody = this.add
      .rectangle(0, 0, 560, 140, 0xf7e47f, 1)
      .setStrokeStyle(2, 0xd8bd47, 1);

    const stickyTape = this.add.rectangle(0, -70, 120, 22, 0xe8d9a0, 0.7);

    const stickyHeader = this.add.text(-258, -54, 'NOTE TO SELF', {
      fontFamily: FONT_PIXEL,
      fontSize: '10px',
      color: '#8a6a14'
    });

    const stickyText = this.add.text(
      -258,
      -30,
      this.getQuipFor(index),
      {
        fontFamily: FONT_TYPE,
        fontSize: '23px',
        color: '#4a3512',
        lineSpacing: 4,
        wordWrap: { width: 516 }
      }
    );

    sticky.add([
      stickyShadow,
      stickyBody,
      stickyTape,
      stickyHeader,
      stickyText
    ]);

    /* ---------- RIGHT PAGE: typed record ---------- */

    const mugKey = suspect?.portraitKey;
    const hasMug = Boolean(
      mugKey &&
        mugKey !== imageKey &&
        this.textures.exists(mugKey)
    );

    const nameLabel = this.add.text(975, 246, 'NAME', {
      fontFamily: FONT_PIXEL,
      fontSize: '10px',
      color: PAL.inkSoft
    });

    const nameText = this.add.text(975, 262, name.toUpperCase(), {
      fontFamily: FONT_TYPE,
      fontSize: '40px',
      color: PAL.ink,
      wordWrap: { width: hasMug ? 600 : 760 }
    });

    const rule = this.add.graphics();
    rule.lineStyle(2, 0x4a2e17, 0.7);
    rule.lineBetween(975, 322, hasMug ? 1590 : 1735, 322);

    const dotted = this.add.graphics();
    dotted.lineStyle(1, 0x8b6840, 0.6);

    card.add([polaroid, sticky, nameLabel, nameText, rule, dotted]);

    const labelX = 975;
    const valueX = 1135;
    let rowY = 338;

    DOSSIER_FIELDS.forEach(({ label, key }) => {
      const value = this.formatDossierValue(
        this.getSuspectField(suspect, key)
      );

      const labelText = this.add.text(labelX, rowY + 9, label, {
        fontFamily: FONT_PIXEL,
        fontSize: '11px',
        color: PAL.inkSoft
      });

      const valueText = this.add.text(valueX, rowY, value, {
        fontFamily: FONT_TYPE,
        fontSize: '25px',
        color: PAL.ink,
        wordWrap: { width: 480 }
      });

      const rowHeight = Math.max(40, valueText.height + 12);

      this.drawDotted(dotted, labelX, 1735, rowY + rowHeight - 4);

      card.add([labelText, valueText]);

      rowY += rowHeight;
    });

    if (hasMug) {
      const mug = this.add.container(1680, 290).setRotation(0.03);

      const mugShadow = this.add.rectangle(5, 6, 128, 152, 0x000000, 0.25);

      const mugFrame = this.add
        .rectangle(0, 0, 128, 152, 0xfbf4e0, 1)
        .setStrokeStyle(2, 0xcfc2a0, 1);

      const mugImage = this.add.image(0, -6, mugKey);
      this.fitImage(mugImage, 112, 136);

      const mugTape = this.add
        .rectangle(0, -76, 60, 18, 0xe8d9a0, 0.78)
        .setRotation(0.1);

      mug.add([mugShadow, mugFrame, mugImage, mugTape]);
      card.add(mug);
    }

    card.frame = pFrame;
    card.polaroidFrame = pFrame;
    card.suspectId = suspect?.id;

    return card;
  }

  /* ------------------------------------------------------------------------ */
  /*  CONTROL STRIP: arrows, thumbnails, arrest button, notes                 */
  /* ------------------------------------------------------------------------ */

  createControlStrip() {
    this.stripRoot = this.add
      .container(0, 0)
      .setDepth(325);

    const y = 985;

    this.dialogueText = this.add
      .text(960, 912, DEFAULT_DIALOGUE, {
        fontFamily: FONT_TYPE,
        fontSize: '22px',
        color: PAL.creamWarm,
        align: 'center',
        wordWrap: { width: 1500 }
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 3, false, true);

    this.bottomNoteText = this.add
      .text(960, 1058, DEFAULT_NOTE, {
        fontFamily: FONT_TYPE,
        fontSize: '17px',
        color: '#b39a6c',
        align: 'center'
      })
      .setOrigin(0.5)
      .setShadow(1, 1, '#000000', 2, false, true);

    this.leftArrow = this.createButton(500, y, 60, 64, '<', {
      fontSize: '26px'
    });

    this.rightArrow = this.createButton(1420, y, 60, 64, '>', {
      fontSize: '26px'
    });

    this.leftArrow.on('pointerdown', () => {
      if (this.canNavigate()) this.changeSuspect(-1);
    });

    this.rightArrow.on('pointerdown', () => {
      if (this.canNavigate()) this.changeSuspect(1);
    });

    this.createThumbnails(y);
    this.createArrestButton(1650, y);

    this.stripRoot.add([
      this.dialogueText,
      this.bottomNoteText,
      this.leftArrow,
      this.rightArrow,
      this.arrestButton
    ]);
  }

  createThumbnails(y) {
    this.thumbs = [];

    const count = this.displaySuspects.length;
    const w = 146;
    const h = 98;
    const gap = 14;
    const total = count * w + (count - 1) * gap;
    const startX = 960 - total / 2 + w / 2;

    this.displaySuspects.forEach((suspect, index) => {
      const imageKey = getSuspectImageKey(suspect);

      const shadow = this.add.rectangle(3, 5, w, h, 0x000000, 0.35);

      const frame = this.add
        .rectangle(0, 0, w, h, 0xfbf4e0, 1)
        .setStrokeStyle(3, 0x8b6840, 1);

      const photoBg = this.add.rectangle(0, -8, 130, 73, 0x1c1814, 1);

      const children = [shadow, frame, photoBg];

      if (imageKey && this.textures.exists(imageKey)) {
        const image = this.add.image(0, -8, imageKey);
        this.fitImage(image, 130, 73);
        children.push(image);
      } else {
        children.push(
          this.add
            .text(0, -8, '?', {
              fontFamily: FONT_PIXEL,
              fontSize: '22px',
              color: '#f7ebc6'
            })
            .setOrigin(0.5)
        );
      }

      children.push(
        this.add
          .text(0, 37, `FILE ${index + 1}`, {
            fontFamily: FONT_PIXEL,
            fontSize: '9px',
            color: PAL.ink
          })
          .setOrigin(0.5)
      );

      const thumb = this.add.container(
        startX + index * (w + gap),
        y,
        children
      );

      thumb.setSize(w, h);
      thumb.frame = frame;
      thumb.setInteractive({ useHandCursor: true });

      thumb.on('pointerdown', () => this.goToSuspect(index));

      thumb.on('pointerover', () => {
        if (
          index !== this.currentSuspectIndex &&
          thumb.input?.enabled
        ) {
          thumb.setAlpha(0.95);
        }
      });

      thumb.on('pointerout', () => this.refreshThumbs());

      this.thumbs.push(thumb);
      this.stripRoot.add(thumb);
    });
  }

  createArrestButton(x, y) {
    const w = 320;
    const h = 84;

    const glow = this.add
      .rectangle(0, 0, w + 14, h + 14, 0xff3b2a, 0.12)
      .setStrokeStyle(3, 0xff6a4a, 0.7);

    const bg = this.add
      .rectangle(0, 0, w, h, PAL.red, 1)
      .setStrokeStyle(3, 0xf7e6bc, 1);

    const inner = this.add
      .rectangle(0, 0, w - 14, h - 14, PAL.red, 0)
      .setStrokeStyle(1, 0xf7e6bc, 0.5);

    this.arrestButtonText = this.add
      .text(0, -9, 'ARREST', {
        fontFamily: FONT_PIXEL,
        fontSize: '26px',
        color: '#fff7de'
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(0, 22, 'SIGN THE ORDER', {
        fontFamily: FONT_TYPE,
        fontSize: '16px',
        color: '#f3d9c4'
      })
      .setOrigin(0.5);

    this.arrestGlow = glow;

    this.arrestButton = this.add.container(x, y, [
      glow,
      bg,
      inner,
      this.arrestButtonText,
      sub
    ]);

    this.arrestButton.setSize(w, h);
    this.arrestButton.bg = bg;
    this.arrestButton.fillNormal = PAL.red;
    this.arrestButton.fillHover = PAL.redBright;
    this.arrestButton.setInteractive({ useHandCursor: true });

    this.arrestButton.on('pointerover', () => {
      if (!this.arrestButton.input?.enabled) return;

      bg.setFillStyle(PAL.redBright, 1);
      this.tweens.killTweensOf(this.arrestButton);
      this.tweens.add({
        targets: this.arrestButton,
        scale: 1.04,
        duration: 90
      });
    });

    this.arrestButton.on('pointerout', () => {
      if (this.arrestButton.input?.enabled) {
        bg.setFillStyle(PAL.red, 1);
      }

      this.tweens.killTweensOf(this.arrestButton);
      this.tweens.add({
        targets: this.arrestButton,
        scale: 1,
        duration: 90
      });
    });

    this.arrestButton.on('pointerdown', () => {
      this.requestArrest();
    });

    this.startArrestPulse();
  }

  startArrestPulse() {
    this.arrestPulse?.stop?.();

    if (!this.arrestGlow) return;

    this.arrestPulse = this.tweens.add({
      targets: this.arrestGlow,
      alpha: { from: 0.4, to: 1 },
      scaleX: { from: 1, to: 1.06 },
      scaleY: { from: 1, to: 1.12 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  stopArrestPulse() {
    this.arrestPulse?.stop?.();
    this.arrestPulse = null;

    this.arrestGlow?.setAlpha(0.12).setScale(1);
  }

  /* ------------------------------------------------------------------------ */
  /*  ZOOM OVERLAY                                                            */
  /* ------------------------------------------------------------------------ */

  createZoomOverlay() {
    const { width, height } = this.scale;

    this.zoomOverlay = this.add
      .container(0, 0)
      .setDepth(800)
      .setVisible(false);

    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x0d0804, 0.95)
      .setInteractive({ useHandCursor: true });

    const frameShadow = this.add.rectangle(
      width / 2 + 10,
      height / 2 + 28,
      1480,
      900,
      0x000000,
      0.35
    );

    const frame = this.add
      .rectangle(width / 2, height / 2 + 18, 1480, 900, 0xfbf4e0, 1)
      .setStrokeStyle(3, 0xcfc2a0, 1);

    const photoBg = this.add
      .rectangle(width / 2, 499, 1420, 798, 0x1c1814, 1)
      .setStrokeStyle(2, 0x6e5433, 1);

    this.zoomImage = this.add
      .image(width / 2, 499, '__DEFAULT')
      .setVisible(false);

    this.zoomCaption = this.add
      .text(width / 2, 936, '', {
        fontFamily: FONT_TYPE,
        fontSize: '38px',
        color: PAL.ink
      })
      .setOrigin(0.5);

    this.zoomHintText = this.add
      .text(
        width / 2,
        height - 38,
        'CLICK ANYWHERE TO CLOSE',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '14px',
          color: '#fff4d6'
        }
      )
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.closeZoom());

    this.zoomOverlay.add([
      bg,
      frameShadow,
      frame,
      photoBg,
      this.zoomImage,
      this.zoomCaption,
      this.zoomHintText
    ]);
  }

  openZoom(imageKey, caption = '') {
    if (
      this.selectionLocked ||
      this.isAnimatingSlide ||
      this.isLeaving ||
      this.confirmOpen ||
      !imageKey ||
      !this.textures.exists(imageKey) ||
      !this.zoomOverlay ||
      !this.zoomImage
    ) {
      return;
    }

    this.zoomImage.setTexture(imageKey);
    this.fitImage(this.zoomImage, 1420, 798);
    this.zoomImage.setVisible(true);

    this.zoomCaption?.setText(caption);

    this.tweens.killTweensOf(this.zoomOverlay);
    this.zoomOverlay.setAlpha(0).setVisible(true);

    this.tweens.add({
      targets: this.zoomOverlay,
      alpha: 1,
      duration: 140
    });
  }

  closeZoom() {
    if (!this.zoomOverlay) return;

    this.tweens.killTweensOf(this.zoomOverlay);

    this.zoomOverlay.setVisible(false).setAlpha(1);
    this.zoomImage?.setVisible(false);
  }

  /* ------------------------------------------------------------------------ */
  /*  CONFIRMATION MODAL                                                      */
  /* ------------------------------------------------------------------------ */

  createConfirmOverlay() {
    const { width, height } = this.scale;

    this.confirmOverlay = this.add
      .container(0, 0)
      .setDepth(600)
      .setVisible(false);

    const dim = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setInteractive();

    const panel = this.add.container(width / 2, height / 2);

    const shadow = this.add.rectangle(10, 12, 900, 380, 0x000000, 0.3);

    const paper = this.add
      .rectangle(0, 0, 900, 380, 0xf5ebd2, 1)
      .setStrokeStyle(4, 0x5e3d20, 1);

    const band = this.add.rectangle(0, -150, 900, 80, 0x4a3118, 1);

    const title = this.add
      .text(0, -150, 'ISSUE ARREST ORDER?', {
        fontFamily: FONT_PIXEL,
        fontSize: '24px',
        color: PAL.goldCss
      })
      .setOrigin(0.5);

    this.confirmBody = this.add
      .text(0, -30, '', {
        fontFamily: FONT_TYPE,
        fontSize: '32px',
        color: PAL.ink,
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: 780 }
      })
      .setOrigin(0.5);

    const yesBtn = this.createButton(-190, 120, 320, 70, 'ARREST', {
      fontSize: '20px',
      fill: PAL.red,
      fillHover: PAL.redBright,
      stroke: 0xf7e6bc
    });

    const noBtn = this.createButton(190, 120, 320, 70, 'KEEP LOOKING', {
      fontSize: '16px'
    });

    yesBtn.on('pointerdown', () => this.confirmArrestFromModal());
    noBtn.on('pointerdown', () => this.closeConfirm());

    panel.add([
      shadow,
      paper,
      band,
      title,
      this.confirmBody,
      yesBtn,
      noBtn
    ]);

    this.confirmOverlay.add([dim, panel]);
  }

  openConfirm(suspect) {
    if (!this.confirmOverlay || this.confirmOpen) return;

    const name = this.getSuspectDisplayName(
      suspect,
      this.currentSuspectIndex
    );

    this.confirmBody.setText(
      `You are about to detain\n${name.toUpperCase()}.\nThis decision is final.`
    );

    this.confirmOpen = true;
    this.confirmOverlay.setAlpha(0).setVisible(true);

    this.tweens.add({
      targets: this.confirmOverlay,
      alpha: 1,
      duration: 120
    });
  }

  closeConfirm() {
    if (!this.confirmOverlay) return;

    this.tweens.killTweensOf(this.confirmOverlay);

    this.confirmOverlay.setVisible(false).setAlpha(1);
    this.confirmOpen = false;
  }

  confirmArrestFromModal() {
    if (!this.confirmOpen) return;

    this.closeConfirm();
    this.beginArrest();
  }

  /* ------------------------------------------------------------------------ */
  /*  RESULT OVERLAY                                                          */
  /* ------------------------------------------------------------------------ */

  createResultOverlay() {
    const { width, height } = this.scale;

    this.resultOverlay = this.add
      .container(0, 0)
      .setDepth(700)
      .setVisible(false);

    const darkBg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setInteractive();

    this.resultPanel = this.add.container(width / 2, height / 2);

    const shadow = this.add.rectangle(10, 12, 900, 430, 0x000000, 0.3);

    const panel = this.add
      .rectangle(0, 0, 900, 430, 0xf5ebd2, 1)
      .setStrokeStyle(4, 0x5e3d20, 1);

    const band = this.add.rectangle(0, -180, 900, 70, 0x4a3118, 1);

    this.resultTitle = this.add
      .text(0, -180, '', {
        fontFamily: FONT_PIXEL,
        fontSize: '24px',
        color: PAL.goldCss,
        align: 'center'
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(0, -40, '', {
        fontFamily: FONT_TYPE,
        fontSize: '30px',
        color: PAL.ink,
        align: 'center',
        wordWrap: { width: 780 },
        lineSpacing: 10
      })
      .setOrigin(0.5);

    const filedStamp = this.createStamp(
      300,
      110,
      'FILED',
      22,
      PAL.red,
      -0.22
    ).setAlpha(0.85);

    this.continueBtn = this.createButton(0, 150, 300, 66, 'CONTINUE', {
      fontSize: '18px'
    });

    this.continueBtn.on('pointerdown', () => this.proceedFromResult());

    this.resultPanel.add([
      shadow,
      panel,
      band,
      this.resultTitle,
      this.resultText,
      filedStamp,
      this.continueBtn
    ]);

    this.resultOverlay.add([darkBg, this.resultPanel]);
  }

  showResult(title, message) {
    this.resultTitle.setText(title);
    this.resultText.setText(message);

    this.resultOverlay.setVisible(true);
    this.resultPanel.setScale(0.9).setAlpha(0);

    this.tweens.add({
      targets: this.resultPanel,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.Out'
    });
  }

  proceedFromResult() {
    if (this.isLeaving || !this.resultCommitted) return;

    this.isLeaving = true;
    this.continueBtn?.disableInteractive();

    const isCorrect = gameState.finalArrestResult === 'SUCCESS';

    const nextSceneKey = isCorrect
      ? 'SuccessScene'
      : 'GameOverScene';

    const payload = {
      caseId: gameState.currentCaseId,
      suspectId: gameState.finalArrestSuspectId,
      source: 'final_arrest',

      reasonCode: isCorrect
        ? 'correct_arrest'
        : 'wrong_arrest'
    };

    if (!isCorrect) {
      payload.title = 'FALSE ARREST';

      payload.message =
        gameState.gameOverReason ||
        'Incorrect suspect detained. The real thief escaped.';
    }

    this.resultOverlay.setVisible(false);
    this.scene.stop('CityScene');

    this.goto(nextSceneKey, payload);
  }

  /* ------------------------------------------------------------------------ */
  /*  NAVIGATION                                                              */
  /* ------------------------------------------------------------------------ */

  goToSuspect(index) {
    if (
      !this.canNavigate() ||
      index === this.currentSuspectIndex ||
      index < 0 ||
      index >= this.displaySuspects.length
    ) {
      return;
    }

    const direction = index > this.currentSuspectIndex ? 1 : -1;

    this.changeSuspect(direction, index);
  }

  changeSuspect(direction, targetIndex = null) {
    if (!this.displaySuspects.length || !this.canNavigate()) {
      return;
    }

    const total = this.displaySuspects.length;

    const nextIndex =
      targetIndex !== null
        ? targetIndex
        : (this.currentSuspectIndex + direction + total) % total;

    if (nextIndex === this.currentSuspectIndex) return;

    this.closeZoom();

    this.isAnimatingSlide = true;
    this.disableNavigation();

    this.currentSuspectIndex = nextIndex;

    const oldCard = this.currentCard;

    const newCard = this.buildSuspectCard(
      this.displaySuspects[nextIndex],
      nextIndex,
      direction * SLIDE_DISTANCE
    );

    newCard.setAlpha(0);

    this.cardSlot.add(newCard);
    this.updatePagination();

    this.tweens.add({
      targets: oldCard,
      x: -direction * SLIDE_DISTANCE,
      alpha: 0,
      duration: SLIDE_DURATION,
      ease: 'Cubic.Out'
    });

    this.tweens.add({
      targets: newCard,
      x: 0,
      alpha: 1,
      duration: SLIDE_DURATION,
      ease: 'Cubic.Out',

      onComplete: () => {
        if (oldCard) {
          this.cardSlot.remove(oldCard, true);
        }

        this.currentCard = newCard;
        this.isAnimatingSlide = false;

        if (!this.selectionLocked) {
          this.enableNavigation();
        }

        this.dialogueText?.setText(DEFAULT_DIALOGUE);
        this.bottomNoteText?.setText(DEFAULT_NOTE);
      }
    });
  }

  updatePagination() {
    this.counterText?.setText(
      `FILE ${this.currentSuspectIndex + 1} / ${this.displaySuspects.length}`
    );

    this.refreshThumbs();
  }

  refreshThumbs() {
    this.thumbs.forEach((thumb, index) => {
      const active = index === this.currentSuspectIndex;

      thumb.frame.setStrokeStyle(
        active ? 5 : 3,
        active ? PAL.gold : 0x8b6840,
        1
      );

      thumb.setScale(active ? 1.07 : 1);
      thumb.setAlpha(active ? 1 : 0.6);
    });
  }

  canNavigate() {
    return (
      !this.selectionLocked &&
      !this.resultCommitted &&
      !this.isAnimatingSlide &&
      !this.isLeaving &&
      !this.confirmOpen &&
      !this.zoomOverlay?.visible
    );
  }

  disableNavigation() {
    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      arrow?.disableInteractive();
      arrow?.setAlpha(0.45);
    });

    this.thumbs.forEach((thumb) => thumb.disableInteractive());
  }

  enableNavigation() {
    if (
      this.selectionLocked ||
      this.resultCommitted ||
      this.isLeaving
    ) {
      return;
    }

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      arrow?.setInteractive({ useHandCursor: true });
      arrow?.setAlpha(1);
    });

    this.thumbs.forEach((thumb) =>
      thumb.setInteractive({ useHandCursor: true })
    );

    this.refreshThumbs();
  }

  /* ------------------------------------------------------------------------ */
  /*  ARREST FLOW                                                             */
  /* ------------------------------------------------------------------------ */

  requestArrest() {
    if (!this.canNavigate() || this.resultCommitted) return;

    const suspect = this.displaySuspects[this.currentSuspectIndex];

    if (!suspect) return;

    if (REQUIRE_ARREST_CONFIRMATION) {
      this.openConfirm(suspect);
      return;
    }

    this.beginArrest();
  }

  beginArrest() {
    if (this.resultCommitted || this.selectionLocked || this.isLeaving) {
      return;
    }

    const suspect = this.displaySuspects[this.currentSuspectIndex];

    if (!suspect) return;

    this.selectionLocked = true;
    this.selectedSuspectId = suspect.id;

    this.disableNavigation();

    this.arrestButton.disableInteractive();
    this.arrestButton.bg.setFillStyle(0x555555, 1);
    this.arrestButtonText.setAlpha(0.7);
    this.stopArrestPulse();

    this.dialogueText.setText(
      'Arrest order submitted. The team is moving in to detain the suspect...'
    );

    this.bottomNoteText.setText(
      'The case will be reviewed once the suspect is in custody.'
    );

    this.currentCard?.polaroidFrame?.setStrokeStyle(5, PAL.red, 1);

    // rubber stamp slam on the record page (identical for every suspect)
    this.orderStamp?.destroy();

    this.orderStamp = this.createStamp(
      1450,
      690,
      'ORDER SIGNED',
      26,
      0xb3281c,
      -0.18
    )
      .setDepth(340)
      .setAlpha(0)
      .setScale(3.2);

    this.tweens.add({
      targets: this.orderStamp,
      alpha: 0.92,
      scale: 1,
      duration: 260,
      ease: 'Cubic.In',
      onComplete: () => {
        this.cameras.main.shake(120, 0.004);
      }
    });

    this.time.delayedCall(ARREST_COMMIT_DELAY, () =>
      this.confirmSelection()
    );
  }

  confirmSelection() {
    if (this.resultCommitted || this.isLeaving) {
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    const selectedSuspectId = this.selectedSuspectId;

    if (selectedSuspectId == null || thiefId == null) {
      console.error(
        '[ArrestSelectionScene] Cannot submit arrest: missing suspect data.',
        { selectedSuspectId, thiefId }
      );

      this.selectionLocked = false;
      this.enableNavigation();

      this.orderStamp?.destroy();
      this.orderStamp = null;

      this.arrestButton
        ?.setInteractive({ useHandCursor: true });
      this.arrestButton?.bg?.setFillStyle(PAL.red, 1);
      this.arrestButtonText?.setAlpha(1);
      this.startArrestPulse();

      this.dialogueText?.setText(
        'The arrest order could not be submitted. ' +
          'Review the dossier and try again.'
      );

      this.bottomNoteText?.setText(
        'Missing suspect data. No arrest has been recorded.'
      );

      return;
    }

    const isCorrect = isCorrectSuspectChoice(
      selectedSuspectId,
      thiefId
    );

    this.resultCommitted = true;
    this.selectionLocked = true;

    this.disableNavigation();
    this.arrestButton?.disableInteractive();
    this.closeZoom();

    // Internal result used by the ending scenes.
    // This scene awards no points, reputation or integrity.
    gameState.finalArrestSuspectId = selectedSuspectId;

    gameState.finalArrestResult = isCorrect
      ? 'SUCCESS'
      : 'FAILURE';

    gameState.caseResolved = isCorrect;
    gameState.caseFailed = !isCorrect;
    gameState.isGameActive = false;

    gameState.gameOverReason = isCorrect
      ? ''
      : 'Incorrect suspect detained. The real thief escaped before the bureau could act.';

    this.nextSceneKey = isCorrect
      ? 'SuccessScene'
      : 'GameOverScene';

    const saved = saveGameState();

    if (!saved) {
      console.warn(
        '[ArrestSelectionScene] Arrest decision is in memory, ' +
          'but saving the game failed.'
      );
    }

    // Identical confirmation for correct and wrong picks (no spoilers).
    this.showResult(
      'SUSPECT DETAINED',
      'The selected suspect has been taken into custody. ' +
        'Your report has been forwarded to the bureau for review.'
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  MISC                                                                    */
  /* ------------------------------------------------------------------------ */

  closeAllUIPanels() {
    const hud = this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => {
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}