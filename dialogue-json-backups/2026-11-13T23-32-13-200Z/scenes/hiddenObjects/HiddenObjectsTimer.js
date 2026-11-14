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

  canUseTimer() {
    const scene = this.scene;

    return Boolean(
      scene &&
      !scene._cleanupDone &&
      !scene.isShuttingDownHiddenObjects &&
      !scene.isSceneFinished &&
      !scene.isReturning
    );
  }

  canRun() {
    return Boolean(
      this.canUseTimer() &&
      this.scene.sys?.isActive()
    );
  }

  start() {
    this.stop();

    const scene = this.scene;

    // create() może jeszcze nie oznaczać aktywnej sceny.
    // Aktywność sprawdzamy w tick(), nie przy tworzeniu timera.
    if (!this.canUseTimer() || !scene.time) {
      return null;
    }

    const initialTime = Number(scene.timeLeft);

    scene.timeLeft = Number.isFinite(initialTime)
      ? Math.max(0, Math.ceil(initialTime))
      : 120;

    scene.ui?.updateTimer?.(scene.timeLeft);

    scene.timerEvent = scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tick()
    });

    return scene.timerEvent;
  }

  tick() {
    if (!this.canRun()) {
      return;
    }

    const scene = this.scene;

    scene.timeLeft = Math.max(0, scene.timeLeft - 1);
    scene.ui?.updateTimer?.(scene.timeLeft);

    if (scene.timeLeft === 0) {
      this.finishScene(false);
    }
  }

  stop() {
    const scene = this.scene;
    const timerEvent = scene?.timerEvent;

    if (!timerEvent) {
      return false;
    }

    scene.timerEvent = null;
    timerEvent.remove(false);

    return true;
  }

  advanceGameTime() {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      scene.isShuttingDownHiddenObjects ||
      scene.timeAdvanced
    ) {
      return false;
    }

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) {
      return false;
    }

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
      !scene ||
      scene._cleanupDone ||
      scene.isShuttingDownHiddenObjects ||
      !scene.timeAdvanced
    ) {
      return false;
    }

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) {
      return false;
    }

    const flavor = TIME_PASSED_FLAVOR_LINES[
      Math.floor(
        Math.random() * TIME_PASSED_FLAVOR_LINES.length
      )
    ];

    scene.ui?.showMessage?.(
      `${hours}h passed. ${flavor}`,
      '#9fd3ff'
    );

    return true;
  }

  finishScene(success) {
    if (!this.canRun()) {
      return;
    }

    const scene = this.scene;

    this.stop();

    if (typeof scene.finishScene === 'function') {
      scene.finishScene(Boolean(success));
      return;
    }

    console.error(
      '[HiddenObjectsTimer] Scene completion handler is unavailable.',
      {
        success,
        sceneKey: scene.scene?.key
      }
    );
  }

  destroy() {
    this.stop();
  }
}