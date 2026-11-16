import { dialogueText as dialogueText } from '../dialogues/DialogueText.js';

export const FINAL_COURT_CONFIG = Object.freeze({
  version: 3,
  initialTrust: 45,
  convictionThreshold: 65,
  mistakenIdentityCap: 40,
  rapportBonusMax: 8
});

const POLICY = 2;
const FILE = 'systems/FinalCaseCourt.js';
const t = key => dialogueText(FILE, key);
const list = value => Array.isArray(value) ? value : [];
const txt = value => typeof value === 'string' ? value.trim() : '';
const same = (a, b) => a != null && b != null && String(a) === String(b);
const clone = value => JSON.parse(JSON.stringify(value));
const norm = value => txt(value).toLowerCase().replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ').replace(/^pick ?pocketing$/, 'pickpocket');
const skills = value => [...new Set(list(value).map(norm).filter(Boolean))].sort();
const clamp = value => Math.max(0, Math.min(100, value));
const fields = ['identity', 'motive', 'means', 'opportunity'];
const publicText = (value, fallback) => {
  const result = txt(value);
  return result && !result.includes('_') && !result.includes('/') ? result : fallback;
};
const scoped = (record, state) => Boolean(record) &&
  (record.caseId == null || same(record.caseId, state.currentCaseId)) &&
  (record.campaignId == null || record.campaignId === state._createdAt);

const opportunityLabels = {
  work_access: t('t_eebe01cc2fa2eb68b274'),
  unobserved_interval: t('t_e8346246d901524e0113'),
  false_alibi: t('t_5fa1438038b89dbd49bc'),
  borrowed_access: t('t_e96525634b7109bfdf22'),
  security_gap: t('t_1d968c086296e9fdc163'),
  public_access: t('t_23ee5e42cade819456d7')
};

function filedCorrect(subject, state) {
  const conclusion = subject?.playerConclusion;
  if (conclusion?.locked !== true || !scoped(conclusion, state)) return false;
  if (conclusion.evaluation?.conclusionCorrect === false) return false;
  if (subject.alibiType === 'confirmed') return conclusion.choice === '__no_liar__';
  if (subject.alibiType !== 'contradicted' || conclusion.choice === '__no_liar__') return false;
  return list(subject.witnesses).some(witness =>
    witness?.isLiar === true && same(witness.npcId, conclusion.choice));
}

function snapshotTheory(theory) {
  const sections = {};
  for (const key of fields) {
    const section = theory?.sections?.[key] || {};
    sections[key] = {
      answerId: txt(section.answerId),
      skillIds: key === 'means' ? skills(section.skillIds) : [],
      evidenceIds: [...new Set(list(section.evidenceIds).map(txt).filter(Boolean))]
    };
  }
  return { sections };
}

