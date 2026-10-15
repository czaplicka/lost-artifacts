// ApartmentLayouts.js
// ============================================================
// Konfiguracje layoutów mieszkań.
//
// Każdy apartament ma dwa osobne ekrany:
// - living_room
// - kitchen
//
// ApartmentScene używa danych do:
// - wyboru tła;
// - utworzenia hotspota przejścia między pokojami;
// - filtrowania obiektów wg roomId;
// - wyświetlania nazwy bieżącego pokoju.
//
// ApartmentGenerator używa danych do:
// - wyboru stylu mieszkania;
// - ograniczenia puli obiektów do danego stylu.
// ============================================================

export const APARTMENT_ROOM_IDS = {
  LIVING_ROOM: 'living_room',
  KITCHEN: 'kitchen'
};

export const APARTMENT_STYLE_IDS = {
  DEBT: 'debt',
  RESEARCH: 'research',
  FAMILY: 'family',
  LUXURY: 'luxury'
};

/**
 * Mapa: motyw sprawy -> preferowany styl mieszkania.
 *
 * `blackmail_secret` może w przyszłości losować między debt i luxury.
 * Na obecnym etapie wybieramy deterministycznie luxury, aby grafiki
 * i hotspoty były prostsze do przetestowania.
 */
export const MOTIVE_TO_APARTMENT_STYLE = {
  gambling_debt: APARTMENT_STYLE_IDS.DEBT,
  medical_treatment: APARTMENT_STYLE_IDS.FAMILY,
  blackmail_secret: APARTMENT_STYLE_IDS.LUXURY,
  repatriation_cause: APARTMENT_STYLE_IDS.RESEARCH,
  career_coverup: APARTMENT_STYLE_IDS.LUXURY,
  family_heirloom: APARTMENT_STYLE_IDS.FAMILY
};

/**
 * Wspólna konfiguracja przejścia do drugiego pokoju.
 *
 * Współrzędne są procentowe (0–1), dzięki czemu działają niezależnie
 * od docelowej rozdzielczości canvasa.
 *
 * ApartmentScene powinno policzyć:
 *
 * x = nav.x * scene.scale.width
 * y = nav.y * scene.scale.height
 * width = nav.width * scene.scale.width
 * height = nav.height * scene.scale.height
 */
const DEFAULT_ROOM_NAVIGATION = {
  living_room: {
    id: 'door_to_kitchen',
    targetRoomId: APARTMENT_ROOM_IDS.KITCHEN,

    x: 0.87,
    y: 0.47,
    width: 0.22,
    height: 0.58,

    label: 'Kitchen',
    hoverText: 'The kitchen. The refrigerator hums like it knows something.',
    cursor: 'pointer'
  },

  kitchen: {
    id: 'door_to_living_room',
    targetRoomId: APARTMENT_ROOM_IDS.LIVING_ROOM,

    x: 0.11,
    y: 0.47,
    width: 0.22,
    height: 0.58,

    label: 'Living Room',
    hoverText: 'Back to the living room.',
    cursor: 'pointer'
  }
};

/**
 * Pomocniczy factory — każdy style dostaje własne kopie danych,
 * a nie wspólne referencje do navigation.
 */
function createRoomConfig({
  id,
  label,
  imageKey,
  fallbackColor,
  navigation,
  allowedObjectIds
}) {
  return {
    id,
    label,
    imageKey,
    fallbackColor,
    navigation: {
      ...navigation
    },
    allowedObjectIds: [...allowedObjectIds]
  };
}

/**
 * Pełne style mieszkań.
 *
 * `allowedObjectIds` musi odpowiadać ID z ApartmentObjectsPool.js.
 * Nie szkodzi, jeśli część ID dodasz dopiero później: generator
 * powinien filtrować brakujące obiekty bez wywalania błędu.
 */
