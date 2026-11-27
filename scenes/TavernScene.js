import {
  dialogueText as __dialogueText,
} from '../dialogues/DialogueText.js';

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  getPIQuestStatus,
} from '../managers/PIQuestManager.js';

import {
  TAVERN_CONFIG,
} from '../config/tavernConfig.js';

import {
  HomeTownDialogue,
} from '../ui/HomeTownDialogue.js';

import { EventBus } from '../EventBus.js';
import { createDomExitButton } from '../ui/ExitImageButton.js';

import {
  attachPIClockUI,
} from '../ui/PIClockUI.js';

import {
  getPINpcStatus,
  getPILocationStatus,
} from '../managers/PIClockManager.js';

const KEY = 'TavernScene';
const TEXT_KEY = 'tavernDialogues';
const EXTRA_KEY = 'tavernExtras';
const DIALOGUE_DEPTH = 30000;

const clone = data =>
  JSON.parse(JSON.stringify(data));

const sourceText = id =>
  __dialogueText('scenes/TavernScene.js', id);

const CSS = sourceText('t_da07df321d5a434b67b1');

const NPC_TRUST_IDS = Object.freeze({
  bartender: 'pi_tavern_bartender',
  regular: 'pi_tavern_regular',
  guest: 'pi_tavern_guest',
});

const SOCIAL_REPLIES = Object.freeze({
  bartender: {
    nice: {
      label: 'Thanks for making people feel welcome.',
      answer:
        'It is a service industry. The service is mostly pretending I have not heard that story before.',
    },

    rude: {
      label:
        'You could try being useful instead of polishing that glass.',
      answer:
        'The glass listens, pays nothing and still causes less trouble. You have competition.',
    },
  },

  regular: {
    nice: {
      label: 'I appreciate you sharing what you know.',
      answer:
        'Finally, professional recognition. I shall add it to my qualifications. Both of them.',
    },

    rude: {
      label:
        'Do any of your theories survive contact with reality?',
      answer:
        'Of course not. That is how you know reality is involved.',
    },
  },

  guest: {
    nice: {
      label:
        'Thank you for your time. I know you came here for some peace.',
      answer:
        'You noticed. That already puts you ahead of most people with questions.',
    },

    rude: {
      label: 'You are not exactly making yourself useful.',
      answer:
        'Correct. I left that obligation at home with the insurance brochures.',
    },
  },
});

function normalizeChoice(raw) {
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
    action: null,
    attitude: 'neutral',
    disabled: true,
  };
}

export function rollTavernPresence(
  definitions,
  random = Math.random
) {
  return Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => [
      id,
      definition.alwaysPresent === true ||
        random() < definition.chance,
    ])
  );
}

export function adjustTavernHotspot(
  cfg,
  code,
  shift,
  alt,
  width,
  height
) {
  const horizontal = [
    'ArrowLeft',
    'ArrowRight',
  ].includes(code);

  const direction = [
    'ArrowLeft',
    'ArrowUp',
  ].includes(code)
    ? -1
    : 1;

  const field = shift
    ? horizontal ? 'w' : 'h'
    : horizontal ? 'x' : 'y';

  const size = Math.max(
    1,
    horizontal ? width : height
  );

  cfg[field] = Math.max(
    shift ? Math.min(1, 20 / size) : 0,

    Math.min(
      1,
      cfg[field] +
        direction * (alt ? 1 : 5) / size
    )
  );
}

export class TavernScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init() {
    this.disposed = false;
    this.ready = false;
    this.navigating = false;
    this.token = Symbol(KEY);

    this.panel = null;
    this.root = null;
    this.dialogue = null;

    this.spots = [];
    this.layers = new Map();
    this.pendingPresence = new Map();

    this.config = clone(TAVERN_CONFIG);
    this.hotspotDefs = this.config.hotspots;

    this.presence = Object.fromEntries(
      Object.keys(this.config.npcs).map(id => [
        id,
        getPINpcStatus(`tavern:${id}`).available,
      ])
    );

