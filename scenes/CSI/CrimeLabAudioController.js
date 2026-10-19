import { audioManager } from '../../managers/AudioManager.js';


export class CrimeLabAudioController {
  constructor(scene) {
    this.scene = scene;
    this.labAmbient = null;
    this.hasUnlockListener = false;
    this.isDestroyed = false;
    this.unlockHandler = null;
    this.shutdownHandler = () => this.destroy();
  }


  init() {
    this.isDestroyed = false;

    audioManager.init(this.scene);

    this.scene.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.shutdownHandler
    );

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.shutdownHandler
    );
  }


  setupAudioUnlock() {
    if (this.hasUnlockListener || this.isDestroyed) {
      return;
    }


    this.hasUnlockListener = true;


    this.unlockHandler = () => {
      this.unlockHandler = null;

      if (this.isDestroyed) {
        return;
      }

      if (this.scene.sound?.context?.state === 'suspended') {
        this.scene.sound.context.resume();
      }


      this.playLabAmbient();
    };


    this.scene.input.once('pointerdown', this.unlockHandler);
  }


  playLabAmbient() {
    if (this.isDestroyed || this.labAmbient?.isPlaying) {
      return;
    }


    if (this.labAmbient) {
      audioManager.releaseSound(this.labAmbient);
      this.labAmbient = null;
    }


    // playAmbient to kanał dla dźwięków zapętlonych.
    // playSfx zawsze gra jednorazowo, więc loop: true był tam ignorowany.
    this.labAmbient = audioManager.playAmbient('crimelab_ambient', {
      loop: true,
      volume: 0.28
    });
  }


  stopLabAmbient() {
    if (!this.labAmbient) {
      return;
    }


    audioManager.releaseSound(this.labAmbient);
    this.labAmbient = null;
  }


  destroy() {
    this.isDestroyed = true;

    this.scene?.events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.shutdownHandler
    );

    if (this.unlockHandler) {
      this.scene?.input?.off('pointerdown', this.unlockHandler);
      this.unlockHandler = null;
    }

    this.stopLabAmbient();
    this.hasUnlockListener = false;
  }
}