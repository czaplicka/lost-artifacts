// =============================================================================
// ShootingRangeScene.js - Holloway's Range (hometown). A cheap practice range:
// pay $3 at the counter, get 45 seconds and a revolver, shoot paper rings and
// cardboard thugs, leave the cardboard civilians alone.
//
// Lobby / results live here; the round itself is in shootingRange/ShootingRangeRound.js.
// Stats persist in gameState.shootingRange (best score, best accuracy, rounds).
// Graphics: see shootingRange/ShootingRangeData.js (IMAGES) - all optional.
// =============================================================================
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { moneyManager, ECONOMY_CATEGORY, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { KEY, W, H, FONT, ROUND, IMAGES, ASSET_DIR, SARGE, rankFor } from './shootingRange/ShootingRangeData.js';
import { ensureRangeTextures } from './shootingRange/ShootingRangeArt.js';
import { preloadRangeAudio, playRangeSound } from './shootingRange/ShootingRangeAudio.js';
import { shootingRangeRound } from './shootingRange/ShootingRangeRound.js';

// files that 404'd once are not requested again this session
const FAILED = new Set();
const memory = { visits: 0, greet: 0, after: 0 };
const PANEL = { x: 880, y: 512, w: 980, h: 545 };
// lobby.webp layout: the counter top's back edge is at y~662, ammo boxes rise to y~600
const SARGE_SPOT = { x: 690, y: 40, scale: 0.9 };
const COUNTER_FRONT = [[470, 662, W - 470, H - 662], [820, 598, 300, 64]];

export class ShootingRangeScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  preload() {
    this.load.on('loaderror', file => { if (String(file?.key || '').startsWith('range_')) FAILED.add(file.key); });
    for (const spec of Object.values(IMAGES)) {
      if (!this.textures.exists(spec.key) && !FAILED.has(spec.key)) this.load.image(spec.key, `${ASSET_DIR}/${spec.key.replace('range_', '')}.webp`);
    }
    preloadRangeAudio(this, FAILED);
  }

  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#120f0c');
    Object.assign(this, { mode: 'lobby', leaving: false, _rangeDisposed: false, lobbyLayer: null, resultsLayer: null, roundObjects: [], targets: [] });
    ensureRangeTextures(this);
    this.hideAgencyHud();
    this.input.mouse?.disableContextMenu();
    this.trackInputEvent(this.input, 'pointerdown', this.onPointerDown);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.hudTick = this.time.addEvent({ delay: 500, loop: true, callback: () => this.hideAgencyHud() });
    this.events.once('shutdown', this.disposeRange, this);
    this.events.once('destroy', this.disposeRange, this);
    memory.visits += 1;
    this.openLobby(memory.visits === 1 ? SARGE.greetFirst : SARGE.greet[memory.greet++ % SARGE.greet.length]);
  }

  update(time, delta) {
    if (this.mode === 'round' && !this.leaving) this.updateRound(time, Math.min(delta, 100));
  }

  hideAgencyHud() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      hud.closeAllUIPanels?.(); hud.closeMenu?.(true); hud.setHudVisible?.(false);
      if (this.isSceneActive(key)) this.sleepSceneIfActive(key);
      this.scene.setVisible(false, key);
    }
  }

  // ----------------------------------------------------------------- stats --
  stats() {
    const s = gameState.shootingRange;
    return s?.version === 1 ? s : { version: 1, bestScore: 0, bestAccuracy: 0, rounds: 0, shots: 0, hits: 0 };
  }

  saveStats(round) {
    const s = { ...this.stats() };
    const isBest = round.score > s.bestScore;
    s.rounds += 1; s.shots += round.shots; s.hits += round.hits;
    s.bestScore = Math.max(s.bestScore, round.score);
    s.bestAccuracy = Math.max(s.bestAccuracy, round.accuracy);
    gameState.shootingRange = s;
    if (gameState.isGameActive) requestAutosave();
    return isBest;
  }

  // ----------------------------------------------------------------- lobby --
  openLobby(line) {
    this.clearRound(); this.clearResults(); this.clearLobby();
    this.mode = 'lobby';
    const L = this.lobbyLayer = this.add.container(0, 0).setDepth(10);
    L.add(this.add.image(0, 0, IMAGES.lobby.key).setOrigin(0).setDisplaySize(W, H));
    // Holloway stands behind the counter: re-draw the counter (and the boxes on it) over her.
    L.add(this.add.image(SARGE_SPOT.x, SARGE_SPOT.y, IMAGES.sarge.key).setOrigin(0.5, 0).setScale(SARGE_SPOT.scale));
    for (const [x, y, w, h] of COUNTER_FRONT) L.add(this.add.image(0, 0, IMAGES.lobby.key).setOrigin(0).setCrop(x, y, w, h));
    L.add(this.add.rectangle(SARGE_SPOT.x, 990, 360, 54, 0x1c140e, 0.9).setStrokeStyle(2, 0xd4af37));
    L.add(this.add.text(SARGE_SPOT.x, 990, SARGE.name, { fontFamily: FONT.body, fontSize: '24px', color: '#f2e6b0' }).setOrigin(0.5));

    const P = PANEL;
    L.add(this.add.rectangle(P.x, P.y, P.w, P.h, 0x1c140e, 0.93).setOrigin(0).setStrokeStyle(3, 0xd4af37));
    this.lineText = this.add.text(P.x + 34, P.y + 28, '', { fontFamily: FONT.body, fontSize: '25px', color: '#efe3c0', lineSpacing: 6, wordWrap: { width: P.w - 68 } });
    L.add(this.lineText);

    const s = this.stats();
    const acc = s.shots ? Math.round(s.hits / s.shots * 100) : 0;
    L.add(this.add.text(P.x + 34, P.y + 222, `BEST ${s.bestScore}   ·   BEST ACCURACY ${s.bestAccuracy}%   ·   ROUNDS ${s.rounds}   ·   LIFETIME ${acc}%`,
      { fontFamily: FONT.body, fontSize: '19px', color: '#c9b98d' }));

    const buy = `Buy a round  -  $${ROUND.price}   (${ROUND.seconds}s, reloads free)`;
    this.button(L, P.x + 34, P.y + 268, P.w - 68, 58, buy, () => this.buyRound(), { primary: true });
    SARGE.topics.forEach((topic, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      this.button(L, P.x + 34 + col * ((P.w - 68) / 2 + 6), P.y + 340 + row * 64, (P.w - 68) / 2 - 6, 54, topic.label, () => this.sayLine(topic.text));
    });
    this.button(L, P.x + 34, P.y + 478, 240, 54, 'Leave', () => this.leave());
    this.cashText = this.add.text(P.x + P.w - 34, P.y + 505, '', { fontFamily: FONT.body, fontSize: '22px', color: '#f2e6b0' }).setOrigin(1, 0.5);
    L.add(this.cashText);
    this.refreshCash();
    this.sayLine(line);
  }

  clearLobby() { this.lobbyLayer?.destroy(true); this.lobbyLayer = null; this.lineText = null; this.cashText = null; }

  sayLine(text) { if (this.lineText?.active) this.lineText.setText(text); }

  refreshCash() { this.cashText?.active && this.cashText.setText(`Cash: $${moneyManager.getBalance(MONEY_SOURCE.CASH)}`); }

  buyRound() {
    if (this.leaving) return;
    let paid;
    try {
      paid = moneyManager.spend(ROUND.price, { source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM,
        description: "Holloway's Range - one round", metadata: { location: 'shooting-range' } });
    } catch (error) { console.error('[ShootingRange] payment failed:', error); paid = { ok: false }; }
    if (!paid.ok) {
      playRangeSound(this, 'buzz');
      if (this.mode === 'lobby') { this.sayLine(SARGE.broke); this.refreshCash(); }
      else this.resultsNote?.active && this.resultsNote.setText(SARGE.broke);
      return;
    }
    this.startRound();
  }

  // --------------------------------------------------------------- results --
  finishRound() {
    if (this.mode !== 'round') return;
    const accuracy = this.shots ? Math.round(this.hits / this.shots * 100) : 0;
    const round = { score: this.score, shots: this.shots, hits: this.hits, bulls: this.bulls, civilians: this.civilians, accuracy };
    const isBest = this.saveStats(round) && round.score > 0;
    this.clearRound();
    this.mode = 'results';
    this.input.setDefaultCursor('default');
    const R = this.resultsLayer = this.add.container(0, 0).setDepth(300);
    R.add(this.add.image(0, 0, IMAGES.lanes.key).setOrigin(0).setDisplaySize(W, H));
    R.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0));
    const cx = W / 2, top = 170, cw = 860, ch = 740;
    R.add(this.add.rectangle(cx, top + ch / 2, cw, ch, 0xefe3c0).setStrokeStyle(4, 0x6f5236));
    R.add(this.add.text(cx, top + 50, 'SCORE SHEET', { fontFamily: FONT.pixel, fontSize: '26px', color: '#5a3f28' }).setOrigin(0.5));
    const rank = rankFor(round.score);
    R.add(this.add.text(cx, top + 120, rank.toUpperCase(), { fontFamily: FONT.body, fontSize: '50px', color: '#a3342a' }).setOrigin(0.5));
    if (isBest) R.add(this.add.text(cx, top + 172, '- NEW PERSONAL BEST -', { fontFamily: FONT.pixel, fontSize: '16px', color: '#b8862e' }).setOrigin(0.5));
    const rows = [['Score', round.score], ['Accuracy', `${accuracy}%  (${round.hits}/${round.shots})`], ['Bullseyes', round.bulls], ['Civilians hit', round.civilians]];
    rows.forEach(([k, v], i) => {
      const y = top + 230 + i * 50;
      R.add(this.add.text(cx - 300, y, k, { fontFamily: FONT.body, fontSize: '28px', color: '#3a2d22' }));
      R.add(this.add.text(cx + 300, y, String(v), { fontFamily: FONT.body, fontSize: '28px', color: k === 'Civilians hit' && v ? '#a3342a' : '#3a2d22' }).setOrigin(1, 0));
    });
    const pool = SARGE.after[rank];
    const quote = `"${pool[memory.after++ % pool.length]}${round.civilians ? ` ${SARGE.civilianHit}` : ''}"`;
    this.resultsNote = this.add.text(cx, top + 470, quote, { fontFamily: FONT.body, fontSize: '23px', color: '#5a3f28', align: 'center', wordWrap: { width: cw - 100 } }).setOrigin(0.5, 0);
    R.add(this.resultsNote);
    R.add(this.add.text(cx, top + 590, `- ${SARGE.name}`, { fontFamily: FONT.body, fontSize: '19px', color: '#7a6248' }).setOrigin(0.5, 0));
    this.button(R, cx - 400, top + ch - 90, 390, 60, `Another round  -  $${ROUND.price}`, () => this.buyRound(), { primary: true });
    this.button(R, cx + 10, top + ch - 90, 390, 60, 'Back to the counter', () => this.openLobby(SARGE.greet[memory.greet++ % SARGE.greet.length]));
  }

  clearResults() { this.resultsLayer?.destroy(true); this.resultsLayer = null; this.resultsNote = null; }

  // ----------------------------------------------------------------- input --
  onPointerDown(pointer) {
    if (this.mode !== 'round' || this.leaving) return;
    if (pointer.rightButtonDown()) this.reload(); else this.shoot();
  }

  onKey(event) {
    if (this.leaving) return;
    const k = event.key;
    if (this.mode === 'round') {
      if (k === 'r' || k === 'R') this.reload();
      else if (k === 'Escape') this.finishRound();
    } else if (k === 'Escape') {
      if (this.mode === 'results') this.openLobby(SARGE.greet[memory.greet++ % SARGE.greet.length]);
      else this.leave();
    } else if (k === 'Enter' && this.mode !== 'round') this.buyRound();
  }

  // --------------------------------------------------------------- widgets --
  button(layer, x, y, w, h, label, onClick, { primary = false } = {}) {
    const base = primary ? 0x7a2a1e : 0x3a2b1f, hover = primary ? 0x9c3a29 : 0x56402c;
    const bg = this.add.rectangle(x, y, w, h, base).setOrigin(0).setStrokeStyle(2, primary ? 0xf2c46a : 0xb8975e)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x + w / 2, y + h / 2, label, { fontFamily: FONT.body, fontSize: primary ? '26px' : '21px', color: '#f6ead0',
      align: 'center', wordWrap: { width: w - 20 } }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(hover));
    bg.on('pointerout', () => bg.setFillStyle(base));
    bg.on('pointerup', () => { if (!this.leaving) { playRangeSound(this, 'empty'); onClick(); } });
    layer.add([bg, text]);
    return bg;
  }

  // ----------------------------------------------------------------- leave --
  async leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.clearRound();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'shooting-range' });
    if (moved === false && !this._cleanupDone) { this.leaving = false; this.sayLine('The door is stuck. Holloway shrugs: "Try again."'); }
  }

  disposeRange() {
    if (this._rangeDisposed) return;
    this._rangeDisposed = true;
    this.hudTick?.remove(false); this.hudTick = null;
    this.clearRound(); this.clearResults(); this.clearLobby();
    this.input?.setDefaultCursor('default');
  }
}

Object.assign(ShootingRangeScene.prototype, shootingRangeRound);