    this.activeNpcId = null;
    this.pendingPlayerLine = null;

    this.debugMode = false;
    this.selectedIndex = 0;

    this.lastBox = null;
    this.styleElement = null;
    this.background = null;
    this.label = null;
    this.domKey = null;
    this.statusTimer = null;

    this.piTimeModalOpen = false;
    this.piClockUI = null;
    this.piTimeListener = null;
  }

  preload() {
    const assets = [
      {
        key: this.config.backgroundKey,
        url: this.config.backgroundUrl,
      },
      ...Object.values(this.config.npcs),
    ];

    const uniqueAssets = new Map(
      assets.map(asset => [
        asset.key,
        asset,
      ])
    );

    for (const asset of uniqueAssets.values()) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(
          asset.key,
          asset.url
        );
      }
    }

    for (const [key, url] of [
      [
        TEXT_KEY,
        'assets/data/tavernDialogues.json',
      ],
      [
        EXTRA_KEY,
        'assets/data/tavernExtras.json',
      ],
      [
        'piOfficeClassifieds',
        'assets/data/piClassifieds.json',
      ],
    ]) {
      if (!this.cache.json.exists(key)) {
        this.load.json(key, url);
      }
    }
  }

  create() {
    super.create();

    this.events.once(
      'shutdown',
      this.disposeTavern,
      this
    );

    this.events.once(
      'destroy',
      this.disposeTavern,
      this
    );

    this.registry.set('currentSceneKey', KEY);

    this.textData = this.cache.json.get(TEXT_KEY);
    this.extraData = this.cache.json.get(EXTRA_KEY);

    this.cameras.main.setBackgroundColor('#171b18');

    this.hideGameplayHud();

    this.dialogue = new HomeTownDialogue(
      this,
      () => this.closePanel()
    );

    if (
      !this.textData?.ui ||
      !this.textData?.npcs ||
      !this.textData?.rumors ||
      !this.extraData?.ui ||
      !this.extraData?.comments ||
      !this.textures.exists(this.config.backgroundKey)
    ) {
      this.add.text(
        24,
        24,
        'Tavern assets could not be loaded.\n' +
        'Check config/tavernConfig.js and the JSON files.\n' +
        'Click here to return to town.',
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#fff',

          wordWrap: {
            width: Math.max(
              100,
              this.scale.width - 48
            ),
          },
        }
      )
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => void this.leave());

      return;
    }

    this.background = this.add.image(
      0,
      0,
      this.config.backgroundKey
    )
      .setOrigin(0)
      .setDepth(0);

    for (const [id, definition] of Object.entries(
      this.config.npcs
    )) {
      if (!this.textures.exists(definition.key)) {
        console.warn(
          '[TavernScene] Missing NPC texture:',
          id,
          definition.key
        );

        continue;
      }

      this.layers.set(
        id,

        this.add.image(
          0,
          0,
          definition.key
        )
          .setOrigin(0)
          .setDepth(definition.depth)
          .setVisible(this.presence[id])
      );
    }

    this.label = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '20px',
        color: '#ffe3a4',
        backgroundColor: '#18201c',
        padding: { x: 8, y: 5 },
      }
    )
      .setDepth(1000)
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.createInterface();

    this.hotspotDefs.forEach((definition, index) => {
      this.createHotspot(definition, index);
    });

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layout
    );

    this.trackInputEvent(
      this.input,
      'drag',
      this.onHotspotDrag
    );

    this.domKey = event => this.onKey(event);

    window.addEventListener(
      'keydown',
      this.domKey,
      true
    );

    this.ready = true;

    this.layout();
    this.refreshHotspots();

    this.piClockUI = attachPIClockUI(this);

    this.piTimeListener = () => {
      this.syncScheduledPresence();
    };

    EventBus.on(
      'pi:timeChanged',
      this.piTimeListener
    );

    this.syncScheduledPresence();

    const status = getPILocationStatus('tavern');

    if (!status.available) {
      this.piClockUI.offerWait({
        title: 'The tavern is closed.',
        status,

        onReady: () => {
          this.syncScheduledPresence();
        },

        onLeave: () => void this.leave(),
      });
    }
  }

  syncScheduledPresence() {
    if (this.disposed || !this.ready) return;

    for (const id of Object.keys(this.config.npcs)) {
      const present =
        getPINpcStatus(`tavern:${id}`).available;

      if (
        !present &&
        this.activeNpcId === id &&
        this.panel
      ) {
        this.pendingPresence.set(id, false);
      } else {
        this.pendingPresence.delete(id);

        this.presence[id] = present;
        this.layers.get(id)?.setVisible(present);
      }
    }

    this.refreshHotspots();
  }

  hideGameplayHud() {
    this.getRegisteredScene('PlayerHudScene')
      ?.closeAllUIPanels?.();

    this.getRegisteredScene('NewsHud')
      ?.closeMenu?.(true);

    this.getRegisteredScene('NewsHud')
      ?.setHudVisible?.(false);

    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud',
    ]) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }

    this.styleElement = document.createElement('style');
    this.styleElement.textContent = CSS;

    document.head.appendChild(this.styleElement);

    document.documentElement.classList.add(
      'tavern-active'
    );
  }

  timedTavernHint() {
    return this.text('hint') +
      ' | Bartender: 16:00-02:00' +
      ' | Regular: 18:00-02:00' +
      ' | Guest: 16:00-22:00';
  }

  format(value, values = {}) {
    return String(value).replace(
      /\{(\w+)\}/g,
      (match, key) => (
        Object.prototype.hasOwnProperty.call(values, key)
          ? String(values[key])
          : match
      )
    );
  }

  text(key, values = {}) {
    return this.format(
      this.textData?.ui?.[key] ?? `[${key}]`,
      values
    );
  }

  extra(key, values = {}) {
    return this.format(
      this.extraData?.ui?.[key] ?? `[${key}]`,
      values
    );
  }

  createInterface() {
    this.root = document.createElement('div');
    this.root.className = 'la-tavern-ui';

    const top = document.createElement('div');
    top.className = 'top';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = this.text('title');

    const buttons = document.createElement('div');
    buttons.className = 'buttons';

    buttons.append(
      createDomExitButton(
        () => {
          if (
            !this.disposed &&
            !this.navigating &&
            !this.piTimeModalOpen &&
            !this.debugMode &&
            !this.panel
          ) {
            void this.leave();
          }
        },
        { label: this.text('backToTown') }
      )
    );

    top.append(title, buttons);

    this.hint = document.createElement('div');
    this.hint.className = 'hint';
    this.hint.textContent = this.timedTavernHint();

    this.debugText = document.createElement('div');
    this.debugText.className = 'debug';
    this.debugText.hidden = true;

    this.root.append(
      top,
      this.hint,
      this.debugText
    );

    document.body.appendChild(this.root);
  }

  button(text, action) {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = text;

    button.addEventListener('click', event => {
      event.stopPropagation();

      if (
        !this.disposed &&
        !this.navigating &&
        !this.piTimeModalOpen
      ) {
        action();
      }
    });

    return button;
  }

  canInteract() {
    return this.ready &&
      !this.disposed &&
      !this.navigating &&
      !this.panel &&
      !this.piTimeModalOpen;
  }

  isNpcPresent(id) {
    return Boolean(
      !this.disposed &&
      this.presence[id] &&
      getPINpcStatus(`tavern:${id}`).available &&
      this.layers.has(id)
    );
  }

  getNpcPresence() {
    return Object.fromEntries(
      Object.keys(this.presence).map(id => [
        id,
        this.isNpcPresent(id),
      ])
    );
  }

  setNpcPresent(id, present) {
    const definition = this.config.npcs[id];

    if (
      !this.ready ||
      this.disposed ||
      !definition ||
      typeof present !== 'boolean'
    ) {
      return false;
    }

    if (definition.alwaysPresent && !present) {
      return false;
    }

    if (
      !present &&
      this.activeNpcId === id &&
      this.panel
    ) {
      this.pendingPresence.set(id, present);
      return true;
    }

    this.pendingPresence.delete(id);
    this.applyPresence(id, present);

    return true;
  }

  applyPresence(id, present) {
    this.presence[id] = present;

    this.layers.get(id)?.setVisible(
      present &&
      getPINpcStatus(`tavern:${id}`).available
    );

    this.label?.setVisible(false);
    this.refreshHotspots();
  }

  flushPresence() {
    const pending = [...this.pendingPresence];

    this.pendingPresence.clear();

    for (const [id, present] of pending) {
      this.applyPresence(id, present);
    }
  }

  createHotspot(cfg, index) {
    const rect = this.add.rectangle(
      0,
      0,
      1,
      1,
      0xffd27d,
      0
    )
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .setData('hotspotIndex', index);

    const label = this.add.text(
      0,
      0,
      cfg.label,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '20px',
        color: '#ffe3a4',
        backgroundColor: '#18201c',
        padding: { x: 8, y: 5 },
      }
    )
      .setOrigin(0.5, 1)
      .setDepth(110)
      .setVisible(false);

    const hot = { cfg, rect, label };

    this.spots.push(hot);

    rect.on('pointerover', () => {
      if (!this.canInteract() || this.debugMode) return;

      label.setVisible(true);
    });

    rect.on('pointerout', () => {
      if (!this.debugMode) {
        label.setVisible(false);
      }
    });

    rect.on('pointerdown', () => {
      if (!this.canInteract()) return;

      if (this.debugMode) {
        this.selectedIndex = index;
        this.refreshHotspots();
        return;
      }

      if (
        cfg.action === 'talk' &&
        !this.isNpcPresent(cfg.npcId)
      ) {
        return;
      }

      if (cfg.action === 'exit') {
        void this.leave();
      } else if (cfg.action === 'talk') {
        this.talk(cfg.npcId);
      } else if (cfg.action === 'comment') {
        this.comment(cfg);
      }
    });

    this.syncHotspot(hot);

    return hot;
  }

  syncHotspot({ cfg, rect, label }) {
    const { width, height } = this.scale;

    const w = Math.max(1, cfg.w * width);
    const h = Math.max(1, cfg.h * height);

    rect
      .setPosition(
        cfg.x * width,
        cfg.y * height
      )
      .setSize(w, h);

    rect.input?.hitArea?.setTo(
      0,
      0,
      w,
      h
    );

    label.setPosition(
      cfg.x * width,
      Math.max(
        35,
        cfg.y * height - h / 2 - 6
      )
    );
  }

  refreshHotspots() {
    if (this.disposed) return;

    for (const [index, hot] of this.spots.entries()) {
      const available =
        hot.cfg.action !== 'talk' ||
        this.isNpcPresent(hot.cfg.npcId);

      const enabled =
        this.canInteract() &&
        (this.debugMode || available);

      if (hot.rect.input) {
        hot.rect.input.enabled = enabled;
      }

      this.input.setDraggable(
        hot.rect,
        enabled && this.debugMode
      );

      hot.rect
        .setFillStyle(
          available ? 0xffd27d : 0x999999,
          enabled && this.debugMode ? 0.2 : 0
        )
        .setStrokeStyle(
          enabled && this.debugMode ? 3 : 0,
          index === this.selectedIndex
            ? 0xff77c8
            : 0xffd27d
        );

      hot.label
        .setText(hot.cfg.label)
        .setVisible(enabled && this.debugMode);
    }

    if (!this.debugText) return;

    this.debugText.hidden = !this.debugMode;

    const hot = this.spots[this.selectedIndex];

    if (hot && this.debugMode) {
      const cfg = hot.cfg;

      const presence = cfg.action === 'talk'
        ? this.extra(
            this.isNpcPresent(cfg.npcId)
              ? 'present'
              : 'absent'
          )
        : this.extra('environment');

      this.debugText.textContent =
        this.extra('debugState', {
          id: cfg.id,
          presence,
          x: cfg.x.toFixed(4),
          y: cfg.y.toFixed(4),
          w: cfg.w.toFixed(4),
          h: cfg.h.toFixed(4),
        }) +
        '\n' +
        this.extra('debugHelp');
    }
  }

  toggleDebug() {
    if (!this.canInteract()) return;

    this.debugMode = !this.debugMode;

    this.label?.setVisible(false);
    this.refreshHotspots();
  }

  onHotspotDrag(_pointer, object, x, y) {
    if (!this.canInteract() || !this.debugMode) return;

    const index = object.getData('hotspotIndex');

    if (
      !Number.isInteger(index) ||
      !this.spots[index]
    ) {
      return;
    }

    this.selectedIndex = index;

    const hot = this.spots[index];

    hot.cfg.x = Math.max(
      0,
      Math.min(1, x / this.scale.width)
    );

    hot.cfg.y = Math.max(
      0,
      Math.min(1, y / this.scale.height)
    );

    this.syncHotspot(hot);
    this.refreshHotspots();
  }

  addHotspot() {
    if (!this.canInteract() || !this.debugMode) return;

    let number = 1;

    while (
      this.hotspotDefs.some(hot =>
        hot.id === `extra_${number}`
      )
    ) {
      number++;
    }

    const definition = {
      id: `extra_${number}`,
      label:
        sourceText('t_ce94c871d50f0039f8e5') +
        number,

      action: 'comment',
      textKey: 'extraComment',
      x: 0.5,
      y: 0.5,
      w: 0.1,
      h: 0.1,
    };

    this.hotspotDefs.push(definition);

    this.createHotspot(
      definition,
      this.hotspotDefs.length - 1
    );

    this.selectedIndex =
      this.hotspotDefs.length - 1;

    this.refreshHotspots();

    this.say(
      this.extra(
        sourceText('t_279b8a60f444fa8b6275')
      )
    );
  }

  exportConfig() {
    console.log('COPY TO config/tavernConfig.js:');

    console.log(
      'export const TAVERN_CONFIG = ' +
      JSON.stringify(this.config, null, 2) +
      ';'
    );

    this.say(
      this.extra(
        sourceText('t_427da8ba22c9532ad803')
      )
    );
  }

  onKey(event) {
    if (
      this.disposed ||
      !this.ready ||
      !this.sys.isActive() ||
      this.navigating ||
      this.piTimeModalOpen ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']
        .includes(event.target?.tagName)
    ) {
      return;
    }

    // Klawiaturę otwartej rozmowy obsługuje DialoguePanel.
    if (this.panel) return;

    const code = event.code;

    const handled =
      code === 'Escape' ||
      code === 'KeyD' ||
      (
        this.debugMode &&
        [
          'Tab',
          'KeyC',
          'KeyN',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
        ].includes(code)
      );

    if (!handled) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (code === 'Escape') {
      if (event.repeat) return;

      if (this.debugMode) {
        this.toggleDebug();
      } else {
        void this.leave();
      }

      return;
    }

    if (code === 'KeyD') {
      if (!event.repeat) this.toggleDebug();
      return;
    }

    if (!this.debugMode) return;

    if (code === 'Tab' && this.spots.length) {
      this.selectedIndex = (
        this.selectedIndex +
        (event.shiftKey ? -1 : 1) +
        this.spots.length
      ) % this.spots.length;
    } else if (code === 'KeyC') {
      if (!event.repeat) this.exportConfig();
    } else if (code === 'KeyN') {
      if (!event.repeat) this.addHotspot();
    } else if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(code)
    ) {
      const hot = this.spots[this.selectedIndex];

      if (hot) {
        adjustTavernHotspot(
          hot.cfg,
          code,
          event.shiftKey,
          event.altKey,
          this.scale.width,
          this.scale.height
        );

        this.syncHotspot(hot);
      }
    }

    this.refreshHotspots();
  }

  layout() {
    if (this.disposed || !this.root) return;

    const { width, height } = this.scale;

    this.background?.setDisplaySize(width, height);

    for (const layer of this.layers.values()) {
      layer
        .setPosition(0, 0)
        .setDisplaySize(width, height);
    }

    for (const hot of this.spots) {
      this.syncHotspot(hot);
    }

    const bounds =
      this.game.canvas.getBoundingClientRect();

    Object.assign(this.root.style, {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,

      fontSize: `${
        Math.max(
          12,
          Math.min(22, bounds.width / 65)
        )
      }px`,
    });

    if (this.dialogue?.root) {
      this.panel = this.dialogue.root;
    }

    this.raiseTavernDialogue();
  }

  update() {
    if (this.disposed || !this.root) return;

    const bounds =
      this.game.canvas.getBoundingClientRect();

    const signature = [
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
    ].join('/');

    if (signature !== this.lastBox) {
      this.lastBox = signature;
      this.layout();
    }
  }

  say(text) {
    if (!this.hint) return;

    this.statusTimer?.remove(false);
    this.hint.textContent = text;

    this.statusTimer = this.time.delayedCall(
      5000,
      () => {
        if (!this.disposed && this.hint) {
          this.hint.textContent =
            this.timedTavernHint();
        }

        this.statusTimer = null;
      }
    );
  }

  raiseTavernDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
  }

  npcChoice(
    npcId,
    id,
    label,
    attitude,
    action,
    { spoken = true } = {}
  ) {
    return {
      id,
      label,
      attitude,

      action: () => {
        if (
          this.disposed ||
          this.navigating ||
          this.activeNpcId !== npcId
        ) {
          return;
        }

        this.pendingPlayerLine = spoken
          ? {
              npcId,
              text: String(label),
            }
          : null;

        try {
          return action();
        } finally {
          this.pendingPlayerLine = null;
        }
      },
    };
  }

  backToNpcChoice(npcId) {
    return this.npcChoice(
      npcId,
      `${npcId}:back_to_menu`,
      this.text('somethingElse'),
      'neutral',
      () => this.talk(npcId),
      { spoken: false }
    );
  }

  show(title, text, choices = []) {
    if (
      this.disposed ||
      this.navigating ||
      !this.root ||
      this.debugMode ||
      !this.dialogue ||
      this.dialogue.destroyed
    ) {
      return;
    }

    this.label?.setVisible(false);

    for (const hot of this.spots) {
      hot.label.setVisible(false);
    }

    const activeId = this.activeNpcId;

    const npc = activeId
      ? this.textData?.npcs?.[activeId]
      : null;

    const isNpcDialogue = Boolean(
      npc &&
      title === npc.name &&
      NPC_TRUST_IDS[activeId]
    );

    const trustId = isNpcDialogue
      ? NPC_TRUST_IDS[activeId]
      : null;

    const playerLine = this.pendingPlayerLine;

    this.pendingPlayerLine = null;

    const messages = [];

    if (
      isNpcDialogue &&
      playerLine?.npcId === activeId
    ) {
      messages.push({
        speaker: 'player',
        text: playerLine.text,
      });
    }

    messages.push({
      speaker: isNpcDialogue ? 'npc' : 'note',
      text: String(text ?? ''),
    });

    const guardedChoices = choices.map(raw => {
      const choice = normalizeChoice(raw);

      const disabled =
        choice.disabled === true ||
        choice.state === 'disabled' ||
        typeof choice.action !== 'function';

      return {
        ...choice,

        id: choice.id || JSON.stringify([
          isNpcDialogue ? activeId : 'information',
          title,
          choice.label,
        ]),

        disabled,

        action: () => {
          if (
            disabled ||
            this.disposed ||
            this.navigating ||
            !this.panel ||
            this.debugMode ||
            this.piTimeModalOpen
          ) {
            return;
          }

          return choice.action();
        },
      };
    });

    this.panel = this.dialogue.show({
      title,
      text,
      choices: guardedChoices,
      messages,

      npcId: trustId,
      showTrust: Boolean(trustId),

      nodeId: isNpcDialogue
        ? `tavern_npc:${activeId}`
        : `tavern_information:${title}`,
    });

    this.root.style.visibility = 'hidden';

    if (this.hint) {
      this.hint.style.display = 'none';
    }

    this.raiseTavernDialogue();
    this.refreshHotspots();

    return this.panel;
  }

  closePanel() {
    this.pendingPlayerLine = null;

    this.dialogue?.close(false);

    this.panel = null;
    this.activeNpcId = null;

    if (this.root) {
      this.root.style.visibility = '';
    }

    if (this.hint) {
      this.hint.style.display = '';
    }

    this.flushPresence();
    this.refreshHotspots();
  }

  comment(cfg) {
    this.activeNpcId = null;
    this.pendingPlayerLine = null;

    this.show(
      cfg.label,
      this.extraData.comments[cfg.textKey] ||
        this.extra('unknownComment'),
      []
    );
  }

  board() {
    const cfg = this.hotspotDefs.find(
      hot => hot.id === 'board'
    );

    if (cfg) this.comment(cfg);
  }

  adverts() {
    const data = this.cache.json.get(
      'piOfficeClassifieds'
    );

    return Array.isArray(data?.advertisements)
      ? data.advertisements
      : [];
  }

  talk(id) {
    const npc = this.textData?.npcs?.[id];

    if (
      !npc ||
      !this.isNpcPresent(id) ||
      this.debugMode ||
      this.disposed ||
      this.navigating
    ) {
      return;
    }

    this.activeNpcId = id;

    const chat = Array.isArray(npc.chat)
      ? npc.chat
      : [];

    const choices = chat.map((entry, index) => {
      const topicId =
        entry.id || `chat_${index}`;

      const choice = this.npcChoice(
        id,
        `${id}:chat:${topicId}`,
        entry.question,
        entry.attitude ?? 'neutral',

        () => {
          this.show(
            npc.name,
            entry.answer,
            [
              this.backToNpcChoice(id),
            ]
          );
        }
      );

      if (Number.isFinite(entry.trustDelta)) {
        choice.trustDelta = entry.trustDelta;
      }

      return choice;
    });

    choices.push(
      this.npcChoice(
        id,
        `${id}:ask_for_work`,
        this.text('askForWork'),
        'neutral',
        () => this.leads(id)
      )
    );

    const social = SOCIAL_REPLIES[id];

    if (social) {
      choices.push(
        this.npcChoice(
          id,
          `${id}:social:nice`,
          social.nice.label,
          'nice',

          () => {
            this.show(
              npc.name,
              social.nice.answer,
              [
                this.backToNpcChoice(id),
              ]
            );
          }
        ),

        this.npcChoice(
          id,
          `${id}:social:rude`,
          social.rude.label,
          'rude',

          () => {
            this.show(
              npc.name,
              social.rude.answer,
              [
                this.backToNpcChoice(id),
              ]
            );
          }
        )
      );
    }

    this.show(
      npc.name,
      npc.greeting,
      choices
    );
  }

  leads(id) {
    const npc = this.textData.npcs[id];

    if (!npc || !this.isNpcPresent(id)) return;

    this.activeNpcId = id;

    const adverts = this.adverts();

    const ads = npc.leads
      .map(key => adverts.find(ad =>
        ad.id === key &&
        ad.kind === 'pi'
      ))
      .filter(Boolean);

    this.show(
      npc.name,
      this.text(
        ads.length
          ? 'leadsAvailable'
          : 'leadsEmpty'
      ),

      [
        ...ads.map(ad => ({
          id: `${id}:lead:${ad.id}`,
          label: ad.title,
          attitude: 'neutral',
          action: () => this.lead(id, ad),
        })),

        this.backToNpcChoice(id),
      ]
    );
  }

  lead(id, ad) {
    const npc = this.textData.npcs[id];

    if (!npc || !this.isNpcPresent(id)) return;

    this.activeNpcId = id;

    const status = getPIQuestStatus(
      ad.missionId
    );

    const text = status === 'completed'
      ? this.text('completedRumor')
      : status !== 'available'
        ? this.text('activeRumor')
        : [
            this.textData.rumors[ad.id] ||
              ad.description ||
              '',

            this.text('contact', {
              contact:
                ad.contact ||
                this.text('contactFallback'),
            }),

            this.text('rumorDisclaimer'),
          ].join('\n\n');

    this.show(
      npc.name,
      text,
      [
        {
          id: `${id}:read_notice:${ad.id}`,
          label: this.text('readNotice'),
          attitude: 'neutral',

          action: () => {
            this.notice(
              ad,
              () => this.lead(id, ad)
            );
          },
        },

        this.backToNpcChoice(id),
      ]
    );
  }

  notice(ad, back) {
    const job =
      ad.kind === 'pi' &&
      typeof ad.missionId === 'string';

    const parts = [
      ad.description || '',

      this.text('contact', {
        contact:
          ad.contact ||
          this.text('contactMissing'),
      }),
    ];

    if (job) {
      const status = getPIQuestStatus(
        ad.missionId
      );

      parts.push(
        this.text('status', {
          status: status === 'available'
            ? this.text('notAccepted')
            : (
                this.textData.ui.statusLabels?.[status] ||
                status
              ),
        })
      );
    }

    const choices = [];

    if (job) {
      choices.push({
        id: `notice:${ad.id}:go_to_office`,
        label: this.text('goToOffice'),
        attitude: 'neutral',

        action: () => this.navigate(
          'DetectiveOfficeScene',
          {
            entrySource: 'tavern',
            fromScene: KEY,
            gameState,
          }
        ),
      });
    }

    choices.push({
      id: `notice:${ad.id}:back`,
      label: this.text('back'),
      attitude: 'neutral',
      action: back,
    });

    this.show(
      ad.title,
      parts.join('\n\n'),
      choices
    );
  }

  leave() {
    return this.navigate(
      'HomeCityScene',
      {
        entryPoint: 'tavern',
        fromScene: KEY,
        gameState,
      }
    );
  }

  async navigate(key, data) {
    if (
      this.disposed ||
      this.navigating ||
      this.debugMode ||
      this.piTimeModalOpen
    ) {
      return false;
    }

    const token = this.token;

    this.navigating = true;
    this.refreshHotspots();

    try {
      const result = await this.goto(
        key,
        data
      );

      if (
        this.disposed ||
        this.token !== token
      ) {
        return result !== false;
      }

      this.navigating = false;

      if (result === false && this.root) {
        this.pendingPlayerLine = null;

        this.show(
          this.text('navigationErrorTitle'),
          this.text('navigationError'),
          []
        );
      } else {
        this.refreshHotspots();
      }

      return result !== false;
    } catch (error) {
      console.error(
        '[TavernScene] Navigation failed:',
        error
      );

      if (
        !this.disposed &&
        this.token === token
      ) {
        this.navigating = false;
        this.pendingPlayerLine = null;

        if (this.root) {
          this.show(
            this.text('navigationErrorTitle'),
            this.text('navigationError'),
            []
          );
        }
      }

      return false;
    }
  }

  disposeTavern() {
    if (this.disposed) return;

    this.piClockUI?.destroy();
    this.piClockUI = null;

    if (this.piTimeListener) {
      EventBus.off(
        'pi:timeChanged',
        this.piTimeListener
      );
    }

    this.piTimeListener = null;

    this.disposed = true;
    this.ready = false;
    this.token = null;

    if (this.domKey) {
      window.removeEventListener(
        'keydown',
        this.domKey,
        true
      );
    }

    this.domKey = null;

    this.statusTimer?.remove(false);
    this.statusTimer = null;

    this.pendingPresence.clear();
    this.pendingPlayerLine = null;

    this.dialogue?.destroy();
    this.dialogue = null;

    this.root?.remove();
    this.root = null;
    this.panel = null;

    this.styleElement?.remove();
    this.styleElement = null;

    document.documentElement.classList.remove(
      'tavern-active'
    );

    this.events.off(
      'shutdown',
      this.disposeTavern,
      this
    );

    this.events.off(
      'destroy',
      this.disposeTavern,
      this
    );
  }
}