import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';

const LOCAL_DEBUG_ALLOWED = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

// ---------------------------------------------------------------------------
// Motyw wizualny: "sklep na rogu" - tablica kredowa, mosiądz, papierowe metki
// ---------------------------------------------------------------------------
const FONT = {
  body: __dialogueText("scenes/ShopScene.js", "t_749639cb7eb80c7ff9a7"),
  pixel: __dialogueText("scenes/ShopScene.js", "t_8579050150a2d7c2e239")
};
const COLOR = {
  gold: 0xd4af37, goldLight: 0xf0d48a,
  brass: 0x8b6b2f, brassLight: 0xa07a34, brassDark: 0x5c4620,
  plate: 0x1a1511, leather: 0x15110d,
  paper: 0xf6e8c0, paperDark: 0xe3cf98, paperEdge: 0x9a8a68,
  ink: 0x2b2118, inkSoft: 0x6b5a3e,
  red: 0xd9382f, green: 0x2f7d32,
  wood: 0x6a4524, woodDark: 0x3b2512,
  chalkBoard: 0x1d2a22, tape: 0xffd23f
};
const TAG_W = 330;
const BOARD_W = 340;

const FALLBACK_DESCRIPTIONS = [
  __dialogueText("scenes/ShopScene.js", "t_ad0f99cd817309441569"), __dialogueText("scenes/ShopScene.js", "t_53ae76ab9ef175440b0c"),
  __dialogueText("scenes/ShopScene.js", "t_69da7d419e1da6b267ef"), __dialogueText("scenes/ShopScene.js", "t_c452b2af04255141f9de"),
  __dialogueText("scenes/ShopScene.js", "t_88b6159e7c7e7e37cbda"), __dialogueText("scenes/ShopScene.js", "t_2d10d19a15a1079a287f"),
  __dialogueText("scenes/ShopScene.js", "t_d8f859abc0c683dc8a21"), __dialogueText("scenes/ShopScene.js", "t_8a4465bb0df7da04f92c")
];

// Tabliczka nad wejściem - każde miasto ma swój sklep
const SHOP_SIGNS = {
  paris: { name: __dialogueText("scenes/ShopScene.js", "t_6c3ac0ecef8df5e2ff30"), tagline: __dialogueText("scenes/ShopScene.js", "t_e08461ec55073f42aebc") },
  london: { name: __dialogueText("scenes/ShopScene.js", "t_440f67e1067a5bb92126"), tagline: __dialogueText("scenes/ShopScene.js", "t_8fd7bf54f8507ef0163a") },
  berlin: { name: __dialogueText("scenes/ShopScene.js", "t_de0c756c230831bc144d"), tagline: __dialogueText("scenes/ShopScene.js", "t_250ce213fd35de7688a2") },
  new_york_city: { name: __dialogueText("scenes/ShopScene.js", "t_96586e642fe4cea1372a"), tagline: __dialogueText("scenes/ShopScene.js", "t_3b39e65f18365652de49") },
  warsaw: { name: __dialogueText("scenes/ShopScene.js", "t_e1e82209c5162d5c7f05"), tagline: __dialogueText("scenes/ShopScene.js", "t_9ce4068989b496cd5720") },
  new_delhi: { name: __dialogueText("scenes/ShopScene.js", "t_6f51e3d61d75a47d54cc"), tagline: __dialogueText("scenes/ShopScene.js", "t_c87e290f9ebc8893da8f") },
  kotte: { name: __dialogueText("scenes/ShopScene.js", "t_d29f3c16f46aa5e0595f"), tagline: __dialogueText("scenes/ShopScene.js", "t_871adae484b59817c3c6") },
  toronto: { name: __dialogueText("scenes/ShopScene.js", "t_2915f7a490b12a5be102"), tagline: __dialogueText("scenes/ShopScene.js", "t_ac42f9cbd0efa10a23dc") },
  nairobi: { name: __dialogueText("scenes/ShopScene.js", "t_daca4943715bca2560e9"), tagline: __dialogueText("scenes/ShopScene.js", "t_1478c6781de043d763c2") },
  islamabad: { name: __dialogueText("scenes/ShopScene.js", "t_788885121a37ca23814c"), tagline: __dialogueText("scenes/ShopScene.js", "t_e487351a6a07ae54c5af") },
  tokyo: { name: __dialogueText("scenes/ShopScene.js", "t_42e33fe7307ebd258f53"), tagline: __dialogueText("scenes/ShopScene.js", "t_82a4ebe1626c86a538a7") },
  default: { name: __dialogueText("scenes/ShopScene.js", "t_61867ba9e08d52f0e4b1"), tagline: __dialogueText("scenes/ShopScene.js", "t_8643a0ed593938a85110") }
};

// Kasa "gada" - humor sklepikarza
const QUIPS = {
  greeting: [
    __dialogueText("scenes/ShopScene.js", "t_501af287e338700375c1"),
    __dialogueText("scenes/ShopScene.js", "t_d28307ffabcf3d018dfa"),
    __dialogueText("scenes/ShopScene.js", "t_277334c4aaabe4dc0d57"),
    __dialogueText("scenes/ShopScene.js", "t_fdecdf91979ecde415db")
  ],
  purchase: [
    __dialogueText("scenes/ShopScene.js", "t_04870a6d7b2677466e05"),
    __dialogueText("scenes/ShopScene.js", "t_d0a2772ec5a70a65b6a6"),
    __dialogueText("scenes/ShopScene.js", "t_b95d5344ca04a6e5ed8e"),
    __dialogueText("scenes/ShopScene.js", "t_96a927fe63bc4d9eb656"),
    __dialogueText("scenes/ShopScene.js", "t_a3ae335ba6330855450e")
  ],
  broke: [
    __dialogueText("scenes/ShopScene.js", "t_b554fb8a0b2759020d24"),
    __dialogueText("scenes/ShopScene.js", "t_34febbce13d38b023eea"),
    __dialogueText("scenes/ShopScene.js", "t_d00f1b7f7d1b19bc8b59"),
    __dialogueText("scenes/ShopScene.js", "t_b89bd38dd68fa995a62e")
  ],
  owned: [
    __dialogueText("scenes/ShopScene.js", "t_beba3e41616cd5ee1a4b"),
    __dialogueText("scenes/ShopScene.js", "t_7b340694fc51707b62f4")
  ],
  full: [
    __dialogueText("scenes/ShopScene.js", "t_3b4f9c536cbf494ab278"),
    __dialogueText("scenes/ShopScene.js", "t_f5a11762f87958eb1c49")
  ],
  idle: [
    __dialogueText("scenes/ShopScene.js", "t_13ccc14eef7d4be9229d"),
    __dialogueText("scenes/ShopScene.js", "t_c744f3d9479f1232f2ca"),
    __dialogueText("scenes/ShopScene.js", "t_0ef2e5a16ac11f25f91d"),
    __dialogueText("scenes/ShopScene.js", "t_53480d547e40b9e1bddd"),
    __dialogueText("scenes/ShopScene.js", "t_3b39e65f18365652de49"),
    __dialogueText("scenes/ShopScene.js", "t_5e8dddc2b1261f4c9678")
  ]
};

const CITY_ALIASES = { new_york: 'new_york_city', new_york_city: 'new_york_city',
  new_delhi: 'new_delhi', new_dehli: 'new_delhi', kotte: 'kotte', sri_jayawardenepura_kotte: 'kotte' };
function normalizeCityId(value) {
  if (!value) return 'paris';
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  return CITY_ALIASES[normalized] || normalized;
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


export { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, CITY_ALIASES, normalizeCityId, hashString, seededRandom };
