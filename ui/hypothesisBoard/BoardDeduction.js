import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { deductionManager, DEDUCTION_CHANGED } from '../../managers/DeductionManager.js';
import { EventBus } from '../../EventBus.js';
import { FONT_TEXT } from './BoardConstants.js';

export const BoardDeduction = {
  createDeductionControls() {
    this.deductionButtons = this.slotViews.map((view, index) => {
      const button = this.scene.add.text(0, 0, __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_1d4bfe242448e576c10f"), {
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
      if (!summary.unlocked) label = __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_93513fc642e918ca26cb");
      else if (cached) label = __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_2016ae05ed1d1408648e");
      else if (locked) label = __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_d9887001aa3e8a137bc1");
      else label = `${__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_d2848348d515965a2741")}${summary.available}${__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_502d9055b2ea736f80f4")}`;
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
      this.showFeedback(__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_2a7d63eeffd0fbefccd7"), '#ccb98c');
      return;
    }
    const card = this.state?.getPlacedCard?.(slotIndex);
    if (!card) {
      this.showFeedback(__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_2d8e382f0736a9913e69"), '#ffb347');
      return;
    }
    const request = this.getSlotDeductionRequest(slotIndex);
    const previous = deductionManager.getPreviousCheck(request);
    if (!previous && this.state?.isSlotLocked?.(slotIndex)) {
      this.showFeedback(__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_5e3b13fcb0cf790ba33c"), '#b9efb9');
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
            ? __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_e8bdccbde90d5a3849c8")
            : __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_b2392507ef17eb25d896")
        };
      }
    });
    if (!result.success) {
      const messages = {
        no_checks_left: __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_d63e256361ab6d53f4cd"),
        no_active_case: __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_c4af4648d7ad1e059a84"),
        deduction_too_low: __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_2a7d63eeffd0fbefccd7")
      };
      this.showFeedback(messages[result.reason] || __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_4f7d1e4796df65546b2b"), '#ffb347');
      return;
    }
    this.refreshDeductionControls();
    const supported = result.entry.result.status === 'supported';
    const number = slotIndex + 1;
    let message = `${__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_859d99a1d1545d4e2ada")}${number}${__dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_45822f54a0d0e030f756")}${result.entry.result.message}`;
    if (result.cached) message += __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_dd5178a9f0866bdc0940");
    if (result.saved === false) message += __dialogueText("ui/hypothesisBoard/BoardDeduction.js", "t_8ae189d2ee2b29484130");
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
