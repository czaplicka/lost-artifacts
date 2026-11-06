import { isCorrectSuspectChoice } from '../suspects/suspectHelpers.js';

export const COURT_CONFIG = Object.freeze({
  version: 2,
  initialTrust: 35,
  convictionThreshold: 65,
  mistakenIdentityCap: 40
});

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

const clamp = value => Math.max(0, Math.min(100, value));

/*
 * Fallback names from assets/data/missions.json.
 * The active mission's display names take priority.
 */
const CASE_LABELS = Object.freeze({
  tower: {
    location: 'The Tower of London',
    city: 'London',
    artifact: 'Crown Jewels',
    artifactKey: 'artifact_crown_jewels'
  },
  louvre: {
    location: 'The Louvre Museum',
    city: 'Paris',
    artifact: 'Mona Lisa Sketchbook',
    artifactKey: 'artifact_mona_lisa'
  },
  auction_house: {
    location: 'Kronenhaus Auction House, Museum Island',
    city: 'Berlin',
    artifact: 'Prussian Royal Seal',
    artifactKey: 'artifact_royal_seal'
  },
  castle: {
    location: 'The Royal Castle in Warsaw',
    city: 'Warsaw',
    artifact: 'Royal Amber Necklace',
    artifactKey: 'artifact_amber_necklace'
  },
  havela: {
    location: 'Jade Peacock Haveli',
    city: 'New Delhi',
    artifact: 'Mughal Emerald Dagger',
    artifactKey: 'artifact_mughal_dagger'
  },
  dockyard: {
    location: 'Red Hook Maritime Warehouse',
    city: 'New York City',
    artifact: 'Liberty Torch Replica',
    artifactKey: 'artifact_liberty_torch'
  }
});

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedKey(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function sceneKey(value) {
  const key = normalizedKey(value)
    .replace(/^crime:/, '')
    .replace(/_bg$/, '');

  return key === 'action_house' ? 'auction_house' : key;
}

function displayText(value) {
  const text = stringValue(value);

  if (!text) return null;

  // Never expose texture keys, paths or underscored identifiers.
  if (
    text.includes('_') ||
    text.includes('/') ||
    text.includes('\\') ||
    /^(image|json|tilemap|crime):/i.test(text) ||
    /\.(webp|png|jpe?g|json)$/i.test(text)
  ) {
    return null;
  }

  return text;
}

function objectName(value) {
  if (typeof value === 'string') return displayText(value);

  if (!value || typeof value !== 'object') return null;

  return (
    displayText(value.displayName) ||
    displayText(value.name) ||
    displayText(value.title) ||
    displayText(value.label)
  );
}

function artifactName(value) {
  const readable = objectName(value);
  if (readable) return readable;

  const candidates = typeof value === 'string'
    ? [value]
    : [
        value?.artifactKey,
        value?.key,
        value?.id
      ];

  for (const candidate of candidates) {
    const key = normalizedKey(candidate);

    const match = Object.values(CASE_LABELS).find(
      entry => normalizedKey(entry.artifactKey) === key
    );

    if (match) return match.artifact;
  }

  return null;
}

function locationName(value) {
  if (typeof value === 'string') {
    const known = CASE_LABELS[sceneKey(value)];
    return known?.location || displayText(value);
  }

  return objectName(value);
}

function findCaseLabels(mission, state) {
  // Prefer the active mission's scene or artifact identity.
  const sceneCandidates = [
    mission.scene,
    typeof mission.location === 'string' ? mission.location : null
  ];

  for (const candidate of sceneCandidates) {
    const match = CASE_LABELS[sceneKey(candidate)];
    if (match) return match;
  }

  const artifactCandidates = [
    mission.artifactKey,
    typeof mission.artifact === 'string' ? mission.artifact : null,
    mission.artifact?.artifactKey,
    mission.artifact?.key,
    mission.artifact?.id,
    typeof state.currentArtifact === 'string'
      ? state.currentArtifact
      : null,
    state.currentArtifact?.artifactKey,
    state.currentArtifact?.key,
    state.currentArtifact?.id
  ];

  for (const candidate of artifactCandidates) {
    const key = normalizedKey(candidate);
    if (!key) continue;

    const match = Object.values(CASE_LABELS).find(entry =>
      normalizedKey(entry.artifactKey) === key ||
      normalizedKey(entry.artifact) === key
    );

    if (match) return match;
  }

  return null;
}

function resolveCaseNames(state) {
  const mission =
    state.currentMission &&
    typeof state.currentMission === 'object'
      ? state.currentMission
      : {};

  const labels = findCaseLabels(mission, state);

  const resolvedArtifact =
    artifactName(mission.artifact) ||
    artifactName(mission.artifactKey) ||
    artifactName(state.currentArtifact) ||
    labels?.artifact ||
    null;

  const resolvedLocation =
    locationName(mission.location) ||
    labels?.location ||
    locationName(mission.scene) ||
    null;

  const resolvedCity =
    objectName(mission.city) ||
    labels?.city ||
    objectName(state.crimeCity) ||
    null;

  return {
    artifactName: resolvedArtifact,
    crimeLocationName: resolvedLocation,
    crimeCityName: resolvedCity
  };
}

function answer(text, delta, feedback) {
  return { text, delta, feedback };
}

function question(
  id,
  side,
  text,
  answers,
  baseDelta = 0,
  identityExposed = false
) {
  return {
    id,
    side,
    text,
    answers,
    baseDelta,
    identityExposed
  };
}

function shuffledAnswers(item) {
  let seed = 2166136261;

  for (const char of item.id) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }

  const answers = [...item.answers];

  for (let i = answers.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);

    [answers[i], answers[j]] = [answers[j], answers[i]];
  }

  return { ...item, answers };
}

