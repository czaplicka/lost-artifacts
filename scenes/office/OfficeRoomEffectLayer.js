export class OfficeRoomEffectLayer {
  constructor(scene, roomKey, textureKey) {
    this.scene = scene;
    this.roomKey = roomKey;
    this.textureKey = textureKey;
    this.objects = [];
    this.maskGraphics = [];
    this.masks = [];
    this.masked = [];
    this.elapsed = 0;
    this.updateCount = 0;
    this.disposed = false;
    this.visible = false;
  }

  background() {
    const room = this.scene.rooms?.[this.roomKey];
    if (room?.bg?.texture?.key === this.textureKey) return room.bg;
    return Object.values(this.scene.rooms ?? {}).find(r => r.bg?.texture?.key === this.textureKey)?.bg ?? room?.bg;
  }

  graphics(polygons = null) {
    // Root-level graphics: their transforms and masks use the same world coordinates.
    const item = this.scene.add.graphics().setVisible(false);
    this.objects.push(item);
    if (polygons) {
      const shape = this.scene.make.graphics({ x: 0, y: 0, add: false });
      shape.fillStyle(0xffffff, 1);
      for (const points of polygons) shape.fillPoints(
        Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[i * 2], y: points[i * 2 + 1] })), true);
      const mask = shape.createGeometryMask();
      item.setMask(mask);
      this.maskGraphics.push(shape);
      this.masks.push(mask);
      this.masked.push(item);
    }
    return item;
  }

  start() {
    this.layout();
    this.scene.events.on('update', this.update, this);
    this.scene.scale.on('resize', this.layout, this);
    this.scene.events.once('shutdown', this.destroy, this);
    this.scene.events.once('destroy', this.destroy, this);
    this.update(0, 0);
  }

  layout() {
    const bg = this.background();
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920, sy = bg.displayHeight / 1080;
    for (const item of [...this.objects, ...this.maskGraphics]) item.setPosition(bg.x, bg.y).setScale(sx, sy);
    for (const item of this.objects) item.setDepth(bg.depth + 3);
  }

  update(_time, delta) {
    if (this.disposed) return;
    const bg = this.background();
    const current = this.scene.navigation?.currentView ?? this.scene.currentView;
    const visible = Boolean(bg?.active && bg.visible !== false && current === this.roomKey);
    this.visible = visible;
    for (const item of this.objects) item.setVisible(visible);
    if (!visible) return;
    this.layout();
    this.elapsed += Math.min(Math.max(Number(delta) || 0, 0), 100);
    this.updateCount++;
    this.draw();
  }

  debugStatus() {
    const bg = this.background();
    return { room: this.roomKey, currentView: this.scene.currentView,
      navigationView: this.scene.navigation?.currentView, texture: bg?.texture?.key,
      initialized: !this.disposed, visible: this.visible, updates: this.updateCount,
      elapsedMs: Math.round(this.elapsed), objects: this.objects.length };
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = false;
    this.scene.events.off('update', this.update, this);
    this.scene.scale.off('resize', this.layout, this);
    this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this);
    for (const item of this.masked) item.clearMask();
    for (const item of this.objects) item.destroy();
    for (const mask of this.masks) mask.destroy();
    for (const item of this.maskGraphics) item.destroy();
    this.objects = []; this.maskGraphics = []; this.masks = []; this.masked = [];
  }
}
