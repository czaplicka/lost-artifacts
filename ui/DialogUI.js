import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { audioManager } from '../managers/AudioManager.js';
import { storageRoomDialogues } from '../storageRoomDialogueService.js';

const VOICE_FILES = {
    intro: ['intro'],
    replacement: ['replacement', 'replacement2', 'replacement3'],
    return: ['return', 'return2']
};

// Optional exact start times in seconds, one entry per intro text line.
// Without timestamps the intro uses approximate text-weighted timings.
const INTRO_STARTS_SECONDS = null;

function voiceMode(entry) {
    if (entry.speaker !== storageRoomDialogues.speaker || !Array.isArray(entry.lines)) return null;
    return Object.keys(VOICE_FILES).find(mode => {
        const expected = storageRoomDialogues.manual[mode];
        return Array.isArray(expected) && expected.length === entry.lines.length &&
            expected.every((line, index) => line === entry.lines[index]);
    }) || null;
}

function introStarts(lines, duration) {
    if (Array.isArray(INTRO_STARTS_SECONDS) && INTRO_STARTS_SECONDS.length === lines.length &&
        INTRO_STARTS_SECONDS[0] === 0 && INTRO_STARTS_SECONDS.every((time, index, values) =>
            Number.isFinite(time) && time >= 0 && time < duration && (!index || time > values[index - 1]))) {
        return [...INTRO_STARTS_SECONDS];
    }
    const weights = lines.map(line => Math.max(1,
        (line.match(/\S+/g) || []).length + (line.match(/[.!?]/g) || []).length * 1.5 +
        (line.match(/[,;:]/g) || []).length * 0.5));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let elapsed = 0;
    return weights.map(weight => {
        const start = duration * elapsed / total;
        elapsed += weight;
        return start;
    });
}