export function buildCourtFacts(state, suspectId) {
  if (state.currentCaseId == null || suspectId == null) {
    throw new Error('Court requires a case ID and defendant ID.');
  }

  const actualSuspectId =
    state.trueThiefCaseSuspectId ??
    state.realThiefSuspectId ??
    state.caseData?.trueThiefCaseSuspectId ??
    state.caseData?.realThiefSuspectId ??
    state.currentThiefCaseSuspectId ??
    state.currentThief?.caseSuspectId ??
    state.currentThief?.id ??
    state.currentThiefId;

  if (actualSuspectId == null) {
    throw new Error(
      'Cannot start trial: the case culprit identity is missing.'
    );
  }

  const pools = [
    state.caseSuspects,
    state.suspects,
    state.suspectList
  ].filter(Array.isArray);

  const defendant = pools.flat().find(
    person => sameId(person?.id, suspectId)
  );

  const defendantName =
    objectName(defendant?.publicProfile) ||
    objectName(defendant) ||
    displayText(state.warrantSuspectName);

  if (!defendantName) {
    throw new Error(
      'Cannot start trial: the defendant display name is missing.'
    );
  }

  const hintHistory = Array.isArray(state.hintState?.usageHistory)
    ? state.hintState.usageHistory
    : [];

  const misconductHistory = Array.isArray(state.courtMisconductLog)
    ? state.courtMisconductLog
    : [];

  const incidents = [];
  const seen = new Set();

  for (const entry of [...hintHistory, ...misconductHistory]) {
    if (!entry || !sameId(entry.caseId, state.currentCaseId)) continue;

    if (
      entry.method !== 'cut_corners' &&
      !(Number(entry.moralDelta) < 0)
    ) {
      continue;
    }

    if (entry.id == null) continue;

    const key = String(entry.id);
    if (seen.has(key)) continue;

    seen.add(key);

    incidents.push({
      id: key,
      type: entry.method ?? entry.type ?? 'misconduct',

      // Internal IDs stay available for logic, not dialogue.
      sceneId: entry.sceneId ?? null,
      itemId: entry.itemId ?? null,

      locationName:
        locationName(entry.locationName) ||
        locationName(entry.sceneId) ||
        null,

      issue: entry.proceduralIssue ?? null,
      moralDelta: Number(entry.moralDelta) || 0
    });
  }

  return {
    caseId: state.currentCaseId,
    campaignId: state._createdAt,
    suspectId,
    defendantName,
    ...resolveCaseNames(state),

    warrantMatches:
      Boolean(state.arrestWarrantIssued) &&
      sameId(state.warrantSuspectId, suspectId),

    correctDefendant: isCorrectSuspectChoice(
      String(suspectId),
      String(actualSuspectId)
    ),

    incidents
  };
}

