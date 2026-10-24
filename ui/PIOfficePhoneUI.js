import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './pi-phone/PhoneConfig.js';
import { PhoneAudio } from './pi-phone/PhoneAudio.js';
import { PhoneCalls } from './pi-phone/PhoneCalls.js';
import { PhoneTranscript } from './pi-phone/PhoneTranscript.js';
import { PhoneArtwork } from './pi-phone/PhoneArtwork.js';
import { PhoneDisplay } from './pi-phone/PhoneDisplay.js';
import { PhoneDirectory } from './pi-phone/PhoneDirectory.js';

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

// Preserve the original method names and the shared phone instance.
for (const methods of [
  PhoneAudio,
  PhoneCalls,
  PhoneTranscript,
  PhoneArtwork,
  PhoneDisplay,
  PhoneDirectory
]) {
  const descriptors = Object.getOwnPropertyDescriptors(methods);
  for (const descriptor of Object.values(descriptors)) {
    descriptor.enumerable = false;
  }
  Object.defineProperties(PIOfficePhoneUI.prototype, descriptors);
}
