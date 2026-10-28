import { isCorrectSuspectChoice } from '../suspects/suspectHelpers.js';

export const COURT_CONFIG = Object.freeze({
  version: 1,
  initialTrust: 35,
  convictionThreshold: 65,
  mistakenIdentityCap: 40
});

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const clamp = value => Math.max(0, Math.min(100, value));

function answer(text, delta, feedback) {
  return { text, delta, feedback };
}
function factQuestion(id, text, answers) {
  return { id, side: 'prosecutor', text, answers, baseDelta: 0, identityExposed: false };
}
function defenseQuestion(id, text, answers, baseDelta = 0, identityExposed = false) {
  return { id, side: 'defense', text, answers, baseDelta, identityExposed };
}
function shuffledAnswers(question) {
  let seed = 2166136261;
  for (const char of question.id) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }
  const answers = [...question.answers];
  for (let i = answers.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return { ...question, answers };
}

export function buildCourtFacts(state, suspectId) {
  if (state.currentCaseId == null || suspectId == null) {
    throw new Error('Court requires a case ID and defendant ID.');
  }
  const actualSuspectId =
    state.trueThiefCaseSuspectId ?? state.realThiefSuspectId ??
    state.caseData?.trueThiefCaseSuspectId ?? state.caseData?.realThiefSuspectId ??
    state.currentThiefCaseSuspectId ?? state.currentThief?.caseSuspectId ??
    state.currentThief?.id ?? state.currentThiefId;
  if (actualSuspectId == null) {
    throw new Error('Cannot start trial: the case culprit identity is missing.');
  }
  const pools = [state.caseSuspects, state.suspects, state.suspectList].filter(Array.isArray);
  const defendant = pools.flat().find(person => sameId(person?.id, suspectId));
  const hintHistory = Array.isArray(state.hintState?.usageHistory) ? state.hintState.usageHistory : [];
  const misconductHistory = Array.isArray(state.courtMisconductLog) ? state.courtMisconductLog : [];
  const incidents = [];
  const seen = new Set();
  for (const entry of [...hintHistory, ...misconductHistory]) {
    if (!entry || !sameId(entry.caseId, state.currentCaseId)) continue;
    if (entry.method !== 'cut_corners' && !(Number(entry.moralDelta) < 0)) continue;
    if (entry.id == null) continue;
    const key = String(entry.id);
    if (seen.has(key)) continue;
    seen.add(key);
    incidents.push({
      id: key,
      type: entry.method ?? entry.type ?? 'misconduct',
      sceneId: entry.sceneId ?? null,
      itemId: entry.itemId ?? null,
      issue: entry.proceduralIssue ?? null,
      moralDelta: Number(entry.moralDelta) || 0
    });
  }
  return {
    caseId: state.currentCaseId,
    campaignId: state._createdAt,
    suspectId,
    defendantName: defendant?.name ?? defendant?.publicProfile?.name ?? state.warrantSuspectName ?? String(suspectId),
    artifactName: state.currentArtifact?.name ?? state.currentArtifact?.title ?? null,
    crimeCityName: state.crimeCity?.name ?? (typeof state.crimeCity === 'string' ? state.crimeCity : null),
    warrantMatches: Boolean(state.arrestWarrantIssued) && sameId(state.warrantSuspectId, suspectId),
    correctDefendant: isCorrectSuspectChoice(String(suspectId), String(actualSuspectId)),
    incidents
  };
}

