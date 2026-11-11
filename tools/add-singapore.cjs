#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const EXTENSION = 'assets/manifests/singapore-city.json';
const BLOCK_START = '// BEGIN SINGAPORE CITY INTEGRATION v1';
const BLOCK_END = '// END SINGAPORE CITY INTEGRATION v1';

const changes = new Map();
const originals = new Map();

function fail(message) {
  throw new Error(message);
}

function projectPath(relative) {
  const result = path.resolve(ROOT, relative);

  if (!result.startsWith(ROOT + path.sep)) {
    fail(`Unsafe path: ${relative}`);
  }

  return result;
}

function exists(relative) {
  return fs.existsSync(projectPath(relative));
}

function readText(relative) {
  const filename = projectPath(relative);

  if (!fs.existsSync(filename)) {
    fail(`Missing project file: ${relative}`);
  }

  if (fs.lstatSync(filename).isSymbolicLink()) {
    fail(`Refusing symbolic link: ${relative}`);
  }

  return fs.readFileSync(filename, 'utf8');
}

function readJson(relative) {
  try {
    return JSON.parse(readText(relative));
  } catch (error) {
    fail(`${relative}: ${error.message}`);
  }
}

function serialize(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function stage(relative, content) {
  const previous = exists(relative)
    ? fs.readFileSync(projectPath(relative))
    : null;

  const next = Buffer.from(content, 'utf8');

  if (previous && previous.equals(next)) {
    return;
  }

  originals.set(relative, previous);
  changes.set(relative, next);
}

function stageJson(relative, data) {
  stage(relative, serialize(data));
}

function stagedJson(relative) {
  const staged = changes.get(relative);

  return staged
    ? JSON.parse(staged.toString('utf8'))
    : readJson(relative);
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function addManagedBlock(source, body) {
  if (source.includes(BLOCK_START)) {
    const start = source.indexOf(BLOCK_START);
    const end = source.indexOf(BLOCK_END, start);

    if (end === -1) {
      fail('An incomplete Singapore integration block was found.');
    }

    source =
      source.slice(0, start) +
      source.slice(end + BLOCK_END.length);
  }

  return [
    source.trimEnd(),
    '',
    BLOCK_START,
    body,
    BLOCK_END,
    ''
  ].join('\n');
}

const SINGAPORE = {
  id: 'singapore',
  city: 'Singapore',
  country: 'Singapore',
  travelRegion: 'southeast_asia',

  airport: true,
  harbor: true,
  busStation: true,
  trainStation: true,

  background: 'singapore.webp',
  backgroundKey: 'singapore',
  npcTheme: 'asian',

  coordinates: [103.8198, 1.3521],

  map: {
    x: 1410,
    y: 590
  },

  isCrimeCity: false,

  encounterSlots: [
    {
      id: 'slot_1',
      cityX: 260,
      cityY: 390,
      enabled: true
    },
    {
      id: 'slot_2',
      cityX: 560,
      cityY: 470,
      enabled: true
    },
    {
      id: 'slot_3',
      cityX: 900,
      cityY: 320,
      enabled: true
    }
  ],

  encounterPool: [
    {
      id: 'singapore_bankier_bank',
      npcId: 'bankier',
      locationId: 'bank'
    },
    {
      id: 'singapore_fence_alley',
      npcId: 'fence',
      locationId: 'alley'
    },
    {
      id: 'singapore_stewardessa_airport',
      npcId: 'stewardessa',
      locationId: 'airport'
    },
    {
      id: 'singapore_maid_hotel',
      npcId: 'maid',
      locationId: 'hotel'
    },
    {
      id: 'singapore_police_policehq',
      npcId: 'police',
      locationId: 'policehq'
    },
    {
      id: 'singapore_parkingowy_parking',
      npcId: 'parkingowy',
      locationId: 'parking'
    },
    {
      id: 'singapore_knajpa_restaurant',
      npcId: 'knajpa',
      locationId: 'restaurant'
    },
    {
      id: 'singapore_bum_garbage',
      npcId: 'bum',
      locationId: 'garbage'
    },
    {
      id: 'singapore_sailor_harbor',
      npcId: 'sailor',
      locationId: 'harbor'
    }
  ],

  encounterRules: {
    count: 3,
    uniqueNpc: true,
    uniqueLocation: true
  }
};

const COUNTRY_FACTS = {
  currency: {
    name: 'dollar',
    symbol: 'S$',
    pennies: 'cents',
    nickname:
      'issued by an island city-state and interchangeable at par with the Brunei dollar',
    oldCurrency: null
  },

  coinSymbol:
    'a coat of arms supported by a lion and a tiger, with local flowers on the other side',

  wildlife:
    'long-tailed macaques living near a tropical rainforest reserve',

  cityRiver:
    'a short river lined with shophouses at Boat Quay, near a fountain shaped like a lion with a fish tail',

  famousPerson:
    'a founding prime minister named Lee Kuan Yew, who led an island city-state through independence',

  artStyle:
    'Nanyang paintings combining Chinese artistic traditions with Western painting techniques and tropical subjects',

  craftGood:
    'Peranakan beadwork and embroidered kebaya blouses',

  exportGood:
    'electronics and goods passing through a major trading port beside the Strait of Malacca',

  foodIngredient:
    'poached chicken served with fragrant rice, chilli sauce and ginger',

  specialtyDish:
    'chilli crab with a rich tomato-and-chilli sauce',

  flagColors:
    'red above white, with a white crescent and five white stars',

  traditionFact:
    'Peranakan traditions combining Chinese and Malay influences',

  guidebookNote:
    'a white Merlion fountain: a lion head on a fish body, near the mouth of a busy river',

  classicCar:
    'a boxy taxi driving past shophouses and the Merlion waterfront',

  drivingFact:
    'left-hand traffic on the island city-state south of the Malay Peninsula',

  callingCode: '+65',

  utcOffsetFact:
    'eight hours ahead of Greenwich, with no daylight saving time',

  plugType:
    'a British-style plug with three rectangular pins',

  airlineName:
    'the national carrier with a golden bird emblem',

  airlineLogoFact:
    'a golden bird on a dark blue tail',

  mountainFact:
    'a low tropical hill called Bukit Timah rather than a mountain range'
};

const ATLAS_ENTRY = {
  id: 'singapore',
  iso3: 'SGP',
  name: 'Singapore',
  capital: 'Singapore',

  capitalCoordinates: [103.8198, 1.3521],

  region: 'Southeast Asia',

  description:
    'An island city-state at the southern end of the Malay Peninsula, with a busy port, tropical greenery and an impressive talent for making a short journey involve three excellent meals. Our file concerns the trail of a fugitive, not a new museum theft.',

  knownFor:
    'Merlion, trading port, shophouses, hawker food',

  cities: [
    {
      id: 'singapore',
      name: 'Singapore',

      coordinates: [103.8198, 1.3521],

      description:
        'Follow the river past Boat Quay, check the onward journey and keep your notebook dry. The Merlion has been questioned. Its statement was mostly water.',

      knownFor:
        'Merlion, Boat Quay, Changi Airport'
    }
  ],

  mapBounds: [103.58, 1.15, 104.12, 1.49],
  mapLabel: 'SINGAPORE'
};

const NPC_BANTER = {
  'banker.json': [
    'The air-conditioning is working. Please keep the financial panic at a compatible temperature.',
    'Cash is straightforward. It is the explanations that usually require another form.',
    "You may ask questions. Please don't lean on the exchange-rate board; it has enough pressure."
  ],

  'fence.json': [
    'If it came through the port, someone has a receipt. Whether it matches the object is a different service.',
    "I deal in interesting objects. 'Interesting' is not an admission, detective.",
    'Mind the shutters. They close faster than a promising conversation.'
  ],

  'knajpa.json': [
    'Ask your questions before the lunch rush. After that, even my alibi is takeaway.',
    'A witness statement? Certainly. But move your notebook away from the chilli sauce.',
    'People remember faces. I remember who sent back perfectly good chicken rice.'
  ],

  'maid.json': [
    'If your suspect left a damp towel, I may already have stronger feelings about them than you do.',
    'I found three maps in one room. Not one explained how to fold the bedspread.',
    'The ceiling fan has seen everything. Unfortunately it keeps going round in circles.'
  ],

  'police.json': [
    'Good afternoon, detective. Clear notes first. Dramatic pauses later.',
    'The Merlion is not a witness. We have already established its position.',
    'You brought evidence? Excellent. For a moment I thought that was your lunch.'
  ],

  'parkingowy.json': [
    'I remember cars. Faces are something the cars keep bringing with them.',
    "If you're looking for a quick exit, begin by not parking across it.",
    "A driver asked whether the shade would stay there all afternoon. I explained the sun's limited interest in reservations."
  ],

  'stewardess.json': [
    'Your questions are welcome. Your unattended suitcase is not.',
    "Changi is excellent for connections. Less excellent when your contact only says 'meet me at the airport'.",
    'Passengers who claim to travel light usually mean they expect someone else to carry it.'
  ],

  'bum.json': [
    'You can tell a visitor by the way they look surprised when the rain stops again.',
    "I've watched this street all afternoon. The shade moved. Everybody followed.",
    'You look like you need a lead. Or water. Start with water; it rarely lies.'
  ],

  'sailor.json': [
    "A bumboat has an engine, detective. It does not run on the operator's optimism.",
    'Cargo moves, paperwork settles in and raises a family.',
    "If the Merlion starts giving directions, you've been in the sun too long."
  ]
};

const LOCAL_ARTICLES = [
  [
    'lead',
    'Merlion Refuses Interview, Continues Giving Same Statement',
    'Waterfront icon maintains a consistent position.',
    "A reporter hoping to interview the Merlion received a faceful of water and no usable quotation. The editor praised the subject's consistency but requested a drier follow-up. A photograph of the encounter is being withheld until the reporter stops looking like evidence recovered from the harbour."
  ],
  [
    'lead',
    'Office Worker Plans Quick Lunch, Discovers Several Competing Lunches',
    'The original plan contained one stall. Reality offered alternatives.',
    'An office worker who left for a quick lunch returned with chicken rice, a second parcel for later and strong opinions about three stalls he had not intended to visit. Colleagues asked whether the meeting could begin. He asked whether it had to begin before the noodles.'
  ],
  [
    'lead',
    'Port Clerk Finds Missing Form Under Form About Missing Forms',
    'An administrative mystery reaches its natural conclusion.',
    'A clerk searching for an absent shipping form discovered it beneath a report documenting its disappearance. The original form has been returned to service. The report must remain on file until someone establishes the procedure for declaring it unnecessary.'
  ],
  [
    'lead',
    'Visitor Packs Sweater for Air-Conditioning, Receives Weather Outside Instead',
    'Two climates now compete for the same suitcase.',
    'A visitor stepping out of an air-conditioned office encountered enough humidity to reconsider several clothing decisions. Returning indoors immediately reversed the problem. The visitor is considering dressing in layers, with separate layers assigned to individual doorways.'
  ],
  [
    'lead',
    'Shophouse Owner Repaints Shutters, Neighbours Offer Unrequested Committee',
    'The colour is now officially a community discussion.',
    'A shophouse owner repainting wooden shutters attracted neighbours with precise views about shades of green. Work paused while a sample was examined in sunlight, shade and increasingly personal terms. The owner has decided to finish the back windows first.'
  ],
  [
    'lead',
    'Harbour Worker Identifies Boat by Sound, Cannot Find Office Telephone',
    'Professional expertise proves highly specialised.',
    'A harbour worker correctly recognised an approaching boat by its engine before spending several minutes searching for a ringing telephone. The phone was under a clipboard. Colleagues say the boat identification remains impressive, though the clipboard is becoming a recurring challenge.'
  ],
  [
    'lead',
    'Rain Ends Before Visitor Finishes Opening Umbrella',
    'The sky declines to wait for a demonstration.',
    'A visitor sheltering beneath a shop awning finally persuaded a reluctant umbrella to open just as the shower stopped. Nearby customers offered the respectful silence reserved for an avoidable public struggle. The umbrella remained open for the walk home, purely as a precaution.'
  ],
  [
    'secondary_1',
    'Kopi Order Becomes First Successful Investigation of Morning',
    '',
    'A customer who carefully wrote down a coffee order received exactly the drink requested. Encouraged by this early result, the customer has begun taking equally detailed notes about breakfast. Staff welcome the clarity but draw the line at signed witness statements.'
  ],
  [
    'secondary_1',
    'Hotel Guest Declares Ceiling Fan Worthy of Promotion',
    '',
    "A hotel guest has praised a ceiling fan for remaining focused throughout the entire afternoon. The guest described it as tireless and reassuringly predictable. Management said the fan's salary review would be conducted at the next maintenance visit."
  ],
  [
    'secondary_1',
    'Tailor Asked to Add One More Secret Pocket',
    '',
    'A customer requested another concealed pocket in a jacket already equipped with several. The tailor asked what it should hold. The customer said secrets. The tailor asked for their approximate dimensions.'
  ],
  [
    'secondary_1',
    'Newspaper Seller Folds Edition More Neatly Than Editor Intended',
    '',
    "A newspaper seller has folded the day's edition so neatly that several readers assumed the arrangement was part of the design. The editor has requested instructions. The seller has requested payment in advance."
  ],
  [
    'secondary_1',
    'Boat Passenger Requests Quiet Engine, Receives Honest Look',
    '',
    'A passenger asked whether a boat engine could run more quietly during the trip. The operator looked at the engine, then at the passenger, then started it. Everyone understood the answer without further discussion.'
  ],
  [
    'secondary_1',
    'Shop Cat Sleeps Through Entire Stocktake',
    '',
    'A provision-shop cat declined to move while staff counted tins stacked around its preferred shelf. The inventory now includes one obstruction. Management has decided against marking it for clearance.'
  ],
  [
    'secondary_2',
    'Tourist Buys Souvenir Merlion, Negotiates Space in Suitcase',
    '',
    'A tourist who bought a small Merlion ornament discovered that the suitcase was already full. One pair of shoes is understood to have lost the argument. The ornament remains outwardly unmoved.'
  ],
  [
    'secondary_2',
    'Port Office Introduces Queue for Questions About Queue',
    '',
    'A port office has designated a separate counter for enquiries about waiting times. Visitors say the change has made it easier to determine where their uncertainty belongs. The original queue remains available for those already committed.'
  ],
  [
    'secondary_2',
    'Visitor Orders Mild Dish With Remarkable Confidence',
    '',
    'A visitor ordered a mild dish and immediately developed a new understanding of the word. Staff supplied water without commenting on the original confidence. The visitor has requested that future negotiations include a practical demonstration.'
  ],
  [
    'secondary_2',
    'Desk Fan Rotates Away at Worst Possible Moment',
    '',
    'An employee relying on a desk fan during a warm afternoon has criticised its commitment to serving the entire room. Colleagues defend the rotation as fair. Negotiations over the oscillation switch continue.'
  ],
  [
    'secondary_2',
    'Shipping Label Outlives Box It Was Attached To',
    '',
    'A warehouse worker found a carefully preserved label beside a box no longer fit to hold anything. Staff admired the label’s durability but agreed that shipping the address without the contents would disappoint the customer.'
  ],
  [
    'secondary_2',
    'Office Chooses Meeting Room by Air-Conditioning Rather Than Capacity',
    '',
    'A meeting has been moved to a room with excellent air-conditioning and insufficient chairs. Participants described the arrangement as manageable. The colleague standing beside the vent described it as ideal.'
  ]
];

const DAILY_PAPER = {
  title: 'The Straits of Suspicion',
  subtitle: 'Singapore Edition',

  articles: LOCAL_ARTICLES.map(
    ([slotId, headline, lead, body], index) => ({
      id: `singapore_local_${String(index + 1).padStart(2, '0')}`,
      slotId,
      headline,
      ...(lead ? { lead } : {}),
      body
    })
  )
};

const TIME_PAPER = {
  title: 'TIME',

  covers: [
    {
      coverLines: [
        'The Merlion has no comment',
        'Port paperwork: the real international mystery',
        'Lunch break develops into full itinerary',
        'Air-conditioning wins office popularity contest'
      ]
    },
    {
      coverLines: [
        'A city, an island and three wrong turns',
        'The suitcase was small. The souvenir was not.',
        'Shipping clerk requests less dramatic handwriting',
        'Detective discovers that humidity follows you'
      ]
    },
    {
      coverLines: [
        'Hawker lunch defeats carefully planned schedule',
        'Small notebook, large number of questions',
        'Harbour pigeons deny all involvement',
        'Ceiling fan named employee of the afternoon'
      ]
    },
    {
      coverLines: [
        'The international art of looking busy',
        'Taxi receipt survives. Explanation does not.',
        'Five shutters, six opinions about green',
        'Witness remembers lunch with exceptional clarity'
      ]
    }
  ]
};

function prepareLocations() {
  const filename = 'assets/data/locations.json';
  const locations = readJson(filename);

  if (!Array.isArray(locations)) {
    fail('locations.json must contain an array.');
  }

  const matching = locations.filter(
    location => location.id === 'singapore'
  );

  if (matching.length > 1) {
    fail('Duplicate Singapore entries in locations.json.');
  }

  if (matching.length === 1) {
    const current = matching[0];

    if (
      current.isCrimeCity !== false ||
      current.airport !== true ||
      current.harbor !== true
    ) {
      fail(
        'Existing Singapore configuration conflicts with this package. Nothing changed.'
      );
    }

    return;
  }

  const hqIndex = locations.findIndex(
    location => location.id === 'hq'
  );

  locations.splice(
    hqIndex < 0 ? locations.length : hqIndex,
    0,
    SINGAPORE
  );

  stageJson(filename, locations);
}

function prepareFactsAndAtlas() {
  const factsFilename = 'assets/data/countryFacts.json';
  const facts = readJson(factsFilename);

  if (!facts || Array.isArray(facts)) {
    fail('countryFacts.json must contain an object.');
  }

  if (!facts.singapore) {
    facts.singapore = COUNTRY_FACTS;
    stageJson(factsFilename, facts);
  }

  const atlasFilename = 'assets/data/atlas.json';
  const atlas = readJson(atlasFilename);

  if (!Array.isArray(atlas)) {
    fail('atlas.json must contain an array.');
  }

  if (!atlas.some(entry => entry.id === 'singapore')) {
    atlas.push(ATLAS_ENTRY);
    stageJson(atlasFilename, atlas);
  }
}

function prepareCityConfig() {
  const filename = 'scenes/city/CityConfig.js';
  const source = readText(filename);

  if (
    !/export\s+const\s+CITY_BACKGROUND_KEYS\s*=\s*\{/.test(
      source
    )
  ) {
    fail('Unknown CityConfig.js structure.');
  }

  stage(
    filename,
    addManagedBlock(
      source,
      "CITY_BACKGROUND_KEYS.singapore = 'singapore';"
    )
  );
}

function prepareDestinationMeta() {
  const filename = 'ui/DestinationMeta.js';
  const source = readText(filename);

  const required = [
    'CITY_ID_MAP',
    'CITY_COORDINATES',
    'GAME_COUNTRIES_ISO3',
    'COUNTRY_ISO3',
    'CITY_QUIPS'
  ];

  for (const name of required) {
    const pattern = new RegExp(
      `export\\s+const\\s+${name}\\s*=`
    );

    if (!pattern.test(source)) {
      fail(`DestinationMeta.js is missing ${name}.`);
    }
  }

  stage(
    filename,
    addManagedBlock(
      source,
      [
        "CITY_ID_MAP.Singapore = 'singapore';",
        'CITY_COORDINATES.singapore = [103.8198, 1.3521];',
        "if (!GAME_COUNTRIES_ISO3.includes('SGP')) GAME_COUNTRIES_ISO3.push('SGP');",
        "COUNTRY_ISO3.singapore = 'SGP';",
        "CITY_QUIPS.singapore = 'SINGAPORE: The Merlion has no comment. Mostly water.';"
      ].join('\n')
    )
  );
}

function prepareAirportCode() {
  const filename = 'config/TicketAirports.js';
  let source = readText(filename);

  const existing = source.match(
    /(?:['"]singapore['"]|\bsingapore)\s*:\s*['"]([^'"]+)['"]/
  );

  if (existing) {
    if (existing[1] !== 'SIN') {
      fail('Conflicting Singapore airport code.');
    }

    return;
  }

  const anchor =
    /export\s+const\s+TICKET_AIRPORT_CODES\s*=\s*Object\.freeze\(\{/g;

  if ([...source.matchAll(anchor)].length !== 1) {
    fail('Unknown TicketAirports.js structure.');
  }

  source = source.replace(
    anchor,
    match => match + "\n  singapore: 'SIN',"
  );

  stage(filename, source);
}

function checkExistingTravelSupport() {
  const network = readText('config/TravelNetwork.js');
  const coordinates = readText(
    'config/TravelNodeCoordinates.js'
  );

  if (
    !/["']singapore["']\s*:/.test(network) ||
    !/\bsingapore\s*:/.test(coordinates)
  ) {
    fail(
      'Expected Singapore transit node was not found. Nothing changed.'
    );
  }

  const setup = readText('gameSetup.js');

  if (
    !setup.includes('function createEscapeRoute') ||
    !setup.includes('locationsData.filter')
  ) {
    fail('Unknown escape-route generator. Nothing changed.');
  }
}

function prepareDialogues() {
  for (
    const [filename, banter] of Object.entries(NPC_BANTER)
  ) {
    const relative = `assets/data/dialogue/${filename}`;
    const data = readJson(relative);

    const matchingRoots = Object.values(data).filter(
      value =>
        value &&
        typeof value === 'object' &&
        value.locationVariants
    );

    if (
      matchingRoots.length !== 1 ||
      !matchingRoots[0].locationVariants.default
    ) {
      fail(`Missing default dialogue variant: ${relative}`);
    }

    const variants = matchingRoots[0].locationVariants;

    if (variants.singapore) {
      continue;
    }

    variants.singapore = {
      ...copy(variants.default),
      banter
    };

    stageJson(relative, data);
  }
}

function prepareNewspapers() {
  const files = [
    [
      'assets/data/newspapers/daily/singapore.json',
      DAILY_PAPER
    ],
    [
      'assets/data/newspapers/time/singapore.json',
      TIME_PAPER
    ]
  ];

  for (const [filename, data] of files) {
    if (!exists(filename)) {
      stageJson(filename, data);
    }
  }
}

function prepareManifests() {
  const filename = 'assets/manifests/index.json';
  const index = readJson(filename);

  if (
    index.version !== 2 ||
    !Array.isArray(index.files) ||
    !index.bundles ||
    !index.startup
  ) {
    fail('Unsupported manifest structure.');
  }

  const catalog = new Map();

  for (const relative of index.files) {
    const part = readJson(relative);

    if (!Array.isArray(part.assets)) {
      fail(`Invalid manifest part: ${relative}`);
    }

    for (const asset of part.assets) {
      const id = `${asset.type}:${asset.key}`;

      if (catalog.has(id)) {
        fail(`Duplicate existing asset: ${id}`);
      }

      catalog.set(id, asset);
    }
  }

  const extension = exists(EXTENSION)
    ? readJson(EXTENSION)
    : { assets: [] };

  if (!Array.isArray(extension.assets)) {
    fail('Invalid Singapore manifest.');
  }

  const assets = [
    {
      type: 'image',
      key: 'singapore',
      url: 'assets/cities/singapore.webp',
      groups: ['backgrounds']
    },
    {
      type: 'json',
      key: 'newspaper_daily_singapore',
      url: 'assets/data/newspapers/daily/singapore.json',
      groups: ['json']
    },
    {
      type: 'json',
      key: 'newspaper_time_singapore',
      url: 'assets/data/newspapers/time/singapore.json',
      groups: ['json']
    }
  ];

  for (const asset of assets) {
    const id = `${asset.type}:${asset.key}`;
    const existing = catalog.get(id);

    if (existing && existing.url !== asset.url) {
      fail(`Conflicting asset URL: ${id}`);
    }

    const alreadyInExtension = extension.assets.some(
      entry => `${entry.type}:${entry.key}` === id
    );

    if (!existing && !alreadyInExtension) {
      extension.assets.push(asset);
    }
  }

  if (!index.files.includes(EXTENSION)) {
    index.files.push(EXTENSION);
  }

  const currentBundle =
    index.bundles['city:singapore'] || [];

  if (!Array.isArray(currentBundle)) {
    fail('Invalid Singapore asset bundle.');
  }

  index.bundles['city:singapore'] = [
    ...new Set([
      ...currentBundle,
      ...assets.map(asset => `${asset.type}:${asset.key}`)
    ])
  ];

  stageJson(EXTENSION, extension);
  stageJson(filename, index);

  validateManifest(index);
}

function validateManifest(index) {
  const catalog = new Map();

  for (const filename of index.files) {
    const part = stagedJson(filename);

    for (const asset of part.assets) {
      const id = `${asset.type}:${asset.key}`;

      if (catalog.has(id)) {
        fail(`Resulting manifest contains duplicate ${id}`);
      }

      catalog.set(id, asset);
    }
  }

  for (
    const [bundleName, references] of Object.entries(
      index.bundles
    )
  ) {
    if (!Array.isArray(references)) {
      fail(`Invalid bundle: ${bundleName}`);
    }

    for (const reference of references) {
      if (!catalog.has(reference)) {
        fail(
          `Unknown asset in ${bundleName}: ${reference}`
        );
      }
    }
  }

  for (
    const [group, references] of Object.entries(
      index.startup
    )
  ) {
    for (const reference of references) {
      const asset = catalog.get(reference);

      if (!asset || !asset.groups?.includes(group)) {
        fail(`Invalid startup reference: ${reference}`);
      }
    }
  }
}

function validateNewspapers() {
  const daily = stagedJson(
    'assets/data/newspapers/daily/singapore.json'
  );

  if (
    !Array.isArray(daily.articles) ||
    !daily.articles.some(
      article => article.slotId === 'lead'
    )
  ) {
    fail('Invalid Singapore daily newspaper.');
  }

  const time = stagedJson(
    'assets/data/newspapers/time/singapore.json'
  );

  if (
    !Array.isArray(time.covers) ||
    !time.covers.length ||
    !time.covers.every(
      cover =>
        Array.isArray(cover.coverLines) &&
        cover.coverLines.length === 4 &&
        cover.coverLines.every(
          line =>
            typeof line === 'string' &&
            line.trim().length > 0
        )
    )
  ) {
    fail('Invalid Singapore TIME covers.');
  }
}

function validateJavaScript() {
  for (const [filename, content] of changes) {
    if (!filename.endsWith('.js')) {
      continue;
    }

    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--check'],
      {
        input: content,
        encoding: 'utf8'
      }
    );

    if (result.status !== 0) {
      fail(
        `Syntax check failed: ${filename}\n` +
        (result.stderr || result.error?.message || '')
      );
    }
  }
}

function validateImage() {
  const filename = 'assets/cities/singapore.webp';

  if (!exists(filename)) {
    fail(`Add the city image first: ${filename}`);
  }

  const buffer = fs.readFileSync(
    projectPath(filename)
  );

  if (
    buffer.length < 12 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    fail(
      'singapore.webp is not a WebP file. Export or convert the image; do not only rename it.'
    );
  }
}

function sha256(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

function applyChanges() {
  validateImage();

  if (!changes.size) {
    console.log('Already installed. No changes required.');
    return;
  }

  for (const filename of changes.keys()) {
    const expected = originals.get(filename);
    const current = exists(filename)
      ? fs.readFileSync(projectPath(filename))
      : null;

    if (
      (expected === null) !== (current === null) ||
      (expected && !expected.equals(current))
    ) {
      fail(
        `File changed during preparation: ${filename}`
      );
    }
  }

  const stamp =
    new Date().toISOString().replace(/[:.]/g, '-') +
    '-' +
    crypto.randomBytes(3).toString('hex');

  const backupRelative =
    `singapore-backups/${stamp}`;

  const backupRoot = projectPath(backupRelative);

  fs.mkdirSync(backupRoot, { recursive: true });

  const records = [];

  for (const [filename, content] of changes) {
    const previous = originals.get(filename);

    if (previous !== null) {
      const backupFile = path.join(
        backupRoot,
        filename
      );

      fs.mkdirSync(
        path.dirname(backupFile),
        { recursive: true }
      );

      fs.writeFileSync(backupFile, previous);
    }

    records.push({
      file: filename,
      existed: previous !== null,
      installedSha256: sha256(content)
    });
  }

  fs.writeFileSync(
    path.join(backupRoot, 'installation.json'),
    serialize({
      version: 1,
      records
    })
  );

  const written = [];

  try {
    for (const [filename, content] of changes) {
      const target = projectPath(filename);
      const temporary = target + '.singapore-tmp';

      fs.mkdirSync(
        path.dirname(target),
        { recursive: true }
      );

      fs.writeFileSync(temporary, content);
      fs.renameSync(temporary, target);

      written.push(filename);
    }
  } catch (error) {
    for (const filename of written.reverse()) {
      const previous = originals.get(filename);
      const target = projectPath(filename);

      if (previous !== null) {
        fs.writeFileSync(target, previous);
      } else {
        fs.rmSync(target, { force: true });
      }
    }

    for (const filename of changes.keys()) {
      fs.rmSync(
        projectPath(filename) + '.singapore-tmp',
        { force: true }
      );
    }

    throw error;
  }

  console.log('');
  console.log('Singapore installed.');
  console.log(`Backup: ${backupRelative}`);
  console.log('Tokyo and shared newspaper modules were not modified.');
  console.log('Existing saved escape routes were not changed.');
}

function main() {
  checkExistingTravelSupport();

  prepareLocations();
  prepareFactsAndAtlas();
  prepareCityConfig();
  prepareDestinationMeta();
  prepareAirportCode();
  prepareDialogues();
  prepareNewspapers();
  prepareManifests();

  validateNewspapers();
  validateJavaScript();

  console.log('');
  console.log('SINGAPORE — ESCAPE CITY');
  console.log('');

  for (const filename of changes.keys()) {
    const label =
      originals.get(filename) === null
        ? 'ADD'
        : 'UPDATE';

    console.log(`${label} ${filename}`);
  }

  console.log('');
  console.log(
    `${changes.size} complete files prepared.`
  );

  if (!APPLY) {
    console.log('Preview only: no project files were changed.');
    console.log('');
    console.log('Install with:');
    console.log('node tools/add-singapore.cjs --apply');
    return;
  }

  applyChanges();
}

try {
  main();
} catch (error) {
  console.error('');
  console.error(`STOP: ${error.message}`);
  process.exitCode = 1;
}