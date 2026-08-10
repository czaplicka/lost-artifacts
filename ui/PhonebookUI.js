import { audioManager } from '../AudioManager.js';
import { EventBus } from '../EventBus.js';

export class PhonebookUI {
    constructor(scene, gameState = null) {
        this.scene = scene;
        this.gameState = gameState;
        this.isOpen = false;
        this.isCalling = false;
        this.overlay = null;
        this.container = null;
        this.boundToggleHandler = this.onToggleKeyDown.bind(this);

        this.currentCity = 'UNKNOWN CITY';
        this.policeAvailable = false;

        this.staticContacts = [
            { name: 'HQ', number: '555-0100', key: 'hq', available: true },
            { name: 'HOME', number: '555-0142', key: 'home', available: true },
            { name: 'CSI', number: '555-0177', key: 'csi', available: true },
            { name: 'INFORMANT', number: '555-0199', key: 'informant', available: true },
            { name: 'INSP. HOLMES', number: '555-0221', key: 'holmes', available: true },
            { name: 'SGT. WATSON', number: '555-0233', key: 'watson', available: true }
        ];

        this.entryPairs = [];
        this.statusText = null;

        this.dialSound = null;
        this.ringingSound = null;
        this.pickupSound = null;
        this.busySound = null;

        this.onCallCallback = null;

        this.create();
    }

    getContacts() {
        const policeContact = {
            name: `POLICE STATION (${this.currentCity.toUpperCase()})`,
            number: this.getPoliceNumber(),
            key: 'police',
            available: this.policeAvailable
        };

        return [...this.staticContacts, policeContact];
    }

    getPoliceNumber() {
        let hash = 0;

        for (let i = 0; i < this.currentCity.length; i++) {
            hash = (hash * 31 + this.currentCity.charCodeAt(i)) % 9000;
        }

        const suffix = String(1000 + hash).slice(-4);
        return `911-${suffix}`;
    }

    setCrimeCity(cityName) {
        this.currentCity = cityName || 'UNKNOWN CITY';
        this.policeAvailable = false;
        this.rebuildList();
    }

    unlockPoliceStation() {
        this.policeAvailable = true;
        this.rebuildList();
    }

    create() {
        const { width, height } = this.scene.scale;

        this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
            .setDepth(20)
            .setAlpha(0)
            .setVisible(false)
            .setInteractive();

        this.overlay.on('pointerdown', () => {
            this.close();
        });

        this.bookBg = this.scene.add.image(0, 0, 'phonebook')
            .setOrigin(0.5)
            .setScale(1.0)
            .setInteractive();

        this.closeBtnBg = this.scene.add.rectangle(660, -440, 56, 56, 0x8a1f1f, 0.9)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.closeHint = this.scene.add.text(660, -440, 'X', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#e0ff8c'
        }).setOrigin(0.5);

        this.closeBtnBg.on('pointerover', () => {
            this.closeBtnBg.setFillStyle(0xb02828, 1);
        });

        this.closeBtnBg.on('pointerout', () => {
            this.closeBtnBg.setFillStyle(0x8a1f1f, 0.9);
        });

