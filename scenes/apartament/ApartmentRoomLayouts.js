// Coordinates refer to the original 1920 x 1080 background images.
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
  }
};

export function getApartmentRoomLayout(packId) {
  const source = APARTMENT_ROOM_LAYOUTS[packId];
  return source ? JSON.parse(JSON.stringify(source)) : null;
}

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
      ...(original || {}),
      id,
      layoutSlotId: entry.id,
      roomId: entry.roomId,
      label: entry.label,
      description: entry.description,
      inspectText: entry.description,
      actionHint: entry.actionHint,
      discoveryAction: entry.discoveryAction,
      position: {x: entry.x, y: entry.y},
      size: {w: entry.w, h: entry.h},
      unlocks: (original?.unlocks || []).filter(Boolean).map(item => ({...item})),
      state: original?.state || 'open',
      requiresItem: original?.requiresItem,
      animation: undefined,
      afterSearchText: 'Already checked. Nothing else to collect here.',
      emptySearchText: entry.id === 'kitchen_mug'
        ? 'Cold coffee. No clues. The real victim here was breakfast.'
        : entry.id === 'kitchen_bin'
          ? 'Peelings, packaging, and a regrettable smell. Nothing useful.'
          : entry.id === 'kitchen_bag'
            ? 'An empty shopping bag. A surprisingly accurate portrait of my finances.'
            : entry.id === 'kitchen_floor_paper'
              ? 'An old shopping list. No secret code. Just onions.'
              : 'Nothing useful. Not every hiding place has received the memo.'
    };
  });
}