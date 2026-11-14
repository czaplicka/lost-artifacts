const LOCAL = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const round = n => Math.round(n * 100) / 100;

export class ApartmentHotspotDebug {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;
    this.enabled = false;
    this.selectedId = null;
    this.bindings = [];
    this.labels = [];
    if (!LOCAL) return;
    this.graphics = this.scene.add.graphics().setDepth(19000).setVisible(false);
    this.text = this.scene.add.text(14, 150, '', {
      fontFamily: 'SpecialElite', fontSize: '15px', color: '#fff1ce',
      backgroundColor: '#151710', padding: {x: 8, y: 6},
      wordWrap: {width: Math.max(160, this.scene.scale.width - 28)}
    }).setDepth(19001).setVisible(false);
    this.keyHandler = event => this.onKey(event);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  objects() {
    return (this.scene.apartmentObjects || []).filter(object => object.config?.roomId === this.system.roomId);
  }

  blocked() {
    return this.scene.isTransitioning || this.scene.leaveDialog ||
      this.scene.getPlayerHudScene()?.isAnyPanelOpen();
  }

  attach() {
    if (!LOCAL) return;
    const all = this.scene.apartmentObjects || [];
    if (this.lastObjects === all) return;
    this.detach();
    this.lastObjects = all;
    for (const object of all) {
      const zone = object.background;
      if (!zone?.input) continue;
      const select = () => {
        if (!this.enabled || this.blocked()) return;
        this.selectedId = object.config.layoutSlotId;
        this.draw();
      };
      let start = null;
      const dragStart = pointer => {
        if (!this.enabled || this.blocked()) return;
        select();
        const slot = this.system.slotFor(object);
        start = slot ? {px:pointer.x, py:pointer.y, x:slot.x, y:slot.y} : null;
      };
      const drag = pointer => {
        if (!this.enabled || this.blocked() || !start) return;
        const slot = this.system.slotFor(object);
        slot.x = round(start.x + (pointer.x - start.px) * this.system.layoutConfig.width / this.scene.scale.width);
        slot.y = round(start.y + (pointer.y - start.py) * this.system.layoutConfig.height / this.scene.scale.height);
        this.changed();
      };
      const dragEnd = () => {start = null;};
      zone.on('pointerdown', select);
      zone.on('dragstart', dragStart);
      zone.on('drag', drag);
      zone.on('dragend', dragEnd);
      this.bindings.push({zone, select, dragStart, drag, dragEnd});
      this.scene.input.setDraggable(zone, this.enabled);
    }
    this.draw();
  }

  detach() {
    for (const b of this.bindings) {
      b.zone.off('pointerdown', b.select);
      b.zone.off('dragstart', b.dragStart);
      b.zone.off('drag', b.drag);
      b.zone.off('dragend', b.dragEnd);
      if (b.zone.input) this.scene.input.setDraggable(b.zone, false);
    }
    this.bindings = [];
  }

  setEnabled(value) {
    if (!LOCAL || (value && this.blocked())) return;
    this.enabled = Boolean(value);
    this.scene.debugMode = this.enabled;
    for (const b of this.bindings) {
      if (b.zone.input) this.scene.input.setDraggable(b.zone, this.enabled);
    }
    this.scene.showDescription?.('');
    this.draw();
  }

  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName) ||
      event.ctrlKey || event.metaKey || this.blocked()) return;
    if (event.code === 'KeyD') {
      event.preventDefault();
      if (!event.repeat) this.setEnabled(!this.enabled);
      return;
    }
    if (!this.enabled) return;
    if (event.code === 'KeyC') {
      if (!event.repeat) this.exportConfig();
      return;
    }
    const objects = this.objects();
    if (!objects.length) return;
    let index = objects.findIndex(o => o.config.layoutSlotId === this.selectedId);
    if (event.code === 'Tab') {
      event.preventDefault();
      if (index < 0) index = event.shiftKey ? 0 : -1;
      index = (index + (event.shiftKey ? -1 : 1) + objects.length) % objects.length;
      this.selectedId = objects[index].config.layoutSlotId;
      this.draw();
      return;
    }
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) return;
    event.preventDefault();
    const object = objects[index < 0 ? 0 : index];
    this.selectedId = object.config.layoutSlotId;
    const slot = this.system.slotFor(object);
    const horizontal = ['ArrowLeft','ArrowRight'].includes(event.code);
    const direction = ['ArrowLeft','ArrowUp'].includes(event.code) ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    slot[key] = round(slot[key] + direction * (event.altKey ? 1 : 5));
    slot.w = Math.max(10, slot.w);
    slot.h = Math.max(10, slot.h);
    this.changed();
  }

  changed() {
    this.system.applyGeometry();
    this.system.saveLocalGeometry();
    this.draw();
  }

  update() {
    if (this.enabled && this.blocked()) this.setEnabled(false);
  }

  draw() {
    if (!LOCAL) return;
    this.graphics.clear().setVisible(this.enabled);
    this.text.setVisible(this.enabled);
    this.labels.forEach(label => label.destroy());
    this.labels = [];
    if (!this.enabled) return;
    const objects = this.objects();
    if (!objects.some(o => o.config.layoutSlotId === this.selectedId)) {
      this.selectedId = objects[0]?.config.layoutSlotId || null;
    }
    for (const object of objects) {
      const c = object.config;
      const {x, y} = c.position;
      const {w, h} = c.size;
      const color = c.layoutSlotId === this.selectedId ? 0xff44ff : 0x00ff88;
      this.graphics.fillStyle(color, 0.13).fillRect(x-w/2, y-h/2, w, h);
      this.graphics.lineStyle(2, color, 1).strokeRect(x-w/2, y-h/2, w, h);
      this.labels.push(this.scene.add.text(x, Math.max(110, y-h/2), c.label, {
        fontFamily:'SpecialElite', fontSize:'13px', color:'#ffffff', backgroundColor:'#151710'
      }).setOrigin(0.5, 1).setDepth(19000));
    }
    const slot = this.system.layoutConfig.slots.find(s => s.id === this.selectedId);
    this.text.setText([
      `LOCAL DEBUG | ${this.system.renderedPackId}/${this.system.roomId} | ${slot?.id || '-'}`,
      `x:${slot?.x} y:${slot?.y} w:${slot?.w} h:${slot?.h} (1920x1080 reference)`,
      'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
      'Tab / Shift+Tab: select | C: export JSON to console | D: close',
      'Interactions disabled. Geometry autosaved in this browser only.'
    ].join('\n'));
  }

  exportConfig() {
    const text = JSON.stringify({packId:this.system.renderedPackId, ...this.system.layoutConfig}, null, 2);
    console.log('APARTMENT LAYOUT — geometry only; no suspect or evidence data:');
    console.log(text);
    this.scene.showDescription?.('Layout exported to the browser console. Copy the JSON to keep it outside this browser.');
  }

  destroy() {
    this.detach();
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.graphics?.destroy();
    this.text?.destroy();
    this.labels.forEach(label => label.destroy());
    this.labels = [];
    this.scene.debugMode = false;
  }
}

export const apartmentLocalDebugAllowed = LOCAL;