        this.closeBtnBg.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.close();
        });

        this.titleText = this.scene.add.text(0, -400, 'PHONE BOOK', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#e0ff8c'
        }).setOrigin(0.5);

        this.statusText = this.scene.add.text(0, 420, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#8a1f1f'
        }).setOrigin(0.5).setAlpha(0);

        this.listGroup = this.scene.add.container(0, 0);

        this.container = this.scene.add.container(width / 2, height / 2, [
            this.bookBg,
            this.closeBtnBg,
            this.closeHint,
            this.titleText,
            this.listGroup,
            this.statusText
        ]);

        this.container.setDepth(21);
        this.container.setScale(1.0);
        this.container.setAlpha(0);
        this.container.setVisible(false);

        this.rebuildList();
        this.bindKeyboardShortcut();
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('P');
        this.scene.input.keyboard.on('keydown-P', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping) return;

        event.preventDefault();
        this.toggle();
    }

    rebuildList() {
        this.entryPairs.forEach(pair => {
            pair.nameText.destroy();
            pair.numberText.destroy();
            pair.separator.destroy();
        });

        this.entryPairs = [];

        const contacts = this.getContacts();
        const startY = -260;
        const rowHeight = 62;

        contacts.forEach((contact, index) => {
            const rowY = startY + index * rowHeight;
            const baseColor = contact.available ? '#0400ff' : '#7a7a7a';

            const nameText = this.scene.add.text(-330, rowY, contact.name, {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: baseColor
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            const numberText = this.scene.add.text(100, rowY, contact.number, {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: baseColor
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            const separator = this.scene.add.rectangle(-330, rowY + rowHeight / 2 - 10, 660, 1, 0x3a2a1a, 0.4)
                .setOrigin(0, 0.5);

            const pair = { nameText, numberText, separator, contact };

            const applyHover = () => {
                if (!this.isCalling) {
                    nameText.setColor('#8a1f1f');
                    numberText.setColor('#8a1f1f');
                }
            };

            const removeHover = () => {
                if (!this.isCalling) {
                    nameText.setColor(baseColor);
                    numberText.setColor(baseColor);
                }
            };

            const onDial = (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.dialContact(contact, pair);
            };

            [nameText, numberText].forEach(txt => {
                txt.on('pointerover', applyHover);
                txt.on('pointerout', removeHover);
                txt.on('pointerdown', onDial);
            });

            this.entryPairs.push(pair);
            this.listGroup.add([nameText, numberText, separator]);
        });
    }

    dialContact(contact, pair) {
        if (this.isCalling) return;

        this.isCalling = true;
        this.entryPairs.forEach(p => {
            p.nameText.disableInteractive();
            p.numberText.disableInteractive();
        });

        this.scene.tweens.add({
            targets: [pair.nameText, pair.numberText],
            scale: 1.15,
            duration: 90,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut'
        });

        pair.nameText.setColor('#8a1f1f');
        pair.numberText.setColor('#8a1f1f');
        this.setStatus(`Dialing: ${contact.number}...`);

        this.playDialSequence(contact);
    }

    playDialSequence(contact) {
        this.clearAudioRefs();
        this.dialSound = audioManager.playSfx('sfx_dial');

        const proceed = () => {
            if (!this.isCalling) return;
            if (contact.available) {
                this.startRinging(contact);
            } else {
                this.startBusyOrNoAnswer(contact);
            }
        };

        if (this.dialSound) {
            this.dialSound.once('complete', proceed);
            this.dialSound.once('stop', proceed);
        }

        this.scene.time.delayedCall(1200, () => {
            if (this.isCalling && !this.ringingSound && !this.busySound) {
                proceed();
            }
        });
    }

    startRinging(contact) {
        if (!this.isCalling) return;

        this.setStatus('Connecting...');
        this.ringingSound = audioManager.playPersistentLoop('sfx_ringing');
        this.pulseStatus();

        this.scene.time.delayedCall(1800, () => {
            if (this.isCalling) {
                this.connectCall(contact);
            }
        });
    }

    startBusyOrNoAnswer(contact) {
        if (!this.isCalling) return;

        const outcome = contact.key === 'police'
            ? 'no_answer'
            : (Math.random() < 0.5 ? 'busy' : 'no_answer');

        this.busySound = audioManager.playPersistentLoop('sfx_busy');

        this.setStatus(outcome === 'busy' ? 'Line busy...' : 'No answer...');
        this.pulseStatus();

        this.scene.time.delayedCall(2200, () => {
            if (this.isCalling) {
                this.abortCall(contact, outcome);
            }
        });
    }

    abortCall(contact, outcome) {
        this.stopCallAudio();

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(1);

        const message = contact.key === 'police'
            ? 'Police only respond once the city has been left.'
            : (outcome === 'busy' ? 'The line is busy. Try again later.' : 'No one is picking up.');

        this.setStatus(message);

        this.scene.time.delayedCall(1400, () => {
            this.isCalling = false;
            this.restoreEntryColors();
            this.entryPairs.forEach(p => {
                p.nameText.setInteractive({ useHandCursor: true });
                p.numberText.setInteractive({ useHandCursor: true });
            });
            this.clearStatus();
        });
    }

    restoreEntryColors() {
        this.entryPairs.forEach(pair => {
            const color = pair.contact.available ? '#0400ff' : '#7a7a7a';
            pair.nameText.setColor(color);
            pair.numberText.setColor(color);
        });
    }

    pulseStatus() {
        this.scene.tweens.killTweensOf(this.statusText);
        this.scene.tweens.add({
            targets: this.statusText,
            alpha: { from: 0.4, to: 1 },
            duration: 450,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    connectCall(contact) {
        this.stopLoopAudio();

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(1);

        this.pickupSound = audioManager.playSfx('sfx_pickup');
        this.setStatus(`Connected: ${contact.name}`);

        this.scene.time.delayedCall(600, () => {
            if (this.isCalling) {
                this.finishCall(contact);
            }
        });
    }

    finishCall(contact) {
        this.isCalling = false;
        this.restoreEntryColors();
        this.entryPairs.forEach(p => {
            p.nameText.setInteractive({ useHandCursor: true });
            p.numberText.setInteractive({ useHandCursor: true });
        });
        this.clearStatus();
        this.clearAudioRefs();

        if (this.onCallCallback) {
            this.onCallCallback(contact.key, contact);
        }

        this.scene.events.emit('phonebook-call', contact.key, contact);
        this.close();
    }

    setStatus(message) {
        this.statusText.setText(message);

        this.scene.tweens.add({
            targets: this.statusText,
            alpha: 1,
            duration: 150
        });
    }

    clearStatus() {
        this.scene.tweens.killTweensOf(this.statusText);

        this.scene.tweens.add({
            targets: this.statusText,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.statusText.setText('');
            }
        });
    }

    setContactAvailability(key, available) {
        const contact = this.staticContacts.find(c => c.key === key);

        if (contact) {
            contact.available = available;
            this.rebuildList();
        }
    }

    setOnCall(callback) {
        this.onCallCallback = callback;
    }

    open(gameState = null) {
        if (gameState) {
            this.gameState = gameState;

            const mission = gameState.currentMission || {};
            const newCity = mission.city || this.currentCity;

            if (newCity !== this.currentCity) {
                this.setCrimeCity(newCity);
            }

            this.policeAvailable = !!gameState.hasLeftCurrentCity;
            this.rebuildList();
        }

        if (this.isOpen) return;

        this.isOpen = true;
        EventBus.emit('hideHUD');
        this.overlay.setVisible(true);
        this.container.setVisible(true);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 1,
            duration: 220,
            ease: 'Power2'
        });
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.stopCallAudio();

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(0);
        this.statusText.setText('');

        this.isCalling = false;
        EventBus.emit('showHUD');
        this.restoreEntryColors();
        this.entryPairs.forEach(p => {
            p.nameText.setInteractive({ useHandCursor: true });
            p.numberText.setInteractive({ useHandCursor: true });
        });

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.container.setVisible(false);
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(this.gameState);
        }
    }

    stopLoopAudio() {
        if (this.ringingSound) {
            audioManager.stopSfx('sfx_ringing');
            this.ringingSound = null;
        }

        if (this.busySound) {
            audioManager.stopSfx('sfx_busy');
            this.busySound = null;
        }
    }

    stopCallAudio() {
        audioManager.stopSfx('sfx_dial');
        audioManager.stopSfx('sfx_ringing');
        audioManager.stopSfx('sfx_busy');
        audioManager.stopSfx('sfx_pickup');
        this.clearAudioRefs();
    }

    clearAudioRefs() {
        this.dialSound = null;
        this.ringingSound = null;
        this.pickupSound = null;
        this.busySound = null;
    }

    destroy() {
        EventBus.emit('showHUD');
        this.close();

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-P', this.boundToggleHandler);
        }

        this.entryPairs.forEach(pair => {
            pair.nameText?.destroy();
            pair.numberText?.destroy();
            pair.separator?.destroy();
        });
        this.entryPairs = [];

        this.container?.destroy(true);
        this.overlay?.destroy();
    }
}