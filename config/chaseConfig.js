export const CHASE_CONFIG = Object.freeze({
  version: 2,
  decisionMs: 15000,
  startDistance: 50,
  escapeDistance: 100,
  timeoutPenalty: 12,
  maxRounds: 8,
  difficulty: {
    rookie: { follow: 0.95, shortcut: 0.82, desperate: 0.67 },
    field: { follow: 0.85, shortcut: 0.68, desperate: 0.52 },
    master: { follow: 0.75, shortcut: 0.54, desperate: 0.38 }
  },
  moves: {
    follow: { gain: 5, loss: 6, label: 'Reliable route' },
    shortcut: { gain: 18, loss: 12, label: 'Risky shortcut' },
    desperate: { gain: 28, loss: 22, label: 'High risk / high reward' }
  },
  // Empty URLs keep the prototype entirely asset-free.
  assets: {
    images: { street: '', courtyard: '', stairs: '', square: '' },
    audio: { music: '', steps: '', warning: '', success: '', failure: '', caught: '', escaped: '' }
  }
});
