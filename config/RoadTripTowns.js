/**
 * RoadTripTowns.js
 *
 * Pure data for the "drive to another town" mini-trips:
 * towns (funny names), biomes (palettes + scenery), obstacles, flavour text.
 *
 * To add a new town: add one entry to ROAD_TRIP_TOWNS. Nothing else needed.
 * Map coordinates are 0..1000 and are ONLY used to compute distance
 * (and can be reused by your map UI to place the pins).
 */

export const HOME_TOWN_ID = 'home_town';

export const ROAD_TRIP_TOWNS = {
  home_town: {
    id: 'home_town',
    name: 'Home Town',
    short: 'HOME TOWN',
    tagline: 'Population: you, one landlord and a suspicious pigeon.',
    biome: 'meadow',
    weather: 'clear',
    map: { x: 500, y: 560 },
    gate: 'WELCOME TO HOME TOWN\nThe fridge is empty.',
    leaving: 'NOW LEAVING HOME TOWN. DID YOU TURN OFF THE STOVE?',
    arrival: 'Home Town. Same pigeon. Same suspicion.',
    signs: ['HOME TOWN: WE HAVE A HOME. ALSO A TOWN.']
  },

  dont_remember_city: {
    id: 'dont_remember_city',
    name: "Don't Remember City",
    short: "DON'T REMEMBER",
    tagline: 'Founded in... something. By someone. Probably.',
    biome: 'pine',
    weather: 'fog',
    map: { x: 270, y: 330 },
    gate: "WELCOME TO DON'T REMEMBER CITY\nHave you been here before? We haven't either.",
    leaving: "NOW LEAVING DON'T REMEMBER CITY. YOU WERE NEVER HERE.",
    arrival: "Don't Remember City. Dino says we've never been here. Dino is wrong.",
    signs: ['MAYOR: SOMEONE. VOTE: WHENEVER.', 'DEJA VU AHEAD. AGAIN.']
  },

  whateverville: {
    id: 'whateverville',
    name: 'WhateverVille',
    short: 'WHATEVERVILLE',
    tagline: 'Motto: "Sure. Fine."',
    biome: 'desert',
    weather: 'clear',
    map: { x: 760, y: 340 },
    gate: 'WELCOME TO WHATEVERVILLE\nSure. Fine.',
    leaving: 'NOW LEAVING WHATEVERVILLE. OR DON\'T. WHATEVER.',
    arrival: 'WhateverVille. Nobody greeted us. Nobody cared. Perfect.',
    signs: ['WHATEVERVILLE TOURIST OFFICE: CLOSED. OR OPEN. WHATEVER.']
  },

  something_upon_something: {
    id: 'something_upon_something',
    name: 'Something upon Something',
    short: 'SOMETHING/SOMETHING',
    tagline: 'Not to be confused with Something upon Somewhere.',
    biome: 'coast',
    weather: 'clear',
    map: { x: 180, y: 650 },
    gate: 'WELCOME TO SOMETHING UPON SOMETHING\nNot to be confused with Something upon Somewhere.',
    leaving: 'NOW LEAVING SOMETHING UPON SOMETHING. ON SOMETHING.',
    arrival: 'Something upon Something. We are upon it. Probably.',
    signs: ['SOMETHING UPON SOMETHING: A TOWN OF TWO HALVES. BOTH SOMETHING.']
  },

  mildly_damp: {
    id: 'mildly_damp',
    name: 'Mildly Damp',
    short: 'MILDLY DAMP',
    tagline: 'It rained here once in 1987. The town never moved on.',
    biome: 'coast',
    weather: 'rain',
    map: { x: 620, y: 820 },
    gate: 'WELCOME TO MILDLY DAMP\nIt rained once. We still talk about it.',
    leaving: 'NOW LEAVING MILDLY DAMP. BRING A TOWEL. ANY TOWEL.',
    arrival: 'Mildly Damp. Mildly cold. Mildly regretting this.',
    signs: ['MILDLY DAMP: WET, BUT MAKE IT TOURISM.']
  },

  nothing_to_see_here: {
    id: 'nothing_to_see_here',
    name: 'Nothing To See Here',
    short: 'NOTHING TO SEE',
    tagline: 'Population: [REDACTED]',
    biome: 'night',
    weather: 'clear',
    map: { x: 860, y: 640 },
    gate: 'WELCOME TO NOTHING TO SEE HERE\nPopulation: [REDACTED]',
    leaving: 'NOW LEAVING NOTHING TO SEE HERE. STILL NOTHING.',
    arrival: 'Nothing To See Here. Which is exactly what a detective wants to hear.',
    signs: ['NOTHING TO SEE HERE. MOVE ALONG. WE MEAN IT.']
  },

  upper_downington: {
    id: 'upper_downington',
    name: 'Upper Downington',
    short: 'UPPER DOWNINGTON',
    tagline: 'Slightly above sea level. Slightly below expectations.',
    biome: 'snow',
    weather: 'clear',
    map: { x: 420, y: 160 },
    gate: 'WELCOME TO UPPER DOWNINGTON\nSlightly above sea level. Below expectations.',
    leaving: 'NOW LEAVING UPPER DOWNINGTON. DOWN IS THAT WAY. OR UP.',
    arrival: 'Upper Downington. It is cold. It is also upside down. Somehow.',
    signs: ['UPPER DOWNINGTON: THE LOWER TOWN IS UP THE HILL.']
  },

  are_we_there_yet: {
    id: 'are_we_there_yet',
    name: 'Are We There Yet',
    short: 'ARE WE THERE YET',
    tagline: 'Yes. Finally. Yes.',
    biome: 'pine',
    weather: 'clear',
    map: { x: 130, y: 120 },
    gate: 'YES.\nWelcome to Are We There Yet.',
    leaving: 'NOW LEAVING ARE WE THERE YET. ARE WE LEAVING YET?',
    arrival: 'Are We There Yet. Yes. Dino asked. Dino was right.',
    signs: ['ARE WE THERE YET? 12 KM. MAYBE 1200.']
  }
};

