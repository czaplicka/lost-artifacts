import { gameState } from '../GameData.js';

const STATUS = {
  PENDING: 'pending',
  MATCH: 'match',
  MISMATCH: 'mismatch',
  ELIMINATED: 'eliminated',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  SUSPICIOUS: 'suspicious',
  CONFIRMED: 'confirmed',
  CONTRADICTED: 'contradicted',
  NOT_APPLICABLE: 'not_applicable',
  MANUALLY_CLEARED: 'manually_cleared'
};

function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .filter(
          value =>
            typeof value === 'string' &&
            value.trim()
        )
        .map(value => value.trim())
    )
  ];
}

function getTimestamp() {
  return new Date().toISOString();
}

function getCaseId() {
  return (
    gameState.currentCaseId ||
    gameState.currentMission?.id ||
    gameState.currentMission?.caseId ||
    null
  );
}

// Aliasy wskazują na tę samą tablicę podejrzanych.
function getSuspects() {
  const suspects =
    Array.isArray(gameState.caseSuspects) &&
    gameState.caseSuspects.length
      ? gameState.caseSuspects
      : Array.isArray(gameState.suspects) &&
          gameState.suspects.length
        ? gameState.suspects
        : Array.isArray(gameState.suspectList) &&
            gameState.suspectList.length
          ? gameState.suspectList
          : [];

  gameState.caseSuspects = suspects;
  gameState.suspects = suspects;
  gameState.suspectList = suspects;

  return suspects;
}

function getSuspectById(suspectId) {
  if (
    typeof suspectId !== 'string' ||
    !suspectId.trim()
  ) {
    throw new Error(
      'SuspectUtils: suspectId must be a valid string.'
    );
  }

  const suspect = getSuspects().find(
    entry => entry?.id === suspectId
  );

  if (!suspect) {
    throw new Error(
      `SuspectUtils: suspect "${suspectId}" was not found in caseSuspects.`
    );
  }

  return suspect;
}

function ensureSuspectShape(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return null;
  }

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

  // Tylko ręczna akcja gracza ustawia eliminated na true.
  suspect.deductionState.eliminated =
    suspect.deductionState.eliminated === true;

  suspect.deductionState.eliminationReasons =
    Array.isArray(suspect.deductionState.eliminationReasons)
      ? suspect.deductionState.eliminationReasons
      : [];

  suspect.deductionState.evidenceMismatches =
    Array.isArray(suspect.deductionState.evidenceMismatches)
      ? suspect.deductionState.evidenceMismatches
      : [];

  suspect.deductionState.notesUnlocked =
    Array.isArray(suspect.deductionState.notesUnlocked)
      ? suspect.deductionState.notesUnlocked
      : [];

  suspect.attributes ??= {};

  suspect.skills = Array.isArray(suspect.skills)
    ? suspect.skills
    : [];

  return suspect;
}

function ensureAllSuspectShapes() {
  getSuspects().forEach(ensureSuspectShape);
}

function getForensicAttributeValue(suspect, field) {
  return (
    suspect?.restrictedProfile?.forensicAttributes?.[field]?.value ??
    suspect?.restrictedProfile?.forensicAttributes?.[field] ??
    null
  );
}

function getDisplayName(suspect) {
  return (
    suspect?.publicProfile?.displayName ||
    suspect?.name ||
    'Unknown Suspect'
  );
}

function isTrueThief(suspect) {
  return (
    suspect?.isRealThief === true ||
    suspect?.hiddenCaseData?.isTrueThief === true ||
    suspect?.hiddenProfile?.isThief === true ||
    suspect?.is_thief === true
  );
}

function addUniqueNote(suspect, note) {
  if (
    typeof note !== 'string' ||
    !note.trim()
  ) {
    return;
  }

  ensureSuspectShape(suspect);

  const cleanedNote = note.trim();

  if (
    !suspect.deductionState.notesUnlocked.includes(cleanedNote)
  ) {
    suspect.deductionState.notesUnlocked.push(cleanedNote);
  }
}

