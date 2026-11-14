import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  moneyManager,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  applyReputationEvent,
  getReputation
} from './ReputationManager.js';

import {
  requestAutosave,
  saveGameState
} from '../gameStatePersistence.js';

import {
  progressionManager
} from './ProgressionManager.js';

export const ALIBI_QUEST_ID = 'pi_stolen_alibi';
export const ALIBI_FINAL_STATE = 'piBorrowedAlibiFinale';

const SEARCH = 'borrowed_alibi';
const clone = value => JSON.parse(JSON.stringify(value));

const XP_REWARD_ID = 'pi_case_large';

const XP_EVENT_ID = JSON.stringify([
  'reward',
  XP_REWARD_ID,
  ALIBI_QUEST_ID
]);

let busy = false;

export const ALIBI_QUESTIONS = [
  {
    id: 'source',
    question: __dialogueText("managers/AlibiResolutionService.js", "t_d8946679c834170918ac"),
    claims: [
      {
        id: 'arthur',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_8fda6b95eabdcdf3235d")
      },
      {
        id: 'club',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_ea36ca1b38c458d1553f")
      },
      {
        id: 'restaurant',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_cdb358e68096911508c9")
      }
    ],
    evidence: [
      {
        id: 'events',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_110908fcf067cf72a394")
      },
      {
        id: 'receipt',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_bb1f852b6af7ee088b12")
      },
      {
        id: 'sample_requests',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_9c7957091f3787815680")
      }
    ],
    correctClaim: 'club',
    correctEvidence: 'sample_requests'
  },
  {
    id: 'dinner',
    question: __dialogueText("managers/AlibiResolutionService.js", "t_fca0d76a2d30c5297e59"),
    claims: [
      {
        id: 'alone',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_2813812a0f769a0f0868")
      },
      {
        id: 'four',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_84e3a086301d70263749")
      },
      {
        id: 'unknown',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_69a3fbf40785b9f49705")
      }
    ],
    evidence: [
      {
        id: 'three_claims',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_aac54be2ca47a1e82636")
      },
      {
        id: 'receipt_service',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_dcc07ab0c22d506f448a")
      },
      {
        id: 'club_ad',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_2a20b535c612331b409a")
      }
    ],
    correctClaim: 'alone',
    correctEvidence: 'receipt_service'
  },
  {
    id: 'distinction',
    question: __dialogueText("managers/AlibiResolutionService.js", "t_69307c6b7bdb26d9e828"),
    claims: [
      {
        id: 'all_guilty',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_4901792aede9ff1d81ce")
      },
      {
        id: 'convicted',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_5aff9bab5c2fe8b48707")
      },
      {
        id: 'checked',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_30e7a1f5e781db8d29e5")
      }
    ],
    evidence: [
      {
        id: 'admissions',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_a7873da6644e9b61ab3e")
      },
      {
        id: 'sample_only',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_fb7c5d2c2f34a1a991de")
      },
      {
        id: 'independent_company',
        text: __dialogueText("managers/AlibiResolutionService.js", "t_c8ecf204dd0d263f13e0")
      }
    ],
    correctClaim: 'checked',
    correctEvidence: 'independent_company'
  }
];

export const ALIBI_ENDINGS = [
  {
    id: 'discreet',
    label: __dialogueText("managers/AlibiResolutionService.js", "t_c4d9cfcbcfb575de0086"),
    title: __dialogueText("managers/AlibiResolutionService.js", "t_d04721eb5f1acc7b8d04"),
    bonus: 0,
    event: 'honest_pi_report',
    nominalIntegrity: 5
  },
  {
    id: 'full',
    label: __dialogueText("managers/AlibiResolutionService.js", "t_ec9c2e962f7abf937a94"),
    title: __dialogueText("managers/AlibiResolutionService.js", "t_f8ab0ddc47385b799c80"),
    bonus: 0,
    event: 'honest_pi_report',
    nominalIntegrity: 5
  },
  {
    id: 'silence',
    label: __dialogueText("managers/AlibiResolutionService.js", "t_2fde7518981fb4bf2515"),
    title: __dialogueText("managers/AlibiResolutionService.js", "t_1422594578da7bced689"),
    bonus: 120,
    event: 'bribe_accepted',
    nominalIntegrity: -50
  }
];

