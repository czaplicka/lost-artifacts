// CourtScene / EnterChaseScene compatibility facade.
import * as legacy from './courtRapportLegacy.js';
import { buildCourtFacts as buildBaseFacts } from './courtLogic.js';
import {
  readTheory,
  theoryCaseKey,
  getTheoryCards,
  getActualIdentityIds,
  getUsedSkillIds,
  normalizeSkillId
} from '../crimeBoard/CaseTheoryModel.js';
import { getOpportunityFacts, evaluateOpportunity } from './OpportunityRules.js';
import { getBoardEvidenceRecord } from '../crimeBoard/BoardEvidenceModel.js';
import {
  getApartmentIdentityContext,
  getKnownApartmentIdentityClues
} from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { getMotiveById } from '../motiveService.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';
import { assessSubmission } from './CaseTheorySubmission.js';
import {
  FINAL_COURT_CONFIG,
  assembleFinalCourtFacts,
  createFinalCourtRecord,
  answerFinalCourtQuestion,
  advanceFinalCourt,
  validFinalCourt
} from './FinalCaseCourt.js';

export const COURT_CONFIG = FINAL_COURT_CONFIG;

const list = value => Array.isArray(value) ? value : [];
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const hasText = value => typeof value === 'string' && value.trim().length > 0;
const inScope = (value, state) => Boolean(value) &&
  (value.caseId == null || sameId(value.caseId, state.currentCaseId)) &&
  (value.campaignId == null || value.campaignId === state._createdAt);
const FIELDS = ['identity', 'motive', 'means', 'opportunity'];
const LABELS = {
  identity: 'Identity',
  motive: 'Motive',
  means: 'Means',
  opportunity: 'Opportunity'
};

function buildEvidenceSolution(state, motive, actualIds, usedSkills, opportunity) {
  const claims = list(state.reconstructedHeist?.claims);
  const skillObjects = {};

  for (const claim of claims) {
    const skillId = normalizeSkillId(claim?.thiefSkill);
    if (!skillId || claim?.solutionItemId == null) continue;
    skillObjects[skillId] = [...new Set([
      ...list(skillObjects[skillId]),
      String(claim.solutionItemId)
    ])];
  }

  const finalIds = new Set(list(motive?.escapeInvestigation?.clueStages)
    .filter(stage => stage?.boardAnswerUnlocked === true && stage.evidenceId != null)
    .map(stage => String(stage.evidenceId)));

  const collectedIds = list(state.cluesCollected)
    .filter(clue => clue?.type === 'motive' && inScope(clue, state) &&
      hasText(clue.text) && finalIds.has(String(clue.id)))
    .map(clue => String(clue.id));

  const reportIds = Object.values(state.caseData?.motiveWitnessReports || {})
    .filter(report => report?.version === 1 &&
      sameId(report.caseId, state.currentCaseId) &&
      report.campaignId === state._createdAt &&
      report.motiveId === motive?.id && hasText(report.text) &&
      finalIds.has(String(report.evidenceId)))
    .map(report => String(report.evidenceId));

  return {
    identityIds: actualIds,
    motiveAnswerId: motive?.crimeBoard?.answerId || null,
    motiveEvidenceIds: [...new Set([...collectedIds, ...reportIds])],
    usedSkills,
    skillObjects,
    opportunity,
    securityObjectIds: claims
      .filter(claim => claim?.solutionItemId != null &&
        ['beat_security', 'disable_system', 'create_blind_spot'].includes(claim.questionId))
      .map(claim => String(claim.solutionItemId))
  };
}