function addUniqueEvidenceMismatch(suspect, evidence = {}) {
  ensureSuspectShape(suspect);

  const mismatchId = String(
    evidence.id ||
    `${evidence.type || 'evidence'}_${evidence.source || 'unknown'}_${evidence.field || 'unknown'}`
  );

  const exists =
    suspect.deductionState.evidenceMismatches.some(
      item => item?.id === mismatchId
    );

  if (exists) {
    return;
  }

  suspect.deductionState.evidenceMismatches.push({
    id: mismatchId,
    type: evidence.type || 'evidence',
    source: evidence.source || 'unknown',
    field: evidence.field || null,
    label: evidence.label || 'Evidence mismatch',
    note:
      evidence.note ||
      'This evidence does not match the suspect.',
    timestamp: evidence.timestamp || getTimestamp()
  });
}

function addEliminationReason(suspect, reason = {}) {
  ensureSuspectShape(suspect);

  const reasonId = String(
    reason.id ||
    `${reason.type || 'manual'}_${reason.source || 'suspect_file'}`
  );

  const alreadyExists =
    suspect.deductionState.eliminationReasons.some(
      existingReason => existingReason?.id === reasonId
    );

  if (alreadyExists) {
    return;
  }

  suspect.deductionState.eliminationReasons.push({
    id: reasonId,
    type: reason.type || 'manual',
    source: reason.source || 'suspect_file',
    label: reason.label || 'Manual exclusion',
    note:
      reason.note ||
      'Cleared by the detective during file review.',
    timestamp: reason.timestamp || getTimestamp()
  });
}

function syncExcludedSuspects() {
  ensureAllSuspectShapes();

  gameState.excludedSuspects = getSuspects()
    .filter(
      suspect =>
        suspect?.deductionState?.eliminated === true
    )
    .map(suspect => ({
      id: suspect.id,
      name: getDisplayName(suspect),
      reasons: [
        ...suspect.deductionState.eliminationReasons
      ]
    }));

  return gameState.excludedSuspects;
}

// Zapisuje niezgodność dowodu, nie wyklucza podejrzanego.
function markEvidenceMismatch(
  suspect,
  {
    statusKey = 'labStatus',
    status = STATUS.MISMATCH,
    reason = {}
  } = {}
) {
  ensureSuspectShape(suspect);

  suspect.deductionState[statusKey] = status;

  addUniqueEvidenceMismatch(suspect, reason);

  addUniqueNote(
    suspect,
    reason.note ||
      `${reason.label || 'Evidence'} does not match this suspect.`
  );

  return suspect;
}

function unlockRestrictedField(
  suspect,
  field,
  value,
  source = 'police_record'
) {
  ensureSuspectShape(suspect);

  if (
    typeof field !== 'string' ||
    !field.trim()
  ) {
    throw new Error(
      'SuspectUtils.unlockRestrictedField requires a valid field name.'
    );
  }

  const cleanField = field.trim();

  const existingAttribute =
    suspect.restrictedProfile.forensicAttributes[cleanField] || {};

  suspect.restrictedProfile.forensicAttributes[cleanField] = {
    ...existingAttribute,
    value,
    unlocked: true,
    source,
    unlockedAt: getTimestamp()
  };

  if (
    !suspect.restrictedProfile.unlockedFields.includes(cleanField)
  ) {
    suspect.restrictedProfile.unlockedFields.push(cleanField);
  }

  return suspect.restrictedProfile.forensicAttributes[cleanField];
}

