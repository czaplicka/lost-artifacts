import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  moneyManager,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  requestAutosave,
  saveGameState
} from '../gameStatePersistence.js';

import {
  getGameTimeManager
} from './GameTimeManager.js';

import {
  applyReputationEvent,
  getReputation
} from './ReputationManager.js';

import {
  progressionManager
} from './ProgressionManager.js';

let busy = false;

const clone = value =>
  JSON.parse(JSON.stringify(value));

const KEY = 'reedResolution';
const QUEST_ID = 'pi_two_glasses';
const XP_REWARD_ID = 'pi_case_medium';

const XP_EVENT_ID = JSON.stringify([
  'reward',
  XP_REWARD_ID,
  QUEST_ID
]);

const INTEGRITY_RULES = Object.freeze({
  truth: 'honest_pi_report',
  withhold: 'concealed_pi_findings'
});

export function getReedResolution() {
  return gameState[KEY] || null;
}

export function validateReedFinale(config) {
  if (
    config?.version !== 1 ||
    config.questId !== QUEST_ID ||
    config.searchCaseId !== 'miramar_demo' ||
    !Array.isArray(config.endings) ||
    !config.endings.length ||
    !Array.isArray(config.requiredFlags) ||
    !Array.isArray(config.requiredObjectives)
  ) {
    throw new Error('Invalid Reed finale');
  }

  const ids = new Set();

  for (const ending of config.endings) {
    if (
      !/^[a-z0-9_-]+$/.test(ending.id) ||
      ids.has(ending.id) ||
      ![
        'label',
        'title',
        'report',
        'reply',
        'replySubject',
        'summary'
      ].every(
        key =>
          typeof ending[key] === 'string' &&
          ending[key].length
      )
    ) {
      throw new Error('Invalid Reed ending');
    }

    if (
      !INTEGRITY_RULES[ending.id] ||
      (
        ending.reputationEvent !== undefined &&
        ending.reputationEvent !==
          INTEGRITY_RULES[ending.id]
      )
    ) {
      throw new Error(
        'Invalid Reed integrity event'
      );
    }

    ids.add(ending.id);
  }

  return config;
}

export function canPrepareReedReport(config) {
  const quest =
    gameState.piQuests?.quests?.[config.questId];

  const resolution = getReedResolution();

  if (resolution?.phase === 'completed') {
    return false;
  }

  if (resolution?.phase === 'settling') {
    return Boolean(quest);
  }

  if (
    quest?.status !== 'active' ||
    gameState.reedContact?.status !== 'completed'
  ) {
    return false;
  }

  const flags =
    gameState.piPhoneInvestigations?.cases?.[
      config.searchCaseId
    ]?.flags || [];

  return (
    config.requiredFlags.every(
      flag => flags.includes(flag)
    ) &&
    config.requiredObjectives.every(
      id =>
        quest.objectives?.some(
          objective =>
            objective.id === id &&
            objective.completed
        )
    )
  );
}

function hasSettlementPayment(id) {
  return (gameState.moneyLog || []).some(
    transaction =>
      transaction.type === 'income' &&
      transaction.source === 'cash' &&
      transaction.metadata?.reedSettlementId === id
  );
}

// Zachowuje migrację reputacji dla starszych raportów.
// Nie przyznaje XP za wcześniej zamknięte sprawy.
export function syncReedReportIntegrity() {
  const resolution = getReedResolution();

  if (
    !resolution ||
    !resolution.settlementId ||
    resolution.paid !== true ||
    !['settling', 'completed'].includes(
      resolution.phase
    ) ||
    !INTEGRITY_RULES[resolution.endingId]
  ) {
    return {
      applied: false,
      reason: 'not_ready'
    };
  }

  const type =
    INTEGRITY_RULES[resolution.endingId];

  const eventId =
    `${resolution.settlementId}:integrity`;

  if (
    resolution.integrity?.eventId === eventId &&
    getReputation().appliedEventIds.includes(eventId)
  ) {
    return {
      applied: false,
      reason: 'already_applied'
    };
  }

  const before = getReputation();
  let result;

  try {
    result = applyReputationEvent(type, {
      eventId,
      headline: null,

      context: {
        questId: resolution.questId,
        endingId: resolution.endingId,
        settlementId: resolution.settlementId
      }
    });
  } catch (error) {
    if (
      !getReputation()
        .appliedEventIds.includes(eventId)
    ) {
      throw error;
    }

    console.error(
      '[ReedResolutionService] Reputation notification failed:',
      error
    );

    result = {
      applied: true,
      state: getReputation()
    };
  }

  const current = getReedResolution();

  gameState[KEY] = {
    ...current,

    integrity: {
      eventId,
      type,
      applied: true,

      actualDelta: result.applied
        ? getReputation().integrity -
          before.integrity
        : current.integrity?.actualDelta ?? null
    }
  };

  requestAutosave();

  return result;
}

