import { audioManager } from '../AudioManager.js';
import { UISlider } from '../ui/UISlider.js';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        audioManager.init(this);

        this.add.image(0, 0, 'backgroundset').setOrigin(0, 0).setDisplaySize(1920, 1080);

        const cx = 960;
        const cy = 540;
        const pw = 720;
        const ph = 620;

        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a2e, 0.92);
        panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 12);
        panel.lineStyle(3, 0xc9a227);
        panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 12);

        this.add.text(cx, cy - 250, 'SETTINGS', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#c9a227'
        }).setOrigin(0.5);

        const sliderX = cx - 280;
        const sliderW = 560;

        this.sfxSlider = new UISlider(
            this,
            sliderX,
            cy - 150,
            sliderW,
            'DIALOGUE & SFX',
            audioManager.getSfxVolume(),
            (v) => audioManager.setSfxVolume(v)
        );

        this.musicSlider = new UISlider(
            this,
            sliderX,
            cy - 50,
            sliderW,
            'MUSIC',
            audioManager.getMusicVolume(),
            (v) => audioManager.setMusicVolume(v)
        );

        this.createMuteToggle(cx, cy + 70);
        this.createButton(cx, cy + 210, 'BACK', () => {
            audioManager.playSfx('buttonclick');
            this.scene.start('MenuScene');
        });

        this.updateSliderStates(audioManager.getMuted());
    }

    createMuteToggle(x, y) {
        this.add.text(x - 200, y, 'SOUND:', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#e8d5a3'
        }).setOrigin(0, 0.5);

        this.muteLabel = this.add.text(x + 80, y, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#c9a227'
        }).setOrigin(0.5);

        this.muteLabel.setInteractive({ useHandCursor: true });
        this.muteLabel.on('pointerover', () => this.muteLabel.setScale(1.1));
        this.muteLabel.on('pointerout', () => this.muteLabel.setScale(1.0));
        this.muteLabel.on('pointerdown', () => {
            const muted = audioManager.toggleMute();
            this.refreshMuteLabel(muted);
            this.updateSliderStates(muted);
            if (!muted) audioManager.playSfx('buttonclick');
        });

        this.refreshMuteLabel(audioManager.getMuted());
    }

    refreshMuteLabel(muted) {
        this.muteLabel.setText(muted ? '[ OFF ]' : '[ ON ]');
        this.muteLabel.setColor(muted ? '#8b6914' : '#c9a227');
    }

    updateSliderStates(muted) {
        this.sfxSlider.setEnabled(!muted);
        this.musicSlider.setEnabled(!muted);
    }

    createButton(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            color: '#e8d5a3'
        }).setOrigin(0.5);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setScale(1.1));
        btn.on('pointerout', () => btn.setScale(1.0));
        btn.on('pointerdown', callback);
    }
}