function getIdentityEvidence() {
  if (
    !gameState.identityEvidence ||
    typeof gameState.identityEvidence !== 'object'
  ) {
    throw new Error(
      'SuspectUtils: gameState.identityEvidence is missing.'
    );
  }

  const attribute = gameState.identityEvidence.attribute;
  const thiefValue = gameState.identityEvidence.thief_value;

  if (
    !attribute ||
    thiefValue === null ||
    thiefValue === undefined ||
    thiefValue === ''
  ) {
    throw new Error(
      'SuspectUtils: identityEvidence needs attribute and thief_value.'
    );
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

  return uniqueStrings(requiredSkills).every(
    skill => suspectSkillSet.has(normalizeValue(skill))
  );
}

function skillListsMatch(selectedSkills, requiredSkills) {
  const selected = uniqueStrings(selectedSkills)
    .map(normalizeValue)
    .sort();

  const required = uniqueStrings(requiredSkills)
    .map(normalizeValue)
    .sort();

  if (selected.length !== required.length) {
    return false;
  }

  return selected.every(
    (skill, index) => skill === required[index]
  );
}

function registerProgressUpdate(key, value = true) {
  const caseId = getCaseId();

  if (!caseId) {
    return;
  }

  gameState.crimeCityProgress ??= {};
  gameState.crimeCityProgress[caseId] ??= {};
  gameState.crimeCityProgress[caseId][key] = value;
}

// Zwraca osoby, które nie zostały ręcznie wykluczone.
export function getActiveSuspects() {
  ensureAllSuspectShapes();

  return getSuspects().filter(
    suspect =>
      suspect?.deductionState?.eliminated !== true
  );
}

export function manuallyClearSuspect(
  suspectId,
  {
    source = 'suspect_file',
    label = 'Manual exclusion',
    note = 'Cleared by the detective during preliminary review.',
    type = 'manual'
  } = {}
) {
  const suspect = getSuspectById(suspectId);

  ensureSuspectShape(suspect);

  if (isTrueThief(suspect)) {
    return {
      success: false,
      message:
        'This file remains inconclusive. The evidence is not enough to clear it.',
      suspect: getPublicSuspectView(suspect.id)
    };
  }

  suspect.deductionState.eliminated = true;

  suspect.deductionState.labStatus =
    suspect.deductionState.labStatus === STATUS.PENDING
      ? STATUS.MANUALLY_CLEARED
      : suspect.deductionState.labStatus;

  addEliminationReason(suspect, {
    id: `manual_${source}_${suspect.id}`,
    type,
    source,
    label,
    note
  });

  syncExcludedSuspects();

  return {
    success: true,
    suspect: getPublicSuspectView(suspect.id)
  };
}

export function restoreManuallyClearedSuspect(suspectId) {
  const suspect = getSuspectById(suspectId);

  ensureSuspectShape(suspect);

  suspect.deductionState.eliminated = false;
  suspect.deductionState.eliminationReasons = [];

  if (
    suspect.deductionState.labStatus === STATUS.MANUALLY_CLEARED
  ) {
    suspect.deductionState.labStatus =
      suspect.deductionState.evidenceMismatches.length
        ? STATUS.MISMATCH
        : STATUS.PENDING;
  }

  syncExcludedSuspects();

  return {
    success: true,
    suspect: getPublicSuspectView(suspect.id)
  };
}

// Widok dla UI nie zawiera ukrytej tożsamości sprawcy.
export function getPublicSuspectView(suspectId) {
  const suspect = getSuspectById(suspectId);

  ensureSuspectShape(suspect);

  return {
    id: suspect.id,
    name: getDisplayName(suspect),
    occupation:
      suspect.publicProfile.occupation ||
      suspect.occupation ||
      'Unknown occupation',
    genderCode:
      suspect.publicProfile.genderCode ||
      suspect.genderCode ||
      suspect.gender_code ||
      'nb',
    visibleTraits: [
      ...(
        suspect.publicProfile.visibleTraits ||
        suspect.visibleTraits ||
        []
      )
    ],
    caseConnection:
      suspect.publicProfile.caseConnection ||
      suspect.caseConnection ||
      '',
    restrictedProfile: {
      unlockedFields: [
        ...suspect.restrictedProfile.unlockedFields
      ],
      forensicAttributes: {
        ...suspect.restrictedProfile.forensicAttributes
      }
    },
    deductionState: {
      labStatus: suspect.deductionState.labStatus,
      hypothesisStatus: suspect.deductionState.hypothesisStatus,
      interviewStatus: suspect.deductionState.interviewStatus,
      alibiStatus: suspect.deductionState.alibiStatus,
      eliminated: suspect.deductionState.eliminated === true,
      eliminationReasons: [
        ...suspect.deductionState.eliminationReasons
      ],
      evidenceMismatches: [
        ...suspect.deductionState.evidenceMismatches
      ],
      notesUnlocked: [
        ...suspect.deductionState.notesUnlocked
      ]
    }
  };
}

export function getPublicSuspectList() {
  return getSuspects().map(
    suspect => getPublicSuspectView(suspect.id)
  );
}

export function applyIdentityEvidence(options = {}) {
  ensureAllSuspectShapes();

  const configuredEvidence = getIdentityEvidence();

  const attribute =
    options.attribute || configuredEvidence.attribute;

  const value =
    options.value ?? configuredEvidence.thiefValue;

  const source =
    options.source ||
    configuredEvidence.id ||
    'crime_lab';

  const label =
    options.label ||
    configuredEvidence.label ||
    'Crime Lab Result';

  const clueText =
    options.clueText ||
    configuredEvidence.clueText ||
    'Forensic evidence does not match this suspect.';

  if (attribute !== configuredEvidence.attribute) {
    throw new Error(
      `SuspectUtils: attempted to apply "${attribute}", but this case requires "${configuredEvidence.attribute}".`
    );
  }

  if (
    normalizeValue(value) !==
    normalizeValue(configuredEvidence.thiefValue)
  ) {
    throw new Error(
      'SuspectUtils: the supplied identity result does not match the generated case evidence.'
    );
  }

  const mismatchedSuspectIds = [];
  const matchedSuspectIds = [];

  getSuspects().forEach(suspect => {
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

      addUniqueNote(
        suspect,
        `${label}: consistent with the forensic result.`
      );

      matchedSuspectIds.push(suspect.id);
      return;
    }

    markEvidenceMismatch(suspect, {
      statusKey: 'labStatus',
      status: STATUS.MISMATCH,
      reason: {
        id: `lab_${attribute}_${suspect.id}`,
        type: 'forensic',
        source,
        field: attribute,
        label,
        note: clueText
      }
    });

    mismatchedSuspectIds.push(suspect.id);
  });

  gameState.identityEvidenceResult = {
    id: configuredEvidence.id,
    attribute,
    value,
    source,
    label,
    completedAt: getTimestamp(),
    excludedSuspectIds: [],
    mismatchedSuspectIds,
    matchedSuspectIds
  };

  gameState.forensicResults ??= [];
  gameState.forensicResults.push({
    ...gameState.identityEvidenceResult
  });

  gameState.identityEvidence.resultUnlocked = true;
  gameState.csiLabCompleted = true;

  registerProgressUpdate('crimeLabCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    attribute,
    value,
    excludedSuspectIds: [],
    mismatchedSuspectIds,
    matchedSuspectIds,
    remainingSuspects: getActiveSuspects().map(
      suspect => suspect.id
    )
  };
}

