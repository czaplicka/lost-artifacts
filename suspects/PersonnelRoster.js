import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { APPEARANCE_OPTIONS, renderAvatarPreview } from '../ui/characterCreation/AppearanceControls.js';
import { createRandomIdentity } from '../ui/characterCreation/CharacterCreationData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { getPersonnelVenue, getPersonnelCollections } from './PersonnelCollections.js';
import { PersonnelHelpController } from './PersonnelHelpController.js';

export const PERSONNEL_TEXT = await loadJson('../assets/data/personnelWitnesses.json', import.meta.url);
const VERSION=4;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=s=>s.publicProfile?.displayName||s.name||'';
const jobOf=s=>s.publicProfile?.occupation||s.occupation||'';
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const format=(text,values)=>text.replace(/\{(\w+)\}/g,(all,key)=>values[key]??all);
export function shuffle(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function clock(n){const h=Math.floor(n/60)%24,m=n%60;return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?__dialogueText("suspects/PersonnelRoster.js", "t_7b455f2dd791ffcc1278"):__dialogueText("suspects/PersonnelRoster.js", "t_36e11c186286bdb79b77")}`;}
function floorLabel(n){return n===0?PERSONNEL_TEXT.ui.ground:format(PERSONNEL_TEXT.ui.floor,{floor:n});}
export function occupationMatches(c,job){return c.match.test(job)||c.roles.some(role=>norm(role)===norm(job));}
function collections(mission){
  return [...getPersonnelCollections(mission),{id:'management',match:/director|head of|department head|operations manager|senior manager/i,
    roles:[__dialogueText("suspects/PersonnelRoster.js", "t_c149bc14e45c0d92e0ad"),__dialogueText("suspects/PersonnelRoster.js", "t_5adba028e6d98e5bda2b"),__dialogueText("suspects/PersonnelRoster.js", "t_e2ec20a539a0be435309"),__dialogueText("suspects/PersonnelRoster.js", "t_d880dd739b5ff0dfe780")]}];
}
function chooseJobs(mission,suspects,count){
  const available=shuffle(collections(mission).filter(c=>PERSONNEL_TEXT.jobs[c.id]&&!suspects.some(s=>occupationMatches(c,jobOf(s)))));
  function search(start,chosen){
    if(chosen.length===count)return chosen;
    for(let i=start;i<available.length;i++){
      const c=available[i];
      if(chosen.some(other=>c.roles.some(r=>occupationMatches(other,r))||other.roles.some(r=>occupationMatches(c,r))))continue;
      const result=search(i+1,[...chosen,c]);if(result)return result;
    }
    return null;
  }
  const result=search(0,[]);
  if(!result)throw new Error('Not enough compatible venue staff groups for this case.');
  return result;
}
function looksFor(source,primary,active,used){
  const entry=source.restrictedProfile?.forensicAttributes?.hair_color;
  const raw=String(entry?.value??entry??'').toLowerCase();
  const hair=({blond:'blonde',gray:'grey',white:'grey',auburn:'red',ginger:'red'})[raw]||raw;
  if(hair&&!APPEARANCE_OPTIONS.hairColor.options.some(o=>o.id===hair))throw new Error(`Unsupported hair colour: ${raw}`);
  for(let n=0;n<10000;n++){
    const a=createRandomIdentity().appearance;
    if(hair)a.hairColor=hair;
    if(raw==='white')a.hairHex='#e8e4dc';
    if(raw==='auburn')a.hairHex='#793a25';
    a.hairStyle=pick(['neat','messy','bob','long','curly','pixie']);
    if(active.includes('glasses'))a.accessory=primary==='glasses'?'glasses':pick(['none','scarf','notebook','studs','hoops','earring']);
    if(active.includes('tattoo'))a.tattoos=primary==='tattoo'?pick(['dragon','skull','rose']):'none';
    const key=JSON.stringify(a);if(!used.has(key)){used.add(key);return a;}
  }
  throw new Error('Could not generate unique portraits.');
}
function makeName(used){
  for(let n=0;n<10000;n++){
    const name=createRandomIdentity().name,key=norm(name);
    if(!used.has(key)){used.add(key);return name;}
  }
  throw new Error('Could not generate unique personnel names.');
}
export function buildPersonnelRoster(state,suspects){
  if(suspects.length!==10||new Set(suspects.map(s=>s.id)).size!==10)throw new Error('Expected ten distinct canonical suspects.');
  if(suspects.some(s=>!nameOf(s)||!jobOf(s)))throw new Error('A suspect is missing a name or occupation.');
  const mission=state.currentMission,venue=getPersonnelVenue(mission),window=state.caseData?.crimeWindow;
  if(!Number.isInteger(window?.startMinute)||!Number.isInteger(window?.endMinute)||window.endMinute<=window.startMinute)throw new Error('Missing crime time window.');
  const floors=mission.personnelFloors??[0,1,2];
  if(!Array.isArray(floors)||floors.length<2||floors.some(f=>!Number.isInteger(f)||f<0)||new Set(floors).size!==floors.length)throw new Error('personnelFloors must contain at least two distinct non-negative integers.');
  const active=shuffle(['floor','glasses','tattoo']).slice(0,2);
  const blocked=pick(floors),safeFloors=floors.filter(f=>f!==blocked);
  const jobs=chooseJobs(mission,suspects,4);
  const allCollections=collections(mission);
  const neutralJobs=[...new Set(allCollections.flatMap(c=>c.roles))].filter(job=>!jobs.some(c=>occupationMatches(c,job)));
  if(!neutralJobs.length)throw new Error('No neutral venue occupations remain.');
  const usedLooks=new Set(),usedNames=new Set(suspects.map(s=>norm(nameOf(s)))),usedIds=new Set(suspects.map(s=>s.id));
  const floorFor=primary=>active.includes('floor')?(primary==='floor'?blocked:pick(safeFloors)):pick(floors);
  const people=suspects.map(s=>({id:s.id,name:nameOf(s),occupation:jobOf(s),floor:floorFor(null),appearance:looksFor(s,null,active,usedLooks)}));
  const plans=shuffle([...active.map(kind=>({kind})),...jobs.map(collection=>({kind:'job',collection}))]);
  const sizes=shuffle([8,7,7,6,6,6]);
  const runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let serial=0;
  for(let i=0;i<plans.length;i++){
    const plan=plans[i];
    for(let n=0;n<sizes[i];n++){
      let id;do{id=`personnel:${runId}:${++serial}`;}while(usedIds.has(id));usedIds.add(id);
      people.push({id,name:makeName(usedNames),occupation:plan.kind==='job'?pick(plan.collection.roles):pick(neutralJobs),floor:floorFor(plan.kind),appearance:looksFor({},plan.kind,active,usedLooks)});
    }
  }
  const matches=(plan,p)=>plan.kind==='floor'?p.floor===blocked:plan.kind==='glasses'?p.appearance.accessory==='glasses':plan.kind==='tattoo'?p.appearance.tattoos!=='none':occupationMatches(plan.collection,p.occupation);
  const values={from:clock(window.startMinute-60),to:clock(window.endMinute+60),floor:floorLabel(blocked)};
  const statements=plans.map((plan,i)=>{
    const data=plan.kind==='job'?PERSONNEL_TEXT.jobs[plan.collection.id]:PERSONNEL_TEXT[plan.kind];
    const clearedIds=people.filter(p=>matches(plan,p)).map(p=>p.id);
    if(clearedIds.length<4||clearedIds.length>8||suspects.some(s=>clearedIds.includes(s.id)))throw new Error('A clue contradicts the canonical shortlist.');
    return {id:`${plan.kind}:${plan.collection?.id||i}`,kind:plan.kind,collectionId:plan.collection?.id||null,
      speaker:makeName(usedNames),speakerRole:data.speaker,speakerAppearance:looksFor({},null,[],usedLooks),
      text:format(data.text,values),corroboration:format(data.note,values),hint:format(data.hint,values),clearedIds};
  });
  const cleared=new Set(statements.flatMap(s=>s.clearedIds));
  if(people.length!==50||cleared.size!==40||people.filter(p=>!cleared.has(p.id)).some(p=>!suspects.some(s=>s.id===p.id)))throw new Error('Invalid personnel solution.');
  return {version:VERSION,runId,caseId:state.currentCaseId??null,venueScene:venue.scene,location:venue.location,
    people:shuffle(people),statements,targetIds:suspects.map(s=>s.id),excludedIds:[],selectedStatement:0,completed:false,gridReviewed:false,correctionNoticeShown:false};
}
export function ensurePersonnelRoster(state,suspects){
  const mission=state.currentMission,index=mission?.caseIndex??state.currentCaseIndex??state.caseIndex;
  if(!Number.isInteger(index))throw new Error('Missing campaign case index.');
  if(index<1)return null;
  let roster=mission.personnelRoster;
  if(!roster||(roster.version!==VERSION&&!roster.completed)){
    const updated=Boolean(roster);roster=buildPersonnelRoster(state,suspects);roster.updatedFromPreviousVersion=updated;mission.personnelRoster=roster;
  }
  const expected=new Set(suspects.map(s=>s.id));
  if(!Array.isArray(roster.targetIds)||roster.targetIds.length!==expected.size||new Set(roster.targetIds).size!==expected.size||roster.targetIds.some(id=>!expected.has(id)))throw new Error('Personnel roster belongs to another case.');
  if(roster.version===VERSION&&roster.venueScene!==mission.scene)throw new Error('Personnel roster belongs to another venue.');
  for(const suspect of suspects){const p=roster.people.find(p=>p.id===suspect.id);if(!p)throw new Error('Missing canonical suspect.');suspect.appearance={...p.appearance};}
  saveGameState();return roster;
}
export function submitPersonnelShortlist(roster){
  if(roster.completed)return false;
  const excluded=new Set(roster.excludedIds||[]);
  roster.submittedIds=roster.people.filter(p=>!excluded.has(p.id)).map(p=>p.id);
  roster.completed=true;roster.submittedAt=Date.now();roster.gridReviewed=false;roster.correctionNoticeShown=false;
  delete roster.correctedIds;delete roster.gridReviewedAt;
  return true;
}
const PATHS={
  shield:__dialogueText("suspects/PersonnelRoster.js", "t_a5d1da40b9e00ad88ca7"),
  computer:__dialogueText("suspects/PersonnelRoster.js", "t_97d182edfc1ab70ae5bc"),
  broom:__dialogueText("suspects/PersonnelRoster.js", "t_a596f1071aad9faeaf13"),
  ticket:__dialogueText("suspects/PersonnelRoster.js", "t_f8945c551dff80edadd7"),
  book:__dialogueText("suspects/PersonnelRoster.js", "t_a24518d69d3234b81e05"),
  brush:__dialogueText("suspects/PersonnelRoster.js", "t_253720b487f2b271b472"),
  briefcase:__dialogueText("suspects/PersonnelRoster.js", "t_58706234b3180f72985d"),
  box:__dialogueText("suspects/PersonnelRoster.js", "t_a49730180b6b1a65fa43")
};
function icon(job){
  const key=/secur|guard|CCTV/i.test(job)?'shield':/\bIT\b|network|computer|software|database/i.test(job)?'computer':/clean|janitor|housekeep/i.test(job)?'broom':/ticket|admission|cloakroom/i.test(job)?'ticket':/archiv|educat|guide|docent|research/i.test(job)?'book':/conserv|restor|curat|display/i.test(job)?'brush':/pack|cargo|warehouse|freight|stock/i.test(job)?'box':'briefcase';
  return `${"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\""}${PATHS[key]}${"\"/></svg>"}`;
}
let avatarCss='';
const avatarStyleParts=new Set();
function portrait(appearance,name){
  const wrapper=document.createElement('div');wrapper.innerHTML=renderAvatarPreview({appearance,name});
  for(const style of wrapper.querySelectorAll('style'))avatarStyleParts.add(style.textContent);
  avatarCss=[...avatarStyleParts].join('\n');
  const avatar=wrapper.querySelector(".agency-id-avatar");
  if(!avatar)throw new Error('Avatar renderer did not return a portrait.');
  avatar.removeAttribute('data-avatar-preview');avatar.setAttribute('aria-label',name);
  if(appearance?.hairHex)avatar.style.setProperty('--hair',appearance.hairHex);
  return avatar.outerHTML;
}
function loadStyles(){
  for(const [id,path] of [['personnel-v4',__dialogueText("suspects/PersonnelRoster.js", "t_f13829eddecedcd941b6")],['personnel-avatars',__dialogueText("suspects/PersonnelRoster.js", "t_d976a2ef02321c60c588")]]){
    if(document.getElementById(id))continue;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(path,import.meta.url).href;document.head.append(link);
  }
}
export class PersonnelRosterView {
  constructor(scene,roster,onComplete,onClose){
    this.scene=scene;this.roster=roster;this.onComplete=onComplete;this.onClose=onClose;
    this.selectedStatement=Math.max(0,Math.min(roster.selectedStatement||0,roster.statements.length-1));
    this.handleClick=this.handleClick.bind(this);this.resize=this.resize.bind(this);loadStyles();
    const ui=PERSONNEL_TEXT.ui;
    this.element=scene.add.dom(0,0).createFromHTML(`${"\n      <section class=\"personnel-roster\" aria-label=\""}${esc(ui.title)}${"\"><style data-avatar-css></style>\n        <header class=\"personnel-header\"><div><h1>"}${esc(ui.title)}${"</h1><p>"}${esc(roster.location)}${" — "}${esc(ui.instruction)}${"</p></div><button type=\"button\" data-close>"}${esc(ui.back)}${"</button></header>\n        <section class=\"personnel-testimony\"><div class=\"personnel-witness-photo\" data-witness-photo></div><div class=\"personnel-account\">\n          <div class=\"personnel-witness-bar\"><button type=\"button\" data-prev aria-label=\"Previous witness\">&#8249;</button><div data-speaker></div><button type=\"button\" data-next aria-label=\"Next witness\">&#8250;</button></div>\n          <blockquote data-statement></blockquote><details><summary>"}${esc(ui.note)}${"</summary><p data-corroboration></p></details>\n        </div></section><div class=\"personnel-grid\" data-grid></div>\n        <footer><button type=\"button\" data-hint>"}${esc(ui.hint)}${"</button><p data-message role=\"status\" aria-live=\"polite\"></p><button type=\"button\" data-confirm>"}${esc(ui.submit)}${"</button></footer>\n      </section>"}`).setOrigin(0,0).setDepth(2000).setScrollFactor(0);
    this.root=this.element.node.querySelector(".personnel-roster");
    this.help=new PersonnelHelpController(scene,this,PERSONNEL_TEXT.help);
    this.root.addEventListener('click',this.handleClick);scene.scale.on('resize',this.resize);
    this.help.create();this.render();this.resize();
  }
  message(text){if(this.root)this.root.querySelector('[data-message]').textContent=text;}
  resize(){
    if(!this.element?.node)return;
    const {width,height}=this.scene.scale;Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});Object.assign(this.root.style,{width:`${width}px`,height:`${height}px`});this.help?.resizeModal();
  }
  render(){
    const excluded=new Set(this.roster.excludedIds||[]),ui=PERSONNEL_TEXT.ui;
    this.root.querySelector('[data-grid]').innerHTML=this.roster.people.map(p=>`${"<button type=\"button\" class=\"personnel-card"}${excluded.has(p.id)?" is-cleared":''}${"\" data-person=\""}${esc(p.id)}${"\" aria-pressed=\""}${excluded.has(p.id)}${"\">\n      <span class=\"personnel-photo\">"}${portrait(p.appearance,p.name)}${"<span class=\"personnel-stamp\" aria-hidden=\"true\">"}${esc(ui.cleared)}${"</span></span>\n      <span class=\"personnel-name\">"}${esc(p.name)}${"</span><span class=\"personnel-occupation\">"}${icon(p.occupation)}${"<span>"}${esc(p.occupation)}${"</span></span><span class=\"personnel-floor\">"}${esc(floorLabel(p.floor))}${"</span></button>"}`).join('');
    this.renderStatement();this.updateCount();if(this.roster.updatedFromPreviousVersion)this.message(ui.updated);
  }
  renderStatement(){
    const s=this.roster.statements[this.selectedStatement];
    this.root.querySelector('[data-speaker]').innerHTML=`<strong>${esc(s.speaker)}</strong><span>${esc(s.speakerRole)}</span>`;
    this.root.querySelector('[data-witness-photo]').innerHTML=portrait(s.speakerAppearance,s.speaker);
    this.root.querySelector('[data-statement]').textContent=`“${s.text}”`;
    this.root.querySelector('[data-corroboration]').textContent=s.corroboration;this.root.querySelector('details').open=false;
    this.root.querySelector('[data-avatar-css]').textContent=avatarCss;this.help?.refresh();
  }
  updateCount(){this.root.querySelector('[data-confirm]').disabled=this.roster.completed===true;}
  handleClick(event){
    const b=event.target?.closest?.('button');if(!b||!this.root?.contains(b)||this.help.modal)return;
    if(b.hasAttribute('data-close')){this.onClose?.();return;}
    if(b.hasAttribute('data-hint')){this.help.open(false);return;}
    if(b.hasAttribute('data-prev')||b.hasAttribute('data-next')){
      this.selectedStatement=(this.selectedStatement+(b.hasAttribute('data-prev')?-1:1)+this.roster.statements.length)%this.roster.statements.length;
      this.roster.selectedStatement=this.selectedStatement;this.renderStatement();saveGameState();return;
    }
    if(b.hasAttribute('data-person')){
      if(this.roster.completed)return;
      const ids=new Set(this.roster.excludedIds||[]),id=b.dataset.person;
      if(ids.has(id))ids.delete(id);else ids.add(id);
      this.roster.excludedIds=[...ids];b.classList.toggle('is-cleared',ids.has(id));b.setAttribute('aria-pressed',String(ids.has(id)));saveGameState();return;
    }
    if(b.hasAttribute('data-confirm')&&submitPersonnelShortlist(this.roster)){
      saveGameState();const complete=this.onComplete;this.destroy();complete?.();
    }
  }
  destroy(){this.help?.destroy();this.scene.scale.off('resize',this.resize);this.root?.removeEventListener('click',this.handleClick);this.element?.destroy();this.element=null;this.root=null;}
}
