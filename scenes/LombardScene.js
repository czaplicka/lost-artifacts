import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';

import {
  moneyManager,
  ECONOMY_CATEGORY,
} from '../managers/MoneyManager.js';

import * as Art from './lombard/LombardArt.js';

import {
  TEXT,
  BROKER,
} from './lombard/LombardText.js';

const KEY = 'LombardScene';
const ZIGGY_ID = 'pi_honest_ziggy';
const DIALOGUE_DEPTH = 30000;

let instances = 0;

// Istniejąca pamięć lombardu pozostaje sesyjna.
// Zaufanie zapisuje wspólny system dialogów.
const memory = {
  visits: 0,
  watchPawned: false,
  counters: {},
};

export class LombardScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init() {
    this.uid = ++instances;

    this.disposed = false;
    this.leaving = false;
    this.modal = false;
    this.transactionBusy = false;

    this.textureKeys = new Set();
    this.hotspots = [];

    this.statusTimer = null;
    this.introTimer = null;

    this.dialogue = null;
    this.stage = null;
    this.ziggy = null;

    this.pendingPlayerLine = null;

    this.fit = {
      s: 1,
      x: 0,
      y: 0,
    };
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#0d0b10');

    memory.visits += 1;

    this.stage = this.add.container(0, 0);

    this.dialogue = new HomeTownDialogue(
      this,
      () => {
        this.modal = false;
        this.pendingPlayerLine = null;
        this.syncChrome();
      }
    );

