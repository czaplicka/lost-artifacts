import { gameState } from '../GameData.js';
import { deductionManager } from '../managers/DeductionManager.js';
import { NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';

const LOW_STAT = 'Your theory currently qualifies as a feeling. Requires Deduction 3.';

export function evaluateTimelineSlot(cards, slots, index) {
  if (!Array.isArray(cards) || cards.length !== 3 ||
      new Set(cards.map(card => card.id)).size !== 3 ||
      cards.some(card => !Number.isInteger(card.minute))) {
    throw new Error('Missing public timeline times.');
  }
  if (!Number.isInteger(index) || index < 0 || index >= 3 || !slots[index]) {
    throw new Error('No timeline answer selected.');
  }
  const placed = cards.find(card => card.id === slots[index]);
  if (!placed) throw new Error('Unknown timeline card.');
  const ordered = [...cards].sort((a, b) => a.minute - b.minute);
  const supported = placed.minute === ordered[index].minute;
  return {
    status: supported ? 'supported' : 'contradicted',
    message: supported
      ? `Position ${index + 1}: this account fits the chronology. That checks the order, not whether the witness is telling the truth.`
      : `Position ${index + 1}: this account does not fit here. Compare the times in the statements again.`
  };
}

export function evaluateAlibiChoice(data, choice, interviewedIds) {
  const witnesses = data?.witnesses;
  if (!Array.isArray(witnesses) || witnesses.length !== 3 ||
      new Set(witnesses.map(w => w.npcId)).size !== 3 ||
      witnesses.some(w => typeof w.isLiar !== 'boolean' || !interviewedIds.includes(w.npcId))) {
    throw new Error('Incomplete collected statements.');
  }
  const liars = witnesses.filter(w => w.isLiar);
  if (liars.length > 1) throw new Error('Unsupported witness contradiction model.');
  if (choice !== NO_ALIBI_LIAR && !witnesses.some(w => w.npcId === choice)) {
    throw new Error('Unknown conclusion.');
  }
  // Uses the contradiction model for these collected accounts, never culprit identity.
  const supported = choice === NO_ALIBI_LIAR
    ? liars.length === 0
    : liars.some(w => w.npcId === choice);
  return {
    status: supported ? 'supported' : 'contradicted',
    message: supported
      ? 'The collected statements support your selected alibi conclusion. This is not a verdict on guilt.'
      : 'The collected statements do not support your selected alibi conclusion. Re-read the accounts before filing.'
  };
}

export class AlibiDeductionController {
  constructor(scene) { this.scene = scene; }

  request(kind, index = null) {
    const s = this.scene;
    if (kind === 'timeline') {
      const card = s.cards.find(item => item.id === s.slots[index]);
      if (!card) return null;
      return {
        sceneId: 'AlibiTimelineScene',
        targetId: JSON.stringify([s.caseKey, s.suspectId, 'timeline', index]),
        selection: {
          cardId: card.id, index,
          evidence: s.cards.map(c => ({ id: c.id, minute: c.minute }))
            .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        }
      };
    }
    if (!s.choice) return null;
    return {
      sceneId: 'AlibiTimelineScene',
      targetId: JSON.stringify([s.caseKey, s.suspectId, 'conclusion']),
      selection: {
        choice: s.choice,
        statements: s.witnesses.map(w => ({ npcId: w.npcId, statement: w.statement }))
          .sort((a, b) => String(a.npcId).localeCompare(String(b.npcId)))
      }
    };
  }

  label(kind, index = null) {
    const summary = deductionManager.getSummary();
    const base = kind === 'timeline' ? 'CHECK ORDER' : 'CHECK REASONING';
    if (!summary.unlocked) return `${base}: REQUIRES 3`;
    const request = this.request(kind, index);
    if (request && deductionManager.getPreviousCheck(request)) return 'REVIEW CHECK: FREE';
    return `${base}: ${summary.available} LEFT`;
  }

  summaryText() {
    const summary = deductionManager.getSummary();
    return summary.unlocked
      ? `Deduction: ${summary.available}/${summary.allowance} checks left for this case (shared across all boards).`
      : `Deduction ${summary.deduction}/3: checks unavailable. Clicking is still emotionally valid.`;
  }

  run(kind, index = null) {
    const s = this.scene;
    if (s.busy || s.solved || s.modal) return;
    if (!deductionManager.getSummary().unlocked) {
      s.setFeedback(LOW_STAT);
      return;
    }
    const request = this.request(kind, index);
    if (!request) {
      s.setFeedback(kind === 'timeline'
        ? 'Place a witness account in this position first.'
        : 'Select an alibi conclusion first. Nothing will be filed by this check.');
      return;
    }
    s.busy = true;
    try {
      const result = deductionManager.check({
        ...request,
        evaluate: () => {
          if (kind === 'timeline') return evaluateTimelineSlot(s.cards, s.slots, index);
          const data = gameState.caseData?.alibiCases?.[s.caseKey]?.suspects
            ?.find(item => item.suspectId === s.suspectId);
          return evaluateAlibiChoice(data, s.choice, s.witnesses.map(w => w.npcId));
        }
      });
      if (!result.success) {
        const messages = {
          deduction_too_low: LOW_STAT,
          no_checks_left: 'No deduction checks left for this case. Time to think without the safety net.',
          no_active_case: 'No active case was found. No check was used.'
        };
        s.setFeedback(messages[result.reason] || 'Could not check this draft. No deduction check was used.');
        return;
      }
      s.feedbackColor = result.entry.result.status === 'supported' ? '#28562c' : '#8a3426';
      s.feedback = result.entry.result.message + (result.cached ? ' (Previously checked — free.)' : '');
      if (result.saved === false) s.feedback += ' Warning: progress could not be saved.';
      s.render();
    } catch (error) {
      console.error('[AlibiDeduction] Check failed:', error);
      s.setFeedback('The check could not be completed. Check the console before trying again.');
    } finally { s.busy = false; }
  }
}
