import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { OfficeNavigation as OfficeNavigationBase } from './OfficeNavigationBase.js';

const ARCHIVE_KEY = 'agency_archive';
const STORAGE_KEY = 'agency_storage';
const ACTION_KEYS = new Set([ARCHIVE_KEY, STORAGE_KEY]);

export class OfficeNavigation extends OfficeNavigationBase {
  constructor(scene, options = {}) {
    const views = [...(options.roomOrder ?? [])].filter(key => !ACTION_KEYS.has(key));
    const rooms = [...views];
    const recordsIndex = rooms.indexOf('cabinet');
    rooms.splice(recordsIndex >= 0 ? recordsIndex + 1 : rooms.length, 0, ARCHIVE_KEY, STORAGE_KEY);
    super(scene, { ...options, roomOrder: rooms });
    this.cameraViews = views;
    this.openingRoom = false;
    this.accessSignature = null;
    this.onAccessUpdate = () => this.refreshAccess();
  }

  create() {
    super.create();
    this.scene.events.on('update', this.onAccessUpdate);
    this.refreshAccess();
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
      return { label: __dialogueText("scenes/office/OfficeNavigation.js", "t_b22a9799327ae5c2ede9"), subtitle: this.canOpenRoom(key) ? __dialogueText("scenes/office/OfficeNavigation.js", "t_e772c82ad6d70c89e6d2") : __dialogueText("scenes/office/OfficeNavigation.js", "t_ca184496974204a0bd3f") };
    }
    if (key === STORAGE_KEY) {
      return { label: __dialogueText("scenes/office/OfficeNavigation.js", "t_b2f6362fc512ff397f91"), subtitle: this.canOpenRoom(key) ? __dialogueText("scenes/office/OfficeNavigation.js", "t_a7eba34401a0e27395fe") : __dialogueText("scenes/office/OfficeNavigation.js", "t_ca184496974204a0bd3f") };
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
    for (const node of this.railNodes) {
      if (!ACTION_KEYS.has(node.key)) continue;
      const enabled = this.canNavigate() && this.canOpenRoom(node.key);
      node.container.setAlpha(enabled ? 1 : 0.45);
      if (node.hit.input) node.hit.input.enabled = enabled;
    }
  }

  drawRoomIcon(graphics, key, color) {
    if (!ACTION_KEYS.has(key)) {
      super.drawRoomIcon(graphics, key, color);
      return;
    }
    graphics.clear();
    graphics.lineStyle(2, color, 1);
    graphics.fillStyle(color, 1);
    if (key === ARCHIVE_KEY) {
      graphics.strokeRect(-12, -8, 24, 19);
      graphics.strokeRect(-11, -13, 10, 5);
      graphics.lineBetween(-8, -2, 8, -2);
      graphics.lineBetween(-8, 3, 5, 3);
    } else {
      graphics.strokeRect(-12, -12, 24, 25);
      graphics.lineBetween(-12, -3, 12, -3);
      graphics.lineBetween(-12, 5, 12, 5);
      graphics.strokeRect(-7, -9, 7, 6);
      graphics.strokeRect(3, -9, 6, 6);
      graphics.strokeRect(-6, 0, 12, 5);
    }
  }

  updateVisibility() {
    if (this.isDestroyed) return;
    const views = this.cameraViews ?? this.roomOrder.filter(key => !ACTION_KEYS.has(key));
    const index = views.indexOf(this.currentView);
    this.updateArrow(this.leftArrow, index > 0, views[index - 1]);
    this.updateArrow(this.rightArrow, index >= 0 && index < views.length - 1, views[index + 1]);
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
      ? this.goTo(this.cameraViews[index + 1]) : false;
  }

  getLeftRoomLabel() {
    const index = this.cameraViews.indexOf(this.currentView);
    return index > 0 ? __dialogueText("scenes/office/OfficeNavigation.js", "t_631ca27fe21439d3a857") + this.getRoomLabel(this.cameraViews[index - 1]) : '';
  }

  getRightRoomLabel() {
    const index = this.cameraViews.indexOf(this.currentView);
    return index >= 0 && index < this.cameraViews.length - 1
      ? __dialogueText("scenes/office/OfficeNavigation.js", "t_631ca27fe21439d3a857") + this.getRoomLabel(this.cameraViews[index + 1]) : '';
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
    const { height } = this.scene.scale;
    const desktop = this.scene.sys.game.device.os.desktop;
    const reservedBottom = (desktop ? 185 + 44 : 145 + 38) + 16;
    const railScale = Math.abs(this.rail.scaleY);
    const railBottom = this.rail.y + (this.railMetrics.plateHeight / 2 + 6) * railScale;
    const shift = Math.max(0, railBottom - (height - reservedBottom));
    this.rail.y -= shift;
    if (this.navHint) this.navHint.y -= shift;
    if (this.introHint) this.introHint.y -= shift;
  }

  destroy() {
    if (this.isDestroyed) return;
    this.scene?.events?.off('update', this.onAccessUpdate);
    super.destroy();
  }
}
