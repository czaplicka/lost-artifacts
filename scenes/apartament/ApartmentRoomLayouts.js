import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import { HiddenObjectsUI } from '../../ui/HiddenObjectsUI.js';
import { markApartmentVisited } from '../../managers/ApartmentVisitRegistry.js';
import { FALLBACK_APARTMENT_PACK_ID, getApartmentRoomPack, drawApartmentRoomPack } from './ApartmentRoomPacks.js';
import { getApartmentRoomLayout, configureApartmentHotspots } from './ApartmentRoomLayouts.js';
import { ApartmentHotspotDebug, apartmentLocalDebugAllowed } from './ApartmentHotspotDebug.js';

const DOORS = {
  debt: {
    living_room: { x: 1763, y: 572, w: 206, h: 900, target: 'kitchen' },
    kitchen: { x: 195, y: 599, w: 178, h: 766, target: 'living_room' }
  }
};

class ApartmentHints extends HiddenObjectsUI {
  constructor(system) {
    super(system.scene);
    this.system = system;
    this.gate = null;
    this.targetObject = null;
  }

  create() {
    this.hintBtn = this.scene.add.text(0, 0, '', {
      fontFamily: 'PressStart2P, Arial', fontSize: '14px',
      color: '#fff2c4', backgroundColor: '#604b29',
      padding: { left: 18, right: 18, top: 16, bottom: 16 }
    }).setOrigin(0.5).setDepth(150).setInteractive({ useHandCursor: true });
    this.hintBtn.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      this.openHintModal();
    });
    this.hintBtn.on('pointerover', () => {
      if (!this.hintBusy && !this.hintModalOpen) this.hintBtn.setBackgroundColor('#806338');
    });
    this.hintBtn.on('pointerout', () => this.hintBtn?.setBackgroundColor('#604b29'));
    EventBus.on('hints:changed', this.boundRefreshHintButton);
    this.refreshHintButton();
  }

  canUseHints() {
    return !this.destroyed && !this.system.destroyed &&
      this.scene.sys.isActive() && !this.scene._cleanupDone &&
      !this.scene.isTransitioning;
  }

  openHintModal() {
    if (!this.system.canInteract() || this.hintBusy || this.hintModalOpen) return;
    super.openHintModal();
  }

  remainingObjects() {
    return (this.scene.apartmentObjects || []).filter(object =>
      object.background?.active && object.getPendingItems().length > 0
    );
  }

  getRemainingZones() {
    const all = this.remainingObjects();
    const local = all.filter(object => object.config.roomId === this.system.roomId);
    return (local.length ? local : all).map(object => {
      object.background.setData('id', object.config.id);
      object.background.setData('found', false);
      return object.background;
    });
  }

  lockGameplay() {
    if (this.lockState) return;
    this.lockState = { topOnly: this.scene.input.topOnly };
    this.gate = this.scene.add.container(0, 0);
    this.scene.leaveDialog = this.gate;
    this.scene.input.setTopOnly(true);
  }

  unlockGameplay() {
    if (this.scene.leaveDialog === this.gate) this.scene.leaveDialog = null;
    this.gate?.destroy(true);
    this.gate = null;
    if (this.lockState && typeof this.lockState.topOnly === 'boolean') {
      this.scene.input?.setTopOnly(this.lockState.topOnly);
    }
    this.lockState = null;
  }

  removeHintModal() {
    this.hintModal?.destroy(true);
    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintModalOpen = false;
  }

  showMessage(text, color = '#f8e7b9') {
    if (!this.canUseHints()) return;
    this.scene.showDescription(text);
  }

  highlightZone(zone) {
    this.clearHintMarker();
    if (!this.canUseHints()) return;
    const object = this.remainingObjects().find(entry => entry.background === zone);
    if (!object) return;
    if (object.config.roomId !== this.system.roomId && !this.system.showRoom(object.config.roomId)) return;
    this.targetObject = object;
    this.hintMarker = this.scene.add.rectangle(0, 0, 10, 10, 0xffd966, 0.12)
      .setStrokeStyle(3, 0xffd966, 1).setDepth(100);
    this.updateMarker();
    this.scene.tweens.add({
      targets: this.hintMarker, alpha: 0.25, duration: 450,
      yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    this.hintMarkerTimer = this.scene.time.delayedCall(3600, () => this.clearHintMarker());
  }

  updateMarker() {
    if (!this.hintMarker) return;
    const object = this.targetObject;
    if (!object?.container?.active || object.config.roomId !== this.system.roomId ||
      !object.getPendingItems().length) {
      this.clearHintMarker();
      return;
    }
    this.hintMarker.setPosition(object.container.x, object.container.y)
      .setSize(object.background.width + 20, object.background.height + 20);
  }

  clearHintMarker() {
    super.clearHintMarker();
    this.targetObject = null;
  }

  layout() {
    const { width, height } = this.scene.scale;
    this.hintBtn?.setPosition(width / 2, Math.max(180, height - 112));
    const limit = Math.max(80, width - 32);
    if (this.hintBtn) this.hintBtn.setScale(Math.min(1, limit / this.hintBtn.width));
    this.updateMarker();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    EventBus.off('hints:changed', this.boundRefreshHintButton);
    this.sleepWaitEvent?.remove(false);
    this.sleepWaitEvent = null;
    this.removeHintModal();
    this.clearHintMarker();
    this.unlockGameplay();
    this.hintBusy = false;
    this.hintBtn?.destroy();
    this.hintBtn = null;
  }
}

export class ApartmentRoomSystem {
  constructor(scene) {
    this.scene = scene;
    markApartmentVisited(gameState);
    this.destroyed = false;
    this.background = this.navigation = this.navigationBackground = this.navigationLabel = null;
    this.roomLabel = this.debugger = this.newsSnapshot = this.layoutConfig = null;
    this.renderedPackId = null;
    this.usingFallback = false;
    this.door = this.doorLabel = this.hints = null;
    this.selectionKey = JSON.stringify([
      scene.caseKey || scene.missionId, scene.suspectId,
      scene.mission?.artifactKey || scene.missionArtifact?.artifactKey || '',
      gameState.currentCaseId ?? null, gameState.investigationStartTime ?? null
    ]);
    const saved = scene.getProgress().roomPackSelections?.[this.selectionKey];
    this.packId = typeof saved?.packId === 'string' ? saved.packId : drawApartmentRoomPack().id;
    this.roomId = typeof saved?.roomId === 'string' ? saved.roomId : 'living_room';
    this.handleResize = () => {
      if (this.hints?.hintModalOpen && !this.hints.hintBusy) this.hints.closeHintModal();
      this.layout();
    };
    this.handleTick = () => {
      if (this.destroyed || !this.scene.sys.isActive()) return;
      this.hideNewsHud();
      this.debugger?.update();
      this.hints?.updateMarker();
      if (!this.canInteract()) this.doorLabel?.setVisible(false);
    };
    if (!saved) this.persistSelection();
  }

  persistSelection() {
    if (this.destroyed) return;
    this.scene.updateProgress({ roomPackSelections: {
      ...(this.scene.getProgress().roomPackSelections || {}),
      [this.selectionKey]: { packId: this.packId, roomId: this.roomId }
    }});
  }

  preload() {
    const queued = new Set();
    for (const pack of [getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID), getApartmentRoomPack(this.packId)]) {
      for (const room of Object.values(pack?.rooms || {})) {
        if (!room.path || queued.has(room.key) || this.scene.textures.exists(room.key)) continue;
        this.scene.load.image(room.key, room.path);
        queued.add(room.key);
      }
    }
  }

  isComplete(pack) {
    return Boolean(pack?.layoutId && getApartmentRoomLayout(pack.layoutId) &&
      Object.keys(pack.rooms || {}).length && Object.values(pack.rooms).every(room =>
        room.key && this.scene.textures.exists(room.key)));
  }

  resolveVisualPack() {
    const selected = getApartmentRoomPack(this.packId);
    const fallback = getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID);
    const visual = this.isComplete(selected) ? selected : fallback;
    this.renderedPackId = visual?.id || null;
    this.usingFallback = this.renderedPackId !== this.packId;
    return visual;
  }

  canInteract() {
    return !this.destroyed && this.scene.sys.isActive() && !this.scene.isTransitioning &&
      !this.scene.leaveDialog && !this.scene.debugMode &&
      !this.hints?.hintBusy && !this.hints?.hintModalOpen &&
      !this.scene.getPlayerHudScene()?.isAnyPanelOpen();
  }

  create() {
    const scene = this.scene;
    const pack = this.resolveVisualPack();
    this.visualPack = pack;
    this.roomIds = Object.keys(pack?.rooms || {});
    this.layoutConfig = getApartmentRoomLayout(pack?.layoutId);
    if (!this.layoutConfig) throw new Error(`Missing apartment layout for ${pack?.id}`);
    if (!this.roomIds.includes(this.roomId)) this.roomId = this.roomIds[0];
    for (const slot of this.layoutConfig.slots) {
      if (!this.roomIds.includes(slot.roomId)) throw new Error(`Unknown room in apartment slot: ${slot.id}`);
    }
    this.loadLocalGeometry();
    scene.apartmentConfig.objects = configureApartmentHotspots(scene.apartmentConfig.objects, this.layoutConfig);
    this.persistSelection();
    this.roomLabel = scene.add.text(scene.scale.width / 2, 116, '', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#fff3d6',
      backgroundColor: '#000000aa', padding: { x: 9, y: 5 }
    }).setOrigin(0.5, 0).setDepth(120);
    this.navigation = scene.add.container(0, 0).setDepth(150);
    this.navigationBackground = scene.add.rectangle(0, 0, 230, 48, 0x493d30)
      .setStrokeStyle(2, 0xd4af37).setInteractive({ useHandCursor: true });
    this.navigationLabel = scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '19px', color: '#fff3d6'
    }).setOrigin(0.5);
    this.navigation.add([this.navigationBackground, this.navigationLabel]);
    this.navigationBackground.on('pointerover', () => this.navigationBackground.setFillStyle(0x65533e));
    this.navigationBackground.on('pointerout', () => this.navigationBackground.setFillStyle(0x493d30));
    this.navigationBackground.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      this.showRoom(this.nextRoomId());
    });
    this.door = scene.add.zone(0, 0, 10, 10).setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.doorLabel = scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#fff3d6',
      backgroundColor: '#241b16', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(121).setVisible(false);
    this.door.on('pointerover', () => {
      if (!this.canInteract()) return;
      this.doorLabel.setVisible(true);
      this.scene.showDescription(`Go to ${this.visualPack.rooms[this.doorTarget]?.label || 'the next room'}`);
    });
    this.door.on('pointerout', () => {
      this.doorLabel.setVisible(false);
      if (this.canInteract()) this.scene.showDescription('');
    });
    this.door.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      this.showRoom(this.doorTarget);
    });
    this.hints = new ApartmentHints(this);
    this.hints.create();
    scene.scale.on('resize', this.handleResize);
    scene.events.on('preupdate', this.handleTick);
    this.debugger = new ApartmentHotspotDebug(this);
    this.hideNewsHud();
    this.render();
  }

  nextRoomId() {
    return this.roomIds[(this.roomIds.indexOf(this.roomId) + 1) % this.roomIds.length];
  }

  showRoom(id) {
    if (!this.canInteract() || !this.roomIds.includes(id)) return false;
    this.hints?.clearHintMarker();
    this.roomId = id;
    this.persistSelection();
    this.scene.showDescription('');
    this.render();
    return true;
  }

  render() {
    if (this.destroyed) return;
    const room = this.visualPack.rooms[this.roomId];
    this.background?.destroy();
    const { width, height } = this.scene.scale;
    if (room?.key && this.scene.textures.exists(room.key)) {
      this.background = this.scene.add.image(width / 2, height / 2, room.key)
        .setDisplaySize(width, height).setDepth(0);
    } else {
      console.error('[ApartmentRoomSystem] Missing background:', room?.key);
      this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x2c2c2c).setDepth(0);
    }
    this.roomLabel.setText(room.label || this.roomId.replaceAll('_', ' '));
    const nextId = this.nextRoomId();
    const label = this.visualPack.rooms[nextId]?.label || nextId;
    this.navigationLabel.setText(nextId === 'living_room' ? `< ${label}` : `${label} >`);
    this.navigation.setVisible(this.roomIds.length > 1);
    this.doorLabel.setVisible(false);
    this.applyObjectVisibility();
    this.layout();
  }

  slotFor(object) {
    return this.layoutConfig.slots.find(slot => slot.id === object.config?.layoutSlotId);
  }

  applyGeometry() {
    if (!this.layoutConfig) return;
    const sx = this.scene.scale.width / this.layoutConfig.width;
    const sy = this.scene.scale.height / this.layoutConfig.height;
    for (const object of this.scene.apartmentObjects || []) {
      const slot = this.slotFor(object);
      if (!slot) continue;
      const x = slot.x * sx, y = slot.y * sy, w = slot.w * sx, h = slot.h * sy;
      object.config.position = { x, y };
      object.config.size = { w, h };
      object.container?.setPosition(x, y).setDepth(5);
      object.background?.setPosition(0, 0).setSize(w, h);
      object.background?.input?.hitArea?.setTo(0, 0, w, h);
    }
  }

  applyObjectVisibility() {
    this.applyGeometry();
    for (const object of this.scene.apartmentObjects || []) {
      const visible = object.config?.roomId === this.roomId;
      object.container?.setVisible(visible);
      if (object.background?.input) object.background.input.enabled = visible;
    }
    this.debugger?.attach();
    this.debugger?.draw();
  }

  layout() {
    if (this.destroyed) return;
    const { width, height } = this.scene.scale;
    if (this.background?.type === 'Image') this.background.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    else this.background?.setPosition(width / 2, height / 2).setSize(width, height);
    this.roomLabel?.setPosition(width / 2, 116);
    const toLivingRoom = this.nextRoomId() === 'living_room';
    const compact = width < 650;
    const navY = Math.max(180, height - (compact ? 174 : 112));
    this.navigation?.setPosition(toLivingRoom ? Math.min(135, width / 2) : Math.max(width / 2, width - 135), navY);
    const door = DOORS[this.visualPack?.layoutId]?.[this.roomId];
    const valid = Boolean(door && this.roomIds.includes(door.target));
    this.door?.setVisible(valid);
    if (this.door?.input) this.door.input.enabled = valid;
    this.doorTarget = valid ? door.target : null;
    if (valid) {
      const sx = width / this.layoutConfig.width, sy = height / this.layoutConfig.height;
      this.door.setPosition(door.x * sx, door.y * sy).setSize(door.w * sx, door.h * sy);
      this.door.input.hitArea.setTo(0, 0, door.w * sx, door.h * sy);
      this.doorLabel.setPosition(door.x * sx, Math.min(height - 220, door.y * sy))
        .setText(door.target === 'living_room' ? '< Living Room' : 'Kitchen >');
    }
    this.applyGeometry();
    this.hints?.layout();
    this.debugger?.draw();
  }

  geometryStorageKey() { return `lost-artifacts:apartment-layout:v1:${this.renderedPackId}`; }

  loadLocalGeometry() {
    if (!apartmentLocalDebugAllowed) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(this.geometryStorageKey()) || 'null');
      if (!saved || saved.width !== this.layoutConfig.width || saved.height !== this.layoutConfig.height) return;
      for (const slot of this.layoutConfig.slots) {
        const value = saved.slots?.find(entry => entry.id === slot.id);
        if (!value || !['x', 'y', 'w', 'h'].every(key => Number.isFinite(value[key])) || value.w < 10 || value.h < 10) continue;
        for (const key of ['x', 'y', 'w', 'h']) slot[key] = value[key];
      }
    } catch (error) { console.warn('[ApartmentRoomSystem] Local layout unavailable:', error); }
  }

  saveLocalGeometry() {
    if (!apartmentLocalDebugAllowed) return;
    try {
      const { width, height, slots } = this.layoutConfig;
      window.localStorage.setItem(this.geometryStorageKey(), JSON.stringify({
        width, height, slots: slots.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))
      }));
    } catch (error) { console.warn('[ApartmentRoomSystem] Could not save local geometry:', error); }
  }

  hideNewsHud() {
    const news = this.scene.scene.manager.keys.NewsHud;
    if (!news?.sys?.isActive()) return;
    if (!this.newsSnapshot || this.newsSnapshot.scene !== news) {
      this.newsSnapshot = { scene: news, visible: news.sys.settings.visible, inputEnabled: news.input.enabled };
    }
    news.closeMenu?.(true);
    news.scene.setVisible(false);
    news.input.enabled = false;
  }

  restoreNewsHud() {
    const saved = this.newsSnapshot;
    if (saved?.scene?.sys?.isActive()) {
      saved.scene.scene.setVisible(saved.visible);
      saved.scene.input.enabled = saved.inputEnabled;
    }
    this.newsSnapshot = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.scale.off('resize', this.handleResize);
    this.scene.events.off('preupdate', this.handleTick);
    this.hints?.destroy();
    this.debugger?.destroy();
    this.restoreNewsHud();
    this.background?.destroy();
    this.navigation?.destroy(true);
    this.roomLabel?.destroy();
    this.door?.destroy();
    this.doorLabel?.destroy();
    this.background = this.navigation = this.roomLabel = this.door = this.doorLabel = null;
    this.navigationBackground = this.navigationLabel = this.hints = null;
  }
}