export function assembleFinalCourtFacts(state, suspectId, context) {
  const { baseFacts, theory, actualIds, usedSkills, opportunityStatus, motive,
    motiveLabel, boardRecord = {}, identityContext = null,
    identityClues = [], cards = [] } = context;

  if (!motive?.crimeBoard?.answerId) throw new Error(
    'Cannot prepare the trial: canonical motive data is missing. Your save has not been replaced.');
  const ids = list(actualIds).map(String);
  if (!ids.length) throw new Error('Cannot prepare the trial: consistent identity data is missing.');
  const finalTheory = snapshotTheory(theory);
  const sections = finalTheory.sections;
  const failures = [];
  const fail = (key, message) => {
    if (!failures.some(failure => failure.key === key)) failures.push({ key, message });
  };
  const discovered = new Map(list(cards)
    .filter(card => card?.id != null && card.discovered !== false &&
      !card.createdByPlayer && scoped(card, state))
    .map(card => [String(card.id), card]));

  for (const key of fields) {
    const section = sections[key];
    if (!(key === 'means' ? section.skillIds.length : section.answerId)) {
      fail(key, `${t('t_012269b3899bcf94195f')}${key}${t('t_eed020b63888c736e094')}`);
    }
    if (!section.evidenceIds.some(id => discovered.has(id))) {
      fail(`references_${key}`, `${t('t_012269b3899bcf94195f')}${key}${t('t_c90f7bd63785019ba6f2')}`);
    }
  }

  const culpritIsDefendant = ids.includes(String(suspectId));
  if (!culpritIsDefendant) fail('wrong_defendant', t('t_a24d44bcefb3619798be'));
  if (!ids.includes(sections.identity.answerId) || !culpritIsDefendant) {
    fail('identity', t('t_ae97ff60ca111a0986f8'));
  }
  const motiveCorrect = sections.motive.answerId === motive.crimeBoard.answerId;
  if (!motiveCorrect) fail('motive', t('t_bd686d591b049a34a698'));

  const finalStageIds = new Set(list(motive.escapeInvestigation?.clueStages)
    .filter(stage => stage.boardAnswerUnlocked === true)
    .map(stage => String(stage.evidenceId)));
  const collected = list(state.cluesCollected).filter(clue =>
    clue?.type === 'motive' && scoped(clue, state));
  const reports = Object.values(state.caseData?.motiveWitnessReports || {}).filter(report =>
    report?.version === 1 && same(report.caseId, state.currentCaseId) &&
    report.campaignId === state._createdAt && report.motiveId === motive.id && txt(report.text));
  const finalMotiveSource = collected.find(clue => finalStageIds.has(String(clue.id)) && txt(clue.text)) ||
    reports.find(report => finalStageIds.has(String(report.evidenceId)));
  if (!finalMotiveSource) fail('motive_evidence', t('t_2ee9a6a36c29b7944a1c'));

  const expectedSkills = skills(usedSkills);
  if (!expectedSkills.length) throw new Error('Cannot prepare the trial: the used-skill solution is missing.');
  const meansCorrect = JSON.stringify(sections.means.skillIds) === JSON.stringify(expectedSkills);
  if (!meansCorrect) fail('means', t('t_a6282ae108a1ad9326e0'));
  const reconstruction = state.reconstructedHeist || {};
  const knownObjects = new Map();
  for (const object of list(state.crimeBoardData?.sceneFoundObjects)) {
    if (object?.id != null && scoped(object, state) &&
      (object.missionId == null || same(object.missionId, state.currentMission?.id))) {
      knownObjects.set(String(object.id), object);
    }
  }
  for (const [index, object] of list(reconstruction.playerOrderedCards).entries()) {
    if (object?.id != null && scoped(object, state) &&
      (object.isCorrect === true || ['green', 'yellow'].includes(list(reconstruction.playerSlotFeedback)[index]))) {
      knownObjects.set(String(object.id), object);
    }
  }
  const methodSources = [];
  for (const claim of list(reconstruction.claims)) {
    const object = knownObjects.get(String(claim?.solutionItemId));
    if (object) methodSources.push({
      skill: norm(claim.thiefSkill),
      name: publicText(object.item || object.label || object.title, t('t_ed00b37b4f99445a61b9')),
      id: String(object.id)
    });
  }
  const methodCovered = expectedSkills.every(id => methodSources.some(source => source.skill === id));
  if (!methodCovered) fail('means_evidence', t('t_ab20b0b1a2bf4bdda682'));

  const investigation = state.caseData?.alibiCases?.[context.theoryKey];
  const subjects = scoped(investigation, state) ? list(investigation.suspects) : [];
  const alibiSubject = subjects.find(subject => same(subject?.suspectId, identityContext?.caseId)) ||
    subjects.find(subject => ids.includes(String(subject?.suspectId)));
  const others = subjects.filter(subject => subject !== alibiSubject);
  const other = others.length === 1 ? others[0] : null;
  const person = id => list(state.caseSuspects).find(value => same(value?.id, id)) ||
    list(state.suspects).find(value => same(value?.id, id));
  const aliasName = publicText(alibiSubject?.suspectName ||
    person(alibiSubject?.suspectId)?.publicProfile?.displayName || person(alibiSubject?.suspectId)?.name,
    t('t_ee2aea67f5b0b4331571'));
  const otherName = publicText(other?.suspectName ||
    person(other?.suspectId)?.publicProfile?.displayName || person(other?.suspectId)?.name,
    t('t_180697f643d8826a5738'));

  const viewed = boardRecord.envelopeViewed;
  const matchingEnvelope = list(identityClues).find(clue =>
    clue?.source === 'suspect_apartment_identity' && clue.category === 'eyes' &&
    txt(clue.value) && scoped(clue, state));
  const envelopeViewed = Boolean(viewed && scoped(viewed, state) &&
    viewed.clue?.category === 'eyes' && txt(viewed.clue.value) && matchingEnvelope &&
    same(viewed.clue.id, matchingEnvelope.id) &&
    norm(viewed.clue.value) === norm(matchingEnvelope.value) &&
    same(viewed.actualId, identityContext?.actualId));
  const warrantRecorded = Boolean(state.arrestWarrantIssued &&
    same(state.warrantSuspectId, suspectId) && culpritIsDefendant);
  const bridge = Boolean(envelopeViewed && identityContext &&
    same(identityContext.actualId, context.actualDatabaseId) &&
    same(alibiSubject?.suspectId, identityContext.caseId) && warrantRecorded);
  if (!bridge) fail('identity_bridge', t('t_5340e1ec9433e49355e3'));

  const alternativeCleared = Boolean(other?.alibiType === 'confirmed' &&
    filedCorrect(other, state) && other.playerConclusion.choice === '__no_liar__');
  if (!alternativeCleared) fail('alternative', t('t_da0cefc6fc6181092784'));
  const culpritAlibiResolved = Boolean(alibiSubject?.alibiType === 'contradicted' &&
    filedCorrect(alibiSubject, state));
  if (!culpritAlibiResolved) fail('alibi', 'The defendant\'s alibi was not correctly investigated and resolved.');
  const opp = ['supported', 'contradicted', 'inconclusive'].includes(opportunityStatus)
    ? opportunityStatus : 'inconclusive';
  if (opp !== 'supported') fail('opportunity', opp === 'contradicted'
    ? t('t_e2f2473eacec49cf5247')
    : 'The evidence does not establish the defendant\'s opportunity to commit the theft.');

  const incidents = [];
  const seen = new Set();
  const references = fields.flatMap(key => sections[key].evidenceIds);
  for (const entry of [...list(state.hintState?.usageHistory), ...list(state.courtMisconductLog)]) {
    if (!entry?.id || !same(entry.caseId, state.currentCaseId) || !scoped(entry, state) ||
      seen.has(String(entry.id)) || (entry.method !== 'cut_corners' && !(Number(entry.moralDelta) < 0))) continue;
    const item = String(entry.itemId ?? '');
    const card = list(cards).find(value => same(value?.id, item) || same(value?.clueId, item));
    const clue = list(state.cluesCollected).find(value => same(value?.id, item));
    const method = methodSources.find(value => value.id === item);
    const referenced = references.includes(item) || Boolean(card && references.includes(String(card.id))) ||
      (fields.includes(item) && entry.sceneId === 'CaseTheory') || Boolean(method);
    if (!referenced) continue;
    seen.add(String(entry.id));
    incidents.push({
      id: String(entry.id),
      source: publicText(card?.label || clue?.title || clue?.label || method?.name, t('t_da4fa366bc5dff108699')),
      severity: Math.abs(Number(entry.moralDelta) || 1)
    });
  }
  incidents.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
  const rawRapport = Number(context.rapport);
  const rapport = Number.isFinite(rawRapport) ? Math.max(0, Math.floor(rawRapport)) : 0;
  return {
    ...clone(baseFacts), courtMode: 'case-theory-v3', courtPolicyVersion: POLICY,
    correctDefendant: culpritIsDefendant, courtRapport: rapport,
    courtRapportBonus: Math.min(FINAL_COURT_CONFIG.rapportBonusMax, rapport * 2),
    incidents: [], finalTheory,
    caseAssessment: {
      motiveCorrect, meansCorrect, methodCovered, opportunityStatus: opp,
      identityBridge: bridge, alternativeCleared, culpritAlibiResolved, envelopeViewed,
      aliasName, otherName,
      motiveLabel: publicText(motiveLabel, t('t_d784e554c660daf1619f')),
      motiveSource: finalMotiveSource ? publicText(finalMotiveSource.label, t('t_222c7a2f43fcb424511f')) : t('t_7e32c3cbb29849011c93'),
      motiveSourceText: txt(finalMotiveSource?.text), methodSources,
      opportunityLabel: opportunityLabels[sections.opportunity.answerId] || t('t_a3ba606feb59d45264f2'),
      envelopeLabel: envelopeViewed ? t('t_3b236d2dc31ca33b2d59') : t('t_9a7eb70354d4dda92f09'),
      proceduralIncident: incidents[0] || null, failures
    }
  };
}

