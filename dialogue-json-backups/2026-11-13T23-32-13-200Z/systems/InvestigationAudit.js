// Investigation history is case-scoped. Only explicit source metadata can confirm a claim.
const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const copy=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const text=v=>typeof v==='string'?v.trim():'';
const readable=(v,fallback='the recorded item')=>{const s=text(v);return s&&!s.includes('_')&&!s.includes('/')&&!/\.(png|webp|json)$/i.test(s)?s:fallback;};
const short=v=>text(v).length>230?text(v).slice(0,227)+'…':text(v);
const stable=v=>JSON.stringify(v);
const norm=v=>text(v).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/^pick ?pocketing$/,'pickpocket');
const uniq=v=>[...new Set(arr(v).map(norm).filter(Boolean))].sort();
const busy=new WeakSet();
const FIELD_NAMES={identity:'Identity',motive:'Motive',means:'Means',opportunity:'Opportunity'};
const OPPORTUNITY={work_access:'work duties provided access',unobserved_interval:'an unobserved interval',false_alibi:'a false alibi concealed presence',borrowed_access:'borrowed or stolen credentials',security_gap:'a security gap',public_access:'public opening hours'};
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
 return {id:String(id),label:readable(card?.label??clue?.title??clue?.label,'an unnamed evidence reference'),
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
function caseName(s,id){const p=[...arr(s.caseSuspects),...arr(s.suspects),...arr(s.suspectList)].find(x=>same(x.id,id));return readable(p?.publicProfile?.displayName??p?.publicProfile?.name??p?.name,'the recorded suspect');}
function sceneName(v){return ({tower:'the Tower of London',louvre:'the Louvre Museum',auction_house:'the auction house',action_house:'the auction house',castle:'the Royal Castle',havela:'the haveli',dockyard:'the dockyard',FingerprintScene:'the fingerprint analysis',ShoeprintScene:'the shoeprint comparison',BloodTypeScene:'the blood analysis',HandednessScene:'the handedness analysis'})[v]||'the recorded investigation step';}
function itemName(s,id){const c=[...arr(s.reconstructedHeist?.allCards),...arr(s.cluesCollected)].find(x=>same(x.id,id));return readable(c?.item??c?.title??c?.label,'an item not named in the request');}
function subjectSnapshot(s,v){return {suspectId:v.suspectId,suspectName:caseName(s,v.suspectId),
 witnesses:arr(v.witnesses).map(w=>({npcId:w.npcId,role:readable(w.role,'the witness'),statement:text(w.statement),isLiar:w.isLiar===true})),
 cards:arr(v.boardCards).map(c=>({id:c.id,role:readable(c.role,'the witness account'),label:text(c.label),minute:Number.isInteger(c.minute)?c.minute:null})),
 trueTimeline:arr(v.trueTimeline).map(c=>c.id),alibiType:v.alibiType};}
function collect(s,j){
 const pending=[];
 for(const e of [...arr(s.hintState?.usageHistory),...arr(s.courtMisconductLog)]){
  if(!e||!same(e.caseId,j.caseId)||(e.campaignId!=null&&e.campaignId!==j.campaignId)||e.id==null)continue;
  if(e.method!=='cut_corners'&&!(Number(e.moralDelta)<0))continue;
  const receipt=Object.values(s.forensicHintReceipts||{}).find(r=>r?.historyEntryId===e.id),key=String(e.id);
  const payload={method:e.method??e.type??'recorded breach',sceneId:e.sceneId??null,itemId:e.itemId??null,
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
  return {index,cardId:card.id??null,card:readable(card.item,'the selected evidence card'),question:readable(claim?.prompt,['How did they get in?','How did they do it?','How did they get away?'][index]),questionId:claim?.questionId??null,
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
 const motiveLabel=id=>readable(motiveLabels[id],readable(text(id).replace(/_/g,' '),'the selected motive'));
 const answer=(field,v)=>field==='means'?uniq(v.skillIds).join(', '):field==='identity'?caseName(s,v.answerId):field==='motive'?motiveLabel(v.answerId):OPPORTUNITY[v.answerId]||'the selected opportunity';
 const correct=(field,v)=>field==='identity'?(actualId(s)==null?null:same(v.answerId,actualId(s))):field==='motive'?(motiveAnswerId==null?null:v.answerId===motiveAnswerId):field==='means'?(skills.length?stable(uniq(v.skillIds))===stable(skills):null):null;
 for(const event of events){const p=obj(event.payload);
  if(event.kind==='procedure'){
   const description=p.method==='cut_corners'?'a shortcut taken without the recorded checklist':'a recorded procedural breach';
   add(`procedure:${event.sourceKey}`,event,{category:'procedure',claim:`${description} during ${p.location}, concerning ${p.item}`,
    counter:p.assistanceText?`The assistance receipt says: “${p.assistanceText}”.`:'The log records a procedural breach, not proof of contamination or a false laboratory result.',
    resolution:'breach',severity:3,reply:`I acknowledge ${description}. The omitted procedure cannot be claimed as completed; independently verified findings must be assessed separately.`});
  }
  if(event.kind==='heist')for(const slot of arr(p.slots)){
   if(slot.feedback==='green')continue;
   const later=events.filter(e=>e.kind==='heist'&&sourceAfter(e,event)&&e.payload.sceneId===p.sceneId&&e.payload.cityId===p.cityId)
    .flatMap(e=>arr(e.payload.slots)).find(v=>v.index===slot.index&&v.feedback==='green'&&(!slot.questionId||v.questionId===slot.questionId));
   add(`heist:${p.sceneId}:${p.cityId}:${slot.index}:${slot.questionId}:${slot.cardId}:${slot.feedback}`,event,{category:'heist',
    claim:`in reconstruction attempt ${p.attempt}, you put “${slot.card}” under “${slot.question}”`,
    counter:later?`The later confirmed placement is “${later.card}”. ${later.explanation||''}`:slot.feedback==='yellow'?'The recorded check found a relevant clue assigned to the wrong question.':'The recorded check rejected this clue for that question.',
    resolution:later?'corrected':'unresolved',severity:later?2:6,reply:later?`That placement was wrong. The confirmed placement is “${later.card}”. ${later.explanation||''}`:`That placement was not confirmed. I cannot present “${slot.card}” as an established answer to “${slot.question}”.`});
  }
  if(event.kind==='theory')for(const [field,v]of Object.entries(p.sections||{})){
   if(!FIELD_NAMES[field]||!(field==='means'?arr(v.skillIds).length:v.answerId))continue;
   const final=finalTheory?.sections[field],wrong=correct(field,v)===false,extraSkill=field==='means'&&skills.length&&uniq(v.skillIds).some(id=>!skills.includes(id));
   const keyValue=field==='means'?uniq(v.skillIds).join('|'):v.answerId;
   if(wrong&&(field!=='means'||extraSkill)){
    const repaired=final&&correct(field,final)===true;
    const counter=field==='means'?`The reconstruction records ${skills.join(', ')}.`:field==='motive'?`The motive findings support ${motiveLabel(motiveAnswerId)}.`:'The earlier identification must be tested against the case findings, not assumed from a selection.';
    add(`theory:${field}:${keyValue}`,event,{category:'case_theory',claim:`your saved ${FIELD_NAMES[field]} conclusion was “${answer(field,v)}”`,counter,
     resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,
     reply:repaired?`I revised that conclusion to “${answer(field,final)}”. ${counter}`:`I cannot support that conclusion against the findings. ${counter}`});
   }
   const initial=assessTheoryEvidence(v,field,evidenceRules);
   if(initial.status!=='supported'){
    const current=final?assessTheoryEvidence(final,field,evidenceRules):{status:'missing',labels:[]};
    const repaired=current.status==='supported'&&correct(field,final)!==false;
    const uncertain=!repaired&&current.status==='unverified';
    const reason=initial.status==='missing'?'no evidence attached':initial.status==='invalid'?'missing, unavailable or self-authored evidence':initial.status==='irrelevant'?'references that do not support that conclusion':'references whose relationship to that exact claim was not verified';
    add(`support:${field}:${keyValue}`,event,{category:'support',claim:`your saved ${FIELD_NAMES[field]} conclusion “${answer(field,v)}” had ${reason}`,
     counter:repaired?`The final version has claim-matched sources: ${current.labels.join(', ')}.`:
      current.status==='irrelevant'?`The attached references are not evidence for this claim: ${current.labels.join(', ')}.`:
      uncertain?'No exact source-to-claim relationship is recorded. This is an unverified link, not a finding that the claim is false.':'The file still lacks usable, claim-matched corroboration.',
     resolution:repaired?'documented':'unresolved',evidenceStatus:uncertain?'unverified':current.status,severity:repaired||uncertain?1:4,
     reply:repaired?`The earlier references were incomplete. The later claim-matched sources are ${current.labels.join(', ')}.`:
      uncertain?'I cannot present an unverified source-to-claim link as proof. The source and the exact inference require separate assessment.':'I cannot use an unrelated card, a missing reference or my own interpretation as independent corroboration.'});
   }
  }
  if(event.kind==='motive_check'&&p.status==='contradicted'&&p.selection?.guessId){
   const guess=p.selection.guessId,final=finalTheory?.sections?.motive,repaired=final&&correct('motive',final)===true;
   add(`theory:motive:${guess}`,event,{category:'case_theory',claim:`your checked motive hypothesis was “${motiveLabel(guess)}”`,counter:text(p.message)||'The recorded check rejected that motive hypothesis.',
    resolution:repaired?'corrected':'unresolved',severity:repaired?2:6,reply:repaired?`That hypothesis failed the check. The revised conclusion is “${answer('motive',final)}”.`:'That check contradicted my motive hypothesis. It cannot be cited as confirmation.'});
  }
  if(event.kind==='alibi_check'||event.kind==='alibi_filed'){
   const filed=event.kind==='alibi_filed',choice=filed?p.choice:p.selection?.choice,timeline=arr(p.timelineIds);
   const bad=filed?p.evaluation?.conclusionCorrect===false:choice!=null&&p.status==='contradicted';
   const label=id=>{const w=arr(p.witnesses).find(x=>x.npcId===id);return w?`${w.role} was lying`:'nobody was lying';};
   if(bad){const later=correctedAlibi(events,event,'conclusionCorrect');
    add(`alibi:${p.caseKey}:${p.suspectId}:choice:${choice}`,event,{category:'alibi',claim:`for ${p.suspectName}, your conclusion was that ${label(choice)}`,
     counter:arr(p.witnesses).map(w=>`${w.role}: “${w.statement}”`).join('\n\n')||'The recorded check did not support that conclusion.',
     resolution:later?'corrected':'unresolved',severity:later?2:7,reply:later?`I corrected that conclusion after comparing the accounts. The filed assessment is that ${label(later.payload.choice)}.`:'That assessment is not supported by these accounts. A disputed account is not by itself proof of theft.'});
   }
   const indices=filed&&p.evaluation?.timelineCorrect===false?[0,1,2].filter(i=>p.trueTimeline?.[i]!==timeline[i]):!filed&&p.target?.[2]==='timeline'&&p.status==='contradicted'?[p.selection?.index]:[];
   for(const index of indices){
    if(!Number.isInteger(index)||index<0||index>2)continue;
    const selected=filed?timeline[index]:p.selection.cardId,card=arr(p.cards).find(c=>c.id===selected),sorted=[...arr(p.cards)].filter(c=>Number.isInteger(c.minute)).sort((a,b)=>a.minute-b.minute),expected=sorted[index];
    if(!card||!Number.isInteger(card.minute)||!expected||card.minute===expected.minute)continue;
    const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`,later=correctedAlibi(events,event,'timelineCorrect');
    add(`alibi:${p.caseKey}:${p.suspectId}:slot:${index}:${selected}`,event,{category:'alibi',claim:`for ${p.suspectName}, timeline position ${index+1} contained ${card.role} at ${clock(card.minute)}`,
     counter:`Chronological position ${index+1} belongs to ${expected.role} at ${clock(expected.minute)}. Ordering accounts does not establish that an account is true.`,
     resolution:later?'corrected':'unresolved',severity:later?2:5,reply:`The chronology was wrong: ${expected.role} at ${clock(expected.minute)} belongs in that position. That correction does not by itself validate the alibi.`});
   }
  }
 }
 for(const field of Object.keys(FIELD_NAMES)){
  const v=finalTheory?.sections[field],missing=field==='means'?!arr(v?.skillIds).length:!v?.answerId;
  const partial=field==='means'&&arr(v?.skillIds).length&&skills.length&&stable(uniq(v.skillIds))!==stable(skills)&&!uniq(v.skillIds).some(id=>!skills.includes(id));
  if(missing||partial)add(`trial-missing:${field}`,{id:'trial-file'},{category:'case_theory',claim:`the court file has ${missing?'no selected':'an incomplete'} ${FIELD_NAMES[field]} conclusion`,
   counter:'A warrant does not supply a missing conclusion or its evidential basis.',resolution:'unresolved',severity:4,reply:`The ${FIELD_NAMES[field]} section is incomplete. The arrest does not fill that gap.`});
 }
 return [...findings.values()];
}
function shuffle(answers,id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);for(let i=answers.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}return answers;}
function legacyQuestions(challenges){
 return challenges.map(c=>{
  const corrected=['corrected','documented'].includes(c.resolution),best=corrected?c.severity:c.resolution==='breach'?1:0;
  const answers=[
   {text:c.reply,delta:best,feedback:corrected?'The correction is explained. The earlier error remains in the record; this answer prevents an additional confidence loss.':'Acknowledging the problem is appropriate, but it does not manufacture missing corroboration or undo the breach.'},
   {text:`I maintain that ${c.claim}. The recorded objection does not require a correction.`,delta:-8,feedback:'You have repeated the challenged claim without answering the specific discrepancy.'},
   {text:'The arrest warrant should take priority over this conflicting entry.',delta:-10,feedback:'The warrant does not reconcile conflicting findings or replace evidence.'},
   {text:'That earlier entry should be disregarded because I later completed the investigation.',delta:-9,feedback:'Completion does not erase the specific entry challenged by the defendant.'}
  ];
  shuffle(answers,c.id);
  return {id:`defendant_${c.id}`,side:'defense',speaker:'defendant',challengeId:c.id,
   text:`Prosecutor: Please address this point from the investigation record.\nDefendant: ${c.claim.charAt(0).toUpperCase()+c.claim.slice(1)}.${c.occurrences>1?` It appears in ${c.occurrences} recorded entries.`:''}\n${c.counter}`,
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
   {text:c.reply,delta:best,feedback:repaired?'The correction is explained. The original error remains in the record.':unverified?'You correctly limit the inference. An unverified link has not been promoted to proof, nor treated as a proven falsehood.':'Acknowledging the discrepancy does not supply the missing evidence or undo the breach.'},
   {text:`I maintain that ${c.claim}; no further explanation is needed.`,delta:-8,feedback:'Repeating the challenged claim does not answer the discrepancy.'},
   {text:'The warrant overrides this objection to the investigation record.',delta:-10,feedback:'A warrant cannot reconcile conflicting findings.'},
   {text:'The earlier entry no longer matters because the investigation is complete.',delta:-9,feedback:'Completion does not erase an earlier recorded mistake.'}
  ],c.id);
  return {id:`defendant_${c.id}`,side:'defense',speaker:'defendant',challengeId:c.id,
   text:`Prosecutor: Explain this entry.\nDefendant: ${c.claim.charAt(0).toUpperCase()+c.claim.slice(1)}.${c.occurrences>1?` This appears in ${c.occurrences} records; it is one objection.`:''}\n\n${c.counter}`,
   answers,baseDelta:-c.severity,identityExposed:false};
 });
}
