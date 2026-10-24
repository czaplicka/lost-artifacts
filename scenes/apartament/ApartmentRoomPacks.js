export const FALLBACK_APARTMENT_PACK_ID = 'debt';

// A pack may contain any set of rooms. Every room needs a matching layout.
export const APARTMENT_ROOM_PACKS = [
  {
    id: 'debt', weight: 1, layoutId: 'debt',
    rooms: {
      living_room: {
        label: 'Living Room', key: 'apartment_debt_living_room',
        path: 'assets/apartments/apartment_debt_living_room.jpg'
      },
      kitchen: {
        label: 'Kitchen', key: 'apartment_debt_kitchen',
        path: 'assets/apartments/apartment_debt_kitchen.jpg'
      }
    }
  },
  {
    id: 'research', weight: 0,
    rooms: {
      living_room: {key:'apartment_research_living_room', path:null},
      kitchen: {key:'apartment_research_kitchen', path:null}
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
