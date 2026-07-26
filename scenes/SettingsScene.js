export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        this.scene.sleep('UIScene');
        const { width, height } = this.scale;

        if (this.textures.exists('backgroundset')) {
            this.add.image(width / 2, height / 2, 'backgroundset')
                .setDisplaySize(width, height);
        } else {
            this.cameras.main.setBackgroundColor('#111111');
        }

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

        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.7);
        panel.fillRect(width * 0.35, height * 0.37, width * 0.3, height * 0.28);

        const backBtn = this.add.image(width * 0.12, height * 0.86, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.7);

        this.addHoverEffect(backBtn, 0.7, 0.8);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        let isSoundOn = this.registry.get('soundOn');
        if (typeof isSoundOn !== 'boolean') {
            isSoundOn = true;
            this.registry.set('soundOn', true);
        }

        const soundIcon = this.add.image(width * 0.43, height * 0.5, isSoundOn ? 'soundOn' : 'soundOff')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(soundIcon, 0.8, 0.9);

        const soundText = this.add.text(width * 0.58, height * 0.5, isSoundOn ? 'Sound On' : 'Sound Off', {
            fontFamily: '"Press Start 2P", Arial',
            fontSize: '32px',
            color: '#FFFF00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.sound.mute = !isSoundOn;

        soundIcon.on('pointerdown', () => {
            isSoundOn = !isSoundOn;

            this.registry.set('soundOn', isSoundOn);
            soundIcon.setTexture(isSoundOn ? 'soundOn' : 'soundOff');
            soundText.setText(isSoundOn ? 'Sound On' : 'Sound Off');
            this.sound.mute = !isSoundOn;
        });
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}