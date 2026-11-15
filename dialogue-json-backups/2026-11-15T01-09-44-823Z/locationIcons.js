const TYPES = ['airport', 'alley', 'bank', 'garbage', 'harbor', 'hotel', 'parking', 'police', 'restaurant'];
const ALIASES = {policehq:'police', hotel_maid:'hotel', parking_bg:'parking'};
const NPC_TYPES = {bankier:'bank', fence:'alley', knajpa:'restaurant', maid:'hotel', parkingowy:'parking', police:'police', stewardessa:'airport', bum:'garbage', sailor:'harbor'};
const LABELS = {airport:'Airport', alley:'Alley', bank:'Bank', garbage:'Garbage Area', harbor:'Harbor', hotel:'Hotel', parking:'Parking Lot', police:'Police Station', restaurant:'Restaurant'};
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
export function getLocationLabel(locationId, city = null, npcId = null) {
  const place = city?.cityPlaces?.[locationId];
  if (place?.name) return place.name;
  const type = getLocationIconType(locationId, city, npcId);
  if (LABELS[type]) return LABELS[type];
  return String(place?.typeId || locationId || 'Location').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function queueLocationIcons(scene) {
  for (const type of TYPES) {
    const key = `map_location_${type}`;
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/map_locations/${type}.webp`);
  }
}
function ensureFallback(scene) {
  if (scene.textures.exists(FALLBACK)) return FALLBACK;
  const g = scene.make.graphics({x:0, y:0, add:false});
  g.fillStyle(0x263f47, 1);
  g.fillRoundedRect(4, 4, 120, 120, 12);
  g.lineStyle(4, 0xd8b678, 1);
  g.strokeRoundedRect(4, 4, 120, 120, 12);
  g.strokeCircle(64, 48, 20);
  g.lineBetween(47, 61, 64, 99);
  g.lineBetween(81, 61, 64, 99);
  g.generateTexture(FALLBACK, 128, 128);
  g.destroy();
  return FALLBACK;
}
export function fitLocationIcon(image, size) {
  const frame = image.frame;
  const width = frame?.realWidth || frame?.width || image.width || 1;
  const height = frame?.realHeight || frame?.height || image.height || 1;
  image.setScale(size / Math.max(width, height, 1));
  return image;
}
export function createLocationIcon(scene, x, y, locationId, city = null, npcId = null, size = 132, onReady = null) {
  const key = getLocationIconKey(locationId, city, npcId);
  const image = scene.add.image(x, y, key && scene.textures.exists(key) ? key : ensureFallback(scene));
  fitLocationIcon(image, size);
  if (key && !scene.textures.exists(key)) {
    const ready = addedKey => {
      if (addedKey !== key || !image.active) return;
      scene.textures.off('addtexture', ready);
      image.setTexture(key);
      fitLocationIcon(image, size);
      onReady?.(image);
    };
    const remove = () => scene.textures.off('addtexture', ready);
    scene.textures.on('addtexture', ready);
    image.once('destroy', remove);
  }
  return image;
}
