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

        this.entryTexts = [];
        this.entryNumbers = [];
        this.entryRows = [];

        this.statusText = null;

        this.dialSound = null;
        this.ringSound = null;
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
            .setScale(0.9)
            .setInteractive();

        this.closeHint = this.scene.add.text(670, -445, 'X', {
            fontFamily: 'PressStart2P',
            fontSize: '50px',
            color: '#22222200'
        }).setInteractive({ useHandCursor: true });

        this.closeHint.on('pointerdown', (pointer, localX, localY, event) => {
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
            this.closeHint,
            this.titleText,
            this.listGroup,
            this.statusText
        ]);

        this.container.setDepth(21);
        this.container.setScale(0.9);
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
        this.entryTexts.forEach(t => t.destroy());
        this.entryNumbers.forEach(t => t.destroy());
        this.entryRows.forEach(r => r.destroy());

        this.entryTexts = [];
        this.entryNumbers = [];
        this.entryRows = [];

        const contacts = this.getContacts();
        const startY = -260;   // ← lekko wyżej, żeby lista miała więcej miejsca
        const rowHeight = 62;  // ← było 100, teraz 62 (mniejsze odstępy)

        contacts.forEach((contact, index) => {
            const rowY = startY + index * rowHeight;

            const nameText = this.scene.add.text(-380, rowY, contact.name, {
                fontFamily: 'Special Elite',
                fontSize: '22px',  // ← było 26px
                color: contact.available ? '#0400ff' : '#7a7a7a'
            }).setOrigin(0, 0.5);

            const numberText = this.scene.add.text(180, rowY, contact.number, {
                fontFamily: 'Special Elite',
                fontSize: '22px',  // ← było 26px
                color: contact.available ? '#0400ff' : '#7a7a7a'
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            numberText.on('pointerover', () => {
                if (!this.isCalling) {
                    numberText.setColor('#8a1f1f');
                }
            });

            numberText.on('pointerout', () => {
                if (!this.isCalling) {
                    numberText.setColor(contact.available ? '#0400ff' : '#7a7a7a');
                }
            });

            numberText.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.dialContact(contact, numberText);
            });

            const separator = this.scene.add.rectangle(-380, rowY + rowHeight / 2 - 10, 760, 1, 0x3a2a1a, 0.4)
                .setOrigin(0, 0.5);
            //                                                      ↑ grubość linii z 2 na 1px, offset z -18 na -10

            this.entryTexts.push(nameText);
            this.entryNumbers.push(numberText);
            this.entryRows.push(separator);

            this.listGroup.add([nameText, numberText, separator]);
        });
    }

    dialContact(contact, numberText) {
        if (this.isCalling) return;

        this.isCalling = true;
        this.entryNumbers.forEach(txt => txt.disableInteractive());

        this.scene.tweens.add({
            targets: numberText,
            scale: 1.15,
            duration: 90,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut'
        });

        numberText.setColor('#8a1f1f');
        this.setStatus(`Dialing: ${contact.number}...`);

        this.playDialSequence(contact);
    }

    playDialSequence(contact) {
        this.dialSound = this.scene.sound.add('sfx_dial', { volume: 0.6 });
        this.dialSound.play();

        const proceed = () => {
            if (contact.available) {
                this.startRinging(contact);
            } else {
                this.startBusyOrNoAnswer(contact);
            }
        };

        this.dialSound.once('complete', proceed);

        this.scene.time.delayedCall(1200, () => {
            if (this.isCalling && !this.ringSound && !this.busySound) {
                proceed();
            }
        });
    }

    startRinging(contact) {
        this.setStatus('Connecting...');

        this.ringSound = this.scene.sound.add('sfx_ring', { volume: 0.5, loop: true });
        this.ringSound.play();

        this.pulseStatus();

        this.scene.time.delayedCall(1800, () => {
            this.connectCall(contact);
        });
    }

    startBusyOrNoAnswer(contact) {
        const outcome = contact.key === 'police'
            ? 'no_answer'
            : (Math.random() < 0.5 ? 'busy' : 'no_answer');

        this.busySound = this.scene.sound.add('sfx_busy', { volume: 0.5, loop: true });
        this.busySound.play();

        this.setStatus(outcome === 'busy' ? 'Line busy...' : 'No answer...');
        this.pulseStatus();

        this.scene.time.delayedCall(2200, () => {
            this.abortCall(contact, outcome);
        });
    }

    abortCall(contact, outcome) {
        if (this.busySound) {
            this.busySound.stop();
            this.busySound.destroy();
            this.busySound = null;
        }

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(1);

        const message = contact.key === 'police-station'
            ? 'Police only respond once the city has been left.'
            : (outcome === 'busy' ? 'The line is busy. Try again later.' : 'No one is picking up.');

        this.setStatus(message);

        this.scene.time.delayedCall(1400, () => {
            this.isCalling = false;
            this.entryNumbers.forEach(txt => txt.setInteractive({ useHandCursor: true }));
            this.clearStatus();
        });
    }

    pulseStatus() {
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
        if (this.ringSound) {
            this.ringSound.stop();
            this.ringSound.destroy();
            this.ringSound = null;
        }

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(1);

        this.pickupSound = this.scene.sound.add('sfx_pickup', { volume: 0.7 });
        this.pickupSound.play();

        this.setStatus(`Connected: ${contact.name}`);

        this.scene.time.delayedCall(600, () => {
            this.finishCall(contact);
        });
    }

    finishCall(contact) {
        this.isCalling = false;
        this.entryNumbers.forEach(txt => txt.setInteractive({ useHandCursor: true }));
        this.clearStatus();

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

        if (this.dialSound) {
            this.dialSound.stop();
            this.dialSound.destroy();
            this.dialSound = null;
        }

        if (this.ringSound) {
            this.ringSound.stop();
            this.ringSound.destroy();
            this.ringSound = null;
        }

        if (this.busySound) {
            this.busySound.stop();
            this.busySound.destroy();
            this.busySound = null;
        }

        if (this.pickupSound) {
            this.pickupSound.stop();
            this.pickupSound.destroy();
            this.pickupSound = null;
        }

        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setAlpha(0);
        this.statusText.setText('');

        this.isCalling = false;
        this.entryNumbers.forEach(txt => txt.setInteractive({ useHandCursor: true }));

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

    destroy() {
        this.close();

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-P', this.boundToggleHandler);
        }

        this.container?.destroy(true);
        this.overlay?.destroy();
    }
}