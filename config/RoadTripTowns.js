import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    name: __dialogueText("config/RoadTripTowns.js", "t_c5663ffef988add799c8"),
    short: __dialogueText("config/RoadTripTowns.js", "t_a5c760e0cbd5a7e4ab07"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_80b4975fd96a38677e4f"),
    biome: 'meadow',
    weather: 'clear',
    map: { x: 500, y: 560 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_b183675bce0e92c4ee0d"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_4e4402edd15afa423efe"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_9be3ff583b6e4187c5b3"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_fd96efde88a93bea3c2a")]
  },

  dont_remember_city: {
    id: 'dont_remember_city',
    name: __dialogueText("config/RoadTripTowns.js", "t_d1c73e331df08d428aa8"),
    short: __dialogueText("config/RoadTripTowns.js", "t_d9a9957efbe2878efefd"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_0f0768f89d45916fb5b1"),
    biome: 'pine',
    weather: 'fog',
    map: { x: 270, y: 330 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_cc0009e5e090119cfede"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_3aecca834dea39bc7143"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_c19e28495a4f980cf4ec"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_e10ad8be8e9fa6e834bd"), __dialogueText("config/RoadTripTowns.js", "t_7f11dd35ea916d7726c3")]
  },

  whateverville: {
    id: 'whateverville',
    name: 'WhateverVille',
    short: 'WHATEVERVILLE',
    tagline: __dialogueText("config/RoadTripTowns.js", "t_1c959db695a40e0fe599"),
    biome: 'desert',
    weather: 'clear',
    map: { x: 760, y: 340 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_0a2ec1e72c908a635efd"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_5a679973ac745c4ec0b6"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_3e59b7328bdff3a0bb33"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_635f697ef58dd77c9393")]
  },

  something_upon_something: {
    id: 'something_upon_something',
    name: __dialogueText("config/RoadTripTowns.js", "t_5e0bc0a9eb35f78f8996"),
    short: 'SOMETHING/SOMETHING',
    tagline: __dialogueText("config/RoadTripTowns.js", "t_66ae1fcab85f4aee2c7b"),
    biome: 'coast',
    weather: 'clear',
    map: { x: 180, y: 650 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_2fafd2d677dc085e58e4"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_216b78fe99b0a1ad43c0"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_2c89fa91c7db88955f9b"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_3bba46dce96f75c2627a")]
  },

  mildly_damp: {
    id: 'mildly_damp',
    name: __dialogueText("config/RoadTripTowns.js", "t_df469def67b61fb5ba9c"),
    short: __dialogueText("config/RoadTripTowns.js", "t_271dfc3ffd71851ad8a3"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_db399eeff8d5a3f701be"),
    biome: 'coast',
    weather: 'rain',
    map: { x: 620, y: 820 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_7d2c7ee30ec474047915"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_3d6d156b46c2c713cba2"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_1689a80567fe50d24141"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_2bd6f2cbec6e740db30d")]
  },

  nothing_to_see_here: {
    id: 'nothing_to_see_here',
    name: __dialogueText("config/RoadTripTowns.js", "t_ee8fbc8932df649aff5b"),
    short: __dialogueText("config/RoadTripTowns.js", "t_4b7edfbee586f6fa83c9"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_596c45508666fd3bc79e"),
    biome: 'night',
    weather: 'clear',
    map: { x: 860, y: 640 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_2874fce15aadd6cda78f"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_58c9cd7ffda4263e456b"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_1806b3b488bdddf12aa0"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_4b8a9a8c55b72c20fa22")]
  },

  upper_downington: {
    id: 'upper_downington',
    name: __dialogueText("config/RoadTripTowns.js", "t_16e143060dcb28a59672"),
    short: __dialogueText("config/RoadTripTowns.js", "t_ed6acd6b130e8de44e6e"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_844c25020a27725095c6"),
    biome: 'snow',
    weather: 'clear',
    map: { x: 420, y: 160 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_ae0f68dfa098e10f9976"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_683174685ee6c60c08a8"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_c741a2e7f6ca105ffd54"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_cecb143169bde5ce339e")]
  },

  are_we_there_yet: {
    id: 'are_we_there_yet',
    name: __dialogueText("config/RoadTripTowns.js", "t_ffbc3c5ab44180b0af47"),
    short: __dialogueText("config/RoadTripTowns.js", "t_71bc9847993a6a990d23"),
    tagline: __dialogueText("config/RoadTripTowns.js", "t_d4836a6d48585397c83f"),
    biome: 'pine',
    weather: 'clear',
    map: { x: 130, y: 120 },
    gate: __dialogueText("config/RoadTripTowns.js", "t_c8be822e9977780c6628"),
    leaving: __dialogueText("config/RoadTripTowns.js", "t_4ac35ed337a9a9849186"),
    arrival: __dialogueText("config/RoadTripTowns.js", "t_4340fd3a7caad506e53b"),
    signs: [__dialogueText("config/RoadTripTowns.js", "t_15077bba5fb4a1bf7529")]
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
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_a656e1d26de49ffe6a35"), __dialogueText("config/RoadTripTowns.js", "t_76217e5a32d977a14928"), __dialogueText("config/RoadTripTowns.js", "t_d588ab6ab55031154308")]
  },
  {
    id: 'cone', key: 'drv_cone', s: 2.4, r: 0.22, vx: 0, biomes: ['all'],
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_05ea836b7bdcec1e2aaf"), __dialogueText("config/RoadTripTowns.js", "t_45542f64b58b885b2e19"), __dialogueText("config/RoadTripTowns.js", "t_ac6f5925b8d2e718e3b2")]
  },
  {
    id: 'cow', key: 'drv_cow', s: 2.3, r: 0.38, vx: 0.18, biomes: ['meadow', 'pine'],
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_e7aacded4febadf8efea"), __dialogueText("config/RoadTripTowns.js", "t_fe26dbb0c419ef856b5d"), __dialogueText("config/RoadTripTowns.js", "t_a3639e1d253e4e6dfd10")]
  },
  {
    id: 'chicken', key: 'drv_chicken', s: 2.4, r: 0.22, vx: 0.55, biomes: ['all'],
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_1e4a7f34edf88406ac11"), __dialogueText("config/RoadTripTowns.js", "t_739e84383be4ba86ef9f"), __dialogueText("config/RoadTripTowns.js", "t_e68937d58d230cdb9a20")]
  },
  {
    id: 'tumbleweed', key: 'drv_tumble', s: 2.2, r: 0.30, vx: 0.35, biomes: ['desert'],
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_0b925910b1f8b3420712"), __dialogueText("config/RoadTripTowns.js", "t_27e56f881fc56737c046")]
  },
  {
    id: 'crab', key: 'drv_crab', s: 2.2, r: 0.30, vx: 0.6, biomes: ['coast'],
    hitLines: [__dialogueText("config/RoadTripTowns.js", "t_a9f474be121f7b45308b"), __dialogueText("config/RoadTripTowns.js", "t_952a96d5517b7d573848")]
  }
];

