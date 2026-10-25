export class LoadingOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingOverlayScene' });
  }

  create() {
    this.progressValue = 0;
    this.progressLabel = '';
    this.tipIndex = 0;
    this.dotCount = 0;

    this.tips = Phaser.Utils.Array.Shuffle([
      'Dusting for fingerprints. Finding mostly dust.',
      'Teaching the filing cabinet to cooperate.',
      'Checking whether the alibi came with a receipt.',
      'Removing coffee stains from classified documents.',
      'Asking the red herrings to form an orderly queue.',
      'Waiting for the evidence to stop looking suspicious.',
      'Your request is important to us. Please remain suspicious.',
      'The archive has no secrets. Just restricted opening hours.',
      'Locating Form 27B: Permission to Locate Other Forms.',
      'Please do not feed the shredder original evidence.',
      'Cross-referencing lies with slightly better lies.',
      'The suspect has a lawyer. The printer has a jam.',
      'No artefacts were harmed in the filing of this report.',
      'Recovering documents from the "Definitely Not Important" drawer.',
      'Our filing system is a mystery. You are qualified.',
      'Looking for a paper trail. Found a paper mountain.',
      'Reclassifying "probably cursed" as "handle with care".',
      'The archivist has approved your request to wait.',
      'Checking the chain of custody. Someone borrowed the chain.',
      'Putting the organised back into organised crime.'
    ]);

    this.buildOverlay();
    this.layoutOverlay();

    this.updateProgress = (payload = {}) => {
      const data = payload || {};
      const numericValue = Number(data.value ?? 0);

      this.progressValue = Number.isFinite(numericValue)
        ? Phaser.Math.Clamp(numericValue, 0, 1)
        : 0;

      this.progressLabel = String(data.label ?? '');
      this.refreshProgress();
    };

    this.game.events.on('asset-progress', this.updateProgress);
    this.updateProgress(this.game.assets?.progress);

    this.tipText.setText(this.tips[this.tipIndex]);

    this.tipTimer = this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => this.nextTip()
    });

    this.dotsTimer = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        this.dotCount = (this.dotCount + 1) % 4;

        this.activityText.setText(
          `SEARCHING${'.'.repeat(this.dotCount)}`
        );
      }
    });

    this.tweens.add({
      targets: this.activityLight,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scale.on('resize', this.layoutOverlay, this);
    this.scene.bringToTop();

    this.events.once('shutdown', () => {
      this.game.events.off('asset-progress', this.updateProgress);
      this.scale.off('resize', this.layoutOverlay, this);

      this.tipTimer?.remove(false);
      this.dotsTimer?.remove(false);

      this.tweens.killAll();
    });
  }

  buildOverlay() {
    const pixelFont = 'PressStart2P';
    const typewriterFont = 'SpecialElite';

    this.backdrop = this.add
      .rectangle(0, 0, 1, 1, 0x080b0e, 0.94)
      .setOrigin(0)
      .setInteractive();

    this.backdrop.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
    });

    this.paperGraphics = this.add.graphics();

    this.agencyText = this.add.text(0, 0, 'MARK AGENCY', {
      fontFamily: pixelFont,
      fontSize: '14px',
      color: '#413329'
    });

    this.departmentText = this.add.text(
      0,
      0,
      'ARCHIVES & QUESTIONABLE PAPERWORK',
      {
        fontFamily: typewriterFont,
        fontSize: '16px',
        color: '#786651'
      }
    );

    this.fileNumber = this.add
      .text(0, 0, 'FORM MA-404\nINTERNAL USE ONLY', {
        fontFamily: typewriterFont,
        fontSize: '13px',
        color: '#786651',
        align: 'right',
        lineSpacing: 5
      })
      .setOrigin(1, 0);

    this.stamp = this.add.container();

    const stampBorder = this.add
      .rectangle(0, 0, 158, 39)
      .setStrokeStyle(3, 0x963e32);

    const stampText = this.add
      .text(0, 1, 'CLASSIFIED', {
        fontFamily: pixelFont,
        fontSize: '12px',
        color: '#963e32'
      })
      .setOrigin(0.5);

    this.stamp.add([stampBorder, stampText]);
    this.stamp.setAngle(-9).setAlpha(0.8);

    this.titleText = this.add
      .text(0, 0, 'DIGGING THROUGH\nTHE ARCHIVES', {
        fontFamily: pixelFont,
        fontSize: '20px',
        color: '#362b23',
        align: 'center',
        lineSpacing: 14
      })
      .setOrigin(0.5);

    this.activityLight = this.add
      .rectangle(0, 0, 7, 7, 0x8d513a);

    this.activityText = this.add.text(0, 0, 'SEARCHING', {
      fontFamily: pixelFont,
      fontSize: '9px',
      color: '#786651'
    });

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: typewriterFont,
      fontSize: '18px',
      color: '#514334'
    });

    this.percentText = this.add
      .text(0, 0, '0%', {
        fontFamily: pixelFont,
        fontSize: '13px',
        color: '#514334'
      })
      .setOrigin(1, 0);

    this.barGraphics = this.add.graphics();

    this.tipHeading = this.add
      .text(0, 0, 'A NOTE FROM THE ARCHIVIST', {
        fontFamily: pixelFont,
        fontSize: '9px',
        color: '#8b513b',
        align: 'center'
      })
      .setOrigin(0.5);

    this.tipText = this.add
      .text(0, 0, '', {
        fontFamily: typewriterFont,
        fontSize: '21px',
        color: '#514334',
        align: 'center',
        lineSpacing: 5
      })
      .setOrigin(0.5);

    this.footerText = this.add
      .text(0, 0, 'PLEASE WAIT. THE PAPERWORK IS RESISTING.', {
        fontFamily: typewriterFont,
        fontSize: '13px',
        color: '#786651',
        align: 'center'
      })
      .setOrigin(0.5);
  }

  layoutOverlay() {
    const { width, height } = this.scale;

    this.backdrop.setSize(width, height);

    // All elements share one logical paper layout.
    const paperWidth = 820;
    const paperHeight = 500;
    const scale = Math.max(
      0.01,
      Math.min(
        1,
        (width - 24) / paperWidth,
        (height - 36) / paperHeight
      )
    );

    const x = (width - paperWidth * scale) / 2;
    const y = (height - paperHeight * scale) / 2;

    const position = (object, localX, localY) => {
      object.setPosition(x + localX * scale, y + localY * scale);
      object.setScale(scale);
    };

    this.paperGraphics.clear();
    this.paperGraphics.setPosition(x, y).setScale(scale);

    const g = this.paperGraphics;

    // Shadow, folder tab and paper.
    g.fillStyle(0x000000, 0.35);
    g.fillRect(12, 14, paperWidth, paperHeight);

    g.fillStyle(0xa68a5f, 1);
    g.fillRect(0, -15, 205, 30);

    g.fillStyle(0xd8c39c, 1);
    g.fillRect(0, 0, paperWidth, paperHeight);

    g.fillStyle(0xe9dab9, 1);
    g.fillRect(7, 7, paperWidth - 14, paperHeight - 14);

    g.lineStyle(2, 0x9c8057, 1);
    g.strokeRect(0, 0, paperWidth, paperHeight);

    g.lineStyle(1, 0xb8a17b, 0.7);
    g.strokeRect(16, 16, paperWidth - 32, paperHeight - 32);

    // Paper rules.
    g.lineStyle(1, 0xa58f6a, 0.35);

    for (let lineY = 116; lineY < 460; lineY += 28) {
      g.lineBetween(35, lineY, paperWidth - 35, lineY);
    }

    g.lineStyle(1, 0xa46b58, 0.3);
    g.lineBetween(62, 108, 62, 454);

    // Header divider.
    g.lineStyle(2, 0x8c7554, 0.7);
    g.lineBetween(36, 103, paperWidth - 36, 103);

    position(this.agencyText, 36, 34);
    position(this.departmentText, 36, 62);
    position(this.fileNumber, 784, 33);
    position(this.stamp, 690, 143);

    position(this.titleText, 410, 180);

    position(this.activityLight, 341, 237);
    position(this.activityText, 354, 233);

    position(this.statusText, 62, 273);
    this.statusText.setWordWrapWidth(565);

    position(this.percentText, 758, 275);

    this.barGraphics.setPosition(x, y).setScale(scale);

    position(this.tipHeading, 410, 365);
    position(this.tipText, 410, 405);
    this.tipText.setWordWrapWidth(660);

    position(this.footerText, 410, 470);

    this.refreshProgress();
  }

  refreshProgress() {
    const value = this.progressValue ?? 0;
    const percent = Math.round(value * 100);

    this.percentText.setText(`${percent}%`);

    const label = this.progressLabel.trim();

    this.statusText.setText(
      label
        ? label.length > 57
          ? `${label.slice(0, 54)}...`
          : label
        : value >= 1
          ? 'Files retrieved. Suspicion intact.'
          : 'Retrieving case files...'
    );

    const x = 62;
    const y = 311;
    const width = 696;
    const height = 24;
    const inset = 4;

    const g = this.barGraphics;
    g.clear();

    g.fillStyle(0xc2ad86, 1);
    g.fillRect(x, y, width, height);

    g.lineStyle(2, 0x7b6548, 1);
    g.strokeRect(x, y, width, height);

    const innerWidth = width - inset * 2;
    const innerHeight = height - inset * 2;
    const fillWidth = Math.floor(innerWidth * value);

    if (fillWidth > 0) {
      g.fillStyle(0x826044, 1);
      g.fillRect(x + inset, y + inset, fillWidth, innerHeight);

      g.fillStyle(0xb58b59, 1);
      g.fillRect(x + inset, y + inset, fillWidth, 4);

      // Small gaps give the bar a retro segmented look.
      g.fillStyle(0xc2ad86, 1);

      for (let segmentX = 12; segmentX < fillWidth; segmentX += 14) {
        g.fillRect(
          x + inset + segmentX,
          y + inset,
          Math.min(2, fillWidth - segmentX),
          innerHeight
        );
      }
    }
  }

  nextTip() {
    this.tweens.add({
      targets: this.tipText,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.tipIndex = (this.tipIndex + 1) % this.tips.length;
        this.tipText.setText(this.tips[this.tipIndex]);

        this.tweens.add({
          targets: this.tipText,
          alpha: 1,
          duration: 300
        });
      }
    });
  }
}