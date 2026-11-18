import {
  CrimeLabAssistantDialog as CrimeLabAssistantDialogBase
} from './CrimeLabAssistantDialogBase.js';

import { audioManager } from '../../managers/AudioManager.js';

export class CrimeLabAssistantDialog extends CrimeLabAssistantDialogBase {
  playSfx(key, volume) {
    if (!key) return;

    try {
      audioManager.init(this.scene);

      audioManager.playSfx(key, {
        gain: volume,
        volume: audioManager.getSfxVolume() * volume
      });
    } catch (error) {
      // Dialogue audio is cosmetic; never interrupt a conversation.
    }
  }
}