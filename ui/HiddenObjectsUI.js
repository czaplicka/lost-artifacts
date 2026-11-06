import { hintManager } from '../managers/HintManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';
import {
  HO_COLORS as C,
  HO_FONTS as F,
  addPaper,
  createStamp,
  drawCheckMark,
  drawDashedLine,
  drawPaperclip,
  ensureNoiseTile
} from './HiddenObjectsTheme.js';

const HINT_OPTIONS = {
  cut_corners: {
    label: 'CUT CORNERS',
    description:
      'Skip the evidence-handling checklist.\n' +
      'Faster now. Awkward in court.',
    energy: 5,
    minutes: 10,
    moralLabel: 'Procedural misconduct',
    accent: 0xd9382f
  },

  squad_help: {
    label: 'ASK SQUAD FOR HELP',
    description:
      'Request a documented second sweep.\n' +
      'More eyes. More paperwork.',
    energy: 10,
    minutes: 30,
    moralLabel: 'Documented assistance',
    accent: 0x4aa3df
  }
};

const FREE_HINT_ACCENT = 0x7cb342;

const OPENING_LINES = [
  'Touch nothing. Click everything.',
  'Everything is evidence. Mostly.',
  'Somebody was here. Somebody with questionable taste.',
  'Look closely. The dust bunnies are witnesses.',
  'The paperwork can wait. The clues cannot.'
];

const TYPE_DELAY_MS = 14;
const LOW_TIME_SECONDS = 15;

export class HiddenObjectsUI {
  constructor(scene) {
    this.scene = scene;

    this.timerText = null;
    this.timerBar = null;
    this.scoreText = null;
    this.missesText = null;
    this.tally = null;
    this.counterText = null;
    this.messageText = null;
    this.backBtn = null;
    this.hintBtn = null;
    this.hintLabel = null;

    this.rows = new Map();
    this.totalTime = 1;
    this.lowTimePulse = null;
    this.typeEvent = null;

    this.resultOverlay = null;
    this.resultContainer = null;

    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintMarker = null;
    this.hintMarkerTimer = null;

    this.hintModalOpen = false;
    this.hintBusy = false;
    this.isReturningToCity = false;
    this.destroyed = false;

    this.lockState = null;
    this.sleepWaitEvent = null;
    this.ownedObjects = [];

    this.boundRefreshHintButton =
      this.refreshHintButton.bind(this);

    this.boundDestroy = this.destroy.bind(this);
  }

  own(object) {
    this.ownedObjects.push(object);
    return object;
  }

  // -------------------------------------------------------------------------
  // Panel boczny: "teczka śledcza"
  // -------------------------------------------------------------------------

  createSidebarUI() {
    this.destroyed = false;
    this.isReturningToCity = false;

    const scene = this.scene;
    const { width, height } = scene.scale;
    const sidebarWidth = scene.sidebarWidth;

    this.totalTime = Math.max(1, Number(scene.timeLeft) || 1);

    const pad = 16;

    const card = {
      x: pad,
      y: pad,
      w: sidebarWidth - pad * 2,
      h: height - pad * 2
    };

    const inner = 22;
    const left = card.x + inner;
    const innerW = card.w - inner * 2;

    // Dół panelu liczymy od dołu, górę - kursorem od góry.
    const dispatchH = 104;
    const dispatchY = card.y + card.h - 18 - dispatchH;
    const hintH = 54;
    const hintY = dispatchY - 16 - hintH;
    const rowsBottom = hintY - 14;

    this.buildBackdrop(sidebarWidth, height);
    this.buildCard(card, hintY + hintH / 2);

    let y = this.buildHeader(card, left, innerW, inner);

    y = this.buildGauges(left, y, innerW);
    y = this.buildMissesRow(left, y, innerW);
    y = this.buildEvidenceHeader(left, y, innerW);

    this.buildEvidenceRows(left, y, rowsBottom, innerW);
    this.buildHintButton(left, hintY, hintH, innerW);
    this.buildDispatchPlate(left, dispatchY, innerW, dispatchH);

    this.createBackButton(width);
    this.refreshHintButton();
    this.updateTimer(scene.timeLeft);
    this.refreshList(true);

    EventBus.on(
      'hints:changed',
      this.boundRefreshHintButton
    );

    scene.events.once(
      'shutdown',
      this.boundDestroy
    );

    this.showMessage(
      OPENING_LINES[
        Math.floor(Math.random() * OPENING_LINES.length)
      ],
      C.cream
    );
  }

  buildBackdrop(sidebarWidth, height) {
    const scene = this.scene;

    const noiseKey = ensureNoiseTile(scene);

    if (noiseKey) {
      this.own(
        scene.add
          .tileSprite(0, 0, sidebarWidth, height, noiseKey)
          .setOrigin(0, 0)
          .setDepth(1000)
      );
    } else {
      this.own(
        scene.add
          .rectangle(0, 0, sidebarWidth, height, C.leather, 1)
          .setOrigin(0, 0)
          .setDepth(1000)
      );
    }

    // Cień przy krawędzi pola gry.
    this.own(
      scene.add
        .rectangle(sidebarWidth - 6, 0, 6, height, 0x000000, 0.35)
        .setOrigin(0, 0)
        .setDepth(1000.2)
    );
  }

