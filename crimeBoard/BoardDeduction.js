import { gameState } from '../GameData.js';
import { isCorrectMotiveAnswer } from '../motiveService.js';
import { saveGameState } from '../gameStatePersistence.js';
import { deductionManager, DEDUCTION_CHANGED } from '../managers/DeductionManager.js';
import { EventBus } from '../EventBus.js';

const LOW_STAT = 'Your theory currently qualifies as a feeling. Requires Deduction 3.';

export const BoardDeduction = {
  createDeductionPanel() {
    this._deductionBusy = false;
    this.deductionPanel = document.createElement('section');
    this.deductionPanel.className = 'crime-board-deduction';
    this.deductionPanel.setAttribute('aria-label', 'Deduction checks');
    Object.assign(this.deductionPanel.style, {
      padding: '12px', margin: '8px', background: '#332519',
      color: '#f5e6c5', border: '2px solid #a78b51', borderRadius: '6px',
      fontFamily: 'SpecialElite, serif', position: 'relative', zIndex: '5'
    });
    this.deductionSummary = document.createElement('p');
    this.deductionSummary.style.margin = '0 0 8px';
    this.deductionCheckButton = document.createElement('button');
    this.deductionCheckButton.type = 'button';
    this.deductionCheckButton.className = 'crime-board-btn';
    Object.assign(this.deductionCheckButton.style, {
      padding: '10px 14px', background: '#dbc17e', color: '#21190e',
      cursor: 'pointer', border: '1px solid #a78b51', font: 'inherit'
    });
    this.deductionMessage = document.createElement('p');
    this.deductionMessage.setAttribute('role', 'status');
    this.deductionMessage.setAttribute('aria-live', 'polite');
    this.deductionMessage.style.margin = '8px 0 0';
    this.deductionMessage.textContent = 'Select a card with your motive guess. A check does not file a report or make an arrest.';
    this._onDeductionClick = event => {
      event.preventDefault();
      event.stopPropagation();
      this.verifyMotiveGuess(this.selectedItemId);
    };
    this.deductionCheckButton.addEventListener('click', this._onDeductionClick);
    this.deductionPanel.append(this.deductionSummary, this.deductionCheckButton, this.deductionMessage);
    const host = this.root.closest('.crime-board-app') || this.root.parentElement || this.root;
    host.prepend(this.deductionPanel);
    this._onDeductionChanged = () => this.refreshDeductionPanel();
    EventBus.on(DEDUCTION_CHANGED, this._onDeductionChanged);
    this.refreshDeductionPanel();
  },

  getMotiveDeductionRequest(itemId = this.selectedItemId) {
    const item = this.getItemById(itemId);
    const guessId = typeof item?.clueId === 'string' ? item.clueId.trim() : '';
    const motiveId = gameState.caseData?.motiveId;
    if (!guessId || !motiveId) return null;
    return {
      sceneId: 'CrimeBoard', targetId: 'motive',
      selection: { motiveId, guessId }
    };
  },

  refreshDeductionPanel() {
    if (this.destroyed || !this.deductionPanel) return;
    const summary = deductionManager.getSummary();
    const request = this.getMotiveDeductionRequest();
    const cached = summary.unlocked && request && deductionManager.getPreviousCheck(request);
    const label = !summary.unlocked ? 'CHECK MOTIVE: REQUIRES 3'
      : cached ? 'REVIEW MOTIVE CHECK: FREE'
      : `CHECK MOTIVE: ${summary.available} LEFT`;
    this.deductionSummary.textContent = !summary.unlocked
      ? `Deduction ${summary.deduction}/3 — checks unavailable.`
      : `Deduction: ${summary.available}/${summary.allowance} checks left for this case. Shared with reconstruction and alibis.`;
    this.deductionCheckButton.textContent = label;
    this.deductionCheckButton.disabled = this._deductionBusy;
    if (this.editor.verifyMotiveBtn) this.editor.verifyMotiveBtn.textContent = label;
  },

  showDeductionMessage(message, supported = null) {
    if (!this.deductionMessage) return;
    this.deductionMessage.textContent = message;
    this.deductionMessage.style.color = supported === true ? '#b9efb9'
      : supported === false ? '#ffb5a3' : '#f5e6c5';
  },

  verifyMotiveGuess(itemId) {
    if (!this._isBoardUsable() || this._deductionBusy) return null;
    if (!deductionManager.getSummary().unlocked) {
      this.showDeductionMessage(LOW_STAT);
      return { verified: false, reason: 'deduction_too_low' };
    }
    const item = this.getItemById(itemId);
    if (!item) {
      this.showDeductionMessage('Select a motive-guess card first. No deduction check was used.');
      return { verified: false, reason: 'NO_ITEM' };
    }
    const guessId = typeof item.clueId === 'string' ? item.clueId.trim() : '';
    if (!guessId) {
      this.showDeductionMessage('This card has no motive guess ID. Add one in the card editor and apply your changes first. No check was used.');
      return { verified: false, reason: 'NO_GUESS' };
    }
    const motiveId = gameState.caseData?.motiveId;
    if (!motiveId) {
      this.showDeductionMessage('The case has no active motive data. No check was used.');
      return { verified: false, reason: 'NO_ACTIVE_MOTIVE' };
    }
    this._deductionBusy = true;
    try {
      const result = deductionManager.check({
        ...this.getMotiveDeductionRequest(itemId),
        evaluate: () => {
          const supported = isCorrectMotiveAnswer(motiveId, guessId);
          if (typeof supported !== 'boolean') throw new Error('Invalid motive evaluation.');
          return {
            status: supported ? 'supported' : 'contradicted',
            message: supported
              ? 'This motive guess matches the case motive. That does not establish identity, means or opportunity.'
              : 'This motive guess does not match the case motive. Reconsider the motive evidence.'
          };
        }
      });
      if (!result.success) {
        const messages = {
          deduction_too_low: LOW_STAT,
          no_checks_left: 'No deduction checks left for this case. Your remaining theory must travel unsupervised.',
          no_active_case: 'No active case was found. No deduction check was used.'
        };
        this.showDeductionMessage(messages[result.reason] || 'The motive check failed. No deduction check was used.');
        return { verified: false, reason: result.reason };
      }
      const isCorrect = result.entry.result.status === 'supported';
      this.updateItem(itemId, { motiveVerdict: isCorrect ? 'correct' : 'incorrect' });
      this.syncJsonOutput();
      gameState.updateState({ crimeBoardData: this.getBoardData() });
      const saved = saveGameState();
      this.showDeductionMessage(result.entry.result.message +
        (result.cached ? ' (Previously checked — free.)' : '') +
        (!saved ? ' Warning: progress could not be saved.' : ''), isCorrect);
      this.root.dispatchEvent(new CustomEvent('crimeboard:motive-verified', {
        detail: { itemId, guessId, motiveId, isCorrect }, bubbles: true
      }));
      return { verified: true, isCorrect, motiveId, guessId, cached: result.cached, saved };
    } catch (error) {
      console.error('[CrimeBoard] Deduction failed:', error);
      this.showDeductionMessage('Could not finish displaying or saving the check. Check the console; do not repeatedly click.');
      return { verified: false, reason: 'CHECK_FAILED' };
    } finally {
      this._deductionBusy = false;
      this.refreshDeductionPanel();
    }
  },

  hasVerifiedCorrectMotive() {
    return this.state.items.some(item => item.motiveVerdict === 'correct');
  },

  destroyDeductionPanel() {
    if (this._onDeductionChanged) EventBus.off(DEDUCTION_CHANGED, this._onDeductionChanged);
    this.deductionCheckButton?.removeEventListener('click', this._onDeductionClick);
    this.deductionPanel?.remove();
    this._onDeductionChanged = null;
    this._onDeductionClick = null;
    this.deductionPanel = null;
    this.deductionSummary = null;
    this.deductionCheckButton = null;
    this.deductionMessage = null;
  }
};
