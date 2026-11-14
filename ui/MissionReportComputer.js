import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import {
  getArchiveCaseId, getMissionReportForm, saveMissionReportDraft,
  printMissionReport, ensureMissionReport, isSuccessfulCase, isReportSubmitted
} from '../archiveReportService.js';
import { prepareMissionReportAudio,playMissionReportAudio,stopMissionReportAudio } from './MissionReportAudio.js';

const CSS = `${__dialogueText("ui/MissionReportComputer.js", "t_7cba86ae316b8238dae9")}`;
export class MissionReportComputer {
  constructor(scene) {
    this.scene = scene; this.state = scene.gameState ?? gameState;
    this.root = null; this.inputs = []; this.errors = new Set(); this.active = null;
    prepareMissionReportAudio(scene);
  }
  async open() {
    if (this.root) return;
    if (!isSuccessfulCase(this.state)) {
      this.scene.showOfficeStatusMessage(__dialogueText("ui/MissionReportComputer.js", "t_4ebb625d7f1199573e47")); return;
    }
    if (document.fullscreenElement?.tagName === 'CANVAS') {
      try { await document.exitFullscreen(); }
      catch { this.scene.showOfficeStatusMessage(__dialogueText("ui/MissionReportComputer.js", "t_c98312af369581c679c7")); return; }
    }
    if (this.scene._cleanupDone || !this.scene.sys.isActive()) return;
    this.locations = this.scene.cache.json.get('locations') || [];
    this.form = getMissionReportForm(this.locations, this.state);
    this.caseId = getArchiveCaseId(this.state);
    this.answers = { ...(this.form.answers || {}) };
    this.active = this.form.fields?.find(field => !this.answers[field.id])?.id ?? this.form.fields?.[0]?.id;
    this.message = !this.form.ok ? this.form.error : this.form.printed
      ? __dialogueText("ui/MissionReportComputer.js", "t_a8915eca26a4ecdbe310")
      : __dialogueText("ui/MissionReportComputer.js", "t_4e27d8fae1091aace3a0");
    this.previousFocus = document.activeElement;
    this.root = document.createElement('div'); this.root.className = 'mr-terminal';
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', __dialogueText("ui/MissionReportComputer.js", "t_c116321bcc5f84e8ab23"));
    const style = document.createElement('style'); style.textContent = CSS; this.root.append(style);
    this.panel = document.createElement('section'); this.panel.className = 'mr-monitor'; this.root.append(this.panel);
    this.root.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === __dialogueText("ui/MissionReportComputer.js", "t_037c968467aa3fd7c059")) { event.preventDefault(); this.close(); }
      if (event.key === __dialogueText("ui/MissionReportComputer.js", "t_90ddf1963abb36c9921c")) {
        const focusable = [...this.panel.querySelectorAll('button:not([disabled])')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    for (const event of ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart']) this.root.addEventListener(event, event => event.stopPropagation());
    const host = document.fullscreenElement || document.body; host.append(this.root);
    for (const scene of this.scene.scene.manager.scenes) {
      if (!scene.sys?.isActive?.() || !scene.input) continue;
      this.inputs.push({ input: scene.input, enabled: scene.input.enabled, keyboard: scene.input.keyboard, keyboardEnabled: scene.input.keyboard?.enabled });
      scene.input.enabled = false; if (scene.input.keyboard) scene.input.keyboard.enabled = false;
    }
    this.render(); this.panel.querySelector('button:not([disabled])')?.focus();
  }
  current() { return this.caseId === getArchiveCaseId(this.state) && isSuccessfulCase(this.state); }
  node(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  }
  button(text, action, disabled = false) {
    const button = this.node('button', text); button.type = 'button'; button.disabled = disabled;
    button.addEventListener('click', event => { event.stopPropagation(); action(); }); return button;
  }
  persist() {
    if (!this.current() || this.form.printed || this.form.submitted) return;
    const saved = saveMissionReportDraft(this.answers, this.locations, this.state);
    if (saved.ok && !saved.saved) this.message = __dialogueText("ui/MissionReportComputer.js", "t_3ae9efccd974b5687ff5");
  }
  slot(field) {
    const option = this.form.options.find(option => option.id === this.answers[field.id]);
    const button = this.button(option?.label ?? `[ ${field.hint} ]`, () => {
      if (this.active === field.id && this.answers[field.id]) {
        delete this.answers[field.id]; this.errors.delete(field.id); this.persist();
      }
      this.active = field.id; this.render(); this.panel.querySelector(`[data-slot="${field.id}"]`)?.focus();
    }, this.form.printed || this.form.submitted);
    button.className = 'mr-slot' + (this.errors.has(field.id) ? __dialogueText("ui/MissionReportComputer.js", "t_defa1d718f85180e724c") : ''); button.dataset.slot = field.id;
    button.setAttribute('aria-pressed', String(this.active === field.id));
    button.setAttribute('aria-label', `${field.hint}: ${option?.label ?? 'blank'}`); return button;
  }
  render() {
    if (!this.root) return;
    this.panel.replaceChildren(); this.panel.append(this.node('h2', __dialogueText("ui/MissionReportComputer.js", "t_a3e456c492d599d272ec")));
    if (this.form.ok) {
      const artifact = this.form.fields[0], suspect = this.form.fields[this.form.fields.length - 1], route = this.form.fields.slice(1, -1);
      const first = this.node('p', __dialogueText("ui/MissionReportComputer.js", "t_6a0d63b857fcd85fc086"));
      first.append(this.slot(artifact), document.createTextNode('.')); this.panel.append(first);
      const path = this.node('p', route.length ? __dialogueText("ui/MissionReportComputer.js", "t_07ee7bf3e402b367dff2") : __dialogueText("ui/MissionReportComputer.js", "t_56d907ca85f60813ea59"));
      route.forEach((field, index) => {
        if (index) path.append(document.createTextNode(index === route.length - 1 ? __dialogueText("ui/MissionReportComputer.js", "t_e3ee915a8e8c7aa02d2f") : ', '));
        path.append(this.slot(field));
      });
      if (route.length) path.append(document.createTextNode(__dialogueText("ui/MissionReportComputer.js", "t_63cde612d8867467154d"))); this.panel.append(path);
      const last = this.node('p', __dialogueText("ui/MissionReportComputer.js", "t_c4e68dcb0d04fe3fa772"));
      last.append(this.slot(suspect), document.createTextNode('.')); this.panel.append(last);
      this.panel.append(this.node('small', __dialogueText("ui/MissionReportComputer.js", "t_4c1a5dfa9fb6efab7243")));
      if (!this.form.printed && !this.form.submitted) {
        this.panel.append(this.node('small', __dialogueText("ui/MissionReportComputer.js", "t_3bf02943e3b8e4c86b4f")));
        const bank = this.node('div', undefined, 'mr-bank');
        for (const option of this.form.options) {
          bank.append(this.button(option.label, () => {
            if (!this.current()) { this.close(); return; } if (!this.active) return;
            this.answers[this.active] = option.id; this.errors.delete(this.active);
            this.active = this.form.fields.find(field => !this.answers[field.id])?.id ?? this.active;
            this.persist(); this.render(); this.panel.querySelector(`[data-slot="${this.active}"]`)?.focus();
          }, Object.values(this.answers).includes(option.id)));
        }
        this.panel.append(bank);
      }
    }
    const status = this.node('p', this.form.submitted ? __dialogueText("ui/MissionReportComputer.js", "t_2db126cb52ca14cd5ea1")
      : this.form.printed ? this.message || __dialogueText("ui/MissionReportComputer.js", "t_4c25e3cb675926624a62") : this.message, 'mr-status');
    status.setAttribute('role', 'status'); this.panel.append(status);
    const actions = this.node('div', undefined, 'mr-actions');
    if (this.form.ok && !this.form.submitted) actions.append(this.button(this.form.printed ? __dialogueText("ui/MissionReportComputer.js", "t_a075e6c0c9999238411d") : __dialogueText("ui/MissionReportComputer.js", "t_f8a8438b2477eec70f4f"), () => this.print()));
    actions.append(this.button(__dialogueText("ui/MissionReportComputer.js", "t_ff5f9aad3fd2c4689b70"), () => this.close())); this.panel.append(actions);
  }
  print() {
    if (!this.current()) { this.close(); return; }
    if (!this.root || this.scene._cleanupDone || !this.scene.sys.isActive()) return;
    const before = getMissionReportForm(this.locations, this.state);
    const result = printMissionReport(this.answers, this.locations, this.state);
    this.errors = new Set(result.errors || []); this.form = getMissionReportForm(this.locations, this.state);
    if (!before.printed && this.form.printed && !this.form.submitted) playMissionReportAudio(this);
    if (result.ok) this.message = __dialogueText("ui/MissionReportComputer.js", "t_d958c1b50eb1aaad9d9d");
    else if (result.reason === 'incorrect') this.message = __dialogueText("ui/MissionReportComputer.js", "t_b7651a5cb6ca7d14bc0a");
    else if (result.reason === 'full') this.message = __dialogueText("ui/MissionReportComputer.js", "t_907aff1b563921ddd7ee");
    else if (result.reason === 'conflict') this.message = __dialogueText("ui/MissionReportComputer.js", "t_a3ea1e7a3519129da937");
    else this.message = result.error || __dialogueText("ui/MissionReportComputer.js", "t_a537e2ab9aa37cae4dc3");
    if (result.saved === false) this.message += __dialogueText("ui/MissionReportComputer.js", "t_519ddc601bc6b19c03b9");
    this.render(); this.panel.querySelector(__dialogueText("ui/MissionReportComputer.js", "t_6c420b5470a69a556a5a"))?.focus();
  }
  close({ save = true } = {}) {
    stopMissionReportAudio(this);
    if (!this.root) return; if (save) this.persist();
    this.root.remove(); this.root = null;
    for (const entry of this.inputs) {
      entry.input.enabled = entry.enabled; if (entry.keyboard) entry.keyboard.enabled = entry.keyboardEnabled;
    }
    this.inputs = []; if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }
}
export function installReportComputerButton(scene) {
  if (scene._reportComputerInstalled) return; scene._reportComputerInstalled = true;
  const computer = new MissionReportComputer(scene);
  const button = scene.add.text(24, 290, __dialogueText("ui/MissionReportComputer.js", "t_77dc4c650af15511a631"), { fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
    backgroundColor: '#17110e', padding: { x: 14, y: 10 } }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
  let opening = false;
  button.on('pointerdown', async pointer => {
    if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
    if (opening || !scene.isOfficeActive() || scene.isArchiveBlocked()) return;
    opening = true;
    try { await computer.open(); }
    catch (error) {
      console.error('[MissionReportComputer] Open failed:', error); computer.close({ save: false });
      scene.showOfficeStatusMessage(__dialogueText("ui/MissionReportComputer.js", "t_ee3b7e0e49591cf79f9a"));
    } finally { opening = false; }
  });
  button.on('pointerover', () => button.setColor('#ffffff')); button.on('pointerout', () => button.setColor('#f2d477'));
  let disposed = false;
  const cleanup = () => {
    if (disposed) return; disposed = true; computer.close({ save: false }); button.removeAllListeners(); button.destroy();
    scene._reportComputerInstalled = false; scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup); scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup); scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
