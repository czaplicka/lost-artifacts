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

  choicePrompt: 'What would you like to ask?',

  greeting: [
    line(speaker, greeting)
  ],

  fallback: [
    line(
      speaker,
      'Could you be more specific?'
    )
  ],

  topics
});

export const ALIBI_INTERVIEW_SEARCH = {
  clouds: [
    {
      id: 'interviews',
      title: 'CONTACTS / REAL EVENINGS'
    },
    {
      id: 'verification',
      title: 'INDEPENDENT CHECKS'
    }
  ],

  keywords: [
    {
      id: 'nora_phone',
      label: '429',
      cloudId: 'interviews'
    },
    {
      id: 'simon_phone',
      label: '430',
      cloudId: 'interviews'
    },
    {
      id: 'evelyn_phone',
      label: '431',
      cloudId: 'interviews'
    },
    {
      id: 'company_phone',
      label: '432',
      cloudId: 'interviews'
    },
    {
      id: 'pie_contest',
      label: 'Civic Pie Challenge',
      cloudId: 'interviews'
    },
    {
      id: 'board_tournament',
      label: 'Rook & Ruin Open',
      cloudId: 'interviews'
    },
    {
      id: 'nora_verified',
      label: 'Stage attendance record',
      cloudId: 'verification'
    },
    {
      id: 'simon_verified',
      label: 'Signed match sheet',
      cloudId: 'verification'
    },
    {
      id: 'morrow_records',
      label: 'Morrow Records',
      cloudId: 'verification'
    },
    {
      id: 'records_breakin',
      label: 'Tuesday break-in',
      cloudId: 'verification'
    },
    {
      id: 'blue_folder',
      label: 'blue folder',
      cloudId: 'verification'
    }
  ],

  pages: [
    {
      id: 'nora_profile',
      title: 'Nora Bell | Public contact',
      address:
        'www.communitycontacts.local/nora-bell',
      brand: 'COMMUNITY CONTACTS',

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word('nora_bell')
        ],
        [
          'Local volunteering and community events.'
        ],
        [
          'Public contact email: nora.bell@post.local. Telephone: ',
          word('nora_phone'),
          '.'
        ],
        [
          'Listed with the member’s permission. Please do not call about extended warranties.'
        ]
      ],

      links: [],

      snippet:
        'Nora Bell — community events and public contact details.'
    },

    {
      id: 'simon_profile',
      title: 'Simon Pike | Club member directory',
      address:
        'www.tabletopcircle.local/members/simon-pike',
      brand: 'TABLETOP CIRCLE',

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word('simon_pike')
        ],
        [
          'Member contact: simon.pike@post.local. Local telephone: ',
          word('simon_phone'),
          '.'
        ],
        [
          'Available for club enquiries. Not available to explain why the rules are still on page one.'
        ]
      ],

      links: [],

      snippet:
        'Simon Pike — club member contact, published by permission.'
    },

    {
      id: 'evelyn_profile',
      title: 'Evelyn Shaw | Morrow Records',
      address:
        'www.morrowrecords.local/people/evelyn-shaw',
      brand: 'MORROW RECORDS',

      template: 'directory',
      theme: 'directory',

      blocks: [
        [
          word('evelyn_shaw'),
          ' — accounts assistant at ',
          word('morrow_records'),
          '.'
        ],
        [
          'Work enquiries: direct line ',
          word('evelyn_phone'),
          '. Listed alternative contact: evelyn.shaw@post.local.'
        ],
        [
          'Company statements are handled by the records liaison.'
        ]
      ],

      links: [
        {
          label: 'Company notices',
          pageId: 'morrow_notice'
        },
        {
          label: 'Records liaison',
          pageId: 'morrow_contact'
        }
      ],

      snippet:
        'Evelyn Shaw — accounts assistant, staff contact listing.'
    },

    {
      id: 'pie_results',
      title:
        'Civic Pie Challenge | Tuesday evening results',
      address:
        'www.civic-events.local/pie-challenge/tuesday',
      brand: 'CIVIC EVENTS OFFICE',

      template: 'organisation',
      theme: 'organisation',

      blocks: [
        [
          word('pie_contest')
        ],
        [
          'Tuesday evening session: 19:00–21:15. Winner: ',
          word('nora_bell'),
          '.'
        ],
        [
          word('nora_verified'),
          '\nHead judge: Mabel Crumb.' +
          '\nCheck-in: 18:50. Award presentation: 21:15.' +
          '\nNora remained on the supervised competition stage throughout. No breaks or exits were recorded.'
        ],
        [
          'Winning total: seven slices. Her acceptance speech was postponed until swallowing became an option.'
        ]
      ],

      links: [],

      snippet:
        'Tuesday results and the head judge’s stage record.'
    },

    {
      id: 'game_results',
      title:
        'Rook & Ruin Open | Tuesday match records',
      address:
        'www.tabletopcircle.local/events/rook-ruin/tuesday',
      brand:
        'TABLETOP CIRCLE — OFFICIAL RESULTS',

      template: 'association',
      theme: 'organisation',

      blocks: [
        [
          word('board_tournament')
        ],
        [
          'Tuesday session: 19:00–21:30. Player: ',
          word('simon_pike'),
          '.'
        ],
        [
          word('simon_verified'),
          '\nSupervised final table: 20:00–20:40.' +
          '\nSimon remained seated throughout. No substitute, break or departure was recorded.' +
          '\nSigned by the event referee.'
        ],
        [
          'Final result: second place. His written objection to the dice finished first.'
        ]
      ],

      links: [],

      snippet:
        'Tuesday tournament results and the referee’s signed match sheet.'
    },

    {
      id: 'morrow_notice',
      title:
        'Tuesday incident statement | Morrow Records',
      address:
        'www.morrowrecords.local/notices/tuesday',
      brand: 'MORROW RECORDS',

      template: 'business',
      theme: 'business',

      blocks: [
        [
          word('morrow_records'),
          ' — public statement'
        ],
        [
          'A ',
          word('records_breakin'),
          ' occurred in our secure office between 20:10 and 20:25. The interval is established from the access alarm and responding staff.'
        ],
        [
          'An item was taken from the records office. Its description and contents are being withheld.'
        ],
        [
          'Enquiries are ongoing. No culprit has been identified.'
        ]
      ],

      links: [
        {
          label: 'Records liaison',
          pageId: 'morrow_contact'
        },
        {
          label: 'Staff contact',
          pageId: 'evelyn_profile'
        }
      ],

      snippet:
        'Secure-office intrusion on Tuesday, 20:10–20:25.'
    },

    {
      id: 'morrow_contact',
      title:
        'Records liaison | Morrow Records',
      address:
        'www.morrowrecords.local/contact/records',
      brand: 'MORROW RECORDS',

      template: 'business',
      theme: 'business',

      blocks: [
        [
          word('morrow_records'),
          ' — records liaison'
        ],
        [
          'Enquiries concerning the ',
          word('records_breakin'),
          ': ',
          word('company_phone'),
          '.'
        ],
        [
          'Please have the relevant correspondence to hand. Our hold music has already caused enough complaints.'
        ]
      ],

      links: [
        {
          label: 'Incident statement',
          pageId: 'morrow_notice'
        }
      ],

      snippet:
        'Company contact for the Tuesday incident.'
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
      'You',
      question
    ),

    line(
      'Evelyn Shaw',
      'That blue folder was empty anyway. You are making a great deal out of nothing.',
      [
        'That ',
        word('blue_folder', 'blue folder'),
        ' was empty anyway. You are making a great deal out of nothing.'
      ]
    ),

    line(
      'You',
      'Where did you hear that?'
    ),

    line(
      'Evelyn Shaw',
      'Speak to the company. I have nothing else to add.'
    )
  ];
}