export function buildCourtQuestions(facts) {
  const questions = [];

  if (facts.artifactName) {
    questions.push(question(
      'prosecution_artifact',
      'prosecutor',
      `Prosecutor: The charge concerns the theft of ${facts.artifactName}. What must the investigation establish?`,
      [
        answer(
          'That the evidence connects the defendant to the theft of that specific object.',
          10,
          'You distinguish identifying the stolen object from proving who stole it.'
        ),
        answer(
          'That the defendant had an interest in valuable objects of this kind.',
          -6,
          'An interest may suggest a line of inquiry. It does not establish participation.'
        ),
        answer(
          'That the object was valuable enough to give the defendant a reason to steal it.',
          -8,
          'Value alone does not establish this defendant’s motive or involvement.'
        ),
        answer(
          'That the defendant could have sold an object matching its description.',
          -6,
          'A possible resale opportunity does not connect the defendant to this theft.'
        )
      ]
    ));
  }

  const crimePlace = facts.crimeLocationName || facts.crimeCityName;

  if (crimePlace) {
    questions.push(question(
      'prosecution_location',
      'prosecutor',
      `Prosecutor: The theft took place at ${crimePlace}. What is the significance of establishing opportunity?`,
      [
        answer(
          'It tests whether the defendant could have accessed the crime scene during the relevant period.',
          10,
          'Opportunity concerns access at the relevant time, not mere familiarity with the location.'
        ),
        answer(
          'It establishes that anyone employed there should remain equally likely to be responsible.',
          -8,
          'Employment creates possible access, not equal responsibility.'
        ),
        answer(
          'It allows the arrest location to stand in for the crime scene if the defendant travelled.',
          -10,
          'The arrest location does not replace the location of the theft.'
        ),
        answer(
          'It makes a connection to the surrounding city sufficient to establish access.',
          -6,
          'Being in the same city is not the same as having access to the crime scene.'
        )
      ]
    ));
  }

  questions.push(question(
    'prosecution_warrant',
    'prosecutor',
    'Prosecutor: What does the arrest warrant establish in this case?',
    [
      answer(
        'It authorised the arrest of the named defendant; guilt still depends on the evidence.',
        facts.warrantMatches ? 12 : -20,
        facts.warrantMatches
          ? 'The warrant and the allegation of guilt remain properly distinguished.'
          : 'The record does not support that account of the warrant.'
      ),
      answer(
        'It confirms that the evidence has already established guilt.',
        -10,
        'An arrest warrant is not a conviction.'
      ),
      answer(
        'It makes weaknesses in the identification evidence irrelevant.',
        -10,
        'The defence may still challenge identification.'
      ),
      answer(
        'It transfers responsibility for proving the case to the defendant.',
        -12,
        'The warrant does not make the defendant responsible for proving the accusation.'
      )
    ]
  ));

  questions.push(question(
    'defense_identity',
    'defense',
    facts.correctDefendant
      ? 'Defence: A suspect can resemble the offender without being the offender. How should the court assess identification?'
      : 'Defence: The case record identifies someone else as the offender. Do you maintain this identification?',
    facts.correctDefendant
      ? [
          answer(
            'Test identification against the case findings and consider whether another suspect fits them.',
            4,
            'You address the possibility of mistaken identity rather than assuming it away.'
          ),
          answer(
            'Give priority to the arrest because it was the final investigative decision.',
            -10,
            'An arrest does not independently validate the identification.'
          ),
          answer(
            'Treat a matching forensic profile as enough to exclude every alternative.',
            -12,
            'A shared profile cannot by itself distinguish suspects who match it.'
          ),
          answer(
            'Use the defendant’s flight to resolve any remaining identification uncertainty.',
            -10,
            'Flight does not resolve conflicting identification evidence.'
          )
        ]
      : [
          answer(
            'No. I acknowledge the discrepancy and cannot support an identification contradicted by the record.',
            0,
            'The discrepancy is acknowledged. An honest answer cannot repair the mistaken arrest.'
          ),
          answer(
            'Yes. The warrant should take priority over conflicting case findings.',
            -12,
            'The warrant cannot repair a mistaken identification.'
          ),
          answer(
            'Yes. A matching profile makes the difference between the two people immaterial.',
            -15,
            'A shared profile does not make two people interchangeable.'
          ),
          answer(
            'Yes. The circumstances of the pursuit outweigh the conflicting identification.',
            -12,
            'The pursuit does not establish that this defendant committed the theft.'
          )
        ],
    facts.correctDefendant ? -4 : -45,
    !facts.correctDefendant
  ));

  questions.push(question(
    'defense_flight',
    'defense',
    'Defence: My client fled. What can you reasonably infer from that behaviour?',
    [
      answer(
        'It is relevant context, but it must be assessed separately from evidence establishing the theft.',
        0,
        'You acknowledge the behaviour without treating it as conclusive proof.'
      ),
      answer(
        'It establishes involvement unless the defendant provides a convincing explanation.',
        -10,
        'That inference places too much weight on flight and shifts the burden to the defendant.'
      ),
      answer(
        'It resolves uncertainty in the forensic evidence because the defendant avoided arrest.',
        -12,
        'Behaviour during arrest cannot resolve an ambiguous forensic match.'
      ),
      answer(
        'It confirms the motive already proposed by the investigation.',
        -8,
        'Flight does not establish why the theft was committed.'
      )
    ],
    -2
  ));

  for (const incident of facts.incidents) {
    const place = incident.locationName
      ? ` at ${incident.locationName}`
      : '';

    const description = incident.type === 'cut_corners'
      ? 'a skipped evidence-handling checklist'
      : 'a recorded procedural breach';

    const penalty = incident.type === 'cut_corners'
      ? 8
      : Math.min(25, Math.max(8, Math.abs(incident.moralDelta)));

    questions.push(question(
      `defense_incident_${incident.id}`,
      'defense',
      `Defence: The file records ${description}${place}. How should the court assess the affected material?`,
      [
        answer(
          'Acknowledge the breach, examine what it affects, and distinguish independently supported findings.',
          2,
          'A precise explanation limits the damage. It does not erase the recorded breach.'
        ),
        answer(
          'Rely on the overall consistency of the investigation instead of examining that breach separately.',
          -8,
          'General consistency does not answer a specific procedural challenge.'
        ),
        answer(
          'Treat the material as reliable because it supports the existing case theory.',
          -10,
          'Supporting the theory is not an independent test of reliability.'
        ),
        answer(
          'Ask the court to disregard the breach unless the defence proves that the material was altered.',
          -12,
          'The recorded breach still requires a substantive explanation.'
        )
      ],
      -penalty
    ));
  }

  return questions.map(shuffledAnswers);
}

