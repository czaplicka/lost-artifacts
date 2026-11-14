import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  registerPICase,
  addPIEvidence
} from './PIInvestigationManager.js';

import {
  DEAD_MAIL_PREVIEW_CASE,
  isDeadMailPreviewEnabled,
  getDeadMailProgress
} from './DeadMailManager.js';

export const RETURN_CASE = 'pi_return_to_sender';

const defaults = () => ({
  version: 1,
  visits: 0,
  dead: [],
  restante: {},
  returnCase: {
    stage: 'new',
    clues: [],
    ending: null
  }
});

export function postalState() {
  const saved = gameState.postOffice;

  if (!saved || saved.version !== 1) {
    return defaults();
  }

  return {
    ...defaults(),
    ...saved,

    dead: Array.isArray(saved.dead)
      ? saved.dead
      : [],

    restante: saved.restante || {},

    returnCase: {
      ...defaults().returnCase,
      ...saved.returnCase
    }
  };
}

function save(state) {
  gameState.postOffice = state;
  requestAutosave();

  return state;
}

function evidence(caseId, id, label, text) {
  addPIEvidence(caseId, {
    id: 'postal-' + id,
    label,
    text,
    metaText: __dialogueText("managers/PostOfficeManager.js", "t_bf90c07b7526b278c9c8"),
    color: 'blue',
    pinned: true
  });
}

export function visitPostOffice() {
  const state = postalState();

  return save({
    ...state,
    visits: state.visits + 1
  });
}

export function canCheckDeadMail() {
  if (!isDeadMailPreviewEnabled()) {
    return false;
  }

  const progress = getDeadMailProgress();

  const photoInspected = Array.isArray(
    progress.photoInspected
  )
    ? progress.photoInspected
    : [];

  return Boolean(
    progress.mailRead === true ||
    progress.clues.length > 0 ||
    photoInspected.length > 0 ||
    progress.selectedPhotoDetail ||
    progress.questions.includes('work') ||
    postalState().dead.length > 0
  );
}

const DEAD_MAIL_TOPICS = {
  photo: [
    __dialogueText("managers/PostOfficeManager.js", "t_e2f10087eb02afc209ad"),

    __dialogueText("managers/PostOfficeManager.js", "t_8daeb4ee7426b0a792e6") +
    __dialogueText("managers/PostOfficeManager.js", "t_cf5325f118472fccb139") +
    __dialogueText("managers/PostOfficeManager.js", "t_81e43dd606af04fc2da2") +
    __dialogueText("managers/PostOfficeManager.js", "t_8a5419ef6ad65ce8188a")
  ],

  route: [
    __dialogueText("managers/PostOfficeManager.js", "t_930da03b7edef6bc653a"),

    __dialogueText("managers/PostOfficeManager.js", "t_4ad9ed0ea8330b1eb61c") +
    __dialogueText("managers/PostOfficeManager.js", "t_2178c3eec53a32b9e51d") +
    __dialogueText("managers/PostOfficeManager.js", "t_a1c811ec1193173ceb1b") +
    __dialogueText("managers/PostOfficeManager.js", "t_f04a87813b113d54980f")
  ],

  gate: [
    __dialogueText("managers/PostOfficeManager.js", "t_198eb291f96bc0da57e7"),

    __dialogueText("managers/PostOfficeManager.js", "t_6b462632273642cc567c") +
    __dialogueText("managers/PostOfficeManager.js", "t_bc78b4b6d8d6d8a023d6") +
    __dialogueText("managers/PostOfficeManager.js", "t_0c4ea9d42bdf5c65cf8f") +
    __dialogueText("managers/PostOfficeManager.js", "t_957dc926f07b95377196")
  ]
};

