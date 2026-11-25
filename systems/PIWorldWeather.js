import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import {PI_WEATHER_STATIONS as STATIONS} from '../assets/data/piWeatherStations.js';
import {getPIWorldDate,getPIWorldDateEpoch,zoneParts,localEpoch,resolveZoneTime,timeStamp,PI_DAY_MS as DAY} from './PIWorldCalendar.js';
export const WEATHER_LABELS={clear:'Clear',cloudy:'Cloudy',rain:'Rain',snow:'Snow',thunderstorm:'Thunderstorm'};
export const WEATHER_STATIONS=STATIONS;
const HOUR=3600000,CASE='pi_open_skies';
export function weatherHash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;return h>>>0;}
export function ensureWorldWeather(){
 const s=gameState.piQuests?.worldWeather;
 if(s?.version===1&&s.algorithm===1&&Number.isInteger(s.seed)&&s.seed>=0&&s.seed<=0xffffffff)return s;
 if(s?.version||s?.algorithm)throw new Error('Unsupported world weather save version.');
 let seed;
 if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1);globalThis.crypto.getRandomValues(a);seed=a[0];}
 else seed=weatherHash(`${Date.now()}:${Math.random()}:${gameState._createdAt||''}`);
 const next={version:1,algorithm:1,seed};
 gameState.piQuests={...(gameState.piQuests||{version:1,quests:{}}),worldWeather:next};requestAutosave();return next;
}
const mod=(n,m)=>((n%m)+m)%m;
function reservedDay(seed,day){return mod(day,3)===seed%3;}
export function generatedWeather(stationId,epoch,world=ensureWorldWeather()){
 const station=STATIONS.find(s=>s.id===stationId);
 if(!station||!Number.isFinite(epoch))return null;
 const p=zoneParts(epoch,station.zone),date=Date.UTC(p.year,p.month-1,p.day),day=Math.floor(date/DAY);
 const block=Math.floor(epoch/(6*HOUR)),h=weatherHash(`${world.seed}|${stationId}|${block}`);
 let condition=['clear','clear','cloudy','cloudy','rain','rain','thunderstorm'][h%7];
 const season=Math.cos(2*Math.PI*((p.month-1)/12-0.55))*(station.latitude<0?-1:1);
 const swing=Math.abs(station.latitude)>50?10:Math.abs(station.latitude)>30?8:3;
 const temperatureC=Math.round(station.baseC+season*swing+((h>>>8)%7)-3);
 if(temperatureC<=0&&condition==='rain')condition='snow';
 // These windows exist independently of accepting or reading any quest.
 const target=zoneParts(epoch,'Europe/Paris');
 const td=Math.floor(Date.UTC(target.year,target.month-1,target.day)/DAY);
 if(reservedDay(world.seed,td)&&target.hour>=2&&target.hour<5&&['roussillon','apia','miami'].includes(stationId))condition='thunderstorm';
 const windKmh=condition==='thunderstorm'?35+(h>>>16)%26:5+(h>>>16)%26;
 return {condition,temperatureC,windKmh};
}
export function buildOpenSkiesSchedule(acceptedDateEpoch,world=ensureWorldWeather()){
 // The receiving city date is 2-4 days before acceptance. Target clock is 03:00.
 for(const daysAgo of [3,2,4]){
  const targetDate=new Date(acceptedDateEpoch-(daysAgo-1)*DAY);
  const parts={year:targetDate.getUTCFullYear(),month:targetDate.getUTCMonth()+1,day:targetDate.getUTCDate(),hour:3,minute:0};
  if(!reservedDay(world.seed,Math.floor(localEpoch(parts)/DAY)))continue;
  const matches=resolveZoneTime(parts,'Europe/Paris');
  if(!matches.length)continue;
  const callUtc=matches[0],receiver=zoneParts(callUtc,'America/New_York');
  const reading=generatedWeather('roussillon',callUtc,world);
  if(reading?.condition!=='thunderstorm')continue;
  return {version:1,weatherAlgorithm:1,acceptedGameDate:new Date(acceptedDateEpoch).toISOString().slice(0,10),
   callUtc,receiverZone:'America/New_York',receivedIn:'New York',date:timeStamp(receiver).slice(0,10),time:timeStamp(receiver).slice(11),targetHour:3};
 }
 throw new Error('No valid Open Skies weather window.');
}
export function ensureOpenSkiesSchedule(){
 const q=gameState.piQuests?.quests?.[CASE];if(!q||q.metadata?.contentId!=='open_skies')return null;
 const existing=q.metadata.openSkies?.schedule;if(existing?.version===1)return existing;
 if(existing)throw new Error('Unsupported Open Skies schedule version.');
 // Legacy development saves had no game-date snapshot. Anchor once on upgrade.
 const stored=typeof q.acceptedGameDate==='string'?Date.parse(q.acceptedGameDate+'T00:00:00Z'):NaN;
 const schedule=buildOpenSkiesSchedule(Number.isFinite(stored)?stored:getPIWorldDateEpoch());
 const next={...q,metadata:{...q.metadata,openSkies:{...q.metadata.openSkies,schedule,
  ...(q.acceptedGameDate?{}:{scheduleMigration:'anchored-on-upgrade'})}}};
 gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[CASE]:next}};requestAutosave();return schedule;
}
export function prepareOpenSkiesQuest(quest){
 if(quest.id!==CASE||quest.metadata?.contentId!=='open_skies')return quest;
 const schedule=buildOpenSkiesSchedule(getPIWorldDateEpoch());
 return {...quest,acceptedGameDate:getPIWorldDate(),metadata:{...quest.metadata,openSkies:{...quest.metadata.openSkies,schedule}}};
}
