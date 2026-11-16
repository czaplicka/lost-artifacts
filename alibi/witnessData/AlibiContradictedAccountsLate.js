import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";

export function buildContradictedAccountsLate(kind, c) {
  const { n, v, a, b, t, activity, roles, joke, day } = c;
  const e = (minute, statement, summary) => ({ minute, statement, summary });
  const full = `${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 5)}`;
  const intro = `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_fbb9933a1bffcacef8b5")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_9a3ac9fd1b7c3c418a95")}`;
  let explanation = null;
  let entries;
  switch (kind) {
      case 6:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_ed3bfe7002278e2eab29");
        entries = [
          e(a - 15, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1c4290f8cded54620a09")}${t(a - 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_23121941d5a71b302e82")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f0d7c945aa95f6b94d07")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_5b4724be4f9efd5fe492")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_d2d02f663e52f31b1d15")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_e250656ad6bd536a84fd")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1e028ceff18eaf72e114")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_ebac7fb81d89725cde38")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_d7498a6090fd78af7b7b")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_306632156cb57ac9ec29")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_f8fee35ae6ec211c93f8")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_c9319552b9684c4d4f79"))
        ]; break;
      case 7:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_91c83d6bee7d3a47f6a6");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_2d13fca3987c60174faf")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_71cc473330b72a907e97")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_cfcf991f126d1b8c03ee")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_692017402618752fa36f")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_2143c73036dc620575c6")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_75141046b9b5e3c26eb9")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_655d34423405dd2504ec")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_65016f2077f131af0978")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_f5bcef4c4e4cbd008be2"))
        ]; break;
      case 8:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_63382446795416e4c972");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_43157b590b0f89319d8e")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_f9e250f1d3d27d2deb6c")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_6b76cf74d3dddc3147c7")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_80d0034262bf6f833796")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_1e21c212946865751b91")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9769d2452bc55c759add")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_d77014b5aac4df8c8cf9")}${day - 1}${__dialogueText("alibi/AlibiWitnessData.js", "t_a6e1af5d7905df773c51")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_a8d66866b69a3d804557"))
        ]; break;
      case 9:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_d9155a0f94bdf3753693");
        entries = [
          e(a - 5, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_e11932ba16752ad72c27")}${full}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_22c6c71f1a71b592c474")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_bd593db48acd15ed3d18")),
          e(a - 10, `${__dialogueText("alibi/AlibiWitnessData.js", "t_7c7f0cb2fe0f2e49429a")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_709b5c562ed731502dac")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_086a519fdeedb29a622b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_97d6ba10467da7afbd65")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_67bb0a86b51aa917fd20")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_60342bbe307a99c94916")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_d37221477195af167568")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_9a1bc0432084f52f28a1")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_e484a95dcc85865b7e2b")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_87721689ee42f4415e4a")}${t(b)}${__dialogueText("alibi/AlibiWitnessData.js", "t_5c2cd301e0e3e0669ddb")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_e3ee915a8e8c7aa02d2f")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_d48ac03aa210828b4d21")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_ff96bc55071ab69572d6")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_cc7b00c552ddf2a3e854"))
        ]; break;
      case 10:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_fcb68c6d6ef2b749a2eb");
        entries = [
          e(a - 10, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_1c4290f8cded54620a09")}${t(a - 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_b4359bea7a9904f84ca0")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_53687e3f8271b14cf0de")),
          e(a, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_060c28b810585c25590b")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_b445a373e5c2b97b9522")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_51d3fa492d0eb5945c99")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_cdb4ee2aea69cc6a8333")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_519b994fd42a7b0ed70b")),
          e(b + 15, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3ac73b66a7f1b552aab2")}${roles[1]}${__dialogueText("alibi/AlibiWitnessData.js", "t_ab6f7470218f68cfcb49")}${t(b + 10)}${__dialogueText("alibi/AlibiWitnessData.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_65016f2077f131af0978")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_e174cb6477250f9b9a75"))
        ]; break;
      default:
        explanation = __dialogueText("alibi/AlibiWitnessData.js", "t_a3cfc4685da90e217429");
        entries = [
          e(a - 20, `${intro}${__dialogueText("alibi/AlibiWitnessData.js", "t_36a9e7f1c95b82ffb997")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_7189651207068e54cd8c")}${t(a - 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_737d256b829ff58cad96")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_0a07f659461970d8d8dc")}${activity}${__dialogueText("alibi/AlibiWitnessData.js", "t_4f7dc6c2d7ea7c0c906e")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_351e53f2fc317b1da813")),
          e(a - 5, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_24a4d21301c9c09e919b")}${day}${__dialogueText("alibi/AlibiWitnessData.js", "t_b422cd557561575f92bc")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_0fdd621869d7429c3f7d")}${v}${__dialogueText("alibi/AlibiWitnessData.js", "t_3612916939a48e13fe01")}${t(b + 15)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3e8b3708cd3c0356c77f")}`, __dialogueText("alibi/AlibiWitnessData.js", "t_dda3689355e574370e70")),
          e(b + 20, `${__dialogueText("alibi/AlibiWitnessData.js", "t_d77629c739551f939796")}${t(b + 20)}${__dialogueText("alibi/AlibiWitnessData.js", "t_94fd8d7d3d0ccc77a053")}${roles[0]}${__dialogueText("alibi/AlibiWitnessData.js", "t_4ddb4c13522133b13963")}${t(a - 5)}${__dialogueText("alibi/AlibiWitnessData.js", "t_35d1e483a181d8a201f3")}${n}${__dialogueText("alibi/AlibiWitnessData.js", "t_e38da0fbea90782d6020")}${joke}`, __dialogueText("alibi/AlibiWitnessData.js", "t_57475a87318e9c6be6ad"))
        ];
  }
  return { explanation, entries };
}
