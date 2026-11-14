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
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
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

    volume: `Vol. 67, No. ${40 + safeDay}`
  };
}

export const EARS_LEFT = [
  'ALL THE NEWS THAT FITS',
  'NOW WITH 20% MORE NEWS',
  'ESTD. 1871 (APPROX.)',
  'NOTHING TO SEE HERE',
  'FACT-CHECKED BY A PIGEON'
];

export const EARS_RIGHT = [
  'PRICE: 2 COINS',
  'PRICE: 2 COINS OR 1 PIGEON',
  'FREE WITH SUBSCRIPTION',
  'PRICE: NEGOTIABLE',
  'PRICE: STILL 2 COINS'
];

export const SECTION_LABELS_TOP = [
  'LOCAL COLOR',
  'CITY DESK',
  'OVERHEARD IN TOWN',
  'NEWS-ISH',
  'DEVELOPING (SLOWLY)'
];

export const SECTION_LABELS_BOTTOM = [
  'ELSEWHERE',
  'MEANWHILE',
  'ALSO HAPPENING',
  'FILED UNDER: ODD',
  'BRIEFLY'
];

export const PULL_QUOTE_SOURCES = [
  'a witness',
  'an expert',
  'a pigeon (unconfirmed)',
  'an anonymous source',
  'a very tired official'
];

export const WEATHER_TODAY = {
  sun: 'Sunny. Perfect weather for crime.',
  cloud: 'Overcast, with a chance of suspicion.',
  rain: 'Light drizzle, heavy alibis.',
  storm: 'Thunder. Dramatic music likely.'
};

export const WEATHER_TOMORROW = [
  'More of the same, but louder.',
  'Clear skies, murky motives.',
  'Fog. Visibility: two clues.',
  'Rain. Bring an umbrella and a lawyer.',
  'Scattered pigeons.',
  'Windy. Evidence may blow away.'
];

export const WEATHER_TOP_NEWS = [
  'Everyone is lying (mildly).',
  'Pigeon seen near the scene.',
  'Tea shortage worsens.',
  'Local man correct for once.',
  'Museum café out of cake.',
  'Hat prices on the rise.'
];

export const CLASSIFIEDS = [
  {
    head: 'WANTED',
    text: 'Night guard who stays awake. Perks: none. Must like pigeons.'
  },
  {
    head: 'FOR SALE',
    text: 'Slightly used alibi. One careful owner. Never been questioned.'
  },
  {
    head: 'LOST',
    text: 'Hat. Trench coat attached. Answers to "Hey, you!"'
  },
  {
    head: 'WANTED',
    text: 'Roommate. Must not be the thief. References required.'
  },
  {
    head: 'FOR SALE',
    text: 'Magnifying glass. Great for small print and ants.'
  },
  {
    head: 'FOUND',
    text: 'One mysterious footprint. Owner unknown. Shoe size: dramatic.'
  },
  {
    head: 'LESSONS',
    text: 'Learn to whistle suspiciously. Beginners welcome. Loiterers tolerated.'
  },
  {
    head: 'FOR RENT',
    text: 'Cozy hideout. Secret door included. Landlord asks no questions.'
  },
  {
    head: 'LOST',
    text: 'Parrot. Knows too much. Reward: your continued safety.'
  },
  {
    head: 'NOTICE',
    text: 'The museum café has run out of cake. This is not a clue. Probably.'
  },
  {
    head: 'WANTED',
    text: 'Getaway driver. Must obey traffic laws. We have standards.'
  },
  {
    head: 'FOUND',
    text: 'A rope, a lockpick and a disguise. Please stop asking.'
  },
  {
    head: 'FOR SALE',
    text: 'Wedding ring, never worn. Long story. Do not ask.'
  },
  {
    head: 'PERSONAL',
    text: 'Dave, the pigeon is NOT yours. Stop feeding him your lunch.'
  }
];

export const TICKER = [
  'PIGEON FUTURES +4.2%',
  'COFFEE +3% (AGAIN)',
  'ALIBIS -2% (SUSPICIOUSLY)',
  'TRENCH COATS +12%',
  'LOCKPICKS: NO COMMENT',
  'ARTIFACT INSURANCE: UNAVAILABLE',
  'CAKE: 0 REMAINING',
  'MUSTACHES (FAKE) +7%'
];

// kinds: boxed | burst | banner
export const ADS = [
  {
    kind: 'boxed',
    head: 'MARK AGENCY',
    sub: 'NOW HIRING DETECTIVES',
    fine: 'No experience necessary. Evidently.'
  },
  {
    kind: 'burst',
    head: '50% OFF',
    sub: 'ALL ALIBIS',
    fine: 'While supplies last. They will not.'
  },
  {
    kind: 'boxed',
    head: 'TRENCH COATS',
    sub: 'ONE SIZE FITS ALL SUSPECTS',
    fine: 'Collar sold separately.'
  },
  {
    kind: 'banner',
    head: 'MAGNIFYING GLASSES',
    sub: 'See the bigger picture. Literally.',
    fine: 'Not responsible for burnt ants.'
  },
  {
    kind: 'burst',
    head: 'NEW!',
    sub: 'DISGUISE KIT',
    fine: 'Fake mustache now 30% less obvious.'
  },
  {
    kind: 'boxed',
    head: 'PIGEON INSURANCE',
    sub: 'COVERAGE AGAINST WITNESSES',
    fine: 'Terms apply. Terms also coo.'
  },
  {
    kind: 'banner',
    head: "DR. WATSOFF'S TONIC",
    sub: 'Cures 4 out of 5 deductions.',
    fine: 'The fifth is a hunch.'
  },
  {
    kind: 'boxed',
    head: 'LOCKPICKS & CO.',
    sub: 'FOR EMERGENCIES ONLY',
    fine: 'We have never heard of "burglary".'
  },
  {
    kind: 'burst',
    head: 'FREE!',
    sub: 'ADVICE ON ALIBIS',
    fine: 'Worth every penny.'
  },
  {
    kind: 'banner',
    head: 'SLEEP SOUNDLY',
    sub: 'Our guards are mostly awake.',
    fine: 'Ask about our pigeon patrol.'
  }
];

// Three panels each: who = 'pete' (the detective) or 'pigeon'.
export const COMICS = [
  [
    { who: 'pete', say: 'The thief left no clues.' },
    { who: 'pigeon', say: 'Coo.' },
    { who: 'pete', say: '...He left a witness.' }
  ],
  [
    { who: 'pete', say: 'Elementary: the thief is tall.' },
    { who: 'pete', say: 'And left-handed.' },
    { who: 'pigeon', say: 'That is a coat rack, Pete.' }
  ],
  [
    { who: 'pete', say: 'Where were you at 9 PM?' },
    { who: 'pigeon', say: 'Pigeon things.' },
    { who: 'pete', say: 'Alibi accepted.' }
  ],
  [
    { who: 'pete', say: 'I never lose a case.' },
    { who: 'pete', say: 'I just misplace them.' },
    { who: 'pigeon', say: 'Behind the sofa.' }
  ],
  [
    { who: 'pete', say: 'Crumbs. The thief is hungry.' },
    { who: 'pigeon', say: 'Coo?' },
    { who: 'pete', say: 'Case closed. Mostly.' }
  ],
  [
    { who: 'pete', say: 'My hat is my best lead.' },
    { who: 'pigeon', say: 'Your hat is on fire.' },
    { who: 'pete', say: 'See? Hot lead.' }
  ]
];