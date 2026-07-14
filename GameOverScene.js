export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const music = this.registry.get('bgMusic');
        if (music && music.isPlaying) {
            music.stop();
        }

        this.add.image(0, 0, 'backgroundgo')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080);

        const backBtn = this.add.image(200, 930, 'back')
            .setInteractive()
            .setScale(0.7);

        this.addHoverEffect(backBtn, 0.7, 0.8);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}