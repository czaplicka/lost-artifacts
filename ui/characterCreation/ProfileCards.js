import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { PROFILES } from './CharacterCreationData.js';

function renderProfileCard(profile, selectedProfileId) {
  const selected = profile.id === selectedProfileId;

  return `${"\n    <button\n      class=\"character-profile-card"}${selected ? __dialogueText("ui/characterCreation/ProfileCards.js", "t_dad1545efbcffe484e06") : ''}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_05ee7f75041f2a3070c9")}${selected}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_03bae2c802c967e58136")}${profile.id}${"\"\n    >\n      <span class=\"character-profile-icon\">"}${getProfileIcon(profile.id)}${"</span>\n      <span class=\"character-profile-name\">"}${toTitleCase(profile.name)}${"</span>\n      <span class=\"character-profile-bonus\">"}${profile.bonus}${"</span>\n      <span class=\"character-profile-description\">\n        "}${getProfileDescription(profile.id)}${"\n      </span>\n    </button>\n  "}`;
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
    analyst: __dialogueText("ui/characterCreation/ProfileCards.js", "t_90872dd7dece7f05ec8b"),
    charmer: __dialogueText("ui/characterCreation/ProfileCards.js", "t_1deea7a0aa2c705c818d"),
    streetwise: __dialogueText("ui/characterCreation/ProfileCards.js", "t_da12674fde038416c7b2"),
    archivist: __dialogueText("ui/characterCreation/ProfileCards.js", "t_85737a453d44cb398db4"),
    improviser: __dialogueText("ui/characterCreation/ProfileCards.js", "t_ea6dcfd389d1770b62e6"),
  };

  return descriptions[profileId] ?? __dialogueText("ui/characterCreation/ProfileCards.js", "t_5620df37496149371a3d");
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function renderProfileStep(playerData) {
  return `${"\n    <section\n      class=\"character-step-panel\"\n      data-step-panel=\"1\"\n    >\n      <h2 class=\"character-section-title\">HOW DO YOU WORK?</h2>\n\n      <p class=\"character-section-intro\">\n        Pick a professional tendency. HR calls it a profile.\n        Your old clients may disagree.\n      </p>\n\n      <div\n        class=\"character-profile-grid\"\n        role=\"radiogroup\"\n        aria-label=\"Detective profile\"\n      >\n        "}${PROFILES.map((profile) => (
          renderProfileCard(profile, playerData.profile)
        )).join('')}${"\n      </div>\n    </section>\n  "}`;
}