import { normalizeForensicAttributes, normalizeGenderCode } from './suspectFactory.js';
import { safeClone } from './suspectGeneratorUtils.js';
// Returns owned case data; never modifies the catalogue entry.
export function createCaseThiefProfile(source){
  if(!source||typeof source!=='object'||Array.isArray(source))throw Error('A real thief profile is required.');
  const thief=safeClone(source);
  const gender=normalizeGenderCode(thief.gender_code||thief.genderCode||thief.gender);
  thief.restrictedProfile??={};
  thief.restrictedProfile.forensicAttributes={
    ...(thief.restrictedProfile.forensicAttributes||{}),
    ...normalizeForensicAttributes(thief,gender)
  };
  return thief;
}
