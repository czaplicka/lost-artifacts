import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    location: __dialogueText("systems/courtLogic.js", "t_6b510a280521573f698d"),
    city: __dialogueText("systems/courtLogic.js", "t_ecc0e7dc084f141b2947"),
    artifact: __dialogueText("systems/courtLogic.js", "t_eafa889ed704698630f7"),
    artifactKey: 'artifact_crown_jewels'
  },
  louvre: {
    location: __dialogueText("systems/courtLogic.js", "t_781124ea7a7a6ebce51d"),
    city: __dialogueText("systems/courtLogic.js", "t_5dd272b4f316b776a7b8"),
    artifact: __dialogueText("systems/courtLogic.js", "t_b9cf1cff4396995a4031"),
    artifactKey: 'artifact_mona_lisa'
  },
  auction_house: {
    location: __dialogueText("systems/courtLogic.js", "t_704d42accb8e80659f8f"),
    city: __dialogueText("systems/courtLogic.js", "t_dad114b6ed7342bac65c"),
    artifact: __dialogueText("systems/courtLogic.js", "t_02fa3961fb302afc0cd0"),
    artifactKey: 'artifact_royal_seal'
  },
  castle: {
    location: __dialogueText("systems/courtLogic.js", "t_53e61e86b71ffc5640db"),
    city: __dialogueText("systems/courtLogic.js", "t_2d59f8dd13aafd7bc427"),
    artifact: __dialogueText("systems/courtLogic.js", "t_5f2ae373138fe7e59f40"),
    artifactKey: 'artifact_amber_necklace'
  },
  havela: {
    location: __dialogueText("systems/courtLogic.js", "t_6037627bd9ed1055a675"),
    city: __dialogueText("systems/courtLogic.js", "t_9ed6d0e61816a424d0e0"),
    artifact: __dialogueText("systems/courtLogic.js", "t_7f7ff2f251a66787edc0"),
    artifactKey: 'artifact_mughal_dagger'
  },
  dockyard: {
    location: __dialogueText("systems/courtLogic.js", "t_c9145db4a30ee2cb656c"),
    city: __dialogueText("systems/courtLogic.js", "t_5a59ef2e40c5f89adb8c"),
    artifact: __dialogueText("systems/courtLogic.js", "t_d96a4f22f0d564f76616"),
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
      `${__dialogueText("systems/courtLogic.js", "t_dd9da998612e1a24aedb")}${facts.artifactName}${__dialogueText("systems/courtLogic.js", "t_0335a0db442f22848d6d")}`,
      [
        answer(
          __dialogueText("systems/courtLogic.js", "t_5b01f4cac2f14545b1a9"),
          10,
          __dialogueText("systems/courtLogic.js", "t_2abb3f355906c45be603")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_a34dcb75939fb19d99b4"),
          -6,
          __dialogueText("systems/courtLogic.js", "t_fc91e90df2d41d66b3bf")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_bbb6ccae1d7fdc369de8"),
          -8,
          __dialogueText("systems/courtLogic.js", "t_3f414794efda98616b01")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_ab26a2c65b7fa8c4b4d0"),
          -6,
          __dialogueText("systems/courtLogic.js", "t_02da6aa6de8eae23e35c")
        )
      ]
    ));
  }

  const crimePlace = facts.crimeLocationName || facts.crimeCityName;

  if (crimePlace) {
    questions.push(question(
      'prosecution_location',
      'prosecutor',
      `${__dialogueText("systems/courtLogic.js", "t_971ea082b26ba6e42eaa")}${crimePlace}${__dialogueText("systems/courtLogic.js", "t_279c6c9fb8150eb793c8")}`,
      [
        answer(
          __dialogueText("systems/courtLogic.js", "t_fc6ac08d28a6c1ac55d5"),
          10,
          __dialogueText("systems/courtLogic.js", "t_ae26b7e8cba035ac0791")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_38b0498a252ffbe48536"),
          -8,
          __dialogueText("systems/courtLogic.js", "t_7edd4db0add24e44723b")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_fc7e4460ba63233bfc71"),
          -10,
          __dialogueText("systems/courtLogic.js", "t_e0bdcc66f59da5f61169")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_7dbea6850ef6de6ba9bf"),
          -6,
          __dialogueText("systems/courtLogic.js", "t_852980f9dff9d0c66042")
        )
      ]
    ));
  }

  questions.push(question(
    'prosecution_warrant',
    'prosecutor',
    __dialogueText("systems/courtLogic.js", "t_ea6515b34585632a7fbf"),
    [
      answer(
        __dialogueText("systems/courtLogic.js", "t_cfbcd1e46d9ff12fa3cf"),
        facts.warrantMatches ? 12 : -20,
        facts.warrantMatches
          ? __dialogueText("systems/courtLogic.js", "t_c1b291153ed84a328b6c")
          : __dialogueText("systems/courtLogic.js", "t_ca22da065d28a0918bf0")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_69a6e821481fd33f61b3"),
        -10,
        __dialogueText("systems/courtLogic.js", "t_a01db6681e54515a4b59")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_f7b34af2d796b1f909c4"),
        -10,
        __dialogueText("systems/courtLogic.js", "t_ff7411f58e0c7e64f395")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_252be71300f1b180f30c"),
        -12,
        __dialogueText("systems/courtLogic.js", "t_e7a5ddd43ff62bf73c6b")
      )
    ]
  ));

  questions.push(question(
    'defense_identity',
    'defense',
    facts.correctDefendant
      ? __dialogueText("systems/courtLogic.js", "t_c24f80d4463678a4bd95")
      : __dialogueText("systems/courtLogic.js", "t_dcc12d047720cc905364"),
    facts.correctDefendant
      ? [
          answer(
            __dialogueText("systems/courtLogic.js", "t_2366c80c1c1288eef3d1"),
            4,
            __dialogueText("systems/courtLogic.js", "t_6bc9386a610560ca6944")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_de9c20310fb6dc59c98e"),
            -10,
            __dialogueText("systems/courtLogic.js", "t_606d39c94917f8e6ac0d")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_eb698f0f3e2e1cb40811"),
            -12,
            __dialogueText("systems/courtLogic.js", "t_c161a243b037d6fe4562")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_bb262554345b7fb63852"),
            -10,
            __dialogueText("systems/courtLogic.js", "t_56faf2af9fe35ab40129")
          )
        ]
      : [
          answer(
            __dialogueText("systems/courtLogic.js", "t_c7898c4a42aada44cf46"),
            0,
            __dialogueText("systems/courtLogic.js", "t_06fa472abd070940647d")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_9dc4e439ca1d96c615bd"),
            -12,
            __dialogueText("systems/courtLogic.js", "t_545a0bec96b681df2cd6")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_5518cb8d2d2dd9469bc9"),
            -15,
            __dialogueText("systems/courtLogic.js", "t_4bb0e0b65ddbba8c5dd2")
          ),
          answer(
            __dialogueText("systems/courtLogic.js", "t_15fc75616fd2e65e9b2c"),
            -12,
            __dialogueText("systems/courtLogic.js", "t_1643a81f7ede7ca7e2a6")
          )
        ],
    facts.correctDefendant ? -4 : -45,
    !facts.correctDefendant
  ));

  questions.push(question(
    'defense_flight',
    'defense',
    __dialogueText("systems/courtLogic.js", "t_58dba53dca5a66797b60"),
    [
      answer(
        __dialogueText("systems/courtLogic.js", "t_1e6339685dbd98f817c4"),
        0,
        __dialogueText("systems/courtLogic.js", "t_761b16daf8e75b82bee3")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_0f3c4fc2a6eeead0bfc7"),
        -10,
        __dialogueText("systems/courtLogic.js", "t_dbc36ecaca9b04027a30")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_9f5da146361314162f96"),
        -12,
        __dialogueText("systems/courtLogic.js", "t_25292c06392d61d342b8")
      ),
      answer(
        __dialogueText("systems/courtLogic.js", "t_b30165cdb5314e3f462a"),
        -8,
        __dialogueText("systems/courtLogic.js", "t_131d5301781a6a68bf89")
      )
    ],
    -2
  ));

  for (const incident of facts.incidents) {
    const place = incident.locationName
      ? `${__dialogueText("systems/courtLogic.js", "t_086a519fdeedb29a622b")}${incident.locationName}`
      : '';

    const description = incident.type === 'cut_corners'
      ? __dialogueText("systems/courtLogic.js", "t_e8e306c91b0cbf56ac1b")
      : __dialogueText("systems/courtLogic.js", "t_b66d66166e88c5a6c1d2");

    const penalty = incident.type === 'cut_corners'
      ? 8
      : Math.min(25, Math.max(8, Math.abs(incident.moralDelta)));

    questions.push(question(
      `defense_incident_${incident.id}`,
      'defense',
      `${__dialogueText("systems/courtLogic.js", "t_32729dca7769c6d1c18c")}${description}${place}${__dialogueText("systems/courtLogic.js", "t_c7b342c35eb1a40b86a5")}`,
      [
        answer(
          __dialogueText("systems/courtLogic.js", "t_b04e0f992d37f0c0dd80"),
          2,
          __dialogueText("systems/courtLogic.js", "t_f366e56c0263d2ca3fa1")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_033630eb1b01363c48a5"),
          -8,
          __dialogueText("systems/courtLogic.js", "t_7ccf0123a3d907f25ca0")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_423d308778dd01cb8028"),
          -10,
          __dialogueText("systems/courtLogic.js", "t_14f9efb63e5db68685a3")
        ),
        answer(
          __dialogueText("systems/courtLogic.js", "t_06d923736108e33c414b"),
          -12,
          __dialogueText("systems/courtLogic.js", "t_19ab5a7b995e52fde992")
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
    `${__dialogueText("systems/courtLogic.js", "t_aee4f9333029df1e21ac")}${delta >= 0 ? '+' : ''}${delta}${__dialogueText("systems/courtLogic.js", "t_cdb4ee2aea69cc6a8333")}`;

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
        title: convicted ? __dialogueText("systems/courtLogic.js", "t_4fc3901171364d578013") : __dialogueText("systems/courtLogic.js", "t_92624f92e0a888fb966d"),
        reasonCode: convicted ? 'court_conviction' : 'court_release',
        message: convicted
          ? ''
          : __dialogueText("systems/courtLogic.js", "t_e5b82991c30c36fdca1c")
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