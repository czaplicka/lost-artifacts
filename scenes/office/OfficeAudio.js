import { audioManager } from '../../managers/AudioManager.js';

export const OfficeAudio = {
  setupAudioUnlock() {
    const token = this._runToken;

    const unlock = () => {
      this.offTrackedInputEvent(
        this.input,
        'pointerdown',
        unlock
      );

      if (!this.isCurrentOfficeRun(token)) return;

      try {
        const resume =
          this.sound?.context?.state === 'suspended'
            ? this.sound.context.resume()
            : null;

        if (resume?.catch) {
          void resume.catch(error => {
            console.warn(
              '[OfficeScene] Audio unlock failed:',
              error
            );
          });
        }

        this.playOfficeAmbient();
      } catch (error) {
        console.warn(
          '[OfficeScene] Audio unlock failed:',
          error
        );
      }
    };

    this.trackInputEvent(this.input, 'pointerdown', unlock);
  },

  playOfficeAmbient() {
    if (!this.isOfficeActive()) return null;

    if (this.officeAmbient?.isPlaying) {
      return this.officeAmbient;
    }

    audioManager.init(this);

    this.officeAmbient = audioManager.playAmbient(
      'officescenesound',
      { loop: true }
    );

    return this.officeAmbient;
  },

  _stopOfficeAmbient() {
    const sound = this.officeAmbient;
    this.officeAmbient = null;

    if (sound) {
      audioManager.releaseSound(sound);
    }
  }
};
