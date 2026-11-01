#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const SRC=new Set(['.js','.mjs','.cjs','.json','.css','.html','.htm','.ts','.tsx','.jsx']);
const EXT={'.png':'image','.jpg':'image','.jpeg':'image','.webp':'image','.gif':'image','.svg':'image','.avif':'image','.ico':'image','.mp3':'audio','.ogg':'audio','.wav':'audio','.m4a':'audio','.aac':'audio','.flac':'audio','.mp4':'video','.webm':'video','.ogv':'video','.json':'json','.geojson':'json','.css':'css','.html':'html','.htm':'html','.ttf':'font','.woff':'font','.woff2':'font','.otf':'font','.js':'module','.mjs':'module'};
const EXCLUDE=new Set(['.git','node_modules','vendor','tools','test','tests','__tests__','docs','documentation','build','dist','coverage','output','manifest-backups','asset-audit-reports','asset-usage-reports']);
const LABEL={GAME_CALL:'Wywołanie obrazu / audio / wideo',DATA_READ:'Odczyt danych z cache',PATH_REFERENCE:'Odwołanie przez ścieżkę',CONFIG_KEY:'Klucz tekstury lub zasobu w konfiguracji',DYNAMIC_REVIEW:'Precyzyjny wzorzec dynamiczny — sprawdź',LOAD_ONLY:'Tylko deklaracja ładowania',LOOKUP_ONLY:'Tylko sprawdzenie dostępności',MENTION_ONLY:'Tylko wzmianka / identyfikator',NO_REFERENCE:'Brak wykrytego odwołania'};
const PROPERTY={textureKey:'image',portraitKey:'image',imageKey:'image',spriteKey:'image',backgroundKey:'image',wallpaperKey:'image',wantedKey:'image',suspectImageKey:'image',audioKey:'audio',soundKey:'audio',videoKey:'video',jsonKey:'json',tilemapKey:'tilemap'};
const slash=s=>s.split(path.sep).join('/');
const uniq=a=>[...new Set(a)];
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function lex(text){
 const t=[];let i=0,line=1;
 const add=(kind,value,start,l)=>t.push({kind,value,start,line:l});
 while(i<text.length){
  let c=text[i];if(c==='\n'){line++;i++;continue;}if(/\s/.test(c)){i++;continue;}
  if(c==='/'&&text[i+1]==='/'){while(i<text.length&&text[i]!=='\n')i++;continue;}
  if(c==='/'&&text[i+1]==='*'){i+=2;while(i<text.length&&!(text[i]==='*'&&text[i+1]==='/')){if(text[i]==='\n')line++;i++;}i+=2;continue;}
  if(c==='/'&&(!t.length||['=','(',',','[',':','!','return','=>'].includes(t.at(-1).value))){
   i++;let bracket=false;
   while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i]==='[')bracket=true;if(text[i]===']')bracket=false;if(text[i]==='/'&&!bracket){i++;while(/[a-z]/i.test(text[i]||''))i++;break;}if(text[i]==='\n'){line++;break;}i++;}
   continue;
  }
  if(c==='"'||c==="'"||c==='`'){
   const q=c,start=i,l=line;let v='';i++;
   while(i<text.length&&text[i]!==q){
    if(text[i]==='\\'&&i+1<text.length){const n=text[i+1];v+=n==='n'?'\n':n==='t'?'\t':n==='r'?'\r':n;i+=2;continue;}
    if(text[i]==='\n')line++;v+=text[i++];
   }i++;add(q==='`'&&v.includes('${')?'template':'string',v,start,l);continue;
  }
  if(/[A-Za-z_$]/.test(c)){const start=i,l=line;while(i<text.length&&/[\w$]/.test(text[i]))i++;add('word',text.slice(start,i),start,l);continue;}
  add('punct',c,i,line);i++;
 }
 return t;
}
function api(name){
 const leaf=name.split('.').at(-1);
 const m=/(?:^|\.)(?:load|loader)\.(image|spritesheet|atlas|audio|video|json|tilemapTiledJSON|css|html|bitmapFont)$/.exec(name);
 if(m){const type={spritesheet:'image',atlas:'image',tilemapTiledJSON:'tilemap',bitmapFont:'image'}[m[1]]||m[1];return [{arg:0,type,kind:'LOAD_ONLY'},{arg:1,type,path:true,kind:'LOAD_ONLY'},...(m[1]==='atlas'||m[1]==='bitmapFont'?[{arg:2,type:'json',path:true,kind:'LOAD_ONLY'}]:[])];}
 if(/(?:^|\.)(?:add|make)\.(image|sprite|tileSprite)$/.test(name))return [{arg:name.includes('.make.')?0:2,type:'image',kind:'GAME_CALL',object:name.includes('.make.')}];
 if(/(?:^|\.)(?:add|make)\.video$/.test(name))return [{arg:name.includes('.make.')?0:2,type:'video',kind:'GAME_CALL',object:name.includes('.make.')}];
 if(leaf==='setTexture')return [{arg:0,type:'image',kind:'GAME_CALL'}];
 if(leaf==='playVideo')return [{arg:0,type:'video',kind:'GAME_CALL'},{arg:1,type:'audio',kind:'GAME_CALL'}];
 if(['playSound','playAudio','playMusic','playBGM','playSfx'].includes(leaf)||/(?:^|\.)sound\.(play|add|stopByKey)$/.test(name))return [{arg:0,type:'audio',kind:'GAME_CALL'}];
 if(/(?:^|\.)textures\.(exists|get|has|checkKey)$/.test(name))return [{arg:0,type:'image',kind:'LOOKUP_ONLY'}];
 const cache=/(?:^|\.)cache\.(json|audio|video|html|css|tilemap)\.(get|has|exists)$/.exec(name);
 if(cache)return [{arg:0,type:cache[1],kind:cache[2]==='get'?'DATA_READ':'LOOKUP_ONLY'}];
 if(leaf==='fetch')return [{arg:0,path:true,kind:'PATH_REFERENCE'}];
 return null;
}
function scanUsage({root=path.resolve(__dirname,'..'),asset=null}={}){
 root=fs.realpathSync(root);const warnings=[],skipped=[],unresolvedCalls=[],rejectedDynamic=[],sources=[];
 const rows=[],byFile=new Map(),byId=new Map(),byKey=new Map();
 const inside=p=>{const r=path.relative(root,p);return r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
 function full(f){const p=path.resolve(root,f);if(!inside(p))throw Error('Path outside project: '+f);return p;}
 function safe(f){const p=full(f);if(!inside(fs.realpathSync(p))||fs.lstatSync(p).isSymbolicLink())throw Error('Unsafe symlink: '+f);return p;}
 function walk(dir,fn){if(!fs.existsSync(full(dir)))return;for(const e of fs.readdirSync(safe(dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const f=dir?dir+'/'+e.name:e.name;
  if(e.isSymbolicLink()){skipped.push({file:f,reason:'symlink'});continue;}
  if(e.name.startsWith('.')||EXCLUDE.has(e.name)||/^pi-office-manifest-backup-/.test(e.name)||f==='assets/manifests')continue;
  if(e.isDirectory())walk(f,fn);else if(e.isFile()&&!/\.(test|spec)\.[^.]+$|\.bak$|\.map$/i.test(e.name))fn(f);
 }}
 walk('assets',file=>{const r={file,bytes:fs.statSync(safe(file)).size,types:[],ids:[],keys:[],manifestFiles:[],indexed:false,bundles:[],startup:[],evidence:[],evidenceCount:0,dynamicEvidence:[],kinds:new Set(),seen:new Set()};rows.push(r);byFile.set(file,r);});
 function resolve(raw,source=''){
  if(typeof raw!=='string'||!raw||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw))return null;
  let clean;try{clean=decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\\/g,'/');}catch{return null;}
  const direct=clean.replace(/^\/+|^\.\//g,'');
  const candidates=clean.startsWith('/')||direct.startsWith('assets/')?[direct]:[path.posix.normalize(path.posix.join(path.posix.dirname(source||'.'),clean))];
  for(const f of candidates){try{full(f);if(byFile.has(f))return f;}catch{}}
  return null;
 }
 const read=f=>JSON.parse(fs.readFileSync(safe(f),'utf8').replace(/^\uFEFF/,''));
 let index={files:[],bundles:{},startup:{}};try{index=read('assets/manifests/index.json');}catch(e){warnings.push('Manifest index unavailable: '+e.message);}
 const listed=new Set((Array.isArray(index.files)?index.files:[]).map(f=>String(f).replace(/^\.\//,'')));
 if(fs.existsSync(full('assets/manifests')))for(const e of fs.readdirSync(safe('assets/manifests'),{withFileTypes:true})){
  if(!e.isFile()||e.isSymbolicLink()||!e.name.endsWith('.json')||e.name==='index.json')continue;
  const file='assets/manifests/'+e.name;let data;try{data=read(file);}catch{warnings.push('Invalid manifest: '+file);continue;}
  if(!Array.isArray(data?.assets))continue;
  for(const entry of data.assets){
   if(typeof entry?.key!=='string'||typeof entry.type!=='string')continue;
   const id=entry.type+':'+entry.key;
   for(const url of Array.isArray(entry.url)?entry.url:[entry.url]){
    const f=resolve(url);const row=byFile.get(f);
    if(!row){if(typeof url==='string'&&!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url))warnings.push('Manifest URL missing/excluded: '+url);continue;}
    row.ids.push(id);row.types.push(entry.type);row.keys.push(entry.key);row.manifestFiles.push(file);row.indexed ||= listed.has(file);
    if(!byId.has(id))byId.set(id,new Set());byId.get(id).add(row);
    if(!byKey.has(entry.key))byKey.set(entry.key,new Set());byKey.get(entry.key).add(row);
    if(listed.has(file)){
     for(const [bundle,refs]of Object.entries(index.bundles||{}))if(Array.isArray(refs)&&refs.includes(id))row.bundles.push(bundle);
     for(const [group,refs]of Object.entries(index.startup||{}))if(Array.isArray(refs)&&refs.includes(id))row.startup.push(group);
    }
   }
  }
 }
 for(const row of rows){row.types=uniq(row.types);if(!row.types.length)row.types=[EXT[path.posix.extname(row.file).toLowerCase()]||'other'];}
 function add(row,file,t,kind,value,lines,detail=''){
  if(row.file===file)return;
  row.kinds.add(kind);const mark=[file,t.line,kind,value].join('|');if(row.seen.has(mark))return;row.seen.add(mark);row.evidenceCount++;
  if(row.evidence.length<60)row.evidence.push({file,line:t.line,kind,value,detail,context:(lines[t.line-1]||'').trim().slice(0,240)});
 }
 function target(type,value){return [...(byId.get(type+':'+value)||[])];}
 const dynamic=[];
 walk('',file=>{
  const ext=path.posix.extname(file).toLowerCase();
  if(!SRC.has(ext)||/^asset-usage\.(html|json|csv)$/.test(path.posix.basename(file))||/(?:^|\/)(?:package(?:-lock)?|tsconfig|jsconfig)\.json$/.test(file))return;
  if(fs.statSync(safe(file)).size>8*1024*1024){skipped.push({file,reason:'source over 8 MiB'});return;}
  if(['.ts','.tsx','.jsx'].includes(ext))warnings.push('Heuristic syntax scan (not a TS/JSX parser): '+file);
  sources.push(file);const text=fs.readFileSync(safe(file),'utf8'),lines=text.split(/\r?\n/);
  if(['.css','.html','.htm'].includes(ext)){
   const cleaned=text.replace(ext==='.css'?/\/\*[\s\S]*?\*\//g:/<!--[\s\S]*?-->/g,m=>m.replace(/[^\n]/g,' '));
   const patterns=ext==='.css'?[/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,/@import\s+(['"])(.*?)\1/g]:[/(?:src|href|poster|data-src)\s*=\s*(['"])(.*?)\1/g];
   for(const regex of patterns){let m;while((m=regex.exec(cleaned))){const row=byFile.get(resolve(m[2],file));if(row)add(row,file,{line:cleaned.slice(0,m.index).split('\n').length},'PATH_REFERENCE',m[2],lines,'CSS/HTML');}}
   return;
  }
  const ts=lex(text),pairs=new Map(),stack=[];
  for(let i=0;i<ts.length;i++){if(ts[i].kind!=='punct')continue;const v=ts[i].value;if(['(','[','{'].includes(v))stack.push(i);else if([')',']','}'].includes(v)){const begin=stack.pop();if(begin!==undefined)pairs.set(begin,i);}}
  const constants=new Map(),count=new Map();
  let braceDepth=0;
  for(let i=0;i<ts.length-3;i++){
   if(ts[i].kind==='punct'&&ts[i].value==='{')braceDepth++;
   if(ts[i].kind==='punct'&&ts[i].value==='}')braceDepth=Math.max(0,braceDepth-1);
   if(ts[i].value==='const'&&ts[i+1].kind==='word'&&ts[i+2].value==='='){
   const name=ts[i+1].value;count.set(name,(count.get(name)||0)+1);
   if(braceDepth===0&&ts[i+3].kind==='string'&&[';',','].includes(ts[i+4]?.value))constants.set(name,ts[i+3].value);
  }}
  for(const [name,n]of count)if(n>1)constants.delete(name);
  function value(tokens){
   if(tokens.length===1){const t=tokens[0];if(t.kind==='string')return {literal:t.value};if(t.kind==='word'&&constants.has(t.value))return {literal:constants.get(t.value),constant:true};if(t.kind==='template')return {pieces:t.value.split(/\$\{[^}]*\}/g)};}
   if(tokens.length>=3&&tokens.some(t=>t.value==='+'&&t.kind==='punct')){
    let pieces=[''],literal=true;
    for(let i=0;i<tokens.length;i++){
     const t=tokens[i];if(t.kind==='punct'&&t.value==='+')continue;
     if(t.kind==='string')pieces[pieces.length-1]+=t.value;
     else if(t.kind==='word'&&constants.has(t.value))pieces[pieces.length-1]+=constants.get(t.value);
     else {literal=false;if(pieces[pieces.length-1]!==''||pieces.length===1)pieces.push('');}
    }
    return literal?{literal:pieces.join('')}:{pieces};
   }
   return {};
  }
  const handled=new Set();
  function use(tokens,rule,call){
   if(!tokens.length)return;
   if(rule.object){
    const at=tokens.findIndex((t,i)=>['key','texture'].includes(t.value)&&tokens[i+1]?.value===':');
    if(at>=0){use(tokens.slice(at+2,at+3),{...rule,object:false},call);return;}
   }
   const result=value(tokens),t=tokens[0];tokens.forEach(x=>handled.add(x));
   if(result.literal!==undefined){
    const rows=rule.path?[byFile.get(resolve(result.literal,file))].filter(Boolean):target(rule.type,result.literal);
    for(const row of rows)add(row,file,t,rule.kind,result.literal,lines,call+(result.constant?' (const)':''));
    return;
   }
   if(result.pieces){
    // A pattern must start or end with >=3 alphanumeric characters, and occur in a typed API argument.
    const edge=[result.pieces[0]||'',result.pieces.at(-1)||''];
    if(!edge.some(v=>(v.match(/[A-Za-z0-9]/g)||[]).length>=3)){
     rejectedDynamic.push({file,line:t.line,call,reason:'generic pattern; no meaningful fixed prefix/suffix'});
    }else dynamic.push({file,line:t.line,type:rule.type||null,path:!!rule.path,pieces:result.pieces,call});
   }
   unresolvedCalls.push({file,line:t.line,call,type:rule.type||null,kind:rule.kind,expression:tokens.map(t=>t.value).join(' ').slice(0,180)});
  }
  if(ext!=='.json')for(let i=0;i<ts.length;i++){
   if(ts[i].kind!=='punct'||ts[i].value!=='('||!pairs.has(i))continue;
   let begin=i-1;while(begin>=0&&(ts[begin].kind==='word'||['.','?'].includes(ts[begin].value)))begin--;
   const call=ts.slice(begin+1,i).map(t=>t.value).join('').replace(/\?/g,'');const rules=api(call);if(!rules)continue;
   const end=pairs.get(i),args=[];let from=i+1;
   for(let j=i+1;j<end;j++){
    if(ts[j].kind==='punct'&&['(','[','{'].includes(ts[j].value)&&pairs.has(j)){j=pairs.get(j);continue;}
    if(ts[j].kind==='punct'&&ts[j].value===','){args.push(ts.slice(from,j));from=j+1;}
   }args.push(ts.slice(from,end));
   for(const rule of rules)if(args[rule.arg])use(args[rule.arg],rule,call);
  }
  for(let i=0;i<ts.length;i++){
   const t=ts[i];if(t.kind!=='string'||handled.has(t)||ts[i+1]?.value===':')continue;
   const row=byFile.get(resolve(t.value,file));
   if(row)add(row,file,t,'PATH_REFERENCE',t.value,lines,'literal path/import');
   const previous=ts[i-1],property=[':', '='].includes(previous?.value)?ts[i-2]?.value:null;
   const type=PROPERTY[property];
   if(type){for(const candidate of target(type,t.value))add(candidate,file,t,'CONFIG_KEY',t.value,lines,property);}
   else for(const candidate of byKey.get(t.value)||[])add(candidate,file,t,'MENTION_ONLY',t.value,lines,'untyped string/id, not proof of asset use');
  }
 });
 for(const row of rows){
  for(const item of dynamic){
   const regex=new RegExp('^'+item.pieces.map(escRe).join('[\\s\\S]*')+'$');
   const matches=item.path?regex.test(row.file):row.ids.some(id=>id.startsWith(item.type+':')&&regex.test(id.slice(item.type.length+1)));
   if(matches){row.kinds.add('DYNAMIC_REVIEW');if(row.dynamicEvidence.length<25)row.dynamicEvidence.push(item);}
  }
  row.status=['GAME_CALL','DATA_READ','PATH_REFERENCE','CONFIG_KEY','DYNAMIC_REVIEW','LOAD_ONLY','LOOKUP_ONLY','MENTION_ONLY'].find(k=>row.kinds.has(k))||'NO_REFERENCE';
  row.label=LABEL[row.status];row.ids=uniq(row.ids);row.keys=uniq(row.keys);row.manifestFiles=uniq(row.manifestFiles);row.bundles=uniq(row.bundles);row.startup=uniq(row.startup);
  row.onlyAutoBundles=row.bundles.length>0&&row.bundles.every(b=>b.startsWith('auto:'))&&!row.startup.length;
  row.staticCallEvidence=row.kinds.has('GAME_CALL');delete row.kinds;delete row.seen;
 }
 const selected=asset?rows.filter(row=>row.file===asset||row.keys.includes(asset)||row.ids.includes(asset)):rows;
 if(asset&&!selected.length)throw Error('Asset not found: '+asset);
 const counts={};for(const row of selected)counts[row.status]=(counts[row.status]||0)+1;
 return {version:2,generatedAt:new Date().toISOString(),root,assetFilter:asset,summary:{assets:selected.length,sources:sources.length,unregistered:selected.filter(r=>!r.indexed).length,statuses:counts},assets:selected,
  warnings:uniq(warnings),skipped,unresolvedCalls,rejectedDynamic,dynamicPatterns:dynamic,
  limitations:['Static heuristic, not proof of runtime execution or reachable scenes.','Types are separated for recognized APIs and configuration fields. Untyped strings are mentions only.','Only fixed-prefix/suffix dynamic patterns in recognized API arguments count; arbitrary IDs do not.','Constant resolution is deliberately limited to unambiguous file-level literal declarations; no full scope or data-flow analysis.','Complex JS templates, aliases, custom wrappers, TS/JSX and HTML inline scripts can still require manual review.','No asset is automatically safe to delete. No assets, manifests or game code are changed.']};
}
function writeReports(report,directory){
 fs.mkdirSync(directory,{recursive:true});
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const lines=[['file','status','types','ids','indexed','bundles','reference_count','references','dynamic'].map(csv).join(',')];
 for(const r of report.assets)lines.push([r.file,r.status,r.types.join('|'),r.ids.join('|'),r.indexed,r.bundles.join('|'),r.evidenceCount,r.evidence.map(e=>`${e.file}:${e.line} [${e.kind}] ${e.context}`).join('\n'),r.dynamicEvidence.map(e=>`${e.file}:${e.line} ${e.call}`).join('\n')].map(csv).join(','));
 fs.writeFileSync(path.join(directory,'asset-usage.csv'),'\uFEFF'+lines.join('\r\n')+'\r\n');
 fs.writeFileSync(path.join(directory,'asset-usage.json'),JSON.stringify(report,null,2)+'\n');
 const rows=report.assets.map(r=>`<tr data-status="${r.status}" data-indexed="${r.indexed}"><td>${esc(r.file)}<br><small>${esc(r.ids.join(', '))}</small></td><td>${esc(r.label)}</td><td>${r.indexed?'TAK':'NIE'}</td><td><details><summary>${r.evidenceCount} odwołań; ${r.dynamicEvidence.length} wzorców</summary>${r.evidence.map(e=>`<p><b>${esc(e.file)}:${e.line}</b> [${esc(e.kind)}] ${esc(e.detail)}<br><code>${esc(e.context)}</code></p>`).join('')}${r.dynamicEvidence.map(e=>`<p>${esc(e.file)}:${e.line} — ${esc(e.call)}<br><code>${esc(e.pieces.join('${variable}'))}</code></p>`).join('')}</details></td><td>${esc(r.bundles.join(', '))}${r.onlyAutoBundles?'<p>Tylko zestawy automatyczne.</p>':''}</td></tr>`).join('');
 const html=`<!doctype html><html lang="pl"><meta charset="utf-8"><title>Asset usage v2</title><style>body{font:15px system-ui;margin:24px;background:#f4f1e8;color:#20242a}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #ccc;padding:9px;text-align:left;vertical-align:top}td:first-child{max-width:320px;overflow-wrap:anywhere}code{white-space:pre-wrap;overflow-wrap:anywhere}input,select{padding:10px;margin:6px}.warning{background:#fff0bb;padding:14px}small{color:#555}</style><h1>Raport użycia assetów — v2</h1><p>Assety: ${report.summary.assets}; źródła: ${report.summary.sources}; bez manifestu w indeksie: ${report.summary.unregistered}.</p><p class="warning">To analiza statyczna, nie śledzenie uruchomionej gry. Manifest nie jest dowodem użycia. Identyfikator produktu nie jest dowodem wyświetlenia grafiki. „Brak odwołania” nie upoważnia do automatycznego kasowania.</p><input id="search" placeholder="Ścieżka, klucz lub miejsce użycia"><select id="status"><option value="">Wszystkie statusy</option>${Object.entries(LABEL).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select><label><input id="unregistered" type="checkbox">Tylko bez rejestracji</label><p id="count"></p><table><thead><tr><th>Plik / typ:klucz</th><th>Status</th><th>Manifest w indeksie</th><th>Dowody</th><th>Zestawy</th></tr></thead><tbody>${rows}</tbody></table><h2>Nierozwiązane argumenty wywołań</h2><pre>${esc(report.unresolvedCalls.map(e=>`${e.file}:${e.line} ${e.call} [${e.type||'path'}] ${e.expression}`).join('\n'))}</pre><h2>Odrzucone zbyt ogólne wzorce dynamiczne</h2><pre>${esc(report.rejectedDynamic.map(e=>`${e.file}:${e.line} ${e.call}: ${e.reason}`).join('\n'))}</pre><h2>Ostrzeżenia / pominięcia</h2><pre>${esc(report.warnings.concat(report.skipped.map(e=>e.file+': '+e.reason)).join('\n'))}</pre><h2>Ograniczenia</h2><ul>${report.limitations.map(l=>'<li>'+esc(l)+'</li>').join('')}</ul><script>const rows=[...document.querySelectorAll('tbody tr')],s=document.getElementById('search'),t=document.getElementById('status'),u=document.getElementById('unregistered');function filter(){let n=0;for(const r of rows){const yes=(!t.value||r.dataset.status===t.value)&&(!u.checked||r.dataset.indexed==='false')&&r.textContent.toLowerCase().includes(s.value.toLowerCase());r.hidden=!yes;if(yes)n++;}document.getElementById('count').textContent='Widoczne: '+n;}s.oninput=t.onchange=u.onchange=filter;filter();</script></html>`;
 fs.writeFileSync(path.join(directory,'asset-usage.html'),html);
}
function main(){const options={},args=process.argv.slice(2);let output=null;
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(['--root','--asset','--out'].includes(flag)){if(!args[i+1])throw Error('Missing value: '+flag);const value=args[++i];if(flag==='--out')output=value;else options[flag.slice(2)]=value;}
  else if(flag==='--help'){console.log('node tools/asset-usage.cjs [--asset KEY_OR_TYPE:KEY_OR_PATH] [--root PROJECT] [--out REPORT_FOLDER]');return;}
  else throw Error('Unknown argument: '+flag);
 }
 const report=scanUsage(options),directory=output?path.resolve(output):path.join(report.root,'asset-usage-reports','latest');
 const relative=slash(path.relative(report.root,directory));if(relative==='assets'||relative.startsWith('assets/'))throw Error('Reports must not be placed inside assets.');
 writeReports(report,directory);console.log(JSON.stringify(report.summary,null,2));console.log('HTML: '+path.join(directory,'asset-usage.html'));console.log('Read-only scan: no assets, source or manifest edits.');
}
module.exports={scanUsage,writeReports};if(require.main===module){try{main();}catch(error){console.error('[asset-usage v2] '+error.message);process.exitCode=2;}}
