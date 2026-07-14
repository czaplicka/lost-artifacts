import { ScoreManager } from './ScoreManager.js';

export class HighscoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighscoreScene' });
        this.scoreManager = new ScoreManager();
    }

    create() {
        // Tło
        this.add.image(0, 0, 'backgroundhi').setOrigin(0, 0).setDisplaySize(1920, 1080);
        this.add.image(0, 0, 'backgroundpc').setOrigin(0, 0).setDisplaySize(1920, 1080);

        // Obsługa muzyki
        const music = this.game.registry.get('bgMusic');
        this.input.once('pointerdown', () => {
            if (music && !music.isPlaying) {
                music.play();
            }
        });

        // Przycisk BACK
        const backBtn = this.add.image(200, 930, 'back').setInteractive();
        backBtn.setScale(0.7);
        this.addHoverEffect(backBtn);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
        
        let HiscoreText = this.add.text(950, 186, "Interpol Database", {
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

        let HiscoreText2 = this.add.text(950, 206, "Most Successful Agents", {
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

        // Wyświetlenie wyników (przykład)
        const topScores = this.scoreManager.getScores();
        topScores.forEach((s, index) => {
            this.add.text(550, 360 + (index * 50), `${s.name}: ${s.points}`, { 
                fontSize: '28px', fill: '#000000', fontFamily: 'PressStart2P',
            });
        });
    }

    // Metoda pomocnicza wewnątrz klasy
    addHoverEffect(button) {
        button.on('pointerover', () => button.setScale(0.8));
        button.on('pointerout', () => button.setScale(0.7));
    }
}