export const APARTMENT_LAYOUTS = {
  [APARTMENT_STYLE_IDS.DEBT]: {
    id: APARTMENT_STYLE_IDS.DEBT,

    label: 'Modest Rented Flat',

    description:
      'A worn rented flat. The bills are late, the wine is gone, and the houseplant has stopped judging anyone.',

    palette: {
      primary: 0x4f4536,
      secondary: 0x6b6d42,
      accent: 0xa97c42,
      shadow: 0x24231e
    },

    rooms: {
      [APARTMENT_ROOM_IDS.LIVING_ROOM]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.LIVING_ROOM,
        label: 'Living Room',
        imageKey: 'apartment_debt_living_room',
        fallbackColor: 0x4f4536,
        navigation: DEFAULT_ROOM_NAVIGATION.living_room,

        allowedObjectIds: [
          'desk',
          'bookshelf',
          'painting',
          'cabinet',
          'wine_rack',
          'lamp',
          'sofa',
          'desk_computer',
          'framed_photo',
          'instrument_case',
          'safe'
        ]
      }),

      [APARTMENT_ROOM_IDS.KITCHEN]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.KITCHEN,
        label: 'Kitchen',
        imageKey: 'apartment_debt_kitchen',
        fallbackColor: 0x57513b,
        navigation: DEFAULT_ROOM_NAVIGATION.kitchen,

        allowedObjectIds: [
          'fridge',
          'upper_cupboard',
          'lower_cupboard',
          'kitchen_drawer',
          'kitchen_table',
          'pantry',
          'trash_bin',
          'kettle',
          'dish_rack',
          'stove'
        ]
      })
    }
  },

  [APARTMENT_STYLE_IDS.RESEARCH]: {
    id: APARTMENT_STYLE_IDS.RESEARCH,

    label: 'Researcher’s Studio',

    description:
      'A private research archive disguised as a home. The dust has tenure.',

    palette: {
      primary: 0x3f514e,
      secondary: 0x8b683d,
      accent: 0xa65a3e,
      shadow: 0x202d30
    },

    rooms: {
      [APARTMENT_ROOM_IDS.LIVING_ROOM]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.LIVING_ROOM,
        label: 'Living Room / Study',
        imageKey: 'apartment_research_living_room',
        fallbackColor: 0x3f514e,
        navigation: DEFAULT_ROOM_NAVIGATION.living_room,

        allowedObjectIds: [
          'desk',
          'bookshelf',
          'painting',
          'sofa',
          'lamp',
          'desk_computer',
          'framed_photo',
          'instrument_case',
          'cabinet',
          'travel_trunk',
          'globe',
          'corkboard'
        ]
      }),

      [APARTMENT_ROOM_IDS.KITCHEN]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.KITCHEN,
        label: 'Kitchen',
        imageKey: 'apartment_research_kitchen',
        fallbackColor: 0x40514c,
        navigation: DEFAULT_ROOM_NAVIGATION.kitchen,

        allowedObjectIds: [
          'fridge',
          'upper_cupboard',
          'lower_cupboard',
          'kitchen_drawer',
          'kitchen_table',
          'pantry',
          'trash_bin',
          'kettle',
          'dish_rack',
          'stove',
          'travel_bag'
        ]
      })
    }
  },

  [APARTMENT_STYLE_IDS.FAMILY]: {
    id: APARTMENT_STYLE_IDS.FAMILY,

    label: 'Family Flat',

    description:
      'A carefully kept home full of history, memories, repairs, and cupboards that have seen too much.',

    palette: {
      primary: 0x7b6850,
      secondary: 0x557272,
      accent: 0x7a3942,
      shadow: 0x3d342e
    },

    rooms: {
      [APARTMENT_ROOM_IDS.LIVING_ROOM]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.LIVING_ROOM,
        label: 'Living Room',
        imageKey: 'apartment_family_living_room',
        fallbackColor: 0x7b6850,
        navigation: DEFAULT_ROOM_NAVIGATION.living_room,

        allowedObjectIds: [
          'sofa',
          'bookshelf',
          'painting',
          'cabinet',
          'desk',
          'lamp',
          'framed_photo',
          'nightstand_drawer',
          'wooden_chest',
          'glass_cabinet',
          'sewing_basket'
        ]
      }),

      [APARTMENT_ROOM_IDS.KITCHEN]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.KITCHEN,
        label: 'Kitchen',
        imageKey: 'apartment_family_kitchen',
        fallbackColor: 0x756b57,
        navigation: DEFAULT_ROOM_NAVIGATION.kitchen,

        allowedObjectIds: [
          'fridge',
          'upper_cupboard',
          'lower_cupboard',
          'kitchen_drawer',
          'kitchen_table',
          'pantry',
          'trash_bin',
          'kettle',
          'dish_rack',
          'stove',
          'medicine_cupboard',
          'recipe_book'
        ]
      })
    }
  },

  [APARTMENT_STYLE_IDS.LUXURY]: {
    id: APARTMENT_STYLE_IDS.LUXURY,

    label: 'Luxury Penthouse',

    description:
      'Every surface is expensive. Every secret is probably more expensive.',

    palette: {
      primary: 0x172b2d,
      secondary: 0x20333d,
      accent: 0xb08b3e,
      shadow: 0x10161a
    },

    rooms: {
      [APARTMENT_ROOM_IDS.LIVING_ROOM]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.LIVING_ROOM,
        label: 'Living Room',
        imageKey: 'apartment_luxury_living_room',
        fallbackColor: 0x172b2d,
        navigation: DEFAULT_ROOM_NAVIGATION.living_room,

        allowedObjectIds: [
          'desk',
          'bookshelf',
          'painting',
          'cabinet',
          'wine_rack',
          'lamp',
          'sofa',
          'framed_photo',
          'instrument_case',
          'safe',
          'glass_display_case',
          'sideboard'
        ]
      }),

      [APARTMENT_ROOM_IDS.KITCHEN]: createRoomConfig({
        id: APARTMENT_ROOM_IDS.KITCHEN,
        label: 'Kitchen',
        imageKey: 'apartment_luxury_kitchen',
        fallbackColor: 0x1c2b31,
        navigation: DEFAULT_ROOM_NAVIGATION.kitchen,

        allowedObjectIds: [
          'fridge',
          'upper_cupboard',
          'lower_cupboard',
          'kitchen_drawer',
          'kitchen_table',
          'pantry',
          'trash_bin',
          'kettle',
          'dish_rack',
          'stove',
          'kitchen_island',
          'wine_fridge',
          'glassware_cabinet',
          'travel_case'
        ]
      })
    }
  }
};

