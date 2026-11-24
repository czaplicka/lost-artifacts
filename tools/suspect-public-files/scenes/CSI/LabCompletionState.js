import { isCompletedLabResult } from './LabResultState.js';
// The marker alone, including the global legacy flag, never completes a lab.
export function isCaseCrimeLabCompleted(state,caseKey,cityId){
  if(state?.crimeCityProgress?.[caseKey]?.crimeLabCompleted!==true)return false;
  const data=state?.caseForensics?.[caseKey];
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.traceEvidenceResults)||data.traceEvidenceResults.length<2)return false;
  return[['identity',data.identityEvidenceResult],['trace_0',data.traceEvidenceResults[0]],['trace_1',data.traceEvidenceResults[1]]].every(([stationId,result])=>{
    if(!isCompletedLabResult(result,{caseKey}))return false;
    if(result.stationId!=null&&result.stationId!==stationId)return false;
    if(result.cityId!=null&&cityId!=null&&result.cityId!==cityId)return false;
    return true;
  });
}
