import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const STYLE = `${__dialogueText("ui/ColdCaseUI.js", "t_3a04c38fd9a59397046c")}`;

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
    this.tab = __dialogueText("ui/ColdCaseUI.js", "t_d12f22e06aa520f25d81");
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
    this.header.append(element('h1', data.title.toUpperCase()), this.button(__dialogueText("ui/ColdCaseUI.js", "t_bd9c76ecd0b39bbbbda8"), () => this.destroy()));
    this.nav = element('nav');
    this.nav.setAttribute('aria-label', __dialogueText("ui/ColdCaseUI.js", "t_2c4390730ef472a30171"));
    this.main = element('main');
    this.footer = element('div', __dialogueText("ui/ColdCaseUI.js", "t_45171677bbdba932ab95"), 'cc-footer');
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
    if (event.code === __dialogueText("ui/ColdCaseUI.js", "t_037c968467aa3fd7c059")) {
      event.preventDefault();
      if (!event.repeat) this.escape();
      return;
    }
    if (event.key !== __dialogueText("ui/ColdCaseUI.js", "t_90ddf1963abb36c9921c")) return;
    const scope = this.lightbox || this.root;
    const focusable = [...scope.querySelectorAll(__dialogueText("ui/ColdCaseUI.js", "t_1f00994492e22bd840c7"))].filter(node => !node.disabled && !node.closest('[inert]'));
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
    for (const name of [__dialogueText("ui/ColdCaseUI.js", "t_d12f22e06aa520f25d81"),__dialogueText("ui/ColdCaseUI.js", "t_40c9f9f69f538765e313"),__dialogueText("ui/ColdCaseUI.js", "t_7624a8b8c9d8d5d1ee22"),__dialogueText("ui/ColdCaseUI.js", "t_88ea218fd31414cc80fe"),__dialogueText("ui/ColdCaseUI.js", "t_03867aea70acaf4c5dce"),__dialogueText("ui/ColdCaseUI.js", "t_9dbe1a97a6b445eaf33d"),__dialogueText("ui/ColdCaseUI.js", "t_f96a22e0f4a8bcd5d81e")]) {
      const button = this.button(name, () => {
        this.tab = name; this.confirming = false; this.render();
        this.nav.querySelector('[aria-current]')?.focus();
      });
      if (this.tab === name) button.setAttribute('aria-current', 'page');
      this.nav.append(button);
    }
    this.main.replaceChildren(element('h2', this.tab));
    this.main.scrollTop = 0;
    if (this.tab === __dialogueText("ui/ColdCaseUI.js", "t_d12f22e06aa520f25d81")) {
      const card = element('article', undefined, 'cc-card');
      if (this.data.victimPortrait) this.media(card, this.data.victimPortrait, __dialogueText("ui/ColdCaseUI.js", "t_666214c84d39ec6b4ff5"), 'image', {portrait:true});
      for (const [label, value] of Object.entries(this.data.brief)) card.append(element('h3', label), element('p', value));
      this.main.append(card);
    } else if (this.tab === __dialogueText("ui/ColdCaseUI.js", "t_40c9f9f69f538765e313")) this.suspects();
    else if (this.tab === __dialogueText("ui/ColdCaseUI.js", "t_f96a22e0f4a8bcd5d81e")) this.accuse();
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
      video.addEventListener('error', () => video.replaceWith(element('div', `${__dialogueText("ui/ColdCaseUI.js", "t_f2c7a58f9ab51aefce5c")}${alt}`, 'cc-placeholder')), {once:true});
      figure.append(video);
    } else {
      const button = this.button('', () => this.openLightbox(url, alt, options.effect, button));
      button.className = 'cc-photo-button';
      button.setAttribute('aria-label', `${__dialogueText("ui/ColdCaseUI.js", "t_836e31e1cac810cd8515")}${alt}`);
      const screen = element('span', undefined, 'cc-screen' + (options.effect === 'cctv' ? __dialogueText("ui/ColdCaseUI.js", "t_871e9a00e08aef17cbef") : ''));
      const image = document.createElement('img');
      image.alt = alt; image.src = url; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => {
        button.disabled = true;
        screen.className = 'cc-screen';
        screen.replaceChildren(element('div', `${__dialogueText("ui/ColdCaseUI.js", "t_f2c7a58f9ab51aefce5c")}${alt}`, 'cc-placeholder'));
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
    const close = this.button(__dialogueText("ui/ColdCaseUI.js", "t_d52777f4111399f1f920"), () => this.closeLightbox());
    tools.append(close);
    const figure = element('figure');
    const screen = element('div', undefined, 'cc-screen' + (effect === 'cctv' ? __dialogueText("ui/ColdCaseUI.js", "t_871e9a00e08aef17cbef") : ''));
    const image = document.createElement('img');
    image.alt = alt; image.src = url;
    image.addEventListener('error', () => {
      screen.className = 'cc-screen';
      screen.replaceChildren(element('p', __dialogueText("ui/ColdCaseUI.js", "t_d282cbd2ed606a87c4b9")));
    }, {once:true});
    screen.append(image);
    if (effect === 'cctv') {
      const toggle = this.button(__dialogueText("ui/ColdCaseUI.js", "t_1acde998beb744fbcc76"), () => {
        const enabled = screen.classList.toggle('cc-cctv');
        toggle.textContent = `${__dialogueText("ui/ColdCaseUI.js", "t_47edf3ee37b60e6065bd")}${enabled ? 'ON' : 'OFF'}`;
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
    if (!this.media(card, suspect.portrait, suspect.name, 'image', {portrait:true})) card.append(element('div', __dialogueText("ui/ColdCaseUI.js", "t_7d59da7caf8ce3446bd3"), 'cc-placeholder'));
    for (const [label,value] of [[__dialogueText("ui/ColdCaseUI.js", "t_3c769560ced7be187e26"),suspect.role],[__dialogueText("ui/ColdCaseUI.js", "t_6b5b4788a059362761ce"),suspect.relation],[__dialogueText("ui/ColdCaseUI.js", "t_cab1fa49f5475eff2338"),suspect.suspicion]]) card.append(element('h3', label),element('p',value));
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
      card.append(element('h3',correct ? __dialogueText("ui/ColdCaseUI.js", "t_3c61dc5d53341801e603") : __dialogueText("ui/ColdCaseUI.js", "t_478ad50b9204f31a42f4")),element('p',`${__dialogueText("ui/ColdCaseUI.js", "t_56670d2f967767aaa3c6")}${chosen?.name || __dialogueText("ui/ColdCaseUI.js", "t_b764cdc0eab713746721")}`));
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
      card.append(element('h3',`${__dialogueText("ui/ColdCaseUI.js", "t_29742aa2e714f1f7a889")}${suspect.name}${__dialogueText("ui/ColdCaseUI.js", "t_8a8de823d5ed3e12746a")}`),element('p',__dialogueText("ui/ColdCaseUI.js", "t_6544e440c9398433c962")));
      card.append(this.button(__dialogueText("ui/ColdCaseUI.js", "t_7d370c440139ddc68588"), () => {
        if (this.state.accusation) return;
        this.state = {accusation:suspect.id};
        this.scene.registry.set(this.registryKey,this.state);
        this.confirming = false; this.render();
        this.nav.querySelector('[aria-current]')?.focus();
      }),this.button(__dialogueText("ui/ColdCaseUI.js", "t_9f58ab24ed7411219db6"), () => {
        this.confirming = false; this.render(); this.main.querySelector('button')?.focus();
      }));
      this.main.append(card); this.main.querySelector('button')?.focus();
      return;
    }
    this.main.append(element('p',__dialogueText("ui/ColdCaseUI.js", "t_07def50184f51585b0a9")));
    const grid = element('div', undefined, 'cc-grid');
    for (const suspect of this.data.suspects) grid.append(this.button(`${__dialogueText("ui/ColdCaseUI.js", "t_29742aa2e714f1f7a889")}${suspect.name}`, () => {this.confirming = suspect.id; this.render();}));
    this.main.append(grid);
  }

  resolutionMedia(parent) {
    for (const media of this.data.resolutionMedia || []) this.media(parent, media.media, media.caption || __dialogueText("ui/ColdCaseUI.js", "t_9653dc64d42b4071855a"), media.mediaType, {caption:media.caption,effect:media.effect});
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
