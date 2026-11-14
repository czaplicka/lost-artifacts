import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { DIFFICULTIES } from './CharacterCreationData.js';

const DIFFICULTY_DETAILS = {
  rookie: {
    subtitle: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_82cea06c0a6b5ee0717e"),
    details: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_9bc1476449b4008f584e"),
  },
  field: {
    subtitle: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_71b34f3eecb4eb0c28a4"),
    details: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_6f6be35054612d43075a"),
  },
  master: {
    subtitle: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_9f75af65b6d879213505"),
    details: __dialogueText("ui/characterCreation/DifficultyCards.js", "t_1b5f8e1d66df0dfc0702"),
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

  return `${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_5e2281f74643e8ff3b13")}${selected ? __dialogueText("ui/characterCreation/DifficultyCards.js", "t_dad1545efbcffe484e06") : ''}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_05ee7f75041f2a3070c9")}${selected}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_0c8b6e773568e8fa7705")}${difficulty.id}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_a78c6271b6a8e789b288")}${index + 1}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_72872111bac6132cc43f")}${toTitleCase(difficulty.name)}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_b93a4a153ed2abaa0675")}${content.subtitle}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_b54defc6992964f5e068")}${content.details}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_43abc80c2d120cd6dfa4")}`;
}

export function renderDifficultyStep(playerData) {
  return `${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_6fc2e2a818ba0396feba")}${DIFFICULTIES.map((difficulty, index) => (
          renderDifficultyCard(
            difficulty,
            index,
            playerData.difficulty,
          )
        )).join('')}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_dc209e3df250d373f0a4")}`;
}