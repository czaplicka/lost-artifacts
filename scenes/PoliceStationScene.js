import { dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getAcceptedPIQuests } from '../managers/PIQuestManager.js';
import { ColdCaseUI } from '../ui/ColdCaseUI.js';
import { audioManager } from '../managers/AudioManager.js';
import { addPoliceWorldReactionOption } from '../ui/WorldPoliceReactionHooks.js';

// Keep both existing translation namespaces; no dialogue-data migration is needed.
const B = id => dialogueText('scenes/PoliceStationBaseScene.js', id);
const T = id => dialogueText('scenes/PoliceStationScene.js', id);
const KEY = 'PoliceStationScene';
const BACKGROUND_KEY = 'home-police';
const BACKGROUND_URL = 'assets/pi/police/home-police.webp';
const AMBIENT_KEY = 'sfx_home_police_ambient';
const COLD_CASE_URL = 'assets/data/cold-cases/last-gnome-standing.json';

const HOTSPOTS = [
  { id: 'officer', label: B('t_832bb16aeb9f95e761e9'), x: 0.698, y: 0.401, w: 0.094, h: 0.190 },
  { id: 'exit', label: B('t_6398180d50773dcd79cc'), x: 0.024, y: 0.198, w: 0.091, h: 0.680 },
  { id: 'bench', label: B('t_0177bc386e844ed17a27'), x: 0.177, y: 0.537, w: 0.220, h: 0.224 },
  { id: 'board', label: B('t_7e265a9a797b49d67957'), x: 0.220, y: 0.286, w: 0.161, h: 0.202 },
  { id: 'machine', label: B('t_13360a46a65d2ec65fec'), x: 0.405, y: 0.449, w: 0.073, h: 0.306 },
  { id: 'staff-door', label: B('t_b3a64b77c8a70675d232'), x: 0.906, y: 0.191, w: 0.089, h: 0.688 },
  { id: 'back-door', label: B('t_5e43b73e106f7a10f03d'), x: 0.542, y: 0.265, w: 0.134, h: 0.282 },
  { id: 'clock', label: B('t_fb3e44006b3e2089b94f'), x: 0.710, y: 0.239, w: 0.065, h: 0.117 },
];
const OBSERVATIONS = {
  bench: [B('t_0177bc386e844ed17a27'), B('t_090a06e693a0b85dc976')],
  board: [B('t_7e265a9a797b49d67957'), B('t_831d25822a85f127aded')],
  machine: [B('t_13360a46a65d2ec65fec'), B('t_7d60f8c1e042d4d62b32')],
  'staff-door': [B('t_b3a64b77c8a70675d232'), B('t_51f72594808bc5a5e891')],
  'back-door': [B('t_09d416b260dfdc3731b3'), B('t_5217d3f9f4dc1ca91762')],
  clock: [B('t_fb3e44006b3e2089b94f'), B('t_077ce5c72f46452f4c5b')],
};
const TOPICS = [
  [B('t_db20a920fba909cdf86e'), 'investigator'],
  [B('t_d01cbbd4e85c316601ec'), 'neighborhood'],
  [B('t_5efb402f94f0b50d7764'), 'staff'],
  [B('t_347010c414033e6a0369'), 'machine'],
  [B('t_2b687db6298b629d3bcb'), B('t_82e35a63ceba37e96464')],
];
const END = [
  [B('t_da0776b59d8c85cdba79'), 'topics'],
  [B('t_2b687db6298b629d3bcb'), B('t_82e35a63ceba37e96464')],
];
const DIALOGUE = {
  start: { text: B('t_be5a2b8755c9f319c4b8'), choices: TOPICS },
  topics: { text: B('t_554e6ec0bec97ecc209b'), choices: TOPICS },
  investigator: {
    player: B('t_db20a920fba909cdf86e'), text: B('t_b5cfc462a952b9e59d6e'),
    choices: [[B('t_31110d2df95ef53efb9f'), 'stapler'], [B('t_a825c4507a307d685e0a'), 'professional'], ...END],
  },
  stapler: {
    player: B('t_31110d2df95ef53efb9f'), text: B('t_84cb4b210446c773c82e'),
    choices: [[B('t_a7e9c2c9c7c5dc37bac8'), 'inside-job'], ...END],
  },
  'inside-job': { player: B('t_a7e9c2c9c7c5dc37bac8'), text: B('t_1ce5f6cf7d7a3b99ad61'), choices: END },
  professional: { player: B('t_a825c4507a307d685e0a'), text: B('t_7be2c01fd350efcda407'), choices: END },
  neighborhood: {
    player: B('t_d01cbbd4e85c316601ec'), text: B('t_64e62b7ddd10b3128cd7'),
    choices: [[B('t_6cec002353a715511b40'), 'danger'], [B('t_2102bff3a5c94da88b5b'), 'advice'], ...END],
  },
  danger: { player: B('t_6cec002353a715511b40'), text: B('t_db9f69a71938106ea9c9'), choices: END },
  advice: { player: B('t_2102bff3a5c94da88b5b'), text: B('t_973729b6be58e2212cc0'), choices: END },
  staff: {
    player: B('t_5efb402f94f0b50d7764'), text: B('t_0d0d3604c77a5c4f49bc'),
    choices: [[B('t_d79fae60b558cbf2cc0a'), 'staff-access'], [B('t_99d3d2a8612b2259ee00'), 'printer'], ...END],
  },
  'staff-access': { player: B('t_d79fae60b558cbf2cc0a'), text: B('t_771e9bfa3353279c86f6'), choices: END },
  printer: { player: B('t_99d3d2a8612b2259ee00'), text: B('t_5aec79392ffb0ba26e86'), choices: END },
  machine: {
    player: B('t_347010c414033e6a0369'), text: B('t_e3523f54ff55c79c7ead'),
    choices: [[B('t_77ab9f99aa5039739619'), 'maintenance'], [B('t_f4e0ba901bd3ae073e30'), 'ticket'], ...END],
  },
  maintenance: { player: B('t_77ab9f99aa5039739619'), text: B('t_df8c02a4f72642451840'), choices: END },
  ticket: { player: B('t_f4e0ba901bd3ae073e30'), text: B('t_0cde13f037fd5a1a772b'), choices: END },
  goodbye: { text: B('t_d67267305d3cf240847a'), choices: [[B('t_9262fa57013ce584df7a'), null]] },
};
const CSS = `${B('t_594d44405f8a01b59f21')}`;

