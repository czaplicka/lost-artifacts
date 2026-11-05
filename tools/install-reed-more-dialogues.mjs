import {readFile,writeFile,copyFile,mkdir,rename,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async name=>(await readFile(path.join(root,name),'utf8')).replace(/^\uFEFF/,'');
const config=JSON.parse(await read('tools/reed-more-phone-dialogues.json'));
const phoneFile='assets/data/piPhoneInvestigations.json',callbackFile='assets/data/reedContact.json',modelFile='ui/PlayerCloudModel.js';
const original=new Map();
for(const name of [phoneFile,callbackFile,modelFile]){
 try{original.set(name,await read(name));}catch(error){throw Error('Missing '+name+'. Install the manual Player Clouds package first. No files changed.');}
}
const phone=JSON.parse(original.get(phoneFile)),callback=JSON.parse(original.get(callbackFile));
const contact=phone.contacts?.find(c=>c.id==='open_skies_office'&&c.caseId==='miramar_demo');
if(!contact||callback.searchCaseId!=='miramar_demo'||!Array.isArray(contact.topics))throw Error('Unexpected Reed data. No files changed.');
const definition=JSON.parse(await read('assets/data/piSearch.json')).cases?.find(c=>c.id==='miramar_demo');
if(!definition)throw Error('Build the search data first. No files changed.');
const keywords=new Set(definition.keywords.map(k=>k.id));
const ids=new Set();
for(const entry of config.topics){
 const topic=entry.topic;
 if(ids.has(topic.id)||!topic.terms.length||topic.terms.length>2||!topic.terms.every(id=>keywords.has(id))||!topic.lines.every(l=>typeof l.text==='string'&&typeof l.speaker==='string'))throw Error('Invalid new topic '+topic.id);
 ids.add(topic.id);
}
const marker='// REED_MORE_PHONE_DIALOGUES_V1';
let model=original.get(modelFile);
if(model.includes(marker)){
 if(config.topics.every(entry=>contact.topics.some(t=>t.id===entry.id))&&callback.dialogueEdition==='reed-more-phone-v1'){
  console.log('Reed phone expansion already installed. No files changed.');process.exit(0);
 }
 throw Error('Partial dialogue expansion detected. No files changed.');
}
const pattern=/const\s+specs\s*=\s*\[/g;
if([...model.matchAll(pattern)].length!==1||!model.includes('reedPhoneQuestions'))throw Error('Cloud question dispatcher differs from the reviewed version. No files changed.');
for(const entry of config.topics)if(contact.topics.some(topic=>topic.id===entry.id))throw Error('Topic ID conflict: '+entry.id);
const rows=config.topics.map(entry=>JSON.stringify([entry.id,entry.label,entry.subject,...(entry.detail?[entry.detail]:[])]));
model=model.replace(pattern,match=>match+'\n '+rows.join(',\n ')+',\n');
model+='\n'+marker+'\n';
try{execFileSync(process.execPath,['--input-type=module','--check'],{input:model,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
catch(error){throw Error('Model syntax check failed: '+(error.stderr||error.message));}
contact.topics.push(...config.topics.map(entry=>entry.topic));
callback.lines=config.callbackLines;
callback.dialogueEdition='reed-more-phone-v1';
const updates=new Map([[phoneFile,JSON.stringify(phone,null,2)+'\n'],[callbackFile,JSON.stringify(callback,null,2)+'\n'],[modelFile,model]]);
if(process.argv.includes('--check')){console.log('10 new topics, callback and cloud dispatcher checked. No files changed.');process.exit(0);}
const backup=path.join(root,'backups','reed-dialogues-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(backup,{recursive:true});
for(const name of updates.keys()){const destination=path.join(backup,name);await mkdir(path.dirname(destination),{recursive:true});await copyFile(path.join(root,name),destination);}
try{
 for(const [name,text]of updates)await writeFile(path.join(root,name)+'.reed.tmp',text,'utf8');
 for(const name of updates.keys())await rename(path.join(root,name)+'.reed.tmp',path.join(root,name));
}catch(error){for(const [name,text]of original)await writeFile(path.join(root,name),text,'utf8');throw error;}
finally{for(const name of updates.keys())await rm(path.join(root,name)+'.reed.tmp',{force:true});}
console.log('Installed 10 new Reed topics and expanded Claire callback. Reload the game.');
console.log('Backup: '+path.relative(root,backup));
