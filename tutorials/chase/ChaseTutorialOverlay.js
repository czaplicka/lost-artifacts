import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import * as TutorialContent from './ChaseTutorialContent.js';
import { screenBounds } from './ChaseTutorialTargets.js';

const OBJECTIVES = {
  npc: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_72a8c37e64fce72247ec"),
  dialogue: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_949df7815407c61fffe9"),
  leave: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_a5cc71c410f25e825a41"),
  inventory: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_2bcc89a9f38d2d2a722b"),
  envelope: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_a1a5725205ca80e4b0d2"),
  envelope_missing: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_ad0b3d52feb4c086a78f"),
  envelope_done: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_6063b4bb67920ca683ec"),
  warrant: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_abd97d1824760175e6e5"),
  warrant_edit: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_e9cb955607305572effc"),
  warrant_search: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_4067810576ba0f056886"),
  warrant_searching: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_93f2cc2aae7c370ee4f8"),
  warrant_issue: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_7f3c06df69b784781990"),
  warrant_no_match: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_92f733e6822275cb578d"),
  warrant_issued: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_31dcfb9e795c3f18957d"),
  hotel: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_af7ba6bae2b3f5604afd"),
  booking: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_26612d7f7dc71356d380"),
  board: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_8d3090531ff5006c585f"),
  board_edit: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_5cf4b309a130102a56f9"),
  theory_open: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_bbba7bd08fc1962a2325"),
  theory_edit: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_8a08eb55b764b1020414"),
  return: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_f744cc632676564152c7"),
  travel: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_22e721f19db34bb9e962"),
  travel_choose: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_4f81872482cbdbbf82e3"),
  arrest: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_79ecdb8da067d822e114"),
  arrest_theory: __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_25a1cf9042ac2cc1ca9b")
};

export class ChaseTutorialOverlay {
  constructor(game, onSkip) {
    this.game = game;
    this.rings = [];
    this.nextAction = null;
    this.collapsed = false;
    this.portraitLoaded = false;
    this.currentId = null;
    this.destroyed = false;

    this.root = document.createElement('div');
    this.root.hidden = true;
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';

    const style = document.createElement('style');
    style.textContent = `${__dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_58236c5ba3fd948121af")}`;

    const element = (tag, className) => {
      const node = document.createElement(tag);
      node.className = className;
      return node;
    };

    this.panel = element('section', 'la-chase-panel');
    this.panel.setAttribute('aria-label', __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_6deaf40ea7a803c16e10"));
    this.portrait = element('div', 'la-chase-portrait');
    const frame = element('div', 'la-chase-portrait-frame');
    this.portraitImage = document.createElement('img');
    this.portraitImage.alt = 'HQ';
    this.portraitImage.hidden = true;
    this.portraitImage.onload = () => {
      if (!this.destroyed) this.portraitImage.hidden = false;
    };
    this.portraitImage.onerror = () => { this.portraitImage.hidden = true; };
    frame.append(this.portraitImage);
    this.portrait.append(frame, document.createTextNode('HQ'));

    this.heading = element('div', 'la-chase-heading');
    this.copy = element('div', 'la-chase-copy');
    this.title = element('div', 'la-chase-title');
    this.objective = element('div', 'la-chase-objective');
    this.text = element('div', 'la-chase-text');
    const controls = element('div', 'la-chase-controls');
    this.collapseButton = document.createElement('button');
    this.collapseButton.type = 'button';
    this.collapseButton.onclick = () => {
      this.collapsed = !this.collapsed;
      this.syncCollapsed();
      this.updateLayout();
    };
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_e8395936de2e1c809b3e");
    skip.onclick = () => onSkip();
    controls.append(this.collapseButton, skip);
    this.footer = element('div', 'la-chase-footer');
    this.nextButton = element('button', 'la-chase-next');
    this.nextButton.type = 'button';
    this.nextButton.hidden = true;
    this.nextButton.onclick = () => {
      const action = this.nextAction;
      this.nextAction = null;
      this.nextButton.hidden = true;
      action?.();
    };
    this.footer.append(this.nextButton);
    this.copy.append(this.title, this.objective, this.text, this.footer);
    this.panel.append(this.heading, this.portrait, this.copy, controls);
    this.root.append(style, this.panel);
    document.body.appendChild(this.root);
    this.syncCollapsed();
  }

  syncCollapsed() {
    this.panel.classList.toggle('is-collapsed', this.collapsed);
    this.title.hidden = this.collapsed;
    this.text.hidden = this.collapsed;
    this.footer.hidden = this.collapsed;
    this.portrait.hidden = this.collapsed || this.panel.classList.contains('is-narrow');
    this.collapseButton.textContent = this.collapsed ? '+' : '–';
    this.collapseButton.setAttribute('aria-label', this.collapsed ? __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_5df71120277eb959617f") : __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_11e7003f1f92b4f1387e"));
    this.collapseButton.setAttribute('aria-expanded', String(!this.collapsed));
  }