const REQUIRED_FLAGS = [
  [
    'receipt_received',
    __dialogueText("managers/AlibiResolutionService.js", "t_b0793aeb30ef9c565a99")
  ],
  [
    'no_hot_food',
    __dialogueText("managers/AlibiResolutionService.js", "t_dc11c530deafbac3113a")
  ],
  [
    'club_sample_received',
    __dialogueText("managers/AlibiResolutionService.js", "t_1a5a93b2c9e64c5bec1f")
  ],
  [
    'nora_admitted',
    __dialogueText("managers/AlibiResolutionService.js", "t_39d01ee201c55ba3a10f")
  ],
  [
    'simon_admitted',
    __dialogueText("managers/AlibiResolutionService.js", "t_29fa297822f20036f869")
  ],
  [
    'evelyn_confronted',
    __dialogueText("managers/AlibiResolutionService.js", "t_3bf221c2adb0555815b1")
  ],
  [
    'evelyn_slip',
    __dialogueText("managers/AlibiResolutionService.js", "t_6e4b02bd92268ee1a338")
  ],
  [
    'company_incident_verified',
    __dialogueText("managers/AlibiResolutionService.js", "t_5d6553e524922a46af17")
  ],
  [
    'folder_detail_verified',
    __dialogueText("managers/AlibiResolutionService.js", "t_79dc674102ca42bbec3f")
  ]
];

export function getAlibiFinale() {
  const saved = gameState[ALIBI_FINAL_STATE] || {};

  return {
    ...saved,
    version: 1,

    draft: {
      step: 0,
      selections: {},
      checked: [],
      endingId: null,
      attempts: 0,
      ...(saved.draft || {})
    },

    settlement: saved.settlement || null
  };
}

function write(patch) {
  gameState[ALIBI_FINAL_STATE] = {
    ...getAlibiFinale(),
    ...patch,
    version: 1
  };

  requestAutosave();
}

export function getAlibiMissing() {
  const quest =
    gameState.piQuests?.quests?.[ALIBI_QUEST_ID];

  if (!quest) {
    return [__dialogueText("managers/AlibiResolutionService.js", "t_ae1abc18b910bf52f832")];
  }

  const flags =
    gameState.piPhoneInvestigations?.cases?.[SEARCH]?.flags || [];

  const known =
    gameState.piKeywordSearch?.cases?.[SEARCH]?.known || [];

  const read = gameState.piBorrowedAlibi?.read || [];

  const missing = REQUIRED_FLAGS
    .filter(([id]) => !flags.includes(id))
    .map(([, text]) => text);

  if (!known.includes('nora_verified')) {
    missing.push(
      __dialogueText("managers/AlibiResolutionService.js", "t_c76bb3b847afffffbc0c")
    );
  }

  if (!known.includes('simon_verified')) {
    missing.push(
      __dialogueText("managers/AlibiResolutionService.js", "t_d7ed364b0c98d3bcf09b")
    );
  }

  if (!read.includes('alibi_copper_receipt')) {
    missing.push(__dialogueText("managers/AlibiResolutionService.js", "t_43bdeac43af6b59996a8"));
  }

  if (!read.includes('alibi_club_sample')) {
    missing.push(__dialogueText("managers/AlibiResolutionService.js", "t_0999f88c5a20fddbd56b"));
  }

  return missing;
}

export function isAlibiReady() {
  return (
    gameState.piQuests?.quests?.[ALIBI_QUEST_ID]?.status === 'active' &&
    getAlibiMissing().length === 0
  );
}

export function isAlibiReconstructed() {
  const draft = getAlibiFinale().draft;

  return ALIBI_QUESTIONS.every(
    question =>
      draft.checked.includes(question.id) &&
      draft.selections[question.id]?.claimId === question.correctClaim &&
      draft.selections[question.id]?.evidenceId === question.correctEvidence
  );
}

export function setAlibiStep(index) {
  if (getAlibiFinale().settlement) return false;

  const step = Math.max(
    0,
    Math.min(
      ALIBI_QUESTIONS.length - 1,
      Number.isInteger(index) ? index : 0
    )
  );

  write({
    draft: {
      ...getAlibiFinale().draft,
      step
    }
  });

  return true;
}

