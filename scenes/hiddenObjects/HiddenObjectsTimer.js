import { EventBus } from '../../EventBus.js';

const TIME_PASSED_FLAVOR_LINES = [
  'You spent so long crawling on the floor that a guard asked if you lost a contact lens.',
  'Your knees have submitted a formal complaint.',
  'You examined every dust bunny twice. Thoroughness has a cost: time.',
  'A guard offered you a mop. Apparently, you looked qualified.',
  'You now know this room better than the people who built it.'
];

export class HiddenObjectsTimer {
  constructor(scene) {
    this.scene = scene;
  }

  canRun() {
    const scene = this.scene;

    return Boolean(
      scene &&
      !scene._cleanupDone &&
      !scene.isShuttingDownHiddenObjects &&
      !scene.isSceneFinished &&
      !scene.isReturning &&
      scene.sys?.isActive()
    );
  }

  start() {
    this.stop();

    if (!this.canRun()) return null;

    const scene = this.scene;

    scene.timerEvent = scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tick()
    });

    return scene.timerEvent;
  }

  tick() {
    if (!this.canRun()) return;

    const scene = this.scene;

    scene.timeLeft = Math.max(0, scene.timeLeft - 1);
    scene.ui.updateTimer(scene.timeLeft);

    if (scene.timeLeft === 0) {
      this.finishScene(false);
    }
  }

  stop() {
    const scene = this.scene;

    if (!scene.timerEvent) return false;

    scene.timerEvent.remove(false);
    scene.timerEvent = null;

    return true;
  }

  advanceGameTime() {
    const scene = this.scene;

    if (
      scene._cleanupDone ||
      scene.isShuttingDownHiddenObjects ||
      scene.timeAdvanced
    ) {
      return false;
    }

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) return false;

    scene.timeAdvanced = true;

    EventBus.emit('advanceTime', hours, 0);

    if (scene.debugZones) {
      console.debug(
        '[HiddenObjectsTimer] Game time advanced.',
        {
          sceneId: scene.sceneId,
          hours
        }
      );
    }

    return true;
  }

  showTimeAdvanceToast() {
    const scene = this.scene;

    if (
      scene._cleanupDone ||
      scene.isShuttingDownHiddenObjects ||
      !scene.timeAdvanced
    ) {
      return false;
    }

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) return false;

    const flavor = TIME_PASSED_FLAVOR_LINES[
      Math.floor(
        Math.random() * TIME_PASSED_FLAVOR_LINES.length
      )
    ];

    scene.ui.showMessage(
      `${hours}h passed. ${flavor}`,
      '#9fd3ff'
    );

    return true;
  }

  finishScene(success) {
    if (!this.canRun()) return;

    const scene = this.scene;

    if (typeof scene.finishScene === 'function') {
      scene.finishScene(Boolean(success));
      return;
    }

    console.error(
      '[HiddenObjectsTimer] ' +
      'Scene completion handler is unavailable.',
      {
        success,
        sceneKey: scene.scene.key
      }
    );
  }

  destroy() {
    this.stop();
  }
}