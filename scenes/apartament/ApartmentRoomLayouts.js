import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// Hotspot coordinates on the original 1920 x 1080 backgrounds.
const slot = (
  id,
  sourceId,
  roomId,
  label,
  x,
  y,
  w,
  h,
  discoveryAction,
  description,
  actionHint = ''
) => ({
  id,
  sourceId,
  roomId,
  label,
  x,
  y,
  w,
  h,
  discoveryAction,
  description,
  actionHint
});

export const APARTMENT_ROOM_LAYOUTS = {
  debt: {
    width: 1920,
    height: 1080,
    slots: [
      slot(
        'desk', 'desk', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_e279e70770dbef5448d2"),
        1344, 718, 430, 390, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_961e59b4063190c8acfc"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_1b12da95e1af0d156665")
      ),
      slot(
        'bookshelf', 'bookshelf', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_cb16f903298665b2278b"),
        1082, 489, 290, 490, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_178519836eb7294f8bc4"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_69f6152bf0db57ce7512")
      ),
      slot(
        'painting', 'painting', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c948d3d96f441b8ccc61"),
        1406, 325, 255, 310, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_fae7d25ce9b8d2eadf60"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_d9f8441ab1bf3b35a5fc")
      ),
      slot(
        'cabinet', 'cabinet', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2885e50ff8e1af8a074c"),
        656, 645, 196, 190, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7631659c8c569ec444a4"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7cdca8ba92fd9fee549f")
      ),
      slot(
        'instrument_case', 'instrument_case', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7d128108569492be6e83"),
        472, 557, 160, 225, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9badcf620ce80dd599fb"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_928134922f82a8ef2ce8")
      ),
      slot(
        'wine_rack', 'wine_rack', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_08da4dede881067e0dc9"),
        855, 661, 148, 160, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7962391acf13be018069")
      ),
      slot(
        'lamp', 'lamp', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_5cee6607641235d0528e"),
        368, 479, 105, 342, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_63220edc5f0f20bc00b0"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_b7203666dfb40f46b2bd")
      ),
      slot(
        'sofa', 'sofa', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c1ff61315e3fb2628bed"),
        264, 784, 475, 335, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a23782262aef94f1a548"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9f52ff2d6ee4d1c56d58")
      ),
      slot(
        'framed_photo', 'framed_photo', 'living_room', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_77eff8eb0a84f666e83a"),
        855, 540, 84, 85, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_618336535efad9053b5b"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c576f19d00309b4a23ba")
      ),
      slot(
        'kitchen_cupboard', 'jewelry_box', 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9098268a181ed37927a5"),
        997, 305, 512, 240, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_88312d780be6a489446b")
      ),
      slot(
        'kitchen_drawers', 'nightstand_drawer', 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_09158adfe4b873d3dc83"),
        795, 787, 154, 236, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_4693c1a65481214313ce")
      ),
      slot(
        'kitchen_tall_cupboard', 'safe', 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_74b0e245780051d93a81"),
        1745, 475, 155, 610, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_3517a07be53d3f77b58a")
      ),
      slot(
        'fridge_notes', 'desk_computer', 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_5c6bee09995dcd989cb2"),
        552, 451, 202, 128, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_40449445a71714a97558"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_ee5f86a317e4cec765a3")
      ),
      slot(
        'kitchen_bin', null, 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a0c29fd02634338f7e24"),
        1737, 877, 126, 168, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_b5138ea63b1dcf77cf70")
      ),
      slot(
        'kitchen_bag', null, 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_91ced6a8305358021001"),
        1830, 952, 135, 172, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_b6155133dff3e1f753eb")
      ),
      slot(
        'kitchen_mug', null, 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_132fd121d1d399e7a28e"),
        1369, 741, 68, 80, 'inspect',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7ad033c1687c12286b8d")
      ),
      slot(
        'kitchen_floor_paper', null, 'kitchen', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_836ba5890d2c3ba1ff4b"),
        1138, 1010, 85, 48, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2fcd89e6f4bd278f8bf9"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c75320f54a3c9d603953")
      )
    ]
  },

  collector: {
    width: 1920,
    height: 1080,
    slots: [
      slot(
        'collector_wardrobe', 'bookshelf', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c9ce92f011b1fe24054e"),
        248.5, 555.75, 245, 610, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_3c06130d6806a0d5ad69"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_8a6bb87b5537179ea6fd")
      ),
      slot(
        'collector_trunk', 'instrument_case', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_1accd956cecccb51f011"),
        445.25, 721, 192, 193, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a50472df55f632b3dd78"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2d62c9a578e6e9c3d041")
      ),
      slot(
        'collector_bed', 'sofa', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_f816a74c2310179d8785"),
        783.75, 766.5, 498, 365, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_487496e9a6eb431e58ac"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_7243b5bd682fa1f31b9c")
      ),
      slot(
        'collector_bedside', 'nightstand_drawer', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_465d684fbc3518c4ed47"),
        1137, 668.25, 150, 62, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_ca920c39263297f402fa"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_539f60ae206842a703fe")
      ),
      slot(
        'collector_books', 'wine_rack', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_3d60b044ae83cd39a05e"),
        1133, 745.25, 151, 95, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_86c11e76cdbd0f238cd4"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_98710b6a7b68e645ebe4")
      ),
      slot(
        'collector_landscape', 'framed_photo', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_0a85182467a4874e865b"),
        1117.5, 328, 161, 153, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_e5e9ecadabf066dd0280"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2cef23c4841a094489c9")
      ),
      slot(
        'collector_dressing_drawer', 'desk', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_4759535228501db4ef7d"),
        1433, 667.75, 162, 76, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_4f7472baac41a5467b68"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_55fbf3152aed76e05736")
      ),
      slot(
        'collector_keepsake_box', 'jewelry_box', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a265de9738c3506744a8"),
        1570.25, 605, 90, 55, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_59f7e7abaebc15f8fb42"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_99e73885ee8ea48a98b2")
      ),
      slot(
        'collector_lamp', 'lamp', 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_5cee6607641235d0528e"),
        1287.5, 594, 110, 432, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_cc37f8f997b482603869"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_48a22b863ec8d002bf58")
      ),
      slot(
        'collector_coat', null, 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_f5dd439e9ddc7e7b36d0"),
        1730.5, 747.5, 159, 344, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_eecd30aa9799b6206db2")
      ),
      slot(
        'collector_sleeping_bust', null, 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_faa0e72b029059815de9"),
        519.75, 268.5, 103, 189, 'inspect',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_cafcb29a5403906c4b7d")
      ),
      slot(
        'collector_slippers', null, 'bedroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c385f87d80d03d9ddaf5"),
        1083, 883.5, 105, 60, 'inspect',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2c87f136a569bc85cbc6")
      ),
      slot(
        'collector_medicine', 'desk_computer', 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_eb5998bb291ba5e141b2"),
        870.75, 395, 166, 207, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_89caeaddc68c33e0cac5"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9480ebfe4f7a36edd597")
      ),
      slot(
        'collector_vanity', 'cabinet', 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9e87c75d2802a3150422"),
        1175.5, 776.5, 275, 180, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_aec7297b1bc07d7c2d52"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_6b372f471faabc82739f")
      ),
      slot(
        'collector_linen', 'safe', 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a473be87c3e9cb6e21b3"),
        1516, 568, 188, 549, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_545f72e299e60616513f"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_0b2fe5b94e315c9a200d")
      ),
      slot(
        'collector_mirror', 'painting', 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c473ee7ad6e7ad276ecf"),
        1156.75, 371.25, 183, 227, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_6b2bfce1871e604152a8"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9add1e0c983912f1bc4d")
      ),
      slot(
        'collector_laundry', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_cffbdddd8a8f725b1bbc"),
        1722, 917.5, 226, 291, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_d03d84fd45ce5099cf14")
      ),
      slot(
        'collector_bin', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_1ac7a1e3758f80586bd9"),
        951, 803.5, 121, 146, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_adf533f6d507319d8340")
      ),
      slot(
        'collector_towels', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_a17ff248249657ee8549"),
        1774, 616.25, 217, 258, 'move',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_ee91996981ced2126a44"),
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2390009a4e5822f525c3")
      ),
      slot(
        'collector_bath', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_618b618893d995290306"),
        513.75, 709.5, 306, 157, 'search',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_c2cf692bdd36542498e2")
      ),
      slot(
        'collector_duck', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_f1d44bc7226893568968"),
        224.25, 732, 69, 62, 'inspect',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_e1332503f278e072fc33")
      ),
      slot(
        'collector_shower_bust', null, 'bathroom', __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_9108fb41877bf908ac25"),
        881.25, 211, 89, 137, 'inspect',
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_3040e0769920d8befaa8")
      )
    ]
  }
};