export function selectAlibiAnswer(questionId, kind, id) {
  const saved = getAlibiFinale();

  const question = ALIBI_QUESTIONS.find(
    entry => entry.id === questionId
  );

  if (
    saved.settlement ||
    !isAlibiReady() ||
    !question ||
    !['claimId', 'evidenceId'].includes(kind) ||
    saved.draft.checked.includes(question.id)
  ) {
    return false;
  }

  const options =
    kind === 'claimId'
      ? question.claims
      : question.evidence;

  if (!options.some(option => option.id === id)) {
    return false;
  }

  write({
    draft: {
      ...saved.draft,

      selections: {
        ...saved.draft.selections,

        [question.id]: {
          ...(saved.draft.selections[question.id] || {}),
          [kind]: id
        }
      }
    }
  });

  return true;
}

export function checkAlibiAnswer(questionId) {
  const saved = getAlibiFinale();

  const question = ALIBI_QUESTIONS.find(
    entry => entry.id === questionId
  );

  if (
    saved.settlement ||
    !isAlibiReady() ||
    !question
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/AlibiResolutionService.js", "t_019d1aee8ef68b0abcc0")
    };
  }

  const answer =
    saved.draft.selections[question.id] || {};

  const ok =
    answer.claimId === question.correctClaim &&
    answer.evidenceId === question.correctEvidence;

  write({
    draft: {
      ...saved.draft,
      attempts: saved.draft.attempts + 1,

      checked: ok
        ? [...new Set([...saved.draft.checked, question.id])]
        : saved.draft.checked
    }
  });

  return {
    ok,
    message: ok
      ? __dialogueText("managers/AlibiResolutionService.js", "t_2ff49615f89053251be2")
      : __dialogueText("managers/AlibiResolutionService.js", "t_574085ff3b06ab601075")
  };
}

export function selectAlibiEnding(id) {
  const saved = getAlibiFinale();

  if (
    saved.settlement ||
    !isAlibiReady() ||
    !isAlibiReconstructed() ||
    !ALIBI_ENDINGS.some(ending => ending.id === id)
  ) {
    return false;
  }

  write({
    draft: {
      ...saved.draft,
      endingId: id
    }
  });

  return true;
}

function narrative(id) {
  const opening =
    __dialogueText("managers/AlibiResolutionService.js", "t_c06727115a681a38d0f5");

  const distinction =
    __dialogueText("managers/AlibiResolutionService.js", "t_a7bdbc5b4e42ae73c283");

  if (id === 'silence') {
    return {
      report:
        __dialogueText("managers/AlibiResolutionService.js", "t_0f0c3f280493a3ddd188"),

      dossier: null,

      reply:
        __dialogueText("managers/AlibiResolutionService.js", "t_2bedc611620fdced29ae"),

      summary:
        __dialogueText("managers/AlibiResolutionService.js", "t_e82784d3aca3c2f113a7"),

      deliveries: [
        __dialogueText("managers/AlibiResolutionService.js", "t_a5113981c689b111a0a6"),
        __dialogueText("managers/AlibiResolutionService.js", "t_8d1549a4502a035c9908")
      ],

      privacy:
        __dialogueText("managers/AlibiResolutionService.js", "t_2ee4f65dab352277d0df")
    };
  }

  const privatePart = id === 'full'
    ? __dialogueText("managers/AlibiResolutionService.js", "t_2aba496278e3f7445a8d")
    : __dialogueText("managers/AlibiResolutionService.js", "t_8074a04b0706ab6dbc11");

  return {
    report:
      __dialogueText("managers/AlibiResolutionService.js", "t_f66bea223f945f7fcafc") +
      opening +
      '\n\n' +
      distinction +
      privatePart +
      __dialogueText("managers/AlibiResolutionService.js", "t_86b2345f9df7568b757a"),

    dossier:
      opening +
      '\n\n' +
      distinction +
      __dialogueText("managers/AlibiResolutionService.js", "t_5a828098152804ffe02a"),

    reply: id === __dialogueText("managers/AlibiResolutionService.js", "t_a18b869b2e81c0c52955")
      ? __dialogueText("managers/AlibiResolutionService.js", "t_b25c65a67690ecae1a4d")
      : __dialogueText("managers/AlibiResolutionService.js", "t_dd1772b31f234506e79a"),

    summary: id === __dialogueText("managers/AlibiResolutionService.js", "t_a18b869b2e81c0c52955")
      ? __dialogueText("managers/AlibiResolutionService.js", "t_79d150ca30b7e4e02ed6")
      : __dialogueText("managers/AlibiResolutionService.js", "t_044a82be020e49e5667a"),

    deliveries: [
      __dialogueText("managers/AlibiResolutionService.js", "t_644f49a15362fa82f3dd"),
      __dialogueText("managers/AlibiResolutionService.js", "t_7eeb8fc2c2ab69972601")
    ],

    privacy: id === 'full'
      ? __dialogueText("managers/AlibiResolutionService.js", "t_5d69591a1f40aaf96ef6")
      : __dialogueText("managers/AlibiResolutionService.js", "t_a168ee5787a34af82c68")
  };
}

