// ui/PIOfficePhoneUI.js
import { audioManager } from '../managers/AudioManager.js';

// Przestrzeń projektowa; całość skaluje się do aktualnego canvasu.
const DW = 1280;
const DH = 720;

const FONT_TEXT = 'SpecialElite, monospace';
const FONT_PIXEL = 'PressStart2P, monospace';

// Klucze dźwięków z assetManifest. Zmień tutaj, jeśli plik ma inną rolę.
// UWAGA: nie wiem, co jest w phone-dial.mp3 (sygnał wolny czy tykanie tarczy),
// więc domyślnie nie jest używany (dialTone/dialSpin = null → dźwięk syntetyczny).
const SFX = {
  pickup: 'sfx_pickup',
  ringback: 'sfx_ringing',
  busy: 'sfx_busy',
  dialTone: null,   // np. 'sfx_dial'
  dialSpin: null,   // np. 'sfx_dial'
  click: 'click_sound',
  page: 'pagesound',
  paper: 'paper_rustle'
};

// Opcjonalne grafiki. Jeśli tekstura istnieje, jest używana zamiast rysunku proceduralnego.
const ART = {
  desk: 'pi_phone_desk',       // 1280x720
  base: 'pi_phone_base',       // ok. 560x400, przezroczysta
  handset: 'pi_phone_handset', // ok. 400x120, przezroczysta
  dial: 'pi_phone_dial'        // ok. 300x300, przezroczysta (tarcza z otworami)
};

const AMBER = 0xffb347;
const AMBER_CSS = '#ffb347';
const GREEN = 0x5fe3b0;
const GREEN_CSS = '#5fe3b0';
const RED = 0xff5a4d;
const CREAM_CSS = '#f1e6c8';
const FAINT_CSS = '#8c8470';
const SCREEN_TEXT = '#d8f2e2';

// Geometria tarczy
const DIAL_X = 330;
const DIAL_Y = 452;
const STOP_ANGLE = 45;
const HOLE_RING = 100;

// Prawy panel
const MON_X = 690;
const MON_Y = 84;
const MON_W = 550;
const MON_H = 570;
const SCREEN_X = MON_X + 18;
const SCREEN_Y = MON_Y + 200;
const SCREEN_W = MON_W - 36;
const SCREEN_H = 296;

const LEDS = [
  ['line', 'LINE', GREEN],
  ['dial', 'DIAL', AMBER],
  ['ring', 'RING', AMBER],
  ['busy', 'BUSY', RED],
  ['live', 'LIVE', GREEN]
];