  buildCard(card, stainCenterY) {
    const scene = this.scene;

    this.own(
      scene.add
        .rectangle(card.x + 6, card.y + 8, card.w, card.h, 0x000000, 0.5)
        .setOrigin(0, 0)
        .setDepth(1000.4)
    );

    this.own(
      addPaper(scene, card.x, card.y, card.w, card.h, {
        origin: 0,
        seed: 7,
        stain: {
          x: card.w - 72,
          y: stainCenterY - card.y,
          r: 34
        }
      }).setDepth(1001)
    );

    this.own(
      scene.add
        .rectangle(
          card.x + 8,
          card.y + 8,
          card.w - 16,
          card.h - 16
        )
        .setOrigin(0, 0)
        .setStrokeStyle(1, C.ink, 0.28)
        .setDepth(1002)
    );
  }

  buildHeader(card, left, innerW, inner) {
    const scene = this.scene;

    this.own(
      drawPaperclip(scene, card.x + card.w / 2, card.y - 2)
        .setDepth(1005)
    );

    this.own(
      scene.add
        .text(left, card.y + 30, 'CASE FILE', {
          fontFamily: F.pixel,
          fontSize: '10px',
          color: C.inkSoftHex
        })
        .setOrigin(0, 0.5)
        .setDepth(1003)
    );

    const title = this.own(
      scene.add
        .text(left, card.y + 48, String(scene.title || 'Crime Scene'), {
          fontFamily: F.body,
          fontSize: '26px',
          color: C.inkHex,
          lineSpacing: -2,
          wordWrap: { width: innerW - 132 }
        })
        .setOrigin(0, 0)
        .setDepth(1003)
    );

    let size = 26;

    while (title.height > 86 && size > 16) {
      size -= 2;
      title.setFontSize(size);
    }

    this.own(
      createStamp(
        scene,
        card.x + card.w - inner - 64,
        card.y + 84,
        'TOP SECRET',
        C.red,
        C.redHex,
        { angle: -9, fontSize: 11, sub: '*ish', alpha: 0.78 }
      ).setDepth(1004)
    );

    const y = Math.max(
      title.y + title.height,
      card.y + 120
    ) + 8;

    const rule = this.own(scene.add.graphics().setDepth(1003));

    rule.lineStyle(2, C.ink, 0.45);
    drawDashedLine(rule, left, left + innerW, y);

    return y + 16;
  }

  buildGauges(left, y, innerW) {
    const scene = this.scene;

    const plateH = 84;
    const gap = 12;
    const plateW = Math.floor((innerW - gap) / 2);

    const makePlate = (x, label) => {
      const g = this.own(scene.add.graphics().setDepth(1002));

      g.fillStyle(C.plate, 1);
      g.fillRoundedRect(x, y, plateW, plateH, 6);

      g.lineStyle(2, C.gold, 0.8);
      g.strokeRoundedRect(x, y, plateW, plateH, 6);

      g.lineStyle(1, C.gold, 0.25);
      g.strokeRoundedRect(x + 4, y + 4, plateW - 8, plateH - 8, 4);

      this.own(
        scene.add
          .text(x + 12, y + 11, label, {
            fontFamily: F.pixel,
            fontSize: '8px',
            color: '#b9a574'
          })
          .setOrigin(0, 0)
          .setDepth(1003)
      );
    };

    // Zegar.
    makePlate(left, 'TIME');

    this.timerText = this.own(
      scene.add
        .text(left + plateW / 2, y + 42, '0:00', {
          fontFamily: F.pixel,
          fontSize: '22px',
          color: C.amber
        })
        .setOrigin(0.5)
        .setDepth(1003)
    );

    this.own(
      scene.add
        .rectangle(
          left + 12,
          y + plateH - 14,
          plateW - 24,
          6,
          0x000000,
          0.55
        )
        .setOrigin(0, 0.5)
        .setDepth(1003)
    );

    this.timerBar = this.own(
      scene.add
        .rectangle(
          left + 12,
          y + plateH - 14,
          plateW - 24,
          6,
          0x7cb342,
          1
        )
        .setOrigin(0, 0.5)
        .setDepth(1003.5)
    );

    // Wynik.
    const scoreX = left + plateW + gap;

    makePlate(scoreX, 'SCORE');

    this.scoreText = this.own(
      scene.add
        .text(scoreX + plateW / 2, y + 42, String(scene.score), {
          fontFamily: F.pixel,
          fontSize: '22px',
          color: C.lime
        })
        .setOrigin(0.5)
        .setDepth(1003)
    );

    const dots = this.own(scene.add.graphics().setDepth(1003));

    dots.lineStyle(1, C.gold, 0.35);
    drawDashedLine(
      dots,
      scoreX + 12,
      scoreX + plateW - 12,
      y + plateH - 14,
      4,
      4
    );

    return y + plateH + 14;
  }

