import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";

import { WITNESS_ROLES, WITNESS_TEXTURE_KEYS, ALIBI_DATA_VERSION, ALIBI_GENERATOR_REVISION } from './AlibiWitnessConfig.js';
import { SETTINGS } from './AlibiWitnessSettings.js';
import { hash, random, shuffle, formatAlibiTime } from './AlibiWitnessUtils.js';
import { buildAccounts } from './AlibiAccounts.js';

export function generateAlibiWitnesses(suspect, caseSeed = 'default_case', crimeWindow) {
  if (!suspect?.id) throw new Error('An alibi suspect with an ID is required.');
  const w = crimeWindow;
  if (!w || !Number.isInteger(w.day) || !Number.isInteger(w.startMinute) ||
      !Number.isInteger(w.endMinute) || w.startMinute < 30 ||
      w.endMinute <= w.startMinute || w.endMinute > 1409) {
    throw new Error('A valid crimeWindow with a 30-minute day margin is required.');
  }
  const thief = suspect.hiddenCaseData?.isTrueThief === true;
  const twin = suspect.hiddenCaseData?.isForensicTwin === true;
  if (thief === twin) throw new Error('Alibi suspect must be either the real thief or the forensic twin.');
  const occupation = String(suspect.occupation || suspect.publicProfile?.occupation || '').trim();
  const name = suspect.name || __dialogueText("alibi/AlibiWitnessData.js", "t_ceb6bc8a5017bfe62fa7");
  const rng = random(hash(`${caseSeed}:${suspect.id}:${name}:${occupation.toLowerCase()}:${w.day}:${w.startMinute}:${w.endMinute}`));
  const setting = SETTINGS[Math.floor(rng() * SETTINGS.length)];
  const pattern = Math.floor(rng() * (thief ? 12 : 6));
  const internalRoles = shuffle(WITNESS_ROLES, rng);
  const portraits = shuffle(WITNESS_TEXTURE_KEYS, rng);
  const built = buildAccounts(pattern, {
    n: name, v: setting.venue, a: w.startMinute, b: w.endMinute,
    day: w.day, t: formatAlibiTime, activity: setting.activity,
    roles: setting.roles, joke: setting.joke
  }, thief);
  const connection = suspect.publicProfile?.caseConnection || suspect.caseConnection;
  const contextNote = typeof connection === 'string' && connection.trim()
    ? `${__dialogueText("alibi/AlibiWitnessData.js", "t_ec0537fc1bba64031cb9")}${connection.trim()}${__dialogueText("alibi/AlibiWitnessData.js", "t_235eb0c3b2c1702b837f")}` : '';
  const cards = built.entries.map((entry, i) => ({
    id: `${suspect.id}_alibi_account_${i + 1}`,
    minute: entry.minute, timeSlot: formatAlibiTime(entry.minute),
    locationTag: setting.id, roleId: internalRoles[i].id, role: setting.roles[i],
    label: `${formatAlibiTime(entry.minute)}${__dialogueText("alibi/AlibiWitnessData.js", "t_3b2e8119b6fcc97df985")}${entry.summary}`,
    isReal: !(thief && i === 0)
  }));
  const witnesses = built.entries.map((entry, i) => ({
    npcId: `${suspect.id}_witness_${internalRoles[i].id}`,
    suspectId: suspect.id, roleId: internalRoles[i].id, role: setting.roles[i],
    tone: internalRoles[i].tone, portraitKey: portraits[i], textureKey: portraits[i],
    isLiar: thief && i === 0,
    statement: entry.statement + (i === 2 ? contextNote : ''),
    contradictionHint: null, timelineCard: cards[i], motiveFragment: null
  }));
  return {
    version: ALIBI_DATA_VERSION, generatorRevision: ALIBI_GENERATOR_REVISION,
    suspectId: suspect.id, suspectName: name, crimeWindow: { ...w },
    alibiType: thief ? 'contradicted' : 'confirmed',
    scenarioId: `personal_${setting.id}_${thief ? 'false' : 'true'}_${pattern}`,
    scenarioContext: { type: 'personal', occupation, venue: setting.venue, activity: setting.activity },
    witnesses: shuffle(witnesses, rng),
    contradiction: thief ? {
      witnessRoleId: internalRoles[0].id, supportingRoleId: internalRoles[1].id,
      explanation: built.explanation
    } : null,
    trueTimeline: [...cards].sort((a, b) => a.minute - b.minute),
    boardCards: shuffle(cards, rng)
  };
}
