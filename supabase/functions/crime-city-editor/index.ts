import {createClient} from 'npm:@supabase/supabase-js@2';
import {check,normalize,json,catalog,loadMission,template,buildPlan} from './engine.mjs';
const OWNER='czaplicka',REPO='lost-artifacts';
const ORIGIN=Deno.env.get('CITY_EDITOR_ORIGIN')||'https://markagency.silentshields.pl';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder(),dec=new TextDecoder(),draftTable='city_editor_crime_cases',previewTable='city_editor_crime_case_previews';
function response(status,data){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'}});}
async function authenticate(req){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');check(token,'Zaloguj się.');const {data,error}=await db.auth.getUser(token);check(!error&&data.user?.id&&data.user.email_confirmed_at,'Sesja nieważna lub e-mail niepotwierdzony.');const role=await db.from('city_editor_admins').select('user_id').eq('user_id',data.user.id).eq('enabled',true).maybeSingle();check(!role.error&&role.data,'Brak uprawnień administratora.');return data.user;}
async function github(){
 const token=Deno.env.get('CITY_EDITOR_GITHUB_TOKEN');check(token,'Brak sekretu CITY_EDITOR_GITHUB_TOKEN.');
 async function call(path,method='GET',body=null,optional=false){const r=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(optional&&r.status===404)return null;check(r.ok,'GitHub HTTP '+r.status);return await r.json();}
 const repo=await call(''),branch=Deno.env.get('CITY_EDITOR_BRANCH')||repo.default_branch;check(/^[A-Za-z0-9_./-]+$/.test(branch),'Nieprawidłowa gałąź.');const refPath='heads/'+branch,ref=await call('/git/ref/'+refPath),head=ref.object.sha,cache=new Map();
 async function read(path){check(typeof path==='string'&&!path.includes('..')&&!path.startsWith('/'),'Nieprawidłowa ścieżka.');if(cache.has(path))return cache.get(path);const f=await call('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+head,'GET',null,true);if(!f){cache.set(path,null);return null;}check(f.type==='file','Oczekiwano pliku: '+path);let b64=f.content;if(f.encoding!=='base64'){const blob=await call('/git/blobs/'+f.sha);check(blob.encoding==='base64','Nieobsługiwany plik.');b64=blob.content;}const value=dec.decode(Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0)));cache.set(path,value);return value;}
 return {read,call,head,branch,refPath};
}
Deno.serve(async req=>{
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return response(403,{error:'Niedozwolone pochodzenie.'});if(req.method==='OPTIONS')return response(200,{ok:true});if(req.method!=='POST')return response(405,{error:'Użyj POST.'});
 try{
  const user=await authenticate(req),text=await req.text();check(enc.encode(text).length<=5000000,'Formularz przekracza 5 MB.');const input=JSON.parse(text),action=input.action;
  if(action==='access')return response(200,{ok:true,version:1});
  if(action==='catalog'){const gh=await github();return response(200,{...await catalog(gh.read),head:gh.head});}
  if(action==='load'){check(typeof input.id==='string'&&/^[a-z][a-z0-9_]{1,47}$/.test(input.id),'Nieprawidłowe ID sprawy.');const gh=await github();return response(200,{form:await loadMission(gh.read,input.id),head:gh.head});}
  if(action==='template'){const gh=await github();return response(200,{items:await template(gh.read,input.sceneId),head:gh.head});}
  if(action==='draftList'){const {data,error}=await db.from(draftTable).select('id,city_id,artifact,version,updated_at').order('updated_at',{ascending:false});check(!error,'Nie można odczytać szkiców. Uruchom SQL z paczki.');return response(200,{drafts:data});}
  if(action==='draftLoad'){const {data,error}=await db.from(draftTable).select('*').eq('id',String(input.id)).single();check(!error&&data,'Nie znaleziono szkicu.');return response(200,{draft:data});}
  if(action==='draftSave'){
   const form=normalize(input.form),version=Number(input.version||0);check(Number.isSafeInteger(version)&&version>=0,'Nieprawidłowa wersja szkicu.');
   const values={content:form,city_id:form.cityId,artifact:form.mission.artifact,base_head:input.baseHead||null,version:version+1,updated_by:user.id,updated_at:new Date().toISOString()};
   const result=version===0?await db.from(draftTable).insert({id:form.missionId,created_by:user.id,...values}).select('version').single():await db.from(draftTable).update(values).eq('id',form.missionId).eq('version',version).select('version').maybeSingle();
   check(!result.error&&result.data,'ID jest zajęte lub szkic zmieniła druga osoba. Otwórz aktualną wersję.');return response(200,{version:result.data.version});
  }
  if(action==='preview'){
   const gh=await github();check(input.baseHead===gh.head,'Repozytorium zmieniło się. Zapisz szkic, odśwież dane i ponownie otwórz szkic. Przed publikacją porównaj zmiany.');
   const plan=await buildPlan(input.form,gh.read);check(plan.files.length,'Brak zmian.');const {changes,...payload}=plan;
   const result=await db.from(previewTable).insert({user_id:user.id,head:gh.head,branch:gh.branch,payload,expires_at:new Date(Date.now()+600000).toISOString()}).select('id').single();check(!result.error&&result.data,'Nie można zapisać podglądu. Uruchom SQL.');
   return response(200,{previewId:result.data.id,files:payload.files.map(f=>f.path),warnings:plan.warnings,coverage:plan.coverage,changes});
  }
  if(action==='publish'){
   check(/^[0-9a-f-]{36}$/i.test(input.previewId||''),'Nieprawidłowy podgląd.');const priorResult=await db.from(previewTable).select('*').eq('id',input.previewId).eq('user_id',user.id).single(),prior=priorResult.data;check(!priorResult.error&&prior,'Brak podglądu.');if(prior.result?.commit)return response(200,prior.result);check(!prior.consumed&&Date.parse(prior.expires_at)>Date.now(),'Podgląd wygasł lub został wykorzystany.');
   const gh=await github();check(gh.head===prior.head&&gh.branch===prior.branch,'Gałąź zmieniła się. Przygotuj nowy podgląd.');const claimed=await db.from(previewTable).update({consumed:true}).eq('id',prior.id).eq('consumed',false).select('id').maybeSingle();check(!claimed.error&&claimed.data,'Publikacja jest już rozpoczęta.');
   try{
    const parent=await gh.call('/git/commits/'+prior.head),tree=[];
    for(const f of prior.payload.files){check(/^assets\/[A-Za-z0-9_./:-]+$/.test(f.path)&&!f.path.includes('..'),'Ścieżka poza dozwolonym planem.');if(f.encoding==='base64'){const blob=await gh.call('/git/blobs','POST',{content:f.content,encoding:'base64'});tree.push({path:f.path,mode:'100644',type:'blob',sha:blob.sha});}else tree.push({path:f.path,mode:'100644',type:'blob',content:f.content});}
    const next=await gh.call('/git/trees','POST',{base_tree:parent.tree.sha,tree}),commit=await gh.call('/git/commits','POST',{message:'Crime editor: '+prior.payload.id,tree:next.sha,parents:[prior.head]});await gh.call('/git/refs/'+gh.refPath,'PATCH',{sha:commit.sha,force:false});
    const result={ok:true,commit:commit.sha,url:commit.html_url||`https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`,message:'Sprawa opublikowana. Wdrożenie na hosting nie jest potwierdzone.'};await db.from(previewTable).update({result}).eq('id',prior.id);return response(200,result);
   }catch(e){await db.from(previewTable).update({result:{error:String(e.message)}}).eq('id',prior.id);throw Error('Publikacja niepotwierdzona. Sprawdź historię GitHuba przed ponowieniem. '+e.message);}
  }
  return response(400,{error:'Nieznana operacja.'});
 }catch(e){return response(400,{error:e.message||'Błąd panelu.'});}
});
