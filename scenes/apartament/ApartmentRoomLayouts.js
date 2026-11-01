// Top-left hotspot coordinates on the original 1920 x 1080 backgrounds.
const slot = (id, sourceId, roomId, label, x, y, w, h, discoveryAction, description, actionHint = '') => ({
  id, sourceId, roomId, label, x, y, w, h, discoveryAction, description, actionHint
});

export const APARTMENT_ROOM_LAYOUTS = {
  debt: {
    width: 1920,
    height: 1080,
    slots: [
      slot('desk', 'desk', 'living_room', 'Writing Desk', 1344, 718, 430, 390, 'search',
        'Paperwork, drawers, and enough unpaid bills to qualify as insulation.',
        'The drawers and papers are worth searching.'),
      slot('bookshelf', 'bookshelf', 'living_room', 'Bookcase', 1082, 489, 290, 490, 'move',
        'A bookcase full of books and abandoned ambitions.',
        'There are fresh scrape marks at its feet. Something may be behind it.'),
      slot('painting', 'painting', 'living_room', 'Wall Painting', 1406, 325, 255, 310, 'move',
        'A crooked landscape. The frame is loose.',
        'Lift it carefully to check the wall behind it.'),
      slot('cabinet', 'cabinet', 'living_room', 'Side Cabinet', 656, 645, 196, 190, 'search',
        'A small wooden cabinet. Suspiciously ordinary.',
        'There is enough room inside for papers and small belongings.'),
      slot('instrument_case', 'instrument_case', 'living_room', 'Instrument Case', 472, 557, 160, 225, 'search',
        'An oversized instrument case tucked behind the sofa.',
        'Checking the interior should settle the question of musical talent.'),
      slot('wine_rack', 'wine_rack', 'living_room', 'Wine Rack', 855, 661, 148, 160, 'search',
        'A rack with bottles and several conspicuous vacancies.'),
      slot('lamp', 'lamp', 'living_room', 'Floor Lamp', 368, 479, 105, 342, 'move',
        'A tired brass lamp.', 'Lifting the base would let you check underneath.'),
      slot('sofa', 'sofa', 'living_room', 'Sofa Cushions', 264, 784, 475, 335, 'move',
        'The cushions have survived years of questionable decisions.',
        'Lift the cushions and check the gaps, not the entire sofa.'),
      slot('framed_photo', 'framed_photo', 'living_room', 'Framed Photograph', 855, 540, 84, 85, 'move',
        'A small framed portrait. It does not establish who lives here.',
        'Turn the frame over to check the backing.'),
      slot('kitchen_cupboard', 'jewelry_box', 'kitchen', 'Upper Cupboard', 997, 305, 512, 240, 'search',
        'Cupboards above the sink. Excellent real estate for things nobody uses.'),
      slot('kitchen_drawers', 'nightstand_drawer', 'kitchen', 'Kitchen Drawers', 795, 787, 154, 236, 'search',
        'Four drawers. At least three opinions about where cutlery belongs.'),
      slot('kitchen_tall_cupboard', 'safe', 'kitchen', 'Tall Kitchen Cupboard', 1745, 475, 155, 610, 'search',
        'A tall cupboard with plenty of space for private belongings.'),
      slot('fridge_notes', 'desk_computer', 'kitchen', 'Refrigerator Notes', 552, 451, 202, 128, 'search',
        'Notes and reminders pinned to the refrigerator.',
        'Check the papers rather than dismantling the appliance.'),
      slot('kitchen_bin', null, 'kitchen', 'Kitchen Bin', 1737, 877, 126, 168, 'search',
        'A bin. The glamorous side of detective work.'),
      slot('kitchen_bag', null, 'kitchen', 'Shopping Bag', 1830, 952, 135, 172, 'search',
        'A crumpled paper shopping bag by the bin.'),
      slot('kitchen_mug', null, 'kitchen', 'Abandoned Mug', 1369, 741, 68, 80, 'inspect',
        'A mug with a stain that has apparently signed a long-term lease.'),
      slot('kitchen_floor_paper', null, 'kitchen', 'Paper Under the Table', 1138, 1010, 85, 48, 'move',
        'A scrap of paper partly hidden beneath the table.',
        'Lift it to find out whether it matters.')
    ]
  },
  collector: {
    width: 1920,
    height: 1080,
    slots: [
      slot('collector_wardrobe', 'bookshelf', 'bedroom', 'Wardrobe', 126, 237, 245, 610, 'search',
        'A wardrobe full of clothes and decisions best left in the dark.',
        'Check the shelves, pockets, and space behind the clothes.'),
      slot('collector_trunk', 'instrument_case', 'bedroom', 'Travel Trunk', 389, 626, 192, 193, 'search',
        'A sturdy travel trunk. It has seen more countries than my expense account.',
        'Open the lid and check beneath the lining.'),
      slot('collector_bed', 'sofa', 'bedroom', 'Bed', 590, 649, 408, 270, 'move',
        'One side is neatly made. The other has clearly retained legal counsel.',
        'Lift the bedding and check beneath the mattress.'),
      slot('collector_bedside', 'nightstand_drawer', 'bedroom', 'Bedside Drawer', 1067, 637, 150, 62, 'search',
        'A small drawer within convenient reach of insomnia.',
        'Search inside the drawer.'),
      slot('collector_books', 'wine_rack', 'bedroom', 'Bedside Books', 1063, 704, 151, 95, 'search',
        'Bedtime reading. Apparently the plot was not gripping enough.',
        'Check between the books.'),
      slot('collector_landscape', 'framed_photo', 'bedroom', 'Framed Landscape', 1040, 253, 161, 153, 'move',
        'A small landscape hanging at an unnecessarily dramatic angle.',
        'Lift the frame and inspect its backing.'),
      slot('collector_dressing_drawer', 'desk', 'bedroom', 'Dressing Table Drawer', 1353, 644, 162, 76, 'search',
        'A dressing-table drawer. Vanity and secrecy share excellent storage solutions.',
        'Search the drawer and check beneath its lining.'),
      slot('collector_keepsake_box', 'jewelry_box', 'bedroom', 'Keepsake Box', 1529, 575, 90, 55, 'search',
        'A small box beside the mirror. Too small for a statue, large enough for regret.',
        'Open the box.'),
      slot('collector_lamp', 'lamp', 'bedroom', 'Floor Lamp', 1230, 379, 110, 432, 'move',
        'A lamp providing more illumination than most of the witnesses.',
        'Check beneath the base.'),
      slot('collector_coat', null, 'bedroom', 'Coat on the Chair', 1668, 590, 119, 344, 'search',
        'A coat abandoned halfway through an excellent excuse.'),
      slot('collector_sleeping_bust', null, 'bedroom', 'Sleeping Philosopher', 471, 176, 103, 169, 'inspect',
        'Even the philosopher has stopped looking for answers. He has a sleep mask.'),
      slot('collector_slippers', null, 'bedroom', 'Slippers', 1038, 851, 105, 60, 'inspect',
        'A matching pair. The most stable relationship in this apartment.'),
      slot('collector_medicine', 'desk_computer', 'bathroom', 'Medicine Cabinet', 787, 285, 166, 207, 'search',
        'A mirrored medicine cabinet. Please do not diagnose the suspect from their toothpaste.',
        'Open the mirrored door and inspect the shelves.'),
      slot('collector_vanity', 'cabinet', 'bathroom', 'Under-Sink Cabinet', 1038, 684, 275, 180, 'search',
        'A cupboard beneath the sink. Plumbing above, questionable storage below.',
        'Open both doors and inspect the contents.'),
      slot('collector_linen', 'safe', 'bathroom', 'Linen Cupboard', 1406, 303, 188, 549, 'search',
        'A tall cupboard with room for towels and inconvenient personal belongings.',
        'Search the shelves behind the door.'),
      slot('collector_mirror', 'painting', 'bathroom', 'Bathroom Mirror', 1063, 260, 183, 227, 'move',
        'An old wooden mirror. It reflects poorly on the suspect, but that is not evidence.',
        'Carefully check behind the frame.'),
      slot('collector_laundry', null, 'bathroom', 'Laundry Basket', 1612, 770, 226, 291, 'search',
        'A laundry basket. Every detective eventually reaches a low point.'),
      slot('collector_bin', null, 'bathroom', 'Wastebasket', 896, 731, 116, 136, 'search',
        'A small bin. The glamour of detective work remains difficult to locate.'),
      slot('collector_towels', null, 'bathroom', 'Towels', 1679, 490, 187, 258, 'move',
        'Two towels. Neither appears willing to talk.',
        'Lift them to check the rail and the wall behind it.'),
      slot('collector_bath', null, 'bathroom', 'Bathtub', 395, 632, 266, 157, 'search',
        'A bathtub with suspiciously respectable brass taps.'),
      slot('collector_duck', null, 'bathroom', 'Rubber Duck', 193, 702, 69, 62, 'inspect',
        'A bath duck displayed like a priceless antiquity. Finally, a collector with taste.'),
      slot('collector_shower_bust', null, 'bathroom', 'Shower-Cap Philosopher', 835, 146, 89, 137, 'inspect',
        'A philosopher in a shower cap. His school of thought is apparently waterproof.')
    ]
  }
};

