const LIVING_ROOM = 'living_room';
const KITCHEN = 'kitchen';

function slot(
  id, sourceId, roomId, label,
  x, y, w, h, discoveryAction, description, actionHint = ''
) {
  return {
    id, sourceId, roomId, label,
    x, y, w, h, discoveryAction, description, actionHint
  };
}

export const FAMILY_APARTMENT_LAYOUT = {
  packId: 'family',
  width: 1920,
  height: 1080,
  slots: [
    slot(
      'family_cabinet', 'cabinet', LIVING_ROOM, 'Sideboard',
      185, 780, 326, 272, 'search',
      'The good plates. Apparently no occasion has ever been good enough.'
    ),
    slot(
      'family_photo', 'framed_photo', LIVING_ROOM, 'Family Photo',
      124, 546, 132, 94, 'move',
      'Everyone is smiling. At least two people were bribed.',
      'Check behind the frame.'
    ),
    slot(
      'family_painting', 'painting', LIVING_ROOM, 'Crooked Painting',
      690, 281, 246, 181, 'move',
      'A peaceful landscape hanging at a deeply unpeaceful angle.',
      'Check behind the painting.'
    ),
    slot(
      'family_lamp', 'lamp', LIVING_ROOM, 'Floor Lamp',
      443.5, 587, 174, 617, 'move',
      'That lamp base has not moved since the carpet was new.',
      'Move the lamp.'
    ),
    slot(
      'family_sofa', 'sofa', LIVING_ROOM, 'Sofa Cushions',
      682.75, 732, 258, 139, 'move',
      'A sofa with enough pockets to have its own inventory.',
      'Lift the cushions.'
    ),
    slot(
      'family_board_games', 'bookshelf', LIVING_ROOM, 'Board Games',
      1334, 454, 286, 105, 'move',
      'A shelf of games for families that enjoy arguing with written rules.',
      'Move the board-game boxes.'
    ),
    slot(
      'family_basket', 'instrument_case', LIVING_ROOM, 'Sewing Basket',
      1519.5, 764.5, 174, 142, 'search',
      'A sewing basket with enough thread to knit an alibi.'
    ),
    slot(
      'family_desk', 'desk', LIVING_ROOM, 'Desk Drawer',
      1711, 676, 111, 41, 'search',
      'The drawer handle has seen more action than the telephone.'
    ),
    slot(
      'family_keepsake_box', 'jewelry_box', LIVING_ROOM, 'Keepsake Box',
      1848, 605, 145, 100, 'search',
      'The box is just big enough for keepsakes or very small regrets.'
    ),
    slot(
      'family_album', null, LIVING_ROOM, 'Photo Album',
      1066, 740, 184, 76, 'inspect',
      'Every vacation gets six pages. Every birthday gets an appendix.'
    ),
    slot(
      'family_chore_chart', null, LIVING_ROOM, 'Chore Chart',
      295, 305, 122, 157, 'inspect',
      'Taking out the rubbish earns one star. Remembering without being asked earns two.'
    ),
    slot(
      'family_dinosaur', null, LIVING_ROOM, 'Toy Dinosaur',
      786, 601, 102, 128, 'inspect',
      'The only member of the household who looks happy to see a detective.'
    ),
    slot(
      'family_phone', null, LIVING_ROOM, 'Landline',
      1704, 558, 155, 101, 'inspect',
      'A landline. The original way to find out who was home by bothering them.'
    ),
    slot(
      'family_trophy', null, LIVING_ROOM, 'Tiny Trophy',
      1432, 581, 67, 81, 'inspect',
      'A trophy for participation. The trophy itself barely participated.'
    ),
    slot(
      'family_fridge_notes', 'desk_computer', KITCHEN, 'Fridge Notes',
      184, 633, 185, 197, 'search',
      'The fridge doubles as the household message board.',
      'Read the notes under the magnets.'
    ),
    slot(
      'family_calendar', null, KITCHEN, 'Family Calendar',
      427, 371, 120, 157, 'inspect',
      'Three people, four colors, and somehow no one is free on Tuesday.'
    ),
    slot(
      'family_upper_cupboard', null, KITCHEN, 'Upper Cupboards',
      816, 286, 513, 193, 'inspect',
      'An entire cupboard devoted to mugs nobody is allowed to throw away.'
    ),
    slot(
      'family_lower_cupboard', 'safe', KITCHEN, 'Lower Cupboard',
      670, 711, 303, 181, 'search',
      'Most of the space is taken up by lids in search of their pots.'
    ),
    slot(
      'family_kitchen_drawer', 'nightstand_drawer', KITCHEN, 'Kitchen Drawer',
      937, 646, 161, 38, 'search',
      'The drawer everyone swears they organized last weekend.'
    ),
    slot(
      'family_biscuit_tin', null, KITCHEN, 'Biscuit Tin',
      1012, 546, 110, 76, 'inspect',
      'It says biscuits in every way except by containing biscuits.'
    ),
    slot(
      'family_binder', 'wine_rack', KITCHEN, 'Household Binder',
      1214, 582, 87, 91, 'search',
      'Instructions for every appliance except the one they still own.'
    ),
    slot(
      'family_lunchbox_star', null, KITCHEN, 'Star Lunchbox',
      1236, 469, 86, 66, 'inspect',
      'Red, with a white star. Somebody takes lunch very seriously.'
    ),
    slot(
      'family_lunchbox_fish', null, KITCHEN, 'Fish Lunchbox',
      1336, 469, 86, 66, 'inspect',
      'Blue, with a yellow fish. Mercifully, it does not smell like one.'
    ),
    slot(
      'family_lunchbox_leaf', null, KITCHEN, 'Leaf Lunchbox',
      1431, 469, 71, 66, 'inspect',
      'Green, with a white leaf. An ambitious logo for a box full of sandwiches.'
    ),
    slot(
      'family_bin', null, KITCHEN, 'Pedal Bin',
      1166, 771, 106, 130, 'inspect',
      'Clean, empty, and for once not my problem.'
    )
  ]
};