export function buildCourtQuestions(facts) {
  const questions = [];
  questions.push(factQuestion(
    'prosecution_defendant',
    'Prokurator: Kogo dotyczy przedstawiony akt oskarżenia?',
    [
      answer(facts.defendantName, 10, 'Tożsamość oskarżonego została wskazana prawidłowo.'),
      answer('Każdej osoby obecnej w miejscu przestępstwa.', -8, 'Odpowiedzialność musi dotyczyć konkretnej osoby.'),
      answer('Właściciela skradzionego przedmiotu.', -10, 'Myli pan pokrzywdzonego z oskarżonym.'),
      answer('Nie pamiętam, kogo zatrzymałem.', -12, 'Sędzia odnotowuje poważny brak przygotowania.')
    ]
  ));
  if (facts.artifactName) {
    questions.push(factQuestion(
      'prosecution_artifact',
      'Prokurator: Jakiego przedmiotu dotyczy ta sprawa?',
      [
        answer(facts.artifactName, 10, 'Przedmiot sprawy został wskazany prawidłowo.'),
        answer('Dowolnego przedmiotu znalezionego przy oskarżonym.', -8, 'Nie wskazano przedmiotu tej sprawy.'),
        answer('Mojego wyposażenia służbowego.', -10, 'To nie jest przedmiot postępowania.'),
        answer('Nie ustaliłem, co zostało skradzione.', -12, 'Brakuje podstawowego ustalenia.')
      ]
    ));
  }
  if (facts.crimeCityName) {
    questions.push(factQuestion(
      'prosecution_city',
      'Prokurator: Gdzie doszło do przestępstwa?',
      [
        answer(facts.crimeCityName, 10, 'Miejsce przestępstwa zgadza się z aktami.'),
        answer('W mieście, w którym zakończyłem pościg.', -6, 'Miejsce zatrzymania nie musi być miejscem przestępstwa.'),
        answer('W siedzibie agencji.', -10, 'Ta odpowiedź nie potwierdza ustaleń sprawy.'),
        answer('Nie ustaliłem miejsca przestępstwa.', -12, 'Sędzia odnotowuje lukę w zeznaniu.')
      ]
    ));
  }
  questions.push(factQuestion(
    'prosecution_warrant',
    'Prokurator: Na jakiej podstawie zatrzymano oskarżonego?',
    [
      answer('Na podstawie nakazu dotyczącego tej osoby.', facts.warrantMatches ? 12 : -20,
        facts.warrantMatches ? 'Nakaz dotyczy oskarżonego.' : 'Akta nie potwierdzają tej deklaracji.'),
      answer('Ponieważ uciekał, a to wystarcza za dowód winy.', -10, 'Samo zachowanie podczas pościgu nie dowodzi kradzieży.'),
      answer('Na podstawie mojego przeczucia.', -12, 'Przeczucie nie zastępuje udokumentowanej podstawy.'),
      answer('Nie sprawdziłem podstawy zatrzymania.', -15, 'Sędzia odnotowuje brak kontroli procedury.')
    ]
  ));
  questions.push(defenseQuestion(
    'defense_identity',
    facts.correctDefendant
      ? 'Obrońca: Dlaczego sąd miałby wykluczyć pomyłkę osoby?'
      : 'Obrońca: Akta wskazują inną osobę jako sprawcę. Dlaczego zatrzymał pan mojego klienta?',
    [
      answer(facts.correctDefendant
        ? 'Proszę porównać identyfikację oskarżonego z ustaleniami sprawy.'
        : 'Przyznaję pomyłkę. Nie będę podtrzymywać niezgodnego oskarżenia.',
        facts.correctDefendant ? 4 : 0,
        facts.correctDefendant ? 'Identyfikacja pozostaje zgodna z ustaleniami.'
          : 'Pomyłka zostaje odnotowana. Nie usuwa jej dobra odpowiedź.'),
      answer('Każdy podejrzany jest równie dobrym sprawcą.', -15, 'Sędzia odrzuca takie rozumowanie.'),
      answer('Nakaz sam w sobie dowodzi popełnienia kradzieży.', -10, 'Nakaz nie jest wyrokiem.'),
      answer('Nie zamierzam odpowiadać na pytania o identyfikację.', -12, 'Wątpliwości obrony pozostają bez odpowiedzi.')
    ],
    facts.correctDefendant ? -4 : -45,
    !facts.correctDefendant
  ));
  questions.push(defenseQuestion(
    'defense_flight',
    'Obrońca: Czy uważa pan ucieczkę za wystarczający dowód kradzieży?',
    [
      answer('Nie. Pościg i dowody dotyczące kradzieży to odrębne kwestie.', 0, 'Sąd przyjmuje rozróżnienie, ale wymaga dowodów sprawy.'),
      answer('Tak. Niewinni nigdy nie uciekają.', -12, 'Sędzia nie przyjmuje takiej generalizacji.'),
      answer('Nie potrzebuję żadnych innych ustaleń.', -15, 'Podważono wiarygodność przedstawionego rozumowania.'),
      answer('To obrońca powinien udowodnić wszystko za mnie.', -10, 'Pytanie pozostaje bez rzeczowej odpowiedzi.')
    ],
    -2
  ));
  for (const incident of facts.incidents) {
    const location = [
      incident.sceneId && `miejsce: ${incident.sceneId}`,
      incident.itemId && `przedmiot: ${incident.itemId}`
    ].filter(Boolean).join(', ');
    const description = incident.type === 'cut_corners'
      ? 'pominięcie listy kontrolnej zabezpieczenia materiału'
      : `działanie: ${incident.type}`;
    const penalty = incident.type === 'cut_corners' ? 8
      : Math.min(25, Math.max(8, Math.abs(incident.moralDelta)));
    questions.push(defenseQuestion(
      `defense_incident_${incident.id}`,
      `Obrońca: Akta odnotowują ${description}${location ? ` (${location})` : ''}. Jak pan to wyjaśni?`,
      [
        answer('Przyznaję naruszenie. Proszę ocenić jego zakres i niezależne ustalenia.', 2,
          'Rzeczowa odpowiedź ogranicza szkodę, ale naruszenie pozostaje.'),
        answer('Zaprzeczam, mimo zapisu w dokumentacji.', -12,
          'Zaprzeczenie przeczy dokumentacji i pogarsza wiarygodność.'),
        answer('Wynik usprawiedliwia każdą metodę.', -10, 'Sędzia nie uznaje tego za usprawiedliwienie.'),
        answer('To nie ma znaczenia i nie będę tego wyjaśniać.', -8,
          'Obrona pozostawia zarzut bez rzeczowej odpowiedzi.')
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
  if (!record || record.phase !== 'question' || !Number.isInteger(answerIndex)) return false;
  const question = record.questions[record.index];
  const selected = question?.answers[answerIndex];
  if (!selected) return false;
  const delta = question.baseDelta + selected.delta;
  record.identityExposed = record.identityExposed || question.identityExposed;
  record.trust = clamp(record.trust + delta);
  if (record.identityExposed) {
    record.trust = Math.min(record.trust, COURT_CONFIG.mistakenIdentityCap);
  }
  record.answers.push({ questionId: question.id, answerIndex, delta, trust: record.trust });
  record.feedback = `${selected.feedback}\nPrzekonanie sędziego: ${delta >= 0 ? '+' : ''}${delta}.`;
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
  record.verdict = record.trust >= COURT_CONFIG.convictionThreshold ? 'convicted' : 'released';
  record.phase = 'verdict';
  return true;
}

export function validCourt(record, state, suspectId = null) {
  try {
    if (
      !record || !state || record.version !== COURT_CONFIG.version ||
      record.caseId == null || state.currentCaseId == null ||
      !sameId(record.caseId, state.currentCaseId) || record.campaignId == null ||
      record.campaignId !== state._createdAt || record.suspectId == null ||
      (suspectId != null && !sameId(record.suspectId, suspectId)) ||
      !record.facts || !sameId(record.facts.caseId, record.caseId) ||
      record.facts.campaignId !== record.campaignId ||
      !sameId(record.facts.suspectId, record.suspectId) ||
      record.facts.warrantMatches !== true ||
      typeof record.facts.correctDefendant !== 'boolean' ||
      typeof record.facts.defendantName !== 'string' || !record.facts.defendantName.trim() ||
      !Array.isArray(record.facts.incidents) || !Array.isArray(record.questions) ||
      record.questions.length === 0 || !Array.isArray(record.answers) ||
      !Number.isInteger(record.index) || !Number.isFinite(record.trust) ||
      record.trust < 0 || record.trust > 100 ||
      typeof record.identityExposed !== 'boolean' || typeof record.feedback !== 'string' ||
      !['question', 'feedback', 'verdict'].includes(record.phase)
    ) return false;
    const count = record.questions.length;
    if (record.answers.length > count || record.index < 0 || record.index > count) return false;
    if (record.phase === 'verdict') {
      if (record.index !== count || record.answers.length !== count ||
          !['convicted', 'released'].includes(record.verdict)) return false;
    } else {
      if (record.index >= count || record.verdict !== null) return false;
      if (record.answers.length !== record.index + (record.phase === 'feedback' ? 1 : 0)) return false;
    }
    if (record.resultCommitted !== undefined && typeof record.resultCommitted !== 'boolean') return false;
    if (record.resultCommitted === true && record.phase !== 'verdict') return false;
    const replay = createCourtRecord(record.facts);
    if (JSON.stringify(record.questions) !== JSON.stringify(replay.questions)) return false;
    for (let i = 0; i < record.answers.length; i++) {
      const saved = record.answers[i];
      if (!saved || !answerCourtQuestion(replay, saved.answerIndex)) return false;
      const actual = replay.answers[replay.answers.length - 1];
      if (saved.questionId !== actual.questionId || saved.delta !== actual.delta || saved.trust !== actual.trust) return false;
      if (i < record.answers.length - 1 || record.phase !== 'feedback') {
        if (!advanceCourt(replay)) return false;
      }
    }
    return replay.phase === record.phase && replay.index === record.index &&
      replay.trust === record.trust && replay.identityExposed === record.identityExposed &&
      replay.feedback === record.feedback && replay.verdict === record.verdict;
  } catch {
    return false;
  }
}

export function courtResumeTarget(record) {
  if (record.phase === 'verdict' && record.resultCommitted === true) {
    const convicted = record.verdict === 'convicted';
    return {
      key: convicted ? 'SuccessScene' : 'GameOverScene',
      data: {
        caseId: record.caseId,
        suspectId: record.suspectId,
        title: convicted ? 'CONVICTED' : 'DEFENDANT RELEASED',
        reasonCode: convicted ? 'court_conviction' : 'court_release',
        message: convicted ? '' : 'The court released the defendant. The prosecution failed to establish the case.'
      }
    };
  }
  return { key: 'CourtScene', data: { caseId: record.caseId, suspectId: record.suspectId } };
}
