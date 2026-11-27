import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';

import {
  moneyManager,
  ECONOMY_CATEGORY,
} from '../managers/MoneyManager.js';

import * as Art from './church/ChurchArt.js';
import { TEXT, PRIEST } from './church/ChurchText.js';
import { preloadExitButton, addExitImageButton } from '../ui/ExitImageButton.js';

const KEY = 'ChurchScene';
const W = 1920;
const H = 1080;

const DIALOGUE_DEPTH = 30000;

const NPC = Object.freeze({
  PRIEST: 'pi_father_crumb',
  AGNES: 'pi_agnes_ledger',
});

const FILES = [
  'rug',
  'glass',
  'left-glass',
  'right_glass',
  'organs',
  'pipes',
  'ambo',
  'altar',
  'hymn-board',
  'lamps',
  'pews',
  'donation-box',
  'candles',
  'peagon',
  'priest',
  'office',
  'office-empty',
  'auction',
  'auction-people',
];

const imageKey = name => `church-image:${name}`;
const ABSENCE_MS = 60_000;

let instances = 0;
let awayUntil = 0;
let nextBreakAt = 0;
let hallVisits = 0;

const memory = {
  visits: 0,
  donated: 0,
  candles: 0,
  counters: {},
};

export class ChurchScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init() {
    this.uid = ++instances;
    this.disposed = false;
    this.leaving = false;
    this.modal = false;

    this.textureKeys = new Set();
    this.hotspots = [];
    this.flames = [];

    this.statusTimer = null;
    this.introTimer = null;

    this.dialogue = null;
    this.stage = null;
    this.layers = {};

    this.organistPresent = true;
    this.room = 'nave';
    this.roomLayer = null;
    this.officeAway = false;

    this.nav = null;
    this.roomButtons = null;

