import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { getSuspectImageKey } from '../../suspects/suspectHelpers.js';
import { FONT_PIXEL, FONT_TYPE, PAL, DOSSIER_FIELDS } from './config.js';

export const dossierMethods = {
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
  },

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
        .text(0, -50, __dialogueText("scenes/arrestSelection/dossier.js", "t_2e0828e3b426a51ac1c6"), {
          fontFamily: FONT_PIXEL,
          fontSize: '18px',
          color: '#f7ebc6'
        })
        .setOrigin(0.5);

      polaroid.add(missing);
    }

    const tagBg = this.add.rectangle(-160, -197, 260, 28, 0x000000, 0.65);

    const tagText = this.add
      .text(-160, -197, __dialogueText("scenes/arrestSelection/dossier.js", "t_ada295b42fe5736c587e"), {
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
        .text(0, 198, __dialogueText("scenes/arrestSelection/dossier.js", "t_0a47d1ab0df201b6e2ba"), {
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

    const stickyHeader = this.add.text(-258, -54, __dialogueText("scenes/arrestSelection/dossier.js", "t_2ec8f924479ab55d87f5"), {
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

    const nameLabel = this.add.text(975, 246, __dialogueText("scenes/arrestSelection/dossier.js", "t_eaa589322731009980d9"), {
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
};
