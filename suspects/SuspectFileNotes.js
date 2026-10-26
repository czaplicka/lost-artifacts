import { getMaterialDossierNotes } from './MaterialEvidence.js';
import { getDustHobbyLabels, getDustDossierNotes } from './DustEvidence.js';

function strings(value) {
  const result=[],seen=new Set();
  for(const raw of Array.isArray(value)?value:[]){
    if(typeof raw!=='string'||!raw.trim())continue;
    const text=raw.trim(),key=text.toLowerCase();
    if(!seen.has(key)){seen.add(key);result.push(text);}
  }
  return result;
}

// Text-only presentation API. Never exposes profile IDs or compatibility.
// Raw profiles are authoritative; safe public notes are a fallback for public views.
export function getSuspectFileNotes(suspect={}) {
  const publicProfile=suspect.publicProfile||{};
  const visible=strings(publicProfile.visibleTraits??suspect.visibleTraits);
  const personal=suspect.materialProfile!=null
    ?strings(getMaterialDossierNotes(suspect).map(note=>note.text))
    :strings(publicProfile.personalNotes??suspect.personalNotes);
  let hobbies=suspect.dustProfile!=null
    ?strings(getDustHobbyLabels(suspect))
    :strings(publicProfile.hobbies??suspect.hobbies);
  const legacyHobbies=visible.filter(text=>/^hobbies\s*:/i.test(text));
  if(suspect.dustProfile==null&&!hobbies.length){
    hobbies=strings(legacyHobbies.flatMap(text=>text.replace(/^hobbies\s*:\s*/i,'').replace(/\.$/,'').split(';')));
  }
  const copied=new Set([
    ...personal,...hobbies,
    ...(suspect.dustProfile!=null?getDustDossierNotes(suspect).map(note=>note.text):[])
  ].map(text=>text.toLowerCase()));
  return {
    visible:visible.filter(text=>!copied.has(text.toLowerCase())&&!/^hobbies\s*:/i.test(text)),
    personal:[...personal],hobbies:[...hobbies]
  };
}
