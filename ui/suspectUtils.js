import { gameState } from '../GameData.js';

const STATUS = {
  PENDING: 'pending',
  MATCH: 'match',
  ELIMINATED: 'eliminated',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  SUSPICIOUS: 'suspicious',
  CONFIRMED: 'confirmed',
  NOT_APPLICABLE: 'not_applicable'
};

function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueStrings(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim())
  )];
}

function getTimestamp() {
  return new Date().toISOString();
}

function getCaseId() {
  return gameState.currentCaseId
    || gameState.currentMission?.id
    || gameState.currentMission?.caseId
    || null;
}

function getSuspects() {
  if (!Array.isArray(gameState.caseSuspects)) {
    throw new Error('SuspectUtils: gameState.caseSuspects is missing or invalid.');
  }

  return gameState.caseSuspects;
}

function getSuspectById(suspectId) {
  if (typeof suspectId !== 'string' || !suspectId.trim()) {
    throw new Error('SuspectUtils: suspectId must be a valid string.');
  }

  const suspect = getSuspects().find((entry) => entry.id === suspectId);

  if (!suspect) {
    throw new Error(`SuspectUtils: suspect "${suspectId}" was not found in caseSuspects.`);
  }

  return suspect;
}

function ensureSuspectShape(suspect) {
  suspect.publicProfile ??= {};
  suspect.restrictedProfile ??= {};
  suspect.hiddenProfile ??= {};
  suspect.hiddenCaseData ??= {};
  suspect.deductionState ??= {};

  suspect.restrictedProfile.unlockedFields ??= [];
  suspect.restrictedProfile.forensicAttributes ??= {};

  suspect.deductionState.labStatus ??= STATUS.PENDING;
  suspect.deductionState.hypothesisStatus ??= STATUS.PENDING;
  suspect.deductionState.interviewStatus ??= STATUS.LOCKED;
  suspect.deductionState.alibiStatus ??= STATUS.LOCKED;
  suspect.deductionState.eliminated ??= false;
  suspect.deductionState.eliminationReasons ??= [];
  suspect.deductionState.notesUnlocked ??= [];

  suspect.attributes ??= {};
  suspect.skills ??= [];
}

function ensureAllSuspectShapes() {
  getSuspects().forEach(ensureSuspectShape);
}
function getForensicAttributeValue(suspect, field) {
  return suspect.restrictedProfile
    ?.forensicAttributes
    ?.[field]
    ?.value;
}
function getDisplayName(suspect) {
  return suspect.publicProfile?.displayName
    || suspect.name
    || 'Unknown Suspect';
}

function isTrueThief(suspect) {
  return suspect.isRealThief === true
    || suspect.hiddenCaseData?.isTrueThief === true
    || suspect.hiddenProfile?.isThief === true
    || suspect.is_thief === true;
}

function addUniqueNote(suspect, note) {
  if (typeof note !== 'string' || !note.trim()) return;

  ensureSuspectShape(suspect);

  if (!suspect.deductionState.notesUnlocked.includes(note.trim())) {
    suspect.deductionState.notesUnlocked.push(note.trim());
  }
}

function addEliminationReason(suspect, reason) {
  if (!reason || typeof reason !== 'object') return;

  ensureSuspectShape(suspect);

  const reasonId = String(
    reason.id
    || `${reason.type || 'evidence'}_${reason.source || 'unknown'}`
  );

  const alreadyExists = suspect.deductionState.eliminationReasons.some(
    (existingReason) => existingReason.id === reasonId
  );

  if (alreadyExists) return;

  suspect.deductionState.eliminationReasons.push({
    id: reasonId,
    type: reason.type || 'evidence',
    source: reason.source || 'unknown',
    label: reason.label || 'Evidence',
    note: reason.note || '',
    timestamp: reason.timestamp || getTimestamp()
  });
}

function syncExcludedSuspects() {
  ensureAllSuspectShapes();

  gameState.excludedSuspects = getSuspects()
    .filter((suspect) => suspect.deductionState.eliminated)
    .map((suspect) => ({
      id: suspect.id,
      name: getDisplayName(suspect),
      reasons: [...suspect.deductionState.eliminationReasons]
    }));

  return gameState.excludedSuspects;
}

function markEliminated(suspect, reason) {
  ensureSuspectShape(suspect);

  suspect.deductionState.eliminated = true;
  addEliminationReason(suspect, reason);

  return suspect;
}

