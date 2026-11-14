import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const word = (keywordId, text) =>
  text === undefined
    ? { keywordId }
    : { keywordId, text };

const line = (speaker, text, fragments) => ({
  speaker,
  text,
  ...(fragments ? { fragments } : {})
});

const topic = (
  id,
  terms,
  lines,
  grantFlags = [],
  requiresFlags = []
) => ({
  id,
  terms,
  requiresFlags,
  grantKeywords: [],
  grantFlags,
  lines
});

const contact = (
  id,
  number,
  name,
  requiresKeyword,
  speaker,
  greeting,
  topics
) => ({
  id,
  caseId: 'borrowed_alibi',
  number,
  name,
  requiresKeyword,

  choicePrompt: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a0dbb0ffa63779baf32c"),

  greeting: [
    line(speaker, greeting)
  ],

  fallback: [
    line(
      speaker,
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_b000a9470b62f2dd538f")
    )
  ],

  topics
});

export const ALIBI_INTERVIEW_SEARCH = {
  clouds: [
    {
      id: 'interviews',
      title: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a35f29ede16c7eb35056")
    },
    {
      id: 'verification',
      title: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ca875d73c3682d7acc18")
    }
  ],

  keywords: [
    {
      id: 'nora_phone',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2d1007980f49215311f7"),
      cloudId: 'interviews'
    },
    {
      id: 'simon_phone',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fed88b40aba63cac05ea"),
      cloudId: 'interviews'
    },
    {
      id: 'evelyn_phone',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_0a1f1256f9bac68e8064"),
      cloudId: 'interviews'
    },
    {
      id: 'company_phone',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_98f1f17f9a73ccfe3e25"),
      cloudId: 'interviews'
    },
    {
      id: 'pie_contest',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5b3d2434d90ebb6f24e3"),
      cloudId: 'interviews'
    },
    {
      id: 'board_tournament',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a05e96774c14aa4f0766"),
      cloudId: 'interviews'
    },
    {
      id: 'nora_verified',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f1fd8b249d54aac03848"),
      cloudId: 'verification'
    },
    {
      id: 'simon_verified',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_07791d5910b82e447e97"),
      cloudId: 'verification'
    },
    {
      id: 'morrow_records',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6f56621a82707ed0bcf5"),
      cloudId: 'verification'
    },
    {
      id: 'records_breakin',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e49ba0c10e6e41898c4c"),
      cloudId: 'verification'
    },
    {
      id: 'blue_folder',
      label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5e4ba369aac7ad63f846"),
      cloudId: 'verification'
    }
  ],

  pages: [
    {
      id: 'nora_profile',
      title: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e7e25a1068e84a87c2ba"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_1d994383745168697174"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cfac39f906206ece50e"),

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fc5a9c3b12088a2ccfbd"))
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e31a30868c77352e3fee")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f494a5e8694a17a44f96"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_d56174cc575a4e334f5a")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_44745e8cd16f6b131705")
        ]
      ],

      links: [],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_802c35bc9f597d698dbc")
    },

    {
      id: 'simon_profile',
      title: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_32b7b3b35a5187e782d1"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_aaaec30844a0f787ab7d"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_82517bcb0c8a0c5b8fbb"),

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2a4b6bdc80a180c94eb9"))
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3b19deb7933383d842c1"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_44679e14ba83309cae0e")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2c25cb5ff9208e64cce4")
        ]
      ],

      links: [],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ee72f2f085fe2d5daf88")
    },

    {
      id: 'evelyn_profile',
      title: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6dc97a1287f81824ff97"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_af5e5e520c98ed730073"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cec46fcbcf1e95a34cf6"),

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4f6e54dad543a8c9edb9")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ccaeca1ce1ecd1711207"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ff1618327a8b7476aef7")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3330b1bf0b4f30102939"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_0ad261186c2da78f31c2")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4ebf467576aa50a32b1f")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_9d99a50c57df6332dac4")
        ]
      ],

      links: [
        {
          label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8a3db575da4d1a7c4329"),
          pageId: 'morrow_notice'
        },
        {
          label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
          pageId: 'morrow_contact'
        }
      ],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_650a038b45be07465cf3")
    },

    {
      id: 'pie_results',
      title:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ba6af611bffd3ec0bea5"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c5dbb0826c7603541ae1"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6328000342be5a057e9b"),

      template: 'organisation',
      theme: 'organisation',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ec3e9f4d59036471f4c9"))
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_103ec9bae2cdd63864a6"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fc5a9c3b12088a2ccfbd")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8061b6373041c15ea9bf")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_39f38cd53dcb7660e9c7") +
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c84f655066e81a59899f") +
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f88bc3a17e5523de3e0b")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3b574dca7dbcf1fd36eb")
        ]
      ],

      links: [],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_1975d3018d239dd6f8da")
    },

    {
      id: 'game_results',
      title:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e1210dd13d2b42656d47"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5b3fb28049b29ca8247f"),
      brand:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_0c1fb11820c558db40a7"),

      template: 'association',
      theme: 'organisation',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_03b65a672d89cc694fef"))
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_afdb5a2932d6df493ae3"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2a4b6bdc80a180c94eb9")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2568e69f9cde719a4db8")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6e80d120d556b898bc7f") +
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e0e31d7aead14b1135fe") +
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2382f4def67358e47943")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8fac93bba05ab8221196")
        ]
      ],

      links: [],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c591d4af0760d77ef9c6")
    },

    {
      id: 'morrow_notice',
      title:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fa8cfaf6266c530317f0"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a82eca0f2f61ceaa35b6"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cec46fcbcf1e95a34cf6"),

      template: 'business',
      theme: 'business',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ff1618327a8b7476aef7")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4dbb5618fe1250b1d863")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_7a7202fb1b53105f00a4"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_76b85025c8908d08f991")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_194dcb9f4b59b7f32937")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2c99da00d31982336e39")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_248382f48e9e05dc1049")
        ]
      ],

      links: [
        {
          label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
          pageId: 'morrow_contact'
        },
        {
          label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_18cd30dc6decf9892f9b"),
          pageId: 'evelyn_profile'
        }
      ],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4d642ddec04f81951167")
    },

    {
      id: 'morrow_contact',
      title:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_b18943fb42b4f0b507fc"),
      address:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_7f3d96d2a145703dbbc5"),
      brand: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cec46fcbcf1e95a34cf6"),

      template: 'business',
      theme: 'business',

      blocks: [
        [
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ff1618327a8b7476aef7")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ab36775f26b0e79d5d3d")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6cef68daa8653a88e7be"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_76b85025c8908d08f991")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_45822f54a0d0e030f756"),
          word(__dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fb8eb27ad5ae16861100")),
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_67d532c8e4f9aee6d2d1")
        ]
      ],

      links: [
        {
          label: __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cf7be0cec09f64982801"),
          pageId: 'morrow_notice'
        }
      ],

      snippet:
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_658a559485f81d14db5c")
    }
  ],

  recipes: [
    {
      terms: ['nora_bell'],
      pageIds: ['nora_profile']
    },
    {
      terms: ['simon_pike'],
      pageIds: ['simon_profile']
    },
    {
      terms: ['evelyn_shaw'],
      pageIds: ['evelyn_profile']
    },
    {
      terms: ['pie_contest'],
      pageIds: ['pie_results']
    },
    {
      terms: ['nora_bell', 'pie_contest'],
      pageIds: ['pie_results']
    },
    {
      terms: ['board_tournament'],
      pageIds: ['game_results']
    },
    {
      terms: ['simon_pike', 'board_tournament'],
      pageIds: ['game_results']
    },
    {
      terms: ['morrow_records'],
      pageIds: [
        'morrow_notice',
        'morrow_contact'
      ]
    },
    {
      terms: ['evelyn_shaw', 'morrow_records'],
      pageIds: [
        'evelyn_profile',
        'morrow_notice'
      ]
    },
    {
      terms: ['records_breakin'],
      pageIds: ['morrow_notice']
    },
    {
      terms: ['morrow_records', 'records_breakin'],
      pageIds: [
        'morrow_notice',
        'morrow_contact'
      ]
    }
  ]
};

