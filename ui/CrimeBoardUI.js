import { initCrimeBoard } from '../CrimeBoardInit.js';
import { EventBus } from '../EventBus.js';

export class CrimeBoardUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.overlay = null;
        this.modal = null;
        this.root = null;
        this.closeBtn = null;
        this.boardApi = null;
        this.templateHtml = null;
        this.disabledScenesInput = [];

        this.boundEscHandler = this.onKeyDown.bind(this);
        this.boundToggleHandler = this.onToggleKeyDown.bind(this);
        this.boundOverlayClickHandler = this.onOverlayClick.bind(this);
        this.boundCloseClickHandler = () => this.close();

        this.createOverlay();
        this.bindKeyboardShortcut();
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

    onOverlayClick(event) {
        if (event.target === this.overlay) {
            this.close();
        }
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('C');
        this.scene.input.keyboard.on('keydown-C', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping) return;

        event.preventDefault();
        this.toggle();
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
            console.error(
                'CrimeBoardUI: fetched template does not contain #crime-board. Raw response:',
                html.slice(0, 300)
            );
            throw new Error('CrimeBoardUI: crime-board.html template is missing #crime-board root element.');
        }

        this.templateHtml = html;
        return this.templateHtml;
    }

    async open(gameState = null) {
        if (this.isOpen) return;

        const state = gameState || this.scene.playerMenu?.gameState || this.scene.gameState || {};

        this.isOpen = true;
        EventBus.emit('hideHUD');
        this.overlay.classList.add('is-open');
        this.disableUnderlyingScenesInput();

        try {
            const html = await this.loadTemplate();
            this.root.innerHTML = html;

            this.boardApi = await initCrimeBoard({
                root: this.root,
                gameState: state,
                data: state?.crimeBoardData || null
            });

            document.addEventListener('keydown', this.boundEscHandler);
        } catch (error) {
            console.error('CrimeBoardUI open failed:', error);
            this.root.innerHTML = '';
            this.overlay.classList.remove('is-open');
            this.isOpen = false;
            this.boardApi = null;
            this.enableUnderlyingScenesInput();
        }
    }

    close() {
        if (!this.isOpen) return;

        this.saveToGameState();

        if (this.boardApi?.destroy) {
            this.boardApi.destroy();
        }

        this.boardApi = null;

        if (this.root) {
            this.root.innerHTML = '';
        }

        this.isOpen = false;
        EventBus.emit('showHUD');
        this.overlay.classList.remove('is-open');

        this.enableUnderlyingScenesInput();
        document.removeEventListener('keydown', this.boundEscHandler);
    }

    toggle(gameState = null) {
        if (this.isOpen) {
            this.close();
            return;
        }

        this.open(gameState);
    }

    onKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (event.key === 'Escape') {
            if (isTyping) {
                event.stopPropagation();
            }
            this.close();
        }
    }

    saveToGameState() {
        const targetState = this.scene.playerMenu?.gameState || this.scene.gameState;
        if (!targetState || !this.boardApi?.getData) return;

        targetState.crimeBoardData = this.boardApi.getData();
    }

    disableUnderlyingScenesInput() {
        this.disabledScenesInput = [];

        const activeScenes = this.scene.scene.manager.getScenes(true);

        activeScenes.forEach(scene => {
            if (scene.scene.key === this.scene.scene.key) return;

            const record = {
                scene,
                inputEnabled: scene.input ? scene.input.enabled : null,
                keyboardEnabled: scene.input?.keyboard ? scene.input.keyboard.enabled : null
            };

            if (scene.input) {
                scene.input.enabled = false;
            }

            if (scene.input?.keyboard) {
                scene.input.keyboard.enabled = false;
            }

            this.disabledScenesInput.push(record);
        });
    }

    enableUnderlyingScenesInput() {
        this.disabledScenesInput.forEach(record => {
            const { scene, inputEnabled, keyboardEnabled } = record;

            if (!scene?.scene?.manager) return;

            if (scene.input && inputEnabled !== null) {
                scene.input.enabled = inputEnabled;
            }

            if (scene.input?.keyboard && keyboardEnabled !== null) {
                scene.input.keyboard.enabled = keyboardEnabled;
            }
        });

        this.disabledScenesInput = [];
    }

    destroy() {
        EventBus.emit('showHUD');
        document.removeEventListener('keydown', this.boundEscHandler);

        if (this.boardApi?.destroy) {
            this.boardApi.destroy();
        }

        this.boardApi = null;
        this.enableUnderlyingScenesInput();

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-C', this.boundToggleHandler);
        }

        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.boundCloseClickHandler);
        }

        if (this.overlay) {
            this.overlay.removeEventListener('click', this.boundOverlayClickHandler);
        }

        if (this.overlay?.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        if (this.root) {
            this.root.innerHTML = '';
        }

        this.overlay = null;
        this.modal = null;
        this.root = null;
        this.closeBtn = null;
        this.disabledScenesInput = [];
        this.isOpen = false;
    }
}