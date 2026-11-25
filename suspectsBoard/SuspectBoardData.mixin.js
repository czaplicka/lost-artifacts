import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

import {
  getPublicSuspectList,
  getSuspectCaseSummary
} from '../ui/suspectUtils.js';

const text = key => __dialogueText(
  'suspectsBoard/SuspectBoardData.mixin.js',
  key
);

// Cache belongs to one synchronous refreshBoard() call only.
const refreshCaches = new WeakMap();

function loadPublicSuspects() {
  try {
    return getPublicSuspectList();
  } catch (error) {
    console.error(
      '[SuspectsScene] Could not load suspect list.',
      error
    );

    return [];
  }
}

export const SuspectBoardDataMixin = {
  getAllSuspects() {
    const cache = refreshCaches.get(this);

    if (!cache) {
      return loadPublicSuspects();
    }

    if (!cache.loaded) {
      cache.suspects = loadPublicSuspects();
      cache.loaded = true;
    }

    return cache.suspects;
  },

  getFilteredSuspects() {
    const suspects = this.getAllSuspects();

    if (this.filterMode === 'active') {
      return suspects.filter(
        suspect => !suspect.deductionState?.eliminated
      );
    }

    if (this.filterMode === 'eliminated') {
      return suspects.filter(
        suspect => suspect.deductionState?.eliminated
      );
    }

    return suspects;
  },

  getCardsPerPage() {
    return typeof this.getSuspectCardsLayout === 'function'
      ? this.getSuspectCardsLayout().cardsPerPage
      : 4;
  },

  getPageCount() {
    return Math.max(
      1,
      Math.ceil(
        this.getFilteredSuspects().length /
        this.getCardsPerPage()
      )
    );
  },

  getVisibleSuspects() {
    const suspects = this.getFilteredSuspects();
    const perPage = this.getCardsPerPage();

    const pages = Math.max(
      1,
      Math.ceil(suspects.length / perPage)
    );

    this.currentPage = Math.max(
      0,
      Math.min(
        Number.isInteger(this.currentPage)
          ? this.currentPage
          : 0,
        pages - 1
      )
    );

    return suspects.slice(
      this.currentPage * perPage,
      (this.currentPage + 1) * perPage
    );
  },

  refreshBoard() {
    // Preserve an outer refresh's cache if rendering triggers a nested refresh.
    const previousCache = refreshCaches.get(this);

    refreshCaches.set(this, {
      loaded: false,
      suspects: []
    });

    try {
      this.clearContainer(this.cardsContainer);
      this.clearContainer(this.detailsContainer);

      const visible = this.getVisibleSuspects();

      if (
        !visible.some(
          suspect => suspect.id === this.selectedSuspectId
        )
      ) {
        this.selectedSuspectId = visible[0]?.id || null;
      }

      this.updateHeader();
      this.updateFilterButtonStyles();
      this.renderSuspectCards(visible);
      this.renderDetailsPanel();
      this.updatePagination();
    } finally {
      if (previousCache) {
        refreshCaches.set(this, previousCache);
      } else {
        refreshCaches.delete(this);
      }
    }
  },

  updateHeader() {
    const suspects = this.getAllSuspects();

    const cleared = suspects.filter(
      suspect => suspect.deductionState?.eliminated === true
    ).length;

    let summary = {
      hypothesisCompleted: false
    };

    try {
      summary = getSuspectCaseSummary();
    } catch (error) {
      console.warn(
        '[SuspectsScene] Summary unavailable.',
        error
      );
    }

    const results =
      typeof this.getCompletedCrimeLabResults === 'function'
        ? this.getCompletedCrimeLabResults()
        : [];

    const labComplete =
      this.getCrimeLabCompleted?.() === true;

    const labLabel = labComplete
      ? text('t_5c88c43a0421003fa93a')
      : results.length
        ? `${text('t_5549929b5e54118ce170')}` +
          `${results.length}` +
          `${text('t_8d2cedfe81c77aaa05d9')}`
        : text('t_8ee2e444c1aa05fb32d0');

    const theory =
      this.gameState.reconstructedHeist?.playerTheoryResult;

    const methodRecorded =
      summary.hypothesisCompleted ||
      ['exact', 'partial', 'weak'].includes(theory);

    this.summaryText?.setText(
      `${text('t_1550a552e9217295d875')}` +
      `${suspects.length}` +
      `${text('t_2cdb95b90965eceb07e6')}` +
      `${suspects.length - cleared}` +
      `${text('t_41a443aaeb8d0584f454')}` +
      `${cleared}` +
      `${text('t_0aad7da77d2ed59c396c')}` +
      `${labLabel}` +
      `${text('t_531704e3c8ce4550cbb7')}` +
      `${
        methodRecorded
          ? text('t_1c606415d06b78f08ab0')
          : text('t_332011b91ccd9887592c')
      }`
    );

    if (this.exclusionFinished) {
      this.modeHintText?.setText(
        text('t_f803f2fc9f03621507d6')
      );

      return;
    }

    if (this.excludeMode) {
      this.modeHintText?.setText(
        text('t_c8fdd9a5df3a20cb2f69')
      );

      return;
    }

    if (!results.length) {
      this.modeHintText?.setText(
        text('t_e8971d6c42baa1b8b713')
      );

      return;
    }

    const labels = [
      ...new Set(
        results.map(
          result =>
            this.formatEvidenceField?.(result.field) ||
            result.label
        )
      )
    ];

    this.modeHintText?.setText(
      `${text('t_954ba519d13259994dce')}` +
      `${labels.join(text('t_005e1574a2b5c8163046'))}` +
      `${text('t_2ddcb29fe7b3bb0e8f14')}`
    );
  },

  updateFilterButtonStyles() {
    (this.filterButtons || []).forEach(button => {
      button.isActive =
        button.filterId === this.filterMode;

      button.applyStyle?.();

      this.setButtonEnabled(
        button,
        !this.excludeMode
      );
    });
  },

  getSuspectFileNumber(suspectId) {
    const index = this.getAllSuspects().findIndex(
      suspect => suspect.id === suspectId
    );

    return index < 0
      ? '--'
      : String(index + 1).padStart(2, '0');
  },

  updatePagination() {
    const count = this.getPageCount();
    const multiple = count > 1;

    this.previousPageButton?.setVisible(multiple);
    this.nextPageButton?.setVisible(multiple);
    this.pageText?.setVisible(multiple);

    if (!multiple) return;

    this.pageText?.setText(
      `${text('t_f8119b8ecd8507346fa7')}` +
      `${this.currentPage + 1}` +
      `${text('t_8a5edab282632443219e')}` +
      `${count}`
    );

    if (this.previousPageButton) {
      this.setButtonEnabled(
        this.previousPageButton,
        this.currentPage > 0
      );
    }

    if (this.nextPageButton) {
      this.setButtonEnabled(
        this.nextPageButton,
        this.currentPage < count - 1
      );
    }
  },

  clearContainer(container) {
    if (!container) return;

    // Destroys children once, including their local listeners.
    container.removeAll(true);
  }
};