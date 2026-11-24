import { dialogueText as t } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { progressionManager } from '../../managers/ProgressionManager.js';
import { buildCourtFacts, createCourtRecord, answerCourtQuestion, advanceCourt, validCourt } from '../../systems/courtRapport.js';
import { currentChase, persistChase } from '../../systems/chasePersistence.js';
const text = id => t('scenes/CourtScene.js', id);
const sameId = (a,b) => a != null && b != null && String(a) === String(b);
const XP_REWARD_ID = 'court_won';
export const courtState = {
  restoreOrCreateRecord() {
    const saved = gameState.courtState;
    const belongs = saved && sameId(saved.caseId, gameState.currentCaseId) &&
      saved.campaignId === gameState._createdAt && sameId(saved.suspectId, this.requestedSuspectId);
    if (belongs) {
      if (!validCourt(saved, gameState, this.requestedSuspectId)) throw new Error('This trial save is inconsistent. It has not been reset or overwritten. Load a save from before the trial.');
      this.record = structuredClone(saved); return;
    }
    const facts = buildCourtFacts(gameState, this.requestedSuspectId);
    if (!facts.warrantMatches) throw new Error('A matching arrest warrant is required to begin this trial.');
    this.record = createCourtRecord(facts);
  },
  save() {
    if (!this.record) return false;
    try {
      gameState.courtState = structuredClone(this.record);
      const chase = currentChase();
      const matches = chase && chase.campaignId === this.record.campaignId &&
        sameId(chase.caseId, this.record.caseId) && sameId(chase.suspectId, this.record.suspectId);
      let saved;
      if (matches) {
        const checkpoint = structuredClone(chase);
        checkpoint.phase = 'review'; checkpoint.terminalScene = 'CourtScene';
        saved = persistChase(checkpoint);
      } else saved = saveGameState();
      this.notice?.setText(saved === true ? '' : text('t_a946beff022d854c48a8'));
      return saved === true;
    } catch (error) {
      console.error('[CourtScene] Save:', error);
      this.notice?.setText(text('t_a946beff022d854c48a8')); return false;
    }
  },
  press(index) {
    const record = this.record;
    if (!record || this.busy || this.hintModal || this.time.now < this.inputLockUntil ||
      this.pageIndex !== this.pageCount - 1) return;
    if (record.phase === 'question') {
      if (answerCourtQuestion(record, index)) { this.save(); this.render(); }
      return;
    }
    if (index !== 0) return;
    if (record.phase === 'feedback') {
      if (advanceCourt(record)) { this.save(); this.render(); }
      return;
    }
    if (record.phase === 'verdict') void this.finish();
  },
  applyVerdictToGameState() {
    const record = this.record, convicted = record.verdict === 'convicted';
    gameState.finalArrestSuspectId = record.suspectId;
    gameState.finalArrestResult = convicted ? 'SUCCESS' : 'FAILURE';
    gameState.caseResolved = convicted; gameState.caseFailed = !convicted; gameState.isGameActive = false;
    gameState.gameOverReason = convicted ? '' : record.verdictExplanation || text('t_e5b82991c30c36fdca1c');
  },
  grantConvictionXP() {
    const record = this.record;
    if (!record || record.verdict !== 'convicted' || record.resultCommitted) return;
    const normalizeIdentity = value => {
      if (typeof value !== 'string' && typeof value !== 'number') return null;
      if (typeof value === 'number' && !Number.isFinite(value)) return null;
      const identity = String(value).trim(); return identity || null;
    };
    const campaignId = normalizeIdentity(record.campaignId), caseId = normalizeIdentity(record.caseId);
    if (!campaignId || !caseId) throw new Error('Court XP requires a stable campaign ID and case ID.');
    const scopeId = JSON.stringify(['agency_court', campaignId, caseId]);
    const eventId = JSON.stringify(['reward', XP_REWARD_ID, scopeId]);
    let result;
    try { result = progressionManager.grantReward(XP_REWARD_ID, scopeId, text('t_e317899a7baff51deb61')); }
    catch (error) {
      if (!progressionManager.hasReward(eventId)) throw error;
      console.error('[CourtScene] Reward recorded, but grantReward threw:', error);
      result = { success:false, reason:'already_granted' };
    }
    if (!result.success && result.reason !== 'already_granted') throw new Error(`Court XP settlement failed: ${result.reason || 'unknown_error'}`);
    if (!progressionManager.hasReward(eventId)) throw new Error('The court victory XP reward was not recorded.');
  },
  async finish() {
    const record = this.record;
    if (this.busy || this.hintModal || !record || record.phase !== 'verdict') return;
    if (!validCourt(record, gameState, this.requestedSuspectId)) {
      this.notice?.setText(text('t_0061bde06e56e89e6bf2')); return;
    }
    this.busy = true;
    const convicted = record.verdict === 'convicted';
    try {
      if (convicted && !record.resultCommitted) {
        try { this.grantConvictionXP(); }
        catch (error) {
          console.error('[CourtScene] XP settlement failed:', error); this.busy = false;
          this.notice?.setText(text('t_0a2fdabe9cb29d2011d1')); return;
        }
      }
      this.applyVerdictToGameState(); record.resultCommitted = true;
      if (!this.save()) { this.busy = false; this.notice?.setText(text('t_c2d01ad716e68d42a338')); return; }
      const opened = await this.goto(convicted ? 'SuccessScene' : 'GameOverScene', {
        caseId:record.caseId, suspectId:record.suspectId,
        title:convicted ? text('t_4fc3901171364d578013') : text('t_92624f92e0a888fb966d'),
        reasonCode:convicted ? 'court_conviction' : 'court_release', message:gameState.gameOverReason
      });
      if (!opened && !this._cleanupDone) { this.busy = false; this.notice?.setText(text('t_c4aba1f97a164694ab1c')); }
    } catch (error) {
      console.error('[CourtScene] Finish:', error);
      if (!this._cleanupDone) { this.busy = false; this.notice?.setText(text('t_61d0d405ead05c55d3df')); }
    }
  }
};
