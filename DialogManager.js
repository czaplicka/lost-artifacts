import { DialogUI } from './ui/DialogUI.js';

const DIALOG_CACHE_PREFIX = 'dialog_';

// Used only as a last-resort fallback if the JSON cache doesn't support key
// introspection, and as a set of "core" contacts we always expect to exist
// (so we can warn loudly if one of them fails to load). This list no longer
// drives what actually gets loaded - the real source of truth is whatever
// dialog_*.json files are present in scene.cache.json.
const EXPECTED_CONTACT_KEYS = ['csi', 'informant', 'watson', 'holmes', 'police-station', 'hq', 'home'];

export class DialogManager {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.dialogUI = new DialogUI(scene);

        this.contactKeys = this.discoverContactKeys();
        this.data = {};

        this.contactKeys.forEach(key => {
            const json = scene.cache.json.get(`${DIALOG_CACHE_PREFIX}${key}`);

            if (!json) {
                console.warn(
                    `[DialogManager] Missing or empty "${DIALOG_CACHE_PREFIX}${key}.json" - ` +
                    `contact "${key}" will fall back to a generic "No response." dialog.`
                );
            }

            this.data[key] = json || {};
        });

        if (!this.gameState.dialogVariants) {
            this.gameState.dialogVariants = {};
        }
    }

    // Auto-discovers every "dialog_*" entry actually present in Phaser's
    // JSON cache, so contactKeys can never silently drift from what was
    // really loaded by the preloader. Falls back to the static expected
    // list only if the cache doesn't expose getKeys() (defensive - should
    // not normally happen with a standard Phaser JSON cache).
    discoverContactKeys() {
        const jsonCache = this.scene?.cache?.json;

        if (!jsonCache || typeof jsonCache.getKeys !== 'function') {
            console.warn('[DialogManager] JSON cache introspection unavailable, falling back to static contact list.');
            return [...EXPECTED_CONTACT_KEYS];
        }

        const discovered = jsonCache.getKeys()
            .filter(cacheKey => cacheKey.startsWith(DIALOG_CACHE_PREFIX))
            .map(cacheKey => cacheKey.slice(DIALOG_CACHE_PREFIX.length));

        if (discovered.length === 0) {
            console.warn('[DialogManager] No dialog_*.json files found in cache, falling back to static contact list.');
            return [...EXPECTED_CONTACT_KEYS];
        }

        // Warn individually about any "core" contact that was expected but
        // never actually loaded, instead of only discovering the problem
        // later when a player tries to talk to them in-game.
        EXPECTED_CONTACT_KEYS.forEach(expectedKey => {
            if (!discovered.includes(expectedKey)) {
                console.warn(
                    `[DialogManager] Expected core contact "${expectedKey}" has no matching ` +
                    `"${DIALOG_CACHE_PREFIX}${expectedKey}.json" in the cache.`
                );
            }
        });

        return discovered;
    }

    hasContact(key) {
        return Boolean(this.data[key] && Object.keys(this.data[key]).length > 0);
    }

    getAvailableContacts() {
        return this.contactKeys.filter(key => this.hasContact(key));
    }

    startDialog(key, contact) {
        if (!this.contactKeys.includes(key)) {
            console.warn(
                `[DialogManager] startDialog() called with unknown contact key "${key}". ` +
                `Did you forget to create/load "${DIALOG_CACHE_PREFIX}${key}.json"?`
            );
        }

        const entry = this.resolveEntry(key, contact);

        if (!entry) {
            this.dialogUI.open({
                speaker: contact?.name || 'Unknown',
                portraitKey: 'portrait_fallback',
                lines: ['...', 'No response.']
            });
            return;
        }

        this.dialogUI.open(entry);
        this.applyDialogEffects(key, entry);
    }

    resolveEntry(key, contact) {
        const contactData = this.data[key];
        if (!contactData || Object.keys(contactData).length === 0) return null;

        let stageKey;

        if (key === 'police-station' && !contact?.available) {
            stageKey = 'locked';
        } else {
            stageKey = `stage_${this.gameState.currentStage || 1}`;
            if (!contactData[stageKey]) {
                stageKey = 'default';
            }
        }

        const variants = contactData[stageKey];
        if (!variants || variants.length === 0) return null;

        return this.pickVariant(key, stageKey, variants);
    }

    pickVariant(key, stageKey, variants) {
        const variantMapKey = `${key}_${stageKey}`;

        if (this.gameState.dialogVariants[variantMapKey] === undefined) {
            const randomIndex = Math.floor(Math.random() * variants.length);
            this.gameState.dialogVariants[variantMapKey] = randomIndex;
        }

        const chosenIndex = this.gameState.dialogVariants[variantMapKey];
        return variants[chosenIndex] || variants[0];
    }

    applyDialogEffects(key, entry) {
        if (key === 'informant' && this.gameState.cluesFound >= 2) {
            this.gameState.informantUnlocked = true;
        }
    }
}