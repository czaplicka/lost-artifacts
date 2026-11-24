export const categories=[['place','LOCATION'],['action','ACTIVITY'],['accent','ACCENT'],['features','FEATURE'],['proof','EVIDENCE']];
export const PROOF_VALUES=['Camera recording','Signed delivery receipt','Independent witness','Access log and camera','No corroboration'];
export function proofOptions(count){if(![3,5].includes(count))throw Error('Only three or five candidates are supported.');return [...PROOF_VALUES.slice(0,count-1),'No corroboration'];}
export function rng(seed){let n=2166136261;for(const c of String(seed)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return()=>{n+=0x6D2B79F5;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const shuffle=(items,r)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const initialKeys=['place','action','accent','features'];
export function createPuzzle({caseKey,suspects,accents,features,crimeWindow}){
 if(!caseKey||!Array.isArray(suspects)||![3,5].includes(suspects.length)||suspects.some(s=>typeof s.id!=='string'||!s.id)||new Set(suspects.map(s=>s.id)).size!==suspects.length)throw Error('Three or five distinct suspects are required.');
 const thieves=suspects.filter(s=>s.hiddenCaseData?.isTrueThief===true);if(thieves.length!==1)throw Error('Exactly one real thief is required.');
 const thief=thieves[0],profile=thief.hiddenCaseData.realThiefProfile;if(!profile?.accent||!profile?.features)throw Error('Missing canonical thief traits.');
 const count=suspects.length,r=rng(caseKey),people=shuffle(suspects,r).map(s=>({id:s.id,name:s.publicProfile?.displayName||s.name||s.id}));
 const pool=(list,required)=>{if(!Array.isArray(list)||!list.includes(required))throw Error('Canonical trait missing from catalogue.');const alternatives=[...new Set(list)].filter(v=>typeof v==='string'&&v.trim()&&v!==required);if(alternatives.length<count-1)throw Error('Not enough distinct catalogue values.');return shuffle([required,...shuffle(alternatives,r).slice(0,count-1)],r);};
 const options={place:['Reading room','Staff kitchen','Restoration studio','Records office','Exhibition hall'].slice(0,count),action:['Reading a catalogue','Making tea','Cleaning a frame','Sorting invoices','Checking display labels'].slice(0,count),accent:pool(accents,profile.accent),features:pool(features,profile.features),proof:proofOptions(count)};
 const solution=Object.fromEntries(people.map(p=>[p.id,{}]));
 for(const key of initialKeys){const values=shuffle(options[key],r);if(key==='accent'||key==='features'){const i=people.findIndex(p=>p.id===thief.id),j=values.indexOf(profile[key]);[values[i],values[j]]=[values[j],values[i]];}people.forEach((p,i)=>solution[p.id][key]=values[i]);}
 const innocent=shuffle(people.filter(p=>p.id!==thief.id),r);solution[thief.id].proof='No corroboration';innocent.forEach((p,i)=>solution[p.id].proof=options.proof[i]);
 const ordered=shuffle(people,r),clues=[];
 const add=(p,key,text,rule)=>{const last=clues.at(-1);clues.push({id:`clue-${clues.length}`,personId:p.id,key,text,rule,requires:last?[last.personId+'|'+last.key]:[]});};
 for(const key of initialKeys)for(let i=0;i<count;i++){
  const p=ordered[i];let text,rule;
  if(key==='place'){
   if(i<count-2){text=`${p.name} was in the ${solution[p.id].place.toLowerCase()} throughout the theft.`;rule={kind:'equals',value:solution[p.id].place};}
   else if(i===count-2){const forbidden=solution[ordered[count-1].id].place;text=`${p.name} was not in the ${forbidden.toLowerCase()}. Each location belongs to one person.`;rule={kind:'not',value:forbidden};}
   else{text='Assign the only remaining location. The agency has ruled out human duplication. Again.';rule={kind:'remaining'};}
  }else{
   text=`The person in the ${solution[p.id].place.toLowerCase()} ${key==='action'?'was':key==='accent'?'spoke with this accent:':'had this distinguishing feature:'} ${solution[p.id][key]}.`;
   rule={kind:'association',via:'place',viaValue:solution[p.id].place,value:solution[p.id][key]};
  }
  add(p,key,text,rule);
 }
 return {version:1,puzzleKind:'progressive-alibi',caseKey,crimeWindow:crimeWindow||null,people,options,solution,clues,proofClues:innocent.map(p=>({personId:p.id,text:`${solution[p.id].proof} independently confirms the person ${solution[p.id].action.toLowerCase()} was in the ${solution[p.id].place.toLowerCase()} throughout the theft.`})),answers:{},mistakes:0,status:'playing'};
}
export function evidenceUnlocked(p){return p.people.every(person=>initialKeys.every(k=>p.answers[person.id+'|'+k]===p.solution[person.id][k]));}
export function visibleClues(p){return p.clues.filter(c=>c.requires.every(k=>Object.hasOwn(p.answers,k)));}
export function assign(p,personId,key,value){
 if(p.status!=='playing')return {accepted:false,message:'This investigation is closed.'};
 if(!p.people.some(x=>x.id===personId)||!p.options[key]?.includes(value))throw Error('Unknown selection.');
 const cell=personId+'|'+key;if(Object.hasOwn(p.answers,cell))return {accepted:false,message:'This fact is already recorded.'};
 if(key==='proof'?!evidenceUnlocked(p):!visibleClues(p).some(c=>c.personId===personId&&c.key===key))return {accepted:false,message:'Collect the relevant clue first.'};
 if(p.people.some(x=>p.answers[x.id+'|'+key]===value))return {accepted:false,message:'That value has already been assigned.'};
 if(p.solution[personId][key]!==value){p.mistakes++;if(p.mistakes>=3)p.status='failed';return {accepted:false,wrong:true,message:p.status==='failed'?'Three mistakes. Investigation failed.':'That does not follow from the evidence. One life lost.'};}
 p.answers[cell]=value;if(Object.keys(p.answers).length===p.people.length*categories.length)p.status='solved';
 return {accepted:true,message:p.status==='solved'?'Reconstruction complete. File your conclusions.':'Fact recorded. Check for a new clue.'};
}
export function getResult(p){if(p.status!=='solved')return null;return {source:'gridPuzzle',version:1,caseKey:p.caseKey,crimeWindow:p.crimeWindow,mistakes:p.mistakes,subjects:p.people.map(person=>({suspectId:person.id,status:p.answers[person.id+'|proof']==='No corroboration'?'uncorroborated':'confirmed',facts:Object.fromEntries(categories.map(([k])=>[k,p.answers[person.id+'|'+k]]))}))};}
