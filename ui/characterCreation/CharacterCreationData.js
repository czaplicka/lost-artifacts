import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  DEFAULT_APPEARANCE,
  APPEARANCE_OPTIONS,
  normalizeAppearance,
} from './AppearanceControls.js';

export const PROFILES = [
  {
    id: 'analyst',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_7fd62770c1484f44a7da"),
    bonus: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_3d78e2a11ebda3ea367e"),
    bonusStat: 'deduction',
    perk: null,
  },
  {
    id: 'charmer',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b29e6c04e1a21420b932"),
    bonus: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_2ef5713dae318dd07b5c"),
    bonusStat: 'rapport',
    perk: null,
  },
  {
    id: 'streetwise',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8e0f79f2db6c288b7e41"),
    bonus: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_852eb412413b13bb69a5"),
    bonusStat: 'resourcefulness',
    perk: null,
  },
  {
    id: 'archivist',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_06e3b17786bdc5f22297"),
    bonus: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_a62ce9dba17e849fd962"),
    bonusStat: 'observation',
    perk: null,
  },
  {
    id: 'improviser',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_fd7959439eb5f516bf5d"),
    bonus: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b23c60359f50f106b178"),
    bonusStat: null,
    perk: 'free_case_retry',
  },
];

export const DIFFICULTIES = [
  {
    id: 'rookie',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_141de665c55e7d121c07"),
  },
  {
    id: 'field',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_12201e9a1f9bb7e004b4"),
  },
  {
    id: 'master',
    name: __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b22ff5e3a1372c818250"),
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
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_db74c940d447e877d119"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_4ecde249d747d51d869a"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_eaea2ab37288945d6317"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_c773f5fb4bf41c654465"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_02281b3b5dd57c464368"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_c2793b826cc96e7fe5bd"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_df5ac68b2b28a4a76416"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e8bfe1ed693510570ced"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b5fd03dd91df1cfbd2f1"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_db605e8f71913d1f3966"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_6c00e6ff6ea6bcc6ac12"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_ffb595919dd6a431bc74"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_52b67b60260da3937510"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_42c8a2a809285f83a7ed"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8eb6bf3ef2c6f6ce3184"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b92f91849d855b40496e"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_907814bbbc15ea0ddb86"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8df830a849e93985f1f6"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_d4bbc5043503b9aed309"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e4ace1dfe147e67d8229"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_7e29d9f7059a9b76685a"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_d996414cd84c41dd032d"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_3417cfdf67c51b20fe04"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_439455c61e4b9876a23e"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e26b83d4babd8855b1a2"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_0deb09fd7c9ccb1c3f06"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e4a141627f7cf75e7abb"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e0ebe4ec4c61126e9b1e"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_94721b86ce7f5443a748"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_d9000b83537c971f01d2"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8f4d1a11b95ad96d0d7e"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_29571296158c27aaa2ab"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b4eb71306c2267a12979"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_875d60ed20f4b98f7868"),
];

export const SURNAMES = [
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_31d44583de9e9ad7eb40"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_17b7e72d51f2291a7f9f"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_25eb92ae54cc5089e9b9"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_6a92546b59985cfaf8a2"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_c7becde00d9a6aa7aae2"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_0b98cb56b27c3b13f108"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_23dd2e21a1bd47c8fe1b"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_355a6bb6d0f6d14ded05"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_f1d122510dbba1fe87a8"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_1fc0e7076bb4cd66d7ce"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_9351ba1cc5d01a599031"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_4ea5eb8db9dfb7f03b3f"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_6ffa6b8b1c9fa11cb67a"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_5b44abd9e9029e1110f1"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_9befe19444fef2f1343a"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_1b17869e03ecc1b0f86b"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8112b1c151ab0e3c6276"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_f55bd2cdfae797282763"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_6aed8812d68d8790c628"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_67ff5de6ad9f6aa632ce"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_91249fea1f9a592b2a3f"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_0fbbc4a47c14940352a7"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_4821279f2b7004e6edae"), __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_ef1f7eba837e4da7dfea"),
];

export const ALIASES = [
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_af53d3477b7190be36b4"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_b10c96d013c43af73a8f"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_57c75f0b2c51d894daa9"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_7d631eee6ef665b17d2c"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_297a32b95da5ec1e8a8e"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_33c00ba5f824c20c4fe8"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_fb7fe72985c96ef84d34"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_260f381eda37de0fa994"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_8d29e9a32b62453f58c1"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e37c419c7f9cd70d085f"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_d26f2cd84f1751e059a2"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_f6f93b5220ff3eebd52d"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_e331d673685cf3c86eb0"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_d467f3d343c5ae1e58f8"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_439ca9e07ac0541ae608"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_1a34c22afb1bb3cdc62d"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_4d74f4170bdfe31a9df8"),
  __dialogueText("ui/characterCreation/CharacterCreationData.js", "t_a3d514fa9c4dea243646"),
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