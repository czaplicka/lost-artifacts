import { normalizePursuitCityId } from '../managers/PursuitCityContext.js';
const text=value=>typeof value==='string'?value.trim():'';
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function cityNameGuard(countryFacts={},extraIds=[]){
 const names=new Set();
 for(const raw of [...Object.keys(countryFacts),...extraIds]){
  if(!raw)continue;const id=normalizePursuitCityId(raw);
  for(const value of [String(raw),String(raw).replace(/_/g,' '),id,id?.replace(/_/g,' ')])if(value&&value.length>=3)names.add(value);
  if(id==='new_delhi')for(const v of ['New Delhi','New Dehli','NewDelhi','Delhi'])names.add(v);
  if(id==='new_york_city')for(const v of ['New York','New York City','NewYorkCity','NYC'])names.add(v);
 }
 const patterns=[...names].sort((a,b)=>b.length-a.length).map(name=>new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`,'giu'));
 return {
  safe:value=>Boolean(text(value))&&!patterns.some(pattern=>{pattern.lastIndex=0;return pattern.test(value);}),
  clean:value=>{let result=text(value);for(const pattern of patterns)result=result.replace(pattern,'the city');return result;}
 };
}
export function findCityFacts(source,cityId){
 const id=normalizePursuitCityId(cityId);if(!id)return null;
 const match=Object.entries(source||{}).find(([key])=>normalizePursuitCityId(key)===id);
 return match?.[1]&&typeof match[1]==='object'?match[1]:null;
}
const read=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const fieldText={
 specialtyDish:v=>`They were planning their first meal after arriving at the next stop: “${v}”. Apparently escape plans need a lunch break.`,
 foodIngredient:v=>`They asked about trying this food at their next stop: “${v}”. Not something they had ordered here.`,
 classicCar:v=>`They asked whether they might see “${v}” at their next stop. They remembered the car more clearly than their own cover story.`,
 drivingFact:v=>`They were checking the driving rules for their next stop: “${v}”. I suggested reading them before renting a car.`,
 guidebookNote:v=>`They wanted to visit this after arriving at their next stop: “${v}”. Their itinerary was better organised than their excuses.`,
 cityRiver:v=>`They described the next destination with this landmark note: “${v}”. That was the part I remembered.`,
 callingCode:v=>`They asked how to call a number beginning with ${v} in the country they were heading to.`,
 flagColors:v=>`They were checking the flag at their next destination: “${v}”. They did not give me the city's name.`,
 plugType:v=>`For the next leg of the trip, they wanted an adapter for “${v}”. Even a fugitive needs a charged phone.`,
 utcOffsetFact:v=>`They were adjusting their schedule for the next stop: “${v}”. Their alarm clock had more information than I did.`,
 wildlife:v=>`A sightseeing note for the next destination mentioned “${v}”. They asked if there would be time for a detour.`,
 famousPerson:v=>`They were reading about “${v}” while planning the next stop. They asked about places connected with that person.`,
 artStyle:v=>`They wanted to look for “${v}” at their next destination. An unusually cultured itinerary for someone in such a hurry.`,
 craftGood:v=>`They asked whether “${v}” would be easy to find at their next stop. They had already made a shopping list.`,
 exportGood:v=>`Their questions about the next destination included “${v}”. I remember the detail, not the name of the place.`,
 traditionFact:v=>`They were checking whether they could experience “${v}” at their next destination.`,
 mountainFact:v=>`They were reading about “${v}” in the country of their next stop. They did not say they would fly over it.`
};
const keys={dish:['specialtyDish','foodIngredient'],cars:['classicCar','drivingFact'],flight:['guidebookNote','cityRiver','flagColors'],currency:[],travel:['guidebookNote','cityRiver','specialtyDish','callingCode','flagColors','classicCar']};
export function buildDestinationLines({topicId,facts,templates=[],guard}){
 if(!facts)return [];
 const accept=value=>typeof value==='string'&&value.trim()&&guard.safe(value)&&!/[{}]/.test(value),lines=[];
 const add=value=>{if(accept(value)&&!lines.includes(value))lines.push(value);};
 if(topicId==='currency'){
  const currency=text(facts.currency?.name);
  if(currency&&guard.safe(currency)){
   const landmark=[facts.guidebookNote,facts.cityRiver].find(accept);
   if(landmark){
    add(`They wanted ${currency} for their next stop. They were also asking about “${landmark}”. The exchange rate was not the part they wanted written down.`);
    add(`They asked for small notes in ${currency} before travelling on. Their destination notes mentioned “${landmark}”.`);
   }else add(`They asked to change money into ${currency} for the next leg of the trip. That alone may not identify a city.`);
  }return lines;
 }
 let fields=keys[topicId];
 if(!fields){
  fields=[...new Set(templates.filter(v=>typeof v==='string').flatMap(t=>[...t.matchAll(/\{([\w.]+)\}/g)].map(m=>m[1])).filter(f=>Object.hasOwn(fieldText,f)))];
  if(!fields.length)fields=['guidebookNote','cityRiver'];
 }
 for(const field of fields){const value=text(read(facts,field));if(value&&fieldText[field]&&guard.safe(value))add(fieldText[field](value));}
 return lines;
}
