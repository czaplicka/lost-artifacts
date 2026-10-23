import { SLOT_COLORS } from './BoardConstants.js';

export const BoardRefresh = {
  refresh() {
    if (this.isDestroyed) {
      return;
    }

    this.refreshSlots();
    this.refreshCards();
    this.refreshAttempts();
    this.refreshConfirmButton();
    this.refreshDeductionControls();
    this.drawStrings();
  },

  refreshSlots() {
    const newFeedback = [];
    const placed = [];

    this.slotViews.forEach((view, slotIndex) => {
      /*
       * Wszystkie zmienne muszą powstać PRZED
       * pierwszym użyciem isSelected / isLocked.
       */
      const card = this.state?.getPlacedCard(slotIndex);

      const isSelected =
        this.state?.selectedSlotIndex === slotIndex;

      const isLocked =
        this.state?.isSlotLocked(slotIndex);

      const feedback =
        this.state?.slotFeedback?.[slotIndex] ||
        'neutral';

      newFeedback[slotIndex] = feedback;

      const cardIndex = this.state?.getPlacedCardIndex?.(slotIndex);
      placed[slotIndex] =
        cardIndex === undefined || cardIndex === null || cardIndex < 0
          ? null
          : cardIndex;

      let visual = SLOT_COLORS[feedback] || SLOT_COLORS.neutral;

      if (isSelected && !card) {
        visual = SLOT_COLORS.selected;
      }

      if (isLocked) {
        visual = SLOT_COLORS.green;
      }

      view.box.setFillStyle(visual.fill, 1);
      view.box.setStrokeStyle(
        isSelected ? 4 : 3,
        visual.stroke,
        1
      );

      // Pulsująca poświata wybranego pytania
      const wantGlow = Boolean(isSelected && !isLocked);

      if (wantGlow && !view.glowOn) {
        view.glowOn = true;
        this._kill(view.glow);
        view.glow.setAlpha(0.2);
        this._tween({
          targets: view.glow,
          alpha: 0.9,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (!wantGlow && view.glowOn) {
        view.glowOn = false;
        this._kill(view.glow);
        view.glow.setAlpha(0);
      }

      view.qMark.setVisible(!card);
      view.lockStamp.setVisible(Boolean(isLocked));

      if (!card) {
        view.answerText.setText(
          isSelected
            ? '[ now select a clue ]'
            : '[ empty ]'
        );

        view.answerText.setColor(visual.text);
        view.removeButton.setVisible(false);

        return;
      }

      /*
       * To jest moment, kiedy tekst wybranej wskazówki
       * trafia do kwadratu pytania.
       */
      view.answerText.setText(
        this.getSlotSentence(card, slotIndex)
      );

      view.answerText.setColor(visual.text);

      view.removeButton.setVisible(
        !isLocked &&
        !this.state?.uiLocked
      );
    });

    this._reactToFeedback(newFeedback);
    this._reactToPlacement(placed);
  },

  refreshCards() {
    this.cardViews.forEach(view => {
      const used = this.isCardUsed(view.index);

      const selected =
        this.state?.selectedCardIndex === view.index;

      view.usedMark.setVisible(used);
      view.selectedMark.setVisible(selected && !used);

      if (used) {
        view.box.setFillStyle(0x95866d, 1);
        view.box.setStrokeStyle(
          2,
          0x6c5e4c,
          0.7
        );

        view.box.disableInteractive();
        view.hover = false;
      } else {
        this._setHit(
          view.box,
          this.layout?.cardWidth ?? 230,
          this.layout?.cardHeight ?? 102
        );

        if (selected) {
          view.box.setFillStyle(0xffedb1, 1);
          view.box.setStrokeStyle(
            4,
            0xd4af37,
            1
          );
        } else {
          view.box.setFillStyle(0xf1e2bf, 1);
          view.box.setStrokeStyle(
            3,
            0x725022,
            0.95
          );
        }
      }

      this._settleCard(view);
    });
  },

  refreshAttempts() {
    const attempts =
      this.state?.attemptsLeft ?? 0;

    this._maxAttempts = Math.max(this._maxAttempts, attempts);

    this.attemptsText.setText(
      `ATTEMPTS LEFT: ${attempts}`
    );

    this.drawAttemptIcons(attempts);

    // Zmarnowana próba: ikonki się trzęsą
    if (this._lastAttempts !== null && attempts < this._lastAttempts) {
      this._kill(this.attemptsIcons);
      this.attemptsIcons.setX(0);
      this._tween({
        targets: this.attemptsIcons,
        x: 6,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          if (this.attemptsIcons?.scene) this.attemptsIcons.setX(0);
        }
      });
    }

    this._lastAttempts = attempts;
  },

  drawAttemptIcons(attempts) {
    const L = this.layout;
    const g = this.attemptsIcons;

    if (!L || !g?.scene) return;

    g.clear();

    const max = Math.max(this._maxAttempts, attempts);
    const gap = L.compact ? 30 : 38;
    const r = L.compact ? 7 : 9;
    const y = L.attemptsY + (L.compact ? 26 : 32);
    const startX = L.width / 2 - ((max - 1) * gap) / 2;

    for (let i = 0; i < max; i++) {
      const x = startX + i * gap;
      const on = i < attempts;
      const color = on ? 0xffd966 : 0x5a4a30;

      if (on) {
        g.fillStyle(0xffd966, 0.22);
        g.fillCircle(x, y, r);
      }

      g.lineStyle(3, color, on ? 1 : 0.7);
      g.strokeCircle(x, y, r);
      g.lineBetween(x + r * 0.7, y + r * 0.7, x + r * 1.7, y + r * 1.7);

      if (!on) {
        g.lineStyle(2, 0x8a3a3a, 0.9);
        g.lineBetween(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6);
        g.lineBetween(x - r * 0.6, y + r * 0.6, x + r * 0.6, y - r * 0.6);
      }
    }
  },

  refreshConfirmButton() {
    const isComplete = Boolean(
      this.state?.isTimelineComplete() &&
      !this.state?.uiLocked
    );

    this.confirmButton.setColor(
      isComplete ? '#ffd966' : '#777777'
    );

    this.confirmButton.setBackgroundColor(
      isComplete ? '#513c12' : '#2d2822'
    );

    this.confirmButton.setAlpha(
      isComplete ? 1 : 0.72
    );

    // Gdy teoria jest kompletna, przycisk delikatnie pulsuje
    if (isComplete && !this._confirmPulseOn) {
      this._confirmPulseOn = true;
      this._kill(this.confirmButton);
      this._tween({
        targets: this.confirmButton,
        scale: 1.05,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (!isComplete && this._confirmPulseOn) {
      this._confirmPulseOn = false;
      this._kill(this.confirmButton);
      this.confirmButton.setScale(1);
    }
  },

  isCardUsed(cardIndex) {
    const slotIndex =
      this.state?.getCardSlot(cardIndex);

    return (
      slotIndex !== -1 &&
      slotIndex !== null &&
      slotIndex !== undefined
    );
  },

  getSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    /*
     * To usuwa drugi błąd z Twojego pliku:
     * `return sentence || ...`, gdy sentence nie istnieje.
     */
    const sentence = this.buildSlotSentence?.(
      card,
      slotIndex
    );

    return (
      sentence ||
      card.item ||
      '[ clue ]'
    );
  }
};
