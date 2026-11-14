import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import {
  requestAutosave,
  saveGameState
} from '../../gameStatePersistence.js';
import {
  moneyManager,
  ECONOMY_CATEGORY
} from '../../managers/MoneyManager.js';
import {
  DEAD_MEN_QUEST,
  getDeadMenProgress,
  syncDeadMenEvidence
} from '../../managers/DeadMenCallingService.js';
import { addPIEvidence } from '../../managers/PIInvestigationManager.js';

const KEY = 'piDeadMenPresentation';
const FINAL = 'piDeadMenCallingFinale';

const REVIEW = 'dead_men_archive_review';
const REPORT = 'dead_men_final_report_draft';

const PRIVATE = 'dead_men_private_continuation';
const WISH = 'dead_men_client_wishes';

const recentIds = [1, 2, 3].map(n => 'dead_men_recording_' + n);
const archiveIds = ['a', 'b', 'c'].map(c => 'dead_men_archive_' + c);

const patterns = {
  bed: [3, 5, 2, 7, 4, 2, 9, 3, 6, 2, 4, 8, 3, 5, 2, 7],
  a1: [2, 8, 5, 11, 3, 7, 12, 4, 9, 6, 2, 10, 7, 4, 12, 3],
  a2: [5, 2, 10, 4, 12, 8, 3, 6, 11, 4, 7, 2, 9, 5, 3, 8],
  c: [10, 3, 6, 12, 5, 2, 8, 4, 11, 7, 3, 9, 5, 12, 4, 6]
};

const words = {
  bed: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_4a3e06c03cff0b9abc78"),
  a1: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_9116b3020c8b6fbc984a"),
  a2: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_81e0dee31a3dcd8f653f"),
  c: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_7c5c6ce0b1111549317f")
};

const models = {
  dead_men_recording_1: ['bed', 'a1'],
  dead_men_recording_2: ['bed', 'a2'],
  dead_men_recording_3: ['bed', 'c'],
  dead_men_archive_a: ['a1', 'a2'],
  dead_men_archive_b: ['bed'],
  dead_men_archive_c: ['c']
};

const tasks = [
  {
    id: 'v1',
    target: recentIds[0],
    part: 'a1',
    source: 'a',
    kind: 'VOICE'
  },
  {
    id: 'v2',
    target: recentIds[1],
    part: 'a2',
    source: 'a',
    kind: 'VOICE'
  },
  {
    id: 'v3',
    target: recentIds[2],
    part: 'c',
    source: 'c',
    kind: 'VOICE'
  },
  {
    id: 'b1',
    target: recentIds[0],
    part: 'bed',
    source: 'b',
    kind: 'BACKGROUND'
  },
  {
    id: 'b2',
    target: recentIds[1],
    part: 'bed',
    source: 'b',
    kind: 'BACKGROUND'
  },
  {
    id: 'b3',
    target: recentIds[2],
    part: 'bed',
    source: 'b',
    kind: 'BACKGROUND'
  }
];

const endings = [
  {
    id: 'whole',
    label: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_0bbbfca1998091653fbe"),
    description:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_dbc2b4d14db8f6a2b40d"),
    appendix:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_70f14490c97a56bafc19"),
    delivery: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_a244478c3e61f4cd6ab4"),
    reply:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_b1a74267feb741bc60a1")
  },
  {
    id: 'case',
    label: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_00d40a254d7e165d2a64"),
    description:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_2ce9d9cfa6b86e41f9ee"),
    appendix: '',
    delivery:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_3487a7901c3187ba100c"),
    reply:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_d4a0c6eaa1df02afa647")
  },
  {
    id: 'choose',
    label: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_96ded412f7fd696f54e7"),
    description:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_372b692815882702355e"),
    appendix:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_87eb010dbe7a6d6cb6e5"),
    delivery:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_152a3088de318eba10e9"),
    reply:
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_516adc4c405055f292e4")
  }
];

const privateBody =
  __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_d2b13b9b0b791f398ba2");

const wishesBody =
  __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_f4812318d3adf1221a39");

const clone = value => JSON.parse(JSON.stringify(value));

let settling = false;

function quest() {
  return gameState.piQuests?.quests?.[DEAD_MEN_QUEST] || null;
}

