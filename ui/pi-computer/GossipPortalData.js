export const GOSSIP_HOME_ID = 'daily_spill_home';

const BRAND = 'THE DAILY SPILL';
const TAGLINE = 'All the tea. None of the responsibility.';

const STORIES = [
  {
    id: 'daily_spill_apricot',
    slug: 'serious-apricot',
    title: 'BEIGE IS OVER. THE SOFA HAS BEEN INFORMED.',
    heading: 'Salon declares beige "spiritually finished"',
    category: 'STYLE EMERGENCY',
    author: 'Ruby Rattle',
    snippet:
      'A salon owner announces a colour revolution. Local curtains request privacy.',
    ticker:
      'BREAKING: Beige unavailable for comment. Taupe consulting a lawyer.',
    paragraphs: [
      'A celebrated salon owner has declared beige "spiritually finished" and replaced it with serious apricot.',
      'Asked how serious the apricot was, she pointed to a chair nobody was allowed to sit on.',
      '"Beige knows what it did," she told our reporter, before charging a customer for an emotional consultation with a cushion.',
      'Clients describe the new interior as warm, bold and difficult to explain to an insurance company.',
      'A rival salon has responded by unveiling Responsible Peach. Diplomatic relations remain frosty.',
      'THE DAILY SPILL VERDICT: We support all colours until a more influential colour invites us to lunch.'
    ]
  },
  {
    id: 'daily_spill_fries',
    slug: 'fries-with-benefits',
    title: 'FRIES WITH BENEFITS?',
    heading: 'Fitness guru caught sharing chips',
    category: 'LOVE & CARBOHYDRATES',
    author: 'Penny Press',
    snippet:
      'Two forks. One portion. An entire publicity department working overtime.',
    ticker:
      'EXCLUSIVE: Sources confirm the ketchup was not sugar-free.',
    paragraphs: [
      'A fitness personality famous for warning against potatoes has been photographed sharing a large portion of chips with a gossip columnist.',
      'Witnesses described the atmosphere as intimate, salty and approximately twelve hundred calories.',
      '"It was a business dinner," said the guru’s representative. "They were discussing a strategic partnership with carbohydrates."',
      'The columnist declined to identify the mysterious dipping sauce, citing protection of sources.',
      'Neither party has confirmed a relationship. Both have confirmed that the other person ordered the extra portion.',
      'THE DAILY SPILL VERDICT: If this is a cheat day, we would like to meet the divorce lawyer.'
    ]
  },
  {
    id: 'daily_spill_gala',
    slug: 'same-dress-different-crisis',
    title: 'SAME DRESS. DIFFERENT CRISIS.',
    heading: 'Charity gala survives matching outfits',
    category: 'RED CARPET DAMAGE',
    author: 'Ruby Rattle',
    snippet:
      'Organisers insist the evening raised awareness. Mostly of the dresses.',
    ticker:
      'LIVE UPDATE: Seating plan moved to a secure location.',
    paragraphs: [
      'A charity gala briefly descended into organised smiling after two patrons arrived in the same emerald dress.',
      'Guests immediately formed two rival groups, each insisting they had always preferred the other woman.',
      'The host restored order by announcing an auction. Unfortunately, the first item was a third copy of the dress.',
      '"The important thing is the cause," said one patron, while asking whether the cause could stand somewhere else for the photographs.',
      'Organisers praised the event as a success. Donations rose sharply after guests were offered the chance to leave without appearing in a group portrait.',
      'THE DAILY SPILL VERDICT: A wonderful evening for charity and a devastating evening for emerald.'
    ]
  },
  {
    id: 'daily_spill_pigeon',
    slug: 'penthouse-pigeon',
    title: 'WHO IS THE MYSTERY PENTHOUSE GUEST?',
    heading: 'Luxury tenant exposed as pigeon',
    category: 'PROPERTY & OTHER ANIMALS',
    author: 'Max Murmur',
    snippet:
      'It has a terrace, excellent views and absolutely no intention of paying rent.',
    ticker:
      'PROPERTY ALERT: Penthouse occupant refuses background check.',
    paragraphs: [
      'Residents of an exclusive apartment building have spent three weeks speculating about a reclusive new penthouse occupant.',
      'The guest was described as grey-haired, well-fed and frequently seen on the balcony.',
      'Our investigation can reveal that the mysterious resident is a pigeon.',
      'The building manager said the bird had not technically breached its lease because nobody could find a lease.',
      'An estate agent has already described the arrangement as "a rare opportunity for a tenant with an independent lifestyle".',
      'THE DAILY SPILL VERDICT: Finally, a property story with a believable deposit.'
    ]
  },
  {
    id: 'daily_spill_gardener',
    slug: 'market-romance',
    title: 'HE CALLED THE PEACHES BEAUTIFUL.',
    heading: 'Television gardener flirts with entire market',
    category: 'ROMANCE WATCH',
    author: 'Penny Press',
    snippet:
      'Friends insist he is enthusiastic by nature. A wheel of cheese is not so sure.',
    ticker:
      'DEVELOPING: Aubergine reportedly feeling led on.',
    paragraphs: [
      'A television gardening expert has caused speculation after complimenting peaches, aprons and at least one wheel of cheese during a market visit.',
      '"He said I looked radiant," a stallholder told us. "Then he said the same thing to a marrow."',
      'Friends insist the presenter is simply enthusiastic by nature and has always maintained strong emotional connections with seasonal produce.',
      'His representative denied rumours of an engagement after a photograph showed him holding a ring-shaped bread.',
      'The cheese has requested that its private life remain private.',
      'THE DAILY SPILL VERDICT: We wish the happy allotment every success.'
    ]
  },
  {
    id: 'daily_spill_horoscope',
    slug: 'wildly-specific-horoscopes',
    title: 'YOUR FUTURE. OUR BEST GUESS.',
    heading: 'Wildly specific horoscopes',
    category: 'COSMIC LIABILITY',
    author: 'Madame Probably',
    snippet:
      'The stars have spoken. Legal would like to clarify that they were mumbling.',
    ticker:
      'COSMIC UPDATE: Mercury denies responsibility for your last three emails.',
    paragraphs: [
      'ARIES: A mysterious stranger will enter your life. Check whether you ordered a parcel.',
      'TAURUS: Financial opportunity approaches. Unfortunately, so does your electricity bill.',
      'GEMINI: Someone is hiding something from you. Statistically, this is a very safe prediction.',
      'CANCER: Trust your instincts. Unless your instincts suggest replying to an email from a royal accountant.',
      'LEO: All eyes are on you. You are standing in front of the television.',
      'VIRGO: Order will return to your life as soon as everyone stops touching your things.',
      'LIBRA: A difficult choice awaits. Both sandwiches look good.',
      'SCORPIO: Your silence is powerful. It is also making the waiter nervous.',
      'SAGITTARIUS: Travel is in your future. Your keys are in the other coat.',
      'CAPRICORN: Hard work will be recognised. Additional work will follow immediately.',
      'AQUARIUS: Think outside the box. Especially if the box is marked EVIDENCE.',
      'PISCES: A dream may reveal the truth. Or you should stop eating cheese so late.',
      'DISCLAIMER: Celestial guidance is not admissible in court. We checked.'
    ]
  }
];

