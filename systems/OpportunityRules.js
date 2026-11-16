const OPPORTUNITY_IDS = new Set([
  'work_access',
  'unobserved_interval',
  'false_alibi',
  'borrowed_access',
  'security_gap',
  'public_access'
]);

const list = value => Array.isArray(value) ? value : [];

const sameId = (a, b) =>
  a != null &&
  b != null &&
  String(a) === String(b);

function getActualIdentityIds(state) {
  const canonicalIds = [
    state.actualCriminalId,
    state.currentThiefId,
    state.currentThief?.id
  ]
    .filter(value => value != null)
    .map(String);

  if (new Set(canonicalIds).size > 1) {
    return [];
  }

  return [...new Set([
    ...canonicalIds,
    state.trueThiefCaseSuspectId,
    state.realThiefSuspectId,
    state.caseData?.trueThiefCaseSuspectId,
    state.caseData?.realThiefSuspectId,
    state.currentThiefCaseSuspectId,
    state.currentThief?.caseSuspectId
  ]
    .filter(value => value != null)
    .map(String))];
}

/*
 * Zgodne z theoryCaseKey() w CaseTheoryModel.js.
 * Bez importu, ponieważ CaseTheoryModel importuje ten moduł.
 */
function getTheoryCaseKey(state) {
  const mission = state.currentMission || {};

  return String(
    mission.id ??
    mission.caseId ??
    mission.caseIndex ??
    `${
      state.caseSuspectCityId ??
      state.crimeCityId ??
      state.crimeCity ??
      mission.city ??
      'unknown'
    }_${
      mission.artifactKey ??
      mission.artifact ??
      'default'
    }`
  );
}

function belongsToCurrentCase(record, state) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  if (
    record.caseId != null &&
    !sameId(record.caseId, state.currentCaseId)
  ) {
    return false;
  }

  if (
    record.campaignId != null &&
    record.campaignId !== state._createdAt
  ) {
    return false;
  }

  return true;
}

function getCulpritAlibi(state) {
  const actualIds = new Set(getActualIdentityIds(state));

  if (actualIds.size === 0) {
    return null;
  }

  const caseKey = getTheoryCaseKey(state);
  const investigation = state.caseData?.alibiCases?.[caseKey];

  if (!belongsToCurrentCase(investigation, state)) {
    return null;
  }

  const matches = list(investigation.suspects).filter(
    subject => actualIds.has(String(subject?.suspectId))
  );

  return matches.length === 1 ? matches[0] : null;
}

function hasCorrectFiledConclusion(subject, state) {
  const conclusion = subject?.playerConclusion;

  if (
    conclusion?.locked !== true ||
    !belongsToCurrentCase(conclusion, state)
  ) {
    return false;
  }

  /*
   * Negatywna ocena zapisanego wniosku zawsze blokuje potwierdzenie.
   * Pozytywna ocena nie zastępuje kontroli wskazanego świadka.
   */
  if (conclusion.evaluation?.conclusionCorrect === false) {
    return false;
  }

  if (subject.alibiType === 'confirmed') {
    return conclusion.choice === '__no_liar__';
  }

  if (subject.alibiType !== 'contradicted') {
    return false;
  }

  if (
    conclusion.choice == null ||
    conclusion.choice === '__no_liar__'
  ) {
    return false;
  }

  return list(subject.witnesses).some(
    witness =>
      witness?.isLiar === true &&
      sameId(witness.npcId, conclusion.choice)
  );
}

function getExplicitSolution(state) {
  const raw = state.caseData?.caseTheorySolution?.opportunityIds;

  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    !raw.every(id => OPPORTUNITY_IDS.has(id))
  ) {
    return null;
  }

  return [...new Set(raw)];
}

export function getOpportunityFacts(state = {}) {
  const explicit = getExplicitSolution(state);
  const supported = new Set();
  const contradicted = new Set();

  if (explicit) {
    for (const id of explicit) {
      supported.add(id);
    }

    for (const id of OPPORTUNITY_IDS) {
      if (!supported.has(id)) {
        contradicted.add(id);
      }
    }
  } else {
    const claims = list(state.reconstructedHeist?.claims);

    if (
      claims.some(claim =>
        [
          'beat_security',
          'disable_system',
          'create_blind_spot'
        ].includes(claim?.questionId)
      )
    ) {
      supported.add('security_gap');
    }
  }

  const culpritAlibi = getCulpritAlibi(state);

  /*
   * Rozwiązanie generatora nie jest dowodem wykonania pracy przez gracza.
   * false_alibi wymaga poprawnie zatwierdzonej konkluzji.
   */
  supported.delete('false_alibi');

  if (culpritAlibi?.alibiType === 'confirmed') {
    contradicted.add('false_alibi');
  } else if (
    culpritAlibi?.alibiType === 'contradicted' &&
    hasCorrectFiledConclusion(culpritAlibi, state) &&
    (!explicit || explicit.includes('false_alibi'))
  ) {
    supported.add('false_alibi');
    contradicted.delete('false_alibi');
  }

  return {
    /*
     * Przy jawnej liście rozwiązania nie wszystkie poprawne odpowiedzi
     * muszą być już udowodnione. evaluateOpportunity korzysta więc
     * z osobnej listy contradicted, zamiast odrzucać wszystko pozostałe.
     */
    exhaustive: false,
    supported: [...supported].sort(),
    contradicted: [...contradicted].sort()
  };
}

export function evaluateOpportunity(facts, answerId) {
  if (!OPPORTUNITY_IDS.has(answerId)) {
    return 'contradicted';
  }

  if (list(facts?.contradicted).includes(answerId)) {
    return 'contradicted';
  }

  if (list(facts?.supported).includes(answerId)) {
    return 'supported';
  }

  if (facts?.exhaustive === true) {
    return 'contradicted';
  }

  return 'inconclusive';
}