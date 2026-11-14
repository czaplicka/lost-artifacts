import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// Investigation history is case-scoped. Only explicit source metadata can confirm a claim.
const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const copy=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const text=v=>typeof v==='string'?v.trim():'';
const readable=(v,fallback=__dialogueText("systems/InvestigationAudit.js", "t_78dac884c708b6ab3b78"))=>{const s=text(v);return s&&!s.includes('_')&&!s.includes('/')&&!/\.(png|webp|json)$/i.test(s)?s:fallback;};
const short=v=>text(v).length>230?text(v).slice(0,227)+'…':text(v);
const stable=v=>JSON.stringify(v);
const norm=v=>text(v).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/^pick ?pocketing$/,'pickpocket');
const uniq=v=>[...new Set(arr(v).map(norm).filter(Boolean))].sort();
const busy=new WeakSet();
const FIELD_NAMES={identity:__dialogueText("systems/InvestigationAudit.js", "t_999f23fcd7bec7075e54"),motive:__dialogueText("systems/InvestigationAudit.js", "t_3c304325a9d42f41663b"),means:__dialogueText("systems/InvestigationAudit.js", "t_f40aa59edb5c4a6061ff"),opportunity:__dialogueText("systems/InvestigationAudit.js", "t_e969f85c47caa12786cb")};
const OPPORTUNITY={work_access:__dialogueText("systems/InvestigationAudit.js", "t_eebe01cc2fa2eb68b274"),unobserved_interval:__dialogueText("systems/InvestigationAudit.js", "t_e8346246d901524e0113"),false_alibi:__dialogueText("systems/InvestigationAudit.js", "t_5fa1438038b89dbd49bc"),borrowed_access:__dialogueText("systems/InvestigationAudit.js", "t_e96525634b7109bfdf22"),security_gap:__dialogueText("systems/InvestigationAudit.js", "t_1d968c086296e9fdc163"),public_access:__dialogueText("systems/InvestigationAudit.js", "t_23ee5e42cade819456d7")};
export function investigationScope(s){return s?.currentCaseId==null||s?._createdAt==null?null:{caseId:s.currentCaseId,campaignId:s._createdAt};}
export function theoryWorkspaceKey(s){const m=s.currentMission||{};return String(m.id??m.caseId??m.caseIndex??`${s.caseSuspectCityId??s.crimeCityId??s.crimeCity??m.city??'unknown'}_${m.artifactKey??m.artifact??'default'}`);}
function trialExists(s){return s.courtState&&same(s.courtState.caseId,s.currentCaseId)&&s.courtState.campaignId===s._createdAt;}
function boardCards(s){
 const k=theoryWorkspaceKey(s),scoped=s.crimeBoardWorkspaces?.[k];if(scoped)return arr(scoped.items);
 const b=s.crimeBoardData,m=s.currentMission||{};
 return b?.meta?.workspaceKey===k||(!b?.meta?.workspaceKey&&(!b?.meta?.caseId||b.meta.caseId===m.artifactKey))?arr(b?.items):[];
}
function explicitSupport(raw,s){
 // Optional, canonical source annotation. A player card's annotation is never trusted.
 const value=obj(raw),scope=investigationScope(s);
 if(!scope||(!same(value.caseId,scope.caseId)&&!same(value.caseKey,theoryWorkspaceKey(s))))return {};
 if(value.campaignId!=null&&value.campaignId!==scope.campaignId)return {};
 const result={};for(const field of Object.keys(FIELD_NAMES))result[field]=arr(value.supports?.[field]).filter(v=>typeof v==='string');
 return result;
}
function evidence(s,id){
 const card=boardCards(s).find(c=>same(c.id,id));
 const clue=arr(s.cluesCollected).find(c=>same(c.id,card?.clueId??id));
 const tags=arr(card?.tags),hypothesis=card?.createdByPlayer===true||tags.some(t=>['player-note','object-lab-hypothesis','reconstruction-uncertain','skill-uncertain'].includes(t));
 const current=card?.caseKey==null||same(card.caseKey,theoryWorkspaceKey(s));
 // Object-lab cards use a different, documented case key.
 const m=s.currentMission||{},reportKey=JSON.stringify([m.id??null,m.city??null,m.artifact??s.currentArtifact??null]);
 const reportCurrent=tags.includes('object-lab-report')&&card?.caseKey===reportKey;
 const scope=investigationScope(s);
 const clueCurrent=(!clue?.caseId||same(clue.caseId,scope?.caseId))&&(clue?.campaignId==null||clue.campaignId===scope?.campaignId);
 const independent=Boolean((card||clue)&&!hypothesis&&card?.discovered!==false&&(current||reportCurrent)&&clueCurrent);
 const supports=independent?explicitSupport(clue,s):{};
 const r=s.reconstructedHeist||{},skills=[];
 arr(r.playerOrderedCards).forEach((c,i)=>{
  if(arr(r.playerSlotFeedback)[i]!=='green')return;
  const claim=arr(r.claims)[i];if(!claim||!same(claim.solutionItemId,c?.id))return;
  const skill=norm(claim.thiefSkill),slug=skill.replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  if(skill&&card?.id===`hypothesis-skill-${slug}`&&!hypothesis)skills.push(skill);
 });
 if(clue?.type==='reconstruction'&&clue.confirmed===true&&r.hypothesisConfirmed===true&&!hypothesis)skills.push(...uniq(clue.skills));
 if(skills.length)supports.means=uniq([...(supports.means||[]),...skills]);
 return {id:String(id),label:readable(card?.label??clue?.title??clue?.label,__dialogueText("systems/InvestigationAudit.js", "t_b2787bc68315124f909a")),
  text:text(card?.body??card?.text??clue?.text),exists:Boolean(card||clue),independent,
  category:text(clue?.category??clue?.type??card?.category),tags:copy(tags),
  sourceId:clue?.id??card?.clueId??null,canonicalIds:clue?[clue.id,clue.evidenceId].filter(Boolean):[],supports};
}
function snapshotTheory(s){
 const draft=s.caseTheories?.[theoryWorkspaceKey(s)];if(!draft)return null;
 const sections={};for(const field of Object.keys(FIELD_NAMES)){
  const v=obj(draft.sections?.[field]);sections[field]={answerId:text(v.answerId),skillIds:uniq(v.skillIds),
   evidenceIds:[...new Set(arr(v.evidenceIds).filter(x=>typeof x==='string'))].sort(),note:text(v.note),evidence:arr(v.evidenceIds).map(id=>evidence(s,id))};
 }return {workspaceKey:theoryWorkspaceKey(s),sections};
}
function fingerprint(t){return t?stable(Object.fromEntries(Object.entries(t.sections).map(([k,v])=>[k,{answerId:v.answerId,skillIds:v.skillIds,evidenceIds:v.evidenceIds}]))):'';}
function journal(s){
 const scope=investigationScope(s);if(!scope)return null;const old=s.caseData?.investigationAudit;
 if(old&&same(old.caseId,scope.caseId)&&old.campaignId===scope.campaignId){
  if(old.version!==1||!Array.isArray(old.events)||!Number.isInteger(old.nextSequence))throw new Error('Unsupported or damaged investigation history.');
  return old;
 }
 const j={version:1,...scope,nextSequence:1,startedAt:new Date().toISOString(),lastTheoryFingerprint:'',events:[]};
 if(!s.caseData||typeof s.caseData!=='object')s.caseData={};s.caseData.investigationAudit=j;return j;
}
function stamp(v){const n=Date.parse(v);return Number.isFinite(n)?n:null;}
function append(j,kind,sourceKey,payload,createdAt=null){
 if(sourceKey&&j.events.some(e=>e.kind===kind&&e.sourceKey===sourceKey))return false;
 const sequence=j.nextSequence++,now=new Date().toISOString();
 j.events.push({id:`investigation-${sequence}`,sequence,kind,sourceKey:sourceKey??null,createdAt:stamp(createdAt)!=null?createdAt:now,
  capturedAt:now,sourceTimeKnown:stamp(createdAt)!=null||['theory','heist'].includes(kind),payload:copy(payload)});return true;
}
function caseName(s,id){const p=[...arr(s.caseSuspects),...arr(s.suspects),...arr(s.suspectList)].find(x=>same(x.id,id));return readable(p?.publicProfile?.displayName??p?.publicProfile?.name??p?.name,__dialogueText("systems/InvestigationAudit.js", "t_d19064653f3ca971114c"));}
function sceneName(v){return ({tower:__dialogueText("systems/InvestigationAudit.js", "t_4466fbb570179bdf6f12"),louvre:__dialogueText("systems/InvestigationAudit.js", "t_31aad697ea127f6c9852"),auction_house:__dialogueText("systems/InvestigationAudit.js", "t_b35e54c661e8054be3a5"),action_house:__dialogueText("systems/InvestigationAudit.js", "t_b35e54c661e8054be3a5"),castle:__dialogueText("systems/InvestigationAudit.js", "t_fa409d3a46a0c463a428"),havela:__dialogueText("systems/InvestigationAudit.js", "t_936a9c1028d79af2a47e"),dockyard:__dialogueText("systems/InvestigationAudit.js", "t_ccf5689c96c2194c2ba6"),FingerprintScene:__dialogueText("systems/InvestigationAudit.js", "t_a8fd2b4e2906c47dbba6"),ShoeprintScene:__dialogueText("systems/InvestigationAudit.js", "t_38a4e6a9e0d0f7129d66"),BloodTypeScene:__dialogueText("systems/InvestigationAudit.js", "t_3a150f611487e5433a95"),HandednessScene:__dialogueText("systems/InvestigationAudit.js", "t_e8d2c426848b24ff496f")})[v]||__dialogueText("systems/InvestigationAudit.js", "t_ac21b399843b98364cbb");}
function itemName(s,id){const c=[...arr(s.reconstructedHeist?.allCards),...arr(s.cluesCollected)].find(x=>same(x.id,id));return readable(c?.item??c?.title??c?.label,__dialogueText("systems/InvestigationAudit.js", "t_dd69e584a6567d0442bc"));}
function subjectSnapshot(s,v){return {suspectId:v.suspectId,suspectName:caseName(s,v.suspectId),
 witnesses:arr(v.witnesses).map(w=>({npcId:w.npcId,role:readable(w.role,__dialogueText("systems/InvestigationAudit.js", "t_27b4dd42fffed27eb8c3")),statement:text(w.statement),isLiar:w.isLiar===true})),
 cards:arr(v.boardCards).map(c=>({id:c.id,role:readable(c.role,__dialogueText("systems/InvestigationAudit.js", "t_94b98e56b19302af2b51")),label:text(c.label),minute:Number.isInteger(c.minute)?c.minute:null})),
 trueTimeline:arr(v.trueTimeline).map(c=>c.id),alibiType:v.alibiType};}
