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
    title: 'Inside Mark Agency',
    description:
      'You are already working at Mark Agency, investigating what happened to your client’s missing husband.',
    unlocks: {
      locations: ['mark_agency_office'],
      npcs: ['partner_murphy', 'archivist_drebin']
    }
  },
  {
    id: 'learned_dead',
    order: 1,
    title: 'Reported Dead',
    description:
      'You learn that the missing husband reportedly died during an artifact recovery mission.',
    requiredFlags: ['joined_agency'],
    unlocks: {
      npcs: ['hr_gunderson']
    }
  },
  {
    id: 'found_faked_death_clue',
    order: 2,
    title: 'Something Does Not Add Up',
    description:
      'You discover an inconsistency that casts doubt on the account of his death.',
    requiredFlags: ['learned_dead'],
    unlocks: {
      npcs: ['supervisor_gordon']
    }
  },
  {
    id: 'confirmed_faked_death',
    order: 3,
    title: 'A Staged Death',
    description:
      'You establish that the husband is alive and faked his death.',
    requiredFlags: ['found_faked_death_clue'],
    unlocks: {
      npcs: ['informant_underground']
    }
  },
  {
    id: 'learned_wife_is_threat',
    order: 4,
    title: 'The Threat at Home',
    description:
      'You discover that your client tried to kill her husband. He faked his death to escape her.',
    requiredFlags: ['confirmed_faked_death'],
    unlocks: {
      npcs: ['doctor_lecter']
    }
  },
  {
    id: 'confronted_husband',
    order: 5,
    title: 'His Side of the Story',
    description:
      'You find the husband and hear his account of what happened.',
    requiredFlags: ['learned_wife_is_threat']
  },
  {
    id: 'final_decision_pending',
    order: 6,
    title: 'The Final Decision',
    description:
      'You must decide whether to arrest your client or let her go.',
    requiredFlags: ['confronted_husband']
  },
  {
    id: 'completed',
    order: 7,
    title: 'Case Closed',
    description:
      'The investigation has ended. Its outcome depends on your final decision.',
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