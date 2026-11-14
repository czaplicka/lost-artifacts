import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// scenes/apartament/ApartmentObjectsPool.js
// Item comments live with item definitions in metadata.useMessage.

export const APARTMENT_CONTENT_ROLES = {
  "MISSION_ARTIFACT": "__MISSION_ARTIFACT__",
  "ESCAPE_CLUE": "__ESCAPE_CLUE__",
  "ESCAPE_FRAGMENT_A": "__ESCAPE_FRAGMENT_A__",
  "ESCAPE_FRAGMENT_B": "__ESCAPE_FRAGMENT_B__"
};

export const APARTMENT_OBJECTS_POOL = {
  "desk": {
    "id": "desk",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0c9678ed914cf5e1b460"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c06b9e21f36c1d13d747"),
    "position": {
      "x": 300,
      "y": 400
    },
    "size": {
      "w": 120,
      "h": 80
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "desk_key",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1a3a081b2e4f10253aa"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c36084889b9e1141ea6f")
        }
      },
      {
        "id": "bank_statement",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_705f16c7ff68241db305"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bfdcad8cfd066154e4f1")
        }
      },
      {
        "id": "casino_receipt",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1f2c042812d160c0385"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_23439b9b797baee658cb")
        }
      },
      {
        "id": "medical_bill",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1350fd86dafecb46230"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b229d628be5967290b6d")
        }
      },
      {
        "id": "threatening_letter",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f3446a330c0944b2fbc6"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c4a259097fd81d9dfa27")
        }
      },
      {
        "id": "plane_ticket_receipt",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b00b5ff70dfc2b5bfd3c"),
        "weight": 20,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e7c239b8fb16df29a433")
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_301f37a5796f6cf8b1ea"),
        "role": "escapeClue",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b9f90a12668d10ce2c1a")
        }
      },
      {
        "id": "map_location",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_217d1892cf4c3f15b7a2"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_056e93fce9cc6612cd73")
        }
      },
      {
        "id": "handwritten_notes",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0d56d708c41f3d6b0e02"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8782029dc5ad0d0684de")
        }
      },
      {
        "id": "audit_report",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ae41de725eba26be1264"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_effbc94613e108fd2fc6")
        }
      },
      {
        "id": "visa_stamp",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_72efc15ffcb4beda3f8f"),
        "weight": 18,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f891d7151230d366a330")
        }
      }
    ],
    "animation": {
      "type": "slide_open_right",
      "duration": 600
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_15963e48c911e48bbafd")
  },
  "bookshelf": {
    "id": "bookshelf",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_913f317108e471cff321"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ebad908064a87974df5f"),
    "position": {
      "x": 100,
      "y": 300
    },
    "size": {
      "w": 150,
      "h": 200
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "debt_notebook",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ed6b72576bada38a41d9"),
        "weight": 25,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7cff96f45fb83786cf22")
        }
      },
      {
        "id": "diary",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9d40bf21e9ff49a0a7bc"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_be08b9d9255ea54386d4")
        }
      },
      {
        "id": "hidden_key",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_85efc174219d3bc841f0"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_039e9b3daafb603331b8")
        }
      },
      {
        "id": "old_letters",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fafc591a450190290c6e"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b45d488d2f2eb4480f98")
        }
      },
      {
        "id": "artifact_research",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_54b022f29581422b853d"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_66c0081d7c6026df9c56")
        }
      },
      {
        "id": "medical_reports",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_252c957ab8ccc772e2e9"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fc56179e12fe1dfb22a6")
        }
      },
      {
        "id": "blackmail_photo",
        "type": "photo",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9c06871ef023d18cd7aa"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d43e0e4c6f4159aa0fea")
        }
      },
      {
        "id": "travel_guide",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_81ce17f09f97d61bc430"),
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9f7b1a125ddf6cbb8388")
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_A__",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b5349abbd17a5bf6cae5"),
        "role": "escapeFragmentA",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e41020b4e3b9b757065f")
        }
      }
    ],
    "animation": {
      "type": "fade_in",
      "duration": 600
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d6704396ba5c8305dc39")
  },
  "painting": {
    "id": "painting",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c948d3d96f441b8ccc61"),
    "type": "decoration",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_749b204f41bd462dd3dc"),
    "position": {
      "x": 600,
      "y": 250
    },
    "size": {
      "w": 140,
      "h": 100
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "hidden_document",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6ce498dc88eb253ae23d"),
        "weight": 22,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_07f9a79704745d1a1ee0")
        }
      },
      {
        "id": "safe_key",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_483637f759a4cc054a8a"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b7455b4ba493c7736a1e")
        }
      },
      {
        "id": "money_stash",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e27f60ab878a3407cff5"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7f3e4bce0d8db9419ba9")
        }
      },
      {
        "id": "plane_ticket_receipt",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b00b5ff70dfc2b5bfd3c"),
        "weight": 20,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e7c239b8fb16df29a433")
        }
      },
      {
        "id": "passport_copy",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_af8b0124f0f743697b2b"),
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e701bfc931512a251da8")
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_301f37a5796f6cf8b1ea"),
        "role": "escapeClue",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b9f90a12668d10ce2c1a")
        }
      }
    ],
    "animation": {
      "type": "slide_reveal_left",
      "duration": 700
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_be84547586070d04cd15")
  },
  "cabinet": {
    "id": "cabinet",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2885e50ff8e1af8a074c"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9172f3da2cbb072be92d"),
    "position": {
      "x": 800,
      "y": 450
    },
    "size": {
      "w": 80,
      "h": 100
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "medications",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_99a5a7dd4154e7dfc90a"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_063fc19943788e70edb2")
        }
      },
      {
        "id": "insurance_papers",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_812500f04877857b9bc1"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f5a5437e672b43718af4")
        }
      },
      {
        "id": "gun_license",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_10dc3d5562084492f2d2"),
        "weight": 10,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f5cb534fa2ccb7299180")
        }
      },
      {
        "id": "jewelry",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7be96f7fe199e498fa74"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0ccea460e94cc11032f9")
        }
      },
      {
        "id": "burglary_tools",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9ffdb49cee4e7c451302"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e100db969c44b5c9f63f")
        }
      },
      {
        "id": "rope_coil",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6b9433e34c0bb381af5c"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5c4456e46d58fccd406f")
        }
      },
      {
        "id": "lockpick_set",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ab4c9141e8cbc0e252fe"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4e961c7cee30c5c66a21")
        }
      },
      {
        "id": "fake_id",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c44b619c11bbac4c6e09"),
        "weight": 14,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1d72bc570b236a62262d")
        }
      }
    ],
    "animation": {
      "type": "slide_open_down",
      "duration": 500
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_42ed67032990c271c623")
  },
  "safe": {
    "id": "safe",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_326098a7676c1a392029"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_67893df61da0d385e997"),
    "position": {
      "x": 950,
      "y": 350
    },
    "size": {
      "w": 90,
      "h": 110
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "requiresItem": "safe_key",
    "possibleContents": [
      {
        "id": "passport_original",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d026358193eb96426436"),
        "weight": 25,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_932766a7cebbf7011b4e")
        }
      },
      {
        "id": "diamond_ring",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6dc3a150cb443eba7f9f"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_3654079a46720dda0f78")
        }
      },
      {
        "id": "offshore_account_info",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7f7833ba124e28b04958"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a10932eb40ea02dbeff0")
        }
      },
      {
        "id": "will_document",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_206bfff76a5a70ebaf68"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c909a8a61322276cce38")
        }
      },
      {
        "id": "blackmail_evidence",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0d7bfec3373ec12038fb"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_99838881a0799bdce3b7")
        }
      },
      {
        "id": "escape_fund",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6dcff5ffac72ef847bfc"),
        "weight": 22,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ed272535a32cc0fc6306")
        }
      },
      {
        "id": "plane_booking",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e33efc184e8373826eb0"),
        "weight": 21,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_339cb94fc4cf398e80fb")
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_87d2e3c1391364624e0d")
  },
  "instrument_case": {
    "id": "instrument_case",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7d128108569492be6e83"),
    "type": "container",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8cc046581fa868b0705c"),
    "position": {
      "x": 710,
      "y": 585
    },
    "size": {
      "w": 185,
      "h": 90
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "preferredForMissionArtifact": true,
    "possibleContents": [
      {
        "id": "__MISSION_ARTIFACT__",
        "type": "artifact",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e3e175537499131db2af"),
        "role": "missionArtifact",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d02621856ea8fafc85b4")
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_301f37a5796f6cf8b1ea"),
        "role": "escapeClue",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b9f90a12668d10ce2c1a")
        }
      },
      {
        "id": "artifact_research",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_54b022f29581422b853d"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_66c0081d7c6026df9c56")
        }
      },
      {
        "id": "travel_guide",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_81ce17f09f97d61bc430"),
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9f7b1a125ddf6cbb8388")
        }
      },
      {
        "id": "old_letters",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fafc591a450190290c6e"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b45d488d2f2eb4480f98")
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_536a28756cccc5c547e1")
  },
  "wine_rack": {
    "id": "wine_rack",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_08da4dede881067e0dc9"),
    "type": "decoration",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_81b0e9741fe2037e55ac"),
    "position": {
      "x": 400,
      "y": 550
    },
    "size": {
      "w": 100,
      "h": 140
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "wine_sale_receipt",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_15382881af7ab9f3adc9"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e76f3119d8b8f5324b2f")
        }
      },
      {
        "id": "auction_catalog",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e7e8397578583a65ede5"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e46134d5c9b4f51de9ef")
        }
      },
      {
        "id": "empty_wine_bottles",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_52d788165aab6fb5164b"),
        "weight": 12,
        "isRedHerring": true,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_47add18d2b08385ac256")
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1899ff555dc87f9fb9b")
  },
  "jewelry_box": {
    "id": "jewelry_box",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7be96f7fe199e498fa74"),
    "type": "container",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_18afdd1c069215858f13"),
    "position": {
      "x": 500,
      "y": 200
    },
    "size": {
      "w": 80,
      "h": 60
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "engagement_ring",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_242d583b9b3b0a82c849"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_31e5a246b10de3e1eea0")
        }
      },
      {
        "id": "family_heirloom_photo",
        "type": "photo",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1953f1539ea5f0e9814e"),
        "weight": 22,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c58304cceae139afeda0")
        }
      },
      {
        "id": "empty_jewelry_box",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b3e6829df5ae1db081e0"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a831dd49f7ceb5f506f7")
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f2e7704c16c6a4309912")
  },
  "lamp": {
    "id": "lamp",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a6154b584700cef8f41c"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ce7d95afdf03dc075ea9"),
    "position": {
      "x": 700,
      "y": 450
    },
    "size": {
      "w": 40,
      "h": 100
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "hidden_cash",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_54a16acd40bc9ba8c1fa"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bad5f71affa6178e190a")
        }
      },
      {
        "id": "usb_drive",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4bc182efdc2a1641ce85"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_aa3a03e498c2daaaf760")
        }
      },
      {
        "id": "memory_card",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_93a5c399af74ba0373e3"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d9b37f63c7de7faa91a1")
        }
      },
      {
        "id": "key_in_lamp",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_029a0fdb59e7614eabf7"),
        "weight": 16,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e7471c6423f6bde0da12")
        }
      }
    ],
    "animation": {
      "type": "shake",
      "duration": 400
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c244f03d3425ef95dea9")
  },
  "sofa": {
    "id": "sofa",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1ff61315e3fb2628bed"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9cb2f921381578bb8c73"),
    "position": {
      "x": 550,
      "y": 380
    },
    "size": {
      "w": 180,
      "h": 60
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "lost_key",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_72844916786aeb29b45d"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_630aeda31fe96fb17785")
        }
      },
      {
        "id": "love_letter",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bc0a0f789c6f0b97ae59"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d2654e5f35a7f37a2675")
        }
      },
      {
        "id": "lost_cash",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8bcdc20e259fd2d2df6f"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8ff7dd0f3a75a6d1aba7")
        }
      },
      {
        "id": "broken_necklace",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9be95819f11668e57950"),
        "weight": 10,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_cd7901050d729c53f1dc")
        }
      },
      {
        "id": "hotel_key_card",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ae9e349e8094560394ad"),
        "weight": 14,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2025fcaec30f131f3629")
        }
      },
      {
        "id": "torn_ticket",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4bc955c537eea7e16f0b"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e41020b4e3b9b757065f")
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_B__",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ae9e349e8094560394ad"),
        "role": "escapeFragmentB",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ea1fecdde25dcb8219f8")
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ddae7195203f04d617f6")
  },
  "desk_computer": {
    "id": "desk_computer",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8f638f1fefbb296cb394"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9cc18a97943eb8c94d03"),
    "position": {
      "x": 350,
      "y": 200
    },
    "size": {
      "w": 100,
      "h": 80
    },
    "canBeLocked": false,
    "canBeOpen": false,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "email_screenshot",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_3a7e7012dfbeb0b903fb"),
        "weight": 20,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_11acc34a896f780cb2e8")
        }
      },
      {
        "id": "search_history",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_33ad7c8bfe04b2568721"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1a838d3128157807579e")
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1ea5576518aa0d0891dc")
  },
  "nightstand_drawer": {
    "id": "nightstand_drawer",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0e4354f782acd2bcb45a"),
    "type": "furniture",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e37b98eb32c3ba78464c"),
    "position": {
      "x": 200,
      "y": 500
    },
    "size": {
      "w": 60,
      "h": 70
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "nightstand_key",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fbe50f8352bdc1661a98"),
        "weight": 12,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0fea8511aa122cb7d4f6")
        }
      },
      {
        "id": "private_letters",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c7c450ef74ce62f6e67a"),
        "weight": 18,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fa65d6ac61d09cfc0357")
        }
      },
      {
        "id": "sleeping_pills",
        "type": "object",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d182c60124402986c1ce"),
        "weight": 10,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_eae00e6481f0f19cb121")
        }
      },
      {
        "id": "passport_page",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_55e0410e7103d4cf8521"),
        "weight": 14,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a3dff092941d199f8d43")
        }
      }
    ],
    "animation": {
      "type": "slide_open_right",
      "duration": 400
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0ac5ac4c6fe61a042a9b")
  },
  "framed_photo": {
    "id": "framed_photo",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_50241dfccb9add62ea4d"),
    "type": "decoration",
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_96971c791ca00f718d16"),
    "position": {
      "x": 450,
      "y": 150
    },
    "size": {
      "w": 100,
      "h": 120
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "photo_back_message",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_de28ae09d7d03ec24b93"),
        "weight": 15,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f4eb3e8bf7c78aa8030d")
        }
      },
      {
        "id": "hidden_behind_frame",
        "type": "key",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_684ea61bad1151514868"),
        "weight": 16,
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1c3801bfaa1741a0b138")
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_A__",
        "type": "document",
        "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b5349abbd17a5bf6cae5"),
        "role": "escapeFragmentA",
        "metadata": {
          "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e41020b4e3b9b757065f")
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9d1dfeee0c36baedd2c0")
  }
};

