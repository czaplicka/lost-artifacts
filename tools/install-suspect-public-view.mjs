import{readFile,writeFile,mkdir,rm}from'node:fs/promises';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
const root=new URL('../',import.meta.url),writing=process.argv.includes('--write'),marker='// scoped-lab-public-view-v1';
async function optional(url){try{return await readFile(url,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function syntax(value,path){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:value,encoding:'utf8'});if(r.status!==0)throw Error(`${path}: invalid JavaScript.\n${r.stderr||r.error}`);}
function replaceOne(value,regex,replacement,path){const matches=[...value.matchAll(regex)];if(matches.length!==1)throw Error(`${path}: expected 1 matching completion block, got ${matches.length}. No game files changed.`);return value.replace(regex,replacement);}
async function main(){
 const plans=[];
 for(const path of ['scenes/crimeCity/CrimeCityProgressService.js','suspectsBoard/SuspectDetails.mixin.js']){
  const before=await readFile(new URL(path,root),'utf8'),bom=before.startsWith('\uFEFF'),crlf=before.includes('\r\n');let after=before.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if(!after.includes(marker)){
   if(path.startsWith('scenes/')){
    after=replaceOne(after,/^  isCrimeLabCompleted\(\)\s*\{[\s\S]*?(?=^  isGridCompleted\()/gm,"  isCrimeLabCompleted() {\n    return isCaseCrimeLabCompleted(gameState, this.getLabCaseKey(), this.scene?.cityId);\n  }\n\n",path);
    after="import { isCaseCrimeLabCompleted } from '../CSI/LabCompletionState.js';\n"+after;
   }else{
    after=replaceOne(after,/^    const labCompletedForCase\s*=[^\n]*;[ \t]*$/gm,'    const labCompletedForCase = isCaseCrimeLabCompleted(state, caseKey, this.cityId);',path);
    after="import { isCaseCrimeLabCompleted } from '../scenes/CSI/LabCompletionState.js';\n"+after;
   }
   after=marker+'\n'+after;
  }else if(!after.includes('isCaseCrimeLabCompleted('))throw Error(`${path}: inconsistent installation marker. No game files changed.`);
  if(crlf)after=after.replace(/\n/g,'\r\n');if(bom)after='\uFEFF'+after;plans.push({path,before,after});
 }
 for(const path of ['ui/suspectUtils.js','ui/SuspectDisclosure.js','scenes/CSI/LabCompletionState.js']){
  plans.push({path,before:await optional(new URL(path,root)),after:await readFile(new URL('suspect-public-files/'+path,import.meta.url),'utf8')});
 }
 for(const p of plans)syntax(p.after,p.path);
 const changes=plans.filter(p=>p.before!==p.after);if(!changes.length){console.log('Already installed. No game files changed.');return;}
 console.log(changes.map(p=>`${writing?'Updating':'Would update'}: ${p.path}`).join('\n'));if(!writing){console.log('Preview only. Add --write to install.');return;}
 const backup=new URL(`backups/suspect-public-view-${Date.now()}/`,root);await mkdir(backup,{recursive:true});
 for(const p of changes)if(p.before!==null){const url=new URL(p.path,backup);await mkdir(new URL('./',url),{recursive:true});await writeFile(url,p.before);}
 await writeFile(new URL('manifest.json',backup),JSON.stringify(changes.map(p=>({path:p.path,created:p.before===null})),null,2));
 for(const p of changes)if(await optional(new URL(p.path,root))!==p.before)throw Error(`${p.path} changed during preparation. No game files changed.`);
 const applied=[];try{for(const p of changes){const url=new URL(p.path,root);await mkdir(new URL('./',url),{recursive:true});applied.push(p);await writeFile(url,p.after);}}
 catch(error){for(const p of applied.reverse()){try{const url=new URL(p.path,root);if(p.before===null)await rm(url,{force:true});else await writeFile(url,p.before);}catch(e){console.error(`Restore ${p.path}: ${e.message}`);}}throw error;}
 console.log(`Installed. Backup: ${fileURLToPath(backup)}`);console.log('Reload the game. Existing untyped notes are retained in raw saves, not automatically made public.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
