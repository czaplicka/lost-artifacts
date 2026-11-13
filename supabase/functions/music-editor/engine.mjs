export function check(value,message){if(!value)throw Error(message);}
const J=v=>JSON.stringify(v,null,2)+'\n',MAX_AUDIO=8*1024*1024;
const text=(v,n=5000)=>{check(typeof v==='string'&&v.length<=n,'Nieprawidłowy lub zbyt długi tekst.');return v.trim();};
const validId=v=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{1,63}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v.toLowerCase());
export async function json(read,path,fallback){const value=await read(path);check(value!==null||fallback!==undefined,'Brak pliku: '+path);return value===null?structuredClone(fallback):JSON.parse(value);}
function frame(bytes,p){
 if(p<0||p+4>bytes.length||bytes[p]!==255||(bytes[p+1]&224)!==224)return null;
 const version=(bytes[p+1]>>3)&3,layer=(bytes[p+1]>>1)&3,bitrateIndex=(bytes[p+2]>>4)&15,rateIndex=(bytes[p+2]>>2)&3,padding=(bytes[p+2]>>1)&1;
 if(version===1||layer!==1||bitrateIndex===0||bitrateIndex===15||rateIndex===3)return null;
 const rates=[44100,48000,32000],bitrates=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
 const rate=rates[rateIndex]/(version===3?1:version===2?2:4),length=Math.floor((version===3?144:72)*bitrates[bitrateIndex]*1000/rate)+padding;
 if(length<4||p+length>bytes.length)return null;return {version,rate,length};
}
async function inspect(base64){
 check(typeof base64==='string'&&base64.length<=Math.ceil(MAX_AUDIO/3)*4&&/^[A-Za-z0-9+/]+={0,2}$/.test(base64)&&base64.length%4===0,'Nieprawidłowy MP3 lub limit 8 MB.');
 let bytes;try{bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}catch{throw Error('Nieprawidłowe kodowanie pliku.');}
 check(bytes.length>=512&&bytes.length<=MAX_AUDIO,'Plik musi mieć od 512 bajtów do 8 MB.');
 let start=0;
 if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){check(bytes.length>=10&&bytes[3]>=2&&bytes[3]<=4&&[6,7,8,9].every(i=>(bytes[i]&128)===0),'Nieprawidłowy nagłówek ID3.');const size=bytes[6]*2097152+bytes[7]*16384+bytes[8]*128+bytes[9];start=10+size+(bytes[3]===4&&(bytes[5]&16)?10:0);check(start<bytes.length-8,'Plik zawiera metadane, ale nie ma dźwięku.');}
 let found=false;
 for(let p=start;p<Math.min(bytes.length-8,start+4096);p++){const a=frame(bytes,p);if(!a)continue;const b=frame(bytes,p+a.length);if(b&&b.version===a.version&&b.rate===a.rate){found=true;break;}}
 check(found,'Nie znaleziono poprawnych kolejnych ramek MPEG Layer III. Wybierz prawdziwy plik MP3, nie plik z podmienionym rozszerzeniem.');
 const digest=await crypto.subtle.digest('SHA-256',bytes),sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');return {bytes:bytes.length,sha256};
}
export async function normalize(raw,publish=false){
 check(raw&&typeof raw==='object'&&!Array.isArray(raw),'Nieprawidłowy formularz.');
 const f={id:text(raw.id||'',64),originalId:raw.originalId?text(raw.originalId,64):null,title:text(raw.title||'',200),artist:text(raw.artist||'',200),license:text(raw.license||'',1000),source:text(raw.source||'',2000),notes:text(raw.notes||'',5000),originalFilename:text(raw.originalFilename||'',255),audio:null};
 check(validId(f.id),'ID: 2–64 litery, cyfry, _ lub -, początek od litery.');check(!f.originalId||f.originalId===f.id,'Nie zmieniaj ID opublikowanego utworu.');check(f.title,'Wpisz tytuł utworu.');
 if(raw.audio){check(typeof raw.audio==='object'&&!Array.isArray(raw.audio),'Nieprawidłowy plik audio.');if(raw.audio.base64){const info=await inspect(raw.audio.base64);f.audio={base64:raw.audio.base64,...info};}else{check(raw.audio.path===`assets/audio/music/${f.id}.mp3`,'Nieprawidłowa ścieżka utworu.');f.audio={path:raw.audio.path};}}
 if(publish)check(f.audio,'Wybierz plik MP3.');return f;
}
async function source(read){const [tracks,registry]=await Promise.all([json(read,'assets/audio/music/tracks.json'),json(read,'assets/audio/music/music-editor.json',{version:1,tracks:{}})]);check(Array.isArray(tracks)&&tracks.length&&registry.version===1&&registry.tracks&&typeof registry.tracks==='object'&&!Array.isArray(registry.tracks),'Nieobsługiwany katalog muzyki.');const used=new Set();for(const t of tracks){check(t&&typeof t.id==='string'&&/^[A-Za-z0-9_-]+$/.test(t.id)&&typeof t.title==='string'&&t.title.trim(),'Nieprawidłowy istniejący wpis playlisty.');const key=t.id.toLowerCase();check(!used.has(key),'Kolizja ID w playliście: '+t.id);used.add(key);}return {tracks,registry};}
export async function catalog(read){const s=await source(read);return {tracks:s.tracks.map(t=>({id:t.id,title:t.title,managed:Object.hasOwn(s.registry.tracks,t.id),path:`assets/audio/music/${t.id}.mp3`})),maxBytes:MAX_AUDIO};}
export async function load(read,id){const s=await source(read),f=Object.hasOwn(s.registry.tracks,id)?s.registry.tracks[id]:null,matches=s.tracks.filter(t=>t.id===id);check(f&&matches.length===1,'To nie jest utwór zarządzany przez ten formularz.');check(f.title===matches[0].title,'Tytuł w rejestrze i playliście jest niespójny.');return {...f,originalId:id,audio:{path:`assets/audio/music/${id}.mp3`}};}
export async function buildPlan(raw,read,exists){
 const f=await normalize(raw,true),s=await source(read),previous=Object.hasOwn(s.registry.tracks,f.id)?s.registry.tracks[f.id]:null,matches=s.tracks.filter(t=>t.id.toLowerCase()===f.id.toLowerCase()),path=`assets/audio/music/${f.id}.mp3`;
 if(previous){check(f.originalId===f.id,'ID jest zajęte. Otwórz utwór z listy.');check(matches.length===1&&matches[0].id===f.id,'Niespójna tożsamość utworu.');check(!f.audio.base64,'Nie podmieniamy pliku opublikowanego utworu. Dodaj nowy utwór z nowym ID.');check(await exists(path),'Brak MP3 opublikowanego utworu.');}
 else{check(!f.originalId,'Utwór nie istnieje już w rejestrze.');check(!matches.length,'ID jest już używane w playliście.');check(f.audio.base64,'Nowy utwór wymaga pliku MP3.');check(!await exists(path),'Plik o tej nazwie istnieje poza katalogiem. Wybierz inne ID.');}
 const files=[],changes=[];
 async function putJSON(path,value){const content=J(value),old=await read(path);if(old===content)return;files.push({path,content,encoding:'utf-8'});changes.push({path,encoding:'utf-8',before:old,after:content});}
 let info={bytes:previous?.bytes||null,sha256:previous?.sha256||null};
 if(!previous){info={bytes:f.audio.bytes,sha256:f.audio.sha256};files.push({path,content:f.audio.base64,encoding:'base64'});changes.push({path,encoding:'base64',bytes:info.bytes,sha256:info.sha256});}
 if(previous){const index=s.tracks.findIndex(t=>t.id===f.id);s.tracks[index]={...s.tracks[index],title:f.title};}else s.tracks.push({id:f.id,title:f.title});
 s.registry.tracks[f.id]={id:f.id,originalId:f.id,title:f.title,artist:f.artist,license:f.license,source:f.source,notes:f.notes,originalFilename:f.originalFilename,audio:{path},...info};
 await putJSON('assets/audio/music/tracks.json',s.tracks);await putJSON('assets/audio/music/music-editor.json',s.registry);
 return {id:f.id,files,changes,warnings:['Utwór trafia na koniec istniejącej playlisty jukeboxa. Nie zmieniamy kolejności pozostałych utworów.','AudioManager ładuje plik assets/audio/music/'+f.id+'.mp3 bez dodatkowego wpisu w manifestach.','Autor, źródło i licencja są metadanymi w repozytorium; obecny jukebox pokazuje tylko tytuł.','Nie zmieniamy muzyki przypisanej osobno do scen, ambientów ani efektów dźwiękowych.','Nowa lista pojawi się po wdrożeniu na hosting i ponownym uruchomieniu / pełnym odświeżeniu gry.','Opublikowanego pliku MP3 nie podmieniamy pod tym samym ID. W panelu można edytować jego tytuł i metadane.']};
}
