import {
  getCaseClockStatus,
  minutesToClock
} from '../CaseTimeHelper.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  PhoneCallScene
} from '../scenes/PhoneCallScene.js';

import {
  DialogUI
} from './DialogUI.js';

const CALL_SCENE_KEY = 'EscapeTimeIncomingCallScene';

class EscapeTimeIncomingCallScene extends PhoneCallScene {
  constructor() {
    super();

    this.sys.settings.key = CALL_SCENE_KEY;

    this.callOwner = null;
    this.hqDialog = null;
    this.phoneRoot = null;
  }

  init(data = {}) {
    super.init(data);

    this.callOwner = data.callOwner || null;
    this.hqDialog = null;
    this.phoneRoot = null;

    this.phoneWidth = 0;
    this.phoneHeight = 0;
    this.answeringCall = false;
    this.callFinished = false;
  }

  create() {
    const owner = this.callOwner;

    if (
      !owner ||
      owner.destroyed ||
      !owner.isOpen
    ) {
      this.scene.stop();
      return;
    }

    super.create();

    const answerButton = this.ui.find(
      object => object?.text === '[ ANSWER ]'
    );

    const ignoreButton = this.ui.find(
      object => object?.text === '[ IGNORE ]'
    );

    const caller = this.ui.find(
      object => object?.text === 'DETECTIVE BUREAU'
    );

    if (!answerButton || !ignoreButton) {
      console.error(
        '[EscapeTimeCallUI] Incoming phone controls are missing.'
      );

      owner.cancelFromPhone(this);
      return;
    }

    // Replace the hypothesis-specific actions.
    answerButton.removeAllListeners('pointerdown');
    ignoreButton.removeAllListeners('pointerdown');

    caller?.setText('MARK AGENCY\nHQ');

    answerButton.on(
      'pointerdown',
      (pointer, _x, _y, event) => {
        event?.stopPropagation();

        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        this.answerCall();
      }
    );

    ignoreButton.on(
      'pointerdown',
      (pointer, _x, _y, event) => {
        event?.stopPropagation();

        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        this.ignoreCall();
      }
    );

    this.phoneWidth = this.scale.width;
    this.phoneHeight = this.scale.height;

    this.phoneRoot = this.add.container(
      0,
      0,
      this.ui.slice(1)
    ).setDepth(2001);

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layoutCall,
      this
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ENTER',
      this.handleAdvance,
      this
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-SPACE',
      this.handleAdvance,
      this
    );

    this.layoutCall();
    this.scene.bringToTop();
  }

  layoutCall() {
    const { width, height } = this.scale;

    this.ui[0]?.setSize(width, height);

    if (this.phoneRoot && !this.answeringCall) {
      const scale = Math.max(
        0.01,
        Math.min(
          1,
          (width - 24) / 400,
          (height - 24) / 700
        )
      );

      this.phoneRoot
        .setScale(scale)
        .setPosition(
          width / 2 - this.phoneWidth * scale / 2,
          height / 2 - this.phoneHeight * scale / 2
        );
    }

    if (this.hqDialog) {
      this.hqDialog.overlay
        ?.setPosition(width / 2, height / 2)
        .setSize(width, height);

      this.hqDialog.container?.setPosition(
        width / 2,
        height - 220
      );
    }
  }

  handleAdvance(event) {
    if (event?.repeat || !this.hqDialog?.isOpen) {
      return;
    }

    event?.preventDefault?.();
    this.hqDialog.advance();
  }

  answerCall() {
    if (
      this.answeringCall ||
      this.callFinished ||
      this.isShuttingDown ||
      !this.callOwner ||
      this.callOwner.destroyed
    ) {
      return;
    }

    this.answeringCall = true;
    this.isAnswered = true;
    this.isEnding = true;

    this.stopRinging();

    for (const object of this.ui) {
      object?.setVisible(false);
    }

    this.phoneRoot?.setVisible(false);

    try {
      this.hqDialog = new DialogUI(this);

      this.hqDialog.overlay.setDepth(4000);
      this.hqDialog.container.setDepth(4001);

      this.hqDialog.open(
        this.callOwner.getDialogue(),
        {
          onClose: () => this.finishCall()
        }
      );

      this.layoutCall();
    } catch (error) {
      console.error(
        '[EscapeTimeCallUI] Could not open HQ conversation:',
        error
      );

      this.callOwner?.cancelFromPhone(this);
    }
  }

  ignoreCall() {
    if (
      this.answeringCall ||
      this.callFinished ||
      this.isShuttingDown
    ) {
      return;
    }

    this.callFinished = true;
    this.isEnding = true;

    this.stopRinging();

    // Ignoring dismisses this notification.
    // It does not change the deadline or unlock any evidence.
    this.callOwner?.close();
  }

  finishCall() {
    if (
      this.callFinished ||
      this.isShuttingDown
    ) {
      return;
    }

    this.callFinished = true;
    this.callOwner?.close();
  }

  update() {
    if (
      this.callOwner &&
      !this.callOwner.destroyed &&
      this.callOwner.isOpen
    ) {
      this.scene.bringToTop();
    }
  }

  onShutdown() {
    const owner = this.callOwner;

    this.callOwner = null;

    this.hqDialog?.destroy();
    this.hqDialog = null;

    super.onShutdown();

    this.phoneRoot?.destroy();
    this.phoneRoot = null;

    if (
      owner &&
      !owner.destroyed &&
      owner.isOpen
    ) {
      owner.cancelFromPhone(this);
    }
  }
}

