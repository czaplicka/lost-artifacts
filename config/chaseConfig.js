export const CHASE_CONFIG = Object.freeze({
  decisionMs: 15000,
  startDistance: 50,
  escapeDistance: 100,
  timeoutPenalty: 12,
  maxRounds: 8,
  difficulty: {
    rookie: { follow: 0.95, shortcut: 0.80, desperate: 0.65 },
    field: { follow: 0.85, shortcut: 0.65, desperate: 0.50 },
    master: { follow: 0.75, shortcut: 0.50, desperate: 0.35 }
  },
  moves: {
    follow: { gain: 10, loss: 6, label: 'Reliable route' },
    shortcut: { gain: 18, loss: 12, label: 'Risky shortcut' },
    desperate: { gain: 28, loss: 22, label: 'High risk / high reward' }
  }
});