export function getApartmentRoomLayout(packId) {
  const source = APARTMENT_ROOM_LAYOUTS[packId];
  return source ? JSON.parse(JSON.stringify(source)) : null;
}

const EMPTY_TEXT = {
  kitchen_mug: 'Cold coffee. No clues. The real victim here was breakfast.',
  kitchen_bin: 'Peelings, packaging, and a regrettable smell. Nothing useful.',
  kitchen_bag: 'An empty shopping bag. A surprisingly accurate portrait of my finances.',
  kitchen_floor_paper: 'An old shopping list. No secret code. Just onions.',
  collector_coat: 'Empty pockets. A familiar financial situation.',
  collector_laundry: 'Laundry. Not even the socks are prepared to testify.',
  collector_bin: 'Packaging and tissues. No useful evidence. Considerable professional sacrifice.',
  collector_towels: 'Just towels. A cover-up, but not the kind I am investigating.',
  collector_bath: 'Nothing useful. I am investigating a theft, not water pressure.'
};

export function configureApartmentHotspots(objects, layout) {
  const sources = new Map();
  for (const object of objects || []) {
    if (!object?.id || sources.has(object.id)) throw new Error('Duplicate or invalid apartment object ID.');
    sources.set(object.id, object);
  }
  const mapped = new Set(layout.slots.map(entry => entry.sourceId).filter(Boolean));
  for (const id of sources.keys()) {
    if (!mapped.has(id)) throw new Error(`Apartment layout has no slot for object: ${id}. Evidence has not been discarded.`);
  }
  return layout.slots.map(entry => {
    const original = entry.sourceId ? sources.get(entry.sourceId) : null;
    const id = entry.sourceId || `layout_${entry.id}`;
    return {
      ...(original || {}), id, layoutSlotId: entry.id, roomId: entry.roomId,
      label: entry.label, description: entry.description, inspectText: entry.description,
      actionHint: entry.actionHint, discoveryAction: entry.discoveryAction,
      position: {x: entry.x, y: entry.y}, size: {w: entry.w, h: entry.h},
      unlocks: (original?.unlocks || []).filter(Boolean).map(item => ({...item})),
      state: original?.state || 'open', requiresItem: original?.requiresItem,
      animation: undefined, afterSearchText: 'Already checked. Nothing else to collect here.',
      emptySearchText: EMPTY_TEXT[entry.id] || 'Nothing useful. Not every hiding place has received the memo.'
    };
  });
}