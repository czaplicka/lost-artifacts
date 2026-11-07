import * as TutorialContent from './ChaseTutorialContent.js';
import { screenBounds } from './ChaseTutorialTargets.js';

const OBJECTIVES = {
  npc: 'Talk to a witness.',
  dialogue: 'Ask about the suspect and the next destination.',
  leave: 'Return to the city map.',
  inventory: 'Open Inventory and select the ID Preparation Envelope.',
  envelope: 'Read the eye colour in the ID Preparation Envelope.',
  envelope_missing: 'Recover the ID Preparation Envelope from the apartment.',
  envelope_done: 'Close Inventory and open Warrant.',
  warrant: 'Open Warrant from the player menu.',
  warrant_edit: 'Select three traits, including the recovered eye colour.',
  warrant_search: 'Click SEARCH RECORDS.',
  warrant_searching: 'Wait for the records search.',
  warrant_issue: 'Click ISSUE beside your chosen suspect.',
  warrant_no_match: 'Check the selected traits and search again.',
  warrant_issued: 'Close the issued warrant.',
  hotel: 'Visit the hotel.',
  booking: 'Choose a hotel within your budget.',
  board: 'Use the desk to open the Crime Board.',
  board_edit: 'Review the evidence, then open Case Theory.',
  theory_open: 'Open the Case Theory tab.',
  theory_edit: 'Build four evidence-backed conclusions.',
  return: 'Close the board and return to the city.',
  travel: 'Open Travel and compare the destination clues.',
  travel_choose: 'Choose the next city using the clues.',
  arrest: 'Compare the dossiers and select your suspect.',
  arrest_theory: 'Review how your Case Theory supports the case.'
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
    style.textContent = `
      @keyframes la-chase-pulse{from{opacity:.28}to{opacity:1}}
      .la-chase-ring{position:fixed;box-sizing:border-box;border:4px solid #f2d477;background:#f2d47714;animation:la-chase-pulse .7s ease-in-out infinite alternate;pointer-events:none}
      .la-chase-panel{position:fixed;box-sizing:border-box;min-height:0;border:3px solid #f2d477eb;background:#17110ef5;color:#fff4d0;padding:12px 16px;pointer-events:auto;transform-origin:top left;z-index:1;overflow:visible}
      .la-chase-heading{min-height:28px;padding-right:184px;font:8px/1.8 PressStart2P,monospace;color:#f2d477;overflow-wrap:anywhere}
      .la-chase-copy{margin-left:100px;min-height:116px}
      .la-chase-title{margin:0 0 10px;font:9px/1.8 PressStart2P,monospace;color:#fff4d0;overflow-wrap:anywhere}
      .la-chase-objective{margin:0 0 8px;font:20px/1.35 SpecialElite,serif;color:#fff4d0;overflow-wrap:anywhere}
      .la-chase-text{font:14px/1.45 SpecialElite,serif;color:#d7c58f;overflow-wrap:anywhere}
      .la-chase-portrait{position:absolute;left:16px;top:44px;width:84px;text-align:center;font:8px/1.8 PressStart2P,monospace;color:#f2d477}
      .la-chase-portrait-frame{box-sizing:content-box;width:84px;height:84px;padding:2px;margin-bottom:7px;border:2px solid #f2d477d9;background:#d7c58f1f}
      .la-chase-portrait img{display:block;width:84px;height:84px;object-fit:contain;image-rendering:pixelated}
      .la-chase-controls{position:absolute;right:10px;top:8px;display:flex;gap:8px}
      .la-chase-panel button{box-sizing:border-box;min-height:26px;border:1px solid #f2d477b8;background:#17110e59;color:#d7c58f;font:7px/1.5 PressStart2P,monospace;cursor:pointer;padding:5px 8px}
      .la-chase-controls button:first-child{width:26px;padding:0;font-size:12px}
      .la-chase-controls button:last-child{width:136px}
      .la-chase-panel button:hover{color:#f2d477}
      .la-chase-panel button:focus-visible{outline:2px solid #fff4d0;outline-offset:3px}
      .la-chase-footer{display:flex;justify-content:flex-end;margin-top:10px}
      .la-chase-panel .la-chase-next{background:#f2d477;color:#241d18}
      .la-chase-panel [hidden]{display:none!important}
      .la-chase-panel.is-collapsed .la-chase-copy{margin-left:0;min-height:0}
      .la-chase-panel.is-collapsed .la-chase-objective{margin:0;font-size:18px}
      .la-chase-panel.is-narrow .la-chase-copy{margin-left:0;min-height:0}
      .la-chase-panel.is-narrow .la-chase-heading{padding-top:30px;padding-right:0}
      @media(prefers-reduced-motion:reduce){.la-chase-ring{animation:none}}
    `;

    const element = (tag, className) => {
      const node = document.createElement(tag);
      node.className = className;
      return node;
    };

    this.panel = element('section', 'la-chase-panel');
    this.panel.setAttribute('aria-label', 'Investigation tutorial');
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
    skip.textContent = 'SKIP TUTORIAL >';
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
    this.collapseButton.setAttribute('aria-label', this.collapsed ? 'Expand tutorial' : 'Minimise tutorial');
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
      ? `HQ · CITY · WITNESSES ${count}/3` : 'HQ · FIELD GUIDE';
    const objective = options.objective || TutorialContent.COMPACT_OBJECTIVES?.[id] || OBJECTIVES[id] || content[1];
    this.title.textContent = content[0];
    this.objective.textContent = objective;
    this.text.textContent = content[1];
    this.nextAction = options.onNext || null;
    this.nextButton.hidden = !this.nextAction;
    this.nextButton.textContent = options.nextLabel || 'Understood';
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