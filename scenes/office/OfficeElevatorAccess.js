import { dialogueText } from '../../dialogues/DialogueText.js';
import { OfficeElevatorRide } from './OfficeElevatorRide.js';
const FILE = 'scenes/office/OfficeElevatorAccess.js';
const text = id => dialogueText(FILE, id);

export function canAccessUpperOffice(state) {
  const solved = Number(state?.casesSolved ?? 0);
  return Number.isFinite(solved) && solved >= 4;
}

export function getElevatorTexture(state, phase = 'closed') {
  if (!canAccessUpperOffice(state)) return 'elevator_broken';
  return phase === 'open' ? 'elevator_open' : 'elevator_close';
}

export class OfficeElevatorAccess {
  constructor(scene) {
    this.scene = scene;
    this.busy = false;
    this.disposed = false;
    this.phase = 'closed';
    this.ride = null;
    this.runToken = scene._runToken;
    this.zone = scene.hotspotManager?.findById('brokenElevator') ?? null;
    const data = this.zone?.hotspotData;
    this.originalAction = data?.action;
    this.originalLabel = data?.label;
    this.originalMonologueKey = data?.monologueKey;
    if (data) {
      this.action = () => this.travelUp();
      data.action = this.action;
      data.monologueKey = null;
    } else {
      console.error('[OfficeElevatorAccess] Missing brokenElevator hotspot.');
    }
    this.originalMeta = scene.getOfficeRoomMeta;
    this.meta = key => {
      const base = this.originalMeta?.call(scene, key) ?? {};
      if (key !== 'elevator') return base;
      return {
        ...base, label: text('t_8ec78fd4e0c76ee47e25'),
        subtitle: canAccessUpperOffice(scene.gameState)
          ? text('t_0aead6ee916721ac990b') : text('t_24d8f84a780c7168cc3f')
      };
    };
    scene.getOfficeRoomMeta = this.meta;
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.refresh();
  }

  isCurrentRun() {
    return !this.disposed && this.scene && this.scene._runToken === this.runToken;
  }

  isCurrentAndActive() {
    return Boolean(this.isCurrentRun() && this.scene.isOfficeActive());
  }

  refresh() {
    if (!this.isCurrentRun()) return;
    const scene = this.scene;
    const bg = scene.elevatorBackground ?? scene.rooms?.elevator?.bg;
    const key = getElevatorTexture(scene.gameState, this.phase);
    if (bg?.active && scene.textures.exists(key) && bg.texture?.key !== key) {
      bg.setTexture(key).setDisplaySize(scene.rooms.elevator.width, scene.scale.height);
    }
    const data = this.zone?.hotspotData;
    if (data) data.label = canAccessUpperOffice(scene.gameState)
      ? text('t_fe65a52b0310e4087609') : text('t_b4ec7e8514ad74d6ba30');
    scene.navigation?.refreshRoomMeta?.();
  }

  async travelUp() {
    if (!this.isCurrentAndActive() || this.busy) return false;
    const scene = this.scene;
    scene.refreshPanelLock();
    if (scene.uiLocked || scene.navigation?.isMoving || scene._officePanelRequest ||
        scene.isOfficeTutorialBlocking?.()) return false;
    if (!canAccessUpperOffice(scene.gameState)) {
      this.refresh();
      scene.showOfficeStatusMessage(text('t_05ccbaf37a88bf4f31a5'));
      return false;
    }
    for (const key of ['elevator_broken', 'elevator_close', 'elevator_open']) {
      if (!scene.textures.exists(key)) {
        console.error('[OfficeElevatorAccess] Missing texture:', key);
        scene.showOfficeStatusMessage(text('t_3aa79f910bc9ae35d9c4'));
        return false;
      }
    }
    this.busy = true;
    let ride = null;
    try {
      scene.refreshPanelLock();
      scene.navigation?.hideHint();
      const { openMediumOffice } = await import('../../mediumOfficeLauncher.js');
      if (!this.isCurrentAndActive()) return false;
      await scene.flushOfficeAutosave();
      if (!this.isCurrentAndActive()) return false;
      if (!canAccessUpperOffice(scene.gameState) || scene.isOfficeTutorialBlocking?.()) return false;
      ride = new OfficeElevatorRide(scene, phase => {
        if (!this.isCurrentAndActive()) return;
        this.phase = phase;
        this.refresh();
      });
      this.ride = ride;
      const completed = await ride.play();
      if (!completed || !this.isCurrentAndActive()) return false;
      ride.destroy();
      this.ride = null;
      this.phase = 'closed';
      this.refresh();
      const opened = openMediumOffice(scene.game);
      if (!opened) throw new Error('The upper-floor scene is already open.');
      return true;
    } catch (error) {
      console.error('[OfficeElevatorAccess]', error);
      if (this.isCurrentAndActive()) {
        scene.showOfficeStatusMessage(text('t_7b274d5845e0d38958ec'));
      }
      return false;
    } finally {
      ride?.destroy();
      if (this.ride === ride) this.ride = null;
      this.busy = false;
      this.phase = 'closed';
      if (this.isCurrentAndActive()) {
        this.refresh();
        scene.refreshPanelLock();
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    const scene = this.scene;
    this.disposed = true;
    this.ride?.destroy();
    this.ride = null;
    scene?.events.off('shutdown', this.destroy, this);
    scene?.events.off('destroy', this.destroy, this);
    if (this.zone?.hotspotData?.action === this.action) {
      Object.assign(this.zone.hotspotData, {
        action: this.originalAction,
        label: this.originalLabel,
        monologueKey: this.originalMonologueKey
      });
    }
    if (scene?.getOfficeRoomMeta === this.meta) scene.getOfficeRoomMeta = this.originalMeta;
    this.zone = null;
    this.scene = null;
  }
}
