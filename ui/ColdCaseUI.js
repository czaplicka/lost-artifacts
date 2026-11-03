const STYLE = `
.cc-root{position:absolute;inset:0;z-index:200;pointer-events:auto;background:#17201b;color:#f4e5c3;display:flex;flex-direction:column;font-family:SpecialElite,monospace;overflow:hidden}
.cc-root *{box-sizing:border-box}
.cc-root header{display:flex;align-items:center;justify-content:space-between;padding:12px;gap:12px;border-bottom:2px solid #9b8053}
.cc-root h1{font-family:PressStart2P,monospace;font-size:12px;line-height:1.8;margin:0}
.cc-root nav{display:flex;gap:6px;overflow:auto;flex-shrink:0;padding:10px}
.cc-root button{min-height:44px;flex-shrink:0;border:1px solid #9b8053;background:#29362b;color:#f4e5c3;padding:10px;cursor:pointer;font:inherit}
.cc-root button:hover,.cc-root button:focus-visible{background:#47543a;outline:2px solid #e8c47e}
.cc-root button[aria-current=page]{background:#e8c47e;color:#17201b}
.cc-root main{flex:1;min-height:0;overflow:auto;padding:12px;overscroll-behavior:contain}
.cc-root h2{font-size:22px;margin:0 0 12px}
.cc-root h3{font-size:19px;margin:0 0 10px}
.cc-root p{line-height:1.55;white-space:pre-wrap;margin:9px 0}
.cc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.cc-card{background:#efe2c4;color:#252d24;padding:18px;border:2px solid #b39a6b;margin-bottom:12px}
.cc-root .cc-card button{background:#29362b;color:#f4e5c3}
.cc-placeholder{padding:22px 12px;border:2px dashed #a18d6a;text-align:center;white-space:pre-wrap;font-size:14px;color:#61533d;margin-bottom:12px}
.cc-root img,.cc-root video{display:block;max-width:100%;max-height:50vh;margin:0 auto 12px;object-fit:contain}
.cc-footer{padding:8px 12px;font-size:13px;border-top:1px solid #9b8053;line-height:1.4}
.cc-root .cc-danger{background:#673f32}
.cc-frame{padding:14px;border:2px solid #786951;margin:8px 0;background:#d9ceb3}
.cc-threads{height:70px;background:repeating-linear-gradient(0deg,#536b42 0 5px,#36472c 5px 8px);position:relative;margin:10px 0}
.cc-threads:after{content:'';position:absolute;width:80%;height:5px;background:#cb7339;left:10%;top:45%;transform:rotate(-12deg)}
@media(max-width:600px){.cc-root header{padding:8px}.cc-root h1{font-size:9px}.cc-root main{padding:8px}.cc-card{padding:12px}.cc-root nav{padding:6px}.cc-footer{font-size:11px}}
`;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export class ColdCaseUI {
  constructor(scene, data, onClose) {
    this.scene = scene;
    this.data = data;
    this.onClose = onClose;
    this.destroyed = false;
    this.confirming = false;
    this.tab = 'Case file';
    this.selected = data.suspects[0].id;
    // Session-only prototype state. No localStorage and no changes to main saves.
    const key = `cold-case:${data.id}:v1`;
    this.registryKey = key;
    this.state = scene.registry.get(key) || { accusation: null };
    scene.registry.set(key, this.state);
    this.previousFocus = document.activeElement;
    this.style = element('style', STYLE);
    document.head.append(this.style);
    this.root = element('section', undefined, 'cc-root');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', data.title);
    this.keyHandler = e => this.handleKeyboard(e);
    this.root.addEventListener('keydown', this.keyHandler);
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
    this.header = element('header');
    this.header.append(element('h1', data.title.toUpperCase()), this.button('Close file', () => this.destroy()));
    this.nav = element('nav');
    this.nav.setAttribute('aria-label', 'Case sections');
    this.main = element('main');
    this.footer = element('div', 'Prototype: illustrations are mock-ups, not final evidence photographs. Progress lasts until the game is reloaded.', 'cc-footer');
    this.root.append(this.header, this.nav, this.main, this.footer);
    // Prevent station controls and the underlying Phaser scene from handling input.
    this.hiddenNodes = [...scene.root.children];
    this.hiddenNodes.forEach(node => { node.inert = true; node.style.visibility = 'hidden'; });
    this.wasInputEnabled = scene.input.enabled;
    scene.input.enabled = false;
    scene.root.append(this.root);
    this.render();
    this.nav.querySelector('button')?.focus();
  }

  button(label, action) {
    const button = element('button', label);
    button.type = 'button';
    button.addEventListener('click', e => {
      e.stopPropagation();
      if (!this.destroyed) action();
    });
    return button;
  }

  handleKeyboard(event) {
    event.stopPropagation();
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.escape();
    }
    if (event.key !== 'Tab') return;
    const buttons = [...this.root.querySelectorAll('button, video[controls]')].filter(n => !n.disabled);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }

  escape() {
    if (this.confirming) { this.confirming = false; this.render(); }
    else this.destroy();
  }

  render() {
    this.nav.replaceChildren();
    for (const name of ['Case file','Suspects','Crime scene','Interrogation','Evidence','Intel','Accuse']) {
      const button = this.button(name, () => {
        this.tab = name; this.confirming = false; this.render();
        this.nav.querySelector('[aria-current]')?.focus();
      });
      if (this.tab === name) button.setAttribute('aria-current', 'page');
      this.nav.append(button);
    }
    this.main.replaceChildren(element('h2', this.tab));
    this.main.scrollTop = 0;
    if (this.tab === 'Case file') {
      const card = element('article', undefined, 'cc-card');
      for (const [label, value] of Object.entries(this.data.brief)) {
        card.append(element('h3', label), element('p', value));
      }
      this.main.append(card);
    } else if (this.tab === 'Suspects') this.suspects();
    else if (this.tab === 'Accuse') this.accuse();
    else {
      const keys = {'Crime scene':'crimeScene',Interrogation:'interrogations',Evidence:'evidence',Intel:'intel'};
      for (const item of this.data[keys[this.tab]]) this.item(item);
    }
  }

  media(parent, url, alt, type = 'image') {
    if (!url) return false;
    const media = document.createElement(type === 'video' ? 'video' : 'img');
    if (type === 'video') { media.controls = true; media.preload = 'metadata'; }
    else media.alt = alt;
    media.src = url;
    media.addEventListener('error', () => {
      media.replaceWith(element('div', `Asset unavailable: ${alt}`, 'cc-placeholder'));
    }, { once: true });
    parent.append(media);
    return true;
  }

  suspects() {
    const selector = element('div', undefined, 'cc-grid');
    for (const suspect of this.data.suspects) {
      const button = this.button(suspect.name, () => {
        this.selected = suspect.id; this.render();
        this.main.querySelector(`[data-person="${suspect.id}"]`)?.focus();
      });
      button.dataset.person = suspect.id;
      button.setAttribute('aria-pressed', String(this.selected === suspect.id));
      selector.append(button);
    }
    this.main.append(selector);
    const suspect = this.data.suspects.find(s => s.id === this.selected);
    const card = element('article', undefined, 'cc-card');
    card.append(element('h3', suspect.name));
    if (!this.media(card, suspect.portrait, suspect.name)) {
      card.append(element('div', `PORTRAIT PENDING\n${suspect.name}`, 'cc-placeholder'));
    }
    for (const [label, value] of [['Occupation',suspect.role],['Connection to victim',suspect.relation],['Reason for suspicion',suspect.suspicion]]) {
      card.append(element('h3', label), element('p', value));
    }
    this.main.append(card);
  }

  item(item) {
    const card = element('article', undefined, 'cc-card');
    card.append(element('h3', item.title));
    const hasMedia = this.media(card, item.media, item.title, item.mediaType);
    if (item.caption) card.append(element('p', item.caption));
    if (!hasMedia && item.kind === 'contact') {
      card.append(element('p', 'CAMERA TRANSCRIPTION — PLACEHOLDER FOR FINAL CONTACT SHEET'));
      for (const frame of item.frames) card.append(element('div', `${frame.time}\n${frame.text}`, 'cc-frame'));
    }
    if (!hasMedia && item.kind === 'fabric') {
      card.append(element('p', 'ILLUSTRATIVE SWATCHES — NOT ACTUAL MICROSCOPY'));
      const grid = element('div', undefined, 'cc-grid');
      for (const label of ['Trophy sample','Remaining glove']) {
        const sample = element('div');
        sample.append(element('p', label), element('div', undefined, 'cc-threads'));
        grid.append(sample);
      }
      card.append(grid);
    }
    if (item.text) card.append(element('p', item.text));
    this.main.append(card);
  }

  accuse() {
    if (this.state.accusation) {
      const correct = this.state.accusation === this.data.culprit;
      const chosen = this.data.suspects.find(s => s.id === this.state.accusation);
      const card = element('article', undefined, 'cc-card');
      card.append(element('h3', correct ? 'Case solved.' : 'Incorrect accusation.'));
      card.append(element('p', `You accused: ${chosen?.name || 'Unknown'}`));
      for (const text of Object.values(this.data.resolution)) card.append(element('p', text));
      this.main.append(card);
      return;
    }
    if (this.confirming) {
      const suspect = this.data.suspects.find(s => s.id === this.confirming);
      const card = element('article', undefined, 'cc-card');
      card.append(element('h3', `Accuse ${suspect.name}?`), element('p', 'This is your only accusation for this session. The solution will be revealed.'));
      card.append(this.button('Confirm accusation', () => {
        this.state = { accusation: suspect.id };
        this.scene.registry.set(this.registryKey, this.state);
        this.confirming = false;
        this.render();
      }), this.button('Keep investigating', () => { this.confirming = false; this.render(); }));
      this.main.append(card);
      this.main.querySelector('button')?.focus();
      return;
    }
    this.main.append(element('p', 'Who killed Reginald Prune? Choose a suspect. You do not need to fill in a motive or select evidence.'));
    const grid = element('div', undefined, 'cc-grid');
    for (const suspect of this.data.suspects) {
      grid.append(this.button(`Accuse ${suspect.name}`, () => { this.confirming = suspect.id; this.render(); }));
    }
    this.main.append(grid);
  }

  destroy(notify = true) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    this.root.removeEventListener('keydown', this.keyHandler);
    this.root.remove(); this.style.remove();
    this.hiddenNodes.forEach(node => { if (node.isConnected) { node.inert = false; node.style.visibility = ''; } });
    if (this.scene.input) this.scene.input.enabled = this.wasInputEnabled;
    if (notify) this.onClose?.();
    if (this.previousFocus?.isConnected) this.previousFocus.focus?.();
  }
}
