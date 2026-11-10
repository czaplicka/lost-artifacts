import { gameState } from '../GameData.js';

import {
  requestAutosave,
  saveGameState
} from '../gameStatePersistence.js';

import { inventoryManager } from './InventoryManager.js';

import {
  checkAndAwardAchievements
} from './AchievementManager.js';

import {
  addPIEvidence,
  registerPICase
} from './PIInvestigationManager.js';

import {
  DEAD_MAIL_PREVIEW_CASE
} from './DeadMailManager.js';

import {
  getDeadMailNightProgress,
  canStartDeadMailNight
} from './DeadMailNightManager.js';

import {
  OPERATION_EVENTS,
  FINAL_FACTS,
  REPORT_FIELDS,
  DEAD_MAIL_REWARD,
  PHONE_MESSAGES
} from '../assets/data/deadMailFinaleData.js';

import {
  progressionManager
} from './ProgressionManager.js';

const XP_REWARD_ID = 'pi_case_large';

let reportBusy = false;

function xpEventId() {
  return JSON.stringify([
    'reward',
    XP_REWARD_ID,
    DEAD_MAIL_PREVIEW_CASE
  ]);
}

const defaults = () => ({
  version: 1,
  stage: 'plan',
  mark: 'none',
  coverage: 'main',
  intervention: 'costume',
  started: false,
  eventIndex: -1,
  facts: [],
  report: {},
  completed: false,
  rewardClaimed: false,
  heardMessages: [],
  attempts: 0
});

const unique = values => [
  ...new Set(
    Array.isArray(values)
      ? values.filter(value => typeof value === 'string')
      : []
  )
];

export function canStartDeadMailFinale() {
  return (
    canStartDeadMailNight() &&
    getDeadMailNightProgress().complete === true
  );
}

export function getDeadMailFinale() {
  const saved = gameState.deadMailPreview?.finale;

  if (
    !saved ||
    saved.version !== 1 ||
    typeof saved !== 'object' ||
    Array.isArray(saved)
  ) {
    return defaults();
  }

  const report = {};

  for (const definition of REPORT_FIELDS) {
    const value = saved.report?.[definition.id];

    if (
      Number.isInteger(value) &&
      value >= 0 &&
      value < definition.options.length
    ) {
      report[definition.id] = value;
    }
  }

  return {
    ...defaults(),
    ...saved,
    report,

    facts: unique(saved.facts).filter(
      id => Object.hasOwn(FINAL_FACTS, id)
    ),

    heardMessages: Array.isArray(saved.heardMessages)
      ? [
          ...new Set(
            saved.heardMessages.filter(
              index =>
                Number.isInteger(index) &&
                index >= 0 &&
                index < PHONE_MESSAGES.length
            )
          )
        ]
      : []
  };
}

function commit(state) {
  gameState.deadMailPreview = {
    ...gameState.deadMailPreview,
    finale: state
  };

  requestAutosave();

  return state;
}

function note(
  id,
  label,
  text,
  source = 'Dead Mail / finale'
) {
  return addPIEvidence(DEAD_MAIL_PREVIEW_CASE, {
    id: `dead-mail-finale-${id}`,
    label,
    text,
    metaText: source,
    color: 'yellow',
    pinned: true
  });
}

function discover(ids) {
  const state = getDeadMailFinale();

  const added = ids.filter(
    id =>
      Object.hasOwn(FINAL_FACTS, id) &&
      !state.facts.includes(id)
  );

  if (!added.length) return;

  for (const id of added) {
    const [label, text, source] = FINAL_FACTS[id];
    note(id, label, text, source);
  }

  commit({
    ...state,
    facts: [...state.facts, ...added]
  });
}

export function beginDeadMailFinale() {
  if (!canStartDeadMailFinale()) {
    throw new Error(
      'Complete the local night-shift preview first.'
    );
  }

  registerPICase({
    id: DEAD_MAIL_PREVIEW_CASE,
    kind: 'side',
    requiresBoard: true,
    title: 'Dead Mail [DEVELOPMENT PREVIEW]',
    initialItems: [],
    initialLinks: []
  });

  return commit(getDeadMailFinale());
}

export function setDeadMailFinaleStage(stage) {
  if (!canStartDeadMailFinale()) return false;

  const state = getDeadMailFinale();

  const allowed =
    (stage === 'plan' && !state.started) ||
    (stage === 'operation' && state.started) ||
    (
      stage === 'records' &&
      state.eventIndex === OPERATION_EVENTS.length - 1
    ) ||
    (
      stage === 'report' &&
      Object.keys(FINAL_FACTS).every(
        id => state.facts.includes(id)
      )
    ) ||
    (stage === 'epilogue' && state.completed);

  if (!allowed) return false;

  commit({ ...state, stage });

  return true;
}

export function chooseDeadMailPlan(field, value) {
  if (!canStartDeadMailFinale()) return false;

  const state = getDeadMailFinale();

  if (state.started) return false;

  const options = {
    mark: ['none', 'recorded'],
    coverage: ['main', 'continuous'],
    intervention: ['costume', 'handover', 'documented']
  };

  if (
    !Object.hasOwn(options, field) ||
    !options[field].includes(value)
  ) {
    return false;
  }

  commit({
    ...state,
    [field]: value
  });

  return true;
}

