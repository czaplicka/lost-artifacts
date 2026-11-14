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

  return `${__dialogueText("ui/characterCreation/StatControls.js", "t_90efcbd1f3f448137409")}${toTitleCase(label)}${__dialogueText("ui/characterCreation/StatControls.js", "t_b7dd571fb31b7f5998a1")}${description}${__dialogueText("ui/characterCreation/StatControls.js", "t_f4e6f109503524245bf1")}${toTitleCase(label)}${__dialogueText("ui/characterCreation/StatControls.js", "t_7136498b1b110908a117")}${statId}${__dialogueText("ui/characterCreation/StatControls.js", "t_3c71323cbca2a48801d6")}${decreaseDisabled ? 'disabled' : ''}${__dialogueText("ui/characterCreation/StatControls.js", "t_1e8c8fe6a4dba38180b0")}${statId}${__dialogueText("ui/characterCreation/StatControls.js", "t_cfa907eda8b269bb6540")}${value}${__dialogueText("ui/characterCreation/StatControls.js", "t_63b403fc631bb2004a81")}${toTitleCase(label)}${__dialogueText("ui/characterCreation/StatControls.js", "t_06388dfc5b15e4e0923e")}${statId}${__dialogueText("ui/characterCreation/StatControls.js", "t_3c71323cbca2a48801d6")}${increaseDisabled ? 'disabled' : ''}${__dialogueText("ui/characterCreation/StatControls.js", "t_c01eb279c58b22a44979")}`;
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function renderStatStep(playerData, remainingPoints) {
  return `${__dialogueText("ui/characterCreation/StatControls.js", "t_90379aac671d6acc6f90")}${remainingPoints}${__dialogueText("ui/characterCreation/StatControls.js", "t_0681537ca9ed2606f3a9")}${STAT_IDS.map((statId) => (
          renderStatRow(
            statId,
            playerData.stats[statId],
            remainingPoints,
          )
        )).join('')}${__dialogueText("ui/characterCreation/StatControls.js", "t_dc209e3df250d373f0a4")}`;
}