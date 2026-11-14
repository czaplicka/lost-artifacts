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
.cc-root .cc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.cc-root .cc-card{background:#efe2c4;color:#252d24;padding:18px;border:2px solid #b39a6b;margin-bottom:12px}
.cc-root .cc-placeholder{padding:22px 12px;border:2px dashed #a18d6a;text-align:center;white-space:pre-wrap;font-size:14px;color:#61533d;margin-bottom:12px}
.cc-root img,.cc-root video{display:block;max-width:100%;max-height:50vh;margin:0 auto;object-fit:contain}
.cc-root .cc-portrait img{max-height:300px}
.cc-root .cc-footer{padding:8px 12px;font-size:13px;border-top:1px solid #9b8053;line-height:1.4}
.cc-root figure{margin:12px 0}
.cc-root figcaption{margin-top:8px;font-size:14px;line-height:1.4}
.cc-root .cc-photo-button{display:block;padding:0;border:1px solid #8d805f;background:#101710;width:100%;overflow:hidden;cursor:zoom-in}
.cc-root .cc-photo-button:hover{background:#101710}
.cc-root .cc-screen{display:block;position:relative;overflow:hidden;isolation:isolate}
.cc-root .cc-screen img{width:100%}
.cc-root .cc-screen.cc-cctv img{filter:saturate(.48) contrast(1.06) brightness(.94) blur(.28px)}
.cc-root .cc-screen.cc-cctv:after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,rgba(0,0,0,.19) 2px,rgba(0,0,0,.19) 3px),radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.24) 100%);z-index:2}
.cc-root .cc-screen.cc-cctv:before{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;opacity:.12;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h160v120H0z'/%3E%3C/svg%3E")}
.cc-root .cc-lightbox{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;background:#101710fa;padding:12px;gap:10px;overflow:auto}
.cc-root .cc-lightbox-tools{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;flex-shrink:0}
.cc-root .cc-lightbox figure{margin:0;min-height:0;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
.cc-root .cc-lightbox .cc-screen{max-width:100%;flex-shrink:1;min-height:0}
.cc-root .cc-lightbox img{max-height:70vh;width:auto;max-width:100%;object-fit:contain}
.cc-root .cc-lightbox figcaption{color:#f4e5c3;flex-shrink:0}
@media(max-width:600px){.cc-root header{padding:8px}.cc-root h1{font-size:9px}.cc-root main{padding:8px}.cc-root .cc-card{padding:12px}.cc-root nav{padding:6px}.cc-root .cc-footer{font-size:11px}.cc-root .cc-lightbox img{max-height:62vh}}
@media(prefers-contrast:more){.cc-root .cc-screen.cc-cctv img{filter:saturate(.6)}.cc-root .cc-screen.cc-cctv:before{opacity:.04}.cc-root .cc-screen.cc-cctv:after{opacity:.45}}
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
    this.lightbox = null;
    this.tab = 'Case file';
    this.selected = data.suspects[0].id;
    this.registryKey = `cold-case:${data.id}:v1`;
    this.state = scene.registry.get(this.registryKey) || { accusation: null };
    scene.registry.set(this.registryKey, this.state);
    this.previousFocus = document.activeElement;
    this.style = element('style', STYLE);
    document.head.append(this.style);
    this.root = element('section', undefined, 'cc-root');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', data.title);
    this.keyHandler = event => this.handleKeyboard(event);
    this.root.addEventListener('keydown', this.keyHandler);
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    this.header = element('header');
    this.header.append(element('h1', data.title.toUpperCase()), this.button('Close file', () => this.destroy()));
    this.nav = element('nav');
    this.nav.setAttribute('aria-label', 'Case sections');
    this.main = element('main');
    this.footer = element('div', 'Select a photograph to enlarge it. Progress lasts until the game is reloaded.', 'cc-footer');
    this.root.append(this.header, this.nav, this.main, this.footer);
    this.hiddenNodes = [...scene.root.children].map(node => ({node, inert:node.inert, visibility:node.style.visibility}));
    this.hiddenNodes.forEach(({node}) => { node.inert = true; node.style.visibility = 'hidden'; });
    this.wasInputEnabled = scene.input.enabled;
    scene.input.enabled = false;
    scene.root.append(this.root);
    this.render();
    this.nav.querySelector('button')?.focus();
  }

  button(label, action) {
    const button = element('button', label);
    button.type = 'button';
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (!this.destroyed) action();
    });
    return button;
  }

  handleKeyboard(event) {
    event.stopPropagation();
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.escape();
      return;
    }
    if (event.key !== 'Tab') return;
    const scope = this.lightbox || this.root;
    const focusable = [...scope.querySelectorAll('button, video[controls]')].filter(node => !node.disabled && !node.closest('[inert]'));
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (!focusable.includes(document.activeElement)) {
      event.preventDefault(); first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  escape() {
    if (this.lightbox) this.closeLightbox();
    else if (this.confirming) {
      this.confirming = false; this.render();
      this.main.querySelector('button')?.focus();
    } else this.destroy();
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
      if (this.data.victimPortrait) this.media(card, this.data.victimPortrait, 'Reginald Prune', 'image', {portrait:true});
      for (const [label, value] of Object.entries(this.data.brief)) card.append(element('h3', label), element('p', value));
      this.main.append(card);
    } else if (this.tab === 'Suspects') this.suspects();
    else if (this.tab === 'Accuse') this.accuse();
    else {
      const keys = {'Crime scene':'crimeScene',Interrogation:'interrogations',Evidence:'evidence',Intel:'intel'};
      for (const item of this.data[keys[this.tab]] || []) this.item(item);
    }
  }

  media(parent, url, alt, type = 'image', options = {}) {
    if (!url) return false;
    const figure = element('figure', undefined, options.portrait ? 'cc-portrait' : '');
    if (type === 'video') {
      const video = document.createElement('video');
      video.controls = true; video.preload = 'metadata'; video.src = url;
      video.addEventListener('error', () => video.replaceWith(element('div', `Asset unavailable: ${alt}`, 'cc-placeholder')), {once:true});
      figure.append(video);
    } else {
      const button = this.button('', () => this.openLightbox(url, alt, options.effect, button));
      button.className = 'cc-photo-button';
      button.setAttribute('aria-label', `Enlarge: ${alt}`);
      const screen = element('span', undefined, 'cc-screen' + (options.effect === 'cctv' ? ' cc-cctv' : ''));
      const image = document.createElement('img');
      image.alt = alt; image.src = url; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => {
        button.disabled = true;
        screen.className = 'cc-screen';
        screen.replaceChildren(element('div', `Asset unavailable: ${alt}`, 'cc-placeholder'));
      }, {once:true});
      screen.append(image); button.append(screen); figure.append(button);
    }
    if (options.caption) figure.append(element('figcaption', options.caption));
    parent.append(figure);
    return true;
  }

  openLightbox(url, alt, effect, trigger) {
    if (this.lightbox) return;
    this.lightboxTrigger = trigger;
    this.lightbox = element('section', undefined, 'cc-lightbox');
    this.lightbox.setAttribute('role','dialog');
    this.lightbox.setAttribute('aria-modal','true');
    this.lightbox.setAttribute('aria-label', alt);
    this.lightboxHidden = [this.header,this.nav,this.main,this.footer].map(node => ({node,inert:node.inert}));
    this.lightboxHidden.forEach(({node}) => {node.inert = true;});
    const tools = element('div', undefined, 'cc-lightbox-tools');
    const close = this.button('Back to file [Esc]', () => this.closeLightbox());
    tools.append(close);
    const figure = element('figure');
    const screen = element('div', undefined, 'cc-screen' + (effect === 'cctv' ? ' cc-cctv' : ''));
    const image = document.createElement('img');
    image.alt = alt; image.src = url;
    image.addEventListener('error', () => {
      screen.className = 'cc-screen';
      screen.replaceChildren(element('p', 'This photograph could not be loaded.'));
    }, {once:true});
    screen.append(image);
    if (effect === 'cctv') {
      const toggle = this.button('CCTV overlay: ON', () => {
        const enabled = screen.classList.toggle('cc-cctv');
        toggle.textContent = `CCTV overlay: ${enabled ? 'ON' : 'OFF'}`;
        toggle.setAttribute('aria-pressed', String(enabled));
      });
      toggle.setAttribute('aria-pressed','true'); tools.append(toggle);
    }
    figure.append(screen,element('figcaption', alt));
    this.lightbox.append(tools,figure); this.root.append(this.lightbox); close.focus();
  }

  closeLightbox(restoreFocus = true) {
    if (!this.lightbox) return;
    this.lightbox.remove(); this.lightbox = null;
    this.lightboxHidden?.forEach(({node,inert}) => {node.inert = inert;});
    if (restoreFocus && this.lightboxTrigger?.isConnected) this.lightboxTrigger.focus();
    this.lightboxTrigger = null;
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
    const suspect = this.data.suspects.find(person => person.id === this.selected) || this.data.suspects[0];
    const card = element('article', undefined, 'cc-card');
    card.append(element('h3', suspect.name));
    if (!this.media(card, suspect.portrait, suspect.name, 'image', {portrait:true})) card.append(element('div', 'Portrait unavailable', 'cc-placeholder'));
    for (const [label,value] of [['Occupation',suspect.role],['Connection to victim',suspect.relation],['Reason for suspicion',suspect.suspicion]]) card.append(element('h3', label),element('p',value));
    this.main.append(card);
  }

  item(item) {
    const card = element('article', undefined, 'cc-card');
    card.append(element('h3', item.title));
    if (item.caption) card.append(element('p', item.caption));
    this.media(card, item.media, item.title, item.mediaType, {effect:item.effect});
    if (item.gallery?.length) {
      const grid = element('div', undefined, 'cc-grid');
      for (const frame of item.gallery) {
        const holder = element('div');
        this.media(holder, frame.media, frame.caption || item.title, frame.mediaType, {caption:frame.caption,effect:frame.effect});
        grid.append(holder);
      }
      card.append(grid);
    }
    if (item.text) card.append(element('p', item.text));
    this.main.append(card);
  }

  accuse() {
    if (this.state.accusation) {
      const correct = this.state.accusation === this.data.culprit;
      const chosen = this.data.suspects.find(person => person.id === this.state.accusation);
      const card = element('article', undefined, 'cc-card');
      card.append(element('h3',correct ? 'Case solved.' : 'Incorrect accusation.'),element('p',`You accused: ${chosen?.name || 'Unknown'}`));
      for (const [key,text] of Object.entries(this.data.resolution || {})) {
        if (typeof text !== 'string') continue;
        card.append(element('p',text));
        if (key === 'corroboration') this.resolutionMedia(card);
      }
      if (!this.data.resolution?.corroboration) this.resolutionMedia(card);
      this.main.append(card);
      return;
    }
    if (this.confirming) {
      const suspect = this.data.suspects.find(person => person.id === this.confirming);
      const card = element('article', undefined, 'cc-card');
      card.append(element('h3',`Accuse ${suspect.name}?`),element('p','This is your only accusation for this session. The solution will be revealed.'));
      card.append(this.button('Confirm accusation', () => {
        if (this.state.accusation) return;
        this.state = {accusation:suspect.id};
        this.scene.registry.set(this.registryKey,this.state);
        this.confirming = false; this.render();
        this.nav.querySelector('[aria-current]')?.focus();
      }),this.button('Keep investigating', () => {
        this.confirming = false; this.render(); this.main.querySelector('button')?.focus();
      }));
      this.main.append(card); this.main.querySelector('button')?.focus();
      return;
    }
    this.main.append(element('p','Who killed Reginald Prune? Choose a suspect.'));
    const grid = element('div', undefined, 'cc-grid');
    for (const suspect of this.data.suspects) grid.append(this.button(`Accuse ${suspect.name}`, () => {this.confirming = suspect.id; this.render();}));
    this.main.append(grid);
  }

  resolutionMedia(parent) {
    for (const media of this.data.resolutionMedia || []) this.media(parent, media.media, media.caption || 'Case explanation', media.mediaType, {caption:media.caption,effect:media.effect});
  }

  destroy(notify = true) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.closeLightbox(false);
    this.root.querySelectorAll('video').forEach(video => {video.pause();video.removeAttribute('src');video.load();});
    this.root.removeEventListener('keydown',this.keyHandler);
    this.root.remove(); this.style.remove();
    this.hiddenNodes.forEach(({node,inert,visibility}) => {
      if (node.isConnected) {node.inert = inert; node.style.visibility = visibility;}
    });
    if (this.scene.input) this.scene.input.enabled = this.wasInputEnabled;
    if (notify) this.onClose?.();
    if (this.previousFocus?.isConnected && !this.previousFocus.closest('[inert]')) this.previousFocus.focus?.();
  }
}
