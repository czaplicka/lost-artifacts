import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';
import { saveManager } from '../saveGameService.js';
import { BaseScene } from './BaseScene.js';

export class MenuScene extends BaseScene {
    constructor() {
        super({ key: 'MenuScene' });

        this.authMode = 'guest';
        this.playerId = null;
        this.playerEmail = null;
        this.displayName = 'Guest';

        this.continueButton = null;
        this.menuMessage = null;
        this.hasAvailableSave = false;
    }

    init(data = {}) {
        this.authMode = data.authMode ?? 'guest';
        this.playerId = data.playerId ?? null;
        this.playerEmail = data.playerEmail ?? null;
        this.displayName = data.displayName ?? 'Guest';
    }

    async create() {
        super.create();
        audioManager.init(this);

        this.scene.sleep('UIScene');

        const { width, height } = this.scale;
        const centerX = width * 0.73;

        this.input.once('pointerdown', () => {
            if (this.sound.locked) {
                this.sound.unlock();
            }
        });

        if (this.textures.exists('background')) {
            this.add.image(width / 2, height / 2, 'background')
                .setDisplaySize(width, height);
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        this.showAccountStatus(width, height);

        const startBtn = this.add.image(
            centerX,
            height * 0.36,
            'btnStart',
        )
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(startBtn);

        startBtn.on('pointerdown', () => {
            this.startNewGame();
        });

        this.continueButton = this.add.image(
            centerX,
            height * 0.51,
            'btnContinue',
        )
            .setScale(0.8)
            .setAlpha(0.55)
            .setTint(0x777777);

        this.continueButton.on('pointerdown', () => {
            if (!this.hasAvailableSave) {
                this.showMessage('No saved case files available.');
                return;
            }

            this.continueLastGame();
        });

        this.continueButton.on('pointerover', () => {
            if (!this.hasAvailableSave) {
                return;
            }

            this.continueButton.setScale(0.9);
        });

        this.continueButton.on('pointerout', () => {
            this.continueButton.setScale(0.8);
        });

        const settingsBtn = this.add.image(
            centerX,
            height * 0.66,
            'btnSettings',
        )
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(settingsBtn);

        settingsBtn.on('pointerdown', () => {
            this.scene.launch('SettingsScene');
        });

        const hiscoreBtn = this.add.image(
            centerX,
            height * 0.81,
            'btnHiscore',
        )
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(hiscoreBtn);

        hiscoreBtn.on('pointerdown', () => {
            this.goto('HighscoreScene');
        });

        this.menuMessage = this.add.text(
            width * 0.06,
            height * 0.94,
            '',
            {
                fontFamily: 'Special Elite, monospace',
                fontSize: '18px',
                color: '#f3c870',
                align: 'left',
                wordWrap: {
                    width: width * 0.43,
                },
            },
        )
            .setOrigin(0, 0.5)
            .setDepth(100);

        await this.refreshContinueButton();
    }

    showAccountStatus(width, height) {
        const isAccount = this.authMode === 'account';

        const identity = isAccount
            ? `AGENT: ${this.displayName}`
            : 'GUEST MODE — LOCAL SAVES ONLY';

        this.add.text(
            width - 20,
            height - 20,
            identity,
            {
                fontFamily: 'Special Elite, monospace',
                fontSize: '17px',
                color: isAccount ? '#e3c77c' : '#b7b7b7',
                backgroundColor: 'rgba(0, 0, 0, 0.78)',
                stroke: '#000000',
                strokeThickness: 3,
                padding: {
                    left: 12,
                    right: 12,
                    top: 8,
                    bottom: 8,
                },
            },
        )
            .setOrigin(1, 1)
            .setDepth(200);
    }

    async refreshContinueButton() {
        try {
            const slots = await saveManager.listSlots();

            this.hasAvailableSave = slots.some((slot) => {
                return slot.preferredSource !== 'none';
            });

            this.updateContinueButton();
        } catch (error) {
            console.warn(
                '[MenuScene] Failed to retrieve save slots:',
                error,
            );

            this.hasAvailableSave = false;
            this.updateContinueButton();

            this.showMessage(
                'Archive connection unavailable. Local case files may still be available.',
            );
        }
    }

    updateContinueButton() {
        if (!this.continueButton) {
            return;
        }

        if (this.hasAvailableSave) {
            this.continueButton
                .clearTint()
                .setAlpha(1)
                .setInteractive({ useHandCursor: true });

            return;
        }

        this.continueButton
            .setTint(0x777777)
            .setAlpha(0.55)
            .setScale(0.8)
            .disableInteractive();
    }

    async continueLastGame() {
    if (!this.hasAvailableSave) {
        this.showMessage('No saved case files available.');
        return;
    }

    this.input.enabled = false;

    try {
        const loadedSave = await saveManager.loadLastUsed('newest');

        if (!loadedSave) {
            this.showMessage('No saved case files available.');

            this.input.enabled = true;
            this.hasAvailableSave = false;

            this.updateContinueButton();
            return;
        }

        const locationsData = this.cache.json.get('locations') || [];

        this.registry.set('gameState', gameState);

        this.registry.set(
            'locationsData',
            structuredClone(locationsData),
        );

        this.registry.set(
            'difficulty',
            gameState.difficulty || 'field',
        );

        const { getEnergyManager } = await import(
            '../EnergyManager.js'
        );

        const energyManager = getEnergyManager();

        energyManager.restore({
            energy: gameState.energy,
            difficulty: gameState.difficulty || 'field',
            energyLog: gameState.energyLog || [],
        });

        const sceneToResume = loadedSave.meta?.lastSceneKey || 'GameScene';

        this.scene.wake('UIScene');

        if (this.scene.isSleeping('EnergyHudScene')) {
            this.scene.wake('EnergyHudScene');
        } else if (!this.scene.isActive('EnergyHudScene')) {
            this.scene.launch('EnergyHudScene');
        }

        this.goto(sceneToResume, {
            fromSave: true,
            saveSlotKey: loadedSave.slotKey,
        });
    } catch (error) {
        console.error(
            '[MenuScene] Failed to load saved case:',
            error,
        );

        this.showMessage(
            'Unable to restore the case file. Please try again.',
        );

        this.input.enabled = true;
    }
}

    startNewGame() {
        this.input.enabled = false;

        this.goto('DifficultyScene', {
            authMode: this.authMode,
            playerId: this.playerId,
            playerEmail: this.playerEmail,
            displayName: this.displayName,
        });
    }

    showMessage(message) {
        this.menuMessage.setText(message);

        this.time.delayedCall(4500, () => {
            if (this.menuMessage?.active) {
                this.menuMessage.setText('');
            }
        });
    }

    addHoverEffect(button) {
        button.on('pointerover', () => {
            button.setScale(0.9);
        });

        button.on('pointerout', () => {
            button.setScale(0.8);
        });
    }
}