export function getAlibiPreview(
  endingId = getAlibiFinale().draft.endingId
) {
  const saved = getAlibiFinale();

  if (saved.settlement) {
    return clone(saved.settlement.preview);
  }

  const ending = ALIBI_ENDINGS.find(
    entry => entry.id === endingId
  );

  const quest =
    gameState.piQuests?.quests?.[ALIBI_QUEST_ID];

  if (
    !ending ||
    !quest ||
    !Number.isInteger(quest.reward) ||
    quest.reward < 0
  ) {
    return null;
  }

  return {
    endingId: ending.id,
    title: ending.title,
    fee: quest.reward,
    bonus: ending.bonus,
    total: quest.reward + ending.bonus,
    event: ending.event,
    nominalIntegrity: ending.nominalIntegrity,
    ...narrative(ending.id)
  };
}

export function alibiPreviewToken(preview) {
  return JSON.stringify(preview);
}

function paymentRecorded(id) {
  return (gameState.moneyLog || []).some(
    transaction =>
      transaction.type === 'income' &&
      transaction.source === 'cash' &&
      transaction.metadata?.alibiSettlementId === id
  );
}

function pay(pending) {
  if (
    pending.paid ||
    paymentRecorded(pending.id) ||
    pending.preview.total === 0
  ) {
    return;
  }

  const before = moneyManager.getState();

  try {
    moneyManager.addCash(pending.preview.total, {
      category: ECONOMY_CATEGORY.SIDE_CASE,
      description: __dialogueText("managers/AlibiResolutionService.js", "t_9b40090eba6d4da0fee4"),
      missionId: ALIBI_QUEST_ID,

      metadata: {
        alibiSettlementId: pending.id,
        questId: ALIBI_QUEST_ID,
        endingId: pending.endingId,
        contractFee: pending.preview.fee,
        silencePayment: pending.preview.bonus
      }
    });
  } catch (error) {
    if (paymentRecorded(pending.id)) return;

    gameState.cash = before.cash;
    gameState.moneyLog = clone(before.moneyLog);

    throw error;
  }
}

function settleIntegrity(pending) {
  const eventId = pending.id + ':integrity';

  if (!getReputation().appliedEventIds.includes(eventId)) {
    const before = getReputation().integrity;

    try {
      applyReputationEvent(pending.preview.event, {
        eventId,
        headline: null,

        context: {
          caseId: ALIBI_QUEST_ID,
          questId: ALIBI_QUEST_ID,
          endingId: pending.endingId,
          settlementId: pending.id
        }
      });
    } catch (error) {
      if (!getReputation().appliedEventIds.includes(eventId)) {
        throw error;
      }
    }

    return {
      eventId,
      type: pending.preview.event,
      actualDelta: getReputation().integrity - before
    };
  }

  return pending.integrity || {
    eventId,
    type: pending.preview.event,
    actualDelta: null
  };
}

