import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { computeOutcome, applyOutcome } from '../../managers/RoadTripManager.js';

export const DriveTrip = {
  hideTravelUi() {
    const news = this.getRegisteredScene('NewsHud');
    const ui = this.getRegisteredScene('UIScene');
    const dom = document.getElementById('hud-container');
    this.travelHud = {
      news, newsEnabled: news?.hudEnabled,
      ui, uiVisible: ui?.sys.settings.visible,
      dom, display: dom?.style.display,
      sleeping: ['PlayerHudScene', 'NewsHud'].filter(key => this.isSceneActive(key))
    };
    news?.setHudVisible?.(false);
    ui?.sys.setVisible(false);
    if (dom) dom.style.display = 'none';
    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  },

  restoreTravelUi() {
    const prev = this.travelHud;
    this.travelHud = null;
    if (!prev) return;
    if (prev.dom?.isConnected) prev.dom.style.display = prev.display;
    if (prev.ui && this.getRegisteredScene('UIScene') === prev.ui) {
      prev.ui.sys.setVisible(prev.uiVisible);
    }
    if (typeof prev.newsEnabled === 'boolean' && this.getRegisteredScene('NewsHud') === prev.news) {
      prev.news.setHudVisible?.(prev.newsEnabled);
    }
    // Wybudź przed create() celu, żeby to cel mógł zdecydować o własnym HUD-zie.
    for (const key of prev.sleeping) {
      if (this.isSceneSleeping(key)) this.getRegisteredScene(key)?.sys.wake();
    }
  },

  showSummary() {
    if (this.state === 'summary' || this.state === 'leaving') {
      return;
    }

    this.state = 'summary';
    this.summaryReady = false;

    this.outcome = computeOutcome(this.quote, this.stats);

    const o = this.outcome;
    const { W, H, U } = this;

    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(400);
    veil.setAlpha(0);

    const pw = W * 0.46, ph = H * 0.62;
    const px0 = W / 2 - pw / 2, py0 = H / 2 - ph / 2;

    const panel = this.add.graphics().setDepth(401);
    panel.fillStyle(0xf1e4bd, 1); panel.fillRect(px0, py0, pw, ph);
    panel.lineStyle(6, 0x3b2d20, 1); panel.strokeRect(px0, py0, pw, ph);
    panel.fillStyle(0x1a130e, 1); panel.fillRect(px0, py0, pw, ph * 0.17);

    const title = this.add.text(
      W / 2, py0 + ph * 0.085,
      `${__dialogueText("scenes/DriveScene.js", "t_0c4caacaf379aadd6a9a")}${this.town.name.toUpperCase()}`,
      {
        fontFamily: 'PressStart2P', fontSize: this.px(18), color: '#d4af37',
        align: 'center', lineSpacing: 10, wordWrap: { width: pw * 0.9 }
      }
    ).setOrigin(0.5).setDepth(402);

    const fmtMoney = v => (v > 0 ? `$${v}` : '$0');

    const rows = [
      [__dialogueText("scenes/DriveScene.js", "t_58406adeb74d4175ba60"), `${o.km}${__dialogueText("scenes/DriveScene.js", "t_408b05c97145e3efe2b1")}`],
      [__dialogueText("scenes/DriveScene.js", "t_a80f942f4112036dfc2d"), `-${fmtMoney(o.fuel)}`],
      [__dialogueText("scenes/DriveScene.js", "t_500d2cc38bae33dd09e5"), `${o.hours}${__dialogueText("scenes/DriveScene.js", "t_17c76396f75dbc3aeb88")}${o.minutes}${__dialogueText("scenes/DriveScene.js", "t_62c66a7a5dd70c314661")}`],
      [__dialogueText("scenes/DriveScene.js", "t_c9748265d9c5230dd377"), `${o.hits}`],
      [__dialogueText("scenes/DriveScene.js", "t_a116554a98b3e9831fb5"), `${o.coffees}`],
      [__dialogueText("scenes/DriveScene.js", "t_99208c35ada138cffe46"), `+${fmtMoney(o.coins)}`],
      [__dialogueText("scenes/DriveScene.js", "t_59ea361f6060e0dfa85c"), `-${fmtMoney(o.fines)}`]
    ];

    const rowH = ph * 0.065;
    let y = py0 + ph * 0.22;
    const items = [];

    for (const [label, value] of rows) {
      items.push(
        this.add.text(px0 + pw * 0.07, y, label, {
          fontFamily: 'SpecialElite', fontSize: this.px(24), color: '#2a1d12'
        }).setDepth(402),
        this.add.text(px0 + pw * 0.93, y, value, {
          fontFamily: 'SpecialElite', fontSize: this.px(24), color: '#6b1d12'
        }).setOrigin(1, 0).setDepth(402)
      );

      y += rowH;
    }

    const verdictText = o.autopilot
      ? FLAVOUR.verdicts.autopilot
      : o.hits === 0
        ? FLAVOUR.verdicts.perfect
        : o.hits <= 2
          ? FLAVOUR.verdicts.minor
          : FLAVOUR.verdicts.major;

    const verdict = this.add.text(W / 2, py0 + ph * 0.8, verdictText, {
      fontFamily: 'SpecialElite', fontSize: this.px(22), color: '#3b2d20',
      align: 'center', fontStyle: __dialogueText("scenes/DriveScene.js", "t_db2365bb7a376f09d1dd"), wordWrap: { width: pw * 0.86 }
    }).setOrigin(0.5, 0).setDepth(402);

    const hint = this.add.text(W / 2, py0 + ph * 0.93, __dialogueText("scenes/DriveScene.js", "t_d5a436f27838b6f6b09a"), {
      fontFamily: 'PressStart2P', fontSize: this.px(12), color: '#6b1d12'
    }).setOrigin(0.5).setDepth(402);

    const all = [panel, title, verdict, hint, ...items];
    all.forEach(obj => obj.setAlpha(0));

    this.createTrackedTween({ targets: veil, alpha: 1, duration: 300 });

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
    if (this.state === 'leaving' || !this.outcome) {
      return;
    }

    this.state = 'leaving';

    if (!this.applied) {
      this.applied = true;

      try {
        applyOutcome(this.quote, this.outcome);
      } catch (error) {
        console.error('[DriveScene] applyOutcome failed:', error);
      }
    }

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      async () => {
        if (!this.sys.isActive()) {
          return;
        }

        const d = this.driveData;

        const moved = await this.goto(this.destination, {
          ...(d.nextData || {}),
          fromRoadTrip: true,
          roadTripTownId: this.quote.toId,
          roadTripOutcome: this.outcome
        });
        if (!moved && this.sys.isActive() && !this._cleanupDone) {
          this.state = 'summary';
          this.cameras.main.fadeIn(220, 0, 0, 0);
        }
      }
    );

    this.cameras.main.fadeOut(450, 0, 0, 0);
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
  }
};
