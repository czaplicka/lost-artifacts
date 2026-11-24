// personnel-clock-shared-v1
export function formatPersonnelClock(minute,withDay=false,dayTemplate='{time} ({day})'){
  if(!Number.isInteger(minute))return '';
  const local=((minute%1440)+1440)%1440;
  const time=`${String(Math.floor(local/60)).padStart(2,'0')}:${String(local%60).padStart(2,'0')}`;
  const day=Math.floor(minute/1440);
  if(!withDay||day===0)return time;
  const template=typeof dayTemplate==='string'&&dayTemplate?dayTemplate:'{time} ({day})';
  return template.replace(/\{(time|day)\}/g,(_,key)=>key==='time'?time:day>0?`+${day}`:String(day));
}
export function joinPersonnelInstructions(instructions,addition){
  return[instructions,addition].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()).join('\n\n');
}
