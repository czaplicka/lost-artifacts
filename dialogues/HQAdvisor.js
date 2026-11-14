import { dialogueText as __dialogueText } from "./DialogueText.js";
import { isCompletedLabResult } from '../scenes/CSI/LabResultState.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';
import { getPursuitCityContext, normalizePursuitCityId } from '../managers/PursuitCityContext.js';

const list = value => Array.isArray(value) ? value : [];
const finalAlibi = value => ['confirmed','contradicted'].includes(value);
const advice = (id,title,lines,details) => ({id,title,lines,details});

function keys(state) {
  const m=state.currentMission || {};
  const city=state.crimeCityId || 'unknown';
  const progress=String(m.id || m.caseId || `${city}_${m.artifact || 'default'}`);
  const lab=String(m.id ?? m.caseId ?? m.caseIndex ?? `${city}_${m.artifact ?? 'default_artifact'}`);
  const visit=m.id ? `${m.scene || 'unknown_scene'}_${m.id}`
    : `${m.scene || 'unknown_scene'}_${m.city || city}_${m.artifact || state.currentArtifact || 'artifact'}`;
  return {progress,lab,visit,evidence:getEvidenceCaseKey(state)};
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
function labCompleted(state,k) {
  if (state.crimeCityProgress?.[k.progress]?.crimeLabCompleted===true) return true;
  if (state.crimeCityProgress?.[k.lab]?.crimeLabCompleted!==true) return false;
  const data=state.caseForensics?.[k.lab];
  return Boolean(data && [data.identityEvidenceResult,data.traceEvidenceResults?.[0],data.traceEvidenceResults?.[1]]
    .every(result=>isCompletedLabResult(result,{caseKey:k.lab})
      && (result.cityId==null || state.crimeCityId==null || result.cityId===state.crimeCityId)));
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
  if (belongsToCase(court,state) && court.phase && court.phase!=='verdict') return advice('court',__dialogueText("dialogues/HQAdvisor.js", "t_224ff1c04f2bb4d9a726"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_0d78b0037953d0f4c64a")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_fa8932a1fd74db5e4700"),__dialogueText("dialogues/HQAdvisor.js", "t_dab09097273f545d373f")]);
  if (state.caseFailed===true) return advice('failed',__dialogueText("dialogues/HQAdvisor.js", "t_3825cb7a28815e93b278"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_6878dafc8371db3709c4")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_1dd979c99e2e6aa29322")]);
  if (state.caseResolved===true) return advice('resolved',__dialogueText("dialogues/HQAdvisor.js", "t_2eaeefec361edca8d21f"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_2b842b13ade0ad253ebb")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_67ce31c6179b5f3be9eb")]);
  if (!state.currentMission || !state.isGameActive) return advice('no_case',__dialogueText("dialogues/HQAdvisor.js", "t_06be52d7cf22ef775bd2"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_0908b3e72546e7c2c82f")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_eb479e60b456c9648aff")]);
  const clock=getCaseClockStatus(state);
  if (clock.totalExpired || clock.crimeExpired) return advice('expired',__dialogueText("dialogues/HQAdvisor.js", "t_406e823b14df62ebb517"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_0a74e6a4be7b1dd83fab")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_42d012a5fdb21d330e77")]);
  if (belongsToCase(chase,state) && ['running','active','pursuit','review','caught'].includes(chase.phase)) return advice('chase',__dialogueText("dialogues/HQAdvisor.js", "t_c226783f90805e7a0c63"),
    [chase.phase==='caught' ? __dialogueText("dialogues/HQAdvisor.js", "t_711e741392dc810751fd") : __dialogueText("dialogues/HQAdvisor.js", "t_70643c61f00b2a36324f")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_d215b4dc2ffc1a9a83b7"),__dialogueText("dialogues/HQAdvisor.js", "t_d93af8358d58dc72d526")]);
  const awake=state.currentMission?.energyBalance?.awakeMinutes;
  if ((Number.isFinite(awake) && awake>=20*60) || (Number.isFinite(state.energy) && state.energy<=3)) {
    return advice('rest',__dialogueText("dialogues/HQAdvisor.js", "t_07c899ef536990d8d736"),
      [__dialogueText("dialogues/HQAdvisor.js", "t_8640352c2fe1297935e6")],
      [__dialogueText("dialogues/HQAdvisor.js", "t_c984822bbbd4a426ca3d"),
       __dialogueText("dialogues/HQAdvisor.js", "t_ccb4e8a49009f399f178")]);
  }
  const k=keys(state);
  const analysis=state.caseData?.ticketAnalyses?.[k.evidence];
  if (state.escapePhaseActive===true && analysis?.completed) {
    const manager=state.routeManager;
    const route=list(manager?.route ?? state.escapeRoute);
    const index=Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : Number(state.routeIndex)||0;
    const complete=manager?.state==='DONE' || (route.length>0 && index>=route.length);
    const context=getPursuitCityContext(state,state.currentCityId);
    if (!context.isCorrectCity && !complete && normalizePursuitCityId(state.currentCityId)!=='hq') return advice('wrong_city',__dialogueText("dialogues/HQAdvisor.js", "t_c9f6951ed3d6c5eeb2f8"),
      [__dialogueText("dialogues/HQAdvisor.js", "t_edd8bcfd7d6ff1b0f00f")],
      [__dialogueText("dialogues/HQAdvisor.js", "t_53d39c55ae353e1333d5"),__dialogueText("dialogues/HQAdvisor.js", "t_794fe65d75963d27bdef")]);
    if (complete) return advice('finale',__dialogueText("dialogues/HQAdvisor.js", "t_616a50b06a7e1ca473d1"),
      [state.arrestWarrantIssued ? __dialogueText("dialogues/HQAdvisor.js", "t_faab73d48b275c7534e3")
        : __dialogueText("dialogues/HQAdvisor.js", "t_b31c11c6a4a765316f74")],
      [__dialogueText("dialogues/HQAdvisor.js", "t_1683291e680fcf06cdfc"),__dialogueText("dialogues/HQAdvisor.js", "t_9710bdf3bb18d4b4f362")]);
    return advice('travel',__dialogueText("dialogues/HQAdvisor.js", "t_7e871729e7e4fcc0bb8a"),
      [__dialogueText("dialogues/HQAdvisor.js", "t_57ed3b3c191b164c71a0")],
      [context.isCrimeCity ? __dialogueText("dialogues/HQAdvisor.js", "t_033daea027265bcab861")
        : __dialogueText("dialogues/HQAdvisor.js", "t_629e0e091e93f4e410c9"),
       __dialogueText("dialogues/HQAdvisor.js", "t_4a3c88d5637b453298d7"),__dialogueText("dialogues/HQAdvisor.js", "t_1995b6166e727cc1fe4f")]);
  }
  const current=normalizePursuitCityId(state.currentCityId),crime=normalizePursuitCityId(state.crimeCityId);
  if (current && crime && current!==crime) return advice('go_crime_city',__dialogueText("dialogues/HQAdvisor.js", "t_a097312538f829132815"),
    [`${__dialogueText("dialogues/HQAdvisor.js", "t_0e85d9a5bab9f995b9f1")}${state.currentMission.city || __dialogueText("dialogues/HQAdvisor.js", "t_1c5a1e24e87a7797cabc")}${__dialogueText("dialogues/HQAdvisor.js", "t_cdb4ee2aea69cc6a8333")}`],
    [__dialogueText("dialogues/HQAdvisor.js", "t_24e9356932c4c5cdc331")]);
  if (!state.specialScenesCompleted?.[k.visit]) return advice('hidden_objects',__dialogueText("dialogues/HQAdvisor.js", "t_4b883f1cf159b1886ef6"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_9eeefd8416623256111e")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_aa5880d48580088b2495"),__dialogueText("dialogues/HQAdvisor.js", "t_97340ba8749d5c5ca99b")]);
  if (!labCompleted(state,k)) {
    const data=state.caseForensics?.[k.lab];
    const done=[data?.identityEvidenceResult,data?.traceEvidenceResults?.[0],data?.traceEvidenceResults?.[1]]
      .filter(result=>isCompletedLabResult(result,{caseKey:k.lab})).length;
    return advice('csi',__dialogueText("dialogues/HQAdvisor.js", "t_d78b45d6b6aa726b5cdd"),
      [`${__dialogueText("dialogues/HQAdvisor.js", "t_cf25f0687ad4c661f39a")}${done}${__dialogueText("dialogues/HQAdvisor.js", "t_389ba5933c0ef3a32600")}`],
      [__dialogueText("dialogues/HQAdvisor.js", "t_0d1fbd2ab93bf6a57134"),__dialogueText("dialogues/HQAdvisor.js", "t_b520c7138d3d65316d20")]);
  }
  if (!['answer','ignore'].includes(state.suspectFilesPhoneDecisions?.[k.progress])) return advice('lab_call',__dialogueText("dialogues/HQAdvisor.js", "t_b726f9ac6fa6cc4969c3"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_09ce6fab75e771b551d0")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_a15ca5227977df172b03")]);
  const reconstruction=state.reconstructedHeists?.[k.progress] || state.reconstructedHeist;
  if (!(typeof reconstruction?.playerTheoryResult==='string' && reconstruction.playerTheoryResult.length)) return advice('hypothesis',__dialogueText("dialogues/HQAdvisor.js", "t_7afbaa608c596ae5ea69"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_642266f82226ce29d43c")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_a1bcf2e27e287d61e184"),__dialogueText("dialogues/HQAdvisor.js", "t_91da00d293b566a0f34a")]);
  if (state.suspectExclusionState?.[k.progress]?.finished!==true) return advice('suspects',__dialogueText("dialogues/HQAdvisor.js", "t_10b3941e3066de064cdd"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_32063e4dcbe93167b1fc")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_52c2b07bc69a723328e0"),__dialogueText("dialogues/HQAdvisor.js", "t_3bc5cd75dd4cef167c91")]);
  const alibis=alibiProgress(state,k.progress);
  if (!alibis.available) return advice('alibi_setup',__dialogueText("dialogues/HQAdvisor.js", "t_dbdf76d233d2fbf75dfb"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_fddfdad3876429bdeaea")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_2f11098a8355c89be6ff")]);
  if (alibis.pending>0) return advice('alibis',__dialogueText("dialogues/HQAdvisor.js", "t_b9f7ed026ed5320ef791"),
    [`${__dialogueText("dialogues/HQAdvisor.js", "t_60ec5da1060783897e96")}${alibis.pending}${__dialogueText("dialogues/HQAdvisor.js", "t_9b96bf000a0fd81e07ca")}`],
    [__dialogueText("dialogues/HQAdvisor.js", "t_aaea76da43992c66ca3f"),__dialogueText("dialogues/HQAdvisor.js", "t_2e1907609dd6388a464d")]);
  if (!alibis.contradicted) return advice('alibi_blocked',__dialogueText("dialogues/HQAdvisor.js", "t_5ac511d68f4ba3d08041"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_2805a68e270e854fae16")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_a8fdcf8b28e9e43c67e7")]);
  if (!apartmentVisited(state,k.evidence)) return advice('apartment',__dialogueText("dialogues/HQAdvisor.js", "t_3107f47e4401d763f370"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_81c0b6fff976f8614e45")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_e69fc86fdc5b7ee21562")]);
  if (!analysis?.completed) {
    const evidence=list(inventoryItems).map(readApartmentEvidence).filter(item=>item && evidenceMatchesCase(item,state));
    const hasLead=evidence.some(item=>!item.isRedHerring && !item.isArtifact && (item.isEscapeClue || item.metadata?.ticketEvidence===true
      || ['torn_ticket','plane_ticket_receipt','plane_booking','ticket_identity_matched'].includes(item.originalId)));
    const hasFragments=evidence.some(item=>item.isEscapeFragment);
    return advice('apartment_evidence',__dialogueText("dialogues/HQAdvisor.js", "t_a8dc4b580f52c81e380a"),
      [hasLead ? __dialogueText("dialogues/HQAdvisor.js", "t_218ba0a7f25693ec99b6")
        : hasFragments ? __dialogueText("dialogues/HQAdvisor.js", "t_55d0268452b831251675")
          : __dialogueText("dialogues/HQAdvisor.js", "t_4f7a336ed834f2ebaad9")],
      [__dialogueText("dialogues/HQAdvisor.js", "t_4f2923ca70b978ed0688"),__dialogueText("dialogues/HQAdvisor.js", "t_4f46a8976f9173430d81")]);
  }
  return advice('clock_check',__dialogueText("dialogues/HQAdvisor.js", "t_b1878a33f83b9b5d5867"),
    [__dialogueText("dialogues/HQAdvisor.js", "t_97ce863316f84947075d")],
    [__dialogueText("dialogues/HQAdvisor.js", "t_73655410b982edc9a1fd")]);
}

export function makeHQEntry(hint,{detailed=false}={}) {
  return {speaker:__dialogueText("dialogues/HQAdvisor.js", "t_ade0f7975671c1a0abbf"),portraitKey:'portrait_hq',
    lines:[`${__dialogueText("dialogues/HQAdvisor.js", "t_0126d39d6a15a700cf61")}${hint.title}`,...(detailed ? hint.details : hint.lines)]};
}
