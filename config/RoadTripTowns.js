// config/RoadTripTowns.js
// Display text belongs to the dialogue catalog; technical keys stay unchanged.
import { dialogueText } from '../dialogues/DialogueText.js';
const text = id => dialogueText('config/RoadTripTowns.js', id);

export const HOME_TOWN_ID = 'home_town';
export const ROAD_TRIP_TOWNS = {
  home_town: {
    id: "home_town",
    name: text("t_c5663ffef988add799c8"),
    short: text("t_a5c760e0cbd5a7e4ab07"),
    tagline: text("t_80b4975fd96a38677e4f"),
    biome: "meadow", weather: "clear",
    map: { x: 500, y: 560 },
    gate: text("t_b183675bce0e92c4ee0d"),
    leaving: text("t_4e4402edd15afa423efe"),
    arrival: text("t_9be3ff583b6e4187c5b3"),
    signs: [text("t_fd96efde88a93bea3c2a"), text("t_05bfb5b821a167d0386d"), text("t_875af0dc0ccd42cb2634")],
    news: [text("t_a9f161cbc82c8ddfb06d"), text("t_3b7bdd7c211a9b293c64")]
  },
  dont_remember_city: {
    id: "dont_remember_city",
    name: text("t_d1c73e331df08d428aa8"),
    short: text("t_d9a9957efbe2878efefd"),
    tagline: text("t_0f0768f89d45916fb5b1"),
    biome: "pine", weather: "fog",
    map: { x: 270, y: 330 },
    gate: text("t_cc0009e5e090119cfede"),
    leaving: text("t_3aecca834dea39bc7143"),
    arrival: text("t_c19e28495a4f980cf4ec"),
    signs: [text("t_e10ad8be8e9fa6e834bd"), text("t_7f11dd35ea916d7726c3"), text("t_61237c7a22cd1f34dab8"), text("t_563653e64312dbfe8787")],
    news: [text("t_f172dee1f52ee0a09895"), text("t_8be9584188165f60a3ea")]
  },
  whateverville: {
    id: "whateverville",
    name: text("t_3f92eca806f4b0fa3cb0"),
    short: text("t_88c6eda8dee60e9bf991"),
    tagline: text("t_1c959db695a40e0fe599"),
    biome: "desert", weather: "clear",
    map: { x: 760, y: 340 },
    gate: text("t_0a2ec1e72c908a635efd"),
    leaving: text("t_5a679973ac745c4ec0b6"),
    arrival: text("t_3e59b7328bdff3a0bb33"),
    signs: [text("t_635f697ef58dd77c9393"), text("t_9818bac020367f99dea2"), text("t_7efc47e9207f4a74cec7")],
    news: [text("t_cbce781d3c8086156677"), text("t_4ca96662198e6c8b250b")]
  },
  something_upon_something: {
    id: "something_upon_something",
    name: text("t_5e0bc0a9eb35f78f8996"),
    short: text("t_edc2c823567cbd345f48"),
    tagline: text("t_66ae1fcab85f4aee2c7b"),
    biome: "coast", weather: "clear",
    map: { x: 180, y: 650 },
    gate: text("t_2fafd2d677dc085e58e4"),
    leaving: text("t_216b78fe99b0a1ad43c0"),
    arrival: text("t_2c89fa91c7db88955f9b"),
    signs: [text("t_3bba46dce96f75c2627a"), text("t_5d2362600597d70d4ee3"), text("t_4186425b03842d0bdbe1")],
    news: [text("t_ca6e204d67131235226d"), text("t_b5d55725bb83ff6565ef")]
  },
  mildly_damp: {
    id: "mildly_damp",
    name: text("t_df469def67b61fb5ba9c"),
    short: text("t_271dfc3ffd71851ad8a3"),
    tagline: text("t_db399eeff8d5a3f701be"),
    biome: "coast", weather: "rain",
    map: { x: 620, y: 820 },
    gate: text("t_7d2c7ee30ec474047915"),
    leaving: text("t_3d6d156b46c2c713cba2"),
    arrival: text("t_1689a80567fe50d24141"),
    signs: [text("t_2bd6f2cbec6e740db30d"), text("t_cfd60ab434527d3186f0"), text("t_e7e37f520e34a43feec8")],
    news: [text("t_6199dc20b2e2a8405eea"), text("t_c572c5479ffb7b3341d7")]
  },
  nothing_to_see_here: {
    id: "nothing_to_see_here",
    name: text("t_ee8fbc8932df649aff5b"),
    short: text("t_4b7edfbee586f6fa83c9"),
    tagline: text("t_596c45508666fd3bc79e"),
    biome: "night", weather: "clear",
    map: { x: 860, y: 640 },
    gate: text("t_2874fce15aadd6cda78f"),
    leaving: text("t_58c9cd7ffda4263e456b"),
    arrival: text("t_1806b3b488bdddf12aa0"),
    signs: [text("t_4b8a9a8c55b72c20fa22"), text("t_8e81bfd0f7e5e39519b5"), text("t_1733a5ce8d61a02a7387")],
    news: [text("t_e71c0b61e0c331c8324c"), text("t_f0221ea7159ce2654d58")]
  },
  upper_downington: {
    id: "upper_downington",
    name: text("t_16e143060dcb28a59672"),
    short: text("t_ed6acd6b130e8de44e6e"),
    tagline: text("t_844c25020a27725095c6"),
    biome: "snow", weather: "clear",
    map: { x: 420, y: 160 },
    gate: text("t_ae0f68dfa098e10f9976"),
    leaving: text("t_683174685ee6c60c08a8"),
    arrival: text("t_c741a2e7f6ca105ffd54"),
    signs: [text("t_cecb143169bde5ce339e"), text("t_6edaf2b32b155343cdd2"), text("t_55aff5fad25e2efa1828")],
    news: [text("t_4b1550a927332c37edc4"), text("t_43e3d2c25de3d686f8e7")]
  },
  are_we_there_yet: {
    id: "are_we_there_yet",
    name: text("t_ffbc3c5ab44180b0af47"),
    short: text("t_71bc9847993a6a990d23"),
    tagline: text("t_d4836a6d48585397c83f"),
    biome: "pine", weather: "clear",
    map: { x: 130, y: 120 },
    gate: text("t_c8be822e9977780c6628"),
    leaving: text("t_4ac35ed337a9a9849186"),
    arrival: text("t_4340fd3a7caad506e53b"),
    signs: [text("t_15077bba5fb4a1bf7529"), text("t_cdf885c61599afd772f3"), text("t_d25d8969fa11f7ed50d7")],
    news: [text("t_32813156ebd378f3ea01"), text("t_d09a83d2a63794ccd0ba")]
  },
};
export const ROAD_TRIP_TOWN_LIST = Object.values(ROAD_TRIP_TOWNS);
export function getTown(id) {
  return ROAD_TRIP_TOWNS[id] || ROAD_TRIP_TOWNS[HOME_TOWN_ID];
}

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

