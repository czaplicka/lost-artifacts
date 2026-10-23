// ui/PIOfficePhoneUI.js

export class PIOfficePhoneUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    this.isOpen = false;
    this.destroyed = false;
    this.state = 'on_hook';
    this.number = '';
    this.directoryOpen = false;
    this.directoryPage = 0;
    this.lines = [];
    this.lineIndex = 0;

    this.timers = new Set();
    this.tones = new Set();
    this.dialTween = null;
    this.run = 0;

    this.root = scene.add.container(0, 0)
      .setDepth(1600)
      .setVisible(false);

    this.onKey = event => {
      if (!this.isOpen) return;

      const target = event.target;

      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
      ) {
        return;
      }

      if (event.code === 'Escape') {
        event.preventDefault();

        if (this.directoryOpen) {
          this.directoryOpen = false;
          this.render();
        } else {
          this.close();
        }

        return;
      }

      if (
        !this.directoryOpen &&
        this.state === 'ready' &&
        /^[0-9]$/.test(event.key)
      ) {
        event.preventDefault();
        this.dialDigit(event.key);
      }
    };

    scene.input.keyboard?.on('keydown', this.onKey);
    scene.events.once('shutdown', this.destroy, this);
  }

get data() {
  return this.scene.cache.json.get('piPhoneDirectory') || {};
}

get contacts() {
  return Array.isArray(this.data.contacts)
    ? this.data.contacts
    : [];
}

