// ui/WarrantUI.js
import { saveGameState } from '../gameStatePersistence.js';
import { gameState as globalGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';

import {
  NOTEBOOK_CONFIG,
  SCREEN_W,
  SCREEN_H,
  RESULT_X,
  MIN_TRAITS,
  TRAIT_FIELDS
} from './warrant/warrantConfig.js';
import { hashString, mulberry32, up, createFx } from './warrant/warrantUtils.js';
import { WarrantSketch } from './warrant/WarrantSketch.js';
import { WarrantResults } from './warrant/WarrantResults.js';

const FONT = NOTEBOOK_CONFIG.FONT_HAND;

const emptyFilters = () => ({
  gender: 0,
  race: 0,
  hair: 0,
  eyes: 0,
  accent: 0,
  features: 0
});

const emptyTraits = () => ({
  gender: ['NONE'],
  race: ['NONE'],
  hair: ['NONE'],
  eyes: ['NONE'],
  accent: ['NONE'],
  features: ['NONE']
});

export class WarrantUI {
  constructor(scene, gameState = null) {
    this.scene = scene;
    this.gameState = gameState;
    this.fx = createFx(scene);

    this.isOpen = false;
    this.autoCloseTimer = null;
    this.boundToggleHandler = this.onToggleKeyDown.bind(this);

    this._onEsc = () => this.close();
    this._onEnter = () => {
      if (this.isOpen && !this._issued && this.searchBtn?.visible) this._runSearch();
    };
    this._openKeysBound = false;

    this._searchTimers = [];
    this._searching = false;
    this._issued = false;

    this.traitButtons = [];
    this.traitValueTexts = [];
    this.traitMarks = new Map();

    this.currentFilters = emptyFilters();
    this.traitsData = emptyTraits();

    this.initContainer();
    this.bindKeyboardShortcut();
  }

  // ─── Dźwięk ───────────────────────────────────────────────────────────────

  // Przez AudioManager: respektuje wyciszenie i głośność SFX.
  _sfx(key, volume = 0.5, overlap = false) {
    try {
      audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * volume,
        overlap
      });
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }
  }

  // ─── Budowa kontenera ─────────────────────────────────────────────────────

  initContainer() {
    const s = this.scene;

    this.container = s.add.container(0, 0)
      .setDepth(NOTEBOOK_CONFIG.DEPTH)
      .setVisible(false);

    this.overlay = s.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Wszystko poza overlayem siedzi w bookGroup, żeby notes mógł "wjechać".
    this.bookGroup = s.add.container(0, 0);

    let notebookBg;

    if (s.textures.exists(NOTEBOOK_CONFIG.BACKGROUND_FRAME)) {
      notebookBg = s.add.image(SCREEN_W / 2, SCREEN_H / 2, NOTEBOOK_CONFIG.BACKGROUND_FRAME)
        .setInteractive();
    } else {
      notebookBg = s.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, 1800, 1000, 0xf4ebd9)
        .setStrokeStyle(4, 0xd3c4a9)
        .setInteractive();
    }

    const titleText = s.add.text(SCREEN_W * 0.28, 90, '— SUSPECT SKETCH —', {
      fontFamily: FONT,
      fontSize: '38px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);

    const closeBtn = s.add.text(SCREEN_W * 0.85, 55, '[ X ]', {
      fontFamily: FONT,
      fontSize: '36px',
      color: NOTEBOOK_CONFIG.INK_RED
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setColor('#ff0000'))
      .on('pointerout', () => closeBtn.setColor(NOTEBOOK_CONFIG.INK_RED))
      .on('pointerdown', () => this.close());

    this.bookGroup.add([notebookBg, titleText, closeBtn]);
    this.container.add([this.overlay, this.bookGroup]);

    this.sketch = new WarrantSketch(s, this.bookGroup, this.fx);

    this.results = new WarrantResults({
      scene: s,
      bookGroup: this.bookGroup,
      fx: this.fx,
      sfx: (key, volume) => this._sfx(key, volume),
      isOpen: () => this.isOpen,
      onIssue: (suspect) => this.issueWarrant(suspect),
      onClose: () => this.close()
    });

    this.initSearchControls();
  }

  _makeButton(x, y, label, color, onClick) {
    const btn = this.scene.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize: '28px',
      color,
      backgroundColor: '#eae3d2',
      padding: { x: 16, y: 6 }
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#dbcfa9'));
    btn.on('pointerout', () => btn.setBackgroundColor('#eae3d2'));
    btn.on('pointerdown', onClick);

    return btn;
  }

  initSearchControls() {
    const s = this.scene;

    this.statusText = s.add.text(RESULT_X, 150, 'Select at least 3 traits to query registry...', {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#555555'
    });

    // Odręczne podkreślenie postępu pod statusem (3 cechy = pełna kreska).
    this.progressGfx = s.add.graphics();

    this.searchBtn = this._makeButton(
      RESULT_X, 200, '✒ SEARCH', NOTEBOOK_CONFIG.INK_BLUE, () => this._runSearch()
    ).setVisible(false);

    this.resetBtn = this._makeButton(
      RESULT_X + 180, 200, '✖ RESET', NOTEBOOK_CONFIG.INK_RED, () => this.resetFilters()
    );

    this.bookGroup.add([this.statusText, this.progressGfx, this.searchBtn, this.resetBtn]);
  }

  _setStatus(text, color) {
    this.statusText.setText(text).setColor(color);
  }

  _updateProgress(count) {
    const g = this.progressGfx;
    if (!g) return;

    g.clear();
    if (count <= 0) return;

    const ratio = Math.min(count, MIN_TRAITS) / MIN_TRAITS;
    const len = 300 * ratio;
    const ready = count >= MIN_TRAITS;

    g.lineStyle(4, ready ? 0xa92a2a : 0x1e3d59, 0.7);
    g.beginPath();

    for (let px = 0; px <= len; px += 6) {
      const py = 190 + Math.sin(px * 0.09) * 1.6;

      if (px === 0) g.moveTo(RESULT_X + px, py);
      else g.lineTo(RESULT_X + px, py);
    }

    g.strokePath();
  }

  // ─── Selektory cech ───────────────────────────────────────────────────────

  _traitLabel(key) {
    const v = this.traitsData[key]?.[this.currentFilters[key]] ?? 'NONE';
    return v === 'NONE' ? '— any —' : String(v);
  }

  // Odręcznie "zakreślona" wybrana wartość.
  _drawTraitMark(key) {
    const mark = this.traitMarks.get(key);
    if (!mark?.gfx?.scene) return;

    const { gfx } = mark;
    this.fx.kill(gfx);
    gfx.clear();

    const idx = this.currentFilters[key];
    if (idx <= 0) return;

    const rng = mulberry32(hashString(`${key}:${idx}`));
    const rx = 128;
    const ry = 21;
    const steps = 44;

    gfx.lineStyle(3, 0xa92a2a, 0.7);
    gfx.beginPath();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = -0.4 + t * Math.PI * 2 * 1.07; // lekki "overshoot" jak przy zakreślaniu długopisem
      const j = 1 + (rng() - 0.5) * 0.06;
      const px = Math.cos(a) * rx * j;
      const py = Math.sin(a) * ry * j;

      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }

    gfx.strokePath();

    gfx.setScale(0.8, 1).setAlpha(0);
    this.fx.tween({ targets: gfx, scaleX: 1, alpha: 1, duration: 160, ease: 'Sine.easeOut' });
  }

  buildTraitSelectors() {
    const startX = RESULT_X;
    const startY = 280;
    const rowGap = 55;

    this.traitValueTexts = [];
    this.traitMarks.clear();

    TRAIT_FIELDS.forEach(([key, label], index) => {
      const y = startY + index * rowGap;

      const markGfx = this.scene.add.graphics().setPosition(startX + 350, y);
      this.traitMarks.set(key, { gfx: markGfx });

      const labelTxt = this.scene.add.text(startX, y, `${label}:`, {
        fontFamily: FONT,
        fontSize: '26px',
        color: NOTEBOOK_CONFIG.PENCIL_DARK
      }).setOrigin(0, 0.5);

      const valTxt = this.scene.add.text(startX + 220, y, this._traitLabel(key), {
        fontFamily: FONT,
        fontSize: '24px',
        color: NOTEBOOK_CONFIG.INK_BLUE,
        padding: { x: 4, y: 2 },
        fixedWidth: 260,
        align: 'center'
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

      // Klik w wartość = następna opcja.
      valTxt.on('pointerdown', () => this.stepTrait(key, 1, valTxt));

      const leftBtn = this.makeArrow(startX + 180, y, '◄', () => this.stepTrait(key, -1, valTxt));
      const rightBtn = this.makeArrow(startX + 500, y, '►', () => this.stepTrait(key, 1, valTxt));

      this.bookGroup.add([markGfx, labelTxt, leftBtn, valTxt, rightBtn]);
      this.traitButtons.push(markGfx, labelTxt, leftBtn, valTxt, rightBtn);
      this.traitValueTexts.push({ key, textObj: valTxt });
    });
  }

  makeArrow(x, y, symbol, callback) {
    const arrow = this.scene.add.text(x, y, symbol, {
      fontFamily: FONT,
      fontSize: '26px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    arrow.on('pointerover', () => arrow.setColor(NOTEBOOK_CONFIG.INK_RED));
    arrow.on('pointerout', () => arrow.setColor(NOTEBOOK_CONFIG.PENCIL_DARK));
    arrow.on('pointerdown', () => {
      this.fx.kill(arrow);
      arrow.setScale(1.35);
      this.fx.tween({ targets: arrow, scale: 1, duration: 140, ease: 'Back.easeOut' });
      callback();
    });

    return arrow;
  }

  stepTrait(key, direction, valueText) {
    if (!this.isOpen || this._issued) return;

    this._cancelSearchTimers();

    const list = this.traitsData[key];
    this.currentFilters[key] =
      (this.currentFilters[key] + direction + list.length) % list.length;

    valueText.setText(this._traitLabel(key));
    this.fx.kill(valueText);
    valueText.setScale(1.1);
    this.fx.tween({ targets: valueText, scale: 1, duration: 120, ease: 'Sine.easeOut' });

    this._drawTraitMark(key);
    this.results.clear();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters, key);
    this._sfx('click_sound', 0.25, true);
  }

  updateStatusText() {
    const count = Object.values(this.currentFilters).filter((v) => v > 0).length;
    const ready = count >= MIN_TRAITS;

    this._setStatus(
      ready
        ? `Traits selected: ${count} (Ready to search)`
        : `Traits selected: ${count} (At least 3 traits required)`,
      ready ? NOTEBOOK_CONFIG.PENCIL_DARK : NOTEBOOK_CONFIG.PENCIL_FAINT
    );

    this.searchBtn.setVisible(ready && !this._issued);
    this._updateProgress(count);
  }

  resetFilters() {
    this._cancelSearchTimers();
    if (this._issued) return;

    this.currentFilters = emptyFilters();

    this.traitValueTexts.forEach(({ key, textObj }) => {
      textObj.setText(this._traitLabel(key));
      this._drawTraitMark(key);
    });

    this.results.clear();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters);
    this._sfx('paper_rustle', 0.3);
  }

  // ─── Otwieranie / zamykanie ───────────────────────────────────────────────

  open(gameState) {
    if (this.isOpen) return;

    const suspectsData = this.scene.cache.json.get('suspects');
    if (!Array.isArray(suspectsData) || suspectsData.length === 0) return;

    this.isOpen = true;
    this._issued = false;
    this._searching = false;
    EventBus.emit('hideHUD');
    this.gameState = gameState || this.gameState;

    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this.clearTraitSelectors();
    this.results.clear();

    this.container.setVisible(true);
    this.resetBtn.setVisible(true); // po wystawieniu nakazu był ukryty na stałe

    this.traitsData = {};
    TRAIT_FIELDS.forEach(([key]) => {
      this.traitsData[key] = this.getUniqueValues(suspectsData, key);
    });

    this.currentFilters = emptyFilters();

    this.buildTraitSelectors();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters);
    this._bindOpenKeys();

    // Notes "wjeżdża" na biurko.
    this.fx.kill(this.overlay);
    this.fx.kill(this.bookGroup);
    this.overlay.setAlpha(0);
    this.bookGroup.setAlpha(0).setY(50);

    this.fx.tween({ targets: this.overlay, alpha: 1, duration: 160 });
    this.fx.tween({ targets: this.bookGroup, alpha: 1, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    this._sfx('paper_rustle', 0.4);
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this._searching = false;
    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();
    EventBus.emit('showHUD');

    const finish = () => {
      // Jeśli w międzyczasie ktoś otworzył UI ponownie, nie ruszamy go.
      if (this.isOpen || !this.container?.scene) return;
      this.clearTraitSelectors();
      this.results.clear();
      this.container.setVisible(false);
    };

    this.fx.kill(this.overlay);
    this.fx.kill(this.bookGroup);

    this.fx.tween({ targets: this.overlay, alpha: 0, duration: 140 });
    const t = this.fx.tween({
      targets: this.bookGroup,
      alpha: 0,
      y: 30,
      duration: 140,
      ease: 'Cubic.easeIn',
      onComplete: finish
    });

    if (!t) finish();
  }

  clearTraitSelectors() {
    this.traitButtons.forEach((obj) => {
      this.fx.kill(obj);
      obj.destroy();
    });

    this.traitButtons = [];
    this.traitValueTexts = [];
    this.traitMarks.clear();
  }

  clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove(false);
      this.autoCloseTimer = null;
    }
  }

  _cancelSearchTimers() {
    this._searchTimers.forEach((t) => t?.remove?.(false));
    this._searchTimers = [];
    this._searching = false;
  }

  // ─── Dane ─────────────────────────────────────────────────────────────────

  getUniqueValues(suspects, key) {
    const values = suspects.flatMap((suspect) => {
      const value = suspect?.[key];

      if (Array.isArray(value)) {
        return value.filter(Boolean).map((v) => String(v).trim());
      }

      if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
      }

      return [];
    });

    return ['NONE', ...new Set(values)];
  }

  // ─── Wyszukiwanie ─────────────────────────────────────────────────────────

  _runSearch() {
    if (!this.isOpen || this._searching || this._issued) return;

    const suspectsData = this.scene.cache.json.get('suspects') || [];
    this.executeSearch(suspectsData);
  }

  _matchesFilters(suspect) {
    return Object.keys(this.currentFilters).every((key) => {
      const idx = this.currentFilters[key];
      if (idx <= 0) return true;

      const selected = up(this.traitsData[key][idx]);
      const value = suspect?.[key];

      return Array.isArray(value)
        ? value.some((v) => up(v) === selected)
        : up(value) === selected;
    });
  }

  executeSearch(suspectsData) {
    this._cancelSearchTimers();
    this.results.clear();

    this._searching = true;
    this._sfx('paper_rustle', 0.35);

    const base = 'Searching criminal records';
    let dots = 0;
    this._setStatus(base, NOTEBOOK_CONFIG.INK_BLUE);

    const ticker = this.scene.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4;
        this.statusText.setText(base + '.'.repeat(dots));
      }
    });

    // Chwila "przeszukiwania akt" - bez niej wynik wyskakuje zbyt sucho.
    const finish = this.scene.time.delayedCall(900, () => {
      ticker.remove(false);
      this._searching = false;
      if (!this.isOpen) return;

      const matches = suspectsData.filter((s) => this._matchesFilters(s));

      this.results.show(matches);

      if (matches.length) {
        this._setStatus(`MATCHING SUSPECTS: ${matches.length}`, NOTEBOOK_CONFIG.PENCIL_DARK);
      } else {
        this._setStatus('SEARCH COMPLETED (0 MATCHES)', NOTEBOOK_CONFIG.INK_RED);
      }
    });

    this._searchTimers.push(ticker, finish);
  }

  // ─── Nakaz aresztowania ───────────────────────────────────────────────────

  issueWarrant(suspect) {
    if (this._issued || !suspect) return;

    const state = this.gameState || this.scene.gameState || globalGameState;
    if (!state) return;

    this._issued = true;
    this._cancelSearchTimers();

    state.arrestWarrantIssued = true;
    state.warrantSuspectName = suspect?.name ?? null;
    state.warrantSuspectId = suspect?.id ?? null;
    saveGameState();

    this.clearAutoCloseTimer();
    this.results.clear();
    this.searchBtn.setVisible(false);
    this.resetBtn.setVisible(false);
    this.statusText.setText('');
    this.progressGfx.clear();

    this.results.showWarrant(suspect);

    this.autoCloseTimer = this.scene.time.delayedCall(4200, () => this.close());
  }

  // ─── Klawiatura ───────────────────────────────────────────────────────────

  _bindOpenKeys() {
    const kb = this.scene.input?.keyboard;
    if (!kb || this._openKeysBound) return;

    kb.on('keydown-ESC', this._onEsc);
    kb.on('keydown-ENTER', this._onEnter);
    this._openKeysBound = true;
  }

  _unbindOpenKeys() {
    if (!this._openKeysBound) return;

    const kb = this.scene.input?.keyboard;
    kb?.off('keydown-ESC', this._onEsc);
    kb?.off('keydown-ENTER', this._onEnter);
    this._openKeysBound = false;
  }

  bindKeyboardShortcut() {
    if (!this.scene.input?.keyboard) return;

    this.scene.input.keyboard.addCapture('W');
    this.scene.input.keyboard.on('keydown-W', this.boundToggleHandler);
  }

  onToggleKeyDown(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    e.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open(this.gameState || this.scene.gameState);
    }
  }

  // ─── Sprzątanie ───────────────────────────────────────────────────────────

  destroy() {
    // HUD przywracamy tylko, jeśli UI faktycznie go schowało.
    if (this.isOpen) EventBus.emit('showHUD');
    this.isOpen = false;

    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();

    const kb = this.scene.input?.keyboard;

    if (kb) {
      kb.off('keydown-W', this.boundToggleHandler);
      kb.removeCapture('W');
    }

    this.clearTraitSelectors();
    this.results?.clear();

    this.fx.kill(this.overlay);
    this.fx.kill(this.bookGroup);
    this.sketch?.killAll();

    this.container?.destroy(true);
    this.container = null;
    this.overlay = null;
    this.bookGroup = null;
  }
}