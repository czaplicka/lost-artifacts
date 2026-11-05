import {readFile,writeFile,mkdir,copyFile,rename,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async name=>(await readFile(path.join(root,name),'utf8')).replace(/^\uFEFF/,'');
const names=['ui/PlayerCloudModel.js','ui/pi-phone/PhoneFieldNotes.js','managers/DeadMenPhoneTopics.js'];
const files=new Map();
for(const name of names){try{const text=await read(name);files.set(name,{old:text,text});}catch(error){throw Error('Missing '+name+'. Install Player Clouds / Reed first. No files changed.');}}
const model=files.get(names[0]),field=files.get(names[1]),manager=files.get(names[2]);
const markers=[model.text.includes("from './DeadMenCloudModel.js'"),field.text.includes("from './DeadMenCloudPhoneNotes.js'"),manager.text.includes('DM_PLAYER_CLOUD_METADATA_V1')];
if(markers.every(Boolean)){console.log('Dead Men manual clouds already connected. No files changed.');process.exit(0);}
if(markers.some(Boolean))throw Error('Partial installation detected. No files changed. Restore the integration files from the same backup.');
function once(file,re,replace,label){
 const count=[...file.text.matchAll(new RegExp(re.source,'g'))].length;
 if(count!==1)throw Error(label+': expected one integration location, found '+count+'. No files changed.');
 file.text=file.text.replace(new RegExp(re.source),replace);
}
model.text="import { deadMenNamingOptions } from './DeadMenCloudModel.js';\n"+model.text;
once(model,/export\s+function\s+namingOptions\s*\(\s*state\s*,\s*definition\s*\)\s*\{/,
 match=>match+"\n if(definition.id==='dead_men_calling')return deadMenNamingOptions(state,definition);",'manual naming options');
field.text="import { renderDeadMenCloudPhoneNotes } from './DeadMenCloudPhoneNotes.js';\n"+field.text;
once(field,/export\s+function\s+renderPhoneFieldNotes\s*\(\s*\)\s*\{/,
 match=>match+"\n if(this.active?.caseId==='dead_men_calling')return renderDeadMenCloudPhoneNotes.call(this);",'phone notebook dispatcher');
once(manager,/id\s*:\s*t\.id\s*,\s*terms\s*:\s*t\.terms\s*,\s*requiresFlags\s*:/,
 "id:t.id,terms:t.terms,group:t.group,effect:t.effect,requiresFlags:",'existing topic metadata');
once(manager,/choicePrompt\s*:\s*'Choose one or two recorded clues to ask about\.'/,
 "choicePrompt:'Choose a topic from your named clouds.'",'phone instruction');
manager.text+='\n// DM_PLAYER_CLOUD_METADATA_V1\n';
const newFiles=['ui/DeadMenCloudModel.js','ui/pi-phone/DeadMenCloudPhoneNotes.js'];
for(const name of newFiles){const source=await read(name);execFileSync(process.execPath,['--input-type=module','--check'],{input:source,stdio:['pipe','pipe','pipe']});}
for(const [name,file]of files){try{execFileSync(process.execPath,['--input-type=module','--check'],{input:file.text,encoding:'utf8',stdio:['pipe','pipe','pipe']});}catch(error){throw Error('Syntax check failed for '+name+'\n'+(error.stderr||error.message));}}
if(process.argv.includes('--check')){console.log('Naming and phone integration syntax checked. No integration files changed.');process.exit(0);}
const backup=path.join(root,'backups','dead-men-clouds-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(backup,{recursive:true});
for(const name of names){const destination=path.join(backup,name);await mkdir(path.dirname(destination),{recursive:true});await copyFile(path.join(root,name),destination);}
try{
 for(const [name,file]of files)await writeFile(path.join(root,name)+'.dmcloud.tmp',file.text,'utf8');
 for(const name of names)await rename(path.join(root,name)+'.dmcloud.tmp',path.join(root,name));
}catch(error){for(const [name,file]of files)await writeFile(path.join(root,name),file.old,'utf8');throw error;}
finally{for(const name of names)await rm(path.join(root,name)+'.dmcloud.tmp',{force:true});}
console.log('Dead Men Calling now uses player-named clouds and contextual phone questions. Reload the game.');
console.log('Backup: '+path.relative(root,backup));