export const ROAD_TRIP_TOWN_LIST = Object.values(ROAD_TRIP_TOWNS);

export function getTown(id) {
  return ROAD_TRIP_TOWNS[id] || ROAD_TRIP_TOWNS[HOME_TOWN_ID];
}

/**
 * Biome palettes. Colours are 0xRRGGBB.
 * decor: [textureKey, scaleMultiplier] picked randomly for roadside scenery.
 */
export const BIOMES = {
  meadow: {
    id: 'meadow', skyTop: 0x6fa8dc, skyBottom: 0xd2ebf8,
    hillFar: 0x8db87c, hill: 0x6b9a5a, hillAmp: 1,
    grassA: 0x4f8f3a, grassB: 0x468334,
    roadA: 0x5b5b5f, roadB: 0x555559,
    rumbleA: 0xe6e6e6, rumbleB: 0xc0392b, line: 0xf4e7c1,
    sun: 0xfff2b0, curve: 1.0, darkness: 0, stars: false,
    decor: [['drv_tree_round', 3.6], ['drv_tree_round', 3.2], ['drv_bush', 2.2], ['drv_rock', 1.6]]
  },
  pine: {
    id: 'pine', skyTop: 0x8fb3c9, skyBottom: 0xdbe6ea,
    hillFar: 0x5c8a78, hill: 0x2f5a4a, hillAmp: 1.4,
    grassA: 0x3d6b3a, grassB: 0x376234,
    roadA: 0x55565b, roadB: 0x505156,
    rumbleA: 0xdedede, rumbleB: 0xb53a2e, line: 0xf4e7c1,
    sun: 0xfff2d0, curve: 1.25, darkness: 0, stars: false,
    decor: [['drv_pine', 4.0], ['drv_pine', 3.4], ['drv_rock', 1.8], ['drv_bush', 2.0]]
  },
  desert: {
    id: 'desert', skyTop: 0xf2a65a, skyBottom: 0xfbe3b0,
    hillFar: 0xd9a066, hill: 0xb8763e, hillAmp: 0.8,
    grassA: 0xd9b26f, grassB: 0xcfa862,
    roadA: 0x6b5f55, roadB: 0x655a50,
    rumbleA: 0xe9dcc0, rumbleB: 0xa8452f, line: 0xf7e9b8,
    sun: 0xfff0a8, curve: 0.7, darkness: 0, stars: false,
    decor: [['drv_cactus', 3.2], ['drv_cactus', 2.6], ['drv_rock', 2.0]]
  },
  coast: {
    id: 'coast', skyTop: 0x5db7e8, skyBottom: 0xd9f1fb,
    hillFar: 0x7fc3d6, hill: 0x4aa3b8, hillAmp: 0.25,
    grassA: 0xe8d8a0, grassB: 0xe0cf94,
    roadA: 0x58595e, roadB: 0x525358,
    rumbleA: 0xeeeeee, rumbleB: 0x2d6cdf, line: 0xfff6d0,
    sun: 0xfffbd0, curve: 0.9, darkness: 0, stars: false,
    decor: [['drv_palm', 3.8], ['drv_palm', 3.2], ['drv_bush', 2.0], ['drv_rock', 1.6]]
  },
  night: {
    id: 'night', skyTop: 0x0a0f2a, skyBottom: 0x2b2f5c,
    hillFar: 0x1c2347, hill: 0x121835, hillAmp: 1,
    grassA: 0x1d3b2a, grassB: 0x1a3426,
    roadA: 0x2c2c34, roadB: 0x2a2a31,
    rumbleA: 0x9a9aa6, rumbleB: 0x7a2a2a, line: 0xe3d9a8,
    sun: 0xdfe6ff, curve: 1.1, darkness: 0.38, stars: true,
    decor: [['drv_lamp', 4.0], ['drv_house', 3.0], ['drv_pine', 3.4], ['drv_lamp', 4.0]]
  },
  snow: {
    id: 'snow', skyTop: 0xb7c7d6, skyBottom: 0xeef3f7,
    hillFar: 0xdde7f0, hill: 0xc3d1de, hillAmp: 1.2,
    grassA: 0xf4f8fb, grassB: 0xe6eef4,
    roadA: 0x6a6e78, roadB: 0x646872,
    rumbleA: 0xffffff, rumbleB: 0xb5473a, line: 0xf4f0d6,
    sun: 0xffffff, curve: 1.0, darkness: 0, stars: false,
    decor: [['drv_pine_snow', 4.0], ['drv_pine_snow', 3.4], ['drv_rock', 1.8]]
  }
};

