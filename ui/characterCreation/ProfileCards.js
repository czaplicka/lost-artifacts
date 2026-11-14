import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { PROFILES } from './CharacterCreationData.js';

function renderProfileCard(profile, selectedProfileId) {
  const selected = profile.id === selectedProfileId;

  return `${__dialogueText("ui/characterCreation/ProfileCards.js", "t_b78a7d54f68511275a52")}${selected ? __dialogueText("ui/characterCreation/ProfileCards.js", "t_dad1545efbcffe484e06") : ''}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_05ee7f75041f2a3070c9")}${selected}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_03bae2c802c967e58136")}${profile.id}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_b713d7c8cab3a1178fd6")}${getProfileIcon(profile.id)}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_cfe62977a84cedfd5701")}${toTitleCase(profile.name)}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_e0b3169ed0623065dbd3")}${profile.bonus}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_2645f877fba265325edd")}${getProfileDescription(profile.id)}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_9dff15038d7c67ad7ca8")}`;
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
  return `${__dialogueText("ui/characterCreation/ProfileCards.js", "t_6f89861e64d5d3c190fa")}${PROFILES.map((profile) => (
          renderProfileCard(profile, playerData.profile)
        )).join('')}${__dialogueText("ui/characterCreation/ProfileCards.js", "t_dc209e3df250d373f0a4")}`;
}