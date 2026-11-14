export const EXAMINATION_PROFILES = {
  security_system_blueprint: {
    title: 'DOCUMENT EXAMINATION',
    question: 'Which procedure preserves the original document?',

    methods: [
      {
        label: 'Scan and inspect the printed layout',
        correct: true
      },
      {
        label: 'Draw the suspected escape route on the original',
        correct: false
      },
      {
        label: 'Test the paper with the office coffee',
        correct: false
      }
    ],

    observation:
      'The printed layout includes a guard-dog kennel and a smoking room.',

    limitation:
      'The drawing alone does not establish the current security layout.',

    joke:
      'The smoking room has outlived at least three security consultants.',

    interpretations: [
      'The document may describe an older version of the site.',
      'Every camera shown here must still be operational.',
      'The thief definitely followed this exact drawing.'
    ]
  },

  broken_glass: {
    title: 'SURFACE EXAMINATION',
    question: 'How should the visible surface mark be examined?',

    methods: [
      {
        label: 'Photograph and magnify the marked shard',
        correct: true
      },
      {
        label: 'Wipe the shard clean before looking at it',
        correct: false
      },
      {
        label: 'Fit the shard into the nearest window by force',
        correct: false
      }
    ],

    observation:
      'One of the glass fragments has a visible lipstick mark.',

    limitation:
      'This examination does not identify the person or date the mark.',

    joke:
      'The glass has declined to discuss its personal life.',

    interpretations: [
      'The mark provides a detail to compare with other evidence.',
      'The lipstick proves that the thief is a woman.',
      'The fragment must come from the artifact display case.'
    ]
  },

  art_history_book: {
    title: 'PAGE AND INSERT EXAMINATION',
    question: 'How should the loose inserts be documented?',

    methods: [
      {
        label: 'Photograph their positions before moving them',
        correct: true
      },
      {
        label: 'Shake everything out and sort it later',
        correct: false
      },
      {
        label: 'Remove all bookmarks to make the book look tidy',
        correct: false
      }
    ],

    observation:
      'Ticket stubs mark several pages. A bored smiley face is also visible.',

    limitation:
      'The bookmarks alone do not identify the reader or their purpose.',

    joke:
      'Someone studied art history. Enthusiasm remains unconfirmed.',

    interpretations: [
      'The marked pages could be compared with the stolen artifact.',
      'The owner of this book must be the thief.',
      'The smiley face is a confirmed criminal signature.'
    ]
  },

  origami_crane_note: {
    title: 'FOLDED DOCUMENT EXAMINATION',
    question: 'How should the concealed writing be accessed?',

    methods: [
      {
        label: 'Document the folds, then carefully unfold the paper',
        correct: true
      },
      {
        label: 'Tear through the centre to save time',
        correct: false
      },
      {
        label: 'Soak the paper until the folds disappear',
        correct: false
      }
    ],

    observation:
      'The unfolded note reads: "We need to talk."',

    limitation:
      'No sender, recipient or meeting time is established by those words.',

    joke:
      'Folding it into a bird has not made the conversation less alarming.',

    interpretations: [
      'The note may concern a meeting, but its participants are unknown.',
      'The note proves that a guard helped the thief.',
      'The message identifies the exact time of the theft.'
    ]
  }
};