export function applyCourtEvidenceAssessment(facts, assessment) {
  const caseAssessment = facts?.caseAssessment;
  if (!caseAssessment || !Array.isArray(caseAssessment.failures)) {
    throw new Error('Cannot validate court evidence: the case assessment is missing.');
  }
  if (!Array.isArray(assessment) || assessment.length !== FIELDS.length ||
    FIELDS.some(field => assessment.filter(row => row?.field === field).length !== 1)) {
    throw new Error('Cannot validate court evidence: an assessment of all four pillars is required.');
  }
  const statuses = new Set(['supported', 'contradicted', 'inconclusive']);
  for (const row of assessment) {
    if (!statuses.has(row.answerStatus) || !statuses.has(row.evidenceStatus)) {
      throw new Error('Cannot validate court evidence: invalid assessment status.');
    }
  }

  const failures = caseAssessment.failures.map(failure => ({ ...failure }));
  const add = (key, message) => {
    if (!failures.some(failure => failure.key === key)) failures.push({ key, message });
  };

  for (const row of assessment) {
    const label = LABELS[row.field];
    if (row.answerStatus !== 'supported') {
      add(`semantic_answer_${row.field}`, row.answerStatus === 'contradicted'
        ? `${label}: the filed conclusion contradicts the case evidence.`
        : `${label}: the filed conclusion has not been established.`);
    }
    if (row.evidenceStatus !== 'supported') {
      // Existing question logic checks references_<field> as well.
      add(`references_${row.field}`, row.evidenceStatus === 'contradicted'
        ? `${label}: the attached evidence does not support the filed conclusion.`
        : `${label}: the attached evidence is insufficient to establish the conclusion.`);
    }
  }

  return {
    ...facts,
    caseAssessment: {
      ...caseAssessment,
      evidenceAssessmentVersion: 1,
      evidenceAssessment: assessment.map(row => ({
        field: row.field,
        answerStatus: row.answerStatus,
        evidenceStatus: row.evidenceStatus,
        evidenceLabels: [...list(row.evidenceLabels)]
      })),
      failures
    }
  };
}

export function buildCourtFacts(state, suspectId) {
  const baseFacts = buildBaseFacts(state, suspectId);
  const theory = readTheory(state);
  const identityContext = getApartmentIdentityContext(state);
  const selectedMotive = getMotiveById(theory.sections.motive.answerId);
  const motive = getMotiveById(state.caseData?.motiveId);
  const stats = getEffectiveStats({
    profile: state.detectiveProfile || 'analyst',
    stats: state.detectiveStats || {}
  });
  const actualIds = getActualIdentityIds(state);
  const usedSkills = getUsedSkillIds(state);
  const opportunity = getOpportunityFacts(state);
  const cards = getTheoryCards(state);

  const facts = assembleFinalCourtFacts(state, suspectId, {
    baseFacts,
    theory,
    theoryKey: theoryCaseKey(state),
    actualIds,
    actualDatabaseId: identityContext?.actualId ?? state.actualCriminalId ??
      state.currentThiefId ?? state.currentThief?.id,
    usedSkills,
    opportunityStatus: evaluateOpportunity(opportunity, theory.sections.opportunity.answerId),
    motive,
    motiveLabel: selectedMotive?.crimeBoard?.label ||
      theory.sections.motive.answerId.replace(/_/g, ' '),
    boardRecord: getBoardEvidenceRecord(state),
    identityContext,
    identityClues: getKnownApartmentIdentityClues(state),
    cards,
    rapport: stats.rapport
  });

  const assessment = assessSubmission({
    suspectId,
    theory: facts.finalTheory,
    cards: list(cards).filter(card => card && inScope(card, state)),
    solution: buildEvidenceSolution(state, motive, actualIds, usedSkills, opportunity)
  });

  return applyCourtEvidenceAssessment(facts, assessment);
}

export function createCourtRecord(facts) {
  if (facts?.courtMode === 'case-theory-v3') return createFinalCourtRecord(facts);
  if (facts?.courtMode !== undefined) throw new Error('Unsupported saved court mode.');
  return legacy.createCourtRecord(facts);
}

export function answerCourtQuestion(record, index) {
  return record?.version === 3
    ? answerFinalCourtQuestion(record, index)
    : legacy.answerCourtQuestion(record, index);
}

export function advanceCourt(record) {
  return record?.version === 3 ? advanceFinalCourt(record) : legacy.advanceCourt(record);
}

export function validCourt(record, state, suspectId = null) {
  return record?.version === 3
    ? validFinalCourt(record, state, suspectId)
    : legacy.validCourt(record, state, suspectId);
}