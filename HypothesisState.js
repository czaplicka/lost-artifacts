export class HypothesisState {
  constructor({
    reconstruction = null,
    activeSlotCount = 3,
    attempts = 3
  } = {}) {
    this.reconstruction = reconstruction && typeof reconstruction === 'object'
      ? reconstruction
      : {};

    this.activeSlotCount = Math.max(1, Math.min(3, Number(activeSlotCount) || 3));
    this.maxAttempts = Math.max(1, Number(attempts) || 3);

    this.reset();
  }

  reset() {
    this.placedCards = new Array(this.activeSlotCount).fill(null);
    this.slotFeedback = new Array(this.activeSlotCount).fill('neutral');
    this.attemptsLeft = this.maxAttempts;
    this.lockedSlots = new Set();
    this.selectedSlotIndex = null;
    this.uiLocked = false;

    this.syncAttemptsToReconstruction();
  }

  setActiveSlotCount(activeSlotCount) {
    const nextCount = Math.max(1, Math.min(3, Number(activeSlotCount) || 3));

    if (nextCount === this.activeSlotCount) return;

    this.activeSlotCount = nextCount;
    this.reset();
  }

  setCards(cards = []) {
    this.cards = Array.isArray(cards) ? cards : [];
  }

  getCard(cardIndex) {
    if (!Number.isInteger(cardIndex)) return null;
    return this.cards?.[cardIndex] || null;
  }

  getPlacedCardIndex(slotIndex) {
    if (!this.isValidSlot(slotIndex)) return null;
    return this.placedCards[slotIndex];
  }

  getPlacedCard(slotIndex) {
    const cardIndex = this.getPlacedCardIndex(slotIndex);
    return cardIndex === null ? null : this.getCard(cardIndex);
  }

  getOrderedCards() {
    return this.placedCards.map(cardIndex => this.getCard(cardIndex));
  }

  getCardSlot(cardIndex) {
    return this.placedCards.indexOf(cardIndex);
  }

  isValidSlot(slotIndex) {
    return Number.isInteger(slotIndex) &&
      slotIndex >= 0 &&
      slotIndex < this.activeSlotCount;
  }

  isValidCard(cardIndex) {
    return Number.isInteger(cardIndex) &&
      cardIndex >= 0 &&
      Array.isArray(this.cards) &&
      cardIndex < this.cards.length;
  }

  isSlotLocked(slotIndex) {
    return this.lockedSlots.has(slotIndex);
  }

  isSlotEmpty(slotIndex) {
    return this.isValidSlot(slotIndex) && this.placedCards[slotIndex] === null;
  }

  isTimelineComplete() {
    return this.placedCards.every(cardIndex => cardIndex !== null);
  }

  getFirstAvailableSlot() {
    return this.placedCards.findIndex((cardIndex, slotIndex) =>
      cardIndex === null && !this.isSlotLocked(slotIndex)
    );
  }

  toggleSelectedSlot(slotIndex) {
    if (!this.isValidSlot(slotIndex) || this.isSlotLocked(slotIndex) || !this.isSlotEmpty(slotIndex)) {
      return {
        ok: false,
        reason: 'slot_unavailable',
        selectedSlotIndex: this.selectedSlotIndex
      };
    }

    this.selectedSlotIndex = this.selectedSlotIndex === slotIndex
      ? null
      : slotIndex;

    return {
      ok: true,
      selectedSlotIndex: this.selectedSlotIndex,
      selected: this.selectedSlotIndex === slotIndex
    };
  }

  clearSelectedSlot() {
    this.selectedSlotIndex = null;
  }

  /**
   * Places a card into a question slot.
   *
   * Rules:
   * - A locked slot cannot be changed.
   * - A card can occupy only one slot.
   * - Moving a card from one unlocked slot to another swaps cards if the
   *   target already contains a movable card.
   * - Putting a tray card into an occupied slot returns the former card to
   *   the tray.
   *
   * The method returns movement data only. Phaser positions/animations stay
   * in HypothesisBoardUI, keeping this state model testable and UI-free.
   */
  placeCard(cardIndex, requestedSlotIndex = null) {
    if (this.uiLocked) {
      return { ok: false, reason: 'ui_locked' };
    }

    if (!this.isValidCard(cardIndex)) {
      return { ok: false, reason: 'invalid_card' };
    }

    let targetSlotIndex = requestedSlotIndex;

    if (targetSlotIndex === null || targetSlotIndex === undefined) {
      targetSlotIndex = this.selectedSlotIndex;
    }

    if (targetSlotIndex === null || targetSlotIndex === undefined) {
      targetSlotIndex = this.getFirstAvailableSlot();
    }

    if (!this.isValidSlot(targetSlotIndex)) {
      return { ok: false, reason: 'no_available_slot' };
    }

    if (this.isSlotLocked(targetSlotIndex)) {
      const fallbackSlotIndex = this.getFirstAvailableSlot();

      if (fallbackSlotIndex === -1) {
        return { ok: false, reason: 'target_slot_locked' };
      }

      targetSlotIndex = fallbackSlotIndex;
    }

    const fromSlotIndex = this.getCardSlot(cardIndex);

    if (fromSlotIndex !== -1 && this.isSlotLocked(fromSlotIndex)) {
      return { ok: false, reason: 'card_locked', fromSlotIndex };
    }

    if (fromSlotIndex === targetSlotIndex) {
      this.selectedSlotIndex = null;

      return {
        ok: true,
        action: 'unchanged',
        cardIndex,
        fromSlotIndex,
        targetSlotIndex,
        returnedCardIndex: null,
        swappedCardIndex: null
      };
    }

    const targetCardIndex = this.placedCards[targetSlotIndex];

    if (targetCardIndex !== null && this.isSlotLocked(targetSlotIndex)) {
      return { ok: false, reason: 'target_slot_locked', targetSlotIndex };
    }

    let action = 'placed';
    let returnedCardIndex = null;
    let swappedCardIndex = null;

    if (fromSlotIndex !== -1) {
      this.placedCards[fromSlotIndex] = null;
      this.slotFeedback[fromSlotIndex] = 'neutral';

      if (targetCardIndex !== null) {
        this.placedCards[fromSlotIndex] = targetCardIndex;
        swappedCardIndex = targetCardIndex;
        action = 'swapped';
      } else {
        action = 'moved';
      }
    } else if (targetCardIndex !== null) {
      returnedCardIndex = targetCardIndex;
      action = 'replaced';
    }

    this.placedCards[targetSlotIndex] = cardIndex;
    this.slotFeedback[targetSlotIndex] = 'neutral';
    this.selectedSlotIndex = null;

    this.resetUnlockedFeedback();

    return {
      ok: true,
      action,
      cardIndex,
      fromSlotIndex,
      targetSlotIndex,
      returnedCardIndex,
      swappedCardIndex
    };
  }

  removeCard(slotIndex) {
    if (this.uiLocked) {
      return { ok: false, reason: 'ui_locked' };
    }

    if (!this.isValidSlot(slotIndex)) {
      return { ok: false, reason: 'invalid_slot' };
    }

    if (this.isSlotLocked(slotIndex)) {
      return { ok: false, reason: 'slot_locked', slotIndex };
    }

    const cardIndex = this.placedCards[slotIndex];

    if (cardIndex === null) {
      return { ok: false, reason: 'slot_empty', slotIndex };
    }

    this.placedCards[slotIndex] = null;
    this.slotFeedback[slotIndex] = 'neutral';
    this.selectedSlotIndex = null;
    this.resetUnlockedFeedback();

    return {
      ok: true,
      cardIndex,
      slotIndex
    };
  }

  setFeedback(feedback = []) {
    const safeFeedback = new Array(this.activeSlotCount)
      .fill('red')
      .map((fallback, index) => {
        const value = feedback[index];
        return ['neutral', 'green', 'yellow', 'red'].includes(value)
          ? value
          : fallback;
      });

    this.slotFeedback = safeFeedback;

    return [...this.slotFeedback];
  }

  lockGreenSlots(feedback = this.slotFeedback) {
    const newlyLockedSlotIndexes = [];

    feedback.forEach((status, slotIndex) => {
      if (status === 'green' && !this.isSlotLocked(slotIndex)) {
        this.lockedSlots.add(slotIndex);
        newlyLockedSlotIndexes.push(slotIndex);
      }
    });

    return newlyLockedSlotIndexes;
  }

  resetUnlockedFeedback() {
    this.slotFeedback = this.slotFeedback.map((status, slotIndex) =>
      this.isSlotLocked(slotIndex) ? 'green' : 'neutral'
    );
  }

  consumeAttempt() {
    if (this.attemptsLeft <= 0) return 0;

    this.attemptsLeft -= 1;
    this.syncAttemptsToReconstruction();

    return this.attemptsLeft;
  }

  setAttemptsLeft(attemptsLeft) {
    const safeAttempts = Math.max(0, Math.min(this.maxAttempts, Number(attemptsLeft) || 0));
    this.attemptsLeft = safeAttempts;
    this.syncAttemptsToReconstruction();
  }

  setUiLocked(locked = true) {
    this.uiLocked = Boolean(locked);
  }

  getSnapshot() {
    return {
      activeSlotCount: this.activeSlotCount,
      placedCards: [...this.placedCards],
      slotFeedback: [...this.slotFeedback],
      attemptsLeft: this.attemptsLeft,
      lockedSlots: [...this.lockedSlots],
      selectedSlotIndex: this.selectedSlotIndex,
      uiLocked: this.uiLocked
    };
  }

  restoreSnapshot(snapshot = {}) {
    const placedCards = Array.isArray(snapshot.placedCards)
      ? snapshot.placedCards.slice(0, this.activeSlotCount)
      : [];

    this.placedCards = new Array(this.activeSlotCount)
      .fill(null)
      .map((_, index) => {
        const cardIndex = placedCards[index];
        return this.isValidCard(cardIndex) ? cardIndex : null;
      });

    const feedback = Array.isArray(snapshot.slotFeedback)
      ? snapshot.slotFeedback
      : [];

    this.setFeedback(feedback);

    const lockedSlots = Array.isArray(snapshot.lockedSlots)
      ? snapshot.lockedSlots
      : [];

    this.lockedSlots = new Set(
      lockedSlots.filter(slotIndex => this.isValidSlot(slotIndex))
    );

    this.selectedSlotIndex = this.isValidSlot(snapshot.selectedSlotIndex) &&
      this.isSlotEmpty(snapshot.selectedSlotIndex) &&
      !this.isSlotLocked(snapshot.selectedSlotIndex)
      ? snapshot.selectedSlotIndex
      : null;

    this.setAttemptsLeft(snapshot.attemptsLeft ?? this.maxAttempts);
    this.uiLocked = Boolean(snapshot.uiLocked);
    this.resetUnlockedFeedback();
  }

  syncAttemptsToReconstruction() {
    if (!this.reconstruction || typeof this.reconstruction !== 'object') return;
    this.reconstruction.playerAttemptsLeft = this.attemptsLeft;
  }
}