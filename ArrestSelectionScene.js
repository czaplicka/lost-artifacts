import { gameState, saveGameState } from './GameData.js';
import { ensureHud } from './hudHelpers.js';
import {
    getRandomSuspectLineup,
    isCorrectSuspectChoice,
    getSuspectImageKey
} from './suspectHelpers.js';

export class ArrestSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ArrestSelectionScene' });

        this.dialogueText = null;
        this.resultOverlay = null;
        this.resultTitle = null;
        this.resultText = null;
        this.nextSceneKey = 'GameOverScene';

        this.selectedSuspectId = null;
        this.suspectsPool = [];
        this.displaySuspects = [];
        this.suspectCards = [];
        this.selectionLocked = false;
    }

    create() {
        this.scene.wake('UIScene');
        ensureHud(this);
        this.closeAllUIPanels();

        const suspectsData = this.cache.json.get('suspects');

        if (!Array.isArray(suspectsData) || suspectsData.length < 5) {
            console.error('suspects.json must contain at least 5 suspects.');
            this.scene.start('GameScene');
            return;
        }

        const thiefId = gameState.currentThief?.id || gameState.currentThiefId;

        if (!thiefId) {
            console.error('Missing current thief in gameState.');
            this.scene.start('GameScene');
            return;
        }

        this.suspectsPool = suspectsData;
        this.displaySuspects = getRandomSuspectLineup(suspectsData, thiefId, 5);

        if (!this.displaySuspects.length) {
            console.error('Failed to build suspect lineup.');
            this.scene.start('GameScene');
            return;
        }

        if (this.textures.exists('background2')) {
            this.add.image(this.scale.width / 2, this.scale.height / 2, 'background2')
                .setDisplaySize(this.scale.width, this.scale.height);
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        this.createBackButton();
        this.createHeader();
        this.createInstructionBox();
        this.createSuspectGrid();
        this.createResultOverlay();
    }

    createBackButton() {
        const backBtn = this.add.image(200, 70, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.5)
            .setDepth(30);

        this.addHoverEffect(backBtn, 0.5, 0.6);

        backBtn.on('pointerdown', () => {
            if (this.selectionLocked) return;
            this.closeAllUIPanels();
            this.scene.start('GameScene');
        });
    }

    createHeader() {
        this.add.text(this.scale.width / 2, 70, 'IDENTIFY THE THIEF', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
    }

    createInstructionBox() {
        const box = this.add.graphics();
        box.fillStyle(0x000000, 0.72);
        box.fillRoundedRect(90, 760, 1180, 180, 20);
        box.lineStyle(4, 0xffff00, 1);
        box.strokeRoundedRect(90, 760, 1180, 180, 20);

        this.dialogueText = this.add.text(140, 808, 'Choose the suspect who matches the clues.', {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: 1040 },
            lineSpacing: 12
        });
    }

    createSuspectGrid() {
        if (!Array.isArray(this.displaySuspects) || this.displaySuspects.length !== 5) {
            this.add.text(this.scale.width / 2, 450, 'Unable to create suspect lineup.', {
                fontFamily: 'PressStart2P',
                fontSize: '18px',
                color: '#ff5555'
            }).setOrigin(0.5);
            return;
        }

        const positions = [
            { x: 180, y: 430 },
            { x: 410, y: 430 },
            { x: 640, y: 430 },
            { x: 870, y: 430 },
            { x: 1100, y: 430 }
        ];

        this.displaySuspects.forEach((suspect, index) => {
            const card = this.createSuspectCard(
                suspect,
                positions[index].x,
                positions[index].y,
                index + 1
            );

            this.suspectCards.push(card);
        });
    }

    createSuspectCard(suspect, x, y, number) {
        const container = this.add.container(x, y);

        const frame = this.add.rectangle(0, 0, 180, 260, 0x111111, 0.82)
            .setStrokeStyle(4, 0xffffff, 1);

        const imageKey = getSuspectImageKey(suspect);

        let portrait;

        if (imageKey && this.textures.exists(imageKey)) {
            portrait = this.add.image(0, -25, imageKey)
                .setDisplaySize(140, 170);
        } else {
            portrait = this.add.rectangle(0, -25, 140, 170, 0x444444, 1)
                .setStrokeStyle(2, 0xffffff, 1);

            const missingText = this.add.text(0, -25, 'NO\nIMAGE', {
                fontFamily: 'PressStart2P',
                fontSize: '12px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            container.add(missingText);
        }

        const label = this.add.text(0, 88, `Suspect ${number}`, {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, 180, 260, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        container.add([frame, portrait, label, hitArea]);

        hitArea.on('pointerover', () => {
            if (this.selectionLocked) return;
            if (this.selectedSuspectId !== suspect.id) {
                frame.setStrokeStyle(4, 0xffff00, 1);
                container.setScale(1.03);
            }
        });

        hitArea.on('pointerout', () => {
            if (this.selectionLocked) return;
            if (this.selectedSuspectId !== suspect.id) {
                frame.setStrokeStyle(4, 0xffffff, 1);
                container.setScale(1);
            }
        });

        hitArea.on('pointerdown', () => {
            if (this.selectionLocked) return;

            this.selectionLocked = true;
            this.selectSuspect(suspect.id);

            this.time.delayedCall(180, () => {
                this.confirmSelection();
            });
        });

        container.frame = frame;
        container.suspectId = suspect.id;
        container.hitArea = hitArea;

        return container;
    }

    selectSuspect(suspectId) {
        this.selectedSuspectId = suspectId;

        this.suspectCards.forEach(card => {
            const isSelected = card.suspectId === suspectId;
            card.frame.setStrokeStyle(4, isSelected ? 0x00ff88 : 0xffffff, 1);
            card.setScale(isSelected ? 1.05 : 1);

            if (card.hitArea) {
                card.hitArea.disableInteractive();
            }
        });

        if (this.dialogueText) {
            this.dialogueText.setText('Selection locked. Verifying suspect...');
        }
    }

    confirmSelection() {
        const thiefId = gameState.currentThief?.id || gameState.currentThiefId;
        const isCorrect = isCorrectSuspectChoice(this.selectedSuspectId, thiefId);

        gameState.finalArrestSuspectId = this.selectedSuspectId || null;
        gameState.finalArrestResult = isCorrect ? 'SUCCESS' : 'FAILURE';
        gameState.caseResolved = isCorrect;
        gameState.caseFailed = !isCorrect;
        gameState.isGameActive = false;

        saveGameState();

        const title = isCorrect ? 'ARREST CONFIRMED' : 'WRONG SUSPECT';
        const message = isCorrect
            ? 'You identified the correct suspect.'
            : 'That is not the thief. The real suspect escaped.';

        const nextSceneKey = isCorrect ? 'SuccessScene' : 'GameOverScene';

        this.showResult(title, message, isCorrect, nextSceneKey);
    }

    createResultOverlay() {
        const { width, height } = this.scale;

        this.resultOverlay = this.add.container(0, 0)
            .setDepth(100)
            .setVisible(false);

        const darkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);

        const panel = this.add.rectangle(width / 2, height / 2, 760, 320, 0x111111, 0.96)
            .setStrokeStyle(5, 0xffff00, 1);

        this.resultTitle = this.add.text(width / 2, height / 2 - 70, '', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffff00',
            align: 'center'
        }).setOrigin(0.5);

        this.resultText = this.add.text(width / 2, height / 2 + 10, '', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 620 },
            lineSpacing: 12
        }).setOrigin(0.5);

        const continueBtn = this.add.rectangle(width / 2, height / 2 + 110, 250, 56, 0x7a5c14, 1)
            .setStrokeStyle(3, 0xffffff, 1)
            .setInteractive({ useHandCursor: true });

        const continueText = this.add.text(width / 2, height / 2 + 110, 'CONTINUE', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x9b761d, 1));
        continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x7a5c14, 1));

        continueBtn.on('pointerdown', () => {
            this.resultOverlay.setVisible(false);
            this.scene.start(this.nextSceneKey || 'GameOverScene');
        });

        this.resultOverlay.add([
            darkBg,
            panel,
            this.resultTitle,
            this.resultText,
            continueBtn,
            continueText
        ]);
    }

    showResult(title, message, isCorrect, nextSceneKey) {
        this.nextSceneKey = nextSceneKey || 'GameOverScene';
        this.resultTitle.setText(title);
        this.resultText.setText(message);
        this.resultTitle.setColor(isCorrect ? '#00ff88' : '#ff6666');
        this.resultOverlay.setVisible(true);
    }

    closeAllUIPanels() {
        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}