    this.pendingPlayerLine = null;
  }

  preload() {
    if (super.preload) super.preload();
    preloadExitButton(this);

    for (const name of FILES) {
      if (!this.textures.exists(imageKey(name))) {
        this.load.image(
          imageKey(name),
          `assets/pi/church/${name}.webp`
        );
      }
    }
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#0d0b10');

    this.stage = this.add.container(0, 0);

    this.dialogue = new HomeTownDialogue(
      this,
      () => {
        this.modal = false;
        this.pendingPlayerLine = null;
        this.syncChrome();
      }
    );

    this.events.once(
      'shutdown',
      this.disposeChurch,
      this
    );

    this.events.once(
      'destroy',
      this.disposeChurch,
      this
    );

    this.buildTextures();
    this.buildWorld();
    this.buildHotspots();
    this.buildInterface();

    this.roomLayer = this.add.container(0, 0)
      .setDepth(19000)
      .setVisible(false);

    this.nav = this.add.container(0, 0)
      .setDepth(20001);

    this.roomButtons = [
      this.button(
        this.nav,
        'Parish Office',
        () => this.openRoom('office')
      ),

      this.button(
        this.nav,
        'Auction Hall',
        () => this.openRoom('auction')
      ),
    ];

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

    this.layout();

    memory.visits += 1;

    const missing = FILES.filter(name =>
      !this.textures.exists(imageKey(name))
    );

    if (missing.length) {
      console.error(
        '[ChurchScene] Missing images:',
        missing
      );

      this.say(
        `Missing church images: ${missing.join(', ')}`
      );
    } else if (memory.visits === 1) {
      this.introTimer = this.time.delayedCall(
        500,
        () => {
          this.introTimer = null;

          if (this.canAct() && this.room === 'nave') {
            this.say(
              'The pigeon in the rafters has noticed you. Act natural.'
            );
          }
        }
      );
    }
  }

  bake(name, w, h, draw) {
    const key = `church${this.uid}_${name}`;
    const tex = this.textures.createCanvas(key, w, h);

    draw(tex.getContext());

    tex.refresh();
    this.textureKeys.add(key);

    return key;
  }

  buildTextures() {
    this.tex = {
      glow: this.bake(
        'glow',
        128,
        128,
        ctx => Art.paintGlow(ctx, 128)
      ),

      flame: this.bake(
        'flame',
        Art.FLAME_SIZE.w,
        Art.FLAME_SIZE.h,
        ctx => Art.paintFlame(
          ctx,
          Art.FLAME_SIZE.w,
          Art.FLAME_SIZE.h
        )
      ),
    };
  }

  addLayer(name) {
    if (!this.textures.exists(imageKey(name))) {
      return null;
    }

    const image = this.add.image(
      0,
      0,
      imageKey(name)
    ).setOrigin(0).setDisplaySize(W, H);

    this.stage.add(image);
    this.layers[name] = image;

    return image;
  }

  buildWorld() {
    this.stage.add(
      this.add.rectangle(
        0,
        0,
        W,
        H,
        0x18141b
      ).setOrigin(0)
    );

    for (const name of [
      'rug',
      'glass',
      'left-glass',
      'right_glass',
      'pipes',
      'organs',
      'ambo',
      'altar',
      'hymn-board',
      'lamps',
      'pews',
      'donation-box',
      'candles',
      'peagon',
      'priest',
    ]) {
      this.addLayer(name);
    }

    this.setOrganistPresent(true);

    this.rope = this.add.container(1700, 0);
    this.stage.add(this.rope);

    const g = this.add.graphics();
    this.rope.add(g);

    g.lineStyle(7, 0xb89a68, 1)
      .lineBetween(0, 0, 0, 340);

    for (let i = 0; i < 6; i++) {
      g.fillStyle(
        i % 2 ? 0xb8302a : 0xf1ead2,
        1
      ).fillRoundedRect(
        -11,
        330 + i * 12,
        22,
        12,
        4
      );
    }

    g.fillStyle(0xb89a68, 1)
      .fillRect(-5, 402, 10, 14);

    for (let i = 0; i < memory.candles; i++) {
      this.addFlame(i, false);
    }
  }

  setOrganistPresent(present) {
    this.organistPresent = Boolean(present);

    this.layers.organs?.setVisible(
      this.organistPresent
    );

    this.layers.pipes?.setVisible(
      !this.organistPresent
    );
  }

  addFlame(index, announce = true) {
    const spot = Art.CANDLE_SPOTS[index];

    if (!spot) return false;

    const y = spot.y - 30;

    const glow = this.add.image(
      spot.x,
      y - 18,
      this.tex.glow
    )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb050)
      .setScale(0.9)
      .setAlpha(0.5);

    const flame = this.add.image(
      spot.x,
      y,
      this.tex.flame
    )
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.stage.add([glow, flame]);
    this.flames.push(flame, glow);

    this.createTrackedTween({
      targets: flame,
      scaleY: { from: 0.85, to: 1.15 },
      scaleX: { from: 1.05, to: 0.9 },
      duration: 140 + Math.random() * 160,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 200,
    });

    this.createTrackedTween({
      targets: glow,
      alpha: { from: 0.35, to: 0.6 },
      duration: 300 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
    });

    if (announce) {
      this.createTrackedTween({
        targets: flame,
        alpha: { from: 0, to: 1 },
        duration: 400,
      });
    }

    return true;
  }

  buildHotspots() {
    const defs = [
      [
        'pews-l', 'Pews', 600, 890, 330, 210,
        () => this.quip('pews', 'PEWS'),
      ],
      [
        'pews-r', 'Pews', 1280, 930, 300, 170,
        () => this.quip('pews', 'PEWS'),
      ],
      [
        'window', 'Stained glass', 960, 240, 240, 330,
        () => this.quip('window', 'ST. JOHN'),
      ],
      [
        'altar', 'Altar', 960, 610, 190, 80,
        () => this.quip('altar', 'ALTAR'),
      ],
      [
        'hymns', 'Hymn board', 1148, 392, 110, 140,
        () => this.quip('hymns', 'HYMN BOARD'),
      ],
      [
        'organ', 'Organ', 545, 500, 330, 700,
        () => this.quip('organ', 'ORGAN'),
      ],
      [
        'confessional', 'Confessional', 1372, 510, 320, 690,
        () => this.confessional(),
      ],
      [
        'donations', 'Donation box', 300, 790, 230, 430,
        () => this.donationBox(),
      ],
      [
        'candles', 'Votive candles', 1625, 905, 290, 270,
        () => this.candleStand(),
      ],
      [
        'rope', 'Bell rope', 1700, 330, 80, 200,
        () => this.pullRope(),
      ],
      [
        'pigeon', 'Pigeon', 1290, 180, 120, 110,
        () => this.pigeonQuip(),
      ],
      [
        'priest', 'Father Crumb', 960, 535, 150, 250,
        () => this.talkPriest(),
      ],
      [
        'exit', TEXT.exitLabel, 960, 1035, 560, 90,
        () => void this.leave(),
      ],
    ];

    for (const [
      id,
      label,
      x,
      y,
      w,
      h,
      act,
    ] of defs) {
      this.addHotspot({
        id, label, x, y, w, h, act,
      });
    }
  }

  addHotspot(def) {
    const { x, y, w, h } = def;

    const box = this.add.rectangle(
      x, y, w, h, 0xffd27d, 0.08
    )
      .setStrokeStyle(3, 0xffd277, 0.85)
      .setVisible(false);

    const zone = this.add.zone(
      x, y, w, h
    ).setInteractive({
      useHandCursor: true,
    });

    const label = this.add.text(
      x,
      Math.max(26, y - h / 2 - 8),
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
      def, zone, box, label,
    });
  }

  canAct() {
    return !this.disposed &&
      !this.leaving &&
      !this.modal;
  }

  buildInterface() {
    const font = {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '16px',
      color: '#ffe19b',
      padding: { x: 16, y: 11 },
    };

    this.titleText = this.add.text(
      20, 16, TEXT.title, font
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
      0, 16, TEXT.back, font
    )
      .setOrigin(1, 0)
      .setDepth(20000)
      .setInteractive({
        useHandCursor: true,
      });

    this.backText.on('pointerdown', () => {
      if (this.canAct()) void this.leave();
    });

    // Leaving the church uses the shared exit plank; backText stays for
    // "BACK TO CHURCH" inside the side rooms.
    this.exitButton = addExitImageButton(this, {
      x: 0, y: 12, width: 170, originX: 1, depth: 20000,
      onClick: () => { if (this.canAct()) void this.leave(); },
    });

    this.panel = this.add.graphics()
      .setDepth(19990);
  }

  button(parent, label, action) {
    const text = this.add.text(
      0,
      0,
      label,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '18px',
        color: '#ffe3a4',
        backgroundColor: '#262b26',
        padding: { x: 10, y: 7 },
      }
    ).setInteractive({
      useHandCursor: true,
    });

    text.on('pointerover', () => {
      text.setStyle({
        backgroundColor: '#514530',
      });
    });

    text.on('pointerout', () => {
      text.setStyle({
        backgroundColor: '#262b26',
      });
    });

    text.on('pointerdown', () => {
      if (this.canAct()) action();
    });

    parent.add(text);

    return text;
  }

  paintPanels() {
    const g = this.panel;

    if (!g?.active) return;

    g.clear();

    for (const t of [
      this.titleText,
      this.hintText,
      this.room !== 'nave' ? this.backText : null,
    ].filter(Boolean)) {
      const x = t.x - t.width * t.originX;
      const y = t.y - t.height * t.originY;

      g.fillStyle(0x000000, 0.3)
        .fillRoundedRect(
          x + 3, y + 4, t.width, t.height, 8
        );

      g.fillStyle(0x262b26, 0.92)
        .fillRoundedRect(
          x, y, t.width, t.height, 8
        );

      g.lineStyle(2, 0xb89a58, 1)
        .strokeRoundedRect(
          x, y, t.width, t.height, 8
        );
    }
  }

  syncChrome() {
    const visible = !this.modal;

    this.titleText?.setVisible(visible);
    this.hintText?.setVisible(visible);
    this.backText?.setVisible(visible && this.room !== 'nave');
    this.exitButton?.setVisible(visible && this.room === 'nave');
    this.panel?.setVisible(visible);

    this.nav?.setVisible(
      visible && this.room === 'nave'
    );
  }

  layout() {
    if (this.disposed || !this.stage) return;

    const { width: w, height: h } = this.scale;
    const s = Math.min(w / W, h / H);

    this.stage
      .setPosition(
        (w - W * s) / 2,
        (h - H * s) / 2
      )
      .setScale(s);

    this.backText.setX(w - 20);
    this.exitButton?.setX(w - 20);

    this.hintText.setWordWrapWidth(
      Math.max(200, Math.min(620, w - 40))
    );

    this.paintPanels();

    if (this.roomLayer?.active) {
      this.roomLayer
        .setPosition(
          this.stage.x,
          this.stage.y
        )
        .setScale(this.stage.scaleX);
    }

    if (this.nav?.active) {
      this.nav.setPosition(
        12,
        Math.max(0, h - 44)
      );

      this.roomButtons[1].setX(
        this.roomButtons[0].width + 8
      );
    }

    this.raiseDialogue();
    this.syncChrome();
  }

  raiseDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
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
          this.hintText.setText(
            this.room === 'nave'
              ? TEXT.hint
              : 'Select an object to inspect it.'
          );

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
    const previousLine = this.pendingPlayerLine;

    this.pendingPlayerLine = null;
    this.modal = true;

    for (const hotspot of this.hotspots) {
      hotspot.box.setVisible(false);
      hotspot.label.setVisible(false);
    }

    const messages = [];

    if (
      npcId &&
      previousLine?.npcId === npcId
    ) {
      messages.push({
        speaker: 'player',
        text: previousLine.text,
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

  speak(npcId, title, nodeId, text, choices = []) {
    this.show(title, text, choices, {
      npcId,
      nodeId,
    });
  }

  reply(npcId, id, label, attitude, action) {
    return {
      id,
      label,
      attitude,

      action: () => {
        this.pendingPlayerLine = {
          npcId,
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

  pigeonQuip() {
    this.quip('pigeon', 'PIGEON');

    const feather = this.add.ellipse(
      1290, 192, 8, 22, 0xe8e8e8
    ).setAngle(30);

    this.stage.add(feather);

    this.createTrackedTween({
      targets: feather,
      y: 492,
      x: 1220,
      angle: 220,
      alpha: 0,
      duration: 2400,
      ease: 'Sine.easeInOut',
      onComplete: () => feather.destroy(),
    });
  }

  pullRope() {
    this.cameras.main.shake(260, 0.004);

    this.createTrackedTween({
      targets: this.rope,
      angle: { from: 0, to: 4 },
      duration: 160,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => this.rope?.setAngle(0),
    });

    this.quip('bell', 'BELL ROPE');
  }

  priestReply(id, label, attitude, action) {
    return this.reply(
      NPC.PRIEST,
      id,
      label,
      attitude,
      action
    );
  }

  priestLine(nodeId, text, choices = []) {
    this.speak(
      NPC.PRIEST,
      PRIEST,
      nodeId,
      text,
      choices
    );
  }

  priestReturn(id, label, attitude = 'neutral') {
    return this.priestReply(
      id,
      label,
      attitude,
      () => this.talkPriest(true)
    );
  }

  talkPriest(menu = false) {
    const C = TEXT.priestChoices;

    this.priestLine(
      menu ? 'priest_menu' : 'priest_greeting',
      menu
        ? TEXT.priestMenu
        : TEXT.priestGreeting,
      [
        this.priestReply(
          'priest_ask_about_church',
          C.about,
          'neutral',
          () => {
            this.priestLine(
              'priest_about',
              TEXT.about,
              [
                this.priestReply(
                  'priest_ask_incident',
                  TEXT.aboutChoices.incident,
                  'neutral',
                  () => {
                    this.priestLine(
                      'priest_incident',
                      TEXT.incident,
                      [
                        this.priestReturn(
                          'priest_dismiss_incident',
                          'Wow. Anyway.',
                          'rude'
                        ),
                      ]
                    );
                  }
                ),

                this.priestReturn(
                  'priest_about_interesting',
                  'Interesting.'
                ),
              ]
            );
          }
        ),

        this.priestReply(
          'priest_ask_gossip',
          C.gossip,
          'neutral',
          () => {
            this.priestLine(
              'priest_gossip',
              TEXT.gossip,
              [
                this.priestReturn(
                  'priest_dismiss_gossip',
                  'Noted. Not noted.',
                  'rude'
                ),
              ]
            );
          }
        ),

        this.priestReply(
          'priest_ask_blessing',
          C.bless,
          'nice',
          () => {
            this.priestLine(
              'priest_blessing',
              TEXT.bless,
              [
                this.priestReturn(
                  'priest_thank_blessing',
                  'Thank you, Father.',
                  'nice'
                ),
              ]
            );
          }
        ),

        this.priestReply(
          'priest_ask_advice',
          C.advice,
          'neutral',
          () => {
            this.priestLine(
              'priest_advice',
              TEXT.advice,
              [
                this.priestReturn(
                  'priest_acknowledge_advice',
                  'Check Tuesday. Got it.'
                ),
              ]
            );
          }
        ),

        this.priestReply(
          'priest_goodbye',
          C.bye,
          'neutral',
          () => {
            this.priestLine(
              'priest_farewell',
              TEXT.priestBye
            );
          }
        ),
      ]
    );
  }

  confessional() {
    const C = TEXT.confessional;

    this.show(
      'CONFESSIONAL',
      C.intro,
      [
        [
          C.confess,
          () => {
            const text = C.confessions[
              this.next('confess') %
              C.confessions.length
            ];

            this.show(
              'CONFESSIONAL',
              text,
              [
                [
                  C.confess,
                  () => this.confessional(),
                ],
                [
                  C.leave,
                  () => this.closePanel(),
                ],
              ]
            );
          },
        ],

        [
          C.eavesdrop,
          () => {
            this.show(
              'CONFESSIONAL',
              C.eavesdropText,
              [
                [
                  C.leave,
                  () => this.closePanel(),
                ],
              ]
            );
          },
        ],

        [
          C.leave,
          () => this.closePanel(),
        ],
      ]
    );
  }

  tryPay(amount, description) {
    try {
      return moneyManager.spend(
        amount,
        {
          category: ECONOMY_CATEGORY.ITEM,
          description,
        }
      )?.ok === true;
    } catch (error) {
      console.warn(
        '[ChurchScene] Payment failed:',
        error
      );

      return false;
    }
  }

  balanceNote() {
    try {
      return `\n\n(Cash: $${moneyManager.getBalance()})`;
    } catch {
      return '';
    }
  }

  donationBox() {
    const D = TEXT.donation;

    const choices = D.amounts.map(amount => [
      `Donate $${amount}`,

      () => {
        if (
          this.tryPay(
            amount,
            'Donation to St. John Church'
          )
        ) {
          memory.donated += amount;

          const text = D.thanks[
            this.next('donate') %
            D.thanks.length
          ];

          this.show(
            'DONATION BOX',
            text + this.balanceNote(),
            [
              [
                'Donate again',
                () => this.donationBox(),
              ],
              [
                D.leave,
                () => this.closePanel(),
              ],
            ]
          );
        } else {
          this.show(
            'DONATION BOX',
            D.broke + this.balanceNote(),
            [
              [
                D.leave,
                () => this.closePanel(),
              ],
            ]
          );
        }
      },
    ]);

    choices.push([
      D.leave,
      () => this.closePanel(),
    ]);

    this.show(
      'DONATION BOX',
      D.intro + (
        memory.donated
          ? `\n\nYou have donated $${memory.donated} so far. The box remembers.`
          : ''
      ),
      choices
    );
  }

  candleStand() {
    const C = TEXT.candles;

    this.show(
      'CANDLES',
      C.intro,
      [
        [
          C.light,
          () => {
            if (
              memory.candles >=
              Art.CANDLE_SPOTS.length
            ) {
              this.show(
                'CANDLES',
                C.full,
                [
                  [
                    C.leave,
                    () => this.closePanel(),
                  ],
                ]
              );

              return;
            }

            if (
              !this.tryPay(
                2,
                'Votive candle at St. John Church'
              )
            ) {
              this.show(
                'CANDLES',
                C.broke + this.balanceNote(),
                [
                  [
                    C.leave,
                    () => this.closePanel(),
                  ],
                ]
              );

              return;
            }

            this.addFlame(memory.candles);
            memory.candles += 1;

            const text = C.lit[
              this.next('candle') %
              C.lit.length
            ];

            this.show(
              'CANDLES',
              text + this.balanceNote(),
              [
                [
                  C.light,
                  () => this.candleStand(),
                ],
                [
                  C.leave,
                  () => this.closePanel(),
                ],
              ]
            );
          },
        ],

        [
          C.leave,
          () => this.closePanel(),
        ],
      ]
    );
  }

  openRoom(room) {
    if (
      !this.canAct() ||
      !['office', 'auction'].includes(room)
    ) {
      return;
    }

    const now = Date.now();
    let art;

    if (room === 'office') {
      if (nextBreakAt === 0) {
        nextBreakAt = Math.max(1, now);
      } else if (
        now >= nextBreakAt &&
        now >= awayUntil
      ) {
        awayUntil = now + ABSENCE_MS;
        nextBreakAt = awayUntil + 180_000;
      }

      this.officeAway = now < awayUntil;

      art = this.officeAway
        ? 'office-empty'
        : 'office';
    } else {
      hallVisits += 1;

      art = hallVisits % 2
        ? 'auction-people'
        : 'auction';
    }

    if (!this.textures.exists(imageKey(art))) {
      this.show(
        'DOOR',
        `Missing image: ${art}.webp`
      );

      return;
    }

    this.statusTimer?.remove(false);
    this.statusTimer = null;

    this.introTimer?.remove(false);
    this.introTimer = null;

    this.room = room;
    this.stage.setVisible(false);

    for (const {
      zone,
      box,
      label,
    } of this.hotspots) {
      zone.disableInteractive();
      box.setVisible(false);
      label.setVisible(false);
    }

    this.roomLayer.removeAll(true);
    this.roomLayer.setVisible(true);

    this.roomLayer.add(
      this.add.image(
        0,
        0,
        imageKey(art)
      ).setOrigin(0).setDisplaySize(W, H)
    );

    this.titleText.setText(
      room === 'office'
        ? 'PARISH OFFICE'
        : 'AUCTION HALL'
    );

    this.backText.setText('BACK TO CHURCH');

    this.hintText.setText(
      'Select an object to inspect it.'
    );

    this.paintPanels();
    this.buildRoomHotspots(art);
    this.syncChrome();
  }

  buildRoomHotspots(art) {
    const items = art.startsWith('office')
      ? [
          art === 'office'
            ? [
                'Agnes Ledger',
                () => this.talkAgnes(),
              ]
            : [
                'Desk note',
                'Stepped out. Back shortly. If it’s a miracle, please take a number.',
              ],

          [
            'Appointment book',
            'Three wedding bookings. Somebody underlined the word separate. Twice.',
          ],
          [
            'Wedding photographs',
            'Same wedding photographer, same backdrop. Is that the same groom?',
          ],
          [
            'Telephone',
            'The speed dial has two entries: Father Crumb and Not Father Crumb.',
          ],
          [
            'Parish records',
            'The cabinet is locked. Agnes can tell me which records are public.',
          ],
        ]
      : [
          [
            'Catalog',
            'Lot 7: film camera, unused. The word unused is doing a lot of work.',
          ],
          [
            'Film camera',
            'There’s still a roll inside. So much for unused.',
          ],
          [
            'Postcards',
            'Three postcards from people who describe their holidays exclusively in complaints.',
          ],
          [
            'Framed portrait',
            'His eyes follow you. Probably to make sure you don’t bid.',
          ],
          ...(
            art === 'auction-people'
              ? [
                  [
                    'Bidder',
                    'I’m only looking. If anybody asks, my hand went up on its own.',
                  ],
                ]
              : []
          ),
        ];

    for (
      let row = 0;
      row < Math.ceil(items.length / 3);
      row++
    ) {
      this.roomLayer.add(
        this.add.rectangle(
          960,
          928 + 58 * row,
          1420,
          54,
          0x171515,
          0.82
        )
      );
    }

    items.forEach(([label, action], index) => {
      const x = 285 + (index % 3) * 470;
      const y = 904 + 58 * Math.floor(index / 3);

      this.button(
        this.roomLayer,
        label,
        typeof action === 'function'
          ? action
          : () => this.show(
              label.toUpperCase(),
              action
            )
      )
        .setFontSize('31px')
        .setPosition(x, y);
    });
  }

  agnesReply(id, label, attitude, action) {
    return this.reply(
      NPC.AGNES,
      id,
      label,
      attitude,
      action
    );
  }

  agnesLine(nodeId, text, choices = []) {
    this.speak(
      NPC.AGNES,
      'AGNES LEDGER',
      nodeId,
      text,
      choices
    );
  }

  agnesFollowUp(topicId) {
    return [
      this.agnesReply(
        `agnes_thank_${topicId}`,
        'Thank you. That helps.',
        'nice',
        () => this.talkAgnes()
      ),

      this.agnesReply(
        `agnes_back_${topicId}`,
        'Another question.',
        'neutral',
        () => this.talkAgnes()
      ),

      this.agnesReply(
        'agnes_goodbye',
        'Say goodbye',
        'neutral',
        () => this.closePanel()
      ),
    ];
  }

  talkAgnes() {
    if (
      this.room !== 'office' ||
      this.officeAway
    ) {
      return;
    }

    this.agnesLine(
      'agnes_menu',
      'God knows everything. I handle the appointments.',
      [
        this.agnesReply(
          'agnes_ask_records',
          'Ask about the records',
          'neutral',
          () => {
            this.agnesLine(
              'agnes_records',
              'I can show you old parish bulletins. Private files stay private, even if you look very detective about it.',
              this.agnesFollowUp('records')
            );
          }
        ),

        this.agnesReply(
          'agnes_ask_auction',
          'Ask about the auction',
          'neutral',
          () => {
            this.agnesLine(
              'agnes_auction',
              'Someone donated that portrait again. Frankly, I’m starting to think it’s the one sending the postcards.',
              this.agnesFollowUp('auction')
            );
          }
        ),

        this.agnesReply(
          'agnes_goodbye',
          'Say goodbye',
          'neutral',
          () => this.closePanel()
        ),
      ]
    );
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

    // Otwarty dialog sam obsługuje Escape.
    if (this.modal) return;

    event.preventDefault();

    void this.leave();
  }

  async leave() {
    if (this.leaving || this.disposed) return;

    if (this.room !== 'nave') {
      if (!this.canAct()) return;

      this.room = 'nave';

      this.roomLayer.removeAll(true);
      this.roomLayer.setVisible(false);
      this.stage.setVisible(true);

      for (const { zone } of this.hotspots) {
        zone.setInteractive({
          useHandCursor: true,
        });
      }

      this.titleText.setText(TEXT.title);
      this.backText.setText(TEXT.back);
      this.hintText.setText(TEXT.hint);

      this.paintPanels();
      this.syncChrome();

      return;
    }

    this.leaving = true;
    this.closePanel();

    const uid = this.uid;

    try {
      const moved = await this.goto(
        'HomeCityScene',
        {
          entryPoint: 'church',
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
          'The door is stuck. Divine intervention, probably.'
        );
      }
    } catch (error) {
      console.error(
        '[ChurchScene] Exit failed:',
        error
      );

      if (
        !this.disposed &&
        this.uid === uid
      ) {
        this.leaving = false;

        this.say(
          'The door is stuck. Divine intervention, probably.'
        );
      }
    }
  }

  disposeChurch() {
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
        // Scena jest już zamknięta.
      }
    }, 80);

    this.textureKeys.clear();

    this.hotspots = [];
    this.flames = [];
    this.layers = {};

    this.events.off(
      'shutdown',
      this.disposeChurch,
      this
    );

    this.events.off(
      'destroy',
      this.disposeChurch,
      this
    );
  }
}