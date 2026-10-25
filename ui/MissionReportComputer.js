import { gameState } from '../GameData.js';
import {
  getArchiveCaseId, getMissionReportForm, saveMissionReportDraft,
  printMissionReport, ensureMissionReport, isSuccessfulCase, isReportSubmitted
} from '../archiveReportService.js';

const CSS = `
.mr-terminal{position:fixed;inset:0;z-index:2147483000;background:#080c0bf5;color:#c9ffd0;
 display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;
 font:clamp(17px,2vw,24px)/1.65 SpecialElite,monospace;overflow:auto;overscroll-behavior:contain}
.mr-terminal *{box-sizing:border-box}
.mr-terminal .mr-monitor{width:min(960px,100%);max-height:100%;overflow:auto;border:8px solid #514b3c;
 border-radius:14px;background:#102019;padding:clamp(16px,3vw,36px);box-shadow:0 0 45px #0f462a}
.mr-terminal h2{font:clamp(13px,2vw,21px)/1.6 PressStart2P,monospace;color:#e8d697;margin:0 0 20px}
.mr-terminal p{margin:14px 0}
.mr-terminal button{font:inherit;line-height:1.3;cursor:pointer;border:1px solid #80a58b;
 background:#152e20;color:#dcffe3;padding:10px 13px;border-radius:3px;min-height:44px;touch-action:manipulation}
.mr-terminal button:focus-visible{outline:3px solid #fff0a1;outline-offset:3px}
.mr-terminal button[disabled]{opacity:.35;cursor:default}
.mr-terminal .mr-slot{display:inline-block;color:#ffe69b;border-style:dashed;max-width:100%;vertical-align:baseline}
.mr-terminal .mr-slot[aria-pressed=true]{background:#405034;border:2px solid #ffe69b}
.mr-terminal .mr-slot.mr-error{border:2px solid #ff8b89;color:#ffb4b1}
.mr-terminal .mr-bank,.mr-terminal .mr-actions{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
.mr-terminal .mr-status{min-height:2em;color:#ffe69b}
.mr-terminal small{display:block;font-size:.8em;color:#9ab6a0}
`;

