import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import {getPIWorldDate,getPIWorldDateEpoch,PI_DAY_MS as DAY,zoneParts} from '../systems/PIWorldCalendar.js';
import {generatedWeather,ensureWorldWeather,ensureOpenSkiesSchedule,WEATHER_STATIONS} from '../systems/PIWorldWeather.js';
import {settleOpenSkiesReward,getOpenSkiesRewardStatus} from './OpenSkiesRewardService.js';
export {getOpenSkiesRewardStatus};
const CASE='pi_open_skies';
export const OPEN_SKIES_TOWNS=[{id:'argeles',label:'Argeles-sur-Mer'},{id:'collioure',label:'Collioure'},{id:'port_vendres',label:'Port-Vendres'}];
export const OPEN_SKIES_PATTERNS=[{id:'even',label:'Even spacing'},{id:'short_long',label:'Short gap, then long gap'},{id:'long_short',label:'Long gap, then short gap'}];
export const OPEN_SKIES_PAGE_SOURCES=[{id:'foundation_home',label:'Open Skies Foundation'},{id:'town_argeles',label:'Argeles-sur-Mer visitor page'},
 {id:'town_collioure',label:'Collioure harbour page'},{id:'town_port_vendres',label:'Port-Vendres visitor page'},{id:'church_notice',label:'Church clock notice'},
 {id:'regional_clocks',label:'Regional clock maintenance bulletin'},...WEATHER_STATIONS.map(s=>({id:'area_'+s.id,label:s.region+' — directory'}))];
