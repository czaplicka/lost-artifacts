import { dialogueText } from '../../dialogues/DialogueText.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { OfficeNavigation as OfficeNavigationBase } from './OfficeNavigationBase.js';

const FILE = 'scenes/office/OfficeNavigation.js';
const text = id => dialogueText(FILE, id);

export const OFFICE_VISIT_FLAGS = Object.freeze({
  medium: 'agencyMapVisitedMediumOffice',
  hr: 'agencyMapVisitedHR',
  doctor: 'agencyMapVisitedDoctor',
  big: 'agencyMapVisitedBigOffice'
});

const ARCHIVE_KEY = 'agency_archive';
const STORAGE_KEY = 'agency_storage';
const ACTION_KEYS = new Set([ARCHIVE_KEY, STORAGE_KEY]);

const UPPER_FLOORS = [
  [
    { label: 'ELEVATOR', icon: 'elevator' },
    { label: 'HR', icon: 'hr', flag: OFFICE_VISIT_FLAGS.hr },
    { label: 'MEDIUM OFFICE', icon: 'office', flag: OFFICE_VISIT_FLAGS.medium }
  ],
  [
    { label: 'ELEVATOR', icon: 'elevator' },
    { label: 'DOCTOR', icon: 'doctor', flag: OFFICE_VISIT_FLAGS.doctor },
    { label: 'BIG OFFICE', icon: 'office', flag: OFFICE_VISIT_FLAGS.big }
  ]
];

const NODE_WIDTH = 190;
const NODE_HEIGHT = 58;
const FLOOR_PITCH = 90;
const EDGE = 16;
const TOGGLE_SPACE = 40;

export class OfficeNavigation extends OfficeNavigationBase {
  constructor(scene, options = {}) {
    const views = [...(options.roomOrder ?? [])].filter(key => !ACTION_KEYS.has(key));
    const rooms = [...views];
    const recordsIndex = rooms.indexOf('cabinet');

    rooms.splice(
      recordsIndex >= 0 ? recordsIndex + 1 : rooms.length,
      0,
      ARCHIVE_KEY,
      STORAGE_KEY
    );

    super(scene, { ...options, roomOrder: rooms });

    this.cameraViews = views;
    this.openingRoom = false;
    this.accessSignature = null;
    this.upperRoomTiles = [];
    this.upperMapHalfWidth = 0;
    this.mapExpanded = false;
    this.mapToggle = null;

    this.onAccessUpdate = () => {
      this.refreshAccess();
      if (!this.isDestroyed && this.mapExpanded) this.refreshUpperRoomTiles();
    };
  }

  create() {
    super.create();
    if (this.rail) this.createMapToggle();
    this.scene.events.on('update', this.onAccessUpdate);
    this.layout();
    this.refreshAccess();
    this.refreshRail();
  }

  createMapToggle() {
    this.mapToggle = this.scene.add.text(0, 0, 'SHOW MAP', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#f0e6b8',
      backgroundColor: '#17110e',
      padding: { left: 12, right: 12, top: 10, bottom: 10 }
    })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(this.rail.depth + 2)
      .setInteractive({ useHandCursor: true });

    this.mapToggle.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation?.();
      if (this.isDestroyed || !this.canNavigate()) return;

