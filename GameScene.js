import { gameState } from './GameData.js';
import { ensureHud } from './hudHelpers.js';
import { GameTimeManager } from './GameTimeManager.js';
import { EventBus } from './EventBus.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.dialogueText = null;
        this.fullIntroText = '';
        this.typingEvent = null;
        this.introFinished = false;
        this.continueText = null;
        this.hasStartedOfficeScene = false;
    }

    create() {
        this.scene.wake('UIScene');
        this.timeManager = new GameTimeManager();

        EventBus.emit('advanceTime', 0, 0);

        const dialogueData = this.cache.json.get('dialogue');

        if (!gameState.currentMission || !gameState.currentThief) {
            console.error('GameScene started without initialized gameState.');
            this.scene.start('MenuScene');
            this.scene.launch('UIScene');
            return;
        }

        if (this.textures.exists('background2')) {
            this.add.image(this.scale.width / 2, this.scale.height / 2, 'background2')
                .setDisplaySize(this.scale.width, this.scale.height);
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        const backBtn = this.add.image(200, 70, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.5)
            .setDepth(30);

        this.addHoverEffect(backBtn, 0.5, 0.6);
        backBtn.on('pointerdown', () => {
            this.closeAllUIPanels();
            this.scene.start('MenuScene');
        });

        this.createDetectiveSection();
        ensureHud(this);

        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }

        if (!dialogueData || !Array.isArray(dialogueData.gameIntro)) {
            console.error('Brak dialogue.gameIntro w dialogue.json');
            this.dialogueText.setText('Brak intro sprawy.');
            return;
        }

        this.fullIntroText = dialogueData.gameIntro.join('\n');
        this.typeText(this.dialogueText, this.fullIntroText, 24);

        this.input.on('pointerdown', this.handleContinue, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.typingEvent) {
                this.typingEvent.remove(false);
                this.typingEvent = null;
            }

            this.input.off('pointerdown', this.handleContinue, this);
        });
    }

    createDetectiveSection() {
        const dialogueBox = this.add.graphics();
        dialogueBox.fillStyle(0x000000, 0.72);
        dialogueBox.fillRoundedRect(90, 700, 1180, 260, 20);
        dialogueBox.lineStyle(4, 0xffff00, 1);
        dialogueBox.strokeRoundedRect(90, 700, 1180, 260, 20);

        this.dialogueText = this.add.text(140, 748, '', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 1040 },
            lineSpacing: 14
        });

        this.continueText = this.add.text(1180, 920, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#ffff99'
        }).setOrigin(1, 1);
    }

    closeAllUIPanels() {
        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    typeText(target, text, speed = 20) {
        if (!target || typeof text !== 'string') return;

        if (this.typingEvent) {
            this.typingEvent.remove(false);
            this.typingEvent = null;
        }

        this.introFinished = false;
        this.continueText?.setText('');
        target.setText('');

        let index = 0;

        this.typingEvent = this.time.addEvent({
            delay: speed,
            repeat: text.length - 1,
            callback: () => {
                target.setText(text.slice(0, index + 1));
                index++;

                if (index >= text.length) {
                    this.typingEvent = null;
                    this.introFinished = true;
                    this.continueText?.setText('CLICK TO CONTINUE');
                }
            }
        });
    }

    handleContinue(pointer, currentlyOver) {
        if (this.hasStartedOfficeScene) return;

        if (!this.introFinished) {
            if (this.typingEvent) {
                this.typingEvent.remove(false);
                this.typingEvent = null;
            }

            this.dialogueText.setText(this.fullIntroText);
            this.introFinished = true;
            this.continueText?.setText('CLICK TO CONTINUE');
            return;
        }

        this.goToOfficeScene();
    }

    goToOfficeScene() {
        if (this.hasStartedOfficeScene) return;
        this.hasStartedOfficeScene = true;

        this.closeAllUIPanels();

        this.cameras.main.fadeOut(350, 0, 0, 0);

        this.time.delayedCall(360, () => {
            this.scene.start('OfficeScene', { gameState });
        });
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}