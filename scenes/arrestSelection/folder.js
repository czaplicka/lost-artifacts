import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';

import {
  FONT_PIXEL,
  FONT_TYPE,
  PAL
} from './config.js';

function getDisplayCaseNumber() {
  const index =
    gameState.currentMission?.caseIndex ??
    gameState.currentCaseIndex ??
    gameState.caseIndex;

  if (Number.isInteger(index) && index >= 0) {
    return String(index + 1).padStart(3, '0');
  }

  const raw =
    gameState.currentCaseId ??
    gameState.caseId ??
    gameState.currentMission?.id;

  const text = String(raw ?? '').trim();

  if (/^\d{1,6}$/.test(text)) {
    return text.padStart(3, '0');
  }

  if (!text) {
    return '---';
  }

  // Krótki kod wyświetlany, bez zmieniania właściwego ID sprawy.
  let hash = 2166136261;

  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(6, '0')
    .slice(-6);
}

export const folderMethods = {
  createFolder() {
    this.viewerRoot = this.add
      .container(0, 0)
      .setDepth(320);

    const g = this.add.graphics();

    g.fillStyle(0x000000, 0.42);
    g.fillRoundedRect(112, 168, 1720, 740, 18);

    g.fillStyle(0xc9a15c, 1);

    g.fillRoundedRect(
      130, 116, 360, 40,
      { tl: 14, tr: 14, bl: 0, br: 0 }
    );

    g.fillRoundedRect(
      100, 150, 1720, 730,
      { tl: 0, tr: 18, bl: 18, br: 18 }
    );

    g.lineStyle(3, 0x8c6a33, 1);

    g.strokeRoundedRect(
      100, 150, 1720, 730,
      { tl: 0, tr: 18, bl: 18, br: 18 }
    );

    g.strokeRoundedRect(
      130, 116, 360, 40,
      { tl: 14, tr: 14, bl: 0, br: 0 }
    );

    g.lineStyle(2, 0xe3c487, 0.7);
    g.lineBetween(104, 154, 1812, 154);

    g.fillStyle(0xe6d8b8, 1);
    g.fillRoundedRect(148, 186, 750, 676, 4);
    g.fillRoundedRect(923, 186, 865, 676, 4);

    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(145, 184, 750, 676, 4);
    g.fillRoundedRect(920, 184, 865, 676, 4);

    g.fillStyle(0xf5ebd2, 1);
    g.fillRoundedRect(140, 178, 750, 676, 4);
    g.fillRoundedRect(915, 178, 865, 676, 4);

    g.lineStyle(2, 0xcdb98a, 1);
    g.strokeRoundedRect(140, 178, 750, 676, 4);
    g.strokeRoundedRect(915, 178, 865, 676, 4);

    g.lineStyle(3, 0x4a2e17, 1);
    g.lineBetween(975, 232, 1735, 232);

    g.lineStyle(2, 0x4a2e17, 0.8);
    g.lineBetween(975, 800, 1500, 800);

    g.lineStyle(4, 0x8a8f98, 1);
    g.strokeRoundedRect(944, 160, 28, 86, 13);
    g.strokeRoundedRect(951, 176, 14, 70, 7);

    const caseNumber = getDisplayCaseNumber();

    const tabText = this.add
      .text(
        310,
        136,
        `FILE #${caseNumber}`,
        {
          fontFamily: FONT_PIXEL,
          fontSize: '13px',
          color: PAL.ink
        }
      )
      .setOrigin(0.5);

    if (tabText.width > 320) {
      tabText.setScale(320 / tabText.width);
    }

    const pageTitle = this.add.text(
      975,
      206,
      __dialogueText(
        "scenes/arrestSelection/folder.js",
        "t_ecb516e868e1378c6c3e"
      ),
      {
        fontFamily: FONT_PIXEL,
        fontSize: '17px',
        color: PAL.ink
      }
    );

    this.counterText = this.add
      .text(
        1735,
        208,
        '',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '12px',
          color: PAL.redCss
        }
      )
      .setOrigin(1, 0);

    const signCaption = this.add.text(
      975,
      808,
      __dialogueText(
        "scenes/arrestSelection/folder.js",
        "t_671940d53ee1ff7f6202"
      ),
      {
        fontFamily: FONT_TYPE,
        fontSize: '16px',
        color: PAL.inkSoft
      }
    );

    const signScribble = this.add
      .text(
        1000,
        764,
        __dialogueText(
          "scenes/arrestSelection/folder.js",
          "t_6d0fc45ac3ccce3c6e07"
        ),
        {
          fontFamily: FONT_TYPE,
          fontSize: '28px',
          fontStyle: __dialogueText(
            "scenes/arrestSelection/folder.js",
            "t_db2365bb7a376f09d1dd"
          ),
          color: '#6c7396'
        }
      )
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
      .text(
        width / 2,
        36,
        __dialogueText(
          "scenes/arrestSelection/folder.js",
          "t_9246fca97ffafae56410"
        ),
        {
          fontFamily: FONT_PIXEL,
          fontSize: '18px',
          color: PAL.goldCss,
          stroke: __dialogueText(
            "scenes/arrestSelection/folder.js",
            "t_65a103aa74ee8a7ded7b"
          ),
          strokeThickness: 5
        }
      )
      .setOrigin(0.5)
      .setDepth(340);

    this.add
      .text(
        width / 2,
        78,
        __dialogueText(
          "scenes/arrestSelection/folder.js",
          "t_44c0f230da507c2b8226"
        ),
        {
          fontFamily: FONT_TYPE,
          fontSize: '34px',
          color: PAL.creamWarm
        }
      )
      .setOrigin(0.5)
      .setDepth(340);

    this.caseNumberText = this.add
      .text(
        width - 32,
        34,
        `FILE #${getDisplayCaseNumber()}`,
        {
          fontFamily: FONT_PIXEL,
          fontSize: '12px',
          color: '#fff4cf',
          backgroundColor: '#6e1f17',
          padding: {
            left: 10,
            right: 10,
            top: 8,
            bottom: 8
          }
        }
      )
      .setOrigin(1, 0.5)
      .setDepth(341);

    if (this.caseNumberText.width > 300) {
      this.caseNumberText.setScale(
        300 / this.caseNumberText.width
      );
    }

    this.createStamp(
      width - 210,
      80,
      __dialogueText(
        "scenes/arrestSelection/folder.js",
        "t_12a2fa34714ebff75637"
      ),
      12,
      0xc0392b,
      -0.07
    ).setDepth(341);
  },

  createBackButton() {
    const baseX = 80;
    const baseY = 56;

    this.backBtnLabel?.destroy();
    this.backBtnLabel = null;

    if (this.textures.exists('back')) {
      this.backBtn = this.add
        .image(baseX, baseY, 'back')
        .setInteractive({ useHandCursor: true })
        .setScale(0.42)
        .setDepth(345);

      this.addHoverEffect(
        this.backBtn,
        0.42,
        0.48
      );
    } else {
      this.backBtn = this.add
        .text(
          baseX,
          baseY,
          __dialogueText(
            "scenes/arrestSelection/folder.js",
            "t_dabd3aff769f07eb2965"
          ),
          {
            fontFamily: FONT_PIXEL,
            fontSize: '22px',
            color: '#f6e7bc',
            backgroundColor: '#3a2916'
          }
        )
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