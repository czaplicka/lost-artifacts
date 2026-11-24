import { readFile,writeFile,mkdir,rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url),writing=process.argv.includes('--write');
const marker='// compact-suspect-save-v1';
async function optional(url){try{return await readFile(url,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function replaceOne(source,pattern,replacement,file,step){const all=[...source.matchAll(new RegExp(pattern.source,pattern.flags.replace(/g/g,'')+'g'))];if(all.length!==1)throw Error(`${file}: ${step}: expected 1 match, got ${all.length}. No game files changed.`);return source.replace(pattern,replacement);}
function syntax(source,file){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});if(r.status!==0)throw Error(`${file}: syntax check failed.\n${r.stderr||r.error}`);}
async function main(){
 const names=['suspects/SuspectCaseState.js','gameState/GameStateManager.js','gameState/importExport.js'];
 const plans=[];
 for(const path of names){
  const before=await readFile(new URL(path,root),'utf8'),crlf=before.includes('\r\n'),bom=before.startsWith('\uFEFF');let source=before.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if(path.endsWith('/SuspectCaseState.js')){
   const pattern=/^  console\.table\([\s\S]*?^  \);[ \t]*\n?/gm;
   const matches=[...source.matchAll(pattern)];
   if(matches.length>1||(!matches.length&&source.includes('console.table(')))throw Error(`${path}: unrecognized diagnostic table. No game files changed.`);
   if(matches.length===1)source=source.replace(pattern,'');
  }else if(!source.includes(marker)){
   if(path.endsWith('/GameStateManager.js')){
    source=replaceOne(source,/^  _exportData\(\)\s*\{[\s\S]*?(?=^  updateState\()/m,"  _exportData({ compactSuspects = false } = {}) {\n    const exported = {};\n    for (const [key, value] of Object.entries(this.state)) {\n      if (MANAGED_PRIVATE_KEYS.has(key) || BLOCKED_KEYS.has(key) ||\n          RUNTIME_KEYS.has(key) || MANAGER_KEYS.has(key)) continue;\n      if (compactSuspects && (key === 'caseSuspects' || SUSPECT_SAVE_ALIASES.has(key))) continue;\n      const cloned = cloneGameData(value);\n      if (cloned !== undefined) exported[key] = cloned;\n    }\n    if (compactSuspects) exported.caseSuspects = serializeCaseSuspects(this.state);\n    return exported;\n  }\n\n",path,'compact export method');
    source=replaceOne(source,/this\.saveCheckpoint\s*=\s*this\._exportData\(\)\s*;/,'this.saveCheckpoint = this._exportData({ compactSuspects: true });',path,'checkpoint export');
    source=replaceOne(source,/\.\.\.this\._exportData\(\)(?=\s*,\s*_version\s*:)/,'...this._exportData({ compactSuspects: true })',path,'save export');
    source="import { SUSPECT_SAVE_ALIASES, serializeCaseSuspects } from './suspectSaveFormat.js';\n"+source;
   }else{
    source=replaceOne(source,/normalizeCaseSuspects\(state\);(?=\s*state\.caseDirector\s*=)/,'normalizeCaseSuspects(state);\n  restoreCaseSuspectProfiles(state);',path,'restore profile references after alias normalization');
    source="import { restoreCaseSuspectProfiles } from './suspectSaveFormat.js';\n"+source;
   }
   source=marker+'\n'+source;
  }else{
   const valid=path.endsWith('/GameStateManager.js')?source.includes('serializeCaseSuspects(this.state)')&&source.includes('compactSuspects: true'):source.includes('restoreCaseSuspectProfiles(state);');
   if(!valid)throw Error(`${path}: compact-save marker is inconsistent. No game files changed.`);
  }
  if(crlf)source=source.replace(/\n/g,'\r\n');if(bom)source='\uFEFF'+source;syntax(source,path);plans.push({path,before,after:source});
 }
 const imports=plans.find(p=>p.path==='gameState/importExport.js').after;
 if(!imports.includes('normalizeCaseSuspects(state)'))throw Error('The import normalizer is not recognized. No game files changed.');
 const helperPath='gameState/suspectSaveFormat.js',helper=await readFile(new URL('suspect-save-files/suspectSaveFormat.js',import.meta.url),'utf8'),previousHelper=await optional(new URL(helperPath,root));
 if(previousHelper!==null&&!previousHelper.includes(marker))throw Error('suspectSaveFormat.js exists but is not recognized. No game files changed.');
 syntax(helper,helperPath);plans.push({path:helperPath,before:previousHelper,after:helper});
 const changes=plans.filter(p=>p.before!==p.after);if(!changes.length){console.log('Already installed. No game files changed.');return;}
 console.log(changes.map(p=>`${writing?'Updating':'Would update'}: ${p.path}`).join('\n'));
 if(!writing){console.log('Preview only. Use --write to install.');return;}
 const backup=new URL(`backups/compact-suspects-${Date.now()}/`,root);await mkdir(backup,{recursive:true});
 for(const p of changes)if(p.before!==null){const u=new URL(p.path,backup);await mkdir(new URL('./',u),{recursive:true});await writeFile(u,p.before);}
 await writeFile(new URL('manifest.json',backup),JSON.stringify(changes.map(p=>({path:p.path,created:p.before===null})),null,2));
 for(const p of changes)if(await optional(new URL(p.path,root))!==p.before)throw Error(`${p.path} changed during preparation. No game files changed.`);
 const applied=[];
 try{for(const p of changes){const u=new URL(p.path,root);await mkdir(new URL('./',u),{recursive:true});applied.push(p);await writeFile(u,p.after);}}
 catch(error){for(const p of applied.reverse()){try{const u=new URL(p.path,root);if(p.before===null)await rm(u,{force:true});else await writeFile(u,p.before);}catch(e){console.error(`Restore ${p.path} from backup: ${e.message}`);}}throw error;}
 console.log(`Installed. Backup: ${fileURLToPath(backup)}`);console.log('Reload the game. Existing saves are not edited by this installer; the next save uses the compact format.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
