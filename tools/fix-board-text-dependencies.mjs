import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WRITE=process.argv.includes('--write');
const CATALOG='assets/data/dialogue/extracted.json';
const catalog=JSON.parse(await fs.readFile(path.join(ROOT,CATALOG),'utf8'));
const planned=new Map();
const originals=new Map();
function ast(s){return parse(s,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true});}
function walk(n,fn,parents=[]){
 if(!n||typeof n.type!=='string')return;
 if(fn(n,parents)===false)return;
 for(const [k,v] of Object.entries(n)){
  if(['start','end','loc'].includes(k))continue;
  for(const c of Array.isArray(v)?v:[v])if(c&&typeof c.type==='string')walk(c,fn,[...parents,n]);
 }
}
function edits(s,changes){
 changes.sort((a,b)=>a.start-b.start);
 for(let i=1;i<changes.length;i++)if(changes[i].start<changes[i-1].end)throw Error('Overlapping edits');
 for(const c of changes.reverse())s=s.slice(0,c.start)+c.text+s.slice(c.end);
 ast(s);return s;
}
function once(s,old,replacement){
 if(!s.includes(old)){
  if(s.includes(replacement))return s;
  throw Error('Code differs from the checked version: '+old.slice(0,100));
 }
 if(s.indexOf(old)!==s.lastIndexOf(old))throw Error('Ambiguous replacement: '+old.slice(0,80));
 return s.replace(old,()=>replacement);
}
function val(file,id){
 const v=catalog.sources?.[file]?.[id];
 if(typeof v!=='string')throw Error('Missing catalog entry '+file+'/'+id);
 return v;
}
function member(n){return n?.type==='MemberExpression'?(n.computed?n.property.value:n.property.name):null;}
function functionName(n){return n.type==='FunctionDeclaration'?n.id?.name:n.type==='MethodDefinition'?member(n):n.type==='Property'?(n.key.name??n.key.value):null;}
function inside(parents,names){return parents.some(n=>names.has(functionName(n))||(n.type==='MethodDefinition'&&names.has(n.key.name)));}
function restoreCalls(s,file,all=false,functions=new Set()){
 const tree=ast(s),names=new Set(),changes=[];
 for(const n of tree.body)if(n.type==='ImportDeclaration'&&String(n.source.value).endsWith('/DialogueText.js')){
  for(const spec of n.specifiers)if(spec.imported?.name==='dialogueText')names.add(spec.local.name);
 }
 walk(tree,(n,p)=>{
  if(n.type!=='CallExpression'||!names.has(n.callee.name)||n.arguments.length!==2||!n.arguments.every(a=>a.type==='Literal'&&typeof a.value==='string'))return;
  const inURL=p.some(a=>a.type==='NewExpression'&&a.callee.name==='URL');
  if(!all&&!inURL&&!inside(p,functions))return;
  const v=val(n.arguments[0].value,n.arguments[1].value);
  changes.push({start:n.start,end:n.end,text:JSON.stringify(v)});return false;
 });
 return edits(s,changes);
}
function replaceFunction(s,name,text){
 const changes=[];
 walk(ast(s),n=>{if(n.type==='FunctionDeclaration'&&n.id?.name===name){changes.push({start:n.start,end:n.end,text});return false;}});
 if(changes.length!==1)throw Error('Expected one function '+name);
 return edits(s,changes);
}
async function update(file,fn){
 const old=await fs.readFile(path.join(ROOT,file),'utf8');
 const s=fn(old);ast(s);
 originals.set(file,old);if(s!==old)planned.set(file,s);
}