export function registerHypothesisAttempt(selectedSkills = []) {
  const requiredSkills = uniqueStrings(
    gameState.hypothesisEvidence?.requiredSkills
  );

  if (!requiredSkills.length) {
    throw new Error(
      'SuspectUtils: gameState.hypothesisEvidence.requiredSkills is missing.'
    );
  }

  gameState.hypothesisAttempts ??= [];

  const attempt = {
    attemptNumber: gameState.hypothesisAttempts.length + 1,
    selectedSkills: uniqueStrings(selectedSkills),
    isCorrect: skillListsMatch(
      selectedSkills,
      requiredSkills
    ),
    attemptedAt: getTimestamp()
  };

  gameState.hypothesisAttempts.push(attempt);

  return attempt;
}

export function applyHypothesisSkills(selectedSkills = []) {
  ensureAllSuspectShapes();

  const requiredSkills = uniqueStrings(
    gameState.hypothesisEvidence?.requiredSkills
  );

  if (!requiredSkills.length) {
    throw new Error(
      'SuspectUtils: gameState.hypothesisEvidence.requiredSkills is missing.'
    );
  }

  const attempt = registerHypothesisAttempt(selectedSkills);

  if (!attempt.isCorrect) {
    return {
      success: false,
      isCorrect: false,
      attemptNumber: attempt.attemptNumber,
      message:
        'The reconstruction does not fit the evidence. No suspects were cleared.',
      remainingSuspects: getActiveSuspects().map(
        suspect => suspect.id
      )
    };
  }

  const mismatchedSuspectIds = [];
  const matchedSuspectIds = [];

  getActiveSuspects().forEach(suspect => {
    const matchesRequiredSkills = skillsMatch(
      suspect.skills,
      requiredSkills
    );

    if (matchesRequiredSkills) {
      suspect.deductionState.hypothesisStatus = STATUS.MATCH;
      matchedSuspectIds.push(suspect.id);
      return;
    }

    markEvidenceMismatch(suspect, {
      statusKey: 'hypothesisStatus',
      status: STATUS.MISMATCH,
      reason: {
        id: `hypothesis_skills_${suspect.id}`,
        type: 'method',
        source: 'hypothesis_reconstruction',
        field: 'skills',
        label: 'Crime Reconstruction'
      }
    });

    mismatchedSuspectIds.push(suspect.id);
  });

  getSuspects()
    .filter(
      suspect =>
        suspect?.deductionState?.labStatus === STATUS.MISMATCH
    )
    .forEach(suspect => {
      if (
        suspect.deductionState.hypothesisStatus === STATUS.PENDING
      ) {
        suspect.deductionState.hypothesisStatus =
          STATUS.NOT_APPLICABLE;
      }
    });

  gameState.hypothesisEvidenceResult = {
    id:
      gameState.hypothesisEvidence?.id ||
      'hypothesis_skills',
    requiredSkills,
    completedAt: getTimestamp(),
    matchedSuspectIds,
    mismatchedSuspectIds
  };

  gameState.hypothesisEvidence.resultUnlocked = true;

  registerProgressUpdate('hypothesisCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    isCorrect: true,
    attemptNumber: attempt.attemptNumber,
    requiredSkills,
    excludedSuspectIds: [],
    mismatchedSuspectIds,
    matchedSuspectIds,
    remainingSuspects: getActiveSuspects().map(
      suspect => suspect.id
    )
  };
}

