function hotspot(
  id, label, x, y, w, h, discoveryAction, description, accepts = []
) {
  return {
    id: `collector_${id}`,
    label,
    x,
    y,
    w,
    h,
    discoveryAction,
    description,
    actionHint: '',
    accepts
  };
}

function room(roomId, label, hotspots) {
  const key = `apartment_collector_${roomId}`;

  return {
    roomId,
    label,
    key,
    path: `assets/apartments/${key}.webp`,
    width: 1920,
    height: 1080,
    slots: hotspots.map(entry => ({ ...entry, roomId }))
  };
}

export const COLLECTOR_EXTRA_ROOMS = {
  living_room: room('living_room', 'Living Room', [
    hotspot(
      'living_sofa', 'Sofa Cushions',
      410, 702, 252, 122, 'move',
      'Two cushions, both carefully positioned to discourage sitting.',
      ['document', 'small_item']
    ),
    hotspot(
      'living_lamp', 'Table Lamp',
      555, 551, 99, 178, 'inspect',
      'The lighting is dramatic. The subject is a side table.'
    ),
    hotspot(
      'living_notebook', 'Notebook',
      629, 628, 66, 30, 'search',
      'A notebook small enough to carry and important enough to leave at home.',
      ['document']
    ),
    hotspot(
      'living_painting', 'Crooked Landscape',
      964, 288, 247, 178, 'move',
      'The landscape is peaceful. Its relationship with gravity is not.',
      ['document']
    ),
    hotspot(
      'living_sideboard_drawer', 'Sideboard Drawer',
      975, 575, 399, 45, 'search',
      'A shallow drawer. Finally, a piece of furniture with reasonable ambitions.',
      ['document', 'small_item']
    ),
    hotspot(
      'living_sideboard_cupboard', 'Sideboard Cupboard',
      1082, 699, 178, 148, 'search',
      'Deep enough to store something the owner has decided not to display.',
      ['document', 'small_item', 'artifact']
    ),
    hotspot(
      'living_display_cabinet', 'Display Cabinet',
      1395, 514, 255, 495, 'search',
      'The souvenir spoons appear to be under more protection than the cutlery.',
      ['document', 'small_item']
    ),
    hotspot(
      'living_shell', 'Displayed Seashell',
      818, 787, 85, 83, 'inspect',
      'The shell was free. The stand was not.'
    ),
    hotspot(
      'living_chest', 'Storage Chest',
      1703, 924, 315, 184, 'search',
      'A large storage chest. The owner has finally resisted the urge to put something on a stand.',
      ['document', 'small_item', 'artifact']
    )
  ]),

  kitchen: room('kitchen', 'Kitchen', [
    hotspot(
      'kitchen_fridge', 'Refrigerator',
      271, 699, 342, 540, 'inspect',
      'The fridge has two souvenir magnets and the air of a much larger collection.'
    ),
    hotspot(
      'kitchen_biscuit_tin', 'Biscuit Tin',
      610, 495, 155, 132, 'search',
      'A tin ornate enough to disappoint anyone who opens it expecting biscuits.',
      ['document', 'small_item']
    ),
    hotspot(
      'kitchen_left_drawer', 'Left Kitchen Drawer',
      619, 653, 255, 67, 'search',
      'The handle has been polished by years of looking for scissors.',
      ['document', 'small_item']
    ),
    hotspot(
      'kitchen_right_drawer', 'Right Kitchen Drawer',
      883, 653, 231, 67, 'search',
      'The drawer beside the tea towel. A distinction the household takes very seriously.',
      ['document', 'small_item']
    ),
    hotspot(
      'kitchen_binder', 'Recipe Binder',
      1071, 171, 144, 140, 'search',
      'The recipes are alphabetized. Dinner is still toast.',
      ['document']
    ),
    hotspot(
      'kitchen_plates', 'Display Plates',
      1300, 169, 220, 143, 'inspect',
      'Four plates on display, none apparently cleared for lunch.'
    ),
    hotspot(
      'kitchen_under_sink', 'Under-sink Cupboard',
      1136, 822, 176, 222, 'search',
      'The least glamorous cupboard in a home that gives its spoons a display case.',
      ['document', 'small_item', 'artifact']
    ),
    hotspot(
      'kitchen_pantry', 'Tall Pantry',
      1628, 460, 242, 476, 'search',
      'A tall cupboard with enough room for things that do not need an audience.',
      ['document', 'small_item', 'artifact']
    ),
    hotspot(
      'kitchen_bust', 'Bust in a Knitted Hat',
      1825, 681, 112, 220, 'inspect',
      'The only bust in the apartment dressed for the weather.'
    )
  ])
};