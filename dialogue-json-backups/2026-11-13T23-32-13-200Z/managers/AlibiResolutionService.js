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
    question: 'Where did the repeated dinner account come from?',
    claims: [
      {
        id: 'arthur',
        text: 'Arthur invented three companions to conceal his own evening.'
      },
      {
        id: 'club',
        text: 'The club supplied a shared script using Arthur without his agreement.'
      },
      {
        id: 'restaurant',
        text: 'The restaurant sold three genuine reservations with Arthur.'
      }
    ],
    evidence: [
      {
        id: 'events',
        text: 'Nora’s stage record and Simon’s match sheet.'
      },
      {
        id: 'receipt',
        text: 'Arthur’s receipt by itself.'
      },
      {
        id: 'sample_requests',
        text: 'The club sample compared with all three forwarded dinner accounts.'
      }
    ],
    correctClaim: 'club',
    correctEvidence: 'sample_requests'
  },
  {
    id: 'dinner',
    question: 'What can you establish about Arthur’s Tuesday dinner?',
    claims: [
      {
        id: 'alone',
        text: 'Arthur’s recorded visit was for one guest; the claimed soup account is contradicted.'
      },
      {
        id: 'four',
        text: 'Four people shared the soup dinner described in the requests.'
      },
      {
        id: 'unknown',
        text: 'There is no usable information about his visit.'
      }
    ],
    evidence: [
      {
        id: 'three_claims',
        text: 'The three people repeated the same confident story.'
      },
      {
        id: 'receipt_service',
        text: 'The authorised receipt and the restaurant’s no-hot-food confirmation.'
      },
      {
        id: 'club_ad',
        text: 'The club’s advertisement promises convincing evenings.'
      }
    ],
    correctClaim: 'alone',
    correctEvidence: 'receipt_service'
  },
  {
    id: 'distinction',
    question: 'How do the three people differ after independent checks?',
    claims: [
      {
        id: 'all_guilty',
        text: 'All three must have committed the break-in because all three used the script.'
      },
      {
        id: 'convicted',
        text: 'Evelyn’s unsolicited detail proves theft and requires an immediate conviction.'
      },
      {
        id: 'checked',
        text: 'Nora and Simon are independently placed elsewhere; Evelyn’s contradicted account and undisclosed knowledge require investigation, not a verdict.'
      }
    ],
    evidence: [
      {
        id: 'admissions',
        text: 'Nora and Simon’s own explanations, with no independent checks.'
      },
      {
        id: 'sample_only',
        text: 'The sample alone identifies the burglar.'
      },
      {
        id: 'independent_company',
        text: 'The signed event records and the company’s check of Evelyn’s volunteered detail.'
      }
    ],
    correctClaim: 'checked',
    correctEvidence: 'independent_company'
  }
];

export const ALIBI_ENDINGS = [
  {
    id: 'discreet',
    label: 'RELEVANT FACTS',
    title: 'Report the findings. Protect irrelevant private details.',
    bonus: 0,
    event: 'honest_pi_report',
    nominalIntegrity: 5
  },
  {
    id: 'full',
    label: 'FULL DISCLOSURE',
    title: 'Report the findings and include the two personal explanations.',
    bonus: 0,
    event: 'honest_pi_report',
    nominalIntegrity: 5
  },
  {
    id: 'silence',
    label: 'TAKE THE OFFER',
    title: 'Accept $120 for silence and send an inconclusive report.',
    bonus: 120,
    event: 'bribe_accepted',
    nominalIntegrity: -50
  }
];

