import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const STYLE_ID = 'personnel-card-zoom-styles';

export function portraitZoomLayout(width, height, face = false) {
  return {
    scale: Math.min(width / (face ? 150 : 280), height / (face ? 170 : 310)),
    centerX: 140,
    centerY: face ? 151 : 155
  };
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${__dialogueText("suspects/PersonnelCardZoom.js", "t_d1e12721e34a10117d00")}`;
  document.head.append(style);
}

export class PersonnelCardZoom {
  constructor(view) {
    this.view = view;
    this.root = view.root;
    this.destroyed = false;
    this.dialog = null;
    this.observer = null;
    this.resizeObserver = null;
    this.face = false;
    this.handleRootClick = this.handleRootClick.bind(this);
    this.handleDialogClick = this.handleDialogClick.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleKeys = this.handleKeys.bind(this);
    this.layout = this.layout.bind(this);
    this.destroy = this.destroy.bind(this);

    if (!this.root) return;
    installStyles();
    this.root.addEventListener('click', this.handleRootClick, true);
    this.decorate();
    const grid = this.root.querySelector('[data-grid]');
    if (grid) {
      this.observer = new MutationObserver(() => this.decorate());
      this.observer.observe(grid, { childList: true, subtree: true });
    }
    view.scene.scale.on('resize', this.layout);
    window.addEventListener('resize', this.layout);
    view.scene.events.once('shutdown', this.destroy);
    view.scene.events.once('destroy', this.destroy);
  }

  decorate() {
    if (this.destroyed || !this.root) return;
    for (const card of this.root.querySelectorAll(__dialogueText("suspects/PersonnelCardZoom.js", "t_b4b62f0307e77c4a0150"))) {
      if (card.parentElement?.hasAttribute('data-personnel-zoom-shell')) continue;
      const shell = document.createElement('div');
      shell.className = 'personnel-zoom-shell';
      shell.setAttribute('data-personnel-zoom-shell', '');
      const person = this.view.roster.people.find(p => String(p.id) === card.dataset.person);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'personnel-zoom-open';
      button.dataset.personnelZoom = card.dataset.person;
      button.title = __dialogueText("suspects/PersonnelCardZoom.js", "t_b2fdb565624af9effe0e");
      button.setAttribute('aria-label', `${__dialogueText("suspects/PersonnelCardZoom.js", "t_33d6b113411331818ed1")}${person?.name || ''}`);
      button.innerHTML = __dialogueText("suspects/PersonnelCardZoom.js", "t_3b9830a00ee2cc97ddbc");
      card.parentNode.insertBefore(shell, card);
      shell.append(card, button);
    }
  }

  handleRootClick(event) {
    const button = event.target?.closest?.('[data-personnel-zoom]');
    if (!button || !this.root.contains(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.view.help?.modal) return;
    const person = this.view.roster.people.find(p => String(p.id) === button.dataset.personnelZoom);
    const source = button.parentElement.querySelector(__dialogueText("suspects/PersonnelCardZoom.js", "t_a5e53f66ec7869ec7086"));
    if (person && source) this.open(person, source, button);
  }

  open(person, source, trigger) {
    if (this.destroyed) return;
    this.close(false);
    this.trigger = trigger;
    this.face = false;
    const dialog = document.createElement('dialog');
    dialog.className = __dialogueText("suspects/PersonnelCardZoom.js", "t_0fd3635f428c553cd734");
    dialog.setAttribute('aria-label', __dialogueText("suspects/PersonnelCardZoom.js", "t_ff1a53683dabda2ad531"));
    dialog.innerHTML = `${__dialogueText("suspects/PersonnelCardZoom.js", "t_7d0f9df4e99598b0d675")}`;
    dialog.querySelector('[data-zoom-name]').textContent = person.name || '';
    const facts = [person.occupation];
    if (Number.isInteger(person.floor)) facts.push(person.floor === 0 ? __dialogueText("suspects/PersonnelCardZoom.js", "t_18c409c5e785af2146fc") : `${__dialogueText("suspects/PersonnelCardZoom.js", "t_909b27736dd17677b186")}${person.floor}`);
    dialog.querySelector('[data-zoom-facts]').textContent = facts.filter(Boolean).join(' · ');
    const avatar = source.cloneNode(true);
    avatar.removeAttribute('data-avatar-preview');
    avatar.removeAttribute('id');
    avatar.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    avatar.classList.remove('is-updating');
    for (const variable of ['--skin', '--hair', '--coat']) {
      const value = getComputedStyle(source).getPropertyValue(variable).trim();
      if (value) avatar.style.setProperty(variable, value);
    }
    this.dialog = dialog;
    this.avatar = avatar;
    this.stage = dialog.querySelector('[data-zoom-stage]');
    this.stage.append(avatar);
    dialog.addEventListener('click', this.handleDialogClick);
    dialog.addEventListener('cancel', this.handleCancel);
    dialog.addEventListener('keydown', this.handleKeys);
    document.body.append(dialog);
    dialog.showModal();
    this.resizeObserver = new ResizeObserver(this.layout);
    this.resizeObserver.observe(this.stage);
    this.layout();
    dialog.querySelector('[data-zoom-close]').focus();
  }

  layout() {
    if (!this.dialog?.open || !this.stage || !this.avatar) return;
    const box = this.stage.getBoundingClientRect();
    const plan = portraitZoomLayout(box.width, box.height, this.face);
    this.avatar.style.setProperty('transform', `${__dialogueText("suspects/PersonnelCardZoom.js", "t_0e05027a4d9d5ffbde06")}${plan.scale}${__dialogueText("suspects/PersonnelCardZoom.js", "t_94a5abdb3d795bff7af7")}${-plan.centerX}${__dialogueText("suspects/PersonnelCardZoom.js", "t_2aff6f79e7ea2b301f38")}${-plan.centerY}${__dialogueText("suspects/PersonnelCardZoom.js", "t_fdae953218153748180d")}`, 'important');
  }

  handleDialogClick(event) {
    const button = event.target?.closest?.('button');
    if (button?.hasAttribute('data-zoom-close')) {
      this.close();
      return;
    }
    if (button?.hasAttribute('data-zoom-mode')) {
      this.face = button.dataset.zoomMode === 'face';
      for (const item of this.dialog.querySelectorAll('[data-zoom-mode]')) {
        item.setAttribute('aria-pressed', String((item.dataset.zoomMode === 'face') === this.face));
      }
      this.layout();
      return;
    }
    if (event.target === this.dialog) {
      const box = this.dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) this.close();
    }
  }

  handleKeys(event) {
    event.stopPropagation();
  }

  handleCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  close(restoreFocus = true) {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.dialog) {
      this.dialog.removeEventListener('click', this.handleDialogClick);
      this.dialog.removeEventListener('cancel', this.handleCancel);
      this.dialog.removeEventListener('keydown', this.handleKeys);
      if (this.dialog.open) this.dialog.close();
      this.dialog.remove();
    }
    this.dialog = null;
    this.stage = null;
    this.avatar = null;
    if (restoreFocus && this.trigger?.isConnected) this.trigger.focus({ preventScroll: true });
    this.trigger = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.close(false);
    this.root?.removeEventListener('click', this.handleRootClick, true);
    this.view.scene.scale.off('resize', this.layout);
    window.removeEventListener('resize', this.layout);
    this.view.scene.events.off('shutdown', this.destroy);
    this.view.scene.events.off('destroy', this.destroy);
    this.root = null;
  }
}
