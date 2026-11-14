import { PROFILES } from './CharacterCreationData.js';

function renderProfileCard(profile, selectedProfileId) {
  const selected = profile.id === selectedProfileId;

  return `
    <button
      class="character-profile-card${selected ? ' is-selected' : ''}"
      type="button"
      role="radio"
      aria-checked="${selected}"
      data-profile="${profile.id}"
    >
      <span class="character-profile-icon">${getProfileIcon(profile.id)}</span>
      <span class="character-profile-name">${toTitleCase(profile.name)}</span>
      <span class="character-profile-bonus">${profile.bonus}</span>
      <span class="character-profile-description">
        ${getProfileDescription(profile.id)}
      </span>
    </button>
  `;
}

function getProfileIcon(profileId) {
  const icons = {
    analyst: '⌕',
    charmer: '♥',
    streetwise: '◆',
    archivist: '▤',
    improviser: '!',
  };

  return icons[profileId] ?? '?';
}

function getProfileDescription(profileId) {
  const descriptions = {
    analyst: 'You notice patterns, contradictions, and coffee stains shaped like motives.',
    charmer: 'People keep telling you secrets. Often by accident. Sometimes while crying.',
    streetwise: 'You know which alley to avoid and which bartender to bribe.',
    archivist: 'If it was catalogued, cursed, forged, or misfiled, you probably read about it.',
    improviser: 'Planning is nice. Surviving the consequences is nicer.',
  };

  return descriptions[profileId] ?? 'Professionally suspicious.';
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function renderProfileStep(playerData) {
  return `
    <section
      class="character-step-panel"
      data-step-panel="1"
    >
      <h2 class="character-section-title">HOW DO YOU WORK?</h2>

      <p class="character-section-intro">
        Pick a professional tendency. HR calls it a profile.
        Your old clients may disagree.
      </p>

      <div
        class="character-profile-grid"
        role="radiogroup"
        aria-label="Detective profile"
      >
        ${PROFILES.map((profile) => (
          renderProfileCard(profile, playerData.profile)
        )).join('')}
      </div>
    </section>
  `;
}