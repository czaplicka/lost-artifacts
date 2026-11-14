import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ---------------------------------------------------------------------------
// ui/NewspaperContent.js
//
// Filler content for the daily newspaper.
// Content is picked deterministically from city + in-game day.
// Newspaper dates use the same starting date as UIScene:
// Day 1 = 1 April 1990.
// ---------------------------------------------------------------------------

import { gameState } from '../GameData.js';

export function hashString(value) {
  let h = 2166136261;
  const text = String(value);

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === 'string'
    ? hashString(seed)
    : seed >>> 0;

  return () => {
    a = (a + 0x6D2B79F5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne(pool, rng) {
  return pool[Math.floor(rng() * pool.length)];
}

export function pickMany(pool, count, rng) {
  const copy = [...pool];
  const out = [];

  while (out.length < count && copy.length) {
    out.push(
      copy.splice(
        Math.floor(rng() * copy.length),
        1
      )[0]
    );
  }

  return out;
}

const WEEKDAYS = [
  __dialogueText("ui/NewspaperContent.js", "t_873fef760e5d001ba0a8"),
  __dialogueText("ui/NewspaperContent.js", "t_6a00dfc1dc867e8454c2"),
  __dialogueText("ui/NewspaperContent.js", "t_7d8af1de1262f150187d"),
  __dialogueText("ui/NewspaperContent.js", "t_c0a6cc829cd087352947"),
  __dialogueText("ui/NewspaperContent.js", "t_fc2662062ffdef961002"),
  __dialogueText("ui/NewspaperContent.js", "t_e21f3f372a46d4be7b49"),
  __dialogueText("ui/NewspaperContent.js", "t_dbe35c7363c2f7ec747b")
];

const MONTHS = [
  __dialogueText("ui/NewspaperContent.js", "t_37082e68df858e0ba764"),
  __dialogueText("ui/NewspaperContent.js", "t_c877c6ff405ec29ca3d0"),
  __dialogueText("ui/NewspaperContent.js", "t_9d95a2cf0d7180b50896"),
  __dialogueText("ui/NewspaperContent.js", "t_4afe6ea150d532c17693"),
  __dialogueText("ui/NewspaperContent.js", "t_8c78fe5b9936488c1117"),
  __dialogueText("ui/NewspaperContent.js", "t_d5808c0e0a479813fafc"),
  __dialogueText("ui/NewspaperContent.js", "t_e9cf7a1ca4a760843ff3"),
  __dialogueText("ui/NewspaperContent.js", "t_a66d8970e569a944234c"),
  __dialogueText("ui/NewspaperContent.js", "t_cd559ea0abca085ef144"),
  __dialogueText("ui/NewspaperContent.js", "t_fdd791787b64d22386b9"),
  __dialogueText("ui/NewspaperContent.js", "t_9de6fe1d72659daec67e"),
  __dialogueText("ui/NewspaperContent.js", "t_8fb204ca460968479407")
];

// Matches UIScene.startDate.
// monthIndex is zero-based: 3 = April.
const GAME_START_DATE = Object.freeze({
  year: 1990,
  monthIndex: 3,
  day: 1
});

function normalizeDay(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 1) {
    return null;
  }

  return Math.floor(number);
}

export function formatEdition(day) {
  // An explicit day preserves the date of a selected issue.
  // Without one, use the current day from the saved game state.
  const safeDay =
    normalizeDay(day) ??
    normalizeDay(gameState.currentDay) ??
    normalizeDay(gameState.day) ??
    1;

  const date = new Date(
    Date.UTC(
      GAME_START_DATE.year,
      GAME_START_DATE.monthIndex,
      GAME_START_DATE.day + safeDay - 1
    )
  );

  return {
    date: [
      `${WEEKDAYS[date.getUTCDay()]},`,
      date.getUTCDate(),
      MONTHS[date.getUTCMonth()],
      date.getUTCFullYear()
    ].join(' '),

    volume: `${__dialogueText("ui/NewspaperContent.js", "t_b624f40c5c0556e4d39a")}${40 + safeDay}`
  };
}

export const EARS_LEFT = [
  __dialogueText("ui/NewspaperContent.js", "t_8eb894eb4c996c7f41f6"),
  __dialogueText("ui/NewspaperContent.js", "t_0dd541411b548d7e6401"),
  __dialogueText("ui/NewspaperContent.js", "t_f4ceb8f3c254c0345e25"),
  __dialogueText("ui/NewspaperContent.js", "t_bf21523dbcf1007d4c73"),
  __dialogueText("ui/NewspaperContent.js", "t_117821e31c97bd479d4d")
];

export const EARS_RIGHT = [
  __dialogueText("ui/NewspaperContent.js", "t_bb5f4cd2c702ee301d7e"),
  __dialogueText("ui/NewspaperContent.js", "t_c03ec2c29ecaf902d836"),
  __dialogueText("ui/NewspaperContent.js", "t_1a73905ba2158277ba2b"),
  __dialogueText("ui/NewspaperContent.js", "t_64c0c8476c1b97d20e2b"),
  __dialogueText("ui/NewspaperContent.js", "t_ad6c70b614553bf95812")
];

export const SECTION_LABELS_TOP = [
  __dialogueText("ui/NewspaperContent.js", "t_ae2eec31840861e56445"),
  __dialogueText("ui/NewspaperContent.js", "t_309c9082b12eb59db821"),
  __dialogueText("ui/NewspaperContent.js", "t_2d8df74f9a44a32adc81"),
  'NEWS-ISH',
  __dialogueText("ui/NewspaperContent.js", "t_6eae73c01cd1e8848854")
];

export const SECTION_LABELS_BOTTOM = [
  'ELSEWHERE',
  'MEANWHILE',
  __dialogueText("ui/NewspaperContent.js", "t_f4983d6f0603dbf10fc5"),
  __dialogueText("ui/NewspaperContent.js", "t_4d3858e8bdc300b08f91"),
  'BRIEFLY'
];

export const PULL_QUOTE_SOURCES = [
  __dialogueText("ui/NewspaperContent.js", "t_c672e82d920a7f4561b2"),
  __dialogueText("ui/NewspaperContent.js", "t_f09e30851ec8f696902a"),
  __dialogueText("ui/NewspaperContent.js", "t_f62dda566c4222ca3373"),
  __dialogueText("ui/NewspaperContent.js", "t_9579b3242d294b086653"),
  __dialogueText("ui/NewspaperContent.js", "t_1d92ed1a2ad35d38d98a")
];

export const WEATHER_TODAY = {
  sun: __dialogueText("ui/NewspaperContent.js", "t_7ca8030e34e80b6c8183"),
  cloud: __dialogueText("ui/NewspaperContent.js", "t_d95fb6b9aae44a0b36dd"),
  rain: __dialogueText("ui/NewspaperContent.js", "t_369405e43fad88dbf320"),
  storm: __dialogueText("ui/NewspaperContent.js", "t_56d544fa22ed2d1963c9")
};

export const WEATHER_TOMORROW = [
  __dialogueText("ui/NewspaperContent.js", "t_2242e906c96545cf6974"),
  __dialogueText("ui/NewspaperContent.js", "t_784d4ef99fa4b2d6c3c8"),
  __dialogueText("ui/NewspaperContent.js", "t_fb9769c8cde7dc47b5da"),
  __dialogueText("ui/NewspaperContent.js", "t_f6e9b8ad5bd58009013c"),
  __dialogueText("ui/NewspaperContent.js", "t_ac5dc59d27d7859ef584"),
  __dialogueText("ui/NewspaperContent.js", "t_ab42050d47ec92e8a941")
];

export const WEATHER_TOP_NEWS = [
  __dialogueText("ui/NewspaperContent.js", "t_b4f51ea72562a4a61c20"),
  __dialogueText("ui/NewspaperContent.js", "t_1fc5251dcaa9c1eb0238"),
  __dialogueText("ui/NewspaperContent.js", "t_e33ae180b992cd9e8aec"),
  __dialogueText("ui/NewspaperContent.js", "t_474134e402f2c5cb6ed6"),
  __dialogueText("ui/NewspaperContent.js", "t_38f18e6e8c3fb27f279b"),
  __dialogueText("ui/NewspaperContent.js", "t_410a534c15de5f093ab1")
];

export const CLASSIFIEDS = [
  {
    head: 'WANTED',
    text: __dialogueText("ui/NewspaperContent.js", "t_49b4c929e2a63b322c41")
  },
  {
    head: __dialogueText("ui/NewspaperContent.js", "t_7a92c1282184517a763a"),
    text: __dialogueText("ui/NewspaperContent.js", "t_c533feaeb7b01ac4a92d")
  },
  {
    head: 'LOST',
    text: __dialogueText("ui/NewspaperContent.js", "t_6bcce70b6b4850ff5265")
  },
  {
    head: 'WANTED',
    text: __dialogueText("ui/NewspaperContent.js", "t_7b6f44114c7ec013061c")
  },
  {
    head: __dialogueText("ui/NewspaperContent.js", "t_7a92c1282184517a763a"),
    text: __dialogueText("ui/NewspaperContent.js", "t_672f90627ca4174381c1")
  },
  {
    head: 'FOUND',
    text: __dialogueText("ui/NewspaperContent.js", "t_9829c9f478d2352d56e2")
  },
  {
    head: 'LESSONS',
    text: __dialogueText("ui/NewspaperContent.js", "t_abb89c01e708c66dc936")
  },
  {
    head: __dialogueText("ui/NewspaperContent.js", "t_7bfbb59b8fed5b44fd5b"),
    text: __dialogueText("ui/NewspaperContent.js", "t_3940682b53b2136d1c37")
  },
  {
    head: 'LOST',
    text: __dialogueText("ui/NewspaperContent.js", "t_b04ef72e997ad8bab4bc")
  },
  {
    head: 'NOTICE',
    text: __dialogueText("ui/NewspaperContent.js", "t_fcd32954bc7564d08087")
  },
  {
    head: 'WANTED',
    text: __dialogueText("ui/NewspaperContent.js", "t_dba7a0fb2f723b37bbc6")
  },
  {
    head: 'FOUND',
    text: __dialogueText("ui/NewspaperContent.js", "t_c85aacf7f4562df4546e")
  },
  {
    head: __dialogueText("ui/NewspaperContent.js", "t_7a92c1282184517a763a"),
    text: __dialogueText("ui/NewspaperContent.js", "t_a7782fc7c7ad25177f17")
  },
  {
    head: 'PERSONAL',
    text: __dialogueText("ui/NewspaperContent.js", "t_78189d39c95f89687e20")
  }
];

export const TICKER = [
  __dialogueText("ui/NewspaperContent.js", "t_dc0e7a0cbbd186d7e17b"),
  __dialogueText("ui/NewspaperContent.js", "t_dbd77bb13637d15d603a"),
  __dialogueText("ui/NewspaperContent.js", "t_740ea641916c976bb6a5"),
  __dialogueText("ui/NewspaperContent.js", "t_5ff1d0f6d47a5132b48f"),
  __dialogueText("ui/NewspaperContent.js", "t_5738a50b50c5cc13f868"),
  __dialogueText("ui/NewspaperContent.js", "t_38a7e3c212ea84d99337"),
  __dialogueText("ui/NewspaperContent.js", "t_19d18c2dc6060cd64cdf"),
  __dialogueText("ui/NewspaperContent.js", "t_cf6e33e903c6ca29ebba")
];

// kinds: boxed | burst | banner
export const ADS = [
  {
    kind: 'boxed',
    head: __dialogueText("ui/NewspaperContent.js", "t_9246fca97ffafae56410"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_2cabdb223f9f8c2ed05e"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_19f8dbe68a91bee745f8")
  },
  {
    kind: 'burst',
    head: __dialogueText("ui/NewspaperContent.js", "t_defc1859d10683740e97"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_1d6e48941d96b367d2eb"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_75e32d12af38b1935266")
  },
  {
    kind: 'boxed',
    head: __dialogueText("ui/NewspaperContent.js", "t_50a11a59f1b9b6b70016"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_1323a4b6eaf5ddd8e401"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_a676677226d0e3f3ec78")
  },
  {
    kind: 'banner',
    head: __dialogueText("ui/NewspaperContent.js", "t_b3a372fa5cf56521426b"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_63645b4c91c49bd236ee"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_cf90c4804b3359f92f38")
  },
  {
    kind: 'burst',
    head: __dialogueText("ui/NewspaperContent.js", "t_775653072817f6d0c39d"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_fb825b59a84a400a3d49"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_d8e1c18612f1b7fb4328")
  },
  {
    kind: 'boxed',
    head: __dialogueText("ui/NewspaperContent.js", "t_9c2148a6a13032ab5dc1"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_4cf8e0f3425e10a782e2"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_ff834283d5a7fae08b7d")
  },
  {
    kind: 'banner',
    head: __dialogueText("ui/NewspaperContent.js", "t_9c0a20976c29fc4206a4"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_79a4946652f15fa36ee8"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_eb310c5b4b4db2759225")
  },
  {
    kind: 'boxed',
    head: __dialogueText("ui/NewspaperContent.js", "t_a2ac4c1ce00bbf2e80b2"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_23afc16d22a23159bc15"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_22343a19e5f77ae38850")
  },
  {
    kind: 'burst',
    head: __dialogueText("ui/NewspaperContent.js", "t_31077e6f3da3fce97974"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_ead393b466838225cf00"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_efa05e80b8f98f9c58e2")
  },
  {
    kind: 'banner',
    head: __dialogueText("ui/NewspaperContent.js", "t_38d7899e06b50be8c8e4"),
    sub: __dialogueText("ui/NewspaperContent.js", "t_2c846435af5e3c044a0c"),
    fine: __dialogueText("ui/NewspaperContent.js", "t_99c5e634b81711f4434b")
  }
];

// Three panels each: who = 'pete' (the detective) or 'pigeon'.
export const COMICS = [
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_8442eea3857af80c46b8") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_b2fbe4010b5b7b8c6f7e") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_79a42343687df7c9f2ae") }
  ],
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_9691eb2820ae468d9383") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_ada64e951babd8089614") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_71f44be3ee8e03c8aa8d") }
  ],
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_d0233cf044161dab5517") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_e99ab09264c652d77051") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_4c5ea8c6cbfd9552cdbb") }
  ],
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_dfb856a83bb021ff8691") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_ab6407273ed5746c9168") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_25e7e5cc09fbf52886bf") }
  ],
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_9f7836ef1dabbeade770") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_318c660c5ba27f5d5886") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_65e8a992e61d0a7bf395") }
  ],
  [
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_3f14581b5f5fd6aac330") },
    { who: 'pigeon', say: __dialogueText("ui/NewspaperContent.js", "t_2d044fd49830ad1b65b1") },
    { who: 'pete', say: __dialogueText("ui/NewspaperContent.js", "t_42ebae1c3edaea89fbe8") }
  ]
];