import {
  STAT_IDS,
  STAT_NAMES,
  getDifficulty,
  getEffectiveStats,
  getProfile,
} from './CharacterCreationData.js';
import { getAppearanceSummary } from './AppearanceControls.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderRow(label, value, attribute = '') {
  return `
    <div class="character-dossier-row">
      <div class="character-dossier-label">${label}</div>
      <div class="character-dossier-value" ${attribute}>${escapeHtml(value)}</div>
    </div>
  `;
}

function renderStats(stats) {
  return `
    <div class="character-dossier-row">
      <div class="character-dossier-label">Instincts</div>

      <div class="character-dossier-stats">
        ${STAT_IDS.map((statId) => `
          <span
            class="character-dossier-stat"
            data-dossier-stat="${statId}"
          >
            ${STAT_NAMES[statId]} ${stats[statId]}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderDossierStep(playerData) {
  const profile = getProfile(playerData.profile);
  const difficulty = getDifficulty(playerData.difficulty);
  const stats = getEffectiveStats(playerData);
  const name = playerData.name || 'UNNAMED APPLICANT';
  const alias = playerData.alias || 'UNLISTED — SUSPICIOUSLY MODEST';

  return `
    <section
      class="character-step-panel"
      data-step-panel="4"
    >
      <h2 class="character-section-title">PRELIMINARY DOSSIER</h2>

      <p class="character-section-intro">
        Please inspect carefully. Mark Agency accepts no responsibility
        for spelling, fate, or consequences.
      </p>

      <article class="character-dossier">
        <div class="character-dossier-label">Field Operative</div>

        <div
          class="character-dossier-name"
          data-dossier-name
        >
          ${escapeHtml(name)}
        </div>

        ${renderRow('Alias', alias, 'data-dossier-alias')}
        ${renderRow('Profile', profile.name, 'data-dossier-profile')}
        ${renderRow('Profile Bonus', profile.bonus, 'data-dossier-profile-bonus')}
        ${renderRow('Appearance', getAppearanceSummary(playerData.appearance), 'data-dossier-appearance')}
        ${renderRow('Case Pressure', difficulty.name, 'data-dossier-difficulty')}
        ${renderStats(stats)}
      </article>
    </section>
  `;
}