function option(text, delta, feedback) { return { text, delta, feedback }; }
function shuffle(answers, id) {
  let seed = 2166136261;
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  for (let index = answers.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [answers[index], answers[other]] = [answers[other], answers[index]];
  }
  return answers;
}
function question(id, side, text, good, badKeys) {
  const answers = [good, ...badKeys.map(([answer, feedback]) => option(t(answer), -5, t(feedback)))];
  return { id, side, text, answers: shuffle(answers, id), baseDelta: 0, identityExposed: false };
}

export function buildFinalCourtQuestions(facts) {
  const a = facts.caseAssessment;
  const s = facts.finalTheory.sections;
  const covered = key => !a.failures.some(failure => failure.key === key || failure.key === `references_${key}`);
  const motiveSound = a.motiveCorrect && covered('motive') && !a.failures.some(f => f.key === 'motive_evidence');
  const meansSound = a.meansCorrect && a.methodCovered && covered('means');
  const opportunitySound = a.opportunityStatus === 'supported' && a.culpritAlibiResolved && covered('opportunity');
  const artifact = facts.artifactName || t('t_03473f89a784c1470730');
  const questions = [
    question('case_motive', 'prosecutor', `${t('t_ed4a83d45cfd9695d7bd')}${artifact}${t('t_f4f760dc1bf215e31f85')}`,
      option(motiveSound
        ? `${t('t_d3635a81264fa812bc25')}${a.motiveLabel}${t('t_95b29ace3d494f1bca3c')}${a.motiveSource}${t('t_75d85f9df7beee65b6d4')}`
        : `${t('t_1acbffb37fc2c2232162')}${a.motiveLabel}${t('t_31980c2dd36100323523')}`,
      motiveSound ? 8 : 0, t(motiveSound ? 't_29fd7619b44575ec5ae8' : 't_e4b69f267b9487067238')), [
        ['t_ac58d264d9a475b3d046', 't_9d7441f6f2a212567dcd'],
        ['t_d6026a7e3b84fe5e02b1', 't_9b06cfd4990c98430ba5'],
        ['t_0c13a6632a1f0e2d7078', 't_daa881e015a7601664ab']]),
    question('case_means', 'prosecutor', t('t_a961fee27759e655a039'),
      option(meansSound
        ? `${s.means.skillIds.join(', ')}${t('t_5a61f22296eb2558fdc6')}${a.methodSources.map(v => v.name).join(', ')}${t('t_cdb4ee2aea69cc6a8333')}`
        : t('t_9f7b4ac14095d76711af'), meansSound ? 8 : 0,
      t(meansSound ? 't_ec08c36e8a2376b72b6d' : 't_bacfe50552f4f282db84')), [
        ['t_505fe1fbe838fc7b2d3e', 't_00e127106f32410d11f0'],
        ['t_784b75733e8b58352f1e', 't_dcdf339be00fe496b276'],
        ['t_8c2225a4da8ed526441b', 't_bdec3f0b9c5935a0e685']]),
    question('case_opportunity', 'prosecutor', t('t_9fb76f652bee9c3c2500'),
      option(opportunitySound
        ? `${t('t_8d7c520f111271708f2e')}${a.opportunityLabel}${t('t_75446b94d1498a3433e8')}`
        : 'The investigation did not establish a complete, supported opportunity argument.',
      opportunitySound ? 8 : 0, opportunitySound ? t('t_9a5c6ab1d1f04125fba9')
        : 'The court cannot replace missing evidence with an assumption.'), [
        ['t_8c5860cafb234d21e442', 't_9684229f8c367cd5a8ca'],
        ['t_9487d3d4eef7dd0cb288', 't_de55dc84e6fcc247ec99'],
        ['t_d148a76d9858f218fe99', 't_d80c1558d0484fd0312a']]),
    question('defense_identity_bridge', 'defense',
      `${t('t_5e95189490b208e630d9')}${a.aliasName}${t('t_d22e666ab18d907bad40')}${facts.defendantName}${t('t_c76d417aed639f7d5bed')}`,
      option(a.identityBridge
        ? `${t('t_103c5169871d49be7a2e')}${a.envelopeLabel}${t('t_48f894cf256e4f7f5d80')}`
        : t('t_9756fedd45a69ebf38e2'), a.identityBridge ? 8 : 0,
      t(a.identityBridge ? 't_f570e1f31f33de756185' : 't_3e589e93b701cfd6720b')), [
        ['t_247bfeccc705917db205', 't_93d32c0fbf63cd338c49'],
        ['t_bfab107aaf0c6704e1ba', 't_9e1414c9c9d0f234599d'],
        ['t_3c0bb6ed99f4bddc1bc7', 't_161547d9ba017cc1944d']]),
    question('defense_alternative', 'defense',
      `${t('t_b618a7f64180a3c7fe00')}${a.otherName}${t('t_6a5b0cdd77997931584b')}`,
      option(a.alternativeCleared ? `${a.otherName}${t('t_ed17dd1a8bdd9c4a8924')}`
        : `${t('t_4bb0b89cf48e72db4399')}${a.otherName}${t('t_1f193ac2023c1ab8ab69')}`,
      a.alternativeCleared ? 8 : 0,
      t(a.alternativeCleared ? 't_9b0ec274b18654866ecb' : 't_5c8ad71158502c2e0ca7')), [
        ['t_b261f71369cd84dc36b8', 't_43a0d3f15cbd91456582'],
        ['t_93c5674678e76a244f27', 't_da0cb88291846d9e1f39'],
        ['t_ba46d12e102f53b15e88', 't_ace3bf0a811d90aed26d']])
  ];
  if (a.proceduralIncident) {
    const item = question('defense_procedure', 'defense',
      `${t('t_0e7d61c86901945d95e1')}${a.proceduralIncident.source}${t('t_adfef2a26d179067b622')}`,
      option(t('t_b40326406367f409efa3'), -2, t('t_e7c9c1b5608736a7e34a')), [
        ['t_aedfe66d4abc0af1f0f9', 't_ab1db36dd3ede98953ad'],
        ['t_dcfbc357ee938da50f90', 't_d78812a75b7417f93c0e'],
        ['t_53d9ddc0c82df1dcada7', 't_8984533c5a5349a28769']]);
    for (const answer of item.answers) if (answer.delta === -5) answer.delta = -6;
    questions.push(item);
  }
  return questions;
}

