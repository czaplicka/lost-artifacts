export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const music = this.registry.get('bgMusic');

        this.input.once('pointerdown', () => {
            this.sound.unlock();

            if (music && !music.isPlaying) {
                if (!this.sound.locked) {
                    music.play();
                } else {
                    this.sound.once('unlocked', () => {
                        if (!music.isPlaying) {
                            music.play();
                        }
                    });
                }
            }
        });

        this.add.image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080);

        const centerX = 1400;

        const startBtn = this.add.image(centerX, 420, 'btnStart').setInteractive();
        startBtn.setScale(0.8);
        this.addHoverEffect(startBtn);
        startBtn.on('pointerdown', () => this.scene.start('GameScene'));

        const settingsBtn = this.add.image(centerX, 580, 'btnSettings').setInteractive();
        settingsBtn.setScale(0.8);
        this.addHoverEffect(settingsBtn);
        settingsBtn.on('pointerdown', () => this.scene.start('SettingsScene'));

        const hiscoreBtn = this.add.image(centerX, 740, 'btnHiscore').setInteractive();
        hiscoreBtn.setScale(0.8);
        this.addHoverEffect(hiscoreBtn);
        hiscoreBtn.on('pointerdown', () => this.scene.start('HighscoreScene'));

        const exitBtn = this.add.image(centerX, 900, 'btnExit').setInteractive();
        exitBtn.setScale(0.8);
        this.addHoverEffect(exitBtn);
        exitBtn.on('pointerdown', () => this.scene.start('GameOverScene'));
    }

    addHoverEffect(button) {
        button.on('pointerover', () => button.setScale(0.9));
        button.on('pointerout', () => button.setScale(0.8));
    }
}