export const RED_HERRING_CONTENTS = [
  {
    "id": "theater_tickets",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5c62bbf6830fffee191b"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8e9c4934ed237782fa6a"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_3e64e8461ed829b33db6")
    }
  },
  {
    "id": "restaurant_receipt",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5fb936c3595fc6e8152c"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_00296da14469006b6122"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bf074163289c89c0ccba")
    }
  },
  {
    "id": "concert_poster",
    "type": "photo",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5be7320e9a1b8f37833e"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d3cca95268fe0949f69e"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a88d31890f94b5f2e67d")
    }
  },
  {
    "id": "birthday_card",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b036ba4463894c8d4ebc"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_783749b4f0cf4d14fae5"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c4133bf0a8e8d80f3e79")
    }
  },
  {
    "id": "gym_membership",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_23ecaf3930194b35ed87"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ab85f5e0c277c76ee753"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e27d6b04b5d24098e898")
    }
  },
  {
    "id": "magazine",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9042ee84d0a2ef41a9fc"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fe90aac66dc50f81e2c8"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ec063e4138fe21f1c568")
    }
  },
  {
    "id": "pet_vaccination",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b6d9117ec79e5cead792"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5e70bfda660492603ccd"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d158bfee1793da4964bd")
    }
  },
  {
    "id": "library_card",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b38fc6269e6e66fc9c2c"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_88e61b5ae1e9a97460a7"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_88fcf96e60103d2a3ab1")
    }
  },
  {
    "id": "lottery_ticket",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_87e9663a7c11fd0610bc"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0c9ba5148015adcd84a5"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2aca1851b835b76cfd8e")
    }
  },
  {
    "id": "property_deed",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a9144042e6382630faae"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bb11c8128b1233154242"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a9638f733e2196990dc8")
    }
  },
  {
    "id": "coffee_receipt",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c1616a8ed3175ec6486a"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_5b0e710b68fc57e903b2"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7ead844f199112b2fb61")
    }
  },
  {
    "id": "vacation_brochure",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_07b92e948d26b8ef23e4"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_37a8724be223b8ae83cd"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f613bcb90034739a359b")
    }
  },
  {
    "id": "book_receipt",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_3cf9ba03fccb993495fb"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0ad4bdcc97bbc1099fbb"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d8fa4ba6769e244b6763")
    }
  },
  {
    "id": "concert_ticket",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a48f6fb31c58f584cee2"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9ce64234f398b9154618"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b5dd3d8e96ca9b9b4510")
    }
  },
  {
    "id": "museum_pass",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d6577957a09a4079df59"),
    "hint": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_46c2946cb964937a8878"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_67d65147518a3410a37d")
    }
  }
];

