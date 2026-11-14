import { dialogueText as __dialogueText } from "./DialogueText.js";
import { DialogUI } from '../ui/DialogUI.js';
import {
  moneyManager,
  ECONOMY_CATEGORY
} from '../managers/MoneyManager.js';

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
      const cacheKey = `${DIALOG_CACHE_PREFIX}${key}`;
      const json = scene.cache.json.get(cacheKey);

      if (!json) {
        console.warn(
          `[DialogManager] Missing or empty "${cacheKey}.json" — ` +
          `contact "${key}" will use a fallback dialog.`
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
        '[DialogManager] JSON cache introspection unavailable. ' +
        'Using the static contact list.'
      );

      return [...EXPECTED_CONTACT_KEYS];
    }

    const discovered = jsonCache.getKeys()
      .filter(key => key.startsWith(DIALOG_CACHE_PREFIX))
      .map(key => key.slice(DIALOG_CACHE_PREFIX.length));

    if (discovered.length === 0) {
      console.warn(
        '[DialogManager] No dialog_*.json files found in cache. ' +
        'Using the static contact list.'
      );

      return [...EXPECTED_CONTACT_KEYS];
    }

    EXPECTED_CONTACT_KEYS.forEach(key => {
      if (!discovered.includes(key)) {
        console.warn(
          `[DialogManager] Expected contact "${key}" has no matching ` +
          `"${DIALOG_CACHE_PREFIX}${key}.json" in cache.`
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
        `[DialogManager] Unknown contact "${key}". ` +
        `Check "${DIALOG_CACHE_PREFIX}${key}.json".`
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
          text: `${__dialogueText("dialogues/DialogManagerBase.js", "t_c0d2e7676f9d08d67dc1")}${ACCOUNTING_LOAN_AMOUNT}${__dialogueText("dialogues/DialogManagerBase.js", "t_cbcf43f0f2f7d92c85ea")}`,
          callback: () => this.grantAccountingLoan(contact)
        },
        {
          text: __dialogueText("dialogues/DialogManagerBase.js", "t_1130a33138f2abe353c4"),
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
        description: __dialogueText("dialogues/DialogManagerBase.js", "t_b9aff43c92123a7a5031"),
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
            `${__dialogueText("dialogues/DialogManagerBase.js", "t_3c050cd4ef047d6505ba")}${state.agencyBudget}${__dialogueText("dialogues/DialogManagerBase.js", "t_cdb4ee2aea69cc6a8333")}`
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
      speaker: __dialogueText("dialogues/DialogManagerBase.js", "t_60d379a9c72f99001bab"),
      portraitKey: 'portrait_accounting',
      lines: [
        __dialogueText("dialogues/DialogManagerBase.js", "t_5b89bd883afb541b880e"),
        __dialogueText("dialogues/DialogManagerBase.js", "t_7bace9888392451d056a")
      ]
    });
  }

  openDialogOrFallback(entry, contact) {
    this.dialogUI.open(
      entry || {
        speaker: contact?.name || __dialogueText("dialogues/DialogManagerBase.js", "t_ab48fcf706cb01d334ef"),
        portraitKey: 'portrait_fallback',
        lines: [__dialogueText("dialogues/DialogManagerBase.js", "t_ab5df625bc76dbd4e163"), __dialogueText("dialogues/DialogManagerBase.js", "t_87aa5d9526324ec74aa1")]
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
      this.gameState.dialogVariants[variantMapKey] =
        Math.floor(Math.random() * variants.length);
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