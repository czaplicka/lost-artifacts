const DOCUMENT = ['document'];
const SMALL = ['document', 'small_item'];
const LARGE = ['document', 'small_item', 'artifact'];

function room(roomId, label, entries) {
  const key = `apartment_luxury_${roomId}`;

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
      id: `luxury_${roomId}_${id}`,
      roomId,
      label,
      x,
      y,
      w,
      h,
      discoveryAction,
      description,
      actionHint: '',
      accepts
    }))
  };
}

export const LUXURY_EXTRA_ROOMS = {
  bedroom: room('bedroom', 'Bedroom', [
    ['wardrobe', 'Walnut Wardrobe', 349, 533, 176, 440, 'search',
      'Three brass handles. Not a single fingerprint.', LARGE],
    ['pillows', 'Display Pillows', 791, 612, 270, 108, 'move',
      'One cushion still has its tag. Apparently sleep is a display-only feature.', DOCUMENT],
    ['print', 'Abstract Print', 1125, 392, 128, 150, 'move',
      'The same triangle as in the living room. It must have a very good agent.', DOCUMENT],
    ['lamp', 'Brass Reading Lamp', 1080, 578, 77, 105, 'inspect',
      'Adjustable to seventeen angles, none of them casual.'],
    ['book', 'Bedside Book', 1171, 634, 67, 28, 'search',
      'A closed book, positioned at the exact angle at which nobody reads.', DOCUMENT],
    ['nightstand', 'Bedside Drawer', 1136, 684, 157, 45, 'search',
      'The drawer looks deep enough for a secret, but not a personality.', SMALL],
    ['dresser_top', 'Top Dresser Drawer', 1490, 647, 285, 60, 'search',
      'A very expensive place to keep socks.', SMALL],
    ['dresser_bottom', 'Lower Dresser Drawer', 1469, 728, 235, 64, 'search',
      'Even the drawer handles are more coordinated than my wardrobe.', SMALL],
    ['tray', 'Decorative Tray', 1474, 572, 128, 39, 'inspect',
      'A single earplug, presented with the dignity of a crown jewel.'],
    ['bench', 'Upholstered Storage Bench', 1753, 793, 288, 145, 'search',
      'Finally, something in this room designed to contain a mess.', LARGE]
  ]),

  bathroom: room('bathroom', 'Bathroom', [
    ['shower', 'Glass Shower Screen', 373, 571, 126, 407, 'inspect',
      'Spotless glass. Either nobody showers or somebody has a very strict timetable.'],
    ['medicine', 'Medicine Cabinet', 620, 382, 146, 257, 'search',
      'A discrete little cupboard for things that do not match the decor.', SMALL],
    ['mirror', 'Framed Mirror', 983, 378, 265, 255, 'move',
      'Even my reflection looks underdressed in here.', DOCUMENT],
    ['soap', 'Soap Dish', 839, 600, 62, 29, 'inspect',
      'The soap still has corners. Draw your own conclusions.'],
    ['toothbrush', 'Travel Toothbrush', 1137, 564, 42, 98, 'inspect',
      'A cheap toothbrush in a holder that probably came with a certificate.'],
    ['drawer', 'Vanity Drawer', 985, 678, 419, 53, 'search',
      'A drawer wide enough for a towel and shallow enough to resent it.', SMALL],
    ['vanity', 'Under-sink Cupboard', 985, 774, 420, 112, 'search',
      'The plumbing has its own walnut doors.', LARGE],
    ['linen_upper', 'Upper Linen Cupboard', 1481, 433, 207, 345, 'search',
      'The towels in here have probably never been unfolded.', SMALL],
    ['linen_lower', 'Lower Linen Cupboard', 1482, 759, 210, 232, 'search',
      'A broad lower compartment. Plenty of room behind the spare linen.', LARGE],
    ['towel', 'Teal Hand Towel', 1756, 516, 73, 207, 'inspect',
      'Hung at exactly the angle required to intimidate wet hands.'],
    ['hamper', 'Laundry Hamper', 1770, 805, 180, 222, 'search',
      'Even the dirty laundry gets walnut furniture.', LARGE]
  ])
};