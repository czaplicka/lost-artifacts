import { ScoreManager } from './ScoreManager.js';

export class HighscoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighscoreScene' });
        this.scoreManager = null;
    }

    create() {
        const { width, height } = this.scale;
        this.scoreManager = new ScoreManager();

        if (this.textures.exists('backgroundhi')) {
            this.add.image(width / 2, height / 2, 'backgroundhi')
                .setDisplaySize(width, height);
        }

        if (this.textures.exists('backgroundpc')) {
            this.add.image(width / 2, height / 2, 'backgroundpc')
                .setDisplaySize(width, height);
        }

        const music = this.registry.get('bgMusic');
        this.input.once('pointerdown', () => {
            if (music && !music.isPlaying) {
                music.play();
            }
        });

        const backBtn = this.add.image(width * 0.12, height * 0.86, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.7);

        this.addHoverEffect(backBtn, 0.7, 0.8);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        this.add.text(width / 2, height * 0.17, 'Interpol Database', {
            fontFamily: '"Press Start 2P", Arial',
            fontSize: '22px',
            color: '#0ea333',
            fontStyle: 'bold',
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.19, 'Most Successful Agents', {
            fontFamily: '"Press Start 2P", Arial',
            fontSize: '18px',
            color: '#0ea333',
            fontStyle: 'bold',
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0.5);

        const topScores = this.scoreManager.getScores();

        topScores.forEach((s, index) => {
            this.add.text(width * 0.29, height * 0.33 + (index * 50), `${s.name}: ${s.points}`, {
                fontSize: '28px',
                color: '#000000',
                fontFamily: '"Press Start 2P", Arial'
            });
        });
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}