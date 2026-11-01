import { audioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

const DESIGN_W = 1400;
const DESIGN_H = 960;
const POLL_MS = 100;
const QUIET_MS = 250;

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
                this.root.querySelector('button')?.focus();
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
        this.play('stopPersistentLoop', 'sfx_ringing');
    }

    open({ incidentCount = 1, onDone } = {}) {
        if (this.pending || this.root) return true;
        if (typeof document === 'undefined') return false;
        this.installHooks();
        this.pending = { incidentCount: Math.max(1, Number(incidentCount) || 1) };
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

    getBookSource() {
        const textures = this.getGame()?.textures;
        if (textures?.exists?.('phonebook')) {
            const source = textures.get('phonebook').getSourceImage();
            if (source?.src) return source.src;
            if (source?.toDataURL) return source.toDataURL();
        }
        return new URL('../assets/phonebook.webp', import.meta.url).href;
    }

    build() {
        if (!this.pending || this.root || this.isHollyBusy()) return;
        this.previousFocus = document.activeElement;
        const root = document.createElement('div');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Mark Agency HQ telephone call');
        Object.assign(root.style, {
            position: 'fixed', inset: '0', zIndex: '2147483647',
            background: 'rgba(0,0,0,.45)', overflow: 'hidden', pointerEvents: 'auto'
        });
        const book = document.createElement('div');
        Object.assign(book.style, {
            position: 'absolute', left: '50%', top: '50%', width: `${DESIGN_W}px`,
            height: `${DESIGN_H}px`, transformOrigin: '50% 50%'
        });
        const art = document.createElement('img');
        art.src = this.getBookSource();
        art.alt = '';
        art.draggable = false;
        Object.assign(art.style, {
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none', userSelect: 'none'
        });
        const title = document.createElement('div');
        title.textContent = this.answered ? 'CONNECTED: HQ' : 'INCOMING CALL';
        Object.assign(title.style, {
            position: 'absolute', top: '65px', left: '0', width: '100%', textAlign: 'center',
            fontFamily: 'PressStart2P, monospace', fontSize: '28px', lineHeight: '1.4', color: '#e0ff8c'
        });
        const caller = document.createElement('div');
        Object.assign(caller.style, {
            position: 'absolute', left: '370px', top: '200px', width: '660px',
            display: 'flex', justifyContent: 'space-between', paddingBottom: '18px',
            borderBottom: '1px solid rgba(58,42,26,.4)',
            fontFamily: 'SpecialElite, serif', fontSize: '22px', color: '#0400ff'
        });
        const name = document.createElement('span'); name.textContent = 'HQ';
        const number = document.createElement('span'); number.textContent = '555-0100';
        caller.append(name, number);
        const transcript = document.createElement('div');
        transcript.setAttribute('aria-live', 'polite');
        Object.assign(transcript.style, {
            position: 'absolute', left: '370px', top: '275px', width: '660px', height: '415px',
            overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box',
            paddingRight: '12px', whiteSpace: 'pre-line', fontFamily: 'SpecialElite, serif',
            fontSize: '24px', lineHeight: '1.45', color: '#3a2a1a'
        });
        transcript.textContent = this.answered ? this.getTranscript()
            : 'Mark Agency would like a word. Preferably while you are conscious.';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = this.answered ? 'UNDERSTOOD' : 'ANSWER';
        Object.assign(button.style, {
            position: 'absolute', left: '50%', top: '735px', transform: 'translateX(-50%)',
            padding: '18px 26px', minHeight: '56px', border: '0', borderRadius: '0',
            background: 'rgba(138,31,31,.9)', color: '#e0ff8c', cursor: 'pointer',
            fontFamily: 'PressStart2P, monospace', fontSize: '18px', lineHeight: '1.5'
        });
        button.addEventListener('mouseenter', () => { button.style.background = '#b02828'; });
        button.addEventListener('mouseleave', () => { button.style.background = 'rgba(138,31,31,.9)'; });
        button.addEventListener('click', () => {
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
            title.textContent = 'CONNECTED: HQ';
            transcript.textContent = this.getTranscript();
            transcript.scrollTop = 0;
            button.textContent = 'UNDERSTOOD';
        });
        const status = document.createElement('div');
        status.textContent = 'MARK AGENCY / PERSONNEL DEPARTMENT';
        Object.assign(status.style, {
            position: 'absolute', left: '0', top: '885px', width: '100%', textAlign: 'center',
            fontFamily: 'SpecialElite, serif', fontSize: '24px', color: '#8a1f1f'
        });
        book.append(art, title, caller, transcript, button, status);
        root.append(book);
        this.root = root;
        document.body.append(root);
        const fit = () => {
            const game = this.getGame();
            const bounds = game?.canvas?.getBoundingClientRect?.();
            const viewportW = window.innerWidth, viewportH = window.innerHeight;
            const w = bounds?.width || viewportW, h = bounds?.height || viewportH;
            const scale = Math.max(.01, Math.min((w - 24) / DESIGN_W, (h - 24) / DESIGN_H, 1));
            book.style.left = `${bounds ? bounds.left + w / 2 : viewportW / 2}px`;
            book.style.top = `${bounds ? bounds.top + h / 2 : viewportH / 2}px`;
            book.style.transform = `translate(-50%, -50%) scale(${scale})`;
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
        button.focus({ preventScroll: true });
        if (!this.answered) {
            this.ringing = true;
            this.play('playPersistentLoop', 'sfx_ringing');
        }
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
        this.observer?.disconnect(); this.observer = null;
        if (typeof window !== 'undefined' && this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = null;
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.keyHandler, true);
            document.removeEventListener('keyup', this.keyHandler, true);
        }
        this.root?.remove(); this.root = null;
        if (hadView && showHUD) EventBus.emit('showHUD');
        if (showHUD && this.previousFocus?.isConnected) this.previousFocus.focus?.();
        this.previousFocus = null;
    }

    destroy() {
        clearTimeout(this.timer); this.timer = null;
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