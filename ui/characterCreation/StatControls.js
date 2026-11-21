import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  STAT_IDS,
  STAT_NAMES,
} from './CharacterCreationData.js';

const STAT_DESCRIPTIONS = {
  observation: __dialogueText("ui/characterCreation/StatControls.js", "t_cb43aa7f7926820ba561"),
  deduction: __dialogueText("ui/characterCreation/StatControls.js", "t_df1a582e211494118822"),
  rapport: __dialogueText("ui/characterCreation/StatControls.js", "t_1bc47e29fc0607bd4eb1"),
  resourcefulness: __dialogueText("ui/characterCreation/StatControls.js", "t_e507f89768ec31522b89"),
};

function renderStatRow(statId, value, remainingPoints) {
  const label = STAT_NAMES[statId];
  const description = STAT_DESCRIPTIONS[statId];
  const decreaseDisabled = value <= 1;
  const increaseDisabled = remainingPoints <= 0 || value >= 4;

  return `${"\n    <article class=\"character-stat-row\">\n      <div>\n        <div class=\"character-stat-title\">"}${toTitleCase(label)}${"</div>\n        <div class=\"character-stat-description\">"}${description}${"</div>\n      </div>\n\n      <div class=\"character-stat-controls\">\n        <button\n          class=\"character-stat-button\"\n          type=\"button\"\n          aria-label=\"Decrease "}${toTitleCase(label)}${__dialogueText("ui/characterCreation/StatControls.js", "t_7136498b1b110908a117")}${statId}${__dialogueText("ui/characterCreation/StatControls.js", "t_3c71323cbca2a48801d6")}${decreaseDisabled ? 'disabled' : ''}${"\n        >\n          −\n        </button>\n\n        <output\n          class=\"character-stat-value\"\n          data-stat-value=\""}${statId}${"\"\n        >\n          "}${value}${"\n        </output>\n\n        <button\n          class=\"character-stat-button\"\n          type=\"button\"\n          aria-label=\"Increase "}${toTitleCase(label)}${__dialogueText("ui/characterCreation/StatControls.js", "t_06388dfc5b15e4e0923e")}${statId}${__dialogueText("ui/characterCreation/StatControls.js", "t_3c71323cbca2a48801d6")}${increaseDisabled ? 'disabled' : ''}${"\n        >\n          +\n        </button>\n      </div>\n    </article>\n  "}`;
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function renderStatStep(playerData, remainingPoints) {
  return `${"\n    <section\n      class=\"character-step-panel\"\n      data-step-panel=\"2\"\n    >\n      <div class=\"character-points-counter\">\n        <span\n          class=\"character-points-value\"\n          data-remaining-points\n        >\n          "}${remainingPoints}${"\n        </span>\n\n        <span class=\"character-points-label\">\n          Points Left\n        </span>\n      </div>\n\n      <h2 class=\"character-section-title\">\n        PROFESSIONAL INSTINCTS\n      </h2>\n\n      <p class=\"character-section-intro\">\n        Assign 2 points. This shapes your approach,\n        not your worth as a human being.\n      </p>\n\n      <div class=\"character-stat-list\">\n        "}${STAT_IDS.map((statId) => (
          renderStatRow(
            statId,
            playerData.stats[statId],
            remainingPoints,
          )
        )).join('')}${"\n      </div>\n    </section>\n  "}`;
}