import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIClock } from '../../managers/PIClockManager.js';
import { ThiefdokuPuzzle } from './ThiefdokuPuzzle.js';

const KEY = 'thiefdokuService';
const PUZZLE_KEY = 'daily-puzzle';
const BACKUP_PREFIX = 'daily-backup:';
const ICON_LABEL = 'Thiefdoku';
const MINUTES_PER_DAY = 1440;

const LOCAL_TEXT = {
  replaced: __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_0e02410984afab594611"),
  invalidBoard: __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_a58e9657ce47e9b9402d")
};

/* ------------------------------------------------------------------ */
/*  Game clock (never the device clock)                                */
/* ------------------------------------------------------------------ */

const defaultClock = {
  getDay: () => getPIClock().day,
  getMinuteOfDay: () => getPIClock().minuteOfDay
};
let clock = defaultClock;

// Test hook. Production code always uses the saved PI game clock.
export function setThiefdokuClock(custom = null) {
  clock = custom && typeof custom.getDay === 'function' && typeof custom.getMinuteOfDay === 'function'
    ? custom
    : defaultClock;
}

function currentDay() {
  const day = Number(clock.getDay());
  return Number.isSafeInteger(day) && day >= 1 ? day : 1;
}

function minuteOfDay() {
  const minute = Number(clock.getMinuteOfDay());
  return Number.isFinite(minute) ? Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.floor(minute))) : 0;
}

/* ------------------------------------------------------------------ */
/*  Saved state                                                        */
/* ------------------------------------------------------------------ */

function read() {
  const saved = gameState[KEY];
  return {
    version: 3,
    installed: false,
    medals: 0,
    earned: 0,
    issuedClockDay: null,
    rewardedCaseId: null,
    activeCaseId: null,
    caseCounter: 0,
    puzzle: null,
    puzzleSig: null,
    lastReplacementClockDay: null,
    backups: {},
    ...(saved && typeof saved === 'object' ? saved : {})
  };
}

// One place that saves. Chat is replaced as a whole object, so the change is
// visible to the autosave in the same call.
function commit(state, { chat = null } = {}) {
  delete state.issuedDay; // device-date field from older saves
  state.version = 3;

  if (chat) gameState.piChat = chat;
  gameState[KEY] = state;

  requestAutosave();
  refreshProfile();
}

function write(state) {
  commit(state);
}

