import { EventBus } from '../../EventBus.js';

const TIME_PASSED_FLAVOR_LINES = [
  'You spent so long crawling on the floor that a guard asked if you lost a contact lens.',
  'Four hours of crouching behind statues. Your knees will remember this.',
  'You examined every dust bunny twice. Thoroughness has a cost: time.',
  'The museum closed and reopened while you were still under that table.',
  'You now know this room better than the people who built it. Also, it is evening.'
];

export class HiddenObjectsTimer {
  constructor(scene) {
    this.scene = scene;
  }

  start() {
    const scene = this.scene;

    this.stop();

    scene.timerEvent = scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.tick();
      }
    });

    return scene.timerEvent;
  }

  tick() {
    const scene = this.scene;

    if (scene.isSceneFinished) {
      return;
    }

    scene.timeLeft -= 1;

    scene.ui.updateTimer(scene.timeLeft);

    if (scene.timeLeft <= 0) {
      this.finishScene(false);
    }
  }

  stop() {
    const scene = this.scene;

    if (!scene.timerEvent) {
      return false;
    }

    scene.timerEvent.remove(false);
    scene.timerEvent = null;

    return true;
  }

  advanceGameTime() {
    const scene = this.scene;

    if (scene.timeAdvanced) {
      return false;
    }

    scene.timeAdvanced = true;

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) {
      return false;
    }

    EventBus.emit('advanceTime', hours, 0);

    console.log(
      '[HiddenObjectsTimer] Game time advanced.',
      {
        sceneId: scene.sceneId,
        hours
      }
    );

    return true;
  }

  showTimeAdvanceToast() {
    const scene = this.scene;

    const hours = Number.isFinite(scene.timeCostHours)
      ? scene.timeCostHours
      : 4;

    if (hours <= 0) {
      return false;
    }

    const flavor = TIME_PASSED_FLAVOR_LINES[
      Math.floor(
        Math.random() *
        TIME_PASSED_FLAVOR_LINES.length
      )
    ];

    scene.ui.showMessage(
      `${hours}h passed. ${flavor}`,
      '#9fd3ff'
    );

    return true;
  }

  finishScene(success) {
    const scene = this.scene;

    if (
      scene.flow &&
      typeof scene.flow.finishScene === 'function'
    ) {
      scene.flow.finishScene(success);

      return;
    }

    if (typeof scene.finishScene === 'function') {
      scene.finishScene(success);

      return;
    }

    console.error(
      '[HiddenObjectsTimer] No scene completion handler is available.',
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