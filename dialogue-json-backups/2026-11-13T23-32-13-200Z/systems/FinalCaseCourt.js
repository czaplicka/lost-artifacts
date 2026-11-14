// New hearings assess only the final theory and collected evidence. No audit/attempt history is read.
export const FINAL_COURT_CONFIG=Object.freeze({version:3,initialTrust:45,convictionThreshold:65,mistakenIdentityCap:40,rapportBonusMax:8});
const list=v=>Array.isArray(v)?v:[];
const txt=v=>typeof v==='string'?v.trim():'';
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const clone=v=>JSON.parse(JSON.stringify(v));
const norm=v=>txt(v).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/^pick ?pocketing$/,'pickpocket');
const skills=v=>[...new Set(list(v).map(norm).filter(Boolean))].sort();
const clamp=v=>Math.max(0,Math.min(100,v));
const publicText=(v,fallback)=>{const t=txt(v);return t&&!t.includes('_')&&!t.includes('/')?t:fallback;};
const fields=['identity','motive','means','opportunity'];
const opportunityLabels={work_access:'work duties provided access',unobserved_interval:'an unobserved interval',false_alibi:'a false alibi concealed presence',borrowed_access:'borrowed or stolen credentials',security_gap:'a security gap',public_access:'public opening hours'};
function filedCorrect(subject){
 const f=subject?.playerConclusion;if(f?.locked!==true)return false;
 if(typeof f.evaluation?.conclusionCorrect==='boolean')return f.evaluation.conclusionCorrect;
 return subject.alibiType==='confirmed'?f.choice==='__no_liar__':list(subject.witnesses).some(w=>w.npcId===f.choice&&w.isLiar===true);
}
function acceptedAlibi(subject){return subject?.alibiType==='confirmed'&&filedCorrect(subject)&&subject.playerConclusion.choice==='__no_liar__';}
function snapshotTheory(theory){
 const sections={};for(const k of fields){const s=theory?.sections?.[k]||{};sections[k]={answerId:txt(s.answerId),skillIds:k==='means'?skills(s.skillIds):[],evidenceIds:[...new Set(list(s.evidenceIds).filter(v=>typeof v==='string'))]};}
 return {sections};
}
export function assembleFinalCourtFacts(state,suspectId,context){
 const {baseFacts,theory,actualIds,usedSkills,opportunityStatus,motive,motiveLabel,boardRecord={},identityContext=null,identityClues=[],cards=[]}=context;
 if(!motive?.crimeBoard?.answerId)throw new Error('Cannot prepare the trial: canonical motive data is missing. Your save has not been replaced.');
 const ids=list(actualIds).map(String);if(!ids.length)throw new Error('Cannot prepare the trial: consistent identity data is missing.');
 const finalTheory=snapshotTheory(theory),sections=finalTheory.sections,failures=[];
 const fail=(key,message)=>{if(!failures.some(f=>f.key===key))failures.push({key,message});};
 const discovered=new Map(list(cards).filter(c=>c&&c.discovered!==false).map(c=>[String(c.id),c]));
 for(const k of fields){const section=sections[k];
  if(!(k==='means'?section.skillIds.length:section.answerId))fail(k,`The final ${k} conclusion is missing.`);
  if(!section.evidenceIds.some(id=>discovered.has(id)))fail(`references_${k}`,`The final ${k} section has no attached discovered evidence.`);
 }
 const culpritIsDefendant=ids.includes(String(suspectId));
 if(!culpritIsDefendant)fail('wrong_defendant','The arrested person does not match the established offender.');
 if(!ids.includes(sections.identity.answerId)||!culpritIsDefendant)fail('identity','The final identity conclusion does not match the offender brought to court.');
 const motiveCorrect=sections.motive.answerId===motive.crimeBoard.answerId;
 if(!motiveCorrect)fail('motive','The final motive conclusion contradicts the established findings.');
 const stages=list(motive.escapeInvestigation?.clueStages),finalStageIds=new Set(stages.filter(v=>v.boardAnswerUnlocked===true).map(v=>v.evidenceId));
 const collected=list(state.cluesCollected).filter(c=>c&&c.type==='motive'&&(c.caseId==null||same(c.caseId,state.currentCaseId))&&(c.campaignId==null||c.campaignId===state._createdAt));
 const reports=Object.values(state.caseData?.motiveWitnessReports||{}).filter(r=>r?.version===1&&same(r.caseId,state.currentCaseId)&&r.campaignId===state._createdAt&&r.motiveId===motive.id&&txt(r.text));
 const finalMotiveSource=collected.find(c=>finalStageIds.has(c.id)&&txt(c.text))||reports.find(r=>finalStageIds.has(r.evidenceId));
 if(!finalMotiveSource)fail('motive_evidence','No collected statement or document establishes why the artifact was taken.');
 const expectedSkills=skills(usedSkills);
 if(!expectedSkills.length)throw new Error('Cannot prepare the trial: the used-skill solution is missing.');
 const meansCorrect=JSON.stringify(sections.means.skillIds)===JSON.stringify(expectedSkills);
 if(!meansCorrect)fail('means','The final selected skills do not match the method of this theft.');
 const r=state.reconstructedHeist||{},knownObjects=new Map();
 for(const o of list(state.crimeBoardData?.sceneFoundObjects))if(o?.id&&(o.missionId==null||state.currentMission?.id==null||same(o.missionId,state.currentMission.id)))knownObjects.set(String(o.id),o);
 for(const [i,o]of list(r.playerOrderedCards).entries())if(o?.id&&(o.isCorrect===true||['green','yellow'].includes(list(r.playerSlotFeedback)[i])))knownObjects.set(String(o.id),o);
 const methodSources=[];
 for(const claim of list(r.claims)){
  const object=knownObjects.get(String(claim.solutionItemId));if(!object)continue;
  methodSources.push({skill:norm(claim.thiefSkill),name:publicText(object.item||object.label||object.title,'the recovered trace'),id:String(object.id)});
 }
 const methodCovered=expectedSkills.every(id=>methodSources.some(s=>s.skill===id));
 if(!methodCovered)fail('means_evidence','The collected traces do not support the complete final skill set.');
 const key=context.theoryKey,subjects=list(state.caseData?.alibiCases?.[key]?.suspects);
 const aliasId=identityContext?.caseId;
 const alibiSubject=subjects.find(v=>same(v.suspectId,aliasId))||subjects.find(v=>ids.includes(String(v.suspectId)));
 const others=subjects.filter(v=>v!==alibiSubject);
 const other=others.length===1?others[0]:null;
 const person=id=>list(state.caseSuspects).find(v=>same(v.id,id))||list(state.suspects).find(v=>same(v.id,id));
 const aliasName=publicText(alibiSubject?.suspectName||person(alibiSubject?.suspectId)?.publicProfile?.displayName||person(alibiSubject?.suspectId)?.name,'the name used in the alibi statements');
 const otherName=publicText(other?.suspectName||person(other?.suspectId)?.publicProfile?.displayName||person(other?.suspectId)?.name,'the second forensic match');
 const matchingEnvelope=list(identityClues).find(c=>c?.source==='suspect_apartment_identity'&&c.category==='eyes'&&txt(c.value));
 const envelopeScope=Boolean(identityContext&&matchingEnvelope&&same(identityContext.actualId,context.actualDatabaseId)&&same(alibiSubject?.suspectId,identityContext.caseId));
 const warrantRecorded=Boolean(state.arrestWarrantIssued&&same(state.warrantSuspectId,suspectId)&&culpritIsDefendant);
 const bridge=envelopeScope&&warrantRecorded;
 if(!bridge)fail('identity_bridge','The file does not establish the link between the alibi alias, the recovered photograph/forged ID and the arrested identity.');
 const alternativeCleared=Boolean(other&&acceptedAlibi(other));
 if(!alternativeCleared)fail('alternative','The other forensic match has not been excluded by a correctly established alibi.');
 if(alibiSubject?.playerConclusion?.locked&&(!filedCorrect(alibiSubject)||alibiSubject.playerConclusion.choice==='__no_liar__'))fail('alibi','The filed alibi assessment for the accused does not support the accusation.');
 const opp=opportunityStatus||'inconclusive';
 if(opp==='contradicted')fail('opportunity','The final opportunity conclusion contradicts the established access or alibi findings.');
 const incidentSeen=new Set();const incidents=[];
 for(const e of [...list(state.hintState?.usageHistory),...list(state.courtMisconductLog)]){
  if(!e?.id||!same(e.caseId,state.currentCaseId)||(e.campaignId!=null&&e.campaignId!==state._createdAt)||incidentSeen.has(String(e.id)))continue;
  if(e.method!=='cut_corners'&&!(Number(e.moralDelta)<0))continue;
  // Only a breach tied to a final cited source or to a collected case source can generate a question.
  const item=String(e.itemId??''),allReferences=fields.flatMap(k=>sections[k].evidenceIds);
  const actualSource=list(state.cluesCollected).find(c=>same(c.id,item));
  const sourceCard=list(cards).find(c=>same(c.id,item)||same(c.clueId,item));
  const referenced=allReferences.includes(item)||Boolean(sourceCard&&allReferences.includes(sourceCard.id))||
   ['identity','motive','means','opportunity'].includes(item)&&e.sceneId==='CaseTheory'||methodSources.some(s=>s.id===item);
  if(!referenced)continue;
  incidentSeen.add(String(e.id));incidents.push({id:String(e.id),source:publicText(sourceCard?.label||actualSource?.title||actualSource?.label||methodSources.find(s=>s.id===item)?.name,item in opportunityLabels?'the opportunity evidence':fields.includes(item)?`the final ${item} conclusion`:'a cited case source'),severity:Math.abs(Number(e.moralDelta)||1)});
 }
 incidents.sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
 const rapport=Math.max(0,Math.floor(Number(context.rapport)||0));
 const sourceName=finalMotiveSource?publicText(finalMotiveSource.label,'the recorded escape-route witness statement'):'no recorded final motive source';
 return {...clone(baseFacts),courtMode:'case-theory-v3',courtPolicyVersion:1,correctDefendant:culpritIsDefendant,
  courtRapport:rapport,courtRapportBonus:Math.min(FINAL_COURT_CONFIG.rapportBonusMax,rapport*2),incidents:[],finalTheory,
  caseAssessment:{motiveCorrect,meansCorrect,methodCovered,opportunityStatus:opp,identityBridge:bridge,alternativeCleared,
   aliasName,otherName,motiveLabel:publicText(motiveLabel,'the selected motive'),motiveSource:sourceName,
   motiveSourceText:txt(finalMotiveSource?.text),methodSources,
   opportunityLabel:opportunityLabels[sections.opportunity.answerId]||'the selected access hypothesis',
   envelopeLabel:matchingEnvelope?'ID Preparation Envelope':'no recovered identity document',
   proceduralIncident:incidents[0]||null,failures}};
}
function option(text,delta,feedback){return {text,delta,feedback};}
function shuffle(answers,id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}return answers;}
function q(id,side,text,good,bad){return {id,side,text,answers:shuffle([good,...bad],id),baseDelta:0,identityExposed:false};}
export function buildFinalCourtQuestions(facts){
 const a=facts.caseAssessment,s=facts.finalTheory.sections,artifact=facts.artifactName||'the artifact';
 const covered=(key)=>!a.failures.some(f=>f.key===key||f.key===`references_${key}`);
 const motiveSound=a.motiveCorrect&&covered('motive')&&!a.failures.some(f=>f.key==='motive_evidence');
 const meansSound=a.meansCorrect&&a.methodCovered&&covered('means');
 const questions=[
  q('case_motive','prosecutor',`Prosecutor: Why was ${artifact} stolen, according to your final Case Theory? Which finding supports that motive?`,
   option(motiveSound?`My conclusion is ${a.motiveLabel}. I rely on ${a.motiveSource}, which connects the reason to the theft.`:`My final theory says ${a.motiveLabel}, but I cannot support that conclusion with the required findings.`,motiveSound?8:0,motiveSound?'The motive is connected to a collected finding, not inferred from the theft alone.':'The final motive or its evidential basis is not established. A courtroom answer cannot replace a missing investigation finding.'),[
    option('The suspect wanted something valuable. That explains every theft.',-5,'Value alone does not establish this motive.'),
    option('Flight establishes the motive, regardless of what the witnesses reported.',-5,'Flight does not establish why this artifact was taken.'),
    option('The skills used in the break-in are also the reason for stealing it.',-5,'Method and motive are different parts of the case.')]),
  q('case_means','prosecutor','Prosecutor: Which skills were used in this theft, and which recovered traces support your final conclusion?',
   option(meansSound?`${s.means.skillIds.join(', ')}. The relevant recovered traces are ${a.methodSources.map(v=>v.name).join(', ')}.`:'My final skill conclusion is not fully supported by the collected traces.',meansSound?8:0,meansSound?'You connect the final skill set to the recovered traces. Earlier puzzle attempts are irrelevant.':'The final method is not fully established. The objection concerns that final conclusion, not your three puzzle attempts.'),[
    option('Every skill in the suspect database was used in this theft.',-5,'Possessing a skill is not evidence of using it.'),
    option('Running away demonstrates the skills used to enter the crime scene.',-5,'The pursuit does not establish the method of the theft.'),
    option('The suspect’s occupation is enough; individual traces are unnecessary.',-5,'The method must be tied to the actual traces.')]),
  q('case_opportunity','prosecutor','Prosecutor: What established the opportunity to commit the theft during the crime window?',
   option(a.opportunityStatus==='supported'&&covered('opportunity')?`My final conclusion is that ${a.opportunityLabel}. It must be read with the access findings and the alibi accounts for the crime window.`:
    a.opportunityStatus==='inconclusive'?`My final theory proposes that ${a.opportunityLabel}, but the record does not verify that exact access mechanism. I cannot state it as a proven fact.`:'My final opportunity conclusion is not supported by the recorded access and alibi findings.',
    a.opportunityStatus==='supported'&&covered('opportunity')?8:a.opportunityStatus==='inconclusive'?3:0,
    a.opportunityStatus==='supported'?'The opportunity conclusion is consistent with the case findings. It is not proved merely by being in the same city.':a.opportunityStatus==='inconclusive'?'You correctly distinguish a hypothesis from an established fact. Missing rule metadata is not treated as a proven contradiction.':'The final opportunity claim is contradicted or lacks its required references.'),[
     option('Being somewhere in the crime city establishes access to the scene.',-5,'Presence in the city is not access at the relevant time.'),
     option('The city where we arrested the suspect establishes where the theft happened.',-5,'Arrest location and crime location are different.'),
     option('Having no confirmed alibi proves the defendant was at the crime scene.',-5,'An absence of an alibi is not direct proof of presence.')]),
  q('defense_identity_bridge','defense',`Defence: The alibi witnesses knew ${a.aliasName}. My client is recorded as ${facts.defendantName}. What connects these identities?`,
   option(a.identityBridge?`The ${a.envelopeLabel} links the alias to the recovered photograph and forged-ID details. The identification evidence and matching wanted-record identity connect that person to the defendant.`:
    'I cannot establish the complete link from the alibi alias through the recovered identification material to this defendant.',a.identityBridge?8:0,
    a.identityBridge?'The alias, the recovered identification material and the arrested identity are linked. The envelope alone did not reveal the real name.':'The identity link is missing. A matching warrant or one shared physical trait cannot manufacture it.'),[
     option('Different names mean these must be two different people.',-5,'A false identity can belong to the same person.'),
     option('The forged-ID order directly revealed the real name.',-5,'The recovered envelope did not reveal the real name.'),
     option('The warrant alone proves the connection to the alibi witnesses.',-5,'The warrant names a person; it does not replace the identification chain.')]),
  q('defense_alternative','defense',`Defence: ${a.otherName} also matched the forensic findings. Why did your investigation exclude that person?`,
   option(a.alternativeCleared?`${a.otherName} had an independently supported alibi, correctly accepted in the final report. A shared forensic profile could not distinguish the two people by itself.`:
    `I cannot support the exclusion of ${a.otherName} with a correctly established alibi.`,a.alternativeCleared?8:0,
    a.alternativeCleared?'You distinguish the two forensic matches through the alibi evidence, not through confidence in the arrest.':'The other matching suspect was not properly excluded. The exact order of your draft timeline cards is not being graded.'),[
     option('The same forensic profile proves both people committed the theft.',-5,'A shared profile does not prove shared guilt.'),
     option('The arrested person ran away, so the other suspect’s alibi no longer matters.',-5,'Flight cannot replace comparison with the other suspect.'),
     option('Choosing one person for the warrant automatically excludes the other.',-5,'A warrant is not independent evidence excluding an alternative.')])
 ];
 if(a.proceduralIncident)questions.push(q('defense_procedure','defense',`Defence: A procedural shortcut affected ${a.proceduralIncident.source}. What does that mean for the material relied on here?`,
  option('I acknowledge the omitted procedure, identify its limits and distinguish independently corroborated findings.',-2,'The breach is acknowledged. This is the single procedural objection, not a separate penalty for every hint.'),[
   option('The shortcut makes the affected material automatically reliable.',-6,'A shortcut does not certify reliability.'),
   option('The breach is irrelevant because it supports my theory.',-6,'Agreement with a theory does not independently verify evidence.'),
   option('I will state that the omitted procedure was completed.',-6,'Denying a recorded omission damages the testimony.')]));
 return questions;
}
function validateFacts(f){
 if(!f||f.courtMode!=='case-theory-v3'||f.courtPolicyVersion!==1||f.caseId==null||f.campaignId==null||f.suspectId==null||f.warrantMatches!==true||typeof f.correctDefendant!=='boolean'||!txt(f.defendantName))throw new Error('Invalid final-theory court facts.');
 if(!Number.isInteger(f.courtRapportBonus)||f.courtRapportBonus<0||f.courtRapportBonus>8||f.courtRapportBonus%2)throw new Error('Invalid court bonus.');
 const a=f.caseAssessment;if(!a||!Array.isArray(a.failures)||!Array.isArray(a.methodSources)||!['supported','contradicted','inconclusive'].includes(a.opportunityStatus))throw new Error('Invalid final case assessment.');
 for(const flag of ['motiveCorrect','meansCorrect','methodCovered','identityBridge','alternativeCleared'])if(typeof a[flag]!=='boolean')throw new Error('Invalid finding.');
 for(const k of fields){const section=f.finalTheory?.sections?.[k];if(!section||typeof section.answerId!=='string'||!Array.isArray(section.skillIds)||!Array.isArray(section.evidenceIds))throw new Error('Invalid final theory.');}
 for(const item of a.failures)if(!txt(item.key)||!txt(item.message))throw new Error('Invalid failure reason.');
}
export function createFinalCourtRecord(facts){
 validateFacts(facts);return {version:3,caseId:facts.caseId,campaignId:facts.campaignId,suspectId:facts.suspectId,facts:clone(facts),questions:buildFinalCourtQuestions(facts),index:0,trust:clamp(45+facts.courtRapportBonus),identityExposed:!facts.correctDefendant,phase:'question',feedback:'',answers:[],verdict:null,resultCommitted:false,verdictExplanation:''};
}
export function answerFinalCourtQuestion(record,index){
 if(!record||record.phase!=='question'||!Number.isInteger(index)||index<0||index>3)return false;
 const q=record.questions[record.index],a=q?.answers[index];if(!a)return false;
 const delta=q.baseDelta+a.delta;record.trust=clamp(record.trust+delta);if(record.identityExposed)record.trust=Math.min(record.trust,40);
 record.answers.push({questionId:q.id,answerIndex:index,delta,trust:record.trust});record.feedback=`${a.feedback}\nJudge's confidence: ${delta>=0?'+':''}${delta}.`;record.phase='feedback';return true;
}
export function advanceFinalCourt(record){
 if(!record||record.phase!=='feedback')return false;record.index++;
 if(record.index<record.questions.length){record.phase='question';return true;}
 const failures=record.facts.caseAssessment.failures;
 record.verdict=!record.identityExposed&&!failures.length&&record.trust>=65?'convicted':'released';record.phase='verdict';
 record.verdictExplanation=record.verdict==='convicted'?'The final Case Theory and the identity chain are supported.':
  failures.length?failures.map(f=>f.message).join('\n'):'The testimony did not reach the required confidence. Earlier puzzle attempts were not scored.';return true;
}
export function validFinalCourt(record,state,suspectId=null){
 try{
  if(!record||record.version!==3||!same(record.caseId,state?.currentCaseId)||record.campaignId!==state._createdAt||
   (suspectId!=null&&!same(record.suspectId,suspectId))||!same(record.facts?.caseId,record.caseId)||record.facts.campaignId!==record.campaignId||!same(record.facts.suspectId,record.suspectId)||!Array.isArray(record.answers)||record.answers.length>6||
   typeof record.resultCommitted!=='boolean'||record.resultCommitted&&record.phase!=='verdict')return false;
  const replay=createFinalCourtRecord(record.facts);
  if(JSON.stringify(record.questions)!==JSON.stringify(replay.questions)||record.answers.length>replay.questions.length)return false;
  for(let i=0;i<record.answers.length;i++){
   const saved=record.answers[i];if(!answerFinalCourtQuestion(replay,saved.answerIndex))return false;
   if(JSON.stringify(replay.answers.at(-1))!==JSON.stringify(saved))return false;
   if(i<record.answers.length-1||record.phase!=='feedback')if(!advanceFinalCourt(replay))return false;
  }
  return ['index','trust','identityExposed','phase','feedback','answers','verdict','verdictExplanation'].every(k=>JSON.stringify(record[k])===JSON.stringify(replay[k]));
 }catch{return false;}
}