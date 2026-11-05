import {
  getCaseClockStatus,
  minutesToClock
} from '../CaseTimeHelper.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

const WIDTH = 740;
const HEIGHT = 430;
const DEPTH = 50000;

export class EscapeTimeCallUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.state = options.state ?? scene.gameState;
    this.caseKey = String(options.caseKey ?? '');
    this.onClose = options.onClose;

    this.isOpen = false;
    this.destroyed = false;

    this.panel = null;
    this.backdrop = null;
    this.message = null;

    this.handleResize = () => this.layout();
    this.handleUpdate = () => this.refresh();
    this.handleSceneEnd = () => this.destroy();

    this.lastMessage = '';
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
        '',
        'Headquarters would like a word.',
        'Preferably several very convincing words.'
      ].join('\n');
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

    if (days) remaining.push(`${days}d`);
    if (hours || days) remaining.push(`${hours}h`);
    remaining.push(`${minutes}m`);

    const deadline = minutesToClock(
      clock.escapeDeadline
    );

    const hour = String(deadline.hour).padStart(2, '0');
    const minute = String(deadline.minute).padStart(2, '0');

    return [
      'The ticket analysis is complete.',
      'Your suspect is on the move.',
      '',
      `Time remaining: ${remaining.join(' ')}`,
      `Deadline: Day ${deadline.day}, ${hour}:${minute}`,
      '',
      'This is your existing case deadline.',
      'The paperwork does not come with bonus days.'
    ].join('\n');
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

    const scene = this.scene;

    try {
      this.backdrop = scene.add.rectangle(
        0,
        0,
        scene.scale.width,
        scene.scale.height,
        0x080b0d,
        0.88
      )
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive();

      this.backdrop.on(
        'pointerdown',
        (_pointer, _x, _y, event) => {
          event?.stopPropagation();
        }
      );

      this.panel = scene.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);

      const background = scene.add.rectangle(
        0, 0, WIDTH, HEIGHT, 0x222b2d
      )
        .setOrigin(0)
        .setStrokeStyle(3, 0xd9bc77)
        .setInteractive();

      background.on(
        'pointerdown',
        (_pointer, _x, _y, event) => {
          event?.stopPropagation();
        }
      );

      const title = scene.add.text(
        30,
        28,
        'INCOMING CALL',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#f2d477'
        }
      );

      const sender = scene.add.text(
        30,
        67,
        'MARK AGENCY / OPERATIONS',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#b7c7be'
        }
      );

      this.message = scene.add.text(
        30,
        112,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#fff1ce',
          lineSpacing: 5,
          wordWrap: {
            width: WIDTH - 60
          }
        }
      );

      const button = scene.add.text(
        WIDTH - 30,
        HEIGHT - 28,
        '[ BACK TO WORK ]',
        {
          fontFamily: 'PressStart2P',
          fontSize: '12px',
          color: '#f2d477',
          backgroundColor: '#10191b',
          padding: {
            x: 16,
            y: 14
          }
        }
      )
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => {
        button.setColor('#ffffff');
      });

      button.on('pointerout', () => {
        button.setColor('#f2d477');
      });

      button.on(
        'pointerdown',
        (pointer, _x, _y, event) => {
          event?.stopPropagation();

          if (
            pointer?.event?.button !== undefined &&
            pointer.event.button !== 0
          ) {
            return;
          }

          this.close();
        }
      );

      this.panel.add([
        background,
        title,
        sender,
        this.message,
        button
      ]);

      this.isOpen = true;

      scene.scale.on('resize', this.handleResize);
      scene.events.on('update', this.handleUpdate);

      scene.events.once(
        'shutdown',
        this.handleSceneEnd
      );

      scene.events.once(
        'destroy',
        this.handleSceneEnd
      );

      this.refresh();
      this.layout();

      return true;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  refresh() {
    if (
      !this.isOpen ||
      this.destroyed ||
      !this.message?.active
    ) {
      return;
    }

    const text = this.getMessage();

    if (text !== this.lastMessage) {
      this.lastMessage = text;
      this.message.setText(text);
    }
  }

  layout() {
    if (
      this.destroyed ||
      !this.panel?.active
    ) {
      return;
    }

    const { width, height } = this.scene.scale;

    const scale = Math.max(
      0.01,
      Math.min(
        1,
        (width - 32) / WIDTH,
        (height - 32) / HEIGHT
      )
    );

    this.backdrop?.setSize(width, height);

    this.panel
      .setScale(scale)
      .setPosition(
        (width - WIDTH * scale) / 2,
        (height - HEIGHT * scale) / 2
      );
  }

  close() {
    if (!this.isOpen || this.destroyed) return;

    this.state.caseData ??= {};
    this.state.caseData.escapeTimeCalls ??= {};

    const calls = this.state.caseData.escapeTimeCalls;
    const previous = calls[this.caseKey];

    calls[this.caseKey] = {
      ...previous,
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

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.isOpen = false;

    this.scene?.scale.off(
      'resize',
      this.handleResize
    );

    this.scene?.events.off(
      'update',
      this.handleUpdate
    );

    this.scene?.events.off(
      'shutdown',
      this.handleSceneEnd
    );

    this.scene?.events.off(
      'destroy',
      this.handleSceneEnd
    );

    this.panel?.destroy(true);
    this.backdrop?.destroy();

    this.panel = null;
    this.backdrop = null;
    this.message = null;
    this.onClose = null;
  }
}