function state() {
  const raw = gameState[KEY];

  const s =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw
      : {};

  return {
    ...s,
    version: 1,
    matches: Array.isArray(s.matches) ? s.matches : [],
    read: Array.isArray(s.read) ? s.read : [],
    endingId: endings.some(ending => ending.id === s.endingId)
      ? s.endingId
      : null
  };
}

function save(patch) {
  gameState[KEY] = {
    ...state(),
    ...patch,
    version: 1
  };

  requestAutosave();
}

function evidenceReady() {
  const s = getDeadMenProgress();

  return (
    quest()?.status === 'active' &&
    s.interviewCompleted &&
    [...recentIds, ...archiveIds].every(id => s.read.includes(id))
  );
}

function nextTask() {
  return (
    tasks.find(task => !state().matches.includes(task.id)) || null
  );
}

function applyMatch(taskId, source) {
  const task = nextTask();

  if (!evidenceReady() || !task || task.id !== taskId) {
    return false;
  }

  if (task.source !== source) {
    return false;
  }

  save({
    matches: [...new Set([...state().matches, task.id])]
  });

  const s = getDeadMenProgress();
  const answers = new Set(s.archiveAnswers || []);
  const matched = new Set(state().matches);

  if (
    tasks
      .filter(item => item.kind === 'VOICE')
      .every(item => matched.has(item.id))
  ) {
    answers.add('voice_fragments');
  }

  if (
    tasks
      .filter(item => item.kind === 'BACKGROUND')
      .every(item => matched.has(item.id))
  ) {
    answers.add('background_track');
  }

  gameState.piDeadMenCalling = {
    ...s,
    archiveAnswers: [...answers]
  };

  requestAutosave();
  syncDeadMenEvidence();

  return true;
}

function moralAvailable() {
  return (
    quest()?.status === 'active' &&
    gameState[FINAL]?.verified === true
  );
}

function moralReady() {
  return (
    moralAvailable() &&
    [PRIVATE, WISH].every(id => state().read.includes(id))
  );
}

function selectEnding(id) {
  if (
    !moralReady() ||
    gameState[FINAL]?.settlement ||
    !endings.some(ending => ending.id === id)
  ) {
    return false;
  }

  save({ endingId: id });

  return true;
}

function mail(id, from, subject, body) {
  return {
    id,
    from,
    subject,
    body,
    date: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_0b1f0c3732c8ac57e9d7")
  };
}

function moralMail() {
  const settled = gameState[FINAL]?.settlement;

  if (!moralAvailable() && !settled?.preview?.endingId) {
    return [];
  }

  const items = [
    mail(
      WISH,
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_e3683593d8ba71a5c369"),
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_62184c7887b21da50c41"),
      wishesBody
    ),
    mail(
      PRIVATE,
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_9ff95f279d1225c6220e"),
      __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_858f6447f7461ffb2f3f"),
      privateBody
    )
  ];

  if (
    settled?.phase === 'completed' &&
    settled.preview.endingId === 'whole'
  ) {
    items.push(
      mail(
        'dead_men_private_sent',
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_36e093f31c204d28988a"),
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_2cefedbca8f1189a2153"),
        privateBody
      )
    );
  }

  return items;
}

