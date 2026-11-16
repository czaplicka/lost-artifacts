import { gameState } from '../GameData.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';

export const INFORMANT_HAIR_PRICE = 150;
const HAIR = new Map(['Black','Brown','Blonde','Red','Gray','Grey','White','Bald'].map(v=>[v.toLowerCase(),v]));
let busy = false;
export function informantCaseKey(state) {
  if (!state?.currentMission || state._createdAt == null || state.currentCaseId == null) return null;
  const missionId=state.currentMission.id ?? state.currentMission.missionId;
  if (missionId == null) return null;
  return JSON.stringify([state._createdAt,state.currentCaseId,String(missionId),state.investigationStartTime??null]);
}
export function getInformantHairReceipt(state) {
  const key=informantCaseKey(state), r=state?.caseData?.informantHairPurchases?.[key];
  return key && r?.version===1 && r.caseKey===key && r.paid===true && r.cost===INFORMANT_HAIR_PRICE &&
    r.source==='agency' && typeof r.value==='string' && HAIR.has(r.value.toLowerCase()) && typeof r.clueId==='string' ? r : null;
}
function canonicalHair(state,database) {
  const ids=[state.actualCriminalId,state.currentThiefId,state.currentThief?.id]
    .filter(id=>typeof id==='string'&&id.trim());
  if (!ids.length || new Set(ids).size!==1 || !Array.isArray(database)) return null;
  const record=database.find(p=>p?.id===ids[0]);
  if (!record || typeof record.hair!=='string') return null;
  return HAIR.get(record.hair.trim().toLowerCase()) || null;
}
export function getInformantHairOffer(state,database) {
  const caseKey=informantCaseKey(state);
  const result=(reason,extra={})=>({ok:reason==='available',reason,caseKey,cost:INFORMANT_HAIR_PRICE,...extra});
  if (!caseKey) return result('no_case');
  const receipt=getInformantHairReceipt(state);
  if (receipt) return result('purchased',{value:receipt.value,receipt});
  if (state.caseData?.informantHairPurchases?.[caseKey]!=null) return result('invalid_receipt');
  if (state.caseFailed || state.caseResolved) return result('case_closed');
  if (busy) return result('busy');
  const clock=getCaseClockStatus(state);
  if (clock.valid && (clock.totalExpired || clock.remainingSeconds<=0)) return result('expired');
  const missionId=String(state.currentMission.id??state.currentMission.missionId);
  const apartment=state.apartmentProgress?.[missionId];
  if (!apartment || !(apartment.inventoryVersion===2 || apartment.updatedAt)) return result('not_ready');
  const value=canonicalHair(state,database);
  if (!value) return result('missing_profile');
  const known=(Array.isArray(state.cluesCollected)?state.cluesCollected:[]).some(c=>{
    if (!['hair','hair_color'].includes(c?.category) || typeof c.value!=='string') return false;
    if (c.campaignId!=null && c.campaignId!==state._createdAt) return false;
    if (c.caseId!=null && String(c.caseId)!==String(state.currentCaseId)) return false;
    if (c.missionId!=null && String(c.missionId)!==missionId) return false;
    const scoped=c.caseId!=null||c.missionId!=null||c.caseKey===caseKey;
    return scoped && c.value.trim().toLowerCase()===value.toLowerCase();
  });
  return known ? result('already_known') : result('available');
}
function makeClue(state,receipt) {
  return {
    id:receipt.clueId,type:'suspect',category:'hair',key:'hair',value:receipt.value,
    label:'Hair colour',text:`The informant reports the fugitive's hair colour: ${receipt.value}.`,
    source:'paid_informant',sourceLabel:'Informant',npcId:'informant',
    caseId:state.currentCaseId,campaignId:state._createdAt,
    missionId:String(state.currentMission.id??state.currentMission.missionId),caseKey:receipt.caseKey
  };
}
function replaceClues(state,clues) {
  if (typeof state.replaceIndexedCollection==='function') {
    if (state.replaceIndexedCollection('cluesCollected',clues)!==true) throw Error('clue_failed');
  } else if (typeof state.updateState==='function') {
    if (state.updateState({cluesCollected:clues})===false) throw Error('clue_failed');
  } else state.cluesCollected=clues;
}
export function buyInformantHair(expectedCaseKey,database) {
  const state=gameState, offer=getInformantHairOffer(state,database);
  if (!offer.ok) return offer;
  if (!expectedCaseKey || offer.caseKey!==expectedCaseKey) return {ok:false,reason:'case_changed'};
  if (!moneyManager.canAfford(INFORMANT_HAIR_PRICE,MONEY_SOURCE.AGENCY)) return {ok:false,reason:'insufficient_funds'};
  busy=true;
  let previous;
  try {
    previous=Object.fromEntries(['caseData','cluesCollected','agencyBudget','cash','agencyDebt','moneyLog'].map(k=>[k,structuredClone(state[k])]));
    previous.cluesCollected=Array.isArray(previous.cluesCollected)?previous.cluesCollected:[];
    const receipt={version:1,paid:true,caseKey:offer.caseKey,cost:INFORMANT_HAIR_PRICE,source:'agency',
      value:canonicalHair(state,database),clueId:`informant_hair_${encodeURIComponent(offer.caseKey)}`};
    state.caseData={...(state.caseData||{}),informantHairPurchases:{...(state.caseData?.informantHairPurchases||{}),[offer.caseKey]:receipt}};
    const clue=makeClue(state,receipt);
    replaceClues(state,[...(Array.isArray(state.cluesCollected)?state.cluesCollected:[]).filter(c=>c?.id!==clue.id),clue]);
    const payment=moneyManager.spend(INFORMANT_HAIR_PRICE,{
      source:MONEY_SOURCE.AGENCY,category:ECONOMY_CATEGORY.INFORMANT,
      description:'Informant: hair colour',missionId:state.currentMission.id??state.currentMission.missionId,
      metadata:{informantHair:true,caseKey:offer.caseKey}
    });
    if (!payment.ok) throw Error('payment_failed');
    requestAutosave();
    if (flushAutosave()!==true) throw Error('save_failed');
    return {ok:true,reason:'purchased',value:receipt.value};
  } catch(error) {
    if (previous) {
      if (typeof state.updateState==='function') state.updateState(previous);
      else Object.assign(state,previous);
      try {requestAutosave();flushAutosave();} catch(_) {}
      try {
        if (typeof window!=='undefined' && typeof CustomEvent!=='undefined') window.dispatchEvent(new CustomEvent('lost-artifacts:money-changed',{
          detail:{reason:'informant_rollback',transaction:null,state:{cash:state.cash,agencyBudget:state.agencyBudget,agencyDebt:state.agencyDebt}}
        }));
      } catch(_) {}
    }
    console.error('[InformantHair] Purchase failed:',error);
    return {ok:false,reason:error.message==='payment_failed'?'insufficient_funds':'save_failed'};
  } finally {busy=false;}
}
export function openInformantHairDialog(manager) {
  const ui=manager.dialogUI;
  if (!ui || ui.destroyed) return;
  const database=()=>manager.scene?.cache?.json?.get('suspects');
  const open=(lines,options={})=>{if(!ui.destroyed)ui.open({speaker:'Informant',portraitKey:'portrait_informant',lines},options);};
  const report=value=>open([
    `Hair colour: ${value}. That's what my contact saw. For another hundred, I'll describe the lighting.`,
    'Relax. You already paid for this information. Check your notes.'
  ]);
  const offer=getInformantHairOffer(manager.gameState,database());
  if (offer.reason==='purchased') {report(offer.value);return;}
  const failures={
    no_case:'No case, no information. Call me when you have an actual fugitive.',
    not_ready:'Search the apartment first. Then we can discuss the person who left it.',
    case_closed:'That case is over. My information is expensive, not historical.',
    expired:'Too late for this one. I sell information, not time machines.',
    already_known:'You already have that information. Charging you again would be unprofessional. Tempting, though.',
    missing_profile:'Nothing reliable to sell you right now. Keep your money.',
    invalid_receipt:'There is a problem with the saved purchase record. No payment has been taken.',
    busy:'One transaction at a time.',
    insufficient_funds:'Agency funds. $150. I do not accept promises, exposure, or your personal shopping money.',
    case_changed:'That price was for another case. Call again about the current one.',
    save_failed:'The purchase could not be saved. The payment and information have been cancelled.'
  };
  if (!offer.ok) {open([failures[offer.reason]||'Nothing to sell right now.']);return;}
  open([
    "I've got a description of the fugitive's hair. $150 from the agency budget. One fact, not a name.",
    'Interested?'
  ],{choices:[
    {text:'Buy information - $150',callback:()=>{
      const result=buyInformantHair(offer.caseKey,database());
      if (result.ok || result.reason==='purchased') report(result.value);
      else open([failures[result.reason]||'The deal could not be completed.']);
    }},
    {text:'Not now',callback:()=>{}}
  ]});
}
