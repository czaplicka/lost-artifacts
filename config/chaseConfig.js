import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const CHASE_CONFIG = Object.freeze({
  version: 2,
  decisionMs: 15000,
  startDistance: 50,
  escapeDistance: 100,
  timeoutPenalty: 12,
  maxRounds: 8,

  difficulty: {
    rookie: {
      follow: 0.95,
      shortcut: 0.82,
      desperate: 0.67
    },
    field: {
      follow: 0.85,
      shortcut: 0.68,
      desperate: 0.52
    },
    master: {
      follow: 0.75,
      shortcut: 0.54,
      desperate: 0.38
    }
  },

  moves: {
    follow: {
      gain: 5,
      loss: 6,
      label: __dialogueText("config/chaseConfig.js", "t_a30a98c131583011db9e")
    },
    shortcut: {
      gain: 18,
      loss: 12,
      label: __dialogueText("config/chaseConfig.js", "t_161a49b7f81487b03cd7")
    },
    desperate: {
      gain: 28,
      loss: 22,
      label: __dialogueText("config/chaseConfig.js", "t_8544911f9a1853bf63a9")
    }
  },

  assets: {
    images: {
      street: 'assets/chase/chase_street.webp',
      courtyard: 'assets/chase/chase_courtyard.webp',
      stairs: 'assets/chase/chase_stairs.webp',
      square: 'assets/chase/chase_square.webp'
    },

    audio: {
      music: '',
      steps: '',
      warning: '',
      success: '',
      failure: '',
      caught: '',
      escaped: ''
    }
  }
});