await update('ui/CrimeBoardUI.js',s=>{
 s=restoreCalls(s,'ui/CrimeBoardUI.js',false,new Set(['sceneImagePath','createOverlay']));
 return replaceFunction(s,'recoverPhotosFromBoard',`function recoverPhotosFromBoard(saved) {
  return asArray(saved?.items).filter(item => item && !item.createdByPlayer &&
    (item.tags?.includes('scene-photo') || String(item.id || '').startsWith('scene-photo-')))
    .map(item => ({
      sceneId: item.sceneId || String(item.id).replace(/^scene-photo-/, ''),
      cityId: item.cityId || '',
      displayName: item.label || 'Crime scene',
      imagePath: sceneImagePath(item.image),
      missionId: item.missionId ?? null,
      success: item.sceneSuccess === false || item.tags?.includes('scene-failed') ? false : true
    }));
}`);
});
await update('CrimeBoardInitCore.js',s=>{
 s=restoreCalls(s,'CrimeBoardInitCore.js',false,new Set(['resolveCrimeSceneImage','resolveArtifactImage']));
 s=once(s,"const DEFAULT_OBJECTS_URL='/assets/data/objects.json';","const DEFAULT_OBJECTS_URL=new URL('./assets/data/objects.json',import.meta.url).href;");
 s=once(s,"sceneId:scene.sceneId||null,missionId:scene.missionId||null,tags:","sceneId:scene.sceneId||null,cityId:scene.cityId||null,sceneSuccess:success,missionId:scene.missionId??null,tags:");
 s=once(s,"clueId:`hypothesis-skill-${slugify(entry.skill)}`,tags:","skillId:normalizeSkill(entry.skill),clueId:`hypothesis-skill-${slugify(entry.skill)}`,tags:");
 return s;
});
await update('crimeBoard/BoardData.js',s=>{
 s=s.replaceAll("'/assets/ui/placeholder-suspect.png'","'assets/suspects/unknown.webp'");
 const marker='/* board-data-semantic-fields-v1 */';
 if(s.includes(marker))return s;
 if(s.includes("image: safe.image || '', caption:")) s=once(s,"image: safe.image || '', caption:","image: safe.image || (safe.type === 'photo' ? 'assets/artifacts/artifact_unknown.webp' : ''), caption:");
 s=once(s,"suspectId: idOrNull(safe.suspectId)",`${marker}
      cityId: typeof safe.cityId === 'string' ? safe.cityId : null,
      sceneId: idOrNull(safe.sceneId), missionId: idOrNull(safe.missionId),
      sceneSuccess: typeof safe.sceneSuccess === 'boolean' ? safe.sceneSuccess : null,
      skillId: typeof safe.skillId === 'string' ? safe.skillId : '',
      identityStatus: safe.identityStatus === 'false' ? 'false' : null,
      identityBaseLabel: typeof safe.identityBaseLabel === 'string' ? safe.identityBaseLabel : '',
      suspectId: idOrNull(safe.suspectId)`);
 s=once(s,"({ key: row?.key || '', value: row?.value || '' })","({ id: typeof row?.id === 'string' ? row.id : '', key: row?.key || '', value: row?.value || '' })");
 return s;
});
await update('crimeBoard/BoardWorkspace.js',s=>{
 const start='    if (!String(item.label).includes("[FAKE NAME]")) item.label += __dialogueText("crimeBoard/BoardWorkspace.js", "t_783801ce828143b78c91");';
 s=once(s,start,`    // The marker is data; the displayed label is never used as a condition.
    if (item.identityStatus !== 'false') item.identityBaseLabel = String(item.label || '');
    item.identityStatus = 'false';
    item.label = item.identityBaseLabel + __dialogueText("crimeBoard/BoardWorkspace.js", "t_783801ce828143b78c91");`);
 s=once(s,'row => row.key !== "Identity"',"row => row.id !== 'identity-status'");
 s=once(s,"item.fields.push({ key: 'Identity', value:","item.fields.push({ id: 'identity-status', key: 'Identity', value:");
 return s;
});
await update('crimeBoard/BoardRendering.js',s=>restoreCalls(s,'crimeBoard/BoardRendering.js',true)
 .replaceAll("'/assets/ui/placeholder-clue.png'","'assets/artifacts/artifact_unknown.webp'"));
