import { DialogUI } from './ui/DialogUI.js';
import { EventBus } from './EventBus.js';
import { moneyManager, ECONOMY_CATEGORY } from './MoneyManager.js';

const DIALOG_CACHE_PREFIX = 'dialog_';

const EXPECTED_CONTACT_KEYS = [
    'csi',
    'informant',
    'watson',
    'holmes',
    'police-station',
    'hq',
    'home',
    'accounting'
];

const ACCOUNTING_LOAN_AMOUNT = 75;
const ACCOUNTING_MAX_LOANS = 3;

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

        this.ensureAccountingState();
    }

    discoverContactKeys() {
        const jsonCache = this.scene?.cache?.json;

        if (!jsonCache || typeof jsonCache.getKeys !== 'function') {
            console.warn(
                '[DialogManager] JSON cache introspection unavailable, falling back to static contact list.'
            );

            return [...EXPECTED_CONTACT_KEYS];
        }

        const discovered = jsonCache.getKeys()
            .filter(cacheKey => cacheKey.startsWith(DIALOG_CACHE_PREFIX))
            .map(cacheKey => cacheKey.slice(DIALOG_CACHE_PREFIX.length));

        if (discovered.length === 0) {
            console.warn(
                '[DialogManager] No dialog_*.json files found in cache, falling back to static contact list.'
            );

            return [...EXPECTED_CONTACT_KEYS];
        }

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

ensureAccountingState() {
    if (!this.gameState.accounting) {
        this.gameState.accounting = {
            loansTaken: 0
        };
    }

    if (typeof this.gameState.accounting.loansTaken !== 'number') {
        this.gameState.accounting.loansTaken = 0;
    }
}

    hasContact(key) {
        return Boolean(
            this.data[key] &&
            Object.keys(this.data[key]).length > 0
        );
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

        if (key === 'accounting') {
            this.startAccountingDialog(contact);
            return;
        }

        const entry = this.resolveEntry(key, contact);

        if (!entry) {
            this.openDialogOrFallback(null, contact);
            return;
        }

        this.dialogUI.open(entry);
        this.applyDialogEffects(key, entry);
    }

    startAccountingDialog(contact) {
        this.ensureAccountingState();

        const accounting = this.gameState.accounting;

        if (accounting.loansTaken >= ACCOUNTING_MAX_LOANS) {
            const entry = this.resolveCustomEntry(
                'accounting',
                'loan_limit_reached'
            );

            this.openDialogOrFallback(entry, contact);
            return;
        }

        const entry = this.resolveEntry('accounting', contact);

        if (!entry) {
            this.openDialogOrFallback(null, contact);
            return;
        }

        this.dialogUI.open(entry, {
            choices: [
                {
                    text: `TAKE $${ACCOUNTING_LOAN_AMOUNT} LOAN`,
                    callback: () => this.grantAccountingLoan(contact)
                },
                {
                    text: 'NEVER MIND',
                    callback: () => this.showAccountingExit(contact)
                }
            ]
        });
    }

    grantAccountingLoan(contact) {
    this.ensureAccountingState();

    const accounting = this.gameState.accounting;

    if (accounting.loansTaken >= ACCOUNTING_MAX_LOANS) {
        const entry = this.resolveCustomEntry(
            'accounting',
            'loan_limit_reached'
        );

        this.openDialogOrFallback(entry, contact);
        return;
    }

    const state = moneyManager.addAgencyBudget(
        ACCOUNTING_LOAN_AMOUNT,
        {
            category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
            description: 'Emergency budget increase from Accounting',
            missionId: this.gameState.currentMission?.id ?? null,
            metadata: {
                contact: 'accounting',
                loanNumber: accounting.loansTaken + 1
            }
        }
    );

    accounting.loansTaken += 1;

    const approvedEntry = this.resolveCustomEntry(
        'accounting',
        'loan_approved'
    );

    const entry = approvedEntry
        ? {
            ...approvedEntry,
            lines: [
                ...approvedEntry.lines,
                `Agency budget available: $${state.agencyBudget}.`
            ]
        }
        : null;

    this.openDialogOrFallback(entry, contact);
}

    showAccountingExit(contact) {
        const entry = this.resolveCustomEntry(
            'accounting',
            'loan_cancelled'
        );

        if (entry) {
            this.dialogUI.open(entry);
            return;
        }

        this.dialogUI.open({
            speaker: 'Ms. Ledger',
            portraitKey: 'portrait_accounting',
            lines: [
                'A wise decision.',
                'Try not to expense anything that explodes.'
            ]
        });
    }

    openDialogOrFallback(entry, contact) {
        this.dialogUI.open(
            entry || {
                speaker: contact?.name || 'Accounting',
                portraitKey: 'portrait_fallback',
                lines: ['...', 'No response.']
            }
        );
    }

    resolveCustomEntry(key, stageKey) {
        const contactData = this.data[key];

        if (!contactData || Object.keys(contactData).length === 0) {
            return null;
        }

        const variants = contactData[stageKey];

        if (!variants || variants.length === 0) {
            return null;
        }

        return this.pickVariant(key, stageKey, variants);
    }

    resolveEntry(key, contact) {
        const contactData = this.data[key];

        if (!contactData || Object.keys(contactData).length === 0) {
            return null;
        }

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

        if (!variants || variants.length === 0) {
            return null;
        }

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