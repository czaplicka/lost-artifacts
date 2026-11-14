import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export class OfficeElevatorRide {
  constructor(scene, setPhase) {
    this.scene = scene;
    this.setPhase = setPhase;
    this.disposed = false;
    this.pending = null;
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  wait(ms) {
    if (this.disposed) return Promise.resolve(false);
    return new Promise(resolve => {
      const pending = { resolve, timer: null };
      this.pending = pending;
      pending.timer = this.scene.time.delayedCall(ms, () => {
        if (this.pending === pending) this.pending = null;
        resolve(!this.disposed);
      });
    });
  }

  async play() {
    if (this.disposed) return false;
    this.setPhase('open');
    this.scene.showOfficeStatusMessage(__dialogueText("scenes/office/OfficeElevatorRide.js", "t_d57e1e2ae232bedfda2b"));
    if (!await this.wait(850)) return false;
    this.setPhase('closed');
    this.scene.showOfficeStatusMessage(__dialogueText("scenes/office/OfficeElevatorRide.js", "t_aa5897efa58397490146"));
    return this.wait(650);
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this);
    const pending = this.pending;
    this.pending = null;
    pending?.timer?.remove(false);
    pending?.resolve(false);
    this.scene = null;
  }
}
