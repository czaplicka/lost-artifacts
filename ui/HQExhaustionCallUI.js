import { audioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

const DESIGN_W = 400;
const DESIGN_H = 720;
const POLL_MS = 100;
const QUIET_MS = 250;

function drawPhone() {
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const keypad = labels.map((label, index) => {
    const x = 95 + (index % 3) * 75;
    const y = 465 + Math.floor(index / 3) * 47;
    return `<rect x="${x}" y="${y}" width="60" height="35" rx="3"
      fill="#2a2f3a" stroke="#14171d" stroke-width="2"/>
      <text x="${x + 30}" y="${y + 23}" fill="#a0aab0" text-anchor="middle"
      font-family="PressStart2P,monospace" font-size="12">${label}</text>`;
  }).join('');
  return `<svg viewBox="0 0 400 720" width="400" height="720" aria-hidden="true"
    focusable="false" style="display:block;pointer-events:none;user-select:none">
    <rect x="10" y="20" width="380" height="680" rx="16"
      fill="#1e222a" stroke="#3a3f4d" stroke-width="4"/>
    <rect x="20" y="30" width="360" height="660" rx="12" fill="#14171d"/>
    <rect x="160" y="65" width="80" height="10" rx="4"
      fill="#0a0c0e" stroke="#2c313c" stroke-width="2"/>
    <rect x="45" y="100" width="310" height="300" rx="2"
      fill="#8bac0f" stroke="#0f380f" stroke-width="4"/>
    <rect x="49" y="104" width="302" height="292" rx="1"
      fill="none" stroke="#306230" stroke-width="2"/>
    <text x="200" y="435" fill="#7c8790" text-anchor="middle"
      font-family="PressStart2P,monospace" font-size="10">MARK AGENCY</text>
    ${keypad}
    <circle cx="200" cy="675" r="3" fill="#2c313c"/>
    </svg>`;
}

export class HQExhaustionCallUI {
  constructor() {
    this.root = null;
    this.ringing = false;
    this.onDone = null;
    this.previousFocus = null;
    this.pending = null;
    this.answered = false;
    this.timer = null;
    this.observer = null;
    this.hooksInstalled = false;
    this.awaitingHolly = false;
    this.clearSince = null;
    this.resizeHandler = null;
    this.phoneShell = null;
    this.statusText = null;
    this.callerText = null;
    this.transcript = null;
    this.actionButton = null;
    this.incomingView = null;
    this.onHollyRequested = () => {
      this.awaitingHolly = true;
      this.clearSince = null;
      if (this.root) this.removeView(false);
      this.schedule();
    };
    this.onHollyFinished = () => {
      this.awaitingHolly = false;
      this.clearSince = null;
      this.schedule();
    };
    this.keyHandler = event => {
      if (!this.root) return;
      event.stopImmediatePropagation();
      if (event.key === 'Tab') {
        event.preventDefault();
        this.actionButton?.focus();
      }
    };
    this.installHooks();
  }

  get isOpen() { return Boolean(this.root); }

  installHooks() {
    if (this.hooksInstalled) return;
    this.hooksInstalled = true;
    EventBus.on('firstForcedSleepStory', this.onHollyRequested);
    EventBus.on('hollyIntroFinished', this.onHollyFinished);
    EventBus.on('hollySleepFinished', this.onHollyFinished);
  }

  getGame() {
    return typeof window !== 'undefined' ? window.game || null : null;
  }

  isHollyBusy() {
    const manager = this.getGame()?.scene;
    const hud = manager?.keys?.PlayerHudScene;
    if (hud?._sleepStoryInFlight) return true;
    const holly = manager?.keys?.HollyIntroScene;
    if (!holly?.sys) return this.awaitingHolly;
    const sys = holly.sys;
    if (sys.isActive?.() || sys.isPaused?.() || sys.isSleeping?.()) return true;
    const status = sys.settings?.status;
    const states = typeof Phaser !== 'undefined' ? Phaser.Scenes : null;
    if (states && [states.INIT, states.START, states.LOADING, states.CREATING]
      .filter(value => typeof value === 'number').includes(status)) return true;
    return this.awaitingHolly;
  }

  play(method, key) {
    try { audioManager[method](key); }
    catch (error) { console.warn('[HQ call] Audio unavailable:', key, error); }
  }

  stopRing() {
    if (!this.ringing) return;
    this.ringing = false;
    this.phoneShell?.classList.remove('hq-phone-ringing');
    this.play('stopPersistentLoop', 'sfx_ringing');
  }

  open({ incidentCount = 1, onDone } = {}) {
    if (this.pending || this.root) return true;
    if (typeof document === 'undefined') return false;
    this.installHooks();
    const number = Number(incidentCount);
    this.pending = { incidentCount: Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1 };
    this.onDone = onDone;
    this.answered = false;
    this.clearSince = null;
    this.schedule();
    return true;
  }

  schedule() {
    if (!this.pending || this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.tick();
    }, POLL_MS);
  }

  tick() {
    if (!this.pending) return;
    if (this.isHollyBusy()) {
      this.clearSince = null;
      if (this.root) this.removeView(false);
      this.schedule();
      return;
    }
    if (typeof document === 'undefined' || !document.body || document.hidden) {
      this.clearSince = null;
      this.schedule();
      return;
    }
    if (!this.root) {
      if (this.clearSince === null) this.clearSince = Date.now();
      if (Date.now() - this.clearSince >= QUIET_MS) this.build();
    }
    this.schedule();
  }

  build() {
    if (!this.pending || this.root || this.isHollyBusy()) return;
    if (typeof document === 'undefined' || !document.body) return;
    this.previousFocus = document.activeElement;
    const root = document.createElement('div');
    root.className = 'hq-exhaustion-phone';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Incoming telephone call from Mark Agency HQ');
    Object.assign(root.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      background: 'rgba(0,0,0,.75)', overflow: 'hidden', pointerEvents: 'auto'
    });
    const style = document.createElement('style');
    style.textContent = `
      .hq-exhaustion-phone * { box-sizing: border-box; }
      .hq-exhaustion-phone .hq-phone-ringing { animation: hq-phone-shake .16s linear infinite; }
      .hq-exhaustion-phone .hq-call-pulse { animation: hq-phone-blink 1s ease-in-out infinite; }
      .hq-exhaustion-phone button:hover,
      .hq-exhaustion-phone button:focus-visible { color: #9bbc0f !important; background: #0f380f !important; outline: 2px solid #0f380f; outline-offset: 3px; }
      .hq-exhaustion-phone .hq-call-transcript { scrollbar-width: thin; scrollbar-color: #306230 #8bac0f; }
      @keyframes hq-phone-shake {
        0%,100% { transform: translateX(-2px); }
        50% { transform: translateX(2px); }
      }
      @keyframes hq-phone-blink { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .hq-exhaustion-phone .hq-phone-ringing,
        .hq-exhaustion-phone .hq-call-pulse { animation: none; }
      }
    `;
    const fitBox = document.createElement('div');
    Object.assign(fitBox.style, {
      position: 'absolute', left: '50%', top: '50%',
      width: `${DESIGN_W}px`, height: `${DESIGN_H}px`, transformOrigin: '50% 50%'
    });
    const shell = document.createElement('div');
    Object.assign(shell.style, { position: 'relative', width: '400px', height: '720px' });
    const art = document.createElement('div');
    art.innerHTML = drawPhone();
    const screen = document.createElement('div');
    Object.assign(screen.style, {
      position: 'absolute', left: '55px', top: '110px', width: '290px', height: '280px',
      color: '#0f380f', display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      fontFamily: 'PressStart2P, monospace', padding: '5px 3px'
    });
    const bar = document.createElement('div');
    Object.assign(bar.style, { display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '15px' });
    const signal = document.createElement('span'); signal.textContent = 'Yll GSM';
    const battery = document.createElement('span'); battery.textContent = '[===]';
    bar.append(signal, battery);
    const status = document.createElement('div');
    Object.assign(status.style, { fontSize: '12px', textAlign: 'center', lineHeight: '1.7', marginBottom: '8px' });
    const incoming = document.createElement('div');
    Object.assign(incoming.style, { textAlign: 'center', flex: '1', minHeight: '0' });
    const phoneIcon = document.createElement('div');
    phoneIcon.className = 'hq-call-pulse';
    phoneIcon.textContent = '☎';
    Object.assign(phoneIcon.style, { fontSize: '46px', lineHeight: '1.15', fontFamily: 'serif', marginBottom: '9px' });
    const caller = document.createElement('div');
    caller.textContent = 'MARK AGENCY HQ';
    Object.assign(caller.style, { fontSize: '12px', lineHeight: '1.7' });
    const number = document.createElement('div');
    number.textContent = '555-0100';
    Object.assign(number.style, { fontSize: '11px', marginTop: '8px', lineHeight: '1.5' });
    const ringing = document.createElement('div');
    ringing.className = 'hq-call-pulse';
    ringing.textContent = 'LINE ACTIVE...';
    Object.assign(ringing.style, { fontSize: '9px', marginTop: '10px', color: '#306230', lineHeight: '1.5' });
    incoming.append(phoneIcon, caller, number, ringing);
    const transcript = document.createElement('div');
    transcript.className = 'hq-call-transcript';
    transcript.setAttribute('aria-live', 'polite');
    Object.assign(transcript.style, {
      display: 'none', flex: '1', minHeight: '0', overflowY: 'auto',
      overscrollBehavior: 'contain', whiteSpace: 'pre-line', padding: '2px 8px 8px 3px',
      fontFamily: 'SpecialElite, serif', fontSize: '19px', lineHeight: '1.4'
    });
    const button = document.createElement('button');
    button.type = 'button';
    Object.assign(button.style, {
      alignSelf: 'center', flexShrink: '0', marginTop: '9px', minHeight: '36px',
      padding: '8px 12px', border: '0', borderRadius: '0',
      background: '#9bbc0f', color: '#0f380f', cursor: 'pointer',
      fontFamily: 'PressStart2P, monospace', fontSize: '10px', lineHeight: '1.6'
    });
    button.addEventListener('click', () => this.handleAction());
    screen.append(bar, status, incoming, transcript, button);
    shell.append(art, screen);
    fitBox.append(shell);
    root.append(style, fitBox);
    this.root = root;
    this.phoneShell = shell;
    this.statusText = status;
    this.callerText = caller;
    this.transcript = transcript;
    this.actionButton = button;
    this.incomingView = incoming;
    document.body.append(root);
    const fit = () => {
      const bounds = this.getGame()?.canvas?.getBoundingClientRect?.();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const w = bounds?.width || viewportW;
      const h = bounds?.height || viewportH;
      const scale = Math.max(.01, Math.min((w - 24) / DESIGN_W, (h - 24) / DESIGN_H, 1));
      fitBox.style.left = `${bounds ? bounds.left + w / 2 : viewportW / 2}px`;
      fitBox.style.top = `${bounds ? bounds.top + h / 2 : viewportH / 2}px`;
      fitBox.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    this.resizeHandler = fit;
    window.addEventListener('resize', fit);
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(fit);
      this.observer.observe(this.getGame()?.canvas || document.body);
    }
    fit();
    document.addEventListener('keydown', this.keyHandler, true);
    document.addEventListener('keyup', this.keyHandler, true);
    EventBus.emit('hideHUD');
    this.renderPhase();
    button.focus({ preventScroll: true });
    if (!this.answered) {
      this.ringing = true;
      shell.classList.add('hq-phone-ringing');
      this.play('playPersistentLoop', 'sfx_ringing');
    }
  }

  renderPhase() {
    if (!this.root) return;
    this.statusText.textContent = this.answered ? 'CONNECTED: HQ' : 'INCOMING CALL';
    this.incomingView.style.display = this.answered ? 'none' : 'block';
    this.transcript.style.display = this.answered ? 'block' : 'none';
    if (this.answered) {
      this.transcript.textContent = this.getTranscript();
      this.transcript.scrollTop = 0;
    }
    this.actionButton.textContent = this.answered ? '[ UNDERSTOOD ]' : '[ ANSWER ]';
    this.actionButton.setAttribute('aria-label', this.answered ? 'Finish the HQ telephone call' : 'Answer the HQ telephone call');
  }

  handleAction() {
    if (!this.pending || !this.root) return;
    if (this.isHollyBusy()) {
      this.clearSince = null;
      this.removeView(false);
      this.schedule();
      return;
    }
    if (this.answered) {
      const done = this.onDone;
      this.destroy();
      done?.();
      return;
    }
    this.answered = true;
    this.stopRing();
    this.play('playSfx', 'sfx_pickup');
    this.renderPhase();
  }

  getTranscript() {
    return [
      this.pending?.incidentCount > 1
        ? 'Agent, we have already discussed this. This is another exhaustion incident on your record.'
        : 'Agent, we recover lost artefacts. We do not want to add you to the inventory.',
      'Sleeping under a bridge is not undercover work. That is simply being under a bridge.',
      'We have arranged a free bed at the Agency Motel. Use it. Eat regularly. Get some sleep before your body files a formal complaint.',
      'Consider this an official warning. Another incident like this could cost you your job.',
      'AGENT: Understood. No more accommodation with a river view.'
    ].join('\n\n');
  }

  removeView(showHUD = true) {
    const hadView = Boolean(this.root);
    this.stopRing();
    this.observer?.disconnect();
    this.observer = null;
    if (typeof window !== 'undefined' && this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.keyHandler, true);
      document.removeEventListener('keyup', this.keyHandler, true);
    }
    this.root?.remove();
    this.root = null;
    this.phoneShell = this.statusText = this.callerText = this.transcript = null;
    this.actionButton = this.incomingView = null;
    if (hadView && showHUD) EventBus.emit('showHUD');
    if (showHUD && this.previousFocus?.isConnected) this.previousFocus.focus?.();
    this.previousFocus = null;
  }

  destroy() {
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.removeView(!this.isHollyBusy());
    this.onDone = null;
    this.answered = false;
    this.clearSince = null;
    this.awaitingHolly = false;
    if (this.hooksInstalled) {
      EventBus.off('firstForcedSleepStory', this.onHollyRequested);
      EventBus.off('hollyIntroFinished', this.onHollyFinished);
      EventBus.off('hollySleepFinished', this.onHollyFinished);
      this.hooksInstalled = false;
    }
  }
}