export function createCourtRecord(facts) {
  return {
    version: COURT_CONFIG.version,
    caseId: facts.caseId,
    campaignId: facts.campaignId,
    suspectId: facts.suspectId,
    facts,
    questions: buildCourtQuestions(facts),
    index: 0,
    trust: COURT_CONFIG.initialTrust,
    identityExposed: false,
    phase: 'question',
    feedback: '',
    answers: [],
    verdict: null,
    resultCommitted: false
  };
}

export function answerCourtQuestion(record, answerIndex) {
  if (
    !record ||
    record.phase !== 'question' ||
    !Number.isInteger(answerIndex)
  ) {
    return false;
  }

  const currentQuestion = record.questions[record.index];
  const selected = currentQuestion?.answers[answerIndex];

  if (!selected) return false;

  const delta = currentQuestion.baseDelta + selected.delta;

  record.identityExposed =
    record.identityExposed || currentQuestion.identityExposed;

  record.trust = clamp(record.trust + delta);

  if (record.identityExposed) {
    record.trust = Math.min(
      record.trust,
      COURT_CONFIG.mistakenIdentityCap
    );
  }

  record.answers.push({
    questionId: currentQuestion.id,
    answerIndex,
    delta,
    trust: record.trust
  });

  record.feedback =
    `${selected.feedback}\n` +
    `Judge's confidence: ${delta >= 0 ? '+' : ''}${delta}.`;

  record.phase = 'feedback';

  return true;
}

