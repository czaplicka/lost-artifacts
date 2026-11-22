import {
  dialogueText as __dialogueText,
} from '../dialogues/DialogueText.js';

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  HomeTownDialogue,
} from '../ui/HomeTownDialogue.js';

import {
  BUSINESS_CENTER_CONFIG as CONFIG,
} from '../config/businessCenterConfig.js';

import {
  installReceptionWorldReactions,
} from '../ui/WorldReceptionReactionHooks.js';

import {
  preloadMenuActionAudio,
  playMenuActionAudio,
} from './archive/MenuActionAudio.js';

const T = id =>
  __dialogueText('scenes/BusinessCenterScene.js', id);

const ASSET_ROOT = 'assets/pi/business-center/';
const RECEPTIONIST_ID = 'pi_business_center_receptionist';
const DIALOGUE_DEPTH = 30000;

const ASSETS = {
  staffed: {
    key: 'business_center_staffed_v1',
    name: 'lobby-under-construction',
  },

  empty: {
    key: 'business_center_empty_v1',
    name: 'no-men',
  },
};

const EXTENSIONS = [
  'webp',
  'png',
  'jpg',
  'jpeg',
];

const HOTSPOTS = [
  {
    id: 'directory',
    label: T('t_54cf074e001d921712dc'),
    x: 0.18,
    y: 0.43,
    w: 0.30,
    h: 0.48,
  },
  {
    id: 'reception',
    label: T('t_ab63c0d0657040400f5a'),
    x: 0.375,
    y: 0.535,
    w: 0.15,
    h: 0.34,
  },
  {
    id: 'bell',
    label: T('t_41e1d3d7e96a79bcf1f9'),
    x: 0.408,
    y: 0.707,
    w: 0.055,
    h: 0.075,
  },
  {
    id: 'lift',
    label: T('t_0b5588e4dde4bde89939'),
    x: 0.86,
    y: 0.555,
    w: 0.235,
    h: 0.54,
  },
  {
    id: 'plant',
    label: T('t_0815e773e488c3344fc0'),
    x: 0.654,
    y: 0.855,
    w: 0.105,
    h: 0.25,
  },
];

export class BusinessCenterScene extends BaseScene {
  constructor() {
    super({ key: CONFIG.sceneKey });
  }

  init() {
    this.disposed = false;
    this.navigating = false;
    this.ready = false;
    this.panelOpen = false;

    this.receptionistPresent = true;
    this.token = Symbol(CONFIG.sceneKey);

    this.background = null;
    this.imageBox = null;
    this.dialogue = null;
    this.exitButton = null;
    this.status = null;

    this.hotspots = [];
    this.imageRequests = new Set();

    this.hiddenHud = null;
    this.previousHudDisplay = '';

    this.pendingPlayerLine = null;
  }

  preload() {
    preloadMenuActionAudio(this);
  }

  create() {
    super.create();

    installReceptionWorldReactions(this);

    this.registry.set(
      'currentSceneKey',
      CONFIG.sceneKey
    );

    this.events.once(
      'shutdown',
      this.disposeCenter,
      this
    );

    this.events.once(
      'destroy',
      this.disposeCenter,
      this
    );

    this.hideGameplayHud();

    this.cameras.main.setBackgroundColor('#101722');

    this.dialogue = new HomeTownDialogue(
      this,
      () => this.closePanel(false)
    );

    this.exitButton = this.add.text(
      18,
      16,
      '< Back to town',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 20,
        color: '#ffe0a0',
        backgroundColor: '#24352e',
        padding: { x: 12, y: 10 },
      }
    )
      .setDepth(100)
      .setInteractive({
        useHandCursor: true,
      });

    this.exitButton.on('pointerdown', () => {
      if (!this.panelOpen) {
        void this.leave();
      }
    });

