import { audioManager } from '../../managers/AudioManager.js';

export class CrimeLabAudioController {
  constructor(scene) {
    this.scene = scene;
    this.labAmbient = null;
    this.hasUnlockListener = false;
  }

  init() {
    audioManager.init(this.scene);

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => this.destroy()
    );
  }

  setupAudioUnlock() {
    if (this.hasUnlockListener) {
      return;
    }

    this.hasUnlockListener = true;

    this.scene.input.once('pointerdown', () => {
      if (this.scene.sound?.context?.state === 'suspended') {
        this.scene.sound.context.resume();
      }

      this.playLabAmbient();
    });
  }

  playLabAmbient() {
    if (this.labAmbient?.isPlaying) {
      return;
    }

    if (this.labAmbient) {
      this.labAmbient.destroy();
      this.labAmbient = null;
    }

    this.labAmbient = audioManager.playSfx('crimelab_ambient', {
      loop: true,
      volume: 0.28
    });
  }

  stopLabAmbient() {
    if (!this.labAmbient) {
      return;
    }

    this.labAmbient.stop();
    this.labAmbient.destroy();
    this.labAmbient = null;
  }

  destroy() {
    this.stopLabAmbient();
    this.hasUnlockListener = false;
  }
}