function settleAlibiXP(pending) {
  if (
    pending.phase !== 'settling' ||
    pending.paid !== true ||
    !pending.integrity ||
    !ALIBI_ENDINGS.some(
      ending => ending.id === pending.endingId
    )
  ) {
    throw new Error(
      'The Alibi report is not ready for XP settlement.'
    );
  }

  let result;

  try {
    result = progressionManager.grantReward(
      XP_REWARD_ID,
      ALIBI_QUEST_ID,
      __dialogueText("managers/AlibiResolutionService.js", "t_44051a1409406ac82570")
    );
  } catch (error) {
    if (!progressionManager.hasReward(XP_EVENT_ID)) {
      throw error;
    }

    console.error(
      '[AlibiResolutionService] XP notification failed after commit:',
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
      `XP settlement failed: ${result.reason || 'unknown_error'}`
    );
  }

  if (!progressionManager.hasReward(XP_EVENT_ID)) {
    throw new Error(
      'The Alibi XP reward was not recorded.'
    );
  }

  return {
    result,

    record: {
      eventId: XP_EVENT_ID,
      rewardId: XP_REWARD_ID,
      scopeId: ALIBI_QUEST_ID,
      applied: true
    }
  };
}

function closeCase(settled) {
  const quests = gameState.piQuests;
  const quest = quests?.quests?.[ALIBI_QUEST_ID];

  if (!quest) {
    throw new Error('The contract is missing.');
  }

  const resolution = {
    endingId: settled.endingId,
    summary: settled.preview.summary,
    reward: settled.preview.total,
    contractFee: settled.preview.fee,
    bonus: settled.preview.bonus,
    paid: true,
    settlementId: settled.id,
    integrity: clone(settled.integrity),
    xp: clone(settled.xp),
    deliveries: clone(settled.preview.deliveries),
    dossier: settled.preview.dossier
  };

  gameState.piQuests = {
    ...quests,

    quests: {
      ...quests.quests,

      [ALIBI_QUEST_ID]: {
        ...quest,
        status: 'completed',

        objectives: (quest.objectives || []).map(
          objective => ({
            ...objective,
            completed: true
          })
        ),

        resolution,
        completedAt: settled.completedAt
      }
    }
  };

  const investigations = gameState.piInvestigations;
  const investigation =
    investigations?.cases?.[ALIBI_QUEST_ID];

  if (investigation) {
    const board = clone(
      investigation.board || {
        items: [],
        links: []
      }
    );

    const id = 'alibi_final_report';

    board.items = [
      ...(board.items || []).filter(
        item => item.id !== id
      ),
      {
        id,
        type: 'note',
        label: __dialogueText("managers/AlibiResolutionService.js", "t_f7bd620662e11f6983a4"),

        text:
          settled.preview.report +
          (
            settled.preview.dossier
              ? __dialogueText("managers/AlibiResolutionService.js", "t_7eec7739424792c110c9") + settled.preview.dossier
              : ''
          ),

        metaText: settled.preview.title,
        color: 'yellow',
        x: 120,
        y: 380,
        discovered: true,
        createdByPlayer: false,
        editableByPlayer: false
      }
    ];

    gameState.piInvestigations = {
      ...investigations,

      cases: {
        ...investigations.cases,

        [ALIBI_QUEST_ID]: {
          ...investigation,
          status: 'completed',
          resolution: clone(resolution),
          board
        }
      }
    };
  }
}

