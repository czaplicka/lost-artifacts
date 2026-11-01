import {readFile,writeFile,mkdir,copyFile,rename,access} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assembleWeb} from './build-web.mjs';
const root=process.cwd(),checkOnly=process.argv.includes('--check');
const changes=new Map();
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
async function load(relative){return readFile(path.join(root,relative),'utf8');}
function once(source,pattern,replacement,label){
 const count=[...source.matchAll(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))].length;
 if(count!==1)throw Error(`${label}: expected one integration anchor, found ${count}. No files changed.`);
 return source.replace(pattern,replacement);
}
async function plan(relative,next){const old=await load(relative);if(old!==next)changes.set(relative,{old,next});}
export function hideNumbers(value){
 return value
 .replace(/My husband Edward died/g,'My husband Edward Vale died')
 .replace(/Please call me on 619\./g,'Please contact me when you can.')
 .replace(/His number is 620\./g,'He handles transfer enquiries at Mercer Audio.')
 .replace(/His business number is 621\./g,'He works through Ward Consulting.')
 .replace(/(?:Margaret Vale|Mercer Audio|Colin Ward) — (?:619|620|621)/g,m=>m.split(' — ')[0])
 .replace(/\bon 619\b/g,'through the published family contact')
 .replace(/\bon 620\b/g,'at Mercer Audio')
 .replace(/\bon 621\b/g,'at Ward Consulting')
 .replace(/\b(?:619|620|621)\b/g,'the published contact number');
}
export function cleanJavaScript(source){
 let out='',i=0;
 while(i<source.length){
  if(source.startsWith('//',i)){const end=source.indexOf('\n',i);if(end<0){out+=source.slice(i);break;}out+=source.slice(i,end+1);i=end+1;continue;}
  if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);if(end<0)throw Error('Unclosed source comment');out+=source.slice(i,end+2);i=end+2;continue;}
  const quote=source[i];
  if(quote==='"'||quote==="'"||quote==='`'){
   const begin=i++;let closed=false;
   while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i++]===quote){closed=true;break;}}
   if(!closed)throw Error('Unclosed source string');
   const literal=source.slice(begin,i),inside=literal.slice(1,-1);
   if(quote!=='`'&&inside.length>3&&/\b(?:619|620|621)\b|My husband Edward died/.test(inside))out+=quote+hideNumbers(inside)+quote;
   else out+=literal;
   continue;
  }
  out+=source[i++];
 }
 return out;
}
function cleanData(value){
 if(typeof value==='string')return value.length>3?hideNumbers(value):value;
 if(Array.isArray(value))return value.map(cleanData);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,cleanData(v)]));
 return value;
}
async function main(){
 if(process.argv.slice(2).some(a=>a!=='--check'))throw Error('Usage: node tools/install-dead-men-web.mjs [--check]');
 let source=await load('ui/PIOfficeComputerUI.js');
 if(!source.includes("from '../managers/DeadMenWebIntegration.js'"))source="import { installDeadMenWebUI } from '../managers/DeadMenWebIntegration.js';\n"+source;
 if(!source.includes('installDeadMenWebUI(this);'))source=once(source,/this\.photoQuest\s*=\s*new PhotoPIQuest\(this\);/g,m=>m+'\n    installDeadMenWebUI(this);','PI computer');
 await plan('ui/PIOfficeComputerUI.js',source);
 source=await load('ui/pi-phone/PhoneCalls.js');
 if(!source.includes("from '../../managers/DeadMenWebIntegration.js'"))source="import { installDeadMenWebPhone } from '../../managers/DeadMenWebIntegration.js';\n"+source;
 if(!source.includes('installDeadMenWebPhone(this);'))source=once(source,/installDeadMenFinalePhone\(this\);/g,m=>m+'installDeadMenWebPhone(this);','Phone installers');
 await plan('ui/pi-phone/PhoneCalls.js',source);
 source=await load('ui/pi-phone/PhoneDirectory.js');
 if(!source.includes('deadMenWebContacts')){
  source="import { deadMenWebContacts, isDeadMenWebContactVisible } from '../../managers/DeadMenWebIntegration.js';\n"+source;
  source=once(source,/return\s*\[\.\.\.contacts\.values\(\)\];/g,
   'for(const contact of deadMenWebContacts())contacts.set(contact.number,contact);\n return [...contacts.values()].filter(isDeadMenWebContactVisible);','Phone directory');
 }
 await plan('ui/pi-phone/PhoneDirectory.js',source);
 for(const relative of ['managers/DeadMenCallingService.js','managers/DeadMenCallingFollowup.js','managers/DeadMenCallingFinale.js','ui/pi-computer/DeadMenEvidenceUI.js']){
  const source=await load(relative);await plan(relative,cleanJavaScript(source));
 }
 for(const relative of ['assets/data/piCases.json','assets/data/piClassifieds.json']){
  if(!await exists(path.join(root,relative)))continue;
  const old=await load(relative),data=JSON.parse(old);
  // Only this quest's records are altered, never unrelated missions or contacts.
  function visit(v){
   if(Array.isArray(v))return v.map(visit);
   if(v&&typeof v==='object'){
    if(v.id==='pi_dead_men_calling'||v.missionId==='pi_dead_men_calling')return cleanData(v);
    return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,visit(item)]));
   }
   return v;
  }
  const next=visit(data);if(JSON.stringify(next)!==JSON.stringify(data))await plan(relative,JSON.stringify(next,null,2)+'\n');
 }
 const built=await assembleWeb(root);
 if(!built.cases.some(c=>c.id==='dead_men_calling'))throw Error('Dead Men Calling mission data is missing. Copy the whole package first.');
 const original=JSON.parse(await load('assets/data/piSearch.json'));
 if(JSON.stringify(original)!==JSON.stringify(built))await plan('assets/data/piSearch.json',JSON.stringify(built,null,2)+'\n');
 for(const [relative,{next}]of changes){
  if(relative.endsWith('.js'))execFileSync(process.execPath,['--check','--input-type=module'],{input:next,encoding:'utf8',stdio:['pipe','pipe','pipe']});
  else if(relative.endsWith('.json'))JSON.parse(next);
 }
 console.log(`${checkOnly?'Checked':'Prepared'} ${changes.size} file changes.`);
 if(checkOnly){console.log('No existing files changed.');return;}
 if(!changes.size){console.log('Already installed.');return;}
 const backup=path.join(root,'.dead-men-web-backups',`${Date.now()}-${process.pid}`);
 for(const [relative]of changes){const target=path.join(backup,relative);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,relative),target);}
 const written=[];
 try{
  for(const [relative,{next}]of changes){const target=path.join(root,relative),temp=target+'.dead-men-web.tmp';await writeFile(temp,next);await rename(temp,target);written.push(relative);}
 }catch(error){for(const relative of written)await writeFile(path.join(root,relative),changes.get(relative).old);throw error;}
 console.log('Installed Dead Men Calling web investigation. Reed and other search cases preserved.');
 console.log(`Backups: ${path.relative(root,backup)}`);console.log('Reload the game.');
}
// This file is an installer, not an application import.
main().catch(e=>{console.error('[Dead Men web install]',e.message);process.exitCode=1;});
