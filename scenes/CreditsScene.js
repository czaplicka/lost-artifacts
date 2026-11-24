import { BaseScene } from './BaseScene.js';
import { audioManager } from '../managers/AudioManager.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

const BACKGROUND_KEY = 'credits_dossier_v1';
const BACKGROUND_URL = 'assets/ui/credits-dossier.webp';
const DESIGN = { width: 1376, height: 768 };
// Safe writing area inside the paper, in the supplied image's coordinates.
const PAPER = { x: 240, y: 98, width: 904, height: 578 };

export class CreditsScene extends BaseScene {
  constructor() {
    super({ key: 'CreditsScene' });
    this.isClosing = false;
    this._creditsHost = null;
    this._creditsBackdrop = null;
    this._creditsBlocker = null;
    this._creditsCleaned = true;
    this._creditsPreviousFocus = null;
  }

  preload() {
    preloadMenuActionAudio(this);
    if (!this.textures.exists(BACKGROUND_KEY)) {
      this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
    }
  }

  create() {
    super.create();
    this.isClosing = false;
    this._creditsCleaned = false;
    audioManager.init(this);
    const { width, height } = this.scale;
    this._creditsBlocker = this.add.rectangle(0, 0, width, height, 0x211a13)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    this._creditsBlocker.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation());
    if (this.textures.exists(BACKGROUND_KEY)) {
      this._creditsBackdrop = this.add.image(0, 0, BACKGROUND_KEY)
        .setOrigin(0).setScrollFactor(0);
    } else {
      this._creditsBackdrop = null;
      console.warn(`[CreditsScene] Missing background: ${BACKGROUND_URL}`);
    }

