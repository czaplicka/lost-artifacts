import {readFile,writeFile} from 'node:fs/promises';
import {normalizeSkillId} from '../crimeBoard/skillNormalization.js';
const root=new URL('../',import.meta.url);
const database=JSON.parse(await readFile(new URL('assets/data/suspects.json',root),'utf8'));
if(!Array.isArray(database))throw Error('suspects.json must contain an array.');
const options=new Map();
for(const person of database){
 const raw=person?.skills,values=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(','):[];
 for(const value of values){if(typeof value!=='string'||!value.trim())continue;
  const id=normalizeSkillId(value);if(id&&!options.has(id))options.set(id,id==='pickpocket'?'Pickpocket':value.trim().charAt(0).toUpperCase()+value.trim().slice(1));
 }
}
if(!options.size)throw Error('No skills found.');
const catalog=[...options].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label));
await writeFile(new URL('assets/data/skills.json',root),JSON.stringify(catalog,null,2)+'\n');
console.log(`Updated ${catalog.length} public skills; no suspect records included.`);