export function finishAlibiReport(endingId, expectedToken) {
  if (busy) {
    return {
      ok: false,
      message: __dialogueText("managers/AlibiResolutionService.js", "t_121c46bd29ff094cffa5")
    };
  }

  const saved = getAlibiFinale();
  const quest =
    gameState.piQuests?.quests?.[ALIBI_QUEST_ID];

  if (
    saved.settlement?.phase === 'completed' ||
    (
      quest?.status === 'completed' &&
      !saved.settlement
    )
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/AlibiResolutionService.js", "t_bfdb83da449f6c1b3fb4")
    };
  }

  if (!quest) {
    return {
      ok: false,
      message: __dialogueText("managers/AlibiResolutionService.js", "t_98841ecd1a26cddb2366")
    };
  }

  if (
    !saved.settlement &&
    (!isAlibiReady() || !isAlibiReconstructed())
  ) {
    return {
      ok: false,
      message:
        __dialogueText("managers/AlibiResolutionService.js", "t_54b72815b76ba5e251f6")
    };
  }

  const preview = getAlibiPreview(endingId);

  if (
    !preview ||
    preview.endingId !== endingId ||
    (
      !saved.settlement &&
      saved.draft.endingId !== endingId
    )
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/AlibiResolutionService.js", "t_53dc81cd850bca7484a3")
    };
  }

  if (
    typeof expectedToken !== 'string' ||
    expectedToken !== alibiPreviewToken(preview)
  ) {
    return {
      ok: false,
      message:
        __dialogueText("managers/AlibiResolutionService.js", "t_86988b8c6db1add3363c")
    };
  }

  busy = true;

  try {
    let pending = saved.settlement || {
      phase: 'settling',

      id:
        `${ALIBI_QUEST_ID}:${
          quest.acceptedAt || 'legacy-contract'
        }`,

      endingId,
      preview: clone(preview),
      paid: false,
      integrity: null
    };

    write({ settlement: pending });

    try {
      pay(pending);
    } catch (error) {
      write({
        settlement: {
          ...pending,
          lastError:
            __dialogueText("managers/AlibiResolutionService.js", "t_c64e704cd125fe6a6129")
        }
      });

      return {
        ok: false,
        message:
          __dialogueText("managers/AlibiResolutionService.js", "t_13a16b9a306c6508f16f")
      };
    }

    pending = {
      ...pending,
      paid: true,
      lastError: null
    };

    write({ settlement: pending });

    try {
      pending = {
        ...pending,
        integrity: settleIntegrity(pending)
      };

      write({ settlement: pending });
    } catch (error) {
      write({
        settlement: {
          ...pending,
          lastError: __dialogueText("managers/AlibiResolutionService.js", "t_849ba478c19d238c5acf")
        }
      });

      return {
        ok: false,
        message:
          __dialogueText("managers/AlibiResolutionService.js", "t_dfc68049c65d178c3e23")
      };
    }

    let xpSettlement;

    try {
      xpSettlement = settleAlibiXP(pending);

      pending = {
        ...pending,
        xp: xpSettlement.record,
        lastError: null
      };

      write({ settlement: pending });
    } catch (error) {
      console.error(
        '[AlibiResolutionService] XP could not be settled:',
        error
      );

      write({
        settlement: {
          ...pending,
          lastError: __dialogueText("managers/AlibiResolutionService.js", "t_0e2b19ae49054d281c3b")
        }
      });

      return {
        ok: false,
        message:
          __dialogueText("managers/AlibiResolutionService.js", "t_909191a77fcc6d05f2af")
      };
    }

    const completed = {
      ...pending,
      phase: 'completed',
      completedAt: new Date().toISOString(),
      lastError: null
    };

    closeCase(completed);
    write({ settlement: completed });

    let saveSucceeded = false;

    try {
      saveSucceeded = saveGameState() === true;
    } catch (error) {
      console.error(
        '[AlibiResolutionService] Save failed:',
        error
      );
    }

    const xpGranted = xpSettlement.result.success
      ? xpSettlement.result.grantedXP
      : 0;

    return {
      ok: true,
      saved: saveSucceeded,
      total: completed.preview.total,
      xpGranted,

      message: saveSucceeded
        ? (
            `${__dialogueText("managers/AlibiResolutionService.js", "t_56e84f304751a9d98a80")}${completed.preview.total}${__dialogueText("managers/AlibiResolutionService.js", "t_cdb4ee2aea69cc6a8333")}` +
            (xpGranted > 0 ? `${__dialogueText("managers/AlibiResolutionService.js", "t_c13f23cc27f966a4eadf")}${xpGranted}${__dialogueText("managers/AlibiResolutionService.js", "t_a73feda6e2f76a6b740b")}` : '')
          )
        : __dialogueText("managers/AlibiResolutionService.js", "t_5116e294bbed1f5b6c9b")
    };
  } catch (error) {
    console.error(
      '[AlibiResolutionService] Settlement interrupted:',
      error
    );

    requestAutosave();

    return {
      ok: false,
      message:
        __dialogueText("managers/AlibiResolutionService.js", "t_8e849dc8a42c88739b70")
    };
  } finally {
    busy = false;
  }
}