export function hasCompletedPolicePIQuest(quests = getAcceptedPIQuests()) {
  return Array.isArray(quests) && quests.some(quest =>
    quest !== null && typeof quest === 'object' && quest.status === 'completed');
}

export class PoliceStationScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init() {
    Object.assign(this, {
      disposed: false, navigating: false, runToken: Symbol(KEY), background: null,
      root: null, panel: null, hint: null, styleElement: null, hoverLabel: null, exitButton: null,
      lastCanvasBox: '', returnFocus: null, dialogueVersion: 0, imageBox: null,
      coldCaseUI: null, coldCaseLoading: false, coldCaseAbort: null, stationAmbient: null,
      handledKeys: new WeakSet(), domKeyHandler: null,
    });
    this.spots = [];
    this.hotspotDefs = HOTSPOTS.map(hotspot => ({ ...hotspot }));
    this.visitedNodes = new Set();
  }
  preload() {
    if (!this.textures.exists(BACKGROUND_KEY)) this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
    if (!this.cache.audio.exists(AMBIENT_KEY)) this.load.audio(AMBIENT_KEY, 'assets/audio/police.mp3');
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#151b17');
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.getRegisteredScene('NewsHud')?.closeMenu?.(true);
    this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      if (this.hasScene(key)) this.scene.setVisible(false, key);
    }
    this.events.once('shutdown', this.disposePolice, this);
    this.events.once('destroy', this.disposePolice, this);
    this.createInterface();
    if (this.textures.exists(BACKGROUND_KEY)) {
      this.background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0);
      this.hoverLabel = this.add.text(0, 0, '', {
        fontFamily: 'SpecialElite, monospace', fontSize: '20px', color: '#ffe3a4',
        backgroundColor: '#18201c', padding: { x: 9, y: 6 },
      }).setDepth(100).setVisible(false);
      this.createHotspots();
    } else {
      this.showPanel(B('t_e81364417db7d7841fcb'), B('t_e0a196e7ce126abbf3fa'), [
        [B('t_8213a39963ca25c0184d'), () => void this.leave()],
      ]);
    }
    this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.domKeyHandler = event => this.onKey(event);
    this.root.addEventListener('keydown', this.domKeyHandler);
    this.layout();
    audioManager.init(this);
    this.startStationAudio();
    this.events.on('wake', this.startStationAudio, this);
    this.events.on('resume', this.startStationAudio, this);
    this.events.on('sleep', this.stopStationAudio, this);
    this.events.on('pause', this.stopStationAudio, this);
  }
  startStationAudio() {
    if (this.disposed || this.navigating || !this.sys.isActive()) return;
    audioManager.init(this);
    if (this.stationAmbient?.isPlaying) return;
    if (this.stationAmbient) audioManager.releaseSound(this.stationAmbient);
    this.stationAmbient = audioManager.playAmbient(AMBIENT_KEY, {
      gain: 0.28, volume: audioManager.getSfxVolume() * 0.28, loop: true,
    });
  }
  stopStationAudio() {
    if (this.stationAmbient) audioManager.releaseSound(this.stationAmbient);
    this.stationAmbient = null;
  }
  createInterface() {
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = CSS;
    document.head.appendChild(this.styleElement);
    document.documentElement.classList.add('la-police-active');
    this.root = document.createElement('div');
    this.root.className = 'la-police-ui';
    const top = document.createElement('div');
    top.className = 'police-top';
    const title = document.createElement('div');
    title.className = 'police-title';
    title.textContent = B('t_c47f6a6696545b1f04b9');
    const controls = document.createElement('div');
    controls.className = 'police-controls';
    this.exitButton = this.makeButton(B('t_c4002f3643a1871c17e6'), () => void this.leave());
    controls.append(this.exitButton);
    top.append(title, controls);
    this.hint = document.createElement('div');
    this.hint.className = 'police-hint';
    this.root.append(top, this.hint);
    document.body.appendChild(this.root);
    this.refreshInteraction();
  }
  createHotspots() {
    for (const cfg of this.hotspotDefs) {
      const zone = this.add.zone(0, 0, 1, 1).setOrigin(0).setDepth(10).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        if (!this.canInteract()) return;
        this.hoverLabel.setText(cfg.label).setPosition(zone.x, Math.max(5, zone.y - 36)).setVisible(true);
      });
      zone.on('pointerout', () => this.hoverLabel?.setVisible(false));
      zone.on('pointerdown', () => {
        if (!this.canInteract()) return;
        this.hoverLabel?.setVisible(false);
        if (cfg.id === 'exit') void this.leave();
        else if (cfg.id === 'officer') this.openConversation();
        else this.inspect(cfg.id);
      });
      this.spots.push({ cfg, zone });
    }
  }
  canInteract() {
    return !this.disposed && !this.navigating && !this.panel && !this.coldCaseUI && !this.coldCaseLoading;
  }
  layout() {
    if (this.disposed || !this.root) return;
    const { width, height } = this.scale;
    if (this.background) {
      const source = this.background.texture.getSourceImage();
      const scale = Math.min(width / source.width, height / source.height);
      const w = source.width * scale, h = source.height * scale;
      this.imageBox = { x: (width - w) / 2, y: (height - h) / 2, w, h };
      this.background.setPosition(this.imageBox.x, this.imageBox.y).setDisplaySize(w, h);
      for (const spot of this.spots) this.syncHotspot(spot);
    }
    this.hoverLabel?.setVisible(false);
    const box = this.game.canvas.getBoundingClientRect();
    Object.assign(this.root.style, {
      left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
      fontSize: `${Math.max(14, Math.min(22, box.width / 65))}px`,
    });
    this.refreshInteraction();
  }
  syncHotspot(spot) {
    if (!this.imageBox) return;
    const b = this.imageBox, c = spot.cfg;
    spot.zone.setPosition(b.x + c.x * b.w, b.y + c.y * b.h).setSize(c.w * b.w, c.h * b.h);
    spot.zone.input?.hitArea?.setTo(0, 0, c.w * b.w, c.h * b.h);
  }
  update() {
    if (this.disposed || !this.root) return;
    const box = this.game.canvas.getBoundingClientRect();
    const signature = [box.left, box.top, box.width, box.height].join('/');
    if (signature !== this.lastCanvasBox) {
      this.lastCanvasBox = signature;
      this.layout();
    }
  }
  setHotspotsEnabled(enabled) {
    for (const spot of this.spots) if (spot.zone.input) spot.zone.input.enabled = enabled;
  }
  refreshInteraction() {
    if (this.disposed) return;
    this.setHotspotsEnabled(this.canInteract());
    if (this.hint) {
      this.hint.hidden = Boolean(this.panel || this.coldCaseUI || this.coldCaseLoading);
      this.hint.textContent = B('t_d22eb3a60f7d8db58eb1');
    }
  }
  refreshDebug() { this.refreshInteraction(); }
  onKey(event) {
    if (this.disposed || this.navigating || this.handledKeys?.has(event)) return;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
      event.ctrlKey || event.metaKey || event.altKey) return;
    this.handledKeys?.add(event);
    if (event.code !== 'Escape' && event.key !== 'Escape') return;
    event.preventDefault();
    if (event.repeat) return;
    if (this.coldCaseUI) { this.coldCaseUI.escape(); return; }
    if (this.coldCaseLoading) return;
    if (this.panel) this.closePanel(); else void this.leave();
  }
  makeButton(label, action, version = null) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (this.disposed || this.navigating) return;
      if (version !== null && version !== this.dialogueVersion) return;
      action();
    });
    return button;
  }
  showPanel(title, text, choices, playerLine = '') {
    if (this.disposed || !this.root) return;
    if (!this.panel) this.returnFocus = document.activeElement;
    this.panel?.remove();
    this.hoverLabel?.setVisible(false);
    const version = ++this.dialogueVersion;
    this.panel = document.createElement('section');
    this.panel.className = 'police-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', title);
    const heading = document.createElement('h2');
    heading.textContent = title;
    this.panel.appendChild(heading);
    if (playerLine) {
      const player = document.createElement('p');
      player.className = 'police-player';
      player.textContent = `${B('t_7b1aab937ca83cd9c085')}${playerLine}`;
      this.panel.appendChild(player);
    }
    const response = document.createElement('p');
    response.className = 'police-response';
    response.textContent = text;
    const options = document.createElement('div');
    options.className = 'police-choices';
    for (const [label, action, used = false] of choices) {
      const button = this.makeButton(label, action, version);
      if (used) button.classList.add('police-choice-used');
      options.appendChild(button);
    }
    this.panel.append(response, options);
    this.root.appendChild(this.panel);
    this.refreshInteraction();
    options.querySelector('button')?.focus({ preventScroll: true });
  }
  showOfficerRefusal() {
    if (this.disposed || this.navigating) return;
    this.showPanel(B('t_832bb16aeb9f95e761e9'), B('t_476c4bf2f943c2d6c470'), [
      [B('t_20e85dbfa211ba2eabf0'), () => this.closePanel()],
    ]);
  }
  openConversation() {
    if (!this.canInteract()) return;
    if (!hasCompletedPolicePIQuest()) { this.showOfficerRefusal(); return; }
    this.showDialogue('start');
  }
  showDialogue(id) {
    if (this.disposed || this.navigating || this.coldCaseUI || this.coldCaseLoading) return;
    if (!hasCompletedPolicePIQuest()) { this.showOfficerRefusal(); return; }
    const node = DIALOGUE[id];
    if (!node) return;
    this.visitedNodes.add(id);
    this.showPanel(B('t_832bb16aeb9f95e761e9'), node.text, node.choices.map(([label, target]) => [
      label, () => target === null ? this.closePanel() : this.showDialogue(target),
      target !== null && this.visitedNodes.has(target),
    ]), node.player || '');
    if (!['start', 'topics'].includes(id) || !this.panel) return;
    const choices = this.panel.querySelector('.police-choices');
    if (!choices) return;
    if (!choices.querySelector('[data-cold-case]')) {
      const button = this.makeButton(T('t_05d7c1b8a60634bd05ca'), () => void this.openColdCase(), this.dialogueVersion);
      button.dataset.coldCase = 'true';
      choices.prepend(button);
    }
    addPoliceWorldReactionOption(this, id, { canTalk: hasCompletedPolicePIQuest });
  }
  inspect(id) {
    const observation = OBSERVATIONS[id];
    if (observation) this.showPanel(observation[0], observation[1], [
      [B('t_5ecec84ab0093dde81c8'), () => this.closePanel()],
    ]);
  }
  closePanel() {
    ++this.dialogueVersion;
    this.panel?.remove();
    this.panel = null;
    this.refreshInteraction();
    const focus = this.returnFocus;
    this.returnFocus = null;
    if (focus?.isConnected && focus !== document.body) focus.focus?.({ preventScroll: true });
    else this.exitButton?.focus({ preventScroll: true });
  }
  async openColdCase() {
    if (this.disposed || this.navigating || this.coldCaseUI || this.coldCaseLoading) return;
    if (!hasCompletedPolicePIQuest()) { this.showOfficerRefusal(); return; }
    const token = this.runToken;
    const controller = new AbortController();
    this.coldCaseAbort = controller;
    this.coldCaseLoading = true;
    const isCurrent = () => !this.disposed && this.runToken === token &&
      this.coldCaseAbort === controller && !controller.signal.aborted;
    this.showPanel(T('t_832bb16aeb9f95e761e9'), T('t_781e2a2e6d63abb978cc'), []);
    try {
      const response = await fetch(COLD_CASE_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`Case file: HTTP ${response.status}`);
      const data = await response.json();
      if (!isCurrent()) return;
      this.coldCaseLoading = false;
      this.closePanel();
      this.coldCaseUI = new ColdCaseUI(this, data, () => {
        if (this.disposed || this.runToken !== token) return;
        this.coldCaseUI = null;
        this.refreshDebug();
        this.showDialogue('topics');
      });
      this.refreshDebug();
    } catch (error) {
      if (!isCurrent() || error.name === 'AbortError') return;
      console.error('[ColdCase]', error);
      this.coldCaseLoading = false;
      this.showPanel(T('t_b3b9efed9c4da3133e7b'), T('t_ba150429d84dbbd5aa3b'), [
        [T('t_a0c2cc1374d949943e01'), () => void this.openColdCase()],
        [T('t_4dc8c24acdcd1c8ebb19'), () => this.showDialogue('topics')],
      ]);
    } finally {
      if (this.runToken === token && this.coldCaseAbort === controller) {
        this.coldCaseLoading = false;
        this.coldCaseAbort = null;
        this.refreshInteraction();
      }
    }
  }
  async leave() {
    if (this.coldCaseUI || this.coldCaseLoading || this.disposed || this.navigating) return false;
    this.stopStationAudio();
    this.navigating = true;
    const token = this.runToken;
    this.refreshInteraction();
    this.hoverLabel?.setVisible(false);
    if (this.exitButton) this.exitButton.disabled = true;
    let result = false;
    try {
      result = await this.goto('HomeCityScene', { entryPoint: 'police-station', fromScene: KEY, gameState });
    } catch (error) { console.error('[PoliceStationScene] Navigation failed:', error); }
    if (this.disposed || this.runToken !== token) return result !== false;
    this.navigating = false;
    if (this.exitButton) this.exitButton.disabled = false;
    if (result === false) {
      this.showPanel(B('t_05164cc51845950a84e4'), B('t_cd113bd0b51d4c8d24f3'), [
        [B('t_a0c2cc1374d949943e01'), () => void this.leave()],
        [B('t_28186fe612051fb5a150'), () => this.closePanel()],
      ]);
    }
    this.refreshInteraction();
    if (this.sys.isActive()) this.startStationAudio();
    return result !== false;
  }
  disposePolice() {
    if (this.disposed) return;
    this.disposed = true;
    this.runToken = null;
    ++this.dialogueVersion;
    this.stopStationAudio();
    this.events.off('wake', this.startStationAudio, this);
    this.events.off('resume', this.startStationAudio, this);
    this.events.off('sleep', this.stopStationAudio, this);
    this.events.off('pause', this.stopStationAudio, this);
    this.coldCaseAbort?.abort();
    this.coldCaseAbort = null;
    this.coldCaseLoading = false;
    this.coldCaseUI?.destroy(false);
    this.coldCaseUI = null;
    this.root?.removeEventListener('keydown', this.domKeyHandler);
    this.root?.remove();
    this.styleElement?.remove();
    document.documentElement.classList.remove('la-police-active');
    this.root = null;
    this.panel = null;
    this.hint = null;
    this.exitButton = null;
    this.returnFocus = null;
    this.styleElement = null;
    this.handledKeys = null;
    this.domKeyHandler = null;
    this.events.off('shutdown', this.disposePolice, this);
    this.events.off('destroy', this.disposePolice, this);
  }
}