export const ESCAPE_CLUES = {
  "plane_ticket_receipt": {
    "id": "plane_ticket_receipt",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b00b5ff70dfc2b5bfd3c"),
    "weight": 22,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_72e0365817ac19a96a76"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e7c239b8fb16df29a433")
    }
  },
  "passport_copy": {
    "id": "passport_copy",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_af8b0124f0f743697b2b"),
    "weight": 20,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2f903b73f584542cd9c5"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e701bfc931512a251da8")
    }
  },
  "travel_guide": {
    "id": "travel_guide",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_81ce17f09f97d61bc430"),
    "weight": 18,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_bd2382766a1d6aecef68"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9f7b1a125ddf6cbb8388")
    }
  },
  "escape_fund": {
    "id": "escape_fund",
    "type": "object",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6dcff5ffac72ef847bfc"),
    "weight": 24,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_38a641a2f5f675c948a1"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ed272535a32cc0fc6306")
    }
  },
  "plane_booking": {
    "id": "plane_booking",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e33efc184e8373826eb0"),
    "weight": 25,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f2e6fa3deb6e025df31e"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_339cb94fc4cf398e80fb")
    }
  },
  "hotel_reservation": {
    "id": "hotel_reservation",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_edb12e20f0fa19edcdec"),
    "weight": 20,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_3f22901f1661692aee11"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f827ad6935122e96a5a0")
    }
  },
  "visa_stamp": {
    "id": "visa_stamp",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_a325a354dfd4e45f55d3"),
    "weight": 19,
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c913c0180c127eb86991"),
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_f891d7151230d366a330")
    }
  }
};