function folderCheck(question) {
  return [
    line(
      'You',
      question
    ),

    line(
      'Records liaison',
      'The records manager confirms that the missing item was a blue folder. Its description was not in our public statement. Evelyn was not on the internal notification list.'
    ),

    line(
      'Records liaison',
      'Please send us a copy of the conversation. We will need her exact words.'
    )
  ];
}

export const ALIBI_INTERVIEW_CONTACTS = [
  contact(
    'alibi_nora_bell',
    '429',
    'Nora Bell — Enquiries',
    'nora_phone',
    'Nora Bell',
    'Nora Bell speaking. Is this about Tuesday? Please say it is about Thursday.',

    [
      topic(
        'nora_intro',
        ['nora_bell'],

        [
          line(
            'You',
            'You asked Arthur Finch to confirm a Tuesday dinner. What happened?'
          ),
          line(
            'Nora Bell',
            'I sent the message. I would rather not discuss my evening without knowing why you are asking.'
          )
        ]
      ),

      topic(
        'nora_confront',
        ['nora_bell', 'sample_code'],

        [
          line(
            'You',
            'Your dinner story matches the club’s TUE-DC-02 sample. Arthur’s receipt and the Tuesday kitchen closure contradict it. Why did you send it?'
          ),

          line(
            'Nora Bell',
            'All right. I bought that story. Arthur was never with me. I am sorry I involved him.'
          ),

          line(
            'Nora Bell',
            'I was at the Civic Pie Challenge. I won. My family thought I had finally embraced sensible portions.',

            [
              'I was at the ',
              word(
                'pie_contest',
                'Civic Pie Challenge'
              ),
              '. I won. My family thought I had finally embraced sensible portions.'
            ]
          ),

          line(
            'Nora Bell',
            'I wanted to miss my sister’s family dinner without explaining the seven slices of pie.'
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
            'You',
            'Where are the competition results published?'
          ),

          line(
            'Nora Bell',
            'On the civic events website. Mabel insisted on putting the stage register up as well. She runs a very serious pie competition.'
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
    'Simon Pike — Club contact',
    'simon_phone',
    'Simon Pike',
    'Simon Pike. If you are selling a strategy guide, I already own three and understand none.',

    [
      topic(
        'simon_intro',
        ['simon_pike'],

        [
          line(
            'You',
            'You asked Arthur Finch to confirm a Tuesday dinner. Why?'
          ),

          line(
            'Simon Pike',
            'I needed to account for my evening. I thought the message would be enough.'
          )
        ]
      ),

      topic(
        'simon_confront',
        ['simon_pike', 'sample_code'],

        [
          line(
            'You',
            'Your account matches TUE-DC-02. Arthur’s receipt and the restaurant’s service record contradict it. What were you doing?'
          ),

          line(
            'Simon Pike',
            'I bought the account to avoid a compulsory company dinner. Arthur did not agree to any of this.'
          ),

          line(
            'Simon Pike',
            'I was playing in the Rook & Ruin Open. Calling it a serious strategic problem was technically accurate.',

            [
              'I was playing in the ',
              word(
                'board_tournament',
                'Rook & Ruin Open'
              ),
              '. Calling it a serious strategic problem was technically accurate.'
            ]
          ),

          line(
            'Simon Pike',
            'I made the final table. Lost. My objection to the dice was apparently not a recognised appeal.'
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
            'You',
            'Does the club publish the match records?'
          ),

          line(
            'Simon Pike',
            'Yes. The referee signed the final-table sheet. It has the times and everything. More paperwork than my last performance review.'
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
    'Evelyn Shaw — Work enquiries',
    'evelyn_phone',
    'Evelyn Shaw',
    'Evelyn Shaw. This had better be a work enquiry.',

    [
      topic(
        'evelyn_intro',
        ['evelyn_shaw'],

        [
          line(
            'You',
            'You asked Arthur Finch to confirm dinner. Can you explain?'
          ),

          line(
            'Evelyn Shaw',
            'I sent a perfectly clear account. I do not see why it needs explaining.'
          )
        ]
      ),

      topic(
        'evelyn_confront',
        ['evelyn_shaw', 'sample_code'],

        [
          line(
            'You',
            'Your dinner account matches TUE-DC-02. Arthur’s receipt contradicts it, and no soup was served that evening. Do you stand by it?'
          ),

          line(
            'Evelyn Shaw',
            'I stand by what I sent.'
          ),

          line(
            'Evelyn Shaw',
            'I do not intend to spend all evening defending soup.'
          )
        ],

        ['evelyn_confronted'],
        [...CHALLENGE_REQUIREMENTS]
      ),

      topic(
        'evelyn_slip',
        ['records_breakin'],

        evelynSlip(
          'What do you know about the Tuesday break-in at Morrow Records?'
        ),

        ['evelyn_slip'],
        ['evelyn_confronted']
      ),

      topic(
        'evelyn_slip_named',
        ['evelyn_shaw', 'records_breakin'],

        evelynSlip(
          'What can you tell me about the Tuesday break-in at your employer?'
        ),

        ['evelyn_slip'],
        ['evelyn_confronted']
      )
    ]
  ),

  contact(
    'alibi_morrow_liaison',
    '432',
    'Morrow Records — Records liaison',
    'company_phone',
    'Records liaison',
    'Morrow Records, records liaison. How can I help?',

    [
      topic(
        'morrow_incident',
        ['records_breakin'],

        [
          line(
            'You',
            'Can you confirm the timing of the break-in?'
          ),

          line(
            'Records liaison',
            'The secure office was entered between 20:10 and 20:25 on Tuesday. The access alarm and responding staff establish that interval.'
          ),

          line(
            'Records liaison',
            'An item was taken. Its description and contents were withheld from the public statement. No culprit has been identified.'
          )
        ],

        ['company_incident_verified']
      ),

      topic(
        'morrow_general',
        ['morrow_records'],

        [
          line(
            'You',
            'Who handles information about the incident?'
          ),

          line(
            'Records liaison',
            'This office. What would you like to ask?'
          )
        ]
      ),

      topic(
        'morrow_folder',
        ['blue_folder', 'records_breakin'],

        folderCheck(
          'Evelyn mentioned a blue folder when I asked about the break-in. Can you check whether that matches the missing item?'
        ),

        ['folder_detail_verified'],
        ['evelyn_slip']
      ),

      topic(
        'morrow_folder_short',
        ['blue_folder'],

        folderCheck(
          'Evelyn described a blue folder. Was that the missing item, and had the description been circulated?'
        ),

        ['folder_detail_verified'],
        ['evelyn_slip']
      )
    ]
  )
];