    this.status = this.add.text(
      24,
      85,
      T('t_6fe4a6d5b15373f9cf08'),
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 22,
        color: '#ffe4bd',

        wordWrap: {
          width: Math.max(
            100,
            this.scale.width - 48
          ),
        },
      }
    ).setDepth(90);

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layoutRoom
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        this.onEscape
      );
    }

    void this.loadLobby();
  }

  hideGameplayHud() {
    this.getRegisteredScene('PlayerHudScene')
      ?.closeAllUIPanels?.();

    const news =
      this.getRegisteredScene('NewsHud');

    news?.closeMenu?.(true);
    news?.setHudVisible?.(false);

    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud',
    ]) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }

    const hud = document.getElementById(
      'hud-container'
    );

    if (hud) {
      this.hiddenHud = hud;
      this.previousHudDisplay = hud.style.display;
      hud.style.display = 'none';
    }
  }

  async loadLobby() {
    const token = this.token;

    const [staffed, empty] = await Promise.all([
      this.loadTexture(ASSETS.staffed),
      this.loadTexture(ASSETS.empty),
    ]);

    if (
      this.disposed ||
      token !== this.token
    ) {
      return;
    }

    if (!staffed && !empty) {
      this.status.setText(
        T('t_e343809912d837fb3e47') +
        ASSET_ROOT +
        T('t_7aff213fa39b971290e5')
      );

      return;
    }

    this.receptionistPresent = staffed;

    this.background = this.add.image(
      0,
      0,
      staffed
        ? ASSETS.staffed.key
        : ASSETS.empty.key
    )
      .setOrigin(0)
      .setDepth(0);

    this.status.setVisible(false);

    for (const definition of HOTSPOTS) {
      this.addHotspot(definition);
    }

    this.ready = true;

    this.layoutRoom();
    this.refreshHotspots();
  }

  async loadTexture(asset) {
    if (this.textures.exists(asset.key)) {
      return true;
    }

    for (const extension of EXTENSIONS) {
      if (this.disposed) return false;

      const loaded = await this.tryImage(
        asset.key,
        `${ASSET_ROOT}${asset.name}.${extension}`
      );

      if (loaded) return true;
    }

    return false;
  }

  tryImage(key, url) {
    return new Promise(resolve => {
      const image = new Image();
      let settled = false;

      const finish = success => {
        if (settled) return;

        settled = true;
        image.onload = null;
        image.onerror = null;

        this.imageRequests.delete(cancel);

        resolve(success);
      };

      const cancel = () => {
        finish(false);
        image.src = '';
      };

      this.imageRequests.add(cancel);

      image.onload = () => {
        if (this.disposed) {
          finish(false);
          return;
        }

        try {
          if (!this.textures.exists(key)) {
            this.textures.addImage(key, image);
          }

          finish(this.textures.exists(key));
        } catch (error) {
          console.warn(
            '[BusinessCenterScene] Image registration failed:',
            url,
            error
          );

          finish(false);
        }
      };

      image.onerror = () => finish(false);
      image.src = url;
    });
  }

  addHotspot(definition) {
    const rect = this.add.rectangle(
      0,
      0,
      1,
      1,
      0xffd27d,
      0
    )
      .setDepth(10)
      .setInteractive({
        useHandCursor: true,
      });

    const label = this.add.text(
      0,
      0,
      definition.label,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: 20,
        color: '#ffe4a5',
        backgroundColor: '#23362f',
        padding: { x: 8, y: 5 },
      }
    )
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    rect.on('pointerover', () => {
      if (this.canInteract()) {
        label.setVisible(true);
      }
    });

    rect.on('pointerout', () => {
      label.setVisible(false);
    });

    rect.on('pointerdown', () => {
      if (this.canInteract()) {
        this.interact(definition.id);
      }
    });

    this.hotspots.push({
      definition,
      rect,
      label,
    });
  }

  layoutRoom() {
    if (this.disposed) return;

    const {
      width,
      height,
    } = this.scale;

    this.status?.setWordWrapWidth(
      Math.max(100, width - 48)
    );

    if (this.background) {
      const source = this.textures
        .get(this.background.texture.key)
        .getSourceImage();

      const scale = Math.min(
        width / source.width,
        height / source.height
      );

      const w = source.width * scale;
      const h = source.height * scale;

      const left = (width - w) / 2;
      const top = (height - h) / 2;

      this.imageBox = {
        left,
        top,
        width: w,
        height: h,
      };

      this.background
        .setPosition(left, top)
        .setDisplaySize(w, h);

      for (const {
        definition: d,
        rect,
        label,
      } of this.hotspots) {
        const rw = d.w * w;
        const rh = d.h * h;
        const x = left + d.x * w;
        const y = top + d.y * h;

        rect
          .setPosition(x, y)
          .setSize(rw, rh);

        rect.input?.hitArea?.setTo(
          0,
          0,
          rw,
          rh
        );

        label.setPosition(
          x,
          Math.max(40, y - rh / 2 - 6)
        );
      }
    }

    this.raiseDialogue();
    this.refreshHotspots();
  }

  canInteract() {
    return this.ready &&
      !this.disposed &&
      !this.panelOpen &&
      !this.navigating;
  }

  refreshHotspots() {
    for (const {
      definition,
      rect,
      label,
    } of this.hotspots) {
      const available =
        definition.id !== 'reception' ||
        this.receptionistPresent;

      if (rect.input) {
        rect.input.enabled =
          this.canInteract() &&
          available;
      }

      label.setVisible(false);
    }

    this.exitButton?.setVisible(
      !this.panelOpen
    );
  }

  raiseDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
  }

  setReceptionistPresent(present) {
    if (
      this.disposed ||
      !this.ready ||
      typeof present !== 'boolean' ||
      this.panelOpen ||
      this.navigating
    ) {
      return false;
    }

    const key = present
      ? ASSETS.staffed.key
      : ASSETS.empty.key;

    if (!this.textures.exists(key)) {
      return false;
    }

    this.receptionistPresent = present;
    this.background.setTexture(key);

    this.layoutRoom();
    this.refreshHotspots();

    return true;
  }

  interact(id) {
    if (
      !this.canInteract() ||
      !HOTSPOTS.some(spot => spot.id === id) ||
      (
        id === 'reception' &&
        !this.receptionistPresent
      )
    ) {
      return;
    }

    playMenuActionAudio(this);

    if (id === 'reception') {
      this.reception();
    } else if (id === 'directory') {
      this.show(
        T('t_54cf074e001d921712dc'),
        CONFIG.directoryText
      );
    } else if (id === 'lift') {
      this.show(
        T('t_ac549c250b476176a910'),
        CONFIG.elevatorText
      );
    } else if (id === 'plant') {
      this.show(
        T('t_0815e773e488c3344fc0'),
        T('t_3799a2a6cab28754e9d2')
      );
    } else if (id === 'bell') {
      if (this.receptionistPresent) {
        this.receptionLine(
          'reception_bell',
          T('t_b7a67b2fb049964b5239'),
          [
            this.receptionReply(
              'reception_bell_continue',
              T('t_2d6f3709b712642b193a'),
              'neutral',
              () => this.reception()
            ),
          ]
        );
      } else {
        this.show(
          T('t_41e1d3d7e96a79bcf1f9'),
          T('t_47cd0d6e7b898516da1d')
        );
      }
    }
  }

  receptionReply(
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
          npcId: RECEPTIONIST_ID,
          text: String(label),
        };

        try {
          return action();
        } finally {
          this.pendingPlayerLine = null;
        }
      },
    };
  }

  receptionLine(nodeId, text, choices = []) {
    this.show(
      T('t_ab63c0d0657040400f5a'),
      text,
      choices,
      {
        npcId: RECEPTIONIST_ID,
        nodeId,
      }
    );
  }

  reception() {
    if (
      !this.receptionistPresent ||
      this.disposed ||
      this.navigating
    ) {
      return;
    }

    this.receptionLine(
      'reception_menu',
      CONFIG.receptionText,
      [
        this.receptionReply(
          'reception_topic_one',
          T('t_5e9b2793b4e7bfed7d45'),
          'neutral',
          () => {
            this.receptionLine(
              'reception_answer_one',
              T('t_b4f780fa552c6e8fa648'),
              this.receptionFollowUp()
            );
          }
        ),

        this.receptionReply(
          'reception_ask_elevator',
          T('t_61585016627eceee8c47'),
          'neutral',
          () => {
            this.receptionLine(
              'reception_elevator',
              CONFIG.elevatorText,
              this.receptionFollowUp()
            );
          }
        ),

        this.receptionReply(
          'reception_topic_three',
          T('t_ab494295fd24cabde877'),
          'neutral',
          () => {
            this.receptionLine(
              'reception_answer_three',
              T('t_55e47481a4d4e404d121'),
              this.receptionFollowUp()
            );
          }
        ),
      ]
    );
  }

  receptionFollowUp() {
    return [
      this.receptionReply(
        'reception_thank_help',
        'Thank you for your help.',
        'nice',
        () => {
          this.receptionLine(
            'reception_thanks_reply',
            'You are welcome. I shall record this as a successful human interaction.',
            [
              this.receptionBackChoice(),
            ]
          );
        }
      ),

      this.receptionBackChoice(),

      this.receptionReply(
        'reception_insult_help',
        'Do you ever do anything useful here?',
        'rude',
        () => {
          this.receptionLine(
            'reception_rude_reply',
            'Frequently. Explaining it to you was not one of those occasions.',
            [
              this.receptionBackChoice(),
            ]
          );
        }
      ),
    ];
  }

  receptionBackChoice() {
    return this.receptionReply(
      'reception_back_to_menu',
      T('t_240f1c9f302be82fb90a'),
      'neutral',
      () => this.reception()
    );
  }

  normalizeChoice(raw) {
    if (Array.isArray(raw)) {
      const [
        label,
        action,
        metadata = {},
      ] = raw;

      const settings =
        typeof metadata === 'string'
          ? { attitude: metadata }
          : metadata || {};

      return {
        ...settings,
        label: String(label ?? ''),
        action,
        attitude: settings.attitude ?? 'neutral',
      };
    }

    if (raw && typeof raw === 'object') {
      return {
        ...raw,
        label: String(raw.label ?? ''),
        action: raw.action ?? raw.onSelect,
        attitude: raw.attitude ?? 'neutral',
      };
    }

    return {
      label: String(raw ?? ''),
      attitude: 'neutral',
      disabled: true,
      action: null,
    };
  }

  show(
    title,
    text,
    choices = [],
    options = {}
  ) {
    if (this.disposed || this.navigating) return;

    const receptionTitle =
      T('t_ab63c0d0657040400f5a');

    // Hook reakcji świata wywołuje stare show(title, text, choices).
    // Rozpoznajemy wyłącznie znany tytuł recepcjonistki.
    const npcId = options.system === true
      ? null
      : options.npcId || (
          title === receptionTitle &&
          this.receptionistPresent
            ? RECEPTIONIST_ID
            : null
        );

    const playerLine = this.pendingPlayerLine;
    this.pendingPlayerLine = null;

    this.panelOpen = true;
    this.refreshHotspots();

    const guardedChoices = choices.map(raw => {
      const choice = this.normalizeChoice(raw);

      return {
        ...choice,

        disabled:
          choice.disabled === true ||
          typeof choice.action !== 'function',

        action: () => {
          if (
            this.disposed ||
            this.navigating ||
            !this.panelOpen
          ) {
            return;
          }

          playMenuActionAudio(this);

          return choice.action?.();
        },
      };
    });

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

    const closeChoice = {
      id: npcId
        ? 'reception_close_to_lobby'
        : 'business_center_close_panel',

      label: T('t_1440c3fffc7230332de0'),
      attitude: 'neutral',

      action: () => this.closePanel(),
    };

    this.dialogue.show({
      title,
      text,
      messages,
      npcId,
      nodeId: options.nodeId || title,
      showTrust: Boolean(npcId),

      choices: [
        ...guardedChoices,
        closeChoice,
      ],
    });

    this.raiseDialogue();
  }

  closePanel(userAction = true) {
    const wasOpen = this.panelOpen;

    this.dialogue?.close(false);

    this.panelOpen = false;
    this.pendingPlayerLine = null;

    if (!this.disposed) {
      this.refreshHotspots();

      if (
        wasOpen &&
        userAction &&
        !this.navigating
      ) {
        playMenuActionAudio(this);
      }
    }
  }

  onEscape(event) {
    if (
      event?.repeat ||
      this.disposed ||
      this.navigating ||
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey
    ) {
      return;
    }

    if (
      event?.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        event?.target?.tagName
      )
    ) {
      return;
    }

    // Otwarty panel sam obsługuje Escape.
    if (this.panelOpen) return;

    event?.preventDefault();

    void this.leave();
  }

  async leave() {
    if (this.disposed || this.navigating) {
      return false;
    }

    this.navigating = true;
    this.refreshHotspots();

    playMenuActionAudio(this);

    const token = this.token;

    try {
      const result = await this.goto(
        'HomeCityScene',
        {
          entryPoint: CONFIG.buildingId,
          fromScene: CONFIG.sceneKey,
          gameState,
        }
      );

      if (
        result === false &&
        !this.disposed &&
        token === this.token
      ) {
        this.navigationError();
      }

      return result !== false;
    } catch (error) {
      console.error(
        '[BusinessCenterScene]',
        error
      );

      if (
        !this.disposed &&
        token === this.token
      ) {
        this.navigationError();
      }

      return false;
    }
  }

  navigationError() {
    this.navigating = false;
    this.pendingPlayerLine = null;

    this.show(
      T('t_d17d84a604994b722db3'),
      T('t_842cf46b73dce3f1f443'),
      [],
      {
        nodeId: 'business_center_navigation_error',
        system: true,
      }
    );
  }

  disposeCenter() {
    if (this.disposed) return;

    this.disposed = true;
    this.ready = false;
    this.token = null;

    for (const cancel of [
      ...this.imageRequests,
    ]) {
      cancel();
    }

    this.imageRequests.clear();

    this.dialogue?.destroy();
    this.dialogue = null;

    this.pendingPlayerLine = null;

    if (this.hiddenHud) {
      this.hiddenHud.style.display =
        this.previousHudDisplay;
    }

    this.hiddenHud = null;
    this.hotspots = [];

    this.events.off(
      'shutdown',
      this.disposeCenter,
      this
    );

    this.events.off(
      'destroy',
      this.disposeCenter,
      this
    );
  }
}