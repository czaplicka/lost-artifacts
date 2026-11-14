import { dialogueText as __dialogueText } from "./DialogueText.js";
export const EDITABLE_FIELDS=['specialtyDish','foodIngredient','classicCar','drivingFact','guidebookNote','cityRiver','callingCode','flagColors','plugType','utcOffsetFact','wildlife','famousPerson','artStyle','craftGood','exportGood','traditionFact','mountainFact',__dialogueText("dialogues/EditableTravelTemplates.js", "t_8ed6802f082f99872541"),__dialogueText("dialogues/EditableTravelTemplates.js", "t_ab5d442b47633d9f938f"),__dialogueText("dialogues/EditableTravelTemplates.js", "t_e6cb4d9cf0cd9323d241"),__dialogueText("dialogues/EditableTravelTemplates.js", "t_31a917be436202478fd7")];
export function editableTravelLines(templates,facts,guard){
 const results=[];
 for(const raw of Array.isArray(templates)?templates:[]){
  // Only editor-marked templates override the old generator.
  if(typeof raw!=='string'||!raw.startsWith('@editable:'))continue;
  const template=raw.slice(10).trim(),fields=[...template.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);
  if(!fields.length||fields.some(f=>!EDITABLE_FIELDS.includes(f)))continue;
  const read=p=>p.split('.').reduce((v,k)=>v?.[k],facts);
  if(fields.some(f=>typeof read(f)!=='string'||!read(f).trim()))continue;
  const text=template.replace(/\{([^{}]+)\}/g,(_,p)=>read(p).trim());
  // Every authored travel clue must explicitly refer to the NEXT destination.
  if(!/\b(next (stop|destination|leg)|heading to|travell?ing (on|to)|onward)\b/i.test(text))continue;
  if(!/[{}]/.test(text)&&guard.safe(text)&&!results.includes(text))results.push(text);
 }
 return results;
}