function withChiefMessage(text) {
  const chat = gameState.piChat && typeof gameState.piChat === 'object'
    ? gameState.piChat
    : { version: 1, selected: 'commandant', contacts: {}, unread: {} };

  const contacts = { ...(chat.contacts || {}) };
  const conversation = contacts.commandant || { messages: [], asked: [], facts: [] };

  contacts.commandant = {
    ...conversation,
    messages: [
      ...(conversation.messages || []),
      { from: __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_4f59fed9897dd6d2e4a2"), text, at: Date.now() }
    ]
  };

  return {
    ...chat,
    contacts,
    unread: {
      ...(chat.unread || {}),
      commandant: (Number(chat.unread?.commandant) || 0) + 1
    }
  };
}

function assignCase(state) {
  state.caseCounter = Math.max(0, Number(state.caseCounter) || 0) + 1;
  state.activeCaseId = `thiefdoku-${state.caseCounter}`;
  state.issuedClockDay = currentDay();
  return state.activeCaseId;
}

// A puzzle replaced after a data change gets its own case id, otherwise the
// new puzzle would inherit a case that was already rewarded. Once per day.
function assignReplacementCase(state) {
  const today = currentDay();
  if (state.lastReplacementClockDay === today) return false;

  state.caseCounter = Math.max(0, Number(state.caseCounter) || 0) + 1;
  state.activeCaseId = `thiefdoku-${state.caseCounter}`;
  state.lastReplacementClockDay = today;
  return true;
}

// Hash only: the saved service state never contains the answer.
function puzzleSignature(puzzle, solution = puzzle.solution) {
  const raw = JSON.stringify([puzzle.size, puzzle.theme, puzzle.thiefId, solution]);
  let hash = 2166136261;

  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

/* ------------------------------------------------------------------ */
/*  Public service                                                     */
/* ------------------------------------------------------------------ */

export const thiefdokuService = {
  isInstalled() { return read().installed === true; },
  install() {
    const state = read();
    if (state.installed) return false;
    state.installed = true;
    write(state);
    return true;
  },
  getMedals() { return Math.max(0, Number(read().medals) || 0); },
  getTotalEarned() { return Math.max(0, Number(read().earned) || 0); },
  // Game days only. Changing the device date or time zone has no effect.
  canIssueCase() {
    const day = read().issuedClockDay;
    return !Number.isSafeInteger(day) || currentDay() > day;
  },
  canTakeNewCase() { return thiefdokuService.canIssueCase(); },
  minutesToNextCase() {
    return thiefdokuService.canIssueCase() ? 0 : MINUTES_PER_DAY - minuteOfDay();
  },
  markCaseTaken() {
    const state = read();
    if (state.activeCaseId) return false;
    assignCase(state);
    write(state);
    return true;
  },
  addMedal(amount = 1) {
    if (!Number.isInteger(amount) || amount !== 1) return false;

    const state = read();
    if (!state.activeCaseId || state.rewardedCaseId === state.activeCaseId) return false;

    state.rewardedCaseId = state.activeCaseId;
    state.medals = Math.max(0, Number(state.medals) || 0) + 1;
    state.earned = Math.max(0, Number(state.earned) || 0) + 1;

    commit(state, { chat: withChiefMessage(__dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_f77786ea7ab511115a61")) });
    return true;
  },
  spendMedals(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, message: __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_a9a389e7b04fea982afc") };
    }

    const state = read(), balance = Math.max(0, Number(state.medals) || 0);
    if (balance < amount) {
      return { ok: false, message: __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_4b810501ee2eeb9e21b2") };
    }

    state.medals = balance - amount;
    write(state);
    return { ok: true, balance: state.medals };
  }
};

/* ------------------------------------------------------------------ */
/*  Profile medal row                                                  */
/* ------------------------------------------------------------------ */

function refreshProfile() {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  let row = modal.querySelector('#profile-police-medals-row');

  if (!row) {
    const anchor = modal.querySelector('#profile-points')?.closest(".profile-info");
    if (!anchor) return;

    row = document.createElement('p');
    row.id = 'profile-police-medals-row';
    row.className = 'profile-info';

    const label = document.createElement('strong');
    label.textContent = __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_b4b749c892439d4b707e");

    const value = document.createElement('span');
    value.id = 'profile-police-medals';
    value.style.marginLeft = "0.45em";
    value.style.color = '#aa7d24';
    value.title = __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_8143c7f0aabe5b5aee80");

    row.append(label, document.createTextNode(' '), value);
    anchor.insertAdjacentElement('afterend', row);
  }

  const value = row.querySelector('#profile-police-medals'), balance = String(thiefdokuService.getMedals());
  if (value && value.textContent !== balance) value.textContent = balance;
}

let profileObserver = null;
let profileFrame = 0;

function scheduleProfileRefresh() {
  if (profileFrame) return;
  const frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : callback => setTimeout(callback, 16);
  profileFrame = frame(() => { profileFrame = 0; refreshProfile(); });
}

const inProfileModal = node => Boolean(
  node && node.nodeType === 1 &&
  (node.id === 'profile-modal' || node.closest?.('#profile-modal') || node.querySelector?.('#profile-modal'))
);

// Started explicitly (no work at import time). Reacts only to changes inside
// the profile modal, and batches them to one refresh per frame.
export function startThiefdokuProfileWatcher() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || profileObserver) return false;

  const start = () => {
    if (profileObserver || !document.body) return;

    refreshProfile();
    profileObserver = new MutationObserver(records => {
      if (records.some(record => inProfileModal(record.target) || [...record.addedNodes].some(inProfileModal))) {
        scheduleProfileRefresh();
      }
    });
    profileObserver.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
  return true;
}

export function stopThiefdokuProfileWatcher() {
  profileObserver?.disconnect();
  profileObserver = null;
  profileFrame = 0;
}

/* ------------------------------------------------------------------ */
/*  Puzzle storage                                                     */
/* ------------------------------------------------------------------ */

function makeStorage(transaction) {
  const stateNow = () => transaction.active ? transaction.state : read();
  const store = state => { if (transaction.active) transaction.state = state; else write(state); };

  return {
    getItem(key) { const state = stateNow(); return key === PUZZLE_KEY ? state.puzzle || null : state.backups?.[BACKUP_PREFIX + key] || null; },
    setItem(key, value) {
      const state = stateNow();
      if (key === PUZZLE_KEY) state.puzzle = value;
      else state.backups = { ...(state.backups || {}), [BACKUP_PREFIX + key]: value };
      store(state);
    },
    removeItem(key) {
      const state = stateNow();
      if (key === PUZZLE_KEY) state.puzzle = null;
      else { const backups = { ...(state.backups || {}) }; delete backups[BACKUP_PREFIX + key]; state.backups = backups; }
      store(state);
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Daily puzzle                                                       */
/* ------------------------------------------------------------------ */

export function prepareDailyPuzzle(ui) {
  const app = ui?.thiefdoku;
  if (!app || app.destroyed) return null;
  if (app.dailyServiceInstalled && app.puzzle) return app.puzzle;
  if (!thiefdokuService.isInstalled()) return null;

  const initialState = read(), hadSavedPuzzle = Boolean(initialState.puzzle);
  const transaction = { active: true, state: { ...initialState, backups: { ...(initialState.backups || {}) } } };
  const puzzle = new ThiefdokuPuzzle({ storage: makeStorage(transaction), storageKey: PUZZLE_KEY });
  const signature = puzzleSignature(puzzle);

  let replaced = false;
  const state = transaction.state;

  if (!hadSavedPuzzle || !state.activeCaseId) {
    assignCase(state);
  } else if (state.puzzleSig && state.puzzleSig !== signature &&
      // A save migrated from the previous format still matches its old signature.
      !(puzzle.legacySolution && state.puzzleSig === puzzleSignature(puzzle, puzzle.legacySolution))) {
    // The saved puzzle was rejected and the constructor generated a new one.
    replaced = assignReplacementCase(state);
  }

  state.puzzleSig = signature;

  const originalSubmit = puzzle.submitGuess.bind(puzzle);
  const originalReset = app.reset.bind(app);

  puzzle.submitGuess = id => {
    // Accusations count only for a board that obeys every clue.
    if (!puzzle.completed && !puzzle.failed && typeof puzzle.validateBoard === 'function' &&
        (typeof puzzle.allPlaced !== 'function' || puzzle.allPlaced())) {
      const check = puzzle.validateBoard();
      if (!check || check.valid !== true) {
        return { status: 'invalid_board', message: LOCAL_TEXT.invalidBoard, board: check || null };
      }
    }

    const wasCompleted = puzzle.completed;
    const result = originalSubmit(id);

    if (!wasCompleted && result.status === 'success') {
      if (thiefdokuService.addMedal(1)) {
        result.message = `${result.message || __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_e474c5de64f5d8c8cbac")}${__dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_382c302b04d5d0857587")}`;
      }
    }

    return result;
  };

  const reset = () => {
    if (app.destroyed) return;

    if (!thiefdokuService.canIssueCase()) {
      app.confirmNew = false;
      app.feedback = __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_bb58b837cd3ae61f1c48");
      ui.render();
      return;
    }

    const previous = read();
    const before = { ...previous, backups: { ...(previous.backups || {}) } };
    const next = { ...previous, backups: { ...(previous.backups || {}) } };

    assignCase(next);
    write(next);

    try {
      const result = originalReset();
      const saved = read();
      saved.puzzleSig = puzzleSignature(puzzle);
      write(saved);
      return result;
    } catch (error) {
      write(before);
      throw error;
    }
  };

  // Commit the daily ID and constructor saves together, after successful creation.
  write(transaction.state);
  transaction.active = false;

  app.puzzle = puzzle;
  app.reset = reset;
  app.dailyServiceInstalled = true;
  app.confirmNew = false;
  // A rejected save always tells the player why the case changed.
  app.feedback = replaced || puzzle.restoreRejected ? LOCAL_TEXT.replaced :
    puzzle.completed ? __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_47fe9c895f3aaa5d512a") :
    puzzle.failed ? __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_dab44285bace49865c4d") :
    puzzle.migrated ? __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_7b63b65fcbe9f6ed86ee") :
    __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_0e328fdaadf1f326f006");

  return puzzle;
}

export function installThiefdokuIntegration(ui) {
  if (ui.dailyThiefdokuIntegration) return ui.dailyThiefdokuIntegration;

  const originalOpenApp = ui.openApp, originalCreateIcon = ui.desktop.createIcon;

  const wrappedCreateIcon = function (x, y, width, label, kind, color, callback) {
    if ((label === ICON_LABEL || kind === 'thiefdoku') && !thiefdokuService.isInstalled()) return;
    return originalCreateIcon.call(this, x, y, width, label, kind, color, callback);
  };

  const wrappedOpenApp = function (app) {
    if (this.destroyed || !this.isOpen || this.suspended || this.booting) return;

    if (app === 'thiefdoku') {
      if (!thiefdokuService.isInstalled()) {
        this.notice = __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_75d119b7c7f0d225d02b");
        this.render();
        return;
      }

      try { prepareDailyPuzzle(this); }
      catch (error) {
        console.error('[Thiefdoku] Daily case initialization failed:', error);
        this.notice = __dialogueText("systems/thiefdoku/ThiefdokuService.js", "t_2f27d6f92819b50d94bc");
        this.render();
        return;
      }
    }

    return originalOpenApp.call(this, app);
  };

  ui.desktop.createIcon = wrappedCreateIcon;
  ui.openApp = wrappedOpenApp;

  const integration = {
    destroy() {
      if (ui.openApp === wrappedOpenApp) ui.openApp = originalOpenApp;
      if (ui.desktop.createIcon === wrappedCreateIcon) ui.desktop.createIcon = originalCreateIcon;
      delete ui.dailyThiefdokuIntegration;
    }
  };

  ui.dailyThiefdokuIntegration = integration;
  startThiefdokuProfileWatcher();
  refreshProfile();
  return integration;
}
