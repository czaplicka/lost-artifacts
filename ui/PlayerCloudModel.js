import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  deadMenNamingOptions
} from './DeadMenCloudModel.js';

import {
  alibiNamingOptions
} from './AlibiCloudModel.js';

export const CLOUD_STORE =
  'playerCloudNotebookV1';

const arr = value =>
  Array.isArray(value) ? value : [];

const clean = id =>
  typeof id === 'string' &&
  /^[a-zA-Z0-9_-]+$/.test(id) &&
  ![
    '__proto__',
    'prototype',
    'constructor'
  ].includes(id);

export function knownWords(
  state,
  definition
) {
  const known = new Set(
    arr(
      state.piKeywordSearch
        ?.cases?.[definition.id]?.known
    )
  );

  return arr(definition.keywords).filter(
    word => known.has(word.id)
  );
}

export function cloudCase(state, caseId) {
  const raw =
    state[CLOUD_STORE]?.cases?.[caseId];

  return {
    sequence: Number.isSafeInteger(
      raw?.sequence
    )
      ? raw.sequence
      : 0,

    clouds: arr(raw?.clouds).map(
      cloud => ({
        ...cloud,

        words: [
          ...new Set(arr(cloud.words))
        ]
      })
    ),

    links: arr(raw?.links).map(
      link => ({ ...link })
    )
  };
}

function storeCase(state, caseId, next) {
  if (!clean(caseId)) return false;

  const previous =
    state[CLOUD_STORE] || {};

  state[CLOUD_STORE] = {
    ...previous,
    version: 1,

    cases: {
      ...(previous.cases || {}),
      [caseId]: next
    }
  };

  return true;
}

export function namingOptions(
  state,
  definition
) {
  if (definition.id === 'dead_men_calling') {
    return deadMenNamingOptions(
      state,
      definition
    );
  }

  if (definition.id === 'borrowed_alibi') {
    return alibiNamingOptions(
      state,
      definition
    );
  }

  const words = knownWords(
    state,
    definition
  );

  if (definition.id !== 'miramar_demo') {
    return words.map(word => ({
      id: word.id,
      label: word.label
    }));
  }

  const entities = new Set([
    'claire',
    'nora',
    'miramar',
    'mariner',
    'coral',
    'open_skies',
    'conference'
  ]);

  return [
    {
      id: 'daniel',
      label: __dialogueText("ui/PlayerCloudModel.js", "t_6cb3c65fc4369ef0ffc9")
    },

    ...words
      .filter(word =>
        entities.has(word.id)
      )
      .map(word => ({
        id: word.id,
        label: word.label
      }))
  ];
}

export function createCloud(
  state,
  definition,
  wordIds = []
) {
  const progress = cloudCase(
    state,
    definition.id
  );

  const known = new Set(
    knownWords(state, definition).map(
      word => word.id
    )
  );

  let sequence = progress.sequence + 1;
  let id = 'cloud_' + sequence;

  while (
    progress.clouds.some(
      cloud => cloud.id === id
    )
  ) {
    id = 'cloud_' + (++sequence);
  }

  progress.sequence = sequence;

  progress.clouds.push({
    id,
    titleKey: null,

    words: [
      ...new Set(wordIds)
    ].filter(wordId =>
      known.has(wordId)
    )
  });

  return storeCase(
    state,
    definition.id,
    progress
  )
    ? id
    : null;
}

export function nameCloud(
  state,
  definition,
  cloudId,
  titleKey
) {
  if (
    titleKey !== null &&
    !namingOptions(
      state,
      definition
    ).some(option =>
      option.id === titleKey
    )
  ) {
    return false;
  }

  const progress = cloudCase(
    state,
    definition.id
  );

  const cloud = progress.clouds.find(
    item => item.id === cloudId
  );

  if (!cloud) return false;

  cloud.titleKey = titleKey;

  return storeCase(
    state,
    definition.id,
    progress
  );
}