export const ESCAPE_COMBINATION_ITEMS = {
  "torn_ticket": {
    "id": "torn_ticket",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4bc955c537eea7e16f0b"),
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2f6efd39d57776603eab"),
    "isClue": false,
    "isEscapeFragment": true,
    "escapeFragmentRole": "A",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_e41020b4e3b9b757065f")
    }
  },
  "hotel_key_card": {
    "id": "hotel_key_card",
    "type": "key",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ae9e349e8094560394ad"),
    "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c17f2f3e2c8f694ca8f1"),
    "isClue": false,
    "isEscapeFragment": true,
    "escapeFragmentRole": "B",
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2025fcaec30f131f3629")
    }
  }
};

export const COMBINE_RULES = {
  "split_bank_statements": {
    "requires": [
      "bank_statement_part1",
      "bank_statement_part2"
    ],
    "produces": {
      "id": "bank_statement_complete",
      "type": "document",
      "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_2554fce6d3f10dd2a15a"),
      "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_0a317cbd465aa13448ed"),
      "isClue": true,
      "metadata": {
        "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_58c78354a687aa0b56c9")
      }
    }
  },
  "split_letter": {
    "requires": [
      "letter_piece_1",
      "letter_piece_2"
    ],
    "produces": {
      "id": "letter_complete",
      "type": "document",
      "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_7051ec321dec9516caf8"),
      "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ea5d66e66a85c2159b5b"),
      "isClue": true,
      "metadata": {
        "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_c66b942b4cc02f51247e")
      }
    }
  },
  "torn_ticket_assembly": {
    "requires": [
      "torn_ticket",
      "hotel_key_card"
    ],
    "produces": {
      "id": "ticket_identity_matched",
      "type": "document",
      "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_207a25b58758f6e4439a"),
      "description": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_ed1c5dbbb3ad2364f4bc"),
      "isClue": true,
      "isEscapeClue": true,
      "escapeMethod": "combined",
      "metadata": {
        "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_6c6952276b996dd1cc47")
      }
    }
  }
};