function collect(s,j){
 const pending=[];
 for(const e of [...arr(s.hintState?.usageHistory),...arr(s.courtMisconductLog)]){
  if(!e||!same(e.caseId,j.caseId)||(e.campaignId!=null&&e.campaignId!==j.campaignId)||e.id==null)continue;
  if(e.method!=='cut_corners'&&!(Number(e.moralDelta)<0))continue;
  const receipt=Object.values(s.forensicHintReceipts||{}).find(r=>r?.historyEntryId===e.id),key=String(e.id);
  const payload={method:e.method??e.type??__dialogueText("systems/InvestigationAudit.js", "t_6eae1c313719ceb0c859"),sceneId:e.sceneId??null,itemId:e.itemId??null,
   location:readable(e.locationName,sceneName(e.sceneId)),item:itemName(s,e.itemId),issue:text(e.proceduralIssue),assistanceText:text(receipt?.text),moralDelta:Number(e.moralDelta)||0};
  const existing=j.events.find(x=>x.kind==='procedure'&&x.sourceKey===key);
  if(existing){if(receipt&&!existing.payload.assistanceText)existing.payload.assistanceText=payload.assistanceText;continue;}
  pending.push({kind:'procedure',key,payload,date:e.createdAt});
 }
 for(const [key,g]of Object.entries(s.caseData?.alibiCases||{}))for(const v of arr(g?.suspects)){
  const f=v.playerConclusion;if(!f?.locked)continue;
  pending.push({kind:'alibi_filed',key:JSON.stringify([key,v.suspectId]),date:f.filedAt,
   payload:{...subjectSnapshot(s,v),caseKey:key,choice:f.choice,timelineIds:arr(f.timelineIds),evaluation:obj(f.evaluation)}});
 }
 const m=s.currentMission||{},currentKey=JSON.stringify([s.currentCaseId??m.caseId??m.id??m.missionId??null,s.investigationStartTime??null,s.crimeCityId??null,m.artifactKey??null]);
 for(const check of arr(arr(s.deductionState?.cases).find(c=>c.caseKey===currentKey)?.checks)){
  let selection,target;try{selection=JSON.parse(check.selectionKey);}catch{continue;}
  if(check.sceneId==='AlibiTimelineScene'){
   try{target=JSON.parse(check.targetId);}catch{continue;}if(!Array.isArray(target)||target.length<3)continue;
   const v=s.caseData?.alibiCases?.[target[0]]?.suspects?.find(x=>same(x.suspectId,target[1]));if(!v)continue;
   pending.push({kind:'alibi_check',key:check.checkKey,date:check.createdAt,payload:{...subjectSnapshot(s,v),caseKey:target[0],target,selection,status:check.result?.status,message:check.result?.message}});
  }else if(check.sceneId==='CrimeBoard'&&check.targetId==='motive')pending.push({kind:'motive_check',key:check.checkKey,date:check.createdAt,payload:{selection,status:check.result?.status,message:check.result?.message}});
 }
 pending.sort((a,b)=>(stamp(a.date)??Infinity)-(stamp(b.date)??Infinity)||(a.kind==='alibi_filed'?1:0)-(b.kind==='alibi_filed'?1:0));
 for(const e of pending)append(j,e.kind,e.key,e.payload,e.date);
}
export function captureInvestigationAudit(s){
 if(!s||busy.has(s)||!investigationScope(s)||trialExists(s))return false;busy.add(s);
 try{const j=journal(s);if(!j)return false;const before=j.events.length;collect(s,j);
  const snapshot=snapshotTheory(s),key=fingerprint(snapshot);if(snapshot&&key!==j.lastTheoryFingerprint){append(j,'theory',null,snapshot);j.lastTheoryFingerprint=key;}
  return before!==j.events.length;
 }finally{busy.delete(s);}
}
export function recordHeistAttempt(s,{cityId=null,sceneId=null,orderedCards=[],feedback=[],claims=[]}={}){
 if(!s||trialExists(s)||arr(orderedCards).length!==3||orderedCards.some(c=>!c)||arr(feedback).length!==3||feedback.some(v=>!['green','yellow','red'].includes(v)))return false;
 captureInvestigationAudit(s);const j=journal(s);if(!j)return false;
 const attempt=j.events.filter(e=>e.kind==='heist'&&e.payload.sceneId===sceneId&&e.payload.cityId===cityId).length+1;
 const slots=orderedCards.map((card,index)=>{const claim=claims[index],use=arr(card.reconstructionUses).find(u=>u.questionId===claim?.questionId);
  return {index,cardId:card.id??null,card:readable(card.item,__dialogueText("systems/InvestigationAudit.js", "t_dc15ed84c0d59f2479db")),question:readable(claim?.prompt,[__dialogueText("systems/InvestigationAudit.js", "t_5c0914d61180407ab3c2"),__dialogueText("systems/InvestigationAudit.js", "t_722a503ab96d339ac3b1"),__dialogueText("systems/InvestigationAudit.js", "t_3eb9219b80a979ee72f5")][index]),questionId:claim?.questionId??null,
   answer:text(use?.slotSentence??use?.answer??card.slotSentence??card.answer??card.item),explanation:text(use?.heistExplanation??card.heistExplanation),feedback:feedback[index]};});
 return append(j,'heist',null,{cityId,sceneId,attempt,slots});
}
function actualId(s){return s.trueThiefCaseSuspectId??s.realThiefSuspectId??s.caseData?.trueThiefCaseSuspectId??s.caseData?.realThiefSuspectId??s.currentThiefCaseSuspectId??s.currentThief?.caseSuspectId??s.currentThief?.id??s.currentThiefId;}
function requiredSkills(s){const r=s.reconstructedHeist||{};return arr(r.requiredSkills).length?uniq(r.requiredSkills):uniq(arr(r.claims).map(c=>c.thiefSkill));}
function sourceAfter(a,b){
 const at=stamp(a.createdAt),bt=stamp(b.createdAt);
 if(at!=null&&bt!=null&&a.sourceTimeKnown!==false&&b.sourceTimeKnown!==false&&at!==bt)return at>bt;
 return Number(a.sequence)>Number(b.sequence);
}
function alibiMatch(a,b){return same(a.payload?.suspectId,b.payload?.suspectId)&&same(a.payload?.caseKey,b.payload?.caseKey);}
function correctedAlibi(events,event,field){
 // Filing locks this board. A check for that same board can only precede its final filing.
 return events.find(e=>e.kind==='alibi_filed'&&alibiMatch(e,event)&&e.payload.evaluation?.[field]===true&&
  (event.kind==='alibi_check'||sourceAfter(e,event)));
}
export function assessTheoryEvidence(section,field,{motiveAnswerId=null,motiveEvidenceIds=[]}={}){
 const refs=arr(section?.evidence),selected=field==='means'?uniq(section?.skillIds):[text(section?.answerId)].filter(Boolean);
 if(!refs.length)return {status:'missing',labels:[]};
 const valid=refs.filter(e=>e.exists&&e.independent),invalid=refs.filter(e=>!e.exists||!e.independent);
 if(invalid.length)return {status:'invalid',labels:invalid.map(e=>e.label)};
 const covered=new Set();
 for(const e of valid){
  const matches=arr(e.supports?.[field]);for(const v of matches)covered.add(field==='means'?norm(v):v);
  if(field==='motive'&&motiveAnswerId&&arr(e.canonicalIds).some(id=>motiveEvidenceIds.includes(id)))covered.add(motiveAnswerId);
 }
 if(selected.length&&selected.every(v=>covered.has(v)))return {status:'supported',labels:valid.map(e=>e.label)};
 const obviouslyUnrelated=e=>arr(e.tags).some(t=>['mission','artifact','scene-photo','suspect','unknown'].includes(t))||
  (field==='motive'&&arr(e.tags).some(t=>['forensics','hypothesis-skill','reconstruction'].includes(t)))||
  (field!=='motive'&&arr(e.canonicalIds).some(id=>motiveEvidenceIds.includes(id)));
 return {status:valid.every(obviouslyUnrelated)?'irrelevant':'unverified',labels:valid.map(e=>e.label)};
}
export function buildInvestigationChallenges(s,{motiveAnswerId=null,motiveLabels={},motiveEvidenceIds=[]}={}){
 captureInvestigationAudit(s);const scope=investigationScope(s),j=s.caseData?.investigationAudit;
 if(!scope||j?.version!==1||!same(j.caseId,scope.caseId)||j.campaignId!==scope.campaignId)return [];
 const events=[...arr(j.events)].sort((a,b)=>{
  const at=stamp(a.createdAt),bt=stamp(b.createdAt);if(at!=null&&bt!=null&&at!==bt)return at-bt;
  return (a.kind==='alibi_filed'?1:0)-(b.kind==='alibi_filed'?1:0)||a.sequence-b.sequence;
 });
 const findings=new Map(),finalTheory=snapshotTheory(s),skills=requiredSkills(s),evidenceRules={motiveAnswerId,motiveEvidenceIds};
 const add=(key,event,details)=>{
  const old=findings.get(key);if(old){
   if(!old.sourceEventIds.includes(event.id)){old.sourceEventIds.push(event.id);old.occurrences=old.sourceEventIds.length;}
   return;
  }
  findings.set(key,{id:`challenge-${findings.size+1}`,caseId:scope.caseId,campaignId:scope.campaignId,sourceEventIds:[event.id],occurrences:1,...details});
 };
 const motiveLabel=id=>readable(motiveLabels[id],readable(text(id).replace(/_/g,' '),__dialogueText("systems/InvestigationAudit.js", "t_d784e554c660daf1619f")));
 const answer=(field,v)=>field==='means'?uniq(v.skillIds).join(', '):field==='identity'?caseName(s,v.answerId):field==='motive'?motiveLabel(v.answerId):OPPORTUNITY[v.answerId]||__dialogueText("systems/InvestigationAudit.js", "t_1b5e22409f378008835e");
 const correct=(field,v)=>field==='identity'?(actualId(s)==null?null:same(v.answerId,actualId(s))):field==='motive'?(motiveAnswerId==null?null:v.answerId===motiveAnswerId):field==='means'?(skills.length?stable(uniq(v.skillIds))===stable(skills):null):null;
 for(const event of events){const p=obj(event.payload);
  if(event.kind==='procedure'){
   const description=p.method==='cut_corners'?__dialogueText("systems/InvestigationAudit.js", "t_7e02af974774b041b9af"):__dialogueText("systems/InvestigationAudit.js", "t_b66d66166e88c5a6c1d2");
   add(`procedure:${event.sourceKey}`,event,{category:'procedure',claim:`${description}${__dialogueText("systems/InvestigationAudit.js", "t_8072854c26bcc2f0f8a0")}${p.location}${__dialogueText("systems/InvestigationAudit.js", "t_4fcd8fb1302cd1f7263e")}${p.item}`,
    counter:p.assistanceText?`${__dialogueText("systems/InvestigationAudit.js", "t_cc800d3a0db3ab7d5cec")}${p.assistanceText}${__dialogueText("systems/InvestigationAudit.js", "t_73a14fb1a3f05bf1fb8f")}`:__dialogueText("systems/InvestigationAudit.js", "t_98a82ff39863dad16490"),
    resolution:'breach',severity:3,reply:`${__dialogueText("systems/InvestigationAudit.js", "t_d759215b14c939fa4f78")}${description}${__dialogueText("systems/InvestigationAudit.js", "t_a04d882a015cecd1fb33")}`});
  }
  if(event.kind==='heist')for(const slot of arr(p.slots)){
   if(slot.feedback==='green')continue;
   const later=events.filter(e=>e.kind==='heist'&&sourceAfter(e,event)&&e.payload.sceneId===p.sceneId&&e.payload.cityId===p.cityId)
    .flatMap(e=>arr(e.payload.slots)).find(v=>v.index===slot.index&&v.feedback==='green'&&(!slot.questionId||v.questionId===slot.questionId));
   add(`heist:${p.sceneId}:${p.cityId}:${slot.index}:${slot.questionId}:${slot.cardId}:${slot.feedback}`,event,{category:'heist',
    claim:`${__dialogueText("systems/InvestigationAudit.js", "t_c2771410defa65d93198")}${p.attempt}${__dialogueText("systems/InvestigationAudit.js", "t_7c939e2848dd47274a7d")}${slot.card}${__dialogueText("systems/InvestigationAudit.js", "t_e68be884fa0fe72c2c67")}${slot.question}${__dialogueText("systems/InvestigationAudit.js", "t_4b6b1bf3818d4e6c9c43")}`,
    counter:later?`${__dialogueText("systems/InvestigationAudit.js", "t_662a3e5af28b25204b27")}${later.card}${__dialogueText("systems/InvestigationAudit.js", "t_f4a026e4e7ea5c6fbe04")}${later.explanation||''}`:slot.feedback==='yellow'?__dialogueText("systems/InvestigationAudit.js", "t_4990befdd224e601538d"):__dialogueText("systems/InvestigationAudit.js", "t_728df91619396a4b2ccb"),
    resolution:later?'corrected':'unresolved',severity:later?2:6,reply:later?`${__dialogueText("systems/InvestigationAudit.js", "t_654b422c3f6a8bacbe50")}${later.card}${__dialogueText("systems/InvestigationAudit.js", "t_f4a026e4e7ea5c6fbe04")}${later.explanation||''}`:`${__dialogueText("systems/InvestigationAudit.js", "t_00b7fd12e9ac148e78be")}${slot.card}${__dialogueText("systems/InvestigationAudit.js", "t_fd9d5427c6fcc1bccd27")}${slot.question}${__dialogueText("systems/InvestigationAudit.js", "t_73a14fb1a3f05bf1fb8f")}`});
  }
  if(event.kind==='theory')for(const [field,v]of Object.entries(p.sections||{})){
   if(!FIELD_NAMES[field]||!(field==='means'?arr(v.skillIds).length:v.answerId))continue;
   const final=finalTheory?.sections[field],wrong=correct(field,v)===false,extraSkill=field==='means'&&skills.length&&uniq(v.skillIds).some(id=>!skills.includes(id));
   const keyValue=field==='means'?uniq(v.skillIds).join('|'):v.answerId;
   if(wrong&&(field!=='means'||extraSkill)){
    const repaired=final&&correct(field,final)===true;
    const counter=field==='means'?`${__dialogueText("systems/InvestigationAudit.js", "t_8ccceeb477d21a967679")}${skills.join(', ')}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:field==='motive'?`${__dialogueText("systems/InvestigationAudit.js", "t_8414e9e0a1d361f4fbbe")}${motiveLabel(motiveAnswerId)}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:__dialogueText("systems/InvestigationAudit.js", "t_285daa74787344e5bd4d");
    add(`theory:${field}:${keyValue}`,event,{category:'case_theory',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_50667ab8cee255054169")}${FIELD_NAMES[field]}${__dialogueText("systems/InvestigationAudit.js", "t_8cdc07da288094d27737")}${answer(field,v)}${__dialogueText("systems/InvestigationAudit.js", "t_4b6b1bf3818d4e6c9c43")}`,counter,
     resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,
     reply:repaired?`${__dialogueText("systems/InvestigationAudit.js", "t_53af74a214575ce840dd")}${answer(field,final)}${__dialogueText("systems/InvestigationAudit.js", "t_f4a026e4e7ea5c6fbe04")}${counter}`:`${__dialogueText("systems/InvestigationAudit.js", "t_65aa6ca823f243669cac")}${counter}`});
   }
   const initial=assessTheoryEvidence(v,field,evidenceRules);
   if(initial.status!=='supported'){
    const current=final?assessTheoryEvidence(final,field,evidenceRules):{status:'missing',labels:[]};
    const repaired=current.status==='supported'&&correct(field,final)!==false;
    const uncertain=!repaired&&current.status==='unverified';
    const reason=initial.status==='missing'?__dialogueText("systems/InvestigationAudit.js", "t_c76db4327ef6ce7e1fb9"):initial.status==='invalid'?__dialogueText("systems/InvestigationAudit.js", "t_c752e07e2513161290f9"):initial.status==='irrelevant'?__dialogueText("systems/InvestigationAudit.js", "t_48cb0a6af65a8290acd8"):__dialogueText("systems/InvestigationAudit.js", "t_6247229986ae6629f437");
    add(`support:${field}:${keyValue}`,event,{category:'support',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_50667ab8cee255054169")}${FIELD_NAMES[field]}${__dialogueText("systems/InvestigationAudit.js", "t_8609143cdfc7cb8e0036")}${answer(field,v)}${__dialogueText("systems/InvestigationAudit.js", "t_266395af670265f0019c")}${reason}`,
     counter:repaired?`${__dialogueText("systems/InvestigationAudit.js", "t_d879b441dfff750ea86f")}${current.labels.join(', ')}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:
      current.status==='irrelevant'?`${__dialogueText("systems/InvestigationAudit.js", "t_d7de805d32a356c79e28")}${current.labels.join(', ')}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:
      uncertain?__dialogueText("systems/InvestigationAudit.js", "t_772910c460a8ccc27508"):__dialogueText("systems/InvestigationAudit.js", "t_01361306828bdd75f888"),
     resolution:repaired?'documented':'unresolved',evidenceStatus:uncertain?'unverified':current.status,severity:repaired||uncertain?1:4,
     reply:repaired?`${__dialogueText("systems/InvestigationAudit.js", "t_de5aaa3320376a392ceb")}${current.labels.join(__dialogueText("systems/InvestigationAudit.js", "t_0a07f659461970d8d8dc"))}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:
      uncertain?__dialogueText("systems/InvestigationAudit.js", "t_024119d57368806c5a36"):__dialogueText("systems/InvestigationAudit.js", "t_3185c273d5db564bd17d")});
   }
  }
  if(event.kind==='motive_check'&&p.status==='contradicted'&&p.selection?.guessId){
   const guess=p.selection.guessId,final=finalTheory?.sections?.motive,repaired=final&&correct('motive',final)===true;
   add(`theory:motive:${guess}`,event,{category:'case_theory',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_4f6b8beaea9bd125c82e")}${motiveLabel(guess)}${__dialogueText("systems/InvestigationAudit.js", "t_4b6b1bf3818d4e6c9c43")}`,counter:text(p.message)||__dialogueText("systems/InvestigationAudit.js", "t_d454d8c12f6f74b500df"),
    resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,reply:repaired?`${__dialogueText("systems/InvestigationAudit.js", "t_7cf703edd568174062ce")}${answer(__dialogueText("systems/InvestigationAudit.js", "t_e17abe0e23f5e2330ad6"),final)}${__dialogueText("systems/InvestigationAudit.js", "t_73a14fb1a3f05bf1fb8f")}`:__dialogueText("systems/InvestigationAudit.js", "t_060e00ec0659de4ef259")});
  }
  if(event.kind==='alibi_check'||event.kind==='alibi_filed'){
   const filed=event.kind==='alibi_filed',choice=filed?p.choice:p.selection?.choice,timeline=arr(p.timelineIds);
   const bad=filed?p.evaluation?.conclusionCorrect===false:choice!=null&&p.status==='contradicted';
   const label=id=>{const w=arr(p.witnesses).find(x=>x.npcId===id);return w?`${w.role}${__dialogueText("systems/InvestigationAudit.js", "t_94e38d9effa9ef48156b")}`:__dialogueText("systems/InvestigationAudit.js", "t_030d647aaf563159f2ba");};
   if(bad){const later=correctedAlibi(events,event,'conclusionCorrect');
    add(`alibi:${p.caseKey}:${p.suspectId}:choice:${choice}`,event,{category:'alibi',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_21f4c696f93fb96f5f71")}${p.suspectName}${__dialogueText("systems/InvestigationAudit.js", "t_1a077c28e2101d1947cd")}${label(choice)}`,
     counter:arr(p.witnesses).map(w=>`${w.role}: “${w.statement}”`).join('\n\n')||__dialogueText("systems/InvestigationAudit.js", "t_e654d2852b7e28afe866"),
     resolution:later?'corrected':'unresolved',severity:later?2:7,reply:later?`${__dialogueText("systems/InvestigationAudit.js", "t_a4be5370c55c3f43c7cd")}${label(later.payload.choice)}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}`:__dialogueText("systems/InvestigationAudit.js", "t_e1f1c57a8904ba67eb11")});
   }
   const indices=filed&&p.evaluation?.timelineCorrect===false?[0,1,2].filter(i=>p.trueTimeline?.[i]!==timeline[i]):!filed&&p.target?.[2]==='timeline'&&p.status==='contradicted'?[p.selection?.index]:[];
   for(const index of indices){
    if(!Number.isInteger(index)||index<0||index>2)continue;
    const selected=filed?timeline[index]:p.selection.cardId,card=arr(p.cards).find(c=>c.id===selected),sorted=[...arr(p.cards)].filter(c=>Number.isInteger(c.minute)).sort((a,b)=>a.minute-b.minute),expected=sorted[index];
    if(!card||!Number.isInteger(card.minute)||!expected||card.minute===expected.minute)continue;
    const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`,later=correctedAlibi(events,event,'timelineCorrect');
    add(`alibi:${p.caseKey}:${p.suspectId}:slot:${index}:${selected}`,event,{category:'alibi',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_21f4c696f93fb96f5f71")}${p.suspectName}${__dialogueText("systems/InvestigationAudit.js", "t_5510f69776fdef5e6a13")}${index+1}${__dialogueText("systems/InvestigationAudit.js", "t_9a336391bcfa47a81de4")}${card.role}${__dialogueText("systems/InvestigationAudit.js", "t_086a519fdeedb29a622b")}${clock(card.minute)}`,
     counter:`${__dialogueText("systems/InvestigationAudit.js", "t_e709366cc71ff35cbf83")}${index+1}${__dialogueText("systems/InvestigationAudit.js", "t_c79a29181111aeeef922")}${expected.role}${__dialogueText("systems/InvestigationAudit.js", "t_086a519fdeedb29a622b")}${clock(expected.minute)}${__dialogueText("systems/InvestigationAudit.js", "t_2dffa185c2d2de739a33")}`,
     resolution:later?'corrected':'unresolved',severity:later?2:5,reply:`${__dialogueText("systems/InvestigationAudit.js", "t_83739e53701093a05eec")}${expected.role}${__dialogueText("systems/InvestigationAudit.js", "t_086a519fdeedb29a622b")}${clock(expected.minute)}${__dialogueText("systems/InvestigationAudit.js", "t_b309334dceee9bfad86f")}`});
   }
  }
 }
 for(const field of Object.keys(FIELD_NAMES)){
  const v=finalTheory?.sections[field],missing=field==='means'?!arr(v?.skillIds).length:!v?.answerId;
  const partial=field==='means'&&arr(v?.skillIds).length&&skills.length&&stable(uniq(v.skillIds))!==stable(skills)&&!uniq(v.skillIds).some(id=>!skills.includes(id));
  if(missing||partial)add(`trial-missing:${field}`,{id:'trial-file'},{category:'case_theory',claim:`${__dialogueText("systems/InvestigationAudit.js", "t_931ae616c6f0694ebecb")}${missing?__dialogueText("systems/InvestigationAudit.js", "t_cf77981a94e678a2bbce"):__dialogueText("systems/InvestigationAudit.js", "t_e413c4794d352addeb06")}${__dialogueText("systems/InvestigationAudit.js", "t_36a9e7f1c95b82ffb997")}${FIELD_NAMES[field]}${__dialogueText("systems/InvestigationAudit.js", "t_36733bb4d69a439a0c31")}`,
   counter:__dialogueText("systems/InvestigationAudit.js", "t_db8e422c9712af0b805a"),resolution:'unresolved',severity:4,reply:`${__dialogueText("systems/InvestigationAudit.js", "t_103c5169871d49be7a2e")}${FIELD_NAMES[field]}${__dialogueText("systems/InvestigationAudit.js", "t_637c30d1373dc05b6fa1")}`});
 }
 return [...findings.values()];
}
function shuffle(answers,id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}return answers;}
function legacyQuestions(challenges){
 return challenges.map(c=>{
  const corrected=['corrected','documented'].includes(c.resolution),best=corrected?c.severity:c.resolution==='breach'?1:0;
  const answers=[
   {text:c.reply,delta:best,feedback:corrected?__dialogueText("systems/InvestigationAudit.js", "t_4e24cc5946e0d8bde3d9"):__dialogueText("systems/InvestigationAudit.js", "t_c104618b9d4fa996ebe8")},
   {text:`${__dialogueText("systems/InvestigationAudit.js", "t_78c8497463748dedad7a")}${c.claim}${__dialogueText("systems/InvestigationAudit.js", "t_8d9b41fbb5199005ada3")}`,delta:-8,feedback:__dialogueText("systems/InvestigationAudit.js", "t_cdfa1dcd27ea5d2a124e")},
   {text:__dialogueText("systems/InvestigationAudit.js", "t_068fdf5529ad54249c9d"),delta:-10,feedback:__dialogueText("systems/InvestigationAudit.js", "t_903e6ead8f83727559e1")},
   {text:__dialogueText("systems/InvestigationAudit.js", "t_3f01d02d4b5da6c9ddb2"),delta:-9,feedback:__dialogueText("systems/InvestigationAudit.js", "t_ea8b406cefd3bdd43f6e")}
  ];
  shuffle(answers,c.id);
  return {id:`defendant_${c.id}`,side:'defense',speaker:__dialogueText("systems/InvestigationAudit.js", "t_94cbd591bdfbeb1170ae"),challengeId:c.id,
   text:`${__dialogueText("systems/InvestigationAudit.js", "t_ba33923a59a0cee597c3")}${c.claim.charAt(0).toUpperCase()+c.claim.slice(1)}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}${c.occurrences>1?`${__dialogueText("systems/InvestigationAudit.js", "t_44fb4e043ed40e0367d2")}${c.occurrences}${__dialogueText("systems/InvestigationAudit.js", "t_cece737b4c254037edb5")}`:''}${__dialogueText("systems/InvestigationAudit.js", "t_01ba4719c80b6fe911b0")}${c.counter}`,
   answers,baseDelta:-c.severity,identityExposed:false};
 });
}
export function investigationQuestions(challenges,version=1){
 if(version===1)return legacyQuestions(challenges);
 if(version!==2)throw new Error('Unsupported investigation question version.');
 return challenges.map(c=>{
  const repaired=['corrected','documented'].includes(c.resolution),unverified=c.category==='support'&&c.evidenceStatus==='unverified';
  const best=repaired||unverified?c.severity:c.resolution==='breach'?1:0;
  const answers=shuffle([
   {text:c.reply,delta:best,feedback:repaired?__dialogueText("systems/InvestigationAudit.js", "t_f23bed6b2fcca2ce08ae"):unverified?__dialogueText("systems/InvestigationAudit.js", "t_82679d3b83c4bd627c79"):__dialogueText("systems/InvestigationAudit.js", "t_1b6c5bc2a50a97afe89c")},
   {text:`${__dialogueText("systems/InvestigationAudit.js", "t_78c8497463748dedad7a")}${c.claim}${__dialogueText("systems/InvestigationAudit.js", "t_f122def372ba88715c93")}`,delta:-8,feedback:__dialogueText("systems/InvestigationAudit.js", "t_6728b0ec54d4d5a731ac")},
   {text:__dialogueText("systems/InvestigationAudit.js", "t_cf3c342787d76c80f654"),delta:-10,feedback:__dialogueText("systems/InvestigationAudit.js", "t_bae9fac520579011e0da")},
   {text:__dialogueText("systems/InvestigationAudit.js", "t_07b1ef9c6b8c5980057e"),delta:-9,feedback:__dialogueText("systems/InvestigationAudit.js", "t_19ad6ed54678e36ebd82")}
  ],c.id);
  return {id:`defendant_${c.id}`,side:'defense',speaker:__dialogueText("systems/InvestigationAudit.js", "t_94cbd591bdfbeb1170ae"),challengeId:c.id,
   text:`${__dialogueText("systems/InvestigationAudit.js", "t_bf42af3f3b84dfb50024")}${c.claim.charAt(0).toUpperCase()+c.claim.slice(1)}${__dialogueText("systems/InvestigationAudit.js", "t_cdb4ee2aea69cc6a8333")}${c.occurrences>1?`${__dialogueText("systems/InvestigationAudit.js", "t_588284413976f3e69222")}${c.occurrences}${__dialogueText("systems/InvestigationAudit.js", "t_cdf75ab917095eb9a655")}`:''}${__dialogueText("systems/InvestigationAudit.js", "t_75a11da44c802486bc6f")}${c.counter}`,
   answers,baseDelta:-c.severity,identityExposed:false};
 });
}
