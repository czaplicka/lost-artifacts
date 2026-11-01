import { audioManager } from '../managers/AudioManager.js';

export class HQExhaustionCallUI {
    constructor() {
        this.root = null;
        this.ringing = false;
        this.onDone = null;
        this.previousFocus = null;
        this.keyHandler = event => {
            if (!this.root) return;
            event.stopImmediatePropagation();
            if (event.key === 'Tab') {
                event.preventDefault();
                this.root.querySelector('button')?.focus();
            }
        };
    }
    get isOpen() { return Boolean(this.root); }
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
        if (this.root || typeof document === 'undefined' || !document.body) return false;
        this.onDone = onDone;
        this.previousFocus = document.activeElement;
        const root = document.createElement('div');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Incoming call from Mark Agency HQ');
        Object.assign(root.style, {
            position: 'fixed', inset: '0', zIndex: '2147483647',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.88)', padding: '18px', boxSizing: 'border-box',
            pointerEvents: 'auto', overflow: 'auto'
        });
        const panel = document.createElement('section');
        Object.assign(panel.style, {
            width: 'min(690px,100%)', maxHeight: '90dvh', overflow: 'auto',
            boxSizing: 'border-box', background: '#eee0bd', color: '#302319',
            border: '4px solid #8a1f1f', padding: 'clamp(20px,4vw,38px)',
            boxShadow: '0 18px 70px #000', fontFamily: 'SpecialElite, serif'
        });
        const title = document.createElement('h2');
        title.textContent = 'INCOMING CALL';
        Object.assign(title.style, {
            fontFamily: 'PressStart2P, monospace', color: '#8a1f1f',
            fontSize: 'clamp(14px,3vw,21px)', lineHeight: '1.8', margin: '0 0 18px'
        });
        const caller = document.createElement('div');
        caller.textContent = 'HQ  /  555-0100';
        Object.assign(caller.style, {
            fontSize: '24px', color: '#0400ff', paddingBottom: '16px',
            borderBottom: '1px solid #8b795a', marginBottom: '20px'
        });
        const transcript = document.createElement('div');
        transcript.setAttribute('aria-live', 'polite');
        transcript.textContent = 'Mark Agency would like a word. Preferably while you are conscious.';
        Object.assign(transcript.style, {
            fontSize: 'clamp(18px,2.5vw,22px)', lineHeight: '1.55', whiteSpace: 'pre-line'
        });
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'ANSWER';
        Object.assign(button.style, {
            fontFamily: 'PressStart2P, monospace', fontSize: '12px', lineHeight: '1.7',
            color: '#e0ff8c', background: '#8a1f1f', border: '2px solid #4c1616',
            padding: '14px 20px', marginTop: '24px', cursor: 'pointer', minHeight: '48px'
        });
        let answered = false;
        button.addEventListener('click', () => {
            if (answered) {
                const done = this.onDone;
                this.onDone = null;
                this.destroy();
                done?.();
                return;
            }
            answered = true;
            this.stopRing();
            this.play('playSfx', 'sfx_pickup');
            title.textContent = 'CONNECTED: HQ';
            const opening = incidentCount > 1
                ? 'Agent, we have already discussed this. This is another exhaustion incident on your record.'
                : 'Agent, we recover lost artefacts. We do not want to add you to the inventory.';
            transcript.textContent = [
                opening,
                'Sleeping under a bridge is not undercover work. That is simply being under a bridge.',
                'We have arranged a free bed at the Agency Motel. Use it. Eat regularly. Get some sleep before your body files a formal complaint.',
                'Consider this an official warning. Another incident like this could cost you your job.',
                'AGENT: Understood. No more accommodation with a river view.'
            ].join('\n\n');
            button.textContent = 'UNDERSTOOD';
            panel.scrollTop = 0;
        });
        panel.append(title, caller, transcript, button);
        root.append(panel);
        this.root = root;
        document.body.append(root);
        document.addEventListener('keydown', this.keyHandler, true);
        document.addEventListener('keyup', this.keyHandler, true);
        button.focus();
        this.ringing = true;
        this.play('playPersistentLoop', 'sfx_ringing');
        return true;
    }
    destroy() {
        this.stopRing();
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.keyHandler, true);
            document.removeEventListener('keyup', this.keyHandler, true);
        }
        this.root?.remove();
        this.root = null;
        this.onDone = null;
        if (this.previousFocus?.isConnected) this.previousFocus.focus?.();
        this.previousFocus = null;
    }
}
