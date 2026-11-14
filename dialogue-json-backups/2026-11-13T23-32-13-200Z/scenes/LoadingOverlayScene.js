const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite';

const PAPER_W = 820;
const PAPER_H = 500;

const BAR = { x: 62, y: 300, w: 696, h: 26, inset: 4 };

const TIPS = [
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
  'Putting the organised back into organised crime.',
  'Sharpening pencils. Nobody asked for this, but here we are.',
  'The monkey cameraman has been told to stay off the filing cabinets.',
  'Stamping the stamp that stamps the other stamps.',
  'Please hold. Your call is being ignored in order of importance.'
];

// Im dłużej trwa ładowanie, tym bardziej absurdalna stopka.
const FOOTER_STAGES = [
  { at: 0, text: 'PLEASE WAIT. THE PAPERWORK IS RESISTING.' },
  { at: 6, text: 'THE ARCHIVIST HAS STEPPED OUT. PROBABLY FOR COFFEE.' },
  { at: 12, text: 'FILE FOUND. NOW LOOKING FOR THE FILE THAT EXPLAINS THE FILE.' },
  { at: 20, text: 'THIS IS TAKING LONGER THAN THE SUSPECT\'S ALIBI.' },
  { at: 35, text: 'STILL HERE. WE ARE AS SURPRISED AS YOU ARE.' },
  { at: 60, text: 'IF NOTHING HAPPENS, THE CAT SAT ON THE SERVER.' }
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export class LoadingOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingOverlayScene' });
  }

  create() {
    this.progressTarget = 0;
    this.progressDisplay = 0;
    this.progressLabel = '';
    this.shownPercent = -1;

    this.tipIndex = 0;
    this.dotCount = 0;
    this.elapsedSeconds = 0;
    this.footerStage = -1;

    this.stripeOffset = 0;
    this.scanT = 0;

    this.statusFull = '';
    this.statusChars = 0;
    this.statusTimer = null;

    this.stampState = '';

    this.paperX = 0;
    this.paperY = 0;
    this.entrance = { y: 22, alpha: 0 };

    this.reduceMotion = prefersReducedMotion();
    this.caseNumber = Phaser.Math.Between(1000, 9999);

    this.tips = Phaser.Utils.Array.Shuffle([...TIPS]);

    this.ensureTextures();

    this.buildBackdrop();
    this.buildPaper();
    this.buildBar();
    this.buildSticky();
    this.buildStamp();

    this.layoutOverlay();

    this.updateProgress = (payload = {}) => {
      const data = payload || {};
      const numericValue = Number(data.value ?? 0);

      this.progressTarget = Number.isFinite(numericValue)
        ? Phaser.Math.Clamp(numericValue, 0, 1)
        : 0;

      this.progressLabel = String(data.label ?? '');

      this.refreshStatus();

      if (this.progressTarget >= 1) {
        this.setStamp('approved');
      }
    };

    this.game.events.on('asset-progress', this.updateProgress);
    this.updateProgress(this.game.assets?.progress);

    this.showTip(this.tips[this.tipIndex], false);
    this.showFooter(0, false);

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

        this.activityText.setText(`SEARCHING${'.'.repeat(this.dotCount)}`);
      }
    });

    this.clockTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickSecond()
    });

    this.startAmbientTweens();
    this.playEntrance();

    this.scale.on('resize', this.layoutOverlay, this);
    this.scene.bringToTop();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  /* ========================================================
     TEXTURES (proceduralne: overlay działa, gdy assety jeszcze się ładują)
     ======================================================== */

  ensureTextures() {
    try {
      if (!this.textures.exists('__loading_vignette')) {
        const tex = this.textures.createCanvas('__loading_vignette', 256, 144);
        const ctx = tex.getContext();

        const grad = ctx.createRadialGradient(128, 72, 40, 128, 72, 160);

        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.65, 'rgba(0,0,0,0.35)');
        grad.addColorStop(1, 'rgba(0,0,0,0.9)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 144);

        tex.refresh();
      }

      if (!this.textures.exists('__loading_lamp')) {
        const tex = this.textures.createCanvas('__loading_lamp', 256, 256);
        const ctx = tex.getContext();

        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

        grad.addColorStop(0, 'rgba(255,214,150,0.32)');
        grad.addColorStop(0.55, 'rgba(255,190,120,0.10)');
        grad.addColorStop(1, 'rgba(255,190,120,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        tex.refresh();
      }
    } catch (error) {
      /* czysto kosmetyczne */
    }
  }

  /* ========================================================
     BUILD
     ======================================================== */

  buildBackdrop() {
    this.backdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0a0806, 0.95)
      .setOrigin(0)
      .setInteractive();

    this.backdrop.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
    });

    this.planks = this.add.graphics();

    this.lamp = this.textures.exists('__loading_lamp')
      ? this.add
        .image(0, 0, '__loading_lamp')
        .setBlendMode(Phaser.BlendModes.ADD)
      : null;

    this.vignette = this.textures.exists('__loading_vignette')
      ? this.add.image(0, 0, '__loading_vignette').setOrigin(0)
      : null;

    this.dust = [];

    if (!this.reduceMotion) {
      for (let i = 0; i < 18; i++) {
        this.dust.push(
          this.add
            .rectangle(0, 0, 2, 2, 0xe9dab9, 1)
            .setAlpha(0)
        );
      }
    }
  }

  buildPaper() {
    this.paper = this.add.container(0, 0);

    const W = PAPER_W;
    const H = PAPER_H;

    const g = this.add.graphics();

    /* ---------- cień i teczka ---------- */

    g.fillStyle(0x000000, 0.42);
    g.fillRect(14, 18, W + 14, H + 22);

    // korpus teczki (manila)
    g.fillStyle(0xb08e5a, 1);
    g.fillRect(-10, -8, W + 20, H + 24);

    // zakładka
    g.fillStyle(0xb08e5a, 1);
    g.fillPoints(
      [
        { x: 0, y: -8 },
        { x: 14, y: -32 },
        { x: 218, y: -32 },
        { x: 234, y: -8 }
      ],
      true
    );

    g.lineStyle(2, 0x7d6238, 1);
    g.strokeRect(-10, -8, W + 20, H + 24);
    g.strokeRect(-10, -8, 0, 0);

    g.lineStyle(1, 0xc9a96f, 0.7);
    g.lineBetween(-6, -4, W + 6, -4);

    /* ---------- kartka ---------- */

    g.fillStyle(0xd8c39c, 1);
    g.fillRect(0, 0, W, H);

    g.fillStyle(0xe9dab9, 1);
    g.fillRect(7, 7, W - 14, H - 14);

    g.lineStyle(2, 0x9c8057, 1);
    g.strokeRect(0, 0, W, H);

    g.lineStyle(1, 0xb8a17b, 0.7);
    g.strokeRect(16, 16, W - 32, H - 32);

    // ziarno papieru
    for (let i = 0; i < 160; i++) {
      g.fillStyle(0x8a6f48, Phaser.Math.FloatBetween(0.04, 0.12));
      g.fillRect(
        Phaser.Math.Between(10, W - 10),
        Phaser.Math.Between(10, H - 10),
        Phaser.Math.Between(1, 2),
        Phaser.Math.Between(1, 2)
      );
    }

    // linie i margines
    g.lineStyle(1, 0xa58f6a, 0.35);

    for (let lineY = 116; lineY < 470; lineY += 28) {
      g.lineBetween(35, lineY, W - 35, lineY);
    }

    g.lineStyle(1, 0xa46b58, 0.3);
    g.lineBetween(62, 108, 62, 466);

    // separator nagłówka
    g.lineStyle(2, 0x8c7554, 0.7);
    g.lineBetween(36, 103, W - 36, 103);

    // podziałka pod paskiem postępu
    const tickY = BAR.y + BAR.h + 5;

    g.lineStyle(1, 0x7b6548, 0.8);

    for (let i = 0; i <= 10; i++) {
      const tx = BAR.x + (BAR.w * i) / 10;
      const len = i % 5 === 0 ? 8 : 4;

      g.lineBetween(tx, tickY, tx, tickY + len);
    }

    /* ---------- plama po kawie ---------- */

    g.lineStyle(5, 0x7a5a3a, 0.14);
    g.strokeCircle(712, 438, 36);

    g.lineStyle(2, 0x7a5a3a, 0.18);
    g.beginPath();
    g.arc(712, 438, 33, 0.3, 4.4);
    g.strokePath();

    g.fillStyle(0x7a5a3a, 0.05);
    g.fillCircle(712, 438, 34);

    /* ---------- zagięty róg ---------- */

    g.fillStyle(0x000000, 0.12);
    g.fillTriangle(W - 34, H, W, H - 34, W - 34, H - 34);

    g.fillStyle(0xcdb98f, 1);
    g.fillTriangle(W - 36, H, W, H - 36, W - 36, H - 36);

    g.lineStyle(1, 0x9c8057, 0.8);
    g.lineBetween(W - 36, H, W, H - 36);

    /* ---------- spinacz ---------- */

    g.lineStyle(3, 0x000000, 0.2);
    g.strokeRoundedRect(646, -16, 22, 66, 11);

    g.lineStyle(3, 0x8d949b, 1);
    g.strokeRoundedRect(644, -18, 22, 66, 11);
    g.strokeRoundedRect(650, -6, 10, 46, 5);

    this.paper.add(g);

    /* ---------- teksty ---------- */

    this.folderText = this.add.text(24, -21, `CASE No. ${this.caseNumber}`, {
      fontFamily: FONT_PIXEL,
      fontSize: '9px',
      color: '#4a3922'
    }).setOrigin(0, 0.5);

    this.agencyText = this.add.text(36, 34, 'MARK AGENCY', {
      fontFamily: FONT_PIXEL,
      fontSize: '14px',
      color: '#413329'
    });

    this.departmentText = this.add.text(
      36,
      62,
      'ARCHIVES & QUESTIONABLE PAPERWORK',
      {
        fontFamily: FONT_TYPE,
        fontSize: '16px',
        color: '#786651'
      }
    );

    this.fileNumber = this.add
      .text(584, 28, this.formFieldText(), {
        fontFamily: FONT_TYPE,
        fontSize: '13px',
        color: '#786651',
        align: 'right',
        lineSpacing: 4
      })
      .setOrigin(1, 0);

    this.titleText = this.add
      .text(410, 172, 'DIGGING THROUGH\nTHE ARCHIVES', {
        fontFamily: FONT_PIXEL,
        fontSize: '20px',
        color: '#362b23',
        align: 'center',
        lineSpacing: 14
      })
      .setOrigin(0.5);

    this.activityLight = this.add.rectangle(341, 228, 7, 7, 0x8d513a);

    this.activityText = this.add
      .text(354, 224, 'SEARCHING', {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#786651'
      });

    this.statusText = this.add
      .text(62, 250, '', {
        fontFamily: FONT_TYPE,
        fontSize: '18px',
        color: '#514334',
        wordWrap: { width: 565 }
      });

    this.percentText = this.add
      .text(758, 252, '0%', {
        fontFamily: FONT_PIXEL,
        fontSize: '13px',
        color: '#514334'
      })
      .setOrigin(1, 0);

    this.footerText = this.add
      .text(410, 486, '', {
        fontFamily: FONT_TYPE,
        fontSize: '13px',
        color: '#786651',
        align: 'center'
      })
      .setOrigin(0.5);

    this.paper.add([
      this.folderText,
      this.agencyText,
      this.departmentText,
      this.fileNumber,
      this.titleText,
      this.activityLight,
      this.activityText,
      this.statusText,
      this.percentText,
      this.footerText
    ]);
  }

  buildBar() {
    this.barGraphics = this.add.graphics();

    // lupa przesuwająca się po pasku
    this.magnifier = this.add.container(BAR.x, BAR.y);

    const m = this.add.graphics();

    m.lineStyle(7, 0x000000, 0.18);
    m.lineBetween(12, -3, 27, 12);

    m.lineStyle(6, 0x4b3a2a, 1);
    m.lineBetween(10, -5, 25, 10);

    m.fillStyle(0xd6efe8, 0.35);
    m.fillCircle(0, -16, 15);

    m.lineStyle(4, 0x5a4632, 1);
    m.strokeCircle(0, -16, 15);

    m.lineStyle(2, 0xffffff, 0.75);
    m.beginPath();
    m.arc(0, -16, 9, Math.PI * 1.1, Math.PI * 1.45);
    m.strokePath();

    this.magnifier.add(m);

    this.paper.add([this.barGraphics, this.magnifier]);
  }

  buildSticky() {
    this.sticky = this.add.container(410, 414);

    const g = this.add.graphics();

    const w = 600;
    const h = 108;

    g.fillStyle(0x000000, 0.25);
    g.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);

    g.fillStyle(0xf4e27a, 1);
    g.fillRect(-w / 2, -h / 2, w, h);

    g.fillStyle(0xf9ee9f, 1);
    g.fillRect(-w / 2, -h / 2, w, 14);

    g.fillStyle(0xd8c458, 1);
    g.fillTriangle(w / 2 - 28, h / 2, w / 2, h / 2 - 28, w / 2 - 28, h / 2 - 28);

    g.lineStyle(1, 0xc9b64f, 0.8);
    g.strokeRect(-w / 2, -h / 2, w, h);

    this.tipHeading = this.add
      .text(0, -h / 2 + 24, 'A NOTE FROM THE ARCHIVIST', {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#8b513b'
      })
      .setOrigin(0.5);

    this.tipText = this.add
      .text(0, 12, '', {
        fontFamily: FONT_TYPE,
        fontSize: '20px',
        color: '#4a3a24',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: 540 }
      })
      .setOrigin(0.5);

    this.sticky.add([g, this.tipHeading, this.tipText]);
    this.sticky.setAngle(-1.5);

    this.paper.add(this.sticky);
  }

  buildStamp() {
    this.stamp = this.add.container(690, 143);

    this.stampBorder = this.add
      .rectangle(0, 0, 158, 39)
      .setStrokeStyle(3, 0x963e32);

    this.stampText = this.add
      .text(0, 1, 'CLASSIFIED', {
        fontFamily: FONT_PIXEL,
        fontSize: '12px',
        color: '#963e32'
      })
      .setOrigin(0.5);

    this.stamp.add([this.stampBorder, this.stampText]);
    this.stamp.setAngle(-9).setAlpha(0);

    this.paper.add(this.stamp);
  }

  formFieldText() {
    const m = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
    const s = String(this.elapsedSeconds % 60).padStart(2, '0');

    return `FORM MA-404\nINTERNAL USE ONLY\nON HOLD: ${m}:${s}`;
  }

  /* ========================================================
     LAYOUT
     ======================================================== */

  layoutOverlay() {
    if (!this.paper?.active) return;

    const { width, height } = this.scale;

    this.backdrop.setSize(width, height);

    // deski biurka
    this.planks.clear();
    this.planks.lineStyle(2, 0xffffff, 0.035);

    for (let y = 70; y < height; y += 84) {
      this.planks.lineBetween(0, y, width, y);
    }

    this.vignette?.setDisplaySize(width, height);

    if (this.lamp) {
      const size = Math.max(width, height) * 1.1;

      this.lamp.setPosition(width / 2, height / 2).setDisplaySize(size, size);
    }

    // jeden wspólny układ papieru: skalujemy cały kontener naraz
    const scale = Math.max(
      0.01,
      Math.min(
        1.25,
        (width - 48) / (PAPER_W + 20),
        (height - 80) / (PAPER_H + 40)
      )
    );

    this.paperScale = scale;
    this.paperX = (width - PAPER_W * scale) / 2;
    this.paperY = (height - PAPER_H * scale) / 2 + 8 * scale;

    this.paper.setScale(scale);
    this.applyPaperTransform();
  }

  applyPaperTransform() {
    this.paper.setPosition(
      this.paperX,
      this.paperY + this.entrance.y * (this.paperScale || 1)
    );

    this.paper.setAlpha(this.entrance.alpha);
  }

  /* ========================================================
     ANIMACJE
     ======================================================== */

  playEntrance() {
    this.backdrop.setAlpha(0);

    this.tweens.add({
      targets: this.backdrop,
      alpha: 0.95,
      duration: 200,
      ease: 'Quad.easeOut'
    });

    this.entrance = { y: 22, alpha: 0 };

    this.tweens.add({
      targets: this.entrance,
      y: 0,
      alpha: 1,
      duration: 280,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.applyPaperTransform()
    });

    this.time.delayedCall(400, () => this.setStamp('classified'));
  }

  startAmbientTweens() {
    this.tweens.add({
      targets: this.activityLight,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (this.reduceMotion) return;

    this.tweens.add({
      targets: this.magnifier,
      angle: { from: -7, to: 7 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.sticky,
      angle: { from: -1.9, to: -1.1 },
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (this.lamp) {
      this.tweens.add({
        targets: this.lamp,
        alpha: { from: 0.85, to: 1 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    const { width, height } = this.scale;

    this.dust.forEach((mote) => {
      const startX = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(height * 0.3, height);

      mote.setPosition(startX, startY);

      this.tweens.add({
        targets: mote,
        y: startY - Phaser.Math.Between(120, 320),
        x: startX + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(7000, 13000),
        delay: Phaser.Math.Between(0, 4000),
        repeat: -1,
        onRepeat: () => {
          mote.setPosition(
            Phaser.Math.Between(0, this.scale.width),
            Phaser.Math.Between(this.scale.height * 0.5, this.scale.height)
          );
        }
      });

      this.tweens.add({
        targets: mote,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.12, 0.3) },
        duration: Phaser.Math.Between(1800, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000)
      });
    });
  }

  // 'classified' przy starcie, 'approved' gdy postęp dojdzie do 100%
  setStamp(state) {
    if (this.stampState === state || !this.stamp?.active) return;

    this.stampState = state;

    const approved = state === 'approved';
    const color = approved ? 0x3d6a3f : 0x963e32;

    this.stampBorder.setStrokeStyle(3, color);
    this.stampText
      .setText(approved ? 'APPROVED' : 'CLASSIFIED')
      .setColor(approved ? '#3d6a3f' : '#963e32');

    this.tweens.killTweensOf(this.stamp);

    if (this.reduceMotion) {
      this.stamp.setScale(1).setAlpha(0.85);
      return;
    }

    this.stamp.setScale(2.4).setAlpha(0);

    this.tweens.add({
      targets: this.stamp,
      scale: 1,
      alpha: 0.85,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => this.thump()
    });
  }

  // krótkie "uderzenie" pieczątki
  thump() {
    if (!this.paper?.active || this.reduceMotion) return;

    const baseY = this.entrance.y;

    this.tweens.add({
      targets: this.entrance,
      y: baseY + 3,
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
      onUpdate: () => this.applyPaperTransform(),
      onComplete: () => {
        this.entrance.y = baseY;
        this.applyPaperTransform();
      }
    });
  }

  /* ========================================================
     POSTĘP
     ======================================================== */

  update(time, delta) {
    if (!this.paper?.active) return;

    const diff = this.progressTarget - this.progressDisplay;

    if (Math.abs(diff) > 0.0005) {
      // cofanie (nowa paczka assetów zeruje postęp) jest szybsze niż rośnięcie
      const rate = diff < 0
        ? 1 - Math.exp(-delta / 50)
        : 1 - Math.exp(-delta / 140);

      this.progressDisplay += diff * rate;
    } else {
      this.progressDisplay = this.progressTarget;
    }

    const percent = Math.round(this.progressDisplay * 100);

    if (percent !== this.shownPercent) {
      this.shownPercent = percent;
      this.percentText.setText(`${percent}%`);
    }

    if (!this.reduceMotion) {
      this.stripeOffset += delta * 0.04;
      this.scanT += delta / 900;
    }

    this.drawBar();
  }

  drawBar() {
    const g = this.barGraphics;

    const { x, y, w, h, inset } = BAR;

    const innerX = x + inset;
    const innerY = y + inset;
    const innerW = w - inset * 2;
    const innerH = h - inset * 2;

    const value = this.progressDisplay;
    const fillW = Math.floor(innerW * value);

    g.clear();

    // rama i wgłębienie
    g.fillStyle(0x6f5a3e, 1);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);

    g.fillStyle(0xb59d76, 1);
    g.fillRect(x, y, w, h);

    g.fillStyle(0x9a835d, 1);
    g.fillRect(innerX - 1, innerY - 1, innerW + 2, innerH + 2);

    g.fillStyle(0xc9b68f, 1);
    g.fillRect(innerX, innerY, innerW, innerH);

    if (fillW > 0) {
      g.fillStyle(0x826044, 1);
      g.fillRect(innerX, innerY, fillW, innerH);

      if (!this.reduceMotion) {
        // przesuwające się ukośne paski
        const period = 26;
        const slant = innerH * 0.8;

        g.fillStyle(0x6a4d36, 0.55);

        for (
          let sx = -period + (this.stripeOffset % period);
          sx < fillW;
          sx += period
        ) {
          const x0 = Phaser.Math.Clamp(sx, 0, fillW);
          const x1 = Phaser.Math.Clamp(sx + 11, 0, fillW);
          const x2 = Phaser.Math.Clamp(sx + 11 + slant, 0, fillW);
          const x3 = Phaser.Math.Clamp(sx + slant, 0, fillW);

          g.fillPoints(
            [
              { x: innerX + x0, y: innerY + innerH },
              { x: innerX + x1, y: innerY + innerH },
              { x: innerX + x2, y: innerY },
              { x: innerX + x3, y: innerY }
            ],
            true
          );
        }
      }

      g.fillStyle(0xb58b59, 1);
      g.fillRect(innerX, innerY, fillW, 3);

      g.fillStyle(0x5a4030, 1);
      g.fillRect(innerX, innerY + innerH - 3, fillW, 3);
    } else if (value < 0.03 && !this.reduceMotion) {
      // gdy nic jeszcze nie przyszło, pasek i tak "żyje"
      const ping = Math.abs((this.scanT % 2) - 1);
      const blockW = 90;
      const bx = innerX + ping * (innerW - blockW);

      g.fillStyle(0xa98866, 0.7);
      g.fillRect(bx, innerY, blockW, innerH);

      g.fillStyle(0xd8c39c, 0.6);
      g.fillRect(bx + 20, innerY, blockW - 40, innerH);
    }

    // lupa jedzie na końcu wypełnienia
    const mx = Phaser.Math.Clamp(
      innerX + fillW,
      innerX + 12,
      innerX + innerW - 4
    );

    this.magnifier.setPosition(mx, y + h / 2 - 2);
  }

  refreshStatus() {
    const label = this.progressLabel.trim();

    const text = label
      ? label.length > 57
        ? `${label.slice(0, 54)}...`
        : label
      : this.progressTarget >= 1
        ? 'Files retrieved. Suspicion intact.'
        : 'Retrieving case files...';

    this.typeStatus(text);
  }

  typeStatus(text) {
    if (text === this.statusFull) return;

    this.statusFull = text;
    this.statusChars = 0;

    this.statusTimer?.remove(false);
    this.statusTimer = null;

    if (this.reduceMotion || !text.length) {
      this.statusText.setText(text);
      return;
    }

    this.statusText.setText('');

    this.statusTimer = this.time.addEvent({
      delay: 16,
      repeat: text.length - 1,
      callback: () => {
        this.statusChars += 1;
        this.statusText.setText(text.slice(0, this.statusChars));
      }
    });
  }

  /* ========================================================
     TIPY / STOPKA / CZAS OCZEKIWANIA
     ======================================================== */

  tickSecond() {
    this.elapsedSeconds += 1;

    this.fileNumber.setText(this.formFieldText());

    let stage = 0;

    FOOTER_STAGES.forEach((entry, index) => {
      if (this.elapsedSeconds >= entry.at) stage = index;
    });

    if (stage !== this.footerStage) {
      this.showFooter(stage, true);
    }
  }

  showFooter(stage, animate) {
    this.footerStage = stage;

    const text = FOOTER_STAGES[stage].text;

    if (!animate || this.reduceMotion) {
      this.footerText.setText(text).setAlpha(1);
      return;
    }

    this.tweens.add({
      targets: this.footerText,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.footerText.setText(text);

        this.tweens.add({ targets: this.footerText, alpha: 1, duration: 300 });
      }
    });
  }

  showTip(text, animate) {
    if (!animate || this.reduceMotion) {
      this.tipText.setText(text).setAlpha(1).setY(12);
      return;
    }

    this.tweens.add({
      targets: this.tipText,
      alpha: 0,
      y: 6,
      duration: 220,
      onComplete: () => {
        this.tipText.setText(text).setY(18);

        this.tweens.add({
          targets: this.tipText,
          alpha: 1,
          y: 12,
          duration: 300,
          ease: 'Quad.easeOut'
        });
      }
    });
  }

  nextTip() {
    this.tipIndex = (this.tipIndex + 1) % this.tips.length;

    this.showTip(this.tips[this.tipIndex], true);
  }

  /* ========================================================
     CLEANUP
     ======================================================== */

  cleanup() {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.game.events.off('asset-progress', this.updateProgress);
    this.scale.off('resize', this.layoutOverlay, this);

    this.tipTimer?.remove(false);
    this.dotsTimer?.remove(false);
    this.clockTimer?.remove(false);
    this.statusTimer?.remove(false);

    this.tipTimer = null;
    this.dotsTimer = null;
    this.clockTimer = null;
    this.statusTimer = null;

    try {
      this.tweens.killAll();
    } catch (error) {
      /* scena już się zamyka */
    }

    this.dust = [];
  }
}