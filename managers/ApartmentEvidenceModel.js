// Shared, read-only view of both legacy and current apartment inventory entries.
const FLAGS=['isArtifact','isClue','isEscapeClue','isEscapeFragment','isRedHerring','isIdentityLead'];
const plain=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};

export function getEvidenceCaseKey(state) {
  const mission=state?.currentMission || {};
  return JSON.stringify([
    state?.currentCaseId ?? mission.id ?? mission.missionId ?? null,
    state?.crimeCityId ?? null,mission.artifactKey ?? null,
    state?.investigationStartTime ?? null
  ]);
}

export function readApartmentEvidence(item) {
  if(!item || typeof item!=='object') return null;
  const wrapper=plain(item.metadata);
  const apartment=plain(wrapper.apartment);
  const original=plain(apartment.item);
  const originalMetadata=plain(original.metadata);
  const metadata={...originalMetadata,...wrapper};
  const result={...original,...item,metadata};
  // Inventory IDs must stay intact: the lab uses them to find the real entry.
  result.id=item.id;
  result.originalId=apartment.originalId || original.id || item.id;
  for(const flag of FLAGS) {
    result[flag]=item[flag]===true || wrapper[flag]===true || original[flag]===true || originalMetadata[flag]===true;
  }
  result.isArtifact=result.isArtifact || item.type==='artifact' || original.type==='artifact';
  if(Object.keys(apartment).length) metadata.apartment=apartment;
  return result;
}

export function evidenceMatchesCase(item,state,{allowLegacy=true}={}) {
  if(!item?.id) return false;
  const apartment=item.metadata?.apartment;
  if(!apartment) return true; // Preserve the existing policy for non-apartment items.
  if(apartment.caseKey!=null && apartment.caseKey!==getEvidenceCaseKey(state)) return false;
  const mission=state?.currentMission || {};
  const missionId=String(mission.id || mission.missionId || 'unknown_mission');
  if(apartment.missionId!=null && String(apartment.missionId)!==missionId) return false;
  return apartment.caseKey!=null || allowLegacy;
}
