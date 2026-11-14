import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const MOMS_CASE_ID = 'pi_moms_not_proud';
export const MOMS_CONTENT_VERSION = 1;

export const MOMS_BRIEFING = Object.freeze({
  id: 'moms_not_proud_client_briefing',
  from: __dialogueText("assets/data/momsNotProudData.js", "t_01de6d6c4eda78bc6139"),
  subject: __dialogueText("assets/data/momsNotProudData.js", "t_dd2efa4d4dcaaca0ccdd"),

  body:
    __dialogueText("assets/data/momsNotProudData.js", "t_22a705e57674f27a7c07") +
    __dialogueText("assets/data/momsNotProudData.js", "t_5a0ce8baf6426547cd74") +
    __dialogueText("assets/data/momsNotProudData.js", "t_cd86072d69a16a43dfb2") +
    __dialogueText("assets/data/momsNotProudData.js", "t_9f4e2bc558fea2e89848") +
    __dialogueText("assets/data/momsNotProudData.js", "t_2d46bddd3f44f7ab2723") +
    __dialogueText("assets/data/momsNotProudData.js", "t_9482daca577032b6dc91") +
    __dialogueText("assets/data/momsNotProudData.js", "t_e3cf5ca0377a45431391") +
    __dialogueText("assets/data/momsNotProudData.js", "t_ed47aca36fef4a3bbed6") +
    __dialogueText("assets/data/momsNotProudData.js", "t_b112c4a90c52f320e867") +
    __dialogueText("assets/data/momsNotProudData.js", "t_020eac64106b33e90dae") +
    __dialogueText("assets/data/momsNotProudData.js", "t_66616aa7a6fde5b520e3") +
    __dialogueText("assets/data/momsNotProudData.js", "t_55c1d841ab69b08657f1") +
    __dialogueText("assets/data/momsNotProudData.js", "t_01de6d6c4eda78bc6139")
});

export const MOMS_OBJECTIVES = Object.freeze([
  Object.freeze({
    id: 'review_briefing',
    text: __dialogueText("assets/data/momsNotProudData.js", "t_e6fd108b7acaee71d995")
  }),

  Object.freeze({
    id: 'document_activity',
    text: __dialogueText("assets/data/momsNotProudData.js", "t_82370c16c74a351d2bc3")
  }),

  Object.freeze({
    id: 'identify_artist',
    text: __dialogueText("assets/data/momsNotProudData.js", "t_89a3e9ccc676320d10c6")
  }),

  Object.freeze({
    id: 'verify_permission',
    text: __dialogueText("assets/data/momsNotProudData.js", "t_3b0210ac401145fbd56a")
  }),

  Object.freeze({
    id: 'submit_report',
    text: __dialogueText("assets/data/momsNotProudData.js", "t_0d7bb48e379f506e6ee7")
  })
]);

export const MOMS_PHOTO_RULES = Object.freeze({
  activity: Object.freeze({
    id: 'activity',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_7970d82a26cb829d3f7f"),

    requiredSubjects: Object.freeze([
      'artist',
      'painting_hand',
      'advertising_panel'
    ]),

    description:
      __dialogueText("assets/data/momsNotProudData.js", "t_6b2262932aa74d3f5e38") +
      __dialogueText("assets/data/momsNotProudData.js", "t_1b680958ee7f93ca465b")
  }),

  identity: Object.freeze({
    id: 'identity',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_a125a54fa5db13f142e1"),

    requiredSubjects: Object.freeze([
      'artist_face'
    ]),

    description:
      __dialogueText("assets/data/momsNotProudData.js", "t_f84bd9cfa5e08c800558") +
      __dialogueText("assets/data/momsNotProudData.js", "t_da535b058d47c29509e2")
  }),

  requireSameObservation: true
});

export const MOMS_IDENTITY_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'raven',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_77efffcc1c7e20c4fe2b"),
    correct: true
  }),

  Object.freeze({
    id: 'vincenzo',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_01de6d6c4eda78bc6139"),
    correct: false
  }),

  Object.freeze({
    id: 'unidentified',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_945716aa1fd1978de4bc"),
    correct: false
  })
]);

export const MOMS_DIALOGUE = Object.freeze([
  Object.freeze({
    id: 'introduction',
    speaker: __dialogueText("assets/data/momsNotProudData.js", "t_9cccdbb77e00a04c314f"),

    text:
      __dialogueText("assets/data/momsNotProudData.js", "t_04a2cc9aaae280b4d94f") +
      __dialogueText("assets/data/momsNotProudData.js", "t_91ad3e6fc97bbb401f63")
  }),

  Object.freeze({
    id: 'surface',
    speaker: __dialogueText("assets/data/momsNotProudData.js", "t_9cccdbb77e00a04c314f"),

    text:
      __dialogueText("assets/data/momsNotProudData.js", "t_48af38283ba3d0da1472") +
      __dialogueText("assets/data/momsNotProudData.js", "t_3c55b608eeb32f393628") +
      __dialogueText("assets/data/momsNotProudData.js", "t_1e02154746928fd37e74")
  }),

  Object.freeze({
    id: 'permission',
    speaker: __dialogueText("assets/data/momsNotProudData.js", "t_9cccdbb77e00a04c314f"),

    text:
      __dialogueText("assets/data/momsNotProudData.js", "t_a6f0c77b8105a4711bf8") +
      __dialogueText("assets/data/momsNotProudData.js", "t_e21211eec122394f78ea") +
      __dialogueText("assets/data/momsNotProudData.js", "t_ff451abb63f93f8d2555")
  }),

  Object.freeze({
    id: 'pigeon',
    speaker: __dialogueText("assets/data/momsNotProudData.js", "t_9cccdbb77e00a04c314f"),

    text:
      __dialogueText("assets/data/momsNotProudData.js", "t_0c19dc30390d8c47f79b") +
      __dialogueText("assets/data/momsNotProudData.js", "t_2ed5309e3ca10cd55eef") +
      __dialogueText("assets/data/momsNotProudData.js", "t_ee6376c0020b2b024aa7")
  })
]);

