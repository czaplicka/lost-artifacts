const BLOCKED=new Set(['__proto__','prototype','constructor']);
const PUBLIC_NOTE_KINDS=new Set(['interview','alibi']);
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);
function exposedValue(value){if(scalar(value))return value;if(Array.isArray(value)&&value.every(scalar))return[...value];return undefined;}
function contextKey(context){return JSON.stringify([context?.campaignId??null,context?.caseId??null,String(context?.caseKey??'')]);}
export function disclosureContext(state,caseKey){return{campaignId:state._createdAt??null,caseId:state.currentCaseId??null,caseKey:String(caseKey??'')};}
export function publicRestrictedProfile(profile={},canonicalField){
  if(!profile||typeof profile!=='object'||Array.isArray(profile))profile={};
  const listed=new Set((Array.isArray(profile.unlockedFields)?profile.unlockedFields:[]).map(raw=>typeof raw==='string'?canonicalField(raw):'').filter(Boolean));
  const selected=new Map();
  for(const[raw,entry]of Object.entries(profile.forensicAttributes||{})){
    const field=canonicalField(raw);if(typeof field!=='string'||!field||BLOCKED.has(field))continue;
    if(!selected.has(field)||raw===field)selected.set(field,entry);
  }
  const forensicAttributes={},unlockedFields=[];
  for(const[field,entry]of selected){
    const structured=entry&&typeof entry==='object'&&!Array.isArray(entry);
    // An explicit false wins over the legacy unlockedFields list.
    const unlocked=structured?(entry.unlocked===true||(entry.unlocked===undefined&&listed.has(field))):listed.has(field);
    if(!unlocked)continue;
    const value=exposedValue(structured?entry.value:entry);if(value===undefined)continue;
    const publicEntry={value,unlocked:true};
    if(structured&&typeof entry.source==='string')publicEntry.source=entry.source;
    if(structured&&typeof entry.unlockedAt==='string')publicEntry.unlockedAt=entry.unlockedAt;
    if(value===null&&entry?.valueState==='unknown')publicEntry.valueState='unknown';
    forensicAttributes[field]=publicEntry;unlockedFields.push(field);
  }
  for(const field of ['dust_profile','material_profile'])if(listed.has(field))unlockedFields.push(field);
  return{unlockedFields,forensicAttributes};
}
export function addDisclosedNote(suspect,text,{id,kind,context}={}){
  if(typeof text!=='string'||!text.trim()||typeof id!=='string'||!PUBLIC_NOTE_KINDS.has(kind)||!context?.caseKey)return false;
  suspect.deductionState??={};const state=suspect.deductionState;
  if(!Array.isArray(state.notesUnlocked))state.notesUnlocked=[];
  const clean=text.trim();let changed=false;
  // Preserve the legacy internal list; public readers never infer safety from its wording.
  if(!state.notesUnlocked.includes(clean)){state.notesUnlocked.push(clean);changed=true;}
  if(!Array.isArray(state.publicNotes))state.publicNotes=[];
  const record={version:1,id,kind,visibility:'public',campaignId:context.campaignId??null,caseId:context.caseId??null,caseKey:String(context.caseKey),text:clean};
  const index=state.publicNotes.findIndex(note=>note?.id===id&&contextKey(note)===contextKey(context));
  if(index<0){state.publicNotes.push(record);changed=true;}
  else if(JSON.stringify(state.publicNotes[index])!==JSON.stringify(record)){state.publicNotes[index]=record;changed=true;}
  return changed;
}
export function publicDisclosedNotes(suspect,context){
  const notes=suspect?.deductionState?.publicNotes;if(!Array.isArray(notes)||!context?.caseKey)return[];
  return[...new Set(notes.filter(note=>note&&note.version===1&&note.visibility==='public'&&PUBLIC_NOTE_KINDS.has(note.kind)&&contextKey(note)===contextKey(context)&&typeof note.text==='string'&&note.text.trim()).map(note=>note.text.trim()))];
}
export function interviewEventId(event){return JSON.stringify([contextKey(event),event.suspectId,event.npcId,event.evidenceId,event.thread,event.outcome]);}
export function upsertInterviewResult(state,event){
  if(!Array.isArray(state.interviewEvidenceResults))state.interviewEvidenceResults=[];
  const records=state.interviewEvidenceResults,key=interviewEventId(event),indices=[];
  // Untagged legacy records are retained, not guessed to belong to this case.
  records.forEach((record,index)=>{if(record?.caseKey!=null&&interviewEventId(record)===key)indices.push(index);});
  if(!indices.length){records.push({...event,id:key});return true;}
  const first=indices[0],previous=records[first],next={...event,id:key,completedAt:previous.completedAt||event.completedAt};
  let changed=JSON.stringify(previous)!==JSON.stringify(next);
  if(changed)records[first]=next;
  for(let i=indices.length-1;i>0;i--){records.splice(indices[i],1);changed=true;}
  return changed;
}
