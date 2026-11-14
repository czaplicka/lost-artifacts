import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { loadJson } from './config/loadJson.js';

export const storageRoomDialogues = await loadJson(
  './assets/data/storageRoomDialogues.json', import.meta.url
);

const data = storageRoomDialogues;
function strings(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(line => typeof line !== 'string')) {
    throw new Error('[Alex dialogues] Invalid text array: ' + label);
  }
}
for (const key of ['intro', 'replacement', 'return']) strings(data.manual?.[key], __dialogueText("storageRoomDialogueService.js", "t_269450a6716a5ac97197") + key);
for (const [section, fields] of [
  ['thirdMission', ['alexLines']],
  ['fourthMission', ['conversation', 'reviewConversation']],
  ['chapterTwo', ['conversation']],
  ['escape', ['clarification']],
  ['microfilm', ['intro']]
]) for (const field of fields) strings(data[section]?.[field], section + '.' + field);
if (!data.reactions || typeof data.reactions !== 'object') throw new Error('[Alex dialogues] Missing reactions.');
for (const [key, lines] of Object.entries(data.reactions)) strings(lines, __dialogueText("storageRoomDialogueService.js", "t_60a8850bc6eadc77f57a") + key);
for (const [label, value] of Object.entries({
  speaker: data.speaker, reactionIntro: data.reactionIntro,
  opening: data.recovery?.opening, received: data.microfilm?.received,
  pocketsFull: data.messages?.pocketsFull
})) if (typeof value !== 'string') throw new Error('[Alex dialogues] Invalid text: ' + label);
if (!Array.isArray(data.recovery?.confession) || data.recovery.confession.length === 0 ||
    data.recovery.confession.some(line => typeof line?.speaker !== 'string' || typeof line?.text !== 'string')) {
  throw new Error('[Alex dialogues] Invalid recovery conversation.');
}