function validateFacts(facts) {
  if (!facts || facts.courtMode !== 'case-theory-v3' || facts.courtPolicyVersion !== POLICY ||
    facts.caseId == null || facts.campaignId == null || facts.suspectId == null ||
    facts.warrantMatches !== true || typeof facts.correctDefendant !== 'boolean' || !txt(facts.defendantName)) {
    throw new Error('Unsupported or invalid court record. Load a save from before the trial; the old trial has not been overwritten.');
  }
  if (!Number.isInteger(facts.courtRapportBonus) || facts.courtRapportBonus < 0 ||
    facts.courtRapportBonus > 8 || facts.courtRapportBonus % 2) throw new Error('Invalid court bonus.');
  const a = facts.caseAssessment;
  if (!a || !Array.isArray(a.failures) || !Array.isArray(a.methodSources) ||
    !['supported', 'contradicted', 'inconclusive'].includes(a.opportunityStatus)) throw new Error('Invalid court assessment.');
  for (const flag of ['motiveCorrect', 'meansCorrect', 'methodCovered', 'identityBridge',
    'alternativeCleared', 'culpritAlibiResolved', 'envelopeViewed']) {
    if (typeof a[flag] !== 'boolean') throw new Error('Invalid court finding.');
  }
  for (const key of fields) {
    const section = facts.finalTheory?.sections?.[key];
    if (!section || typeof section.answerId !== 'string' || !Array.isArray(section.skillIds) ||
      !Array.isArray(section.evidenceIds)) throw new Error('Invalid final theory.');
  }
  for (const failure of a.failures) if (!txt(failure.key) || !txt(failure.message)) throw new Error('Invalid failure reason.');
}

