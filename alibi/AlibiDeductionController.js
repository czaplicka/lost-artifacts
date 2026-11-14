import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { deductionManager } from '../managers/DeductionManager.js';
import { NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';

const LOW_STAT = __dialogueText("alibi/AlibiDeductionController.js", "t_2a7d63eeffd0fbefccd7");

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
      ? `${__dialogueText("alibi/AlibiDeductionController.js", "t_66cbfad8efbf9c7a675d")}${index + 1}${__dialogueText("alibi/AlibiDeductionController.js", "t_6a4c0494147c342ffb69")}`
      : `${__dialogueText("alibi/AlibiDeductionController.js", "t_66cbfad8efbf9c7a675d")}${index + 1}${__dialogueText("alibi/AlibiDeductionController.js", "t_08825f5bdf7e6f59f2eb")}`
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
      ? __dialogueText("alibi/AlibiDeductionController.js", "t_a492f0eda3a289dfa255")
      : __dialogueText("alibi/AlibiDeductionController.js", "t_81741e43aca2bc97bd92")
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
    const base = kind === 'timeline' ? __dialogueText("alibi/AlibiDeductionController.js", "t_8058938d884449168396") : __dialogueText("alibi/AlibiDeductionController.js", "t_7b8d3e34296479165a3d");
    if (!summary.unlocked) return `${base}${__dialogueText("alibi/AlibiDeductionController.js", "t_b1663c09f5a39171a2de")}`;
    const request = this.request(kind, index);
    if (request && deductionManager.getPreviousCheck(request)) return __dialogueText("alibi/AlibiDeductionController.js", "t_daca22952c958a29b9fb");
    return `${base}${__dialogueText("alibi/AlibiDeductionController.js", "t_45822f54a0d0e030f756")}${summary.available}${__dialogueText("alibi/AlibiDeductionController.js", "t_35629583fbf8b569d02c")}`;
  }

  summaryText() {
    const summary = deductionManager.getSummary();
    return summary.unlocked
      ? `${__dialogueText("alibi/AlibiDeductionController.js", "t_7e74d0cda0fc4ef52f34")}${summary.available}${__dialogueText("alibi/AlibiDeductionController.js", "t_8a5edab282632443219e")}${summary.allowance}${__dialogueText("alibi/AlibiDeductionController.js", "t_ed35de8f7c29a7d2143c")}`
      : `${__dialogueText("alibi/AlibiDeductionController.js", "t_43cea09a1d1ac3f2f398")}${summary.deduction}${__dialogueText("alibi/AlibiDeductionController.js", "t_a963de9cba1f0702b14b")}`;
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
        ? __dialogueText("alibi/AlibiDeductionController.js", "t_ee2e021cb6c40ad11486")
        : __dialogueText("alibi/AlibiDeductionController.js", "t_d18c644b0e3793ad2583"));
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
          no_checks_left: __dialogueText("alibi/AlibiDeductionController.js", "t_d63e256361ab6d53f4cd"),
          no_active_case: __dialogueText("alibi/AlibiDeductionController.js", "t_ef26b967f23d7bf2b755")
        };
        s.setFeedback(messages[result.reason] || __dialogueText("alibi/AlibiDeductionController.js", "t_fce2bccf3dcea9f56567"));
        return;
      }
      s.feedbackColor = result.entry.result.status === 'supported' ? '#28562c' : '#8a3426';
      s.feedback = result.entry.result.message + (result.cached ? __dialogueText("alibi/AlibiDeductionController.js", "t_dd5178a9f0866bdc0940") : '');
      if (result.saved === false) s.feedback += __dialogueText("alibi/AlibiDeductionController.js", "t_adb68a663cd0c56f0ceb");
      s.render();
    } catch (error) {
      console.error('[AlibiDeduction] Check failed:', error);
      s.setFeedback(__dialogueText("alibi/AlibiDeductionController.js", "t_f1f6c42ce6342305751b"));
    } finally { s.busy = false; }
  }
}