function clearElimination(suspect, reasonId = null) {
  ensureSuspectShape(suspect);

  if (reasonId) {
    suspect.deductionState.eliminationReasons = suspect.deductionState.eliminationReasons
      .filter((reason) => reason.id !== reasonId);
  } else {
    suspect.deductionState.eliminationReasons = [];
  }

  suspect.deductionState.eliminated = suspect.deductionState.eliminationReasons.length > 0;

  return suspect;
}

function unlockRestrictedField(
  suspect,
  field,
  value,
  source = 'police_record'
) {
  ensureSuspectShape(suspect);

  if (typeof field !== 'string' || !field.trim()) {
    throw new Error(
      'SuspectUtils.unlockRestrictedField requires a valid field name.'
    );
  }

  const cleanField = field.trim();

  const existingAttribute =
    suspect.restrictedProfile
      .forensicAttributes
      [cleanField] || {};

  suspect.restrictedProfile
    .forensicAttributes
    [cleanField] = {
      ...existingAttribute,
      value,
      unlocked: true,
      source,
      unlockedAt: getTimestamp()
    };

  if (!suspect.restrictedProfile.unlockedFields.includes(cleanField)) {
    suspect.restrictedProfile.unlockedFields.push(cleanField);
  }

  return suspect.restrictedProfile
    .forensicAttributes
    [cleanField];
}

function getIdentityEvidence() {
  if (!gameState.identityEvidence || typeof gameState.identityEvidence !== 'object') {
    throw new Error('SuspectUtils: gameState.identityEvidence is missing.');
  }

  const attribute = gameState.identityEvidence.attribute;
  const thiefValue = gameState.identityEvidence.thief_value;

  if (!attribute || thiefValue === null || thiefValue === undefined || thiefValue === '') {
    throw new Error('SuspectUtils: identityEvidence needs attribute and thief_value.');
  }

  return {
    ...gameState.identityEvidence,
    attribute,
    thiefValue
  };
}

function skillsMatch(suspectSkills, requiredSkills) {
  const suspectSkillSet = new Set(
    uniqueStrings(suspectSkills).map(normalizeValue)
  );

  return requiredSkills.every((skill) => suspectSkillSet.has(normalizeValue(skill)));
}

function skillListsMatch(selectedSkills, requiredSkills) {
  const selected = uniqueStrings(selectedSkills).map(normalizeValue).sort();
  const required = uniqueStrings(requiredSkills).map(normalizeValue).sort();

  if (selected.length !== required.length) return false;

  return selected.every((skill, index) => skill === required[index]);
}

function registerProgressUpdate(key, value = true) {
  const caseId = getCaseId();

  if (!caseId) return;

  gameState.crimeCityProgress ??= {};
  gameState.crimeCityProgress[caseId] ??= {};
  gameState.crimeCityProgress[caseId][key] = value;
}

/**
 * Returns all suspects that have not been eliminated by any evidence.
 */
export function getActiveSuspects() {
  ensureAllSuspectShapes();

  return getSuspects().filter((suspect) => !suspect.deductionState.eliminated);
}

/**
 * Returns a UI-safe version of a suspect.
 * hiddenProfile is deliberately excluded.
 */
export function getPublicSuspectView(suspectId) {
  const suspect = getSuspectById(suspectId);
  ensureSuspectShape(suspect);

  return {
    id: suspect.id,
    name: getDisplayName(suspect),
    occupation: suspect.publicProfile.occupation || suspect.occupation || 'Unknown occupation',
    genderCode: suspect.publicProfile.genderCode || suspect.gender_code || 'nb',
    visibleTraits: [...(suspect.publicProfile.visibleTraits || [])],
    caseConnection: suspect.publicProfile.caseConnection || '',
    restrictedProfile: {
      unlockedFields: [...suspect.restrictedProfile.unlockedFields],
      forensicAttributes: { ...suspect.restrictedProfile.forensicAttributes }
    },
    deductionState: {
      labStatus: suspect.deductionState.labStatus,
      hypothesisStatus: suspect.deductionState.hypothesisStatus,
      interviewStatus: suspect.deductionState.interviewStatus,
      alibiStatus: suspect.deductionState.alibiStatus,
      eliminated: suspect.deductionState.eliminated,
      eliminationReasons: [...suspect.deductionState.eliminationReasons],
      notesUnlocked: [...suspect.deductionState.notesUnlocked]
    }
  };
}

/**
 * Returns all current suspects in a UI-safe form.
 */
export function getPublicSuspectList() {
  return getSuspects().map((suspect) => getPublicSuspectView(suspect.id));
}