  loadPortrait() {
    if (this.portraitLoaded || !this.game.textures.exists('portrait_hq')) return;
    try {
      const source = this.game.textures.getBase64('portrait_hq');
      if (source && source !== 'data:,') {
        this.portraitLoaded = true;
        this.portraitImage.src = source;
      }
    } catch (error) {
      this.portraitLoaded = true;
      console.warn('[ChaseTutorialOverlay] Portrait unavailable:', error);
    }
  }

  hide() {
    this.root.hidden = true;
    this.nextAction = null;
    this.nextButton.hidden = true;
    for (const ring of this.rings) ring.remove();
    this.rings = [];
  }

  getTargetBounds(target) {
    if (target instanceof Element) {
      if (!target.isConnected || !target.getClientRects().length) return null;
      const style = window.getComputedStyle(target);
      if (style.visibility === 'hidden' || style.display === 'none') return null;
      return target.getBoundingClientRect();
    }
    return screenBounds(this.game, target);
  }

  updateLayout() {
    if (this.destroyed) return false;
    const rect = this.game.canvas.getBoundingClientRect();
    const { width: gw, height: gh } = this.game.scale.gameSize;
    if (rect.width <= 0 || rect.height <= 0 || gw <= 0 || gh <= 0) return false;
    const scale = Math.min(rect.width / gw, rect.height / gh);
    const width = Math.min(Math.max(gw - 48, 320), 860);
    this.panel.classList.toggle('is-narrow', width < 500);
    this.syncCollapsed();
    Object.assign(this.panel.style, {
      width: `${width}px`, transform: 'none', maxHeight: 'none', height: 'auto', overflow: 'visible'
    });
    const height = this.panel.offsetHeight;
    const top = Math.max(8, rect.top + 20 * scale);
    const leftEdge = Math.max(8, rect.left);
    const rightEdge = Math.min(window.innerWidth - 8, rect.right);
    const availableWidth = Math.max(1, rightEdge - leftEdge);
    const availableHeight = Math.max(1, window.innerHeight - top - 8);
    const fit = Math.min(scale, availableWidth / width, availableHeight / Math.max(1, height));
    Object.assign(this.panel.style, {
      left: `${Math.max(8, (leftEdge + rightEdge - width * fit) / 2)}px`,
      top: `${top}px`, transform: `scale(${fit})`
    });
    return true;
  }

  render(id, count = null, targets = [], options = {}) {
    const content = TutorialContent.CONTENT[id];
    if (!content) { this.hide(); return; }
    this.currentId = id;
    this.root.hidden = false;
    this.heading.textContent = Number.isFinite(count)
      ? `${__dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_0eebe665b423b7b3e0d8")}${count}${__dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_8d2cedfe81c77aaa05d9")}` : __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_306b58f381ad18821674");
    const objective = options.objective || TutorialContent.COMPACT_OBJECTIVES?.[id] || OBJECTIVES[id] || content[1];
    this.title.textContent = content[0];
    this.objective.textContent = objective;
    this.text.textContent = content[1];
    this.nextAction = options.onNext || null;
    this.nextButton.hidden = !this.nextAction;
    this.nextButton.textContent = options.nextLabel || __dialogueText("tutorials/chase/ChaseTutorialOverlay.js", "t_501721f0699ef8abe8d4");
    this.loadPortrait();
    if (!this.updateLayout()) { this.hide(); return; }
    let index = 0;
    for (const target of targets.filter(Boolean)) {
      const bounds = this.getTargetBounds(target);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;
      let ring = this.rings[index];
      if (!ring) {
        ring = document.createElement('div');
        ring.className = 'la-chase-ring';
        this.root.appendChild(ring);
        this.rings.push(ring);
      }
      index++;
      Object.assign(ring.style, {
        left: `${bounds.left - 5}px`, top: `${bounds.top - 5}px`,
        width: `${bounds.width + 10}px`, height: `${bounds.height + 10}px`
      });
    }
    while (this.rings.length > index) this.rings.pop().remove();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.nextAction = null;
    this.portraitImage.onload = null;
    this.portraitImage.onerror = null;
    this.root.remove();
    this.rings = [];
  }
}