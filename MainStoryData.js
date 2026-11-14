import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
// MainStoryData.js
// Etapy głównego śledztwa, uporządkowane według postępu gracza,
// a nie chronologii wydarzeń z przeszłości bohatera.
//
// Gra zaczyna się w Mark Agency.
// Retrospekcja zatrudnienia nie jest etapem śledztwa.
// Jej obejrzenie zapisujemy osobną flagą:
// MainStoryManager.setFlag('recruitment_flashback_seen', true);
//
// title i description są po angielsku.
// Opisy zawierają spoilery: nie pokazuj graczowi przyszłych etapów.
//
// NPC IDs odpowiadają postaciom z "Mark agency.md":
//   partner_murphy      -> Partner Johna w Mark Agency: Alex Murphy (inventory)
//   archivist_drebin     -> Archiwista: Porucznik Frank Drebin
//   hr_gunderson         -> HR: Marge Gunderson
//   supervisor_gordon    -> Przełożony: Komisarz Gordon
//   doctor_lecter        -> Lekarz: dr Hannibal Lecter
//   informant_underground -> uliczny informator, postać spoza biura Mark Agency
//
// Identyfikatory w unlocks pochodzą z dotychczasowej definicji.
// Same nie tworzą NPC ani lokacji — odpowiednie sceny muszą
// sprawdzać odblokowania przez MainStoryManager.

export const MAIN_STORY_STAGES = [
  {
    id: 'joined_agency',
    order: 0,
    title: __dialogueText("MainStoryData.js", "t_b9d590b2f2dc65eba944"),
    description:
      __dialogueText("MainStoryData.js", "t_9ec22fcf1598854b6bc6"),
    unlocks: {
      locations: ['mark_agency_office'],
      npcs: ['partner_murphy', 'archivist_drebin']
    }
  },
  {
    id: 'learned_dead',
    order: 1,
    title: __dialogueText("MainStoryData.js", "t_8ce464107be939713060"),
    description:
      __dialogueText("MainStoryData.js", "t_dae9ea487eaff4aaec99"),
    requiredFlags: ['joined_agency'],
    unlocks: {
      npcs: ['hr_gunderson']
    }
  },
  {
    id: 'found_faked_death_clue',
    order: 2,
    title: __dialogueText("MainStoryData.js", "t_686084d25acd97afd223"),
    description:
      __dialogueText("MainStoryData.js", "t_5f853804a44b1334c117"),
    requiredFlags: ['learned_dead'],
    unlocks: {
      npcs: ['supervisor_gordon']
    }
  },
  {
    id: 'confirmed_faked_death',
    order: 3,
    title: __dialogueText("MainStoryData.js", "t_c39188209da7c6c70dfb"),
    description:
      __dialogueText("MainStoryData.js", "t_4d30f1b72fb6d4c9ea22"),
    requiredFlags: ['found_faked_death_clue'],
    unlocks: {
      npcs: ['informant_underground']
    }
  },
  {
    id: 'learned_wife_is_threat',
    order: 4,
    title: __dialogueText("MainStoryData.js", "t_f1150429c37e4f7a32b3"),
    description:
      __dialogueText("MainStoryData.js", "t_787926633abf2d2d26fb"),
    requiredFlags: ['confirmed_faked_death'],
    unlocks: {
      npcs: ['doctor_lecter']
    }
  },
  {
    id: 'confronted_husband',
    order: 5,
    title: __dialogueText("MainStoryData.js", "t_2689075be73e3a0975ae"),
    description:
      __dialogueText("MainStoryData.js", "t_d547e34e93a4674f30c3"),
    requiredFlags: ['learned_wife_is_threat']
  },
  {
    id: 'final_decision_pending',
    order: 6,
    title: __dialogueText("MainStoryData.js", "t_db4d545dc066f680d5e5"),
    description:
      __dialogueText("MainStoryData.js", "t_40f847c31aafca6a84df"),
    requiredFlags: ['confronted_husband']
  },
  {
    id: 'completed',
    order: 7,
    title: __dialogueText("MainStoryData.js", "t_7277eb50f47cadb853fa"),
    description:
      __dialogueText("MainStoryData.js", "t_e0b20f8b74368318034b"),
    requiredFlags: ['final_decision_pending']
  }
];

export function getStageByIndex(index) {
  return MAIN_STORY_STAGES.find(stage => stage.order === index) || null;
}

export function getStageById(id) {
  return MAIN_STORY_STAGES.find(stage => stage.id === id) || null;
}

export function getTotalStages() {
  return MAIN_STORY_STAGES.length;
}