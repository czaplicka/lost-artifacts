import { gameState } from '../GameData.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';
import { CaseFileUI } from '../ui/CaseFileUI.js';
import { NotesUI } from '../ui/NotesUI.js';
import { WarrantUI } from '../ui/WarrantUI.js';
import { DestinationsUI } from '../ui/DestinationsUI.js';
import { CrimeBoardUI } from '../ui/CrimeBoardUI.js';
import { AtlasUI } from '../ui/AtlasUI.js';
import { PhonebookUI } from '../ui/PhonebookUI.js';
import { DialogManager } from '../DialogManager.js';

export class PlayerHudScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayerHudScene' });
        this.caseFileUI = null;
        this.notesUI = null;
        this.warrantUI = null;
        this.destinationsUI = null;
        this.playerMenu = null;
        this.isHudReady = false;
        this.crimeBoardUI = null;
        this.atlasUI = null;
        this.phoneUI = null;
        this.dialogManager = null;
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        const atlasEntries = this.cache.json.get('atlas') || [];
        console.log('atlas entries:', atlasEntries);
console.log('atlas entries length:', atlasEntries.length);

        this.caseFileUI = new CaseFileUI(this);
        this.notesUI = new NotesUI(this);
        this.warrantUI = new WarrantUI(this);
        this.destinationsUI = new DestinationsUI(this);
        this.atlasUI = new AtlasUI(this, atlasEntries);
        this.phoneUI = new PhonebookUI(this, gameState);
        this.dialogManager = new DialogManager(this, gameState);

        this.phoneUI.setOnCall((key, contact) => {
            this.dialogManager.startDialog(key, contact);
        });

        this.playerMenu = new PlayerMenuUI(this, gameState);

        this.isHudReady = true;
        this.crimeBoardUI = new CrimeBoardUI(this);

        this.scene.bringToTop();

        this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
        this.events.on(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    }

    onWake() {
        this.scene.bringToTop();
    }

    onShutdown() {
        this.caseFileUI?.destroy?.();
        this.notesUI?.destroy?.();
        this.warrantUI?.destroy?.();
        this.destinationsUI?.destroy?.();
        this.crimeBoardUI?.destroy?.();
        this.atlasUI?.destroy?.();
        this.phoneUI?.destroy?.();
        this.dialogManager?.dialogUI?.destroy?.();
    }

    closeAllUIPanels() {
        if (this.caseFileUI?.close) this.caseFileUI.close();
        if (this.notesUI?.close) this.notesUI.close();
        if (this.destinationsUI?.close) this.destinationsUI.close();
        if (this.warrantUI?.close) this.warrantUI.close();
        if (this.crimeBoardUI?.close) this.crimeBoardUI.close();
        if (this.atlasUI?.close) this.atlasUI.close();
        if (this.phoneUI?.close) this.phoneUI.close();
        if (this.dialogManager?.dialogUI?.close) this.dialogManager.dialogUI.close();
    }

    isAnyPanelOpen() {
        return Boolean(
            this.caseFileUI?.isOpen ||
            this.notesUI?.isOpen ||
            this.warrantUI?.isOpen ||
            this.destinationsUI?.isOpen ||
            this.playerMenu?.isOpen ||
            this.crimeBoardUI?.isOpen ||
            this.atlasUI?.isOpen ||
            this.phoneUI?.isOpen ||
            this.dialogManager?.dialogUI?.isOpen
        );
    }
}