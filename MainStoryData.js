// MainStoryData.js
// Definicja etapów wątku głównego (śledztwo o mężu Agencji Mark).
// Każdy stage ma id, opis (dla dev-debug/HUD), wymagane flagi wejściowe,
// oraz "unlocks" - co się odblokowuje po wejściu w ten etap (NPC, lokacje, mechaniki).

export const MAIN_STORY_STAGES = [
  {
    id: 'hired',
    order: 0,
    title: 'Nowa klientka',
    description: 'Kobieta zgłasza zaginięcie męża, pracownika Mark Agency.',
    unlocks: { locations: ['detective_office'], npcs: ['client_wife'] }
  },
  {
    id: 'joined_agency',
    order: 1,
    title: 'Praca w Mark Agency',
    description: 'Gracz zatrudnia się w agencji, żeby mieć dostęp do spraw męża.',
    unlocks: { locations: ['mark_agency_office'], npcs: ['agency_boss', 'agency_receptionist'] }
  },
  {
    id: 'learned_dead',
    order: 2,
    title: 'Wiadomość o śmierci',
    description: 'Gracz dowiaduje się, że mąż zginął podczas jednej z misji odzyskiwania artefaktu.',
    requiredFlags: ['joined_agency'],
    unlocks: { npcs: ['agency_coworker'] }
  },
  {
    id: 'found_faked_death_clue',
    order: 3,
    title: 'Pierwsza nieścisłość',
    description: 'Drobny szczegół (np. data na dokumencie, świadek) sugeruje, że coś nie zgadza się w historii śmierci.',
    requiredFlags: ['learned_dead']
  },
  {
    id: 'confirmed_faked_death',
    order: 4,
    title: 'Sfingowana śmierć',
    description: 'Twarde dowody: mąż żyje i ukrywa się pod inną tożsamością.',
    requiredFlags: ['found_faked_death_clue'],
    unlocks: { npcs: ['informant_underground'] }
  },
  {
    id: 'learned_wife_is_threat',
    order: 5,
    title: 'Zwrot: to ona',
    description: 'Odkrycie, że klientka (żona) sama próbowała go zabić - mąż uciekł, żeby przeżyć.',
    requiredFlags: ['confirmed_faked_death']
  },
  {
    id: 'confronted_husband',
    order: 6,
    title: 'Konfrontacja z mężem',
    description: 'Gracz odnajduje męża i poznaje jego wersję wydarzeń.',
    requiredFlags: ['learned_wife_is_threat']
  },
  {
    id: 'final_decision_pending',
    order: 7,
    title: 'Decyzja',
    description: 'Gracz musi zdecydować: aresztować żonę czy pozwolić jej odejść.',
    requiredFlags: ['confronted_husband']
  },
  {
    id: 'completed',
    order: 8,
    title: 'Zakończenie',
    description: 'Finałowa scena, zależna od decyzji gracza.',
    requiredFlags: ['final_decision_pending']
  }
];

export function getStageByIndex(index) {
  return MAIN_STORY_STAGES.find(s => s.order === index) || null;
}

export function getStageById(id) {
  return MAIN_STORY_STAGES.find(s => s.id === id) || null;
}

export function getTotalStages() {
  return MAIN_STORY_STAGES.length;
}