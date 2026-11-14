import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONT_PIXEL, FONT_TYPE, PAL } from './config.js';

export const zoomMethods = {
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
        __dialogueText("scenes/arrestSelection/zoom.js", "t_e8825e41e8f3c18554f4"),
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
  },

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
  },

  closeZoom() {
    if (!this.zoomOverlay) return;

    this.tweens.killTweensOf(this.zoomOverlay);

    this.zoomOverlay.setVisible(false).setAlpha(1);
    this.zoomImage?.setVisible(false);
  }
};
