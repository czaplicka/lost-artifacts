import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
let project,replacements;
export function initialize(data){
 project=path.resolve(data.project);
 const h='globalThis.__ALIBI_INTEGRATION__';
 const catalog=JSON.stringify(path.join(project,'assets/data/dialogue/extracted.json'));
 replacements=new Map(Object.entries({
  'GameData.js':'export const gameState='+h+'.state;',
  'gameStatePersistence.js':'export function saveGameState(){'+h+'.saves++;'+h+'.saved=structuredClone('+h+'.state);return true;}export function requestAutosave(){'+h+'.autosaves++;}export function flushAutosave(){return true;}',
  'EventBus.js':'export const EventBus={emit(...args){'+h+'.events.push(args);}};',
  'ui/characterCreation/CharacterCreationData.js':'export function getEffectiveStats({stats}){return {...stats};}',
  'suspects/CaseSuspects.js':'export function getCaseSuspects(state){return state.caseSuspects||[];}',
  'managers/ProgressionManager.js':'export const progressionManager={grantReward(id,scope){const k=id+":"+scope;if('+h+'.rewards.has(k))return {success:true,alreadyGranted:true};'+h+'.rewards.add(k);return {success:true};}};',
  'dialogues/DialogueText.js':'import fs from "node:fs";const catalog=JSON.parse(fs.readFileSync('+catalog+',"utf8"));export function dialogueText(source,id){const v=catalog.sources?.[source]?.[id];if(typeof v!=="string")throw new Error("Missing real dialogue entry: "+source+"/"+id);return v;}'
 }).map(([relative,source])=>[pathToFileURL(path.join(project,relative)).href,source]));
}
export async function resolve(specifier,context,nextResolve){
 let url;try{url=new URL(specifier,context.parentURL).href;}catch{}
 if(replacements.has(url))return {url:'data:text/javascript;charset=utf-8,'+encodeURIComponent(replacements.get(url)),shortCircuit:true};
 return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
 if(url.startsWith('file:')){
  const filename=fileURLToPath(url),relative=path.relative(project,filename);
  const inside=relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
  const dependency=relative.split(path.sep).some(part=>part.toLowerCase()==='node_modules');
  if(inside&&!dependency&&path.extname(filename).toLowerCase()==='.js'){
   // Test-worker-only module classification. Never rewrite package.json or source files.
   return {format:'module',source:fs.readFileSync(filename,'utf8'),shortCircuit:true};
  }
 }
 return nextLoad(url,context);
}
