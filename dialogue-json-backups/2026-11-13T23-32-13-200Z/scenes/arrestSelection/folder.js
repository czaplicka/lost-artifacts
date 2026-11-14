import { gameState } from '../../GameData.js';
import { FONT_PIXEL, FONT_TYPE, PAL } from './config.js';

export const folderMethods = {
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
  },

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
  },

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
};
