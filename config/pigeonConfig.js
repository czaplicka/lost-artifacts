export const PIGEON_CONFIG = Object.freeze({
  flightMs: 5 * 60 * 1000,
  feedId: 'pigeon_feed',
  firstName: 'Watson',
  maxNameLength: 24,
  maxPigeons: 3,
  extraPerchPrices: [40, 80]
});

export const PIGEON_FINDS = [
  { id: 'bent_paperclip', kind: 'junk', name: 'Bent Paperclip', weight: 18,
    description: 'A promising career in stationery, cut tragically short.' },
  { id: 'lonely_pasta', kind: 'junk', name: 'Single Macaroni', weight: 15,
    description: 'Dinner for one. A very small one.' },
  { id: 'olive_receipt', kind: 'junk', name: 'Receipt for One Olive', weight: 12,
    description: 'Somebody is either very economical or very dramatic.' },
  { id: 'cap_fizz', kind: 'collection', set: 'caps', name: 'Fizzical Evidence Cap', weight: 12,
    description: 'The soft drink with a surprisingly hard alibi.' },
  { id: 'cap_coo', kind: 'collection', set: 'caps', name: 'Coo-Cola Cap', weight: 10,
    description: 'Officially not endorsed by the pigeon community.' },
  { id: 'cap_noir', kind: 'collection', set: 'caps', name: 'Noir Orange Cap', weight: 8,
    description: 'All the pulp. None of the witnesses.' },
  { id: 'button_gold', kind: 'collection', set: 'buttons', name: 'Golden Button', weight: 6,
    description: 'Someone important is now slightly less fastened.' },
  { id: 'button_blue', kind: 'collection', set: 'buttons', name: 'Blue Button', weight: 5,
    description: 'No fingerprints. Plenty of thread.' },
  { id: 'button_anchor', kind: 'collection', set: 'buttons', name: 'Anchor Button', weight: 4,
    description: 'A nautical mystery. Probably from a cardigan.' },
  { id: 'cookie', kind: 'usable', name: 'Wrapped Cookie', weight: 6,
    description: 'Still sealed. The pigeon has surprisingly high catering standards.',
    item: { id: 'pigeon_cookie', name: 'Wrapped Cookie', icon: '🍪', type: 'item', stackable: true,
      description: 'A sealed cookie delivered by a pigeon. Restores 5 energy.',
      metadata: { consumable: true, effect: { energy: 5 },
        useMessage: 'Crunch. I choose not to ask where the pigeon shops.' } } },
  { id: 'postcard', kind: 'usable', name: 'Postcard', weight: 4,
    description: 'Wish you were here. The pigeon has already been.',
    item: { id: 'postcard', name: 'Postcard', icon: '✉️', type: 'item', stackable: true,
      description: 'Wish you were here. Preferably with an alibi.',
      metadata: { souvenir: true, cityVariant: true,
        useMessage: 'Dear everyone: the weather is lovely, the suspects less so.' } } }
];

export const PIGEON_COLLECTIONS = [
  { id: 'caps', name: 'Questionable Refreshments', ids: ['cap_fizz', 'cap_coo', 'cap_noir'] },
  { id: 'buttons', name: 'Loose Ends', ids: ['button_gold', 'button_blue', 'button_anchor'] }
];
