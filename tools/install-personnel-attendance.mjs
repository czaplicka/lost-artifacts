import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),write=process.argv.includes('--write');
async function maybeRead(url){try{return await readFile(url,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function syntax(value,name){const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:value,encoding:'utf8'});if(result.status!==0)throw Error(`${name}: invalid JavaScript.\n${result.stderr||result.error}`);}
async function main(){
 const rosterPath='suspects/PersonnelRoster.js',rosterBefore=await readFile(new URL(rosterPath,root),'utf8');
 const newline=rosterBefore.includes('\r\n')?'\r\n':'\n',bom=rosterBefore.startsWith('\uFEFF');
 let roster=rosterBefore.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 const marker='// personnel-clock-shared-v1';
 if(!roster.includes(marker)){
  const pattern=/^function\s+clock\s*\(\s*n\s*\)\s*\{[\s\S]*?(?=^function\s+floorLabel\b)/gm;
  const matches=[...roster.matchAll(pattern)];
  if(matches.length!==1)throw Error(`PersonnelRoster.js: shared clock expected 1 matching function before floorLabel, got ${matches.length}. No game files changed.`);
  if(/\bformatPersonnelTime\b/.test(roster))throw Error('PersonnelRoster.js: import alias already exists without the installation marker. No game files changed.');
  roster=roster.replace(pattern,"function clock(n){return formatPersonnelTime(n,true,PERSONNEL_TEXT.attendance?.clockDay);}\n");
  roster=marker+"\nimport { formatPersonnelClock as formatPersonnelTime } from './PersonnelClock.js';\n"+roster;
 }else if(!roster.includes('formatPersonnelTime(n,true,PERSONNEL_TEXT.attendance?.clockDay)'))throw Error('PersonnelRoster.js: shared clock marker is inconsistent. No game files changed.');
 if(newline==='\r\n')roster=roster.replace(/\n/g,'\r\n');if(bom)roster='\uFEFF'+roster;
 const dataPath='assets/data/personnelWitnesses.json',dataBefore=await readFile(new URL(dataPath,root),'utf8');
 const data=JSON.parse(dataBefore.replace(/^\uFEFF/,''));
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('personnelWitnesses.json must be an object. No game files changed.');
 if(data.attendance!==undefined&&(!data.attendance||typeof data.attendance!=='object'||Array.isArray(data.attendance)))throw Error('Existing attendance text section is not an object. No game files changed.');
 const defaults=JSON.parse(await readFile(new URL('personnel-attendance-files/attendance-texts.json',import.meta.url),'utf8'));
 const merged={...defaults,...data.attendance};
 for(const key of Object.keys(defaults))if(typeof merged[key]!=='string'||!merged[key].trim())throw Error(`Invalid attendance text: ${key}. No game files changed.`);
 if(!merged.clockDay.includes('{time}')||!merged.clockDay.includes('{day}'))throw Error('clockDay must contain {time} and {day}. No game files changed.');
 const updated={...data,attendance:merged};
 const dataAfter=JSON.stringify(data)===JSON.stringify(updated)?dataBefore:JSON.stringify(updated,null,2)+'\n';
 const attendance=await readFile(new URL('personnel-attendance-files/PersonnelAttendance.js',import.meta.url),'utf8');
 const clock=await readFile(new URL('personnel-attendance-files/PersonnelClock.js',import.meta.url),'utf8');
 const clockPath='suspects/PersonnelClock.js',clockBefore=await maybeRead(new URL(clockPath,root));
 if(clockBefore!==null&&!clockBefore.includes(marker))throw Error('PersonnelClock.js already exists and is not recognized. No game files changed.');
 const plans=[{path:rosterPath,before:rosterBefore,after:roster},{path:dataPath,before:dataBefore,after:dataAfter},
  {path:'suspects/PersonnelAttendance.js',before:await maybeRead(new URL('suspects/PersonnelAttendance.js',root)),after:attendance},
  {path:clockPath,before:clockBefore,after:clock}];
 for(const p of plans)if(p.path.endsWith('.js'))syntax(p.after,p.path);
 const changed=plans.filter(p=>p.before!==p.after);
 if(!changed.length){console.log('Already installed. No game files changed.');return;}
 console.log(changed.map(p=>`${write?'Updating':'Would update'}: ${p.path}`).join('\n'));
 if(!write){console.log('Preview only. Run with --write to install.');return;}
 const backup=new URL(`backups/personnel-attendance-${Date.now()}/`,root);
 await mkdir(backup,{recursive:true});
 for(const p of changed)if(p.before!==null){const target=new URL(p.path,backup);await mkdir(new URL('./',target),{recursive:true});await writeFile(target,p.before);}
 await writeFile(new URL('manifest.json',backup),JSON.stringify(changed.map(p=>({path:p.path,created:p.before===null})),null,2));
 for(const p of changed)if(await maybeRead(new URL(p.path,root))!==p.before)throw Error(`${p.path} changed during preparation. No game files changed.`);
 const applied=[];
 try{for(const p of changed){const target=new URL(p.path,root);await mkdir(new URL('./',target),{recursive:true});applied.push(p);await writeFile(target,p.after);}}
 catch(error){for(const p of applied.reverse()){try{const target=new URL(p.path,root);if(p.before===null)await rm(target,{force:true});else await writeFile(target,p.before);}catch(restoreError){console.error(`Restore ${p.path} from backup: ${restoreError.message}`);}}throw error;}
 console.log(`Done. Backup: ${fileURLToPath(backup)}`);console.log('Reload the game fully so the updated text catalog is loaded.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
