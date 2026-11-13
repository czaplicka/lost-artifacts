import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { ThiefdokuPuzzle } from './ThiefdokuPuzzle.js';

const KEY = 'thiefdokuService';
const PUZZLE_KEY = 'daily-puzzle';
const BACKUP_PREFIX = 'daily-backup:';

function localDay() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

function read() {
  const saved = gameState[KEY];

  return {
    version: 2,
    installed: false,
    medals: 0,
    earned: 0,
    issuedDay: null,
    rewardedCaseId: null,
    activeCaseId: null,
    caseCounter: 0,
    puzzle: null,
    backups: {},
    ...(saved && typeof saved === 'object' ? saved : {})
  };
}

function write(state) {
  gameState[KEY] = state;
  requestAutosave();
  refreshProfile();
}

function addChiefMessage(text) {
  const chat = gameState.piChat || {
    version: 1,
    selected: 'commandant',
    contacts: {},
    unread: {}
  };

  chat.contacts ||= {};
  chat.unread ||= {};

  const conversation = chat.contacts.commandant || {
    messages: [],
    asked: [],
    facts: []
  };

  conversation.messages = [
    ...(conversation.messages || []),
    {
      from: 'commandant',
      text,
      at: Date.now()
    }
  ];

  chat.contacts.commandant = conversation;

  chat.unread.commandant =
    (Number(chat.unread.commandant) || 0) + 1;

  gameState.piChat = chat;
}

function assignCase(state) {
  state.caseCounter =
    Math.max(0, Number(state.caseCounter) || 0) + 1;

  state.activeCaseId = `thiefdoku-${state.caseCounter}`;
  state.issuedDay = localDay();

  return state.activeCaseId;
}

export const thiefdokuService = {
  isInstalled() {
    return read().installed === true;
  },

  install() {
    const state = read();

    if (state.installed) return false;

    state.installed = true;
    write(state);

    return true;
  },

  getMedals() {
    return Math.max(0, Number(read().medals) || 0);
  },

  getTotalEarned() {
    return Math.max(0, Number(read().earned) || 0);
  },

  canIssueCase() {
    const issuedDay = read().issuedDay;

    return !issuedDay || localDay() > issuedDay;
  },

  canTakeNewCase() {
    return thiefdokuService.canIssueCase();
  },

  markCaseTaken() {
    const state = read();

    // Integracja nadaje ID przed uruchomieniem nowej planszy.
    // Ponowne renderowanie istniejącej sprawy nie zużywa nowego dnia.
    if (state.activeCaseId) return false;

    assignCase(state);
    write(state);

    return true;
  },

  addMedal(amount = 1) {
    if (!Number.isInteger(amount) || amount !== 1) {
      return false;
    }

    const state = read();

    if (
      !state.activeCaseId ||
      state.rewardedCaseId === state.activeCaseId
    ) {
      return false;
    }

    state.rewardedCaseId = state.activeCaseId;

    state.medals =
      Math.max(0, Number(state.medals) || 0) + 1;

    state.earned =
      Math.max(0, Number(state.earned) || 0) + 1;

    addChiefMessage(
      'Case closed. One police medal has been credited to your profile. ' +
      'Do not spend it all on evidence.'
    );

    write(state);

    return true;
  },

  spendMedals(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      return {
        ok: false,
        message: 'Invalid medal amount.'
      };
    }

    const state = read();
    const balance = Math.max(0, Number(state.medals) || 0);

    if (balance < amount) {
      return {
        ok: false,
        message: 'Not enough police medals.'
      };
    }

    state.medals = balance - amount;
    write(state);

    return {
      ok: true,
      balance: state.medals
    };
  }
};

function refreshProfile() {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  let row = modal.querySelector('#profile-police-medals-row');

  if (!row) {
    const points = modal.querySelector('#profile-points');
    const anchor = points?.closest('.profile-info');

    if (!anchor) return;

    row = document.createElement('p');
    row.id = 'profile-police-medals-row';
    row.className = 'profile-info';

    const label = document.createElement('strong');
    label.textContent = 'Police Medals:';

    const value = document.createElement('span');
    value.id = 'profile-police-medals';
    value.style.marginLeft = '0.45em';
    value.style.color = '#aa7d24';
    value.title = 'Currency earned by solving Thiefdoku cases.';

    row.append(
      label,
      document.createTextNode(' '),
      value
    );

    anchor.insertAdjacentElement('afterend', row);
  }

  const value = row.querySelector('#profile-police-medals');
  const balance = String(thiefdokuService.getMedals());

  if (value && value.textContent !== balance) {
    value.textContent = balance;
  }
}

let profileObserver = null;

