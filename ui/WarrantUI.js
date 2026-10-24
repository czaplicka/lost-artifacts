import { saveGameState } from '../gameStatePersistence.js';
import { gameState as globalGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { NOTEBOOK_CONFIG, SCREEN_W, SCREEN_H, RESULT_X, MIN_TRAITS, TRAIT_FIELDS } from './warrant/warrantConfig.js';
import { up, createFx } from './warrant/warrantUtils.js';
import { WarrantSketch } from './warrant/WarrantSketch.js';
import { WarrantResults } from './warrant/WarrantResults.js';

const FONT = NOTEBOOK_CONFIG.FONT_HAND;
const emptyFilters = () => Object.fromEntries(TRAIT_FIELDS.map(([key]) => [key, 0]));

export class WarrantUI {
  constructor(scene, gameState = null) {
    this.scene = scene;
    this.gameState = gameState;
    this.fx = createFx(scene);
    this.isOpen = false;
    this._issued = false;
    this._searching = false;
    this._searchTimers = [];
    this.autoCloseTimer = null;
    this.traitButtons = [];
    this.traitValueTexts = [];
    this.currentFilters = emptyFilters();
    this.traitsData = {};
    this.boundToggleHandler = this.onToggleKeyDown.bind(this);
    this._onEsc = () => this.close();
    this._onEnter = () => this._runSearch();
    this._openKeysBound = false;
    this.initContainer();
    this.bindKeyboardShortcut();
  }

  _sfx(key, volume = 0.5) {
    try { audioManager.playSfx(key, { volume: audioManager.getSfxVolume() * volume }); }
    catch (error) { console.debug('[WarrantUI] Sound unavailable:', key); }
  }

  initContainer() {
    const s = this.scene;
    this.container = s.add.container(0, 0).setDepth(NOTEBOOK_CONFIG.DEPTH).setVisible(false);
    this.overlay = s.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000, 0.6)
      .setOrigin(0).setInteractive().on('pointerdown', () => this.close());
    this.bookGroup = s.add.container(0, 0);
    const bg = s.textures.exists(NOTEBOOK_CONFIG.BACKGROUND_FRAME)
      ? s.add.image(SCREEN_W / 2, SCREEN_H / 2, NOTEBOOK_CONFIG.BACKGROUND_FRAME).setInteractive()
      : s.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, 1800, 1000, 0xf4ebd9).setInteractive();
    const title = s.add.text(SCREEN_W * 0.28, 90, '— SUSPECT SKETCH —', {
      fontFamily: FONT, fontSize: '38px', color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);
    const close = this._makeButton(SCREEN_W * 0.85, 55, '[ X ]', NOTEBOOK_CONFIG.INK_RED, () => this.close());
    this.bookGroup.add([bg, title, close]);
    this.container.add([this.overlay, this.bookGroup]);
    this.sketch = new WarrantSketch(s, this.bookGroup, this.fx);
    this.results = new WarrantResults({
      scene: s, bookGroup: this.bookGroup, fx: this.fx,
      sfx: (key, volume) => this._sfx(key, volume),
      isOpen: () => this.isOpen,
      onIssue: suspect => this.issueWarrant(suspect),
      onClose: () => this.close()
    });
    this.initSearchControls();
  }

  _makeButton(x, y, label, color, callback) {
    const button = this.scene.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '26px', color,
      backgroundColor: '#eae3d2', padding: { x: 12, y: 6 }
    }).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor('#dbcfa9'));
    button.on('pointerout', () => button.setBackgroundColor('#eae3d2'));
    button.on('pointerdown', callback);
    return button;
  }

  initSearchControls() {
    this.statusText = this.scene.add.text(RESULT_X, 135, '', {
      fontFamily: FONT, fontSize: '23px', color: NOTEBOOK_CONFIG.PENCIL_DARK,
      wordWrap: { width: 650 }
    });
    this.searchBtn = this._makeButton(RESULT_X, 210, 'SEARCH RECORDS', NOTEBOOK_CONFIG.INK_BLUE, () => this._runSearch());
    this.resetBtn = this._makeButton(RESULT_X + 280, 210, 'RESET', NOTEBOOK_CONFIG.INK_RED, () => this.resetFilters());
    this.progressGfx = this.scene.add.graphics();
    this.bookGroup.add([this.statusText, this.progressGfx, this.searchBtn, this.resetBtn]);
  }

  _setStatus(text, color = NOTEBOOK_CONFIG.PENCIL_DARK) {
    this.statusText.setText(text).setColor(color);
  }

  _traitLabel(key) {
    const value = this.traitsData[key]?.[this.currentFilters[key]] ?? 'NONE';
    return value === 'NONE' ? '— any —' : String(value);
  }

  buildTraitSelectors() {
    TRAIT_FIELDS.forEach(([key, label], index) => {
      const y = 300 + index * 55;
      const heading = this.scene.add.text(RESULT_X, y, `${label}:`, {
        fontFamily: FONT, fontSize: '26px', color: NOTEBOOK_CONFIG.PENCIL_DARK
      }).setOrigin(0, 0.5);
      const value = this.scene.add.text(RESULT_X + 220, y, this._traitLabel(key), {
        fontFamily: FONT, fontSize: '24px', color: NOTEBOOK_CONFIG.INK_BLUE,
        fixedWidth: 260, align: 'center', padding: { x: 4, y: 2 }
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      value.on('pointerdown', () => this.stepTrait(key, 1, value));
      const left = this.makeArrow(RESULT_X + 180, y, '◄', () => this.stepTrait(key, -1, value));
      const right = this.makeArrow(RESULT_X + 510, y, '►', () => this.stepTrait(key, 1, value));
      this.bookGroup.add([heading, left, value, right]);
      this.traitButtons.push(heading, left, value, right);
      this.traitValueTexts.push({ key, textObj: value });
    });
  }

  makeArrow(x, y, label, callback) {
    return this.scene.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '28px', color: NOTEBOOK_CONFIG.INK_RED
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', callback);
  }

  stepTrait(key, direction, valueText) {
    if (!this.isOpen || this._issued) return;
    this._cancelSearchTimers();
    const list = this.traitsData[key];
    if (!list?.length) return;
    this.currentFilters[key] = (this.currentFilters[key] + direction + list.length) % list.length;
    valueText.setText(this._traitLabel(key));
    this.results.clear();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters, key);
    this._sfx('click_sound', 0.25);
  }

  updateStatusText() {
    const count = Object.values(this.currentFilters).filter(value => value > 0).length;
    const remaining = Math.max(0, MIN_TRAITS - count);
    this._setStatus(remaining
      ? `Select ${remaining} more trait${remaining === 1 ? '' : 's'} to search.\nThen click ISSUE beside a matching suspect.`
      : 'Ready. Search records, then click ISSUE beside a suspect.');
    this.searchBtn.setVisible(!this._issued).setAlpha(remaining ? 0.55 : 1);
    this.resetBtn.setVisible(!this._issued);
  }

  resetFilters() {
    if (this._issued) return;
    this._cancelSearchTimers();
    this.currentFilters = emptyFilters();
    this.traitValueTexts.forEach(({ key, textObj }) => textObj.setText(this._traitLabel(key)));
    this.results.clear();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters);
  }

  open(gameState) {
    if (this.isOpen) return;
    const suspects = this.scene.cache.json.get('suspects');
    if (!Array.isArray(suspects) || !suspects.length) {
      console.error('[WarrantUI] Missing suspects database.');
      return;
    }
    this.gameState = gameState || this.gameState;
    this._issued = false;
    this.isOpen = true;
    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this.clearTraitSelectors();
    this.results.clear();
    this.traitsData = Object.fromEntries(TRAIT_FIELDS.map(([key]) => [key, this.getUniqueValues(suspects, key)]));
    this.currentFilters = emptyFilters();
    this.container.setVisible(true);
    this.fx.kill(this.bookGroup);
    this.fx.kill(this.overlay);
    this.bookGroup.setAlpha(1).setPosition(0, 0);
    this.overlay.setAlpha(1);
    this.buildTraitSelectors();
    this.updateStatusText();
    this.sketch.update(this.traitsData, this.currentFilters);
    this.scene.children.bringToTop(this.container);
    this.scene.scene.bringToTop();
    EventBus.emit('hideHUD');
    this._bindOpenKeys();
    this._sfx('paper_rustle', 0.4);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();
    this.clearTraitSelectors();
    this.results.clear();
    this.container.setVisible(false);
    EventBus.emit('showHUD');
  }

  clearTraitSelectors() {
    this.traitButtons.forEach(object => { this.fx.kill(object); object.destroy(); });
    this.traitButtons = [];
    this.traitValueTexts = [];
  }

  clearAutoCloseTimer() {
    this.autoCloseTimer?.remove(false);
    this.autoCloseTimer = null;
  }

  _cancelSearchTimers() {
    this._searchTimers.forEach(timer => timer?.remove?.(false));
    this._searchTimers = [];
    this._searching = false;
  }

  getUniqueValues(suspects, key) {
    const values = suspects.flatMap(suspect => {
      const value = suspect?.[key];
      return (Array.isArray(value) ? value : [value])
        .filter(item => typeof item === 'string' && item.trim())
        .map(item => item.trim());
    });
    return ['NONE', ...new Set(values.filter(value => up(value) !== 'NONE'))];
  }

  _matchesFilters(suspect) {
    return TRAIT_FIELDS.every(([key]) => {
      const index = this.currentFilters[key];
      if (index <= 0) return true;
      const selected = up(this.traitsData[key][index]);
      const value = suspect?.[key];
      return (Array.isArray(value) ? value : [value]).some(item => up(item) === selected);
    });
  }

  _runSearch() {
    if (!this.isOpen || this._searching || this._issued) return;
    const count = Object.values(this.currentFilters).filter(value => value > 0).length;
    if (count < MIN_TRAITS) { this.updateStatusText(); return; }
    this.executeSearch(this.scene.cache.json.get('suspects') || []);
  }

  executeSearch(suspects) {
    this._cancelSearchTimers();
    this.results.clear();
    this._searching = true;
    this._setStatus('Searching criminal records...');
    const timer = this.scene.time.delayedCall(500, () => {
      this._searching = false;
      if (!this.isOpen) return;
      const matches = suspects.filter(suspect => this._matchesFilters(suspect));
      this.results.show(matches);
      this._setStatus(matches.length
        ? `${matches.length} matching suspect${matches.length === 1 ? '' : 's'}.\nClick [ ISSUE ] beside your chosen suspect.`
        : 'No matches. Check your selected traits.',
        matches.length ? NOTEBOOK_CONFIG.PENCIL_DARK : NOTEBOOK_CONFIG.INK_RED);
    });
    this._searchTimers.push(timer);
  }

  issueWarrant(suspect) {
    if (!this.isOpen || this._issued || !suspect) return;
    const state = this.gameState || this.scene.gameState || globalGameState;
    this._issued = true;
    this._cancelSearchTimers();
    state.arrestWarrantIssued = true;
    state.warrantSuspectName = suspect.name ?? null;
    state.warrantSuspectId = suspect.id ?? null;
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

  _bindOpenKeys() {
    const keyboard = this.scene.input?.keyboard;
    if (!keyboard || this._openKeysBound) return;
    keyboard.on('keydown-ESC', this._onEsc);
    keyboard.on('keydown-ENTER', this._onEnter);
    this._openKeysBound = true;
  }

  _unbindOpenKeys() {
    this.scene.input?.keyboard?.off('keydown-ESC', this._onEsc);
    this.scene.input?.keyboard?.off('keydown-ENTER', this._onEnter);
    this._openKeysBound = false;
  }

  bindKeyboardShortcut() {
    const keyboard = this.scene.input?.keyboard;
    keyboard?.addCapture('W');
    keyboard?.on('keydown-W', this.boundToggleHandler);
  }

  onToggleKeyDown(event) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    event.preventDefault();
    if (event.repeat) return;
    if (this.isOpen) this.close();
    else this.open(this.gameState || this.scene.gameState);
  }

  destroy() {
    this.close();
    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();
    const keyboard = this.scene.input?.keyboard;
    keyboard?.off('keydown-W', this.boundToggleHandler);
    keyboard?.removeCapture('W');
    this.clearTraitSelectors();
    this.results?.clear();
    this.sketch?.destroy();
    this.fx.kill(this.overlay);
    this.fx.kill(this.bookGroup);
    this.container?.destroy(true);
    this.container = null;
  }
}
