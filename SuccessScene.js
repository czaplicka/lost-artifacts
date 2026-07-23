import { gameState } from './GameData.js';

export class SuccessScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SuccessScene' });
        this.successSound = null;
    }

    create() {
        this.scene.sleep('UIScene');

        const music = this.registry.get('bgMusic');
        if (music && music.isPlaying) {
            music.stop();
        }

        this.successSound = this.sound.add('successsound', {
            volume: 0.5
        });
        this.successSound.play();

        const { width, height } = this.scale;

        if (this.textures.exists('backgrounds')) {
            this.add.image(width / 2, height / 2, 'backgrounds')
                .setDisplaySize(width, height);
        } else {
            console.warn('Missing texture: backgrounds');
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

        this.add.text(200, 290, `You captured:\n${thiefName}`, {
            fontFamily: 'PressStart2P',
            fontSize: '30px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        this.add.text(200, 410, 'The artifact is safe.\nThe agency confirms your success.', {
            fontFamily: 'PressStart2P',
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
            if (this.successSound?.isPlaying) {
                this.successSound.stop();
            }

            const againSceneExists = this.scene.manager.keys.AgainScene;

            if (!againSceneExists) {
                console.error('AgainScene is not registered in game config.');
                this.scene.start('MenuScene');
                return;
            }

            this.scene.start('AgainScene');
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.successSound?.isPlaying) {
                this.successSound.stop();
            }
            this.successSound = null;
        });
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}