// Przywrócona funkcja używana również w export default.
export function unlockSuspectData(
  suspectId,
  field,
  value,
  source = 'police_database'
) {
  const suspect = getSuspectById(suspectId);

  unlockRestrictedField(
    suspect,
    field,
    value,
    source
  );

  return getPublicSuspectView(suspectId);
}

export function applyInterviewElimination({
  suspectId,
  npcId = 'unknown_npc',
  evidenceId = 'npc_statement',
  reason = 'A witness statement supports this suspect’s alibi.',
  thread = 'alibi',
  label = 'Witness Statement'
} = {}) {
  const suspect = getSuspectById(suspectId);

  ensureSuspectShape(suspect);

  if (isTrueThief(suspect)) {
    console.warn(
      '[SuspectUtils] Ignored interview clearance for true thief.',
      {
        suspectId,
        npcId,
        evidenceId
      }
    );

    return {
      success: false,
      message:
        'This testimony is inconclusive and cannot clear the suspect.',
      suspect: getPublicSuspectView(suspect.id)
    };
  }

  suspect.deductionState.interviewStatus = STATUS.CONFIRMED;

  if (thread === 'alibi') {
    suspect.deductionState.alibiStatus = 'corroborated';
  }

  addUniqueNote(suspect, reason);

  addUniqueEvidenceMismatch(suspect, {
    id: `interview_${evidenceId}_${suspect.id}`,
    type: thread,
    source: npcId,
    field: 'alibi',
    label,
    note: reason
  });

  gameState.interviewEvidenceResults ??= [];
  gameState.interviewEvidenceResults.push({
    suspectId: suspect.id,
    npcId,
    evidenceId,
    reason,
    thread,
    label,
    outcome: 'corroborated_not_auto_cleared',
    completedAt: getTimestamp()
  });

  registerProgressUpdate('suspectInterviewsCompleted', true);
  syncExcludedSuspects();

  return {
    success: true,
    manuallyClearRequired: true,
    suspect: getPublicSuspectView(suspect.id),
    remainingSuspects: getActiveSuspects().map(
      entry => entry.id
    )
  };
}

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

  if (thread === 'alibi') {
    suspect.deductionState.alibiStatus = STATUS.SUSPICIOUS;
  }

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

