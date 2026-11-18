import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {Worker,isMainThread,workerData,parentPort} from 'node:worker_threads';
import * as Module from 'node:module';
const REQUIRED=['alibi/AlibiWitnessData.js','alibi/AlibiCooperation.js','alibi/AlibiKnowledge.js','alibi/AlibiEncounterSetup.js',
 'alibi/AlibiConclusion.js','alibi/AlibiConclusionEvidence.js','alibi/cooperation/AlibiEvidence.js','systems/AlibiCourtEvidence.js',
 'systems/FinalCaseCourt.js','systems/courtRapport.js','assets/data/dialogue/extracted.json'];
const RULES=[['host','place'],['room','place'],['departure','time'],['arrival','time'],['date','time'],['duration','time'],['arrival','attendance'],['host','identity'],['date','time'],['room','place'],['host','identity'],['departure','time']];
const NO='__no_liar__',clone=x=>structuredClone(x);
const LIMITATIONS=[
 'Real local alibi modules and real FinalCaseCourt.js are executed.',
 'Game state, persistence, events, effective stats, suspect lookup and progression use isolated adapters.',
 'Dialogue text is read from the real local extracted.json catalog.',
 'Non-alibi trial facts are a clean fixture; full world evidence collection and courtRapport.buildCourtFacts are not executed.',
 'No Phaser rendering, browser storage, audio, actual XP persistence or court UI is tested.',
 'Project .js files are classified as ESM only inside the test worker; package.json and game files are not modified.'
];
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
async function main(){
 const project=path.resolve(arg('--root')||fileURLToPath(new URL('../',import.meta.url)));
 const reportPath=path.resolve(arg('--report')||path.join(project,'reports','alibi-integration.json'));
 const initial={runnerVersion:2,project,startedAt:new Date().toISOString(),passed:false,limitations:LIMITATIONS};
 const save=report=>{fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));};
 try{
  if(typeof Module.register!=='function')throw new Error('This test requires Node with module.register support.');
  const loader=new URL('./alibi-integration-loader.mjs',import.meta.url);
  if(!fs.existsSync(fileURLToPath(loader)))throw new Error('Copy both files from scripts: the integration runner and alibi-integration-loader.mjs.');
  const missing=REQUIRED.filter(f=>!fs.existsSync(path.join(project,f)));
  if(missing.length){const report={...initial,status:'blocked',missing,message:'Install the previous complete alibi/evidence/court packages first.'};save(report);
   console.error(report.message);for(const name of missing)console.error('MISSING: '+name);process.exitCode=2;return;}
  if(!fs.readFileSync(path.join(project,'systems/courtRapport.js'),'utf8').includes('AlibiCourtEvidence.js'))throw new Error('courtRapport.js is not wired to AlibiCourtEvidence.js.');
  const catalog=JSON.parse(fs.readFileSync(path.join(project,'assets/data/dialogue/extracted.json'),'utf8'));
  if(catalog?.version!==1||!catalog.sources||typeof catalog.sources!=='object')throw new Error('Invalid local dialogue catalog.');
  const result=await new Promise((resolve,reject)=>{
   let done=false;const worker=new Worker(new URL(import.meta.url),{workerData:{project}});
   const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Integration tests timed out after 120 seconds.'));},120000);
   worker.on('message',m=>{if(m.type==='result'){done=true;clearTimeout(timeout);resolve(m.report);}});
   worker.on('error',e=>{clearTimeout(timeout);reject(e);});
   worker.on('exit',code=>{if(!done){clearTimeout(timeout);reject(new Error('Test worker exited without a result: '+code));}});
  });
  const report={...initial,...result,finishedAt:new Date().toISOString()};save(report);console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }catch(error){const report={...initial,status:'failed',error:error.stack||String(error),finishedAt:new Date().toISOString()};
  try{save(report);}catch(e){console.error('Cannot save report: '+e.message);}console.error(report.error);process.exitCode=1;}
}
async function integration(project){
 globalThis.__ALIBI_INTEGRATION__={state:{},saves:0,autosaves:0,saved:null,rewards:new Set(),events:[]};
 Module.register(new URL('./alibi-integration-loader.mjs',import.meta.url),{data:{project}});
 const load=p=>import(pathToFileURL(path.join(project,p)).href);
 const [generator,interview,encounters,filing,trial,core]=await Promise.all([
  load('alibi/AlibiWitnessData.js'),load('alibi/AlibiCooperation.js'),load('alibi/AlibiEncounterSetup.js'),
  load('alibi/AlibiConclusion.js'),load('systems/AlibiCourtEvidence.js'),load('systems/FinalCaseCourt.js')]);
 for(const [api,names] of [[interview,['getEvidenceOptions','challengeWitness','followUpChallenge']],
  [filing,['fileAlibiConclusion','getAlibiEvidenceDossier']],[trial,['attachAlibiCourtAssessment','createAlibiCourtRecord','validAlibiCourt']]])
  for(const name of names)assert.equal(typeof api[name],'function','Missing production export '+name);
 const env=globalThis.__ALIBI_INTEGRATION__,state=env.state,window={day:3,startMinute:720,endMinute:765};
 const pattern=s=>Number(s.scenarioId.split('_').at(-1));
 function generated(id,seed,thief){return generator.generateAlibiWitnesses({id,name:thief?'Suspect alias':'Other candidate',occupation:'Museum assistant',hiddenCaseData:{isTrueThief:thief,isForensicTwin:!thief}},seed,window);}
 const falseFixtures=new Map(),trueFixtures=new Map(),altFixtures=new Map(),usedTrue=new Set();
 for(let i=0;i<5000&&(falseFixtures.size<12||trueFixtures.size<6);i++){
  const bad=generated('primary','integration-seed-'+i,true),good=generated('alternative','integration-seed-'+i,false);
  if(!falseFixtures.has(pattern(bad)))falseFixtures.set(pattern(bad),bad);if(!trueFixtures.has(pattern(good)))trueFixtures.set(pattern(good),good);
 }
 assert.equal(falseFixtures.size,12,'Generator does not cover all 12 false-alibi patterns.');assert.equal(trueFixtures.size,6,'Generator does not cover all 6 true-alibi patterns.');
 function alternative(id,wanted){const key=id+':'+wanted;if(altFixtures.has(key))return clone(altFixtures.get(key));
  for(let i=0;i<2000;i++){const c=generated(id,'alternative-pattern-'+wanted+'-'+i,false);if(pattern(c)===wanted){altFixtures.set(key,c);return clone(c);}}
  throw new Error('Could not generate innocent pattern '+wanted+' for '+id);}
 let assertions=0,replayStates=0;const check=(value,message)=>{assert.ok(value,message);assertions++;};
 function install(p,count){
  for(const key of Object.keys(state))delete state[key];env.saves=0;env.autosaves=0;env.saved=null;env.rewards.clear();env.events=[];
  const subjects=[clone(falseFixtures.get(p))];for(let i=1;i<count;i++){const s=alternative('alternative'+i,(p+i-1)%6);subjects.push(s);usedTrue.add(pattern(s));}
  const caseKey='integration_case';const witnesses=subjects.flatMap(s=>s.witnesses.map((w,i)=>({id:s.suspectId+'_encounter_'+i,npcId:w.npcId,suspectId:s.suspectId,alibiWitness:true,interviewed:false,dialogueCompleted:false,portraitKey:w.portraitKey,textureKey:w.textureKey})));
  Object.assign(state,{currentCaseId:'integration-'+p,_createdAt:'integration-campaign',detectiveProfile:'analyst',detectiveStats:{rapport:0},timeSpent:0,
   caseSuspects:subjects.map((s,i)=>({id:s.suspectId,name:s.suspectName,hiddenCaseData:{isTrueThief:i===0,isForensicTwin:i!==0},deductionState:{}})),
   caseData:{crimeWindow:clone(window),alibiCases:{[caseKey]:{caseId:'integration-'+p,campaignId:'integration-campaign',suspects:subjects,cooperation:{}}}},crimeCityEncounterState:{[caseKey]:witnesses}});
  return {caseKey,subjects,witnesses,primary:subjects[0]};
 }
 function talk(c){for(const e of c.witnesses){interview.askWitness(c.caseKey,e.id,'statement');const personality=interview.getWitnessPersonality(c.caseKey,e.id);
  interview.applyApproach(c.caseKey,e.id,personality.likes);interview.askWitness(c.caseKey,e.id,'summary');
  check(encounters.markAlibiWitnessInterviewed(c.caseKey,e.id)===true,'Visit could not be recorded.');check(interview.getInterviewView(c.caseKey,e.id).detailsKnown===true,'Detailed account missing.');}}
 function selection(c){const liar=c.primary.witnesses.find(w=>w.isLiar===true),e=c.witnesses.find(e=>e.npcId===liar.npcId),o=interview.getEvidenceOptions(c.caseKey,e.id);
  check(o.statement?.id===liar.npcId,'Wrong selected public statement.');check(o.evidence.length===2,'Expected two obtained supporting accounts.');
  return {e,input:{statementId:o.statement.id,evidenceId:o.evidence[0].id,reason:RULES[pattern(c.primary)][1]}};}
 function compare(c,retract){const {e,input}=selection(c);check(!!interview.challengeWitness(c.caseKey,e.id,input),'Comparison rejected.');let saved=interview.getCooperationState(c.caseKey,e.id);
  if(retract){let guard=0;while(!saved.revisedStatement&&guard++<8){if(!saved.pendingChallenge)interview.challengeWitness(c.caseKey,e.id,input);
   const thread=saved.confrontations[saved.pendingChallenge];check(!!thread,'Cannot resume confrontation.');interview.followUpChallenge(c.caseKey,e.id,thread.modes[Math.min(thread.stage,1)]);saved=interview.getCooperationState(c.caseKey,e.id);}
   check(!!saved.revisedStatement,'Correct conversation did not produce a retraction.');
  }else check(!saved.revisedStatement,'A retraction was invented before the witness answered.');
 }
 function fileAll(c){for(const s of c.subjects){const cards=encounters.getTimelineBoardData(c.caseKey,s.suspectId).boardCards;check(cards.length===3&&cards.every(x=>Number.isInteger(x.minute)),'Public timeline information is missing.');
  const ids=[...cards].sort((a,b)=>a.minute-b.minute).map(x=>x.id),liar=s.witnesses.find(w=>w.isLiar===true);
  const options=liar?{}:{confirmation:{basis:'continuous_observation',witnessIds:s.witnesses.map(w=>w.npcId),crimeWindow:clone(s.crimeWindow)}};
  const result=filing.fileAlibiConclusion(c.caseKey,s.suspectId,ids,liar?liar.npcId:NO,options);
  check(result.accepted===true,'Valid filing rejected: '+JSON.stringify(result));check(result.evidenceStatus==='documented','Filing did not retain the acquired evidence.');check(!('evaluation' in result),'Hidden evaluation leaked.');
  const dossier=filing.getAlibiEvidenceDossier(c.caseKey,s.suspectId);check(!!dossier&&!('evaluation' in dossier),'Public dossier leaked the hidden evaluation.');}}
 function facts(c){return {caseId:state.currentCaseId,campaignId:state._createdAt,suspectId:'real-defendant',defendantName:'Identified Defendant',artifactName:'Recovered artefact',warrantMatches:true,correctDefendant:true,courtMode:'case-theory-v3',courtPolicyVersion:2,courtRapport:0,courtRapportBonus:0,
  finalTheory:{sections:{identity:{answerId:'real-defendant',skillIds:[],evidenceIds:['identity-proof']},motive:{answerId:'motive',skillIds:[],evidenceIds:['motive-proof']},means:{answerId:'',skillIds:['stealth'],evidenceIds:['method-proof']},opportunity:{answerId:'false_alibi',skillIds:[],evidenceIds:['opportunity-proof']}}},
  caseAssessment:{motiveCorrect:true,meansCorrect:true,methodCovered:true,opportunityStatus:'supported',identityBridge:true,alternativeCleared:true,culpritAlibiResolved:true,envelopeViewed:true,aliasName:c.primary.suspectName,otherName:'The other candidates',motiveLabel:'An established motive',motiveSource:'Recorded source',motiveSourceText:'Collected witness information',methodSources:[{skill:'stealth',name:'Documented crime-scene trace',id:'method-proof'}],opportunityLabel:'The established theft window',envelopeLabel:'Recorded identity document',proceduralIncident:null,failures:[]}};}
 function attach(c){return trial.attachAlibiCourtAssessment(facts(c),state,{theoryKey:c.caseKey,aliasId:c.primary.suspectId,actualIds:['real-defendant']});}
 function play(record,expected){check(trial.validAlibiCourt(record,state,'real-defendant')===true,'Initial production court record is invalid.');replayStates++;let guard=0;
  while(record.phase!=='verdict'&&guard++<300){if(record.phase==='question'){const q=record.questions[record.index],best=Math.max(...q.answers.map(a=>a.delta)),index=q.answers.findIndex(a=>a.delta===best);check(trial.answerAlibiCourtQuestion(record,index)===true,'Answer was rejected.');}
   else check(trial.advanceAlibiCourt(record)===true,'Could not advance the real trial.');record=JSON.parse(JSON.stringify(record));check(trial.validAlibiCourt(record,state,'real-defendant')===true,'Replay failed after a transition.');replayStates++;}
  check(record.phase==='verdict','Trial did not terminate.');check(record.verdict===expected,'Unexpected verdict: '+record.verdict+' / '+record.verdictExplanation);return record;}
 let cleanTrials=0,weakTrials=0,legacyTrials=0,boundaryCases=0;
 for(let p=0;p<12;p++)for(const count of [2,3])for(const retract of [false,true]){const c=install(p,count);talk(c);compare(c,retract);fileAll(c);play(trial.createAlibiCourtRecord(attach(c)),'convicted');cleanTrials++;}
 const weaknesses=[c=>c.primary.playerConclusion.evidence.sources.pop(),c=>{c.primary.playerConclusion.evidence.comparison=null;},c=>c.primary.playerConclusion.timelineIds.reverse(),
  c=>{c.primary.playerConclusion.choice=c.primary.witnesses.find(w=>w.isLiar!==true).npcId;},c=>{c.subjects.at(-1).playerConclusion.evidence.confirmation=null;},
  c=>{c.primary.playerConclusion.evidenceStatus='documented';c.primary.playerConclusion.evaluation={correct:true,evidenceSupported:true};c.primary.playerConclusion.evidence.comparison=null;}];
 for(let p=0;p<12;p++)for(const count of [2,3])for(const weaken of weaknesses){const c=install(p,count);talk(c);compare(c,false);fileAll(c);weaken(c);play(trial.createAlibiCourtRecord(attach(c)),'released');weakTrials++;}
 for(const count of [2,3]){const c=install(0,count);talk(c);compare(c,false);fileAll(c);
  check(trial.validAlibiCourt(JSON.parse(JSON.stringify(core.createFinalCourtRecord(facts(c)))),state,'real-defendant')===true,'Old trial no longer uses its existing production validator.');legacyTrials++;
  const prepared=attach(c),snapshot=JSON.stringify(prepared),record=trial.createAlibiCourtRecord(prepared);c.primary.witnesses[0].statement='Later live mutation';check(JSON.stringify(prepared)===snapshot,'A live edit altered archived court facts.');play(record,'convicted');boundaryCases++;
  const changed=clone(record);changed.questions[0].text='Changed question';check(trial.validAlibiCourt(changed,state,'real-defendant')===false,'Changed question was accepted.');boundaryCases++;}
 {const c=install(6,2);talk(c);const target=selection(c),before=state.timeSpent,wrong=interview.EVIDENCE_REASONS.find(r=>r.id!==target.input.reason).id;
  interview.challengeWitness(c.caseKey,target.e.id,{...target.input,reason:wrong});check(Math.abs(state.timeSpent-before-5/60)<1e-10,'Wrong comparison did not cost five minutes.');boundaryCases++;
  const ids=encounters.getTimelineBoardData(c.caseKey,c.primary.suspectId).boardCards.sort((a,b)=>a.minute-b.minute).map(x=>x.id);
  const first=filing.fileAlibiConclusion(c.caseKey,c.primary.suspectId,ids,target.input.statementId);check(first.requiresRiskConfirmation===true&&!first.accepted,'Missing evidence was silently filed.');
  const accepted=filing.fileAlibiConclusion(c.caseKey,c.primary.suspectId,ids,target.input.statementId,{allowRisky:true});check(accepted.accepted===true&&accepted.evidenceStatus==='risky','Explicit risky filing failed.');boundaryCases++;}
 check(usedTrue.size===6,'Not all genuine patterns reached filing and trial.');
 return {passed:true,status:'passed',engine:'actual local production FinalCaseCourt.js',falsePatterns:falseFixtures.size,truePatterns:usedTrue.size,cleanTrials,weakTrials,legacyTrials,boundaryCases,replayStates,assertions,sourceFiles:REQUIRED.filter(p=>p.endsWith('.js'))};
}
if(isMainThread)await main();else{try{parentPort.postMessage({type:'result',report:await integration(workerData.project)});}catch(error){parentPort.postMessage({type:'result',report:{passed:false,status:'failed',error:error.stack||String(error)}});}}