      this.mapExpanded = !this.mapExpanded;
      if (this.mapExpanded) this.refreshUpperRoomTiles();
      this.layout();
      this.refreshRail();
    });
  }

  createRail() {
    super.createRail();
    if (!this.rail || !this.railMetrics) return;

    this.createUpperFloors();
    this.rail.setVisible(this.isVisible && this.mapExpanded);
  }

  createUpperFloors() {
    const { add } = this.scene;
    const { plateHeight } = this.railMetrics;
    const elevatorIndex = this.roomOrder.indexOf('elevator');
    const elevatorX = this.getNodeCenterX(Math.max(0, elevatorIndex));
    const step = this.getNodeCenterX(1) - this.getNodeCenterX(0);
    const left = elevatorX - NODE_WIDTH / 2 - 24;
    const right = elevatorX + 2 * step + NODE_WIDTH / 2 + 24;

    this.upperMapHalfWidth = Math.max(Math.abs(left), Math.abs(right)) + 6;
    this.upperRoomTiles = [];

    const layer = add.container(0, 0).setScrollFactor(0);
    this.rail.addAt(layer, 0);

    const plate = add.graphics().setScrollFactor(0);
    layer.add(plate);

    plate.lineStyle(4, 0x7d6a3d, 1);
    plate.lineBetween(elevatorX, -2 * FLOOR_PITCH, elevatorX, 0);

    UPPER_FLOORS.forEach((rooms, floorIndex) => {
      const floor = floorIndex + 1;
      const y = -floor * FLOOR_PITCH;
      const top = y - plateHeight / 2;
      const width = right - left;

      plate.fillStyle(0x000000, 0.4);
      plate.fillRoundedRect(left + 4, top + 6, width, plateHeight, 14);
      plate.fillStyle(0x120f0b, 0.95);
      plate.fillRoundedRect(left, top, width, plateHeight, 14);
      plate.lineStyle(2, 0x7d6a3d, 0.95);
      plate.strokeRoundedRect(left, top, width, plateHeight, 14);

      rooms.forEach((room, column) => {
        const x = elevatorX + column * step;
        const nodeLeft = x - NODE_WIDTH / 2;
        const nodeTop = y - NODE_HEIGHT / 2;

        if (column > 0) {
          const from = x - step + NODE_WIDTH / 2;
          plate.lineStyle(3, 0x4a3d26, 1);
          plate.lineBetween(from, y, nodeLeft, y);
          plate.fillStyle(0x7d6a3d, 1);
          plate.fillCircle((from + nodeLeft) / 2, y, 3);
        }

        plate.fillStyle(0x1d1610, 1);
        plate.fillRoundedRect(nodeLeft, nodeTop, NODE_WIDTH, NODE_HEIGHT, 8);
        plate.lineStyle(2, 0x6d5a3a, 0.9);
        plate.strokeRoundedRect(nodeLeft, nodeTop, NODE_WIDTH, NODE_HEIGHT, 8);

        const iconGraphic = add.graphics()
          .setPosition(x - 59, y + 3)
          .setScrollFactor(0);

        const labelText = add.text(x - 31, y, '', {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#b9a877'
        }).setOrigin(0, 0.5).setScrollFactor(0);

        layer.add([iconGraphic, labelText]);
        this.upperRoomTiles.push({ ...room, iconGraphic, labelText });

        if (column === 0) {
          layer.add(add.text(nodeLeft + 8, nodeTop + 6, `${floor}F`, {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#b9a877'
          }).setScrollFactor(0));
        }
      });
    });
  }

  refreshUpperRoomTiles() {
    for (const tile of this.upperRoomTiles) {
      const known = !tile.flag || MainStoryManager.hasFlag(tile.flag);
      if (tile.known === known) continue;

      tile.known = known;
      tile.labelText
        .setText(known ? tile.label : '???')
        .setColor(known ? '#d7c58f' : '#8a7c5c');

      this.fitText(tile.labelText, 116);
      this.drawRoomIcon(
        tile.iconGraphic,
        known ? tile.icon : 'unknown',
        known ? 0xb9a877 : 0x6d5a3a
      );
    }
  }

  canNavigate() {
    return !this.openingRoom && super.canNavigate();
  }

  canOpenRoom(key) {
    if (!ACTION_KEYS.has(key) || !this.scene?.isOfficeActive?.()) return false;

    if (key === ARCHIVE_KEY) {
      return typeof this.scene.openArchive === 'function' &&
        typeof this.scene.isArchiveBlocked === 'function' &&
        !this.scene.isArchiveBlocked();
    }

    return typeof this.scene.openStorage === 'function' &&
      typeof this.scene.isStorageBlocked === 'function' &&
      !this.scene.isStorageBlocked();
  }

  getMeta(key) {
    if (key === ARCHIVE_KEY) {
      return {
        label: text('t_b22a9799327ae5c2ede9'),
        subtitle: this.canOpenRoom(key)
          ? text('t_e772c82ad6d70c89e6d2')
          : text('t_ca184496974204a0bd3f')
      };
    }

    if (key === STORAGE_KEY) {
      return {
        label: text('t_b2f6362fc512ff397f91'),
        subtitle: this.canOpenRoom(key)
          ? text('t_a7eba34401a0e27395fe')
          : text('t_ca184496974204a0bd3f')
      };
    }

    return super.getMeta(key);
  }

  refreshAccess() {
    if (this.isDestroyed) return;

    const signature = [this.canOpenRoom(ARCHIVE_KEY), this.canOpenRoom(STORAGE_KEY)].join(':');
    if (signature === this.accessSignature) return;

    this.accessSignature = signature;
    this.refreshRoomMeta();
  }

  refreshRail() {
    super.refreshRail();
    if (this.isDestroyed) return;

    const mapVisible = Boolean(this.isVisible && this.mapExpanded);
    const canNavigate = this.canNavigate();

    this.rail?.setVisible(mapVisible);

    if (this.mapToggle) {
      this.mapToggle
        .setText(this.mapExpanded ? 'HIDE MAP' : 'SHOW MAP')
        .setVisible(this.isVisible)
        .setAlpha(canNavigate ? 1 : 0.55);

      if (this.mapToggle.input) {
        this.mapToggle.input.enabled = Boolean(this.isVisible && canNavigate);
      }
    }

    for (const node of this.railNodes) {
      const isAction = ACTION_KEYS.has(node.key);
      const available = isAction
        ? this.canOpenRoom(node.key)
        : node.key !== this.currentView;

      if (isAction) node.container.setAlpha(canNavigate && available ? 1 : 0.45);

      if (node.hit.input) {
        node.hit.input.enabled = Boolean(mapVisible && canNavigate && available);
      }
    }
  }

  drawRoomIcon(g, key, color) {
    if (!ACTION_KEYS.has(key) && !['hr', 'doctor', 'unknown'].includes(key)) {
      super.drawRoomIcon(g, key, color);
      return;
    }

    g.clear();
    g.lineStyle(2, color, 1);
    g.fillStyle(color, 1);

    switch (key) {
      case ARCHIVE_KEY:
        g.strokeRect(-12, -8, 24, 19);
        g.strokeRect(-11, -13, 10, 5);
        g.lineBetween(-8, -2, 8, -2);
        g.lineBetween(-8, 3, 5, 3);
        break;

      case STORAGE_KEY:
        g.strokeRect(-12, -12, 24, 25);
        g.lineBetween(-12, -3, 12, -3);
        g.lineBetween(-12, 5, 12, 5);
        g.strokeRect(-7, -9, 7, 6);
        g.strokeRect(3, -9, 6, 6);
        g.strokeRect(-6, 0, 12, 5);
        break;

      case 'hr':
        g.strokeRoundedRect(-12, -10, 24, 20, 3);
        g.strokeCircle(-6, -3, 2);
        g.lineBetween(-9, 4, -3, 4);
        g.lineBetween(1, -3, 8, -3);
        g.lineBetween(1, 3, 8, 3);
        break;

      case 'doctor':
        g.strokeRoundedRect(-12, -8, 24, 18, 3);
        g.strokeRect(-4, -12, 8, 4);
        g.fillRect(-5, -1, 10, 3);
        g.fillRect(-1, -4, 3, 9);
        break;

      case 'unknown':
        g.beginPath();
        g.moveTo(-5, -5);
        g.lineTo(-5, -8);
        g.lineTo(4, -8);
        g.lineTo(5, -4);
        g.lineTo(0, 0);
        g.lineTo(0, 3);
        g.strokePath();
        g.fillCircle(0, 8, 1.5);
        break;
    }
  }

  updateVisibility() {
    if (this.isDestroyed) return;

    const views = this.cameraViews ?? this.roomOrder.filter(key => !ACTION_KEYS.has(key));
    const index = views.indexOf(this.currentView);

    this.updateArrow(this.leftArrow, index > 0, views[index - 1]);
    this.updateArrow(
      this.rightArrow,
      index >= 0 && index < views.length - 1,
      views[index + 1]
    );

    this.refreshRail();
  }

  moveLeft() {
    if (!this.canNavigate()) return false;

    const index = this.cameraViews.indexOf(this.currentView);
    return index > 0 ? this.goTo(this.cameraViews[index - 1]) : false;
  }

  moveRight() {
    if (!this.canNavigate()) return false;

    const index = this.cameraViews.indexOf(this.currentView);
    return index >= 0 && index < this.cameraViews.length - 1
      ? this.goTo(this.cameraViews[index + 1])
      : false;
  }

  getLeftRoomLabel() {
    const index = this.cameraViews.indexOf(this.currentView);

    return index > 0
      ? text('t_631ca27fe21439d3a857') + this.getRoomLabel(this.cameraViews[index - 1])
      : '';
  }

  getRightRoomLabel() {
    const index = this.cameraViews.indexOf(this.currentView);

    return index >= 0 && index < this.cameraViews.length - 1
      ? text('t_631ca27fe21439d3a857') + this.getRoomLabel(this.cameraViews[index + 1])
      : '';
  }

  goTo(key, animate = true) {
    if (!ACTION_KEYS.has(key)) return super.goTo(key, animate);
    if (!this.canNavigate() || !this.canOpenRoom(key)) return false;

    this.openingRoom = true;
    this.hideHint();
    this.updateVisibility();
    void this.openRoom(key);
    return true;
  }

  async openRoom(key) {
    try {
      if (key === ARCHIVE_KEY) await this.scene.openArchive();
      else await this.scene.openStorage();
    } catch (error) {
      console.error('[OfficeNavigation] Could not open room:', key, error);
    } finally {
      this.openingRoom = false;

      if (!this.isDestroyed) {
        this.accessSignature = null;
        this.refreshAccess();
      }
    }
  }

  layout() {
    super.layout();
    if (this.isDestroyed || !this.scene || !this.rail || !this.railMetrics) return;

    const { width, height } = this.scene.scale;
    const desktop = this.scene.sys.game.device.os.desktop;
    const reservedBottom = Math.min(desktop ? 245 : 199, height * 0.55);
    const toggleBottom = height - reservedBottom;
    const mapBottom = toggleBottom - TOGGLE_SPACE;

    this.mapToggle?.setPosition(width / 2, toggleBottom);

    if (!this.mapExpanded) return;

    const halfWidth = Math.max(
      this.upperMapHalfWidth,
      this.railMetrics.plateWidth / 2 + 6
    );
    const topExtent = 2 * FLOOR_PITCH + this.railMetrics.plateHeight / 2;
    const bottomExtent = this.railMetrics.plateHeight / 2 + 6;

    const scale = Math.min(
      Math.abs(this.rail.scaleY),
      Math.max(1, width - 2 * EDGE) / (2 * halfWidth),
      Math.max(1, mapBottom - EDGE) / (topExtent + bottomExtent)
    );

    this.rail.setScale(scale).setPosition(width / 2, mapBottom - bottomExtent * scale);

    const mapTop = this.rail.y - topExtent * scale;
    if (this.navHint) this.navHint.y = Math.max(EDGE + 14, mapTop - 18);
    if (this.introHint) this.introHint.y = Math.max(EDGE + 14, mapTop - 52);
  }

  destroy() {
    if (this.isDestroyed) return;

    this.scene?.events?.off('update', this.onAccessUpdate);
    this.mapToggle?.destroy();
    this.mapToggle = null;
    this.upperRoomTiles = [];
    super.destroy();
  }
}