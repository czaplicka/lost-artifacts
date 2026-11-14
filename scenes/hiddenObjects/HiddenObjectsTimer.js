import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { EventBus } from '../../EventBus.js';

const TIME_PASSED_FLAVOR_LINES = [
  __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_29dbf20f878a6fb234aa"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_d6c5bba163bc4e22cd07"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_0f3805b4fa5ccf37eb17"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_e0bdac2bf4c24a681236"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_64061ca64a929702dc4d")
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
      `${hours}${__dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_7cc2c748fe15f4a5012c")}${flavor}`,
      __dialogueText("scenes/hiddenObjects/HiddenObjectsTimer.js", "t_b28e7a619dd4820a602d")
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