import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ALIBI_INTERVIEW_SEARCH, ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
export const ALIBI_SEARCH_ID = 'borrowed_alibi';
export const ALIBI_CONTACT_ID = 'alibi_copper_spoon';
export const ALIBI_CLUB_CONTACT_ID = 'alibi_tuesday_club';
export const ALIBI_DATA_REVISION = 4;
const BASE_SEARCH = {
  "id": "borrowed_alibi",
  "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6f6595b37ee8214d1067"),
  "initialKeywords": [],
  "clouds": [
    {
      "id": "places",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3d456bb540a6c309513a")
    },
    {
      "id": "people",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0ab25a59ac13f7da53bb")
    },
    {
      "id": "dinner",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_80e51a402bc10bc641a4")
    },
    {
      "id": "documents",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_80ee197fe2eb5f9f52aa")
    },
    {
      "id": "club",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_9f3916234ae0aa567e91")
    }
  ],
  "keywords": [
    {
      "id": "copper_spoon",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0bd5ad37429856747de0"),
      "cloudId": "places"
    },
    {
      "id": "tuesday",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_7d8af1de1262f150187d"),
      "cloudId": "dinner"
    },
    {
      "id": "tomato_soup",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e9884a554e94418adb3f"),
      "cloudId": "dinner"
    },
    {
      "id": "red_wine",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c0e5eb15b27d73702d8c"),
      "cloudId": "dinner"
    },
    {
      "id": "arthur_finch",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_513833eba3a4389aeb86"),
      "cloudId": "people"
    },
    {
      "id": "nora_bell",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_4cca0264ed42816c466a"),
      "cloudId": "people"
    },
    {
      "id": "simon_pike",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_95df72b5037a3593588e"),
      "cloudId": "people"
    },
    {
      "id": "evelyn_shaw",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_f693eba06ad2594e170c"),
      "cloudId": "people"
    },
    {
      "id": "consent",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_4187ebcc31e7792be677"),
      "cloudId": "documents"
    },
    {
      "id": "receipt",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6f32860910ca0fb2a20c"),
      "cloudId": "documents"
    },
    {
      "id": "copper_phone",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_42f25adecf47629878e8"),
      "cloudId": "places"
    },
    {
      "id": "kitchen_failure",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_455521e9eb2beb0b3b70"),
      "cloudId": "dinner"
    },
    {
      "id": "one_guest",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ba1b925e6c673f4270b6"),
      "cloudId": "documents"
    },
    {
      "id": "tuesday_package",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_778bc47bac00f236180e"),
      "cloudId": "club"
    },
    {
      "id": "revision_two",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c83f1c8c9f121fc5361d"),
      "cloudId": "club"
    },
    {
      "id": "alibi_club",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_550b2fa8eec156e7f2e5"),
      "cloudId": "club"
    },
    {
      "id": "club_phone",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_cbf2f7864f1c988391a9"),
      "cloudId": "club"
    },
    {
      "id": "dinner_package",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b6c88235a57a8dd4c3e1"),
      "cloudId": "club"
    },
    {
      "id": "respectable_witness",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_15e40dad60c34d938071"),
      "cloudId": "club"
    },
    {
      "id": "sample",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_61059a5e4686e0bf046b"),
      "cloudId": "club"
    },
    {
      "id": "sample_code",
      "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_9c4ad18fbc2b8a22228f"),
      "cloudId": "club"
    }
  ],
  "pages": [
    {
      "id": "copper_home",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_7f0e4d4ce148c19f160e"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_43dd7a9e3871515ca634"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b4783cdbda4aa272dec8"),
      "blocks": [
        [
          {
            "keywordId": "copper_spoon"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c83b4be8fde078d31d0c")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0a5a5bcd3b16355f1686")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_99af6606ff9d6cd5154d"),
          "pageId": "copper_menu"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1a8c5ee7fcda5ea75fbd"),
          "pageId": "copper_notice"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2b5c3d26721ae9c350cf"),
          "pageId": "copper_contact"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e2cd82394bd3a5a19f48")
    },
    {
      "id": "copper_menu",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3be1433b2a2e7d83ec25"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1e477443dcf5a2ed59ee"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b4783cdbda4aa272dec8"),
      "blocks": [
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_dad4222d8ac2fe5daabd")
        ],
        [
          {
            "keywordId": "tomato_soup"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_7648ff225ccb1616f64a")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e4bc485f199dba57ba63")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1a8c5ee7fcda5ea75fbd"),
          "pageId": "copper_notice"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2b5c3d26721ae9c350cf"),
          "pageId": "copper_contact"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_85f914f44f06a5a1520c")
    },
    {
      "id": "copper_notice",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_71d9425a73693f9550ea"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_09707054029eaeeacca8"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b4783cdbda4aa272dec8"),
      "blocks": [
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_442fe0d6be84f90ad929"),
          {
            "keywordId": "tuesday"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_9edc67dd478f6626c07a")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c4ae0f0193ce97a3b36d"),
          {
            "keywordId": "kitchen_failure"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_faf961877c8b2db69dc8")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6c82dba298c62d967505")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2b5c3d26721ae9c350cf"),
          "pageId": "copper_contact"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_99af6606ff9d6cd5154d"),
          "pageId": "copper_menu"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b64066d059622f7d7ae1")
    },
    {
      "id": "copper_contact",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6ac456f9b36201af9d2f"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_dc2b9c910eecd2160a12"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b4783cdbda4aa272dec8"),
      "blocks": [
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_5625c4e840daff8ae4cd"),
          {
            "keywordId": "copper_phone"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c29de8396ea1ed8cdd28")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1a67b20392ec502d04bc")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_95638396cc234faebf7f"),
          {
            "keywordId": "receipt"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b96d125f3244394867ab")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3a78695388b38b5cceef"),
          "pageId": "copper_home"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1a8c5ee7fcda5ea75fbd"),
          "pageId": "copper_notice"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6b2c2a98ed76b9d42a0c")
    },
    {
      "id": "club_home",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_d5ee02b7bb208431bf52"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_d2708a6431faad4a0ccf"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ff2a51dce7fff690bfa6"),
      "blocks": [
        [
          {
            "keywordId": "alibi_club"
          }
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_fa67f4a145df6068549c")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_97e0cce0ca671eaffa2c"),
          {
            "keywordId": "tuesday_package"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e5e3e499ef93ea4c5e79")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_40a2085371b8effbae52"),
          "pageId": "club_packages"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2b5c3d26721ae9c350cf"),
          "pageId": "club_contact"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_d275b28049b1978f2fca")
    },
    {
      "id": "club_packages",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_bc9f3e6082e16e1ad7c8"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_708e2876df8381d44e98"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ff2a51dce7fff690bfa6"),
      "blocks": [
        [
          {
            "keywordId": "dinner_package"
          }
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c37ebb9440481602fd8c"),
          {
            "keywordId": "tuesday_package"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0a07f659461970d8d8dc"),
          {
            "keywordId": "revision_two"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_cdb4ee2aea69cc6a8333")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_eac112351d201fb9108e")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_5647eecaba3f07897395")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3a78695388b38b5cceef"),
          "pageId": "club_home"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2b5c3d26721ae9c350cf"),
          "pageId": "club_contact"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_83bb8fe5ca8c8bdb6693")
    },
    {
      "id": "club_contact",
      "title": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_09eb65e530f981cf6657"),
      "address": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_da82d7aef655385fbfff"),
      "brand": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ff2a51dce7fff690bfa6"),
      "blocks": [
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e861abaf3cc0c5fbde40"),
          {
            "keywordId": "club_phone"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c29de8396ea1ed8cdd28")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_39705302d39dbbb17d14"),
          {
            "keywordId": "dinner_package"
          },
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1bb64a5426d0b3238124")
        ],
        [
          __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ae7eeb619c262efe3003")
        ]
      ],
      "links": [
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_40a2085371b8effbae52"),
          "pageId": "club_packages"
        },
        {
          "label": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3a78695388b38b5cceef"),
          "pageId": "club_home"
        }
      ],
      "snippet": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08fa5f61dce1434d62d7")
    }
  ],
  "recipes": [
    {
      "terms": [
        "copper_spoon"
      ],
      "pageIds": [
        "copper_home",
        "copper_notice"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "tuesday"
      ],
      "pageIds": [
        "copper_notice",
        "copper_contact"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "tomato_soup"
      ],
      "pageIds": [
        "copper_menu",
        "copper_notice"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "receipt"
      ],
      "pageIds": [
        "copper_contact"
      ]
    },
    {
      "terms": [
        "copper_phone"
      ],
      "pageIds": [
        "copper_contact"
      ]
    },
    {
      "terms": [
        "tuesday_package"
      ],
      "pageIds": [
        "club_packages",
        "club_home"
      ]
    },
    {
      "terms": [
        "tuesday_package",
        "revision_two"
      ],
      "pageIds": [
        "club_packages"
      ]
    },
    {
      "terms": [
        "alibi_club"
      ],
      "pageIds": [
        "club_home",
        "club_contact"
      ]
    },
    {
      "terms": [
        "dinner_package"
      ],
      "pageIds": [
        "club_packages",
        "club_contact"
      ]
    },
    {
      "terms": [
        "club_phone"
      ],
      "pageIds": [
        "club_contact"
      ]
    }
  ]
};
export const ALIBI_SEARCH_CASE = {
 ...BASE_SEARCH,
 clouds: [...BASE_SEARCH.clouds, ...ALIBI_INTERVIEW_SEARCH.clouds],
 keywords: [...BASE_SEARCH.keywords, ...ALIBI_INTERVIEW_SEARCH.keywords],
 pages: [...BASE_SEARCH.pages, ...ALIBI_INTERVIEW_SEARCH.pages],
 recipes: [...BASE_SEARCH.recipes, ...ALIBI_INTERVIEW_SEARCH.recipes]
};
export const ALIBI_PHONE_CONTACT = {
  "id": "alibi_copper_spoon",
  "caseId": "borrowed_alibi",
  "number": "427",
  "name": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_7568bf152928ba221688"),
  "requiresKeyword": "copper_phone",
  "choicePrompt": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b0f333ed611dd54b1d74"),
  "greeting": [
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_656e9c63e025408e1aa7")
    },
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_9f9e801e1776eeb98160")
    },
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2d7aa88e073ca875197b")
    }
  ],
  "fallback": [
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ed720f057815f84b4fe3")
    }
  ],
  "topics": [
    {
      "id": "tuesday_service",
      "terms": [
        "tuesday"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_5d4a85a7867b44cb564c")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6f71a47f71df20ef116c")
        }
      ]
    },
    {
      "id": "tuesday_soup",
      "terms": [
        "tuesday",
        "tomato_soup"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_1b7217448428915424ea")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_67ac4fa5dc574656cfee")
        }
      ]
    },
    {
      "id": "kitchen_failure",
      "terms": [
        "kitchen_failure"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_627a75a61d8a5f58d911")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ca44219f3647ba1ab625")
        }
      ]
    },
    {
      "id": "arthur_privacy",
      "terms": [
        "arthur_finch"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_d8a46908f3dab6c44c97")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b5e465126cdc4fa8600e")
        }
      ]
    },
    {
      "id": "receipt_privacy",
      "terms": [
        "receipt"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0b56f470ab7689b50673")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_878df334b86789350670")
        }
      ]
    },
    {
      "id": "consent_general",
      "terms": [
        "consent"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_90cd620d2696f01e59ea")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_0caeb4a6e5d630b200aa")
        }
      ]
    },
    {
      "id": "arthur_receipt",
      "terms": [
        "arthur_finch",
        "consent"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "receipt_received"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_243b01214122a1af546a")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_2f546759df1bbca95d53")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_7c43507e2962a07b9ab4")
        }
      ]
    },
    {
      "id": "wine_general",
      "terms": [
        "red_wine"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_c655e79df22891059270")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8b2085f74dfa9c78a23b"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_306a0e9e06c845c55d64")
        }
      ]
    }
  ]
};
export const ALIBI_CLUB_CONTACT = {
  "id": "alibi_tuesday_club",
  "caseId": "borrowed_alibi",
  "number": "428",
  "name": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e3b7fbadff64acdaace3"),
  "requiresKeyword": "club_phone",
  "choicePrompt": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_45d2a4d6e02907eadb33"),
  "greeting": [
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ddf5ec39f34a832c7f58")
    },
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_b77be4d1eec62b101bf8")
    },
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_851910f82381b1e859c4")
    }
  ],
  "fallback": [
    {
      "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
      "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8bf9f3a1636b8002624c")
    }
  ],
  "topics": [
    {
      "id": "club_general",
      "terms": [
        "alibi_club"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_bf5dc14db70deffbd6be")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_24e0c2c308c4d51bb936")
        }
      ]
    },
    {
      "id": "club_dinner_pitch",
      "terms": [
        "dinner_package"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "club_pitch_heard"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_890e58317a2aa91b3d0b")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_ffd965de3aacd61cfa1e"),
          "fragments": [
            __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_204476320ac565be366e"),
            {
              "keywordId": "respectable_witness",
              "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_15e40dad60c34d938071")
            },
            __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a1b2f90afb579ebdd4ba")
          ]
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_5bf220c701bcd4c3fb11"),
          "fragments": [
            __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_eaa7022c46739359a3ac"),
            {
              "keywordId": "sample",
              "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_61059a5e4686e0bf046b")
            },
            __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_062e8d3770b4c85a9197")
          ]
        }
      ]
    },
    {
      "id": "club_companion",
      "terms": [
        "respectable_witness"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "club_witness_claim"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_896dc7e5b47c46ce0791")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a4c0d2e30ec98ae7dfcf")
        }
      ]
    },
    {
      "id": "club_sample",
      "terms": [
        "sample"
      ],
      "requiresFlags": [
        "club_pitch_heard"
      ],
      "grantKeywords": [],
      "grantFlags": [
        "club_sample_received"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_d870340a78c40c40040e")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3b2da7640c40b86af3a9")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_5636cafd3786ad1cc22d")
        }
      ]
    },
    {
      "id": "club_sample_named",
      "terms": [
        "dinner_package",
        "sample"
      ],
      "requiresFlags": [
        "club_pitch_heard"
      ],
      "grantKeywords": [],
      "grantFlags": [
        "club_sample_received"
      ],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_8a32f788a58f5bf242ad")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_6d8936b448acfd3b14fe")
        }
      ]
    },
    {
      "id": "club_privacy_arthur",
      "terms": [
        "arthur_finch"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_44dd7b4facef1f9fafaa")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_3ef96040062cfbca6cb6")
        }
      ]
    },
    {
      "id": "club_privacy_evelyn",
      "terms": [
        "evelyn_shaw"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_08b041935798fbf6fd6f"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_dd5896f82c72cfac6ab6")
        },
        {
          "speaker": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_a03a465214aba97f9cc6"),
          "text": __dialogueText("ui/pi-computer/AlibiCaseData.js", "t_e81832014ef5254eeade")
        }
      ]
    }
  ]
};
export function mergeAlibiSearch(data) {
 return {...data,cases:[...(data.cases||[]).filter(c=>c.id!==ALIBI_SEARCH_ID),ALIBI_SEARCH_CASE]};
}
export function mergeAlibiPhone(data) {
 const contacts=[ALIBI_PHONE_CONTACT,ALIBI_CLUB_CONTACT,...ALIBI_INTERVIEW_CONTACTS];
 const ids=new Set(contacts.map(c=>c.id));
 return {...data,contacts:[...(data.contacts||[]).filter(c=>!ids.has(c.id)),...contacts]};
}
