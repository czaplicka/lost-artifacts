import * as court from './FinalCaseCourt.js';

const NO_LIAR='__no_liar__';
const list=x=>Array.isArray(x)?x:[];
const txt=x=>typeof x==='string'?x.trim():'';
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const copy=x=>JSON.parse(JSON.stringify(x));
const inScope=(r,state)=>!!r&&(r.caseId==null||same(r.caseId,state.currentCaseId))&&(r.campaignId==null||r.campaignId===state._createdAt);
const setEqual=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const RULES=[['host','place'],['room','place'],['departure','time'],['arrival','time'],['date','time'],['duration','time'],['arrival','attendance'],['host','identity'],['date','time'],['room','place'],['host','identity'],['departure','time']];
const REASONS={time:'the time or date',place:'physical location',identity:'which person was present',attendance:'whether a record proves actual attendance'};
const publicName=(s,fallback)=>txt(s)&&!/[\\/_]/.test(s)?txt(s):fallback;

function correctClaim(subject,filed){
 if(!filed?.locked)return false;
 return filed.choice===NO_LIAR?subject.alibiType==='confirmed':subject.alibiType==='contradicted'&&
  list(subject.witnesses).some(w=>w.isLiar===true&&same(w.npcId,filed.choice));
}
function chronological(subject,ids){
 const cards=list(subject.boardCards);
 if(cards.length!==3||new Set(cards.map(c=>c?.id)).size!==3||!setEqual(ids,cards.map(c=>c.id)))return false;
 const minutes=ids.map(id=>cards.find(c=>c.id===id)?.minute);
 return minutes.every(Number.isInteger)&&minutes.every((n,i)=>i===0||n>=minutes[i-1]);
}
function sourceRecords(subject,filed){
 const witnesses=list(subject.witnesses);
 return list(filed.evidence?.sources).filter(s=>s&&witnesses.some(w=>same(w.npcId,s.npcId))&&txt(s.statement))
  .map(s=>({npcId:String(s.npcId),role:publicName(s.role,'Witness'),statement:txt(s.statement),cardId:s.cardId??null,minute:Number.isInteger(s.minute)?s.minute:null}));
}
function validComparison(subject,filed,sources){
 const c=filed.evidence?.comparison,m=String(subject.scenarioId||'').match(/^personal_.+_false_(0|[1-9]|10|11)$/),rule=m?RULES[Number(m[1])]:null;
 const target=sources.find(s=>same(s.npcId,filed.choice)),proof=sources.find(s=>same(s.npcId,c?.evidence?.npcId));
 if(!c||!rule||!target||!proof||same(target.npcId,proof.npcId)||!same(c.statement?.npcId,filed.choice)||
  txt(c.statement.statement)!==target.statement||txt(c.evidence.statement)!==proof.statement||c.topic!==rule[0]||c.reason!==rule[1])return null;
 return {statement:copy(target),evidence:copy(proof),topic:c.topic,reason:c.reason};
}
function validConfirmation(subject,filed,sources){
 const c=filed.evidence?.confirmation,w=subject.crimeWindow;
 return !!(c&&w&&c.basis==='continuous_observation'&&setEqual(c.witnessIds,list(subject.witnesses).map(w=>w.npcId))&&
  c.crimeWindow?.day===w.day&&c.crimeWindow?.startMinute===w.startMinute&&c.crimeWindow?.endMinute===w.endMinute&&sources.length===3);
}
export function assessFiledAlibiForCourt(subject,state){
 const name=publicName(subject?.suspectName,'The alibi subject'),filed=subject?.playerConclusion;
 const empty={subjectId:String(subject?.suspectId||''),name,legacy:false,exists:false,claimCorrect:false,timelineCorrect:false,
  documented:false,sound:false,choice:null,chosenRole:'the selected witness',status:null,sources:[],comparison:null,
  retraction:null,risky:false,riskReasons:[],issues:[{code:'missing_filing',text:'No final alibi conclusion was filed.'}]};
 if(!subject||!filed?.locked||!inScope(filed,state))return empty;
 const claimCorrect=correctClaim(subject,filed),timelineCorrect=chronological(subject,filed.timelineIds);
 const legacy=filed.version===1||filed.version==null;
 const base={...empty,exists:true,legacy,choice:filed.choice??null,status:filed.status??null,
  chosenRole:publicName(list(subject.witnesses).find(w=>same(w.npcId,filed.choice))?.role,'the selected witness'),
  claimCorrect,timelineCorrect,issues:[]};
 if(legacy){
  if(!claimCorrect)base.issues.push({code:'incorrect_claim',text:'The filed alibi conclusion does not match the case evidence.'});
  if(!timelineCorrect)base.issues.push({code:'incorrect_timeline',text:'The filed alibi timeline is not supported.'});
  return {...base,sound:claimCorrect&&timelineCorrect};
 }
 const sources=sourceRecords(subject,filed),witnesses=list(subject.witnesses),expectedIds=witnesses.map(w=>String(w.npcId));
 const complete=sources.length===3&&new Set(sources.map(s=>s.npcId)).size===3&&setEqual(sources.map(s=>s.npcId),expectedIds);
 const sourceByCard=new Map(sources.map(s=>[s.cardId,s]));
 const snapshotTimeline=list(filed.evidence?.timeline);
 const trackedTimeline=snapshotTimeline.length===3&&setEqual(snapshotTimeline.map(c=>c.id),list(filed.timelineIds))&&
  snapshotTimeline.every(c=>c.detailsKnown===true&&Number.isInteger(c.minute)&&sourceByCard.get(c.id)?.minute===c.minute);
 const comparison=filed.choice===NO_LIAR?null:validComparison(subject,filed,sources);
 const confirmation=filed.choice===NO_LIAR&&validConfirmation(subject,filed,sources);
 const statusConsistent=filed.status===(filed.choice===NO_LIAR?'confirmed':'contradicted');
 const documented=filed.version===2&&statusConsistent&&complete&&trackedTimeline&&timelineCorrect&&!!(comparison||confirmation);
 const issues=[];
 if(filed.version!==2)issues.push({code:'unsupported_record',text:'The filed alibi evidence uses an unsupported record format.'});
 if(!statusConsistent)issues.push({code:'inconsistent_claim',text:'The recorded conclusion label conflicts with its selected witness finding.'});
 if(!complete)issues.push({code:'missing_sources',text:'Not all three detailed witness accounts were attached.'});
 if(!timelineCorrect||!trackedTimeline)issues.push({code:'unsupported_timeline',text:'The submitted timeline lacks a consistent, documented sequence.'});
 if(filed.choice===NO_LIAR&&!confirmation)issues.push({code:'missing_confirmation',text:'The claimed alibi has no recorded basis covering the theft window.'});
 if(filed.choice!==NO_LIAR&&!comparison)issues.push({code:'missing_comparison',text:'No valid comparison supports the selected witness challenge.'});
 if(!claimCorrect)issues.push({code:'incorrect_claim',text:'The filed alibi conclusion contradicts the case evidence.'});
 const risky=filed.evidenceStatus==='risky'||filed.evidence?.riskAccepted===true;
 return {...base,sources,comparison,documented,sound:documented&&claimCorrect,risky,
  retraction:comparison?txt(filed.evidence?.retraction)||null:null,
  riskReasons:list(filed.evidence?.riskReasons).filter(s=>txt(s)).map(txt),issues};
}

