import { gameState } from '../GameData.js';
import { getAlibiKnowledge } from './AlibiKnowledge.js';
import { NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';
import { getScenarioRule } from './cooperation/AlibiScenarioChallenges.js';

export function copyAlibiData(value) {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  const seen = new WeakMap();
  function clone(item) {
    if (item === null || typeof item !== 'object') {
      if (typeof item === 'function' || typeof item === 'symbol') throw new TypeError('Unsupported alibi save value.');
      return item;
    }
    if (seen.has(item)) return seen.get(item);
    const proto = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && proto !== Object.prototype && proto !== null) throw new TypeError('Expected plain alibi save data.');
    const result = Array.isArray(item) ? new Array(item.length) : Object.create(proto);
    seen.set(item, result);
    for (const key of Object.keys(item)) Object.defineProperty(result, key, {
      value: clone(item[key]), enumerable: true, writable: true, configurable: true
    });
    return result;
  }
  return clone(value);
}
const copy = copyAlibiData;
export function getStoredAlibiSubject(caseKey,suspectId,state=gameState) {
  return state.caseData?.alibiCases?.[caseKey]?.suspects?.find(s=>s.suspectId===suspectId)||null;
}
export function getAlibiSourceRecords(caseKey,suspectId,state=gameState) {
  const data=getStoredAlibiSubject(caseKey,suspectId,state);
  return (Array.isArray(data?.witnesses)?data.witnesses:[]).filter(w=>getAlibiKnowledge(caseKey,w.npcId,state).details)
    .map(w=>({npcId:w.npcId,role:w.role||'Witness',statement:String(w.statement||''),
      cardId:w.timelineCard?.id||null,minute:Number.isInteger(w.timelineCard?.minute)?w.timelineCard.minute:null}));
}
export function validAlibiTimeline(data,ids) {
  const cards=data?.boardCards;
  return Array.isArray(cards)&&cards.length===3&&cards.every(c=>c&&typeof c.id==='string'&&c.id.length>0)&&new Set(cards.map(c=>c.id)).size===3&&
    Array.isArray(ids)&&ids.length===3&&new Set(ids).size===3&&ids.every(id=>cards.some(c=>c.id===id));
}
export function orderedAlibiTimeline(data,ids) {
  if(!validAlibiTimeline(data,ids))return false;
  const minutes=ids.map(id=>data.boardCards.find(c=>c.id===id).minute);
  return minutes.every(Number.isInteger)&&minutes.every((n,i)=>i===0||n>=minutes[i-1]);
}
function sameSet(a,b){return Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));}
function supportedComparison(caseKey,data,choice,bundle,records,state){
  if(!bundle||!bundle.statement||!bundle.evidence)return null;
  // Scenarios 8-11 deliberately reuse categories, not witness accounts.
  // Share the authored mapping with witness confrontation; do not deduplicate
  // scenario indices or maintain a second copy of the rule table here.
  const target=data.witnesses.find(w=>w.npcId===choice),rule=getScenarioRule(data);
  const statement=records.find(r=>r.npcId===choice),proof=records.find(r=>r.npcId===bundle.evidence.id);
  if(target?.isLiar!==true||!rule||!statement||!proof||proof.npcId===choice||
    bundle.statement.id!==choice||bundle.reason!==rule.reason||bundle.topic!==rule.topic||
    String(bundle.statement.quote||'').trim()!==statement.statement.trim()||
    String(bundle.evidence.quote||'').trim()!==proof.statement.trim())return null;
  return {statement:copy(statement),evidence:copy(proof),reason:bundle.reason,topic:bundle.topic};
}
export function assessAlibiConclusion(caseKey,suspectId,ids,choice,options={},state=gameState) {
  options=options&&typeof options==='object'?options:{};
  const data=getStoredAlibiSubject(caseKey,suspectId,state),records=getAlibiSourceRecords(caseKey,suspectId,state);
  const reasons=[];
  const uniqueWitnesses=Array.isArray(data?.witnesses)&&data.witnesses.length===3&&new Set(data.witnesses.map(w=>w.npcId)).size===3;
  if(!uniqueWitnesses)return {documented:false,reasons:['The witness set is incomplete.'],sources:records,comparison:null,confirmation:null};
  const allDetails=records.length===3;
  if(!allDetails)reasons.push('Not all three detailed witness accounts were obtained.');
  const timelineOrdered=allDetails&&orderedAlibiTimeline(data,ids);
  if(allDetails&&!timelineOrdered)reasons.push('The proposed timeline is incomplete or not in chronological order.');
  let comparison=null,confirmation=null;
  if(choice===NO_ALIBI_LIAR){
    const input=options.confirmation,w=data.crimeWindow;
    if(input?.basis==='continuous_observation'&&allDetails&&
      sameSet(input.witnessIds,data.witnesses.map(w=>w.npcId))&&w&&
      input.crimeWindow?.day===w.day&&input.crimeWindow?.startMinute===w.startMinute&&input.crimeWindow?.endMinute===w.endMinute){
      confirmation={basis:input.basis,witnessIds:[...input.witnessIds],crimeWindow:copy(w)};
    }else reasons.push('No explicit comparison of all three observations with the theft window is attached.');
  }else{
    const encounter=(state.crimeCityEncounterState?.[caseKey]||[]).find(e=>e.alibiWitness===true&&e.suspectId===suspectId&&e.npcId===choice);
    const cooperation=state.caseData?.alibiCases?.[caseKey]?.cooperation?.[encounter?.id];
    for(const bundle of [cooperation?.correctedEvidence,cooperation?.activeEvidence]){
      comparison=supportedComparison(caseKey,data,choice,bundle,records,state);if(comparison)break;
    }
    if(!comparison)reasons.push('No current, recorded comparison is attached to the selected witness.');
  }
  return {documented:allDetails&&timelineOrdered&&!!(comparison||confirmation),reasons,sources:records,comparison,confirmation,
    retraction:comparison?state.caseData?.alibiCases?.[caseKey]?.cooperation?.[
      (state.crimeCityEncounterState?.[caseKey]||[]).find(e=>e.suspectId===suspectId&&e.npcId===choice&&e.alibiWitness===true)?.id
    ]?.revisedStatement||null:null};
}
export function getAlibiEvidenceDossier(caseKey,suspectId,state=gameState) {
  const filed=getStoredAlibiSubject(caseKey,suspectId,state)?.playerConclusion;
  if(!filed?.locked)return null;
  // Public allowlist: never include the internal correctness evaluation.
  return copy({version:filed.version,status:filed.status,choice:filed.choice,timelineIds:filed.timelineIds||[],
    evidenceStatus:filed.evidenceStatus||'legacy_unverified',filedAt:filed.filedAt||null,evidence:filed.evidence||null});
}
export function getAlibiCourtRecord(caseKey,suspectId,state=gameState) {
  // Compatibility export, safe even if a future UI imports it before verdict.
  // Court assessment reads the internal saved subject through its own rules.
  const dossier=getAlibiEvidenceDossier(caseKey,suspectId,state);
  return dossier?{...dossier,locked:true}:null;
}
