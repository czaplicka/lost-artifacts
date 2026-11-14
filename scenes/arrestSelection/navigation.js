import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { SLIDE_DISTANCE, SLIDE_DURATION, PAL, DEFAULT_DIALOGUE, DEFAULT_NOTE } from './config.js';

export const navigationMethods = {
  goToSuspect(index) {
    if (
      !this.canNavigate() ||
      index === this.currentSuspectIndex ||
      index < 0 ||
      index >= this.displaySuspects.length
    ) {
      return;
    }

    const direction = index > this.currentSuspectIndex ? 1 : -1;

    this.changeSuspect(direction, index);
  },

  changeSuspect(direction, targetIndex = null) {
    if (!this.displaySuspects.length || !this.canNavigate()) {
      return;
    }

    const total = this.displaySuspects.length;

    const nextIndex =
      targetIndex !== null
        ? targetIndex
        : (this.currentSuspectIndex + direction + total) % total;

    if (nextIndex === this.currentSuspectIndex) return;

    this.closeZoom();

    this.isAnimatingSlide = true;
    this.disableNavigation();

    this.currentSuspectIndex = nextIndex;

    const oldCard = this.currentCard;

    const newCard = this.buildSuspectCard(
      this.displaySuspects[nextIndex],
      nextIndex,
      direction * SLIDE_DISTANCE
    );

    newCard.setAlpha(0);

    this.cardSlot.add(newCard);
    this.updatePagination();

    this.tweens.add({
      targets: oldCard,
      x: -direction * SLIDE_DISTANCE,
      alpha: 0,
      duration: SLIDE_DURATION,
      ease: 'Cubic.Out'
    });

    this.tweens.add({
      targets: newCard,
      x: 0,
      alpha: 1,
      duration: SLIDE_DURATION,
      ease: 'Cubic.Out',

      onComplete: () => {
        if (oldCard) {
          this.cardSlot.remove(oldCard, true);
        }

        this.currentCard = newCard;
        this.isAnimatingSlide = false;

        if (!this.selectionLocked) {
          this.enableNavigation();
        }

        this.dialogueText?.setText(DEFAULT_DIALOGUE);
        this.bottomNoteText?.setText(DEFAULT_NOTE);
      }
    });
  },

  updatePagination() {
    this.counterText?.setText(
      `${__dialogueText("scenes/arrestSelection/navigation.js", "t_3e25b41de17bf0813725")}${this.currentSuspectIndex + 1}${__dialogueText("scenes/arrestSelection/navigation.js", "t_005e1574a2b5c8163046")}${this.displaySuspects.length}`
    );

    this.refreshThumbs();
  },

  refreshThumbs() {
    this.thumbs.forEach((thumb, index) => {
      const active = index === this.currentSuspectIndex;

      thumb.frame.setStrokeStyle(
        active ? 5 : 3,
        active ? PAL.gold : 0x8b6840,
        1
      );

      thumb.setScale(active ? 1.07 : 1);
      thumb.setAlpha(active ? 1 : 0.6);
    });
  },

  canNavigate() {
    return (
      !this.selectionLocked &&
      !this.resultCommitted &&
      !this.isAnimatingSlide &&
      !this.isLeaving &&
      !this.confirmOpen &&
      !this.zoomOverlay?.visible
    );
  },

  disableNavigation() {
    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      arrow?.disableInteractive();
      arrow?.setAlpha(0.45);
    });

    this.thumbs.forEach((thumb) => thumb.disableInteractive());
  },

  enableNavigation() {
    if (
      this.selectionLocked ||
      this.resultCommitted ||
      this.isLeaving
    ) {
      return;
    }

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      arrow?.setInteractive({ useHandCursor: true });
      arrow?.setAlpha(1);
    });

    this.thumbs.forEach((thumb) =>
      thumb.setInteractive({ useHandCursor: true })
    );

    this.refreshThumbs();
  }
};
