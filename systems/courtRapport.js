import { COURT_CONFIG,buildCourtFacts as buildBaseFacts,createCourtRecord as createBaseRecord,
 answerCourtQuestion,advanceCourt,validCourt as validBaseCourt } from './courtLogic.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';
import { getMotiveById } from '../motiveService.js';
import { captureInvestigationAudit,buildInvestigationChallenges,investigationQuestions } from './InvestigationAudit.js';
export { COURT_CONFIG,answerCourtQuestion,advanceCourt };
const clamp=value=>Math.max(0,Math.min(100,value));
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
function readBonus(facts){
 const bonus=facts?.courtRapportBonus;if(bonus===undefined)return 0;
 if(!Number.isInteger(bonus)||bonus<0||bonus>16||bonus%2!==0)throw new Error('Invalid saved court rapport bonus.');return bonus;
}
function validateChallenges(facts){
 if(facts.investigationChallengeVersion===undefined)return;
 if(facts.investigationChallengeVersion!==1||!Array.isArray(facts.investigationChallenges))throw new Error('Unsupported investigation challenge record.');
 const ids=new Set();
 for(const c of facts.investigationChallenges){
  if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||!same(c.caseId,facts.caseId)||c.campaignId!==facts.campaignId||
   !['procedure','heist','case_theory','alibi','support'].includes(c.category)||
   !['corrected','documented','unresolved','breach'].includes(c.resolution)||
   !Number.isInteger(c.severity)||c.severity<1||c.severity>25||
   !Number.isInteger(c.occurrences)||c.occurrences<1||!Array.isArray(c.sourceEventIds)||!c.sourceEventIds.length||
   c.sourceEventIds.some(id=>typeof id!=='string'||!id)||
   ['claim','counter','reply'].some(k=>typeof c[k]!=='string'||!c[k].trim()))throw new Error('Invalid investigation challenge.');
  ids.add(c.id);
 }
}
export function buildCourtFacts(state,suspectId){
 captureInvestigationAudit(state);const facts=buildBaseFacts(state,suspectId);
 const stats=getEffectiveStats({profile:state.detectiveProfile||'analyst',stats:state.detectiveStats||{}});
 const raw=Number(stats.rapport),rapport=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
 const motive=getMotiveById(state.caseData?.motiveId),labels={};
 for(const event of state.caseData?.investigationAudit?.events||[]){
  const id=event.payload?.sections?.motive?.answerId??event.payload?.selection?.guessId;
  if(id){const known=getMotiveById(id);if(known?.crimeBoard?.label)labels[id]=known.crimeBoard.label;}
 }
 if(motive?.crimeBoard?.answerId)labels[motive.crimeBoard.answerId]=motive.crimeBoard.label;
 const challenges=buildInvestigationChallenges(state,{motiveAnswerId:motive?.crimeBoard?.answerId??null,motiveLabels:labels});
 return {...facts,incidents:[],courtRapport:rapport,courtRapportBonus:Math.min(16,rapport*2),
  investigationChallengeVersion:1,investigationChallenges:challenges};
}
export function createCourtRecord(facts){
 validateChallenges(facts);const record=createBaseRecord(facts);
 record.trust=clamp(COURT_CONFIG.initialTrust+readBonus(facts));
 if(facts.investigationChallengeVersion===1)record.questions.push(...investigationQuestions(facts.investigationChallenges));
 return record;
}
export function validCourt(record,state,suspectId=null){
 try{
  if(!record||!state||!record.facts||!Array.isArray(record.answers)||!Array.isArray(record.questions)||
   record.answers.length>record.questions.length||(record.resultCommitted!==undefined&&typeof record.resultCommitted!=='boolean')||
   (record.resultCommitted===true&&record.phase!=='verdict'))return false;
  readBonus(record.facts);validateChallenges(record.facts);
  // Validate ordinary case/warrant/campaign facts with the unchanged core validator.
  const base=createBaseRecord(record.facts);if(!validBaseCourt(base,state,suspectId))return false;
  const replay=createCourtRecord(record.facts);
  if(JSON.stringify(record.questions)!==JSON.stringify(replay.questions))return false;
  for(let i=0;i<record.answers.length;i++){
   const saved=record.answers[i];if(!saved||!answerCourtQuestion(replay,saved.answerIndex))return false;
   const actual=replay.answers[replay.answers.length-1];
   if(saved.questionId!==actual.questionId||saved.delta!==actual.delta||saved.trust!==actual.trust)return false;
   if(i<record.answers.length-1||record.phase!=='feedback'){if(!advanceCourt(replay))return false;}
  }
  return ['version','caseId','campaignId','suspectId','questions','index','trust','identityExposed','phase','feedback','answers','verdict']
   .every(key=>JSON.stringify(record[key])===JSON.stringify(replay[key]));
 }catch{return false;}
}