import { validateRestaurantFrame } from './TableForThreeCapturePolicy.js';

const SHOTS = [
  { field: 'romancePhoto', kind: 'romance', beat: 'kiss', label: 'Original meeting' },
  { field: 'ringPhoto', kind: 'ring', beat: 'ring', label: 'Arranged dessert' },
  { field: 'facePhoto', kind: 'face', beat: 'face', label: 'Companion identification' }
];
export function reviewTableForThreeReport(state, evidence, rendererVersion = 1) {
  const issues = [], records = [], ids = new Set();
  if (!state) return { ok: false, issues: ['The case progress is missing.'], records: [] };
  if (!state.ringPurchased || !state.ringHandedOver) issues.push('The ring purchase and kitchen transfer must be recorded.');
  let previousSequence = 0;
  for (const shot of SHOTS) {
    const reference = state[shot.field];
    if (!reference || reference.kind !== shot.kind || typeof reference.evidenceId !== 'string' || !reference.evidenceId) {
      issues.push(shot.label + ': photograph reference is missing or invalid.');
      continue;
    }
    if (!Number.isSafeInteger(reference.sequence) || reference.sequence <= previousSequence) issues.push(shot.label + ': photographic order is invalid.');
    previousSequence = reference.sequence;
    if (ids.has(reference.evidenceId)) issues.push('Each observation must have its own photograph.');
    ids.add(reference.evidenceId);
    const record = Object.prototype.hasOwnProperty.call(evidence || {}, reference.evidenceId) ? evidence[reference.evidenceId] : null;
    if (!record || record.id !== reference.evidenceId || record.kind !== shot.kind || record.beat !== shot.beat) {
      issues.push(shot.label + ': the saved crop record is missing or mismatched.');
      continue;
    }
    if (record.rendererVersion !== rendererVersion) issues.push(shot.label + ': this evidence renderer version is not supported.');
    const framing = validateRestaurantFrame(shot.beat, record.frame);
    if (!framing.ok) issues.push(shot.label + ': ' + framing.reason);
    records.push(structuredClone(record));
  }
  return { ok: issues.length === 0, issues, records };
}