export const FLAVOUR = {
  dinoIdle: [
    __dialogueText("config/RoadTripTowns.js", "t_0e068858eecc13d1a09a"),
    __dialogueText("config/RoadTripTowns.js", "t_07fdc5ce247864028e99"),
    __dialogueText("config/RoadTripTowns.js", "t_3a4ef3bf57541ee989b3"),
    __dialogueText("config/RoadTripTowns.js", "t_6c51289d6789e3405503"),
    __dialogueText("config/RoadTripTowns.js", "t_69e63e86f2cbe8cbc139"),
    __dialogueText("config/RoadTripTowns.js", "t_bff61acbeb8ab6d3089c"),
    __dialogueText("config/RoadTripTowns.js", "t_a8c8beede92efbdd2568"),
    __dialogueText("config/RoadTripTowns.js", "t_289ca800f10d7fbcf968"),
    __dialogueText("config/RoadTripTowns.js", "t_46a586f01ba1d39abbbd")
  ],
  dinoClick: [
    __dialogueText("config/RoadTripTowns.js", "t_f480067e67473a1a49b6"),
    __dialogueText("config/RoadTripTowns.js", "t_e85b65985f461c27be3a"),
    __dialogueText("config/RoadTripTowns.js", "t_bdd3e8effd3736ec7458"),
    __dialogueText("config/RoadTripTowns.js", "t_2c675f7f53b0b000fda3")
  ],
  dinoCoffee: [
    __dialogueText("config/RoadTripTowns.js", "t_76e00b94fc889de86265"),
    __dialogueText("config/RoadTripTowns.js", "t_9aed10856673383166ff"),
    __dialogueText("config/RoadTripTowns.js", "t_c9eeb118c1112d3cf61c"),
    __dialogueText("config/RoadTripTowns.js", "t_312ba4bb9301debdd7f4")
  ],
  dinoCoin: [__dialogueText("config/RoadTripTowns.js", "t_1cedf6f5847d4b12ccab"), __dialogueText("config/RoadTripTowns.js", "t_62ce704ed32dcd0e1b92")],
  camFlash: [
    __dialogueText("config/RoadTripTowns.js", "t_013a693c1bc9a302dbdd"),
    __dialogueText("config/RoadTripTowns.js", "t_fc35817d17319980a27d"),
    __dialogueText("config/RoadTripTowns.js", "t_be0d9c018de6ee76273c")
  ],
  camSafe: [
    __dialogueText("config/RoadTripTowns.js", "t_860c80c48d489ad1a3c3"),
    __dialogueText("config/RoadTripTowns.js", "t_acec9e38236ca01a8f31")
  ],
  billboards: [
    __dialogueText("config/RoadTripTowns.js", "t_e27b2e2c2d56622cdd77"),
    __dialogueText("config/RoadTripTowns.js", "t_d39a6e4ab9207e4cfeca"),
    __dialogueText("config/RoadTripTowns.js", "t_270c83808f23ad03a31e"),
    __dialogueText("config/RoadTripTowns.js", "t_49deaa0110b54b2f4482"),
    __dialogueText("config/RoadTripTowns.js", "t_e11ad16507015e881f14"),
    __dialogueText("config/RoadTripTowns.js", "t_49ac1be09b8fb1aaeeae"),
    __dialogueText("config/RoadTripTowns.js", "t_2f17423fd1772f7be97e"),
    __dialogueText("config/RoadTripTowns.js", "t_3e7a00b8f9b7bf4178bb"),
    __dialogueText("config/RoadTripTowns.js", "t_156825ba4472875cb659")
  ],
  radio: [
    { name: __dialogueText("config/RoadTripTowns.js", "t_2c9520c870f4fa2df8ab"), line: __dialogueText("config/RoadTripTowns.js", "t_cf17673a4d30625e87e3") },
    { name: __dialogueText("config/RoadTripTowns.js", "t_d0ec3a116b2bbb6d2287"), line: __dialogueText("config/RoadTripTowns.js", "t_b5100d661b014f973c69") },
    { name: __dialogueText("config/RoadTripTowns.js", "t_673ee49f7a8ffbd4e101"), line: __dialogueText("config/RoadTripTowns.js", "t_3542ece7eecb60cae16b") },
    { name: __dialogueText("config/RoadTripTowns.js", "t_e0640a4ac1cfc26458e3"), line: __dialogueText("config/RoadTripTowns.js", "t_3a8cbb382761c93bef24") },
    { name: __dialogueText("config/RoadTripTowns.js", "t_cff0ab961e10223c0d1f"), line: __dialogueText("config/RoadTripTowns.js", "t_04cbb97720feef7f6ad8") },
    { name: 'STATIC', line: __dialogueText("config/RoadTripTowns.js", "t_ac6f07013d80667a49bb") }
  ],
  verdicts: {
    perfect: __dialogueText("config/RoadTripTowns.js", "t_2ce852c22f500e29c0dd"),
    minor: __dialogueText("config/RoadTripTowns.js", "t_2e196b402d2d89d0680b"),
    major: __dialogueText("config/RoadTripTowns.js", "t_e7f1c09d51a1809f2f86"),
    autopilot: __dialogueText("config/RoadTripTowns.js", "t_bfdd8c5c8d8bf3cae5b4")
  }
};