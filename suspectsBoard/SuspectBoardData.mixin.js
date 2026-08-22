// Handles the suspect data pipeline: filtering, pagination, board refresh,
// header summary text and generic container cleanup.

import {
  getPublicSuspectList,
  getSuspectCaseSummary
} from '../ui/suspectUtils.js';

export const SuspectBoardDataMixin = {
  getAllSuspects() {
    try {
      return getPublicSuspectList();
    } catch (error) {
      console.error(
        '[SuspectsScene] Could not load suspect list.',
        error
      );

      return [];
    }
  },

  getFilteredSuspects() {
    const suspects = this.getAllSuspects();

    if (this.filterMode === 'active') {
      return suspects.filter(
        (suspect) => !suspect.deductionState?.eliminated
      );
    }

    if (this.filterMode === 'eliminated') {
      return suspects.filter(
        (suspect) => suspect.deductionState?.eliminated
      );
    }

    return suspects;
  },

  getCardsPerPage() {
    return 4;
  },

  getPageCount() {
    const suspects = this.getFilteredSuspects();
    const cardsPerPage = this.getCardsPerPage();

    return Math.max(
      1,
      Math.ceil(suspects.length / cardsPerPage)
    );
  },

  getVisibleSuspects() {
    const suspects = this.getFilteredSuspects();
    const cardsPerPage = this.getCardsPerPage();
    const pageCount = this.getPageCount();

    if (this.currentPage > pageCount - 1) {
      this.currentPage = pageCount - 1;
    }

    const start = this.currentPage * cardsPerPage;

    return suspects.slice(start, start + cardsPerPage);
  },

  refreshBoard() {
    this.clearContainer(this.cardsContainer);
    this.clearContainer(this.detailsContainer);

    const allSuspects = this.getAllSuspects();
    const visibleSuspects = this.getVisibleSuspects();

    if (
      !this.selectedSuspectId ||
      !allSuspects.some(
        (suspect) => suspect.id === this.selectedSuspectId
      )
    ) {
      this.selectedSuspectId = visibleSuspects[0]?.id || null;
    }

    this.updateHeader();
    this.updateFilterButtonStyles();
    this.renderSuspectCards(visibleSuspects);
    this.renderDetailsPanel();
    this.updatePagination();
  },

  updateHeader() {
    let summary;

    try {
      summary = getSuspectCaseSummary();
    } catch (error) {
      summary = {
        total: 0,
        active: 0,
        eliminated: 0,
        crimeLabCompleted: false,
        hypothesisCompleted: false
      };
    }

    const labLabel = this.getCrimeLabCompleted()
      ? 'LAB: COMPLETE'
      : 'LAB: PENDING';

    const hypothesisLabel = summary.hypothesisCompleted
      ? 'METHOD: CONFIRMED'
      : 'METHOD: PENDING';

    this.summaryText.setText(
      `FILES: ${summary.total}   ACTIVE: ${summary.active}   CLEARED: ${summary.eliminated}   ${labLabel}   ${hypothesisLabel}`
    );

    const hairResult =
      this.gameState.identityEvidence?.thief_value ||
      this.gameState.currentMission?.forensicHardEvidence?.find(
        (evidence) =>
          evidence.field === 'hair_color' ||
          evidence.forensicField === 'hair_color'
      )?.value ||
      null;

    if (hairResult) {
      this.modeHintText?.setText(
        `LAB EVIDENCE: Recovered hair sample — ${String(hairResult).toUpperCase()}.`
      );

      return;
    }

    if (!this.excludeMode && !this.exclusionFinished) {
      this.modeHintText?.setText(
        'Review the lab evidence, then enter Exclude Mode to clear files.'
      );
    }
  },

  updateFilterButtonStyles() {
    this.filterButtons.forEach((button) => {
      button.isActive = button.filterId === this.filterMode;
      button.applyStyle?.();

      this.setButtonEnabled(button, !this.excludeMode);
    });
  },

  getSuspectFileNumber(suspectId) {
    const allSuspects = this.getAllSuspects();

    const index = allSuspects.findIndex(
      (suspect) => suspect.id === suspectId
    );

    return String(index + 1).padStart(2, '0');
  },

  updatePagination() {
    const pageCount = this.getPageCount();
    const hasMultiplePages = pageCount > 1;

    this.previousPageButton.setVisible(hasMultiplePages);
    this.nextPageButton.setVisible(hasMultiplePages);
    this.pageText.setVisible(hasMultiplePages);

    if (!hasMultiplePages) return;

    this.pageText.setText(
      `PAGE ${this.currentPage + 1}/${pageCount}`
    );

    this.setButtonEnabled(
      this.previousPageButton,
      this.currentPage > 0
    );

    this.setButtonEnabled(
      this.nextPageButton,
      this.currentPage < pageCount - 1
    );
  },

  clearContainer(container) {
    if (!container) return;

    const children = [...container.list];

    children.forEach((child) => {
      child.removeAllListeners?.();
      child.destroy?.();
    });

    container.removeAll(true);
  }
};