export const OBSTACLES = [
  { id: "pothole", key: "drv_pothole", s: 1.9, r: 0.3, vx: 0, biomes: ["all"],
    hitLines: [text("t_a656e1d26de49ffe6a35"), text("t_76217e5a32d977a14928"), text("t_d588ab6ab55031154308")] },
  { id: "cone", key: "drv_cone", s: 2.4, r: 0.22, vx: 0, biomes: ["all"],
    hitLines: [text("t_05ea836b7bdcec1e2aaf"), text("t_45542f64b58b885b2e19"), text("t_ac6f5925b8d2e718e3b2")] },
  { id: "cow", key: "drv_cow", s: 2.3, r: 0.38, vx: 0.18, biomes: ["meadow", "pine"],
    hitLines: [text("t_e7aacded4febadf8efea"), text("t_fe26dbb0c419ef856b5d"), text("t_a3639e1d253e4e6dfd10")] },
  { id: "chicken", key: "drv_chicken", s: 2.4, r: 0.22, vx: 0.55, biomes: ["all"],
    hitLines: [text("t_1e4a7f34edf88406ac11"), text("t_739e84383be4ba86ef9f"), text("t_e68937d58d230cdb9a20")] },
  { id: "tumbleweed", key: "drv_tumble", s: 2.2, r: 0.3, vx: 0.35, biomes: ["desert"],
    hitLines: [text("t_0b925910b1f8b3420712"), text("t_27e56f881fc56737c046")] },
  { id: "crab", key: "drv_crab", s: 2.2, r: 0.3, vx: 0.6, biomes: ["coast"],
    hitLines: [text("t_a9f474be121f7b45308b"), text("t_952a96d5517b7d573848")] },
];

