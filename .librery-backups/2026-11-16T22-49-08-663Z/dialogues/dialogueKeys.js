import { NPC_CATALOG } from '../npcCatalogData.js';
const definitions = {
  "bankier": {
    "key": "dialogue_banker",
    "root": "bankerClues",
    "file": "assets/data/dialogue/banker.json"
  },
  "fence": {
    "key": "dialogue_fence",
    "root": "fenceClues",
    "file": "assets/data/dialogue/fence.json"
  },
  "knajpa": {
    "key": "dialogue_knajpa",
    "root": "knajpaClues",
    "file": "assets/data/dialogue/knajpa.json"
  },
  "maid": {
    "key": "dialogue_maid",
    "root": "maidClues",
    "file": "assets/data/dialogue/maid.json"
  },
  "parkingowy": {
    "key": "dialogue_parkingowy",
    "root": "parkingowyClues",
    "file": "assets/data/dialogue/parkingowy.json"
  },
  "police": {
    "key": "dialogue_police",
    "root": "policeClues",
    "file": "assets/data/dialogue/police.json"
  },
  "stewardessa": {
    "key": "dialogue_stewardess",
    "root": "stewardessaClues",
    "file": "assets/data/dialogue/stewardess.json"
  },
  "bum": {
    "key": "dialogue_bum",
    "root": "bumClues",
    "file": "assets/data/dialogue/bum.json"
  },
  "sailor": {
    "key": "dialogue_sailor",
    "root": "sailorClues",
    "file": "assets/data/dialogue/sailor.json"
  }
};
export const NPC_DIALOGUE_KEY_MAP = {};
export const NPC_DIALOGUE_ROOT_MAP = {};
export const NPC_DIALOGUE_FILE_MAP = {};
for (const npc of Object.values(NPC_CATALOG.npcs)) {
 const d = definitions[npc.dialogueId];
 if (!d) continue;
 NPC_DIALOGUE_KEY_MAP[npc.id] = d.key;
 NPC_DIALOGUE_ROOT_MAP[npc.id] = d.root;
 NPC_DIALOGUE_FILE_MAP[npc.id] = d.file;
}
