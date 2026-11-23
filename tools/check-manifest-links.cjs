#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
let acorn;
try{acorn=require('acorn');}catch{throw Error('Missing acorn from project devDependencies. Run npm install in the project folder, then retry.');}
const SKIP=new Set(['.git','node_modules','assets','tools','scripts','tests','test','manifest-backups','backups','output','dist','build','coverage','supabase']);
const slash=s=>s.split(path.sep).join('/');
function audit(root=process.cwd()){
 root=fs.realpathSync(path.resolve(root));
 const report={mode:'read-only',scannedFiles:0,missingManifestLinks:[],dynamicManifestLinks:[],legacyBundleMentions:[],ambiguousManifestLinks:[],scanErrors:[],skippedSymlinks:[]};
 const inside=p=>{const r=path.relative(root,p);return !r||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
 function existsFile(p){if(!inside(p)||!fs.existsSync(p))return false;return fs.statSync(p).isFile()&&inside(fs.realpathSync(p));}
 function inspect(file){
  report.scannedFiles++;
  const source=fs.readFileSync(path.join(root,file),'utf8'),tokens=[];
  try{for(const t of acorn.tokenizer(source,{ecmaVersion:'latest',sourceType:'module',locations:true,allowHashBang:true}))tokens.push(t);}
  catch(e){report.scanErrors.push({file,line:e.loc?.line||null,message:e.message});return;}
  for(let i=0;i<tokens.length;i++){
   const t=tokens[i],type=t.type.label;
   if(type!=='string'&&type!=='template')continue;
   const value=t.value;if(typeof value!=='string')continue;
   const interpolated=type==='template'&&!(tokens[i-1]?.type.label==='`'&&tokens[i+1]?.type.label==='`');
   if(/^auto:(?:assets$|discovered$|folder:)/.test(value))report.legacyBundleMentions.push({file,line:t.loc.start.line,value,dynamic:interpolated});
   if(!/^(?:(?:\.\.?\/)+|\/)?assets\/manifests\//.test(value))continue;
   const entry={file,line:t.loc.start.line,value};
   if(interpolated||!value.split(/[?#]/)[0].endsWith('.json')||/[\*{}]/.test(value)){
    report.dynamicManifestLinks.push({...entry,reason:'Not a complete static JSON path'});continue;
   }
   let clean;
   try{clean=decodeURIComponent(value.split(/[?#]/)[0]);}catch(e){report.scanErrors.push({...entry,message:e.message});continue;}
   const after=source.slice(t.end,t.end+160);
   const importMetaBase=type==='string'&&/^\s*,\s*import\.meta\.url\s*\)/.test(after);
   const modulePath=path.resolve(root,path.dirname(file),clean);
   const sitePath=path.resolve(root,clean.replace(/^\//,''));
   let candidates,base;
   if(clean.startsWith('/')){candidates=[sitePath];base='site-root';}
   else if(importMetaBase){candidates=[modulePath];base='import.meta.url';}
   else if(clean.startsWith('assets/')){candidates=[sitePath];base='site-root-assumed';}
   else{candidates=[...new Set([sitePath,modulePath])];base='unknown-relative-base';}
   const details={...entry,base,candidates:candidates.map(p=>inside(p)?slash(path.relative(root,p)):'OUTSIDE_PROJECT')};
   if(!candidates.some(existsFile))report.missingManifestLinks.push(details);
   else if(base==='unknown-relative-base')report.ambiguousManifestLinks.push(details);
  }
 }
 function walk(dir=''){
  const abs=dir?path.join(root,dir):root;
  for(const e of fs.readdirSync(abs,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const file=dir?dir+'/'+e.name:e.name;
   if(e.name.startsWith('.')||SKIP.has(e.name))continue;
   if(e.isSymbolicLink()){report.skippedSymlinks.push(file);continue;}
   if(e.isDirectory())walk(file);
   else if(e.isFile()&&/\.(?:js|mjs|cjs)$/.test(e.name)&&!/(?:^|\.)(?:test|spec)\.[^.]+$/.test(e.name))inspect(file);
  }
 }
 walk();
 report.summary={missing:report.missingManifestLinks.length,scanErrors:report.scanErrors.length,dynamic:report.dynamicManifestLinks.length,ambiguous:report.ambiguousManifestLinks.length,legacyMentions:report.legacyBundleMentions.length};
 report.limitations=['Scans JS/MJS/CJS literal strings and template chunks, not runtime execution.','Skips assets, dev tools, scripts, tests, backups, build output and supabase.','Computed paths, HTML/JSON references and bundle IDs assembled from variables may be missed.','Literal bundle mentions do not prove a bundle is loaded, and no mention does not prove it is unused.','No network requests; checks local file existence, not MIME types or server routing.'];
 return report;
}
module.exports={audit};
if(require.main===module){try{
 const args=process.argv.slice(2);let root=process.cwd();
 if(args.length){if(args.length!==2||args[0]!=='--root')throw Error('Usage: node tools/check-manifest-links.cjs [--root PROJECT]');root=args[1];}
 const r=audit(root),target=path.join(path.resolve(root),'manifest-link-report.json');
 if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('Report destination is a symlink; refusing overwrite.');
 fs.writeFileSync(target,JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({scannedFiles:r.scannedFiles,...r.summary,report:'manifest-link-report.json'},null,2));
 for(const e of [...r.missingManifestLinks,...r.scanErrors])console.error(JSON.stringify(e));
 if(r.summary.missing||r.summary.scanErrors)process.exitCode=1;
}catch(e){console.error('[manifest-links] '+e.message);process.exitCode=2;}}