function watchProfile() {
  if (
    typeof document === 'undefined' ||
    typeof MutationObserver === 'undefined' ||
    profileObserver
  ) {
    return;
  }

  const start = () => {
    if (profileObserver || !document.body) return;

    refreshProfile();

    profileObserver = new MutationObserver(() => {
      refreshProfile();
    });

    profileObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  }
}

watchProfile();

function makeStorage() {
  return {
    getItem(key) {
      const state = read();

      if (key === PUZZLE_KEY) {
        return state.puzzle || null;
      }

      return state.backups?.[BACKUP_PREFIX + key] || null;
    },

    setItem(key, value) {
      const state = read();

      if (key === PUZZLE_KEY) {
        state.puzzle = value;
      } else {
        state.backups = {
          ...(state.backups || {}),
          [BACKUP_PREFIX + key]: value
        };
      }

      write(state);
    },

    removeItem(key) {
      const state = read();

      if (key === PUZZLE_KEY) {
        state.puzzle = null;
      } else {
        const backups = { ...(state.backups || {}) };

        delete backups[BACKUP_PREFIX + key];

        state.backups = backups;
      }

      write(state);
    }
  };
}

function prepareDailyPuzzle(ui) {
  const app = ui.thiefdoku;

  if (!app || app.dailyServiceInstalled) return;

  const initialState = read();
  const hadSavedPuzzle = Boolean(initialState.puzzle);

  const puzzle = new ThiefdokuPuzzle({
    storage: makeStorage(),
    storageKey: PUZZLE_KEY
  });

  app.puzzle = puzzle;
  app.dailyServiceInstalled = true;

  const state = read();

  if (!hadSavedPuzzle || !state.activeCaseId) {
    assignCase(state);
    write(state);
  }

  const originalSubmit = puzzle.submitGuess.bind(puzzle);
  const originalReset = app.reset.bind(app);

  puzzle.submitGuess = id => {
    const wasCompleted = puzzle.completed;
    const result = originalSubmit(id);

    if (!wasCompleted && result.status === 'success') {
      const awarded = thiefdokuService.addMedal(1);

      if (awarded) {
        result.message =
          `${result.message || 'Case closed.'} +1 police medal.`;
      }
    }

    return result;
  };

  app.reset = () => {
    if (!thiefdokuService.canIssueCase()) {
      app.confirmNew = false;

      app.feedback =
        'Today’s case has already been delivered. ' +
        'Next delivery after local midnight.';

      ui.render();
      return;
    }

    const previous = read();

    const before = {
      ...previous,
      backups: { ...(previous.backups || {}) }
    };

    const next = {
      ...previous,
      backups: { ...(previous.backups || {}) }
    };

    assignCase(next);
    write(next);

    try {
      originalReset();
    } catch (error) {
      write(before);
      throw error;
    }
  };

  app.confirmNew = false;

  app.feedback = puzzle.completed
    ? 'Case closed. Your medal is in your profile.'
    : puzzle.failed
      ? 'Case closed. The thief escaped. Next delivery after local midnight.'
      : 'Daily case received. Place everyone, then identify the thief.';
}

export function installThiefdokuIntegration(ui) {
  if (ui.dailyThiefdokuIntegration) {
    return ui.dailyThiefdokuIntegration;
  }

  const originalOpenApp = ui.openApp;
  const originalCreateIcon = ui.desktop.createIcon;

  ui.desktop.createIcon = function (
    x,
    y,
    width,
    label,
    kind,
    color,
    callback
  ) {
    if (
      label === 'Thiefdoku' &&
      !thiefdokuService.isInstalled()
    ) {
      return;
    }

    return originalCreateIcon.call(
      this,
      x,
      y,
      width,
      label,
      kind,
      color,
      callback
    );
  };

  ui.openApp = function (app) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.suspended ||
      this.booting
    ) {
      return;
    }

    if (app === 'thiefdoku') {
      if (!thiefdokuService.isInstalled()) {
        this.notice =
          'THIEFDOKU is not installed. Check your IMEGO messages.';

        this.render();
        return;
      }

      prepareDailyPuzzle(this);
    }

    return originalOpenApp.call(this, app);
  };

  const integration = {
    destroy() {
      if (ui.openApp === wrappedOpenApp) {
        ui.openApp = originalOpenApp;
      }

      if (ui.desktop.createIcon === wrappedCreateIcon) {
        ui.desktop.createIcon = originalCreateIcon;
      }

      delete ui.dailyThiefdokuIntegration;
    }
  };

  const wrappedOpenApp = ui.openApp;
  const wrappedCreateIcon = ui.desktop.createIcon;

  ui.dailyThiefdokuIntegration = integration;

  refreshProfile();

  return integration;
}