export const EDITABLE_FIELDS=['specialtyDish','foodIngredient','classicCar','drivingFact','guidebookNote','cityRiver','callingCode','flagColors','plugType','utcOffsetFact','wildlife','famousPerson','artStyle','craftGood','exportGood','traditionFact','mountainFact','currency.name','currency.symbol','currency.oldCurrency.name','currency.oldCurrency.originFact'];
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
