import { OfficeElevatorRide } from './OfficeElevatorRide.js';

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
    this.zone = scene.hotspotManager?.findById('brokenElevator') ?? null;
    const data = this.zone?.hotspotData;
    this.originalAction = data?.action;
    this.originalLabel = data?.label;
    this.originalMonologueKey = data?.monologueKey;
    if (data) {
      this.action = () => { void this.travelUp(); };
      data.action = this.action;
      // Do not play the broken-elevator monologue after repairs.
      data.monologueKey = null;
    } else {
      console.error('[OfficeElevatorAccess] Missing brokenElevator hotspot.');
    }
    this.originalMeta = scene.getOfficeRoomMeta;
    this.meta = key => {
      const base = this.originalMeta?.call(scene, key) ?? {};
      if (key !== 'elevator') return base;
      return { ...base, label: 'ELEVATOR', subtitle: canAccessUpperOffice(scene.gameState)
        ? 'First floor' : 'Out of order' };
    };
    scene.getOfficeRoomMeta = this.meta;
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.refresh();
  }

  refresh() {
    if (this.disposed) return;
    const scene = this.scene;
    const bg = scene.elevatorBackground ?? scene.rooms?.elevator?.bg;
    const unlocked = canAccessUpperOffice(scene.gameState);
    const key = getElevatorTexture(scene.gameState, this.phase);
    if (bg?.active && scene.textures.exists(key) && bg.texture?.key !== key) {
      bg.setTexture(key).setDisplaySize(scene.rooms.elevator.width, scene.scale.height);
    }
    const data = this.zone?.hotspotData;
    if (data) data.label = unlocked ? 'Elevator / first floor' : 'Elevator / out of order';
    scene.navigation?.refreshRoomMeta?.();
  }

  async travelUp() {
    const scene = this.scene;
    if (this.disposed || this.busy || !scene.isOfficeActive() || scene.uiLocked ||
        scene.navigation?.isMoving || scene._officePanelRequest || scene.isOfficeTutorialBlocking?.()) return false;
    if (!canAccessUpperOffice(scene.gameState)) {
      this.refresh();
      scene.showOfficeStatusMessage('OUT OF ORDER. Maintenance promises results after four solved cases.');
      return false;
    }
    for (const key of ['elevator_broken', 'elevator_close', 'elevator_open']) {
      if (!scene.textures.exists(key)) {
        console.error('[OfficeElevatorAccess] Missing texture:', key);
        scene.showOfficeStatusMessage('The elevator graphics could not be loaded.');
        return false;
      }
    }
    this.busy = true;
    scene.refreshPanelLock();
    scene.navigation?.hideHint();
    try {
      // Preload the destination code before opening the doors.
      const { openMediumOffice } = await import('../../mediumOfficeLauncher.js');
      if (this.disposed || !scene.isOfficeActive()) return false;
      await scene.flushOfficeAutosave();
      if (this.disposed || !scene.isOfficeActive()) return false;
      this.ride = new OfficeElevatorRide(scene, phase => {
        if (this.disposed) return;
        this.phase = phase;
        this.refresh();
      });
      const completed = await this.ride.play();
      if (!completed || this.disposed || !scene.isOfficeActive()) return false;
      this.ride.destroy();
      this.ride = null;
      this.phase = 'closed';
      this.refresh();
      const opened = openMediumOffice(scene.game);
      if (!opened) throw new Error('The upper-floor scene is already open.');
      return true;
    } catch (error) {
      console.error('[OfficeElevatorAccess]', error);
      if (!this.disposed && scene.isOfficeActive()) {
        scene.showOfficeStatusMessage('The elevator refuses to cooperate. Please try again.');
      }
      return false;
    } finally {
      if (!this.disposed) {
        this.ride?.destroy();
        this.ride = null;
        this.phase = 'closed';
        this.busy = false;
        this.refresh();
        scene.refreshPanelLock();
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    const scene = this.scene;
    this.ride?.destroy();
    this.ride = null;
    scene.events.off('shutdown', this.destroy, this);
    scene.events.off('destroy', this.destroy, this);
    if (this.zone?.hotspotData?.action === this.action) {
      Object.assign(this.zone.hotspotData, {
        action: this.originalAction,
        label: this.originalLabel,
        monologueKey: this.originalMonologueKey
      });
    }
    if (scene.getOfficeRoomMeta === this.meta) scene.getOfficeRoomMeta = this.originalMeta;
    this.zone = null;
    this.scene = null;
  }
}