export function createFinalCourtRecord(facts) {
  validateFacts(facts);
  return {
    version: 3, caseId: facts.caseId, campaignId: facts.campaignId, suspectId: facts.suspectId,
    facts: clone(facts), questions: buildFinalCourtQuestions(facts), index: 0,
    trust: clamp(FINAL_COURT_CONFIG.initialTrust + facts.courtRapportBonus),
    identityExposed: !facts.correctDefendant, phase: 'question', feedback: '', answers: [],
    verdict: null, resultCommitted: false, verdictExplanation: ''
  };
}

export function answerFinalCourtQuestion(record, index) {
  if (!record || record.phase !== 'question' || !Number.isInteger(index) || index < 0 || index > 3) return false;
  const current = record.questions[record.index];
  const answer = current?.answers[index];
  if (!answer) return false;
  const delta = current.baseDelta + answer.delta;
  if (!Number.isFinite(delta)) return false;
  record.trust = clamp(record.trust + delta);
  if (record.identityExposed) record.trust = Math.min(record.trust, FINAL_COURT_CONFIG.mistakenIdentityCap);
  record.answers.push({ questionId: current.id, answerIndex: index, delta, trust: record.trust });
  record.feedback = `${answer.feedback}${t('t_4a3de611585b91d0a4dc')}${delta >= 0 ? '+' : ''}${delta}${t('t_cdb4ee2aea69cc6a8333')}`;
  record.phase = 'feedback';
  return true;
}