export function checkDeadMailPlan() {
  const state = getDeadMailFinale();

  if (state.mark !== 'recorded') {
    return {
      ok: false,
      message:
        'Record DM-114, its seal and its contents with the courier team before delivery. An ordinary unrecorded box cannot be reliably tracked through the operation.'
    };
  }

  if (state.coverage !== 'continuous') {
    return {
      ok: false,
      message:
        'Keep a continuous view of the handover and shed approach. A costume-contest photograph will not connect a face to the parcel.'
    };
  }

  if (state.intervention !== 'documented') {
    return {
      ok: false,
      message:
        'In this scripted operation, the officers need the collector’s identity and parcel handling documented. A cloak or handover alone does not establish the entire earlier scheme.'
    };
  }

  return {
    ok: true,
    message:
      'Plan approved in the story by the courier and police team. Record preparation, maintain continuity, document identity and handling. This is a fictional operation, not a real service call.'
  };
}

export function startDeadMailOperation() {
  if (!canStartDeadMailFinale()) {
    return { ok: false };
  }

  const state = getDeadMailFinale();

  if (state.started) {
    return {
      ok: false,
      message: 'The operation has already begun.'
    };
  }

  const result = checkDeadMailPlan();

  if (!result.ok) return result;

  commit({
    ...state,
    started: true,
    stage: 'operation'
  });

  return { ok: true };
}

export function advanceDeadMailOperation() {
  if (!canStartDeadMailFinale()) {
    return { ok: false };
  }

  const state = getDeadMailFinale();

  if (
    !state.started ||
    state.eventIndex >= OPERATION_EVENTS.length - 1
  ) {
    return { ok: false };
  }

  const index = state.eventIndex + 1;

  commit({
    ...state,
    eventIndex: index
  });

  discover(OPERATION_EVENTS[index].facts);

  return {
    ok: true,
    event: OPERATION_EVENTS[index]
  };
}

export function readDeadMailDisclosure(id) {
  if (
    !canStartDeadMailFinale() ||
    getDeadMailFinale().eventIndex !==
      OPERATION_EVENTS.length - 1 ||
    !['orders', 'resale', 'marker'].includes(id)
  ) {
    return false;
  }

  discover([id]);

  return true;
}

export function chooseDeadMailReport(field, answer) {
  if (!canStartDeadMailFinale()) return false;

  const state = getDeadMailFinale();

  if (
    reportBusy ||
    state.completed ||
    !Object.keys(FINAL_FACTS).every(
      id => state.facts.includes(id)
    )
  ) {
    return false;
  }

  const definition = REPORT_FIELDS.find(
    entry => entry.id === field
  );

  if (
    !definition ||
    !Number.isInteger(answer) ||
    answer < 0 ||
    answer >= definition.options.length
  ) {
    return false;
  }

  commit({
    ...state,
    report: {
      ...state.report,
      [field]: answer
    }
  });

  return true;
}

function closeBoard() {
  const state = gameState.piInvestigations;

  const investigation =
    state?.cases?.[DEAD_MAIL_PREVIEW_CASE];

  if (!investigation) return;

  gameState.piInvestigations = {
    ...state,

    cases: {
      ...state.cases,

      [DEAD_MAIL_PREVIEW_CASE]: {
        ...investigation,
        status: 'completed'
      }
    }
  };
}

function settleDeadMailXP() {
  const eventId = xpEventId();
  let result;

  try {
    result = progressionManager.grantReward(
      XP_REWARD_ID,
      DEAD_MAIL_PREVIEW_CASE,
      'PI case completed: Dead Mail'
    );
  } catch (error) {
    if (!progressionManager.hasReward(eventId)) {
      throw error;
    }

    console.error(
      '[Dead Mail] XP notification failed after commit:',
      error
    );

    result = {
      success: false,
      reason: 'already_granted'
    };
  }

  if (
    !result.success &&
    result.reason !== 'already_granted'
  ) {
    throw new Error(
      `XP settlement failed: ${
        result.reason || 'unknown_error'
      }`
    );
  }

  if (!progressionManager.hasReward(eventId)) {
    throw new Error(
      'The Dead Mail XP reward was not recorded.'
    );
  }

  return {
    result,

    record: {
      eventId,
      rewardId: XP_REWARD_ID,
      scopeId: DEAD_MAIL_PREVIEW_CASE,
      applied: true
    }
  };
}

