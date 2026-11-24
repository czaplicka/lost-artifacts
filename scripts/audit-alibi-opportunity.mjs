import {readFile,writeFile,mkdir} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
const root=process.cwd();
const source=await readFile(path.join(root,'systems/OpportunityRules.js'),'utf8');
const context=vm.createContext({console}),module=new vm.SourceTextModule(source,{context});
await module.link(()=>{throw Error('OpportunityRules is expected to have no runtime imports.');});await module.evaluate();
const input=process.argv[2];
if(!input)throw Error('Usage: node --experimental-vm-modules scripts/audit-alibi-opportunity.mjs path/to/exported-save.json');
const raw=JSON.parse(await readFile(input,'utf8'));
// Saves can be direct or wrapped. Top-level values take precedence as in the importer.
const state=raw.state&&typeof raw.state==='object'?{...raw.state,...Object.fromEntries(Object.entries(raw).filter(([k])=>k!=='state'))}:raw;
const report=module.namespace.auditOpportunityState(state);
report.limitations=['Reads recorded claims and existing opportunity rules only.','Does not validate world evidence collection, the generator or every possible scene/thief pair.','Supported answer does not guarantee that a suitable discovered card was attached to the theory.'];
await mkdir(path.join(root,'reports'),{recursive:true});
await writeFile(path.join(root,'reports/alibi-opportunity-current-save.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.warnings.length)process.exitCode=2;
