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
    metaText: 'Post Office',
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
    'Courier label',

    'The delivery label in Florence’s photograph ' +
    'belongs to a private courier, not the town ' +
    'postal service. The local post office cannot ' +
    'authenticate that courier’s delivery status.'
  ],

  route: [
    'Not the postal round',

    'The postman says he did not deliver the ' +
    'photographed parcel. His route does not ' +
    'include private-courier deliveries. This ' +
    'does not identify who did deliver it.'
  ],

  gate: [
    'An instruction, not a signature',

    'SERVICE GATE B is a delivery instruction, ' +
    'not the name or signature of a recipient. ' +
    'A photograph of a parcel at a location does ' +
    'not establish who collected it.'
  ]
};

export function postalDeadTopic(id) {
  if (!canCheckDeadMail()) {
    return (
      'Read Florence’s email or inspect the ' +
      'delivery photograph first.'
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
    title: 'Dead Mail'
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
    title: 'Return to Sender'
  });

  evidence(
    RETURN_CASE,
    'envelope',
    'The returning letter',

    'A sealed letter addressed to A. Reed has ' +
    'returned from three addresses. The final ' +
    'forwarding address is the PI office. The ' +
    'postman authorises inspection of the ' +
    'envelope, not its contents.'
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
    'Forwarding trail',

    'The envelope reads A. REED / CLOCK REPAIRS. ' +
    'Its three old addresses match the forwarding ' +
    'trail. The final instruction names your PI ' +
    'office, not a residence.'
  ],

  card: [
    'Signed forwarding card',

    'The postman provides the relevant signed ' +
    'forwarding card: A. Reed authorises ' +
    'undeliverable mail to be referred to a ' +
    'private investigator. The card bears a ' +
    'small clock drawing.'
  ],

  notice: [
    'A public notice',

    'A notice on the public board reads: ' +
    'CLOCK REPAIRS — ELLIS BELL. Formerly ' +
    'trading as A. Reed. Correspondence: ' +
    'poste restante, CLOCKWORK. No home ' +
    'address is listed.'
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
      'Inspect all three authorised sources first.'
    );
  }

  if (answer !== 'ellis') {
    return (
      'That interpretation does not connect the ' +
      'forwarding card, the trade name and the ' +
      'public notice.'
    );
  }

  evidence(
    RETURN_CASE,
    'identity',
    'A. Reed is Ellis Bell',

    'The public notice explicitly links the ' +
    'former trade name A. Reed to Ellis Bell. ' +
    'CLOCKWORK is his correspondence alias, ' +
    'not his home address.'
  );

  save({
    ...state,

    returnCase: {
      ...state.returnCase,
      stage: 'identified'
    }
  });

  return (
    'Ellis Bell is the intended recipient. ' +
    'Use the CLOCKWORK correspondence service ' +
    'to reach him without searching for his home.'
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
    normalizedPassword !== 'SECOND HAND'
  ) {
    return (
      'The clerk cannot verify that alias ' +
      'and password. Nothing has been deposited.'
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
      'You have not established who this ' +
      'correspondence belongs to.'
    );
  }

  if (state.restante.clockwork) {
    return (
      'Your correspondence is already on file. ' +
      'No duplicate was created.'
    );
  }

  const text = String(body).trim();

  if (!text) {
    return (
      'An empty envelope is a philosophical ' +
      'statement, not correspondence.'
    );
  }

  evidence(
    RETURN_CASE,
    'message',
    'Message left for CLOCKWORK',
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
    'Message deposited. Leave the post office ' +
    'and return to check for a reply. No fee ' +
    'and no energy cost.'
  );
}

export function collectPostalReply() {
  const state = postalState();
  const message = state.restante.clockwork;

  if (!message) {
    return 'There is no correspondence for you.';
  }

  if (message.collected) {
    return (
      'You have already collected the reply. ' +
      'It is recorded on your case board.'
    );
  }

  if (state.visits <= message.leftVisit) {
    return (
      'No reply yet. Check after your next visit.'
    );
  }

  const text =
    '“Yes, A. Reed was my old trading name. ' +
    'I changed it after a business partnership ' +
    'ended. Please leave the sealed letter here ' +
    'for CLOCKWORK. Tell the sender I can receive ' +
    'a reply through this desk, but please do not ' +
    'pass on my new name. — Ellis Bell”';

  evidence(
    RETURN_CASE,
    'reply',
    'Ellis confirms his identity',
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
        'The clerk places the sealed letter in ' +
        'CLOCKWORK’s collection slot. The sender ' +
        'receives only a correspondence address. ' +
        'Ellis’s new name remains private.'
      )
    : (
        'The clerk places the sealed letter in ' +
        'CLOCKWORK’s collection slot. Your report ' +
        'to the sender includes Ellis’s new name ' +
        'despite his request.'
      );

  evidence(
    RETURN_CASE,
    'ending',
    'Letter delivered / case closed',
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
    ' The postman gives you a commemorative ' +
    'card: DELIVERED. EVENTUALLY. It is recorded ' +
    'with the case. No repeatable cash reward.'
  );
}