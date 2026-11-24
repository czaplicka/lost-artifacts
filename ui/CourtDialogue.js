import { dialogueText as t } from '../dialogues/DialogueText.js';
import { HomeTownDialogue } from './HomeTownDialogue.js';

// Wspólny renderer. Ten adapter dodaje jedynie sądową blokadę wyboru do ostatniej strony.
export class CourtDialogue {
  constructor(scene) {
    this.scene = scene; this.generation = 0; this.model = null; this.destroyed = false;
    this.shared = new HomeTownDialogue(scene, () => {});
    this.dispose = () => this.destroy();
    scene.events.once('shutdown', this.dispose); scene.events.once('destroy', this.dispose);
  }
  show(model) {
    if (this.destroyed) return;
    this.model = model; this.generation++;
    this.shared.seen.clear();
    this.shared.show({title:model.title, messages:model.messages, choices:[],
      showTrust:false, scoreTrust:false, depth:5000, onDraw:() => this.decorate()});
    this.shared.stop();
  }
  decorate() {
    const panel = this.shared.panel, s = this.scene;
    if (!panel || this.destroyed) return;
    // H/Help zamiast Leave. Escape NIE kończy rozprawy i NIE wybiera odpowiedzi.
    panel.byeBtn.text.setText('H   HINT');
    panel.onLeave = () => s.openHint();
    panel._handleKey = event => s.onKey(event);
    panel._advance = () => s.changePage(1);
    panel.previousPage = () => s.changePage(-1);
    const render = panel.renderTextPage.bind(panel);
    panel.renderTextPage = () => { render(); this.shared.stop(); this.sync(); };
    this.sync();
    panel.root.setVisible(!s.hintModal);
    if (panel.blocker?.input) panel.blocker.input.enabled = false;
  }
  sync() {
    const p = this.shared.panel, s = this.scene;
    if (!p || !this.model) return;
    s.pageIndex = p.pageIndex; s.pageCount = Math.max(1, p.pages.length);
    s.inputLockUntil = s.time.now + 200;
    const generation = this.generation;
    const last = s.pageIndex === s.pageCount - 1;
    const multiple = s.pageCount > 1;
    s.previousPage?.root.setVisible(multiple); s.nextPage?.root.setVisible(multiple);
    s.enableButton(s.previousPage,s.pageIndex>0); s.enableButton(s.nextPage,!last);
    s.pageLabel?.setVisible(multiple).setText(`${t('scenes/CourtScene.js','t_f8119b8ecd8507346fa7')}${s.pageIndex+1}${t('scenes/CourtScene.js','t_005e1574a2b5c8163046')}${s.pageCount}`);
    this.shared.data.choices = this.model.choices.map((choice,index) => ({
      id:`court:${generation}:${index}`,label:choice.label,disabled:!last || s.busy,
      scoreTrust:false,action:() => {
        if (!this.destroyed && this.generation === generation) s.press(index);
      }
    }));
    this.shared.updateTopics();
  }
  turn(delta) {
    const p = this.shared.panel; if (!p) return;
    const next = Math.max(0, Math.min(p.pages.length-1, p.pageIndex+delta));
    if (next === p.pageIndex) return;
    p.pageIndex = next; p.renderTextPage();
  }
  hintVisible(visible) {
    const p = this.shared.panel; if (!p) return;
    this.shared.stop(); p.root.setVisible(!visible);
    if (p.blocker?.input) p.blocker.input.enabled = false;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.generation++; this.shared.destroy();
    this.scene.events.off('shutdown',this.dispose); this.scene.events.off('destroy',this.dispose);
  }
}
