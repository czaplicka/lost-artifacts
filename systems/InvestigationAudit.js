// Pure collection and assessment: no persistence imports and no UI-side answer oracle.
const arr=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const copy=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const text=value=>typeof value==='string'?value.trim():'';
const readable=(value,fallback='the recorded item')=>{
 const s=text(value);return s&&!s.includes('_')&&!s.includes('/')&&!/\.(png|webp|json)$/i.test(s)?s:fallback;
};
const short=value=>text(value).length>230?text(value).slice(0,227)+'…':text(value);
const stable=value=>JSON.stringify(value);
const norm=value=>text(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/^pick ?pocketing$/,'pickpocket');
const uniq=value=>[...new Set(arr(value).map(norm).filter(Boolean))].sort();
const busy=new WeakSet();
const FIELD_NAMES={identity:'Identity',motive:'Motive',means:'Means',opportunity:'Opportunity'};
const OPPORTUNITY={work_access:'work duties provided access',unobserved_interval:'an unobserved interval',false_alibi:'a false alibi concealed presence',borrowed_access:'borrowed or stolen credentials',security_gap:'a security gap',public_access:'public opening hours'};
export function investigationScope(state){
 if(state?.currentCaseId==null||state?._createdAt==null)return null;
 return {caseId:state.currentCaseId,campaignId:state._createdAt};
}
export function theoryWorkspaceKey(state){
 const m=state.currentMission||{};
 return String(m.id??m.caseId??m.caseIndex??`${state.caseSuspectCityId??state.crimeCityId??state.crimeCity??m.city??'unknown'}_${m.artifactKey??m.artifact??'default'}`);
}
function boardCards(state){
 const k=theoryWorkspaceKey(state),scoped=state.crimeBoardWorkspaces?.[k];
 if(scoped)return arr(scoped.items);
 const b=state.crimeBoardData,m=state.currentMission||{};
 return b?.meta?.workspaceKey===k||(!b?.meta?.workspaceKey&&(!b?.meta?.caseId||b.meta.caseId===m.artifactKey))?arr(b?.items):[];
}
function evidence(state,id){
 const card=boardCards(state).find(c=>same(c.id,id));
 const clue=arr(state.cluesCollected).find(c=>same(c.id,card?.clueId??id));
 return {id:String(id),label:readable(card?.label??clue?.title??clue?.label,'an unnamed evidence reference'),
  text:text(card?.body??card?.text??clue?.text),exists:Boolean(card||clue),
  independent:Boolean((card||clue)&&card?.createdByPlayer!==true&&card?.discovered!==false),
  category:text(clue?.category??clue?.type??card?.category),sourceId:clue?.id??card?.clueId??null};
}
function snapshotTheory(state){
 const draft=state.caseTheories?.[theoryWorkspaceKey(state)];if(!draft)return null;
 const sections={};for(const field of Object.keys(FIELD_NAMES)){
  const raw=obj(draft.sections?.[field]);sections[field]={answerId:text(raw.answerId),skillIds:uniq(raw.skillIds),
   evidenceIds:[...new Set(arr(raw.evidenceIds).filter(v=>typeof v==='string'))].sort(),note:text(raw.note),
   evidence:arr(raw.evidenceIds).map(id=>evidence(state,id))};
 }return {workspaceKey:theoryWorkspaceKey(state),sections};
}
function theoryFingerprint(snapshot){
 if(!snapshot)return '';
 return stable(Object.fromEntries(Object.entries(snapshot.sections).map(([field,s])=>[field,
  {answerId:s.answerId,skillIds:s.skillIds,evidenceIds:s.evidenceIds}])));
}
function journal(state){
 const scope=investigationScope(state);if(!scope)return null;
 const old=state.caseData?.investigationAudit;
 if(old&&same(old.caseId,scope.caseId)&&old.campaignId===scope.campaignId){
  if(old.version!==1||!Array.isArray(old.events)||!Number.isInteger(old.nextSequence))return null;
  return old;
 }
 const value={version:1,...scope,nextSequence:1,startedAt:new Date().toISOString(),lastTheoryFingerprint:'',events:[]};
 if(!state.caseData||typeof state.caseData!=='object')state.caseData={};
 state.caseData.investigationAudit=value;return value;
}
function append(j,kind,sourceKey,payload,createdAt=null){
 if(sourceKey&&j.events.some(e=>e.kind===kind&&e.sourceKey===sourceKey))return false;
 const sequence=j.nextSequence++;j.events.push({id:`investigation-${sequence}`,sequence,kind,sourceKey:sourceKey??null,
  createdAt:createdAt||new Date().toISOString(),capturedAt:new Date().toISOString(),payload:copy(payload)});return true;
}
function caseName(state,id){
 const person=[...arr(state.caseSuspects),...arr(state.suspects),...arr(state.suspectList)].find(p=>same(p.id,id));
 return readable(person?.publicProfile?.displayName??person?.publicProfile?.name??person?.name,'the recorded suspect');
}
function sceneName(value){
 return ({tower:'the Tower of London',louvre:'the Louvre Museum',auction_house:'the auction house',action_house:'the auction house',castle:'the Royal Castle',havela:'the haveli',dockyard:'the dockyard',
 FingerprintScene:'the fingerprint analysis',ShoeprintScene:'the shoeprint comparison',BloodTypeScene:'the blood analysis',HandednessScene:'the handedness analysis'})[value]||'the recorded investigation step';
}
function itemName(state,id){
 const cards=[...arr(state.reconstructedHeist?.allCards),...arr(state.cluesCollected)];
 const found=cards.find(c=>same(c.id,id));return readable(found?.item??found?.title??found?.label,'an item not named in the request');
}
function collectHints(state,j){
 for(const e of [...arr(state.hintState?.usageHistory),...arr(state.courtMisconductLog)]){
  if(!e||!same(e.caseId,j.caseId)||(e.campaignId!=null&&e.campaignId!==j.campaignId)||e.id==null)continue;
  if(e.method!=='cut_corners'&&!(Number(e.moralDelta)<0))continue;
  const receipt=Object.values(state.forensicHintReceipts||{}).find(r=>r?.historyEntryId===e.id);
  const key=String(e.id),existing=j.events.find(x=>x.kind==='procedure'&&x.sourceKey===key);
  const payload={method:e.method??e.type??'recorded breach',sceneId:e.sceneId??null,itemId:e.itemId??null,
   location:readable(e.locationName,sceneName(e.sceneId)),item:itemName(state,e.itemId),issue:text(e.proceduralIssue),
   assistanceText:text(receipt?.text),moralDelta:Number(e.moralDelta)||0};
  if(existing){if(receipt&&!existing.payload.assistanceText)existing.payload.assistanceText=payload.assistanceText;continue;}
  append(j,'procedure',key,payload,e.createdAt);
 }
}
function subjectSnapshot(state,subject){
 const witnesses=arr(subject.witnesses).map(w=>({npcId:w.npcId,role:readable(w.role,'the witness'),statement:text(w.statement),isLiar:w.isLiar===true}));
 const cards=arr(subject.boardCards).map(c=>({id:c.id,role:readable(c.role,'the witness account'),label:text(c.label),minute:Number.isInteger(c.minute)?c.minute:null}));
 return {suspectId:subject.suspectId,suspectName:caseName(state,subject.suspectId),witnesses,cards,
  trueTimeline:arr(subject.trueTimeline).map(c=>c.id),alibiType:subject.alibiType};
}
function collectAlibis(state,j){
 for(const [key,group]of Object.entries(state.caseData?.alibiCases||{}))for(const s of arr(group?.suspects)){
  const filed=s.playerConclusion;if(!filed?.locked)continue;
  append(j,'alibi_filed',JSON.stringify([key,s.suspectId]),{...subjectSnapshot(state,s),caseKey:key,
   choice:filed.choice,timelineIds:arr(filed.timelineIds),evaluation:obj(filed.evaluation)},filed.filedAt);
 }
 const m=state.currentMission||{},currentKey=JSON.stringify([state.currentCaseId??m.caseId??m.id??m.missionId??null,
  state.investigationStartTime??null,state.crimeCityId??null,m.artifactKey??null]);
 const checks=arr(state.deductionState?.cases).find(c=>c.caseKey===currentKey)?.checks||[];
 for(const check of checks){
  let selection,target;try{selection=JSON.parse(check.selectionKey);target=JSON.parse(check.targetId);}catch{selection=null;target=null;}
  if(check.sceneId==='AlibiTimelineScene'&&Array.isArray(target)&&target.length>=3){
   const s=state.caseData?.alibiCases?.[target[0]]?.suspects?.find(v=>same(v.suspectId,target[1]));if(!s)continue;
   append(j,'alibi_check',check.checkKey,{...subjectSnapshot(state,s),caseKey:target[0],target,selection,
    status:check.result?.status,message:check.result?.message},check.createdAt);
  }else if(check.sceneId==='CrimeBoard'&&check.targetId==='motive'){
   if(!selection)try{selection=JSON.parse(check.selectionKey);}catch{}
   if(selection)append(j,'motive_check',check.checkKey,{selection,status:check.result?.status,message:check.result?.message},check.createdAt);
  }
 }
}
export function captureInvestigationAudit(state){
 if(!state||busy.has(state)||!investigationScope(state))return false;
 const court=state.courtState;
 if(court&&same(court.caseId,state.currentCaseId)&&court.campaignId===state._createdAt)return false;
 busy.add(state);
 try{
  const j=journal(state);if(!j)return false;let changed=false;
  const snapshot=snapshotTheory(state),fingerprint=theoryFingerprint(snapshot);
  if(snapshot&&fingerprint!==j.lastTheoryFingerprint){
   append(j,'theory',null,snapshot);j.lastTheoryFingerprint=fingerprint;changed=true;
  }
  const before=j.events.length;collectHints(state,j);collectAlibis(state,j);
  return changed||j.events.length!==before;
 }finally{busy.delete(state);}
}
export function recordHeistAttempt(state,{cityId=null,sceneId=null,orderedCards=[],feedback=[],claims=[]}={}){
 if(arr(orderedCards).length!==3||arr(feedback).length!==3||feedback.some(v=>!['green','yellow','red'].includes(v)))return false;
 captureInvestigationAudit(state);const j=journal(state);if(!j)return false;
 const attempt=j.events.filter(e=>e.kind==='heist'&&e.payload.sceneId===sceneId&&e.payload.cityId===cityId).length+1;
 const slots=orderedCards.map((card,index)=>{
  const claim=claims[index],use=arr(card?.reconstructionUses).find(u=>u.questionId===claim?.questionId);
  return {index,cardId:card?.id??null,card:readable(card?.item,'the selected evidence card'),
   question:readable(claim?.prompt,['How did they get in?','How did they do it?','How did they get away?'][index]),
   questionId:claim?.questionId??null,answer:text(use?.slotSentence??use?.answer??card?.slotSentence??card?.answer??card?.item),
   explanation:text(use?.heistExplanation??card?.heistExplanation),feedback:feedback[index]};
 });
 return append(j,'heist',null,{cityId,sceneId,attempt,slots});
}
function actualId(state){return state.trueThiefCaseSuspectId??state.realThiefSuspectId??state.caseData?.trueThiefCaseSuspectId??state.caseData?.realThiefSuspectId??state.currentThiefCaseSuspectId??state.currentThief?.caseSuspectId??state.currentThief?.id??state.currentThiefId;}
function requiredSkills(state){
 const r=state.reconstructedHeist||{};
 return arr(r.requiredSkills).length?uniq(r.requiredSkills):uniq(arr(r.allCards).filter(c=>c.isCorrect===true).flatMap(c=>arr(c.skills)));
}
export function buildInvestigationChallenges(state,{motiveAnswerId=null,motiveLabels={}}={}){
 captureInvestigationAudit(state);
 const scope=investigationScope(state),j=state.caseData?.investigationAudit;
 if(!scope||j?.version!==1||!same(j.caseId,scope.caseId)||j.campaignId!==scope.campaignId)return [];
 const events=arr(j.events),findings=new Map(),finalTheory=snapshotTheory(state),skills=requiredSkills(state);
 const add=(key,event,details)=>{
  const old=findings.get(key);if(old){old.sourceEventIds.push(event.id);old.occurrences++;return;}
  findings.set(key,{id:`challenge-${findings.size+1}`,caseId:scope.caseId,campaignId:scope.campaignId,
   category:details.category,sourceEventIds:[event.id],occurrences:1,...details});
 };
 const motiveLabel=id=>readable(motiveLabels[id],readable(text(id).replace(/_/g,' '),'the selected motive'));
 const fieldAnswer=(field,s)=>field==='means'?s.skillIds.join(', '):field==='identity'?caseName(state,s.answerId):field==='motive'?motiveLabel(s.answerId):OPPORTUNITY[s.answerId]||'the selected opportunity';
 const correct=(field,s)=>{
  if(field==='identity')return actualId(state)!=null&&same(s.answerId,actualId(state));
  if(field==='motive')return motiveAnswerId!=null&&s.answerId===motiveAnswerId;
  if(field==='means')return skills.length>0&&stable(s.skillIds)===stable(skills);
  return null;
 };
 for(const event of events){const p=event.payload||{};
  if(event.kind==='procedure'){
   const description=p.method==='cut_corners'?'a shortcut taken without the recorded checklist':'a recorded procedural breach';
   add(`procedure:${event.sourceKey}`,event,{category:'procedure',claim:`${description} during ${p.location}, concerning ${p.item}`,
    counter:p.assistanceText?`The assistance receipt says: “${short(p.assistanceText)}”.`:'The purchase log records the breach; it does not establish contamination or a false laboratory result.',
    resolution:'breach',severity:3,reply:`I acknowledge ${description}. I must distinguish that assistance from independently verified results; I cannot claim the missing checklist was completed.`});
  }
  if(event.kind==='heist')for(const slot of arr(p.slots)){
   if(slot.feedback==='green')continue;
   const later=events.filter(e=>e.kind==='heist'&&e.sequence>event.sequence&&e.payload.sceneId===p.sceneId&&e.payload.cityId===p.cityId)
    .flatMap(e=>arr(e.payload.slots)).find(s=>s.index===slot.index&&s.feedback==='green');
   const counter=later?`The later confirmed placement is “${later.card}” for “${slot.question}”. ${short(later.explanation)}`:
    slot.feedback==='yellow'?'Your recorded check found a relevant clue placed under the wrong question.':'Your recorded check rejected this clue for that question.';
   add(`heist:${p.sceneId}:${p.cityId}:${slot.index}:${slot.cardId}:${slot.feedback}`,event,{category:'heist',
    claim:`in reconstruction attempt ${p.attempt}, you put “${slot.card}” under “${slot.question}”`,counter,
    resolution:later?'corrected':'unresolved',severity:later?2:6,
    reply:later?`That placement was wrong. The corrected placement is “${later.card}”. ${short(later.explanation)}`:
     `That placement was not confirmed. I cannot present “${slot.card}” as an established answer to “${slot.question}”.`});
  }
  if(event.kind==='theory')for(const [field,s]of Object.entries(p.sections||{})){
   const selected=field==='means'?s.skillIds.length>0:Boolean(s.answerId);if(!selected)continue;
   const final=finalTheory?.sections?.[field],isWrong=correct(field,s)===false;
   // Partial skill selection is an unfinished draft, not a false claim about an extra skill.
   const wrongMeans=field==='means'&&skills.length>0&&s.skillIds.some(id=>!skills.includes(id));
   if(isWrong&&(field!=='means'||wrongMeans)){
    const repaired=final&&correct(field,final)===true;
    const counter=field==='means'?`The reconstruction's recorded skill set is ${skills.join(', ')}.`:
     field==='motive'?`The case's motive findings support ${motiveLabel(motiveAnswerId)}.`:
     'The final identification must be established from the case findings, not this earlier selection.';
    add(`theory:${field}:${field==='means'?s.skillIds.join('|'):s.answerId}`,event,{category:'case_theory',
     claim:`your saved ${FIELD_NAMES[field]} conclusion was “${fieldAnswer(field,s)}”`,counter,
     resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,
     reply:repaired?`I revised that conclusion to “${fieldAnswer(field,final)}”. ${counter}`:`I cannot support that conclusion against the recorded findings. ${counter}`});
   }
   const bad=arr(s.evidence).filter(e=>!e.exists||!e.independent);
   if(!arr(s.evidenceIds).length||bad.length){
    const repaired=final&&arr(final.evidence).length>0&&final.evidence.every(e=>e.exists&&e.independent)&&correct(field,final)!==false;
    const reason=!s.evidenceIds.length?'no supporting evidence attached':`unsupported references: ${bad.map(e=>e.label).join(', ')}`;
    add(`support:${field}:${field==='means'?s.skillIds.join('|'):s.answerId}:${reason}`,event,{category:'support',
     claim:`your saved ${FIELD_NAMES[field]} claim “${fieldAnswer(field,s)}” had ${reason}`,
     counter:'A saved conclusion or a player-written card is not independent corroboration. The court must examine the actual source.',
     resolution:repaired?'documented':'unresolved',severity:repaired?1:4,
     reply:repaired?`Those references were incomplete. The later version attaches ${final.evidence.map(e=>e.label).join(', ')}; those sources, not my draft, must be assessed.`:
      'I cannot treat my own conclusion or a missing reference as independent evidence. That support gap remains.'});
   }
  }
  if(event.kind==='motive_check'&&p.status==='contradicted'){
   const guess=p.selection?.guessId;if(!guess)continue;
   const repaired=finalTheory?.sections?.motive&&correct('motive',finalTheory.sections.motive)===true;
   add(`motivecheck:${guess}`,event,{category:'case_theory',claim:`your checked motive hypothesis was “${motiveLabel(guess)}”`,
    counter:text(p.message),resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,
    reply:repaired?`That hypothesis failed the check. My revised conclusion is “${fieldAnswer('motive',finalTheory.sections.motive)}”.`:'That motive check contradicted my hypothesis. I cannot cite it as confirmation.'});
  }
  if(event.kind==='alibi_check'||event.kind==='alibi_filed'){
   const filed=event.kind==='alibi_filed',timeline=filed?p.timelineIds:null,choice=filed?p.choice:p.selection?.choice;
   const badConclusion=filed?p.evaluation?.conclusionCorrect===false:choice!=null&&p.status==='contradicted';
   const label=id=>{const w=arr(p.witnesses).find(x=>x.npcId===id);return w?`${w.role} was lying`:'nobody was lying';};
   if(badConclusion){
    const later=events.find(e=>e.kind==='alibi_filed'&&e.sequence>event.sequence&&same(e.payload.suspectId,p.suspectId)&&e.payload.evaluation?.conclusionCorrect===true);
    const statements=arr(p.witnesses).map(w=>`${w.role}: “${short(w.statement)}”`).join(' ');
    add(`alibi:${p.caseKey}:${p.suspectId}:choice:${choice}:${event.kind}`,event,{category:'alibi',
     claim:`for ${p.suspectName}, you ${filed?'filed':'checked'} the conclusion that ${label(choice)}`,
     counter:statements,resolution:later?'corrected':'unresolved',severity:later?2:7,
     reply:later?`I changed that conclusion after comparing the accounts. The filed assessment is that ${label(later.payload.choice)}.`:
      `That assessment is not supported by these accounts. I must distinguish a false account from guilt in the theft.`});
   }
   const indices=filed&&p.evaluation?.timelineCorrect===false?[0,1,2].filter(i=>p.trueTimeline[i]!==timeline[i]):
    !filed&&p.target?.[2]==='timeline'&&p.status==='contradicted'?[p.selection?.index]:[];
   for(const index of indices){
    const selected=filed?timeline[index]:p.selection.cardId,card=arr(p.cards).find(c=>c.id===selected);if(!card)continue;
    const sorted=[...arr(p.cards)].filter(c=>Number.isInteger(c.minute)).sort((a,b)=>a.minute-b.minute);
    const expected=sorted[index];if(!expected)continue;
    const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
    const later=events.find(e=>e.kind==='alibi_filed'&&e.sequence>event.sequence&&same(e.payload.suspectId,p.suspectId)&&e.payload.evaluation?.timelineCorrect===true);
    add(`alibi:${p.caseKey}:${p.suspectId}:slot:${index}:${selected}:${event.kind}`,event,{category:'alibi',
     claim:`for ${p.suspectName}, timeline position ${index+1} contained ${card.role} at ${clock(card.minute)}`,
     counter:`Chronological position ${index+1} belongs to ${expected.role} at ${clock(expected.minute)}. These times order accounts; they do not establish that an account is true.`,
     resolution:later?'corrected':'unresolved',severity:later?2:5,
     reply:`The chronology was wrong: ${expected.role} at ${clock(expected.minute)} belongs in that position. That correction does not by itself validate the alibi.`});
   }
  }
 }
 // Trial-only incompleteness is evaluated once, not at every intermediate checkbox change.
 for(const field of Object.keys(FIELD_NAMES)){
  const s=finalTheory?.sections?.[field],missing=field==='means'?!s?.skillIds?.length:!s?.answerId;
  const incompleteMeans=field==='means'&&s?.skillIds?.length&&skills.length&&stable(s.skillIds)!==stable(skills)&&!s.skillIds.some(id=>!skills.includes(id));
  if(missing||incompleteMeans)add(`trial-missing:${field}`,{id:'trial-file'}, {category:'case_theory',
   claim:`the court file has ${missing?'no selected':'an incomplete'} ${FIELD_NAMES[field]} conclusion`,counter:'Completeness must come from a recorded conclusion and its sources, not from the warrant.',
   resolution:'unresolved',severity:4,reply:`The ${FIELD_NAMES[field]} section is incomplete. I cannot supply a missing finding merely by asserting that the arrest was justified.`});
 }
 return [...findings.values()];
}
export function investigationQuestions(challenges){
 return challenges.map(c=>{
  const corrected=['corrected','documented'].includes(c.resolution),best=corrected?c.severity:c.resolution==='breach'?1:0;
  const answers=[
   {text:c.reply,delta:best,feedback:corrected?'The correction is explained. The earlier error remains in the record; this answer prevents an additional confidence loss.':'Acknowledging the problem is appropriate, but it does not manufacture missing corroboration or undo the breach.'},
   {text:`I maintain that ${c.claim}. The recorded objection does not require a correction.`,delta:-8,feedback:'You have repeated the challenged claim without answering the specific discrepancy.'},
   {text:'The arrest warrant should take priority over this conflicting entry.',delta:-10,feedback:'The warrant does not reconcile conflicting findings or replace evidence.'},
   {text:'That earlier entry should be disregarded because I later completed the investigation.',delta:-9,feedback:'Completion does not erase the specific entry challenged by the defendant.'}
  ];
  let seed=2166136261;for(const ch of c.id)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
  for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}
  return {id:`defendant_${c.id}`,side:'defense',speaker:'defendant',challengeId:c.id,
   text:`Prosecutor: Please address this point from the investigation record.\nDefendant: ${c.claim.charAt(0).toUpperCase()+c.claim.slice(1)}.${c.occurrences>1?` It appears in ${c.occurrences} recorded entries.`:''}\n${c.counter}`,
   answers,baseDelta:-c.severity,identityExposed:false};
 });
}