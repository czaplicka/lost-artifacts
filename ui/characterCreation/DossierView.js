import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
  return `${__dialogueText("ui/characterCreation/DossierView.js", "t_45e4cb399a4d5895ed21")}${label}${__dialogueText("ui/characterCreation/DossierView.js", "t_9146f70d2529d832b14f")}${attribute}${__dialogueText("ui/characterCreation/DossierView.js", "t_62b67e1f685b7fef5110")}${escapeHtml(value)}${__dialogueText("ui/characterCreation/DossierView.js", "t_d4f0d23ad42bb69eac86")}`;
}

function renderStats(stats) {
  return `${__dialogueText("ui/characterCreation/DossierView.js", "t_e8ff16abeabf174589fd")}${STAT_IDS.map((statId) => `${__dialogueText("ui/characterCreation/DossierView.js", "t_1f3537a31d24e261a2b8")}${statId}${__dialogueText("ui/characterCreation/DossierView.js", "t_2cee20f9419a1281add5")}${STAT_NAMES[statId]}${__dialogueText("ui/characterCreation/DossierView.js", "t_36a9e7f1c95b82ffb997")}${stats[statId]}${__dialogueText("ui/characterCreation/DossierView.js", "t_bbeaf95341dfab8e792a")}`).join('')}${__dialogueText("ui/characterCreation/DossierView.js", "t_6d6b54427c1f298c0539")}`;
}

export function renderDossierStep(playerData) {
  const profile = getProfile(playerData.profile);
  const difficulty = getDifficulty(playerData.difficulty);
  const stats = getEffectiveStats(playerData);
  const name = playerData.name || __dialogueText("ui/characterCreation/DossierView.js", "t_803b7246d0b19ce1283c");
  const alias = playerData.alias || __dialogueText("ui/characterCreation/DossierView.js", "t_fbc956c208e6e60b20c1");

  return `${__dialogueText("ui/characterCreation/DossierView.js", "t_74366fdbe71b9714453a")}${escapeHtml(name)}${__dialogueText("ui/characterCreation/DossierView.js", "t_e875ec88fdd57a64471a")}${renderRow(__dialogueText("ui/characterCreation/DossierView.js", "t_b19e02e9502bbe5ac59d"), alias, 'data-dossier-alias')}${__dialogueText("ui/characterCreation/DossierView.js", "t_ac1e06ffe7bf6c03d4ee")}${renderRow(__dialogueText("ui/characterCreation/DossierView.js", "t_d696a35bdd1883da07a8"), profile.name, 'data-dossier-profile')}${__dialogueText("ui/characterCreation/DossierView.js", "t_ac1e06ffe7bf6c03d4ee")}${renderRow(__dialogueText("ui/characterCreation/DossierView.js", "t_7ca366b05bf258c6d43c"), profile.bonus, 'data-dossier-profile-bonus')}${__dialogueText("ui/characterCreation/DossierView.js", "t_ac1e06ffe7bf6c03d4ee")}${renderRow(__dialogueText("ui/characterCreation/DossierView.js", "t_3907fa7f80722a6fc58c"), getAppearanceSummary(playerData.appearance), 'data-dossier-appearance')}${__dialogueText("ui/characterCreation/DossierView.js", "t_ac1e06ffe7bf6c03d4ee")}${renderRow(__dialogueText("ui/characterCreation/DossierView.js", "t_f3ba306d86066cb50bef"), difficulty.name, 'data-dossier-difficulty')}${__dialogueText("ui/characterCreation/DossierView.js", "t_ac1e06ffe7bf6c03d4ee")}${renderStats(stats)}${__dialogueText("ui/characterCreation/DossierView.js", "t_d00432c0dc1dc2b0efcb")}`;
}