import {
  FLAVOUR
} from '../../config/RoadTripTowns.js';

import {
  computeOutcome,
  applyOutcome,
  chargeRoadTripFine
} from '../../managers/RoadTripManager.js';

import {
  FINE_AMOUNT,
  pick
} from './DriveShared.js';

export const DriveTrip = {
  hideTravelUi() {
    const news = this.getRegisteredScene('NewsHud');
    const ui = this.getRegisteredScene('UIScene');
    const dom = document.getElementById('hud-container');

    this.travelHud = {
      news,
      newsEnabled: news?.hudEnabled,
      ui,
      uiVisible: ui?.sys.settings.visible,
      dom,
      display: dom?.style.display,
      sleeping: [
        'PlayerHudScene',
        'NewsHud'
      ].filter(key => this.isSceneActive(key))
    };

    news?.setHudVisible?.(false);
    ui?.sys.setVisible(false);

    if (dom) {
      dom.style.display = 'none';
    }

    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  },

  restoreTravelUi() {
    const previous = this.travelHud;

    this.travelHud = null;

    if (!previous) return;

    if (previous.dom?.isConnected) {
      previous.dom.style.display = previous.display;
    }

    if (
      previous.ui &&
      this.getRegisteredScene('UIScene') === previous.ui
    ) {
      previous.ui.sys.setVisible(previous.uiVisible);
    }

    if (
      typeof previous.newsEnabled === 'boolean' &&
      this.getRegisteredScene('NewsHud') === previous.news
    ) {
      previous.news.setHudVisible?.(
        previous.newsEnabled
      );
    }

    for (const key of previous.sleeping) {
      if (this.isSceneSleeping(key)) {
        this.getRegisteredScene(key)?.sys.wake();
      }
    }
  },

  showSettlementError(error) {
    console.error('[DriveScene] Settlement failed:', error);

    this.settlementError = error;
    this.uiHeld = false;

    this._settlementPanel?.destroy(true);

    const x = this.W / 2;
    const y = this.H / 2;

    const background = this.add.rectangle(
      0,
      0,
      this.W * 0.72,
      this.H * 0.36,
      0x241610,
      0.98
    ).setStrokeStyle(3, 0xd4af37);

    const message = this.add.text(
      0,
      -45 * this.U,
      `${error.message}\n\nClick RETRY after fixing browser storage.`,
      {
        fontFamily: 'SpecialElite',
        fontSize: this.px(24),
        color: '#fff1d0',
        align: 'center',
        wordWrap: { width: this.W * 0.65 }
      }
    ).setOrigin(0.5);

    const retry = this.add.text(
      0,
      85 * this.U,
      'RETRY',
      {
        fontFamily: 'PressStart2P',
        fontSize: this.px(18),
        color: '#d4af37',
        backgroundColor: '#3b2d20',
        padding: { x: 22, y: 14 }
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retry.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();

      this._settlementPanel?.destroy(true);
      this._settlementPanel = null;
      this.settlementError = null;
      this.uiHeld = true;

      if (this.pendingFine) {
        this.settlePendingFine();
      } else if (this.pendingArrival) {
        this.showSummary();
      }
    });

    this._settlementPanel = this.add.container(
      x,
      y,
      [background, message, retry]
    ).setDepth(20000);
  },

  onCam() {
    if (
      this.state !== 'driving' ||
      this.pendingFine ||
      this.settlementError
    ) {
      return;
    }

    if (this.speedMul <= 1.15) {
      this.say(pick(FLAVOUR.camSafe), 2400);
      return;
    }

    this.fineSequence += 1;

    this.pendingFine = {
      id: `camera-${this.fineSequence}`,
      amount: FINE_AMOUNT
    };

    this.settlePendingFine();
  },

  settlePendingFine() {
    const pending = this.pendingFine;

    if (!pending) return;

    try {
      const result = chargeRoadTripFine(
        this.quote,
        this.tripId,
        pending.amount,
        pending.id
      );

      this.pendingFine = null;
      this.stats.fines = result.assessed;

      this.cameras.main.flash(
        220,
        255,
        255,
        255
      );

      this.say(pick(FLAVOUR.camFlash), 3000, true);
      this.floatText(
        `FINE: $${pending.amount}`,
        '#ff6b5a'
      );

      this.refreshStats();
    } catch (error) {
      this.showSettlementError(error);
    }
  },

  showSummary() {
    if (
      this.state === 'summary' ||
      this.state === 'leaving' ||
      this.settlementError
    ) {
      return;
    }

    this.pendingArrival = true;

    try {
      this.outcome = applyOutcome(
        this.quote,
        computeOutcome(this.quote, this.stats),
        this.tripId
      );

      this.applied = true;
      this.pendingArrival = false;
    } catch (error) {
      this.showSettlementError(error);
      return;
    }

    this.state = 'summary';
    this.summaryReady = false;
    this.uiHeld = false;

    this.autoZone?.disableInteractive?.();
    this.radioZone?.disableInteractive?.();
    this.dino?.disableInteractive?.();

    const outcome = this.outcome;
    const { W, H, U } = this;

    const veil = this.add.rectangle(
      W / 2,
      H / 2,
      W,
      H,
      0x000000,
      0.65
    ).setDepth(400);

    const panelWidth = W * 0.52;
    const panelHeight = H * 0.74;
    const left = (W - panelWidth) / 2;
    const top = (H - panelHeight) / 2;

    const panel = this.add.graphics()
      .setDepth(401);

    panel.fillStyle(0xf1e4bd, 1);
    panel.fillRect(
      left,
      top,
      panelWidth,
      panelHeight
    );

    panel.lineStyle(6, 0x3b2d20, 1);
    panel.strokeRect(
      left,
      top,
      panelWidth,
      panelHeight
    );

    panel.fillStyle(0x1a130e, 1);
    panel.fillRect(
      left,
      top,
      panelWidth,
      panelHeight * 0.15
    );

    const title = this.add.text(
      W / 2,
      top + panelHeight * 0.075,
      `ARRIVED: ${this.town.name.toUpperCase()}`,
      {
        fontFamily: 'PressStart2P',
        fontSize: this.px(18),
        color: '#d4af37',
        align: 'center',
        wordWrap: {
          width: panelWidth * 0.9
        }
      }
    )
      .setOrigin(0.5)
      .setDepth(402);

    const rows = [
      ['Distance', `${outcome.km} km`],
      ['Fuel paid', `-$${outcome.fuel}`],
      [
        'Travel time',
        `${outcome.hours}h ${outcome.minutes}m`
      ],
      ['Dents', String(outcome.hits)],
      ['Coffee collected', String(outcome.coffees)],
      ['Road finds received', `+$${outcome.coins}`],
      ['Fines paid', `-$${outcome.finesPaid}`]
    ];

    if (outcome.finesUnpaid > 0) {
      rows.push([
        'Unpaid fines (not deducted)',
        `$${outcome.finesUnpaid}`
      ]);
    }

    const items = [];
    const rowHeight = panelHeight * 0.061;
    let y = top + panelHeight * 0.19;

    for (const [label, value] of rows) {
      items.push(
        this.add.text(
          left + panelWidth * 0.055,
          y,
          label,
          {
            fontFamily: 'SpecialElite',
            fontSize: this.px(23),
            color: '#2a1d12'
          }
        ).setDepth(402),

        this.add.text(
          left + panelWidth * 0.945,
          y,
          value,
          {
            fontFamily: 'SpecialElite',
            fontSize: this.px(23),
            color: '#6b1d12'
          }
        )
          .setOrigin(1, 0)
          .setDepth(402)
      );

      y += rowHeight;
    }

    const verdictText = outcome.autopilot
      ? FLAVOUR.verdicts.autopilot
      : outcome.hits === 0
        ? FLAVOUR.verdicts.perfect
        : outcome.hits <= 2
          ? FLAVOUR.verdicts.minor
          : FLAVOUR.verdicts.major;

    const verdict = this.add.text(
      W / 2,
      top + panelHeight * 0.73,
      verdictText,
      {
        fontFamily: 'SpecialElite',
        fontSize: this.px(22),
        color: '#3b2d20',
        align: 'center',
        wordWrap: {
          width: panelWidth * 0.86
        }
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(402);

    const hint = this.add.text(
      W / 2,
      top + panelHeight * 0.93,
      'CLICK / SPACE / ENTER TO CONTINUE',
      {
        fontFamily: 'PressStart2P',
        fontSize: this.px(11),
        color: '#6b1d12'
      }
    )
      .setOrigin(0.5)
      .setDepth(402);

    const all = [
      panel,
      title,
      verdict,
      hint,
      ...items
    ];

    veil.setAlpha(0);
    all.forEach(item => item.setAlpha(0));

    this.createTrackedTween({
      targets: veil,
      alpha: 1,
      duration: 300
    });

    this.createTrackedTween({
      targets: all,
      alpha: 1,
      duration: 350,
      delay: 200,
      onComplete: () => {
        this.summaryReady = true;
      }
    });

    this.createTrackedTween({
      targets: hint,
      alpha: { from: 0.3, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      delay: 700
    });
  },

  leaveScene() {
    if (
      this.state !== 'summary' ||
      !this.summaryReady ||
      !this.applied ||
      !this.outcome ||
      this.settlementError
    ) {
      return;
    }

    this.state = 'leaving';

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      async () => {
        if (!this.sys.isActive()) return;

        try {
          const moved = await this.goto(
            this.destination,
            {
              ...(this.driveData.nextData || {}),
              fromRoadTrip: true,
              roadTripTownId: this.quote.toId,
              roadTripOutcome: this.outcome,
              roadTripId: this.tripId
            }
          );

          if (!moved) {
            throw new Error(
              'The destination scene could not be opened.'
            );
          }
        } catch (error) {
          console.error(
            '[DriveScene] Destination failed:',
            error
          );

          if (
            this.sys.isActive() &&
            !this._cleanupDone
          ) {
            this.state = 'summary';
            this.uiHeld = false;
            this.cameras.main.fadeIn(
              220,
              0,
              0,
              0
            );
          }
        }
      }
    );

    this.cameras.main.fadeOut(
      450,
      0,
      0,
      0
    );
  },

  onSceneShutdown() {
    this.ready = false;
    this.uiHeld = false;

    this.releaseDriveInput?.();
    this.releaseDriveInput = null;

    this.restoreTravelUi();

    this.objects = [];
    this.drops = [];
    this.bubble = null;
    this.wiper = null;
    this.clouds = [];

    this.pendingFine = null;
    this.settlementError = null;
    this._settlementPanel = null;
  }
};