  buildMissesRow(left, y, innerW) {
    const scene = this.scene;

    this.missesText = this.own(
      scene.add
        .text(left, y, `Misses: ${scene.incorrectClicks}`, {
          fontFamily: F.body,
          fontSize: '18px',
          color: '#8b2a22'
        })
        .setOrigin(0, 0)
        .setDepth(1003)
    );

    this.tally = {
      graphics: this.own(scene.add.graphics().setDepth(1003)),
      x: left + 148,
      y,
      width: innerW - 148
    };

    this.redrawTally(scene.incorrectClicks);

    return y + 36;
  }

  /** Kreski jak na ścianie celi - za każde pudło jedna. */
  redrawTally(count) {
    const tally = this.tally;

    if (!tally?.graphics?.active) {
      return;
    }

    const g = tally.graphics;

    g.clear();
    g.lineStyle(2, C.ink, 0.8);

    const groupWidth = 34;
    const groupGap = 10;

    const maxGroups = Math.max(
      1,
      Math.floor((tally.width + groupGap) / (groupWidth + groupGap))
    );

    let remaining = Math.min(
      Math.max(0, Number(count) || 0),
      maxGroups * 5
    );

    for (let group = 0; group < maxGroups && remaining > 0; group += 1) {
      const marks = Math.min(5, remaining);
      remaining -= marks;

      const gx = tally.x + group * (groupWidth + groupGap);

      for (let i = 0; i < Math.min(4, marks); i += 1) {
        g.lineBetween(
          gx + i * 8,
          tally.y + 2,
          gx + i * 8,
          tally.y + 22
        );
      }

      if (marks === 5) {
        g.lineBetween(
          gx - 4,
          tally.y + 18,
          gx + groupWidth - 2,
          tally.y + 6
        );
      }
    }
  }

  buildEvidenceHeader(left, y, innerW) {
    const scene = this.scene;

    this.own(
      scene.add
        .text(left, y, 'EVIDENCE TO LOCATE', {
          fontFamily: F.pixel,
          fontSize: '10px',
          color: C.inkHex
        })
        .setOrigin(0, 0)
        .setDepth(1003)
    );

    this.counterText = this.own(
      scene.add
        .text(left + innerW, y, '0/0', {
          fontFamily: F.pixel,
          fontSize: '10px',
          color: C.inkSoftHex
        })
        .setOrigin(1, 0)
        .setDepth(1003)
    );

    const rule = this.own(scene.add.graphics().setDepth(1003));

    rule.lineStyle(2, C.ink, 0.45);
    drawDashedLine(rule, left, left + innerW, y + 22);

    return y + 30;
  }

  buildEvidenceRows(left, top, bottom, innerW) {
    const scene = this.scene;
    const items = Array.isArray(scene.activeItems)
      ? scene.activeItems
      : [];

    this.rows.clear();

    const count = Math.max(1, items.length);
    const available = Math.max(60, bottom - top);

    const rowH = Phaser.Math.Clamp(
      Math.floor(available / count),
      30,
      54
    );

    const box = Phaser.Math.Clamp(Math.round(rowH * 0.5), 18, 26);

    const baseFont = Phaser.Math.Clamp(
      Math.round(rowH * 0.42),
      15,
      22
    );

    const textX = left + box + 14;
    const textWidth = innerW - box - 20;

    items.forEach((item, index) => {
      const cy = top + index * rowH + rowH / 2;

      // Linijka księgi.
      this.own(
        scene.add
          .rectangle(left, top + (index + 1) * rowH - 1, innerW, 1, C.inkSoft, 0.25)
          .setOrigin(0, 0)
          .setDepth(1003)
      );

      // Pole wyboru (podwójna kreska = ręczne rysowanie).
      const boxGraphics = this.own(
        scene.add.graphics({ x: left, y: cy - box / 2 }).setDepth(1003)
      );

      boxGraphics.lineStyle(2, C.ink, 0.85);
      boxGraphics.strokeRect(0, 0, box, box);

      boxGraphics.lineStyle(1, C.ink, 0.35);
      boxGraphics.strokeRect(1, -1, box, box);

      const label = this.own(
        scene.add
          .text(
            textX,
            cy,
            String(item.item ?? item.id ?? '???'),
            {
              fontFamily: F.body,
              fontSize: `${baseFont}px`,
              color: C.inkHex,
              wordWrap: { width: textWidth }
            }
          )
          .setOrigin(0, 0.5)
          .setDepth(1003)
      );

      let fontSize = baseFont;

      while (label.height > rowH - 6 && fontSize > 13) {
        fontSize -= 1;
        label.setFontSize(fontSize);
      }

      const check = this.own(
        scene.add
          .graphics({ x: left + box / 2, y: cy })
          .setDepth(1004)
      );

      drawCheckMark(check, box * 1.1, C.green, 4);
      check.setVisible(false);

      const strike = this.own(
        scene.add
          .rectangle(textX - 4, cy + 1, label.width + 8, 3, C.redInk, 0.9)
          .setOrigin(0, 0.5)
          .setDepth(1004)
          .setScale(0, 1)
      );

      this.rows.set(String(item.id), {
        item,
        label,
        check,
        strike,
        done: false
      });
    });
  }

