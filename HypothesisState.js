export class HypothesisState {
  constructor({
    reconstruction = null,
    activeSlotCount = 3,
    attempts = 3
  } = {}) {
    this.reconstruction =
      reconstruction &&
      typeof reconstruction === 'object'
        ? reconstruction
        : {};

    this.activeSlotCount = Math.max(
      1,
      Math.min(3, Number(activeSlotCount) || 3)
    );

    this.maxAttempts = Math.max(
      1,
      Number(attempts) || 3
    );

    this.cards = [];

    this.reset();
  }

  reset() {
  this.placedCards =
    new Array(this.activeSlotCount).fill(null);

  this.slotFeedback =
    new Array(this.activeSlotCount).fill('neutral');

  this.attemptsLeft = this.maxAttempts;
  this.lockedSlots = new Set();
  this.selectedSlotIndex = null;
  this.selectedCardIndex = null;
  this.uiLocked = false;

  this.syncAttemptsToReconstruction();
}

  setActiveSlotCount(activeSlotCount) {
    const nextCount = Math.max(
      1,
      Math.min(3, Number(activeSlotCount) || 3)
    );

    if (nextCount === this.activeSlotCount) {
      return;
    }

    this.activeSlotCount = nextCount;
    this.reset();
  }

  setCards(cards = []) {
    this.cards = Array.isArray(cards)
      ? cards
      : [];

    /*
     * Jeśli po odświeżeniu kart zaznaczona karta
     * przestanie istnieć, anulujemy zaznaczenie.
     */
    if (!this.isValidCard(this.selectedCardIndex)) {
      this.selectedCardIndex = null;
    }
  }

  getCard(cardIndex) {
    if (!Number.isInteger(cardIndex)) {
      return null;
    }

    return this.cards?.[cardIndex] || null;
  }

  getPlacedCardIndex(slotIndex) {
    if (!this.isValidSlot(slotIndex)) {
      return null;
    }

    return this.placedCards[slotIndex];
  }

  getPlacedCard(slotIndex) {
    const cardIndex =
      this.getPlacedCardIndex(slotIndex);

    return cardIndex === null
      ? null
      : this.getCard(cardIndex);
  }

  getOrderedCards() {
    return this.placedCards.map(cardIndex =>
      this.getCard(cardIndex)
    );
  }

  getCardSlot(cardIndex) {
    if (!this.isValidCard(cardIndex)) {
      return -1;
    }

    return this.placedCards.indexOf(cardIndex);
  }

  isValidSlot(slotIndex) {
    return (
      Number.isInteger(slotIndex) &&
      slotIndex >= 0 &&
      slotIndex < this.activeSlotCount
    );
  }

  isValidCard(cardIndex) {
    return (
      Number.isInteger(cardIndex) &&
      cardIndex >= 0 &&
      Array.isArray(this.cards) &&
      cardIndex < this.cards.length
    );
  }

  isSlotLocked(slotIndex) {
    return this.lockedSlots.has(slotIndex);
  }

  isSlotEmpty(slotIndex) {
    return (
      this.isValidSlot(slotIndex) &&
      this.placedCards[slotIndex] === null
    );
  }

  isCardPlaced(cardIndex) {
    return this.getCardSlot(cardIndex) !== -1;
  }

  isTimelineComplete() {
    return this.placedCards.every(cardIndex =>
      cardIndex !== null
    );
  }

  getFirstAvailableSlot() {
    return this.placedCards.findIndex(
      (cardIndex, slotIndex) =>
        cardIndex === null &&
        !this.isSlotLocked(slotIndex)
    );
  }

  /*
   * =========================================================
   * NOWY MODEL: WYBIERZ KARTĘ → KLIKNIJ PYTANIE
   * =========================================================
   */

  selectCard(cardIndex) {
    if (this.uiLocked) {
      return {
        ok: false,
        reason: 'ui_locked'
      };
    }

    if (!this.isValidCard(cardIndex)) {
      return {
        ok: false,
        reason: 'invalid_card'
      };
    }

    if (this.isCardPlaced(cardIndex)) {
      return {
        ok: false,
        reason: 'card_already_used',
        cardIndex,
        slotIndex: this.getCardSlot(cardIndex)
      };
    }

    /*
     * Drugie kliknięcie tej samej karty anuluje wybór.
     */
    if (this.selectedCardIndex === cardIndex) {
      this.selectedCardIndex = null;
      this.selectedSlotIndex = null;

      return {
        ok: true,
        selected: false,
        cardIndex
      };
    }

    this.selectedCardIndex = cardIndex;
    this.selectedSlotIndex = null;

    return {
      ok: true,
      selected: true,
      cardIndex
    };
  }

  clearSelectedCard() {
    this.selectedCardIndex = null;
  }

  placeSelectedCard(slotIndex) {
    if (this.uiLocked) {
      return {
        ok: false,
        reason: 'ui_locked'
      };
    }

    if (!this.isValidSlot(slotIndex)) {
      return {
        ok: false,
        reason: 'invalid_slot'
      };
    }

    if (this.isSlotLocked(slotIndex)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotIndex
      };
    }

    if (!this.isSlotEmpty(slotIndex)) {
      return {
        ok: false,
        reason: 'slot_occupied',
        slotIndex,
        cardIndex: this.placedCards[slotIndex]
      };
    }

    const cardIndex = this.selectedCardIndex;

    if (!this.isValidCard(cardIndex)) {
      return {
        ok: false,
        reason: 'no_card_selected'
      };
    }

    if (this.isCardPlaced(cardIndex)) {
      this.selectedCardIndex = null;

      return {
        ok: false,
        reason: 'card_already_used',
        cardIndex,
        slotIndex: this.getCardSlot(cardIndex)
      };
    }

    this.placedCards[slotIndex] = cardIndex;
    this.slotFeedback[slotIndex] = 'neutral';

    this.selectedCardIndex = null;
    this.selectedSlotIndex = null;

    this.resetUnlockedFeedback();

    return {
      ok: true,
      action: 'placed',
      cardIndex,
      slotIndex
    };
  }

  toggleSelectedSlot(slotIndex) {
    if (
      !this.isValidSlot(slotIndex) ||
      this.isSlotLocked(slotIndex) ||
      !this.isSlotEmpty(slotIndex)
    ) {
      return {
        ok: false,
        reason: 'slot_unavailable',
        selectedSlotIndex: this.selectedSlotIndex
      };
    }

    this.selectedSlotIndex =
      this.selectedSlotIndex === slotIndex
        ? null
        : slotIndex;

    return {
      ok: true,
      selectedSlotIndex: this.selectedSlotIndex,
      selected:
        this.selectedSlotIndex === slotIndex
    };
  }

  clearSelectedSlot() {
    this.selectedSlotIndex = null;
  }

  removeCard(slotIndex) {
    if (this.uiLocked) {
      return {
        ok: false,
        reason: 'ui_locked'
      };
    }

    if (!this.isValidSlot(slotIndex)) {
      return {
        ok: false,
        reason: 'invalid_slot'
      };
    }

    if (this.isSlotLocked(slotIndex)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotIndex
      };
    }

    const cardIndex = this.placedCards[slotIndex];

    if (cardIndex === null) {
      return {
        ok: false,
        reason: 'slot_empty',
        slotIndex
      };
    }

    this.placedCards[slotIndex] = null;
    this.slotFeedback[slotIndex] = 'neutral';

    this.selectedCardIndex = null;
    this.selectedSlotIndex = null;

    this.resetUnlockedFeedback();

    return {
      ok: true,
      cardIndex,
      slotIndex
    };
  }

  setFeedback(feedback = []) {
    this.slotFeedback =
      new Array(this.activeSlotCount)
        .fill('red')
        .map((fallback, index) => {
          const value = feedback[index];

          return [
            'neutral',
            'green',
            'yellow',
            'red'
          ].includes(value)
            ? value
            : fallback;
        });

    return [...this.slotFeedback];
  }

  lockGreenSlots(feedback = this.slotFeedback) {
    const newlyLockedSlotIndexes = [];

    feedback.forEach((status, slotIndex) => {
      if (
        status === 'green' &&
        !this.isSlotLocked(slotIndex)
      ) {
        this.lockedSlots.add(slotIndex);
        newlyLockedSlotIndexes.push(slotIndex);
      }
    });

    return newlyLockedSlotIndexes;
  }

  resetUnlockedFeedback() {
    this.slotFeedback = this.slotFeedback.map(
      (status, slotIndex) =>
        this.isSlotLocked(slotIndex)
          ? 'green'
          : 'neutral'
    );
  }

  consumeAttempt() {
    if (this.attemptsLeft <= 0) {
      return 0;
    }

    this.attemptsLeft -= 1;

    this.syncAttemptsToReconstruction();

    return this.attemptsLeft;
  }

  setAttemptsLeft(attemptsLeft) {
    const safeAttempts = Math.max(
      0,
      Math.min(
        this.maxAttempts,
        Number(attemptsLeft) || 0
      )
    );

    this.attemptsLeft = safeAttempts;

    this.syncAttemptsToReconstruction();
  }

  setUiLocked(locked = true) {
    this.uiLocked = Boolean(locked);

    if (this.uiLocked) {
      this.selectedCardIndex = null;
      this.selectedSlotIndex = null;
    }
  }

  getSnapshot() {
    return {
      activeSlotCount: this.activeSlotCount,
      placedCards: [...this.placedCards],
      slotFeedback: [...this.slotFeedback],
      attemptsLeft: this.attemptsLeft,
      lockedSlots: [...this.lockedSlots],
      selectedSlotIndex: this.selectedSlotIndex,
      selectedCardIndex: this.selectedCardIndex,
      uiLocked: this.uiLocked
    };
  }

  restoreSnapshot(snapshot = {}) {
    const placedCards = Array.isArray(snapshot.placedCards)
      ? snapshot.placedCards.slice(
        0,
        this.activeSlotCount
      )
      : [];

    this.placedCards =
      new Array(this.activeSlotCount)
        .fill(null)
        .map((_, index) => {
          const cardIndex = placedCards[index];

          return this.isValidCard(cardIndex)
            ? cardIndex
            : null;
        });

    const feedback = Array.isArray(snapshot.slotFeedback)
      ? snapshot.slotFeedback
      : [];

    this.setFeedback(feedback);

    const lockedSlots = Array.isArray(snapshot.lockedSlots)
      ? snapshot.lockedSlots
      : [];

    this.lockedSlots = new Set(
      lockedSlots.filter(slotIndex =>
        this.isValidSlot(slotIndex)
      )
    );

    this.selectedSlotIndex =
      this.isValidSlot(snapshot.selectedSlotIndex) &&
      this.isSlotEmpty(snapshot.selectedSlotIndex) &&
      !this.isSlotLocked(snapshot.selectedSlotIndex)
        ? snapshot.selectedSlotIndex
        : null;

    const selectedCardIndex =
      snapshot.selectedCardIndex;

    this.selectedCardIndex =
      this.isValidCard(selectedCardIndex) &&
      !this.isCardPlaced(selectedCardIndex)
        ? selectedCardIndex
        : null;

    this.setAttemptsLeft(
      snapshot.attemptsLeft ??
      this.maxAttempts
    );

    this.uiLocked = Boolean(snapshot.uiLocked);

    if (this.uiLocked) {
      this.selectedCardIndex = null;
      this.selectedSlotIndex = null;
    }

    this.resetUnlockedFeedback();
  }

  syncAttemptsToReconstruction() {
    if (
      !this.reconstruction ||
      typeof this.reconstruction !== 'object'
    ) {
      return;
    }

    this.reconstruction.playerAttemptsLeft =
      this.attemptsLeft;
  }
}