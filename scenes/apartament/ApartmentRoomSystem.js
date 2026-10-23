import { gameState } from '../../GameData.js';
import { markApartmentVisited } from '../../managers/ApartmentVisitRegistry.js';
import {
  FALLBACK_APARTMENT_PACK_ID, getApartmentRoomPack, drawApartmentRoomPack
} from './ApartmentRoomPacks.js';

const ROOMS = ['living_room', 'kitchen'];

export class ApartmentRoomSystem {
  constructor(scene) {
    this.scene = scene;
    // This constructor is reached from ApartmentScene.init, never from the lab.
    markApartmentVisited(gameState);
    this.destroyed = false;
    this.background = null;
    this.navigation = null;
    this.navigationBackground = null;
    this.navigationLabel = null;
    this.roomLabel = null;
    this.renderedPackId = null;
    this.usingFallback = false;
    this.selectionKey = JSON.stringify([
      scene.caseKey || scene.missionId,
      scene.suspectId,
      scene.mission?.artifactKey || scene.missionArtifact?.artifactKey || '',
      gameState.currentCaseId ?? null,
      gameState.investigationStartTime ?? null
    ]);
    const saved = scene.getProgress().roomPackSelections?.[this.selectionKey];
    this.packId = typeof saved?.packId === 'string' ? saved.packId : drawApartmentRoomPack().id;
    this.roomId = ROOMS.includes(saved?.roomId) ? saved.roomId : 'living_room';
    if (!saved) this.persistSelection();
    this.handleResize = () => this.layout();
  }
  persistSelection() {
    if (this.destroyed) return;
    this.scene.updateProgress({ roomPackSelections: {
      ...(this.scene.getProgress().roomPackSelections || {}),
      [this.selectionKey]: { packId: this.packId, roomId: this.roomId }
    }});
  }
  preload() {
    const selected = getApartmentRoomPack(this.packId);
    const fallback = getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID);
    const queued = new Set();
    for (const pack of [fallback, selected]) {
      if (!pack) continue;
      for (const room of Object.values(pack.rooms)) {
        if (!room.path || queued.has(room.key) || this.scene.textures.exists(room.key)) continue;
        this.scene.load.image(room.key, room.path); queued.add(room.key);
      }
    }
  }
  isComplete(pack) {
    return Boolean(pack && ROOMS.every(id => {
      const room = pack.rooms?.[id];
      return room?.key && this.scene.textures.exists(room.key);
    }));
  }
  resolveVisualPack() {
    const selected = getApartmentRoomPack(this.packId);
    const fallback = getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID);
    const visual = this.isComplete(selected) ? selected : fallback;
    this.renderedPackId = visual?.id || null;
    this.usingFallback = this.renderedPackId !== this.packId;
    return visual;
  }
  create() {
    const scene = this.scene;
    this.roomLabel = scene.add.text(scene.scale.width / 2, 116, '', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#fff3d6',
      backgroundColor: '#000000aa', padding: { x: 9, y: 5 }
    }).setOrigin(0.5, 0).setDepth(120);
    this.navigation = scene.add.container(0, 0).setDepth(150);
    this.navigationBackground = scene.add.rectangle(0, 0, 210, 48, 0x493d30)
      .setStrokeStyle(2, 0xd4af37).setInteractive({ useHandCursor: true });
    this.navigationLabel = scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '19px', color: '#fff3d6'
    }).setOrigin(0.5);
    this.navigation.add([this.navigationBackground, this.navigationLabel]);
    this.navigationBackground.on('pointerover', () => this.navigationBackground.setFillStyle(0x65533e));
    this.navigationBackground.on('pointerout', () => this.navigationBackground.setFillStyle(0x493d30));
    this.navigationBackground.on('pointerdown', () => {
      if (scene.isTransitioning || scene.leaveDialog || scene.getPlayerHudScene()?.isAnyPanelOpen()) return;
      this.showRoom(this.roomId === 'living_room' ? 'kitchen' : 'living_room');
    });
    scene.scale.on('resize', this.handleResize);
    this.render();
  }
  showRoom(id) {
    if (this.destroyed || !ROOMS.includes(id)) return false;
    if (this.scene.isTransitioning || this.scene.leaveDialog) return false;
    this.roomId = id; this.persistSelection(); this.scene.showDescription(''); this.render();
    return true;
  }
  render() {
    if (this.destroyed) return;
    const pack = this.resolveVisualPack(), room = pack?.rooms?.[this.roomId];
    this.background?.destroy();
    const { width, height } = this.scene.scale;
    if (room?.key && this.scene.textures.exists(room.key)) {
      this.background = this.scene.add.image(width / 2, height / 2, room.key).setDisplaySize(width, height).setDepth(0);
    } else {
      console.error('[ApartmentRoomSystem] Even the fallback room graphic is missing:', this.roomId);
      this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x2c2c2c).setDepth(0);
    }
    this.roomLabel?.setText(this.roomId === 'kitchen' ? 'Kitchen' : 'Living Room');
    this.navigationLabel?.setText(this.roomId === 'kitchen' ? '< Living Room' : 'Kitchen >');
    this.applyObjectVisibility(); this.layout();
  }
  applyObjectVisibility() {
    for (const object of this.scene.apartmentObjects || []) {
      const id = ROOMS.includes(object.config?.roomId) ? object.config.roomId : 'living_room';
      const visible = id === this.roomId;
      object.container?.setVisible(visible);
      if (object.background?.input) object.background.input.enabled = visible;
    }
  }
  layout() {
    if (this.destroyed) return;
    const { width, height } = this.scene.scale;
    if (this.background?.type === 'Image') this.background.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    else this.background?.setPosition(width / 2, height / 2).setSize(width, height);
    this.roomLabel?.setPosition(width / 2, 116);
    this.navigation?.setPosition(Math.max(115, width - 130), Math.max(180, height - 112));
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene?.scale?.off('resize', this.handleResize);
    this.background?.destroy(); this.navigation?.destroy(true); this.roomLabel?.destroy();
    this.background = this.navigation = this.roomLabel = null;
    this.navigationBackground = this.navigationLabel = null; this.scene = null;
  }
}
