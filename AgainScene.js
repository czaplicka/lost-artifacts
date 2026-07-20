import { gameState } from './GameData.js';
import { ensureHud } from './hudHelpers.js';
import { setupNewGame } from './gameSetup.js';

export class AgainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AgainScene' });
        this.dialogueText = null;
        this.fullIntroText = '';
        this.typingEvent = null;
    }

    create() {
        this.scene.wake('UIScene');
        ensureHud(this);
        this.closeAllUIPanels();

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
        this.createChoiceButtons();

        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }

        const detectiveName = gameState.playerName || 'Detective';
        this.fullIntroText =
            `${detectiveName}, the agency has reviewed your last case.\n\n` +
            `There is always another trail, another thief, and another artifact at risk.\n\n` +
            `Are you ready to accept a new mission?`;

        this.typeText(this.dialogueText, this.fullIntroText, 24);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.typingEvent) {
                this.typingEvent.remove(false);
                this.typingEvent = null;
            }
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
    }

    createChoiceButtons() {
        const yesBtn = this.add.rectangle(560, 620, 260, 80, 0x2e6b3a, 1)
            .setStrokeStyle(4, 0xffffff, 1)
            .setInteractive({ useHandCursor: true });

        const yesText = this.add.text(560, 620, 'YES', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const noBtn = this.add.rectangle(820, 620, 260, 80, 0x7a2f2f, 1)
            .setStrokeStyle(4, 0xffffff, 1)
            .setInteractive({ useHandCursor: true });

        const noText = this.add.text(820, 620, 'NO', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        yesBtn.on('pointerover', () => yesBtn.setFillStyle(0x3d8a4c, 1));
        yesBtn.on('pointerout', () => yesBtn.setFillStyle(0x2e6b3a, 1));

        noBtn.on('pointerover', () => noBtn.setFillStyle(0x9a3e3e, 1));
        noBtn.on('pointerout', () => noBtn.setFillStyle(0x7a2f2f, 1));

        yesBtn.on('pointerdown', () => {
            const suspectsData = this.cache.json.get('suspects') || [];
            const missionsData = this.cache.json.get('missions') || [];
            const locationsData = this.cache.json.get('locations') || [];

            try {
                setupNewGame(suspectsData, missionsData, locationsData);
                this.scene.start('GameScene');
            } catch (error) {
                console.error('Failed to start a new mission:', error);
                if (this.dialogueText) {
                    this.dialogueText.setText('The agency could not prepare a new mission.');
                }
            }
        });

        noBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        this.add.existing(yesText);
        this.add.existing(noText);
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
                }
            }
        });
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}