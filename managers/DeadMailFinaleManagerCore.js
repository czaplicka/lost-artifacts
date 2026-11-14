import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  source = __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_36d1feb331990036aad9")
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
    title: __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_5ee92a6a27737a6acdc5"),
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_4b5baad31169eb33eaaa")
    };
  }

  if (state.coverage !== 'continuous') {
    return {
      ok: false,
      message:
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_72e675369e20c042f2c0")
    };
  }

  if (state.intervention !== 'documented') {
    return {
      ok: false,
      message:
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_ac405858ca162bb32ac2")
    };
  }

  return {
    ok: true,
    message:
      __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_158849fab2d718ba5d73")
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
      message: __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_ad1df22da58e5623b379")
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
      __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_fef3808f7b24ea3a200b")
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
      message: __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_121c46bd29ff094cffa5")
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_163213367b889a09f818")
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_45712a42d95bc1e8e84f")
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_4783f1e07e7adad49d97")
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
      __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_6ca4fd7a4c5104f51d2f"),
      report,
      __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_8cbfcd477049d8e4b356")
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
          __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_badabb3235bb16f7179d")
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
      xpGranted > 0 ? `${__dialogueText("managers/DeadMailFinaleManagerCore.js", "t_c13f23cc27f966a4eadf")}${xpGranted}${__dialogueText("managers/DeadMailFinaleManagerCore.js", "t_a73feda6e2f76a6b740b")}` : '';

    let message;

    if (achievementError) {
      message =
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_e474c5de64f5d8c8cbac") +
        xpText +
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_1c08cbe019b147420177");
    } else if (saved) {
      message =
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_e474c5de64f5d8c8cbac") +
        xpText +
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_4c8abc5b5f22a2926153");
    } else {
      message =
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_e474c5de64f5d8c8cbac") +
        xpText +
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_5c80c63d0e6ba171a8b3");
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_477704924e3186ec95fb")
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
      message: __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_5ce8746779abf9a02adc")
    };
  }

  const state = getDeadMailFinale();

  if (state.rewardClaimed) {
    return {
      ok: true,
      alreadyClaimed: true,
      message:
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_a582c2e6fe48077beba0")
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
        __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_a9a795edf38b2373a2c3")
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
      ? __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_2960d597e20361200727")
      : __dialogueText("managers/DeadMailFinaleManagerCore.js", "t_c9dddc06a1ed1a0b4965")
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