    this.buildTextures();
    this.buildWorld();
    this.buildHotspots();
    this.buildInterface();

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layout
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown',
        this.onKey
      );
    }

    this.events.once(
      'shutdown',
      this.disposeShop,
      this
    );

    this.events.once(
      'destroy',
      this.disposeShop,
      this
    );

    this.layout();

    if (memory.visits === 1) {
      this.introTimer = this.time.delayedCall(
        500,
        () => {
          this.introTimer = null;

          if (this.canAct()) {
            this.say(
              "Ziggy has already counted what's in your pockets. Twice."
            );
          }
        }
      );
    }
  }

  bake(name, w, h, draw) {
    const key = `lombard${this.uid}_${name}`;

    if (this.textures.exists(key)) return key;

    const tex = this.textures.createCanvas(key, w, h);

    draw(tex.getContext());

    tex.refresh();
    this.textureKeys.add(key);

    return key;
  }

  buildTextures() {
    this.tex = {
      bg: this.bake(
        'bg',
        Art.ART_W,
        Art.ART_H,
        ctx => Art.paintLombardInterior(ctx)
      ),

      ziggy: this.bake(
        'ziggy',
        Art.ZIGGY_SIZE.w,
        Art.ZIGGY_SIZE.h,
        ctx => Art.paintZiggy(ctx)
      ),

      cage: this.bake(
        'cage',
        Art.CAGE.w,
        Art.CAGE.h,
        ctx => Art.paintCage(ctx)
      ),

      glow: this.bake(
        'glow',
        128,
        128,
        ctx => Art.paintGlow(ctx, 128)
      ),
    };
  }

  buildWorld() {
    const add = object => {
      this.stage.add(object);
      return object;
    };

    add(
      this.add.image(
        0,
        0,
        this.tex.bg
      ).setOrigin(0)
    );

    add(
      this.add.image(
        960,
        330,
        this.tex.glow
      )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xffd28a)
        .setScale(9, 5)
        .setAlpha(0.2)
    );

    add(
      this.add.image(
        465,
        735,
        this.tex.glow
      )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xa8e8ff)
        .setScale(3.2, 1)
        .setAlpha(0.2)
    );

    const balls = add(
      this.add.image(
        960,
        140,
        this.tex.glow
      )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xffc866)
        .setScale(4.5, 3.2)
        .setAlpha(0.22)
    );

    this.createTrackedTween({
      targets: balls,
      alpha: { from: 0.15, to: 0.3 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    add(
      this.add.text(
        1585,
        205,
        TEXT.notice,
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '25px',
          color: '#3a2a14',
          align: 'center',
          lineSpacing: 6,
        }
      ).setOrigin(0.5)
    );

    const neon = add(
      this.add.text(
        540,
        150,
        'OPEN',
        {
          fontFamily: 'PressStart2P, monospace',
          fontSize: '40px',
          color: '#ff5a5a',
          stroke: '#ff2a2a',
          strokeThickness: 2,
        }
      ).setOrigin(0.5)
    );

    neon.setShadow(
      0,
      0,
      '#ff2a2a',
      22,
      true,
      true
    );

    this.createTrackedTween({
      targets: neon,
      alpha: { from: 1, to: 0.78 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      hold: 900,
      repeatDelay: 700,
    });

    const dying = add(
      this.add.rectangle(
        560,
        150,
        40,
        44,
        0x0d0b10,
        1
      ).setAlpha(0)
    );

    this.createTrackedTween({
      targets: dying,
      alpha: { from: 0, to: 0.85 },
      duration: 70,
      yoyo: true,
      repeat: -1,
      hold: 90,
      repeatDelay: 2300,
    });

    try {
      add(
        this.add.particles(
          0,
          0,
          this.tex.glow,
          {
            x: { min: 400, max: 1500 },
            y: { min: 160, max: 760 },
            lifespan: 7000,
            speedY: { min: -8, max: -2 },
            speedX: { min: -5, max: 5 },
            scale: {
              start: 0.03,
              end: 0.018,
            },
            alpha: {
              start: 0,
              end: 0.5,
              ease: 'Sine.easeOut',
            },
            frequency: 300,
            blendMode: 'ADD',
          }
        )
      );
    } catch (error) {
      console.debug(
        '[LombardScene] Dust unavailable:',
        error
      );
    }

    this.ziggy = add(
      this.add.image(
        960,
        780,
        this.tex.ziggy
      ).setOrigin(0.5, 1)
    );

    this.createTrackedTween({
      targets: this.ziggy,
      y: 783,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createTrackedTween({
      targets: this.ziggy,
      angle: { from: -0.7, to: 0.7 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    add(
      this.add.image(
        Art.CAGE.x,
        Art.CAGE.y,
        this.tex.cage
      ).setOrigin(0)
    );
  }

  buildHotspots() {
    const quip = (id, title) =>
      () => this.quip(id, title);

    const defs = [
      {
        id: 'sign',
        label: 'Three golden balls',
        x: 960, y: 140, w: 260, h: 230,
        act: quip('sign', 'THE SIGN'),
      },
      {
        id: 'neon',
        label: 'Neon sign',
        x: 540, y: 150, w: 220, h: 80,
        act: quip('neon', 'NEON'),
      },
      {
        id: 'notice',
        label: 'Notice board',
        x: 1585, y: 205, w: 290, h: 150,
        act: quip('notice', 'NOTICE'),
      },
      {
        id: 'trumpet',
        label: 'Trumpet',
        x: 440, y: 275, w: 170, h: 110,
        act: quip('trumpet', 'TRUMPET'),
      },
      {
        id: 'clock',
        label: 'Clock',
        x: 600, y: 280, w: 110, h: 110,
        act: quip('clocks', 'CLOCKS'),
      },
      {
        id: 'fish',
        label: 'Stuffed fish',
        x: 800, y: 265, w: 150, h: 100,
        act: quip('fish', 'SIR REGINALD'),
      },
      {
        id: 'globe',
        label: 'Globe',
        x: 1030, y: 270, w: 100, h: 110,
        act: quip('globe', 'GLOBE'),
      },
      {
        id: 'helmet',
        label: 'Helmet',
        x: 1220, y: 280, w: 100, h: 100,
        act: quip('helmet', 'HELMET'),
      },
      {
        id: 'camera',
        label: 'Camera',
        x: 1400, y: 285, w: 120, h: 90,
        act: quip('camera', 'CAMERA'),
      },
      {
        id: 'typewriter',
        label: 'Typewriter',
        x: 400, y: 465, w: 140, h: 110,
        act: quip('typewriter', 'TYPEWRITER'),
      },
      {
        id: 'tv',
        label: 'TV',
        x: 585, y: 450, w: 140, h: 130,
        act: quip('tv', 'TV'),
      },
      {
        id: 'boombox',
        label: 'Boombox',
        x: 800, y: 480, w: 150, h: 70,
        act: quip('boombox', 'BOOMBOX'),
      },
      {
        id: 'teddy',
        label: 'Teddy bear',
        x: 1200, y: 455, w: 110, h: 110,
        act: quip('teddy', 'TEDDY'),
      },
      {
        id: 'microwave',
        label: 'Microwave',
        x: 1400, y: 485, w: 140, h: 75,
        act: quip('microwave', 'MICROWAVE'),
      },
      {
        id: 'sax',
        label: 'Saxophone',
        x: 1400, y: 630, w: 100, h: 130,
        act: quip('sax', 'SAXOPHONE'),
      },
      {
        id: 'grandfather',
        label: 'Grandfather clock',
        x: 185, y: 550, w: 160, h: 520,
        act: quip('clocks', 'CLOCKS'),
      },
      {
        id: 'safe',
        label: 'Safe',
        x: 1795, y: 685, w: 190, h: 250,
        act: quip('safe', 'THE SAFE'),
      },
      {
        id: 'case',
        label: 'Glass case',
        x: 465, y: 735, w: 340, h: 110,
        act: quip('case', 'GLASS CASE'),
      },
      {
        id: 'bell',
        label: 'Service bell',
        x: 1420, y: 688, w: 70, h: 44,
        act: () => this.ringBell(),
      },
      {
        id: 'ziggy',
        label: BROKER,
        x: 960, y: 640, w: 270, h: 300,
        act: () => this.talkBroker(),
      },
      {
        id: 'exit',
        label: TEXT.exitLabel,
        x: 960, y: 1045, w: 560, h: 70,
        act: () => void this.leave(),
      },
    ];

    for (const def of defs) {
      this.addHotspot(def);
    }
  }

  addHotspot(def) {
    const zone = this.add.zone(
      def.x,
      def.y,
      def.w,
      def.h
    ).setInteractive({
      useHandCursor: true,
    });

    const box = this.add.rectangle(
      def.x,
      def.y,
      def.w,
      def.h,
      0xffd27d,
      0.08
    )
      .setStrokeStyle(3, 0xffd277, 0.85)
      .setVisible(false);

    const label = this.add.text(
      def.x,
      Math.max(26, def.y - def.h / 2 - 8),
      def.label,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '28px',
        color: '#ffe3a4',
        backgroundColor: '#18201c',
        padding: { x: 10, y: 6 },
      }
    )
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.stage.add([box, zone, label]);

    zone.on('pointerover', () => {
      if (!this.canAct()) return;

      box.setVisible(true);
      label.setVisible(true);
    });

    zone.on('pointerout', () => {
      box.setVisible(false);
      label.setVisible(false);
    });

    zone.on('pointerdown', () => {
      if (!this.canAct()) return;

      box.setVisible(false);
      label.setVisible(false);

      def.act();
    });

    this.hotspots.push({
      def,
      zone,
      box,
      label,
    });
  }

  canAct() {
    return !this.disposed &&
      !this.leaving &&
      !this.modal &&
      !this.transactionBusy;
  }

  buildInterface() {
    const font = {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '16px',
      color: '#ffe19b',
      padding: { x: 16, y: 11 },
    };

    this.titleText = this.add.text(
      20,
      16,
      TEXT.title,
      font
    ).setDepth(20000);

    this.hintText = this.add.text(
      20,
      70,
      TEXT.hint,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '22px',
        color: '#f4e4c0',
        padding: { x: 14, y: 8 },
        wordWrap: { width: 620 },
      }
    ).setDepth(20000);

    this.backText = this.add.text(
      0,
      16,
      TEXT.back,
      font
    )
      .setOrigin(1, 0)
      .setDepth(20000)
      .setInteractive({
        useHandCursor: true,
      });

    this.backText.on('pointerdown', () => {
      if (this.canAct()) {
        void this.leave();
      }
    });

    this.panel = this.add.graphics()
      .setDepth(19990);
  }

  paintPanels() {
    const g = this.panel;

    if (!g?.active) return;

    g.clear();

    for (const text of [
      this.titleText,
      this.hintText,
      this.backText,
    ]) {
      const x =
        text.x - text.width * text.originX;

      const y =
        text.y - text.height * text.originY;

      g.fillStyle(0x000000, 0.3)
        .fillRoundedRect(
          x + 3,
          y + 4,
          text.width,
          text.height,
          8
        );

      g.fillStyle(0x262b26, 0.92)
        .fillRoundedRect(
          x,
          y,
          text.width,
          text.height,
          8
        );

      g.lineStyle(2, 0xb89a58, 1)
        .strokeRoundedRect(
          x,
          y,
          text.width,
          text.height,
          8
        );
    }
  }

  syncChrome() {
    const visible = !this.modal;

    this.titleText?.setVisible(visible);
    this.hintText?.setVisible(visible);
    this.backText?.setVisible(visible);
    this.panel?.setVisible(visible);
  }

  raiseDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
  }

  layout() {
    if (this.disposed || !this.stage) return;

    const {
      width: w,
      height: h,
    } = this.scale;

    const s = Math.min(
      w / Art.ART_W,
      h / Art.ART_H
    );

    this.fit = {
      s,
      x: (w - Art.ART_W * s) / 2,
      y: (h - Art.ART_H * s) / 2,
    };

    this.stage
      .setPosition(
        this.fit.x,
        this.fit.y
      )
      .setScale(s);

    this.backText.setX(w - 20);

    this.hintText.setWordWrapWidth(
      Math.max(
        200,
        Math.min(620, w - 40)
      )
    );

    this.paintPanels();
    this.raiseDialogue();
    this.syncChrome();
  }

  say(text) {
    if (
      this.disposed ||
      !this.hintText?.active
    ) {
      return;
    }

    this.statusTimer?.remove(false);

    this.hintText.setText(text);
    this.paintPanels();

    this.statusTimer = this.time.delayedCall(
      6000,
      () => {
        if (
          !this.disposed &&
          this.hintText?.active
        ) {
          this.hintText.setText(TEXT.hint);
          this.paintPanels();
        }

        this.statusTimer = null;
      }
    );
  }

  show(title, text, choices = [], options = {}) {
    if (this.disposed || this.leaving) return;

    const settings =
      options && typeof options === 'object'
        ? options
        : {};

    const npcId = settings.npcId || null;
    const playerLine = this.pendingPlayerLine;

    this.pendingPlayerLine = null;
    this.modal = true;

    for (const hotspot of this.hotspots) {
      hotspot.box.setVisible(false);
      hotspot.label.setVisible(false);
    }

    const messages = [];

    if (
      npcId &&
      playerLine?.npcId === npcId
    ) {
      messages.push({
        speaker: 'player',
        text: playerLine.text,
      });
    }

    messages.push({
      speaker: npcId ? 'npc' : 'note',
      text: String(text ?? ''),
    });

    this.dialogue.show({
      title,
      text,
      choices,
      messages,
      npcId,
      nodeId: settings.nodeId || title,
      showTrust: Boolean(npcId),
    });

    this.raiseDialogue();
    this.syncChrome();
  }

  brokerLine(nodeId, text, choices = []) {
    this.show(
      BROKER,
      text,
      choices,
      {
        npcId: ZIGGY_ID,
        nodeId,
      }
    );
  }

  brokerReply(
    id,
    label,
    attitude,
    action
  ) {
    return {
      id,
      label,
      attitude,

      action: () => {
        this.pendingPlayerLine = {
          npcId: ZIGGY_ID,
          text: label,
        };

        try {
          return action();
        } finally {
          this.pendingPlayerLine = null;
        }
      },
    };
  }

  brokerBack(
    id,
    label = 'Back',
    destination = () => this.talkBroker(true)
  ) {
    return this.brokerReply(
      id,
      label,
      'neutral',
      destination
    );
  }

  closePanel() {
    this.dialogue?.close(false);

    this.modal = false;
    this.pendingPlayerLine = null;

    this.syncChrome();
  }

  next(id) {
    const n = memory.counters[id] ?? 0;

    memory.counters[id] = n + 1;

    return n;
  }

  quip(id, title) {
    const list = TEXT.quips[id];

    this.show(
      title,
      list[this.next(id) % list.length]
    );
  }

  balanceNote() {
    try {
      return `\n\n(Cash: $${moneyManager.getBalance()})`;
    } catch {
      return '';
    }
  }

  ringBell() {
    this.createTrackedTween({
      targets: this.ziggy,
      y: this.ziggy.y - 16,
      duration: 90,
      yoyo: true,
    });

    this.cameras.main.shake(120, 0.002);
    this.quip('bell', 'SERVICE BELL');
  }

  talkBroker(menu = false) {
    const C = TEXT.choices;

    this.brokerLine(
      menu ? 'ziggy_menu' : 'ziggy_greeting',
      menu ? TEXT.menu : TEXT.greeting,
      [
        this.brokerReply(
          'ziggy_ask_pawn',
          C.pawn,
          'neutral',
          () => this.pawnMenu()
        ),

        this.brokerReply(
          'ziggy_ask_stock',
          C.buy,
          'neutral',
          () => {
            this.brokerLine(
              'ziggy_stock',
              TEXT.buy,
              [
                this.brokerBack(
                  'ziggy_stock_acknowledge',
                  'I see.'
                ),

                this.brokerReply(
                  'ziggy_stock_insult',
                  'So, overpriced junk.',
                  'rude',
                  () => {
                    this.brokerLine(
                      'ziggy_stock_insult_reply',
                      'Curated overpriced junk. Ziggy has standards.',
                      [
                        this.brokerBack(
                          'ziggy_stock_insult_back',
                          'Another question.'
                        ),
                      ]
                    );
                  }
                ),
              ]
            );
          }
        ),

        this.brokerReply(
          'ziggy_ask_stolen',
          C.stolen,
          'neutral',
          () => {
            this.brokerLine(
              'ziggy_stolen_advice',
              TEXT.stolen,
              [
                this.brokerBack(
                  'ziggy_advice_acknowledge',
                  'Noted. Written down.'
                ),

                this.brokerReply(
                  'ziggy_advice_thanks',
                  'Thanks, Ziggy. That is useful.',
                  'nice',
                  () => {
                    this.brokerLine(
                      'ziggy_advice_thanks_reply',
                      "Useful is extra. Relax, gumshoe. This one's on the house.",
                      [
                        this.brokerBack(
                          'ziggy_advice_thanks_back',
                          'Anything else?'
                        ),
                      ]
                    );
                  }
                ),
              ]
            );
          }
        ),

        this.brokerReply(
          'ziggy_goodbye',
          C.bye,
          'neutral',
          () => {
            this.brokerLine(
              'ziggy_farewell',
              TEXT.bye
            );
          }
        ),
      ]
    );
  }

  pawnMenu() {
    const P = TEXT.pawnChoices;
    const choices = [];

    if (!memory.watchPawned) {
      choices.push(
        this.brokerReply(
          'ziggy_offer_watch',
          P.watch,
          'neutral',
          () => {
            this.brokerLine(
              'ziggy_watch_offer',
              TEXT.watchOffer,
              [
                this.brokerReply(
                  'ziggy_accept_watch_offer',
                  TEXT.watchDeal,
                  'neutral',
                  () => this.pawnWatch()
                ),

                this.brokerReply(
                  'ziggy_decline_watch_offer',
                  TEXT.watchNoDeal,
                  'neutral',
                  () => {
                    this.brokerLine(
                      'ziggy_watch_declined',
                      TEXT.watchNoDealReply,
                      [
                        this.brokerBack(
                          'ziggy_watch_declined_back',
                          'Back',
                          () => this.pawnMenu()
                        ),
                      ]
                    );
                  }
                ),
              ]
            );
          }
        )
      );
    } else {
      choices.push(
        this.brokerReply(
          'ziggy_redeem_watch',
          P.redeem,
          'neutral',
          () => this.redeemWatch()
        )
      );
    }

    choices.push(
      this.brokerReply(
        'ziggy_offer_pigeon',
        P.pigeon,
        'neutral',
        () => {
          this.brokerLine(
            'ziggy_pigeon',
            TEXT.pigeon,
            [
              this.brokerBack(
                'ziggy_pigeon_back',
                'Back',
                () => this.pawnMenu()
              ),
            ]
          );
        }
      )
    );

    choices.push(
      this.brokerReply(
        'ziggy_offer_dignity',
        P.dignity,
        'neutral',
        () => {
          this.brokerLine(
            'ziggy_dignity',
            TEXT.dignity,
            [
              this.brokerBack(
                'ziggy_dignity_back',
                'Back',
                () => this.pawnMenu()
              ),
            ]
          );
        }
      )
    );

    choices.push(
      this.brokerBack(
        'ziggy_pawn_menu_back',
        P.back
      )
    );

    this.brokerLine(
      'ziggy_pawn_menu',
      TEXT.pawnMenu,
      choices
    );
  }

  pawnWatch() {
    if (
      this.disposed ||
      this.leaving ||
      this.transactionBusy
    ) {
      return;
    }

    if (memory.watchPawned) {
      this.pawnMenu();
      return;
    }

    this.transactionBusy = true;

    try {
      moneyManager.refund(
        15,
        {
          category: ECONOMY_CATEGORY.ITEM,
          description: "Pocket watch pawned at Ziggy's",
        }
      );

      memory.watchPawned = true;
    } catch (error) {
      console.warn(
        '[LombardScene] Pawn payout failed:',
        error
      );

      this.brokerLine(
        'ziggy_watch_pawn_failed',
        TEXT.noWatch,
        [
          this.brokerBack(
            'ziggy_watch_pawn_failed_back',
            'Back',
            () => this.pawnMenu()
          ),
        ]
      );

      return;
    } finally {
      this.transactionBusy = false;
    }

    this.brokerLine(
      'ziggy_watch_pawned',
      TEXT.watchPawned + this.balanceNote(),
      [
        this.brokerBack(
          'ziggy_watch_pawned_back',
          'Anything else?'
        ),
      ]
    );
  }

  redeemWatch() {
    if (
      this.disposed ||
      this.leaving ||
      this.transactionBusy
    ) {
      return;
    }

    if (!memory.watchPawned) {
      this.pawnMenu();
      return;
    }

    this.transactionBusy = true;

    let paid = false;

    try {
      paid = moneyManager.spend(
        20,
        {
          category: ECONOMY_CATEGORY.ITEM,
          description: "Pocket watch redeemed at Ziggy's",
        }
      )?.ok === true;

      if (paid) {
        memory.watchPawned = false;
      }
    } catch (error) {
      console.warn(
        '[LombardScene] Redeem failed:',
        error
      );
    } finally {
      this.transactionBusy = false;
    }

    if (paid) {
      this.brokerLine(
        'ziggy_watch_redeemed',
        TEXT.redeemOk + this.balanceNote(),
        [
          this.brokerBack(
            'ziggy_watch_redeemed_back',
            'Anything else?'
          ),
        ]
      );
    } else {
      this.brokerLine(
        'ziggy_watch_redeem_broke',
        TEXT.redeemBroke + this.balanceNote(),
        [
          this.brokerBack(
            'ziggy_watch_redeem_broke_back',
            'Back',
            () => this.pawnMenu()
          ),
        ]
      );
    }
  }

  onKey(event) {
    if (
      this.disposed ||
      this.leaving ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        event.target?.tagName
      )
    ) {
      return;
    }

    if (event.code !== 'Escape') return;

    // Otwarty panel sam obsługuje Escape.
    if (this.modal) return;

    event.preventDefault();

    void this.leave();
  }

  async leave() {
    if (
      this.leaving ||
      this.disposed ||
      this.transactionBusy
    ) {
      return;
    }

    this.leaving = true;
    this.closePanel();

    const uid = this.uid;

    try {
      const moved = await this.goto(
        'HomeCityScene',
        {
          entryPoint: 'pawn-shop',
          fromScene: KEY,
        }
      );

      if (
        moved === false &&
        !this.disposed &&
        this.uid === uid
      ) {
        this.leaving = false;

        this.say(
          'The door is stuck. Ziggy says it is a "security feature".'
        );
      }
    } catch (error) {
      console.error(
        '[LombardScene] Exit failed:',
        error
      );

      if (
        !this.disposed &&
        this.uid === uid
      ) {
        this.leaving = false;

        this.say(
          'The door is stuck. Ziggy says it is a "security feature".'
        );
      }
    }
  }

  disposeShop() {
    if (this.disposed) return;

    this.disposed = true;

    this.statusTimer?.remove(false);
    this.statusTimer = null;

    this.introTimer?.remove(false);
    this.introTimer = null;

    this.dialogue?.destroy();
    this.dialogue = null;

    this.pendingPlayerLine = null;

    const textures = this.textures;
    const keys = [...this.textureKeys];

    setTimeout(() => {
      try {
        for (const key of keys) {
          if (textures.exists(key)) {
            textures.remove(key);
          }
        }
      } catch {
        // Gra mogła zostać zamknięta.
      }
    }, 80);

    this.textureKeys.clear();
    this.hotspots = [];

    this.events.off(
      'shutdown',
      this.disposeShop,
      this
    );

    this.events.off(
      'destroy',
      this.disposeShop,
      this
    );
  }
}