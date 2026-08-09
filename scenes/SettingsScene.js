import { audioManager } from '../AudioManager.js';
import { UISlider } from '../ui/UISlider.js';
import { BaseScene } from './BaseScene.js';

export class SettingsScene extends BaseScene {
    constructor() {
        super({ key: 'SettingsScene' });
        this.sfxSlider = null;
        this.musicSlider = null;
        this.muteLabel = null;
    }

    create() {
            super.create();
        audioManager.init(this);

        const bg = this.add.image(0, 0, 'backgroundset')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080)
            .setDepth(0);

        bg.setInteractive();

        const cx = 960;
        const cy = 540;
        const pw = 720;
        const ph = 620;

        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a2e, 0.92);
        panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 12);
        panel.lineStyle(3, 0xc9a227, 1);
        panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 12);
        panel.setDepth(10);

        this.add.text(cx, cy - 250, 'SETTINGS', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#c9a227'
        }).setOrigin(0.5).setDepth(20);

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
            this.scene.stop();
        });

        this.applyAudioUiState(audioManager.getMuted());
    }

    createMuteToggle(x, y) {
        this.add.text(x - 200, y, 'SOUND:', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#e8d5a3'
        }).setOrigin(0, 0.5).setDepth(20);

        this.muteLabel = this.add.text(x + 80, y, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#c9a227'
        }).setOrigin(0.5).setDepth(20);

        this.muteLabel.setInteractive({ useHandCursor: true });
        this.muteLabel.on('pointerover', () => this.muteLabel.setScale(1.1));
        this.muteLabel.on('pointerout', () => this.muteLabel.setScale(1.0));
        this.muteLabel.on('pointerdown', () => {
            const muted = audioManager.toggleMute();
            this.applyAudioUiState(muted);
            if (!muted) audioManager.playSfx('buttonclick');
        });

        this.refreshMuteLabel(audioManager.getMuted());
    }

    refreshMuteLabel(muted) {
        this.muteLabel.setText(muted ? '[ OFF ]' : '[ ON ]');
        this.muteLabel.setColor(muted ? '#8b6914' : '#c9a227');
    }

    applyAudioUiState(muted) {
        this.refreshMuteLabel(muted);

        if (this.sfxSlider?.setEnabled) {
            this.sfxSlider.setEnabled(!muted);
        }
        if (this.musicSlider?.setEnabled) {
            this.musicSlider.setEnabled(!muted);
        }

if (this.sfxSlider?.setValue) {
    this.sfxSlider.setValue(audioManager.getSfxVolume(), true);
}
if (this.musicSlider?.setValue) {
    this.musicSlider.setValue(audioManager.getMusicVolume(), true);
}
    }

    createButton(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            color: '#e8d5a3'
        }).setOrigin(0.5).setDepth(20);

        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setScale(1.1));
        btn.on('pointerout', () => btn.setScale(1.0));
        btn.on('pointerdown', callback);
    }
}