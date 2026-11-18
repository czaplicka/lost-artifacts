function hotspot(
  roomId, id, label, x, y, w, h, discoveryAction, description, accepts = []
) {
  return {
    id: `research_${roomId}_${id}`,
    roomId,
    label,
    x, y, w, h,
    discoveryAction,
    description,
    actionHint: '',
    accepts
  };
}

function room(roomId, label, entries) {
  const key = `apartment_research_${roomId}`;

  return {
    roomId,
    label,
    key,
    path: `assets/apartments/${key}.webp`,
    width: 1920,
    height: 1080,
    slots: entries.map(entry => hotspot(roomId, ...entry))
  };
}

const DOCUMENT = ['document'];
const SMALL = ['document', 'small_item'];
const LARGE = ['document', 'small_item', 'artifact'];

export const RESEARCH_EXTRA_ROOMS = {
  bedroom: room('bedroom', 'Bedroom', [
    ['wardrobe', 'Wardrobe', 337, 532, 190, 486, 'search',
      'Two doors, neither of which closes without a small argument.', LARGE],
    ['bed', 'Bedspread', 736, 748, 553, 156, 'move',
      'The bed is made, in the sense that the blanket is on it.', SMALL],
    ['picture', 'Crooked Print', 1205, 361, 160, 126, 'move',
      'Straightening it would probably reveal a second, older angle.', DOCUMENT],
    ['lamp', 'Reading Lamp', 1072, 584, 105, 119, 'inspect',
      'It lights one page beautifully. The rest of the room is on its own.'],
    ['paperback', 'Paperback', 1185, 641, 93, 33, 'search',
      'The bookmark has not moved in weeks. The reader is optimistic.', DOCUMENT],
    ['nightstand', 'Nightstand Drawer', 1147, 703, 164, 41, 'search',
      'Just wide enough for things that were meant to be put away properly.', SMALL],
    ['dresser', 'Dresser Drawer', 1554, 699, 264, 46, 'search',
      'Two handles. No agreement on which one to pull.', SMALL],
    ['slippers', 'Slippers', 1470, 636, 104, 32, 'inspect',
      'Lined up like they are waiting for an inspection. Well, here we are.'],
    ['trunk', 'Travel Trunk', 1756, 899, 284, 239, 'search',
      'Built for a world where luggage had corners and nobody had a weight limit.', LARGE]
  ]),

  bathroom: room('bathroom', 'Bathroom', [
    ['curtain', 'Shower Curtain', 504, 543, 99, 548, 'move',
      'The pattern is either faded flowers or a very old water stain.'],
    ['tub', 'Bathtub', 233, 820, 365, 106, 'inspect',
      'The bath is deep enough to make getting out a separate activity.'],
    ['medicine_cabinet', 'Medicine Cabinet', 740, 391, 170, 207, 'search',
      'A cabinet for things you buy once and rediscover five years later.', SMALL],
    ['mirror', 'Bathroom Mirror', 1083, 382, 220, 226, 'move',
      'It sits a little proud of the wall. There is room for a folded note behind it.', DOCUMENT],
    ['toothbrushes', 'Toothbrush Holder', 981, 552, 43, 81, 'inspect',
      'Two toothbrushes, both leaning as far away from each other as possible.'],
    ['duck', 'Rubber Duck', 1182, 566, 51, 50, 'inspect',
      'The duck has been staring at its reflection for years. Still impressed.'],
    ['drawer', 'Vanity Drawer', 1094, 675, 269, 46, 'search',
      'The only drawer in the room. It has been asked to do too much.', SMALL],
    ['vanity', 'Vanity Cupboard', 1093, 781, 267, 119, 'search',
      'A sensible place for spare towels and things that need to stay out of sight.', LARGE],
    ['linen', 'Linen Cupboard', 1516, 747, 224, 144, 'search',
      'Even the bottom compartment has room for more than towels.', LARGE],
    ['hamper', 'Laundry Hamper', 1771, 837, 221, 216, 'search',
      'Whatever is in here has been waiting for someone to admit it is laundry.', LARGE],
    ['towel', 'Hanging Towel', 1789, 496, 65, 226, 'inspect',
      'Hung with the confidence of someone who has never heard of symmetry.']
  ])
};