const REQUIRED_FLAGS = [
  [
    'receipt_received',
    'Obtain Arthur’s authorised restaurant receipt.'
  ],
  [
    'no_hot_food',
    'Finish the restaurant’s Tuesday service enquiry.'
  ],
  [
    'club_sample_received',
    'Obtain the club’s demonstration sample.'
  ],
  [
    'nora_admitted',
    'Confront Nora with the sample and restaurant evidence.'
  ],
  [
    'simon_admitted',
    'Confront Simon with the sample and restaurant evidence.'
  ],
  [
    'evelyn_confronted',
    'Confront Evelyn with the sample and restaurant evidence.'
  ],
  [
    'evelyn_slip',
    'Record Evelyn’s volunteered description.'
  ],
  [
    'company_incident_verified',
    'Confirm the public incident statement with the company.'
  ],
  [
    'folder_detail_verified',
    'Have the company check Evelyn’s volunteered detail.'
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
    return ['Accept The Borrowed Alibi.'];
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
      'Collect Nora’s independent stage-attendance confirmation.'
    );
  }

  if (!known.includes('simon_verified')) {
    missing.push(
      'Collect Simon’s independent match confirmation.'
    );
  }

  if (!read.includes('alibi_copper_receipt')) {
    missing.push('Open Arthur’s receipt in Mail.');
  }

  if (!read.includes('alibi_club_sample')) {
    missing.push('Open the club’s sample in Mail.');
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
      message: 'The case is not ready for reconstruction.'
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
      ? 'Conclusion supported.'
      : 'That claim and evidence do not establish the conclusion. Review the records.'
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
    'Arthur Finch’s authorised receipt records one guest, a cheese sandwich and sparkling water. The restaurant served no hot food that Tuesday evening. The three dinner accounts repeat the club’s TUE-DC-02 demonstration, which names Arthur without his agreement.';

  const distinction =
    'Independent signed stage and referee records place Nora Bell and Simon Pike elsewhere during the company’s 20:10–20:25 crime interval. Evelyn Shaw maintained the contradicted account and volunteered a physical description of the missing item. The company confirmed the match and said that description was not in its public statement. That discrepancy warrants further investigation. It is not proof of theft, and I make no finding of guilt.';

  if (id === 'silence') {
    return {
      report:
        'Arthur,\n\nI am closing the enquiry as inconclusive. I am not submitting the recovered template or my interview findings for further action. Your contract fee is due.\n\nPrivate Investigator',

      dossier: null,

      reply:
        'Detective,\n\n“Inconclusive” is not quite the explanation I hoped for. I have paid the contract fee. Please do not describe us as friends.\n\nArthur Finch',

      summary:
        'The detective suppressed the findings in exchange for the club’s silence payment.',

      deliveries: [
        'Client: inconclusive report only',
        'Club: acceptance of silence offer'
      ],

      privacy:
        'Relevant findings withheld; previous company conversations are not erased.'
    };
  }

  const privatePart = id === 'full'
    ? '\n\nPersonal explanations: Nora bought the account to avoid a family dinner while competing in the Civic Pie Challenge, where she won after seven slices. Simon used it to avoid a compulsory company dinner while playing in the Rook & Ruin Open. Their stories were checked against independent records.'
    : '\n\nThe two corroborated personal explanations are omitted from the client copy because their embarrassing details are not needed to clear your name.';

  return {
    report:
      'Arthur,\n\n' +
      opening +
      '\n\n' +
      distinction +
      privatePart +
      '\n\nI have forwarded a factual dossier to the company’s designated records liaison for the incident investigation. This is a referral, not an arrest or conviction.\n\nPrivate Investigator',

    dossier:
      opening +
      '\n\n' +
      distinction +
      '\n\nSources: the three original requests; the club demonstration; Arthur’s authorised receipt; the restaurant’s service confirmation; the official continuous stage record and supervised match sheet; Evelyn’s recorded words and the company liaison’s response. Only necessary timed verification is included.',

    reply: id === 'full'
      ? 'Detective,\n\nThank you for explaining the dinner and clearing my involvement. I did not need to know about the seven slices, but I now know about the seven slices.\n\nYour fee has been paid. In future I shall dine under a pseudonym.\n\nArthur Finch'
      : 'Detective,\n\nThank you for explaining the dinner and clearing my involvement. I appreciate the discretion.\n\nYour fee has been paid. I am relieved to learn I was alone. For a moment, I thought I had made friends.\n\nArthur Finch',

    summary: id === 'full'
      ? 'The template was exposed and the discrepancy referred, with personal explanations disclosed to the client.'
      : 'The template was exposed and the discrepancy referred, without disclosing irrelevant personal details.',

    deliveries: [
      'Client: factual report',
      'Company records liaison: factual dossier for further investigation'
    ],

    privacy: id === 'full'
      ? 'Personal explanations included in the client report.'
      : 'Irrelevant personal explanations withheld from the client; relevant findings preserved.'
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
      description: 'PI case closed: The Borrowed Alibi',
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
      'PI case completed: The Borrowed Alibi'
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
        label: 'Final report — The Borrowed Alibi',

        text:
          settled.preview.report +
          (
            settled.preview.dossier
              ? '\n\nREFERRAL DOSSIER\n' + settled.preview.dossier
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
      message: 'The report is being processed.'
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
      message: 'This case has already been closed.'
    };
  }

  if (!quest) {
    return {
      ok: false,
      message: 'The contract is missing.'
    };
  }

  if (
    !saved.settlement &&
    (!isAlibiReady() || !isAlibiReconstructed())
  ) {
    return {
      ok: false,
      message:
        'Complete the evidence checks and reconstruction first.'
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
      message: 'Choose a valid report.'
    };
  }

  if (
    typeof expectedToken !== 'string' ||
    expectedToken !== alibiPreviewToken(preview)
  ) {
    return {
      ok: false,
      message:
        'The report or payment changed. Review and confirm it again.'
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
            'Payment failed. Try finishing settlement again.'
        }
      });

      return {
        ok: false,
        message:
          'Payment failed. You can retry the same settlement.'
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
          lastError: 'Integrity update failed.'
        }
      });

      return {
        ok: false,
        message:
          'Payment recorded. Retry settlement to finish integrity; payment will not repeat.'
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
          lastError: 'XP settlement failed.'
        }
      });

      return {
        ok: false,
        message:
          'Payment and integrity recorded. Retry settlement to finish XP; recorded rewards will not repeat.'
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
            `Case closed. Received $${completed.preview.total}.` +
            (xpGranted > 0 ? ` +${xpGranted} XP.` : '')
          )
        : 'Case closed, but saving failed. Save your game before leaving.'
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
        'Settlement interrupted. Retry the same report; recorded payment and XP will not repeat.'
    };
  } finally {
    busy = false;
  }
}