export function attachAlibiCourtAssessment(facts,state,context){
 const data=state.caseData?.alibiCases?.[context.theoryKey];
 const subjects=inScope(data,state)?list(data.suspects):[];
 const ids=list(context.actualIds).map(String);
 const candidates=subjects.filter(s=>ids.includes(String(s?.suspectId)));
 const primary=subjects.find(s=>same(s?.suspectId,context.aliasId))||(candidates.length===1?candidates[0]:null);
 const rows=subjects.map(s=>({...assessFiledAlibiForCourt(s,state),primary:s===primary}));
 const primaryRow=rows.find(r=>r.primary),alternatives=rows.filter(r=>!r.primary);
 const alternativeCleared=!!primary&&alternatives.length>0&&alternatives.every(r=>
  r.sound&&r.choice===NO_LIAR&&subjects.find(s=>same(s.suspectId,r.subjectId))?.alibiType==='confirmed');
 const culpritAlibiResolved=!!primaryRow?.sound&&primaryRow.choice!==NO_LIAR&&primary.alibiType==='contradicted';
 const failures=list(facts.caseAssessment?.failures).filter(f=>!['alternative','alibi'].includes(f.key)).map(copy);
 if(!alternativeCleared)failures.push({key:'alternative',message:'The other alibi candidates were not all cleared by supported, filed conclusions.'});
 if(!culpritAlibiResolved)failures.push({key:'alibi',message:'The defendant\'s alias alibi lacks a correct, supported filed conclusion.'});
 return {...facts,alibiCourtVersion:1,alibiCourt:{version:1,rows:copy(rows),missingPrimary:!primary},
  caseAssessment:{...facts.caseAssessment,alternativeCleared,culpritAlibiResolved,
   otherName:alternatives.length?alternatives.map(r=>r.name).join(', '):facts.caseAssessment.otherName,failures}};
}