  markRowFound(row, animate) {
    const scene = this.scene;

    row.done = true;
    row.label.setColor(C.inkFaintHex);
    row.check.setVisible(true);

    if (!animate) {
      row.check.setScale(1);
      row.strike.setScale(1, 1);
      return;
    }

    row.check.setScale(0);

    scene.tweens.add({
      targets: row.check,
      scale: 1,
      duration: 260,
      ease: 'Back.Out'
    });

    scene.tweens.add({
      targets: row.strike,
      scaleX: 1,
      duration: 280,
      delay: 80,
      ease: 'Cubic.Out'
    });
  }

  buildHintButton(left, y, height, innerW) {
    const scene = this.scene;

    const width = Math.min(248, innerW - 100);

    this.hintBtn = this.own(
      scene.add
        .rectangle(left, y, width, height, C.brass, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, C.goldLight, 0.9)
        .setInteractive({ useHandCursor: true })
        .setDepth(1003)
    );

    // Lupa.
    const icon = this.own(
      scene.add
        .graphics({ x: left + 26, y: y + height / 2 })
        .setDepth(1004)
    );

    icon.lineStyle(3, 0xfff2c4, 1);
    icon.strokeCircle(-2, -2, 8);
    icon.lineBetween(4, 4, 11, 11);

    this.hintLabel = this.own(
      scene.add
        .text(left + width / 2 + 14, y + height / 2, 'HINT', {
          fontFamily: F.pixel,
          fontSize: '13px',
          color: '#fff2c4'
        })
        .setOrigin(0.5)
        .setDepth(1004)
    );

    this.hintBtn.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.openHintModal();
      }
    );

    this.hintBtn.on('pointerover', () => {
      if (!this.hintBusy && !this.hintModalOpen) {
        this.hintBtn.setFillStyle(C.brassLight, 1);
      }
    });

    this.hintBtn.on('pointerout', () => {
      this.hintBtn?.setFillStyle(C.brass, 1);
    });
  }

  /** Ciemna tabliczka z "dalekopisu": komunikaty pisane litera po literze. */
  buildDispatchPlate(left, y, innerW, height) {
    const scene = this.scene;

    const g = this.own(scene.add.graphics().setDepth(1002));

    g.fillStyle(C.plate, 1);
    g.fillRoundedRect(left, y, innerW, height, 6);

    g.lineStyle(2, C.gold, 0.7);
    g.strokeRoundedRect(left, y, innerW, height, 6);

    this.own(
      scene.add
        .text(left + 12, y + 10, 'DISPATCH', {
          fontFamily: F.pixel,
          fontSize: '8px',
          color: '#8f7f55'
        })
        .setOrigin(0, 0)
        .setDepth(1003)
    );

    this.messageText = this.own(
      scene.add
        .text(left + 12, y + 28, '', {
          fontFamily: F.body,
          fontSize: '17px',
          color: C.amber,
          wordWrap: { width: innerW - 24 },
          lineSpacing: 5
        })
        .setOrigin(0, 0)
        .setDepth(1003)
    );
  }

  createBackButton(width) {
    if (this.scene.textures.exists('back')) {
      this.backBtn = this.own(
        this.scene.add
          .image(width - 125, 46, 'back')
          .setDisplaySize(190, 60)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(1001)
      );
    } else {
      this.backBtn = this.own(
        this.scene.add
          .text(width - 125, 46, 'RETURN TO CITY', {
            fontFamily: F.pixel,
            fontSize: '12px',
            color: '#fff2c4',
            backgroundColor: '#3a2e1c',
            padding: {
              left: 16,
              right: 16,
              top: 12,
              bottom: 12
            }
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(1001)
      );
    }

    const baseScaleX = this.backBtn.scaleX;
    const baseScaleY = this.backBtn.scaleY;

    const animate = (factor) => {
      if (!this.backBtn?.active) {
        return;
      }

      this.scene.tweens.killTweensOf(this.backBtn);

      this.scene.tweens.add({
        targets: this.backBtn,
        scaleX: baseScaleX * factor,
        scaleY: baseScaleY * factor,
        duration: 100,
        ease: 'Power1'
      });
    };

    this.backBtn.on('pointerover', () => animate(1.05));
    this.backBtn.on('pointerout', () => animate(1));

    this.backBtn.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          this.isReturningToCity ||
          this.hintModalOpen ||
          this.hintBusy
        ) {
          return;
        }

        this.isReturningToCity = true;

        this.scene.tweens.killTweensOf(this.backBtn);
        this.backBtn.disableInteractive();

        this.scene.abandonGame();
      }
    );
  }

  // -------------------------------------------------------------------------
  // Aktualizacje (API używane przez kontrolery)
  // -------------------------------------------------------------------------

  refreshList(instant = false) {
    const scene = this.scene;
    const items = Array.isArray(scene.activeItems)
      ? scene.activeItems
      : [];

    let found = 0;

    for (const item of items) {
      const id = String(item.id);
      const row = this.rows.get(id);

      if (!row || !scene.foundItems.has(id)) {
        continue;
      }

      found += 1;

      if (!row.done) {
        this.markRowFound(row, !instant);
      }
    }

    this.counterText?.setText(`${found}/${items.length}`);

    if (
      this.hintMarker &&
      scene.foundItems.has(String(this.hintMarker.itemId))
    ) {
      this.clearHintMarker();
    }
  }

  refreshHintButton(summary = null) {
    if (!this.hintLabel?.active || this.destroyed) {
      return;
    }

    const count =
      summary?.available ??
      hintManager.getAvailableCount();

    this.hintLabel.setText(`HINT (${count})`);
  }

  updateTimer(timeLeft) {
    if (!this.timerText?.active) {
      return;
    }

    const scene = this.scene;
    const ratio = Phaser.Math.Clamp(timeLeft / this.totalTime, 0, 1);

    this.timerText.setText(scene.formatTime(timeLeft));
    this.timerBar?.setScale(ratio, 1);

    let textColor = C.amber;
    let barColor = 0x7cb342;

    if (ratio <= 0.25 || timeLeft <= 30) {
      textColor = '#ff8a6b';
      barColor = 0xd9382f;
    } else if (ratio <= 0.5) {
      barColor = 0xe6a817;
    }

    this.timerText.setColor(textColor);
    this.timerBar?.setFillStyle(barColor, 1);

    const low = timeLeft > 0 && timeLeft <= LOW_TIME_SECONDS;

    if (low && !this.lowTimePulse) {
      this.lowTimePulse = scene.tweens.add({
        targets: this.timerText,
        scale: 1.12,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    } else if (!low && this.lowTimePulse) {
      this.stopLowTimePulse();
    }
  }

  stopLowTimePulse() {
    this.lowTimePulse?.stop();
    this.lowTimePulse = null;

    if (this.timerText?.active) {
      this.timerText.setScale(1);
    }
  }

  updateScoreAndMisses(score, misses) {
    this.scoreText?.setText(String(score));
    this.missesText?.setText(`Misses: ${misses}`);
    this.redrawTally(misses);
  }

  showMessage(text, color = C.amber) {
    if (!this.messageText?.active) {
      return;
    }

    const scene = this.scene;

    scene.tweens.killTweensOf(this.messageText);

    this.typeEvent?.remove(false);
    this.typeEvent = null;

    const full = String(text ?? '');

    this.messageText
      .setText('')
      .setColor(color)
      .setAlpha(1);

    if (!full.length) {
      return;
    }

    let index = 0;

    this.typeEvent = scene.time.addEvent({
      delay: TYPE_DELAY_MS,
      repeat: full.length - 1,
      callback: () => {
        if (!this.messageText?.active) {
          return;
        }

        index += 1;
        this.messageText.setText(full.slice(0, index));
      }
    });

    scene.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 2200,
      delay: full.length * TYPE_DELAY_MS + 1800,
      ease: 'Linear'
    });
  }

  // -------------------------------------------------------------------------
  // Podpowiedzi
  // -------------------------------------------------------------------------

  canUseHints() {
    return (
      !this.destroyed &&
      !this.scene._cleanupDone &&
      !this.scene.isSceneFinished &&
      !this.scene.isReturning &&
      !this.scene.isShuttingDownHiddenObjects &&
      !this.isReturningToCity
    );
  }

  getRemainingZones() {
    return this.scene.hiddenZones.filter((zone) => {
      const id = zone?.getData?.('id');

      return (
        zone?.active &&
        id &&
        !zone.getData('found') &&
        !this.scene.foundItems.has(id)
      );
    });
  }

  lockGameplay() {
    if (this.lockState) {
      return;
    }

    const timer = this.scene.timerEvent;

    const objects = [
      ...this.scene.hiddenZones,
      this.backBtn,
      this.hintBtn
    ].filter((object) => object?.active && object.input);

    this.lockState = {
      timer,
      timerWasPaused: timer?.paused ?? false,
      topOnly: this.scene.input.topOnly,
      objects: objects.map((object) => ({
        object,
        enabled: object.input.enabled
      }))
    };

    if (timer) {
      timer.paused = true;
    }

    for (const entry of this.lockState.objects) {
      entry.object.input.enabled = false;
    }

    this.scene.input.setTopOnly(true);
  }

  unlockGameplay() {
    const state = this.lockState;
    this.lockState = null;

    if (!state) {
      return;
    }

    if (
      this.scene.input &&
      typeof state.topOnly === 'boolean'
    ) {
      this.scene.input.setTopOnly(state.topOnly);
    }

    if (!this.canUseHints()) {
      return;
    }

    if (
      state.timer &&
      this.scene.timerEvent === state.timer
    ) {
      state.timer.paused = state.timerWasPaused;
    }

    for (const entry of state.objects) {
      if (entry.object?.active && entry.object.input) {
        entry.object.input.enabled = entry.enabled;
      }
    }
  }

  openHintModal() {
    if (
      !this.canUseHints() ||
      this.hintModalOpen ||
      this.hintBusy
    ) {
      return;
    }

    const energyManager =
      this.scene.energyManager || getEnergyManager();

    if (
      energyManager.isForcedSleepActive() ||
      energyManager.isManualSleepActive()
    ) {
      this.showMessage(
        'Even excellent eyesight requires being awake.',
        '#ffb3b3'
      );

      return;
    }

    if (!this.getRemainingZones().length) {
      this.showMessage('Nothing left to find.');
      return;
    }

    this.lockGameplay();
    this.hintModalOpen = true;

    const { width, height } = this.scene.scale;
    const panelWidth = Math.min(700, width - 32);
    const panelHeight = 590;

    this.hintModal = this.scene.add
      .container(width / 2, height / 2)
      .setDepth(2500);

    const blocker = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setInteractive();

    blocker.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      }
    );

    const shadow = this.scene.add
      .rectangle(6, 8, panelWidth, panelHeight, 0x000000, 0.55);

    const panel = this.scene.add
      .rectangle(
        0, 0,
        panelWidth, panelHeight,
        0x1c1915, 1
      )
      .setStrokeStyle(2, C.gold, 0.95);

    const innerFrame = this.scene.add
      .rectangle(0, 0, panelWidth - 16, panelHeight - 16)
      .setStrokeStyle(1, C.gold, 0.35);

    const studs = [
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ].map(([sx, sy]) =>
      this.scene.add.circle(
        sx * (panelWidth / 2 - 14),
        sy * (panelHeight / 2 - 14),
        4,
        C.gold,
        0.8
      )
    );

    const title = this.scene.add
      .text(0, -250, 'A LITTLE HELP?', {
        fontFamily: F.body,
        fontSize: '32px',
        color: '#f8e7b9',
        align: 'center'
      })
      .setOrigin(0.5);

    const titleLineLeft = this.scene.add
      .rectangle(-panelWidth / 2 + 40, -250, 60, 2, C.gold, 0.7)
      .setOrigin(0, 0.5);

    const titleLineRight = this.scene.add
      .rectangle(panelWidth / 2 - 40, -250, 60, 2, C.gold, 0.7)
      .setOrigin(1, 0.5);

    const available = hintManager.getAvailableCount();

    const subtitle = this.scene.add
      .text(
        0,
        -205,
        `Free hints available: ${available}`,
        {
          fontFamily: F.body,
          fontSize: '20px',
          color: '#ded6c3'
        }
      )
      .setOrigin(0.5);

    this.hintModal.add([
      blocker,
      shadow,
      panel,
      innerFrame,
      ...studs,
      title,
      titleLineLeft,
      titleLineRight,
      subtitle
    ]);

    this.addHintOption({
      y: -140,
      width: panelWidth - 56,
      label: 'USE FREE HINT',
      details: 'One hint from your personal supply.',
      accent: FREE_HINT_ACCENT,
      enabled: available > 0,
      callback: () => this.applyHint('free_hint')
    });

    for (const [index, method] of [
      'cut_corners',
      'squad_help'
    ].entries()) {
      const option = HINT_OPTIONS[method];

      const affordability =
        energyManager.canAfford(option.energy);

      this.addHintOption({
        y: -35 + index * 105,
        width: panelWidth - 56,
        label: option.label,
        details:
          `${option.description}\n` +
          `${option.energy} energy · ` +
          `${option.minutes} min · ` +
          option.moralLabel +
          (affordability.ok ? '' : ' · Not enough energy'),
        accent: option.accent,
        enabled: affordability.ok,
        callback: () => this.applyHint(method)
      });
    }

    this.hintModalMessage = this.scene.add
      .text(0, 158, '', {
        fontFamily: F.body,
        fontSize: '17px',
        color: '#ffb3b3',
        align: 'center',
        wordWrap: {
          width: panelWidth - 70
        }
      })
      .setOrigin(0.5);

    this.hintModal.add(this.hintModalMessage);

    const cancel = this.scene.add
      .text(0, 240, 'KEEP LOOKING', {
        fontFamily: F.pixel,
        fontSize: '12px',
        color: '#f8e7b9',
        backgroundColor: '#39332a',
        padding: {
          left: 20,
          right: 20,
          top: 16,
          bottom: 16
        }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    cancel.on('pointerover', () => {
      cancel.setBackgroundColor('#4d4436');
    });

    cancel.on('pointerout', () => {
      cancel.setBackgroundColor('#39332a');
    });

    cancel.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (!this.hintBusy) {
          this.closeHintModal();
        }
      }
    );

    this.hintModal.add(cancel);

    const modalScale = Math.min(
      1,
      (height - 24) / panelHeight
    );

    // Tło pozostaje na cały ekran również przy skalowaniu panelu.
    blocker.setSize(
      width / modalScale,
      height / modalScale
    );

    this.hintModal
      .setAlpha(0)
      .setScale(modalScale * 0.94);

    this.scene.tweens.add({
      targets: this.hintModal,
      alpha: 1,
      scale: modalScale,
      duration: 170,
      ease: 'Back.Out'
    });
  }

  addHintOption({
    y,
    width,
    label,
    details,
    accent,
    enabled,
    callback
  }) {
    const background = this.scene.add
      .rectangle(
        0, y, width, 92,
        enabled ? 0x493b27 : 0x292722,
        1
      )
      .setStrokeStyle(
        1,
        enabled ? C.gold : 0x666052,
        0.8
      )
      .setInteractive({
        useHandCursor: enabled
      });

    const accentBar = this.scene.add
      .rectangle(
        -width / 2 + 3,
        y,
        6,
        92,
        accent,
        enabled ? 1 : 0.3
      );

    const heading = this.scene.add
      .text(0, y - 26, label, {
        fontFamily: F.pixel,
        fontSize: '11px',
        color: enabled ? '#fff2c4' : '#918b7c'
      })
      .setOrigin(0.5);

    const body = this.scene.add
      .text(0, y + 13, details, {
        fontFamily: F.body,
        fontSize: '16px',
        color: enabled ? '#e4ddcf' : '#918b7c',
        align: 'center',
        wordWrap: {
          width: width - 24
        },
        lineSpacing: 2
      })
      .setOrigin(0.5);

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          enabled &&
          !this.hintBusy &&
          this.canUseHints()
        ) {
          callback();
        }
      }
    );

    background.on('pointerover', () => {
      if (enabled && !this.hintBusy) {
        background.setFillStyle(0x665032);
      }
    });

    background.on('pointerout', () => {
      background.setFillStyle(
        enabled ? 0x493b27 : 0x292722
      );
    });

    this.hintModal.add([
      background,
      accentBar,
      heading,
      body
    ]);
  }

  applyHint(method) {
    if (
      !this.hintModalOpen ||
      this.hintBusy ||
      !this.canUseHints()
    ) {
      return;
    }

    const zones = this.getRemainingZones();

    if (!zones.length) {
      this.closeHintModal();
      return;
    }

    this.hintBusy = true;

    const target = zones[
      Math.floor(Math.random() * zones.length)
    ];

    const context = {
      sceneId: this.scene.sceneId,
      itemId: target.getData('id')
    };

    const energyManager =
      this.scene.energyManager || getEnergyManager();

    let result;

    if (method === 'free_hint') {
      result = hintManager.useFreeHint(context);
    } else {
      const option = HINT_OPTIONS[method];

      if (!option) {
        this.failHint('Unknown hint option.');
        return;
      }

      const affordability =
        energyManager.canAfford(option.energy);

      if (!affordability.ok) {
        this.failHint(
          energyManager.getInsufficientEnergyMessage(
            option.energy
          )
        );

        return;
      }

      const payment = energyManager.consumeCustom(
        option.energy,
        `Hidden-object hint (${method}): -${option.energy}`,
        {
          requireFullAmount: true,
          activityType: 'hidden_object_hint'
        }
      );

      if (!payment.success) {
        this.failHint(
          payment.message ||
          'Unable to pay for this hint.'
        );

        return;
      }

      result = hintManager.recordPaidHint(
        method,
        context,
        {
          energy: option.energy,
          minutes: option.minutes,
          cash: 0
        }
      );

      EventBus.emit(
        'advanceTime',
        0,
        option.minutes
      );

      // Zapis również po przesunięciu zegara.
      saveGameState();
    }

    if (!result?.success) {
      this.failHint(
        'No free hints left. Choose another option.'
      );

      return;
    }

    this.removeHintModal();

    if (!this.canUseHints()) {
      this.hintBusy = false;
      this.unlockGameplay();
      return;
    }

    const finishHint = () => {
      this.sleepWaitEvent = null;

      if (!this.canUseHints()) {
        this.hintBusy = false;
        this.unlockGameplay();
        return;
      }

      this.hintBusy = false;
      this.unlockGameplay();
      this.highlightZone(target);

      this.showMessage(
        'Your eyes may want to investigate that glow.',
        '#f8e7b9'
      );

      if (result.saved === false) {
        this.showMessage(
          'Hint used, but autosave failed. ' +
          'Progress may not survive reloading.',
          '#ffb3b3'
        );
      }
    };

    // Jeżeli koszt wyzerował energię, czekamy na koniec snu.
    if (energyManager.isForcedSleepActive()) {
      this.sleepWaitEvent = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (!this.canUseHints()) {
            this.sleepWaitEvent?.remove(false);
            this.sleepWaitEvent = null;
            this.hintBusy = false;
            this.unlockGameplay();
            return;
          }

          if (!energyManager.isForcedSleepActive()) {
            this.sleepWaitEvent?.remove(false);
            finishHint();
          }
        }
      });
    } else {
      finishHint();
    }
  }

  failHint(message) {
    this.hintBusy = false;
    this.hintModalMessage?.setText(message);
  }

  removeHintModal() {
    if (this.hintModal) {
      this.scene.tweens?.killTweensOf(this.hintModal);
      this.hintModal.destroy();
    }

    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintModalOpen = false;
  }

  closeHintModal() {
    this.removeHintModal();
    this.hintBusy = false;
    this.unlockGameplay();
    this.refreshHintButton();
  }

  /** Złoty pulsujący pierścień + "sonar" wokół wskazanego obiektu. */
  highlightZone(zone) {
    this.clearHintMarker();

    if (
      !zone?.active ||
      zone.getData('found') ||
      !this.canUseHints()
    ) {
      return;
    }

    const scene = this.scene;

    const w = Math.max(60, zone.width + 28);
    const h = Math.max(60, zone.height + 28);

    const ring = scene.add
      .ellipse(0, 0, w, h, 0xffd966, 0.12)
      .setStrokeStyle(4, 0xffd966, 1);

    const sonar = scene.add
      .ellipse(0, 0, w, h)
      .setStrokeStyle(3, 0xffd966, 0.8);

    const marker = scene.add
      .container(zone.x, zone.y, [sonar, ring])
      .setDepth(900);

    marker.itemId = zone.getData('id');
    this.hintMarker = marker;

    scene.tweens.add({
      targets: ring,
      alpha: 0.35,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    scene.tweens.add({
      targets: sonar,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0,
      duration: 900,
      repeat: -1,
      ease: 'Quad.Out'
    });

    this.hintMarkerTimer = scene.time.delayedCall(
      3600,
      () => this.clearHintMarker()
    );
  }

  clearHintMarker() {
    this.hintMarkerTimer?.remove(false);
    this.hintMarkerTimer = null;

    if (this.hintMarker) {
      const marker = this.hintMarker;
      this.hintMarker = null;

      for (const child of marker.list || []) {
        this.scene.tweens?.killTweensOf(child);
      }

      this.scene.tweens?.killTweensOf(marker);
      marker.destroy();
    }
  }

  // -------------------------------------------------------------------------
  // Wynik
  // -------------------------------------------------------------------------

  /** Wywoływane przez HiddenObjectsResultOverlay tuż przed pokazaniem wyniku. */
  freezeForResult() {
    this.closeHintModal();
    this.clearHintMarker();
    this.stopLowTimePulse();

    this.hintBtn?.disableInteractive();
  }

  // Wynik rysuje HiddenObjectsResultOverlay (scene.overlay);
  // te metody zostają jako cienkie przekierowanie dla zgodności.
  showSuccessOverlay() {
    this.freezeForResult();
    this.scene.overlay?.showSuccessOverlay();
  }

  showFailureOverlay() {
    this.freezeForResult();
    this.scene.overlay?.showFailureOverlay();
  }

  // -------------------------------------------------------------------------
  // Sprzątanie
  // -------------------------------------------------------------------------

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    EventBus.off(
      'hints:changed',
      this.boundRefreshHintButton
    );

    this.scene.events.off(
      'shutdown',
      this.boundDestroy
    );

    this.sleepWaitEvent?.remove(false);
    this.sleepWaitEvent = null;

    this.typeEvent?.remove(false);
    this.typeEvent = null;

    this.stopLowTimePulse();

    this.removeHintModal();
    this.clearHintMarker();
    this.unlockGameplay();

    this.hintBusy = false;

    for (const object of this.ownedObjects) {
      if (object?.active) {
        this.scene.tweens.killTweensOf(object);
        object.destroy();
      }
    }

    this.ownedObjects = [];
    this.rows.clear();

    this.resultOverlay?.destroy();
    this.resultContainer?.destroy();

    this.resultOverlay = null;
    this.resultContainer = null;

    this.timerText = null;
    this.timerBar = null;
    this.scoreText = null;
    this.missesText = null;
    this.tally = null;
    this.counterText = null;
    this.messageText = null;
    this.backBtn = null;
    this.hintBtn = null;
    this.hintLabel = null;
  }
}