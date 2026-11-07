import { CONTENT } from './ChaseTutorialContent.js';
import { screenBounds } from './ChaseTutorialTargets.js';

export class ChaseTutorialOverlay {
  constructor(game, onSkip) {
    this.game = game;
    this.rings = [];
    this.nextAction = null;
    this.collapsed = false;
    this.portraitLoaded = false;

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
        from { opacity: .28; }
        to { opacity: 1; }
      }

      .la-chase-ring {
        position: fixed;
        box-sizing: border-box;
        border: 4px solid #f2d477;
        background: rgba(242, 212, 119, .08);
        animation: la-chase-pulse .7s ease-in-out infinite alternate;
        pointer-events: none;
      }

      .la-chase-panel {
        position: fixed;
        box-sizing: border-box;
        min-height: 150px;
        border: 3px solid rgba(242, 212, 119, .92);
        background: rgba(23, 17, 14, .95);
        color: #fff4d0;
        padding: 12px 16px;
        pointer-events: auto;
        transform-origin: top left;
        z-index: 1;
      }

      .la-chase-copy {
        margin-left: 100px;
      }

      .la-chase-heading {
        min-height: 24px;
        padding-right: 184px;
        font: 8px/1.8 "PressStart2P", monospace;
        color: #f2d477;
      }

      .la-chase-title {
        margin: 0 0 10px;
        font: 9px/1.8 "PressStart2P", monospace;
        color: #fff4d0;
        overflow-wrap: anywhere;
      }

      .la-chase-text {
        font: 20px/1.4 "SpecialElite", serif;
        color: #fff4d0;
        overflow-wrap: anywhere;
      }

      .la-chase-portrait {
        position: absolute;
        left: 16px;
        top: 38px;
        width: 84px;
        text-align: center;
        font: 8px/1.8 "PressStart2P", monospace;
        color: #f2d477;
      }

      .la-chase-portrait-frame {
        box-sizing: content-box;
        width: 84px;
        height: 84px;
        padding: 2px;
        margin-bottom: 7px;
        border: 2px solid rgba(242, 212, 119, .85);
        background: rgba(215, 197, 143, .12);
      }

      .la-chase-portrait img {
        display: block;
        width: 84px;
        height: 84px;
        object-fit: contain;
        image-rendering: pixelated;
      }

      .la-chase-controls {
        position: absolute;
        right: 10px;
        top: 8px;
        display: flex;
        gap: 8px;
      }

      .la-chase-panel button {
        box-sizing: border-box;
        min-height: 26px;
        border: 1px solid rgba(242, 212, 119, .72);
        background: rgba(23, 17, 14, .35);
        color: #d7c58f;
        font: 7px/1.5 "PressStart2P", monospace;
        cursor: pointer;
        padding: 5px 8px;
      }

      .la-chase-panel button:hover {
        color: #f2d477;
      }

      .la-chase-controls button:first-child {
        width: 26px;
        padding: 0;
        font-size: 12px;
      }

      .la-chase-controls button:last-child {
        width: 136px;
      }