export function addCloudWords(
  state,
  definition,
  cloudId,
  ids
) {
  const progress = cloudCase(
    state,
    definition.id
  );

  const cloud = progress.clouds.find(
    item => item.id === cloudId
  );

  if (!cloud) return false;

  const known = new Set(
    knownWords(state, definition).map(
      word => word.id
    )
  );

  cloud.words = [
    ...new Set([
      ...cloud.words,

      ...ids.filter(id =>
        known.has(id)
      )
    ])
  ];

  return storeCase(
    state,
    definition.id,
    progress
  );
}

export function removeCloudWords(
  state,
  caseId,
  cloudId,
  ids
) {
  const progress = cloudCase(
    state,
    caseId
  );

  const cloud = progress.clouds.find(
    item => item.id === cloudId
  );

  if (!cloud) return false;

  const remove = new Set(ids);

  cloud.words = cloud.words.filter(
    id => !remove.has(id)
  );

  return storeCase(
    state,
    caseId,
    progress
  );
}

export function deleteCloud(
  state,
  caseId,
  cloudId
) {
  const progress = cloudCase(
    state,
    caseId
  );

  if (
    !progress.clouds.some(
      cloud => cloud.id === cloudId
    )
  ) {
    return false;
  }

  progress.clouds =
    progress.clouds.filter(
      cloud => cloud.id !== cloudId
    );

  progress.links =
    progress.links.filter(link =>
      link.from !== cloudId &&
      link.to !== cloudId
    );

  return storeCase(
    state,
    caseId,
    progress
  );
}

export function linkClouds(
  state,
  caseId,
  from,
  to
) {
  const progress = cloudCase(
    state,
    caseId
  );

  if (
    from === to ||
    ![from, to].every(id =>
      progress.clouds.some(
        cloud => cloud.id === id
      )
    )
  ) {
    return false;
  }

  const exists = progress.links.some(
    link =>
      [link.from, link.to].includes(from) &&
      [link.from, link.to].includes(to)
  );

  if (!exists) {
    progress.links.push({ from, to });
  }

  return storeCase(
    state,
    caseId,
    progress
  );
}

export function unlinkClouds(
  state,
  caseId,
  from,
  to
) {
  const progress = cloudCase(
    state,
    caseId
  );

  progress.links = progress.links.filter(
    link => !(
      [link.from, link.to].includes(from) &&
      [link.from, link.to].includes(to)
    )
  );

  return storeCase(
    state,
    caseId,
    progress
  );
}

export function unsortedWords(
  state,
  definition
) {
  const assigned = new Set(
    cloudCase(
      state,
      definition.id
    ).clouds.flatMap(
      cloud => cloud.words
    )
  );

  return knownWords(
    state,
    definition
  ).filter(word =>
    !assigned.has(word.id)
  );
}

export function cloudTitle(
  state,
  definition,
  cloud
) {
  return namingOptions(
    state,
    definition
  ).find(option =>
    option.id === cloud.titleKey
  )?.label || __dialogueText("ui/PlayerCloudModel.js", "t_e49f0f4af30b79d7cc8f");
}

