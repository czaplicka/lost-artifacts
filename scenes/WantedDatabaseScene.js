import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { LS_THEME, LS_PHOTO, lsGet, buildTheme } from './wanted-database/WantedDatabaseConfig.js';
import { WantedDatabaseData } from './wanted-database/WantedDatabaseData.js';
import { WantedDatabaseUi } from './wanted-database/WantedDatabaseUi.js';
import { WantedDatabaseFilters } from './wanted-database/WantedDatabaseFilters.js';
import { WantedDatabaseTextures } from './wanted-database/WantedDatabaseTextures.js';
import { WantedDatabaseCards } from './wanted-database/WantedDatabaseCards.js';
import { WantedDatabaseDetailsView } from './wanted-database/WantedDatabaseDetailsView.js';
import { WantedDatabaseDetails } from './wanted-database/WantedDatabaseDetails.js';
import { WantedDatabaseChrome } from './wanted-database/WantedDatabaseChrome.js';
import { WantedDatabaseNavigation } from './wanted-database/WantedDatabaseNavigation.js';
import { WantedDatabaseLifecycle } from './wanted-database/WantedDatabaseLifecycle.js';

export class WantedDatabaseScene extends BaseScene {
    constructor() {
        super({ key: 'WantedDatabaseScene' });

        this.gameState = {};
        this.CARDS_PER_PAGE = 10;
        this.currentPage = 0;
        this.searchQuery = '';
        this.filterGender = 'all';
        this.filterStatus = 'all';
        this.sortIndex = 0;
    }

    init(data = {}) {
        this.gameState = data.gameState || this.gameState || {};
        this.returnSceneKey = data.returnScene || 'OfficeScene';
        this.restoreUi = data.ui || null;
        this.noBoot = !!data.skipBoot;
    }

    create() {
        super.create();
        this.resetWantedRuntime();
        for (const event of [Phaser.Scenes.Events.SHUTDOWN, Phaser.Scenes.Events.DESTROY]) {
            this.events.off(event, this.cleanupScene, this);
            this.events.once(event, this.cleanupScene, this);
        }
        try {
            this.buildWantedInterface();
        } catch (error) {
            this._wantedCreateFailed = true;
            console.error('[WantedDatabaseScene] Interface creation failed:', error);
            this.closeAndReturnToOffice();
        }
    }

    buildWantedInterface() {

        // Ukrywa HUD DOM, zakładkę NEWS i usypia PlayerHudScene,
        // bo ma globalne skróty M / I / C / H, które kolidują z pisaniem.
        EventBus.emit('hideHUD');
        this.game.events.emit('setHudVisible', false);
        this.sleepPlayerHud();

        audioManager.init(this);

        const ui = this.restoreUi || {};

        this.currentPage = ui.page || 0;
        this.searchQuery = ui.search || '';
        this.filterGender = ui.gender || 'all';
        this.filterStatus = ui.status || 'all';
        this.sortIndex = ui.sort || 0;

        this.themeKey =
            this.registry.get('wantedDbTheme') ||
            lsGet(LS_THEME) ||
            'green';

        this.th = buildTheme(this.themeKey);

        const savedPhoto =
            this.registry.get('wantedDbPhotoFilter') ?? lsGet(LS_PHOTO);

        this.photoFilterOn =
            savedPhoto === undefined ||
            savedPhoto === null ||
            savedPhoto === true ||
            savedPhoto === 'true';

        this.marks = this.readMarks();

        this.suspects = this.resolveSuspects().map((s, i) => ({
            ...s,
            __i: i
        }));

        this.filteredSuspects = [...this.suspects];

        const W = this.scale.width;
        const H = this.scale.height;

        this.createBackground(W, H);
        this.createCRTEffects(W, H);
        this.createHeader(W);
        this.createFilterPanel(W);

        this.cardContainer = this.add.container(0, 0);

        this.createNavigation(W, H);
        this.createTicker(W, H);

        this.detailPanel = this.createDetailPanel(W, H);
        this.detailPanel.setVisible(false);

        this.helpPanel = this.createHelpPanel(W, H);
        this.helpPanel.setVisible(false);

        this.applyFilters();

        this.captureKeys = 'TAB,UP,DOWN,LEFT,RIGHT,SPACE,BACKSPACE';
        this.input.keyboard?.addCapture(this.captureKeys);
        this.input.keyboard?.on('keydown', this.onKeyDown, this);

        if (this.suspects.length === 0) {
            this.loadSuspectsFallback();
        } else {
            void this.refreshPage();
        }

        this.createBootSequence(W, H);
    }
}

Object.assign(
    WantedDatabaseScene.prototype,
    WantedDatabaseData,
    WantedDatabaseUi,
    WantedDatabaseFilters,
    WantedDatabaseTextures,
    WantedDatabaseCards,
    WantedDatabaseDetailsView,
    WantedDatabaseDetails,
    WantedDatabaseChrome,
    WantedDatabaseNavigation,
    WantedDatabaseLifecycle
);