const clone=v=>JSON.parse(JSON.stringify(v));
function quest(){const q=gameState.piQuests?.quests?.[CASE];return q?.metadata?.contentId==='open_skies'?q:null;}
const progress=()=>quest()?.metadata?.openSkies;
const defaults=()=>({townId:null,bellCount:null,localHour:null,bellPattern:null,seaHeard:null,thunderHeard:null,weather:null,sourcePageIds:[]});
export function canEditOpenSkiesReport(){return quest()?.status==='active'&&!!progress()?.collectedAt&&!progress()?.resolution;}
export function getOpenSkiesReport(){syncOpenSkiesFinalBoard();const r=progress()?.report||{};return {...r,version:2,draft:{...defaults(),...r.draft},submissions:Array.isArray(r.submissions)?r.submissions:[]};}
export function getOpenSkiesReportChoices(){const known=gameState.piKeywordSearch?.cases?.[CASE]?.known||[],visited=progress()?.visitedPages||[];return {towns:OPEN_SKIES_TOWNS.filter(t=>known.includes(t.id)),sources:OPEN_SKIES_PAGE_SOURCES.filter(p=>visited.includes(p.id))};}
function write(report){if(!canEditOpenSkiesReport())return false;const root=gameState.piQuests,q=quest();gameState.piQuests={...root,quests:{...root.quests,[CASE]:{...q,metadata:{...q.metadata,openSkies:{...q.metadata.openSkies,report}}}}};requestAutosave();return true;}
export function editOpenSkiesReport(field,value){
 if(!canEditOpenSkiesReport())return {ok:false,message:'This report is not editable.'};let valid=false;
 if(field==='townId')valid=value===null||getOpenSkiesReportChoices().towns.some(t=>t.id===value);
 if(field==='bellCount')valid=value===null||(Number.isInteger(value)&&value>=1&&value<=12);
 if(field==='localHour')valid=value===null||(Number.isInteger(value)&&value>=0&&value<=23);
 if(field==='bellPattern')valid=value===null||OPEN_SKIES_PATTERNS.some(p=>p.id===value);
 if(['seaHeard','thunderHeard'].includes(field))valid=value===null||typeof value==='boolean';
 if(!valid)return {ok:false,message:'Choose a valid researched place or observation.'};const r=clone(getOpenSkiesReport());r.draft[field]=value;write(r);return {ok:true,message:'Draft saved.'};
}
export function attachOpenSkiesWeather(){
 if(!canEditOpenSkiesReport())return {ok:false,message:'The case is not active.'};const s=gameState.piQuests?.weather;
 if(s?.version!==2||!Number.isFinite(s.epoch)||!WEATHER_STATIONS.some(w=>w.id===s.selected))return {ok:false,message:'Select a date, UTC hour and station in Weather first.'};
 if(s.epoch>=getPIWorldDateEpoch()+DAY)return {ok:false,message:'Future observations cannot be attached.'};const world=ensureWorldWeather(),r=clone(getOpenSkiesReport());
 r.draft.weather={stationId:s.selected,epoch:s.epoch,reading:clone(generatedWeather(s.selected,s.epoch,world)),weatherSeed:world.seed,weatherAlgorithm:world.algorithm};write(r);return {ok:true,message:'Weather attached. Its relevance has not been checked.'};
}
export function toggleOpenSkiesReportSource(id){if(!canEditOpenSkiesReport()||!getOpenSkiesReportChoices().sources.some(p=>p.id===id))return {ok:false,message:'Open the source page before attaching it.'};const r=clone(getOpenSkiesReport()),ids=r.draft.sourcePageIds;r.draft.sourcePageIds=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];write(r);return {ok:true,message:'Sources saved.'};}
function validWeather(w){if(!w||!Number.isFinite(w.epoch)||w.epoch>=getPIWorldDateEpoch()+DAY||!WEATHER_STATIONS.some(s=>s.id===w.stationId))return false;const world=ensureWorldWeather(),expected=generatedWeather(w.stationId,w.epoch,world);return w.weatherSeed===world.seed&&w.weatherAlgorithm===world.algorithm&&expected&&['condition','temperatureC','windKmh'].every(k=>w.reading?.[k]===expected[k]);}
export function reviewOpenSkiesReport(){
 const d=getOpenSkiesReport().draft,c=getOpenSkiesReportChoices(),missing=[];
 if(!canEditOpenSkiesReport())missing.push('Active case and collected materials');if(!c.towns.some(t=>t.id===d.townId))missing.push('Researched place');
 if(!Number.isInteger(d.bellCount)||d.bellCount<1||d.bellCount>12)missing.push('Bell count');if(!Number.isInteger(d.localHour)||d.localHour<0||d.localHour>23)missing.push('Local hour');
 if(!OPEN_SKIES_PATTERNS.some(p=>p.id===d.bellPattern))missing.push('Bell spacing');if(typeof d.seaHeard!=='boolean'||typeof d.thunderHeard!=='boolean')missing.push('Sound observations');if(!validWeather(d.weather))missing.push('Valid weather attachment');
 const attached=d.sourcePageIds.filter(id=>c.sources.some(p=>p.id===id));if(!attached.includes('town_'+d.townId))missing.push('Visitor page for your proposed place');if(!attached.includes('church_notice'))missing.push('Parish clock notice');if(!attached.includes('regional_clocks'))missing.push('Regional clock comparison');
 return {ok:!missing.length,missing,message:missing.length?'Draft incomplete: '+missing.join('; ')+'.':'Draft complete. This check does not assess the conclusion.'};
}
function supported(d){const s=ensureOpenSkiesSchedule();if(!s)return false;const p=zoneParts(s.callUtc,'Europe/Paris'),visited=progress()?.visitedPages||[];
 return d.townId==='collioure'&&d.bellCount===3&&d.localHour===3&&p.hour===3&&d.bellPattern==='short_long'&&d.seaHeard===true&&d.thunderHeard===true&&d.weather.stationId==='roussillon'&&d.weather.epoch===Math.floor(s.callUtc/3600000)*3600000&&d.weather.reading.condition==='thunderstorm'&&['town_collioure','church_notice','regional_clocks'].every(id=>visited.includes(id)&&d.sourcePageIds.includes(id));}