const CHALLENGE_REQUIREMENTS = [
  'club_sample_received',
  'no_hot_food',
  'receipt_received'
];

function evelynSlip(question) {
  return [
    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
      question
    ),

    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_2ca5a4eb462301f30d20"),
      [
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_00b2138021018046386b"),
        word('blue_folder', __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5e4ba369aac7ad63f846")),
        __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e51f0b5a107d59b1066f")
      ]
    ),

    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e3dad0b50f6afcf60d07")
    ),

    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6c7edb57a8d94157a0c3")
    )
  ];
}

function folderCheck(question) {
  return [
    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
      question
    ),

    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e2432492d78af33e4adc")
    ),

    line(
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
      __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f5c79a6084c52e0917eb")
    )
  ];
}

export const ALIBI_INTERVIEW_CONTACTS = [
  contact(
    'alibi_nora_bell',
    '429',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_dac335a5077488ca8d55"),
    'nora_phone',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a8155ac49edb0713cf28"),

    [
      topic(
        'nora_intro',
        ['nora_bell'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c60efb376a0dbb471e42")
          ),
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8ef7d2a1b228ca53a0c8")
          )
        ]
      ),

      topic(
        'nora_confront',
        ['nora_bell', 'sample_code'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_7a28caadd23d60303406")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_20d98014fb784beda717")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_606711565c1ad9aea10a"),

            [
              __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_393400c137ef0be8a2c9"),
              word(
                'pie_contest',
                __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5b3d2434d90ebb6f24e3")
              ),
              __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a05b0389b478b86cbfa0")
            ]
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_7cf3dd0f623c87f4310f")
          )
        ],

        ['nora_admitted'],
        [...CHALLENGE_REQUIREMENTS]
      ),

      topic(
        'nora_event',
        ['nora_bell', 'pie_contest'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a66c3e04a5cee40df4e1")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4cca0264ed42816c466a"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_aedc9248b7d46c2f7e39")
          )
        ],

        [],
        ['nora_admitted']
      )
    ]
  ),

  contact(
    'alibi_simon_pike',
    '430',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_291ac92536daeb7fa1b7"),
    'simon_phone',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5e9be429342b9f48aa6c"),

    [
      topic(
        'simon_intro',
        ['simon_pike'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8af108635fbdb8a29522")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c38398936a60c3c18ce7")
          )
        ]
      ),

      topic(
        'simon_confront',
        ['simon_pike', 'sample_code'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_40727c8b31d268e83d8f")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e41a16d7aff62b559d9e")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c64816bbd5d4f1d4d3a4"),

            [
              __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_e339037fef0f401172a3"),
              word(
                'board_tournament',
                __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_a05e96774c14aa4f0766")
              ),
              __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_5050e03c4a9e0d45b12f")
            ]
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_ba6098e703ccd731d2be")
          )
        ],

        ['simon_admitted'],
        [...CHALLENGE_REQUIREMENTS]
      ),

      topic(
        'simon_event',
        ['simon_pike', 'board_tournament'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8d698f06ec89bcf0d02a")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_95df72b5037a3593588e"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_45f264427a5d54bf0ab3")
          )
        ],

        [],
        ['simon_admitted']
      )
    ]
  ),

  contact(
    'alibi_evelyn_shaw',
    '431',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_fae07f060ef6b531b0fc"),
    'evelyn_phone',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_9c3163c4d5a56fca9168"),

    [
      topic(
        'evelyn_intro',
        ['evelyn_shaw'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cc7e338d8e85f5cb2708")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3719bdc987cd0f25dcff")
          )
        ]
      ),

      topic(
        'evelyn_confront',
        ['evelyn_shaw', 'sample_code'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_18354efb32dcb18dc5dd")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c66e1bee0fd5193a5964")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_f693eba06ad2594e170c"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_bcf5a867d290ad09b5b8")
          )
        ],

        ['evelyn_confronted'],
        [...CHALLENGE_REQUIREMENTS]
      ),

      topic(
        'evelyn_slip',
        ['records_breakin'],

        evelynSlip(
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_4dafd43da01ff692746a")
        ),

        ['evelyn_slip'],
        ['evelyn_confronted']
      ),

      topic(
        'evelyn_slip_named',
        ['evelyn_shaw', 'records_breakin'],

        evelynSlip(
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_661fca908416f5f79de0")
        ),

        ['evelyn_slip'],
        ['evelyn_confronted']
      )
    ]
  ),

  contact(
    'alibi_morrow_liaison',
    '432',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_49598df9e0315735a468"),
    'company_phone',
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
    __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_cc09ae2bf6df6634c98e"),

    [
      topic(
        'morrow_incident',
        ['records_breakin'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_adfd19ca687afd47e8bf")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_68bd390bb00a55b047ae")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_204e6df28037c7971213")
          )
        ],

        ['company_incident_verified']
      ),

      topic(
        'morrow_general',
        ['morrow_records'],

        [
          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_48171e68d051dd145eb3")
          ),

          line(
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_3f7991714910557e69d8"),
            __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_c8b05607237732320047")
          )
        ]
      ),

      topic(
        'morrow_folder',
        ['blue_folder', 'records_breakin'],

        folderCheck(
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_6b88b21e29de25f6e2f9")
        ),

        ['folder_detail_verified'],
        ['evelyn_slip']
      ),

      topic(
        'morrow_folder_short',
        ['blue_folder'],

        folderCheck(
          __dialogueText("ui/pi-computer/AlibiInterviewData.js", "t_8c6f552857975cf236e3")
        ),

        ['folder_detail_verified'],
        ['evelyn_slip']
      )
    ]
  )
];