import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";


export const WantedDatabaseLifecycle = {
    resetWantedRuntime() {
        this.session = { active: true };
        this.ownedTextures = new Set();
        this.pendingTextures = new Map();
        this.renderToken = 0;
        this.detailToken = 0;
        this.isPaging = false;
        this.isClosing = false;
        this.booting = false;
        this.listDirty = false;
        this.detailIndex = -1;
        this.cards = [];
        this.photoEntries = [];
        this.skillChips = [];
        this.typeTweens = [];
        this.bootEvents = [];
        this.masks = [];
        this.selectedCard = null;
        this.genderButtons = [];
        this._wantedCreateFailed = false;
        this._wantedReturnRequested = false;
        this._fallbackComplete = null;
        this._clearWantedReferences();
    },

    _clearWantedReferences() {
        for (const key of [
            "barcodeGfx",
            "bootLayer",
            "captureKeys",
            "cardContainer",
            "clearButton",
            "clockText",
            "clockTimer",
            "counterText",
            "crtBeam",
            "crtNoise",
            "crtScanlines",
            "cursorTimer",
            "detailCaseNum",
            "detailContent",
            "detailFields",
            "detailHabitus",
            "detailLabels",
            "detailName",
            "detailNote",
            "detailPanel",
            "detailPhotoBox",
            "detailPhotoEntry",
            "detailPhotoStatus",
            "detailRecText",
            "detailScan",
            "detailStamp",
            "detailStatusText",
            "fallbackJsonKey",
            "flagButton",
            "flickerTimer",
            "glitchTimer",
            "helpButton",
            "helpPanel",
            "imgButton",
            "marksText",
            "nextButton",
            "pageText",
            "prevButton",
            "searchDebounce",
            "searchPlaceholder",
            "searchText",
            "skillsBox",
            "sortButton",
            "statusButton",
            "themeButton",
        ]) {
            this[key] = null;
        }
    },

    isWantedTextAlive(text) {
        return Boolean(this.session?.active && text?.scene === this &&
            text.active !== false && text.canvas && text.context);
    },

    returnToWantedCaller() {
        if (this._wantedReturnRequested) return;
        this._wantedReturnRequested = true;
        const key = this.returnSceneKey || 'OfficeScene';
        const target = this.getRegisteredScene(key);
        if (!target) {
            console.error('[WantedDatabaseScene] Return scene is not registered:', key);
            return;
        }
        if (target.sys.isPaused()) {
            this.scene.resume(key);
        } else if (target.sys.isSleeping()) {
            this.scene.wake(key);
        } else if (target.sys.isActive()) {
            target.resetOpeningFlags?.();
            target.refreshPanelLock?.();
            void target.setupOfficeUiLayers?.();
        }
        this.scene.setVisible(true, key);
    },

    closeAndReturnToOffice() {
        if (this.isClosing) return;
        this.isClosing = true;
        this.sfx('click_sound');
        this.returnToWantedCaller();
        this.scene.stop();
    },

    cleanupScene() {
        if (!this.session?.active) return;
        this.session.active = false;
        this.renderToken++;
        this.detailToken++;

        const clean = (label, callback) => {
            try { callback(); }
            catch (error) {
                console.warn(`[WantedDatabaseScene] ${label} cleanup failed:`, error);
            }
        };

        this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
        this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);
        this.input.keyboard?.off('keydown', this.onKeyDown, this);
        if (this.captureKeys) {
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_2316810a5de343dd59d1"), () => this.input.keyboard?.removeCapture(this.captureKeys));
        }
        if (this._fallbackComplete && this.fallbackJsonKey) {
            this.load.off(`filecomplete-json-${this.fallbackJsonKey}`, this._fallbackComplete);
        }
        this._fallbackComplete = null;

        for (const pending of [...(this.pendingTextures?.values() || [])]) {
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_574878bd7413f322056b"), () => pending.cancel());
        }
        this.pendingTextures?.clear();
        clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_25dfb9b4b32f9ad69a77"), () => this.stopTypeTweens());
        clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_929c2648b30c65e57497"), () => this.tweens.killAll());
        clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_cca94c56deb8a8625aee"), () => this.time.removeAllEvents());
        clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_f08308f4e46fb5baa12d"), () => this.cameras.main.postFX?.clear());

        for (const { g, mask } of this.masks || []) {
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_e368929abd3614e92ad1"), () => mask?.destroy?.());
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_b059675d2609ae83687c"), () => { if (g?.scene) g.destroy(); });
        }
        this.masks = [];
        clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_e1f21d71c13e502cbcbe"), () => this.clearSkillChips());
        for (const key of ['bootLayer', 'helpPanel', 'detailPanel', 'cardContainer',
            'crtBeam', 'crtScanlines', 'crtNoise']) {
            const object = this[key];
            this[key] = null;
            clean(key, () => { if (object?.scene) object.destroy(true); });
        }
        for (const key of this.ownedTextures || []) {
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_e28411a3404d21f9fc16"), () => {
                if (this.textures.exists(key)) this.textures.remove(key);
            });
        }
        this.ownedTextures?.clear();
        if (this.fallbackJsonKey) {
            clean(__dialogueText("scenes/wanted-database/WantedDatabaseLifecycle.js", "t_b30306984159a591c081"), () => {
                if (this.cache.json.exists(this.fallbackJsonKey)) {
                    this.cache.json.remove(this.fallbackJsonKey);
                }
            });
        }
        this.cards = [];
        this.photoEntries = [];
        this.selectedCard = null;
        this.genderButtons = [];
        this.isPaging = false;
        this.booting = false;
        this._clearWantedReferences();
    }
};
