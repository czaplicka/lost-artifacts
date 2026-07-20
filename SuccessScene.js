import { gameState } from './GameData.js';

export class SuccessScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SuccessScene' });
    }

    create() {
        this.scene.sleep('UIScene');

        const music = this.registry.get('bgMusic');
        if (music && music.isPlaying) {
            music.stop();
        }

        const { width, height } = this.scale;

        if (this.textures.exists('backgroundgo')) {
            this.add.image(width / 2, height / 2, 'backgroundgo')
                .setDisplaySize(width, height);
        } else {
            console.warn('Missing texture: backgroundgo');
            this.cameras.main.setBackgroundColor('#101010');
        }

        this.add.text(width / 2, 180, 'CASE SOLVED', {
            fontFamily: 'PressStart2P',
            fontSize: '32px',
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        const thiefName = gameState.currentThief?.name || 'Unknown suspect';

        this.add.text(width / 2, 290, `You captured:\n${thiefName}`, {
            fontFamily: 'Special Elite',
            fontSize: '30px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        this.add.text(width / 2, 410, 'The artifact is safe.\nThe agency confirms your success.', {
            fontFamily: 'Special Elite',
            fontSize: '28px',
            color: '#f5f5f5',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        let nextBtn;

        if (this.textures.exists('next')) {
            nextBtn = this.add.image(200, height - 150, 'next')
                .setInteractive({ useHandCursor: true })
                .setScale(0.7);

            this.addHoverEffect(nextBtn, 0.7, 0.8);
        } else {
            console.warn('Missing texture: next');

            nextBtn = this.add.text(200, height - 150, '[ NEXT ]', {
                fontFamily: 'PressStart2P',
                fontSize: '20px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { left: 12, right: 12, top: 10, bottom: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        }

        nextBtn.on('pointerdown', () => {
            const againSceneExists = this.scene.manager.keys.AgainScene;

            if (!againSceneExists) {
                console.error('AgainScene is not registered in game config.');
                this.scene.start('MenuScene');
                return;
            }

            this.scene.start('AgainScene');
        });
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}