      .la-chase-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
      }

      .la-chase-panel .la-chase-next {
        background: #f2d477;
        color: #241d18;
      }

      .la-chase-panel button:focus-visible {
        outline: 2px solid #fff4d0;
        outline-offset: 3px;
      }

      .la-chase-panel [hidden] {
        display: none !important;
      }

      .la-chase-panel.is-collapsed {
        min-height: 46px;
        padding-top: 7px;
        padding-bottom: 7px;
      }

      .la-chase-panel.is-collapsed .la-chase-copy {
        margin-left: 0;
      }

      .la-chase-panel.is-collapsed .la-chase-heading {
        min-height: 0;
      }

      .la-chase-panel.is-collapsed .la-chase-title {
        margin: 0;
        padding-right: 184px;
        font-size: 8px;
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

    this.portrait = document.createElement('div');
    this.portrait.className = 'la-chase-portrait';

    const portraitFrame = document.createElement('div');
    portraitFrame.className = 'la-chase-portrait-frame';

    this.portraitImage = document.createElement('img');
    this.portraitImage.alt = 'HQ';
    this.portraitImage.hidden = true;

    this.portraitImage.onload = () => {
      this.portraitImage.hidden = false;
    };

    this.portraitImage.onerror = () => {
      this.portraitImage.hidden = true;
    };

    portraitFrame.append(this.portraitImage);

    this.portrait.append(
      portraitFrame,
      document.createTextNode('HQ')
    );

    this.copy = document.createElement('div');
    this.copy.className = 'la-chase-copy';

    this.heading = document.createElement('div');
    this.heading.className = 'la-chase-heading';

    this.title = document.createElement('div');
    this.title.className = 'la-chase-title';

    this.text = document.createElement('div');
    this.text.className = 'la-chase-text';

    const controls = document.createElement('div');
    controls.className = 'la-chase-controls';

    this.collapseButton = document.createElement('button');
    this.collapseButton.type = 'button';

    this.collapseButton.onclick = () => {
      this.collapsed = !this.collapsed;
      this.syncCollapsed();
    };

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = 'SKIP TUTORIAL >';
    skip.onclick = () => onSkip();

    controls.append(this.collapseButton, skip);

    this.footer = document.createElement('div');
    this.footer.className = 'la-chase-footer';

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

    this.footer.append(this.nextButton);

    this.copy.append(
      this.heading,
      this.title,
      this.text,
      this.footer
    );

    this.panel.append(
      this.portrait,
      this.copy,
      controls
    );

    this.root.append(style, this.panel);
    document.body.appendChild(this.root);

    this.syncCollapsed();
  }

  syncCollapsed() {
    this.panel.classList.toggle(
      'is-collapsed',
      this.collapsed
    );

    this.text.hidden = this.collapsed;
    this.portrait.hidden = this.collapsed;
    this.footer.hidden = this.collapsed;

    this.collapseButton.textContent = this.collapsed
      ? '+'
      : '–';

    this.collapseButton.setAttribute(
      'aria-label',
      this.collapsed
        ? 'Expand tutorial'
        : 'Minimise tutorial'
    );

    this.collapseButton.setAttribute(
      'aria-expanded',
      String(!this.collapsed)
    );
  }

  loadPortrait() {
    if (
      this.portraitLoaded ||
      !this.game.textures.exists('portrait_hq')
    ) {
      return;
    }

    try {
      const source = this.game.textures.getBase64('portrait_hq');

      if (source && source !== 'data:,') {
        this.portraitLoaded = true;
        this.portraitImage.src = source;
      }
    } catch (error) {
      this.portraitLoaded = true;
      this.portraitImage.hidden = true;

      console.warn(
        '[ChaseTutorialOverlay] HQ portrait unavailable:',
        error
      );
    }
  }

  hide() {
    this.root.hidden = true;
    this.nextAction = null;
    this.nextButton.hidden = true;
  }

  getTargetBounds(target) {
    if (target instanceof Element) {
      if (
        !target.isConnected ||
        !target.getClientRects().length
      ) {
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

  updateLayout() {
    const rect = this.game.canvas.getBoundingClientRect();

    const gameWidth = this.game.scale.gameSize.width;
    const gameHeight = this.game.scale.gameSize.height;

    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      gameWidth <= 0 ||
      gameHeight <= 0
    ) {
      return false;
    }

    const scale = Math.min(
      rect.width / gameWidth,
      rect.height / gameHeight
    );

    const panelWidth = Math.min(
      Math.max(gameWidth - 48, 320),
      860
    );

    const fit = Math.min(
      scale,
      Math.max(1, window.innerWidth - 16) / panelWidth
    );

    const visibleLeft = Math.max(8, rect.left);
    const visibleRight = Math.min(
      window.innerWidth - 8,
      rect.right
    );

    const left = Math.max(
      8,
      (visibleLeft + visibleRight - panelWidth * fit) / 2
    );

    const top = Math.max(
      8,
      rect.top + 20 * scale
    );

    Object.assign(this.panel.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${panelWidth}px`,
      transform: `scale(${fit})`,
      maxHeight: `${
        Math.max(
          46,
          (window.innerHeight - top - 8) / fit
        )
      }px`,
      overflowY: 'auto'
    });

    return true;
  }

  render(id, count = null, targets = [], options = {}) {
    const content = CONTENT[id];

    if (!content) {
      this.hide();
      return;
    }

    const [title, text] = content;

    this.root.hidden = false;

    this.heading.textContent = Number.isFinite(count)
      ? `HQ · CITY · WITNESSES ${count}/3`
      : 'HQ · FIELD GUIDE';

    this.title.textContent = title;
    this.text.textContent = text;

    this.nextAction = options.onNext || null;

    this.nextButton.hidden = !this.nextAction;
    this.nextButton.textContent =
      options.nextLabel || 'Understood';

    this.loadPortrait();

    if (!this.updateLayout()) {
      this.hide();
      return;
    }

    let index = 0;

    for (const target of targets.filter(Boolean)) {
      const bounds = this.getTargetBounds(target);

      if (
        !bounds ||
        bounds.width <= 0 ||
        bounds.height <= 0
      ) {
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

    this.portraitImage.onload = null;
    this.portraitImage.onerror = null;

    this.root.remove();
    this.rings = [];
  }
}