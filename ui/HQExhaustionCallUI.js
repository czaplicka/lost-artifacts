import { DialogUI } from './DialogUI.js';
import { EventBus } from '../EventBus.js';

const POLL_MS = 100;
const QUIET_MS = 250;
const EXCLUDED_SCENES = new Set([
  'UIScene', 'NewsHud', 'LoadingOverlayScene',
  '__LostArtifactsAudioHost', 'HollyIntroScene',
  'BootScene', 'PreloaderScene', 'MenuScene', 'GameOverScene'
]);

export class HQExhaustionCallUI {
  constructor() {
    this.pending = null;
    this.onDone = null;
    this.dialog = null;
    this.hostScene = null;
    this.timer = null;
    this.clearSince = null;
    this.awaitingHolly = false;
    this.hooksInstalled = false;
    this.hudHidden = false;
    this.finishing = false;

    this.onHollyRequested = () => {
      this.awaitingHolly = true;
      this.clearSince = null;
      this.removeView(false);
      this.schedule();
    };

    this.onHollyFinished = () => {
      this.awaitingHolly = false;
      this.clearSince = null;
      this.schedule();
    };

    this.onHostInactive = () => {
      this.clearSince = null;
      this.removeView(false);
      this.schedule();
    };

    this.keyHandler = event => {
      if (!this.dialog || !this.pending) return;
      event.stopImmediatePropagation();
      if (['Enter', ' ', 'Spacebar', 'Tab', 'Escape'].includes(event.key)) {
        event.preventDefault();
      }
      if (event.type === 'keydown' && !event.repeat && ['Enter', ' ', 'Spacebar'].includes(event.key)) {
        this.dialog.advance();
      }
    };

    this.installHooks();
  }

  get isOpen() {
    return Boolean(this.dialog);
  }

  installHooks() {
    if (this.hooksInstalled) return;
    this.hooksInstalled = true;
    EventBus.on('firstForcedSleepStory', this.onHollyRequested);
    EventBus.on('hollyIntroFinished', this.onHollyFinished);
    EventBus.on('hollySleepFinished', this.onHollyFinished);
  }

  getGame() {
    return typeof window !== 'undefined' ? window.game || null : null;
  }

  isHollyBusy() {
    const manager = this.getGame()?.scene;
    if (manager?.keys?.PlayerHudScene?._sleepStoryInFlight) return true;
    const holly = manager?.keys?.HollyIntroScene;
    if (!holly?.sys) return this.awaitingHolly;
    const sys = holly.sys;
    if (sys.isActive?.() || sys.isPaused?.() || sys.isSleeping?.()) return true;
    const states = typeof Phaser !== 'undefined' ? Phaser.Scenes : null;
    if (states && [states.INIT, states.START, states.LOADING, states.CREATING]
      .filter(value => typeof value === 'number').includes(sys.settings?.status)) return true;
    return this.awaitingHolly;
  }

  findHostScene() {
    const manager = this.getGame()?.scene;
    if (!manager) return null;
    const hud = manager.keys?.PlayerHudScene;
    if (hud?.sys?.isActive?.() && hud.add && hud.time) return hud;
    const scenes = manager.getScenes?.(true) || [];
    return [...scenes].reverse().find(scene =>
      scene?.sys?.isActive?.() && scene.add && scene.time &&
      !EXCLUDED_SCENES.has(scene.sys.settings?.key)
    ) || null;
  }

  open({ incidentCount = 1, onDone } = {}) {
    if (this.pending || this.dialog) return true;
    if (typeof document === 'undefined') return false;
    this.installHooks();
    const count = Number(incidentCount);
    this.pending = {
      incidentCount: Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
    };
    this.onDone = typeof onDone === 'function' ? onDone : null;
    this.finishing = false;
    this.clearSince = null;
    this.schedule();
    return true;
  }

  schedule() {
    if (!this.pending || this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.tick();
    }, POLL_MS);
  }

  tick() {
    if (!this.pending) return;
    if (this.isHollyBusy()) {
      this.clearSince = null;
      this.removeView(false);
      this.schedule();
      return;
    }
    if (typeof document === 'undefined' || !document.body || document.hidden) {
      this.clearSince = null;
      this.schedule();
      return;
    }
    if (this.dialog && !this.hostScene?.sys?.isActive?.()) {
      this.removeView(false);
      this.clearSince = null;
    }
    if (!this.dialog) {
      if (this.clearSince === null) this.clearSince = Date.now();
      if (Date.now() - this.clearSince >= QUIET_MS) this.build();
    }
    this.schedule();
  }

  getDialogue() {
    return {
      speaker: 'Headquarters',
      portraitKey: 'portrait_hq',
      lines: [
        this.pending?.incidentCount > 1
          ? 'Agent, we have already discussed this. This is another exhaustion incident on your record.'
          : 'Agent, we recover lost artefacts. We do not want to add you to the inventory.',
        'Sleeping under a bridge is not undercover work. That is simply being under a bridge.',
        'We have arranged a free bed at the Agency Motel. Use it. Eat regularly. Get some sleep before your body files a formal complaint.',
        'Consider this an official warning. Another incident like this could cost you your job.',
        'AGENT: Understood. No more accommodation with a river view.'
      ]
    };
  }

  // Kept for callers that previously inspected the phone transcript.
  getTranscript() {
    return this.getDialogue().lines.join('\n\n');
  }

  build() {
    if (!this.pending || this.dialog || this.isHollyBusy()) return;
    const scene = this.findHostScene();
    if (!scene) return;
    try {
      this.hostScene = scene;
      this.dialog = new DialogUI(scene);
      this.dialog.overlay.setDepth(1000000);
      this.dialog.container.setDepth(1000001);
      scene.events.once('shutdown', this.onHostInactive);
      scene.events.once('sleep', this.onHostInactive);
      scene.events.once('pause', this.onHostInactive);
      document.addEventListener('keydown', this.keyHandler, true);
      document.addEventListener('keyup', this.keyHandler, true);
      this.hudHidden = true;
      EventBus.emit('hideHUD');
      scene.scene.bringToTop();
      this.dialog.open(this.getDialogue(), {
        onClose: () => this.finish()
      });
    } catch (error) {
      console.error('[HQExhaustionCallUI] Could not open conversation.', error);
      this.removeView(true);
      this.clearSince = null;
    }
  }

  finish() {
    if (!this.pending || this.finishing) return;
    this.finishing = true;
    const done = this.onDone;
    this.destroy();
    done?.();
  }

  removeView(showHUD = true) {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.keyHandler, true);
      document.removeEventListener('keyup', this.keyHandler, true);
    }
    const scene = this.hostScene;
    this.hostScene = null;
    scene?.events.off('shutdown', this.onHostInactive);
    scene?.events.off('sleep', this.onHostInactive);
    scene?.events.off('pause', this.onHostInactive);
    const dialog = this.dialog;
    this.dialog = null;
    dialog?.destroy();
    if (showHUD && this.hudHidden) {
      this.hudHidden = false;
      EventBus.emit('showHUD');
    }
  }

  destroy() {
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.removeView(!this.isHollyBusy());
    this.onDone = null;
    this.clearSince = null;
    this.awaitingHolly = false;
    if (this.hooksInstalled) {
      EventBus.off('firstForcedSleepStory', this.onHollyRequested);
      EventBus.off('hollyIntroFinished', this.onHollyFinished);
      EventBus.off('hollySleepFinished', this.onHollyFinished);
      this.hooksInstalled = false;
    }
  }
}