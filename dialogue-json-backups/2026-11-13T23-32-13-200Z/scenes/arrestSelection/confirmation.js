import { FONT_PIXEL, FONT_TYPE, PAL } from './config.js';

export const confirmationMethods = {
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
  },

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
  },

  closeConfirm() {
    if (!this.confirmOverlay) return;

    this.tweens.killTweensOf(this.confirmOverlay);

    this.confirmOverlay.setVisible(false).setAlpha(1);
    this.confirmOpen = false;
  },

  confirmArrestFromModal() {
    if (!this.confirmOpen) return;

    this.closeConfirm();
    this.beginArrest();
  }
};
