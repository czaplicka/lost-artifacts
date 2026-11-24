import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { getTrustLevel } from '../../managers/TrustManager.js';

// Jedno zaufanie Holly dla wszystkich scen. Zapisuje je intro,
// a każda kolejna scena może je odczytać tą samą funkcją.
export const TRUST_KEY = 'holly_trust';
export const START_TRUST = 50;

// Tylko do wyświetlania stanu we wspólnym panelu rozmowy.
export const HOLLY_TRUST_VIEW_ID = 'holly_trust_view';

export const TRUST_BY_TONE = Object.freeze({
  serious: 10,
  sarcastic: -5,
  greedy: -10
});

export function clampTrust(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getHollyTrust() {
  const value = MainStoryManager.getSideClue(TRUST_KEY)?.value;
  return Number.isFinite(value) ? clampTrust(value) : START_TRUST;
}

// Poziom słowny: HOSTILE, WARY, NEUTRAL, FRIENDLY albo TRUSTING.
export function getHollyTrustLevel() {
  return getTrustLevel(getHollyTrust());
}

export function applyToneToTrust(trust, tone) {
  return clampTrust(trust + (TRUST_BY_TONE[tone] ?? 0));
}