export function getApartmentRoomLayout(packId) {
  const source = APARTMENT_ROOM_LAYOUTS[packId];
  return source ? JSON.parse(JSON.stringify(source)) : null;
}

const EMPTY_TEXT = {
  kitchen_mug: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_92f4fd7e1f96eb8072f2"),
  kitchen_bin: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_d46bd843d189cd7f9087"),
  kitchen_bag: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_e3bd393365c74c5d9ed8"),
  kitchen_floor_paper: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_61c2df07a12d730f073b"),
  collector_coat: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_f4459f5bee41c2169d46"),
  collector_laundry: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_0c857b57ac848f4c1f1a"),
  collector_bin: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_71fbda25d15e53b4dea5"),
  collector_towels: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_396a1713510cd67d4cfe"),
  collector_bath: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_2bff02c3781dc58b4a34")
};

export function configureApartmentHotspots(objects, layout) {
  const sources = new Map();

  for (const object of objects || []) {
    if (!object?.id || sources.has(object.id)) {
      throw new Error('Duplicate or invalid apartment object ID.');
    }

    sources.set(object.id, object);
  }

  const mapped = new Set(
    layout.slots.map(entry => entry.sourceId).filter(Boolean)
  );

  for (const id of sources.keys()) {
    if (!mapped.has(id)) {
      throw new Error(
        `Apartment layout has no slot for object: ${id}. Evidence has not been discarded.`
      );
    }
  }

  return layout.slots.map(entry => {
    const original = entry.sourceId
      ? sources.get(entry.sourceId)
      : null;

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
      position: {
        x: entry.x,
        y: entry.y
      },
      size: {
        w: entry.w,
        h: entry.h
      },
      unlocks: (original?.unlocks || [])
        .filter(Boolean)
        .map(item => ({ ...item })),
      state: original?.state || 'open',
      requiresItem: original?.requiresItem,
      animation: undefined,
      afterSearchText: __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_fa34ef16bc7f7192a650"),
      emptySearchText:
        EMPTY_TEXT[entry.id] ||
        __dialogueText("scenes/apartament/ApartmentRoomLayouts.js", "t_90fb0f28e2c5cf056ac0")
    };
  });
}