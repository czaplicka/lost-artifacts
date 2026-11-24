import{readFile,writeFile,mkdir,rm}from'node:fs/promises';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
const root=new URL('../',import.meta.url),writing=process.argv.includes('--write');
const marker='// canonical-thief-before-csi-v1';
async function readOptional(url){try{return await readFile(url,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function syntax(text,path){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(`${path}: invalid JavaScript.\n${r.stderr||r.error}`);}
async function main(){
 const path='gameSetup.js',before=await readFile(new URL(path,root),'utf8'),bom=before.startsWith('\uFEFF'),crlf=before.includes('\r\n');let after=before.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 if(!after.includes(marker)){
  const pattern=/return\s*\{\s*thief\s*,\s*mission\s*,\s*crimeCityData\s*,/g,matches=[...after.matchAll(pattern)];
  if(matches.length!==1)throw Error(`gameSetup.js: selectCase return expected 1 match, got ${matches.length}. No game files changed.`);
  if(after.includes('createCaseThiefProfile'))throw Error('gameSetup.js: an unrecognized profile normalization is already installed. No game files changed.');
  after=after.replace(pattern,'return {\n    thief: createCaseThiefProfile(thief),\n    mission,\n    crimeCityData,');
  after=marker+"\nimport { createCaseThiefProfile } from './suspects/CaseThiefProfile.js';\n"+after;
 }else if(!after.includes('thief: createCaseThiefProfile(thief)'))throw Error('gameSetup.js: profile marker is inconsistent. No game files changed.');
 if(crlf)after=after.replace(/\n/g,'\r\n');if(bom)after='\uFEFF'+after;
 const plans=[{path,before,after}];
 for(const name of ['SuspectGenerator.js','CaseThiefProfile.js']){
  const file='suspects/'+name,contents=await readFile(new URL('suspect-generator-files/'+name,import.meta.url),'utf8');
  plans.push({path:file,before:await readOptional(new URL(file,root)),after:contents});
 }
 for(const p of plans)syntax(p.after,p.path);
 const changed=plans.filter(p=>p.before!==p.after);if(!changed.length){console.log('Already installed. No game files changed.');return;}
 console.log(changed.map(p=>`${writing?'Updating':'Would update'}: ${p.path}`).join('\n'));
 if(!writing){console.log('Preview only. Add --write to install.');return;}
 const backup=new URL(`backups/suspect-generator-${Date.now()}/`,root);await mkdir(backup,{recursive:true});
 for(const p of changed)if(p.before!==null){const u=new URL(p.path,backup);await mkdir(new URL('./',u),{recursive:true});await writeFile(u,p.before);}
 await writeFile(new URL('manifest.json',backup),JSON.stringify(changed.map(p=>({path:p.path,created:p.before===null})),null,2));
 for(const p of changed)if(await readOptional(new URL(p.path,root))!==p.before)throw Error(`${p.path} changed during preparation. No game files changed.`);
 const applied=[];
 try{for(const p of changed){const u=new URL(p.path,root);await mkdir(new URL('./',u),{recursive:true});applied.push(p);await writeFile(u,p.after);}}
 catch(error){for(const p of applied.reverse()){try{const u=new URL(p.path,root);if(p.before===null)await rm(u,{force:true});else await writeFile(u,p.before);}catch(e){console.error(`Restore ${p.path}: ${e.message}`);}}throw error;}
 console.log(`Installed. Backup: ${fileURLToPath(backup)}`);console.log('Reload the game. This affects newly generated investigations, not saved suspects.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
