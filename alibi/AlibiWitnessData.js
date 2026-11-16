// Compatibility entry point. Existing scene imports stay unchanged.
import { WITNESS_ROLES, WITNESS_TEXTURE_KEYS } from './witnessData/AlibiWitnessConfig.js';
import { generateAlibiWitnesses } from './witnessData/AlibiWitnessGenerator.js';
import { formatAlibiTime } from './witnessData/AlibiWitnessUtils.js';

export { ALIBI_DATA_VERSION, ALIBI_GENERATOR_REVISION } from './witnessData/AlibiWitnessConfig.js';
export { generateAlibiWitnesses, formatAlibiTime };

export const AlibiWitnessData = {
  WITNESS_ROLES, WITNESS_TEXTURE_KEYS, generateAlibiWitnesses, formatAlibiTime
};