export function reedPhoneQuestions(
  state,
  definition,
  cloud,
  contact,
  flags = []
) {
  if (
    definition.id !== 'miramar_demo' ||
    !cloud?.titleKey
  ) {
    return [];
  }

  const known = new Set(
    knownWords(state, definition).map(
      word => word.id
    )
  );

  const members = new Set(cloud.words);

  const organisation =
    cloud.titleKey === 'open_skies';

  const subject = id =>
    cloud.titleKey === id ||
    (
      organisation &&
      members.has(id)
    );

  const specs = [
    [
      'reed_claire_delegate',
      __dialogueText("ui/PlayerCloudModel.js", "t_95b3096dec2fc93f320c"),
      'claire',
      'conference'
    ],
    [
      'reed_claire_message',
      __dialogueText("ui/PlayerCloudModel.js", "t_c04114f0b7e67c38d588"),
      'claire'
    ],
    [
      'reed_nora_private_number',
      __dialogueText("ui/PlayerCloudModel.js", "t_e240e28068f504dc7a86"),
      'nora'
    ],
    [
      'reed_nora_handover',
      __dialogueText("ui/PlayerCloudModel.js", "t_a1298aa1268343c31ad7"),
      'nora',
      'checked_jacket'
    ],
    [
      'reed_claire_table',
      __dialogueText("ui/PlayerCloudModel.js", "t_c05213661feb2f9cab71"),
      'claire',
      'two_glasses'
    ],
    [
      'reed_daniel_enquiry',
      __dialogueText("ui/PlayerCloudModel.js", "t_6cc7778bb67200f8a87c"),
      'daniel'
    ],
    [
      'reed_daniel_accommodation',
      __dialogueText("ui/PlayerCloudModel.js", "t_daebbe1b988f622dca5e"),
      'daniel'
    ],
    [
      'reed_delegate_status',
      __dialogueText("ui/PlayerCloudModel.js", "t_792519d99bb72a3076a5"),
      'open_skies',
      'swallow_logo'
    ],
    [
      'reed_event_photograph_timing',
      __dialogueText("ui/PlayerCloudModel.js", "t_5e2e386a32c3c2e8d4a2"),
      'open_skies',
      'conference'
    ],
    [
      'reed_miramar_private_rooms',
      __dialogueText("ui/PlayerCloudModel.js", "t_2e87a7cbff8cae529c29"),
      'miramar',
      'conference'
    ],
    [
      'claire_phone_request',
      __dialogueText("ui/PlayerCloudModel.js", "t_6b0b47748be2328a16e3"),
      'claire'
    ],
    [
      'claire_work_email',
      __dialogueText("ui/PlayerCloudModel.js", "t_0d6a0f842cbb0d003ee5"),
      'claire'
    ],
    [
      'claire_profile',
      __dialogueText("ui/PlayerCloudModel.js", "t_88cfeedff83d69adb4a6"),
      'claire'
    ],
    [
      'claire_jacket',
      __dialogueText("ui/PlayerCloudModel.js", "t_07b3414edd90c0817f50"),
      'claire',
      'checked_jacket'
    ],
    [
      'nora_intro',
      __dialogueText("ui/PlayerCloudModel.js", "t_09185bf88d95b7007da9"),
      'nora'
    ],
    [
      'nora_profile',
      __dialogueText("ui/PlayerCloudModel.js", "t_5b5da06430c462e8a4e8"),
      'nora'
    ],
    [
      'jacket_verification',
      __dialogueText("ui/PlayerCloudModel.js", "t_34bb8a9a00ecf4b734b7"),
      'nora',
      'checked_jacket'
    ],
    [
      'organisation_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_db8415b9dd4bd8a85237"),
      'open_skies'
    ],
    [
      'conference_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_71587d7a2ac95a0abad0"),
      'open_skies',
      'conference'
    ],
    [
      'photo_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_ff49291e10aec112ff1c"),
      'open_skies',
      'conference'
    ],
    [
      'badge_conference',
      __dialogueText("ui/PlayerCloudModel.js", "t_8cee4748d9bd70f5ca68"),
      'open_skies',
      'swallow_logo'
    ],
    [
      'hotel_conference',
      __dialogueText("ui/PlayerCloudModel.js", "t_271589d47837edb5a7e9"),
      'open_skies',
      'miramar'
    ],
    [
      'hotel_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_1252f88d069d344c2c91"),
      'miramar'
    ],
    [
      'mariner_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_63c4a83fbb1e7d2dc24e"),
      'mariner'
    ],
    [
      'coral_general',
      __dialogueText("ui/PlayerCloudModel.js", "t_7a9ae1df2577c5d28fc9"),
      'coral'
    ]
  ];

  return specs
    .filter(([, , id, detail]) =>
      subject(id) &&
      (!detail || members.has(detail))
    )
    .map(([id, label]) => {
      const topic = contact.topics.find(
        item => item.id === id
      );

      return topic
        ? {
            ...topic,
            questionLabel: label
          }
        : null;
    })
    .filter(topic =>
      topic &&
      (topic.terms || []).every(id =>
        known.has(id)
      ) &&
      (topic.requiresFlags || []).every(
        flag => flags.includes(flag)
      )
    );
}

// REED_MORE_PHONE_DIALOGUES_V1