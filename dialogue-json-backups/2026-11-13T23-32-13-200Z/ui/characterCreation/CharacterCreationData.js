import {
  DEFAULT_APPEARANCE,
  APPEARANCE_OPTIONS,
  normalizeAppearance,
} from './AppearanceControls.js';

export const PROFILES = [
  {
    id: 'analyst',
    name: 'THE ANALYST',
    bonus: 'Deduction +1',
    bonusStat: 'deduction',
    perk: null,
  },
  {
    id: 'charmer',
    name: 'THE CHARMER',
    bonus: 'Rapport +1',
    bonusStat: 'rapport',
    perk: null,
  },
  {
    id: 'streetwise',
    name: 'THE STREETWISE',
    bonus: 'Resourcefulness +1',
    bonusStat: 'resourcefulness',
    perk: null,
  },
  {
    id: 'archivist',
    name: 'THE ARCHIVIST',
    bonus: 'Observation +1',
    bonusStat: 'observation',
    perk: null,
  },
  {
    id: 'improviser',
    name: 'THE IMPROVISER',
    bonus: 'One free retry per case',
    bonusStat: null,
    perk: 'free_case_retry',
  },
];

export const DIFFICULTIES = [
  {
    id: 'rookie',
    name: 'ROUTINE CASE',
  },
  {
    id: 'field',
    name: 'COMPLICATED MESS',
  },
  {
    id: 'master',
    name: 'CAREER-LIMITING DECISION',
  },
];

export const STAT_NAMES = {
  observation: 'OBSERVATION',
  deduction: 'DEDUCTION',
  rapport: 'RAPPORT',
  resourcefulness: 'RESOURCEFULNESS',
};

export const STAT_IDS = Object.keys(STAT_NAMES);

export const FIRST_NAMES = [
  'Alex', 'Sam', 'Jamie', 'Riley', 'Morgan', 'Taylor', 'Quinn', 'Jordan',
  'Jack', 'Frank', 'Victor', 'Raymond', 'Arthur', 'Dexter', 'Harlan',
  'Conrad', 'Evelyn', 'Clara', 'Irene', 'Vera', 'Vivienne', 'Hazel',
  'Marion', 'Agatha', 'Casey', 'Avery', 'Ellis', 'Rowan', 'Reese',
  'Dakota', 'Shiloh', 'Frankie', 'Robin', 'Kit',
];

export const SURNAMES = [
  'Blackwood', 'Vale', 'Carter', 'Rowe', 'Voss', 'Wilde', 'Mercer',
  'Holloway', 'Vance', 'Cross', 'Sterling', 'Graves', 'Stone', 'Bishop',
  'Hayes', 'Winter', 'Marlowe', 'Fox', 'Drake', 'Palmer', 'Sinclair',
  'Holmes', 'Marple', 'Lupin',
];

export const ALIASES = [
  'The Last Honest Invoice',
  'The Unpaid Overtime',
  'Inspector Probably',
  'The Human Filing Error',
  'No Relation to That Case',
  'Detective By Accident',
  'The Audited Alibi',
  'Tax-Deductible Crime',
  'The Missing Paperclip',
  'Accidental Evidence',
  'The Out-of-Office Clue',
  'Certified Copy Mystery',
  'The Overdue Statement',
  'Unscheduled Investigation',
  'The Misfiled Motive',
  'Slightly Suspicious Memo',
  'The Rogue Spreadsheet',
  'Zero Budget Detective',
];

export function createDefaultPlayerData() {
  return {
    name: '',
    alias: '',
    profile: 'analyst',
    difficulty: 'field',
    appearance: { ...DEFAULT_APPEARANCE },
    stats: {
      observation: 1,
      deduction: 1,
      rapport: 1,
      resourcefulness: 1,
    },
  };
}

export function normalizePlayerData(playerData = {}) {
  const defaults = createDefaultPlayerData();

  return {
    ...defaults,
    ...playerData,
    name: String(playerData.name ?? defaults.name).slice(0, 28),
    alias: String(playerData.alias ?? defaults.alias).slice(0, 28),
    appearance: normalizeAppearance(playerData.appearance),
    stats: {
      ...defaults.stats,
      ...(playerData.stats ?? {}),
    },
  };
}

export function getProfile(profileId) {
  return PROFILES.find((profile) => profile.id === profileId) ?? PROFILES[0];
}

export function getDifficulty(difficultyId) {
  return DIFFICULTIES.find((difficulty) => difficulty.id === difficultyId)
    ?? DIFFICULTIES[1];
}

export function getEffectiveStats(playerData) {
  const normalized = normalizePlayerData(playerData);
  const profile = getProfile(normalized.profile);
  const stats = { ...normalized.stats };

  if (profile.bonusStat) {
    stats[profile.bonusStat] += 1;
  }

  return stats;
}

export function pickRandom(list, random = Math.random) {
  return list[Math.floor(random() * list.length)];
}

export function createRandomIdentity(random = Math.random) {
  const appearance = {};

  Object.entries(APPEARANCE_OPTIONS).forEach(([category, group]) => {
    appearance[category] = pickRandom(group.options, random).id;
  });

  return {
    name: `${pickRandom(FIRST_NAMES, random)} ${pickRandom(SURNAMES, random)}`,
    alias: pickRandom(ALIASES, random),
    appearance,
  };
}