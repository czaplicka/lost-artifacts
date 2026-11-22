import { dialogueText } from '../../dialogues/DialogueText.js';
const FILE = 'scenes/office/OfficeElevatorRide.js';

export class OfficeElevatorRide {
  constructor(scene, setPhase) {
    this.scene = scene;
    this.setPhase = setPhase;
    this.runToken = scene._runToken;
    this.disposed = false;
    this.pending = null;
    this.playing = false;
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  isCurrent() {
    return !this.disposed && this.scene && this.scene._runToken === this.runToken;
  }

  wait(ms) {
    if (!this.isCurrent() || this.pending) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const pending = { resolve, timer: null };
      this.pending = pending;
      try {
        pending.timer = this.scene.time.delayedCall(ms, () => {
          if (this.pending !== pending) return;
          this.pending = null;
          resolve(Boolean(this.isCurrent()));
        });
      } catch (error) {
        if (this.pending === pending) this.pending = null;
        reject(error);
      }
    });
  }

  async play() {
    if (!this.isCurrent() || this.playing) return false;
    this.playing = true;
    try {
      this.setPhase('open');
      if (!this.isCurrent()) return false;
      this.scene.showOfficeStatusMessage(dialogueText(FILE, 't_d57e1e2ae232bedfda2b'));
      if (!await this.wait(850)) return false;
      this.setPhase('closed');
      if (!this.isCurrent()) return false;
      this.scene.showOfficeStatusMessage(dialogueText(FILE, 't_aa5897efa58397490146'));
      return await this.wait(650);
    } finally {
      this.playing = false;
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene?.events.off('shutdown', this.destroy, this);
    this.scene?.events.off('destroy', this.destroy, this);
    const pending = this.pending;
    this.pending = null;
    pending?.timer?.remove(false);
    pending?.resolve(false);
    this.scene = null;
  }
}
