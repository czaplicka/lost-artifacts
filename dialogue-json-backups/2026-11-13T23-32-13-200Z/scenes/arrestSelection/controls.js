import { getSuspectImageKey } from '../../suspects/suspectHelpers.js';
import { FONT_PIXEL, FONT_TYPE, PAL, DEFAULT_DIALOGUE, DEFAULT_NOTE } from './config.js';

export const controlsMethods = {
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
  },

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
  },

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
  },

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
  },

  stopArrestPulse() {
    this.arrestPulse?.stop?.();
    this.arrestPulse = null;

    this.arrestGlow?.setAlpha(0.12).setScale(1);
  }
};