/**
 * Obstacles. r = collision half-width in lane units, vx = crossing speed (lanes/s),
 * biomes: which biomes may spawn it ('all' = everywhere).
 */
export const OBSTACLES = [
  {
    id: 'pothole', key: 'drv_pothole', s: 1.9, r: 0.30, vx: 0, biomes: ['all'],
    hitLines: ['That pothole had a name. Gary.', 'Pothole: 1. Suspension: 0.', 'We just invented a new shortcut. Underground.']
  },
  {
    id: 'cone', key: 'drv_cone', s: 2.4, r: 0.22, vx: 0, biomes: ['all'],
    hitLines: ['Cones are the road\'s way of saying "no".', 'Traffic cone: now a hood ornament.', 'Roadworks. The only work that never ends.']
  },
  {
    id: 'cow', key: 'drv_cow', s: 2.3, r: 0.38, vx: 0.18, biomes: ['meadow', 'pine'],
    hitLines: ['The cow is fine. The cow is judging us.', 'Moo. Which is cow for "see you in court".', 'That cow had right of way. And a lawyer.']
  },
  {
    id: 'chicken', key: 'drv_chicken', s: 2.4, r: 0.22, vx: 0.55, biomes: ['all'],
    hitLines: ['Why did the chicken cross the road? To ruin us.', 'Feathers everywhere. Nobody is hurt. Except pride.', 'The chicken escaped. The chicken has seen too much.']
  },
  {
    id: 'tumbleweed', key: 'drv_tumble', s: 2.2, r: 0.30, vx: 0.35, biomes: ['desert'],
    hitLines: ['Tumbleweed. The desert\'s only rumour.', 'Nothing hurts like a very dramatic bush.']
  },
  {
    id: 'crab', key: 'drv_crab', s: 2.2, r: 0.30, vx: 0.6, biomes: ['coast'],
    hitLines: ['A crab. On the road. Of course.', 'The crab regrets nothing. Neither do we. Much.']
  }
];

