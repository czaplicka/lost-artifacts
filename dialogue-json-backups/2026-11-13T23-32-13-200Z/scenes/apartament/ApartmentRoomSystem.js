import { gameState } from '../../GameData.js';
import { markApartmentVisited } from '../../managers/ApartmentVisitRegistry.js';
import {
  FALLBACK_APARTMENT_PACK_ID,
  getApartmentRoomPack,
  drawApartmentRoomPack
} from './ApartmentRoomPacks.js';
import {
  getApartmentRoomLayout,
  configureApartmentHotspots
} from './ApartmentRoomLayouts.js';
import {
  ApartmentHotspotDebug,
  apartmentLocalDebugAllowed
} from './ApartmentHotspotDebug.js';
import { ApartmentHintUI } from './ApartmentHintUI.js';

export class ApartmentRoomSystem {
  constructor(scene) {
    this.scene = scene;
    markApartmentVisited(gameState);

    this.destroyed = false;
    this.background = null;
    this.navigation = null;
    this.navigationBackground = null;
    this.navigationLabel = null;
    this.roomLabel = null;
    this.debugger = null;
    this.hintUI = null;
    this.newsSnapshot = null;
    this.layoutConfig = null;
    this.renderedPackId = null;
    this.usingFallback = false;

    this.selectionKey = JSON.stringify([
      scene.caseKey || scene.missionId,
      scene.suspectId,
      scene.mission?.artifactKey ||
        scene.missionArtifact?.artifactKey ||
        '',
      gameState.currentCaseId ?? null,
      gameState.investigationStartTime ?? null
    ]);

    const saved =
      scene.getProgress().roomPackSelections?.[this.selectionKey];

    this.packId =
      typeof saved?.packId === 'string'
        ? saved.packId
        : drawApartmentRoomPack().id;

    const selectedPack = getApartmentRoomPack(this.packId);
    const firstRoomId =
      Object.keys(selectedPack?.rooms || {})[0] ||
      'living_room';

    this.roomId =
      typeof saved?.roomId === 'string'
        ? saved.roomId
        : firstRoomId;

    this.handleResize = () => this.layout();

    this.handleTick = () => {
      if (this.destroyed || !this.scene.sys.isActive()) return;

      this.hideNewsHud();
      this.debugger?.update();
    };

    if (!saved) this.persistSelection();
  }

  persistSelection() {
    if (this.destroyed) return;

    this.scene.updateProgress({
      roomPackSelections: {
        ...(this.scene.getProgress().roomPackSelections || {}),
        [this.selectionKey]: {
          packId: this.packId,
          roomId: this.roomId
        }
      }
    });
  }

  preload() {
    const queued = new Set();

    const packs = [
      getApartmentRoomPack(FALLBACK_APARTMENT_PACK_ID),
      getApartmentRoomPack(this.packId)
    ];

    for (const pack of packs) {
      for (const room of Object.values(pack?.rooms || {})) {
        if (
          !room.path ||
          queued.has(room.key) ||
          this.scene.textures.exists(room.key)
        ) {
          continue;
        }

        this.scene.load.image(room.key, room.path);
        queued.add(room.key);
      }
    }
  }

  isComplete(pack) {
    return Boolean(
      pack?.layoutId &&
      getApartmentRoomLayout(pack.layoutId) &&
      Object.keys(pack.rooms || {}).length &&
      Object.values(pack.rooms).every(
        room => room.key && this.scene.textures.exists(room.key)
      )
    );
  }

  resolveVisualPack() {
    const selected = getApartmentRoomPack(this.packId);
    const fallback = getApartmentRoomPack(
      FALLBACK_APARTMENT_PACK_ID
    );

    const visual = this.isComplete(selected)
      ? selected
      : fallback;

    this.renderedPackId = visual?.id || null;
    this.usingFallback = this.renderedPackId !== this.packId;

    return visual;
  }