/**
 * Applies the hard Crime Lab identity result.
 *
 * The minigame should call this only after its successful completion.
 * It compares each suspect's hidden attribute with the confirmed lab value.
 *
 * Example:
 * applyIdentityEvidence();
 *
 * Optional explicit result:
 * applyIdentityEvidence({
 *   attribute: 'hair_color',
 *   value: 'black',
 *   source: 'hair_analysis'
 * });
 */
export function applyIdentityEvidence(options = {}) {
  ensureAllSuspectShapes();

  const configuredEvidence = getIdentityEvidence();
  const attribute = options.attribute || configuredEvidence.attribute;
  const value = options.value ?? configuredEvidence.thiefValue;
  const source = options.source || configuredEvidence.id || 'crime_lab';
  const label = options.label || configuredEvidence.label || 'Crime Lab Result';
  const clueText = options.clueText || configuredEvidence.clueText || 'Forensic evidence excludes this suspect.';

  if (attribute !== configuredEvidence.attribute) {
    throw new Error(
      `SuspectUtils: attempted to apply "${attribute}", but this case requires "${configuredEvidence.attribute}".`
    );
  }

  if (normalizeValue(value) !== normalizeValue(configuredEvidence.thiefValue)) {
    throw new Error('SuspectUtils: the supplied identity result does not match the generated case evidence.');
  }

  const excluded = [];
  const matched = [];

  getSuspects().forEach((suspect) => {
    ensureSuspectShape(suspect);

const suspectValue = getForensicAttributeValue(
  suspect,
  attribute
);

const matchesEvidence =
  normalizeValue(suspectValue) === normalizeValue(value);

unlockRestrictedField(
  suspect,
  attribute,
  suspectValue,
  source
);

    if (matchesEvidence) {
      suspect.deductionState.labStatus = STATUS.MATCH;
      addUniqueNote(suspect, `${label}: consistent with the forensic result.`);
      matched.push(suspect.id);
      return;
    }

    suspect.deductionState.labStatus = STATUS.ELIMINATED;

    markEliminated(suspect, {
      id: `lab_${attribute}`,
      type: 'forensic',
      source,
      label,
      note: clueText
    });

    addUniqueNote(suspect, `${label}: inconsistent with the forensic result.`);
    excluded.push(suspect.id);
  });

  gameState.identityEvidenceResult = {
    id: configuredEvidence.id,
    attribute,
    value,
    source,
    label,
    completedAt: getTimestamp(),
    excludedSuspectIds: excluded,
    matchedSuspectIds: matched
  };

  gameState.forensicResults ??= [];
  gameState.forensicResults.push({ ...gameState.identityEvidenceResult });
  gameState.identityEvidence.resultUnlocked = true;
  gameState.csiLabCompleted = true;

  registerProgressUpdate('crimeLabCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    attribute,
    value,
    excludedSuspectIds: excluded,
    matchedSuspectIds: matched,
    remainingSuspects: getActiveSuspects().map((suspect) => suspect.id)
  };
}

/**
 * Records a failed reconstruction attempt without eliminating anyone.
 * Use it when the player submits an incorrect Hypothesis / Mastermind answer.
 */
export function registerHypothesisAttempt(selectedSkills = []) {
  const requiredSkills = uniqueStrings(gameState.hypothesisEvidence?.requiredSkills);

  if (!requiredSkills.length) {
    throw new Error('SuspectUtils: gameState.hypothesisEvidence.requiredSkills is missing.');
  }

  gameState.hypothesisAttempts ??= [];

  const attempt = {
    attemptNumber: gameState.hypothesisAttempts.length + 1,
    selectedSkills: uniqueStrings(selectedSkills),
    isCorrect: skillListsMatch(selectedSkills, requiredSkills),
    attemptedAt: getTimestamp()
  };

  gameState.hypothesisAttempts.push(attempt);

  return attempt;
}

/**
 * Applies the second hard filter after a correct Hypothesis / reconstruction.
 *
 * selectedSkills must contain exactly the confirmed skills generated for the thief.
 * If the selection is incorrect, no one is eliminated.
 */
