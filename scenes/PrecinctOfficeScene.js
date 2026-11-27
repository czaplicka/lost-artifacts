// Detective bureau behind the police station's staff door. Sergeant Walter
// Quill hands out line-up cases (see systems/precinct) as a chain with ranks,
// cash and trust rewards.
//
// Placeholder art: reuses the police station interior, tinted, until the
// bureau background and the sergeant portrait exist.

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { audioManager } from '../managers/AudioManager.js';
import { PrecinctCaseBoardUI } from '../ui/PrecinctCaseBoardUI.js';
import { createDomExitButton } from '../ui/ExitImageButton.js';
import {
  PRECINCT_NPC_ID,
  PRECINCT_MAX_MISTAKES,
  PRECINCT_RANKS,
  getPrecinctSummary,
} from '../systems/precinct/PrecinctCaseService.js';

const KEY = 'PrecinctOfficeScene';
const DIALOGUE_DEPTH = 30000;
const BACKGROUND_KEY = 'home-police';
const BACKGROUND_URL = 'assets/pi/police/home-police.webp';
const AMBIENT_KEY = 'sfx_home_police_ambient';

const SERGEANT_NAME = 'Sgt. Walter Quill';
const SERGEANT_ROLE = 'Detective Bureau · Line-ups';

const HOTSPOTS = [
  { id: 'sergeant', label: SERGEANT_NAME, x: 0.698, y: 0.401, w: 0.094, h: 0.190 },
  { id: 'board', label: 'Line-up board', x: 0.220, y: 0.286, w: 0.161, h: 0.202 },
  { id: 'exit', label: 'Back to the front desk', x: 0.906, y: 0.191, w: 0.089, h: 0.688 },
  { id: 'bench', label: 'Interview bench', x: 0.177, y: 0.537, w: 0.220, h: 0.224 },
  { id: 'clock', label: 'Bureau clock', x: 0.710, y: 0.239, w: 0.065, h: 0.117 },
];

const OBSERVATIONS = {
  board: ['Line-up board', 'Photos, pins and red string. Every face on it has an alibi, and most of the alibis are lies.'],
  bench: ['Interview bench', 'Worn smooth by a thousand nervous suspects. Someone carved "I DIDN\'T DO IT" into the armrest.'],
  clock: ['Bureau clock', 'Seven minutes fast. Quill says it keeps the suspects nervous.'],
};

const CSS = `
.la-precinct-ui{position:fixed;pointer-events:none;z-index:20;font-family:SpecialElite,'Courier New',monospace;color:#efe4c8}
.la-precinct-ui > *{pointer-events:auto}
.precinct-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;
  padding:.45em .9em;background:linear-gradient(#0d110fdd,#0d110f00)}
.precinct-title{color:#ffe3a4;letter-spacing:.08em}
.precinct-top button{font:inherit;background:#2a332d;color:#efe4c8;border:1px solid #8a6d2c;border-radius:.3em;padding:.3em .8em;cursor:pointer}
.precinct-hint{position:absolute;bottom:.6em;left:50%;transform:translateX(-50%);background:#0d110fcc;padding:.3em .9em;border-radius:.3em;font-size:.8em;pointer-events:none;white-space:nowrap}
`;

