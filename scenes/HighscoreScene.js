import { ScoreManager } from '../ScoreManager.js';

export class HighscoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighscoreScene' });
        this.scoreManager = null;
    }

    create() {
        this.scene.sleep('UIScene');
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
            fontFamily: 'PressStart2P',
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

        this.add.text(width / 2, height * 0.22, 'Most Successful Agents', {
            fontFamily: 'PressStart2P',
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

        if (!topScores || topScores.length === 0) {
            this.add.text(width / 2, height * 0.45, 'No records found.', {
                fontSize: '24px',
                color: '#000000',
                fontFamily: 'PressStart2P,
                align: 'center'
            }).setOrigin(0.5);

            return;
        }

        const startY = height * 0.32;
        const rowHeight = 52;
        const rankX = width * 0.16;
        const nameX = width * 0.24;
        const pointsX = width * 0.72;

        topScores.forEach((s, index) => {
            const y = startY + (index * rowHeight);
            const rankLabel = `${index + 1}.`;
            const playerName = s.name || 'Anonymous';
            const playerPoints = Number.isFinite(s.points) ? s.points : 0;

            this.add.text(rankX, y, rankLabel, {
                fontSize: '20px',
                color: '#000000',
                fontFamily: 'PressStart2P'
            }).setOrigin(0, 0.5);

            this.add.text(nameX, y, playerName, {
                fontSize: '20px',
                color: '#000000',
                fontFamily: 'PressStart2P'
            }).setOrigin(0, 0.5);

            this.add.text(pointsX, y, `${playerPoints} pts`, {
                fontSize: '20px',
                color: '#000000',
                fontFamily: 'PressStart2P'
            }).setOrigin(1, 0.5);
        });
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}