export const MOMS_DOCUMENT = Object.freeze({
  id: 'moms_signed_proposal',
  title: __dialogueText("assets/data/momsNotProudData.js", "t_76152909866e9164b633"),

  body:
    __dialogueText("assets/data/momsNotProudData.js", "t_f421a7f972b467608d9b") +
    __dialogueText("assets/data/momsNotProudData.js", "t_38ad8b9765ac050fe57b") +
    __dialogueText("assets/data/momsNotProudData.js", "t_406fe95a121640fdee97") +
    __dialogueText("assets/data/momsNotProudData.js", "t_db77cb07519eded40652") +
    __dialogueText("assets/data/momsNotProudData.js", "t_6cda7357dc0e4b1beb57") +
    __dialogueText("assets/data/momsNotProudData.js", "t_fdb0914289cc844a2391") +
    __dialogueText("assets/data/momsNotProudData.js", "t_8c303c6730d6f92c0768") +
    __dialogueText("assets/data/momsNotProudData.js", "t_a461ce9e511ca6f64e6f")
});

export const MOMS_CONCLUSION = Object.freeze({
  question: __dialogueText("assets/data/momsNotProudData.js", "t_e0d94a674be4b2a6c64c"),

  options: Object.freeze([
    Object.freeze({
      id: 'authorised_panel',
      correct: true,

      text:
        __dialogueText("assets/data/momsNotProudData.js", "t_55fe1166b08411c92447") +
        __dialogueText("assets/data/momsNotProudData.js", "t_cb6216db75d9eafb3d06")
    }),

    Object.freeze({
      id: 'criminal_wall_damage',
      correct: false,

      text:
        __dialogueText("assets/data/momsNotProudData.js", "t_101321860e5c4843be30")
    }),

    Object.freeze({
      id: 'unknown_vandal',
      correct: false,

      text:
        __dialogueText("assets/data/momsNotProudData.js", "t_5b4eb469b44f0fc965e5") +
        __dialogueText("assets/data/momsNotProudData.js", "t_64c24037b3583c593502")
    })
  ]),

  correction:
    __dialogueText("assets/data/momsNotProudData.js", "t_63929243cd43605b34ed") +
    __dialogueText("assets/data/momsNotProudData.js", "t_e8e9a46dbd7b39d507f6") +
    __dialogueText("assets/data/momsNotProudData.js", "t_f1c762c55aaf221401ca")
});

export const MOMS_ENDINGS = Object.freeze({
  honest: Object.freeze({
    id: 'honest',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_8575d4a05741e5b00506"),
    integrityEffect: 'honest_report',
    nominalIntegrity: 5,

    report:
      __dialogueText("assets/data/momsNotProudData.js", "t_264518380f9395425488") +
      __dialogueText("assets/data/momsNotProudData.js", "t_1f9ed298282399bd7521") +
      __dialogueText("assets/data/momsNotProudData.js", "t_9bc532ec47f73b375c52") +
      __dialogueText("assets/data/momsNotProudData.js", "t_e1e63946e4fb52af38b6") +
      __dialogueText("assets/data/momsNotProudData.js", "t_18ca1394c512c3916d8b") +
      __dialogueText("assets/data/momsNotProudData.js", "t_cce605a24cf2364b26e5") +
      __dialogueText("assets/data/momsNotProudData.js", "t_4b75b4ed3cbf5ee4836f") +
      __dialogueText("assets/data/momsNotProudData.js", "t_adf37dda08c07359c04e"),

    reply:
      __dialogueText("assets/data/momsNotProudData.js", "t_dc5a7697422ecc2c524f") +
      __dialogueText("assets/data/momsNotProudData.js", "t_423991d9ae9f105ef0a3") +
      __dialogueText("assets/data/momsNotProudData.js", "t_3f4b8ba3a34af4cf9443")
  }),

  conceal: Object.freeze({
    id: 'conceal',
    label: __dialogueText("assets/data/momsNotProudData.js", "t_d8fe5f27d09c3884cc82"),
    integrityEffect: 'concealed_findings',
    nominalIntegrity: -5,

    report:
      __dialogueText("assets/data/momsNotProudData.js", "t_c7642fa30cfb4f11ddfe") +
      __dialogueText("assets/data/momsNotProudData.js", "t_bd6cecee555f97e9d04a") +
      __dialogueText("assets/data/momsNotProudData.js", "t_5a989e8128878b6641db"),

    reply:
      __dialogueText("assets/data/momsNotProudData.js", "t_942dd012fc46e9d4af3f") +
      __dialogueText("assets/data/momsNotProudData.js", "t_23c8d78e827873508a97")
  })
});