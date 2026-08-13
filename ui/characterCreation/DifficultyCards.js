import { DIFFICULTIES } from './CharacterCreationData.js';

const DIFFICULTY_DETAILS = {
  rookie: {
    subtitle: 'For detectives with standards and a healthy respect for hints.',
    details: 'More hints · Softer penalties · Relaxed time pressure',
  },
  field: {
    subtitle: 'The recommended amount of professional discomfort.',
    details: 'Standard hints · Standard penalties · Standard time pressure',
  },
  master: {
    subtitle: 'For people who consider consequences a personal insult.',
    details: 'Few hints · Tough penalties · Strict time pressure',
  },
};

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderDifficultyCard(difficulty, index, selectedDifficultyId) {
  const selected = difficulty.id === selectedDifficultyId;
  const content = DIFFICULTY_DETAILS[difficulty.id];

  return `
    <button
      class="character-difficulty-card${selected ? ' is-selected' : ''}"
      type="button"
      role="radio"
      aria-checked="${selected}"
      data-difficulty="${difficulty.id}"
    >
      <span class="character-difficulty-number">${index + 1}</span>
      <span class="character-difficulty-name">${toTitleCase(difficulty.name)}</span>
      <span class="character-difficulty-subtitle">${content.subtitle}</span>
      <span class="character-difficulty-details">${content.details}</span>
    </button>
  `;
}

export function renderDifficultyStep(playerData) {
  return `
    <section
      class="character-step-panel"
      data-step-panel="3"
    >
      <h2 class="character-section-title">CASE PRESSURE</h2>

      <p class="character-section-intro">
        How much chaos would you like professionally documented?
      </p>

      <div
        class="character-difficulty-list"
        role="radiogroup"
        aria-label="Case difficulty"
      >
        ${DIFFICULTIES.map((difficulty, index) => (
          renderDifficultyCard(
            difficulty,
            index,
            playerData.difficulty,
          )
        )).join('')}
      </div>
    </section>
  `;
}