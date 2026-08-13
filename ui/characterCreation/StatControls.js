import {
  STAT_IDS,
  STAT_NAMES,
} from './CharacterCreationData.js';

const STAT_DESCRIPTIONS = {
  observation: 'Spot hidden details and suspiciously placed objects.',
  deduction: 'Connect evidence before it starts connecting itself.',
  rapport: 'Make people talk. Preferably truthfully.',
  resourcefulness: 'Find shortcuts, favours, and morally flexible solutions.',
};

function renderStatRow(statId, value, remainingPoints) {
  const label = STAT_NAMES[statId];
  const description = STAT_DESCRIPTIONS[statId];
  const decreaseDisabled = value <= 1;
  const increaseDisabled = remainingPoints <= 0 || value >= 4;

  return `
    <article class="character-stat-row">
      <div>
        <div class="character-stat-title">${toTitleCase(label)}</div>
        <div class="character-stat-description">${description}</div>
      </div>

      <div class="character-stat-controls">
        <button
          class="character-stat-button"
          type="button"
          aria-label="Decrease ${toTitleCase(label)}"
          data-stat-action="decrease"
          data-stat="${statId}"
          ${decreaseDisabled ? 'disabled' : ''}
        >
          −
        </button>

        <output
          class="character-stat-value"
          data-stat-value="${statId}"
        >
          ${value}
        </output>

        <button
          class="character-stat-button"
          type="button"
          aria-label="Increase ${toTitleCase(label)}"
          data-stat-action="increase"
          data-stat="${statId}"
          ${increaseDisabled ? 'disabled' : ''}
        >
          +
        </button>
      </div>
    </article>
  `;
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function renderStatStep(playerData, remainingPoints) {
  return `
    <section
      class="character-step-panel"
      data-step-panel="2"
    >
      <div class="character-points-counter">
        <span
          class="character-points-value"
          data-remaining-points
        >
          ${remainingPoints}
        </span>

        <span class="character-points-label">
          Points Left
        </span>
      </div>

      <h2 class="character-section-title">
        PROFESSIONAL INSTINCTS
      </h2>

      <p class="character-section-intro">
        Assign 2 points. This shapes your approach,
        not your worth as a human being.
      </p>

      <div class="character-stat-list">
        ${STAT_IDS.map((statId) => (
          renderStatRow(
            statId,
            playerData.stats[statId],
            remainingPoints,
          )
        )).join('')}
      </div>
    </section>
  `;
}