import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const writing = process.argv.includes('--write');
const marker = '// identity-namespaces-v1';
function replaceOne(source, pattern, replacement, file, step) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.replace(/g/g,'')+'g'))];
  if (matches.length !== 1) {
    throw Error(`${file}: step "${step}" expected 1 match, got ${matches.length}. No source files changed.\nPlease provide this file if the error persists.`);
  }
  return source.replace(pattern, replacement);
}
function syntax(source,file) {
  const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  if(r.status!==0)throw Error(`${file}: JavaScript syntax check failed.\n${r.stderr||r.error}`);
}
function transform(source,file) {
  if(source.includes(marker)) {
    const expected=file.endsWith('/CaseTheoryModel.js')?'evaluateIdentityAnswer':
      file.endsWith('/CaseTheory.js')?'getCardIdentityId':'identityIdVersion';
    if(!source.includes(expected))throw Error(`${file}: installation marker exists but required code is missing. No source files changed.`);
    return source;
  }
  let next=source;
  const edit=(step,pattern,replacement)=>{next=replaceOne(next,pattern,replacement,file,step);};
  if(file==='crimeBoard/CaseTheoryModel.js') {
    edit('replace mixed identity resolver',/^export\s+function\s+getActualIdentityIds\s*\(\s*state\s*\)\s*\{[\s\S]*?^\}[ \t]*(?:\r?\n|$)/m,
      "export { getActualIdentityIds } from './identityIds.js';\n");
    edit('identity deduction comparison',/const\s+ids\s*=\s*getActualIdentityIds\(\s*state\s*\)\s*;\s*if\s*\(\s*ids\.length\s*\)\s*supported\s*=\s*ids\.includes\(\s*String\(\s*selection\.answerId\s*\)\s*\)\s*;/,
      'supported = evaluateIdentityAnswer(state, selection.answerId);');
    next="import { evaluateIdentityAnswer } from './identityIds.js';\n"+next;
  } else if(file==='crimeBoard/CaseTheory.js') {
    edit('identity options',/\.map\(\s*c\s*=>\s*\[\s*String\(\s*c\.suspectId\s*\)\s*,\s*\[\s*String\(\s*c\.suspectId\s*\)\s*,\s*c\.label\s*\]\s*\]\s*\)/,
      '.map(c => [getCardIdentityId(c), [getCardIdentityId(c), c.label]])');
    edit('identity portrait preview',/String\(\s*card\.suspectId\s*\)\s*===\s*selected\b/,
      'getCardIdentityId(card) === selected');
    next="import { getCardIdentityId } from './identityIds.js';\n"+next;
  } else {
    edit('submission solution IDs',/const\s+ids\s*=\s*strings\(\s*solution\.identityIds\s*\)\s*;/,
      'const ids = solution.identityIdVersion === 1 ? strings(solution.identityIds).filter(isIdentityId) : [];');
    edit('arrested suspect identity',/equivalent\(\s*section\.answerId\s*,\s*submission\.suspectId\s*,\s*ids\s*\)/,
      'equivalent(section.answerId, caseIdentityId(submission.suspectId), ids)');
    edit('identity evidence reference',/equivalent\(\s*card\.suspectId\s*,\s*section\.answerId\s*,\s*ids\s*\)/,
      'equivalent(getCardIdentityId(card), section.answerId, ids)');
    edit('alibi evidence identity',/equivalent\(\s*card\.suspectId\s*,\s*theory\.sections\.identity\.answerId\s*,\s*ids\s*\)/,
      'equivalent(getCardIdentityId(card), theory.sections.identity.answerId, ids)');
    edit('selected identity card label',/same\(\s*card\.suspectId\s*,\s*theory\.sections\.identity\.answerId\s*\)/,
      'same(getCardIdentityId(card), theory.sections.identity.answerId)');
    edit('legacy submission guard',/!submission\.solution\s*\|\|/,
      '!submission.solution ||\n      submission.solution.identityIdVersion !== 1 ||');
    edit('submission identity schema',/solution\s*:\s*\{\s*identityIds\s*,/,
      'solution: {\n      identityIdVersion: 1,\n      identityIds,');
    next="import { caseIdentityId, getCardIdentityId, isIdentityId } from '../crimeBoard/identityIds.js';\n"+next;
  }
  return marker+'\n'+next;
}
async function main() {
  const helper=await readFile(new URL('crimeBoard/identityIds.js',root),'utf8');syntax(helper,'identityIds.js');
  const paths=['crimeBoard/CaseTheoryModel.js','crimeBoard/CaseTheory.js','systems/CaseTheorySubmission.js'];
  const plans=[],errors=[];
  for(const file of paths) {
    try {
      const url=new URL(file,root),before=await readFile(url,'utf8');
      const hadBom=before.startsWith('\uFEFF');
      const newline=before.includes('\r\n')?'\r\n':'\n';
      const lf=before.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
      let after=transform(lf,file);
      if(newline==='\r\n')after=after.replace(/\n/g,'\r\n');
      if(hadBom)after='\uFEFF'+after;
      syntax(after,file);plans.push({file,url,before,after});
    }catch(e){errors.push(e.message);}
  }
  if(errors.length)throw Error(errors.join('\n\n'));
  const changed=plans.filter(p=>p.before!==p.after);
  if(!changed.length){console.log('Identity namespaces already installed. No changes needed.');return;}
  console.log(changed.map(p=>`${writing?'Updating':'Would update'}: ${p.file}`).join('\n'));
  if(!writing){console.log('Preview only. Add --write to apply.');return;}
  const backups=new URL(`backups/identity-namespaces-${Date.now()}/`,root);
  for(const p of changed){const b=new URL(p.file,backups);await mkdir(new URL('./',b),{recursive:true});await writeFile(b,p.before,'utf8');}
  for(const p of changed)if(await readFile(p.url,'utf8')!==p.before)throw Error(`${p.file} changed during preparation. No source files changed.`);
  const applied=[];
  try{for(const p of changed){applied.push(p);await writeFile(p.url,p.after,'utf8');}}
  catch(error){for(const p of applied.reverse()){try{await writeFile(p.url,p.before,'utf8');}catch(e){console.error(`Restore ${p.file} from ${fileURLToPath(backups)}: ${e.message}`);}}throw error;}
  console.log(`Done. Backups: ${fileURLToPath(backups)}`);
  console.log('Re-select Identity in Case Theory. Old submitted theories are not silently migrated.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