export function advanceFinalCourt(record) {
  if (!record || record.phase !== 'feedback') return false;
  record.index++;
  if (record.index < record.questions.length) {
    record.phase = 'question';
    return true;
  }
  const a = record.facts.caseAssessment;
  const reasons = a.failures.map(failure => failure.message);
  if (a.opportunityStatus !== 'supported' && !a.failures.some(f => f.key === 'opportunity')) {
    reasons.push('The defendant\'s opportunity was not established.');
  }
  if (!a.culpritAlibiResolved && !a.failures.some(f => f.key === 'alibi')) {
    reasons.push('The defendant\'s alibi investigation is incomplete or incorrect.');
  }
  const sound = record.facts.correctDefendant && !record.identityExposed &&
    a.motiveCorrect && a.meansCorrect && a.methodCovered && a.identityBridge &&
    a.envelopeViewed && a.alternativeCleared && a.culpritAlibiResolved &&
    a.opportunityStatus === 'supported' && !reasons.length;
  record.verdict = sound && record.trust >= FINAL_COURT_CONFIG.convictionThreshold ? 'convicted' : 'released';
  record.phase = 'verdict';
  record.verdictExplanation = record.verdict === 'convicted' ? t('t_676d7e2d74b58587b2ed')
    : reasons.length ? reasons.join('\n') : t('t_673b6a0a24477ab13f3d');
  return true;
}

export function validFinalCourt(record, state, suspectId = null) {
  try {
    if (!record || record.version !== 3 || !same(record.caseId, state?.currentCaseId) ||
      record.campaignId !== state._createdAt || (suspectId != null && !same(record.suspectId, suspectId)) ||
      !same(record.facts?.caseId, record.caseId) || record.facts.campaignId !== record.campaignId ||
      !same(record.facts.suspectId, record.suspectId) || !Array.isArray(record.answers) ||
      typeof record.resultCommitted !== 'boolean' || (record.resultCommitted && record.phase !== 'verdict')) return false;
    const replay = createFinalCourtRecord(record.facts);
    if (JSON.stringify(record.questions) !== JSON.stringify(replay.questions) ||
      record.answers.length > replay.questions.length) return false;
    for (let index = 0; index < record.answers.length; index++) {
      const saved = record.answers[index];
      if (!answerFinalCourtQuestion(replay, saved.answerIndex) ||
        JSON.stringify(replay.answers.at(-1)) !== JSON.stringify(saved)) return false;
      if (index < record.answers.length - 1 || record.phase !== 'feedback') {
        if (!advanceFinalCourt(replay)) return false;
      }
    }
    return ['index', 'trust', 'identityExposed', 'phase', 'feedback', 'answers', 'verdict', 'verdictExplanation']
      .every(key => JSON.stringify(record[key]) === JSON.stringify(replay[key]));
  } catch {
    return false;
  }
}