function makePreview(base) {
  const s = state();
  const ending = endings.find(item => item.id === s.endingId);
  const q = quest();

  if (
    !base ||
    !ending ||
    !moralReady() ||
    !Number.isInteger(q?.reward) ||
    q.reward < 0
  ) {
    return null;
  }

  const report = base.body.split(__dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_f3e374110d1ce3d2879e"))[0];

  return {
    fee: q.reward,
    endingId: ending.id,
    report:
      report +
      (ending.appendix ? '\n\n' + ending.appendix : ''),
    privateDelivery: ending.delivery,
    privateAttachment:
      ending.id === 'whole' ? privateBody : null,
    reply: ending.reply
  };
}

function paid(id) {
  return (gameState.moneyLog || []).some(
    transaction =>
      transaction.type === 'income' &&
      transaction.source === 'cash' &&
      transaction.metadata?.deadMenSettlementId === id
  );
}

function settle(preview, expectedToken) {
  if (settling) {
    return {
      ok: false,
      message: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_e30f35d1e012c01fb9b0")
    };
  }

  const q = quest();
  const old = gameState[FINAL] || {};
  const pending = old.settlement;

  if (
    !q ||
    pending?.phase === 'completed' ||
    (q.status === 'completed' && !pending)
  ) {
    return {
      ok: false,
      message: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_a99e7dfb9545451daaf5")
    };
  }

  const reconstructed = ['caller', 'method', 'motive'].every(
    id => (old.answers || []).includes(id)
  );

  const frozen = pending?.preview || preview;

  if (
    !frozen?.endingId ||
    JSON.stringify(frozen) !== expectedToken ||
    (!pending &&
      (!moralReady() ||
        !reconstructed ||
        frozen.endingId !== state().endingId ||
        frozen.fee !== q.reward))
  ) {
    return {
      ok: false,
      message: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_4bcee55f7b1c03d45c33")
    };
  }

  settling = true;

  try {
    let p = pending || {
      id: `${DEAD_MEN_QUEST}:${q.acceptedAt || 'legacy-contract'}`,
      phase: 'settling',
      preview: clone(frozen),
      paid: false
    };

    gameState[FINAL] = {
      ...old,
      settlement: p
    };

    requestAutosave();

    if (!p.paid && !paid(p.id) && p.preview.fee > 0) {
      const before = moneyManager.getState();

      try {
        moneyManager.addCash(p.preview.fee, {
          category: ECONOMY_CATEGORY.SIDE_CASE,
          description: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_9a017832ab250e548d16"),
          missionId: DEAD_MEN_QUEST,
          metadata: {
            deadMenSettlementId: p.id,
            questId: DEAD_MEN_QUEST,
            endingId: p.preview.endingId
          }
        });
      } catch (error) {
        if (!paid(p.id)) {
          gameState.cash = before.cash;
          gameState.moneyLog = clone(before.moneyLog);
          throw error;
        }
      }
    }

    p = {
      ...p,
      paid: true
    };

    gameState[FINAL] = {
      ...gameState[FINAL],
      settlement: p
    };

    requestAutosave();

    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_final_report',
      label: __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_ce02ce16346ae602c210"),
      text: p.preview.report,
      metaText: p.preview.privateDelivery,
      color: 'yellow'
    });

    const completedAt = new Date().toISOString();

    const resolution = {
      endingId: p.preview.endingId,
      reward: p.preview.fee,
      paid: true,
      settlementId: p.id,
      privateDelivery: p.preview.privateDelivery,
      summary:
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_e3a2f9e89e15e768311c")
    };

    const qs = gameState.piQuests;
    const current = qs.quests[DEAD_MEN_QUEST];

    gameState.piQuests = {
      ...qs,
      quests: {
        ...qs.quests,
        [DEAD_MEN_QUEST]: {
          ...current,
          status: 'completed',
          completedAt,
          objectives: (current.objectives || []).map(objective => ({
            ...objective,
            completed: true
          })),
          resolution
        }
      }
    };

    const inv = gameState.piInvestigations;
    const c = inv?.cases?.[DEAD_MEN_QUEST];

    if (c) {
      gameState.piInvestigations = {
        ...inv,
        cases: {
          ...inv.cases,
          [DEAD_MEN_QUEST]: {
            ...c,
            status: 'completed',
            resolution: clone(resolution)
          }
        }
      };
    }

    gameState[FINAL] = {
      ...gameState[FINAL],
      settlement: {
        ...p,
        phase: 'completed',
        completedAt
      }
    };

    requestAutosave();

    let saved = false;

    try {
      saved = saveGameState() === true;
    } catch (error) {}

    return {
      ok: true,
      message: saved
        ? `${__dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_56e84f304751a9d98a80")}${p.preview.fee}${__dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_cdb4ee2aea69cc6a8333")}`
        : __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_838dfc8ff4549dd73563")
    };
  } catch (error) {
    requestAutosave();

    return {
      ok: false,
      message:
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_e0ea7e6ba770a701e8e2")
    };
  } finally {
    settling = false;
  }
}

function wave(
  ui,
  x,
  y,
  w,
  h,
  id,
  caption,
  selectedPart = null
) {
  const d = ui.drawing;
  const parts = models[id] || ['bed'];

  d.rectangle(x, y, w, h, 0x172b28);
  d.text(x + 8, y + 4, caption, 12, '#e6d7a8', w - 16);

  const gap = 5;
  const segmentW =
    (w - 16 - gap * (parts.length - 1)) / parts.length;

  parts.forEach((part, i) => {
    const left = x + 8 + i * (segmentW + gap);
    const cy = y + Math.floor(h * 0.64);

    d.rectangle(left, cy, segmentW, 1, 0x486d5e);

    const values = patterns[part];
    const step = segmentW / values.length;
    const scale = Math.max(0.4, (h - 30) / 30);

    values.forEach((value, j) => {
      const amp = Math.max(2, Math.round(value * scale));

      d.rectangle(
        left + j * step,
        cy - amp / 2,
        Math.max(1, step - 2),
        amp,
        selectedPart === part ? 0xe2c16a : 0x74b89b
      );
    });
  });
}