export function claimOpenSkiesReward(){const result=settleOpenSkiesReward();try{syncOpenSkiesFinalBoard();}catch(e){console.error('[OpenSkiesReport] Board sync deferred:',e);}return result;}
export function submitOpenSkiesLead(){
 if(progress()?.resolution)return claimOpenSkiesReward();
 if(quest()?.status==='completed')return {ok:false,message:'This case has already been closed.'};
 const check=reviewOpenSkiesReport();if(!check.ok)return check;const r=clone(getOpenSkiesReport()),d=r.draft,signature=JSON.stringify({evaluationVersion:1,draft:d});
 if(r.submissions.at(-1)?.signature===signature)return {ok:false,message:'This version has already been assessed. Revise your report before resubmitting.'};
 const accepted=supported(d),revision=(r.nextRevision||r.submissions.length)+1;r.submissions=[...r.submissions,{id:`open_skies_lead_${revision}`,revision,signature,draft:clone(d),sentGameDate:getPIWorldDate(),status:accepted?'accepted':'unsupported'}].slice(-10);r.nextRevision=revision;
 const root=gameState.piQuests,q=quest(),p=q.metadata.openSkies;
 const resolution=accepted?{version:1,id:`${CASE}:located`,phase:'settling',completedGameDate:getPIWorldDate(),reportRevision:revision,location:{town:'Collioure',landmark:'Notre-Dame-des-Anges',region:'Roussillon, France'},summary:'The president was located in Collioure, close to Notre-Dame-des-Anges. The recording, clock pattern, call timing and regional weather form a consistent location report.',report:clone(d)}:null;
 gameState.piQuests={...root,quests:{...root.quests,[CASE]:{...q,metadata:{...q.metadata,openSkies:{...p,report:r,...(resolution?{resolution}: {})}}}}};requestAutosave();
 if(accepted){const reward=claimOpenSkiesReward();return {...reward,accepted:true,message:reward.ok?'Case closed. '+reward.message:'Location report accepted. '+reward.message};}
 return {ok:true,accepted:false,message:'The report does not establish a supported location. Recheck your observations, timing and source material.'};
}
export function syncOpenSkiesFinalBoard(){
 const q=quest(),r=progress()?.resolution;if(q?.status!=='completed'||!r)return false;const root=gameState.piInvestigations||{version:1,selectedCaseId:null,cases:{}},old=root.cases?.[CASE];
 const board=old?.board||{meta:{boardId:`pi-${CASE}`,caseId:CASE,title:q.title||'Open Skies',version:1},items:[],links:[]},existing=(board.items||[]).find(i=>i.id==='open_skies_final_report'),s=getOpenSkiesRewardStatus();
 const text=r.summary+(s.phase==='completed'?`\n\nReward: $${s.actualCashPaid??200}; XP: ${s.xpGranted??'recorded'}.`:'');
 const note={...existing,id:'open_skies_final_report',type:'note',label:'Open Skies — final location report',text,metaText:'Collioure / Notre-Dame-des-Anges',color:'yellow',x:existing?.x??120,y:existing?.y??380,discovered:true,createdByPlayer:false,editableByPlayer:false};
 if(old?.status==='completed'&&JSON.stringify(existing)===JSON.stringify(note))return false;
 gameState.piInvestigations={...root,cases:{...root.cases,[CASE]:{...old,id:CASE,kind:'side',title:old?.title||q.title||'Open Skies',status:'completed',board:{...board,items:[...(board.items||[]).filter(i=>i.id!==note.id),note]},resolution:{endingId:'located_collioure'}}}};requestAutosave();return true;
}
export function getOpenSkiesReportMessages(){if(!quest())return [];const reward=getOpenSkiesRewardStatus();return getOpenSkiesReport().submissions.map(s=>({id:s.id+'_receipt',from:'Open Skies Foundation <office@openskies.local>',subject:s.status==='accepted'?(reward.phase==='completed'?'Location established — Open Skies':'Report accepted — reward available'):s.status==='unsupported'?`Report requires revision — ${s.revision}`:`Location lead received — revision ${s.revision}`,date:s.sentGameDate,threadId:CASE,
 body:s.status==='accepted'?'Your evidence establishes Collioure, close to Notre-Dame-des-Anges, as the president\'s location. No travel or confrontation is required.\n\n'+(reward.phase==='completed'?`Reward settled: $${reward.actualCashPaid??200}. XP awarded: ${reward.xpGranted??'already recorded'}.`:'Open the case report to finish collecting your $200 base reward and 100 XP.'):s.status==='unsupported'?'The submitted material does not establish the proposed location. Review the recording, receiving-city time, regional observations and source pages. The case remains open.':'Your earlier location lead is on file. Open the case materials to complete and submit the updated report.'})).reverse();}
