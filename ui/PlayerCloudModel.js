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
      label: 'Daniel Reed'
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
  )?.label || 'Unnamed cloud';
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
      'Claire’s reason for attending',
      'claire',
      'conference'
    ],
    [
      'reed_claire_message',
      'Leave a message for Claire',
      'claire'
    ],
    [
      'reed_nora_private_number',
      'Contacting Nora',
      'nora'
    ],
    [
      'reed_nora_handover',
      'What happened after the photograph?',
      'nora',
      'checked_jacket'
    ],
    [
      'reed_claire_table',
      'Ask about Claire’s table',
      'claire',
      'two_glasses'
    ],
    [
      'reed_daniel_enquiry',
      'Daniel’s connection to the event',
      'daniel'
    ],
    [
      'reed_daniel_accommodation',
      'Daniel’s hotel booking',
      'daniel'
    ],
    [
      'reed_delegate_status',
      'Who received delegate passes?',
      'open_skies',
      'swallow_logo'
    ],
    [
      'reed_event_photograph_timing',
      'When were the reception photographs taken?',
      'open_skies',
      'conference'
    ],
    [
      'reed_miramar_private_rooms',
      'Event arrangements and private bookings',
      'miramar',
      'conference'
    ],
    [
      'claire_phone_request',
      'Contact Claire Sutton',
      'claire'
    ],
    [
      'claire_work_email',
      'Ask for Claire’s work email',
      'claire'
    ],
    [
      'claire_profile',
      'Claire’s role at the foundation',
      'claire'
    ],
    [
      'claire_jacket',
      'Claire and the borrowed jacket',
      'claire',
      'checked_jacket'
    ],
    [
      'nora_intro',
      'Nora in the reception photograph',
      'nora'
    ],
    [
      'nora_profile',
      'Nora’s role at the foundation',
      'nora'
    ],
    [
      'jacket_verification',
      'Nora and the borrowed jacket',
      'nora',
      'checked_jacket'
    ],
    [
      'organisation_general',
      'The foundation’s work',
      'open_skies'
    ],
    [
      'conference_general',
      'The New Horizons programme',
      'open_skies',
      'conference'
    ],
    [
      'photo_general',
      'Who arranged the photographs?',
      'open_skies',
      'conference'
    ],
    [
      'badge_conference',
      'Delegate badges',
      'open_skies',
      'swallow_logo'
    ],
    [
      'hotel_conference',
      'The reception venue',
      'open_skies',
      'miramar'
    ],
    [
      'hotel_general',
      'The event at Hotel Miramar',
      'miramar'
    ],
    [
      'mariner_general',
      'Ask about The Mariner',
      'mariner'
    ],
    [
      'coral_general',
      'Ask about Coral Crown Hotel',
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