export function installDeadMenEvidenceUI(ui) {
  const docs = ui.documents;

  if (docs.deadMenEvidenceInstalled) return;

  docs.deadMenEvidenceInstalled = true;

  const get = docs.getMail.bind(docs);

  let draft = null;
  let sourceIndex = 0;
  let feedback = '';
  let replay = 0;
  let transcriptId = null;
  let confirmation = null;

  docs.getMail = () => {
    const original = get();

    draft = original.find(message => message.id === REPORT) || null;

    const settlement = gameState[FINAL]?.settlement;
    const own = moralMail();
    const ids = new Set(own.map(message => message.id));

    return [
      ...own,
      ...original
        .filter(message => !ids.has(message.id))
        .map(message => {
          if (
            message.id === 'dead_men_report_reply' &&
            settlement?.preview?.endingId
          ) {
            return {
              ...message,
              body:
                __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_22a705e57674f27a7c07") +
                settlement.preview.reply +
                __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_78b8ac90ad3413a41390")
            };
          }

          return message;
        })
    ];
  };

  const paged = docs.renderPagedText.bind(docs);

  docs.renderPagedText = (content, x, y, w, h) => {
    if (ui.app !== 'mail') {
      confirmation = null;
      return paged(content, x, y, w, h);
    }

    const id = ui.selectedId;

    if (
      id === REPORT &&
      (quest()?.status === 'active' ||
        gameState[FINAL]?.settlement?.phase === 'settling') &&
      !(
        gameState[FINAL]?.settlement &&
        !gameState[FINAL].settlement.preview?.endingId
      )
    ) {
      const pending = gameState[FINAL]?.settlement;

      if (!moralReady() && !pending) {
        confirmation = null;

        return paged(
          __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_4d9d64bf585bda3bd8d3"),
          x,
          y,
          w,
          h
        );
      }

      const ending = endings.find(
        item => item.id === state().endingId
      );

      const p = pending?.preview || makePreview(draft);

      const explanation = ending
        ? ending.description
        : __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_175b46f5fc89e9081cc9");

      const body =
        (p
          ? p.report + __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_370d76639d81d48f45c1") + p.privateDelivery
          : __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_dfda050d3453ded2a212") +
            endings
              .map(item => item.label + '\n' + item.description)
              .join('\n\n')) +
        '\n\n' +
        explanation +
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_cb7c85e1974fadacad57") +
        (p?.fee ?? quest().reward);

      const token = p ? JSON.stringify(p) : null;
      const armed = token && confirmation === token;

      paged(
        body +
          (armed
            ? __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_77478d56683d42eb76f3")
            : ''),
        x,
        y,
        w,
        Math.max(24, h - 78)
      );

      ui.drawing.button(
        x,
        y + h - 70,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_c03e0444f1bc5387f8d0") +
          (ending
            ? String(endings.indexOf(ending) + 1) + '/3'
            : 'CHOOSE'),
        () => {
          if (
            ui.app !== 'mail' ||
            ui.selectedId !== REPORT ||
            pending
          ) {
            return;
          }

          const next =
            endings[
              (endings.findIndex(
                item => item.id === state().endingId
              ) +
                1) %
                endings.length
            ];

          if (selectEnding(next.id)) {
            confirmation = null;
            ui.bodyPage = 0;
            ui.render();
          }
        },
        !pending
      );

      ui.drawing.button(
        x,
        y + h - 32,
        armed ? __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_ffb5da4d490b7803ce95") : __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_b9433b1b448012d19d68"),
        () => {
          if (
            ui.app !== 'mail' ||
            ui.selectedId !== REPORT ||
            !p
          ) {
            return;
          }

          if (!armed) {
            confirmation = token;
            ui.bodyPage = 0;
            ui.render();
            return;
          }

          const result = settle(p, token);

          confirmation = null;
          ui.notice = result.message;

          if (result.ok) {
            ui.selectedId = 'dead_men_report_reply';
            ui.listPage = 0;
          }

          ui.bodyPage = 0;
          ui.render();
        },
        Boolean(p)
      );

      if (armed) {
        ui.drawing.button(
          x + Math.max(160, w / 2),
          y + h - 32,
          'CANCEL',
          () => {
            confirmation = null;
            ui.render();
          }
        );
      }

      return;
    }

    confirmation = null;

    if (
      id === REVIEW &&
      evidenceReady() &&
      nextTask() &&
      !getDeadMenProgress().archiveCompared
    ) {
      const answers = getDeadMenProgress().archiveAnswers || [];

      if (
        answers.includes('voice_fragments') &&
        answers.includes('background_track')
      ) {
        return paged(content, x, y, w, h);
      }

      const task = nextTask();
      const source = ['a', 'b', 'c'][sourceIndex];

      const panelH = Math.max(
        42,
        Math.min(70, Math.floor((h - 112) / 2))
      );

      ui.drawing.text(
        x,
        y,
        `${task.kind}${__dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_ac22b86829299c80a3ca")}${state().matches.length + 1}${__dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_ccc92d0484b2744c0b98")}`,
        13,
        '#353d32',
        w
      );

      wave(
        ui,
        x,
        y + 24,
        w,
        panelH,
        task.target,
        task.target.replace('dead_men_recording_', __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_cb79d269a9824e94b130")),
        task.part
      );

      wave(
        ui,
        x,
        y + 30 + panelH,
        w,
        panelH,
        'dead_men_archive_' + source,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_f1cb38668b33bd5a6448") + source.toUpperCase()
      );

      const fy = y + 36 + panelH * 2;

      ui.drawing.text(
        x,
        fy,
        feedback ||
          __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_6327d28f2ac062341b21"),
        12,
        '#444a38',
        w
      );

      ui.drawing.button(
        x,
        y + h - 32,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_8b51c0a15b8ed5a538a3") + source.toUpperCase(),
        () => {
          sourceIndex = (sourceIndex + 1) % 3;
          feedback = '';
          ui.render();
        }
      );

      ui.drawing.button(
        x + Math.max(150, w / 2),
        y + h - 32,
        'MATCH',
        () => {
          if (ui.app !== 'mail' || ui.selectedId !== REVIEW) {
            return;
          }

          const ok = applyMatch(task.id, source);

          feedback = ok
            ? __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_35ab4efcacf5757a99bd")
            : __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_f85367006a4cb9bef525");

          ui.bodyPage = 0;
          ui.render();
        }
      );

      return;
    }

    if (models[id]) {
      if (transcriptId === id) {
        paged(content, x, y, w, Math.max(24, h - 42));

        ui.drawing.button(
          x,
          y + h - 32,
          __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_87e6a46783809312304f"),
          () => {
            transcriptId = null;
            ui.bodyPage = 0;
            ui.render();
          }
        );

        return;
      }

      const parts = models[id];

      replay = Math.min(replay, parts.length - 1);

      const panelH = Math.max(44, Math.min(92, h - 126));

      ui.drawing.text(
        x,
        y,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_05b50001feb8ec64f4ce"),
        11,
        '#555b45',
        w
      );

      wave(
        ui,
        x,
        y + 24,
        w,
        panelH,
        id,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_97f9d3f26061e2d17723"),
        parts[replay]
      );

      ui.drawing.text(
        x,
        y + panelH + 32,
        words[parts[replay]],
        14,
        '#343e35',
        w
      );

      ui.drawing.button(
        x,
        y + h - 32,
        __dialogueText("ui/pi-computer/DeadMenEvidenceUIBase.js", "t_eac56cc947e33b02ffd8"),
        () => {
          replay = (replay + 1) % parts.length;
          ui.render();
        }
      );

      ui.drawing.button(
        x + Math.max(150, w / 2),
        y + h - 32,
        'TRANSCRIPT',
        () => {
          transcriptId = id;
          ui.bodyPage = 0;
          ui.render();
        }
      );

      return;
    }

    transcriptId = null;

    return paged(content, x, y, w, h);
  };

  const render = docs.render.bind(docs);

  docs.render = () => {
    render();

    if (
      ui.app === 'mail' &&
      [PRIVATE, WISH].includes(ui.selectedId) &&
      moralMail().some(message => message.id === ui.selectedId)
    ) {
      const s = state();

      if (!s.read.includes(ui.selectedId)) {
        save({
          read: [...s.read, ui.selectedId]
        });
      }
    }
  };
}