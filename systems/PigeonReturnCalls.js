import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';

const INSTALL = Symbol.for('lost-artifacts.pigeon-return-calls.v1');
const CALL_KEY = '__PigeonReturnIncomingCall';
const SAFE_SCENES = new Set([
  'CityScene', 'CrimeCityScene', 'HomeCityScene', 'OfficeScene',
  'MediumOfficeScene', 'HotelScene', 'PigeonLoftScene'
]);
const BACKGROUND = new Set(['PlayerHudScene', 'UIScene', 'NewsHud', '__LostArtifactsAudioHost']);
const stamp = bird => `${bird.departedAt}:${bird.returnAt}`;
export function getPendingPigeonReturns(state, now = Date.now()) {
  const birds = state?.pigeonLoft?.birds;
  if (!Array.isArray(birds)) return [];
  return birds.filter(bird => bird?.arrived === true &&
    Number.isFinite(bird.departedAt) && Number.isFinite(bird.returnAt) &&
    now >= bird.returnAt && bird.returnCallNotifiedFlight !== stamp(bird))
    .map(bird => ({ id: bird.id, name: String(bird.name || 'Your pigeon'), flight: stamp(bird) }));
}
export function markPigeonReturnNotified(state, flight) {
  const loft = state?.pigeonLoft;
  if (!Array.isArray(loft?.birds)) return false;
  const bird = loft.birds.find(b => b.id === flight.id && stamp(b) === flight.flight && b.returnAt != null);
  if (!bird) return false;
  state.pigeonLoft = { ...loft, birds: loft.birds.map(b => b === bird
    ? { ...b, returnCallNotifiedFlight: flight.flight } : b) };
  return true;
}
function uiBusy(scene) {
  if (scene._conversationOpen || scene._timelineOpen || scene._preparing ||
      scene._finishing || scene.isLeaving || scene._sleepStoryInFlight) return true;
  return Object.values(scene).some(value => value && typeof value === 'object' &&
    (value.isOpen === true || value.isCalling === true));
}
function safeHost(game) {
  const active = game.scene.getScenes(true);
  const gameplay = active.filter(scene => !BACKGROUND.has(scene.sys.settings.key));
  if (gameplay.length !== 1 || !SAFE_SCENES.has(gameplay[0].sys.settings.key)) return null;
  if (active.some(uiBusy)) return null;
  if (Object.values(game.scene.keys).some(scene => {
    const s = scene.sys?.settings;
    return s && [Phaser.Scenes.START, Phaser.Scenes.LOADING, Phaser.Scenes.CREATING].includes(s.status);
  })) return null;
  if (typeof document !== 'undefined') {
    if (document.hidden) return null;
    const element = document.activeElement;
    if (element?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(element?.tagName)) return null;
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return null;
  }
  return gameplay[0];
}
function createCallClass(IncomingPhoneCallScene, IncomingCallDialogUI) {
  return class PigeonReturnIncomingCall extends IncomingPhoneCallScene {
    constructor() { super(); this.sys.settings.key = CALL_KEY; }
    init(data = {}) {
      super.init(data);
      this.owner = data.owner;
      this.flight = data.flight;
      this.parentScene = data.parentScene;
      this.dialog = null;
      this.phoneRoot = null;
      this.answering = false;
      this.finished = false;
      this.lockedInputs = [];
      this.keyHandler = null;
    }
    create() {
      if (!this.owner || !this.owner.stillPending(this.flight)) { this.scene.stop(); return; }
      super.create();
      const { answer, ignore, caller } = this.controls;
      caller.setText('HOME\n555-0142');
      answer.on('pointerdown', (p, _x, _y, event) => {
        event?.stopPropagation();
        if (p?.event?.button != null && p.event.button !== 0) return;
        this.answerReturnCall();
      });
      ignore.on('pointerdown', (p, _x, _y, event) => {
        event?.stopPropagation();
        if (p?.event?.button != null && p.event.button !== 0) return;
        if (!this.answering) this.finishReturnCall();
      });
      this.phoneWidth = this.scale.width;
      this.phoneHeight = this.scale.height;
      this.phoneRoot = this.add.container(0, 0, this.ui.slice(1)).setDepth(2001);
      for (const scene of this.game.scene.getScenes(true)) {
        if (scene === this || !scene.input) continue;
        this.lockedInputs.push([scene, scene.input.enabled]);
        scene.input.enabled = false;
      }
      this.keyHandler = event => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.stopImmediatePropagation();
        if (['Enter','Space','Escape','NumpadEnter'].includes(event.code)) event.preventDefault();
        if (event.type !== 'keydown' || event.repeat) return;
        if (['Enter','Space','NumpadEnter'].includes(event.code)) {
          if (this.dialog?.isOpen) this.dialog.advance();
          else this.answerReturnCall();
        } else if (event.code === 'Escape' && !this.answering) this.finishReturnCall();
      };
      window.addEventListener('keydown', this.keyHandler, true);
      window.addEventListener('keyup', this.keyHandler, true);
      this.trackInputEvent(this.scale, 'resize', this.layoutReturnCall, this);
      this.layoutReturnCall();
      this.scene.bringToTop();
    }
    layoutReturnCall() {
      const { width, height } = this.scale;
      this.ui[0]?.setSize(width, height);
      if (this.phoneRoot && !this.answering) {
        const scale = Math.max(.01, Math.min(1, (width - 24) / 400, (height - 24) / 700));
        this.phoneRoot.setScale(scale).setPosition(
          width / 2 - this.phoneWidth * scale / 2,
          height / 2 - this.phoneHeight * scale / 2);
      }
      this.dialog?.layout();
    }
    answerReturnCall() {
      if (this.answering || this.finished || this.isShuttingDown) return;
      this.answering = true;
      this.isAnswered = true;
      this.isEnding = true;
      this.stopRinging();
      this.ui.forEach(object => object?.setVisible(false));
      this.phoneRoot?.setVisible(false);
      try {
        this.dialog = new IncomingCallDialogUI(this);
        this.dialog.open({ speaker: 'HOME', lines: [
          `${this.flight.name} is back. It brought something. We're choosing to call it a delivery.`,
          'Come by the pigeon loft when you have a moment. The package is waiting.'
        ] }, { onClose: () => this.finishReturnCall() });
      } catch (error) {
        console.error('[PigeonReturnCalls] Conversation failed:', error);
        this.scene.stop();
      }
    }
    finishReturnCall() {
      if (this.finished || this.isShuttingDown) return;
      this.finished = true;
      this.isEnding = true;
      this.stopRinging();
      try { this.owner?.acknowledge(this.flight); }
      catch (error) { console.error('[PigeonReturnCalls] Could not save notification:', error); }
      finally { this.scene.stop(); }
    }
    update() {
      if (!this.parentScene?.sys?.isActive?.()) { this.scene.stop(); return; }
      const other = this.game.scene.getScenes(true).some(scene => scene !== this &&
        scene !== this.parentScene && !BACKGROUND.has(scene.sys.settings.key));
      if (other) this.scene.stop();
    }
    onShutdown() {
      const owner = this.owner;
      this.owner = null;
      if (this.keyHandler) {
        window.removeEventListener('keydown', this.keyHandler, true);
        window.removeEventListener('keyup', this.keyHandler, true);
      }
      for (const [scene, enabled] of this.lockedInputs || []) if (scene.input) scene.input.enabled = enabled;
      this.lockedInputs = [];
      this.dialog?.destroy();
      this.dialog = null;
      super.onShutdown();
      this.phoneRoot?.destroy();
      this.phoneRoot = null;
      owner?.interrupted();
    }
  };
}
export function installPigeonReturnCalls(game) {
  if (!game?.events || game[INSTALL]) return;
  const controller = {
    loading: false, nextPoll: 0, quietHost: null, quietSince: 0, cooldown: 0,
    stillPending(flight) {
      return getPendingPigeonReturns(gameState).some(b => b.id === flight?.id && b.flight === flight.flight);
    },
    acknowledge(flight) {
      if (markPigeonReturnNotified(gameState, flight)) { requestAutosave(); flushAutosave(); }
    },
    interrupted() {
      this.loading = false;
      this.quietHost = null;
      this.cooldown = Date.now() + 2500;
    }
  };
  game[INSTALL] = controller;
  const tick = async () => {
    const now = Date.now();
    if (now < controller.nextPoll || now < controller.cooldown || controller.loading) return;
    controller.nextPoll = now + 500;
    const phone = game.scene.keys[CALL_KEY];
    if (phone && (phone.sys.isActive() || phone.sys.isPaused() || phone.sys.isSleeping())) return;
    const flight = getPendingPigeonReturns(gameState, now)[0];
    if (!flight) { controller.quietHost = null; return; }
    const host = safeHost(game);
    if (!host) { controller.quietHost = null; return; }
    if (controller.quietHost !== host) {
      controller.quietHost = host;
      controller.quietSince = now;
      return;
    }
    if (now - controller.quietSince < 1500) return;
    controller.loading = true;
    try {
      if (!game.scene.keys[CALL_KEY]) {
        const [{ IncomingPhoneCallScene }, { IncomingCallDialogUI }] = await Promise.all([
          import('../scenes/IncomingPhoneCallScene.js'), import('../ui/IncomingCallDialogUI.js')
        ]);
        if (game[INSTALL] !== controller) return;
        game.scene.add(CALL_KEY, createCallClass(IncomingPhoneCallScene, IncomingCallDialogUI), false);
      }
      if (safeHost(game) !== host || !controller.stillPending(flight)) return;
      host.scene.launch(CALL_KEY, { owner: controller, flight, parentScene: host, sourceScene: host.sys.settings.key });
    } catch (error) {
      console.error('[PigeonReturnCalls] Could not open incoming phone:', error);
      controller.cooldown = Date.now() + 10000;
    } finally {
      controller.loading = false;
      controller.quietHost = null;
    }
  };
  game.events.on('step', tick);
  game.events.once('destroy', () => { game.events.off('step', tick); delete game[INSTALL]; });
}