await update('crimeBoard/BoardLinks.js',s=>restoreCalls(s,'crimeBoard/BoardLinks.js',false,new Set(['buildLinkPath'])));
await update('crimeBoard/CaseTheory.js',s=>restoreCalls(s,'crimeBoard/CaseTheory.js',false,new Set()));
await update('crimeBoard/BoardEvidenceModel.js',s=>{
 const marker='/* board-skill-semantic-match-v1 */';
 if(!s.includes(marker)){
  const changes=[];
  walk(ast(s),n=>{
   if(n.type!=='CallExpression'||member(n.callee)!=='get'||n.callee.object.name!=='accepted')return;
   const original=s.slice(n.start,n.end);
   if(!original.includes('item.label'))return;
   changes.push({start:n.start,end:n.end,text:`accepted.get(skill(item.skillId || '')) || [...accepted.entries()].find(([id]) => {
      const slug = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return item.id === 'hypothesis-skill-' + slug(id) || list(reconstruction.claims).some(c =>
        skill(c?.thiefSkill || '') === id && item.id === 'hypothesis-skill-' + slug(c.thiefSkill));
    })?.[1]`});
  });
  if(changes.length!==1)throw Error('Expected one skill-label matcher');
  s=edits(s,changes);s+='\n'+marker+'\n';
 }
 // Rebuild the identity note instead of searching and replacing translated text.
 const changes=[];
 walk(ast(s),n=>{
  if(n.type!=='AssignmentExpression'||member(n.left)!=='text'||n.left.object.name!=='item')return;
  if(!s.slice(n.right.start,n.right.end).startsWith("String(item.text || '').replace("))return;
  const core='CrimeBoardInitCore.js';
  const pieces=[val(core,'t_5374af364880aa9b8d58'),val(core,'t_5e931c18b8545d5adbf0')];
  const suffix=val(core,'t_a23888d575217f55fc03');
  const prefix=val('crimeBoard/BoardEvidenceModel.js','t_18b4b1fe6487442543c4');
  const ending=val('crimeBoard/BoardEvidenceModel.js','t_41461bc5bdbbbe8b3928');
  changes.push({start:n.right.start,end:n.right.end,text:`[...${JSON.stringify(pieces)}, ${JSON.stringify(prefix)} + name + ${JSON.stringify(ending)}, ${JSON.stringify(suffix)}].join('\\n\\n')`});
 });
 return edits(s,changes);
});

await update('tools/extract-dialogues.mjs',s=>{
 if(s.includes('/* board-technical-context-v1 */'))return s;
 const needle='function unsafeContext(node, parents) {';
 s=once(s,needle,`function unsafeContext(node, parents) {
  /* board-technical-context-v1 */
  if (parents.some(p => p.type === 'NewExpression' && p.callee?.name === 'URL')) return true;
  if (parents.some(p => p.type === 'CallExpression' &&
      ['replace', 'replaceAll', 'fetch', 'loadJson'].includes(member(p.callee) ?? p.callee?.name))) return true;
  // Do not extract catalog fragments from structural HTML/SVG builders.
  if (parents.some(p =>
      (p.type === 'FunctionDeclaration' && ['buildLinkPath', 'getItemMarkup', 'createOverlay'].includes(p.id?.name)) ||
      ((p.type === 'Property' || p.type === 'MethodDefinition') &&
        ['buildLinkPath', 'getItemMarkup', 'createOverlay'].includes(p.key?.name)))) return true;`);
 return s;
});

// Validate the complete plan before any writes. No runtime/catalog modifications.
for(const [file,s] of planned)ast(s);
console.log(JSON.stringify({mode:WRITE?'write':'preview',files:[...planned.keys()]},null,2));
if(!WRITE){console.log('Preview only. Use --write to apply with a backup.');process.exit(0);}
if(!planned.size){console.log('Already fixed.');process.exit(0);}
const backup=path.join(ROOT,'dialogue-json-backups','board-text-'+new Date().toISOString().replace(/[:.]/g,'-'));
await fs.mkdir(backup,{recursive:true});
for(const [file] of planned){
 const dest=path.join(backup,file);await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.writeFile(dest,originals.get(file));
}
const written=[];
try{
 for(const [file,s] of planned){await fs.writeFile(path.join(ROOT,file),s);written.push(file);}
 for(const [file,s] of planned){const actual=await fs.readFile(path.join(ROOT,file),'utf8');if(actual!==s)throw Error('Write mismatch: '+file);ast(actual);}
}catch(error){
 for(const file of written)await fs.writeFile(path.join(ROOT,file),originals.get(file));
 throw error;
}
console.log('Fixed '+planned.size+' files. Backup: '+path.relative(ROOT,backup));
