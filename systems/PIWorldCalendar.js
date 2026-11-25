import { gameState } from '../GameData.js';
const DAY=86400000;
// Matches PassportManager / the date displayed on the PI desktop.
export function getPIWorldDateEpoch(state=gameState){
 const day=Math.max(1,Math.floor(Number(state.currentDay)||1));
 return Date.UTC(1990,3,1)+(day-1)*DAY;
}
export function getPIWorldDate(state=gameState){return new Date(getPIWorldDateEpoch(state)).toISOString().slice(0,10);}
export const PI_DAY_MS=DAY;
const formatters=new Map();
export function zoneParts(epoch,zone){
 if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
 const p={};for(const item of formatters.get(zone).formatToParts(new Date(epoch)))if(item.type!=='literal')p[item.type]=Number(item.value);return p;
}
export function localEpoch(p){return Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);}
export const timeStamp=p=>`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')} ${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;
export function resolveZoneTime(local,zone){
 const wall=localEpoch(local),offsets=new Set();
 for(let h=-48;h<=48;h+=6){const t=wall+h*3600000;offsets.add(localEpoch(zoneParts(t,zone))-t);}
 return [...offsets].map(offset=>wall-offset).filter(t=>timeStamp(zoneParts(t,zone))===timeStamp(local)).sort((a,b)=>a-b);
}
export function zoneOffset(epoch,zone){
 const min=Math.round((localEpoch(zoneParts(epoch,zone))-epoch)/60000),a=Math.abs(min);
 return `UTC${min<0?'-':'+'}${String(Math.floor(a/60)).padStart(2,'0')}:${String(a%60).padStart(2,'0')}`;
}
