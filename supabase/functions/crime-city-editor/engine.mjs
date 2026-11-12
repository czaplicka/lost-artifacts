const J=v=>JSON.stringify(v,null,2)+'\n';
export const check=(v,m)=>{if(!v)throw Error(m);};
const text=(v,max=5000)=>{check(typeof v==='string'&&v.length<=max,'Nieprawidłowy lub za długi tekst.');return v.trim();};
const ID=/^[a-z][a-z0-9_]{1,47}$/;
const id=(v,label)=>{v=text(v||'',48);check(ID.test(v)&&!['hq','__proto__','constructor','prototype'].includes(v),'Nieprawidłowe '+label);return v;};
const strings=v=>[...new Set((Array.isArray(v)?v:typeof v==='string'?v.split(','):[]).map(x=>text(String(x),100)).filter(Boolean))];
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/^pickpocketing$/,'pickpocket');
const GROUPS={beat_security:'security',disable_system:'security',create_blind_spot:'security',gain_access:'access',identify_target:'target',move_unnoticed:'movement',avoid_attention:'cover',distract_guards:'distraction',reach_target:'vertical_access',overcome_guard:'confrontation',remove_artifact:'removal',hide_theft:'cover_up',escape_route:'escape'};
export async function json(read,path,fallback){const v=await read(path);check(v!==null||fallback!==undefined,'Brak pliku: '+path);return v===null?structuredClone(fallback):JSON.parse(v);}
export function legacyId(m){return 'legacy_'+String(m.scene||'case').replace(/[^a-z0-9_]/g,'_').slice(0,40);}
export function missionId(m){return m.id||m.missionId||legacyId(m);}
export function normalize(raw,publish=false){
 check(raw&&typeof raw==='object'&&!Array.isArray(raw),'Nieprawidłowy formularz.');
 const f={missionId:id(raw.missionId,'ID sprawy'),cityId:id(raw.cityId,'ID miasta'),sceneId:id(raw.sceneId,'ID sceny'),originalMissionId:raw.originalMissionId?id(raw.originalMissionId,'oryginalne ID'):null,mission:{},items:[],sceneImage:raw.sceneImage||null,artifactImage:raw.artifactImage||null};
 check(!f.originalMissionId||f.originalMissionId===f.missionId,'Nie zmieniaj ID zapisanej sprawy.');
 for(const key of ['location','artifact','description','significance','clue','narrative'])f.mission[key]=text(raw.mission?.[key]||'',key==='narrative'?15000:5000);
 check(Array.isArray(raw.items)&&raw.items.length<=150,'Maksymalnie 150 przedmiotów.');const seen=new Set();
 f.items=raw.items.map(o=>{const localId=id(o.id,'ID przedmiotu');check(!seen.has(localId),'Powtórzone ID przedmiotu: '+localId);seen.add(localId);let rect=null;
  if(o.rect){rect={};for(const k of ['x','y','width','height']){check(typeof o.rect[k]==='number'&&Number.isFinite(o.rect[k]),'Nieprawidłowa strefa '+localId);rect[k]=o.rect[k];}check(rect.x>=0&&rect.y>=0&&rect.width>=8&&rect.height>=8&&rect.x+rect.width<=1920&&rect.y+rect.height<=1080,'Strefa poza obrazem: '+localId);}
  check(Array.isArray(o.reconstructionUses||[])&&(o.reconstructionUses||[]).length<=40,'Zbyt wiele zastosowań przedmiotu.');
  const uses=(o.reconstructionUses||[]).map(u=>({questionId:text(u.questionId||'',100),skills:strings(u.skills),heistExplanation:text(u.heistExplanation||'',5000)}));
  if(publish)check(o.item?.trim()&&o.trueExplanation?.trim()&&rect&&uses.length&&uses.every(u=>u.questionId&&u.skills.length&&u.heistExplanation),'Uzupełnij nazwę, opis, strefę i zastosowania: '+localId);
  return {id:localId,item:text(o.item||'',200),trueExplanation:text(o.trueExplanation||''),tags:strings(o.tags),rect,reconstructionUses:uses};
 });
 for(const key of ['sceneImage','artifactImage']){const image=f[key];if(!image)continue;check(typeof image==='object','Nieprawidłowa grafika.');if(image.data){const m=/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(image.data);check(m&&m[1].length<1400000,'Grafika musi być WebP do 1 MB.');let bytes;try{bytes=Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0));}catch{throw Error('Uszkodzona grafika.');}check(bytes.length>12&&bytes.length<=1024*1024&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP','Nieprawidłowa zawartość WebP.');f[key]={data:image.data};}else{check(typeof image.path==='string'&&/^assets\/[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg)$/.test(image.path)&&!image.path.includes('..'),'Nieprawidłowa ścieżka grafiki.');f[key]={path:image.path};}}
 if(publish){check(f.mission.artifact&&f.mission.location&&f.mission.description,'Uzupełnij artefakt, miejsce i opis.');check(f.sceneImage&&f.artifactImage,'Wybierz obie grafiki.');check(f.items.length>=6,'Scena wymaga co najmniej sześciu przedmiotów.');}
 return f;
}
export async function catalog(read){
 const [cities,missions,questions,thieves]=await Promise.all([json(read,'assets/data/locations.json'),json(read,'assets/data/missions.json'),json(read,'assets/data/reconstruction_questions.json'),json(read,'assets/data/suspects.json')]);
 const q=Array.isArray(questions)?questions:questions.reconstructionQuestions||questions.questions||[];
 const list=Array.isArray(thieves)?thieves:thieves.suspects||[];
 const summary=missions.map(m=>{const c=cities.find(c=>m.cityId?c.id===m.cityId:c.city===m.city);return {id:missionId(m),cityId:c?.id||m.cityId,artifact:m.artifact,sceneId:m.scene};});
 const ids=summary.map(m=>m.id);check(new Set(ids).size===ids.length,'Istniejące sprawy mają kolidujące ID. Uzupełnij ich id przed użyciem edytora.');
 return {cities:cities.filter(c=>c.id!=='hq').map(c=>({id:c.id,name:c.city,country:c.country,isCrimeCity:c.isCrimeCity===true})),missions:summary,questions:q,skills:[...new Set(list.flatMap(t=>strings(t.skills)))].sort(),templates:[...new Set(missions.map(m=>m.scene).filter(Boolean))]};
}
export async function loadMission(read,key){
 const missions=await json(read,'assets/data/missions.json'),matches=missions.filter(m=>missionId(m)===key);check(matches.length===1,'Nie znaleziono jednoznacznej sprawy.');const m=matches[0],cities=await json(read,'assets/data/locations.json'),city=cities.find(c=>m.cityId?c.id===m.cityId:c.city===m.city);check(city,'Brak miasta sprawy.');
 const stored=await json(read,'assets/data/crime-editor/'+key+'.json',null);if(stored){check(stored.cityId===city.id&&stored.sceneId===m.scene,'Metadane edytora nie pasują do misji.');return {...stored,originalMissionId:key};}
 const all=await json(read,'assets/data/objects.json'),map=await json(read,'assets/crimes/'+m.scene+'.json'),layer=map.layers?.find(l=>l.name==='HiddenObjects');check(layer,'Brak warstwy HiddenObjects.');
 const sceneItems=(Array.isArray(all)?all:all.objects||all.items||[]).filter(o=>(Array.isArray(o.scene)?o.scene:[o.scene]).includes(m.scene));
 const registry=await manifest(read),asset=registry.assets.get('image:'+m.artifactKey),background=registry.assets.get('image:'+m.scene+'_bg');
 const items=sceneItems.map((o,i)=>{const r=layer.objects.find(r=>r.name===o.id);return {...o,id:'item_'+(i+1),rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null};});
 return {missionId:key,originalMissionId:key,cityId:city.id,sceneId:m.scene,mission:Object.fromEntries(['location','artifact','description','significance','clue','narrative'].map(k=>[k,m[k]||''])),sceneImage:background?{path:background.url}:null,artifactImage:asset?{path:asset.url}:null,items};
}
export async function template(read,sceneId){
 id(sceneId,'ID sceny');const all=await json(read,'assets/data/objects.json'),map=await json(read,'assets/crimes/'+sceneId+'.json'),layer=map.layers?.find(l=>l.name==='HiddenObjects');
 return (Array.isArray(all)?all:all.objects||all.items||[]).filter(o=>(Array.isArray(o.scene)?o.scene:[o.scene]).includes(sceneId)).map((o,i)=>{const r=layer?.objects?.find(r=>r.name===o.id);return {id:'item_'+(i+1),item:o.item,trueExplanation:o.trueExplanation,tags:o.tags||[],reconstructionUses:o.reconstructionUses||[],rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null};});
}
async function manifest(read){const index=await json(read,'assets/manifests/index.json');check(index.version===2&&index.bundles&&Array.isArray(index.files),'Nieobsługiwany manifest.');const parts=new Map(),assets=new Map();for(const path of index.files){const part=await json(read,path);check(Array.isArray(part.assets),'Uszkodzony manifest '+path);parts.set(path,part);for(const a of part.assets){const key=a.type+':'+a.key;check(!assets.has(key),'Powtórzony zasób '+key);assets.set(key,{...a,part:path});}}return {index,parts,assets};}
function canReconstruct(items,questions,skills){
 const qmap=new Map(questions.map(q=>[q.id,{...q,exclusiveGroup:q.exclusiveGroup||GROUPS[q.id]||q.id}]));
 const pools=[...new Set(skills.map(norm))].map(skill=>({skill,candidates:items.flatMap(item=>item.reconstructionUses.filter(use=>qmap.has(use.questionId)&&use.skills.some(s=>norm(s)===skill)).map(use=>({item,question:qmap.get(use.questionId)})))})).sort((a,b)=>a.candidates.length-b.candidates.length);
 let steps=0;const budget=250000;
 function alternatives(claims,used){const pools=claims.map(c=>items.filter(o=>!used.has(o.id)&&o.reconstructionUses.some(u=>u.questionId===c.question.id))).sort((a,b)=>a.length-b.length);function match(i,seen){if(++steps>budget)throw Error('Zbyt złożona pula rekonstrukcji. Ogranicz liczbę zastosowań.');if(i===pools.length)return true;return pools[i].some(o=>!seen.has(o.id)&&match(i+1,new Set([...seen,o.id])));}return match(0,new Set());}
 function search(i,claims,used,groups){if(++steps>budget)throw Error('Zbyt złożona pula rekonstrukcji.');if(claims.length===3)return alternatives(claims,used);if(i>=pools.length||claims.length+pools.length-i<3)return false;for(const c of pools[i].candidates){if(!used.has(c.item.id)&&!groups.has(c.question.exclusiveGroup)&&search(i+1,[...claims,c],new Set([...used,c.item.id]),new Set([...groups,c.question.exclusiveGroup])))return true;}return search(i+1,claims,used,groups);}
 return search(0,[],new Set(),new Set());
}
export async function buildPlan(raw,read){
 const f=normalize(raw,true),[locations,missions,all,meta]=await Promise.all([json(read,'assets/data/locations.json'),json(read,'assets/data/missions.json'),json(read,'assets/data/objects.json'),manifest(read)]);
 check(Array.isArray(all),'objects.json musi być tablicą.');const city=locations.find(c=>c.id===f.cityId);check(city&&city.id!=='hq','Wybierz istniejące miasto.');
 const matches=missions.map((m,i)=>({m,i})).filter(x=>missionId(x.m)===f.missionId);check(matches.length<=1,'Powtórzone ID sprawy.');const previous=matches[0];check(!previous||f.originalMissionId===f.missionId,'ID jest zajęte. Otwórz istniejącą sprawę.');check(!f.originalMissionId||previous,'Opublikowana sprawa już nie istnieje.');
 if(previous){const pc=locations.find(c=>previous.m.cityId?c.id===previous.m.cityId:c.city===previous.m.city);check(pc?.id===f.cityId,'Nie przenosimy opublikowanej sprawy do innego miasta.');check(previous.m.scene===f.sceneId,'Nie zmieniaj ID opublikowanej sceny.');}
 check(!missions.some(m=>missionId(m)!==f.missionId&&m.scene===f.sceneId),'Ta scena należy do innej sprawy. Wybierz unikalne ID sceny.');
 const changes=new Map(),before=new Map();async function put(path,content,encoding='utf-8'){const old=await read(path);before.set(path,old);if(encoding==='utf-8'&&old===content)return;changes.set(path,{path,content,encoding});}
 const saved=await json(read,'assets/data/crime-editor/'+f.missionId+'.json',null);
 const assetKey='artifact_crime_'+f.missionId;
 async function image(input,kind){if(input.data){const base64=input.data.split(',')[1],digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(base64)),hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,16),path=`assets/crimes/editor_${f.missionId}_${kind}_${hash}.webp`;await put(path,base64,'base64');return path;}check(await read(input.path)!==null,'Brak grafiki w repozytorium: '+input.path);return input.path;}
 const scenePath=await image(f.sceneImage,'scene'),artifactPath=await image(f.artifactImage,'artifact');
 const oldSceneItems=all.filter(o=>(Array.isArray(o.scene)?o.scene:[o.scene]).includes(f.sceneId));
 const oldLocal=new Map((saved?.items||[]).map(o=>[o.id,o.globalId]));
 const items=f.items.map((o,i)=>({...o,globalId:oldLocal.get(o.id)|| (previous&&!saved?oldSceneItems[i]?.id:null)||'crime_'+f.missionId+'__'+o.id}));
 check(new Set(items.map(o=>o.globalId)).size===items.length,'Powtórzone globalne ID przedmiotu.');
 if(saved)check(saved.items.every(o=>items.some(n=>n.id===o.id)),'Nie usuwaj opublikowanych przedmiotów. Utwórz nową sprawę, jeśli wymaga nowej puli.');
 const prepared=items.map(o=>({id:o.globalId,item:o.item,tags:o.tags,scene:[f.sceneId],skills:[...new Set(o.reconstructionUses.flatMap(u=>u.skills))],trueExplanation:o.trueExplanation,heistExplanation:o.reconstructionUses[0]?.heistExplanation||'',reconstructionUses:o.reconstructionUses}));
 const questionsRaw=await json(read,'assets/data/reconstruction_questions.json'),questions=Array.isArray(questionsRaw)?questionsRaw:questionsRaw.reconstructionQuestions||questionsRaw.questions||[];
 const valid=new Set(questions.map(q=>q.id));for(const o of prepared)for(const u of o.reconstructionUses)check(valid.has(u.questionId),'Nieznane pytanie: '+u.questionId);
 const thievesRaw=await json(read,'assets/data/suspects.json'),thieves=Array.isArray(thievesRaw)?thievesRaw:thievesRaw.suspects||[];check(thieves.length,'Brak profili złodziei.');const coverage=[];
 for(const thief of thieves){check(canReconstruct(prepared,questions,strings(thief.skills)),'Brak trzech różnych rozwiązań i trzech alternatyw dla: '+(thief.name||thief.id));coverage.push(thief.id);}
 const newIds=new Set(prepared.map(o=>o.id));for(const old of all)if(newIds.has(old.id))check((Array.isArray(old.scene)?old.scene:[old.scene]).includes(f.sceneId),'ID przedmiotu zajęte w innej scenie: '+old.id);
 const remaining=all.flatMap(o=>{const scenes=Array.isArray(o.scene)?o.scene:[o.scene];if(!scenes.includes(f.sceneId))return [o];const rest=scenes.filter(s=>s!==f.sceneId);if(rest.length){check(!newIds.has(o.id),'Przedmiot jest współdzielony z inną sceną. Skopiuj sprawę jako nową zamiast edytować starą.');return [{...o,scene:rest}];}return [];});
 await put('assets/data/objects.json',J([...remaining,...prepared]));await put('assets/data/objects/'+f.sceneId+'.json',J(prepared));await put('assets/data/objects-source/'+f.sceneId+'.json',J(prepared));
 const map={compressionlevel:-1,height:1,infinite:false,layers:[{data:[1],height:1,id:1,name:'Background',opacity:1,type:'tilelayer',visible:true,width:1,x:0,y:0},{draworder:'topdown',id:2,name:'HiddenObjects',objects:items.map((o,i)=>({id:i+1,name:o.globalId,type:'',rotation:0,visible:true,...o.rect})),opacity:1,type:'objectgroup',visible:true,x:0,y:0}],nextlayerid:3,nextobjectid:items.length+1,orientation:'orthogonal',renderorder:'right-down',tiledversion:'1.10.2',tileheight:1080,tilewidth:1920,tilesets:[{columns:1,firstgid:1,image:scenePath.split('/').pop(),imageheight:1080,imagewidth:1920,margin:0,name:f.sceneId,spacing:0,tilecount:1,tileheight:1080,tilewidth:1920}],type:'map',version:'1.10',width:1};
 await put('assets/crimes/'+f.sceneId+'.json',J(map));
 const mission={...(previous?.m||{}),...f.mission,id:f.missionId,missionId:f.missionId,cityId:city.id,city:city.city,country:city.country,scene:f.sceneId,artifactKey:assetKey};if(previous)missions[previous.i]=mission;else missions.push(mission);await put('assets/data/missions.json',J(missions));
 if(!city.crimeCity){city.crimeCity={backgroundKey:city.backgroundKey||city.id,crimeScene:{},crimeLab:{},hotel:{},shop:{},apartment:{},suspectBoard:{},suspectSlots:[]};}city.isCrimeCity=true;await put('assets/data/locations.json',J(locations));
 const partPath='assets/manifests/crime-city-editor.json',part=meta.parts.get(partPath)||{assets:[]};
 function asset(type,key,url,group){const full=type+':'+key,existing=meta.assets.get(full);check(!existing||existing.part===partPath||existing.url===url,'Klucz grafiki należy do innego manifestu: '+key);if(existing&&existing.part!==partPath)return full;const entry={type,key,url,groups:[group]},i=part.assets.findIndex(a=>a.type===type&&a.key===key);if(i>=0)part.assets[i]=entry;else part.assets.push(entry);return full;}
 const refs=[asset('image',f.sceneId+'_bg',scenePath,'backgrounds'),asset('json','objects-data:'+f.sceneId,'assets/data/objects/'+f.sceneId+'.json','json')];const artifactRef=asset('image',assetKey,artifactPath,'backgrounds');
 if(!meta.index.files.includes(partPath))meta.index.files.push(partPath);meta.index.bundles['city:'+city.id]=[...new Set([...(meta.index.bundles['city:'+city.id]||[]),...refs])];meta.index.bundles.shared=[...new Set([...(meta.index.bundles.shared||[]),artifactRef])];await put(partPath,J(part));await put('assets/manifests/index.json',J(meta.index));
 const stored={...f,originalMissionId:f.missionId,sceneImage:{path:scenePath},artifactImage:{path:artifactPath},items};await put('assets/data/crime-editor/'+f.missionId+'.json',J(stored));
 return {id:f.missionId,files:[...changes.values()],coverage,changes:[...changes.values()].map(file=>({path:file.path,encoding:file.encoding,before:file.encoding==='base64'?null:before.get(file.path),after:file.encoding==='base64'?null:file.content})),warnings:['Publikujesz jedną sprawę. Pozostałe artefakty miasta pozostają bez zmian.','Miasto zachowuje transport, panoramę, tipy oraz zestawy NPC i lokalizacji.','Tło miasta crime jest współdzielone. Ten formularz nie podmienia panoramy miasta.','CSI, alibi i podejrzani korzystają z istniejących mechanizmów gry.','Zmiana opublikowanej sceny może wpłynąć na stare zapisy korzystające z jej ID. Dla innej wersji sprawy użyj „Dodaj nową sprawę”.','Publikacja na GitHubie nie potwierdza wdrożenia na hosting.']};
}