export function advanceCourt(record) {
  if (!record || record.phase !== 'feedback') return false;

  record.index += 1;

  if (record.index < record.questions.length) {
    record.phase = 'question';
    return true;
  }

  record.verdict =
    !record.identityExposed &&
    record.trust >= COURT_CONFIG.convictionThreshold
      ? 'convicted'
      : 'released';

  record.phase = 'verdict';

  return true;
}

export function validCourt(record, state, suspectId = null) {
  try {
    if (
      !record ||
      !state ||
      record.version !== COURT_CONFIG.version ||
      record.caseId == null ||
      state.currentCaseId == null ||
      !sameId(record.caseId, state.currentCaseId) ||
      record.campaignId == null ||
      record.campaignId !== state._createdAt ||
      record.suspectId == null ||
      (
        suspectId != null &&
        !sameId(record.suspectId, suspectId)
      ) ||
      !record.facts ||
      !sameId(record.facts.caseId, record.caseId) ||
      record.facts.campaignId !== record.campaignId ||
      !sameId(record.facts.suspectId, record.suspectId) ||
      record.facts.warrantMatches !== true ||
      typeof record.facts.correctDefendant !== 'boolean' ||
      typeof record.facts.defendantName !== 'string' ||
      !record.facts.defendantName.trim() ||
      !Array.isArray(record.facts.incidents) ||
      !Array.isArray(record.questions) ||
      record.questions.length === 0 ||
      !Array.isArray(record.answers) ||
      !Number.isInteger(record.index) ||
      !Number.isFinite(record.trust) ||
      record.trust < 0 ||
      record.trust > 100 ||
      typeof record.identityExposed !== 'boolean' ||
      typeof record.feedback !== 'string' ||
      !['question', 'feedback', 'verdict'].includes(record.phase)
    ) {
      return false;
    }

    const count = record.questions.length;

    if (
      record.answers.length > count ||
      record.index < 0 ||
      record.index > count
    ) {
      return false;
    }

    if (record.phase === 'verdict') {
      if (
        record.index !== count ||
        record.answers.length !== count ||
        !['convicted', 'released'].includes(record.verdict)
      ) {
        return false;
      }
    } else {
      if (
        record.index >= count ||
        record.verdict !== null ||
        record.answers.length !==
          record.index + (record.phase === 'feedback' ? 1 : 0)
      ) {
        return false;
      }
    }

    if (
      record.resultCommitted !== undefined &&
      typeof record.resultCommitted !== 'boolean'
    ) {
      return false;
    }

    if (
      record.resultCommitted === true &&
      record.phase !== 'verdict'
    ) {
      return false;
    }

    const replay = createCourtRecord(record.facts);

    if (
      JSON.stringify(record.questions) !==
      JSON.stringify(replay.questions)
    ) {
      return false;
    }

    for (let i = 0; i < record.answers.length; i++) {
      const saved = record.answers[i];

      if (!saved || !answerCourtQuestion(replay, saved.answerIndex)) {
        return false;
      }

      const actual = replay.answers[replay.answers.length - 1];

      if (
        saved.questionId !== actual.questionId ||
        saved.delta !== actual.delta ||
        saved.trust !== actual.trust
      ) {
        return false;
      }

      if (
        i < record.answers.length - 1 ||
        record.phase !== 'feedback'
      ) {
        if (!advanceCourt(replay)) return false;
      }
    }

    return (
      replay.phase === record.phase &&
      replay.index === record.index &&
      replay.trust === record.trust &&
      replay.identityExposed === record.identityExposed &&
      replay.feedback === record.feedback &&
      replay.verdict === record.verdict
    );
  } catch {
    return false;
  }
}

export function courtResumeTarget(record) {
  if (
    record.phase === 'verdict' &&
    record.resultCommitted === true
  ) {
    const convicted = record.verdict === 'convicted';

    return {
      key: convicted ? 'SuccessScene' : 'GameOverScene',
      data: {
        caseId: record.caseId,
        suspectId: record.suspectId,
        title: convicted ? 'CONVICTED' : 'DEFENDANT RELEASED',
        reasonCode: convicted ? 'court_conviction' : 'court_release',
        message: convicted
          ? ''
          : 'The court released the defendant. The prosecution failed to establish the case.'
      }
    };
  }

  return {
    key: 'CourtScene',
    data: {
      caseId: record.caseId,
      suspectId: record.suspectId
    }
  };
}