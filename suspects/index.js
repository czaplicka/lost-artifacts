import SuspectGenerator from './SuspectGenerator.js';
import { prepareCaseSuspectState, getGeneratedSuspects } from './SuspectCaseState.js';

export { SuspectGenerator };
export { prepareCaseSuspectState, getGeneratedSuspects };

export {
  normalizeHardEvidence,
  matchesAllHardEvidence,
  getDefaultHardEvidenceFromThief
} from './forensicEvidence.js';

export function generateSuspects({ total = 10, realThief = null, hardEvidence = [] } = {}) {
  const generator = new SuspectGenerator([]);
  const caseData = generator.generateCaseSuspects(realThief, null, { total, hardEvidence });

  prepareCaseSuspectState(caseData);

  return caseData.suspects;
}

export function regenerateSuspects(options = {}) {
  return generateSuspects(options);
}