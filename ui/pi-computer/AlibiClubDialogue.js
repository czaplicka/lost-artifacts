import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { ALIBI_CLUB_CONTACT } from './AlibiCaseData.js';

const SECRETARY = __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_a03a465214aba97f9cc6");
const line = (speaker, text) => ({ speaker, text });
const you = text => line(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_08b041935798fbf6fd6f"), text);
const secretary = text => line(SECRETARY, text);
const rich = (before, keywordId, text, after = '') => ({
  speaker: SECRETARY,
  text: before + text + after,
  fragments: [before, { keywordId, text }, after]
});

const GREETING = [
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_fda9e98d0bc40223817a")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5af1c0c970dd26717a4a")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_1d2f8943a9edee94e561")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_8fc2c6bc850675af4db1")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_c6e481dae61b44379731"))
];
const FALLBACK = [secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_fedae9eebdbc4754f87e"))];
const OFFER_SAMPLE = rich(
  __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_a9ce5eb2ae2e9f878f71"), 'sample', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_61059a5e4686e0bf046b"), '.'
);
const PITCH = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_e9831c3f76824bc45ebb")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_d2b00342bdaa752c3645")),
  rich(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_3acb980b380e7e8f39d9"), 'respectable_witness', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_15e40dad60c34d938071"), '.'),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5627b76f283ec870513f")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_458ad7b17c145d7c7f0c")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_8992a1a3fd227e69e032")),
  OFFER_SAMPLE,
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_0c9f0f248fe550c27858")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_6191ade7d68a12bbe8b6"))
];
const SEND_SAMPLE = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_ec821399178579f241ee")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_1a8c84dc7241ba86b364")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_10111c8aab1ab1a57b90")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_4ee7351f74031f3c866a"))
];
const FOOTER = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_3833371aee29abc3dbda")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_3d8becf9dcde3c3c555a")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_9cd2c04990085cacf477")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_84ff50e171895de208f9"))
];
const COMPANION = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_1127c2c737cd703f9bda")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_97668dbe0b1178ecc029")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_78e51a9cb6a5595f2092")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_e8acaa205738c0132865")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_8157c6ae46b50f7d5dab")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_deb776fbc363111c0929"))
];
const ARTHUR = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_71c03f9a3ebe84d1131e")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_0c1c46c109a588781a68")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_71d03f3d155ad3888947")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_3e026117934a06ef5386")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_f7d1c3beb415b009df73")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_ad49d1a5366d1125bfd9"))
];
const SILENCE_OFFER = [
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5070520cd09fc4fc5d8a")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_98dd07ccc7e1afd87458")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_08555051dbb46b14a632")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_62d21fd6a641a6f1666b")),
  you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_c1f609d809fd54af5d1e")),
  secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_e2d8594ef10f888a7bc2"))
];

function topic(id, terms, lines, grantFlags = []) {
  return {
    id, terms: [...terms], requiresFlags: [], grantKeywords: [],
    grantFlags, lines
  };
}

export function installAlibiClubDialogue() {
  // mergeAlibiPhone uses this exported contact when loading phone data.
  ALIBI_CLUB_CONTACT.greeting = GREETING;
  ALIBI_CLUB_CONTACT.fallback = FALLBACK;
  ALIBI_CLUB_CONTACT.fallbackVariants = [FALLBACK];
  ALIBI_CLUB_CONTACT.choicePrompt = __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_6deed4bda00a4616fe33");
}

