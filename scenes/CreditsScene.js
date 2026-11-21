import { BaseScene } from './BaseScene.js';
import { audioManager } from '../managers/AudioManager.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

export class CreditsScene extends BaseScene {
  constructor() { super({ key: 'CreditsScene' }); }

  preload() {
    preloadMenuActionAudio(this);
    if (!this.textures.exists('backgroundpc')) this.load.image('backgroundpc', 'assets/hiscores.webp');
    if (!this.textures.exists('backgroundhi')) this.load.image('backgroundhi', 'assets/local/office.webp');
  }

  create() {
    super.create();
    this.isClosing = false;
    audioManager.init(this);
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x07100a).setOrigin(0).setInteractive();
    for (const key of ['backgroundhi', 'backgroundpc']) {
      if (this.textures.exists(key)) this.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
    }
    const host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Credits');
    host.style.cssText = 'position:fixed;z-index:100000;overflow:hidden;pointer-events:auto;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{color:#e0f0d4;font-family:SpecialElite,'Courier New',monospace;font-size:18px}
        *{box-sizing:border-box}
        .screen{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:rgba(2,12,6,.66);padding:clamp(12px,3vw,40px);gap:12px}
        header{display:flex;justify-content:space-between;align-items:center;gap:18px;max-width:1100px;width:100%;margin:auto}
        h1{font-family:PressStart2P,monospace;font-size:clamp(18px,3vw,30px);color:#a9e58c;margin:0;line-height:1.5}
        .label{color:#acbda2;font-size:16px;margin:4px 0 0}
        .stamp{font-family:PressStart2P,monospace;font-size:10px;line-height:1.8;border:3px double #d9b65f;color:#efd385;padding:10px;transform:rotate(-6deg);animation:stamp-in .65s ease-out both;text-align:center}
        main{overflow:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-color:#6ca661 #13251a;min-height:0;padding:8px 5px 16px}
        .files{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1100px;margin:auto}
        article{position:relative;min-width:0;padding:22px;border:1px solid #6b9364;background:rgba(5,23,12,.95);box-shadow:4px 4px 0 #0007;animation:open-file .5s ease-out both}
        article:first-child{grid-column:1/-1}
        article:nth-child(2){animation-delay:.12s}article:nth-child(3){animation-delay:.24s}
        .file-no{font-family:PressStart2P,monospace;font-size:10px;line-height:1.7;color:#a2be91}
        h2{font-family:SpecialElite,'Courier New',monospace;font-size:clamp(25px,3vw,34px);color:#f4d887;margin:12px 0 6px;line-height:1.2}
        h3{font-size:20px;color:#a9e58c;margin:0 0 12px;line-height:1.4}
        p{font-size:18px;line-height:1.5;margin:8px 0}
        .status{font-size:15px;color:#adc6a3;border-top:1px dashed #68835e;margin-top:16px;padding-top:12px}
        footer{max-width:1100px;width:100%;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .cursor{display:inline-block;animation:blink 1.2s steps(1) infinite;color:#a9e58c}
        button{font-family:PressStart2P,monospace;font-size:12px;line-height:1.6;min-height:44px;padding:10px 20px;background:#112a18;color:#e9d495;border:2px solid #a58944;cursor:pointer}
        button:hover{background:#24472a}button:focus-visible{outline:3px solid #f4d887;outline-offset:3px}
        .end{font-size:15px;color:#bed1b3}
        @keyframes stamp-in{0%{opacity:0;transform:scale(1.8) rotate(-15deg)}70%{opacity:1;transform:scale(.95) rotate(-6deg)}100%{transform:scale(1) rotate(-6deg)}}
        @keyframes open-file{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{50%{opacity:0}}
        @media(max-width:800px){.screen{padding:12px;gap:8px}.files{grid-template-columns:1fr}article:first-child{grid-column:auto}article{padding:16px}h1{font-size:18px}.stamp{font-size:8px;padding:6px}.label{font-size:14px}.end{display:none}}
        @media(max-height:450px){.screen{padding:8px 14px;gap:4px}.stamp{display:none}.label{display:none}header h1{font-size:18px}article{padding:16px}footer button{padding:8px 16px}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important}}
      </style>
      <div class="screen">
        <header><div><h1>PERSONS RESPONSIBLE</h1><p class="label">Mark Agency / Internal Affairs / Credits</p></div><div class="stamp">RESPONSIBILITY<br>CONFIRMED</div></header>
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
        <footer><span class="end">END OF FILE. THE PAPERWORK CONTINUES.<span class="cursor">_</span></span><button type="button">BACK TO SETTINGS</button></footer>
      </div>`;
    this._creditsPreviousFocus = document.activeElement;
    this._creditsHost = host;
    document.body.appendChild(host);
    const position = () => {
      const rect = this.game.canvas.getBoundingClientRect();
      Object.assign(host.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    };
    this._creditsPosition = position;
    this._creditsKeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.closeCredits(); }
      if (event.key === 'Tab') {
        const targets = [shadow.querySelector('main'), shadow.querySelector('button')];
        const current = targets.indexOf(shadow.activeElement);
        event.preventDefault();
        targets[(current + (event.shiftKey ? -1 : 1) + targets.length) % targets.length].focus();
      }
    };
    shadow.querySelector('button').addEventListener('click', () => this.closeCredits());
    host.addEventListener('keydown', this._creditsKeydown);
    window.addEventListener('resize', position, { passive: true });
    window.addEventListener('scroll', position, { passive: true });
    window.visualViewport?.addEventListener('resize', position, { passive: true });
    this.scale.on('resize', position);
    this._creditsObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(position) : null;
    this._creditsObserver?.observe(this.game.canvas);
    position();
    shadow.querySelector('button').focus({ preventScroll: true });
    this.events.once('shutdown', this.cleanupCredits, this);
    this.scene.bringToTop();
  }

  closeCredits() {
    if (this.isClosing) return;
    this.isClosing = true;
    playMenuActionAudio(this);
    this.scene.stop();
  }

  cleanupCredits() {
    this._creditsObserver?.disconnect();
    window.removeEventListener('resize', this._creditsPosition);
    window.removeEventListener('scroll', this._creditsPosition);
    window.visualViewport?.removeEventListener('resize', this._creditsPosition);
    this.scale.off('resize', this._creditsPosition);
    this._creditsHost?.remove();
    this._creditsHost = null;
    if (this._creditsPreviousFocus?.isConnected) this._creditsPreviousFocus.focus({ preventScroll: true });
    this._creditsPreviousFocus = null;
  }
}
