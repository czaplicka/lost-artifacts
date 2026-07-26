import { DialogUI } from './ui/DialogUI.js';
export class DialogManager {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.dialogUI = new DialogUI(scene);

        this.contactKeys = ['csi', 'informant', 'watson', 'holmes', 'police-station', 'hq', 'home'];

        this.data = {};
        this.contactKeys.forEach(key => {
            this.data[key] = scene.cache.json.get(`dialog_${key}`) || {};
        });

        if (!this.gameState.dialogVariants) {
            this.gameState.dialogVariants = {};
        }
    }

    startDialog(key, contact) {
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
        if (!contactData) return null;

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