export function selectAlibiClubRule(contact, terms, known, flags, state = gameState) {
  if (contact?.caseId !== 'borrowed_alibi' || contact.number !== '428') return null;
  if (!Array.isArray(terms) || terms.length < 1 || terms.length > 2 ||
      new Set(terms).size !== terms.length || !terms.every(id => known.includes(id))) return null;

  const has = id => terms.includes(id);
  const exact = (...ids) => ids.length === terms.length && ids.every(has);
  const result = (id, lines, grants = []) => topic(id, terms, lines, grants);
  const read = state.piBorrowedAlibi?.read || [];

  if (exact('dinner_package', 'sample_code')) {
    if (!flags.includes('club_sample_received') || !read.includes('alibi_club_sample')) {
      return result('club_reference_enquiry', [
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_7f8cb54724e95a1a7521")),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_f324c78cee87f85e72d4"))
      ]);
    }
    if (flags.includes('alibi_silence_offer_requested')) {
      return result('club_silence_offer_repeat', [
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_0915a9005a549e195a46")),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_9f93c173a784b3b5354e"))
      ]);
    }
    return result('alibi_v3_club_sample_reference', SILENCE_OFFER, ['alibi_silence_offer_requested']);
  }

  if (has('sample') && (terms.length === 1 || exact('sample', 'dinner_package'))) {
    if (!flags.includes('club_pitch_heard')) {
      return result('club_dinner_pitch', [
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_422b3e755f09ef652995")),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_06f1b0b1344735966a42")),
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5f9a2b795615ba6a3d54")),
        ...PITCH.slice(1)
      ], ['club_pitch_heard']);
    }
    if (flags.includes('club_sample_received')) {
      return result('club_sample_already_requested', [
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_a4682cf3304703069172")),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_60bb689816553a2245c7"))
      ]);
    }
    return result(exact('sample') ? 'club_sample' : 'club_sample_named', SEND_SAMPLE, ['club_sample_received']);
  }

  if (exact('dinner_package') || exact('alibi_club', 'dinner_package')) {
    return result('club_dinner_pitch', PITCH, ['club_pitch_heard']);
  }
  if (exact('respectable_witness') || exact('respectable_witness', 'dinner_package')) {
    return result('club_companion', COMPANION, ['club_witness_claim']);
  }
  if (exact('tuesday_package', 'revision_two')) return result('alibi_v3_club_footer', FOOTER);
  if (exact('tuesday_package')) {
    return result('club_tuesday_package', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_da762d35c34339bb5fdc")),
      rich(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_55010596f72110d6a301"), 'dinner_package', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_b6c88235a57a8dd4c3e1"), __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_07910d89014b52f21b55")),
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_7b130cfdb3e926e9e359")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_8a7407c472e899e0b00d"))
    ]);
  }
  if (exact('revision_two')) {
    return result('club_revision_two', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_0b295207aa6a4d429e98")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_ef58c62fe7f96db23b35")),
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_4e4a239cb9186359aa06")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_daf80af5705b6b55da25"))
    ]);
  }
  if (exact('alibi_club') || exact('club_phone')) {
    return result('club_general', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_ea89ece09f247cb6b8be")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_c8feee678adc857ecb32")),
      rich(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_cd75d1f8c91e11261921"), 'dinner_package', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_b6c88235a57a8dd4c3e1"), '?')
    ]);
  }
  if (exact('arthur_finch') || exact('arthur_finch', 'dinner_package')) {
    return result('club_privacy_arthur', ARTHUR);
  }
  for (const [id, name] of [['evelyn_shaw', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_f693eba06ad2594e170c")], ['nora_bell', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_4cca0264ed42816c466a")], ['simon_pike', __dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_95df72b5037a3593588e")]]) {
    if (exact(id) || exact(id, 'dinner_package')) {
      return result(`club_privacy_${id}`, [
        you(`${__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_cc43e38867b76c1974eb")}${name}${__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_704011b979a48af20b7a")}`),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_14333360ff6cd91d5722")),
        you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_a8668ed17598c939cb13")),
        secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_ddc2f0d859c2be29f916"))
      ]);
    }
  }
  if (exact('tomato_soup') || exact('dinner_package', 'tomato_soup')) {
    return result('alibi_v3_club_truth_of_dinner', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_2875c9ed03a50067b097")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_aec57956296f3a74a8f7")),
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_abb65eb007c9f644e77b")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_04dcf8ecd922827f19a2"))
    ]);
  }
  if (exact('copper_spoon') || exact('copper_spoon', 'dinner_package')) {
    return result('club_restaurant', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5b0c333073256c3213b7")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_483cd410587c8723537d")),
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_5258da2c7033da5c4f85")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_758aa1002dda5d14aef2"))
    ]);
  }
  if (exact('sample_code')) {
    return result('club_sample_reference', [
      you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_39ed0835eee2bb987081")),
      secretary(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_02f4033ff77c51ab8e45"))
    ]);
  }
  return result('club_general_enquiry', [you(__dialogueText("ui/pi-computer/AlibiClubDialogue.js", "t_2056d29fa1b22d1ec3be")), ...FALLBACK]);
}
