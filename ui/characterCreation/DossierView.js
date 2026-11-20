// ui/characterCreation/DossierView.js

import {
  dialogueText as __dialogueText
} from '../../dialogues/DialogueText.js';

import {
  STAT_IDS,
  STAT_NAMES,
  getDifficulty,
  getEffectiveStats,
  getProfile,
  normalizePlayerData
} from './CharacterCreationData.js';

import {
  getAppearanceSummary
} from './AppearanceControls.js';

const SOURCE = 'ui/characterCreation/DossierView.js';

const text = id => __dialogueText(SOURCE, id);

const STYLE_ID = 'character-creation-dossier-styles';

const PORTRAIT_STYLES = `
#character-creation-root .cc-dossier-with-portrait {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

#character-creation-root .cc-dossier-details {
  flex: 1 1 360px;
  min-width: 0;
}

#character-creation-root .cc-dossier-portrait {
  flex: 0 1 220px;
  width: 100%;
  max-width: 220px;
  box-sizing: border-box;
  margin: 0;
  padding: 10px;
  border: 2px solid #59422e;
  background: #efe4c8;
  color: #2b2218;
  box-shadow: 3px 3px 0 rgba(43, 34, 24, .25);
}

#character-creation-root .cc-dossier-portrait canvas {
  display: block;
  width: 100%;
  height: auto;
  background: #e2d5b3;
  border: 1px solid #59422e;
  box-sizing: border-box;
}

#character-creation-root .cc-dossier-portrait figcaption {
  margin-top: 10px;
  text-align: center;
  font: 400 9px/1.6 'PressStart2P', monospace;
}
`;

export function installDossierStyles(
  doc = typeof document !== 'undefined' ? document : null
) {
  if (!doc) return false;

  if (doc.getElementById(STYLE_ID)) {
    return true;
  }

  const parent = doc.head || doc.documentElement;

  if (!parent) return false;

  const style = doc.createElement('style');

  style.id = STYLE_ID;
  style.textContent = PORTRAIT_STYLES;

  parent.appendChild(style);

  return true;
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderRow(label, value, attribute = '') {
  const dataAttribute = /^data-[a-z0-9-]+$/.test(attribute)
    ? ` ${attribute}`
    : '';

  return `
    <div class="character-dossier-row">
      <div class="character-dossier-label">
        ${escapeHtml(label)}
      </div>

      <div class="character-dossier-value"${dataAttribute}>
        ${escapeHtml(value)}
      </div>
    </div>`;
}

function renderStats(stats = {}) {
  const entries = STAT_IDS.map(statId => `
    <span
      class="character-dossier-stat"
      data-dossier-stat="${escapeHtml(statId)}"
    >
      ${escapeHtml(STAT_NAMES[statId])}
      ${escapeHtml(stats[statId] ?? 0)}
    </span>
  `).join('');

  return `
    <div class="character-dossier-row">
      <div class="character-dossier-label">
        Instincts
      </div>

      <div class="character-dossier-stats">
        ${entries}
      </div>
    </div>`;
}

export function renderDossierStep(playerData = {}) {
  installDossierStyles();

  const input =
    playerData &&
    typeof playerData === 'object' &&
    !Array.isArray(playerData)
      ? playerData
      : {};

  const data = normalizePlayerData(input);

  const profile = getProfile(data.profile);
  const difficulty = getDifficulty(data.difficulty);
  const stats = getEffectiveStats(data);

  const name =
    data.name ||
    text('t_803b7246d0b19ce1283c');

  const alias =
    data.alias ||
    text('t_fbc956c208e6e60b20c1');

  const details = `
    <section
      class="character-step-panel"
      data-step-panel="4"
    >
      <h2 class="character-section-title">
        PRELIMINARY DOSSIER
      </h2>

      <p class="character-section-intro">
        Please inspect carefully. Mark Agency accepts no responsibility
        for spelling, fate, or consequences.
      </p>

      <article class="character-dossier">
        <div class="character-dossier-label">
          Field Operative
        </div>

        <div
          class="character-dossier-name"
          data-dossier-name
        >
          ${escapeHtml(name)}
        </div>

        ${renderRow(
          text('t_b19e02e9502bbe5ac59d'),
          alias,
          'data-dossier-alias'
        )}

        ${renderRow(
          text('t_d696a35bdd1883da07a8'),
          profile?.name ?? '',
          'data-dossier-profile'
        )}

        ${renderRow(
          text('t_7ca366b05bf258c6d43c'),
          profile?.bonus ?? '',
          'data-dossier-profile-bonus'
        )}

        ${renderRow(
          text('t_3907fa7f80722a6fc58c'),
          getAppearanceSummary(data.appearance),
          'data-dossier-appearance'
        )}

        ${renderRow(
          text('t_f3ba306d86066cb50bef'),
          difficulty?.name ?? '',
          'data-dossier-difficulty'
        )}

        ${renderStats(stats)}
      </article>
    </section>
  `;

  return `
    <div class="cc-dossier-with-portrait">
      <div class="cc-dossier-details">
        ${details}
      </div>

      <figure class="cc-dossier-portrait">
        <canvas
          data-avatar-canvas
          width="358"
          height="512"
          role="img"
          aria-label="Portrait of ${escapeHtml(name)}"
        ></canvas>

        <figcaption>
          DETECTIVE PORTRAIT
        </figcaption>
      </figure>
    </div>`;
}