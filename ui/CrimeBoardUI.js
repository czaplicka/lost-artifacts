import { initCrimeBoard } from '../CrimeBoardInit.js';
import { EventBus } from '../EventBus.js';
import { syncCrimeBoardSuspects } from '../crimeBoard/BoardSuspects.js';
import { installBoardWorkspace, savedBoard } from '../crimeBoard/BoardWorkspace.js';
import { installCaseTheory } from '../crimeBoard/CaseTheory.js';

const ALLOWED_SCENES = new Set(['OfficeScene', 'HotelScene']);

export class CrimeBoardUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.isDestroyed = false;
    this.boardApi = null;
    this.templateHtml = null;
    this.disabledScenesInput = [];
    this._openToken = 0;
    this._activeGameState = null;
    this._hudHidden = false;
    this.boundEscHandler = this.onKeyDown.bind(this);
    this.boundOverlayClickHandler = this.onOverlayClick.bind(this);
    this.boundCloseClickHandler = () => this.close();
    this.createOverlay();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'crime-board-ui-overlay';
    this.overlay.innerHTML = `<div class="crime-board-ui-modal">
      <button type="button" class="crime-board-ui-close">Close</button>
      <div class="crime-board-ui-root"></div></div>`;
    document.body.appendChild(this.overlay);
    this.modal = this.overlay.querySelector('.crime-board-ui-modal');
    this.root = this.overlay.querySelector('.crime-board-ui-root');
    this.closeBtn = this.overlay.querySelector('.crime-board-ui-close');
    this.closeBtn.addEventListener('click', this.boundCloseClickHandler);
    this.overlay.addEventListener('click', this.boundOverlayClickHandler);
  }

  canOpen() {
    if (this.isDestroyed || !this.scene) return false;
    if (typeof this.scene.isCrimeBoardAvailable === 'function') return this.scene.isCrimeBoardAvailable() === true;
    return ALLOWED_SCENES.has(this.scene.sys?.settings?.key);
  }

  isTypingInTextField() {
    const el = document.activeElement;
    return Boolean(['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable);
  }

  onOverlayClick(event) {
    if (event.target === this.overlay) this.close();
  }

  async loadTemplate() {
    if (this.templateHtml) return this.templateHtml;
    const url = new URL('../crime-board.html', import.meta.url).toString();
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load crime-board.html: ${response.status}`);
    const html = await response.text();
    if (!html.includes('id="crime-board"')) throw new Error('Missing #crime-board in crime-board.html.');
    this.templateHtml = html;
    return html;
  }

  async open(gameState = null) {
    if (!this.canOpen()) return false;
    if (this.isOpen) return true;
    const token = ++this._openToken;
    this._activeGameState = gameState || this.scene.gameState || this.scene.playerMenu?.gameState || {};
    this.isOpen = true;
    this.overlay.classList.add('is-open');
    this.disableUnderlyingScenesInput();
    document.addEventListener('keydown', this.boundEscHandler);
    this._hudHidden = true;
    EventBus.emit('hideHUD');
    let pendingApi = null;
    try {
      const html = await this.loadTemplate();
      if (this.isDestroyed || !this.isOpen || token !== this._openToken) return false;
      if (!this.canOpen()) { this.close(); return false; }
      this.root.innerHTML = html;
      const state = this._activeGameState;
      const saved = savedBoard(state);
      const api = await initCrimeBoard({ root: this.root, gameState: state, data: saved });
      pendingApi = api;
      if (this.isDestroyed || !this.isOpen || token !== this._openToken) {
        api.board?.destroy?.(); api.destroy?.(); return false;
      }
      syncCrimeBoardSuspects(api, state);
      const refresh = api.refresh.bind(api);
      api.refresh = (nextState = state) => {
        refresh(nextState);
        syncCrimeBoardSuspects(api, nextState);
        return api.getData();
      };
      installBoardWorkspace(api, state, saved);
      installCaseTheory(api, state, this.root);
      this.boardApi = api;
      pendingApi = null;
      if (!this.canOpen()) { this.close(); return false; }
      return true;
    } catch (error) {
      if (pendingApi) { pendingApi.destroy?.(); pendingApi.board?.destroy?.(); }
      if (this.isDestroyed || token !== this._openToken) return false;
      console.error('CrimeBoardUI open failed:', error);
      this.close(); return false;
    }
  }

  close() {
    if (!this.isOpen) return;
    this._openToken++;
    try { this.saveToGameState(); } catch (e) { console.error('CrimeBoardUI save failed:', e); }
    const api = this.boardApi;
    this.boardApi = null;
    try { api?.destroy?.(); } catch (e) { console.error('CrimeBoardUI cleanup failed:', e); }
    if (this.root) this.root.innerHTML = '';
    this.isOpen = false;
    this._activeGameState = null;
    this.overlay?.classList.remove('is-open');
    this.enableUnderlyingScenesInput();
    document.removeEventListener('keydown', this.boundEscHandler);
    if (this._hudHidden) { this._hudHidden = false; EventBus.emit('showHUD'); }
  }

  toggle(gameState = null) {
    if (this.isDestroyed) return false;
    if (this.isOpen) { this.close(); return false; }
    return this.open(gameState);
  }

  onKeyDown(event) {
    if (event.defaultPrevented || event.key !== 'Escape' || !this.isOpen || this.isDestroyed) return;
    if (document.querySelector('dialog[open]')) return;
    if (this.isTypingInTextField()) event.stopPropagation();
    event.preventDefault(); this.close();
  }

  saveToGameState() {
    const state = this._activeGameState || this.scene?.gameState || this.scene?.playerMenu?.gameState;
    if (!state || !this.boardApi?.getData) return;
    this.boardApi.saveWorkspace?.();
    state.crimeBoardData = this.boardApi.getData();
  }

  disableUnderlyingScenesInput() {
    if (this.disabledScenesInput.length) return;
    this.scene.scene.manager.getScenes(true).forEach(scene => {
      if (scene === this.scene) return;
      this.disabledScenesInput.push({ scene, inputEnabled: scene.input?.enabled,
        keyboardEnabled: scene.input?.keyboard?.enabled });
      if (scene.input) scene.input.enabled = false;
      if (scene.input?.keyboard) scene.input.keyboard.enabled = false;
    });
  }

  enableUnderlyingScenesInput() {
    const records = this.disabledScenesInput;
    this.disabledScenesInput = [];
    records.forEach(({ scene, inputEnabled, keyboardEnabled }) => {
      if (!scene?.sys || !scene.scene?.manager) return;
      if (scene.input && inputEnabled !== undefined) scene.input.enabled = inputEnabled;
      if (scene.input?.keyboard && keyboardEnabled !== undefined) scene.input.keyboard.enabled = keyboardEnabled;
    });
  }

  destroy() {
    if (this.isDestroyed) return;
    this.close(); this.isDestroyed = true; this._openToken++;
    document.removeEventListener('keydown', this.boundEscHandler);
    this.enableUnderlyingScenesInput();
    this.closeBtn?.removeEventListener('click', this.boundCloseClickHandler);
    this.overlay?.removeEventListener('click', this.boundOverlayClickHandler);
    this.overlay?.remove();
    this.overlay = this.modal = this.root = this.closeBtn = this.boardApi = this.scene = null;
    this._activeGameState = null;
    this.disabledScenesInput = [];
  }
}
