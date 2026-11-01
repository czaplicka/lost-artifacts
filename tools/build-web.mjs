import { readFile, writeFile, readdir, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const parse=async file=>JSON.parse(await readFile(file,'utf8'));
const arr=(value,label)=>{if(!Array.isArray(value))throw Error(`${label}: expected array`);return value;};
function ids(items,label){
 const result=new Set();for(const item of items){if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(item.id)||['__proto__','constructor','prototype'].includes(item.id)||result.has(item.id))throw Error(`${label}: invalid or repeated ID ${item?.id}`);result.add(item.id);}return result;
}
export function validateWebCase(c){
 ids([c],'case');const clouds=ids(arr(c.clouds,'clouds'),'clouds'),keys=ids(arr(c.keywords,'keywords'),'keywords'),pages=ids(arr(c.pages,'pages'),'pages');
 for(const k of c.keywords)if(!clouds.has(k.cloudId)||typeof k.label!=='string'||!k.label.length||k.label.length>80)throw Error(`${c.id}: invalid keyword ${k.id}`);
 for(const id of arr(c.initialKeywords||[],'initialKeywords'))if(!keys.has(id))throw Error(`${c.id}: unknown initial keyword ${id}`);
 for(const p of c.pages){
  if(typeof p.title!=='string')throw Error(`${c.id}/${p.id}: missing title`);
  for(const b of arr(p.blocks,'blocks'))for(const part of arr(b,'block'))if(typeof part!=='string'&&(!part||!keys.has(part.keywordId)||(part.text!==undefined&&typeof part.text!=='string')))throw Error(`${c.id}/${p.id}: invalid text fragment`);
  for(const link of arr(p.links||[],'links'))if(!pages.has(link.pageId)||typeof link.label!=='string')throw Error(`${c.id}/${p.id}: invalid link ${link.pageId}`);
 }
 const signatures=new Set();
 for(const r of arr(c.recipes,'recipes')){
  const terms=arr(r.terms,'terms'),targets=arr(r.pageIds||[r.pageId],'pageIds');
  if(!terms.length||terms.length>2||new Set(terms).size!==terms.length||!terms.every(k=>keys.has(k))||!targets.length||!targets.every(id=>pages.has(id)))throw Error(`${c.id}: invalid search recipe`);
  const signature=[...terms].sort().join('|');if(signatures.has(signature))throw Error(`${c.id}: repeated recipe ${signature}`);signatures.add(signature);
 }
 return c;
}
export async function assembleWeb(root=process.cwd()){
 const rootFile=path.join(root,'assets/data/piSearch.json'),original=await parse(rootFile);
 if(original.version!==1)throw Error('Unsupported piSearch.json version');ids(arr(original.cases,'cases'),'cases');
 const directory=path.join(root,'assets/data/web/missions'),sources=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(!entry.isDirectory())continue;const folder=path.join(directory,entry.name);
  let manifest;try{manifest=await parse(path.join(folder,'mission.json'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
  const file=relative=>{if(typeof relative!=='string'||!relative.endsWith('.json'))throw Error('Invalid mission filename');const resolved=path.resolve(folder,relative);if(!resolved.startsWith(folder+path.sep))throw Error('Mission path escape');return resolved;};
  if(manifest.version!==1)throw Error(`${entry.name}: unsupported manifest version`);
  const keywordData=await parse(file(manifest.keywordsFile)),searchData=await parse(file(manifest.searchFile));
  const pages=[];const names=arr(manifest.pageFiles,'pageFiles');if(new Set(names).size!==names.length)throw Error('Repeated page file');
  for(const name of names){const data=await parse(file(name));pages.push(...arr(data.pages,name));}
  const order=new Map((manifest.pageOrder||[]).map((id,i)=>[id,i]));pages.sort((a,b)=>(order.get(a.id)??1e9)-(order.get(b.id)??1e9));
  sources.push(validateWebCase({...manifest.caseFields,id:manifest.id,title:manifest.title,clouds:keywordData.clouds,keywords:keywordData.keywords,initialKeywords:keywordData.initialKeywords||[],pages,recipes:searchData.recipes}));
 }
 ids(sources,'mission manifests');
 const map=new Map(sources.map(c=>[c.id,c]));
 const cases=original.cases.map(c=>{const replacement=map.get(c.id);map.delete(c.id);return replacement||c;});cases.push(...map.values());
 return {...original,cases};
}
export async function buildWeb(root=process.cwd(),checkOnly=false){
 const data=await assembleWeb(root);
 if(!checkOnly){
  const target=path.join(root,'assets/data/piSearch.json');
  try{await copyFile(target,target+'.before-multi-web.bak',1);}catch(e){if(e.code!=='EEXIST')throw e;}
  const temp=target+'.build-web.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,target);
 }
 console.log(`${checkOnly?'Checked':'Built'} ${data.cases.length} search cases. ${checkOnly?'No files changed.':'Reload the game.'}`);return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.some(a=>a!=='--check')){console.error('Usage: node tools/build-web.mjs [--check]');process.exitCode=1;}
 else buildWeb(process.cwd(),args.includes('--check')).catch(e=>{console.error('[Web build]',e.message);process.exitCode=1;});
}
