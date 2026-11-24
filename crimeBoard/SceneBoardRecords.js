import { getMissionCaseKey } from '../crimeCaseKey.js';
const scalar=value=>typeof value==='string'&&value.trim()?value:
  typeof value==='number'&&Number.isFinite(value)?String(value):null;
const list=value=>Array.isArray(value)?value:[];
export function sceneCaseKey(state) {
  return getMissionCaseKey(state, state?.crimeCityId ?? state?.caseSuspectCityId ?? null);
}
export function sceneScope(state) {
  return {
    caseId: state?.currentCaseId ?? null,
    campaignId: state?._createdAt ?? null,
    caseKey: sceneCaseKey(state),
    missionId: state?.currentMission?.id ?? state?.currentMission?.missionId ?? null
  };
}
export function sceneRecordMatches(record,state) {
  if(!record||typeof record!=='object'||!state?.currentMission)return false;
  const expected=sceneScope(state);
  if(record.campaignId!=null&&record.campaignId!==expected.campaignId)return false;
  if(record.caseId!=null) {
    if(scalar(record.caseId)!==scalar(expected.caseId))return false;
  } else {
    // An old mission/scene ID alone cannot prove which investigation attempt owns a record.
    return false;
  }
  if(record.caseKey!=null&&String(record.caseKey)!==expected.caseKey)return false;
  if(record.missionId!=null&&expected.missionId!=null&&String(record.missionId)!==String(expected.missionId))return false;
  return true;
}
function origin(record,kind) {
  return [kind==='photo'?record.visitKey??null:record.uniqueKey??null,
    record.visitKey??null,record.sceneId??record.scene??null,record.cityId??null,
    kind==='object'?record.id??null:null];
}
export function sceneRecordCardId(record,state,kind,index=0) {
  const scope=sceneScope(state),parts=origin(record,kind);
  const missing=parts.every(part=>part==null||part==='');
  return `${kind==='photo'?'scene-photo':'found-object'}-${encodeURIComponent(JSON.stringify([
    scope.campaignId,scope.caseId,scope.caseKey,scope.missionId,...parts,
    ...(missing?[index]:[])
  ]))}`;
}
export function getCurrentSceneRecords(state,kind) {
  const input=list(kind==='photo'?state?.crimeBoardData?.visitedCrimeScenes:state?.crimeBoardData?.sceneFoundObjects);
  const records=new Map();
  input.forEach((record,index)=>{
    if(!sceneRecordMatches(record,state))return;
    const id=sceneRecordCardId(record,state,kind,index),previous=records.get(id);
    records.set(id,previous&&kind==='photo'?{...previous,...record,success:previous.success===true||record.success===true}:record);
  });
  return [...records.values()];
}