export function postalDeadTopic(id) {
  if (!canCheckDeadMail()) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_72ff3471bf0290163d3a") +
      __dialogueText("managers/PostOfficeManager.js", "t_06184adfa2ca1a5b517c")
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      DEAD_MAIL_TOPICS,
      id
    )
  ) {
    return '';
  }

  registerPICase({
    id: DEAD_MAIL_PREVIEW_CASE,
    kind: 'side',
    requiresBoard: true,
    title: __dialogueText("managers/PostOfficeManager.js", "t_16abdc3e0b396e03e229")
  });

  const [label, text] =
    DEAD_MAIL_TOPICS[id];

  const state = postalState();

  evidence(
    DEAD_MAIL_PREVIEW_CASE,
    'dead-' + id,
    label,
    text
  );

  if (!state.dead.includes(id)) {
    save({
      ...state,
      dead: [...state.dead, id]
    });
  }

  return text;
}

export function startReturnCase() {
  const state = postalState();

  if (state.returnCase.stage !== 'new') {
    return false;
  }

  registerPICase({
    id: RETURN_CASE,
    kind: 'side',
    requiresBoard: true,
    title: __dialogueText("managers/PostOfficeManager.js", "t_6e6e82ddd9c9f0af1dde")
  });

  evidence(
    RETURN_CASE,
    'envelope',
    __dialogueText("managers/PostOfficeManager.js", "t_cf5132422263cab1878c"),

    __dialogueText("managers/PostOfficeManager.js", "t_1414464e7251e0fe7e88") +
    __dialogueText("managers/PostOfficeManager.js", "t_a273a8ef5863e1b26221") +
    __dialogueText("managers/PostOfficeManager.js", "t_b13f6c97abfc9cc4a9bb") +
    __dialogueText("managers/PostOfficeManager.js", "t_9184e1e2f5fd4d215bec") +
    __dialogueText("managers/PostOfficeManager.js", "t_ac9d1d54a6cf1c82e101")
  );

  save({
    ...state,

    returnCase: {
      stage: 'investigating',
      clues: [],
      ending: null
    }
  });

  return true;
}

export const RETURN_CLUES = {
  envelope: [
    __dialogueText("managers/PostOfficeManager.js", "t_c8da9f3c26a178b36a2f"),

    __dialogueText("managers/PostOfficeManager.js", "t_b20238d38041d495e1f7") +
    __dialogueText("managers/PostOfficeManager.js", "t_8572d65661900a915b11") +
    __dialogueText("managers/PostOfficeManager.js", "t_38cdf47346ad8072a321") +
    __dialogueText("managers/PostOfficeManager.js", "t_08383eb925fe5b82ce9d")
  ],

  card: [
    __dialogueText("managers/PostOfficeManager.js", "t_d6b41029439ef2d2d2e8"),

    __dialogueText("managers/PostOfficeManager.js", "t_2ffd72ca779ab68909ca") +
    __dialogueText("managers/PostOfficeManager.js", "t_bae4ed77f86d11bd80a6") +
    __dialogueText("managers/PostOfficeManager.js", "t_48cbdda9f065ae9999f0") +
    __dialogueText("managers/PostOfficeManager.js", "t_cc045c085815905635c0") +
    __dialogueText("managers/PostOfficeManager.js", "t_8fad04cde8980f54bb3e")
  ],

  notice: [
    __dialogueText("managers/PostOfficeManager.js", "t_5c8c942139729ee6e5de"),

    __dialogueText("managers/PostOfficeManager.js", "t_7bf4f29a8331832914b0") +
    __dialogueText("managers/PostOfficeManager.js", "t_7061b423a6d7cd1fcf9d") +
    __dialogueText("managers/PostOfficeManager.js", "t_845840f9ffe820a1cc2b") +
    __dialogueText("managers/PostOfficeManager.js", "t_790127ebf851f243ae10") +
    __dialogueText("managers/PostOfficeManager.js", "t_84913e91ac538027aa66")
  ]
};