  create() {
    const scene = this.scene;
    const pack = this.resolveVisualPack();

    this.visualPack = pack;
    this.roomIds = Object.keys(pack?.rooms || {});
    this.layoutConfig = getApartmentRoomLayout(pack?.layoutId);

    if (!this.layoutConfig) {
      throw new Error(
        `Missing apartment layout for ${pack?.id}`
      );
    }

    if (!this.roomIds.includes(this.roomId)) {
      this.roomId = this.roomIds[0];
    }

    for (const slot of this.layoutConfig.slots) {
      if (!this.roomIds.includes(slot.roomId)) {
        throw new Error(
          `Unknown room in apartment slot: ${slot.id}`
        );
      }
    }

    this.loadLocalGeometry();

    scene.apartmentConfig.objects = configureApartmentHotspots(
      scene.apartmentConfig.objects,
      this.layoutConfig
    );

    this.persistSelection();

    this.roomLabel = scene.add.text(
      scene.scale.width / 2,
      116,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#fff3d6',
        backgroundColor: '#000000aa',
        padding: { x: 9, y: 5 }
      }
    ).setOrigin(0.5, 0).setDepth(120);

    this.navigation = scene.add.container(0, 0).setDepth(150);

    this.navigationBackground = scene.add.rectangle(
      0,
      0,
      230,
      48,
      0x493d30
    )
      .setStrokeStyle(2, 0xd4af37)
      .setInteractive({ useHandCursor: true });

