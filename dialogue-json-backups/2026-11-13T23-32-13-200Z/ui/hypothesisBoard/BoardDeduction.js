import { deductionManager, DEDUCTION_CHANGED } from '../../managers/DeductionManager.js';
import { EventBus } from '../../EventBus.js';
import { FONT_TEXT } from './BoardConstants.js';

export const BoardDeduction = {
  createDeductionControls() {
    this.deductionButtons = this.slotViews.map((view, index) => {
      const button = this.scene.add.text(0, 0, '[ DEDUCE ]', {
        fontFamily: FONT_TEXT, fontSize: '15px', color: '#ffd966',
        backgroundColor: '#332519',
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
      }).setOrigin(0.5).setDepth(3020).setInteractive({ useHandCursor: true });
      button.on('pointerup', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this.checkSlotDeduction(index);
      });
      return button;
    });
    this._onDeductionChanged = () => this.refreshDeductionControls();
    EventBus.on(DEDUCTION_CHANGED, this._onDeductionChanged);
  },

  layoutDeductionControls() {
    if (!this.layout) return;
    this.deductionButtons?.forEach((button, index) => {
      const view = this.slotViews[index];
      button.setPosition(
        view.container.x,
        view.container.y + this.layout.slotHeight / 2 + 25
      ).setFontSize(this.layout.compact ? '12px' : '15px');
      const maxWidth = Math.max(40, this.layout.slotWidth - 8);
      button.setScale(Math.min(1, maxWidth / Math.max(1, button.width)));
    });
  },

  getSlotDeductionRequest(slotIndex) {
    const card = this.state?.getPlacedCard?.(slotIndex);
    if (!card) return null;
    return {
      sceneId: this.scene.sys?.settings?.key || 'HypothesisScene',
      targetId: `heist:${card.cityId || ''}:${card.scene || ''}:slot:${slotIndex}`,
      selection: { cardId: String(card.id ?? card.item ?? ''), slotIndex }
    };
  },

  refreshDeductionControls() {
    if (this.isDestroyed) return;
    const summary = deductionManager.getSummary();
    this.deductionButtons?.forEach((button, index) => {
      const card = this.state?.getPlacedCard?.(index);
      const locked = Boolean(this.state?.isSlotLocked?.(index));
      const request = card ? this.getSlotDeductionRequest(index) : null;
      const cached = summary.unlocked && request && deductionManager.getPreviousCheck(request);
      let label;
      if (!summary.unlocked) label = '[ DEDUCE: REQUIRES 3 ]';
      else if (cached) label = '[ REVIEW DEDUCTION ]';
      else if (locked) label = '[ ALREADY CONFIRMED ]';
      else label = `[ DEDUCE: ${summary.available} LEFT ]`;
      button.setText(label);
      button.setColor(summary.unlocked ? '#ffd966' : '#a69b87');
      button.setAlpha(this.state?.uiLocked ? 0.4 : 1);
      if (this.state?.uiLocked) button.disableInteractive();
      else button.setInteractive({ useHandCursor: true });
    });
    this.layoutDeductionControls();
  },

  checkSlotDeduction(slotIndex) {
    if (this.isDestroyed || this.state?.uiLocked) return;
    const summary = deductionManager.getSummary();
    if (!summary.unlocked) {
      this.showFeedback('Your theory currently qualifies as a feeling. Requires Deduction 3.', '#ccb98c');
      return;
    }
    const card = this.state?.getPlacedCard?.(slotIndex);
    if (!card) {
      this.showFeedback('Assign a clue to this question first.', '#ffb347');
      return;
    }
    const request = this.getSlotDeductionRequest(slotIndex);
    const previous = deductionManager.getPreviousCheck(request);
    if (!previous && this.state?.isSlotLocked?.(slotIndex)) {
      this.showFeedback('That answer is already confirmed. Even your paperwork agrees.', '#b9efb9');
      return;
    }
    const result = deductionManager.check({
      ...request,
      evaluate: () => {
        if (typeof card.isCorrect !== 'boolean' || !Number.isInteger(card.correctOrder)) {
          throw new Error('Missing reconstruction evaluation data.');
        }
        const supported = card.isCorrect && card.correctOrder === slotIndex;
        return {
          status: supported ? 'supported' : 'contradicted',
          message: supported
            ? 'This clue fits this question. A theory with actual supporting evidence. How refreshing.'
            : 'This clue does not support this answer. Your theory has developed a structural problem.'
        };
      }
    });
    if (!result.success) {
      const messages = {
        no_checks_left: 'No deduction checks left for this case. Time to think without the safety net.',
        no_active_case: 'No active case was found. Your deduction has nowhere to file itself.',
        deduction_too_low: 'Your theory currently qualifies as a feeling. Requires Deduction 3.'
      };
      this.showFeedback(messages[result.reason] || 'Could not check this answer. No deduction check was used.', '#ffb347');
      return;
    }
    this.refreshDeductionControls();
    const supported = result.entry.result.status === 'supported';
    const number = slotIndex + 1;
    let message = `Answer ${number}: ${result.entry.result.message}`;
    if (result.cached) message += ' (Previously checked — free.)';
    if (result.saved === false) message += ' Warning: could not save progress.';
    this.showFeedback(message, supported ? '#b9efb9' : '#ff9f80');
    this.flashSlot(slotIndex);
  },

  destroyDeductionControls() {
    if (this._onDeductionChanged) {
      EventBus.off(DEDUCTION_CHANGED, this._onDeductionChanged);
      this._onDeductionChanged = null;
    }
    this.deductionButtons?.forEach(button => {
      this._kill(button);
      button.removeAllListeners();
      button.destroy();
    });
    this.deductionButtons = [];
  }
};