get ownContact() {
  return this.contacts.find(
    contact => contact.id === this.data.ownContactId
  ) || null;
}

  open() {
    if (this.destroyed || this.isOpen) return;

    this.isOpen = true;
    this.state = 'on_hook';
    this.number = '';
    this.directoryOpen = false;
    this.status = 'Pick up the receiver.';
    this.root.setVisible(true);

    this.options.onOpen?.();
    this.render();
  }

  close() {
    if (this.destroyed || !this.isOpen) return;

    this.cancelActivity();
    this.isOpen = false;
    this.state = 'on_hook';
    this.root.setVisible(false);
    this.options.onClose?.();
  }

  cancelActivity() {
    this.run += 1;

    this.timers.forEach(timer => timer.remove(false));
    this.timers.clear();

    this.dialTween?.stop();
    this.dialTween = null;

    this.tones.forEach(tone => {
      try {
        tone.oscillator.stop();
      } catch (_) {}

      tone.oscillator.disconnect();
      tone.gain.disconnect();
    });

    this.tones.clear();
  }

  later(delay, callback) {
    const run = this.run;

    const timer = this.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);

      if (
        this.destroyed ||
        !this.isOpen ||
        run !== this.run
      ) {
        return;
      }

      callback();
    });

    this.timers.add(timer);
    return timer;
  }

  tone(frequency, duration = 0.12, volume = 0.025) {
    const sound = this.scene.sound;
    const context = sound?.context;

    if (!context || sound.mute) return;

    try {
      if (context.state === 'suspended') {
        void context.resume().catch(() => {});
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const masterVolume = Number.isFinite(sound.volume)
        ? sound.volume
        : 1;

      gain.gain.setValueAtTime(
        Math.max(0.0001, volume * masterVolume),
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      const entry = { oscillator, gain };
      this.tones.add(entry);

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.tones.delete(entry);
      };

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('[PIOfficePhoneUI] Audio unavailable:', error);
    }
  }

  pickUp() {
    if (this.state !== 'on_hook') {
      this.hangUp();
      return;
    }

    this.state = 'ready';
    this.number = '';
    this.status = 'Dial a three-digit local number.';

    this.tone(350, 0.65);
    this.render();
  }

  hangUp() {
    this.cancelActivity();

    this.state = 'on_hook';
    this.number = '';
    this.lines = [];
    this.lineIndex = 0;
    this.status = 'Receiver replaced.';

    this.render();
  }

  dialDigit(digit) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.directoryOpen ||
      this.state !== 'ready'
    ) {
      return;
    }

    const length = Number(this.data.numberLength) || 3;

    if (this.number.length >= length) return;

    this.state = 'dialling';
    this.status = 'Dialling...';

    const pulses = digit === '0' ? 10 : Number(digit);
    const angle = 35 + pulses * 23;
    const run = this.run;

    this.render();

    this.dialTween = this.scene.tweens.add({
      targets: this.dial,
      angle,
      duration: 180 + pulses * 22,
      ease: 'Sine.Out',

      onComplete: () => {
        if (!this.isOpen || this.run !== run) return;

        const returnDuration = 220 + pulses * 70;

        for (let index = 0; index < pulses; index++) {
          this.later(
            index * returnDuration / pulses,
            () => this.tone(850, 0.025, 0.015)
          );
        }

        this.dialTween = this.scene.tweens.add({
          targets: this.dial,
          angle: 0,
          duration: returnDuration,
          ease: 'Linear',

          onComplete: () => {
            if (!this.isOpen || this.run !== run) return;

            this.dialTween = null;
            this.number += digit;
            this.state = 'ready';
            this.status = 'Dial the next digit.';

            if (this.number.length === length) {
              this.startCall();
            } else {
              this.render();
            }
          }
        });
      }
    });
  }

  startCall() {
if (
  this.ownContact &&
  this.number === this.ownContact.number
) {
      this.finishCall(
        'You are calling yourself. A bold investigative technique.'
      );
      return;
    }

    const contact = this.contacts.find(
      entry => entry.number === this.number
    );

    if (!contact) {
      this.tone(220, 0.4);

      this.finishCall(
        'The number you have dialled is not in service.'
      );

      return;
    }

    if (contact.status === 'busy') {
      this.state = 'busy';
      this.status = 'The line is busy. Hang up and try again.';
      this.render();
      this.busySignal();
      return;
    }

    this.state = 'ringing';
    this.status = 'Ringing...';
    this.render();

    this.ringSignal();

    this.later(3000, () => {
      if (contact.status === 'no_answer') {
        this.finishCall('No answer.');
      } else {
        this.connect(contact);
      }
    });
  }

  ringSignal() {
    if (this.state !== 'ringing') return;

    this.tone(440, 0.55);
    this.later(110, () => this.tone(480, 0.45));

    this.later(1600, () => {
      if (this.state === 'ringing') this.ringSignal();
    });
  }

  busySignal() {
    if (this.state !== 'busy') return;

    this.tone(480, 0.18);

    this.later(500, () => {
      if (this.state === 'busy') this.busySignal();
    });
  }

  connect(contact) {
    this.cancelActivity();

    const data = this.scene.cache.json.get('piPhoneDialogues');
    const lines = data?.dialogues?.[contact.dialogueId];

    if (!Array.isArray(lines) || !lines.length) {
      this.finishCall('The caller hangs up without a word.');
      return;
    }

    this.state = 'connected';
    this.contactName = contact.name;
    this.lines = lines;
    this.lineIndex = 0;

    this.showDialogueLine();
  }

  showDialogueLine() {
    const line = this.lines[this.lineIndex];

    if (!line) {
      this.finishCall('The call has ended.');
      return;
    }

    this.status =
      `${line.speaker || this.contactName}\n\n${line.text || ''}`;

    this.render();
  }

  nextLine() {
    if (this.state !== 'connected') return;

    this.lineIndex += 1;
    this.showDialogueLine();
  }

  finishCall(message) {
    this.cancelActivity();
    this.state = 'ended';
    this.status = `${message}\n\nHang up to dial again.`;
    this.render();
  }

  text(x, y, value, size = 18, color = '#f1e6c8', wrap = 0) {
    const object = this.scene.add.text(x, y, value, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color,
      wordWrap: wrap ? { width: wrap } : undefined
    });

    this.root.add(object);
    return object;
  }

  button(x, y, label, callback) {
    const object = this.text(x, y, label, 16);

    object
      .setPadding(10, 8, 10, 8)
      .setBackgroundColor('#303631')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callback);

    return object;
  }

  render() {
    if (this.destroyed || !this.isOpen) return;

    this.root.removeAll(true);

    const { width, height } = this.scene.scale;

    const blocker = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0)
      .setInteractive();

    this.root.add(blocker);

    // Fixed design space, scaled to fit the current canvas.
    this.root.setPosition(0, 0).setScale(1);

    const ui = this.scene.add.container(0, 0);
    this.root.add(ui);

    // Temporarily render into the scaled design container.
    const outerRoot = this.root;
    this.root = ui;

    const scale = Math.min(
      (width - 20) / 960,
      (height - 20) / 680
    );

    ui
      .setScale(scale)
      .setPosition(
        (width - 960 * scale) / 2,
        (height - 680 * scale) / 2
      );

    this.text(28, 20, 'LOCAL TELEPHONE', 25);
    this.button(830, 16, 'CLOSE', () => this.close());

    this.drawPhone();

    this.text(
      50, 570,
      'LOCAL CALLS — 3 DIGITS',
      17,
      '#d6c78f'
    );

    const numberLength = Number(this.data.numberLength) || 3;
    const number = this.number
      .padEnd(numberLength, '_')
      .split('')
      .join(' ');

    this.text(90, 605, number, 30, '#ffe29a');

    this.text(
      535, 135,
      this.status || '',
      19,
      '#f1e6c8',
      365
    );

    if (this.state === 'connected') {
      this.button(
        535, 490,
        this.lineIndex < this.lines.length - 1
          ? 'CONTINUE'
          : 'END CONVERSATION',
        () => this.nextLine()
      );
    }

    this.button(
      535, 550,
      this.state === 'on_hook' ? 'PICK UP' : 'HANG UP',
      () => this.pickUp()
    );

    this.button(535, 605, 'DIRECTORY', () => {
      if (this.state === 'dialling') return;

      this.directoryOpen = true;
      this.render();
    });

    if (this.directoryOpen) {
      this.drawDirectory();
    }

    this.root = outerRoot;
  }

  drawPhone() {
    const body = this.scene.add.graphics();
    this.root.add(body);

    body.fillStyle(0x151916);
    body.fillRoundedRect(75, 185, 360, 350, 50);
    body.lineStyle(4, 0x6b7062);
    body.strokeRoundedRect(75, 185, 360, 350, 50);

    const receiverY = this.state === 'on_hook' ? 150 : 100;

    const receiver = this.scene.add.container(255, receiverY);
    const receiverGraphics = this.scene.add.graphics();

    receiverGraphics.fillStyle(0x222922);
    receiverGraphics.fillRoundedRect(-140, -20, 280, 45, 20);
    receiverGraphics.fillRoundedRect(-160, -15, 70, 80, 22);
    receiverGraphics.fillRoundedRect(90, -15, 70, 80, 22);

    receiver.add(receiverGraphics);

    const receiverHit = this.scene.add
      .rectangle(0, 20, 330, 95, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pickUp());

    receiver.add(receiverHit);
    this.root.add(receiver);

    // Rotating dial plate.
    this.dial = this.scene.add.container(255, 365);
    this.root.add(this.dial);

    const plate = this.scene.add.graphics();
    plate.fillStyle(0x99998b);
    plate.fillCircle(0, 0, 132);
    plate.lineStyle(4, 0x343a32);
    plate.strokeCircle(0, 0, 132);

    this.dial.add(plate);

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    digits.forEach((digit, index) => {
      const angle = Phaser.Math.DegToRad(120 + index * 27);
      const x = Math.cos(angle) * 96;
      const y = Math.sin(angle) * 96;

      const hole = this.scene.add
        .circle(x, y, 21, 0x1c241e)
        .setStrokeStyle(2, 0xd5d1ba)
        .setInteractive({ useHandCursor: true });

      hole.on('pointerdown', () => this.dialDigit(digit));

      const label = this.scene.add.text(x, y, digit, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#f8efd1'
      }).setOrigin(0.5);

      this.dial.add([hole, label]);
    });

    const centre = this.scene.add
      .circle(0, 0, 53, 0xd6ceb4)
      .setStrokeStyle(3, 0x484d41);

    const centreLabel = this.scene.add.text(
  0,
  0,
  [
    this.ownContact?.name || 'LOCAL PHONE',
    this.ownContact?.number || '---'
  ].join('\n'),
  {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#252c25',
    align: 'center'
  }
).setOrigin(0.5);

    this.dial.add([centre, centreLabel]);

    // Fixed finger stop, outside the rotating plate.
    const stop = this.scene.add.graphics();
    stop.fillStyle(0xc0a66c);
    stop.fillRoundedRect(354, 424, 45, 15, 5);
    this.root.add(stop);
  }

  drawDirectory() {
    const blocker = this.scene.add
      .rectangle(0, 0, 960, 680, 0x000000, 0.85)
      .setOrigin(0)
      .setInteractive();

    const paper = this.scene.add
      .rectangle(150, 70, 660, 540, 0xe5dcc0)
      .setOrigin(0)
      .setInteractive();

    this.root.add([blocker, paper]);

    this.text(180, 95, 'LOCAL DIRECTORY', 25, '#272c26');

    this.button(700, 88, 'CLOSE', () => {
      this.directoryOpen = false;
      this.render();
    });

    const contacts = this.contacts.filter(
      contact => contact.listed === true
    );

    const perPage = 7;
    const pages = Math.max(1, Math.ceil(contacts.length / perPage));

    this.directoryPage = Math.min(this.directoryPage, pages - 1);

    const visible = contacts.slice(
      this.directoryPage * perPage,
      (this.directoryPage + 1) * perPage
    );

    visible.forEach((contact, index) => {
      this.text(
        185,
        165 + index * 44,
        `${contact.number}  —  ${contact.name}`,
        21,
        '#272c26',
        585
      );
    });

    if (!contacts.length) {
      this.text(185, 165, 'No listed contacts.', 20, '#272c26');
    }

    this.button(185, 520, '<', () => {
      this.directoryPage =
        (this.directoryPage - 1 + pages) % pages;
      this.render();
    });

    this.text(
      250, 530,
      `${this.directoryPage + 1}/${pages}`,
      17,
      '#272c26'
    );

    this.button(330, 520, '>', () => {
      this.directoryPage =
        (this.directoryPage + 1) % pages;
      this.render();
    });

    this.text(
      185, 575,
      'Unlisted numbers must be dialled manually.',
      15,
      '#44483c'
    );
  }

  destroy() {
    if (this.destroyed) return;

    this.close();
    this.destroyed = true;

    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.events.off('shutdown', this.destroy, this);

    this.root.destroy(true);
    this.root = null;
  }
}