export function inspectReturnClue(id) {
  const state = postalState();

  if (
    state.returnCase.stage !== 'investigating' ||
    !Object.prototype.hasOwnProperty.call(
      RETURN_CLUES,
      id
    )
  ) {
    return '';
  }

  const [label, text] = RETURN_CLUES[id];

  evidence(
    RETURN_CASE,
    'return-' + id,
    label,
    text
  );

  if (
    !state.returnCase.clues.includes(id)
  ) {
    save({
      ...state,

      returnCase: {
        ...state.returnCase,

        clues: [
          ...state.returnCase.clues,
          id
        ]
      }
    });
  }

  return text;
}

export function identifyRecipient(answer) {
  const state = postalState();

  if (
    state.returnCase.stage !== 'investigating' ||
    state.returnCase.clues.length !== 3
  ) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_94f0cf8341e8c29cf7b4")
    );
  }

  if (answer !== 'ellis') {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_ba5dcd528f12eae2b8ce") +
      __dialogueText("managers/PostOfficeManager.js", "t_274a16a6206da829ff13") +
      __dialogueText("managers/PostOfficeManager.js", "t_238992dfc038ec7e6b1c")
    );
  }

  evidence(
    RETURN_CASE,
    'identity',
    __dialogueText("managers/PostOfficeManager.js", "t_7ec3d28b131f0c24183d"),

    __dialogueText("managers/PostOfficeManager.js", "t_5b3300485fa86a505c5a") +
    __dialogueText("managers/PostOfficeManager.js", "t_6b2a667460fcd19894a2") +
    __dialogueText("managers/PostOfficeManager.js", "t_dc32a350650ec71a20b0") +
    __dialogueText("managers/PostOfficeManager.js", "t_de49af01aa7c9850a83c")
  );

  save({
    ...state,

    returnCase: {
      ...state.returnCase,
      stage: 'identified'
    }
  });

  return (
    __dialogueText("managers/PostOfficeManager.js", "t_149491a0246636070bf4") +
    __dialogueText("managers/PostOfficeManager.js", "t_1b0716c696993e24fc2e") +
    __dialogueText("managers/PostOfficeManager.js", "t_fec8408b61b3a787c762")
  );
}

export function leavePostalMessage(
  alias,
  password,
  body
) {
  const state = postalState();

  const normalizedAlias = String(alias)
    .trim()
    .toUpperCase();

  const normalizedPassword = String(password)
    .trim()
    .toUpperCase();

  if (
    normalizedAlias !== 'CLOCKWORK' ||
    normalizedPassword !== __dialogueText("managers/PostOfficeManager.js", "t_9e3ce8d3f0616285504a")
  ) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_1261f135bb5eb58cc2ba") +
      __dialogueText("managers/PostOfficeManager.js", "t_12f8e61421cc99a0277e")
    );
  }

  if (
    ![
      'identified',
      'waiting',
      'reply',
      'completed'
    ].includes(state.returnCase.stage)
  ) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_6848d78d64d30e517026") +
      __dialogueText("managers/PostOfficeManager.js", "t_2c710b71bf2eb7bf2231")
    );
  }

  if (state.restante.clockwork) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_5924efb0ba6de3ce0e56") +
      __dialogueText("managers/PostOfficeManager.js", "t_b26c67fa4792bf920211")
    );
  }

  const text = String(body).trim();

  if (!text) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_b350e03db8397137d74f") +
      __dialogueText("managers/PostOfficeManager.js", "t_aa9558795ff0c6a89eda")
    );
  }

  evidence(
    RETURN_CASE,
    'message',
    __dialogueText("managers/PostOfficeManager.js", "t_772bb5e56037ab9d1f3a"),
    text
  );

  save({
    ...state,

    restante: {
      ...state.restante,

      clockwork: {
        leftVisit: state.visits,
        body: text,
        collected: false
      }
    },

    returnCase: {
      ...state.returnCase,
      stage: 'waiting'
    }
  });

  return (
    __dialogueText("managers/PostOfficeManager.js", "t_df17ae64e669458bd7f3") +
    __dialogueText("managers/PostOfficeManager.js", "t_724b41d97737739dfc9e") +
    __dialogueText("managers/PostOfficeManager.js", "t_d1f75b641a3dc1a0f50a")
  );
}

