import { audioManager } from '../managers/AudioManager.js';
import { UISlider } from '../ui/UISlider.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class SettingsScene extends BaseScene {
  constructor() {
    super({ key: 'SettingsScene' });
    this.sfxSlider = null;
    this.musicSlider = null;
    this.muteLabel = null;
    this.restoreHudOnClose = false;
    this.isClosing = false;
    this.childBinding = null;
    this.childOpening = false;
    this.session = 0;
  }

  create() {
    super.create();
    this.session += 1;
    this.isClosing = false;
    this.childOpening = false;
    this.childBinding = null;
    this.input.enabled = true;
    audioManager.init(this);

    const hud = document.getElementById('hud-container');
    this.restoreHudOnClose = Boolean(hud && window.getComputedStyle(hud).display !== 'none');
    this.events.once('shutdown', this.handleSettingsShutdown, this);
    EventBus.emit('hideHUD');

    const bg = this.textures.exists('backgroundset')
      ? this.add.image(0, 0, 'backgroundset').setOrigin(0).setDisplaySize(1920, 1080)
      : this.add.rectangle(0, 0, 1920, 1080, 0x0d1320).setOrigin(0);
    bg.setDepth(0).setInteractive();
    bg.on('pointerdown', (_p, _x, _y, event) => event.stopPropagation());

    const cx = 960, cy = 540, pw = 760;
    const ph = this.restoreHudOnClose ? 760 : 620;
    const top = cy - ph / 2;
    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0x1a1a2e, 0.94);
    panel.fillRoundedRect(cx - pw / 2, top, pw, ph, 12);
    panel.lineStyle(3, 0xc9a227, 1);
    panel.strokeRoundedRect(cx - pw / 2, top, pw, ph, 12);

    this.add.text(cx, top + 60, 'SETTINGS', {
      fontFamily: 'PressStart2P', fontSize: '28px', color: '#c9a227'
    }).setOrigin(0.5).setDepth(20);

    this.sfxSlider = new UISlider(this, cx - 280, top + 130, 560,
      'DIALOGUE & SFX', audioManager.getSfxVolume(), value => audioManager.setSfxVolume(value));
    this.musicSlider = new UISlider(this, cx - 280, top + 230, 560,
      'MUSIC', audioManager.getMusicVolume(), value => audioManager.setMusicVolume(value));
    this.createMuteToggle(cx, top + 350);

    // Extra navigation belongs to the settings opened from the in-game HUD.
    if (this.restoreHudOnClose) {
      this.createButton(cx, top + 455, 'JUKEBOX', () => this.openChild('JukeboxScene'));
      this.createButton(cx, top + 535, 'HIGHSCORES', () => this.openChild('HighscoreScene'));
    }

    this.errorLabel = this.add.text(cx, top + ph - 130, '', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffb7a6',
      align: 'center', wordWrap: { width: 650 }
    }).setOrigin(0.5).setDepth(20);
    this.createButton(cx, top + ph - 65, 'BACK', () => this.closeSettings());
    this.applyAudioUiState(audioManager.getMuted());
    this.scene.setVisible(true);
    this.scene.bringToTop();
  }

  async openChild(key) {
    if (this.childOpening || this.childBinding || this.isClosing) return;
    this.childOpening = true;
    this.errorLabel.setText('');
    const session = this.session;
    let child = null;
    let onShutdown = null;
    try {
      if (key === 'JukeboxScene') {
        const { JukeboxScene } = await import('./JukeboxScene.js');
        if (session !== this.session || this._cleanupDone || this.isClosing) return;
        if (!this.game.scene.keys[key]) this.game.scene.add(key, JukeboxScene, false);
      } else if (!this.game.scene.keys[key]) {
        if (!this.game.sceneLoader?.ensure) throw new Error('SceneLoader is unavailable.');
        await this.game.sceneLoader.ensure(key);
      }
      if (session !== this.session || this._cleanupDone || this.isClosing) return;
      child = this.game.scene.keys[key];
      if (!child) throw new Error(`Scene not found: ${key}`);
      if (child.sys.isActive() || child.sys.isSleeping() || child.sys.isPaused()) {
        throw new Error('This screen is already open. Close it before opening it from settings.');
      }

      onShutdown = () => this.restoreAfterChild(key, session);
      this.childBinding = { key, child, onShutdown };
      child.events.once('shutdown', onShutdown);
      let opened = true;
      if (key === 'JukeboxScene') {
        this.scene.launch(key);
      } else {
        opened = await this.launchOverlay(key, { openedFromSettings: true });
      }
      if (session !== this.session || this._cleanupDone || this.isClosing) return;
      if (!opened) throw new Error('Could not open this screen.');
      this.input.enabled = false;
      this.scene.setVisible(false);
      this.scene.bringToTop(key);
    } catch (error) {
      child?.events.off('shutdown', onShutdown);
      if (session === this.session && !this._cleanupDone) {
        this.childBinding = null;
        this.input.enabled = true;
        this.scene.setVisible(true);
        this.errorLabel?.setText('Could not open this screen. Check the console.');
        console.error('[SettingsScene]', error);
      }
    } finally {
      if (session === this.session) this.childOpening = false;
    }
  }

  restoreAfterChild(key, session) {
    if (session !== this.session || this._cleanupDone || this.isClosing) return;
    if (this.childBinding?.key !== key) return;
    this.childBinding = null;
    this.childOpening = false;
    this.input.enabled = true;
    this.scene.setVisible(true);
    this.scene.bringToTop();
    audioManager.init(this);
    this.applyAudioUiState(audioManager.getMuted());
    EventBus.emit('hideHUD');
  }

  closeSettings() {
    if (this.isClosing || this.childOpening || this.childBinding) return;
    this.isClosing = true;
    audioManager.playSfx('buttonclick');
    this.scene.stop();
  }

  handleSettingsShutdown() {
    this.session += 1;
    const binding = this.childBinding;
    this.childBinding = null;
    if (binding) {
      binding.child.events.off('shutdown', binding.onShutdown);
      this.game.scene.stop(binding.key);
    }
    const restore = this.restoreHudOnClose;
    this.restoreHudOnClose = false;
    this.isClosing = false;
    this.childOpening = false;
    this.sfxSlider = null;
    this.musicSlider = null;
    this.muteLabel = null;
    this.errorLabel = null;
    if (restore) EventBus.emit('showHUD');
  }

  createMuteToggle(x, y) {
    this.add.text(x - 200, y, 'SOUND:', {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#e8d5a3'
    }).setOrigin(0, 0.5).setDepth(20);
    this.muteLabel = this.add.text(x + 80, y, '', {
      fontFamily: 'PressStart2P', fontSize: '16px', color: '#c9a227'
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    this.muteLabel.on('pointerover', () => this.muteLabel.setScale(1.1));
    this.muteLabel.on('pointerout', () => this.muteLabel.setScale(1));
    this.muteLabel.on('pointerdown', () => {
      const muted = audioManager.toggleMute();
      this.applyAudioUiState(muted);
      if (!muted) audioManager.playSfx('buttonclick');
    });
    this.refreshMuteLabel(audioManager.getMuted());
  }

  refreshMuteLabel(muted) {
    this.muteLabel?.setText(muted ? '[ OFF ]' : '[ ON ]');
    this.muteLabel?.setColor(muted ? '#8b6914' : '#c9a227');
  }

  applyAudioUiState(muted) {
    this.refreshMuteLabel(muted);
    this.sfxSlider?.setEnabled?.(!muted);
    this.musicSlider?.setEnabled?.(!muted);
    this.sfxSlider?.setValue?.(audioManager.getSfxVolume(), true);
    this.musicSlider?.setValue?.(audioManager.getMusicVolume(), true);
  }

  createButton(x, y, text, callback) {
    const button = this.add.text(x, y, text, {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#e8d5a3'
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setScale(1.1));
    button.on('pointerout', () => button.setScale(1));
    button.on('pointerdown', callback);
    return button;
  }
}
