export const PIGEON_CONFIG = Object.freeze({
  flightMs: 2 * 60 * 60 * 1000,
  feedId: 'pigeon_feed', firstName: 'Watson', maxNameLength: 24,
  maxPigeons: 3, extraPerchPrices: [40, 80]
});

// Weights total 100: 40 junk, 40 collection, 20 usable/inventory finds.
// Existing find IDs are retained so saved flights remain readable.
export const PIGEON_FINDS = [
  { id: 'bent_paperclip', kind: 'junk', name: 'Bent Paperclip', weight: 18,
    description: 'A promising career in stationery, cut tragically short.' },
  { id: 'lonely_pasta', kind: 'junk', name: 'Single Macaroni', weight: 12,
    description: 'Dinner for one. A very small one.' },
  { id: 'olive_receipt', kind: 'junk', name: 'Receipt for One Olive', weight: 10,
    description: 'Somebody is either very economical or very dramatic.' },
  { id: 'cap_fizz', kind: 'collection', set: 'caps', name: 'Fizzical Evidence Cap', weight: 12,
    description: 'The soft drink with a surprisingly hard alibi.' },
  { id: 'cap_coo', kind: 'collection', set: 'caps', name: 'Coo-Cola Cap', weight: 8,
    description: 'Officially not endorsed by the pigeon community.' },
  { id: 'cap_noir', kind: 'collection', set: 'caps', name: 'Noir Orange Cap', weight: 7,
    description: 'All the pulp. None of the witnesses.' },
  { id: 'button_gold', kind: 'collection', set: 'buttons', name: 'Golden Button', weight: 5,
    description: 'Someone important is now slightly less fastened.' },
  { id: 'button_blue', kind: 'collection', set: 'buttons', name: 'Blue Button', weight: 4,
    description: 'No fingerprints. Plenty of thread.' },
  { id: 'button_anchor', kind: 'collection', set: 'buttons', name: 'Anchor Button', weight: 4,
    description: 'A nautical mystery. Probably from a cardigan.' },
  { id: 'cookie', kind: 'usable', name: 'Wrapped Cookie', weight: 6,
    description: 'Still sealed. The pigeon has surprisingly high catering standards.',
    item: { id: 'pigeon_cookie', name: 'Wrapped Cookie', icon: '🍪', type: 'item', stackable: true,
      description: 'A sealed cookie delivered by a pigeon. Restores 5 energy.',
      metadata: { consumable: true, effect: { energy: 5 },
        useMessage: 'Crunch. I choose not to ask where the pigeon shops.' } } },
  { id: 'postcard', kind: 'usable', name: 'Postcard', weight: 5,
    description: 'Wish you were here. The pigeon has already been.', catalogRef: 'souvenirs.postcard' },
  { id: 'pigeon_energy_drink', kind: 'usable', name: 'Energy Drink', weight: 3,
    description: 'A sealed can. The pigeon requests a lighter assignment next time.', catalogRef: 'consumables.energyDrink' },
  { id: 'pigeon_sandwich', kind: 'usable', name: 'Sandwich', weight: 3,
    description: 'Lunch delivered by air. The pigeon has declined to name the restaurant.', catalogRef: 'consumables.sandwich' },
  { id: 'pigeon_lucky_cat', kind: 'usable', name: 'Lucky Cat', weight: 2,
    description: 'A tiny souvenir. The pigeon refuses to discuss the irony.', catalogRef: 'souvenirs.tokyoLuckyCat' },
  { id: 'pigeon_truck_keychain', kind: 'usable', name: 'Truck Art Keychain', weight: 1,
    description: 'A tiny truck with an extremely unconventional delivery driver.', catalogRef: 'souvenirs.islamabadTruck' }
];

export const PIGEON_COLLECTIONS = [
  { id: 'caps', name: 'Questionable Refreshments', ids: ['cap_fizz', 'cap_coo', 'cap_noir'] },
  { id: 'buttons', name: 'Loose Ends', ids: ['button_gold', 'button_blue', 'button_anchor'] }
];