function shuffled(answers,id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}return answers;}
function question(id,side,text,good,feedback,delta=0,baseDelta=0){
 const answers=[{text:good,delta,feedback},
  {text:'A filed conclusion is proof by itself; the supporting records do not matter.',delta:-6,feedback:'Filing a claim does not turn it into evidence.'},
  {text:'The witness knew the suspect, so their account did not need checking.',delta:-6,feedback:'Familiarity does not establish presence.'},
  {text:'The suspect later fled. That repairs any problem in the alibi investigation.',delta:-6,feedback:'Later flight does not supply missing evidence about the theft window.'}];
 return {id,side,text,answers:shuffled(answers,id),baseDelta,identityExposed:false};
}
const quote=s=>`${s.role}: "${s.statement}"`;
export function buildAlibiCourtQuestions(facts){
 const result=[];
 for(const [i,row] of list(facts.alibiCourt?.rows).entries()){
  // Old saves did not record source snapshots. Do not manufacture missing quotes or new documentation penalties.
  if(row.legacy)continue;
  const prefix=`alibi_evidence_${i}`;
  if(row.primary&&row.sound&&row.comparison){
   const c=row.comparison;
   result.push(question(`${prefix}_sources`,'prosecutor',`Which recorded observations support your alibi challenge concerning ${row.name}?`,
    `I compared ${quote(c.statement)} with ${quote(c.evidence)}. The conflict concerns ${REASONS[c.reason]||'the recorded observations'}.`,
    row.retraction?'The submitted observations and the recorded correction support this part of the investigation.':'The recorded comparison supplies the argument; a confession is not required.',4));
  }
  for(const [j,issue] of list(row.issues).entries()){
   const excerpts=row.sources.slice(0,2).map(quote).join('\n\n');
   const position=row.choice===NO_LIAR?'You filed an alibi confirmation':`You challenged ${row.chosenRole}'s account`;
   result.push(question(`${prefix}_issue_${j}`,'defense',`${position} for ${row.name}. ${issue.text}`+(excerpts?`\n\nYour attached record includes:\n${excerpts}`:''),
    `I acknowledge the limitation in the filed record: ${issue.text} My answer here does not repair the original investigation.`,
    'The limitation remains in the evidence assessment. Acknowledging it avoids an additional false claim.',0,-3));
  }
  if(row.risky){result.push(question(`${prefix}_risk`,'defense',`The record for ${row.name} says you explicitly filed a risky claim.`+
   (row.riskReasons.length?' The recorded gaps were: '+row.riskReasons.join(' '):'')+' Did that warning make the missing evidence unnecessary?',
   'No. I accepted the risk, not the truth of an unsupported conclusion. The recorded gaps remain.',
   'Accepting a warning does not create evidence. The court keeps the original limitations.',0,-2));}
 }
 if(facts.alibiCourt?.missingPrimary)result.push(question('alibi_evidence_missing_subject','defense',
  'Which filed alibi record belongs to the alias linked to this defendant?',
  'The file does not establish that link. I cannot replace the missing record with another candidate\'s alibi.',
  'The missing connection remains a substantive gap.',0,-3));
 return result;
}
function validateSnapshot(facts){
 if(facts.alibiCourtVersion!==1||facts.alibiCourt?.version!==1||!Array.isArray(facts.alibiCourt.rows)||typeof facts.alibiCourt.missingPrimary!=='boolean')throw new Error('Invalid alibi court snapshot.');
 const rows=facts.alibiCourt.rows;
 if(new Set(rows.map(r=>r.subjectId)).size!==rows.length||rows.filter(r=>r.primary).length>1)throw new Error('Duplicate alibi court subject.');
 for(const r of rows){
  if(typeof r.subjectId!=='string'||!r.subjectId||!txt(r.name)||!Array.isArray(r.sources)||!Array.isArray(r.issues)||!Array.isArray(r.riskReasons))throw new Error('Invalid alibi court row.');
  for(const k of ['primary','legacy','exists','claimCorrect','timelineCorrect','documented','sound','risky'])if(typeof r[k]!=='boolean')throw new Error('Invalid alibi finding.');
  for(const s of r.sources)if(!txt(s.npcId)||!txt(s.role)||!txt(s.statement))throw new Error('Invalid source snapshot.');
  for(const issue of r.issues)if(!txt(issue.code)||!txt(issue.text))throw new Error('Invalid alibi issue.');
  if(r.comparison&&(!r.comparison.statement||!r.comparison.evidence||!txt(r.comparison.reason)))throw new Error('Invalid comparison snapshot.');
 }
}
export function createAlibiCourtRecord(facts){
 const record=court.createFinalCourtRecord(facts);
 if(facts.alibiCourtVersion===undefined)return record;
 validateSnapshot(facts);record.questions.push(...buildAlibiCourtQuestions(facts));return record;
}
export const answerAlibiCourtQuestion=(record,index)=>court.answerFinalCourtQuestion(record,index);
export const advanceAlibiCourt=record=>court.advanceFinalCourt(record);
export function validAlibiCourt(record,state,suspectId=null){
 if(record?.facts?.alibiCourtVersion===undefined)return court.validFinalCourt(record,state,suspectId);
 try{
  if(record.version!==3||!same(record.caseId,state?.currentCaseId)||record.campaignId!==state._createdAt||
   (suspectId!=null&&!same(record.suspectId,suspectId))||!same(record.facts.caseId,record.caseId)||
   record.facts.campaignId!==record.campaignId||!same(record.facts.suspectId,record.suspectId)||
   !Array.isArray(record.answers)||typeof record.resultCommitted!=='boolean'||(record.resultCommitted&&record.phase!=='verdict'))return false;
  const replay=createAlibiCourtRecord(record.facts);
  if(JSON.stringify(record.questions)!==JSON.stringify(replay.questions)||record.answers.length>replay.questions.length)return false;
  for(let i=0;i<record.answers.length;i++){
   const saved=record.answers[i];if(!answerAlibiCourtQuestion(replay,saved.answerIndex)||JSON.stringify(replay.answers.at(-1))!==JSON.stringify(saved))return false;
   if(i<record.answers.length-1||record.phase!=='feedback')if(!advanceAlibiCourt(replay))return false;
  }
  return ['index','trust','identityExposed','phase','feedback','answers','verdict','verdictExplanation'].every(k=>JSON.stringify(record[k])===JSON.stringify(replay[k]));
 }catch{return false;}
}
