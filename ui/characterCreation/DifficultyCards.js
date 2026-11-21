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

  return `${"\n    <button\n      class=\"character-difficulty-card"}${selected ? __dialogueText("ui/characterCreation/DifficultyCards.js", "t_dad1545efbcffe484e06") : ''}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_05ee7f75041f2a3070c9")}${selected}${__dialogueText("ui/characterCreation/DifficultyCards.js", "t_0c8b6e773568e8fa7705")}${difficulty.id}${"\"\n    >\n      <span class=\"character-difficulty-number\">"}${index + 1}${"</span>\n      <span class=\"character-difficulty-name\">"}${toTitleCase(difficulty.name)}${"</span>\n      <span class=\"character-difficulty-subtitle\">"}${content.subtitle}${"</span>\n      <span class=\"character-difficulty-details\">"}${content.details}${"</span>\n    </button>\n  "}`;
}

export function renderDifficultyStep(playerData) {
  return `${"\n    <section\n      class=\"character-step-panel\"\n      data-step-panel=\"3\"\n    >\n      <h2 class=\"character-section-title\">CASE PRESSURE</h2>\n\n      <p class=\"character-section-intro\">\n        How much chaos would you like professionally documented?\n      </p>\n\n      <div\n        class=\"character-difficulty-list\"\n        role=\"radiogroup\"\n        aria-label=\"Case difficulty\"\n      >\n        "}${DIFFICULTIES.map((difficulty, index) => (
          renderDifficultyCard(
            difficulty,
            index,
            playerData.difficulty,
          )
        )).join('')}${"\n      </div>\n    </section>\n  "}`;
}