export const APARTMENT_ADDITIONAL_ITEMS = {
  "family_photo": {
    "id": "family_photo",
    "type": "photo",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4a41b6fd4ab078d51148"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_9dca0e160379334a86a0")
    }
  },
  "recycling_bin_receipt": {
    "id": "recycling_bin_receipt",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_34ceba4ec4b1ff5ccdd0"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_d1ff3c019c05c960668f")
    }
  },
  "bank_statement_part1": {
    "id": "bank_statement_part1",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_1031fb28fd8b33a99213"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_305a8f7b2fc8cf72879a")
    }
  },
  "bank_statement_part2": {
    "id": "bank_statement_part2",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_8c669c2ec57075f0624f"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_34492603fc00c7cfc1b0")
    }
  },
  "letter_piece_1": {
    "id": "letter_piece_1",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_278b429cf0ab0b0d3575"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_b6e03fea65da2703c313")
    }
  },
  "letter_piece_2": {
    "id": "letter_piece_2",
    "type": "document",
    "label": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_4140a777886ffcab0db6"),
    "metadata": {
      "useMessage": __dialogueText("scenes/apartament/ApartmentObjectsPool.js", "t_fa8a72fc5768bdef044b")
    }
  }
};

export default APARTMENT_OBJECTS_POOL;