const NAVIGATION = [
  {
    label: 'Front page',
    pageId: GOSSIP_HOME_ID
  },
  ...STORIES.map(story => ({
    label: story.category,
    pageId: story.id
  }))
];

function basePage(id, slug) {
  return {
    id,
    address: slug
      ? `www.dailyspill.local/${slug}`
      : 'www.dailyspill.local',
    brand: BRAND,
    theme: 'gossip',
    layout: 'retro-magazine',
    tagline: TAGLINE,
    showImage: false,
    links: NAVIGATION.map(link => ({ ...link }))
  };
}

export function createGossipPages() {
  const home = {
    ...basePage(GOSSIP_HOME_ID, ''),
    title: `${BRAND} | Scandal, society & suspicious upholstery`,
    heading: 'TODAY: EVERYONE DENIES EVERYTHING',
    category: 'FRONT PAGE',
    author: 'The Spill Desk',
    snippet:
      'Celebrity disasters, society scandals and journalism with its shoes off.',
    ticker:
      'BREAKING: Anonymous source insists they are extremely well placed.',
    blocks: [
      [
        'Welcome to THE DAILY SPILL. We ask the questions other publications consider impolite, irrelevant or legally unwise.'
      ],
      [
        'ON THE FRONT PAGE: Beige is finished. Chips are suspicious. A pigeon has a better apartment than you.'
      ],
      [
        'STYLE EMERGENCY — A salon has declared war on beige. Our interiors correspondent has been embedded behind a tasteful curtain.'
      ],
      [
        'LOVE & CARBOHYDRATES — A fitness guru shares chips with a gossip columnist. Representatives deny everything except the mayonnaise.'
      ],
      [
        'RED CARPET DAMAGE — Two identical dresses bring a charity gala to the brink of polite conversation.'
      ],
      [
        'PROPERTY & OTHER ANIMALS — The mystery penthouse resident has finally been identified. It has wings.'
      ],
      [
        'ROMANCE WATCH — A television gardener attracts attention after complimenting most of a farmers’ market.'
      ],
      [
        'COSMIC LIABILITY — Read your horoscope before making any decisions you were going to make anyway.'
      ],
      [
        'Open a story using the links below. Further pages are available with the arrow buttons.'
      ],
      [
        'EDITORIAL POLICY: We never let an unverified rumour leave the office without a sufficiently dramatic headline.'
      ]
    ]
  };

  const articles = STORIES.map(story => ({
    ...basePage(story.id, story.slug),
    title: story.title,
    heading: story.heading,
    category: story.category,
    author: story.author,
    snippet: story.snippet,
    ticker: story.ticker,
    blocks: story.paragraphs.map(paragraph => [paragraph])
  }));

  return [home, ...articles];
}

export function ensureGossipPortal(data) {
  if (!Array.isArray(data?.cases)) return data;

  for (const definition of data.cases) {
    if (!Array.isArray(definition.pages)) continue;

    const existingIds = new Set(
      definition.pages.map(page => page.id)
    );

    for (const page of createGossipPages()) {
      if (!existingIds.has(page.id)) {
        definition.pages.push(page);
        existingIds.add(page.id);
      }
    }
  }

  return data;
}