export class EscapeTimeCallUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.state = options.state ?? scene.gameState;
    this.caseKey = String(options.caseKey ?? '');
    this.onClose = options.onClose;

    this.isOpen = false;
    this.destroyed = false;

    this.handleSceneEnd = () => this.destroy();
  }

  getClock() {
    return getCaseClockStatus(this.state);
  }

  getMessage() {
    const clock = this.getClock();

    if (
      !clock.valid ||
      clock.escapeDeadline == null
    ) {
      return 'The case clock is unavailable.';
    }

    if (clock.totalExpired) {
      return [
        'The deadline has expired.',
        'Headquarters would like a word.',
        'Preferably several very convincing words.'
      ].join('\n\n');
    }

    const remainingMinutes = Math.max(
      0,
      Math.ceil(clock.remainingSeconds / 60)
    );

    const days = Math.floor(remainingMinutes / 1440);

    const hours = Math.floor(
      (remainingMinutes % 1440) / 60
    );

    const minutes = remainingMinutes % 60;

    const remaining = [];

    if (days) {
      remaining.push(`${days}d`);
    }

    if (hours || days) {
      remaining.push(`${hours}h`);
    }

    remaining.push(`${minutes}m`);

    const deadline = minutesToClock(
      clock.escapeDeadline
    );

    const hour = String(deadline.hour).padStart(2, '0');
    const minute = String(deadline.minute).padStart(2, '0');

    return [
      'The ticket analysis is complete. Your suspect is on the move.',
      (
        `Time remaining: ${remaining.join(' ')}.\n` +
        `Deadline: Day ${deadline.day}, ${hour}:${minute}.`
      ),
      'This is your existing case deadline. The paperwork does not come with bonus days.'
    ].join('\n\n');
  }

  getDialogue() {
    return {
      speaker: 'Headquarters',
      portraitKey: 'portrait_hq',
      lines: this.getMessage().split('\n\n')
    };
  }

  getPhoneScene() {
    return (
      this.scene?.scene?.manager?.keys?.[CALL_SCENE_KEY] ||
      null
    );
  }

  open() {
    if (
      this.destroyed ||
      this.isOpen ||
      !this.scene?.sys?.isActive() ||
      !this.state ||
      !this.caseKey
    ) {
      return false;
    }

    const clock = this.getClock();

    if (
      !clock.valid ||
      !clock.escapeActive ||
      clock.totalExpired ||
      clock.remainingSeconds <= 0
    ) {
      return false;
    }

    const manager = this.scene.scene.manager;
    const existing = this.getPhoneScene();

    if (
      existing &&
      (
        existing.sys.isActive() ||
        existing.sys.isPaused() ||
        existing.sys.isSleeping() ||
        existing.sys.settings.status === Phaser.Scenes.LOADING ||
        existing.sys.settings.status === Phaser.Scenes.CREATING
      )
    ) {
      return false;
    }

    try {
      if (!existing) {
        manager.add(
          CALL_SCENE_KEY,
          EscapeTimeIncomingCallScene,
          false
        );
      }

      this.isOpen = true;

      this.scene.events.once(
        Phaser.Scenes.Events.SHUTDOWN,
        this.handleSceneEnd
      );

      this.scene.events.once(
        Phaser.Scenes.Events.DESTROY,
        this.handleSceneEnd
      );

      this.scene.scene.launch(
        CALL_SCENE_KEY,
        {
          callOwner: this,
          sourceScene: this.scene.sys.settings.key,
          cityId: this.state.currentCityId,
          caseKey: this.caseKey
        }
      );

      return true;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  close() {
    if (!this.isOpen || this.destroyed) return;

    this.state.caseData ??= {};
    this.state.caseData.escapeTimeCalls ??= {};

    const calls = this.state.caseData.escapeTimeCalls;

    calls[this.caseKey] = {
      ...calls[this.caseKey],
      seen: true
    };

    const onClose = this.onClose;

    this.destroy();

    try {
      requestAutosave();
    } finally {
      onClose?.();
    }
  }

  cancelFromPhone(phone) {
    if (
      this.destroyed ||
      phone?.callOwner &&
      phone.callOwner !== this
    ) {
      return;
    }

    // Do not record an interrupted or failed call as seen.
    const onClose = this.onClose;

    this.destroy();
    onClose?.();
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.isOpen = false;

    this.scene?.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleSceneEnd
    );

    this.scene?.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.handleSceneEnd
    );

    const phone = this.getPhoneScene();

    if (phone?.callOwner === this) {
      phone.callOwner = null;

      this.scene.scene.stop(CALL_SCENE_KEY);
    }

    this.onClose = null;
  }
}