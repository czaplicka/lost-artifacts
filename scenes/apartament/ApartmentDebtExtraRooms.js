const DOCUMENT = ['document'];
const SMALL = ['document', 'small_item'];
const LARGE = ['document', 'small_item', 'artifact'];

function room(roomId, label, entries) {
  const key = `apartment_debt_${roomId}`;

  return {
    roomId,
    label,
    key,
    path: `assets/apartments/${key}.webp`,
    width: 1920,
    height: 1080,
    slots: entries.map(([
      id, label, x, y, w, h, discoveryAction, description, accepts = []
    ]) => ({
      id: `debt_${roomId}_${id}`,
      roomId,
      label,
      x,
      y,
      w,
      h,
      discoveryAction,
      description,
      actionHint: '',
      accepts: [...accepts]
    }))
  };
}

export const DEBT_EXTRA_ROOMS = {
  bedroom: room('bedroom', 'Bedroom', [
    ['wardrobe', 'Wardrobe', 198, 588, 268, 700, 'search',
      'Two doors, two handles, three different ideas about what brass looks like.', LARGE],
    ['pillow', 'Pillow', 744, 610, 216, 63, 'move',
      'One pillow. It looks like it lost the argument.', DOCUMENT],
    ['paperback', 'Paperback Shim', 817, 965, 132, 36, 'inspect',
      'A paperback doing the work of a hardcover.'],
    ['landscape', 'Crooked Landscape', 1128, 320, 204, 139, 'move',
      'The horizon is level. The frame has other plans.', DOCUMENT],
    ['lamp', 'Patched Lamp', 1116, 540, 91, 155, 'inspect',
      'The lampshade is now more tape than shade.'],
    ['nightstand', 'Bedside Drawer', 1114, 695, 158, 51, 'search',
      'It sticks halfway, as if reconsidering the whole arrangement.', SMALL],
    ['dresser_top', 'Top Dresser Drawer', 1503, 656, 298, 83, 'search',
      'The string handle is holding up better than the original did.', SMALL],
    ['dresser_bottom', 'Bottom Dresser Drawer', 1488, 767, 260, 82, 'search',
      'This one still has a handle. An excellent year for furniture.', SMALL],
    ['trunk', 'Storage Trunk', 1769, 846, 262, 196, 'search',
      'The latch looks newer than the trunk. So does the dust.', LARGE]
  ]),

  bathroom: room('bathroom', 'Bathroom', [
    ['curtain', 'Shower Curtain', 190, 455, 232, 490, 'inspect',
      'One clothes peg has been promoted to bathroom hardware.'],
    ['medicine', 'Medicine Cabinet', 565, 328, 196, 258, 'search',
      'That little envelope on the front is just a picture. The door, at least, is real.', SMALL],
    ['mirror', 'Bathroom Mirror', 940, 310, 260, 339, 'inspect',
      'The mirror makes this room look twice as big and me twice as tired.'],
    ['soap', 'Soap Dish', 1057, 569, 90, 47, 'inspect',
      'The dish is now mostly commemorative.'],
    ['drawer', 'Sink Drawer', 939, 716, 307, 60, 'search',
      'A drawer just shallow enough to close on the first try.', SMALL],
    ['vanity', 'Under-sink Cupboard', 941, 863, 318, 181, 'search',
      'The pipes appear to have been installed in order of availability.', LARGE],
    ['linen_niche', 'Empty Linen Niche', 1404, 320, 238, 401, 'inspect',
      'Open-plan storage, in the sense that there is nothing to close.'],
    ['linen_door', 'Lower Linen Cupboard', 1407, 757, 244, 380, 'search',
      'There is room for a lot more than the spare towels.', LARGE],
    ['towel', 'Striped Towel', 1838, 441, 142, 230, 'inspect',
      'The stripes are straight. The rail is doing its best.'],
    ['hamper', 'Laundry Hamper', 1771, 843, 272, 237, 'search',
      'The lid fits, provided you do not ask it to fit all at once.', LARGE]
  ])
};