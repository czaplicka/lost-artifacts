import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

import { gameState } from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  getPIQuest
} from './PIQuestManager.js';

import {
  getDeadMailProgress,
  recordDeadMailFact
} from './DeadMailManager.js';

import {
  discoverSearchKeywords,
  getSearchProgress,
  validateSearchData
} from '../ui/pi-computer/ComputerSearch.js';

const SOURCE = 'managers/DeadMailCorrespondence.js';
const t = id => __dialogueText(SOURCE, id);

export const DEAD_MAIL_MESSAGE = 'dead_mail_florence_intro';
export const DEAD_MAIL_SEARCH = 'dead_mail';
export const DEAD_MAIL_QUEST = 'pi_dead_mail_preview';

const SEARCH_REVISION = 2;

const senderName = t('t_e014da3e60b6cc508835')
  .replace(/<[^>]*>/g, '')
  .replace(/^["']|["']$/g, '')
  .trim();

const cemeteryName = t('t_fcd5ad393af860802561');

export const DEAD_MAIL_PHOTO_DETAILS = {
  angel: {
    keywordId: 'damaged_angel',
    fragments: [
      t('t_e362982799c3edb5affa'),
      {
        text: t('t_6859ac7646434f4d7af0'),
        keywordId: 'damaged_angel'
      },
      t('t_75cbf8e2a0890a5fbc75')
    ]
  },

  plot: {
    keywordId: 'plot_114',
    fragments: [
      t('t_9a042997bd828cd87c7e'),
      {
        text: t('t_66fb0fd16270835b6426'),
        keywordId: 'plot_114'
      },
      t('t_2ed9137c1fac04081fb9')
    ]
  },

  label: {
    keywordId: 'gate_b',
    fragments: [
      t('t_76ac4b026173e3cf495b'),
      {
        text: t('t_76e90b8e2ab6a213454b'),
        keywordId: 'gate_b'
      },
      t('t_b46c8c1f4e7c0bea1542')
    ]
  }
};

export const DEAD_MAIL_MAIL_KEYWORDS = [
  {
    id: 'florence_name',
    label: senderName,
    cloudId: 'people'
  },
  {
    id: 'blackthorn_cemetery',
    label: cemeteryName,
    cloudId: 'cemetery'
  }
];

const keyword = (id, text) => ({
  keywordId: id,
  text
});

const searchDefinition = {
  id: DEAD_MAIL_SEARCH,
  revision: SEARCH_REVISION,
  title: t('t_16abdc3e0b396e03e229'),

  clouds: [
    {
      id: 'people',
      title: 'People'
    },
    {
      id: 'cemetery',
      title: cemeteryName
    }
  ],

  keywords: [
    ...DEAD_MAIL_MAIL_KEYWORDS,
    {
      id: 'damaged_angel',
      label: t('t_c9a0cf022d1ae58679ec'),
      cloudId: 'cemetery'
    },
    {
      id: 'plot_114',
      label: t('t_66fb0fd16270835b6426'),
      cloudId: 'cemetery'
    },
    {
      id: 'gate_b',
      label: t('t_76e90b8e2ab6a213454b'),
      cloudId: 'cemetery'
    }
  ],

  initialKeywords: [],

  pages: [
    {
      id: 'blackthorn_home',
      title: `${cemeteryName} — Official Website`,
      brand: cemeteryName,
      address: 'blackthorn.local',
      theme: 'organisation',
      snippet:
        'Visitor information, memorials and cemetery administration.',

      blocks: [
        [
          'Welcome to ',
          keyword('blackthorn_cemetery', cemeteryName),
          '. A quiet place. Please help us keep it that way.'
        ],
        [
          'Visitors are asked to remain on marked paths and respect ' +
          'private memorials. Monument repairs and burial enquiries ' +
          'should be directed to cemetery administration.'
        ],
        [
          'Our residents do not submit complaints. ' +
          'Their relatives more than make up for it.'
        ],
        [
          'Individual burial records are not published on this website.'
        ]
      ],

      links: []
    },

    {
      id: 'florence_search',
      title: `${senderName} — Public Search`,
      brand: 'Local Directory',
      address: 'directory.local/people',
      theme: 'organisation',
      snippet:
        'Public-directory search. Private correspondence is not indexed.',

      blocks: [
        [
          'Search subject: ',
          keyword('florence_name', senderName),
          '.'
        ],
        [
          'No verified public profile is available in this directory.'
        ],
        [
          'This does not verify or disprove anything said in private ' +
          'correspondence. A search result is not a character witness.'
        ],
        [
          'For this investigation, compare the original message ' +
          'with the attached photograph and independently checked facts.'
        ],
        [
          'Directory policy: we publish public information. ' +
          'Not knowing something is still free.'
        ]
      ],

      links: []
    },

    {
      id: 'blackthorn_monuments',
      title: 'Cemetery Monuments — Damage and Repairs',
      brand: cemeteryName,
      address: 'blackthorn.local/monuments',
      theme: 'organisation',
      snippet:
        'Information about damaged memorials and monument conservation.',

      blocks: [
        [
          'Reporting a ',
          keyword(
            'damaged_angel',
            t('t_c9a0cf022d1ae58679ec')
          ),
          '.'
        ],
        [
          'Weathering and accidental damage can affect cemetery ' +
          'monuments. Report the location and a description to administration.'
        ],
        [
          'A photograph may help identify a monument, but this public ' +
          'page is not an inventory of individual graves.'
        ],
        [
          'Please do not attempt repairs yourself. ' +
          'Good intentions are not a recognised masonry qualification.'
        ]
      ],

      links: [
        {
          label: 'Cemetery website',
          pageId: 'blackthorn_home'
        }
      ]
    },

    {
      id: 'blackthorn_plots',
      title: 'Burial Records — Public Information',
      brand: cemeteryName,
      address: 'blackthorn.local/records',
      theme: 'organisation',
      snippet:
        'Plot references and access to cemetery records.',

      blocks: [
        [
          'Enquiries concerning ',
          keyword(
            'plot_114',
            t('t_66fb0fd16270835b6426')
          ),
          ' should be checked against the cemetery register.'
        ],
        [
          'A plot number alone is not proof of a person’s identity, ' +
          'death or presence at the cemetery.'
        ],
        [
          'Names, dates and plot references must be checked together. ' +
          'Personal records are not available through this public page.'
        ],
        [
          'Please contact administration. ' +
          'The search box cannot be persuaded with flowers.'
        ]
      ],

      links: [
        {
          label: 'Cemetery website',
          pageId: 'blackthorn_home'
        }
      ]
    },

    {
      id: 'blackthorn_gates',
      title: 'Cemetery Access — Gate References',
      brand: cemeteryName,
      address: 'blackthorn.local/access',
      theme: 'organisation',
      snippet:
        'Gate labels, deliveries and access enquiries.',

      blocks: [
        [
          'Reference: ',
          keyword(
            'gate_b',
            t('t_76e90b8e2ab6a213454b')
          ),
          '.'
        ],
        [
          'Gate references may appear on delivery labels and ' +
          'maintenance paperwork. A gate reference by itself does not ' +
          'identify the final destination of a parcel.'
        ],
        [
          'Compare the label with another identifying detail before ' +
          'drawing conclusions about a delivery location.'
        ],
        [
          'Please do not leave parcels with the nearest statue. ' +
          'It is not an authorised signatory.'
        ]
      ],

      links: [
        {
          label: 'Cemetery website',
          pageId: 'blackthorn_home'
        }
      ]
    },

    {
      id: 'blackthorn_visitors',
      title: t('t_c903f65e265cda782dd9'),
      brand: cemeteryName,
      address: 'blackthorn.local/visitors',
      theme: 'organisation',
      snippet:
        'Visitor information matching the details in your search.',

      blocks: [
        [
          t('t_c16d6de15d441b00c564')
        ]
      ],

      links: [
        {
          label: 'Cemetery website',
          pageId: 'blackthorn_home'
        }
      ]
    }
  ],

  recipes: [
    {
      terms: ['florence_name'],
      pageId: 'florence_search'
    },
    {
      terms: ['blackthorn_cemetery'],
      pageId: 'blackthorn_home'
    },
    {
      terms: ['damaged_angel'],
      pageId: 'blackthorn_monuments'
    },
    {
      terms: ['plot_114'],
      pageId: 'blackthorn_plots'
    },
    {
      terms: ['gate_b'],
      pageId: 'blackthorn_gates'
    },

    {
      terms: ['florence_name', 'blackthorn_cemetery'],
      pageIds: [
        'florence_search',
        'blackthorn_home'
      ]
    },
    {
      terms: ['florence_name', 'damaged_angel'],
      pageIds: [
        'florence_search',
        'blackthorn_monuments'
      ]
    },
    {
      terms: ['florence_name', 'plot_114'],
      pageIds: [
        'florence_search',
        'blackthorn_plots'
      ]
    },
    {
      terms: ['florence_name', 'gate_b'],
      pageIds: [
        'florence_search',
        'blackthorn_gates'
      ]
    },

    {
      terms: ['blackthorn_cemetery', 'damaged_angel'],
      pageId: 'blackthorn_monuments'
    },
    {
      terms: ['blackthorn_cemetery', 'plot_114'],
      pageId: 'blackthorn_plots'
    },
    {
      terms: ['blackthorn_cemetery', 'gate_b'],
      pageId: 'blackthorn_gates'
    },

    {
      terms: ['damaged_angel', 'plot_114'],
      pageIds: [
        'blackthorn_monuments',
        'blackthorn_plots'
      ]
    },

    {
      terms: ['damaged_angel', 'gate_b'],
      pageId: 'blackthorn_visitors'
    },
    {
      terms: ['plot_114', 'gate_b'],
      pageId: 'blackthorn_visitors'
    }
  ]
};

validateSearchData({
  version: 1,
  cases: [searchDefinition]
});

export function hasDeadMailCorrespondence() {
  const quest = getPIQuest(DEAD_MAIL_QUEST);

  return (
    quest?.metadata?.contentId === 'dead_mail' &&
    ['active', 'completed'].includes(quest.status)
  );
}

export function isDeadMailMessage(message) {
  return (
    message?.id === DEAD_MAIL_MESSAGE &&
    hasDeadMailCorrespondence()
  );
}

export function cleanDeadMailBody(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .filter(line => {
      const text = line.trim();

      return !(
        /^\[?\s*attachments?\s*:\s*(?:file\b|delivery_photo\b)/i
          .test(text) ||
        /^\[?\s*attachment\s*:\s*file/i.test(text)
      );
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getDeadMailMessages() {
  if (!hasDeadMailCorrespondence()) return [];

  const body = [
    t('t_0c1aba307a089de58a42'),
    t('t_e1efb7573d6afdd3af1e'),
    t('t_211b20291a8ca14302bd'),
    t('t_e6eff9d1df365d35118b'),
    t('t_3666aadb910fe4a58a6a'),
    t('t_b732e56d6b0f7def2efa'),
    t('t_8f8b5ba14270cd132d23'),
    t('t_87ea2f9c062e3cab6603'),
    t('t_e014da3e60b6cc508835'),
    t('t_e57e172497e379987fb5')
  ].join(t('t_75a11da44c802486bc6f'));

  return [
    {
      id: DEAD_MAIL_MESSAGE,
      from: t('t_e014da3e60b6cc508835'),
      subject: t('t_d80fc74378493d32e991'),
      date: t('t_9a264749f9d43669aac5'),
      threadId: DEAD_MAIL_QUEST,

      attachments: [
        {
          id: 'dead_mail_delivery_photo',
          type: 'image',
          name: 'delivery_photo.webp',
          imageKey: 'dead_mail_delivery_photo'
        }
      ],

      body: cleanDeadMailBody(body)
    }
  ];
}

export function markDeadMailMessageRead(id) {
  if (
    id !== DEAD_MAIL_MESSAGE ||
    !hasDeadMailCorrespondence()
  ) {
    return false;
  }

  const progress = getDeadMailProgress();

  if (progress.mailRead === true) return false;

  gameState.deadMailPreview = {
    ...progress,
    mailRead: true
  };

  requestAutosave();
  return true;
}

export function collectDeadMailMailKeyword(id) {
  if (!hasDeadMailCorrespondence()) return false;

  if (
    !DEAD_MAIL_MAIL_KEYWORDS.some(item => item.id === id)
  ) {
    return false;
  }

  const progress = getDeadMailProgress();

  if (progress.mailRead !== true) return false;

  const collected = Array.isArray(progress.mailKeywords)
    ? progress.mailKeywords
    : [];

  if (!collected.includes(id)) {
    gameState.deadMailPreview = {
      ...progress,
      mailKeywords: [...collected, id]
    };

    requestAutosave();
  }

  const known =
    getSearchProgress().cases[DEAD_MAIL_SEARCH]?.known || [];

  if (!known.includes(id)) {
    discoverSearchKeywords(DEAD_MAIL_SEARCH, [id]);
  }

  return true;
}

export function inspectDeadMailPhoto(id) {
  if (
    !hasDeadMailCorrespondence() ||
    !Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS, id)
  ) {
    return false;
  }

  const progress = getDeadMailProgress();

  const inspected = Array.isArray(progress.photoInspected)
    ? progress.photoInspected
    : [];

  if (
    progress.selectedPhotoDetail === id &&
    inspected.includes(id)
  ) {
    return true;
  }

  gameState.deadMailPreview = {
    ...progress,
    selectedPhotoDetail: id,
    photoInspected: [
      ...new Set([...inspected, id])
    ]
  };

  requestAutosave();
  return true;
}

export function collectDeadMailPhoto(id) {
  if (
    !hasDeadMailCorrespondence() ||
    !Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS, id)
  ) {
    return false;
  }

  const progress = getDeadMailProgress();

  if (
    !progress.photoInspected?.includes(id) &&
    !progress.clues.includes(id)
  ) {
    return false;
  }

  recordDeadMailFact(id);

  const keywordId = DEAD_MAIL_PHOTO_DETAILS[id].keywordId;

  const known =
    getSearchProgress().cases[DEAD_MAIL_SEARCH]?.known || [];

  if (!known.includes(keywordId)) {
    discoverSearchKeywords(DEAD_MAIL_SEARCH, [keywordId]);
  }

  return true;
}

export function ensureDeadMailSearchDefinition(search) {
  if (
    !hasDeadMailCorrespondence() ||
    !Array.isArray(search?.data?.cases)
  ) {
    return false;
  }

  const index = search.data.cases.findIndex(
    entry => entry.id === DEAD_MAIL_SEARCH
  );

  let changed = false;

  if (
    index < 0 ||
    search.data.cases[index].revision !== SEARCH_REVISION
  ) {
    const definition = JSON.parse(
      JSON.stringify(searchDefinition)
    );

    const cases = [...search.data.cases];

    if (index < 0) {
      cases.push(definition);
    } else {
      cases[index] = definition;
    }

    search.data = {
      ...search.data,
      cases
    };

    changed = true;
  }

  const progress = getDeadMailProgress();

  const photoKeywords = progress.clues
    .filter(id => Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS, id))
    .map(id => DEAD_MAIL_PHOTO_DETAILS[id].keywordId);

  const mailKeywords = (
    Array.isArray(progress.mailKeywords)
      ? progress.mailKeywords
      : []
  ).filter(id =>
    DEAD_MAIL_MAIL_KEYWORDS.some(item => item.id === id)
  );

  const searchProgress = getSearchProgress();
  const current = searchProgress.cases[DEAD_MAIL_SEARCH];

  const known = current?.known || [];

  const missing = [
    ...new Set([
      ...photoKeywords,
      ...mailKeywords
    ])
  ].filter(id => !known.includes(id));

  if (!current || missing.length) {
    discoverSearchKeywords(
      DEAD_MAIL_SEARCH,
      missing
    );
  }

  return changed;
}

export function deadMailFieldReady() {
  if (!hasDeadMailCorrespondence()) return false;

  return getDeadMailProgress().clues.length === 3;
}