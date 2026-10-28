export const ALIBI_INTERVIEW_SEARCH = {
  "clouds": [
    {
      "id": "interviews",
      "title": "CONTACTS / REAL EVENINGS"
    },
    {
      "id": "verification",
      "title": "INDEPENDENT CHECKS"
    }
  ],
  "keywords": [
    {
      "id": "nora_phone",
      "label": "429",
      "cloudId": "interviews"
    },
    {
      "id": "simon_phone",
      "label": "430",
      "cloudId": "interviews"
    },
    {
      "id": "evelyn_phone",
      "label": "431",
      "cloudId": "interviews"
    },
    {
      "id": "company_phone",
      "label": "432",
      "cloudId": "interviews"
    },
    {
      "id": "pie_contest",
      "label": "Civic Pie Challenge",
      "cloudId": "interviews"
    },
    {
      "id": "board_tournament",
      "label": "Rook & Ruin Open",
      "cloudId": "interviews"
    },
    {
      "id": "nora_verified",
      "label": "Nora: continuous attendance",
      "cloudId": "verification"
    },
    {
      "id": "simon_verified",
      "label": "Simon: supervised match",
      "cloudId": "verification"
    },
    {
      "id": "morrow_records",
      "label": "Morrow Records",
      "cloudId": "verification"
    },
    {
      "id": "records_breakin",
      "label": "Tuesday break-in",
      "cloudId": "verification"
    },
    {
      "id": "blue_folder",
      "label": "blue folder",
      "cloudId": "verification"
    }
  ],
  "pages": [
    {
      "id": "nora_profile",
      "title": "Nora Bell | Public contact",
      "address": "www.communitycontacts.local/nora-bell",
      "brand": "COMMUNITY CONTACTS",
      "blocks": [
        [
          {
            "keywordId": "nora_bell"
          }
        ],
        [
          "Opt-in contact listing. Local volunteering and community events."
        ],
        [
          "Public contact email: nora.bell@post.local. Telephone: ",
          {
            "keywordId": "nora_phone"
          },
          "."
        ],
        [
          "Telephone published with the member’s permission. Please do not call about extended warranties."
        ]
      ],
      "links": [],
      "snippet": "Nora Bell — public contact details, matching nora.bell@post.local."
    },
    {
      "id": "simon_profile",
      "title": "Simon Pike | Club member directory",
      "address": "www.tabletopcircle.local/members/simon-pike",
      "brand": "TABLETOP CIRCLE",
      "blocks": [
        [
          {
            "keywordId": "simon_pike"
          }
        ],
        [
          "Member contact published by permission: simon.pike@post.local. Local telephone: ",
          {
            "keywordId": "simon_phone"
          },
          "."
        ],
        [
          "Available for club enquiries. Not available to explain why the rules are still on page one."
        ]
      ],
      "links": [],
      "snippet": "Simon Pike — opt-in club member contact."
    },
    {
      "id": "evelyn_profile",
      "title": "Evelyn Shaw | Morrow Records",
      "address": "www.morrowrecords.local/people/evelyn-shaw",
      "brand": "MORROW RECORDS",
      "blocks": [
        [
          {
            "keywordId": "evelyn_shaw"
          },
          " — accounts assistant at ",
          {
            "keywordId": "morrow_records"
          },
          "."
        ],
        [
          "Work enquiries: direct line ",
          {
            "keywordId": "evelyn_phone"
          },
          ". Listed alternative contact: evelyn.shaw@post.local."
        ],
        [
          "For company statements, please contact the designated records liaison."
        ]
      ],
      "links": [
        {
          "label": "Company notices",
          "pageId": "morrow_notice"
        },
        {
          "label": "Press contact",
          "pageId": "morrow_contact"
        }
      ],
      "snippet": "Evelyn Shaw — accounts assistant, staff contact listing."
    },
    {
      "id": "pie_results",
      "title": "Civic Pie Challenge | Tuesday evening results",
      "address": "www.civic-events.local/pie-challenge/tuesday",
      "brand": "CIVIC EVENTS OFFICE",
      "blocks": [
        [
          {
            "keywordId": "pie_contest"
          }
        ],
        [
          "Tuesday evening session: 19:00–21:15. Winner: ",
          {
            "keywordId": "nora_bell"
          },
          "."
        ],
        [
          "Signed stage record, head judge Mabel Crumb: Nora was on the supervised competition stage from check-in at 18:50 until the award at 21:15, including the 20:10–20:25 interval. No contestant breaks or exits were recorded for her."
        ],
        [
          {
            "keywordId": "nora_verified"
          },
          " — independent stage record, not a statement supplied by Nora."
        ],
        [
          "Winning total: seven slices. Her acceptance speech was postponed until swallowing became an option."
        ]
      ],
      "links": [],
      "snippet": "Official scores and signed stage attendance for the Tuesday evening competition."
    },
    {
      "id": "game_results",
      "title": "Rook & Ruin Open | Tuesday match records",
      "address": "www.tabletopcircle.local/events/rook-ruin/tuesday",
      "brand": "TABLETOP CIRCLE — OFFICIAL RESULTS",
      "blocks": [
        [
          {
            "keywordId": "board_tournament"
          }
        ],
        [
          "Tuesday session: 19:00–21:30. Player: ",
          {
            "keywordId": "simon_pike"
          },
          "."
        ],
        [
          "Referee’s signed match sheet: Simon remained seated at the supervised final table from 20:00 until 20:40. No substitute, break or departure was recorded."
        ],
        [
          {
            "keywordId": "simon_verified"
          },
          " — independent referee record covering 20:10–20:25."
        ],
        [
          "Final result: second place. His written objection to the dice finished first."
        ]
      ],
      "links": [],
      "snippet": "Referee-verified match times and tournament results."
    },
    {
      "id": "morrow_notice",
      "title": "Tuesday incident statement | Morrow Records",
      "address": "www.morrowrecords.local/notices/tuesday",
      "brand": "MORROW RECORDS",
      "blocks": [
        [
          {
            "keywordId": "morrow_records"
          },
          " — public statement"
        ],
        [
          "A ",
          {
            "keywordId": "records_breakin"
          },
          " occurred in our secure office between 20:10 and 20:25. The interval is established from the access alarm and responding staff."
        ],
        [
          "An item from the records office was taken. Its physical description and contents have not been included in our public statement."
        ],
        [
          "The investigation has not identified a culprit. Employment here does not itself establish involvement."
        ]
      ],
      "links": [
        {
          "label": "Records liaison",
          "pageId": "morrow_contact"
        },
        {
          "label": "Staff contact",
          "pageId": "evelyn_profile"
        }
      ],
      "snippet": "Public incident statement: secure-office intrusion, Tuesday, 20:10–20:25."
    },
    {
      "id": "morrow_contact",
      "title": "Records liaison | Morrow Records",
      "address": "www.morrowrecords.local/contact/records",
      "brand": "MORROW RECORDS",
      "blocks": [
        [
          {
            "keywordId": "morrow_records"
          },
          " — records liaison"
        ],
        [
          "Designated contact for information about the ",
          {
            "keywordId": "records_breakin"
          },
          ": ",
          {
            "keywordId": "company_phone"
          },
          "."
        ],
        [
          "Please distinguish something you observed from something you inferred. The paperwork is already dramatic enough."
        ]
      ],
      "links": [
        {
          "label": "Incident statement",
          "pageId": "morrow_notice"
        }
      ],
      "snippet": "Company-authorised liaison for the Tuesday incident."
    }
  ],
  "recipes": [
    {
      "terms": [
        "nora_bell"
      ],
      "pageIds": [
        "nora_profile"
      ]
    },
    {
      "terms": [
        "simon_pike"
      ],
      "pageIds": [
        "simon_profile"
      ]
    },
    {
      "terms": [
        "evelyn_shaw"
      ],
      "pageIds": [
        "evelyn_profile"
      ]
    },
    {
      "terms": [
        "pie_contest"
      ],
      "pageIds": [
        "pie_results"
      ]
    },
    {
      "terms": [
        "nora_bell",
        "pie_contest"
      ],
      "pageIds": [
        "pie_results"
      ]
    },
    {
      "terms": [
        "board_tournament"
      ],
      "pageIds": [
        "game_results"
      ]
    },
    {
      "terms": [
        "simon_pike",
        "board_tournament"
      ],
      "pageIds": [
        "game_results"
      ]
    },
    {
      "terms": [
        "morrow_records"
      ],
      "pageIds": [
        "morrow_notice",
        "morrow_contact"
      ]
    },
    {
      "terms": [
        "evelyn_shaw",
        "morrow_records"
      ],
      "pageIds": [
        "evelyn_profile",
        "morrow_notice"
      ]
    },
    {
      "terms": [
        "records_breakin"
      ],
      "pageIds": [
        "morrow_notice"
      ]
    },
    {
      "terms": [
        "morrow_records",
        "records_breakin"
      ],
      "pageIds": [
        "morrow_notice",
        "morrow_contact"
      ]
    }
  ]
};
export const ALIBI_INTERVIEW_CONTACTS = [
  {
    "id": "alibi_nora_bell",
    "caseId": "borrowed_alibi",
    "number": "429",
    "name": "Nora Bell — Enquiries",
    "requiresKeyword": "nora_phone",
    "choicePrompt": "Choose one or two details from your notes. A statement is not the same as independent confirmation.",
    "greeting": [
      {
        "speaker": "Nora Bell",
        "text": "Nora Bell speaking. Is this about Tuesday? Please say it is about Thursday."
      }
    ],
    "fallback": [
      {
        "speaker": "Nora Bell",
        "text": "If you have something specific about my dinner account, give me my name and the reference from the sample. Otherwise I can only tell you what I have already said."
      }
    ],
    "topics": [
      {
        "id": "nora_intro",
        "terms": [
          "nora_bell"
        ],
        "requiresFlags": [],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "You asked Arthur Finch to confirm a Tuesday dinner. What happened?"
          },
          {
            "speaker": "Nora Bell",
            "text": "I sent the message. I would rather not discuss my evening without knowing why you are asking."
          }
        ]
      },
      {
        "id": "nora_confront",
        "terms": [
          "nora_bell",
          "sample_code"
        ],
        "requiresFlags": [
          "club_sample_received",
          "no_hot_food",
          "receipt_received"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "nora_admitted"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "Your dinner story matches the club’s TUE-DC-02 sample. Arthur ate alone, and the restaurant served no hot food. Why did you send it?"
          },
          {
            "speaker": "Nora Bell",
            "text": "All right. I bought that story. Arthur was never with me. I am sorry I involved him."
          },
          {
            "speaker": "Nora Bell",
            "text": "I was at the Civic Pie Challenge. I won. My family thought I had finally embraced sensible portions.",
            "fragments": [
              "I was at the ",
              {
                "keywordId": "pie_contest",
                "text": "Civic Pie Challenge"
              },
              ". I won. My family thought I had finally embraced sensible portions."
            ]
          },
          {
            "speaker": "Nora Bell",
            "text": "I wanted to miss my sister’s family dinner without explaining the seven slices of pie. The event office publishes the results and stage record. You can check them independently."
          }
        ]
      },
      {
        "id": "nora_event",
        "terms": [
          "nora_bell",
          "pie_contest"
        ],
        "requiresFlags": [
          "nora_admitted"
        ],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "Where can I check your competition attendance?"
          },
          {
            "speaker": "Nora Bell",
            "text": "Use the event office’s official Tuesday results. The judge kept a continuous stage record. Please do not use my own story as proof."
          }
        ]
      }
    ]
  },
  {
    "id": "alibi_simon_pike",
    "caseId": "borrowed_alibi",
    "number": "430",
    "name": "Simon Pike — Club contact",
    "requiresKeyword": "simon_phone",
    "choicePrompt": "Choose one or two details from your notes. A statement is not the same as independent confirmation.",
    "greeting": [
      {
        "speaker": "Simon Pike",
        "text": "Simon Pike. If you are selling a strategy guide, I already own three and understand none."
      }
    ],
    "fallback": [
      {
        "speaker": "Simon Pike",
        "text": "If you are challenging the dinner account, give me my name and the reference from your sample. I cannot guess what evidence you have."
      }
    ],
    "topics": [
      {
        "id": "simon_intro",
        "terms": [
          "simon_pike"
        ],
        "requiresFlags": [],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "You asked Arthur Finch to confirm a Tuesday dinner. Why?"
          },
          {
            "speaker": "Simon Pike",
            "text": "I needed to account for my evening. I thought the message would be enough."
          }
        ]
      },
      {
        "id": "simon_confront",
        "terms": [
          "simon_pike",
          "sample_code"
        ],
        "requiresFlags": [
          "club_sample_received",
          "no_hot_food",
          "receipt_received"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "simon_admitted"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "Your account matches TUE-DC-02. Arthur’s receipt and the restaurant’s service record contradict it. What were you doing?"
          },
          {
            "speaker": "Simon Pike",
            "text": "I bought the account to avoid a compulsory company dinner. Arthur did not agree to any of this."
          },
          {
            "speaker": "Simon Pike",
            "text": "I was playing in the Rook & Ruin Open. Calling it a serious strategic problem was technically accurate.",
            "fragments": [
              "I was playing in the ",
              {
                "keywordId": "board_tournament",
                "text": "Rook & Ruin Open"
              },
              ". Calling it a serious strategic problem was technically accurate."
            ]
          },
          {
            "speaker": "Simon Pike",
            "text": "The club publishes official results and the referee’s timed match sheet. I was at the final table. Check the referee’s record rather than taking my word for it."
          }
        ]
      },
      {
        "id": "simon_event",
        "terms": [
          "simon_pike",
          "board_tournament"
        ],
        "requiresFlags": [
          "simon_admitted"
        ],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "Who can verify the match times?"
          },
          {
            "speaker": "Simon Pike",
            "text": "The event referee signed the official match sheet. It records the final from 20:00 until 20:40 without a departure or substitute."
          }
        ]
      }
    ]
  },
  {
    "id": "alibi_evelyn_shaw",
    "caseId": "borrowed_alibi",
    "number": "431",
    "name": "Evelyn Shaw — Work enquiries",
    "requiresKeyword": "evelyn_phone",
    "choicePrompt": "Choose one or two details from your notes. A statement is not the same as independent confirmation.",
    "greeting": [
      {
        "speaker": "Evelyn Shaw",
        "text": "Evelyn Shaw. This had better be a work enquiry."
      }
    ],
    "fallback": [
      {
        "speaker": "Evelyn Shaw",
        "text": "If this is about my dinner account, identify the sample you are relying on. If you have already done that, state the incident you want to discuss."
      }
    ],
    "topics": [
      {
        "id": "evelyn_intro",
        "terms": [
          "evelyn_shaw"
        ],
        "requiresFlags": [],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "You asked Arthur Finch to confirm dinner. Can you explain?"
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "I sent a perfectly clear account. I do not see why it needs explaining."
          }
        ]
      },
      {
        "id": "evelyn_confront",
        "terms": [
          "evelyn_shaw",
          "sample_code"
        ],
        "requiresFlags": [
          "club_sample_received",
          "no_hot_food",
          "receipt_received"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "evelyn_confronted"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "The TUE-DC-02 sample repeats your dinner story. Arthur’s receipt contradicts it, and no soup was served. Do you still stand by your account?"
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "A template proves only that someone copied something. I stand by my account."
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "If you want to discuss my employer’s incident, say so. I do not intend to spend all evening defending soup."
          }
        ]
      },
      {
        "id": "evelyn_slip",
        "terms": [
          "records_breakin"
        ],
        "requiresFlags": [
          "evelyn_confronted"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "evelyn_slip"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "The company reported a Tuesday break-in and a missing item. What do you know about that incident?"
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "That blue folder was empty anyway. You are making a great deal out of nothing.",
            "fragments": [
              "That ",
              {
                "keywordId": "blue_folder",
                "text": "blue folder"
              },
              " was empty anyway. You are making a great deal out of nothing."
            ]
          },
          {
            "speaker": "You",
            "text": "I said an item was taken. I did not describe a folder or its colour."
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "Then perhaps you should speak to the company. I have nothing else to add."
          }
        ]
      },
      {
        "id": "evelyn_slip_named",
        "terms": [
          "evelyn_shaw",
          "records_breakin"
        ],
        "requiresFlags": [
          "evelyn_confronted"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "evelyn_slip"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "What can you tell me about the Tuesday break-in at your employer?"
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "That blue folder was empty anyway. You are making a great deal out of nothing.",
            "fragments": [
              "That ",
              {
                "keywordId": "blue_folder",
                "text": "blue folder"
              },
              " was empty anyway. You are making a great deal out of nothing."
            ]
          },
          {
            "speaker": "You",
            "text": "I said an item was taken. I did not describe a folder or its colour."
          },
          {
            "speaker": "Evelyn Shaw",
            "text": "Then perhaps you should speak to the company. I have nothing else to add."
          }
        ]
      }
    ]
  },
  {
    "id": "alibi_morrow_liaison",
    "caseId": "borrowed_alibi",
    "number": "432",
    "name": "Morrow Records — Records liaison",
    "requiresKeyword": "company_phone",
    "choicePrompt": "Choose one or two details from your notes. A statement is not the same as independent confirmation.",
    "greeting": [
      {
        "speaker": "Records liaison",
        "text": "Morrow Records, designated records liaison. I can confirm the public incident statement and check information you wish to provide."
      }
    ],
    "fallback": [
      {
        "speaker": "Records liaison",
        "text": "I can discuss the Tuesday break-in. If a witness volunteered a physical description, give me that detail so I can check it with the records manager."
      }
    ],
    "topics": [
      {
        "id": "morrow_incident",
        "terms": [
          "records_breakin"
        ],
        "requiresFlags": [],
        "grantKeywords": [],
        "grantFlags": [
          "company_incident_verified"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "Can you confirm the timing and what was published?"
          },
          {
            "speaker": "Records liaison",
            "text": "The secure office was entered between 20:10 and 20:25 on Tuesday. An item was taken. Its physical description and contents were withheld from the public statement."
          },
          {
            "speaker": "Records liaison",
            "text": "We have not identified the culprit. Neither an employee’s access nor an inaccurate dinner account proves theft."
          }
        ]
      },
      {
        "id": "morrow_general",
        "terms": [
          "morrow_records"
        ],
        "requiresFlags": [],
        "grantKeywords": [],
        "grantFlags": [],
        "lines": [
          {
            "speaker": "You",
            "text": "Who handles information about the incident?"
          },
          {
            "speaker": "Records liaison",
            "text": "This office. Please give me the incident or a specific detail you want checked."
          }
        ]
      },
      {
        "id": "morrow_folder",
        "terms": [
          "blue_folder",
          "records_breakin"
        ],
        "requiresFlags": [
          "evelyn_slip"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "folder_detail_verified"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "While discussing the Tuesday break-in, Evelyn volunteered the words “blue folder” and said it was empty. I had not described the item. Can you check that detail?"
          },
          {
            "speaker": "Records liaison",
            "text": "I have checked with the records manager. That physical description matches the missing item. It was not in our public statement, and Evelyn was not on the internal notification list."
          },
          {
            "speaker": "Records liaison",
            "text": "Please preserve her exact words and where they came from. This is a discrepancy worth investigating, not proof that she stole it. We cannot rule out an undisclosed source."
          }
        ]
      },
      {
        "id": "morrow_folder_short",
        "terms": [
          "blue_folder"
        ],
        "requiresFlags": [
          "evelyn_slip"
        ],
        "grantKeywords": [],
        "grantFlags": [
          "folder_detail_verified"
        ],
        "lines": [
          {
            "speaker": "You",
            "text": "Evelyn described a blue folder without my naming the missing item. Can you check her exact words against your records?"
          },
          {
            "speaker": "Records liaison",
            "text": "I have checked with the records manager. That physical description matches the missing item. It was not in our public statement, and Evelyn was not on the internal notification list."
          },
          {
            "speaker": "Records liaison",
            "text": "Please preserve her exact words and where they came from. This is a discrepancy worth investigating, not proof that she stole it. We cannot rule out an undisclosed source."
          }
        ]
      }
    ]
  }
];
