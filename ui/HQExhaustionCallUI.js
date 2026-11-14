import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { DialogUI } from './DialogUI.js';
import { EventBus } from '../EventBus.js';
import { PhoneCallScene } from '../scenes/PhoneCallScene.js';

const POLL_MS = 100;
const QUIET_MS = 250;
const CALL_KEY = '__HQExhaustionIncomingCall';
const EXCLUDED_SCENES = new Set([
  'UIScene','NewsHud','LoadingOverlayScene','__LostArtifactsAudioHost',
  'HollyIntroScene','BootScene','PreloaderScene','GameOverScene',CALL_KEY
]);

class HQExhaustionIncomingCall extends PhoneCallScene {
  constructor() {
    super();
    this.sys.settings.key = CALL_KEY;
  }

  init(data = {}) {
    super.init(data);
    this.callOwner = data.callOwner || null;
    this.hqDialog = null;
    this.phoneRoot = null;
    this.answeringCall = false;
    this.callFinished = false;
    this.phoneWidth = 0;
    this.phoneHeight = 0;
  }

  create() {
    if (!this.callOwner?.pending) { this.scene.stop(); return; }
    super.create();
    const answer = this.ui.find(object => object?.text === __dialogueText("ui/HQExhaustionCallUI.js", "t_569571744c7853c81c52"));
    const ignore = this.ui.find(object => object?.text === __dialogueText("ui/HQExhaustionCallUI.js", "t_3d71a7b1b5f2153ff09e"));
    const caller = this.ui.find(object => object?.text === __dialogueText("ui/HQExhaustionCallUI.js", "t_258648f8498aa3aecd7c"));
    if (!answer || !ignore) {
      console.error('[HQExhaustionCallUI] Incoming phone controls are missing.');
      this.scene.stop();
      return;
    }
    answer.removeAllListeners('pointerdown');
    ignore.removeAllListeners('pointerdown');
    caller?.setText(__dialogueText("ui/HQExhaustionCallUI.js", "t_fdafaf020afdd4e9ae3c"));
    // The existing exhaustion warning requires acknowledgement.
    // Do not inherit IGNORE, suspect-file unlocks or hypothesis navigation.
    ignore.disableInteractive().setVisible(false);
    answer.setX(this.scale.width / 2);
    answer.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      this.answerCall();
    });
    this.phoneWidth = this.scale.width;
    this.phoneHeight = this.scale.height;
    this.phoneRoot = this.add.container(0, 0, this.ui.slice(1)).setDepth(2001);
    this.trackInputEvent(this.scale, 'resize', this.layoutCall, this);
    this.layoutCall();
    this.scene.bringToTop();
  }

  layoutCall() {
    const { width, height } = this.scale;
    this.ui[0]?.setSize(width, height);
    if (this.phoneRoot && !this.answeringCall) {
      const scale = Math.max(.01, Math.min(1, (width - 24) / 400, (height - 24) / 700));
      this.phoneRoot.setScale(scale).setPosition(
        width / 2 - this.phoneWidth * scale / 2,
        height / 2 - this.phoneHeight * scale / 2
      );
    }
    if (this.hqDialog) {
      this.hqDialog.overlay?.setPosition(width / 2, height / 2).setSize(width, height);
      this.hqDialog.container?.setPosition(width / 2, height - 220);
    }
  }

  answerCall() {
    if (this.answeringCall || this.callFinished || this.isShuttingDown || !this.callOwner?.pending) return;
    this.answeringCall = true;
    this.isAnswered = true;
    this.isEnding = true;
    this.stopRinging();
    for (const object of this.ui) object?.setVisible(false);
    this.phoneRoot?.setVisible(false);
    try {
      this.hqDialog = new DialogUI(this);
      this.hqDialog.overlay.setDepth(4000);
      this.hqDialog.container.setDepth(4001);
      this.callOwner.dialog = this.hqDialog;
      this.hqDialog.open(this.callOwner.getDialogue(), {
        onClose: () => this.finishCall()
      });
      this.layoutCall();
    } catch (error) {
      console.error('[HQExhaustionCallUI] Could not open conversation:', error);
      this.scene.stop();
    }
  }

  finishCall() {
    if (this.callFinished || this.isShuttingDown) return;
    this.callFinished = true;
    this.callOwner?.finish();
  }

  onShutdown() {
    const owner = this.callOwner;
    this.callOwner = null;
    this.hqDialog?.destroy();
    this.hqDialog = null;
    super.onShutdown();
    this.phoneRoot?.destroy();
    this.phoneRoot = null;
    owner?.onPhoneInterrupted(this);
  }
}

