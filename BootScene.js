export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.audio('themeMusic', 'assets/audio/theme.mp3');
    }

    create() {
        const music = this.sound.add('themeMusic', {
            loop: true,
            volume: 0.5
        });

        this.registry.set('bgMusic', music);
        this.scene.start('PreloaderScene');
    }
}