/**
 * Zwraca style dla danego motywu.
 *
 * Jeśli motyw jest nieznany, fallback to "debt", bo ma najprostsze
 * i najbezpieczniejsze hotspoty do pierwszego wdrożenia.
 */
export function getApartmentStyleIdForMotive(motiveId) {
  return (
    MOTIVE_TO_APARTMENT_STYLE[motiveId] ||
    APARTMENT_STYLE_IDS.DEBT
  );
}

/**
 * Zwraca layout, a przy błędnym ID bezpiecznie zwraca layout debt.
 */
export function getApartmentLayout(styleId) {
  return (
    APARTMENT_LAYOUTS[styleId] ||
    APARTMENT_LAYOUTS[APARTMENT_STYLE_IDS.DEBT]
  );
}

/**
 * Zwraca pojedynczy room config.
 */
export function getApartmentRoomLayout(styleId, roomId) {
  const layout = getApartmentLayout(styleId);

  return (
    layout.rooms[roomId] ||
    layout.rooms[APARTMENT_ROOM_IDS.LIVING_ROOM]
  );
}

/**
 * Zwraca listę obiektów dozwolonych w konkretnym pokoju stylu.
 */
export function getAllowedApartmentObjectIds(styleId, roomId) {
  const room = getApartmentRoomLayout(styleId, roomId);
  return [...(room.allowedObjectIds || [])];
}

/**
 * Wylicza pikselową strefę navigation z konfiguracji procentowej.
 *
 * Przykład:
 *
 * const zone = getNavigationZone(layout.rooms.living_room.navigation, width, height);
 * scene.add.zone(zone.x, zone.y, zone.width, zone.height);
 */
export function getNavigationZone(navigation, sceneWidth, sceneHeight) {
  if (!navigation) {
    return null;
  }

  return {
    id: navigation.id,
    targetRoomId: navigation.targetRoomId,
    label: navigation.label,
    hoverText: navigation.hoverText,
    cursor: navigation.cursor || 'pointer',

    x: navigation.x * sceneWidth,
    y: navigation.y * sceneHeight,
    width: navigation.width * sceneWidth,
    height: navigation.height * sceneHeight
  };
}

export default APARTMENT_LAYOUTS;