import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalize, buildPlan } from './engine.mjs';
const OWNER='czaplicka',REPO='lost-artifacts';
const enc=new TextEncoder(),dec=new TextDecoder();
function check(value,message){if(!value)throw Error(message);}
const URL=Deno.env.get('SUPABASE_URL')||'',SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ORIGIN=Deno.env.get('CITY_EDITOR_ORIGIN')||'https://markagency.silentshields.pl';
function response(status,data){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'}});}
const db=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
async function github(){
 const token=Deno.env.get('CITY_EDITOR_GITHUB_TOKEN');check(token,'Brak sekretu CITY_EDITOR_GITHUB_TOKEN.');const prefix=`https://api.github.com/repos/${OWNER}/${REPO}`;
 async function call(path,method='GET',body=null,optional=false){const r=await fetch(prefix+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(optional&&r.status===404)return null;check(r.ok,'GitHub HTTP '+r.status+' — sprawdź uprawnienia tokenu, blokadę brancha lub ponów odczyt.');return await r.json();}
 const repo=await call(''),branch=Deno.env.get('CITY_EDITOR_BRANCH')||repo.default_branch;check(/^[A-Za-z0-9_./-]+$/.test(branch),'Nieprawidłowa gałąź.');const refPath='heads/'+branch,ref=await call('/git/ref/'+refPath),head=ref.object.sha,cache=new Map();
 async function read(p){if(cache.has(p))return cache.get(p);const file=await call('/contents/'+p.split('/').map(encodeURIComponent).join('/')+'?ref='+head,'GET',null,true);if(!file){cache.set(p,null);return null;}check(file.type==='file','Oczekiwano pliku '+p);let b64=file.content;if(file.encoding!=='base64'){const blob=await call('/git/blobs/'+file.sha);check(blob.encoding==='base64','Nieobsługiwany plik '+p);b64=blob.content;}const text=dec.decode(Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0)));cache.set(p,text);return text;}
 return {call,branch,head,refPath,read};
}
async function authenticate(req){const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');check(jwt,'Zaloguj się.');const {data,error}=await db.auth.getUser(jwt);check(!error&&data.user?.id,'Sesja wygasła. Zaloguj się ponownie.');const {data:admin,error:roleError}=await db.from('city_editor_admins').select('user_id').eq('user_id',data.user.id).eq('enabled',true).maybeSingle();check(!roleError&&admin,'Brak dostępu administratora.');check(data.user.email_confirmed_at,'Najpierw potwierdź adres e-mail konta.');return data.user;}
const parse=async(gh,path,fallback)=>{const text=await gh.read(path);if(text===null){check(fallback!==undefined,'Brak pliku '+path);return structuredClone(fallback);}return JSON.parse(text);};
async function loadCity(gh,id){
 const loc=await parse(gh,'assets/data/locations.json'),city=loc.find(c=>c.id===id);check(city&&!city.isCrimeCity&&city.id!=='hq','Tylko miasta ucieczki.');
 const newspapers={};for(const type of ['daily','time']){const p=await gh.read(`assets/data/newspapers/${type}/${id}.json`);newspapers[type]={edit:false,doc:p?JSON.parse(p):(type==='daily'?{title:city.city+' Field Gazette',articles:[]}:{title:'TIME',covers:[]})};}
 const [facts,atlas,manifest,meta]=await Promise.all([parse(gh,'assets/data/countryFacts.json'),parse(gh,'assets/data/atlas.json'),parse(gh,'assets/manifests/index.json'),parse(gh,'assets/data/city-editor-online.json',{version:1,cities:{}})]);
 const country=atlas.find(c=>c.cities?.some(v=>v.id===id))||atlas.find(c=>c.name===city.country),entry=country?.cities?.find(c=>c.id===id);
 let imagePath='';for(const p of manifest.files){const d=await parse(gh,p),asset=d.assets.find(a=>a.type==='image'&&a.key===(city.backgroundKey||id));if(asset){imagePath=asset.url;break;}}
 return {id,originalId:id,name:city.city,country:city.country,iso3:country?.iso3||'',region:city.travelRegion||'',airportCode:city.airportCode||'',theme:({south_asian:'south_asia',hindu:'south_asia'})[city.npcTheme]||city.npcTheme||'white',locationTheme:city.locationTheme||'',locationBackgrounds:city.locationBackgrounds||{},description:entry?.description||'',knownFor:entry?.knownFor||'',quip:meta.cities?.[id]?.quip||'',capital:country?.capital||'',capitalLon:country?.capitalCoordinates?.[0]??'',capitalLat:country?.capitalCoordinates?.[1]??'',lon:city.coordinates?.[0]??'',lat:city.coordinates?.[1]??'',mapX:city.map?.x??'',mapY:city.map?.y??'',harbor:!!city.harbor,busStation:!!city.busStation,trainStation:!!city.trainStation,npcs:[...new Set((city.encounterPool||[]).map(x=>x.npcId))],facts:facts[id]||{},image:imagePath?{path:imagePath}:null,newspapers};
}
Deno.serve(async req=>{
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return response(403,{error:'Niedozwolone pochodzenie.'});if(req.method==='OPTIONS')return response(200,{ok:true});if(req.method!=='POST')return response(405,{error:'Użyj POST.'});
 try{
  const user=await authenticate(req),text=await req.text();check(enc.encode(text).length<=5800000,'Formularz jest zbyt duży.');const input=JSON.parse(text),action=input.action;
  if(action==='access')return response(200,{ok:true,editorVersion:2});
  if(action==='listDrafts'){const {data,error}=await db.from('city_editor_drafts').select('id,version,updated_at').order('updated_at',{ascending:false});check(!error,'Nie można odczytać szkiców.');return response(200,{drafts:data});}
  if(action==='loadDraft'){check(/^[a-z][a-z0-9_]{1,47}$/.test(input.id),'Nieprawidłowe ID.');const {data,error}=await db.from('city_editor_drafts').select('*').eq('id',input.id).single();check(!error&&data,'Nie znaleziono szkicu.');return response(200,{draft:data});}
  if(action==='saveDraft'){
   const form=normalize(input.form,false),version=Number(input.version||0);check(Number.isSafeInteger(version)&&version>=0,'Nieprawidłowa wersja szkicu.');
   const values={content:form,base_head:input.baseHead||null,updated_by:user.id,updated_at:new Date().toISOString(),version:version+1};let result;
   if(version===0)result=await db.from('city_editor_drafts').insert({id:form.id,...values,created_by:user.id}).select('version').single();else result=await db.from('city_editor_drafts').update(values).eq('id',form.id).eq('version',version).select('version').maybeSingle();
   check(!result.error&&result.data,'Szkic został zmieniony przez drugą osobę albo ID jest zajęte. Otwórz aktualną wersję.');return response(200,{ok:true,version:result.data.version});
  }
  if(action==='catalog'){const gh=await github(),[locations,facts,atlas]=await Promise.all(['assets/data/locations.json','assets/data/countryFacts.json','assets/data/atlas.json'].map(p=>parse(gh,p)));return response(200,{head:gh.head,branch:gh.branch,locations,facts,atlas});}
  if(action==='loadCity'){check(/^[a-z][a-z0-9_]{1,47}$/.test(input.id),'Nieprawidłowe ID.');const gh=await github();return response(200,{head:gh.head,form:await loadCity(gh,input.id)});}
  if(action==='preview'){
   const gh=await github();check(input.baseHead===gh.head,'Repozytorium zmieniło się od otwarcia formularza. Zachowaj szkic i odśwież dane.');const plan=await buildPlan(input.form,gh.read);check(plan.files.length,'Brak zmian do opublikowania.');
   const {changes,...payload}=plan;
   const {data,error}=await db.from('city_editor_previews').insert({user_id:user.id,head:gh.head,branch:gh.branch,payload,expires_at:new Date(Date.now()+600000).toISOString()}).select('id').single();check(!error&&data,'Nie można zapisać podglądu.');return response(200,{previewId:data.id,files:plan.files.map(f=>f.path),warnings:plan.warnings,changes});
  }
  if(action==='publish'){
   check(/^[0-9a-f-]{36}$/i.test(input.previewId||''),'Nieprawidłowy podgląd.');const {data:prior,error:priorError}=await db.from('city_editor_previews').select('*').eq('id',input.previewId).eq('user_id',user.id).single();check(!priorError&&prior,'Brak podglądu dla tego użytkownika.');if(prior.result?.commit)return response(200,prior.result);check(!prior.consumed&&Date.parse(prior.expires_at)>Date.now(),'Podgląd wykorzystany lub wygasły. Przygotuj nowy.');
   const gh=await github();check(gh.head===prior.head&&gh.branch===prior.branch,'Gałąź zmieniła się. Przygotuj nowy podgląd.');
   const {data:claimed,error:claimError}=await db.from('city_editor_previews').update({consumed:true}).eq('id',prior.id).eq('consumed',false).select('id').maybeSingle();check(!claimError&&claimed,'Publikacja jest już rozpoczęta.');
   try{
    const parent=await gh.call('/git/commits/'+prior.head),tree=[];
    for(const f of prior.payload.files){check(typeof f.path==='string'&&!f.path.includes('..')&&!f.path.startsWith('/')&&/^(assets\/|config\/Travel|ui\/DestinationMeta\.js$)/.test(f.path),'Nieprawidłowa ścieżka planu.');if(f.encoding==='base64'){const blob=await gh.call('/git/blobs','POST',{content:f.content,encoding:'base64'});tree.push({path:f.path,mode:'100644',type:'blob',sha:blob.sha});}else tree.push({path:f.path,mode:'100644',type:'blob',content:f.content});}
    const nextTree=await gh.call('/git/trees','POST',{base_tree:parent.tree.sha,tree}),commit=await gh.call('/git/commits','POST',{message:'City editor: update '+prior.payload.id,tree:nextTree.sha,parents:[prior.head]});await gh.call('/git/refs/'+gh.refPath,'PATCH',{sha:commit.sha,force:false});
    const result={ok:true,commit:commit.sha,url:commit.html_url||`https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`,message:'Zapisano na GitHubie. Wdrożenie na hosting nie jest jeszcze potwierdzone.'};await db.from('city_editor_previews').update({result}).eq('id',prior.id);return response(200,result);
   }catch(e){await db.from('city_editor_previews').update({result:{error:String(e.message)}}).eq('id',prior.id);throw Error('Publikacja nie została potwierdzona. Sprawdź historię GitHuba przed ponowieniem. '+e.message);}
  }
  return response(400,{error:'Nieznana operacja.'});
 }catch(e){return response(400,{error:e.message||'Błąd panelu.'});}
});
