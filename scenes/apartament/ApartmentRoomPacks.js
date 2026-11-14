import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { APARTMENT_ROOM_LAYOUTS } from './ApartmentRoomLayouts.js';
import { RESEARCH_APARTMENT_LAYOUT } from './ApartmentResearchLayout.js';

APARTMENT_ROOM_LAYOUTS.research = RESEARCH_APARTMENT_LAYOUT;

export const FALLBACK_APARTMENT_PACK_ID = 'debt';

export const APARTMENT_ROOM_PACKS = [
  {
    id: 'debt', weight: 1, layoutId: 'debt',
    rooms: {
      living_room: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_e4a3c880ef7402c5a457"), key: 'apartment_debt_living_room',
        path: 'assets/apartments/apartment_debt_living_room.webp'
      },
      kitchen: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_d98e82ae3ccb80a7cf9d"), key: 'apartment_debt_kitchen',
        path: 'assets/apartments/apartment_debt_kitchen.webp'
      }
    }
  },
  {
    id: 'collector', weight: 1, layoutId: 'collector',
    rooms: {
      bedroom: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_8534c527c8ce30470387"), key: 'apartment_collector_bedroom',
        path: 'assets/apartments/apartment_collector_bedroom.webp'
      },
      bathroom: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_5834e3de253061c7c9de"), key: 'apartment_collector_bathroom',
        path: 'assets/apartments/apartment_collector_bathroom.webp'
      }
    }
  },
  {
    id: 'research', weight: 1, layoutId: 'research',
    rooms: {
      living_room: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_e4a3c880ef7402c5a457"), key: 'apartment_research_living_room',
        path: 'assets/apartments/apartment_research_living_room.webp'
      },
      kitchen: {
        label: __dialogueText("scenes/apartament/ApartmentRoomPacks.js", "t_d98e82ae3ccb80a7cf9d"), key: 'apartment_research_kitchen',
        path: 'assets/apartments/apartment_research_kitchen.webp'
      }
    }
  },
  {
    id: 'family', weight: 0,
    rooms: {
      living_room: {key:'apartment_family_living_room', path:null},
      kitchen: {key:'apartment_family_kitchen', path:null}
    }
  },
  {
    id: 'luxury', weight: 0,
    rooms: {
      living_room: {key:'apartment_luxury_living_room', path:null},
      kitchen: {key:'apartment_luxury_kitchen', path:null}
    }
  }
];

export function getApartmentRoomPack(id) {
  return APARTMENT_ROOM_PACKS.find(pack => pack.id === id) || null;
}

export function drawApartmentRoomPack(random = Math.random) {
  const candidates = APARTMENT_ROOM_PACKS.filter(pack =>
    Number.isFinite(pack.weight) && pack.weight > 0 && pack.layoutId &&
    Object.keys(pack.rooms || {}).length &&
    Object.values(pack.rooms).every(room => room.key && room.path)
  );
  if (!candidates.length) return getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID);
  const total = candidates.reduce((sum, pack) => sum + pack.weight, 0);
  const value = Number(random());
  let remaining = Math.max(0, Math.min(1 - Number.EPSILON, Number.isFinite(value) ? value : 0)) * total;
  for (const pack of candidates) {
    remaining -= pack.weight;
    if (remaining < 0) return pack;
  }
  return candidates[candidates.length - 1];
}