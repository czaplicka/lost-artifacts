import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { getPigeonLoft, feedPigeon, collectPigeonFind } from '../managers/PigeonManager.js';
import { PIGEON_HOTSPOTS } from '../config/pigeonHotspots.js';
import { ASSETS, choosePigeonFeedingTarget } from './pigeonLoft/PigeonLoftData.js';
import { pigeonLoftView } from './pigeonLoft/PigeonLoftView.js';
import { pigeonLoftDialogue } from './pigeonLoft/PigeonLoftDialogue.js';
import { pigeonLoftCollection } from './pigeonLoft/PigeonLoftCollection.js';
import { pigeonLoftEditor } from './pigeonLoft/PigeonLoftEditor.js';
import { PigeonLoftNaming } from './pigeonLoft/PigeonLoftNaming.js';

export { choosePigeonFeedingTarget } from './pigeonLoft/PigeonLoftData.js';

export class PigeonLoftScene extends BaseScene {
  constructor() { super({ key: 'PigeonLoftScene' }); }

  preload() {
    for (const key of ASSETS) if (!this.textures.exists(key)) this.load.image(key, `${__dialogueText("scenes/PigeonLoftScene.js", "t_dd5cc3ea8364c52c82b4")}${key}${__dialogueText("scenes/PigeonLoftScene.js", "t_ed140d91e29553b83699")}`);
  }

  create() {
    super.create(); this.naming = new PigeonLoftNaming(this); this.registry.set('currentSceneKey', 'PigeonLoftScene');
    Object.assign(this, { leaving: false, modal: null, selectedSlot: 3, debugMode: false,
      selectedIndex: 0, hotspots: [], boundsCache: new Map(), signatureValue: '',
      namingSession: null, pigeonNameEditor: null,
      dialogue: null, dialogueCtx: null, lastText: '', toast: null, toastTimer: null,
      layer: null, hud: null, modalLayer: null, tip: null, fit: 1,
      animTargets: [], flyEvent: null, beamGfx: null, fxGfx: null });
    this.configs = PIGEON_HOTSPOTS.map(c => ({ ...c }));
    this.input.setTopOnly(true); this.cameras.main.setBackgroundColor('#151920');
    this.hideAgencyHud(); this.createTip(); this.renderLoft();
    this.trackInputEvent(this.scale, 'resize', this.onResize);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.tick = this.time.addEvent({ delay: 500, loop: true, callback: () => { this.hideAgencyHud(); this.refreshState(); } });
    this.events.on('update', this.onFxUpdate, this);
    this.events.once('shutdown', () => {
      this.naming?.destroy(); this.tick?.remove(false); this.toastTimer?.remove(false);
      this.events.off('update', this.onFxUpdate, this);
      this.killFx(); this.dialogue?.destroy(); this.dialogue = null;
      this.toast?.destroy(); this.tip?.container?.destroy(); this.tip = null;
      this.layer?.destroy(true); this.layer = null; this.hud?.destroy(true); this.hud = null;
      this.modalLayer?.destroy(true); this.modalLayer = null;
    });
    this.events.once('destroy', () => this.naming?.destroy());
  }

  hideAgencyHud() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      hud.closeAllUIPanels?.(); hud.closeMenu?.(true); hud.setHudVisible?.(false);
      if (this.isSceneActive(key)) this.sleepSceneIfActive(key);
      this.scene.setVisible(false, key);
    }
  }

  onResize() {
    // HomeTownDialogue odtwarza swój panel i stronę samodzielnie.
    // DOM-owe pole imienia jest responsywne i nie jest niszczone przez resize.
    this.renderLoft();
  }

  pourGrain() {
    if (this.leaving || this.debugMode) return;
    let state; try { state = getPigeonLoft(); } catch (error) { this.feedback(error.message, 'error'); return; }
    if (state.feed < 1) { this.feedback(__dialogueText("scenes/PigeonLoftScene.js", "t_6d61d87f32116dd77b49"), 'error'); return; }
    const target = choosePigeonFeedingTarget(state, this.selectedSlot);
    if (!target) {
      const ready = state.birds.find(b => b.status === 'ready');
      const fed = state.birds.find(b => b.status === 'home' && b.fed);
      this.feedback(ready ? `${ready.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_d832e0ae1095e8232182")}`
        : fed ? `${fed.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_8629e8f4d9083e3a37e6")}`
        : __dialogueText("scenes/PigeonLoftScene.js", "t_4d0feef752488488e614")); return;
    }
    this.selectedSlot = target.slot;
    this.action(() => feedPigeon(target.slot));
  }

  activate(id) {
    this.hideTip();
    if (id === 'cabinet') { this.openModal('collection'); return; }
    if (id === 'food') { this.feedback(`${__dialogueText("scenes/PigeonLoftScene.js", "t_bc8085de3996d1a7d9b4")}${this.state.feed}${__dialogueText("scenes/PigeonLoftScene.js", "t_806da1cee8ceee35f69e")}`); return; }
    if (id === 'feeder') { this.pourGrain(); return; }
    const match = id.match(/^(cage|p)([123])(b?)$/); if (!match) return;
    this.selectedSlot = Number(match[2]); const bird = this.state.slots.find(s => s.slot === this.selectedSlot)?.bird;
    if (match[3] && bird) this.action(() => collectPigeonFind(bird.id));
    else if (bird) this.openBirdDialogue(bird.slot);
    else this.feedback(__dialogueText("scenes/PigeonLoftScene.js", "t_93a60dcc2651b5d5f3d1"));
  }

  action(callback) {
    let result; try { result = callback(); } catch (error) { result = { ok: false, message: error.message }; }
    const ctx = this.dialogueCtx;
    if (result.ok && this.modal && this.modal !== 'collection') this.modal = null;
    if (result.ok && ctx?.type === 'perch') { this.closeDialogue(); this.showToast(result.message || '', __dialogueText("scenes/PigeonLoftScene.js", "t_aee408847d35e44e9943")); return result; }
    this.renderLoft();
    this.say(result.message || '', result.ok ? __dialogueText("scenes/PigeonLoftScene.js", "t_aee408847d35e44e9943") : __dialogueText("scenes/PigeonLoftScene.js", "t_ca00fccfb408989eddc4"));
    return result;
  }

  refreshState() {
    if (!this.layer || this._cleanupDone || this.debugMode) return;
    let state; try { state = getPigeonLoft(); } catch { return; }
    // Nie odtwarzamy panelu gry pod aktywnym polem HTML.
    if (this.pigeonNameEditor) { this.state = state; return; }
    if (this.signature(state) !== this.signatureValue) {
      this.renderLoft(); return;
    }
    // odliczanie czasu lotu w stopce panelu
    if (this.dialogue?.isOpen && this.dialogueCtx?.type === 'bird') {
      const bird = state.slots.find(s => s.slot === this.dialogueCtx.slot)?.bird;
      if (bird?.status === 'flying') { this.state = state; const f = this.birdFooter(bird); this.dialogue.setFooter(f.text, f.color); }
    }
  }

  async exitLoft() {
    if (this.leaving || this.debugMode) return;
    this.naming?.reset(); this.leaving = true;
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueCtx = null; this.hideTip();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'your-home' });
    if (moved === false && !this._cleanupDone) { this.leaving = false; this.showToast(__dialogueText("scenes/PigeonLoftScene.js", "t_51840bf533353059b7e2"), __dialogueText("scenes/PigeonLoftScene.js", "t_ca00fccfb408989eddc4")); }
  }

}

Object.assign(PigeonLoftScene.prototype, pigeonLoftView, pigeonLoftDialogue, pigeonLoftCollection, pigeonLoftEditor);
