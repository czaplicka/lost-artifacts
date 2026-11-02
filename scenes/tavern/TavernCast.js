// scenes/tavern/TavernCast.js
export class TavernCast {
  constructor(scene, definitions, overrides = {}) {
    this.scene = scene;
    this.members = new Map();
    this.pending = new Map();
    this.disposed = false;
    for (const [id, definition] of Object.entries(definitions)) {
      const present = typeof overrides[id] === 'boolean' ? overrides[id] : definition.present;
      const image = scene.textures.exists(definition.key)
        ? scene.add.image(0, 0, definition.key).setOrigin(0).setDepth(definition.depth)
        : null;
      if (!image) console.warn('[TavernCast] Missing texture:', id, definition.key);
      this.members.set(id, { definition, image, present });
      image?.setVisible(present);
    }
  }

  has(id) { return this.members.has(id); }

  isPresent(id) {
    const member = this.members.get(id);
    return Boolean(!this.disposed && member?.present && member.image);
  }

  getPresence() {
    return Object.fromEntries([...this.members].map(([id, member]) => [id, member.present]));
  }

  setPresent(id, present) {
    if (this.disposed || typeof present !== 'boolean' || !this.has(id)) return false;
    if (!present && this.scene.activeNpcId === id && this.scene.panel) {
      this.pending.set(id, present);
      return true;
    }
    this.pending.delete(id);
    this.apply(id, present);
    return true;
  }

  apply(id, present) {
    const member = this.members.get(id);
    member.present = present;
    member.image?.setVisible(present);
    this.scene.label?.setVisible(false);
    this.scene.refreshInteractions();
  }

  flushPending() {
    if (this.disposed) return;
    const pending = [...this.pending];
    this.pending.clear();
    for (const [id, present] of pending) this.apply(id, present);
  }

  layout(width, height) {
    for (const member of this.members.values()) {
      const p = member.definition.placement;
      member.image?.setPosition(p.x * width, p.y * height)
        .setDisplaySize(p.w * width, p.h * height);
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.pending.clear();
    for (const member of this.members.values()) member.image?.destroy();
    this.members.clear();
    this.scene = null;
  }
}