export function collectPostalReply() {
  const state = postalState();
  const message = state.restante.clockwork;

  if (!message) {
    return __dialogueText("managers/PostOfficeManager.js", "t_ef7323da00125fc42342");
  }

  if (message.collected) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_dac62b6bf9a6a9e0d6af") +
      __dialogueText("managers/PostOfficeManager.js", "t_35f035f544bc0530ba9e")
    );
  }

  if (state.visits <= message.leftVisit) {
    return (
      __dialogueText("managers/PostOfficeManager.js", "t_16102e350599cda5a15f")
    );
  }

  const text =
    __dialogueText("managers/PostOfficeManager.js", "t_10f89fae95f2c7672c15") +
    __dialogueText("managers/PostOfficeManager.js", "t_40cc67252fea4c0c3959") +
    __dialogueText("managers/PostOfficeManager.js", "t_f2b59f04b4ad96e17c3e") +
    __dialogueText("managers/PostOfficeManager.js", "t_afd37ff61dd815d1f03e") +
    __dialogueText("managers/PostOfficeManager.js", "t_306cf00c2c0ca8b5be6d") +
    __dialogueText("managers/PostOfficeManager.js", "t_408de46adc8b70956c12");

  evidence(
    RETURN_CASE,
    'reply',
    __dialogueText("managers/PostOfficeManager.js", "t_c6d0fecb778f8c4b2cf6"),
    text
  );

  save({
    ...state,

    restante: {
      ...state.restante,

      clockwork: {
        ...message,
        collected: true
      }
    },

    returnCase: {
      ...state.returnCase,
      stage: 'reply'
    }
  });

  return text;
}

export function completeReturnCase(choice) {
  const state = postalState();

  if (
    state.returnCase.stage !== 'reply' ||
    !['private', 'disclose'].includes(choice)
  ) {
    return '';
  }

  const text = choice === 'private'
    ? (
        __dialogueText("managers/PostOfficeManager.js", "t_f74231459e87e4e94f6e") +
        __dialogueText("managers/PostOfficeManager.js", "t_debede0adaaa71a383a9") +
        __dialogueText("managers/PostOfficeManager.js", "t_67f622badf6eca5c7ba3") +
        __dialogueText("managers/PostOfficeManager.js", "t_a33f848ca197c0c9f260")
      )
    : (
        __dialogueText("managers/PostOfficeManager.js", "t_f74231459e87e4e94f6e") +
        __dialogueText("managers/PostOfficeManager.js", "t_4230b1a5b9b2e87d95d0") +
        __dialogueText("managers/PostOfficeManager.js", "t_8625922a2f08985a30d5") +
        __dialogueText("managers/PostOfficeManager.js", "t_8a8935723735e8b34aea")
      );

  evidence(
    RETURN_CASE,
    'ending',
    __dialogueText("managers/PostOfficeManager.js", "t_0057d83cb0fada88d37a"),
    text
  );

  const cases =
    gameState.piInvestigations?.cases;

  if (cases?.[RETURN_CASE]) {
    cases[RETURN_CASE].status = 'completed';
  }

  save({
    ...state,

    returnCase: {
      ...state.returnCase,
      stage: 'completed',
      ending: choice
    }
  });

  return (
    text +
    __dialogueText("managers/PostOfficeManager.js", "t_60c2107d3f5d09357f31") +
    __dialogueText("managers/PostOfficeManager.js", "t_ebc6ff29b5275a606ddf") +
    __dialogueText("managers/PostOfficeManager.js", "t_10d3eda908080100fb65")
  );
}