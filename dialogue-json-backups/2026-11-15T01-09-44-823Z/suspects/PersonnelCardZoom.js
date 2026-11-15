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
  style.textContent = `
    .personnel-zoom-shell{position:relative;min-width:0;display:grid;align-self:stretch}
    .personnel-zoom-shell>.personnel-card{width:100%;height:100%;margin:0}
    .personnel-roster .personnel-zoom-open{position:absolute;right:5px;top:5px;z-index:60;display:grid;place-items:center;width:36px;height:36px;min-height:36px;padding:6px;border:2px solid #725439;border-radius:4px;background:#fff4d9;color:#493322;box-shadow:1px 2px 4px #0005;cursor:zoom-in}
    .personnel-zoom-open svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2}
    dialog.personnel-zoom-dialog:not([open]){display:none!important}
    dialog.personnel-zoom-dialog[open]{position:fixed;inset:0;box-sizing:border-box;margin:auto;width:min(680px,calc(100vw - 24px));height:min(850px,calc(100dvh - 24px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);padding:16px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:12px;overflow:hidden;border:4px solid #62432d;border-radius:5px;background:#e9d9b4;color:#302016;font-family:SpecialElite,monospace;box-shadow:0 12px 70px #0009;pointer-events:auto}
    .personnel-zoom-dialog::backdrop{background:#100c0be8}
    .personnel-zoom-dialog .personnel-zoom-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;min-width:0}
    .personnel-zoom-dialog h2{margin:0 0 7px;font-size:27px;overflow-wrap:anywhere}
    .personnel-zoom-dialog .personnel-zoom-facts{margin:0;color:#614a33;font-size:21px;line-height:1.35;overflow-wrap:anywhere}
    .personnel-zoom-dialog button{font:inherit;cursor:pointer;min-height:42px;padding:9px 14px;background:#f8edcf;color:#3b291d;border:2px solid #866747;border-radius:3px;pointer-events:auto}
    .personnel-zoom-dialog button:focus-visible{outline:3px solid #9b352b;outline-offset:3px}
    .personnel-zoom-dialog button[aria-pressed=true]{background:#64372e;color:#fff1d4}
    .personnel-zoom-dialog .personnel-zoom-stage{position:relative;min-height:0;overflow:hidden;background:radial-gradient(ellipse,#9ba59a,#4a584c);border:2px solid #836848}
    .personnel-zoom-dialog .personnel-zoom-stage>.agency-id-avatar{position:absolute!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;width:280px!important;min-width:280px!important;max-width:none!important;height:310px!important;min-height:310px!important;max-height:310px!important;transform-origin:0 0!important;margin:0!important;transition:none!important;filter:none!important;opacity:1!important;--noir-gold:#b28e46;--noir-crimson:#7a1f22;--radius-sm:0px}
    .personnel-zoom-dialog .personnel-zoom-controls{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;flex-shrink:0}
    @media(max-width:600px){dialog.personnel-zoom-dialog[open]{padding:10px;gap:9px}.personnel-zoom-dialog h2{font-size:22px}.personnel-zoom-dialog .personnel-zoom-facts{font-size:18px}.personnel-zoom-dialog button{padding:8px 10px;font-size:16px}}
  `;
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
    for (const card of this.root.querySelectorAll('[data-grid] [data-person]')) {
      if (card.parentElement?.hasAttribute('data-personnel-zoom-shell')) continue;
      const shell = document.createElement('div');
      shell.className = 'personnel-zoom-shell';
      shell.setAttribute('data-personnel-zoom-shell', '');
      const person = this.view.roster.people.find(p => String(p.id) === card.dataset.person);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'personnel-zoom-open';
      button.dataset.personnelZoom = card.dataset.person;
      button.title = 'Inspect portrait';
      button.setAttribute('aria-label', `Inspect portrait: ${person?.name || ''}`);
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M10 6v8M6 10h8"/></svg>';
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
    const source = button.parentElement.querySelector('[data-person] .agency-id-avatar');
    if (person && source) this.open(person, source, button);
  }

  open(person, source, trigger) {
    if (this.destroyed) return;
    this.close(false);
    this.trigger = trigger;
    this.face = false;
    const dialog = document.createElement('dialog');
    dialog.className = 'personnel-roster personnel-zoom-dialog';
    dialog.setAttribute('aria-label', 'Personnel portrait inspection');
    dialog.innerHTML = `
      <header class="personnel-zoom-heading"><div><h2 data-zoom-name></h2><p class="personnel-zoom-facts" data-zoom-facts></p></div><button type="button" data-zoom-close aria-label="Close portrait">Close</button></header>
      <div class="personnel-zoom-stage" data-zoom-stage></div>
      <div class="personnel-zoom-controls"><button type="button" data-zoom-mode="portrait" aria-pressed="true">Full portrait</button><button type="button" data-zoom-mode="face" aria-pressed="false">Face close-up</button></div>`;
    dialog.querySelector('[data-zoom-name]').textContent = person.name || '';
    const facts = [person.occupation];
    if (Number.isInteger(person.floor)) facts.push(person.floor === 0 ? 'Ground floor' : `Floor ${person.floor}`);
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
    this.avatar.style.setProperty('transform', `scale(${plan.scale}) translate(${-plan.centerX}px, ${-plan.centerY}px)`, 'important');
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
