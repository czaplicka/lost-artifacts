import { CONTENT } from './ChaseTutorialContent.js';
import { screenBounds } from './ChaseTutorialTargets.js';

export class ChaseTutorialOverlay {
  constructor(game, onSkip) {
    this.game = game;
    this.rings = [];
    this.nextAction = null;

    this.root = document.createElement('div');
    this.root.hidden = true;
    this.root.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483000;
    `;

    const style = document.createElement('style');

    style.textContent = `
      @keyframes la-chase-pulse {
        from { opacity: .35; }
        to { opacity: 1; }
      }

      .la-chase-ring {
        position: fixed;
        box-sizing: border-box;
        border: 3px solid #f2d477;
        background: #f2d47712;
        box-shadow: 0 0 10px #f2d47777;
        animation: la-chase-pulse .7s ease-in-out infinite alternate;
        pointer-events: none;
      }

      .la-chase-panel {
        position: fixed;
        box-sizing: border-box;
        max-width: 620px;
        max-height: calc(100vh - 24px);
        overflow: auto;
        border: 2px solid #f2d477;
        background: #17110ef5;
        color: #fff4d0;
        padding: 14px 16px;
        font: 16px SpecialElite, serif;
        line-height: 1.45;
        pointer-events: auto;
        z-index: 1;
      }

      .la-chase-title {
        font: 10px PressStart2P, monospace;
        line-height: 1.8;
        color: #f2d477;
        margin: 0 0 10px;
      }

      .la-chase-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .la-chase-controls button {
        background: none;
        border: 1px solid transparent;
        color: #d7c58f;
        font: 13px SpecialElite, serif;
        cursor: pointer;
        padding: 7px;
      }

      .la-chase-controls .la-chase-next {
        border-color: #f2d477;
        background: #f2d477;
        color: #241d18;
      }

      .la-chase-controls button:focus-visible {
        outline: 2px solid #fff4d0;
        outline-offset: 3px;
      }

      .la-chase-controls button[hidden] {
        display: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .la-chase-ring {
          animation: none;
        }
      }
    `;

    this.panel = document.createElement('section');
    this.panel.className = 'la-chase-panel';
    this.panel.setAttribute('aria-label', 'Investigation tutorial');

    this.title = document.createElement('div');
    this.title.className = 'la-chase-title';

    this.text = document.createElement('div');

    const controls = document.createElement('div');
    controls.className = 'la-chase-controls';

    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.textContent = 'Minimise';

    collapse.onclick = () => {
      this.text.hidden = !this.text.hidden;
      collapse.textContent = this.text.hidden ? 'Expand' : 'Minimise';
    };

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = 'Skip this tutorial';
    skip.onclick = () => onSkip();

    this.nextButton = document.createElement('button');
    this.nextButton.type = 'button';
    this.nextButton.className = 'la-chase-next';
    this.nextButton.hidden = true;

    this.nextButton.onclick = () => {
      const action = this.nextAction;
      this.nextAction = null;
      this.nextButton.hidden = true;
      action?.();
    };

    controls.append(collapse, skip, this.nextButton);
    this.panel.append(this.title, this.text, controls);
    this.root.append(style, this.panel);

    document.body.appendChild(this.root);
  }

  hide() {
    this.root.hidden = true;
    this.nextAction = null;
    this.nextButton.hidden = true;
  }

  getTargetBounds(target) {
    if (target instanceof Element) {
      if (!target.isConnected || !target.getClientRects().length) {
        return null;
      }

      const style = window.getComputedStyle(target);

      if (
        style.visibility === 'hidden' ||
        style.display === 'none'
      ) {
        return null;
      }

      return target.getBoundingClientRect();
    }

    return screenBounds(this.game, target);
  }

  render(id, count = null, targets = [], options = {}) {
    const content = CONTENT[id];

    if (!content) {
      this.hide();
      return;
    }

    this.root.hidden = false;

    const [title, text] = content;
    const counter = Number.isFinite(count) ? ` · ${count}/3` : '';

    this.title.textContent = `HQ · ${title}${counter}`;
    this.text.textContent = text;

    this.nextAction = options.onNext || null;
    this.nextButton.hidden = !this.nextAction;
    this.nextButton.textContent = options.nextLabel || 'Understood';

    const rect = this.game.canvas.getBoundingClientRect();

    this.panel.style.left = `${Math.max(8, rect.left + 12)}px`;
    this.panel.style.top = `${Math.max(8, rect.top + 12)}px`;
    this.panel.style.width = `${
      Math.max(
        140,
        Math.min(620, rect.width - 24, window.innerWidth - 24)
      )
    }px`;

    let index = 0;

    for (const target of targets.filter(Boolean)) {
      const bounds = this.getTargetBounds(target);

      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        continue;
      }

      let ring = this.rings[index];

      if (!ring) {
        ring = document.createElement('div');
        ring.className = 'la-chase-ring';

        this.root.appendChild(ring);
        this.rings.push(ring);
      }

      index += 1;

      Object.assign(ring.style, {
        left: `${bounds.left - 5}px`,
        top: `${bounds.top - 5}px`,
        width: `${bounds.width + 10}px`,
        height: `${bounds.height + 10}px`
      });
    }

    while (this.rings.length > index) {
      this.rings.pop().remove();
    }
  }

  destroy() {
    this.nextAction = null;
    this.root.remove();
    this.rings = [];
  }
}