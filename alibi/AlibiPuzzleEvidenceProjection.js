const list=x=>Array.isArray(x)?x:[],same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
export function puzzleRows(conclusion,state){
 if(!conclusion||conclusion.source!=='gridPuzzle'||conclusion.locked!==true||!same(conclusion.caseId,state.currentCaseId)||conclusion.campaignId!==state._createdAt)return null;
 const subjects=conclusion.subjects;if(!Array.isArray(subjects)||!(subjects.length>=2&&subjects.length<=5)||new Set(subjects.map(s=>s.suspectId)).size!==subjects.length)return null;
 if(subjects.filter(s=>s.status==='uncorroborated').length!==1||subjects.some(s=>!['confirmed','uncorroborated'].includes(s.status)))return null;
 const people=state.caseSuspects||state.suspects||state.suspectList||[];if(subjects.some(s=>!people.some(p=>p.id===s.suspectId)))return null;
 return subjects.map(s=>{const p=people.find(p=>p.id===s.suspectId);return {subjectId:String(s.suspectId),name:p.publicProfile?.displayName||p.name||'The alibi subject',source:'gridPuzzle',legacy:false,exists:true,claimCorrect:true,timelineCorrect:false,documented:true,sound:true,choice:null,chosenRole:'the independent corroboration record',status:s.status,sources:[],comparison:null,retraction:null,risky:false,riskReasons:[],issues:[],facts:structuredClone(s.facts||{})};});
}
export function applyPuzzleCourtAssessment(facts,state,context,conclusion){
 const rows=puzzleRows(conclusion,state);if(!rows)return null;
 const ids=list(context.actualIds).map(String),matching=rows.filter(r=>ids.includes(r.subjectId)),primary=rows.find(r=>same(r.subjectId,context.aliasId))||(matching.length===1?matching[0]:null),marked=rows.map(r=>({...r,primary:r===primary})),alternatives=marked.filter(r=>!r.primary);
 const alternativeCleared=!!primary&&alternatives.length>0&&alternatives.every(r=>r.status==='confirmed'),culpritAlibiResolved=!!primary&&primary.status==='uncorroborated';
 const failures=list(facts.caseAssessment?.failures).filter(f=>!['alternative','alibi'].includes(f.key)).map(x=>structuredClone(x));
 if(!alternativeCleared)failures.push({key:'alternative',message:'The independent records do not clear every alternative candidate.'});if(!culpritAlibiResolved)failures.push({key:'alibi',message:'The filed reconstruction does not identify the defendant\'s alias as the uncorroborated candidate.'});
 return {...facts,alibiCourtVersion:1,alibiCourt:{version:1,rows:marked,missingPrimary:!primary},caseAssessment:{...facts.caseAssessment,alternativeCleared,culpritAlibiResolved,otherName:alternatives.map(r=>r.name).join(', ')||facts.caseAssessment?.otherName,failures}};
}
export function addPuzzleEvidence(data,state,conclusion){
 const rows=puzzleRows(conclusion,state),prior=new Map(list(data.items).filter(c=>!c.createdByPlayer).map(c=>[c.id,c]));
 const items=list(data.items).filter(c=>c.createdByPlayer||!c.tags?.includes('puzzle-alibi'));
 for(const [i,r] of (rows||[]).entries()){
  const id=`puzzle-alibi-${encodeURIComponent(conclusion.caseKey)}-${encodeURIComponent(r.subjectId)}`;if(items.some(c=>c.id===id))continue;
  const old=prior.get(id),confirmed=r.status==='confirmed';
  const card={id,type:'evidence',x:1100+(i%2)*230,y:580+Math.floor(i/2)*210,z:7,rotation:-1.2,pinned:false,label:`Alibi — ${r.name}`,tag:confirmed?'ALIBI CONFIRMED':'NO CORROBORATION',body:confirmed?`${r.facts.proof} confirms presence in the ${String(r.facts.place||'recorded location').toLowerCase()} throughout the theft.`:'No independent record confirms this person\'s alibi. This is an investigative lead, not proof that they committed the theft or lied.',fields:[{key:'Location',value:r.facts.place||''},{key:'Activity',value:r.facts.action||''},{key:'Accent',value:r.facts.accent||''},{key:'Feature',value:r.facts.features||''},{key:'Corroboration',value:r.facts.proof||''}],suspectId:r.subjectId,alibiStatus:r.status,alibiVerified:true,source:'gridPuzzle',tags:['trial-evidence','alibi-evidence','puzzle-alibi','filed-alibi'],discovered:true,createdByPlayer:false,editableByPlayer:false,caseId:state.currentCaseId,campaignId:state._createdAt};
  if(old)for(const k of ['x','y','z','rotation','pinned'])if(old[k]!==undefined)card[k]=old[k];items.push(card);
 }
 const valid=new Set(items.map(x=>x.id));return {...data,items,links:list(data.links).filter(l=>l&&valid.has(l.from)&&valid.has(l.to))};
}