    this.events.once('shutdown', this.cleanupCredits, this);
    this.events.once('destroy', this.cleanupCredits, this);
    const host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Credits');
    host.style.cssText = 'position:fixed;z-index:100000;overflow:hidden;pointer-events:auto;container-type:size;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{--credit-scale:1;color:#302a20;font-family:SpecialElite,'Courier New',monospace}
        *,*::before,*::after{box-sizing:border-box}
        .screen{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:transparent;padding:calc(5px * var(--credit-scale));gap:calc(12px * var(--credit-scale))}
        header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:0 4px calc(10px * var(--credit-scale));border-bottom:1px solid #c6b89580}
        h1{font-family:PressStart2P,monospace;font-size:calc(17px * var(--credit-scale));color:#f0e1bd;margin:0;line-height:1.6;text-shadow:1px 2px #28291f}
        .label{color:#e0d5b9;font-size:calc(14px * var(--credit-scale));margin:5px 0 0;line-height:1.3}
        .stamp{flex-shrink:0;font-family:PressStart2P,monospace;font-size:calc(8px * var(--credit-scale));line-height:1.9;border:3px double #ddb69a;color:#f0c9aa;padding:calc(8px * var(--credit-scale));transform:rotate(-5deg);text-align:center}
        main{overflow:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-color:#baaa81 #484b3b;scrollbar-width:thin;min-height:0;padding:4px 9px 8px 3px;outline:none}
        main:focus-visible{outline:2px dashed #e0c78a;outline-offset:-2px}
        .files{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(14px * var(--credit-scale));padding:0 0 5px}
        article{position:relative;min-width:0;padding:calc(18px * var(--credit-scale));border:1px solid #b49d70;background:#decda9;box-shadow:3px 4px 0 #27291f70;overflow-wrap:anywhere}
        article:first-child{grid-column:1/-1;background:#e6d7b5}
        .file-no{font-family:PressStart2P,monospace;font-size:calc(8px * var(--credit-scale));line-height:1.8;color:#766145;padding-bottom:8px;border-bottom:1px solid #95805c66}
        h2{font-size:calc(27px * var(--credit-scale));color:#3c3023;margin:12px 0 5px;line-height:1.2}
        h3{font-size:calc(17px * var(--credit-scale));color:#6d4730;margin:0 0 10px;line-height:1.4}
        p{font-size:calc(16px * var(--credit-scale));line-height:1.5;margin:8px 0}
        .status{font-size:calc(13px * var(--credit-scale));line-height:1.45;color:#675841;border-top:1px dashed #a38c63;margin-top:12px;padding-top:10px}
        footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:calc(6px * var(--credit-scale)) 3px 0;border-top:1px solid #c6b89580}
        button{flex-shrink:0;font-family:PressStart2P,monospace;font-size:calc(10px * var(--credit-scale));line-height:1.6;min-height:44px;padding:calc(10px * var(--credit-scale)) calc(14px * var(--credit-scale));background:#c9b387;color:#30281d;border:2px solid #ecd9ae;box-shadow:2px 3px 0 #28291d80;cursor:pointer}
        button:hover{background:#ebd8b0;color:#382619}
        button:active{transform:translateY(1px);box-shadow:1px 1px 0 #28291d80}
        button:focus-visible{outline:3px solid #f6e5bd;outline-offset:3px}
        .end{font-size:calc(12px * var(--credit-scale));line-height:1.4;color:#e0d5b9}
        @container(max-width:620px){
          .files{grid-template-columns:1fr}article:first-child{grid-column:auto}
          .stamp{display:none}h1{font-size:14px}.label{font-size:12px}
          .end{display:none}footer{justify-content:flex-end}button{font-size:9px}
        }
        @container(max-height:330px){
          .screen{gap:6px;padding:3px}header{padding-bottom:4px}
          .stamp,.label,.end{display:none}h1{font-size:12px}
          footer{padding-top:4px}button{font-size:9px;min-height:36px;padding:6px 10px}
        }
      </style>
      <div class="screen">
        <header>
          <div><h1>PERSONS RESPONSIBLE</h1><p class="label">Mark Agency / Internal Affairs / Credits</p></div>
          <div class="stamp">RESPONSIBILITY<br>CONFIRMED</div>
        </header>
        <main tabindex="0" aria-label="Credits files">
          <div class="files">
            <article><div class="file-no">FILE 001 / THE ENTIRE DEPARTMENT</div><h2>Monika Czaplicka</h2><h3>Everything. Yes, that too.</h3>
              <p>Game design, code, story, visuals, and every suspiciously specific detail you just clicked.</p>
              <p>Also responsible for turning “a small detective game” into an organisation that probably needs its own HR department.</p>
              <div class="status">Official alibi: “I was only going to add one more thing.”</div>
            </article>
            <article><div class="file-no">FILE 002 / KNOWN ACCOMPLICE</div><h2>Bernard Czaplicki</h2><h3>Ideas &amp; additional writing</h3>
              <p>Contributed part of the original idea and some of the writing. Enough to be implicated. Not enough to be blamed for everything.</p>
              <div class="status">Involvement: confirmed. Exact percentage: classified.</div>
            </article>
            <article><div class="file-no">FILE 003 / SPECIAL THANKS</div><h2>Mieczu &amp; Yanu</h2><h3>Not suspects. For once.</h3>
              <p>Special thanks to Mieczu and Yanu. Your names have been cleared for this very official expression of gratitude.</p>
              <div class="status">No interrogation required. Just a very sincere thank you.</div>
            </article>
          </div>
        </main>
        <footer><span class="end">END OF FILE.<br>THE PAPERWORK CONTINUES.</span><button type="button">BACK TO SETTINGS</button></footer>
      </div>`;

    this._creditsPreviousFocus = document.activeElement;
    this._creditsHost = host;
    document.body.appendChild(host);
    this._creditsPosition = () => this.positionCredits();
    this._creditsKeydown = event => {
      // Do not let keyboard input escape from the DOM dialog into the game.
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeCredits();
        return;
      }
      if (event.key === 'Tab') {
        const targets = [shadow.querySelector('main'), shadow.querySelector('button')];
        const current = targets.indexOf(shadow.activeElement);
        const next = current < 0 ? (event.shiftKey ? targets.length - 1 : 0)
          : (current + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault();
        targets[next].focus({ preventScroll: true });
      }
    };
    shadow.querySelector('button').addEventListener('click', () => this.closeCredits());
    host.addEventListener('keydown', this._creditsKeydown);
    window.addEventListener('resize', this._creditsPosition, { passive: true });
    window.addEventListener('scroll', this._creditsPosition, { passive: true });
    window.visualViewport?.addEventListener('resize', this._creditsPosition, { passive: true });
    window.visualViewport?.addEventListener('scroll', this._creditsPosition, { passive: true });
    this.scale.on('resize', this._creditsPosition);
    this._creditsObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(this._creditsPosition) : null;
    this._creditsObserver?.observe(this.game.canvas);
    this.positionCredits();
    shadow.querySelector('button').focus({ preventScroll: true });
    this.scene.setVisible(true);
    this.scene.bringToTop();
  }

  positionCredits() {
    if (!this._creditsHost || this._creditsCleaned) return;
    const { width, height } = this.scale;
    const rect = this.game.canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0 || rect.width <= 0 || rect.height <= 0) return;
    const fit = Math.min(width / DESIGN.width, height / DESIGN.height);
    const x = (width - DESIGN.width * fit) / 2;
    const y = (height - DESIGN.height * fit) / 2;
    this._creditsBlocker?.setSize(width, height);
    this._creditsBackdrop?.setPosition(x, y).setDisplaySize(DESIGN.width * fit, DESIGN.height * fit);
    const cssX = rect.width / width;
    const cssY = rect.height / height;
    const paperWidth = PAPER.width * fit * cssX;
    Object.assign(this._creditsHost.style, {
      left: `${rect.left + (x + PAPER.x * fit) * cssX}px`,
      top: `${rect.top + (y + PAPER.y * fit) * cssY}px`,
      width: `${paperWidth}px`,
      height: `${PAPER.height * fit * cssY}px`
    });
    this._creditsHost.style.setProperty('--credit-scale', String(Math.min(1.6, Math.max(0.85, paperWidth / PAPER.width))));
  }

  closeCredits() {
    if (this.isClosing || this._creditsCleaned) return;
    this.isClosing = true;
    playMenuActionAudio(this);
    this.scene.stop();
  }

  cleanupCredits() {
    if (this._creditsCleaned) return;
    this._creditsCleaned = true;
    this.events.off('shutdown', this.cleanupCredits, this);
    this.events.off('destroy', this.cleanupCredits, this);
    this._creditsObserver?.disconnect();
    this._creditsObserver = null;
    if (this._creditsPosition) {
      window.removeEventListener('resize', this._creditsPosition);
      window.removeEventListener('scroll', this._creditsPosition);
      window.visualViewport?.removeEventListener('resize', this._creditsPosition);
      window.visualViewport?.removeEventListener('scroll', this._creditsPosition);
      this.scale.off('resize', this._creditsPosition);
    }
    if (this._creditsHost && this._creditsKeydown) {
      this._creditsHost.removeEventListener('keydown', this._creditsKeydown);
    }
    this._creditsHost?.remove();
    this._creditsHost = null;
    this._creditsPosition = null;
    this._creditsKeydown = null;
    this._creditsBackdrop = null;
    this._creditsBlocker = null;
    if (this._creditsPreviousFocus?.isConnected) {
      this._creditsPreviousFocus.focus({ preventScroll: true });
    }
    this._creditsPreviousFocus = null;
  }
}