export function submitDeadMailReport() {
  if (reportBusy) {
    return {
      ok: false,
      message: 'The report is being processed.'
    };
  }

  if (!canStartDeadMailFinale()) {
    return { ok: false };
  }

  const state = getDeadMailFinale();

  if (state.completed) {
    return {
      ok: true,
      alreadyCompleted: true,
      message:
        'This case is already closed. Rewards will not duplicate.'
    };
  }

  if (
    !Object.keys(FINAL_FACTS).every(
      id => state.facts.includes(id)
    )
  ) {
    return {
      ok: false,
      message:
        'Collect the operation and disclosure records first.'
    };
  }

  if (
    !REPORT_FIELDS.every(
      definition =>
        state.report[definition.id] === definition.answer
    )
  ) {
    commit({
      ...state,
      attempts: state.attempts + 1
    });

    return {
      ok: false,
      message:
        'The report is not fully supported. Check identity, method, financial motive and the link to earlier orders. No reward has been granted.'
    };
  }

  reportBusy = true;

  try {
    const report = REPORT_FIELDS.map(
      definition =>
        `${definition.title}\n${
          definition.options[state.report[definition.id]]
        }`
    ).join('\n\n');

    note(
      'report',
      'Final report / Return to Sender',
      report,
      'Case completed / development preview'
    );

    let xpSettlement;

    try {
      xpSettlement = settleDeadMailXP();
    } catch (error) {
      console.error(
        '[Dead Mail] XP settlement failed:',
        error
      );

      return {
        ok: false,
        message:
          'The report is supported, but XP settlement failed. Submit the same report again; recorded XP will not repeat.'
      };
    }

    commit({
      ...getDeadMailFinale(),
      completed: true,
      completedAt: new Date().toISOString(),
      stage: 'epilogue',
      xp: xpSettlement.record
    });

    closeBoard();

    let achievementError = null;

    try {
      checkAndAwardAchievements();
    } catch (error) {
      achievementError = String(error);

      console.error(
        '[Dead Mail] Achievement notification failed:',
        error
      );
    }

    let saved = false;

    try {
      saved = saveGameState() === true;
    } catch (error) {
      console.error(
        '[Dead Mail] Save failed:',
        error
      );
    }

    const xpGranted = xpSettlement.result.success
      ? xpSettlement.result.grantedXP
      : 0;

    const xpText =
      xpGranted > 0 ? ` +${xpGranted} XP.` : '';

    let message;

    if (achievementError) {
      message =
        'Case closed.' +
        xpText +
        ' Use SAVE AGAIN to retry achievement notifications and saving.';
    } else if (saved) {
      message =
        'Case closed.' +
        xpText +
        ' Return to Sender unlocked; your souvenir phone is ready to claim.';
    } else {
      message =
        'Case closed.' +
        xpText +
        ' Saving failed. Use SAVE AGAIN before leaving.';
    }

    return {
      ok: true,
      saved,
      achievementError,
      xpGranted,
      message
    };
  } catch (error) {
    console.error(
      '[Dead Mail] Report settlement interrupted:',
      error
    );

    requestAutosave();

    return {
      ok: false,
      message:
        'Report settlement interrupted. Retry the report; recorded XP will not repeat.'
    };
  } finally {
    reportBusy = false;
  }
}

export function claimDeadMailReward() {
  if (
    !canStartDeadMailFinale() ||
    !getDeadMailFinale().completed
  ) {
    return {
      ok: false,
      message: 'Finish the report first.'
    };
  }

  const state = getDeadMailFinale();

  if (state.rewardClaimed) {
    return {
      ok: true,
      alreadyClaimed: true,
      message:
        'The Last Ringtone has already been claimed. No duplicate item was added.'
    };
  }

  let added = inventoryManager.hasItem(
    DEAD_MAIL_REWARD.id
  );

  if (!added) {
    try {
      added = inventoryManager.addItem(
        JSON.parse(JSON.stringify(DEAD_MAIL_REWARD))
      ) === true;
    } catch (error) {
      added = inventoryManager.hasItem(
        DEAD_MAIL_REWARD.id
      );

      console.error(
        '[Dead Mail] Inventory notification failed:',
        error
      );
    }
  }

  if (!added) {
    return {
      ok: false,
      pending: true,
      message:
        'Inventory full or unavailable. The phone remains waiting here. Make room and claim it later.'
    };
  }

  commit({
    ...state,
    rewardClaimed: true
  });

  let saved = false;

  try {
    saved = saveGameState() === true;
  } catch (error) {
    console.error(
      '[Dead Mail] Reward save failed:',
      error
    );
  }

  return {
    ok: true,
    saved,

    message: saved
      ? 'The Last Ringtone added to inventory. Its messages remain replayable here.'
      : 'Phone added, but saving failed. Use SAVE AGAIN before leaving.'
  };
}

export function playDeadMailMessage(index) {
  if (
    !canStartDeadMailFinale() ||
    !getDeadMailFinale().completed ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= PHONE_MESSAGES.length
  ) {
    return null;
  }

  const state = getDeadMailFinale();

  if (!state.heardMessages.includes(index)) {
    commit({
      ...state,
      heardMessages: [...state.heardMessages, index]
    });
  }

  return PHONE_MESSAGES[index];
}

export function saveDeadMailFinale() {
  if (!canStartDeadMailFinale()) return false;

  try {
    if (getDeadMailFinale().completed) {
      checkAndAwardAchievements();
    }

    return saveGameState() === true;
  } catch (error) {
    console.error(
      '[Dead Mail] Save retry failed:',
      error
    );

    return false;
  }
}