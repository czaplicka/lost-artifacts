import { initCrimeBoard } from '../CrimeBoardInit.js';
import { EventBus } from '../EventBus.js';
import { syncCrimeBoardSuspects } from '../crimeBoard/BoardSuspects.js';

const ALLOWED_SCENES = new Set(['OfficeScene', 'HotelScene']);

export class CrimeBoardUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isDestroyed = false;
        this.overlay = null;
        this.modal = null;
        this.root = null;
        this.closeBtn = null;
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
        this.overlay.innerHTML = `
            <div class="crime-board-ui-modal">
                <button type="button" class="crime-board-ui-close">Close</button>
                <div class="crime-board-ui-root"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        this.modal = this.overlay.querySelector('.crime-board-ui-modal');
        this.root = this.overlay.querySelector('.crime-board-ui-root');
        this.closeBtn = this.overlay.querySelector('.crime-board-ui-close');
        this.closeBtn.addEventListener('click', this.boundCloseClickHandler);
        this.overlay.addEventListener('click', this.boundOverlayClickHandler);
    }

    canOpen() {
        if (this.isDestroyed || !this.scene) return false;
        if (typeof this.scene.isCrimeBoardAvailable === 'function') {
            return this.scene.isCrimeBoardAvailable() === true;
        }
        return ALLOWED_SCENES.has(this.scene.sys?.settings?.key);
    }

    isTypingInTextField() {
        const element = document.activeElement;
        return Boolean(element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' ||
            element?.tagName === 'SELECT' || element?.isContentEditable);
    }

    onOverlayClick(event) {
        if (event.target === this.overlay) this.close();
    }

    async loadTemplate() {
        if (this.templateHtml) return this.templateHtml;
        const templateUrl = new URL('../crime-board.html', import.meta.url).toString();
        const response = await fetch(templateUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Could not load crime-board.html: ${response.status} (${templateUrl})`);
        }
        const html = await response.text();
        if (!html.includes('id="crime-board"')) {
            console.error('CrimeBoardUI: template does not contain #crime-board. Raw response:', html.slice(0, 300));
            throw new Error('CrimeBoardUI: crime-board.html template is missing #crime-board root element.');
        }
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
        try {
            const html = await this.loadTemplate();
            if (this.isDestroyed || !this.isOpen || token !== this._openToken) return false;
            if (!this.canOpen()) { this.close(); return false; }
            this.root.innerHTML = html;
            const state = this._activeGameState;
            const api = await initCrimeBoard({
                root: this.root, gameState: state, data: state.crimeBoardData || null
            });
            if (this.isDestroyed || !this.isOpen || token !== this._openToken) {
                api?.destroy?.(); return false;
            }
            this.boardApi = api;
            syncCrimeBoardSuspects(api, state);
            const refresh = api.refresh.bind(api);
            api.refresh = (nextState = state) => {
                refresh(nextState);
                syncCrimeBoardSuspects(api, nextState);
                return api.getData();
            };
            if (!this.canOpen()) { this.close(); return false; }
            return true;
        } catch (error) {
            if (this.isDestroyed || token !== this._openToken) return false;
            console.error('CrimeBoardUI open failed:', error);
            this.close();
            return false;
        }
    }

    close() {
        if (!this.isOpen) return;
        this._openToken++;
        try { this.saveToGameState(); }
        catch (error) { console.error('CrimeBoardUI save failed:', error); }
        const api = this.boardApi;
        this.boardApi = null;
        try { api?.destroy?.(); }
        catch (error) { console.error('CrimeBoardUI cleanup failed:', error); }
        if (this.root) this.root.innerHTML = '';
        this.isOpen = false;
        this._activeGameState = null;
        this.overlay?.classList.remove('is-open');
        this.enableUnderlyingScenesInput();
        document.removeEventListener('keydown', this.boundEscHandler);
        if (this._hudHidden) {
            this._hudHidden = false;
            EventBus.emit('showHUD');
        }
    }

    toggle(gameState = null) {
        if (this.isDestroyed) return false;
        if (this.isOpen) { this.close(); return false; }
        return this.open(gameState);
    }

    onKeyDown(event) {
        if (event.key !== 'Escape' || !this.isOpen || this.isDestroyed) return;
        if (this.isTypingInTextField()) event.stopPropagation();
        event.preventDefault();
        this.close();
    }

    saveToGameState() {
        const targetState = this._activeGameState || this.scene?.gameState || this.scene?.playerMenu?.gameState;
        if (!targetState || !this.boardApi?.getData) return;
        targetState.crimeBoardData = this.boardApi.getData();
    }

    disableUnderlyingScenesInput() {
        if (this.disabledScenesInput.length > 0) return;
        const activeScenes = this.scene.scene.manager.getScenes(true);
        activeScenes.forEach(scene => {
            if (scene === this.scene) return;
            const record = {
                scene, inputEnabled: scene.input ? scene.input.enabled : null,
                keyboardEnabled: scene.input?.keyboard ? scene.input.keyboard.enabled : null
            };
            if (scene.input) scene.input.enabled = false;
            if (scene.input?.keyboard) scene.input.keyboard.enabled = false;
            this.disabledScenesInput.push(record);
        });
    }

    enableUnderlyingScenesInput() {
        const records = this.disabledScenesInput;
        this.disabledScenesInput = [];
        records.forEach(record => {
            const { scene, inputEnabled, keyboardEnabled } = record;
            if (!scene?.sys || !scene.scene?.manager) return;
            if (scene.input && inputEnabled !== null) scene.input.enabled = inputEnabled;
            if (scene.input?.keyboard && keyboardEnabled !== null) scene.input.keyboard.enabled = keyboardEnabled;
        });
    }

    destroy() {
        if (this.isDestroyed) return;
        this.close();
        this.isDestroyed = true;
        this._openToken++;
        document.removeEventListener('keydown', this.boundEscHandler);
        this.enableUnderlyingScenesInput();
        this.closeBtn?.removeEventListener('click', this.boundCloseClickHandler);
        this.overlay?.removeEventListener('click', this.boundOverlayClickHandler);
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.root = null;
        this.closeBtn = null;
        this.boardApi = null;
        this._activeGameState = null;
        this.disabledScenesInput = [];
        this.isOpen = false;
        this.scene = null;
    }
}