function settleReedXP() {
  const resolution = getReedResolution();

  if (
    resolution?.questId !== QUEST_ID ||
    resolution.phase !== 'settling' ||
    resolution.paid !== true ||
    resolution.integrity?.applied !== true
  ) {
    throw new Error(
      'The report is not ready for XP settlement.'
    );
  }

  let result;

  try {
    result = progressionManager.grantReward(
      XP_REWARD_ID,
      QUEST_ID,
      __dialogueText("managers/ReedResolutionService.js", "t_d5af9717b1a7d6383ca3")
    );
  } catch (error) {
    // Powiadomienie lub autosave może zawieść
    // już po zapisaniu XP w stanie gry.
    if (!progressionManager.hasReward(XP_EVENT_ID)) {
      throw error;
    }

    console.error(
      '[ReedResolutionService] XP notification failed after commit:',
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

  if (!progressionManager.hasReward(XP_EVENT_ID)) {
    throw new Error(
      'The XP reward was not recorded.'
    );
  }

  const current = getReedResolution();

  gameState[KEY] = {
    ...current,

    xp: {
      eventId: XP_EVENT_ID,
      rewardId: XP_REWARD_ID,
      scopeId: QUEST_ID,
      applied: true
    }
  };

  requestAutosave();

  return result;
}

export function finishReedReport(config, endingId) {
  if (busy) {
    return {
      ok: false,
      message: __dialogueText("managers/ReedResolutionService.js", "t_121c46bd29ff094cffa5")
    };
  }

  validateReedFinale(config);

  const quest =
    gameState.piQuests?.quests?.[config.questId];

  const existing = getReedResolution();

  if (
    existing?.phase === 'completed' ||
    (
      quest?.status === 'completed' &&
      existing?.phase !== 'settling'
    )
  ) {
    syncReedReportIntegrity();

    return {
      ok: false,
      message: __dialogueText("managers/ReedResolutionService.js", "t_bfdb83da449f6c1b3fb4")
    };
  }

  if (!quest || !canPrepareReedReport(config)) {
    return {
      ok: false,
      message:
        __dialogueText("managers/ReedResolutionService.js", "t_d983af49304d4b1d1535")
    };
  }

  const ending = config.endings.find(
    entry => entry.id === endingId
  );

  if (!ending) {
    return {
      ok: false,
      message: __dialogueText("managers/ReedResolutionService.js", "t_53dc81cd850bca7484a3")
    };
  }

  if (
    existing?.phase === 'settling' &&
    existing.endingId !== endingId
  ) {
    return {
      ok: false,
      message:
        __dialogueText("managers/ReedResolutionService.js", "t_6ac377eb0efd283e5863")
    };
  }

  const reward =
    existing?.phase === 'settling'
      ? existing.reward
      : quest.reward;

  if (!Number.isInteger(reward) || reward < 0) {
    return {
      ok: false,
      message: __dialogueText("managers/ReedResolutionService.js", "t_59bd296b850e42ca9b63")
    };
  }

  busy = true;

  try {
    const now =
      getGameTimeManager().getState();

    const pending =
      existing?.phase === 'settling'
        ? clone(existing)
        : {
            version: 1,
            phase: 'settling',
            questId: config.questId,
            endingId,

            settlementId:
              `${config.questId}:${
                quest.acceptedAt ||
                'legacy-contract'
              }`,

            reward,
            paid: false,

            report: ending.report,
            response: ending.reply,
            responseSubject: ending.replySubject,
            summary: ending.summary,

            consequences: clone(
              ending.consequences || {}
            ),

            gameTime: clone(now)
          };

    gameState[KEY] = pending;

    if (
      !pending.paid &&
      !hasSettlementPayment(pending.settlementId) &&
      reward > 0
    ) {
      const before = moneyManager.getState();

      try {
        moneyManager.addCash(reward, {
          category: ECONOMY_CATEGORY.SIDE_CASE,
          description:
            __dialogueText("managers/ReedResolutionService.js", "t_d5af9717b1a7d6383ca3"),

          missionId: config.questId,

          metadata: {
            reedSettlementId:
              pending.settlementId,

            questId: config.questId,
            endingId
          }
        });
      } catch (error) {
        // Jeśli wypłata została już odnotowana,
        // nie cofamy jej z powodu błędu powiadomienia.
        if (!hasSettlementPayment(pending.settlementId)) {
          gameState.cash = before.cash;
          gameState.moneyLog =
            clone(before.moneyLog);

          gameState[KEY] = {
            ...pending,
            lastError:
              __dialogueText("managers/ReedResolutionService.js", "t_f677abd706c78b2e9cd1")
          };

          requestAutosave();

          console.error(
            '[ReedResolutionService] Payment failed:',
            error
          );

          return {
            ok: false,
            message:
              __dialogueText("managers/ReedResolutionService.js", "t_278e5161586fc87a0e15")
          };
        }

        console.error(
          '[ReedResolutionService] Payment notification failed after commit:',
          error
        );
      }
    }

    gameState[KEY] = {
      ...pending,
      paid: true,
      lastError: null
    };

    try {
      syncReedReportIntegrity();
    } catch (error) {
      console.error(
        '[ReedResolutionService] Integrity could not be settled:',
        error
      );

      requestAutosave();

      return {
        ok: false,
        message:
          __dialogueText("managers/ReedResolutionService.js", "t_facd781d0073fe95b201")
      };
    }

    // XP rozliczamy przed zamknięciem sprawy.
    // Przerwane rozliczenie można bezpiecznie ponowić.
    let xpResult;

    try {
      xpResult = settleReedXP();
    } catch (error) {
      console.error(
        '[ReedResolutionService] XP could not be settled:',
        error
      );

      requestAutosave();

      return {
        ok: false,
        message:
          __dialogueText("managers/ReedResolutionService.js", "t_909191a77fcc6d05f2af")
      };
    }

    const paid = getReedResolution();

    const current =
      gameState.piQuests.quests[config.questId];

    const completedAt =
      new Date().toISOString();

    gameState.piQuests = {
      ...gameState.piQuests,

      quests: {
        ...gameState.piQuests.quests,

        [config.questId]: {
          ...current,
          status: 'completed',

          objectives: current.objectives.map(
            objective =>
              objective.id === 'report_findings'
                ? {
                    ...objective,
                    completed: true
                  }
                : objective
          ),

          resolution: {
            endingId,
            summary: paid.summary,
            consequences: clone(
              paid.consequences
            ),

            reward,
            paid: true,
            settlementId: paid.settlementId,
            integrity: clone(paid.integrity),
            xp: clone(paid.xp)
          },

          completedAt
        }
      }
    };

    const investigations =
      gameState.piInvestigations;

    const investigation =
      investigations?.cases?.[config.questId];

    if (investigation) {
      const board = clone(investigation.board);

      const note = {
        id: 'reed_final_report',
        type: 'note',
        label: __dialogueText("managers/ReedResolutionService.js", "t_62c72903a99092392c42"),
        text: paid.report,
        metaText: `${__dialogueText("managers/ReedResolutionService.js", "t_d24edd53fc51d85fe3b8")}${ending.title}`,
        color: 'yellow',
        x: 120,
        y: 380,
        discovered: true,
        createdByPlayer: false,
        editableByPlayer: false
      };

      board.items = [
        ...(board.items || []).filter(
          item => item.id !== note.id
        ),
        note
      ];

      gameState.piInvestigations = {
        ...investigations,

        cases: {
          ...investigations.cases,

          [config.questId]: {
            ...investigation,
            status: 'completed',

            resolution: clone(
              paid.consequences
            ),

            board
          }
        }
      };
    }

    if (gameState.reedContact) {
      gameState.reedContact = {
        ...gameState.reedContact,
        status: 'completed',
        caseClosed: true,
        nextAttemptAt: null
      };
    }

    gameState[KEY] = {
      ...paid,
      phase: 'completed',
      completedGameTime: clone(now),
      lastError: null
    };

    requestAutosave();

    let saved = false;

    try {
      saved = saveGameState() === true;
    } catch (error) {
      console.error(
        '[ReedResolutionService] Save failed:',
        error
      );
    }

    const xpGranted = xpResult.success
      ? xpResult.grantedXP
      : 0;

    return {
      ok: true,
      saved,
      reward,
      xpGranted,

      message: saved
        ? (
            `${__dialogueText("managers/ReedResolutionService.js", "t_379defa0f6ca4777be93")}${reward}${__dialogueText("managers/ReedResolutionService.js", "t_cdb4ee2aea69cc6a8333")}` +
            (
              xpGranted > 0
                ? `${__dialogueText("managers/ReedResolutionService.js", "t_c13f23cc27f966a4eadf")}${xpGranted}${__dialogueText("managers/ReedResolutionService.js", "t_a73feda6e2f76a6b740b")}`
                : ''
            )
          )
        : __dialogueText("managers/ReedResolutionService.js", "t_5116e294bbed1f5b6c9b")
    };
  } finally {
    busy = false;
  }
}