export class MissionReportComputer {
  constructor(scene) {
    this.scene = scene;
    this.state = scene.gameState ?? gameState;
    this.root = null;
    this.inputs = [];
    this.errors = new Set();
    this.active = null;
  }
  async open() {
    if (this.root) return;
    if (!isSuccessfulCase(this.state)) {
      this.scene.showOfficeStatusMessage('The report terminal opens after a successful mission. Go solve something.');
      return;
    }
    if (document.fullscreenElement?.tagName === 'CANVAS') {
      try { await document.exitFullscreen(); }
      catch { this.scene.showOfficeStatusMessage('Leave fullscreen mode to open the report terminal.'); return; }
    }
    if (this.scene._cleanupDone || !this.scene.sys.isActive()) return;
    this.locations = this.scene.cache.json.get('locations') || [];
    this.form = getMissionReportForm(this.locations, this.state);
    this.caseId = getArchiveCaseId(this.state);
    this.answers = { ...(this.form.answers || {}) };
    this.active = this.form.fields?.find(field => !this.answers[field.id])?.id ?? this.form.fields?.[0]?.id;
    this.message = !this.form.ok ? this.form.error : this.form.printed
      ? 'Printed. Deliver your Mission Report to Frank Drebin, or collect it if your inventory was full.'
      : 'Select a blank, then click a word below.';
    this.previousFocus = document.activeElement;
    this.root = document.createElement('div');
    this.root.className = 'mr-terminal';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Mission report computer');
    const style = document.createElement('style'); style.textContent = CSS;
    this.root.append(style);
    this.panel = document.createElement('section'); this.panel.className = 'mr-monitor';
    this.root.append(this.panel);
    this.root.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); this.close(); }
      if (event.key === 'Tab') {
        const focusable = [...this.panel.querySelectorAll('button:not([disabled])')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    for (const event of ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart']) {
      this.root.addEventListener(event, event => event.stopPropagation());
    }
    const host = document.fullscreenElement || document.body;
    host.append(this.root);
    for (const scene of this.scene.scene.manager.scenes) {
      if (!scene.sys?.isActive?.() || !scene.input) continue;
      this.inputs.push({ input: scene.input, enabled: scene.input.enabled,
        keyboard: scene.input.keyboard, keyboardEnabled: scene.input.keyboard?.enabled });
      scene.input.enabled = false;
      if (scene.input.keyboard) scene.input.keyboard.enabled = false;
    }
    this.render();
    this.panel.querySelector('button:not([disabled])')?.focus();
  }
  current() { return this.caseId === getArchiveCaseId(this.state) && isSuccessfulCase(this.state); }
  node(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  button(text, action, disabled = false) {
    const button = this.node('button', text);
    button.type = 'button'; button.disabled = disabled;
    button.addEventListener('click', event => { event.stopPropagation(); action(); });
    return button;
  }
  persist() {
    if (!this.current() || this.form.printed || this.form.submitted) return;
    const saved = saveMissionReportDraft(this.answers, this.locations, this.state);
    if (saved.ok && !saved.saved) this.message = 'Draft kept for this session. Automatic saving is unavailable.';
  }
  slot(field) {
    const option = this.form.options.find(option => option.id === this.answers[field.id]);
    const button = this.button(option?.label ?? `[ ${field.hint} ]`, () => {
      if (this.active === field.id && this.answers[field.id]) {
        delete this.answers[field.id]; this.errors.delete(field.id); this.persist();
      }
      this.active = field.id; this.render();
      this.panel.querySelector(`[data-slot="${field.id}"]`)?.focus();
    }, this.form.printed || this.form.submitted);
    button.className = 'mr-slot' + (this.errors.has(field.id) ? ' mr-error' : '');
    button.dataset.slot = field.id;
    button.setAttribute('aria-pressed', String(this.active === field.id));
    button.setAttribute('aria-label', `${field.hint}: ${option?.label ?? 'blank'}`);
    return button;
  }
  render() {
    if (!this.root) return;
    this.panel.replaceChildren();
    this.panel.append(this.node('h2', 'MARK AGENCY // MISSION REPORT'));
    if (this.form.ok) {
      const artifact = this.form.fields[0];
      const suspect = this.form.fields[this.form.fields.length - 1];
      const route = this.form.fields.slice(1, -1);
      const first = this.node('p', 'The investigation concerned the theft of ');
      first.append(this.slot(artifact), document.createTextNode('.')); this.panel.append(first);
      const path = this.node('p', route.length ? 'The escape route led through ' : 'The case did not require an international pursuit.');
      route.forEach((field, index) => {
        if (index) path.append(document.createTextNode(index === route.length - 1 ? ' and ' : ', '));
        path.append(this.slot(field));
      });
      if (route.length) path.append(document.createTextNode(', in that order.'));
      this.panel.append(path);
      const last = this.node('p', 'The investigation resulted in the arrest of ');
      last.append(this.slot(suspect), document.createTextNode('.')); this.panel.append(last);
      this.panel.append(this.node('small', 'No agency stationery was harmed during this investigation.'));
      if (!this.form.printed && !this.form.submitted) {
        this.panel.append(this.node('small', 'Click the selected filled blank again to clear it.'));
        const bank = this.node('div', undefined, 'mr-bank');
        for (const option of this.form.options) {
          bank.append(this.button(option.label, () => {
            if (!this.current()) { this.close(); return; }
            if (!this.active) return;
            this.answers[this.active] = option.id;
            this.errors.delete(this.active);
            this.active = this.form.fields.find(field => !this.answers[field.id])?.id ?? this.active;
            this.persist(); this.render();
            this.panel.querySelector(`[data-slot="${this.active}"]`)?.focus();
          }, Object.values(this.answers).includes(option.id)));
        }
        this.panel.append(bank);
      }
    }
    const status = this.node('p', this.form.submitted ? 'This report has already been filed with Frank Drebin.'
      : this.form.printed ? this.message || 'Printed. Deliver the report to Frank Drebin.' : this.message, 'mr-status');
    status.setAttribute('role', 'status'); this.panel.append(status);
    const actions = this.node('div', undefined, 'mr-actions');
    if (this.form.ok && !this.form.submitted) {
      actions.append(this.button(this.form.printed ? 'COLLECT REPORT' : 'PRINT REPORT', () => this.print()));
    }
    actions.append(this.button('BACK TO OFFICE', () => this.close()));
    this.panel.append(actions);
  }
  print() {
    if (!this.current()) { this.close(); return; }
    const result = printMissionReport(this.answers, this.locations, this.state);
    this.errors = new Set(result.errors || []);
    this.form = getMissionReportForm(this.locations, this.state);
    if (result.ok) this.message = 'Printed! Your Mission Report is in your inventory. Deliver it to Frank Drebin.';
    else if (result.reason === 'incorrect') this.message = 'Please correct the marked blanks. No penalties. The printer has seen worse.';
    else if (result.reason === 'full') this.message = 'Report ready. Free an inventory slot, then collect it here or visit Frank.';
    else if (result.reason === 'conflict') this.message = 'A report for another case is still in your inventory. Nothing was replaced.';
    else this.message = result.error || 'The report could not be printed. Please try again.';
    if (result.saved === false) this.message += ' Automatic saving is unavailable; save manually.';
    this.render(); this.panel.querySelector('.mr-actions button')?.focus();
  }
  close({ save = true } = {}) {
    if (!this.root) return;
    if (save) this.persist();
    this.root.remove(); this.root = null;
    for (const entry of this.inputs) {
      entry.input.enabled = entry.enabled;
      if (entry.keyboard) entry.keyboard.enabled = entry.keyboardEnabled;
    }
    this.inputs = [];
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }
}

export function installReportComputerButton(scene) {
  if (scene._reportComputerInstalled) return;
  scene._reportComputerInstalled = true;
  const computer = new MissionReportComputer(scene);
  const button = scene.add.text(24, 290, 'COMPUTER >', {
    fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
    backgroundColor: '#17110e', padding: { x: 14, y: 10 }
  }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
  let opening = false;
  button.on('pointerdown', async pointer => {
    if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
    if (opening || !scene.isOfficeActive() || scene.isArchiveBlocked()) return;
    opening = true;
    try { await computer.open(); }
    catch (error) {
      console.error('[MissionReportComputer] Open failed:', error);
      computer.close({ save: false });
      scene.showOfficeStatusMessage('The report terminal could not be opened. Please try again.');
    } finally { opening = false; }
  });
  button.on('pointerover', () => button.setColor('#ffffff'));
  button.on('pointerout', () => button.setColor('#f2d477'));
  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    computer.close({ save: false });
    button.removeAllListeners(); button.destroy();
    scene._reportComputerInstalled = false;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
