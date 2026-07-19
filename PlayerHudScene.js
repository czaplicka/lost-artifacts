import { gameState } from './GameData.js';
import { PlayerMenuUI } from './ui/PlayerMenuUI.js';
import { CaseFileUI } from './ui/CaseFileUI.js';
import { NotesUI } from './ui/NotesUI.js';
import { WarrantUI } from './ui/WarrantUI.js';
import { DestinationsUI } from './ui/DestinationsUI.js';

export class PlayerHudScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayerHudScene' });
        this.caseFileUI = null;
        this.notesUI = null;
        this.warrantUI = null;
        this.destinationsUI = null;
        this.playerMenu = null;
        this.isHudReady = false;
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        this.caseFileUI = new CaseFileUI(this);
        this.notesUI = new NotesUI(this);
        this.warrantUI = new WarrantUI(this);
        this.destinationsUI = new DestinationsUI(this);
        this.playerMenu = new PlayerMenuUI(this, gameState);

        this.isHudReady = true;

        this.scene.bringToTop();

        this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
    }

    onWake() {
        this.scene.bringToTop();
    }

    closeAllUIPanels() {
        if (this.caseFileUI?.close) this.caseFileUI.close();
        if (this.notesUI?.close) this.notesUI.close();
        if (this.destinationsUI?.close) this.destinationsUI.close();
        if (this.warrantUI?.close) this.warrantUI.close();
    }

    isAnyPanelOpen() {
        return Boolean(
            this.caseFileUI?.isOpen ||
            this.notesUI?.isOpen ||
            this.warrantUI?.isOpen ||
            this.destinationsUI?.isOpen ||
            this.playerMenu?.isOpen
        );
    }
}