export function applyHypothesisSkills(selectedSkills = []) {
  ensureAllSuspectShapes();

  const requiredSkills = uniqueStrings(gameState.hypothesisEvidence?.requiredSkills);

  if (!requiredSkills.length) {
    throw new Error('SuspectUtils: gameState.hypothesisEvidence.requiredSkills is missing.');
  }

  const attempt = registerHypothesisAttempt(selectedSkills);

  if (!attempt.isCorrect) {
    return {
      success: false,
      isCorrect: false,
      attemptNumber: attempt.attemptNumber,
      message: 'The reconstruction does not fit the evidence. No suspects were eliminated.',
      remainingSuspects: getActiveSuspects().map((suspect) => suspect.id)
    };
  }

  const excluded = [];
  const matched = [];

  getActiveSuspects().forEach((suspect) => {
    const matchesRequiredSkills = skillsMatch(suspect.skills, requiredSkills);

    if (matchesRequiredSkills) {
      suspect.deductionState.hypothesisStatus = STATUS.MATCH;
      addUniqueNote(suspect, 'The suspect has skills consistent with the reconstructed crime.');
      matched.push(suspect.id);
      return;
    }

    suspect.deductionState.hypothesisStatus = STATUS.ELIMINATED;

    markEliminated(suspect, {
      id: 'hypothesis_skills',
      type: 'method',
      source: 'hypothesis_reconstruction',
      label: 'Crime Reconstruction',
      note: 'The suspect lacks the skills required by the reconstructed method.'
    });

    addUniqueNote(suspect, 'The suspect lacks the skills required by the reconstructed crime.');
    excluded.push(suspect.id);
  });

  getSuspects()
    .filter((suspect) => suspect.deductionState.labStatus === STATUS.ELIMINATED)
    .forEach((suspect) => {
      suspect.deductionState.hypothesisStatus = STATUS.NOT_APPLICABLE;
    });

  gameState.hypothesisEvidenceResult = {
    id: gameState.hypothesisEvidence.id || 'hypothesis_skills',
    requiredSkills,
    completedAt: getTimestamp(),
    excludedSuspectIds: excluded,
    matchedSuspectIds: matched
  };

  gameState.hypothesisEvidence.resultUnlocked = true;

  registerProgressUpdate('hypothesisCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    isCorrect: true,
    attemptNumber: attempt.attemptNumber,
    requiredSkills,
    excludedSuspectIds: excluded,
    matchedSuspectIds: matched,
    remainingSuspects: getActiveSuspects().map((suspect) => suspect.id)
  };
}

/**
 * Unlocks one police-record or forensic field on one suspect.
 *
 * Example:
 * unlockSuspectData('case_paris_decoy_3', 'shoe_size_category', 'medium', 'police_database');
 */
export function unlockSuspectData(suspectId, field, value, source = 'police_database') {
  const suspect = getSuspectById(suspectId);

  unlockRestrictedField(suspect, field, value, source);

  return getPublicSuspectView(suspectId);
}

/**
 * Applies an objective result from an NPC conversation.
 *
 * This function is for evidence-confirmed exclusions, not for a player's final accusation.
 * It blocks accidental removal of the true thief, because the NPC-interview phase
 * should narrow the pool without prematurely destroying the case logic.
 *
 * Example:
 * applyInterviewElimination({
 *   suspectId: 'case_paris_decoy_3',
 *   npcId: 'museum_guard',
 *   evidenceId: 'guard_camera_alibi',
 *   reason: 'The guard confirms that this person was in the staff room.',
 *   thread: 'alibi'
 * });
 */
export function applyInterviewElimination({
  suspectId,
  npcId = 'unknown_npc',
  evidenceId = 'npc_statement',
  reason = 'A witness statement clears this suspect.',
  thread = 'alibi',
  label = 'Witness Statement'
} = {}) {
  const suspect = getSuspectById(suspectId);
  ensureSuspectShape(suspect);

  if (isTrueThief(suspect)) {
    throw new Error(
      `SuspectUtils: "${getDisplayName(suspect)}" is the true thief and cannot be cleared by a factual NPC interview.`
    );
  }

  if (suspect.deductionState.eliminated) {
    return {
      success: false,
      message: `${getDisplayName(suspect)} has already been eliminated.`,
      suspect: getPublicSuspectView(suspect.id)
    };
  }

  suspect.deductionState.interviewStatus = STATUS.CONFIRMED;

  markEliminated(suspect, {
    id: `interview_${evidenceId}_${suspect.id}`,
    type: thread,
    source: npcId,
    label,
    note: reason
  });

  addUniqueNote(suspect, reason);

  gameState.interviewEvidenceResults ??= [];
  gameState.interviewEvidenceResults.push({
    suspectId: suspect.id,
    npcId,
    evidenceId,
    reason,
    thread,
    label,
    completedAt: getTimestamp()
  });

  registerProgressUpdate('suspectInterviewsCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    eliminatedSuspectId: suspect.id,
    remainingSuspects: getActiveSuspects().map((entry) => entry.id)
  };
}

/**
 * Adds suspicion after an NPC conversation without removing a suspect.
 * Use it when the interview raises doubt but does not prove the suspect lied.
 */
