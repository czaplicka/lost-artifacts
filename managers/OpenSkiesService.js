import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { OPEN_SKIES as C } from '../assets/data/openSkiesContent.js';
import { ensureOpenSkiesSchedule } from '../systems/PIWorldWeather.js';
export function openSkiesQuest(){return gameState.piQuests?.quests?.[C.caseId]||null;}
export function openSkiesProgress(){
 const q=openSkiesQuest();if(q?.metadata?.contentId!=='open_skies')return null;
 ensureOpenSkiesSchedule();return openSkiesQuest().metadata.openSkies||{};
}
export function getOpenSkiesCall(){
 const schedule=ensureOpenSkiesSchedule();return schedule?{...C.call,...schedule}:null;
}
function save(progress){
 const q=openSkiesQuest();if(!q||q.metadata?.contentId!=='open_skies'||q.status!=='active')return false;
 const next={...q,metadata:{...q.metadata,openSkies:progress},objectives:(q.objectives||[]).map(o=>o.id==='collect_package'&&progress.collectedAt?{...o,completed:true}:o)};
 gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[C.caseId]:next}};requestAutosave();return true;
}
export function openSkiesPackageDue(now=Date.now()){
 const q=openSkiesQuest(),p=openSkiesProgress();if(!p||q.status!=='active'||p.collectedAt)return false;
 const accepted=Date.parse(q.acceptedAt);return Number.isFinite(accepted)&&now>=accepted+C.deliveryDelayMs;
}
export function collectOpenSkiesPackage(now=Date.now()){
 if(!openSkiesPackageDue(now))return {ok:false,message:'No new Open Skies delivery is available.'};
 const ok=save({...openSkiesProgress(),collectedAt:new Date(now).toISOString(),readDocuments:[]});return {ok,message:ok?'Foundation materials collected.':'The case is not active.'};
}
export function readOpenSkiesDocument(id){
 const p=openSkiesProgress();if(!p?.collectedAt||!C.documents.some(d=>d.id===id))return false;
 const read=Array.isArray(p.readDocuments)?p.readDocuments:[];if(read.includes(id))return true;return save({...p,readDocuments:[...read,id]});
}
export function registerOpenSkiesData(scene){
 const cache=scene.cache.json,definitions=cache.get('piCases'),ads=cache.get('piOfficeClassifieds');
 if(!Array.isArray(definitions?.cases)||!Array.isArray(ads?.advertisements))return false;
 const put=(key,data,field,item)=>{if(data[field].some(row=>row.id===item.id))return;cache.remove(key);cache.add(key,{...data,[field]:[...data[field],JSON.parse(JSON.stringify(item))]});};
 put('piCases',definitions,'cases',C.definition);put('piOfficeClassifieds',ads,'advertisements',C.advert);return true;
}
export function getOpenSkiesMail(){
 const q=openSkiesQuest();if(!q||q.metadata?.contentId!=='open_skies')return [];
 ensureOpenSkiesSchedule();return [{id:C.messageId,from:'Vice President <office@openskies.local>',subject:'Open Skies — case materials',date:'Case correspondence',threadId:C.caseId,body:C.briefing.join('\n\n')}];
}
