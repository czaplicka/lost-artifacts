import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";

export const WITNESS_TEXTURE_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
export const WITNESS_ROLES = [
  { id: 'neighbor', label: __dialogueText("alibi/AlibiWitnessData.js", "t_03385f7343ece6951b64"), tone: 'gossipy' },
  { id: 'coworker', label: __dialogueText("alibi/AlibiWitnessData.js", "t_756c08b7fe22295d6153"), tone: 'matter_of_fact' },
  { id: 'receptionist', label: __dialogueText("alibi/AlibiWitnessData.js", "t_ab63c0d0657040400f5a"), tone: 'chatty' }
];
export const ALIBI_DATA_VERSION = 5;
export const ALIBI_GENERATOR_REVISION = 4;
