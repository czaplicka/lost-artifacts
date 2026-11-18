import { dialogueText as __dialogueText } from './dialogues/DialogueText.js';

const TYPES = [
  'librery', 'airport', 'alley', 'bank', 'garbage', 'harbor',
  'hotel', 'parking', 'police', 'restaurant', 'museum'
];

const ALIASES = {
  library: 'librery',
  policehq: 'police',
  hotel_maid: 'hotel',
  parking_bg: 'parking'
};

const NPC_TYPES = {
  librarian: 'librery',
  bankier: 'bank',
  fence: 'alley',
  knajpa: 'restaurant',
  maid: 'hotel',
  parkingowy: 'parking',
  police: 'police',
  stewardessa: 'airport',
  bum: 'garbage',
  sailor: 'harbor'
};

const LABELS = {
  librery: 'Library',
  airport: __dialogueText('locationIcons.js', 't_7f440f59d02bad7072be'),
  alley: __dialogueText('locationIcons.js', 't_152993db06fed24a98ff'),
  bank: __dialogueText('locationIcons.js', 't_676c471bc8dc3d132413'),
  garbage: __dialogueText('locationIcons.js', 't_d293c30b5755baf5e02d'),
  harbor: __dialogueText('locationIcons.js', 't_8a8c65415401f7ed0a68'),
  hotel: __dialogueText('locationIcons.js', 't_509b3c4e5dad347d7d5f'),
  parking: __dialogueText('locationIcons.js', 't_d840fedf2a52b3d97393'),
  police: __dialogueText('locationIcons.js', 't_e0cc86d123eb4754e7b3'),
  restaurant: __dialogueText('locationIcons.js', 't_1212ea9e20949ffca0ac'),
  museum: 'Museum'
};

const FALLBACK = 'map_location_placeholder_v1';

export function getLocationIconType(locationId, city = null, npcId = null) {
  const place = city?.cityPlaces?.[locationId];
  const id = place?.typeId || locationId;
  const type = ALIASES[id] || id;
  if (TYPES.includes(type)) return type;
  if (place) return null;
  return NPC_TYPES[npcId] || null;
}

export function getLocationIconKey(locationId, city = null, npcId = null) {
  const type = getLocationIconType(locationId, city, npcId);
  return type ? `map_location_${type}` : null;
}
export function getAvailableLocationIconKey(
  scene,
  locationId,
  city = null,
  npcId = null
) {
  const key = getLocationIconKey(
    locationId,
    city,
    npcId
  );

  if (key && scene.textures.exists(key)) {
    return key;
  }

  return ensureFallback(scene);
}
export function getLocationLabel(locationId, city = null, npcId = null) {
  const place = city?.cityPlaces?.[locationId];
  if (place?.name) return place.name;

  const type = getLocationIconType(locationId, city, npcId);
  if (LABELS[type]) return LABELS[type];

  return String(
    place?.typeId ||
    locationId ||
    __dialogueText('locationIcons.js', 't_15b61974b2707a7b3d42')
  )
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function queueLocationIcons(scene) {
  for (const type of TYPES) {
    const key = `map_location_${type}`;
    if (!scene.textures.exists(key)) {
      scene.load.image(key, `assets/map_locations/${type}.webp`);
    }
  }
}

function ensureFallback(scene) {
  if (scene.textures.exists(FALLBACK)) return FALLBACK;

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(0x263f47, 1);
  graphics.fillRoundedRect(4, 4, 120, 120, 12);
  graphics.lineStyle(4, 0xd8b678, 1);
  graphics.strokeRoundedRect(4, 4, 120, 120, 12);
  graphics.strokeCircle(64, 48, 20);
  graphics.lineBetween(47, 61, 64, 99);
  graphics.lineBetween(81, 61, 64, 99);
  graphics.generateTexture(FALLBACK, 128, 128);
  graphics.destroy();

  return FALLBACK;
}

export function fitLocationIcon(image, size) {
  const frame = image.frame;
  const width = frame?.realWidth || frame?.width || image.width || 1;
  const height = frame?.realHeight || frame?.height || image.height || 1;
  image.setScale(size / Math.max(width, height, 1));
  return image;
}

export function createLocationIcon(
  scene, x, y, locationId, city = null, npcId = null,
  size = 132, onReady = null
) {
  const key = getLocationIconKey(locationId, city, npcId);
  const image = scene.add.image(
    x, y, key && scene.textures.exists(key) ? key : ensureFallback(scene)
  );

  fitLocationIcon(image, size);

  if (key && !scene.textures.exists(key)) {
    const ready = addedKey => {
      if (addedKey !== key || !image.active) return;
      scene.textures.off('addtexture', ready);
      image.setTexture(key);
      fitLocationIcon(image, size);
      onReady?.(image);
    };

    scene.textures.on('addtexture', ready);
    image.once('destroy', () => scene.textures.off('addtexture', ready));
  }

  return image;
}