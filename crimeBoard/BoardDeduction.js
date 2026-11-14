import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { isCorrectMotiveAnswer } from '../motiveService.js';
import { saveGameState } from '../gameStatePersistence.js';
import { deductionManager, DEDUCTION_CHANGED } from '../managers/DeductionManager.js';
import { EventBus } from '../EventBus.js';

const LOW_STAT = __dialogueText("crimeBoard/BoardDeduction.js", "t_2a7d63eeffd0fbefccd7");

export const BoardDeduction = {
  createDeductionPanel() {
    this._deductionBusy = false;
    this.deductionPanel = document.createElement('section');
    this.deductionPanel.className = 'crime-board-deduction';
    this.deductionPanel.setAttribute('aria-label', __dialogueText("crimeBoard/BoardDeduction.js", "t_5976bec1e6c7d4ba080e"));
    Object.assign(this.deductionPanel.style, {
      padding: '12px', margin: '8px', background: '#332519',
      color: '#f5e6c5', border: __dialogueText("crimeBoard/BoardDeduction.js", "t_3bada4de257c0720512f"), borderRadius: '6px',
      fontFamily: 'SpecialElite, serif', position: 'relative', zIndex: '5'
    });
    this.deductionSummary = document.createElement('p');
    this.deductionSummary.style.margin = __dialogueText("crimeBoard/BoardDeduction.js", "t_492fea136c1567324613");
    this.deductionCheckButton = document.createElement('button');
    this.deductionCheckButton.type = 'button';
    this.deductionCheckButton.className = 'crime-board-btn';
    Object.assign(this.deductionCheckButton.style, {
      padding: __dialogueText("crimeBoard/BoardDeduction.js", "t_8193b8b5eb6be9a659f7"), background: '#dbc17e', color: '#21190e',
      cursor: 'pointer', border: __dialogueText("crimeBoard/BoardDeduction.js", "t_0637a01a896c9cecc798"), font: 'inherit'
    });
    this.deductionMessage = document.createElement('p');
    this.deductionMessage.setAttribute('role', 'status');
    this.deductionMessage.setAttribute('aria-live', 'polite');
    this.deductionMessage.style.margin = __dialogueText("crimeBoard/BoardDeduction.js", "t_6475ac0f763e3c21b8d4");
    this.deductionMessage.textContent = __dialogueText("crimeBoard/BoardDeduction.js", "t_5f4e56bfe5ae31cc0ee1");
    this._onDeductionClick = event => {
      event.preventDefault();
      event.stopPropagation();
      this.verifyMotiveGuess(this.selectedItemId);
    };
    this.deductionCheckButton.addEventListener('click', this._onDeductionClick);
    this.deductionPanel.append(this.deductionSummary, this.deductionCheckButton, this.deductionMessage);
    const host = this.root.closest(__dialogueText("crimeBoard/BoardDeduction.js", "t_5f4a8917bd85d04d9691")) || this.root.parentElement || this.root;
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
  const cached = summary.unlocked
    && request
    && deductionManager.getPreviousCheck(request);

  const label = !summary.unlocked
    ? __dialogueText("crimeBoard/BoardDeduction.js", "t_9bd3eb2dcabc2429c2bf")
    : cached
      ? __dialogueText("crimeBoard/BoardDeduction.js", "t_5cdac2321487b1dc5c5e")
      : `${__dialogueText("crimeBoard/BoardDeduction.js", "t_c4c2c5531f747d397fc0")}${summary.available}${__dialogueText("crimeBoard/BoardDeduction.js", "t_35629583fbf8b569d02c")}`;

  this.deductionSummary.textContent = !summary.unlocked
    ? `${__dialogueText("crimeBoard/BoardDeduction.js", "t_43cea09a1d1ac3f2f398")}${summary.deduction}${__dialogueText("crimeBoard/BoardDeduction.js", "t_7e4eb298d8148023438a")}`
    : `${__dialogueText("crimeBoard/BoardDeduction.js", "t_7e74d0cda0fc4ef52f34")}${summary.available}${__dialogueText("crimeBoard/BoardDeduction.js", "t_8a5edab282632443219e")}${summary.allowance}${__dialogueText("crimeBoard/BoardDeduction.js", "t_c16dd4d28f0aa58cb6bb")}`;

  this.deductionCheckButton.textContent = label;
  this.deductionCheckButton.disabled = this._deductionBusy;

  if (this.editor.verifyMotiveBtn) {
    this.editor.verifyMotiveBtn.textContent = label;
  }
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
      this.showDeductionMessage(__dialogueText("crimeBoard/BoardDeduction.js", "t_97294320684ce1a9e919"));
      return { verified: false, reason: 'NO_ITEM' };
    }
    const guessId = typeof item.clueId === 'string' ? item.clueId.trim() : '';
    if (!guessId) {
      this.showDeductionMessage(__dialogueText("crimeBoard/BoardDeduction.js", "t_dedd47935cbb9923eb68"));
      return { verified: false, reason: 'NO_GUESS' };
    }
    const motiveId = gameState.caseData?.motiveId;
    if (!motiveId) {
      this.showDeductionMessage(__dialogueText("crimeBoard/BoardDeduction.js", "t_95adee90329a678b1d28"));
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
              ? __dialogueText("crimeBoard/BoardDeduction.js", "t_a71a8798b8bca410ee59")
              : __dialogueText("crimeBoard/BoardDeduction.js", "t_0045ef0ee482962ff843")
          };
        }
      });
      if (!result.success) {
        const messages = {
          deduction_too_low: LOW_STAT,
          no_checks_left: __dialogueText("crimeBoard/BoardDeduction.js", "t_07e351a9f9b1d9297336"),
          no_active_case: __dialogueText("crimeBoard/BoardDeduction.js", "t_1f8b9444e541f93021f3")
        };
        this.showDeductionMessage(messages[result.reason] || __dialogueText("crimeBoard/BoardDeduction.js", "t_8592772e92707b222643"));
        return { verified: false, reason: result.reason };
      }
      const isCorrect = result.entry.result.status === 'supported';
      this.updateItem(itemId, { motiveVerdict: isCorrect ? 'correct' : 'incorrect' });
      this.syncJsonOutput();
      gameState.updateState({ crimeBoardData: this.getBoardData() });
      const saved = saveGameState();
      this.showDeductionMessage(result.entry.result.message +
        (result.cached ? __dialogueText("crimeBoard/BoardDeduction.js", "t_dd5178a9f0866bdc0940") : '') +
        (!saved ? __dialogueText("crimeBoard/BoardDeduction.js", "t_adb68a663cd0c56f0ceb") : ''), isCorrect);
      this.root.dispatchEvent(new CustomEvent('crimeboard:motive-verified', {
        detail: { itemId, guessId, motiveId, isCorrect }, bubbles: true
      }));
      return { verified: true, isCorrect, motiveId, guessId, cached: result.cached, saved };
    } catch (error) {
      console.error('[CrimeBoard] Deduction failed:', error);
      this.showDeductionMessage(__dialogueText("crimeBoard/BoardDeduction.js", "t_cd3d34fdac3ec96fc283"));
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