export const FLAVOUR = {
  dinoIdle: [
    text("t_0e068858eecc13d1a09a"),
    text("t_07fdc5ce247864028e99"),
    text("t_3a4ef3bf57541ee989b3"),
    text("t_6c51289d6789e3405503"),
    text("t_69e63e86f2cbe8cbc139"),
    text("t_bff61acbeb8ab6d3089c"),
    text("t_a8c8beede92efbdd2568"),
    text("t_289ca800f10d7fbcf968"),
    text("t_46a586f01ba1d39abbbd")
  ],
  dinoClick: [
    text("t_f480067e67473a1a49b6"),
    text("t_e85b65985f461c27be3a"),
    text("t_bdd3e8effd3736ec7458"),
    text("t_2c675f7f53b0b000fda3")
  ],
  dinoCoffee: [
    text("t_76e00b94fc889de86265"),
    text("t_9aed10856673383166ff"),
    text("t_c9eeb118c1112d3cf61c"),
    text("t_312ba4bb9301debdd7f4")
  ],
  dinoCoin: [
    text("t_1cedf6f5847d4b12ccab"),
    text("t_62ce704ed32dcd0e1b92")
  ],
  camFlash: [
    text("t_013a693c1bc9a302dbdd"),
    text("t_fc35817d17319980a27d"),
    text("t_be0d9c018de6ee76273c")
  ],
  camSafe: [
    text("t_860c80c48d489ad1a3c3"),
    text("t_acec9e38236ca01a8f31")
  ],
  billboards: [
    text("t_e27b2e2c2d56622cdd77"),
    text("t_d39a6e4ab9207e4cfeca"),
    text("t_270c83808f23ad03a31e"),
    text("t_49deaa0110b54b2f4482"),
    text("t_e11ad16507015e881f14"),
    text("t_49ac1be09b8fb1aaeeae"),
    text("t_2f17423fd1772f7be97e"),
    text("t_3e7a00b8f9b7bf4178bb"),
    text("t_156825ba4472875cb659")
  ],
  radio: [
    { id: "rock", name: text("t_2c9520c870f4fa2df8ab"), line: text("t_cf17673a4d30625e87e3"),
      lines: [text("t_cf17673a4d30625e87e3"), text("t_5793e8f9ad8593d6246f"), text("t_24c4696cb1e375ef7b75"), text("t_fa1b79afa0620a3733fb"), text("t_1aa7adeeeeac5610d820")] },
    { id: "jazz", name: text("t_d0ec3a116b2bbb6d2287"), line: text("t_b5100d661b014f973c69"),
      lines: [text("t_b5100d661b014f973c69"), text("t_c69d2ea71dbe1e2c3dac"), text("t_68bfc1506cb590c39d31"), text("t_43e55814bc62fcc75da6"), text("t_7400b9ec8c905c0af782")] },
    { id: "news", name: text("t_673ee49f7a8ffbd4e101"), line: text("t_3542ece7eecb60cae16b"),
      lines: [text("t_3542ece7eecb60cae16b"), text("t_b74259123eb00d0217f0"), text("t_9a42e346fb3f48c79486"), text("t_932f012dacc06fc39a2b"), text("t_e42b1cce4167cbb1b87a")] },
    { id: "polka", name: text("t_e0640a4ac1cfc26458e3"), line: text("t_3a8cbb382761c93bef24"),
      lines: [text("t_3a8cbb382761c93bef24"), text("t_16d8d288136ef99b7c5b"), text("t_7e5d6b7e1a20a5a33f17"), text("t_843cfe7243dd6a7d8d09")] },
    { id: "crime", name: text("t_cff0ab961e10223c0d1f"), line: text("t_04cbb97720feef7f6ad8"),
      lines: [text("t_04cbb97720feef7f6ad8"), text("t_4e6043199f84a8edfc4b"), text("t_071a35c4ea49fbe97f4a"), text("t_d694223a2b9637856cc3"), text("t_1fd9bfeeaf2ca2bbb72f")] },
    { id: "static", name: text("t_d4bbe197ad6e2edcf5e3"), line: text("t_ac6f07013d80667a49bb"),
      lines: [text("t_ac6f07013d80667a49bb"), text("t_c56b7fea80a663d04d8f"), text("t_e54531f9e9c7380cb142"), text("t_76da1e37970ab47af91e")] },
  ],
  dinoFine: [
    text("t_eb6620c2ea4f20036356"),
    text("t_ef4f61a72a0d453b05e7"),
    text("t_4e39d2f11e6e7540b47b"),
    text("t_a016da1aeb9910a8b853")
  ],
  dinoFineAgain: [
    text("t_081f1e3a1dfa5a8da302"),
    text("t_f80c1d34596bc479d187")
  ],
  dinoNearMiss: [
    text("t_292e54802128059932de"),
    text("t_839f2e872a400dea0575"),
    text("t_6b6b72d72735ce8d9303"),
    text("t_ac3fdb14dd443a8ada1f")
  ],
  dinoOffroad: [
    text("t_6e1345cde10d8be4580e"),
    text("t_8819423bdc29c66d336a"),
    text("t_43455c8a51b5d00d529e")
  ],
  dinoBendLeft: [
    text("t_50a0211415993ab5a2de"),
    text("t_72fc806fe7ee8a2be62d")
  ],
  dinoBendRight: [
    text("t_1a2c0974df3161f023c6"),
    text("t_a77f3428019b5a2b2a0f")
  ],
  dinoFast: [
    text("t_b529a911d3d644cf6c29"),
    text("t_1637a7a9a34eafef7ce4"),
    text("t_16c60150a46196eeac5e")
  ],
  dinoStopped: [
    text("t_cac111cf1f56df73c3e9"),
    text("t_4e2107abdb32d0c8fade"),
    text("t_6812196a592e6aeab3e3")
  ],
  dinoHalfway: [
    text("t_577d2b7c8004d6fa512f"),
    text("t_b9de247a710de49ea719")
  ],
  dinoAlmost: [
    text("t_f96e46eee2cc2a8ab1b7"),
    text("t_bca9a759c39e90e4fd65")
  ],
  dinoSecondDent: [
    text("t_56be074613c4d833aca1"),
    text("t_b6565100d73660a18bf3")
  ],
  dinoClean: [
    text("t_1121ba8818b8e3545985"),
    text("t_402b61bbd95ebb47ab7d")
  ],
  weatherLines: {
    rain: text("t_a216054a9f36d2194828"),
    fog: text("t_a30992663e53d273a8d5"),
    night: text("t_885238e92a75003244c2"),
    snow: text("t_59e4d1715fa1637a9a03"),
    clear: text("t_c0cee72f5df2f110fe61")
  },
  radioFlashName: text("t_715df93f46d3c83fb64d"),
  radioFlash: {
    fine: [text("t_7ddcf6a2b523331b5d0a"), text("t_87d280c41b6898381207"), text("t_3af0fb352fc14304890a")],
    hit: [text("t_3fb41ed841ecdbdfd91a"), text("t_0e64c04ffcfd75e05076"), text("t_1698342f7fc3db6daab4")]
  },
  verdicts: {
    perfect: text("t_2ce852c22f500e29c0dd"),
    minor: text("t_2e196b402d2d89d0680b"),
    major: text("t_e7f1c09d51a1809f2f86"),
    autopilot: text("t_bfdd8c5c8d8bf3cae5b4"),
  }
};
