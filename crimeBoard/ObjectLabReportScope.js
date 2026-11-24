import { scalarCasePart, getArtifactCasePart } from '../crimeCaseKey.js';
const present=value=>scalarCasePart(value);
const same=(a,b)=>present(a)!==null&&present(b)!==null&&String(a)===String(b);
function primaryMissionId(state){
  const mission=state?.currentMission||{};
  // Legacy report keys used mission.id, not the campaign's currentCaseId.
  return present(mission.id);
}
function artifactNames(value){
  const scalar=present(value);if(scalar!==null)return [scalar];
  if(!value||typeof value!=='object'||Array.isArray(value))return [];
  return [...new Set(['label','name','artifactKey','id'].map(field=>present(value[field])).filter(v=>v!==null))];
}
function cityPart(state,report){
  return present(state?.currentMission?.city)??present(report?.cityId)??present(state?.crimeCityId)??null;
}
function scopeMatches(report,state){
  if(report.caseId!=null&&!same(report.caseId,state.currentCaseId))return false;
  if(report.campaignId!=null&&report.campaignId!==state._createdAt)return false;
  const mission=state.currentMission||{};
  if(report.missionId!=null&&mission.id!=null&&!same(report.missionId,mission.id))return false;
  return true;
}
export function getObjectLabReportCaseKey(state,report={}){
  const id=primaryMissionId(state);
  if(id!==null)return JSON.stringify(['object-lab-v2','mission',id]);
  const mission=state?.currentMission||{};
  const artifact=present(mission.artifactKey)??getArtifactCasePart(mission.artifact??state?.currentArtifact,null);
  return JSON.stringify(['object-lab-v2','fallback',cityPart(state,report),artifact]);
}
export function objectLabReportMatchesCase(state,report){
  if(!state?.currentMission||!report||!scopeMatches(report,state)||typeof report.caseKey!=='string')return false;
  if(report.caseKey===getObjectLabReportCaseKey(state,report))return true;
  let parts;
  try{parts=JSON.parse(report.caseKey);}catch{return false;}
  if(!Array.isArray(parts)||parts.length!==3)return false;
  const [oldId,oldCity,oldArtifact]=parts,currentId=primaryMissionId(state),storedId=present(oldId);
  // A stable mission ID is authoritative. Recovery may change artifact representation and display fields.
  if(currentId!==null||storedId!==null)return currentId!==null&&storedId!==null&&currentId===storedId;
  const currentCity=cityPart(state,report),storedCity=present(oldCity);
  if(currentCity===null||storedCity===null||currentCity!==storedCity)return false;
  const mission=state.currentMission;
  const currentArtifacts=[...new Set([
    ...artifactNames(mission.artifactKey),...artifactNames(mission.artifact),...artifactNames(state.currentArtifact)
  ])];
  const storedArtifacts=artifactNames(oldArtifact);
  if(!currentArtifacts.length||!storedArtifacts.length)return false;
  return storedArtifacts.some(value=>currentArtifacts.includes(value));
}