export function setAlibiStatus(
  suspectId,
  status,
  note = ''
) {
  const allowedStatuses = [
    STATUS.LOCKED,
    'unverified',
    'corroborated',
    STATUS.CONTRADICTED,
    STATUS.SUSPICIOUS
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `SuspectUtils: unsupported alibi status "${status}".`
    );
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

export function unlockAlibiPhase() {
  getActiveSuspects().forEach(suspect => {
    ensureSuspectShape(suspect);

    if (suspect.deductionState.alibiStatus === STATUS.LOCKED) {
      suspect.deductionState.alibiStatus = 'unverified';
    }

    if (
      suspect.deductionState.interviewStatus === STATUS.LOCKED
    ) {
      suspect.deductionState.interviewStatus = STATUS.UNLOCKED;
    }
  });

  registerProgressUpdate('alibiPhaseUnlocked', true);

  return getPublicSuspectList();
}

export function getSuspectCaseSummary() {
  ensureAllSuspectShapes();

  const suspects = getSuspects();
  const activeSuspects = getActiveSuspects();

  const eliminatedSuspects = suspects.filter(
    suspect => suspect?.deductionState?.eliminated === true
  );

  const labMismatchSuspects = suspects.filter(
    suspect =>
      suspect?.deductionState?.labStatus === STATUS.MISMATCH
  );

  const hypothesisMismatchSuspects = suspects.filter(
    suspect =>
      suspect?.deductionState?.hypothesisStatus === STATUS.MISMATCH
  );

  return {
    caseId: getCaseId(),
    total: suspects.length,
    active: activeSuspects.length,
    eliminated: eliminatedSuspects.length,
    labMismatchCount: labMismatchSuspects.length,
    hypothesisMismatchCount: hypothesisMismatchSuspects.length,
    crimeLabCompleted: Boolean(gameState.csiLabCompleted),
    hypothesisCompleted: Boolean(
      gameState.hypothesisEvidence?.resultUnlocked
    ),
    alibiPhaseUnlocked: Boolean(
      gameState.crimeCityProgress?.[getCaseId()]?.alibiPhaseUnlocked
    ),
    activeSuspectIds: activeSuspects.map(
      suspect => suspect.id
    ),
    eliminatedSuspectIds: eliminatedSuspects.map(
      suspect => suspect.id
    ),
    labMismatchSuspectIds: labMismatchSuspects.map(
      suspect => suspect.id
    ),
    hypothesisMismatchSuspectIds: hypothesisMismatchSuspects.map(
      suspect => suspect.id
    )
  };
}

// Wyłącznie do debugowania — nie pokazuj tych danych graczowi.
export function getDebugCaseTruth() {
  return getSuspects().map(suspect => ({
    id: suspect.id,
    name: getDisplayName(suspect),
    isThief: isTrueThief(suspect),
    attributes: {
      ...suspect.attributes
    },
    skills: [
      ...(suspect.skills || [])
    ],
    hiddenProfile: {
      ...suspect.hiddenProfile
    },
    deductionState: {
      ...suspect.deductionState
    }
  }));
}

export function rebuildExcludedSuspects() {
  return syncExcludedSuspects();
}

export default {
  getActiveSuspects,
  getPublicSuspectView,
  getPublicSuspectList,

  manuallyClearSuspect,
  restoreManuallyClearedSuspect,

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