export const FLAVOUR = {
  dinoIdle: [
    'Are we there yet? Asking for me.',
    'I have no legs long enough for the pedals. You\'re welcome.',
    'Eyes on the road. I\'ll watch the other road.',
    'Statistically, this is a road.',
    'I could drive. I won\'t. Insurance.',
    'Mind the cows. They know a guy.',
    'Fun fact: I\'m a dinosaur. Nobody asked.',
    'This is why I stay on the dashboard.',
    'Somewhere, a pigeon is judging our route.'
  ],
  dinoClick: [
    'Don\'t poke the dashboard dinosaur.',
    'Rawr. Quietly. Professionally.',
    'I\'m not a toy. I\'m a consultant.',
    'Poke me again and I start billing you.'
  ],
  dinoCoffee: [
    'Coffee! Legally a food group.',
    'Hot. Strong. Slightly suspicious. Perfect.',
    'Caffeine acquired. Responsibility declining.',
    'Energy up. Common sense down.'
  ],
  dinoCoin: ['Ka-ching. Somebody\'s loss.', 'Found money. Ethics pending.'],
  camFlash: [
    'FLASH! That portrait costs $15.',
    'Speed camera. Nice photo, though.',
    'Smile! You were going "a bit" fast.'
  ],
  camSafe: [
    'Dino salutes the speed camera.',
    'The camera blinks. We blink back. Nothing happens.'
  ],
  billboards: [
    'LOST? ASK A LOCAL. THEY ALSO DON\'T KNOW.',
    'MARK AGENCY: WE FIND THINGS. EVENTUALLY.',
    'FREE COFFEE* (*TERMS APPLY. THE TERMS ARE COFFEE.)',
    'SLOW DOWN. THE COWS HAVE LAWYERS.',
    'TRUST NO ONE. EXCEPT PIE.',
    'PIGEONS: UNDEFEATED POSTAL CHAMPIONS.',
    'NEXT GAS STATION: 4 MILES. OR 40. WE LOST COUNT.',
    'HONK IF YOU LOVE ALIBIS.',
    'THIS BILLBOARD IS INTENTIONALLY LEFT BLANK.'
  ],
  radio: [
    { name: 'ROCK FM 88.1', line: 'Now playing: That Song You Almost Know.' },
    { name: 'SMOOTH JAZZ 94', line: '...saxophone intensifies...' },
    { name: 'NEWS 24/7', line: 'Weather: yes. Traffic: also yes.' },
    { name: 'POLKA BEAT 101', line: 'Oom-pah. Oom-pah. Oom-pah.' },
    { name: 'TRUE CRIME RADIO', line: 'Tonight: who stole the biscuits?' },
    { name: 'STATIC', line: 'kssssshhhhhhh... (that was the best song)' }
  ],
  verdicts: {
    perfect: 'Spotless. Dino awards you five out of five pebbles.',
    minor: 'Minor dents. Major excuses.',
    major: 'The car has seen things. Mostly cows.',
    autopilot: 'Dino drove. Dino has no license. Dino regrets nothing.'
  }
};