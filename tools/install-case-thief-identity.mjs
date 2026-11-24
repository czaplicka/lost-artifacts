import{readFile,writeFile,mkdir,rm}from'node:fs/promises';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
const root=new URL('../',import.meta.url),writing=process.argv.includes('--write'),marker='// case-thief-identity-v1';
async function optional(url){try{return await readFile(url,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function syntax(source,path){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});if(r.status!==0)throw Error(`${path}: invalid JavaScript.\n${r.stderr||r.error}`);}
async function main(){
 const path='systems/courtLogic.js',before=await readFile(new URL(path,root),'utf8'),bom=before.startsWith('\uFEFF'),crlf=before.includes('\r\n');let after=before.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 if(!after.includes(marker)){
  const pattern=/const actualSuspectId\s*=[\s\S]*?;(?=\s*if\s*\(actualSuspectId == null\))/g,matches=[...after.matchAll(pattern)];
  if(matches.length!==1)throw Error(`courtLogic.js: expected one culprit fallback block, got ${matches.length}. No game files changed.`);
  after=after.replace(pattern,'const actualSuspectId = getCaseThiefSuspectId(state);');
  after=marker+"\nimport { getCaseThiefSuspectId } from '../suspects/suspectHelpers.js';\n"+after;
 }else if(!after.includes('const actualSuspectId = getCaseThiefSuspectId(state);'))throw Error('courtLogic.js: inconsistent installation marker. No game files changed.');
 if(crlf)after=after.replace(/\n/g,'\r\n');if(bom)after='\uFEFF'+after;
 const plans=[{path,before,after}];
 for(const name of ['suspectHelpers.js','CaseThiefIdentity.js']){const path='suspects/'+name;plans.push({path,before:await optional(new URL(path,root)),after:await readFile(new URL('case-thief-files/'+name,import.meta.url),'utf8')});}
 for(const p of plans)syntax(p.after,p.path);
 const changed=plans.filter(p=>p.before!==p.after);if(!changed.length){console.log('Already installed. No game files changed.');return;}
 console.log(changed.map(p=>`${writing?'Updating':'Would update'}: ${p.path}`).join('\n'));if(!writing){console.log('Preview only. Add --write to install.');return;}
 const backup=new URL(`backups/case-thief-identity-${Date.now()}/`,root);await mkdir(backup,{recursive:true});
 for(const p of changed)if(p.before!==null){const u=new URL(p.path,backup);await mkdir(new URL('./',u),{recursive:true});await writeFile(u,p.before);}
 await writeFile(new URL('manifest.json',backup),JSON.stringify(changed.map(p=>({path:p.path,created:p.before===null})),null,2));
 for(const p of changed)if(await optional(new URL(p.path,root))!==p.before)throw Error(`${p.path} changed during preparation. No game files changed.`);
 const applied=[];try{for(const p of changed){const u=new URL(p.path,root);await mkdir(new URL('./',u),{recursive:true});applied.push(p);await writeFile(u,p.after);}}
 catch(error){for(const p of applied.reverse()){try{const u=new URL(p.path,root);if(p.before===null)await rm(u,{force:true});else await writeFile(u,p.before);}catch(e){console.error(`Restore ${p.path}: ${e.message}`);}}throw error;}
 console.log(`Installed. Backup: ${fileURLToPath(backup)}`);console.log('Reload the game. The installer does not edit saved gameplay data.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