export class DialogUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.lines = [];
        this.currentLineIndex = 0;
        this.typewriterTimer = null;
        this.isTyping = false;
        this.destroyed = false;
        this.choices = [];
        this.onClose = null;
        this.portraitSize = 140;
        this.session = 0;
        this.voiceRequest = 0;
        this.voiceSound = null;
        this.voiceMode = null;
        this.voiceBusy = false;
        this.cancelVoiceLoad = null;
        this.voicePoll = null;
        this.voiceComplete = null;
        this.boundHandleSceneShutdown = this.destroy.bind(this);
        this.create();
        this.bindSceneLifecycle();
    }

    bindSceneLifecycle() {
        this.scene.events?.once(Phaser.Scenes.Events.SHUTDOWN, this.boundHandleSceneShutdown);
        this.scene.events?.once(Phaser.Scenes.Events.DESTROY, this.boundHandleSceneShutdown);
    }

    unbindSceneLifecycle() {
        this.scene.events?.off(Phaser.Scenes.Events.SHUTDOWN, this.boundHandleSceneShutdown);
        this.scene.events?.off(Phaser.Scenes.Events.DESTROY, this.boundHandleSceneShutdown);
    }

    create() {
        const { width, height } = this.scene.scale;
        const boxWidth = Math.min(900, width * 0.8);
        const boxHeight = 260;
        this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setDepth(30).setAlpha(0).setVisible(false).setInteractive();
        this.overlay.on('pointerdown', () => this.advance());
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xf0e6d2, 1);
        graphics.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 10);
        graphics.lineStyle(4, 0x2b1e18, 1);
        graphics.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 10);
        this.portraitImage = this.scene.add.image(-boxWidth / 2 + 90, 0, 'portrait_fallback')
            .setDisplaySize(this.portraitSize, this.portraitSize);
        this.speakerText = this.scene.add.text(-boxWidth / 2 + 180, -boxHeight / 2 + 25, '', {
            fontFamily: 'PressStart2P', fontSize: '18px', color: '#2b1e18'
        });
        this.bodyText = this.scene.add.text(-boxWidth / 2 + 180, -boxHeight / 2 + 65, '', {
            fontFamily: 'SpecialElite', fontSize: '22px', color: '#1a1a1a',
            wordWrap: { width: boxWidth - 220 }, lineSpacing: 8
        });
        this.nextHint = this.scene.add.text(boxWidth / 2 - 30, boxHeight / 2 - 30,
            __dialogueText('ui/DialogUI.js', 't_2e522d1f0da2cc7d6f68'), {
                fontFamily: 'PressStart2P', fontSize: '20px', color: '#8a1f1f'
            }).setOrigin(0.5).setAlpha(0);
        this.nextHintTween = this.scene.tweens.add({
            targets: this.nextHint, y: '+=6', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        this.choiceContainer = this.scene.add.container(0, 0);
        this.container = this.scene.add.container(width / 2, height - 220, [
            graphics, this.portraitImage, this.speakerText, this.bodyText, this.nextHint, this.choiceContainer
        ]).setDepth(31).setAlpha(0).setVisible(false);
    }

    setPortrait(requestedKey) {
        const key = requestedKey && this.scene.textures.exists(requestedKey) ? requestedKey : 'portrait_fallback';
        const image = this.portraitImage;
        const size = this.portraitSize;
        image.setCrop();
        image.setTexture(key);
        image.setOrigin(0.5);
        if (key !== 'portrait_magazine') { image.setDisplaySize(size, size); return; }
        const sourceWidth = image.frame.realWidth || image.frame.width;
        const sourceHeight = image.frame.realHeight || image.frame.height;
        if (!sourceWidth || !sourceHeight) { image.setDisplaySize(size, size); return; }
        const cropSize = Math.min(sourceWidth, sourceHeight);
        image.setScale(size / cropSize);
        image.setCrop((sourceWidth - cropSize) / 2, (sourceHeight - cropSize) / 2, cropSize, cropSize);
    }

    stopTypewriter() {
        this.typewriterTimer?.destroy();
        this.typewriterTimer = null;
        this.isTyping = false;
    }

    stopVoice() {
        ++this.voiceRequest;
        this.cancelVoiceLoad?.();
        this.cancelVoiceLoad = null;
        clearInterval(this.voicePoll);
        this.voicePoll = null;
        const sound = this.voiceSound;
        this.voiceSound = null;
        if (sound && this.voiceComplete) sound.off('complete', this.voiceComplete);
        this.voiceComplete = null;
        this.voiceBusy = false;
        if (sound) audioManager.releaseSound(sound);
    }

    open(entry, options = {}) {
        if (this.destroyed) return;
        this.stopVoice();
        this.stopTypewriter();
        this.clearChoices();
        const session = ++this.session;
        this.voiceMode = voiceMode(entry);
        this.lines = [...(entry.lines || [])];
        this.currentLineIndex = 0;
        this.choices = options.choices || entry.choices || [];
        this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
        this.speakerText.setText(entry.speaker || __dialogueText('ui/DialogUI.js', 't_b764cdc0eab713746721'));
        this.setPortrait(entry.portraitKey);
        this.bodyText.setText('');
        this.nextHint.setAlpha(0);
        this.isOpen = true;
        this.overlay.setVisible(true);
        this.container.setVisible(true);
        this.scene.tweens.killTweensOf([this.overlay, this.container]);
        this.scene.tweens.add({
            targets: [this.overlay, this.container], alpha: 1, duration: 200, ease: 'Power2',
            onComplete: () => {
                if (!this.destroyed && this.isOpen && this.session === session) this.showLine(0);
            }
        });
    }

    showLine(index) {
        if (this.destroyed || !this.isOpen) return;
        if (index >= this.lines.length) { this.finishLines(); return; }
        this.currentLineIndex = index;
        this.stopTypewriter();
        this.nextHint.setAlpha(0);
        if (!this.voiceMode) {
            this.typewriteText(this.lines[index]);
            return;
        }
        this.bodyText.setText(this.lines[index]);
        if (this.voiceMode === 'intro' && index !== 0) return;
        this.playAlexVoice(this.voiceMode === 'intro' ? 'intro' : VOICE_FILES[this.voiceMode][index]);
    }

    fallbackToManual(request) {
        if (this.destroyed || !this.isOpen || request !== this.voiceRequest) return;
        this.stopVoice();
        this.voiceMode = null;
        this.nextHint.setAlpha(1);
    }

    playAlexVoice(name) {
        this.stopVoice();
        const request = this.voiceRequest;
        if (!name) { this.fallbackToManual(request); return; }
        this.voiceBusy = true;
        const key = `alex_murphy_voice_${name}`;
        const url = `assets/voice/Alex_Murphy/${name}.mp3`;
        const current = () => !this.destroyed && this.isOpen && this.voiceRequest === request;
        const play = () => {
            if (!current()) return;
            let sound;
            try {
                audioManager.init(this.scene);
                sound = audioManager.playVoice(key);
            } catch (error) {
                console.warn('[Alex voice] Playback unavailable:', url, error);
            }
            if (!sound) { this.fallbackToManual(request); return; }
            this.voiceSound = sound;
            const intro = this.voiceMode === 'intro';
            let started = Boolean(sound.isPlaying);
            const requestedAt = performance.now();
            this.voiceComplete = () => {
                if (!current()) return;
                this.stopVoice();
                if (intro) this.finishLines();
                else this.showLine(this.currentLineIndex + 1);
            };
            sound.once('complete', this.voiceComplete);
            this.voicePoll = setInterval(() => {
                if (!current()) return;
                if (sound.isPlaying) started = true;
                if (!started && performance.now() - requestedAt > 12000) {
                    this.fallbackToManual(request);
                    return;
                }
                if (!intro || !sound.isPlaying) return;
                const duration = Number(sound.duration);
                const position = Number(sound.seek);
                if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;
                const starts = introStarts(this.lines, duration);
                let index = 0;
                for (let i = 1; i < starts.length; i++) {
                    if (position >= starts[i]) index = i;
                    else break;
                }
                if (index !== this.currentLineIndex) {
                    this.currentLineIndex = index;
                    this.bodyText.setText(this.lines[index]);
                }
            }, 60);
        };
        if (this.scene.cache.audio.exists(key)) { play(); return; }
        const loader = this.scene.load;
        const event = `filecomplete-audio-${key}`;
        let settled = false;
        let timeout = null;
        const cleanup = () => {
            loader.off(event, loaded);
            loader.off('loaderror', failed);
            clearTimeout(timeout);
            if (this.cancelVoiceLoad === cancel) this.cancelVoiceLoad = null;
        };
        const cancel = () => {
            if (settled) return;
            settled = true;
            cleanup();
        };
        const loaded = () => {
            if (settled) return;
            settled = true;
            cleanup();
            play();
        };
        const fail = error => {
            if (settled) return;
            cancel();
            console.warn('[Alex voice] Continuing with manual text:', url, error || 'Audio unavailable');
            this.fallbackToManual(request);
        };
        const failed = file => { if (file.key === key) fail(); };
        this.cancelVoiceLoad = cancel;
        loader.once(event, loaded);
        loader.on('loaderror', failed);
        timeout = setTimeout(() => fail('Loading timeout'), 15000);
        try {
            loader.audio(key, url);
            if (!loader.isLoading()) loader.start();
        } catch (error) { fail(error); }
    }

    finishLines() {
        this.stopVoice();
        this.stopTypewriter();
        if (this.choices.length) this.showChoices();
        else this.close();
    }

    typewriteText(message, speedMs = 22) {
        this.stopTypewriter();
        this.isTyping = true;
        this.bodyText.setText('');
        let visibleText = '';
        const invisiblePad = message.replace(/[^ ]/g, ' ');
        this.typewriterTimer = this.scene.time.addEvent({
            delay: speedMs, loop: true,
            callback: () => {
                if (visibleText.length >= message.length) {
                    this.stopTypewriter();
                    this.nextHint.setAlpha(1);
                    return;
                }
                visibleText += message[visibleText.length];
                this.bodyText.setText(visibleText + invisiblePad.substring(visibleText.length));
            }
        });
    }

    advance() {
        if (!this.isOpen || this.choiceContainer.list.length) return;
        if (this.voiceBusy) {
            if (this.scene.sound?.locked) this.scene.sound.unlock?.();
            return;
        }
        if (this.isTyping) { this.skipTypewriter(); return; }
        this.showLine(this.currentLineIndex + 1);
    }

    skipTypewriter() {
        this.stopTypewriter();
        this.bodyText.setText(this.lines[this.currentLineIndex] || '');
        this.nextHint.setAlpha(1);
    }

    showChoices() {
        this.stopVoice();
        this.stopTypewriter();
        this.clearChoices();
        this.nextHint.setAlpha(0);
        this.bodyText.setText(__dialogueText('ui/DialogUI.js', 't_333536d7f7e725f8449d'));
        const buttonWidth = 330, buttonHeight = 42, startY = 35, spacing = 52;
        this.choices.forEach((choice, index) => {
            const y = startY + index * spacing;
            const buttonBg = this.scene.add.rectangle(0, y, buttonWidth, buttonHeight, 0x2b1e18, 1)
                .setOrigin(0.5).setStrokeStyle(2, 0x8a1f1f, 1).setInteractive({ useHandCursor: true });
            const buttonText = this.scene.add.text(0, y,
                choice.text || __dialogueText('ui/DialogUI.js', 't_628db0c7598820b10176'), {
                    fontFamily: 'PressStart2P', fontSize: '12px', color: '#f0e6d2',
                    align: 'center', wordWrap: { width: buttonWidth - 22 }
                }).setOrigin(0.5);
            buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x8a1f1f, 1));
            buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x2b1e18, 1));
            buttonBg.on('pointerdown', (pointer, localX, localY, event) => {
                event?.stopPropagation();
                this.selectChoice(choice);
            });
            this.choiceContainer.add([buttonBg, buttonText]);
        });
    }

    selectChoice(choice) {
        if (!this.isOpen) return;
        const callback = choice?.callback;
        this.choices = [];
        this.clearChoices();
        this.close();
        if (typeof callback === 'function') callback();
    }

    clearChoices() {
        this.choiceContainer?.removeAll(true);
    }

    close() {
        this.stopVoice();
        this.stopTypewriter();
        this.voiceMode = null;
        if (!this.isOpen) return;
        this.isOpen = false;
        this.choices = [];
        this.clearChoices();
        const session = ++this.session;
        const callback = this.onClose;
        this.onClose = null;
        this.scene.tweens.killTweensOf([this.overlay, this.container]);
        this.scene.tweens.add({
            targets: [this.overlay, this.container], alpha: 0, duration: 180, ease: 'Power2',
            onComplete: () => {
                if (this.destroyed || this.session !== session) return;
                this.overlay?.setVisible(false);
                this.container?.setVisible(false);
                if (typeof callback === 'function') callback();
            }
        });
    }

    destroy() {
        if (this.destroyed) return;
        this.stopVoice();
        this.stopTypewriter();
        this.voiceMode = null;
        ++this.session;
        this.destroyed = true;
        this.isOpen = false;
        this.choices = [];
        this.onClose = null;
        this.unbindSceneLifecycle();
        this.nextHintTween?.stop();
        this.nextHintTween?.remove();
        this.nextHintTween = null;
        if (this.scene?.tweens) {
            for (const object of [this.overlay, this.container, this.nextHint]) {
                if (object) this.scene.tweens.killTweensOf(object);
            }
        }
        this.clearChoices();
        this.container?.destroy(true);
        this.overlay?.destroy();
        for (const name of ['container', 'overlay', 'speakerText', 'bodyText', 'portraitImage', 'nextHint', 'choiceContainer']) {
            this[name] = null;
        }
    }
}