export function flagSuspectFromInterview({
  suspectId,
  npcId = 'unknown_npc',
  evidenceId = 'npc_statement',
  note = 'The witness statement raises further questions.',
  thread = 'alibi',
  label = 'Witness Statement'
} = {}) {
  const suspect = getSuspectById(suspectId);
  ensureSuspectShape(suspect);

  suspect.deductionState.interviewStatus = STATUS.SUSPICIOUS;

  addUniqueNote(suspect, note);

  gameState.interviewEvidenceResults ??= [];
  gameState.interviewEvidenceResults.push({
    suspectId: suspect.id,
    npcId,
    evidenceId,
    note,
    thread,
    label,
    outcome: 'suspicious',
    completedAt: getTimestamp()
  });

  return {
    success: true,
    suspect: getPublicSuspectView(suspect.id)
  };
}

/**
 * Updates the alibi state during the final suspect phase.
 *
 * Available statuses:
 * - locked
 * - unverified
 * - corroborated
 * - contradicted
 * - suspicious
 */
export function setAlibiStatus(suspectId, status, note = '') {
  const allowedStatuses = [
    STATUS.LOCKED,
    'unverified',
    'corroborated',
    'contradicted',
    STATUS.SUSPICIOUS
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(`SuspectUtils: unsupported alibi status "${status}".`);
  }

  const suspect = getSuspectById(suspectId);
  ensureSuspectShape(suspect);

  suspect.deductionState.alibiStatus = status;

  if (note) {
    addUniqueNote(suspect, note);
  }

  if (status !== STATUS.LOCKED) {
    registerProgressUpdate('alibiPhaseUnlocked', true);
  }

  return getPublicSuspectView(suspect.id);
}

/**
 * Makes the interview and alibi phase visible for every still-active suspect.
 */
export function unlockAlibiPhase() {
  getActiveSuspects().forEach((suspect) => {
    ensureSuspectShape(suspect);

    if (suspect.deductionState.alibiStatus === STATUS.LOCKED) {
      suspect.deductionState.alibiStatus = 'unverified';
    }

    if (suspect.deductionState.interviewStatus === STATUS.LOCKED) {
      suspect.deductionState.interviewStatus = STATUS.UNLOCKED;
    }
  });

  registerProgressUpdate('alibiPhaseUnlocked', true);

  return getPublicSuspectList();
}

/**
 * Returns a compact state object useful for HUD, suspect list headers,
 * Case File UI, Crime Board and debugging.
 */
export function getSuspectCaseSummary() {
  ensureAllSuspectShapes();

  const suspects = getSuspects();
  const activeSuspects = getActiveSuspects();
  const eliminatedSuspects = suspects.filter((suspect) => suspect.deductionState.eliminated);

  return {
    caseId: getCaseId(),
    total: suspects.length,
    active: activeSuspects.length,
    eliminated: eliminatedSuspects.length,
    crimeLabCompleted: Boolean(gameState.csiLabCompleted),
    hypothesisCompleted: Boolean(gameState.hypothesisEvidence?.resultUnlocked),
    alibiPhaseUnlocked: Boolean(gameState.crimeCityProgress?.[getCaseId()]?.alibiPhaseUnlocked),
    activeSuspectIds: activeSuspects.map((suspect) => suspect.id),
    eliminatedSuspectIds: eliminatedSuspects.map((suspect) => suspect.id)
  };
}

/**
 * Debug-only helper.
 * Never expose the returned hidden profile in a player-facing scene.
 */
export function getDebugCaseTruth() {
  return getSuspects().map((suspect) => ({
    id: suspect.id,
    name: getDisplayName(suspect),
    isThief: isTrueThief(suspect),
    attributes: { ...suspect.attributes },
    skills: [...(suspect.skills || [])],
    hiddenProfile: { ...suspect.hiddenProfile }
  }));
}

/**
 * Rebuilds gameState.excludedSuspects from deductionState.
 * Useful after loading an older save or debugging.
 */
export function rebuildExcludedSuspects() {
  return syncExcludedSuspects();
}

export default {
  getActiveSuspects,
  getPublicSuspectView,
  getPublicSuspectList,
  applyIdentityEvidence,
  registerHypothesisAttempt,
  applyHypothesisSkills,
  unlockSuspectData,
  applyInterviewElimination,
  flagSuspectFromInterview,
  setAlibiStatus,
  unlockAlibiPhase,
  getSuspectCaseSummary,
  getDebugCaseTruth,
  rebuildExcludedSuspects
};