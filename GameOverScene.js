export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
        this.gameOverSound = null;
    }

    create() {
        this.scene.sleep('UIScene');

        const music = this.registry.get('bgMusic');
        if (music && music.isPlaying) {
            music.stop();
        }

        this.gameOverSound = this.sound.add('game_over', {
            volume: 0.5
        });
        this.gameOverSound.play();

        this.add.image(0, 0, 'backgroundgo')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080);

        const backBtn = this.add.image(200, 930, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.7);

        this.addHoverEffect(backBtn, 0.7, 0.8);

        backBtn.on('pointerdown', () => {
            if (this.gameOverSound?.isPlaying) {
                this.gameOverSound.stop();
            }

            this.scene.start('MenuScene');
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.gameOverSound?.isPlaying) {
                this.gameOverSound.stop();
            }
            this.gameOverSound = null;
        });
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}