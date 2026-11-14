import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const ALIBI_SILENCE_FLAG='alibi_silence_offer_requested';
export function alibiSilenceOfferKnown(state){
 const flags=state.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
 const finale=state.piBorrowedAlibiFinale;
 return flags.includes(ALIBI_SILENCE_FLAG)||finale?.draft?.endingId==='silence'||finale?.settlement?.preview?.endingId==='silence';
}
export const ALIBI_GUIDANCE_RULES=[
  {
    "id": "alibi_v3_restaurant_sample_vs_visit",
    "number": "427",
    "terms": [
      "tuesday_package"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b42cd6d2ebc2ca80bd1d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_61b5bf1189494a01aa08")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_815075ab5859274fd7c2")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_d434632e61d49c94328d")
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_reference",
    "number": "427",
    "terms": [
      "sample_code"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_cf1345980c4f34e7719d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_9dc3de13b55bd83c5ad4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_6c3113f5826e40ccc28b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_90c9a543120a19a7c391")
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_verify_meal",
    "number": "427",
    "terms": [
      "copper_spoon",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4072aa27afa579ff1cbc")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_91e2b0031be81021d78f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_76690637376664703188")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5eb0adf1c95b8a2ec9d2")
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_receipt_scope",
    "number": "427",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_read",
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_597086a24e31681f4123")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_62ac2c258947c02e76df")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_696bfdb658279bbaf724")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_9e1fa00251a80409a2b8")
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_receipt_unread",
    "number": "427",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 30,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4881bc1563d9386b7182")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_9638b6a2e600c4a8bfdb")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_40f6de3310e9f4b00d46")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8b2085f74dfa9c78a23b"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_310b0af19b3e5ad67993")
      }
    ]
  },
  {
    "id": "alibi_v3_club_footer",
    "number": "428",
    "terms": [
      "tuesday_package",
      "revision_two"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_51d2dde90fde5066eb3b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_60b7426fe2aad6ddb838")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_93288e2ef3627fd253f1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_eb0b4e059a5539be63c3")
      }
    ]
  },
  {
    "id": "alibi_v3_club_truth_of_dinner",
    "number": "428",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a42dd718cbb98e16aa7e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_db71b412f956f9549269")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_ae7800b374346f645471")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_cb7a2a5338229cb6473b")
      }
    ]
  },
  {
    "id": "alibi_v3_club_sample_reference",
    "number": "428",
    "terms": [
      "dinner_package",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "alibi_silence_offer_requested"
    ],
    "grantKeywords": [],
    "condition": "sample_read",
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7de995dfad59841efcc6")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_c7124ca0fcc26bbf621f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5f7417dad838d514783d")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_968b6249f81ac8b43504")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3ea752ecada9db80f100")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a03a465214aba97f9cc6"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8d9ca7188c40fa8563f7")
      }
    ]
  },
  {
    "id": "alibi_v3_nora_needs_actual_receipt",
    "number": "429",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a4dc6186162d7e79c9d1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_c03a0aee594c9325210b")
      }
    ]
  },
  {
    "id": "alibi_v3_nora_needs_actual_sample",
    "number": "429",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a3cdbfd52fef6e604413")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_771c86b7a447a503bac1")
      }
    ]
  },
  {
    "id": "alibi_v3_nora_continuous_attendance",
    "number": "429",
    "terms": [
      "nora_bell",
      "pie_contest"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_60df64c780d48be9ff90")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a9d9bda7172e6c99939a")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5847a8bbd169886c04c0")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b82592318fa649182a20")
      }
    ]
  },
  {
    "id": "alibi_v3_nora_own_statement_limit",
    "number": "429",
    "terms": [
      "nora_bell",
      "records_breakin"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_36e2c9242221a46ddb16")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_09f226261a06b8511bdb"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_63d9a1e76e0ad09de9c6"),
          {
            "keywordId": "pie_contest",
            "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5b3d2434d90ebb6f24e3")
          },
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_cdb4ee2aea69cc6a8333")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_47aa0b65ab9241e94746")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7855a6528779f2e53e66")
      }
    ]
  },
  {
    "id": "alibi_v3_nora_document_confirmed",
    "number": "429",
    "terms": [
      "nora_bell",
      "nora_verified"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7cc5683146b3d1fd6ec4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4cca0264ed42816c466a"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_14db5cab17b645e62191")
      }
    ]
  },
  {
    "id": "alibi_v3_simon_needs_actual_receipt",
    "number": "430",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a4dc6186162d7e79c9d1")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_c03a0aee594c9325210b")
      }
    ]
  },
  {
    "id": "alibi_v3_simon_needs_actual_sample",
    "number": "430",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a3cdbfd52fef6e604413")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_771c86b7a447a503bac1")
      }
    ]
  },
  {
    "id": "alibi_v3_simon_continuous_attendance",
    "number": "430",
    "terms": [
      "simon_pike",
      "board_tournament"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3b9d78726544c7f22aef")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f07efb7cfd181e539438")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_c95d6ec513ac0463e561")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3aa1638d7d6de7deb3b6")
      }
    ]
  },
  {
    "id": "alibi_v3_simon_own_statement_limit",
    "number": "430",
    "terms": [
      "simon_pike",
      "records_breakin"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_36e2c9242221a46ddb16")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_e0a5d6b10f79ab70f851"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_63d9a1e76e0ad09de9c6"),
          {
            "keywordId": "board_tournament",
            "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a05e96774c14aa4f0766")
          },
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_cdb4ee2aea69cc6a8333")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_47aa0b65ab9241e94746")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7855a6528779f2e53e66")
      }
    ]
  },
  {
    "id": "alibi_v3_simon_document_confirmed",
    "number": "430",
    "terms": [
      "simon_pike",
      "simon_verified"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7cc5683146b3d1fd6ec4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_95df72b5037a3593588e"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_14db5cab17b645e62191")
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_slip_without_answer",
    "number": "431",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_9324261bd4ca5ec3fd7c")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_2ca5a4eb462301f30d20"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_00b2138021018046386b"),
          {
            "keywordId": "blue_folder",
            "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5e4ba369aac7ad63f846")
          },
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_e51f0b5a107d59b1066f")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b7cc9096be22ce1a163b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b712bc5623dedd2d83cf")
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_slip_without_answer_named",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_c51dc086c47465dda665")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_2ca5a4eb462301f30d20"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_00b2138021018046386b"),
          {
            "keywordId": "blue_folder",
            "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5e4ba369aac7ad63f846")
          },
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_e51f0b5a107d59b1066f")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b7cc9096be22ce1a163b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b712bc5623dedd2d83cf")
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_needs_receipt_read",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_4b04cff5f8186dccd8fb")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_922b6b25a33bf5360df1")
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_needs_sample_read",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_5eef43b49d36349187ee")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_fdce6f205c839c00f310")
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_after_description",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f51463bb37cae6540851")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f693eba06ad2594e170c"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_d6d210262819b449847b")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_74ecac0d09bedfb94915")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_interval_method",
    "number": "432",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [
      "company_incident_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_529c8a46a5673301d504")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_17616315452c8ea28bab")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a4ed34f69f4e8589112f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_e9d11cc796ee7c9b8033")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_47ca43c0a7efebb62e9e")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_303690a239eafdffc4c4")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_public_scope",
    "number": "432",
    "terms": [
      "morrow_records"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_85f210d2d38bcefdccc3")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_97895523a10258f413e4"),
        "fragments": [
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b2e7791ccc2321b3eb0d"),
          {
            "keywordId": "records_breakin",
            "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_e49ba0c10e6e41898c4c")
          },
          __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_8d8ccefb10dd8a310566")
        ]
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_bde751995969bca2afc2")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_13f08f844b75f0c10ec2")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_nora_record_method",
    "number": "432",
    "terms": [
      "nora_verified",
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a02b8f7e8b3dbd0c8be4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7f75d69d359f93d89722")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_37d5530d6f4825bb2434")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_d6fb8bcd9d26fc129ff1")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_simon_record_method",
    "number": "432",
    "terms": [
      "simon_verified",
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_a02b8f7e8b3dbd0c8be4")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7f75d69d359f93d89722")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_37d5530d6f4825bb2434")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_d6fb8bcd9d26fc129ff1")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_description_limit",
    "number": "432",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f1501db709372e80133f")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_f764e86f552c7894a2fa")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_b54e168ef84f9caf8e28")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_90ea7e5a058d1f9770a8")
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_description_limit_named",
    "number": "432",
    "terms": [
      "blue_folder",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_af04d2547da6ed6c8db7")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_7fcb8c18b11f3d3377a8")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_08b041935798fbf6fd6f"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_1126f8b7cf25dad49395")
      },
      {
        "speaker": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_3f7991714910557e69d8"),
        "text": __dialogueText("ui/pi-computer/AlibiGuidanceRules.js", "t_47ad9c2818c582ffafc7")
      }
    ]
  }
];
export function resolveAlibiGuidance(number,terms,state){
 if(!Array.isArray(terms)||!terms.length||terms.length>2||new Set(terms).size!==terms.length)return null;
 const known=state.piKeywordSearch?.cases?.borrowed_alibi?.known||[];
 if(!terms.every(id=>known.includes(id)))return null;
 const flags=state.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[],read=state.piBorrowedAlibi?.read||[];
 const sig=ids=>[...ids].sort().join('|');
 const conditions={receipt_read:read.includes('alibi_copper_receipt'),receipt_unread:!read.includes('alibi_copper_receipt'),
  sample_read:read.includes('alibi_club_sample'),sample_unread:!read.includes('alibi_club_sample')};
 return ALIBI_GUIDANCE_RULES.filter(rule=>rule.number===number&&sig(rule.terms)===sig(terms)
  &&rule.requiresFlags.every(id=>flags.includes(id))&&(!rule.condition||conditions[rule.condition]===true))
  .sort((a,b)=>b.priority-a.priority)[0]||null;
}
