export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        this.add.image(0, 0, 'backgroundset')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080);

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
        panel.fillRect(670, 400, 600, 300);

        const backBtn = this.add.image(200, 930, 'back').setInteractive();
        backBtn.setScale(0.7);
        this.addHoverEffect(backBtn, 0.7, 0.8);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        let isSoundOn = this.registry.get('soundOn');
        if (isSoundOn === undefined) {
            isSoundOn = true;
            this.registry.set('soundOn', true);
        }

        const soundIcon = this.add.image(830, 540, isSoundOn ? 'soundOn' : 'soundOff')
            .setInteractive();
        soundIcon.setScale(0.8);
        this.addHoverEffect(soundIcon, 0.8, 0.9);

        const soundText = this.add.text(1120, 540, isSoundOn ? 'Sound On' : 'Sound Off', {
            fontFamily: 'PressStart2P',
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