const VU_BARS = 14;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PIOfficePhoneUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    this.isOpen = false;
    this.destroyed = false;
    this.state = 'on_hook';
    this.number = '';
    this.status = '';
    this.directoryOpen = false;
    this.directoryPage = 0;
    this.lines = [];
    this.lineIndex = 0;
    this.contactName = '';

    this.timers = new Set();
    this.tones = new Set();
    this.loops = new Set();
    this.dialTween = null;
    this.run = 0;

    this.built = false;
    this.ui = null;
    this.logItems = [];
    this.typingItem = null;
    this.sticky = null;
    this.keys = [];
    this.uprights = [];
    this.holes = [];
    this.digitBoxes = [];
    this.ledViews = [];
    this.vuLevels = new Array(VU_BARS).fill(0.05);
    this.tickCount = 0;
    this.tickEvent = null;
    this.callStart = 0;
    this._handsetUp = false;
    this._closing = false;

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
          this.closeDirectory();
        } else {
          this.close();
        }

        return;
      }

      if (this.directoryOpen) {
        if (event.code === 'ArrowLeft') this.turnDirectory(-1);
        if (event.code === 'ArrowRight') this.turnDirectory(1);
        return;
      }

      if (this.state === 'ready' && /^[0-9]$/.test(event.key)) {
        event.preventDefault();
        this.dialDigit(event.key);
        return;
      }

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();

        if (this.state === 'connected') this.nextLine();
        else if (this.state === 'on_hook') this.pickUp();

        return;
      }

      if (event.code === 'KeyD' && this.state !== 'dialling') {
        event.preventDefault();
        this.openDirectory();
      }
    };

    this.onResize = () => {
      if (!this.destroyed) this.layout();
    };

    scene.input.keyboard?.on('keydown', this.onKey);
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', this.destroy, this);
  }

  // ─── Dane ─────────────────────────────────────────────────────────────────

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

  // ─── Pomocnicze: tweeny i dźwięk ──────────────────────────────────────────

  _tween(config) {
    const s = this.scene;
    if (!s?.tweens || this.destroyed) return null;
    return typeof s.createTrackedTween === 'function'
      ? s.createTrackedTween(config)
      : s.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;
    const s = this.scene;
    if (typeof s?.killTrackedTweensOf === 'function') {
      s.killTrackedTweensOf(target);
    } else {
      s?.tweens?.killTweensOf(target);
    }
  }

  _hasAudio(key) {
    return Boolean(key && this.scene.cache.audio.exists(key));
  }

  playOnce(key, volume = 0.6) {
    if (!this._hasAudio(key)) return null;

    try {
      return audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });
    } catch (e) {
      return null;
    }
  }

  startLoop(key, volume = 0.6) {
    if (!this._hasAudio(key)) return false;

    try {
      const sound = audioManager.playLoopSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });

      if (sound) {
        this.loops.add(key);
        return true;
      }
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }

    return false;
  }

  stopLoops() {
    this.loops.forEach(key => {
      try {
        audioManager.stopAmbient(key);
      } catch (e) {
        // ignoruj
      }
    });

    this.loops.clear();
  }

  sfxClick() {
    this.playOnce(SFX.click, 0.5);
  }

  // Syntetyczny dźwięk: fallback, gdy brakuje pliku.
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

  // ─── Otwieranie / zamykanie ───────────────────────────────────────────────

  open() {
    if (this.destroyed || this.isOpen) return;

    this.ensureBuilt();

    this.isOpen = true;
    this._closing = false;
    this.state = 'on_hook';
    this.number = '';
    this.directoryOpen = false;
    this.status = 'Pick up the receiver.';
    this.sticky = null;
    this.clearLog();
    this.resetDial();

    this._kill(this.root);
    this.root.setAlpha(1).setVisible(true);

    this.handset.setPosition(330, 252).setAngle(0);
    this.hooks.setY(0);
    this._handsetUp = false;
    this.drawCord();

    this.dir.setVisible(false);
    this.updateSticky(false);
    this.layout();

    // Wjazd widoku
    this._kill(this.ui);
    this.ui.setAlpha(0).setY(this.uiBaseY + 18);
    this._tween({
      targets: this.ui,
      alpha: 1,
      y: this.uiBaseY,
      duration: 220,
      ease: 'Cubic.easeOut'
    });

    this.startTick();
    this.options.onOpen?.();
    this.render();
  }

  close() {
    if (this.destroyed || !this.isOpen) return;

    this.cancelActivity();
    this.stopTick();

    this.isOpen = false;
    this.state = 'on_hook';
    this.directoryOpen = false;

    this.options.onClose?.();

    this._closing = true;
    this._kill(this.root);

    const hide = () => {
      if (this.isOpen || this.destroyed || !this.root) return;
      this._closing = false;
      this.root.setVisible(false).setAlpha(1);
    };

    const tween = this._tween({
      targets: this.root,
      alpha: 0,
      duration: 110,
      onComplete: hide
    });

    if (!tween) hide();
  }

  cancelActivity() {
    this.run += 1;

    this.timers.forEach(timer => timer.remove(false));
    this.timers.clear();
    this.typingItem = null;

    this.dialTween?.stop?.();
    this.dialTween = null;
    this.resetDial();

    this.stopLoops();

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

  // ─── Logika połączenia ────────────────────────────────────────────────────

  pickUp() {
    if (this.state !== 'on_hook') {
      this.hangUp();
      return;
    }

    this.state = 'ready';
    this.number = '';
    this.status = 'Dial a three-digit local number.';
    this.clearLog();

    this.playOnce(SFX.pickup, 0.7);

    if (this._hasAudio(SFX.dialTone)) {
      this.playOnce(SFX.dialTone, 0.6);
    } else {
      this.later(250, () => this.tone(350, 0.65));
    }

    this.render();
  }

  hangUp() {
    this.cancelActivity();

    // Stuknięcie odkładanej słuchawki
    this.tone(140, 0.09, 0.05);

    this.state = 'on_hook';
    this.number = '';
    this.lines = [];
    this.lineIndex = 0;
    this.clearLog();
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

    // Jak w prawdziwym telefonie: im większa cyfra, tym dłuższy obrót;
    // "0" obraca się prawie dookoła (10 impulsów).
    const index = digit === '0' ? 9 : Number(digit) - 1;
    const pulses = digit === '0' ? 10 : Number(digit);
    const rotation = 60 + index * 30;
    const run = this.run;

    this.playOnce(SFX.dialSpin, 0.5);
    this.render();

    this.dialTween = this._tween({
      targets: this.dial,
      angle: rotation,
      duration: 200 + rotation * 2.2,
      ease: 'Sine.easeOut',
      onUpdate: () => this.uprightLabels(),

      onComplete: () => {
        if (!this.isOpen || this.run !== run) return;

        const returnDuration = 220 + pulses * 70;

        for (let i = 0; i < pulses; i++) {
          this.later(
            i * returnDuration / pulses,
            () => this.tone(850, 0.025, 0.015)
          );
        }

        this.dialTween = this._tween({
          targets: this.dial,
          angle: 0,
          duration: returnDuration,
          ease: 'Linear',
          onUpdate: () => this.uprightLabels(),

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

    if (!this.dialTween) {
      this.state = 'ready';
    }
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
      this.startBusy();
      return;
    }

    this.state = 'ringing';
    this.status = 'Ringing...';
    this.render();

    this.startRing();

    this.later(3000, () => {
      if (contact.status === 'no_answer') {
        this.finishCall('No answer.');
      } else {
        this.connect(contact);
      }
    });
  }

  startRing() {
    if (this.startLoop(SFX.ringback, 0.7)) return;
    this.ringSignal();
  }

  startBusy() {
    if (this.startLoop(SFX.busy, 0.7)) return;
    this.busySignal();
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
    this.callStart = this.scene.time.now;
    this.clearLog();

    this.showDialogueLine();
  }

  showDialogueLine() {
    const line = this.lines[this.lineIndex];

    if (!line) {
      this.finishCall('The call has ended.');
      return;
    }

    const speaker = line.speaker || this.contactName;
    const isYou = String(speaker).trim().toLowerCase() === 'you';

    this.status = '';

    const item = this.addBubble(speaker, line.text || '', isYou);
    this.typeItem(item);

    this.render();
  }

  nextLine() {
    if (this.state !== 'connected') return;

    // Pierwsze kliknięcie dopisuje resztę linii, drugie przechodzi dalej.
    if (this.typingItem) {
      this.finishTyping(this.typingItem);
      return;
    }

    this.lineIndex += 1;
    this.showDialogueLine();
  }

  finishCall(message) {
    this.cancelActivity();
    this.state = 'ended';

    if (this.logItems.length) {
      this.addSystemNote(`${message}  Hang up to dial again.`);
      this.status = '';
    } else {
      this.status = `${message}\n\nHang up to dial again.`;
    }

    this.render();
  }

  // ─── Transkrypcja rozmowy ─────────────────────────────────────────────────

  clearLog() {
    this.logItems.forEach(item => {
      item.timer?.remove?.(false);
      item.container?.destroy?.(true);
    });

    this.logItems = [];
    this.typingItem = null;
  }

  addBubble(speaker, text, isYou) {
    const s = this.scene;
    const maxW = 430;

    const container = s.add.container(0, 0);

    const body = s.add.text(0, 0, text, {
      fontFamily: FONT_TEXT,
      fontSize: '19px',
      color: isYou ? '#ffe6b8' : '#d9f5e8',
      wordWrap: { width: maxW - 28 }
    });

    // Mierzymy pełny tekst z góry, żeby dymek nie "rósł" podczas pisania.
    const textW = Math.ceil(body.width);
    const textH = Math.ceil(body.height);
    const w = Math.min(maxW, textW + 28);
    const h = textH + 18;

    body.setText('');

    const label = s.add.text(0, 0, String(speaker).toUpperCase(), {
      fontFamily: FONT_PIXEL,
      fontSize: '8px',
      color: isYou ? AMBER_CSS : GREEN_CSS
    });

    const xOff = isYou ? SCREEN_W - 36 - w : 0;

    label.setPosition(xOff + 4, 0);

    const bg = s.add.graphics();
    bg.fillStyle(isYou ? 0x2a2010 : 0x14261d, 1);
    bg.fillRoundedRect(xOff, 16, w, h, 8);
    bg.lineStyle(1, isYou ? AMBER : GREEN, 0.6);
    bg.strokeRoundedRect(xOff, 16, w, h, 8);

    body.setPosition(xOff + 14, 16 + 9);

    container.add([bg, label, body]);
    this.logContainer.add(container);

    const item = {
      container,
      body,
      full: text,
      height: 16 + h + 8,
      typing: false,
      timer: null
    };

    this.logItems.push(item);
    this.layoutLog();

    return item;
  }

  addSystemNote(text) {
    const s = this.scene;

    const container = s.add.container(0, 0);

    const note = s.add.text(
      (SCREEN_W - 36) / 2,
      6,
      text,
      {
        fontFamily: FONT_TEXT,
        fontSize: '15px',
        color: FAINT_CSS,
        align: 'center',
        wordWrap: { width: SCREEN_W - 70 }
      }
    ).setOrigin(0.5, 0);

    container.add(note);
    this.logContainer.add(container);

    const item = {
      container,
      body: note,
      full: text,
      height: Math.ceil(note.height) + 18,
      typing: false,
      timer: null
    };

    this.logItems.push(item);
    this.layoutLog();

    return item;
  }

  layoutLog() {
    const available = SCREEN_H - 62;

    const total = () =>
      this.logItems.reduce((sum, item) => sum + item.height, 0);

    // Najstarsze wiadomości znikają, gdy ekran się zapełni.
    while (this.logItems.length > 1 && total() > available) {
      const old = this.logItems.shift();
      old.timer?.remove?.(false);
      old.container?.destroy?.(true);
    }

    let y = 0;

    this.logItems.forEach(item => {
      item.container.setY(y);
      y += item.height;
    });
  }

  typeItem(item) {
    item.typing = true;
    this.typingItem = item;

    const full = item.full;
    let index = 0;

    const timer = this.scene.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        index += 2;

        if (index >= full.length) {
          this.finishTyping(item);
          return;
        }

        item.body.setText(full.slice(0, index));
      }
    });

    item.timer = timer;
    this.timers.add(timer);
  }

  finishTyping(item) {
    if (!item?.typing) return;

    item.typing = false;
    item.timer?.remove?.(false);
    this.timers.delete(item.timer);
    item.timer = null;

    item.body?.setText?.(item.full);

    if (this.typingItem === item) this.typingItem = null;

    this.render();
  }

  // ─── Budowa widoku (raz) ──────────────────────────────────────────────────

  ensureBuilt() {
    if (this.built) return;

    const s = this.scene;

    this.blocker = s.add.rectangle(0, 0, 10, 10, 0x000000, 0.9).setOrigin(0);
    this.root.add(this.blocker);

    this.ui = s.add.container(0, 0);
    this.root.add(this.ui);

    this.buildDesk();
    this.buildPhone();
    this.buildMonitor();
    this.buildTopBar();
    this.buildSticky();

    this.dir = s.add.container(0, 0).setVisible(false);
    this.ui.add(this.dir);

    this.built = true;
  }

  setHit(obj, width, height, hand = true) {
    obj.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: hand
    });
  }

  layout() {
    if (!this.ui || !this.blocker) return;

    const { width, height } = this.scene.scale;

    this.blocker.setSize(width, height);
    this.setHit(this.blocker, width, height, false);

    const scale = Math.min(
      (width - 20) / DW,
      (height - 20) / DH
    );

    this.uiScale = scale;
    this.uiBaseX = (width - DW * scale) / 2;
    this.uiBaseY = (height - DH * scale) / 2;

    this.ui.setScale(scale);
    this.ui.setX(this.uiBaseX);

    if (!this.isOpen || !this.scene.tweens.isTweening(this.ui)) {
      this.ui.setY(this.uiBaseY);
    }
  }

  buildDesk() {
    const s = this.scene;

    if (s.textures.exists(ART.desk)) {
      this.ui.add(s.add.image(DW / 2, DH / 2, ART.desk).setDisplaySize(DW, DH));
    } else {
      const g = s.add.graphics();

      g.fillStyle(0x17120d, 1);
      g.fillRoundedRect(0, 0, DW, DH, 18);

      // Usłojenie drewna (stałe ziarno)
      const rng = mulberry32(512);

      for (let i = 0; i < 90; i++) {
        const x = rng() * DW;
        const y = rng() * DH;
        const len = 120 + rng() * 520;
        const dark = rng() < 0.55;

        g.lineStyle(rng() < 0.2 ? 2 : 1, dark ? 0x000000 : 0x4a3a28, 0.05 + rng() * 0.07);
        g.lineBetween(x, y, x + len, y + (rng() - 0.5) * 8);
      }

      // Rekwizyty: plama po kawie, filiżanka, ołówek
      g.lineStyle(3, 0x2a1a0e, 0.35);
      g.strokeCircle(150, 112, 36);
      g.lineStyle(2, 0x2a1a0e, 0.2);
      g.strokeCircle(152, 114, 34);

      g.fillStyle(0xe8e2d0, 1);
      g.fillCircle(118, 112, 40);
      g.lineStyle(2, 0xb8b09a, 1);
      g.strokeCircle(118, 112, 40);
      g.fillStyle(0xf4efe0, 1);
      g.fillCircle(118, 112, 28);
      g.fillStyle(0x3a2214, 1);
      g.fillCircle(118, 112, 22);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(110, 104, 7);
      g.lineStyle(6, 0xf4efe0, 1);
      g.beginPath();
      g.arc(150, 112, 10, -1.2, 1.2, false);
      g.strokePath();

      const pencil = (cx, cy, angleDeg) => {
        const a = Phaser.Math.DegToRad(angleDeg);
        const rot = (px, py) => ({
          x: cx + px * Math.cos(a) - py * Math.sin(a),
          y: cy + px * Math.sin(a) + py * Math.cos(a)
        });

        g.fillStyle(0xd9a521, 1);
        g.fillPoints([rot(-60, -5), rot(40, -5), rot(40, 5), rot(-60, 5)], true);
        g.fillStyle(0xe8c9a0, 1);
        g.fillPoints([rot(40, -5), rot(62, 0), rot(40, 5)], true);
        g.fillStyle(0x333333, 1);
        g.fillPoints([rot(56, -1.5), rot(62, 0), rot(56, 1.5)], true);
        g.fillStyle(0xc2554a, 1);
        g.fillPoints([rot(-72, -5), rot(-60, -5), rot(-60, 5), rot(-72, 5)], true);
      };

      pencil(560, 118, -14);

      this.ui.add(g);

      // Światło lampy (addytywnie)
      const glow = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

      for (let r = 560; r >= 80; r -= 40) {
        glow.fillStyle(AMBER, 0.013);
        glow.fillCircle(DIAL_X - 10, DIAL_Y - 30, r);
      }

      this.ui.add(glow);
    }

    // Winieta
    const vignette = s.add.graphics();

    for (let k = 0; k < 14; k++) {
      vignette.lineStyle(3, 0x000000, 0.14 * (1 - k / 14));
      vignette.strokeRoundedRect(k * 3, k * 3, DW - k * 6, DH - k * 6, 18);
    }

    vignette.lineStyle(2, 0x6b5a2e, 0.8);
    vignette.strokeRoundedRect(0, 0, DW, DH, 18);

    this.ui.add(vignette);
  }

  buildPhone() {
    const s = this.scene;

    // Korpus
    if (s.textures.exists(ART.base)) {
      this.ui.add(s.add.image(DIAL_X, 445, ART.base));
    } else {
      const g = s.add.graphics();

      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(78, 278, 520, 360, 60);

      g.fillStyle(0x121212, 1);
      g.fillRoundedRect(70, 265, 520, 360, 60);
      g.fillStyle(0x1d1d1d, 1);
      g.fillRoundedRect(74, 268, 512, 340, 56);
      g.fillStyle(0x2b2b2b, 0.55);
      g.fillRoundedRect(92, 276, 476, 54, 36);
      g.lineStyle(2, 0x3a3a3a, 0.9);
      g.strokeRoundedRect(70, 265, 520, 360, 60);

      // Wsporniki widełek
      g.fillStyle(0x0f0f0f, 1);
      g.fillRoundedRect(120, 246, 110, 52, 18);
      g.fillRoundedRect(430, 246, 110, 52, 18);
      g.lineStyle(2, 0x333333, 1);
      g.strokeRoundedRect(120, 246, 110, 52, 18);
      g.strokeRoundedRect(430, 246, 110, 52, 18);

      // Zagłębienie na tarczę + chromowy pierścień
      g.fillStyle(0x090909, 1);
      g.fillCircle(DIAL_X, DIAL_Y, 166);
      g.lineStyle(5, 0x5a5a52, 1);
      g.strokeCircle(DIAL_X, DIAL_Y, 166);
      g.lineStyle(2, 0x000000, 1);
      g.strokeCircle(DIAL_X, DIAL_Y, 172);

      this.ui.add(g);
    }

    // Plunger'y widełek: wyskakują, gdy słuchawka jest podniesiona
    this.hooks = s.add.container(0, 0);
    const hookG = s.add.graphics();
    hookG.fillStyle(0x8a8a80, 1);
    hookG.fillRoundedRect(166, 246, 18, 22, 4);
    hookG.fillRoundedRect(476, 246, 18, 22, 4);
    hookG.lineStyle(1, 0x3a3a34, 1);
    hookG.strokeRoundedRect(166, 246, 18, 22, 4);
    hookG.strokeRoundedRect(476, 246, 18, 22, 4);
    this.hooks.add(hookG);
    this.ui.add(this.hooks);

    // Kabel (pod słuchawką)
    this.cordGfx = s.add.graphics();
    this.ui.add(this.cordGfx);

    // Tarcza
    this.dial = s.add.container(DIAL_X, DIAL_Y);
    this.ui.add(this.dial);
    this.uprights = [];
    this.holes = [];

    if (s.textures.exists(ART.dial)) {
      this.dial.add(s.add.image(0, 0, ART.dial).setDisplaySize(290, 290));
    } else {
      const plate = s.add.graphics();

      plate.fillStyle(0xcfc9b4, 1);
      plate.fillCircle(0, 0, 142);
      plate.fillStyle(0xbab49f, 1);
      plate.fillCircle(0, 0, 132);
      plate.fillStyle(0xcfc9b4, 1);
      plate.fillCircle(0, 0, 128);
      plate.lineStyle(6, 0x8e8878, 1);
      plate.strokeCircle(0, 0, 142);
      plate.lineStyle(1, 0x6e6a5c, 0.8);
      plate.strokeCircle(0, 0, 132);

      this.dial.add(plate);
    }

    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    labels.forEach((digit, index) => {
      // Otwory rosną przeciwnie do ruchu wskazówek, ogranicznik jest w STOP_ANGLE.
      const rotationNeeded = 60 + index * 30;
      const angle = Phaser.Math.DegToRad(STOP_ANGLE - rotationNeeded);
      const x = Math.cos(angle) * HOLE_RING;
      const y = Math.sin(angle) * HOLE_RING;

      const hole = s.add.circle(x, y, 23, 0x0d0f0d)
        .setStrokeStyle(3, 0x6e6a5c)
        .setInteractive({ useHandCursor: true });

      hole.on('pointerover', () => {
        if (this.state === 'ready') hole.setStrokeStyle(3, AMBER);
      });

      hole.on('pointerout', () => hole.setStrokeStyle(3, 0x6e6a5c));
      hole.on('pointerdown', () => this.dialDigit(digit));

      const label = s.add.text(x, y, digit, {
        fontFamily: FONT_PIXEL,
        fontSize: '15px',
        color: '#f3ead0'
      }).setOrigin(0.5);

      this.dial.add([hole, label]);
      this.holes.push(hole);
      this.uprights.push(label);
    });

    const centre = s.add.circle(0, 0, 50, 0xe6dfc8)
      .setStrokeStyle(3, 0x5b5646);

    this.dialCentre = s.add.text(0, 0, '', {
      fontFamily: FONT_TEXT,
      fontSize: '13px',
      color: '#252c25',
      align: 'center'
    }).setOrigin(0.5);

    this.dial.add([centre, this.dialCentre]);
    this.uprights.push(this.dialCentre);

    // Ogranicznik palca (nieruchomy)
    const stopAngle = Phaser.Math.DegToRad(STOP_ANGLE);
    const stop = s.add.graphics();
    const sx = DIAL_X + Math.cos(stopAngle) * 156;
    const sy = DIAL_Y + Math.sin(stopAngle) * 156;

    stop.fillStyle(0x000000, 0.4);
    stop.fillRoundedRect(-10, -22, 22, 48, 6);
    stop.fillStyle(0xc0a66c, 1);
    stop.fillRoundedRect(-11, -24, 22, 48, 6);
    stop.fillStyle(0xe6d19a, 0.7);
    stop.fillRoundedRect(-8, -21, 6, 42, 3);
    stop.lineStyle(2, 0x6b5a2e, 1);
    stop.strokeRoundedRect(-11, -24, 22, 48, 6);

    stop.setPosition(sx, sy).setAngle(STOP_ANGLE + 90);
    this.ui.add(stop);

    // Słuchawka
    this.handset = s.add.container(330, 252);

    if (s.textures.exists(ART.handset)) {
      this.handset.add(s.add.image(0, 10, ART.handset));
    } else {
      const h = s.add.graphics();

      // cień
      h.fillStyle(0x000000, 0.35);
      h.fillRoundedRect(-150, -8, 300, 32, 14);

      // pałąk
      h.fillStyle(0x1b1b1b, 1);
      h.fillRoundedRect(-150, -14, 300, 28, 14);
      h.lineStyle(2, 0x454545, 0.9);
      h.lineBetween(-130, -8, 130, -8);

      // muszle
      [-1, 1].forEach(side => {
        const cx = side * 150;

        h.fillStyle(0x161616, 1);
        h.fillRoundedRect(cx - 35, -22, 70, 64, 22);
        h.lineStyle(2, 0x3a3a3a, 1);
        h.strokeRoundedRect(cx - 35, -22, 70, 64, 22);
        h.fillStyle(0x2b2b2b, 0.7);
        h.fillRoundedRect(cx - 28, -18, 56, 14, 8);

        // perforacja
        h.fillStyle(0x050505, 0.9);

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            h.fillCircle(cx - 15 + col * 10, 14 + row * 8, 2);
          }
        }
      });

      this.handset.add(h);
    }

    const handsetHit = s.add.rectangle(0, 10, 380, 110, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    handsetHit.on('pointerdown', () => {
      this.sfxClick();
      this.pickUp();
    });

    this.handset.add(handsetHit);
    this.ui.add(this.handset);

    this.drawCord();
  }

  // Kabel spiralny od słuchawki do korpusu
  drawCord() {
    const g = this.cordGfx;
    const h = this.handset;

    if (!g?.scene || !h) return;

    g.clear();

    const rad = Phaser.Math.DegToRad(h.angle);
    const lx = -150;
    const ly = 38;

    const sx = h.x + lx * Math.cos(rad) - ly * Math.sin(rad);
    const sy = h.y + lx * Math.sin(rad) + ly * Math.cos(rad);

    const ex = 80;
    const ey = 400;
    const cx = Math.min(sx, ex) - 70;
    const cy = Math.max(sy, ey) + 40;

    const points = [];
    const steps = 70;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;

      const bx = u * u * sx + 2 * u * t * cx + t * t * ex;
      const by = u * u * sy + 2 * u * t * cy + t * t * ey;

      // styczna → normalna dla efektu skręcenia kabla
      const dx = 2 * u * (cx - sx) + 2 * t * (ex - cx);
      const dy = 2 * u * (cy - sy) + 2 * t * (ey - cy);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const wave = Math.sin(i * 0.95) * 5;

      points.push({ x: bx + nx * wave, y: by + ny * wave });
    }

    const stroke = (width, color, alpha, dx = 0, dy = 0) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      points.forEach((p, i) => {
        if (i === 0) g.moveTo(p.x + dx, p.y + dy);
        else g.lineTo(p.x + dx, p.y + dy);
      });
      g.strokePath();
    };

    stroke(6, 0x000000, 0.35, 2, 3);
    stroke(5, 0x0b0b0b, 1);
    stroke(1.5, 0x3a3a3a, 0.9, 0, -1);
  }

  buildMonitor() {
    const s = this.scene;
    const X = MON_X;
    const Y = MON_Y;
    const W = MON_W;
    const H = MON_H;

    const g = s.add.graphics();

    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(X + 6, Y + 8, W, H, 14);
    g.fillStyle(0x0f1512, 0.96);
    g.fillRoundedRect(X, Y, W, H, 14);
    g.lineStyle(2, 0x3a4a40, 1);
    g.strokeRoundedRect(X, Y, W, H, 14);

    // Narożniki w stylu HUD
    const b = 18;
    g.lineStyle(3, AMBER, 0.9);

    [
      [X + 8, Y + 8, 1, 1],
      [X + W - 8, Y + 8, -1, 1],
      [X + 8, Y + H - 8, 1, -1],
      [X + W - 8, Y + H - 8, -1, -1]
    ].forEach(([cx, cy, sx, sy]) => {
      g.lineBetween(cx, cy, cx + sx * b, cy);
      g.lineBetween(cx, cy, cx, cy + sy * b);
    });

    this.ui.add(g);

    this.t(this.ui, X + 28, Y + 20, 'LINE MONITOR', 11, AMBER_CSS, FONT_PIXEL);

    this.timerText = this.t(this.ui, X + W - 28, Y + 20, '', 11, GREEN_CSS, FONT_PIXEL)
      .setOrigin(1, 0);

    // Diody stanu
    this.ledViews = LEDS.map(([id, label, color], i) => {
      const lx = X + 28 + i * 102;
      const ly = Y + 54;

      const glow = s.add.circle(lx + 8, ly + 8, 11, color, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD);
      const dot = s.add.circle(lx + 8, ly + 8, 6, color, 0.18)
        .setStrokeStyle(1, 0x000000, 0.8);

      this.ui.add([glow, dot]);

      this.t(this.ui, lx + 22, ly + 1, label, 8, FAINT_CSS, FONT_PIXEL);

      return { id, color, glow, dot };
    });

    // Wyświetlacz numeru
    this.t(this.ui, X + 28, Y + 80, 'NUMBER', 8, FAINT_CSS, FONT_PIXEL);

    const length = Number(this.data.numberLength) || 3;
    this.digitBoxes = [];

    for (let i = 0; i < length; i++) {
      const bx = X + 28 + i * 100;
      const by = Y + 96;

      const bg = s.add.graphics();
      const text = s.add.text(bx + 44, by + 46, '-', {
        fontFamily: FONT_PIXEL,
        fontSize: '44px',
        color: '#4a3a1c'
      }).setOrigin(0.5);

      this.ui.add([bg, text]);
      this.digitBoxes.push({ x: bx, y: by, bg, text });
    }

    // Miernik poziomu linii
    this.t(this.ui, X + 340, Y + 80, 'LINE LEVEL', 8, FAINT_CSS, FONT_PIXEL);
    this.vuGfx = s.add.graphics();
    this.ui.add(this.vuGfx);

    // Ekran
    const screen = s.add.graphics();

    screen.fillStyle(0x0a120e, 1);
    screen.fillRoundedRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 8);
    screen.lineStyle(2, 0x2c4a3a, 1);
    screen.strokeRoundedRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 8);
    screen.lineStyle(1, GREEN, 0.18);
    screen.strokeRoundedRect(SCREEN_X + 3, SCREEN_Y + 3, SCREEN_W - 6, SCREEN_H - 6, 6);

    this.ui.add(screen);

    // Klik na ekranie podczas rozmowy = dalej
    const screenHit = s.add.rectangle(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive();

    screenHit.on('pointerdown', () => {
      if (this.state === 'connected') this.nextLine();
    });

    this.ui.add(screenHit);

    this.statusText = s.add.text(SCREEN_X + 22, SCREEN_Y + 18, '', {
      fontFamily: FONT_TEXT,
      fontSize: '22px',
      color: SCREEN_TEXT,
      wordWrap: { width: SCREEN_W - 44 },
      lineSpacing: 6
    });

    this.logContainer = s.add.container(SCREEN_X + 18, SCREEN_Y + 14);

    this.prompt = s.add.text(SCREEN_X + SCREEN_W - 18, SCREEN_Y + SCREEN_H - 14, '', {
      fontFamily: FONT_PIXEL,
      fontSize: '10px',
      color: AMBER_CSS
    })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.prompt.on('pointerdown', () => this.nextLine());

    this.ui.add([this.statusText, this.logContainer, this.prompt]);

    // Linie skanowania CRT
    const scan = s.add.graphics();
    scan.lineStyle(1, 0x000000, 0.18);

    for (let y = SCREEN_Y + 2; y < SCREEN_Y + SCREEN_H - 2; y += 3) {
      scan.lineBetween(SCREEN_X + 3, y, SCREEN_X + SCREEN_W - 3, y);
    }

    this.ui.add(scan);

    // Klawisze
    this.btnHook = this.makeKey(
      X + 18,
      Y + H - 76,
      250,
      46,
      'PICK UP',
      () => this.pickUp()
    );

    this.btnDir = this.makeKey(
      X + W - 18 - 250,
      Y + H - 76,
      250,
      46,
      'DIRECTORY',
      () => {
        if (this.state !== 'dialling') this.openDirectory();
      }
    );
  }

  buildTopBar() {
    this.t(this.ui, 40, 22, 'LOCAL TELEPHONE', 30, AMBER_CSS, FONT_TEXT);

    this.ownLine = this.t(this.ui, 42, 58, '', 14, FAINT_CSS, FONT_TEXT);

    this.t(
      this.ui,
      40,
      DH - 30,
      '0-9 dial   SPACE / ENTER continue   D directory   ESC close',
      14,
      '#7d7560',
      FONT_TEXT
    );

    this.makeKey(DW - 40 - 120, 20, 120, 40, 'CLOSE', () => this.close(), { size: 10 });
  }

  buildSticky() {
    const s = this.scene;

    this.stickyNote = s.add.container(118, 578).setAngle(-5).setVisible(false);

    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRect(-52, -38, 110, 88);
    g.fillStyle(0xffe98a, 1);
    g.fillRect(-56, -42, 110, 88);
    g.fillStyle(0xe8cf6a, 1);
    g.fillTriangle(54, 46, 54, 30, 38, 46);

    const tape = s.add.rectangle(0, -44, 44, 14, 0xe8dca0, 0.85).setAngle(3);

    this.stickyNumber = s.add.text(0, -16, '', {
      fontFamily: FONT_TEXT,
      fontSize: '34px',
      color: '#2a2118'
    }).setOrigin(0.5);

    this.stickyName = s.add.text(0, 18, '', {
      fontFamily: FONT_TEXT,
      fontSize: '14px',
      color: '#4a3d18',
      align: 'center',
      wordWrap: { width: 96 }
    }).setOrigin(0.5);

    this.stickyNote.add([g, tape, this.stickyNumber, this.stickyName]);
    this.ui.add(this.stickyNote);
  }

  updateSticky(animate) {
    if (!this.stickyNote) return;

    if (!this.sticky) {
      this.stickyNote.setVisible(false);
      return;
    }

    this.stickyNumber.setText(this.sticky.number);
    this.stickyName.setText(this.sticky.name);
    this.stickyNote.setVisible(true);

    if (animate) {
      this._kill(this.stickyNote);
      this.stickyNote.setScale(1.25).setAlpha(0.4);
      this._tween({
        targets: this.stickyNote,
        scale: 1,
        alpha: 1,
        duration: 180,
        ease: 'Back.easeOut'
      });
    }
  }

  // ─── Elementy wspólne ─────────────────────────────────────────────────────

  t(parent, x, y, value, size, color, font = FONT_TEXT) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: font,
      fontSize: `${size}px`,
      color
    });

    parent?.add(text);
    return text;
  }

  makeKey(x, y, w, h, label, onClick, { size = 12, color = AMBER_CSS } = {}) {
    const s = this.scene;

    const container = s.add.container(x, y);
    const g = s.add.graphics();

    const text = s.add.text(w / 2, h / 2, label, {
      fontFamily: FONT_PIXEL,
      fontSize: `${size}px`,
      color
    }).setOrigin(0.5);

    const hit = s.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    const key = {
      container,
      enabled: true,
      hover: false,
      setLabel: value => text.setText(value),
      setEnabled: value => {
        key.enabled = value;
        draw();
      },
      setVisible: value => container.setVisible(value)
    };

    const draw = () => {
      g.clear();

      const lit = key.hover && key.enabled;

      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(2, 4, w, h, 8);
      g.fillStyle(lit ? 0x343a2e : 0x23281f, 1);
      g.fillRoundedRect(0, 0, w, h, 8);
      g.fillStyle(0xffffff, 0.06);
      g.fillRoundedRect(3, 3, w - 6, h * 0.4, 6);
      g.lineStyle(2, lit ? 0xffd98a : 0x6b5a2e, 1);
      g.strokeRoundedRect(0, 0, w, h, 8);

      text.setAlpha(key.enabled ? 1 : 0.4);
    };

    hit.on('pointerover', () => {
      key.hover = true;
      draw();
    });

    hit.on('pointerout', () => {
      key.hover = false;
      draw();
    });

    hit.on('pointerdown', () => {
      if (!key.enabled) return;
      this.sfxClick();
      onClick();
    });

    container.add([g, text, hit]);
    draw();

    this.ui.add(container);
    this.keys.push(key);

    return key;
  }

  resetDial() {
    if (!this.dial) return;
    this._kill(this.dial);
    this.dial.setAngle(0);
    this.uprightLabels();
  }

  // Cyfry zostają czytelne, gdy tarcza się obraca.
  uprightLabels() {
    if (!this.dial) return;
    const rotation = -this.dial.rotation;
    this.uprights.forEach(obj => obj?.scene && obj.setRotation(rotation));
  }

  // ─── Aktualizacja widoku ──────────────────────────────────────────────────

  render() {
    if (this.destroyed || !this.isOpen || !this.built) return;

    const state = this.state;

    // Słuchawka
    this.setHandset(state !== 'on_hook');

    // Napis na tarczy i w nagłówku
    const own = this.ownContact;

    this.dialCentre.setText(
      [own?.name || 'LOCAL PHONE', own?.number || '---'].join('\n')
    );

    this.ownLine.setText(
      own ? `${own.name}  ·  ext. ${own.number}` : ''
    );

    // Klawisze
    this.btnHook.setLabel(state === 'on_hook' ? 'PICK UP' : 'HANG UP');
    this.btnDir.setEnabled(state !== 'dialling');

    // Otwory tarczy reagują tylko w stanie "ready"
    this.holes.forEach(hole => {
      if (hole.input) hole.input.enabled = state === 'ready';
      if (state !== 'ready') hole.setStrokeStyle(3, 0x6e6a5c);
    });

    // Ekran: transkrypcja albo komunikat
    const logMode = this.logItems.length > 0;

    this.logContainer.setVisible(logMode);
    this.statusText.setVisible(!logMode).setText(this.status || '');

    const connected = state === 'connected';
    this.prompt.setVisible(connected);

    if (connected) {
      const last = this.lineIndex >= this.lines.length - 1;
      this.prompt.setText(last ? 'END CONVERSATION >' : 'CONTINUE >');
    }

    this.refreshDigits();
    this.updateLeds();
    this.dir.setVisible(this.directoryOpen);
  }

  setHandset(up) {
    if (this._handsetUp === up || !this.handset) return;

    this._handsetUp = up;

    this._kill(this.handset);
    this._kill(this.hooks);

    const target = up
      ? { x: 350, y: 176, angle: -6 }
      : { x: 330, y: 252, angle: 0 };

    const tween = this._tween({
      targets: this.handset,
      ...target,
      duration: 220,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.drawCord(),
      onComplete: () => this.drawCord()
    });

    if (!tween) {
      this.handset.setPosition(target.x, target.y).setAngle(target.angle);
      this.drawCord();
    }

    this._tween({
      targets: this.hooks,
      y: up ? -7 : 0,
      duration: 140
    });
  }

  refreshDigits() {
    const ready = this.state === 'ready';

    this.digitBoxes.forEach((box, i) => {
      const ch = this.number[i];
      const isCursor = ready && i === this.number.length;

      box.text
        .setText(ch ?? '-')
        .setColor(ch ? AMBER_CSS : '#4a3a1c');

      box.bg.clear();
      box.bg.fillStyle(0x070b08, 1);
      box.bg.fillRoundedRect(box.x, box.y, 88, 92, 8);
      box.bg.lineStyle(2, isCursor ? AMBER : 0x3a3524, 1);
      box.bg.strokeRoundedRect(box.x, box.y, 88, 92, 8);

      if (ch) {
        box.bg.fillStyle(AMBER, 0.06);
        box.bg.fillRoundedRect(box.x + 3, box.y + 3, 82, 86, 6);
      }
    });
  }

  updateLeds() {
    const s = this.state;
    const blink = this.tickCount % 8 < 4;

    const on = {
      line: s !== 'on_hook',
      dial: s === 'ready' || s === 'dialling',
      ring: s === 'ringing' && blink,
      busy: s === 'busy' && blink,
      live: s === 'connected'
    };

    this.ledViews.forEach(led => {
      const lit = Boolean(on[led.id]);
      led.dot.setFillStyle(led.color, lit ? 1 : 0.18);
      led.glow.setFillStyle(led.color, lit ? 0.35 : 0);
    });
  }

  // ─── Zegar odświeżania (diody, miernik, kursor) ───────────────────────────

  startTick() {
    this.stopTick();

    this.tickEvent = this.scene.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => this.onTick()
    });
  }

  stopTick() {
    this.tickEvent?.remove(false);
    this.tickEvent = null;
  }

  onTick() {
    if (!this.isOpen || this.destroyed || !this.built) return;

    this.tickCount += 1;

    this.updateLeds();
    this.updateVu();

    // Czas rozmowy
    if (this.state === 'connected') {
      const sec = Math.floor((this.scene.time.now - this.callStart) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      this.timerText.setText(`${mm}:${ss}`);
    } else {
      this.timerText.setText('');
    }

    // Migający kursor na kolejnej cyfrze
    if (this.state === 'ready') {
      const box = this.digitBoxes[this.number.length];

      if (box) {
        box.text.setAlpha(this.tickCount % 8 < 5 ? 1 : 0.35);
      }
    }

    // Pulsujący monit "CONTINUE"
    if (this.prompt.visible) {
      this.prompt.setAlpha(this.tickCount % 8 < 5 ? 1 : 0.55);
    }
  }

  updateVu() {
    const g = this.vuGfx;
    if (!g?.scene) return;

    const t = this.tickCount;
    let target;

    switch (this.state) {
      case 'ringing':
        target = t % 14 < 5 ? 0.85 : 0.08;
        break;

      case 'busy':
        target = t % 5 < 2 ? 0.9 : 0.08;
        break;

      case 'connected':
        target = this.typingItem ? 0.35 + Math.random() * 0.6 : 0.12 + Math.random() * 0.3;
        break;

      case 'dialling':
        target = 0.1 + Math.random() * 0.2;
        break;

      case 'ready':
        target = 0.06 + Math.random() * 0.08;
        break;

      default:
        target = 0.04;
    }

    const X = MON_X + 340;
    const Y = MON_Y + 96;
    const H = 92;

    g.clear();

    for (let i = 0; i < VU_BARS; i++) {
      // profil: środek reaguje mocniej
      const profile = 0.55 + 0.45 * Math.sin(((i + 1) / (VU_BARS + 1)) * Math.PI);
      const goal = Math.min(1, target * profile * (0.7 + Math.random() * 0.6));

      this.vuLevels[i] += (goal - this.vuLevels[i]) * 0.55;

      const level = Math.max(0.03, this.vuLevels[i]);
      const barH = Math.round(level * H);
      const color = i >= VU_BARS - 3 ? RED : i >= VU_BARS - 6 ? AMBER : GREEN;

      g.fillStyle(0x0a120e, 1);
      g.fillRect(X + i * 13, Y, 10, H);
      g.fillStyle(color, 0.9);
      g.fillRect(X + i * 13, Y + H - barH, 10, barH);
    }
  }

  // ─── Książka telefoniczna ─────────────────────────────────────────────────

  openDirectory() {
    if (!this.isOpen || this.state === 'dialling') return;

    this.directoryOpen = true;
    this.playOnce(SFX.paper, 0.5);
    this.renderDirectory();
    this.dir.setVisible(true);
  }

  closeDirectory() {
    this.directoryOpen = false;
    this.dir.setVisible(false);
  }

  turnDirectory(direction) {
    const contacts = this.contacts.filter(contact => contact.listed === true);
    const pages = Math.max(1, Math.ceil(contacts.length / 7));

    this.directoryPage = (this.directoryPage + direction + pages) % pages;
    this.playOnce(SFX.page, 0.5);
    this.renderDirectory();
  }

  pickContact(contact) {
    this.sticky = { number: contact.number, name: contact.name };
    this.updateSticky(true);

    if (this.state === 'on_hook') {
      this.status = `Noted: ${contact.number} - ${contact.name}.\n\nPick up the receiver and dial.`;
    } else if (this.state === 'ready') {
      this.status = `Noted: ${contact.number} - ${contact.name}.\n\nDial it.`;
    }

    this.closeDirectory();
    this.render();
  }

  renderDirectory() {
    const s = this.scene;

    this.dir.removeAll(true);

    const blocker = s.add.rectangle(0, 0, DW, DH, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    blocker.on('pointerdown', () => this.closeDirectory());

    // Książka: skórzana oprawa + papier
    const book = s.add.graphics();

    book.fillStyle(0x000000, 0.45);
    book.fillRoundedRect(258, 58, 780, 620, 18);
    book.fillStyle(0x2a1a10, 1);
    book.fillRoundedRect(250, 50, 780, 620, 18);
    book.lineStyle(3, 0x8b6914, 1);
    book.strokeRoundedRect(250, 50, 780, 620, 18);

    book.fillStyle(0xe9dfc2, 1);
    book.fillRoundedRect(274, 74, 732, 572, 8);

    // Linie wierszy + czerwony margines
    book.lineStyle(1, 0xb8a678, 0.6);

    for (let y = 214; y < 620; y += 58) {
      book.lineBetween(290, y, 990, y);
    }

    book.lineStyle(1, 0xb04040, 0.55);
    book.lineBetween(296, 74, 296, 646);

    // Blokuje klik "przez" książkę
    const bookHit = s.add.rectangle(250, 50, 780, 620, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive();

    this.dir.add([blocker, book, bookHit]);

    this.t(this.dir, 318, 92, 'LOCAL DIRECTORY', 34, '#2a2118', FONT_TEXT);
    this.t(this.dir, 320, 138, 'Telephone numbers, as far as anyone will admit.', 15, '#6b5a3a', FONT_TEXT);

    const closeKey = {
      x: 884,
      y: 88
    };

    const closeBtn = this.t(this.dir, closeKey.x, closeKey.y, '[ CLOSE ]', 14, '#7a1f1f', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.sfxClick();
      this.closeDirectory();
    });

    const contacts = this.contacts.filter(contact => contact.listed === true);
    const perPage = 7;
    const pages = Math.max(1, Math.ceil(contacts.length / perPage));

    this.directoryPage = Math.min(this.directoryPage, pages - 1);

    const visible = contacts.slice(
      this.directoryPage * perPage,
      (this.directoryPage + 1) * perPage
    );

    visible.forEach((contact, index) => {
      const y = 160 + index * 58;

      const highlight = s.add.rectangle(300, y + 6, 690, 50, 0xfff2a8, 0)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      highlight.on('pointerover', () => highlight.setFillStyle(0xfff2a8, 0.5));
      highlight.on('pointerout', () => highlight.setFillStyle(0xfff2a8, 0));
      highlight.on('pointerdown', () => {
        this.sfxClick();
        this.pickContact(contact);
      });

      this.dir.add(highlight);

      const number = this.t(this.dir, 318, y + 10, contact.number, 30, '#2a2118', FONT_TEXT);
      const name = this.t(this.dir, 980, y + 14, contact.name, 24, '#2a2118', FONT_TEXT)
        .setOrigin(1, 0);

      // Kropki prowadzące
      const leaders = s.add.graphics();
      leaders.fillStyle(0x6b5a3a, 0.7);

      for (let x = number.x + number.width + 14; x < name.x - name.width - 14; x += 9) {
        leaders.fillCircle(x, y + 34, 1.4);
      }

      this.dir.add(leaders);
    });

    if (!contacts.length) {
      this.t(this.dir, 318, 190, 'No listed contacts.', 22, '#2a2118', FONT_TEXT);
    }

    // Paginacja
    const prev = this.t(this.dir, 318, 600, '<', 24, '#2a2118', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    prev.on('pointerdown', () => this.turnDirectory(-1));

    this.t(this.dir, 380, 604, `${this.directoryPage + 1} / ${pages}`, 18, '#2a2118', FONT_TEXT);

    const next = this.t(this.dir, 470, 600, '>', 24, '#2a2118', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    next.on('pointerdown', () => this.turnDirectory(1));

    this.t(
      this.dir,
      980,
      606,
      'Click a line to note the number.\nUnlisted numbers must be dialled manually.',
      14,
      '#5a4a30',
      FONT_TEXT
    ).setOrigin(1, 0).setAlign('right');
  }

  // ─── Sprzątanie ───────────────────────────────────────────────────────────

  destroy() {
    if (this.destroyed) return;

    this.close();
    this.destroyed = true;

    this.stopTick();
    this.stopLoops();
    this.clearLog();

    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.scale.off('resize', this.onResize);
    this.scene.events.off('shutdown', this.destroy, this);

    [this.root, this.ui, this.handset, this.hooks, this.dial, this.stickyNote]
      .forEach(obj => this._kill(obj));

    this.root.destroy(true);
    this.root = null;
    this.ui = null;
  }
}