export class HQExhaustionCallUI {
  constructor() {
    this.pending = null;
    this.onDone = null;
    this.dialog = null;
    this.hostScene = null;
    this.phoneScene = null;
    this.launching = false;
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
      if (!this.pending || (!this.phoneScene && !this.launching)) return;
      const target = event.target;
      if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)) return;
      event.stopImmediatePropagation();
      if ([__dialogueText("ui/HQExhaustionCallUI.js", "t_dc8659db6d416dc32fca"),' ',__dialogueText("ui/HQExhaustionCallUI.js", "t_a751a211880ebc526765"),__dialogueText("ui/HQExhaustionCallUI.js", "t_90ddf1963abb36c9921c"),__dialogueText("ui/HQExhaustionCallUI.js", "t_037c968467aa3fd7c059")].includes(event.key)) event.preventDefault();
      if (event.type !== 'keydown' || event.repeat || ![__dialogueText("ui/HQExhaustionCallUI.js", "t_dc8659db6d416dc32fca"),' ',__dialogueText("ui/HQExhaustionCallUI.js", "t_a751a211880ebc526765")].includes(event.key)) return;
      if (this.dialog?.isOpen) this.dialog.advance();
      else this.phoneScene?.answerCall();
    };
    this.installHooks();
  }

  get isOpen() { return Boolean(this.pending); }

  installHooks() {
    if (this.hooksInstalled) return;
    this.hooksInstalled = true;
    EventBus.on('firstForcedSleepStory', this.onHollyRequested);
    EventBus.on('hollyIntroFinished', this.onHollyFinished);
    EventBus.on('hollySleepFinished', this.onHollyFinished);
  }

  getGame() { return typeof window !== 'undefined' ? window.game || null : null; }

  isHollyBusy() {
    const manager = this.getGame()?.scene;
    if (manager?.keys?.PlayerHudScene?._sleepStoryInFlight) return true;
    const holly = manager?.keys?.HollyIntroScene;
    if (!holly?.sys) return this.awaitingHolly;
    const sys = holly.sys;
    if (sys.isActive?.() || sys.isPaused?.() || sys.isSleeping?.()) return true;
    const states = typeof Phaser !== 'undefined' ? Phaser.Scenes : null;
    if (states && [states.INIT,states.START,states.LOADING,states.CREATING]
      .filter(value => typeof value === 'number').includes(sys.settings?.status)) return true;
    return this.awaitingHolly;
  }

  findHostScene() {
    const manager = this.getGame()?.scene;
    if (!manager) return null;
    const hud = manager.keys?.PlayerHudScene;
    if (hud?.sys?.isActive?.() && hud.add && hud.time) return hud;
    const scenes = manager.getScenes?.(true) || [];
    return [...scenes].reverse().find(scene => scene?.sys?.isActive?.() && scene.add && scene.time &&
      !EXCLUDED_SCENES.has(scene.sys.settings?.key)) || null;
  }

  open({ incidentCount = 1, onDone } = {}) {
    if (this.pending || this.phoneScene) return true;
    if (typeof document === 'undefined') return false;
    this.installHooks();
    const count = Number(incidentCount);
    this.pending = { incidentCount: Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1 };
    this.onDone = typeof onDone === 'function' ? onDone : null;
    this.finishing = false;
    this.clearSince = null;
    this.schedule();
    return true;
  }

  schedule() {
    if (!this.pending || this.timer !== null) return;
    this.timer = setTimeout(() => { this.timer = null; this.tick(); }, POLL_MS);
  }

  tick() {
    if (!this.pending) return;
    if (this.isHollyBusy()) {
      this.clearSince = null; this.removeView(false); this.schedule(); return;
    }
    if (typeof document === 'undefined' || !document.body || document.hidden) {
      this.clearSince = null; this.schedule(); return;
    }
    if (this.phoneScene && !this.launching && !this.hostScene?.sys?.isActive?.()) {
      this.removeView(false); this.clearSince = null;
    }
    if (!this.phoneScene && !this.launching) {
      if (this.clearSince === null) this.clearSince = Date.now();
      if (Date.now() - this.clearSince >= QUIET_MS) this.build();
    }
    this.schedule();
  }

  getDialogue() {
    return {
      speaker: __dialogueText("ui/HQExhaustionCallUI.js", "t_ade0f7975671c1a0abbf"), portraitKey: 'portrait_hq',
      lines: [
        this.pending?.incidentCount > 1
          ? __dialogueText("ui/HQExhaustionCallUI.js", "t_bc69eccef479680c93d6")
          : __dialogueText("ui/HQExhaustionCallUI.js", "t_b0d1abc8b78d730fcc9b"),
        __dialogueText("ui/HQExhaustionCallUI.js", "t_18835d0037b63a1a655f"),
        __dialogueText("ui/HQExhaustionCallUI.js", "t_474efce0b5dbb47ec5b9"),
        __dialogueText("ui/HQExhaustionCallUI.js", "t_388ef9421c1d9d20d75f"),
        __dialogueText("ui/HQExhaustionCallUI.js", "t_b7c87e1c04762f583cf3")
      ]
    };
  }
  getTranscript() { return this.getDialogue().lines.join('\n\n'); }

  build() {
    if (!this.pending || this.phoneScene || this.launching || this.isHollyBusy()) return;
    const host = this.findHostScene();
    if (!host) return;
    const manager = host.scene.manager;
    const existing = manager.keys[CALL_KEY];
    const states = Phaser.Scenes;
    const inFlight = existing && [states.INIT,states.START,states.LOADING,states.CREATING]
      .filter(value => typeof value === 'number').includes(existing.sys.settings.status);
    if (existing && (existing.sys.isActive() || existing.sys.isPaused() || existing.sys.isSleeping() || inFlight)) return;
    try {
      if (!existing) manager.add(CALL_KEY, HQExhaustionIncomingCall, false);
      this.hostScene = host;
      this.phoneScene = manager.keys[CALL_KEY];
      this.launching = true;
      host.events.once('shutdown', this.onHostInactive);
      host.events.once('sleep', this.onHostInactive);
      host.events.once('pause', this.onHostInactive);
      document.addEventListener('keydown', this.keyHandler, true);
      document.addEventListener('keyup', this.keyHandler, true);
      this.hudHidden = true;
      EventBus.emit('hideHUD');
      this.phoneScene.events.once('create', () => {
        if (this.phoneScene?.callOwner === this) this.launching = false;
      });
      host.scene.launch(CALL_KEY, { callOwner: this, sourceScene: host.sys.settings.key });
      host.scene.bringToTop(CALL_KEY);
    } catch (error) {
      console.error('[HQExhaustionCallUI] Could not open incoming phone:', error);
      this.removeView(true); this.clearSince = null;
    }
  }

  onPhoneInterrupted(phone) {
    if (this.phoneScene !== phone) return;
    this.dialog = null;
    this.phoneScene = null;
    this.launching = false;
    this.removeView(false);
    this.clearSince = null;
    if (this.pending && !this.finishing) this.schedule();
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
    const host = this.hostScene;
    this.hostScene = null;
    host?.events.off('shutdown', this.onHostInactive);
    host?.events.off('sleep', this.onHostInactive);
    host?.events.off('pause', this.onHostInactive);
    const phone = this.phoneScene;
    this.phoneScene = null;
    this.dialog = null;
    this.launching = false;
    if (phone?.callOwner === this) {
      phone.callOwner = null;
      phone.stopRinging();
      host?.scene.stop(CALL_KEY);
    }
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