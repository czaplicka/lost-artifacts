import { CONTENT } from './ChaseTutorialContent.js';
import { screenBounds } from './ChaseTutorialTargets.js';

export class ChaseTutorialOverlay {
  constructor(game, onSkip) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes la-chase-pulse { from { opacity:.35; } to { opacity:1; } }
      .la-chase-ring { position:fixed;box-sizing:border-box;border:3px solid #f2d477;
        background:#f2d47712;box-shadow:0 0 10px #f2d47777;
        animation:la-chase-pulse .7s ease-in-out infinite alternate;pointer-events:none; }
      .la-chase-panel { position:fixed;box-sizing:border-box;max-width:620px;
        border:2px solid #f2d477;background:#17110ef5;color:#fff4d0;padding:12px 15px;
        font:16px SpecialElite,serif;pointer-events:auto; }
      .la-chase-title { font:10px PressStart2P,monospace;color:#f2d477;margin:0 0 10px; }
      .la-chase-controls { display:flex;gap:16px;justify-content:flex-end;margin-top:8px; }
      .la-chase-controls button { background:none;border:0;color:#d7c58f;
        font:12px SpecialElite,serif;cursor:pointer;padding:5px; }
      @media(prefers-reduced-motion:reduce) { .la-chase-ring { animation:none; } }
    `;
    this.panel = document.createElement('section');
    this.panel.className = 'la-chase-panel';
    this.title = document.createElement('div'); this.title.className = 'la-chase-title';
    this.text = document.createElement('div');
    const controls = document.createElement('div'); controls.className = 'la-chase-controls';
    const collapse = document.createElement('button'); collapse.textContent = 'Minimise';
    collapse.onclick = () => {
      this.text.hidden = !this.text.hidden;
      collapse.textContent = this.text.hidden ? 'Expand' : 'Minimise';
    };
    const skip = document.createElement('button'); skip.textContent = 'Skip tutorial';
    skip.onclick = onSkip;
    controls.append(collapse, skip); this.panel.append(this.title, this.text, controls);
    this.root.append(style, this.panel); document.body.appendChild(this.root);
    this.rings = [];
  }
  hide() { this.root.hidden = true; }
  render(id, count, targets = []) {
    this.root.hidden = false;
    const [title, text] = CONTENT[id];
    this.title.textContent = `HQ · ${title} · ${count}/3`;
    this.text.textContent = text;
    const rect = this.game.canvas.getBoundingClientRect();
    this.panel.style.left = `${rect.left + 12}px`;
    this.panel.style.top = `${rect.top + 12}px`;
    this.panel.style.width = `${Math.max(140, Math.min(620, rect.width - 24))}px`;
    let index = 0;
    for (const target of targets) {
      const b = screenBounds(this.game, target);
      if (!b || b.width <= 0 || b.height <= 0) continue;
      let ring = this.rings[index];
      if (!ring) {
        ring = document.createElement('div'); ring.className = 'la-chase-ring';
        this.root.appendChild(ring); this.rings.push(ring);
      }
      index++;
      Object.assign(ring.style, {
        left:`${b.left-5}px`, top:`${b.top-5}px`,
        width:`${b.width+10}px`, height:`${b.height+10}px`
      });
    }
    while (this.rings.length > index) this.rings.pop().remove();
  }
  destroy() { this.root.remove(); this.rings = []; }
}
