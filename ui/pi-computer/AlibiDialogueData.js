import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ALIBI_SEARCH_CASE, ALIBI_PHONE_CONTACT, ALIBI_CLUB_CONTACT } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';

export const COPPER_EMAIL=__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b");
export const ALIBI_DIALOGUE_RULES=[
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_tuesday",
    "terms": [
      "tuesday"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c696a233beddc889f1c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_38140d0f8337fdf53de3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d29364229216e0b1820b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3a9d3c9b4172be6a7fea")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_soup",
    "terms": [
      "tuesday",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c9db6ba1d075e64ce479")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9eb73649feaf49aef9df")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_failure",
    "terms": [
      "kitchen_failure"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1e6f428fdcff5d3f4f47")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3764f7edc185a821f31b")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_wine",
    "terms": [
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f0cde5eaff00c142553b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_59abde49f987d42da8c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3fcd59944fac58bd9221")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ebfb9ac0cac60f2d3e55")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_arthur",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4fc9c56fa9671ac0ae43")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4ed7d24753cf1bcda960")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a17b5778439bf46d60a1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4642715d0607e84b724b")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_arthur_permission",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [
      "consent"
    ],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_568f204ca8983dcef87e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6894567f47476189e7a4")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt",
    "terms": [
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_088f1869b1092c1e25c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_161122ed1ab88f8f0165"),
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b02b601482a9cfed8729")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d8b6e98661bb245ddd4d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_edfd8bfb951fecc31645")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt_named",
    "terms": [
      "copper_spoon",
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_088f1869b1092c1e25c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_161122ed1ab88f8f0165"),
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b02b601482a9cfed8729")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d8b6e98661bb245ddd4d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_edfd8bfb951fecc31645")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_authorised",
    "terms": [
      "arthur_finch",
      "consent"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_088f1869b1092c1e25c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_161122ed1ab88f8f0165"),
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b02b601482a9cfed8729")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d8b6e98661bb245ddd4d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_edfd8bfb951fecc31645")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_consent",
    "terms": [
      "consent"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d0e13422117c1c1bcbfe")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_40319a14b182481ddb92"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6ae53db12980209bdfa8"),
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_fe97ffb9a7e320f42a36")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt_repeat",
    "terms": [
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [
      "copper_email"
    ],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_aad715c4afd57aaa8d12")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b740f6d44fd12aaa78e5"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_bb33dbdb2f216aee5a55"),
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_2e5a3b95759b31a1f6ca")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_record_received",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_0c93b1fcdca07a11de13")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_33ce7a741486363526a1")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_request_record",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_088f1869b1092c1e25c3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_161122ed1ab88f8f0165"),
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdea600ae0c10db4b42b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b02b601482a9cfed8729")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d8b6e98661bb245ddd4d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_edfd8bfb951fecc31645")
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_wrong_supplier",
    "terms": [
      "tuesday_package"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_26fc5ccb2b7a20b06e88")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_93597fb13a68d678983a")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_general",
    "terms": [
      "alibi_club"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8d26057952b57a2267ea")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8b235de37515304cf045")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_pitch",
    "terms": [
      "dinner_package"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "club_pitch_heard"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a54631501c02ec229405")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1056584b70d4a6434740"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_204476320ac565be366e"),
          {
            "keywordId": "respectable_witness",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_15e40dad60c34d938071")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_31dec9cae5a549eb073c")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9d0ab137fba1d3971473")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1a40a815fa4fb10aa630"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d46ba79bcd4a40efe525"),
          {
            "keywordId": "sample",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_61059a5e4686e0bf046b")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a819090cf4fb7f614d6f")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_early",
    "terms": [
      "sample"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "club_pitch_heard"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_de1d62c0946dfe8382bb")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6c68a4290084ebc2ac25")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample",
    "terms": [
      "sample"
    ],
    "requiresFlags": [
      "club_pitch_heard"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "club_sample_received"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_86de8c09f5326fde3095")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6ca5bb9899d2f16d0199")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9be2adbdb9849526e368")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b90619d6ec6c4cb6b72f")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_repeat",
    "terms": [
      "sample"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4383376e3ddf5b025472")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7d11a4228c1754301718")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named_early",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "club_pitch_heard"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_de1d62c0946dfe8382bb")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6c68a4290084ebc2ac25")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [
      "club_pitch_heard"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "club_sample_received"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_86de8c09f5326fde3095")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6ca5bb9899d2f16d0199")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9be2adbdb9849526e368")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b90619d6ec6c4cb6b72f")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named_repeat",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4383376e3ddf5b025472")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7d11a4228c1754301718")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_footer",
    "terms": [
      "tuesday_package",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f94dc1c969b87595b73e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_eb58644ceebb0de6e475")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_witness",
    "terms": [
      "respectable_witness"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7d86fa77d26182b4ad7b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_65f1ec0c1e44e0cb1a94")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_arthur",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_db3df735e5ac19e51d3c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3114c84de8c1c3dc8cc3")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_evelyn",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_db3df735e5ac19e51d3c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3114c84de8c1c3dc8cc3")
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_soup",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_bd1fdc55d2a68c091214")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a2142c00a7dd206c5a2c")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_intro",
    "terms": [
      "nora_bell"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_41c2d482ec1ee6b45f2b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6d5e5e7e9f24597da1a6")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b7e888cff24076bf0f94")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_31cbdacf923b2b7ce1f8")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_soup",
    "terms": [
      "nora_bell",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_df9cf59df89bdc8bb002")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e160fc94343afb11ad4c")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_footer",
    "terms": [
      "nora_bell",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08947c8ffbf0bfa8be82")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_528844fcd2078ca9a73f")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_receipt",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c6567c9d4e67b0759d74")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1a407d67b34df416cc9e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_36d21b512ae771c1e924")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_81c138f570a63bcc3f9a")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_service",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_818ba9d5e41df86125e8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e17d8c67768c9370f26f")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_sample",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4d0911011a6f4bfb96f8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a81b9ef4d12835b1537b")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_confront",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "nora_admitted"
    ],
    "grantFlags": [
      "nora_admitted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9a2196d2c67532867971")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ac7b76517530bde63705")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_62051ad5594a82661dd6")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4d0213de17999a6e3d3c"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9d37314fdda0ae496d21"),
          {
            "keywordId": "pie_contest",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5b3d2434d90ebb6f24e3")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3b5ec5cc0cd6f347c356")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_confront_repeat",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 100,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3a1bbaf691b1db5a031b"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c1cb13b9a2692efd086b"),
          {
            "keywordId": "pie_contest",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5b3d2434d90ebb6f24e3")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7c549175fb5ef4e91e78")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6cd5461e6611dc9b5bc0")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9326e11a0ad6fc46bda9")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_44714bc7c8e9325a92a9")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_event",
    "terms": [
      "nora_bell",
      "pie_contest"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3a1bbaf691b1db5a031b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6cd5461e6611dc9b5bc0")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9326e11a0ad6fc46bda9")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_44714bc7c8e9325a92a9")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_repeat",
    "terms": [
      "nora_bell"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3a1bbaf691b1db5a031b"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c1cb13b9a2692efd086b"),
          {
            "keywordId": "pie_contest",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5b3d2434d90ebb6f24e3")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7c549175fb5ef4e91e78")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6cd5461e6611dc9b5bc0")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9326e11a0ad6fc46bda9")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_44714bc7c8e9325a92a9")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_private",
    "terms": [
      "nora_bell",
      "tuesday"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6f3a9210174fb400ad4f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_385d4fb2112bcd756472")
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_wine",
    "terms": [
      "nora_bell",
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_556956d2539bf1131087")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_bc9abb73028c85f480fc")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_intro",
    "terms": [
      "simon_pike"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_41c2d482ec1ee6b45f2b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6d5e5e7e9f24597da1a6")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b7e888cff24076bf0f94")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_31cbdacf923b2b7ce1f8")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_soup",
    "terms": [
      "simon_pike",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_df9cf59df89bdc8bb002")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e160fc94343afb11ad4c")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_footer",
    "terms": [
      "simon_pike",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08947c8ffbf0bfa8be82")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_528844fcd2078ca9a73f")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_receipt",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c6567c9d4e67b0759d74")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1a407d67b34df416cc9e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_36d21b512ae771c1e924")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_81c138f570a63bcc3f9a")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_service",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_818ba9d5e41df86125e8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e17d8c67768c9370f26f")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_sample",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4d0911011a6f4bfb96f8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a81b9ef4d12835b1537b")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_confront",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "simon_admitted"
    ],
    "grantFlags": [
      "simon_admitted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_757d9f3a97b63a32e166")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_47ac704fff62b82d0af5")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_466b7858d0e8d1a89f2e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_745c9e2d0046be74d97f"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e339037fef0f401172a3"),
          {
            "keywordId": "board_tournament",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a05e96774c14aa4f0766")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b51e93e9fa9eaba832a4")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_confront_repeat",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 100,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5fdc1ce65aca5bb56909")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8053961414897ef9e959")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_49d9702a0064c5849c39")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cb4cc6375f12c899f9ec")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_event",
    "terms": [
      "simon_pike",
      "board_tournament"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5fdc1ce65aca5bb56909")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8053961414897ef9e959")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_49d9702a0064c5849c39")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cb4cc6375f12c899f9ec")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_repeat",
    "terms": [
      "simon_pike"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5fdc1ce65aca5bb56909")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8053961414897ef9e959")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_49d9702a0064c5849c39")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cb4cc6375f12c899f9ec")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_private",
    "terms": [
      "simon_pike",
      "tuesday"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ac457d12142d32a330cb")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1c8483c8f328fd991300")
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_wine",
    "terms": [
      "simon_pike",
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_556956d2539bf1131087")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_bc9abb73028c85f480fc")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_intro",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7c1900b78bb83eba4e67")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_91c8ab5dd57637863517")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_soup",
    "terms": [
      "evelyn_shaw",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_38d27ab7da87545181b8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4d637acf02c5e7b111d3")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_footer",
    "terms": [
      "evelyn_shaw",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_02310f2f4c549f0975fd")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_67a6bedf16b3b2be3114")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_receipt",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_c6567c9d4e67b0759d74")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ad31cc4b39bdb4339119")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_service",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f7e3fc52b7c253430da4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_4106a234b08e8f45b1ae")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_sample",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5eaf6f2c576c9f08a31c")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_confront",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_confronted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_02bd7e796d27e3565c22")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8baf0cb41023d6ec7fa8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_970c5cb57a0230173de9")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1ccffdc5619454c69dc1"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_35ebd082f60229bc6774"),
          {
            "keywordId": "records_breakin",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e49ba0c10e6e41898c4c")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ae4dd985978ef82a487d")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_early",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_81a70ecf4592a35ba94d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_0c5925ee72b283032ebf")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9324261bd4ca5ec3fd7c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_2ca5a4eb462301f30d20"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_00b2138021018046386b"),
          {
            "keywordId": "blue_folder",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5e4ba369aac7ad63f846")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e51f0b5a107d59b1066f")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1dbe7ce7e3aeded95ace")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a463a1b9ed49fb0d717e")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_named_early",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_81a70ecf4592a35ba94d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_0c5925ee72b283032ebf")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_named",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_9324261bd4ca5ec3fd7c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_2ca5a4eb462301f30d20"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_00b2138021018046386b"),
          {
            "keywordId": "blue_folder",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_5e4ba369aac7ad63f846")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e51f0b5a107d59b1066f")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1dbe7ce7e3aeded95ace")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_a463a1b9ed49fb0d717e")
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_after_slip",
    "terms": [
      "evelyn_shaw",
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ee9981ed860b72bc0b5f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3b68575d24013744d6bc")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e355c6639ad8b0c58560")
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_general",
    "terms": [
      "morrow_records"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_00ab7fc67259e9ab1f80")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e32076dc03c05376fd40"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7f7b9570f05a144e7fb0"),
          {
            "keywordId": "records_breakin",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e49ba0c10e6e41898c4c")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_1ed9ce8487f06fdb5d9a")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_incident",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "company_incident_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d58e93b59b0812b49757")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_8c68c8ca16e304625557")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f0d3496ab646d9e28b84")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7a57fcd3143e589308ae")
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_employee",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_181d3b49cdac084568cd")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_0fb352c8573d58726da5")
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_soup",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ceb0de86f9a8693d4d5c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_0a0add2cc76b5aee98b6"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_7e2a3df35ddc47ef2e52"),
          {
            "keywordId": "records_breakin",
            "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e49ba0c10e6e41898c4c")
          },
          __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_cdb4ee2aea69cc6a8333")
        ]
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_folder",
    "terms": [
      "blue_folder",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_351ee8ca37f83fc5394d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3facfd81b388a3f5f0c1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d34f231a3c6727b86eba")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_aa382a46b6fc6a1bffae")
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_folder_short",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_351ee8ca37f83fc5394d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3facfd81b388a3f5f0c1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_d34f231a3c6727b86eba")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_aa382a46b6fc6a1bffae")
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_next",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "folder_detail_verified"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 80,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_6669ed1758b29a5fafde")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_e7359b8c1e58177bfa47")
      }
    ]
  }
];
const marker=Symbol.for(__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_b849ca4fe30d772db4d9"));
export function ensureAlibiDialogueDefinitions(definition=ALIBI_SEARCH_CASE) {
  if (definition?.id!=='borrowed_alibi') return;
  if (!definition.keywords.some(k=>k.id==='copper_email')) definition.keywords.push({
    id:'copper_email',label:COPPER_EMAIL,email:COPPER_EMAIL,contactName:__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_ffe6e882ae998d4000bf"),cloudId:'places'
  });
}
export function installAlibiDialogueData() {
  ensureAlibiDialogueDefinitions();
  for (const contact of [ALIBI_PHONE_CONTACT,ALIBI_CLUB_CONTACT,...ALIBI_INTERVIEW_CONTACTS]) {
    if (contact[marker]) continue;
    const own=ALIBI_DIALOGUE_RULES.filter(rule=>rule.contactId===contact.id);
    if (!own.length) continue;
    contact.topics=own.map(rule=>({...rule,terms:[...rule.terms]}));
    contact.choicePrompt=__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_eb8921726c1f43567cdb");
    contact.fallback=[{speaker:__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("ui/pi-computer/AlibiDialogueData.js", "t_f26b3eadd2798cec7ddc")}];
    contact.fallbackVariants=undefined;
    contact[marker]=true;
  }
}
export function selectAlibiDialogueRule(contact,terms,known,flags) {
  const sig=ids=>[...new Set(ids)].sort().join('|');
  if (contact?.caseId!=='borrowed_alibi') return null;
  return contact.topics.filter(topic=>sig(topic.terms)===sig(terms)
    && (topic.requiresFlags||[]).every(id=>flags.includes(id))
    && !(topic.unlessFlags||[]).some(id=>flags.includes(id))
    && (topic.requiresKeywords||[]).every(id=>known.includes(id))
    && !(topic.unlessKeywords||[]).some(id=>known.includes(id)))
    .sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;
}
installAlibiDialogueData();
