export function check(value,message){if(!value)throw Error(message);}
const J=v=>JSON.stringify(v,null,2)+'\n';
const enc=new TextEncoder(),dec=new TextDecoder();
const text=(v,max=5000)=>{check(typeof v==='string'&&v.length<=max,'Nieprawidłowy lub zbyt długi tekst.');return v.trim();};
export async function json(read,path,fallback){const value=await read(path);check(value!==null||fallback!==undefined,'Brak pliku: '+path);return value===null?structuredClone(fallback):JSON.parse(value);}
function image(value){
 if(!value)return null;check(typeof value==='object'&&!Array.isArray(value),'Nieprawidłowa grafika.');
 if(value.data){const m=/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(value.data);check(m&&m[1].length<=1398104,'Grafika musi być WebP do 1 MB.');let b;try{b=Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0));}catch{throw Error('Uszkodzona grafika.');}check(b.length>12&&b.length<=1024*1024&&dec.decode(b.slice(0,4))==='RIFF'&&dec.decode(b.slice(8,12))==='WEBP','Nieprawidłowa zawartość WebP.');return {data:value.data};}
 check(typeof value.path==='string'&&/^assets\/[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg)$/.test(value.path)&&!value.path.includes('..'),'Nieprawidłowa ścieżka grafiki.');return {path:value.path};
}
export function normalize(raw,publish=false){
 check(raw&&typeof raw==='object'&&!Array.isArray(raw),'Nieprawidłowy formularz.');
 const f={artifactId:text(raw.artifactId||'',32),cityId:text(raw.cityId||'',48),sceneId:text(raw.sceneId||'',48),originalArtifactId:raw.originalArtifactId?text(raw.originalArtifactId,32):null,name:text(raw.name||'',150),description:text(raw.description||''),significance:text(raw.significance||''),clue:text(raw.clue||''),narrative:text(raw.narrative||'',15000),image:image(raw.image)};
 check(/^[a-z][a-z0-9_]{1,31}$/.test(f.artifactId)&&!['constructor','prototype','__proto__'].includes(f.artifactId),'ID artefaktu: od 2 do 32 małych liter, cyfr lub podkreśleń.');
 check(/^[a-z][a-z0-9_]{1,47}$/.test(f.cityId),'Wybierz miasto.');
 check(!f.sceneId||/^[a-z][a-z0-9_]{1,47}$/.test(f.sceneId),'Nieprawidłowe ID miejsca zbrodni.');
 check(!f.originalArtifactId||f.originalArtifactId===f.artifactId,'Nie zmieniaj ID opublikowanego artefaktu.');check(f.name,'Wpisz nazwę artefaktu.');
 if(publish)check(f.sceneId&&f.description&&f.significance&&f.image,'Wybierz miejsce zbrodni, grafikę oraz uzupełnij opis i znaczenie.');return f;
}
export async function data(read){
 const [locations,missions,registry]=await Promise.all([json(read,'assets/data/locations.json'),json(read,'assets/data/missions.json'),json(read,'assets/data/artifact-editor.json',{version:1,artifacts:{}})]);
 check(Array.isArray(locations)&&Array.isArray(missions)&&registry.version===1&&registry.artifacts&&typeof registry.artifacts==='object','Nieobsługiwane dane gry.');
 const scenes=new Map();
 for(const mission of missions){const city=locations.find(c=>mission.cityId?c.id===mission.cityId:c.city===mission.city);if(!city||city.id==='hq'||city.isCrimeCity!==true||!mission.scene)continue;const key=city.id+'::'+mission.scene;if(!scenes.has(key))scenes.set(key,{cityId:city.id,sceneId:mission.scene,location:mission.location||mission.scene});}
 return {locations,missions,registry,scenes:[...scenes.values()]};
}
export async function catalog(read){const d=await data(read);return {cities:d.locations.filter(c=>c.id!=='hq'&&c.isCrimeCity===true).map(c=>({id:c.id,name:c.city,country:c.country})),scenes:d.scenes,artifacts:Object.values(d.registry.artifacts).map(f=>({id:f.artifactId,name:f.name,cityId:f.cityId,sceneId:f.sceneId})),allArtifacts:d.missions.map(m=>({name:typeof m.artifact==='string'?m.artifact:m.artifact?.name||m.artifact?.label||'',cityId:d.locations.find(c=>m.cityId?c.id===m.cityId:c.city===m.city)?.id,sceneId:m.scene}))};}
export async function load(read,id){const d=await data(read),form=d.registry.artifacts[id];check(form,'Nie znaleziono artefaktu utworzonego w tym panelu.');const mission=d.missions.filter(m=>m.id==='artifact_case_'+id||m.missionId==='artifact_case_'+id);check(mission.length===1,'Nie znaleziono jednoznacznej misji artefaktu.');check(mission[0].scene===form.sceneId&&mission[0].cityId===form.cityId,'Dane artefaktu i misji są niespójne.');return {...form,originalArtifactId:id};}
export async function buildPlan(raw,read){
 const f=normalize(raw,true),d=await data(read),city=d.locations.find(c=>c.id===f.cityId),scene=d.scenes.find(s=>s.cityId===f.cityId&&s.sceneId===f.sceneId);
 check(city&&city.isCrimeCity===true&&scene,'Wybierz istniejące miejsce zbrodni w wybranym mieście.');
 const missionId='artifact_case_'+f.artifactId,artifactKey='artifact_'+f.artifactId,previous=d.registry.artifacts[f.artifactId];
 check(!previous||f.originalArtifactId===f.artifactId,'ID artefaktu jest zajęte. Otwórz go z listy.');check(!f.originalArtifactId||previous,'Artefakt nie istnieje już w rejestrze.');
 const matches=d.missions.map((m,index)=>({m,index})).filter(x=>x.m.id===missionId||x.m.missionId===missionId);
 check(matches.length<=1,'Powtórzone ID misji.');check(!matches.length||previous,'Wygenerowane ID misji jest zajęte.');check(!previous||matches.length===1,'Brak misji opublikowanego artefaktu.');
 check(!d.missions.some(m=>m.artifactKey===artifactKey&&m.id!==missionId&&m.missionId!==missionId),'Klucz grafiki artefaktu jest już używany. Wybierz inne ID.');
 if(previous)check(previous.cityId===f.cityId&&previous.sceneId===f.sceneId,'Nie przenosimy opublikowanego artefaktu do innego miasta lub miejsca zbrodni. Utwórz nowy.');
 const [map,objects]=await Promise.all([json(read,'assets/crimes/'+f.sceneId+'.json'),json(read,'assets/data/objects.json')]);
 const layer=map.layers?.find(l=>l.name==='HiddenObjects'),items=(Array.isArray(objects)?objects:objects.objects||objects.items||[]).filter(o=>(Array.isArray(o.scene)?o.scene:[o.scene]).includes(f.sceneId));
 check(layer&&Array.isArray(layer.objects)&&items.length>=6,'Miejsce zbrodni nie ma gotowej puli hidden objects.');
 const names=new Set(layer.objects.map(o=>o.name));check(items.every(o=>names.has(o.id)),'Scena ma przedmioty bez stref klikania. Najpierw popraw scenę w formularzu crime.');
 const files=new Map(),before=new Map();
 async function put(path,content,encoding='utf-8'){const old=await read(path);before.set(path,old);if(encoding==='utf-8'&&old===content)return;files.set(path,{path,content,encoding});}
 let imagePath=f.image.path;
 if(f.image.data){const base64=f.image.data.split(',')[1],hash=await crypto.subtle.digest('SHA-256',enc.encode(base64)),tag=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);imagePath=`assets/artifacts/editor_${f.artifactId}_${tag}.webp`;await put(imagePath,base64,'base64');}else check(await read(imagePath)!==null,'Nie znaleziono grafiki w repozytorium.');
 const mission={...(matches[0]?.m||{}),id:missionId,missionId,cityId:city.id,city:city.city,country:city.country,scene:f.sceneId,location:scene.location,artifact:f.name,artifactId:artifactKey,artifactKey,description:f.description,significance:f.significance,clue:f.clue,narrative:f.narrative};
 if(matches.length)d.missions[matches[0].index]=mission;else d.missions.push(mission);await put('assets/data/missions.json',J(d.missions));
 const index=await json(read,'assets/manifests/index.json');check(index.version===2&&Array.isArray(index.files)&&index.bundles,'Nieobsługiwany manifest.');const partPath='assets/manifests/artifact-editor.json';let part={assets:[]};const keys=new Map();
 for(const path of index.files){const p=await json(read,path);check(Array.isArray(p.assets),'Nieprawidłowy manifest '+path);if(path===partPath)part=p;for(const a of p.assets){const key=a.type+':'+a.key;check(!keys.has(key),'Powtórzony klucz zasobu '+key);keys.set(key,{...a,part:path});}}
 const existing=keys.get('image:'+artifactKey);check(!existing||existing.part===partPath,'Klucz grafiki należy do innego manifestu. Wybierz inne ID artefaktu.');
 const asset={type:'image',key:artifactKey,url:imagePath,groups:['backgrounds']},assetIndex=part.assets.findIndex(a=>a.type==='image'&&a.key===artifactKey);if(assetIndex>=0)part.assets[assetIndex]=asset;else part.assets.push(asset);
 if(!index.files.includes(partPath))index.files.push(partPath);index.bundles.shared=[...new Set([...(index.bundles.shared||[]),'image:'+artifactKey])];
 await put(partPath,J(part));await put('assets/manifests/index.json',J(index));
 d.registry.artifacts[f.artifactId]={...f,originalArtifactId:f.artifactId,image:{path:imagePath},missionId,artifactKey};await put('assets/data/artifact-editor.json',J(d.registry));
 return {id:f.artifactId,missionId,files:[...files.values()],changes:[...files.values()].map(file=>({path:file.path,encoding:file.encoding,before:file.encoding==='base64'?null:before.get(file.path),after:file.encoding==='base64'?null:file.content})),warnings:['Artefakt korzysta z istniejącej sceny: '+scene.location+' ['+f.sceneId+'].','Nie zmieniamy tła miejsca zbrodni, przedmiotów, stref klikania ani rekonstrukcji.','Publikacja nowego artefaktu dodaje osobny wpis misji. Inne artefakty miasta pozostają bez zmian.','Zgodność stref została sprawdzona, ale ten formularz nie przeprowadza ponownie walidacji rekonstrukcji dla profili złodziei.','Edycja istniejącego artefaktu nie aktualizuje automatycznie metadanych innych paneli ani wcześniej otwartej rozgrywki.','Zmiany są publikowane na GitHubie. Wdrożenie na hosting wymaga osobnego potwierdzenia.']};
}
