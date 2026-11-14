import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
const opportunityLabels={work_access:__dialogueText("systems/FinalCaseCourt.js", "t_eebe01cc2fa2eb68b274"),unobserved_interval:__dialogueText("systems/FinalCaseCourt.js", "t_e8346246d901524e0113"),false_alibi:__dialogueText("systems/FinalCaseCourt.js", "t_5fa1438038b89dbd49bc"),borrowed_access:__dialogueText("systems/FinalCaseCourt.js", "t_e96525634b7109bfdf22"),security_gap:__dialogueText("systems/FinalCaseCourt.js", "t_1d968c086296e9fdc163"),public_access:__dialogueText("systems/FinalCaseCourt.js", "t_23ee5e42cade819456d7")};
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
  if(!(k==='means'?section.skillIds.length:section.answerId))fail(k,`${__dialogueText("systems/FinalCaseCourt.js", "t_012269b3899bcf94195f")}${k}${__dialogueText("systems/FinalCaseCourt.js", "t_eed020b63888c736e094")}`);
  if(!section.evidenceIds.some(id=>discovered.has(id)))fail(`references_${k}`,`${__dialogueText("systems/FinalCaseCourt.js", "t_012269b3899bcf94195f")}${k}${__dialogueText("systems/FinalCaseCourt.js", "t_c90f7bd63785019ba6f2")}`);
 }
 const culpritIsDefendant=ids.includes(String(suspectId));
 if(!culpritIsDefendant)fail('wrong_defendant',__dialogueText("systems/FinalCaseCourt.js", "t_a24d44bcefb3619798be"));
 if(!ids.includes(sections.identity.answerId)||!culpritIsDefendant)fail('identity',__dialogueText("systems/FinalCaseCourt.js", "t_ae97ff60ca111a0986f8"));
 const motiveCorrect=sections.motive.answerId===motive.crimeBoard.answerId;
 if(!motiveCorrect)fail('motive',__dialogueText("systems/FinalCaseCourt.js", "t_bd686d591b049a34a698"));
 const stages=list(motive.escapeInvestigation?.clueStages),finalStageIds=new Set(stages.filter(v=>v.boardAnswerUnlocked===true).map(v=>v.evidenceId));
 const collected=list(state.cluesCollected).filter(c=>c&&c.type==='motive'&&(c.caseId==null||same(c.caseId,state.currentCaseId))&&(c.campaignId==null||c.campaignId===state._createdAt));
 const reports=Object.values(state.caseData?.motiveWitnessReports||{}).filter(r=>r?.version===1&&same(r.caseId,state.currentCaseId)&&r.campaignId===state._createdAt&&r.motiveId===motive.id&&txt(r.text));
 const finalMotiveSource=collected.find(c=>finalStageIds.has(c.id)&&txt(c.text))||reports.find(r=>finalStageIds.has(r.evidenceId));
 if(!finalMotiveSource)fail('motive_evidence',__dialogueText("systems/FinalCaseCourt.js", "t_2ee9a6a36c29b7944a1c"));
 const expectedSkills=skills(usedSkills);
 if(!expectedSkills.length)throw new Error('Cannot prepare the trial: the used-skill solution is missing.');
 const meansCorrect=JSON.stringify(sections.means.skillIds)===JSON.stringify(expectedSkills);
 if(!meansCorrect)fail('means',__dialogueText("systems/FinalCaseCourt.js", "t_a6282ae108a1ad9326e0"));
 const r=state.reconstructedHeist||{},knownObjects=new Map();
 for(const o of list(state.crimeBoardData?.sceneFoundObjects))if(o?.id&&(o.missionId==null||state.currentMission?.id==null||same(o.missionId,state.currentMission.id)))knownObjects.set(String(o.id),o);
 for(const [i,o]of list(r.playerOrderedCards).entries())if(o?.id&&(o.isCorrect===true||['green','yellow'].includes(list(r.playerSlotFeedback)[i])))knownObjects.set(String(o.id),o);
 const methodSources=[];
 for(const claim of list(r.claims)){
  const object=knownObjects.get(String(claim.solutionItemId));if(!object)continue;
  methodSources.push({skill:norm(claim.thiefSkill),name:publicText(object.item||object.label||object.title,__dialogueText("systems/FinalCaseCourt.js", "t_ed00b37b4f99445a61b9")),id:String(object.id)});
 }
 const methodCovered=expectedSkills.every(id=>methodSources.some(s=>s.skill===id));
 if(!methodCovered)fail('means_evidence',__dialogueText("systems/FinalCaseCourt.js", "t_ab20b0b1a2bf4bdda682"));
 const key=context.theoryKey,subjects=list(state.caseData?.alibiCases?.[key]?.suspects);
 const aliasId=identityContext?.caseId;
 const alibiSubject=subjects.find(v=>same(v.suspectId,aliasId))||subjects.find(v=>ids.includes(String(v.suspectId)));
 const others=subjects.filter(v=>v!==alibiSubject);
 const other=others.length===1?others[0]:null;
 const person=id=>list(state.caseSuspects).find(v=>same(v.id,id))||list(state.suspects).find(v=>same(v.id,id));
 const aliasName=publicText(alibiSubject?.suspectName||person(alibiSubject?.suspectId)?.publicProfile?.displayName||person(alibiSubject?.suspectId)?.name,__dialogueText("systems/FinalCaseCourt.js", "t_ee2aea67f5b0b4331571"));
 const otherName=publicText(other?.suspectName||person(other?.suspectId)?.publicProfile?.displayName||person(other?.suspectId)?.name,__dialogueText("systems/FinalCaseCourt.js", "t_180697f643d8826a5738"));
 const matchingEnvelope=list(identityClues).find(c=>c?.source==='suspect_apartment_identity'&&c.category==='eyes'&&txt(c.value));
 const envelopeScope=Boolean(identityContext&&matchingEnvelope&&same(identityContext.actualId,context.actualDatabaseId)&&same(alibiSubject?.suspectId,identityContext.caseId));
 const warrantRecorded=Boolean(state.arrestWarrantIssued&&same(state.warrantSuspectId,suspectId)&&culpritIsDefendant);
 const bridge=envelopeScope&&warrantRecorded;
 if(!bridge)fail('identity_bridge',__dialogueText("systems/FinalCaseCourt.js", "t_5340e1ec9433e49355e3"));
 const alternativeCleared=Boolean(other&&acceptedAlibi(other));
 if(!alternativeCleared)fail('alternative',__dialogueText("systems/FinalCaseCourt.js", "t_da0cefc6fc6181092784"));
 if(alibiSubject?.playerConclusion?.locked&&(!filedCorrect(alibiSubject)||alibiSubject.playerConclusion.choice==='__no_liar__'))fail('alibi',__dialogueText("systems/FinalCaseCourt.js", "t_27d39c671f77ae27fb83"));
 const opp=opportunityStatus||'inconclusive';
 if(opp==='contradicted')fail('opportunity',__dialogueText("systems/FinalCaseCourt.js", "t_e2f2473eacec49cf5247"));
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
  incidentSeen.add(String(e.id));incidents.push({id:String(e.id),source:publicText(sourceCard?.label||actualSource?.title||actualSource?.label||methodSources.find(s=>s.id===item)?.name,item in opportunityLabels?__dialogueText("systems/FinalCaseCourt.js", "t_5eb6e1d6c009d0c8209c"):fields.includes(item)?`${__dialogueText("systems/FinalCaseCourt.js", "t_009c4b7129e5f17c0206")}${item}${__dialogueText("systems/FinalCaseCourt.js", "t_36733bb4d69a439a0c31")}`:__dialogueText("systems/FinalCaseCourt.js", "t_da4fa366bc5dff108699")),severity:Math.abs(Number(e.moralDelta)||1)});
 }
 incidents.sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
 const rapport=Math.max(0,Math.floor(Number(context.rapport)||0));
 const sourceName=finalMotiveSource?publicText(finalMotiveSource.label,__dialogueText("systems/FinalCaseCourt.js", "t_222c7a2f43fcb424511f")):__dialogueText("systems/FinalCaseCourt.js", "t_7e32c3cbb29849011c93");
 return {...clone(baseFacts),courtMode:'case-theory-v3',courtPolicyVersion:1,correctDefendant:culpritIsDefendant,
  courtRapport:rapport,courtRapportBonus:Math.min(FINAL_COURT_CONFIG.rapportBonusMax,rapport*2),incidents:[],finalTheory,
  caseAssessment:{motiveCorrect,meansCorrect,methodCovered,opportunityStatus:opp,identityBridge:bridge,alternativeCleared,
   aliasName,otherName,motiveLabel:publicText(motiveLabel,__dialogueText("systems/FinalCaseCourt.js", "t_d784e554c660daf1619f")),motiveSource:sourceName,
   motiveSourceText:txt(finalMotiveSource?.text),methodSources,
   opportunityLabel:opportunityLabels[sections.opportunity.answerId]||__dialogueText("systems/FinalCaseCourt.js", "t_a3ba606feb59d45264f2"),
   envelopeLabel:matchingEnvelope?__dialogueText("systems/FinalCaseCourt.js", "t_3b236d2dc31ca33b2d59"):__dialogueText("systems/FinalCaseCourt.js", "t_9a7eb70354d4dda92f09"),
   proceduralIncident:incidents[0]||null,failures}};
}
function option(text,delta,feedback){return {text,delta,feedback};}
function shuffle(answers,id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}return answers;}
function q(id,side,text,good,bad){return {id,side,text,answers:shuffle([good,...bad],id),baseDelta:0,identityExposed:false};}
export function buildFinalCourtQuestions(facts){
 const a=facts.caseAssessment,s=facts.finalTheory.sections,artifact=facts.artifactName||__dialogueText("systems/FinalCaseCourt.js", "t_03473f89a784c1470730");
 const covered=(key)=>!a.failures.some(f=>f.key===key||f.key===`references_${key}`);
 const motiveSound=a.motiveCorrect&&covered('motive')&&!a.failures.some(f=>f.key==='motive_evidence');
 const meansSound=a.meansCorrect&&a.methodCovered&&covered('means');
 const questions=[
  q('case_motive','prosecutor',`${__dialogueText("systems/FinalCaseCourt.js", "t_ed4a83d45cfd9695d7bd")}${artifact}${__dialogueText("systems/FinalCaseCourt.js", "t_f4f760dc1bf215e31f85")}`,
   option(motiveSound?`${__dialogueText("systems/FinalCaseCourt.js", "t_d3635a81264fa812bc25")}${a.motiveLabel}${__dialogueText("systems/FinalCaseCourt.js", "t_95b29ace3d494f1bca3c")}${a.motiveSource}${__dialogueText("systems/FinalCaseCourt.js", "t_75d85f9df7beee65b6d4")}`:`${__dialogueText("systems/FinalCaseCourt.js", "t_1acbffb37fc2c2232162")}${a.motiveLabel}${__dialogueText("systems/FinalCaseCourt.js", "t_31980c2dd36100323523")}`,motiveSound?8:0,motiveSound?__dialogueText("systems/FinalCaseCourt.js", "t_29fd7619b44575ec5ae8"):__dialogueText("systems/FinalCaseCourt.js", "t_e4b69f267b9487067238")),[
    option(__dialogueText("systems/FinalCaseCourt.js", "t_ac58d264d9a475b3d046"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_9d7441f6f2a212567dcd")),
    option(__dialogueText("systems/FinalCaseCourt.js", "t_d6026a7e3b84fe5e02b1"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_9b06cfd4990c98430ba5")),
    option(__dialogueText("systems/FinalCaseCourt.js", "t_0c13a6632a1f0e2d7078"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_daa881e015a7601664ab"))]),
  q('case_means','prosecutor',__dialogueText("systems/FinalCaseCourt.js", "t_a961fee27759e655a039"),
   option(meansSound?`${s.means.skillIds.join(', ')}${__dialogueText("systems/FinalCaseCourt.js", "t_5a61f22296eb2558fdc6")}${a.methodSources.map(v=>v.name).join(', ')}${__dialogueText("systems/FinalCaseCourt.js", "t_cdb4ee2aea69cc6a8333")}`:__dialogueText("systems/FinalCaseCourt.js", "t_9f7b4ac14095d76711af"),meansSound?8:0,meansSound?__dialogueText("systems/FinalCaseCourt.js", "t_ec08c36e8a2376b72b6d"):__dialogueText("systems/FinalCaseCourt.js", "t_bacfe50552f4f282db84")),[
    option(__dialogueText("systems/FinalCaseCourt.js", "t_505fe1fbe838fc7b2d3e"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_00e127106f32410d11f0")),
    option(__dialogueText("systems/FinalCaseCourt.js", "t_784b75733e8b58352f1e"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_dcdf339be00fe496b276")),
    option(__dialogueText("systems/FinalCaseCourt.js", "t_8c2225a4da8ed526441b"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_bdec3f0b9c5935a0e685"))]),
  q('case_opportunity','prosecutor',__dialogueText("systems/FinalCaseCourt.js", "t_9fb76f652bee9c3c2500"),
   option(a.opportunityStatus==='supported'&&covered('opportunity')?`${__dialogueText("systems/FinalCaseCourt.js", "t_8d7c520f111271708f2e")}${a.opportunityLabel}${__dialogueText("systems/FinalCaseCourt.js", "t_75446b94d1498a3433e8")}`:
    a.opportunityStatus==='inconclusive'?`${__dialogueText("systems/FinalCaseCourt.js", "t_ea537e107b3984da51a2")}${a.opportunityLabel}${__dialogueText("systems/FinalCaseCourt.js", "t_e7c22ea913413522fb7d")}`:__dialogueText("systems/FinalCaseCourt.js", "t_4ea73e822ee2132142d9"),
    a.opportunityStatus==='supported'&&covered('opportunity')?8:a.opportunityStatus==='inconclusive'?3:0,
    a.opportunityStatus==='supported'?__dialogueText("systems/FinalCaseCourt.js", "t_9a5c6ab1d1f04125fba9"):a.opportunityStatus==='inconclusive'?__dialogueText("systems/FinalCaseCourt.js", "t_578bd0c654aac1c12e19"):__dialogueText("systems/FinalCaseCourt.js", "t_958fe371a6b70afd1719")),[
     option(__dialogueText("systems/FinalCaseCourt.js", "t_8c5860cafb234d21e442"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_9684229f8c367cd5a8ca")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_9487d3d4eef7dd0cb288"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_de55dc84e6fcc247ec99")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_d148a76d9858f218fe99"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_d80c1558d0484fd0312a"))]),
  q('defense_identity_bridge','defense',`${__dialogueText("systems/FinalCaseCourt.js", "t_5e95189490b208e630d9")}${a.aliasName}${__dialogueText("systems/FinalCaseCourt.js", "t_d22e666ab18d907bad40")}${facts.defendantName}${__dialogueText("systems/FinalCaseCourt.js", "t_c76d417aed639f7d5bed")}`,
   option(a.identityBridge?`${__dialogueText("systems/FinalCaseCourt.js", "t_103c5169871d49be7a2e")}${a.envelopeLabel}${__dialogueText("systems/FinalCaseCourt.js", "t_48f894cf256e4f7f5d80")}`:
    __dialogueText("systems/FinalCaseCourt.js", "t_9756fedd45a69ebf38e2"),a.identityBridge?8:0,
    a.identityBridge?__dialogueText("systems/FinalCaseCourt.js", "t_f570e1f31f33de756185"):__dialogueText("systems/FinalCaseCourt.js", "t_3e589e93b701cfd6720b")),[
     option(__dialogueText("systems/FinalCaseCourt.js", "t_247bfeccc705917db205"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_93d32c0fbf63cd338c49")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_bfab107aaf0c6704e1ba"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_9e1414c9c9d0f234599d")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_3c0bb6ed99f4bddc1bc7"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_161547d9ba017cc1944d"))]),
  q('defense_alternative','defense',`${__dialogueText("systems/FinalCaseCourt.js", "t_b618a7f64180a3c7fe00")}${a.otherName}${__dialogueText("systems/FinalCaseCourt.js", "t_6a5b0cdd77997931584b")}`,
   option(a.alternativeCleared?`${a.otherName}${__dialogueText("systems/FinalCaseCourt.js", "t_ed17dd1a8bdd9c4a8924")}`:
    `${__dialogueText("systems/FinalCaseCourt.js", "t_4bb0b89cf48e72db4399")}${a.otherName}${__dialogueText("systems/FinalCaseCourt.js", "t_1f193ac2023c1ab8ab69")}`,a.alternativeCleared?8:0,
    a.alternativeCleared?__dialogueText("systems/FinalCaseCourt.js", "t_9b0ec274b18654866ecb"):__dialogueText("systems/FinalCaseCourt.js", "t_5c8ad71158502c2e0ca7")),[
     option(__dialogueText("systems/FinalCaseCourt.js", "t_b261f71369cd84dc36b8"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_43a0d3f15cbd91456582")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_93c5674678e76a244f27"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_da0cb88291846d9e1f39")),
     option(__dialogueText("systems/FinalCaseCourt.js", "t_ba46d12e102f53b15e88"),-5,__dialogueText("systems/FinalCaseCourt.js", "t_ace3bf0a811d90aed26d"))])
 ];
 if(a.proceduralIncident)questions.push(q('defense_procedure','defense',`${__dialogueText("systems/FinalCaseCourt.js", "t_0e7d61c86901945d95e1")}${a.proceduralIncident.source}${__dialogueText("systems/FinalCaseCourt.js", "t_adfef2a26d179067b622")}`,
  option(__dialogueText("systems/FinalCaseCourt.js", "t_b40326406367f409efa3"),-2,__dialogueText("systems/FinalCaseCourt.js", "t_e7c9c1b5608736a7e34a")),[
   option(__dialogueText("systems/FinalCaseCourt.js", "t_aedfe66d4abc0af1f0f9"),-6,__dialogueText("systems/FinalCaseCourt.js", "t_ab1db36dd3ede98953ad")),
   option(__dialogueText("systems/FinalCaseCourt.js", "t_dcfbc357ee938da50f90"),-6,__dialogueText("systems/FinalCaseCourt.js", "t_d78812a75b7417f93c0e")),
   option(__dialogueText("systems/FinalCaseCourt.js", "t_53d9ddc0c82df1dcada7"),-6,__dialogueText("systems/FinalCaseCourt.js", "t_8984533c5a5349a28769"))]));
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
 record.answers.push({questionId:q.id,answerIndex:index,delta,trust:record.trust});record.feedback=`${a.feedback}${__dialogueText("systems/FinalCaseCourt.js", "t_4a3de611585b91d0a4dc")}${delta>=0?'+':''}${delta}${__dialogueText("systems/FinalCaseCourt.js", "t_cdb4ee2aea69cc6a8333")}`;record.phase='feedback';return true;
}
export function advanceFinalCourt(record){
 if(!record||record.phase!=='feedback')return false;record.index++;
 if(record.index<record.questions.length){record.phase='question';return true;}
 const failures=record.facts.caseAssessment.failures;
 record.verdict=!record.identityExposed&&!failures.length&&record.trust>=65?'convicted':'released';record.phase='verdict';
 record.verdictExplanation=record.verdict==='convicted'?__dialogueText("systems/FinalCaseCourt.js", "t_676d7e2d74b58587b2ed"):
  failures.length?failures.map(f=>f.message).join('\n'):__dialogueText("systems/FinalCaseCourt.js", "t_673b6a0a24477ab13f3d");return true;
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