export class PrecinctOfficeScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init() {
    this.disposed = false;
    this.navigating = false;
    this.runToken = Symbol(KEY);
    this.spots = [];
    this.panel = null;
    this.board = null;
    this.dialogue = null;
    this.imageBox = null;
    this.lastCanvasBox = '';
    this.ambient = null;
    this.dialogueVersion = 0;
  }

  preload() {
    if (!this.textures.exists(BACKGROUND_KEY)) this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
    if (!this.cache.audio.exists(AMBIENT_KEY)) this.load.audio(AMBIENT_KEY, 'assets/audio/police.mp3');
  }

  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#101512');

    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.getRegisteredScene('NewsHud')?.closeMenu?.(true);
    this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      if (this.hasScene(key)) this.scene.setVisible(false, key);
    }

    this.events.once('shutdown', this.disposePrecinct, this);
    this.events.once('destroy', this.disposePrecinct, this);

    this.createInterface();
    this.dialogue = new HomeTownDialogue(this, () => this.finishPanelClose());

    if (this.textures.exists(BACKGROUND_KEY)) {
      // Cooler, darker tint so the bureau does not read as the front lobby.
      this.background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0).setTint(0x8a9bb0);
      this.hoverLabel = this.add.text(0, 0, '', {
        fontFamily: 'SpecialElite, monospace', fontSize: '20px', color: '#ffe3a4',
        backgroundColor: '#18201c', padding: { x: 9, y: 6 },
      }).setDepth(100).setVisible(false);
      this.createHotspots();
    }

    this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.layout();

    audioManager.init(this);
    this.startAudio();
    this.events.on('wake', this.startAudio, this);
    this.events.on('resume', this.startAudio, this);
    this.events.on('sleep', this.stopAudio, this);
    this.events.on('pause', this.stopAudio, this);

    if (!this.precinctState().met) this.time.delayedCall(250, () => this.talk());
  }

  precinctState() {
    const s = gameState.precinctCases;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      gameState.precinctCases = { version: 1, solved: 0, perfect: 0, active: null };
    }
    return gameState.precinctCases;
  }

  // ------------------------------------------------------------------ audio

  startAudio() {
    if (this.disposed || this.navigating || !this.sys.isActive() || this.ambient?.isPlaying) return;
    if (this.ambient) audioManager.releaseSound(this.ambient);
    this.ambient = audioManager.playAmbient(AMBIENT_KEY, {
      gain: 0.2, volume: audioManager.getSfxVolume() * 0.2, loop: true,
    });
  }

  stopAudio() {
    if (this.ambient) audioManager.releaseSound(this.ambient);
    this.ambient = null;
  }

  // -------------------------------------------------------------- interface

  createInterface() {
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = CSS;
    document.head.appendChild(this.styleElement);

    this.root = document.createElement('div');
    this.root.className = 'la-precinct-ui';

    this.topBar = document.createElement('div');
    this.topBar.className = 'precinct-top';
    const title = document.createElement('div');
    title.className = 'precinct-title';
    title.textContent = 'DETECTIVE BUREAU';
    this.exitButton = createDomExitButton(() => void this.leave(), { label: 'Back to the front desk' });
    this.topBar.append(title, this.exitButton);

    this.hint = document.createElement('div');
    this.hint.className = 'precinct-hint';
    this.hint.textContent = 'Talk to Sergeant Quill for line-up cases.';

    this.root.append(this.topBar, this.hint);
    document.body.appendChild(this.root);
  }

  createHotspots() {
    for (const cfg of HOTSPOTS) {
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
        else if (cfg.id === 'sergeant') this.talk();
        else this.inspect(cfg.id);
      });
      this.spots.push({ cfg, zone });
    }
  }

  canInteract() {
    return !this.disposed && !this.navigating && !this.panel && !this.board;
  }

  // PIInventoryUI hides its button while the scene reports a modal.
  get modal() {
    return this.board;
  }

  refreshInteraction() {
    if (this.disposed) return;
    const enabled = this.canInteract();
    for (const spot of this.spots) if (spot.zone.input) spot.zone.input.enabled = enabled;
    const busy = Boolean(this.panel || this.board);
    if (this.topBar) this.topBar.style.visibility = busy ? 'hidden' : '';
    if (this.hint) this.hint.hidden = busy;
  }

  layout() {
    if (this.disposed || !this.root) return;
    const { width, height } = this.scale;
    if (this.background) {
      const src = this.background.texture.getSourceImage();
      const scale = Math.min(width / src.width, height / src.height);
      const w = src.width * scale;
      const h = src.height * scale;
      this.imageBox = { x: (width - w) / 2, y: (height - h) / 2, w, h };
      this.background.setPosition(this.imageBox.x, this.imageBox.y).setDisplaySize(w, h);
      for (const { cfg, zone } of this.spots) {
        const b = this.imageBox;
        zone.setPosition(b.x + cfg.x * b.w, b.y + cfg.y * b.h).setSize(cfg.w * b.w, cfg.h * b.h);
        zone.input?.hitArea?.setTo(0, 0, cfg.w * b.w, cfg.h * b.h);
      }
    }
    this.hoverLabel?.setVisible(false);
    const box = this.game.canvas.getBoundingClientRect();
    Object.assign(this.root.style, {
      left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
      fontSize: `${Math.max(14, Math.min(22, box.width / 65))}px`,
    });
    this.dialogue?.root?.setDepth(DIALOGUE_DEPTH);
    this.dialogue?.panel?.blocker?.setDepth(DIALOGUE_DEPTH - 1);
    this.refreshInteraction();
  }

  update() {
    if (this.disposed || !this.root) return;
    const box = this.game.canvas.getBoundingClientRect();
    const sig = [box.left, box.top, box.width, box.height].join('/');
    if (sig !== this.lastCanvasBox) {
      this.lastCanvasBox = sig;
      this.layout();
    }
  }

  onKey(event) {
    if (this.disposed || this.navigating || this.panel || this.board) return;
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault?.();
      if (!event.repeat) void this.leave();
    }
  }

  // --------------------------------------------------------------- dialogue

  showPanel(title, text, choices, { npc = false, nodeId, playerLine = '' } = {}) {
    if (this.disposed || !this.dialogue || this.dialogue.destroyed) return;
    this.hoverLabel?.setVisible(false);
    const version = ++this.dialogueVersion;
    const messages = [];
    if (playerLine) messages.push({ speaker: 'player', text: playerLine });
    messages.push({ speaker: npc ? 'npc' : 'note', text });
    this.panel = this.dialogue.show({
      title,
      role: npc ? SERGEANT_ROLE : '',
      text,
      messages,
      npcId: npc ? PRECINCT_NPC_ID : null,
      showTrust: npc,
      nodeId: nodeId || `precinct:${title}`,
      choices: choices.map(choice => ({
        attitude: 'neutral',
        ...choice,
        action: () => {
          if (this.disposed || this.navigating || this.dialogueVersion !== version) return;
          return choice.action?.();
        },
      })),
    });
    this.dialogue?.root?.setDepth(DIALOGUE_DEPTH);
    this.dialogue?.panel?.blocker?.setDepth(DIALOGUE_DEPTH - 1);
    this.refreshInteraction();
  }

  sergeant(nodeId, text, choices, playerLine = '') {
    this.showPanel(SERGEANT_NAME, text, choices, { npc: true, nodeId, playerLine });
  }

  closePanel() {
    this.dialogue?.close(false);
    this.finishPanelClose();
  }

  finishPanelClose() {
    ++this.dialogueVersion;
    this.panel = null;
    if (!this.disposed) this.refreshInteraction();
  }

  inspect(id) {
    const [title, text] = OBSERVATIONS[id] || [];
    if (!title) return;
    this.showPanel(title, text, [{ id: 'precinct_inspect_close', label: 'Step back', action: () => this.closePanel() }]);
  }

  talk(playerLine = '') {
    const state = this.precinctState();
    if (!state.met) {
      this.sergeant('precinct_intro',
        'So the front desk let you through. Walter Quill, detective bureau. We pull in a room full of people, '
        + 'every one of them talks, and some of them are crooks. You sort out who is who. '
        + 'Accuse the wrong person three times and the case is thrown out. Interested?',
        [
          {
            id: 'precinct_intro_nice', label: 'Happy to help the bureau, Sergeant.', attitude: 'nice',
            action: () => { state.met = true; requestAutosave(); this.talk('Happy to help the bureau, Sergeant.'); },
          },
          {
            id: 'precinct_intro_neutral', label: 'Depends what it pays.',
            action: () => { state.met = true; requestAutosave(); this.talk('Depends what it pays.'); },
          },
        ], playerLine);
      return;
    }
    const s = getPrecinctSummary();
    const greeting = s.solved === 0
      ? 'Right. Let\'s see what you are made of.'
      : `${s.rank.title}. ${s.solved} case${s.solved === 1 ? '' : 's'} closed so far. What do you need?`;
    this.sergeant('precinct_hub', greeting, [
      { id: 'precinct_ask_case', label: s.hasActive ? 'Back to the open file.' : 'Got a case for me?', action: () => this.offerCase() },
      { id: 'precinct_ask_rules', label: 'How do the line-ups work?', action: () => this.explain() },
      { id: 'precinct_ask_rank', label: 'Where do I stand?', action: () => this.standing() },
      { id: 'precinct_bye', label: 'That\'s all for now.', action: () => this.closePanel() },
    ], playerLine);
  }

  offerCase() {
    const s = getPrecinctSummary();
    const text = s.hasActive
      ? `Case #${s.caseNumber} is still on my desk. Pick up where you left off.`
      : `Case #${s.caseNumber}. ${s.briefing} ${s.size} line-up, ${s.criminals} crooks among them. `
        + `Pays $${s.pay}, half again if you make no wrong calls.`;
    this.sergeant(`precinct_offer_${s.caseNumber}`, text, [
      { id: 'precinct_open_board', label: 'Open the file.', action: () => this.openBoard() },
      { id: 'precinct_offer_back', label: 'Not just yet.', action: () => this.talk() },
    ]);
  }

  explain() {
    this.sergeant('precinct_rules',
      'Everyone starts as a face on the board. Stamp someone innocent and they give a statement; innocents always tell the truth. '
      + 'Stamp a crook and you get their charge sheet, nothing more. Never guess: there is always someone the statements already prove. '
      + `"Around me" counts diagonals too. ${PRECINCT_MAX_MISTAKES} wrong calls and the case is thrown out. Stuck? I can sell you a tip-off.`,
      [{ id: 'precinct_rules_back', label: 'Understood.', action: () => this.talk() }]);
  }

  standing() {
    const s = getPrecinctSummary();
    const ladder = PRECINCT_RANKS.map(r => `${r.title} (${r.at})`).join(' › ');
    const next = s.rank.next
      ? `${s.rank.next.at - s.solved} more to make ${s.rank.next.title}.`
      : 'There is no rank above yours in this bureau.';
    this.sergeant('precinct_standing',
      `${s.rank.title}: ${s.solved} closed, ${s.perfect} without a wrong call. ${next} Ranks: ${ladder}.`,
      [{ id: 'precinct_standing_back', label: 'Good to know.', action: () => this.talk() }]);
  }

  openBoard() {
    if (this.disposed || this.board) return;
    this.closePanel();
    this.board = new PrecinctCaseBoardUI(this, result => {
      this.board = null;
      if (this.disposed) return;
      this.refreshInteraction();
      if (result?.promotion) {
        this.sergeant('precinct_promotion',
          `Well, well. As of today you are ${result.promotion.title}. Don't let it go to your head.`,
          [{ id: 'precinct_promotion_ok', label: 'Thank you, Sergeant.', attitude: 'nice', action: () => this.talk() }]);
      } else if (result) {
        this.sergeant('precinct_praise', result.perfect
          ? 'Not one wrong call. The lads are starting a betting pool on you.'
          : 'Got them all. A few bruised egos along the way, but the file is closed.',
          [{ id: 'precinct_praise_ok', label: 'What\'s next?', action: () => this.talk() }]);
      }
    });
    this.refreshInteraction();
  }

  // ------------------------------------------------------------- navigation

  async leave() {
    if (this.disposed || this.navigating || this.board) return false;
    this.stopAudio();
    this.navigating = true;
    this.refreshInteraction();
    const token = this.runToken;
    let result = false;
    try {
      result = await this.goto('PoliceStationScene', { fromScene: KEY, gameState });
    } catch (error) {
      console.error('[PrecinctOfficeScene] Navigation failed:', error);
    }
    if (this.disposed || this.runToken !== token) return result !== false;
    this.navigating = false;
    this.refreshInteraction();
    if (result === false) {
      this.showPanel('Door stuck', 'The door to the front desk will not open right now.', [
        { id: 'precinct_retry_exit', label: 'Try again', action: () => { this.closePanel(); void this.leave(); } },
        { id: 'precinct_stay', label: 'Stay here', action: () => this.closePanel() },
      ]);
    }
    if (this.sys.isActive()) this.startAudio();
    return result !== false;
  }

  disposePrecinct() {
    if (this.disposed) return;
    this.disposed = true;
    this.runToken = null;
    ++this.dialogueVersion;
    this.stopAudio();
    this.events.off('wake', this.startAudio, this);
    this.events.off('resume', this.startAudio, this);
    this.events.off('sleep', this.stopAudio, this);
    this.events.off('pause', this.stopAudio, this);
    this.board?.destroy(false);
    this.board = null;
    this.dialogue?.destroy();
    this.dialogue = null;
    this.root?.remove();
    this.styleElement?.remove();
    this.root = null;
    this.topBar = null;
    this.hint = null;
    this.exitButton = null;
    this.spots = [];
    this.events.off('shutdown', this.disposePrecinct, this);
    this.events.off('destroy', this.disposePrecinct, this);
  }
}
