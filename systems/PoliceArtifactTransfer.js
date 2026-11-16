import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';

export const POLICE_TRANSFER_BUDGET = 100;
let busy = false;
export function policeTransferCaseKey(state) {
  const m=state?.currentMission;
  if (!m || state._createdAt==null || state.currentCaseId==null || (m.id??m.missionId)==null || !m.artifactKey) return null;
  return JSON.stringify([state._createdAt,state.currentCaseId,String(m.id??m.missionId),String(m.artifactKey),state.investigationStartTime??null]);
}
export function getPoliceTransferReceipt(state) {
  const key=policeTransferCaseKey(state),r=state?.caseData?.policeArtifactTransfers?.[key];
  return key && r?.version===1 && r.transferred===true && r.caseKey===key &&
    r.artifactKey===String(state.currentMission.artifactKey) && r.budgetGranted===POLICE_TRANSFER_BUDGET &&
    r.source==='agency' && typeof r.name==='string' && r.name.trim() ? r : null;
}
export function getPoliceTransferStatus(state) {
  const caseKey=policeTransferCaseKey(state);
  const result=(reason,extra={})=>({ok:reason==='available',reason,caseKey,bonus:POLICE_TRANSFER_BUDGET,...extra});
  if (!caseKey) return result('no_case');
  const receipt=getPoliceTransferReceipt(state);
  if (receipt) return result('transferred',{receipt});
  if (state.caseData?.policeArtifactTransfers?.[caseKey]!=null) return result('invalid_receipt');
  if (state.caseFailed || state.caseResolved) return result('case_closed');
  if (busy) return result('busy');
  const m=state.currentMission,missionId=String(m.id??m.missionId),artifactKey=String(m.artifactKey);
  const matches=(Array.isArray(state.recoveredArtifacts)?state.recoveredArtifacts:[]).filter(entry=>
    entry && String(entry.missionId)===missionId && String(entry.artifactKey)===artifactKey);
  if (!matches.length) return result('not_recovered');
  if (matches.length!==1 || !matches[0].artifactId) return result('invalid_recovery');
  const recovery=matches[0];
  const name=typeof recovery.artifact==='string'?recovery.artifact.trim():'';
  if (!name) return result('invalid_recovery');
  return result('available',{recovery,name,artifactKey});
}
export function transferArtifactToPolice(expectedCaseKey) {
  const state=gameState,status=getPoliceTransferStatus(state);
  if (!status.ok) return status;
  if (!expectedCaseKey || status.caseKey!==expectedCaseKey) return {ok:false,reason:'case_changed'};
  busy=true;
  let previous;
  try {
    previous=Object.fromEntries(['caseData','agencyBudget','cash','agencyDebt','moneyLog'].map(k=>[k,structuredClone(state[k])]));
    const m=state.currentMission;
    const receipt={version:1,transferred:true,caseKey:status.caseKey,
      artifactKey:status.artifactKey,artifactId:String(status.recovery.artifactId),
      name:status.name,missionId:String(m.id??m.missionId),caseId:state.currentCaseId,campaignId:state._createdAt,
      policeCityId:state.crimeCityId||m.city||null,source:'agency',budgetGranted:POLICE_TRANSFER_BUDGET,
      recoveredAt:status.recovery.recoveredAt||null,transferredAt:new Date().toISOString()};
    const boardKey=getEvidenceCaseKey(state),oldBoard=state.caseData?.boardEvidenceCases?.[boardKey]||{};
    const artifacts=Array.isArray(oldBoard.recoveredArtifacts)?oldBoard.recoveredArtifacts:[];
    const preserved=artifacts.some(a=>a.artifactKey===status.artifactKey)?artifacts:[...artifacts,{
      artifactKey:status.artifactKey,name:status.name,recoveredAt:status.recovery.recoveredAt||receipt.transferredAt
    }];
    state.caseData={...(state.caseData||{}),
      policeArtifactTransfers:{...(state.caseData?.policeArtifactTransfers||{}),[status.caseKey]:receipt},
      boardEvidenceCases:{...(state.caseData?.boardEvidenceCases||{}),[boardKey]:{
        ...oldBoard,recoveredArtifacts:preserved,policeCustody:receipt
      }}
    };
    moneyManager.addAgencyBudget(POLICE_TRANSFER_BUDGET,{
      category:ECONOMY_CATEGORY.AGENCY_ADVANCE,description:'Agency authorisation: artefact secured by police',
      missionId:m.id??m.missionId,metadata:{policeArtifactTransfer:true,caseKey:status.caseKey,artifactKey:status.artifactKey}
    });
    requestAutosave();
    if (flushAutosave()!==true) throw Error('save_failed');
    return {ok:true,reason:'transferred',receipt};
  } catch(error) {
    if (previous) {
      if (typeof state.updateState==='function') state.updateState(previous);
      else Object.assign(state,previous);
      try {requestAutosave();flushAutosave();} catch(_) {}
      try {
        if(typeof window!=='undefined'&&typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('lost-artifacts:money-changed',{
          detail:{reason:'police_transfer_rollback',transaction:null,state:{cash:state.cash,agencyBudget:state.agencyBudget,agencyDebt:state.agencyDebt}}
        }));
      } catch(_) {}
    }
    console.error('[PoliceArtifactTransfer] Transfer failed:',error);
    return {ok:false,reason:'save_failed'};
  } finally {busy=false;}
}
export function openPoliceTransferDialog(manager,contact) {
  const ui=manager.dialogUI;
  if(!ui||ui.destroyed)return;
  const open=(lines,options={})=>{if(!ui.destroyed)ui.open({speaker:'Police Station',portraitKey:'portrait_police',lines},options);};
  const proof=r=>open([
    `${r.name} is in police custody. The transfer confirmation is on your Case Board.`,
    'The agency has authorised an additional $100 for this case. This is a single payment, detective. Not a subscription.'
  ]);
  const errors={
    no_case:'We need an active case and a matching artefact record before arranging a transfer.',
    case_closed:'That operation is closed. We cannot authorise additional pursuit expenses for it.',
    invalid_receipt:'The saved transfer record could not be verified. No additional funds have been authorised.',
    invalid_recovery:'We cannot verify the recovery record. Nothing has been transferred or paid.',
    busy:'The handover is already being processed.',
    case_changed:'That request belongs to another case. Please call again about the current operation.',
    save_failed:'The transfer could not be saved. The handover and the additional budget have been cancelled.'
  };
  const status=getPoliceTransferStatus(manager.gameState);
  if(status.reason==='transferred'){proof(status.receipt);return;}
  if(status.reason==='not_recovered'){
    const existing=manager.resolveEntry('police-station',contact);
    open([...(Array.isArray(existing?.lines)?existing.lines:[]),
      'Once you recover the missing artefact, call us to arrange custody. Confirmed handover authorises $100 in additional agency funds.'
    ]);return;
  }
  if(!status.ok){open([errors[status.reason]||'We cannot arrange that transfer at the moment.']);return;}
  open([
    `We can take custody of ${status.name}. Once the handover is confirmed, your agency will release another $100 for this case.`,
    'The artefact remains registered as recovered. You still have a thief to catch.'
  ],{choices:[
    {text:'Hand over artefact / +$100',callback:()=>{
      const result=transferArtifactToPolice(status.caseKey);
      if(result.ok||result.reason==='transferred')proof(result.receipt);
      else open([errors[result.reason]||'The transfer could not be completed.']);
    }},
    {text:'Not now',callback:()=>{}}
  ]});
}
