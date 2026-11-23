import { dialogueText as __dialogueText } from './DialogueText.js';
import { isCompletedLabResult } from '../scenes/CSI/LabResultState.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';
import { getPursuitCityContext, normalizePursuitCityId } from '../managers/PursuitCityContext.js';
import { getMissionCaseKey } from '../crimeCaseKey.js';
import { getCrimeSceneVisitKey } from '../crimeSceneVisitKey.js';

const text = key => __dialogueText('dialogues/HQAdvisor.js', key);
const list = value => Array.isArray(value) ? value : [];
const finalAlibi = value => ['confirmed','contradicted'].includes(value);
const advice = (id,title,lines,details) => ({id,title,lines,details});

function keys(state) {
  const progress = getMissionCaseKey(state, state.crimeCityId);
  return { progress, lab: progress, visit: getCrimeSceneVisitKey(state), evidence: getEvidenceCaseKey(state) };
}
function apartmentVisited(state,key) {
  if (state.caseData?.apartmentVisits?.[key]===true) return true;
  const caseId=state.currentCaseId ?? null,start=state.investigationStartTime ?? null;
  if (caseId===null && !Number.isFinite(start)) return false;
  const artifactKey=state.currentMission?.artifactKey || state.currentMission?.artifact?.artifactKey || '';
  return Object.values(state.apartmentProgress || {}).some(progress=>
    Object.keys(progress?.roomPackSelections || {}).some(raw=>{
      try {
        const identity=JSON.parse(raw);
        return Array.isArray(identity) && identity.length===5 && identity[2]===artifactKey
          && identity[3]===caseId && identity[4]===start;
      } catch {return false;}
    }));
}
function belongsToCase(record,state) {
  return record && record.caseId!=null && state.currentCaseId!=null
    && String(record.caseId)===String(state.currentCaseId)
    && (record.campaignId==null || record.campaignId===state._createdAt);
}
function completedLabStations(state,k) {
  const data=state.caseForensics?.[k.lab];
  const traces=Array.isArray(data?.traceEvidenceResults) ? data.traceEvidenceResults : [];
  const stations=[['identity',data?.identityEvidenceResult],['trace_0',traces[0]],['trace_1',traces[1]]];
  return stations.map(([stationId,result])=>Boolean(isCompletedLabResult(result,{caseKey:k.lab})
    && (result.stationId==null || result.stationId===stationId)
    && (result.cityId==null || state.crimeCityId==null || result.cityId===state.crimeCityId)));
}
function labCompleted(state,k) {
  return state.crimeCityProgress?.[k.lab]?.crimeLabCompleted===true && completedLabStations(state,k).every(Boolean);
}
function alibiProgress(state,key) {
  const subjects=list(state.caseData?.alibiCases?.[key]?.suspects);
  if (!subjects.length) return {available:false,pending:0,contradicted:0};
  const ids=subjects.map(s=>s?.suspectId);
  if (ids.some(id=>typeof id!=='string' || !id.trim()) || new Set(ids).size!==ids.length) {
    return {available:false,pending:0,contradicted:0};
  }
  let pending=0,contradicted=0;
  for (const subject of subjects) {
    const filed=subject.playerConclusion;
    const legacy=list(state.caseSuspects).find(s=>s?.id===subject.suspectId)?.deductionState?.alibiStatus;
    const status=filed?.locked===true && finalAlibi(filed.status) ? filed.status : finalAlibi(legacy) ? legacy : null;
    if (!status) pending++;
    if (status==='contradicted') contradicted++;
  }
  return {available:true,pending,contradicted};
}