    this.navigationLabel = scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite',
      fontSize: '19px',
      color: '#fff3d6'
    }).setOrigin(0.5);

    this.navigation.add([
      this.navigationBackground,
      this.navigationLabel
    ]);

    this.navigationBackground.on('pointerover', () => {
      this.navigationBackground.setFillStyle(0x65533e);
    });

    this.navigationBackground.on('pointerout', () => {
      this.navigationBackground.setFillStyle(0x493d30);
    });

    this.navigationBackground.on('pointerdown', () => {
      if (
        scene.isTransitioning ||
        scene.leaveDialog ||
        scene.getPlayerHudScene()?.isAnyPanelOpen()
      ) {
        return;
      }

      this.showRoom(this.nextRoomId());
    });

    scene.scale.on('resize', this.handleResize);
    scene.events.on('preupdate', this.handleTick);

    this.debugger = new ApartmentHotspotDebug(this);

    this.hideNewsHud();
    this.render();

    this.hintUI = new ApartmentHintUI(scene);
    this.hintUI.create();
  }

  nextRoomId() {
    return this.roomIds[
      (this.roomIds.indexOf(this.roomId) + 1) %
        this.roomIds.length
    ];
  }

  navigationGoesLeft() {
    const currentIndex = this.roomIds.indexOf(this.roomId);
    const nextIndex = this.roomIds.indexOf(this.nextRoomId());

    return (
      currentIndex >= 0 &&
      nextIndex >= 0 &&
      nextIndex < currentIndex
    );
  }

  showRoom(id) {
    if (
      this.destroyed ||
      !this.roomIds.includes(id) ||
      this.scene.isTransitioning ||
      this.scene.leaveDialog ||
      this.scene.getPlayerHudScene()?.isAnyPanelOpen()
    ) {
      return false;
    }

    this.hintUI?.clearHintMarker();
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
      this.background = this.scene.add.image(
        width / 2,
        height / 2,
        room.key
      )
        .setDisplaySize(width, height)
        .setDepth(0);
    } else {
      console.error(
        '[ApartmentRoomSystem] Missing background:',
        room?.key
      );

      this.background = this.scene.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x2c2c2c
      ).setDepth(0);
    }

    this.roomLabel.setText(
      room.label || this.roomId.replaceAll('_', ' ')
    );

    const nextId = this.nextRoomId();
    const next = this.visualPack.rooms[nextId];
    const label = next?.label || nextId;

    this.navigationLabel.setText(
      this.navigationGoesLeft()
        ? `< ${label}`
        : `${label} >`
    );

    this.navigation.setVisible(this.roomIds.length > 1);

    this.applyObjectVisibility();
    this.layout();
  }

  slotFor(object) {
    return this.layoutConfig.slots.find(
      slot => slot.id === object.config?.layoutSlotId
    );
  }

  applyGeometry() {
    if (!this.layoutConfig) return;

    const sx =
      this.scene.scale.width / this.layoutConfig.width;

    const sy =
      this.scene.scale.height / this.layoutConfig.height;

    for (const object of this.scene.apartmentObjects || []) {
      const slot = this.slotFor(object);

      if (!slot) continue;

      const x = slot.x * sx;
      const y = slot.y * sy;
      const w = slot.w * sx;
      const h = slot.h * sy;

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

      if (object.background?.input) {
        object.background.input.enabled = visible;
      }
    }

    this.debugger?.attach();
    this.debugger?.draw();
  }

  layout() {
    if (this.destroyed) return;

    const { width, height } = this.scene.scale;

    if (this.background?.type === 'Image') {
      this.background
        .setPosition(width / 2, height / 2)
        .setDisplaySize(width, height);
    } else {
      this.background
        ?.setPosition(width / 2, height / 2)
        .setSize(width, height);
    }

    this.roomLabel?.setPosition(width / 2, 116);

    if (this.navigation) {
      const buttonWidth = Math.min(
        230,
        Math.max(40, width - 24)
      );

      const scale = buttonWidth / 230;
      const left = 12 + buttonWidth / 2;
      const right = width - 12 - buttonWidth / 2;

      this.navigation.setScale(scale).setPosition(
        this.navigationGoesLeft() ? left : right,
        Math.max(180, height - 112)
      );
    }

    this.applyGeometry();
    this.debugger?.draw();
  }

  geometryStorageKey() {
    return (
      'lost-artifacts:apartment-layout:v1:' +
      this.renderedPackId
    );
  }

  loadLocalGeometry() {
    if (!apartmentLocalDebugAllowed) return;

    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          this.geometryStorageKey()
        ) || 'null'
      );

      if (
        !saved ||
        saved.width !== this.layoutConfig.width ||
        saved.height !== this.layoutConfig.height
      ) {
        return;
      }

      for (const slot of this.layoutConfig.slots) {
        const value = saved.slots?.find(
          entry => entry.id === slot.id
        );

        if (
          !value ||
          !['x', 'y', 'w', 'h'].every(
            key => Number.isFinite(value[key])
          ) ||
          value.w < 10 ||
          value.h < 10
        ) {
          continue;
        }

        for (const key of ['x', 'y', 'w', 'h']) {
          slot[key] = value[key];
        }
      }
    } catch (error) {
      console.warn(
        '[ApartmentRoomSystem] Local layout unavailable:',
        error
      );
    }
  }

  saveLocalGeometry() {
    if (!apartmentLocalDebugAllowed) return;

    try {
      const { width, height, slots } = this.layoutConfig;

      window.localStorage.setItem(
        this.geometryStorageKey(),
        JSON.stringify({
          width,
          height,
          slots: slots.map(({ id, x, y, w, h }) => ({
            id,
            x,
            y,
            w,
            h
          }))
        })
      );
    } catch (error) {
      console.warn(
        '[ApartmentRoomSystem] Could not save local geometry:',
        error
      );
    }
  }

  hideNewsHud() {
    const news = this.scene.scene.manager.keys.NewsHud;

    if (!news?.sys?.isActive()) return;

    if (
      !this.newsSnapshot ||
      this.newsSnapshot.scene !== news
    ) {
      this.newsSnapshot = {
        scene: news,
        visible: news.sys.settings.visible,
        inputEnabled: news.input.enabled
      };
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

    this.hintUI?.destroy();
    this.hintUI = null;

    this.scene.scale.off('resize', this.handleResize);
    this.scene.events.off('preupdate', this.handleTick);

    this.debugger?.destroy();
    this.restoreNewsHud();

    this.background?.destroy();
    this.navigation?.destroy(true);
    this.roomLabel?.destroy();

    this.background = null;
    this.navigation = null;
    this.roomLabel = null;
    this.navigationBackground = null;
    this.navigationLabel = null;
  }
}