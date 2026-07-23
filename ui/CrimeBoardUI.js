import { initCrimeBoard } from '../CrimeBoardInit.js';

export class CrimeBoardUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.overlay = null;
        this.modal = null;
        this.root = null;
        this.boardApi = null;
        this.templateHtml = null;
        this.boundEscHandler = this.onKeyDown.bind(this);

        this.ensureRuntimeStyles();
        this.createOverlay();
    }

    ensureRuntimeStyles() {
        if (document.getElementById('crime-board-ui-runtime-styles')) return;

        const style = document.createElement('style');
        style.id = 'crime-board-ui-runtime-styles';
        style.textContent = `
            .crime-board-ui-overlay {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(4, 10, 18, 0.78);
                backdrop-filter: blur(7px);
                z-index: 9999;
                pointer-events: auto;
            }

            .crime-board-ui-overlay.is-open {
                display: flex;
            }

            .crime-board-ui-modal {
                position: relative;
                width: min(1500px, 96vw);
                height: min(920px, 94vh);
                border-radius: 18px;
                overflow: hidden;
                border: 1px solid rgba(150, 208, 255, 0.16);
                box-shadow:
                    0 24px 60px rgba(0,0,0,0.42),
                    0 0 0 1px rgba(255,255,255,0.03);
                background: #08111b;
            }

            .crime-board-ui-close {
                position: absolute;
                top: 14px;
                right: 14px;
                z-index: 60;
                border: 1px solid rgba(167, 218, 255, 0.14);
                background: rgba(66, 125, 181, 0.18);
                color: #f3fbff;
                padding: 10px 14px;
                border-radius: 10px;
                font: 600 13px/1 sans-serif;
                cursor: pointer;
            }

            .crime-board-ui-close:hover {
                background: rgba(66, 125, 181, 0.34);
            }

            .crime-board-ui-root {
                width: 100%;
                height: 100%;
            }
        `;
        document.head.appendChild(style);
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

        const closeBtn = this.overlay.querySelector('.crime-board-ui-close');
        closeBtn.addEventListener('click', () => this.close());

        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.close();
            }
        });
    }

    async loadTemplate() {
        if (this.templateHtml) return this.templateHtml;

        const response = await fetch('crime-board.html');
        if (!response.ok) {
            throw new Error(`Could not load crime-board.html (${response.status})`);
        }

        this.templateHtml = await response.text();
        return this.templateHtml;
    }

    async open(gameState = null) {
        if (this.isOpen) return;

        const state = gameState || this.scene.playerMenu?.gameState || this.scene.gameState || {};

        this.isOpen = true;
        this.overlay.classList.add('is-open');

        const html = await this.loadTemplate();
        this.root.innerHTML = html;

        this.boardApi = await initCrimeBoard({
            root: this.root,
            gameState: state,
            data: state.crimeBoardData || null
        });

        this.disableUnderlyingScenesInput();
        document.addEventListener('keydown', this.boundEscHandler);
    }

    close() {
        if (!this.isOpen) return;

        this.saveToGameState();

        if (this.boardApi?.destroy) {
            this.boardApi.destroy();
        }

        this.boardApi = null;
        this.root.innerHTML = '';

        this.isOpen = false;
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
        if (event.key === 'Escape') {
            this.close();
        }
    }

    saveToGameState() {
        const targetState = this.scene.playerMenu?.gameState || this.scene.gameState;
        if (!targetState || !this.boardApi?.getData) return;

        targetState.crimeBoardData = this.boardApi.getData();
    }

    disableUnderlyingScenesInput() {
        const activeScenes = this.scene.scene.manager.getScenes(true);

        activeScenes.forEach(scene => {
            if (scene.scene.key === this.scene.scene.key) return;
            if (scene.input) scene.input.enabled = false;
            if (scene.input?.keyboard) scene.input.keyboard.enabled = false;
        });
    }

    enableUnderlyingScenesInput() {
        const activeScenes = this.scene.scene.manager.getScenes(true);

        activeScenes.forEach(scene => {
            if (scene.scene.key === this.scene.scene.key) return;
            if (scene.input) scene.input.enabled = true;
            if (scene.input?.keyboard) scene.input.keyboard.enabled = true;
        });
    }

    destroy() {
        document.removeEventListener('keydown', this.boundEscHandler);

        if (this.overlay?.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        this.boardApi = null;
        this.overlay = null;
        this.modal = null;
        this.root = null;
    }
}