export function getHQAdvice(state={}, {inventoryItems=[]}={}) {
  const court=state.courtState,chase=state.chaseState;
  if (belongsToCase(court,state) && court.phase && court.phase!=='verdict') return advice('court',text('t_224ff1c04f2bb4d9a726'),
    [text('t_0d78b0037953d0f4c64a')],
    [text('t_fa8932a1fd74db5e4700'),text('t_dab09097273f545d373f')]);
  if (state.caseFailed===true) return advice('failed',text('t_3825cb7a28815e93b278'),
    [text('t_6878dafc8371db3709c4')],
    [text('t_1dd979c99e2e6aa29322')]);
  if (state.caseResolved===true) return advice('resolved',text('t_2eaeefec361edca8d21f'),
    [text('t_2b842b13ade0ad253ebb')],
    [text('t_67ce31c6179b5f3be9eb')]);
  if (!state.currentMission || !state.isGameActive) return advice('no_case',text('t_06be52d7cf22ef775bd2'),
    [text('t_0908b3e72546e7c2c82f')],
    [text('t_eb479e60b456c9648aff')]);
  const clock=getCaseClockStatus(state);
  if (clock.totalExpired || clock.crimeExpired) return advice('expired',text('t_406e823b14df62ebb517'),
    [text('t_0a74e6a4be7b1dd83fab')],
    [text('t_42d012a5fdb21d330e77')]);
  if (belongsToCase(chase,state) && ['running','active','pursuit','review','caught'].includes(chase.phase)) return advice('chase',text('t_c226783f90805e7a0c63'),
    [chase.phase==='caught' ? text('t_711e741392dc810751fd') : text('t_70643c61f00b2a36324f')],
    [text('t_d215b4dc2ffc1a9a83b7'),text('t_d93af8358d58dc72d526')]);
  const awake=state.currentMission?.energyBalance?.awakeMinutes;
  if ((Number.isFinite(awake) && awake>=20*60) || (Number.isFinite(state.energy) && state.energy<=3)) {
    return advice('rest',text('t_07c899ef536990d8d736'),
      [text('t_8640352c2fe1297935e6')],
      [text('t_c984822bbbd4a426ca3d'),
       text('t_ccb4e8a49009f399f178')]);
  }
  const k=keys(state);
  const analysis=state.caseData?.ticketAnalyses?.[k.evidence];
  if (state.escapePhaseActive===true && analysis?.completed) {
    const manager=state.routeManager;
    const route=list(manager?.route ?? state.escapeRoute);
    const index=Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : Number(state.routeIndex)||0;
    const complete=manager?.state==='DONE' || (route.length>0 && index>=route.length);
    const context=getPursuitCityContext(state,state.currentCityId);
    if (!context.isCorrectCity && !complete && normalizePursuitCityId(state.currentCityId)!=='hq') return advice('wrong_city',text('t_c9f6951ed3d6c5eeb2f8'),
      [text('t_edd8bcfd7d6ff1b0f00f')],
      [text('t_53d39c55ae353e1333d5'),text('t_794fe65d75963d27bdef')]);
    if (complete) return advice('finale',text('t_616a50b06a7e1ca473d1'),
      [state.arrestWarrantIssued ? text('t_faab73d48b275c7534e3')
        : text('t_b31c11c6a4a765316f74')],
      [text('t_1683291e680fcf06cdfc'),text('t_9710bdf3bb18d4b4f362')]);
    return advice('travel',text('t_7e871729e7e4fcc0bb8a'),
      [text('t_57ed3b3c191b164c71a0')],
      [context.isCrimeCity ? text('t_033daea027265bcab861')
        : text('t_629e0e091e93f4e410c9'),
       text('t_4a3c88d5637b453298d7'),text('t_1995b6166e727cc1fe4f')]);
  }
  const current=normalizePursuitCityId(state.currentCityId),crime=normalizePursuitCityId(state.crimeCityId);
  if (current && crime && current!==crime) return advice('go_crime_city',text('t_a097312538f829132815'),
    [`${text('t_0e85d9a5bab9f995b9f1')}${state.currentMission.city || text('t_1c5a1e24e87a7797cabc')}${text('t_cdb4ee2aea69cc6a8333')}`],
    [text('t_24e9356932c4c5cdc331')]);
  if (!state.specialScenesCompleted?.[k.visit]) return advice('hidden_objects',text('t_4b883f1cf159b1886ef6'),
    [text('t_9eeefd8416623256111e')],
    [text('t_aa5880d48580088b2495'),text('t_97340ba8749d5c5ca99b')]);
  if (!labCompleted(state,k)) {
    const done=completedLabStations(state,k).filter(Boolean).length;
    return advice('csi',text('t_d78b45d6b6aa726b5cdd'),
      [`${text('t_cf25f0687ad4c661f39a')}${done}${text('t_389ba5933c0ef3a32600')}`],
      [text('t_0d1fbd2ab93bf6a57134'),text('t_b520c7138d3d65316d20')]);
  }
  if (!['answer','ignore'].includes(state.suspectFilesPhoneDecisions?.[k.progress])) return advice('lab_call',text('t_b726f9ac6fa6cc4969c3'),
    [text('t_09ce6fab75e771b551d0')],
    [text('t_a15ca5227977df172b03')]);
  const reconstruction=state.reconstructedHeists?.[k.progress] || state.reconstructedHeist;
  if (!(typeof reconstruction?.playerTheoryResult==='string' && reconstruction.playerTheoryResult.length)) return advice('hypothesis',text('t_7afbaa608c596ae5ea69'),
    [text('t_642266f82226ce29d43c')],
    [text('t_a1bcf2e27e287d61e184'),text('t_91da00d293b566a0f34a')]);
  if (state.suspectExclusionState?.[k.progress]?.finished!==true) return advice('suspects',text('t_10b3941e3066de064cdd'),
    [text('t_32063e4dcbe93167b1fc')],
    [text('t_52c2b07bc69a723328e0'),text('t_3bc5cd75dd4cef167c91')]);
  const alibis=alibiProgress(state,k.progress);
  if (!alibis.available) return advice('alibi_setup',text('t_dbdf76d233d2fbf75dfb'),
    [text('t_fddfdad3876429bdeaea')],
    [text('t_2f11098a8355c89be6ff')]);
  if (alibis.pending>0) return advice('alibis',text('t_b9f7ed026ed5320ef791'),
    [`${text('t_60ec5da1060783897e96')}${alibis.pending}${text('t_9b96bf000a0fd81e07ca')}`],
    [text('t_aaea76da43992c66ca3f'),text('t_2e1907609dd6388a464d')]);
  if (!alibis.contradicted) return advice('alibi_blocked',text('t_5ac511d68f4ba3d08041'),
    [text('t_2805a68e270e854fae16')],
    [text('t_a8fdcf8b28e9e43c67e7')]);
  if (!apartmentVisited(state,k.evidence)) return advice('apartment',text('t_3107f47e4401d763f370'),
    [text('t_81c0b6fff976f8614e45')],
    [text('t_e69fc86fdc5b7ee21562')]);
  if (!analysis?.completed) {
    const evidence=list(inventoryItems).map(readApartmentEvidence).filter(item=>item && evidenceMatchesCase(item,state));
    const hasLead=evidence.some(item=>!item.isRedHerring && !item.isArtifact && (item.isEscapeClue || item.metadata?.ticketEvidence===true
      || ['torn_ticket','plane_ticket_receipt','plane_booking','ticket_identity_matched'].includes(item.originalId)));
    const hasFragments=evidence.some(item=>item.isEscapeFragment);
    return advice('apartment_evidence',text('t_a8dc4b580f52c81e380a'),
      [hasLead ? text('t_218ba0a7f25693ec99b6')
        : hasFragments ? text('t_55d0268452b831251675')
          : text('t_4f7a336ed834f2ebaad9')],
      [text('t_4f2923ca70b978ed0688'),text('t_4f46a8976f9173430d81')]);
  }
  return advice('clock_check',text('t_b1878a33f83b9b5d5867'),
    [text('t_97ce863316f84947075d')],
    [text('t_73655410b982edc9a1fd')]);
}

export function makeHQEntry(hint,{detailed=false}={}) {
  return {speaker:text('t_ade0f7975671c1a0abbf'),portraitKey:'portrait_hq',
    lines:[`${text('t_0126d39d6a15a700cf61')}${hint.title}`,...(detailed ? hint.details : hint.lines)]};
}
