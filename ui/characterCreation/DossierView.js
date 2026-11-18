// ui/characterCreation/DossierView.js
import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import {
  STAT_IDS,
  STAT_NAMES,
  getDifficulty,
  getEffectiveStats,
  getProfile
} from './CharacterCreationData.js';
import { getAppearanceSummary } from './AppearanceControls.js';

const SOURCE = 'ui/characterCreation/DossierView.js';
const text = (id) => __dialogueText(SOURCE, id);

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
    font: 400 9px/1.6 'Press Start 2P', monospace;
  }
`;

function escapeHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderRow(label, value, attribute = '') {
  return [
    text('t_45e4cb399a4d5895ed21'),
    label,
    text('t_9146f70d2529d832b14f'),
    attribute,
    text('t_62b67e1f685b7fef5110'),
    escapeHtml(value),
    text('t_d4f0d23ad42bb69eac86')
  ].join('');
}

function renderStats(stats) {
  const entries = STAT_IDS.map((statId) => [
    text('t_1f3537a31d24e261a2b8'),
    statId,
    text('t_2cee20f9419a1281add5'),
    STAT_NAMES[statId],
    text('t_36a9e7f1c95b82ffb997'),
    stats[statId],
    text('t_bbeaf95341dfab8e792a')
  ].join('')).join('');

  return text('t_e8ff16abeabf174589fd') +
    entries +
    text('t_6d6b54427c1f298c0539');
}

export function renderDossierStep(playerData) {
  const profile = getProfile(playerData.profile);
  const difficulty = getDifficulty(playerData.difficulty);
  const stats = getEffectiveStats(playerData);
  const name = playerData.name || text('t_803b7246d0b19ce1283c');
  const alias = playerData.alias || text('t_fbc956c208e6e60b20c1');
  const separator = text('t_ac1e06ffe7bf6c03d4ee');

  const details = [
    text('t_74366fdbe71b9714453a'),
    escapeHtml(name),
    text('t_e875ec88fdd57a64471a'),
    renderRow(text('t_b19e02e9502bbe5ac59d'), alias, 'data-dossier-alias'),
    separator,
    renderRow(text('t_d696a35bdd1883da07a8'), profile.name, 'data-dossier-profile'),
    separator,
    renderRow(text('t_7ca366b05bf258c6d43c'), profile.bonus, 'data-dossier-profile-bonus'),
    separator,
    renderRow(
      text('t_3907fa7f80722a6fc58c'),
      getAppearanceSummary(playerData.appearance),
      'data-dossier-appearance'
    ),
    separator,
    renderRow(text('t_f3ba306d86066cb50bef'), difficulty.name, 'data-dossier-difficulty'),
    separator,
    renderStats(stats),
    text('t_d00432c0dc1dc2b0efcb')
  ].join('');

  return `
    <style>${PORTRAIT_STYLES}</style>
    <div class="cc-dossier-with-portrait">
      <div class="cc-dossier-details">${details}</div>
      <figure class="cc-dossier-portrait">
        <canvas data-avatar-canvas width="358" height="512"
                role="img" aria-label="Portrait of ${escapeHtml(name)}"></canvas>
        <figcaption>DETECTIVE PORTRAIT</figcaption>
      </figure>
    </div>`;
}