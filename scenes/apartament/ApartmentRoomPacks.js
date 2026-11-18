import { dialogueText } from '../../dialogues/DialogueText.js';
import { APARTMENT_ROOM_LAYOUTS } from './ApartmentRoomLayouts.js';
import { RESEARCH_APARTMENT_LAYOUT } from './ApartmentResearchLayout.js';
import { FAMILY_APARTMENT_LAYOUT } from './ApartmentFamilyLayout.js';
import { LUXURY_APARTMENT_LAYOUT } from './ApartmentLuxuryLayout.js';

APARTMENT_ROOM_LAYOUTS.research = RESEARCH_APARTMENT_LAYOUT;
APARTMENT_ROOM_LAYOUTS.family = FAMILY_APARTMENT_LAYOUT;
APARTMENT_ROOM_LAYOUTS.luxury = LUXURY_APARTMENT_LAYOUT;

const TEXT_FILE = 'scenes/apartament/ApartmentRoomPacks.js';

const LABELS = {
  living_room: dialogueText(TEXT_FILE, 't_e4a3c880ef7402c5a457'),
  kitchen: dialogueText(TEXT_FILE, 't_d98e82ae3ccb80a7cf9d'),
  bedroom: dialogueText(TEXT_FILE, 't_8534c527c8ce30470387'),
  bathroom: dialogueText(TEXT_FILE, 't_5834e3de253061c7c9de')
};

function makePack(id, roomIds) {
  return {
    id,
    weight: 1,
    layoutId: id,
    rooms: Object.fromEntries(roomIds.map(roomId => {
      const key = `apartment_${id}_${roomId}`;

      return [roomId, {
        label: LABELS[roomId],
        key,
        path: `assets/apartments/${key}.webp`
      }];
    }))
  };
}

export const FALLBACK_APARTMENT_PACK_ID = 'debt';

export const LUXURY_LISTING = {
  key: 'apartment_luxury_listing',
  path: 'assets/apartments/apartment_luxury_listing.webp'
};

export const APARTMENT_ROOM_PACKS = [
  makePack('debt', ['living_room', 'kitchen']),
  makePack('collector', ['bedroom', 'bathroom']),
  makePack('research', ['living_room', 'kitchen']),
  makePack('family', ['living_room', 'kitchen']),
  makePack('luxury', ['living_room', 'kitchen'])
];

export function getApartmentRoomPack(id) {
  return APARTMENT_ROOM_PACKS.find(pack => pack.id === id) || null;
}

export function drawApartmentRoomPack(random = Math.random) {
  const candidates = APARTMENT_ROOM_PACKS.filter(pack =>
    Number.isFinite(pack.weight) &&
    pack.weight > 0 &&
    pack.layoutId &&
    Object.keys(pack.rooms || {}).length &&
    Object.values(pack.rooms).every(room => room.key && room.path)
  );

  if (!candidates.length) {
    return getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID);
  }

  const total = candidates.reduce((sum, pack) => sum + pack.weight, 0);
  const value = Number(random());
  let remaining = Math.max(
    0,
    Math.min(1 - Number.EPSILON, Number.isFinite(value) ? value : 0)
  ) * total;

  for (const pack of candidates) {
    remaining -= pack.weight;
    if (remaining < 0) return pack;
  }

  return candidates[candidates.length - 1];
}