export function getHud(game) {
  const hud = game.scene.keys.PlayerHudScene;
  return hud?.sys?.isActive() && hud.isHudReady ? hud : null;
}
export function getPanel(hud, name) {
  return hud?._panelInstances?.get(name) ?? null;
}
export function menuTarget(hud, key) {
  const menu = getPanel(hud, 'playerMenu');
  if (!menu || menu.isDestroyed) return [];
  if (!menu.isOpen && !menu.isAnimating) menu.open();
  if (!menu.isOpen || menu.isAnimating) return [];
  return [menu.buttonMap?.get(key)?.hitAreaObject].filter(Boolean);
}
export function npcTargets(scene, interviewed) {
  return (scene.encounterViews || []).filter(({encounter}) =>
    !interviewed.includes(encounter.npcId) &&
    scene.isLocationOpen(encounter.locationId)
  ).map(view => view.icon);
}
export function hotelTargets(scene) {
  const objects = scene.hotelObjects || [];
  return objects.filter(object => object?.input?.enabled && object.getBounds);
}
export function boardTargets(scene) {
  return (scene.hotspotUI?.zones || [])
    .filter(entry => entry.cfg.id === 'hotel-desk')
    .map(entry => entry.zone);
}
export function screenBounds(game, object) {
  if (!object?.active || !object.scene || !object.visible) return null;
  let parent = object.parentContainer;
  while (parent) {
    if (!parent.visible || parent.alpha === 0) return null;
    parent = parent.parentContainer;
  }
  const camera = object.scene.cameras.main;
  const bounds = object.getBounds();
  const canvas = game.canvas.getBoundingClientRect();
  const sx = canvas.width / game.scale.gameSize.width;
  const sy = canvas.height / game.scale.gameSize.height;
  const fx = object.scrollFactorX ?? 1;
  const fy = object.scrollFactorY ?? 1;
  const a = camera.getWorldPoint(0, 0);
  return {
    left: canvas.left + (bounds.x - a.x * fx) * camera.zoom * sx,
    top: canvas.top + (bounds.y - a.y * fy) * camera.zoom * sy,
    width: bounds.width * camera.zoom * sx,
    height: bounds.height * camera.zoom * sy
  };
}
