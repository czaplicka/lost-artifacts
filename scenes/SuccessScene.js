import { gameState } from '../GameData.js';
import { ScoreManager } from '../ScoreManager.js';
import { audioManager } from '../AudioManager.js';

export class SuccessScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SuccessScene' });
        this.scoreManager = null;
    }

    create() {
        audioManager.init(this);
        audioManager.stopAllMusic();
        audioManager.stopAllSfx();
        audioManager.playSfx('successsound');

        this.scene.sleep('UIScene');

        this.scoreManager = new ScoreManager();

        if (!gameState.scoreSaved) {
            const playerName =
                gameState.playerName ||
                gameState.agentName ||
                'Agent';

            const finalScore = Number.isFinite(gameState.score) ? gameState.score : 0;
            this.scoreManager.saveScore(playerName, finalScore);
            gameState.scoreSaved = true;
        }

        const { width, height } = this.scale;
        const centerX = width / 2;

        if (this.textures.exists('backgrounds')) {
            this.add.image(centerX, height / 2, 'backgrounds')
                .setDisplaySize(width, height);
        } else {
            console.warn('Missing texture: backgrounds');
            this.cameras.main.setBackgroundColor('#101010');
        }

        const overlay = this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.45);
        overlay.setDepth(0);

        const titleSize = Math.max(20, Math.floor(width * 0.04));
        const mainSize = Math.max(14, Math.floor(width * 0.022));
        const bodySize = Math.max(12, Math.floor(width * 0.018));
        const scoreSize = Math.max(14, Math.floor(width * 0.02));

        const textWidth = Math.min(width * 0.8, 760);

        this.add.text(centerX, height * 0.18, 'CASE SOLVED', {
            fontFamily: 'PressStart2P',
            fontSize: `${titleSize}px`,
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: textWidth, useAdvancedWrap: true }
        }).setOrigin(0.5);

        const thiefName = gameState.currentThief?.name || 'Unknown suspect';

        this.add.text(centerX, height * 0.34, `You captured:\n${thiefName}`, {
            fontFamily: 'PressStart2P',
            fontSize: `${mainSize}px`,
            color: '#ffffff',
            align: 'center',
            lineSpacing: 12,
            wordWrap: { width: textWidth, useAdvancedWrap: true }
        }).setOrigin(0.5);

        this.add.text(centerX, height * 0.52, 'The artifact is safe.\nThe agency confirms your success.', {
            fontFamily: 'PressStart2P',
            fontSize: `${bodySize}px`,
            color: '#f5f5f5',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: textWidth, useAdvancedWrap: true }
        }).setOrigin(0.5);

        this.add.text(centerX, height * 0.66, `Final score: ${gameState.score || 0}`, {
            fontFamily: 'PressStart2P',
            fontSize: `${scoreSize}px`,
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: textWidth, useAdvancedWrap: true }
        }).setOrigin(0.5);

        let nextBtn;

        if (this.textures.exists('next')) {
            nextBtn = this.add.image(centerX, height * 0.84, 'next')
                .setInteractive({ useHandCursor: true });

            const baseScale = Math.min(0.7, width / 1400);
            const hoverScale = baseScale + 0.08;

            nextBtn.setScale(baseScale);
            this.addHoverEffect(nextBtn, baseScale, hoverScale);
        } else {
            console.warn('Missing texture: next');

            nextBtn = this.add.text(centerX, height * 0.84, '[ NEXT ]', {
                fontFamily: 'PressStart2P',
                fontSize: `${Math.max(14, Math.floor(width * 0.018))}px`,
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { left: 12, right: 12, top: 10, bottom: 10 },
                align: 'center'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        }

        nextBtn.on('pointerdown', () => {
            audioManager.stopSfx('successsound');

            const againSceneExists = this.scene.manager.keys.AgainScene;

            if (!againSceneExists) {
                console.error('AgainScene is not registered in game config.');
                this.scene.start('MenuScene');
                return;
            }

            this.scene.start('AgainScene');
        });

        this.scale.on('resize', this.handleResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            audioManager.stopSfx('successsound');
        });
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        this.scene.restart();
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}