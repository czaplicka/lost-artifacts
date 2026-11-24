import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { FIRST_NAMES, SURNAMES } from '../ui/characterCreation/CharacterCreationData.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { getPersonnelVenue, getPersonnelCollections } from './PersonnelCollections.js';
import { PersonnelHelpController } from './PersonnelHelpController.js';
import {
  PERSONNEL_TEXT, personnelReady, preparePersonnel, personnelLooks, personnelVisualClues,
  hasPersonnelGlasses, hasPersonnelTattoo, personnelPortraitSignature, normalizePersonnelAppearance,
  availablePersonnelOptions, drawPersonnelPortrait, recoveryRoster, rememberPersonnelContext, personnelContext
} from './PersonnelPortraits.js';
export { PERSONNEL_TEXT } from './PersonnelPortraits.js';
const VERSION=5;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const text=key=>__dialogueText('suspects/PersonnelRoster.js',key);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=s=>s.publicProfile?.displayName||s.name||'';
const jobOf=s=>s.publicProfile?.occupation||s.occupation||'';
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const format=(value,values)=>String(value).replace(/\{(\w+)\}/g,(all,key)=>values[key]??all);
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function clock(n){const local=((n%1440)+1440)%1440,h=Math.floor(local/60),m=local%60;return`${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function floorLabel(n){return n===0?PERSONNEL_TEXT.ui.ground:format(PERSONNEL_TEXT.ui.floor,{floor:n});}
export function occupationMatches(c,job){c.match.lastIndex=0;return c.match.test(job)||c.roles.some(role=>norm(role)===norm(job));}
function collections(mission){return[...getPersonnelCollections(mission),{id:'management',match:/director|head of|department head|operations manager|senior manager/i,roles:[text('t_c149bc14e45c0d92e0ad'),text('t_5adba028e6d98e5bda2b'),text('t_e2ec20a539a0be435309'),text('t_d880dd739b5ff0dfe780')]}];}
function chooseJobs(mission,suspects,count){
  const available=shuffle(collections(mission).filter(c=>PERSONNEL_TEXT.jobs[c.id]&&!suspects.some(s=>occupationMatches(c,jobOf(s)))));
  function search(start,chosen){if(chosen.length===count)return chosen;for(let i=start;i<available.length;i++){const c=available[i];if(chosen.some(other=>c.roles.some(r=>occupationMatches(other,r))||other.roles.some(r=>occupationMatches(c,r))))continue;const result=search(i+1,[...chosen,c]);if(result)return result;}return null;}
  const result=search(0,[]);if(!result)throw Error('Not enough compatible venue staff groups. This roster cannot be rebuilt with the current venue data.');return result;
}
function makeName(used){for(let n=0;n<10000;n++){const name=`${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,key=norm(name);if(!used.has(key)){used.add(key);return name;}}throw Error('Could not generate unique personnel names.');}
export function buildPersonnelRoster(state,suspects){
  if(!personnelReady())throw Error('Personnel portraits and witness text have not finished loading.');
  if(suspects.length!==10||new Set(suspects.map(s=>s.id)).size!==10)throw Error('Expected ten distinct canonical suspects.');
  if(suspects.some(s=>!nameOf(s)||!jobOf(s)))throw Error('A suspect is missing a name or occupation.');
  const mission=state.currentMission,venue=getPersonnelVenue(mission),window=state.caseData?.crimeWindow;
  if(!Number.isInteger(window?.startMinute)||!Number.isInteger(window?.endMinute)||window.endMinute<=window.startMinute)throw Error('Missing crime time window.');
  const floors=mission.personnelFloors??[0,1,2];if(!Array.isArray(floors)||floors.length<2||floors.some(f=>!Number.isInteger(f)||f<0)||new Set(floors).size!==floors.length)throw Error('personnelFloors must contain distinct non-negative integers.');
  const active=shuffle(personnelVisualClues()).slice(0,2),blocked=pick(floors),safeFloors=floors.filter(f=>f!==blocked),jobs=chooseJobs(mission,suspects,6-active.length);
  const neutralJobs=[...new Set(collections(mission).flatMap(c=>c.roles))].filter(job=>!jobs.some(c=>occupationMatches(c,job)));if(!neutralJobs.length)throw Error('No neutral venue occupations remain.');
  const usedLooks=new Set(),usedNames=new Set(suspects.map(s=>norm(nameOf(s)))),usedIds=new Set(suspects.map(s=>s.id));
  const floorFor=primary=>active.includes('floor')?(primary==='floor'?blocked:pick(safeFloors)):pick(floors);
  const people=suspects.map(s=>({id:s.id,name:nameOf(s),occupation:jobOf(s),floor:floorFor(null),appearance:personnelLooks(s,null,active,usedLooks)}));
  const plans=shuffle([...active.map(kind=>({kind})),...jobs.map(collection=>({kind:'job',collection}))]),sizes=shuffle([8,7,7,6,6,6]);
  const runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;let serial=0;
  for(let i=0;i<plans.length;i++)for(let n=0;n<sizes[i];n++){const plan=plans[i];let id;do{id=`personnel:${runId}:${++serial}`;}while(usedIds.has(id));usedIds.add(id);people.push({id,name:makeName(usedNames),occupation:plan.kind==='job'?pick(plan.collection.roles):pick(neutralJobs),floor:floorFor(plan.kind),appearance:personnelLooks({},plan.kind,active,usedLooks)});}
  const matches=(plan,p)=>plan.kind==='floor'?p.floor===blocked:plan.kind==='glasses'?hasPersonnelGlasses(p.appearance):plan.kind==='tattoo'?hasPersonnelTattoo(p.appearance):occupationMatches(plan.collection,p.occupation);
  const values={from:clock(window.startMinute-60),to:clock(window.endMinute+60),floor:floorLabel(blocked)};
  const statements=plans.map((plan,i)=>{
    const data=plan.kind==='job'?PERSONNEL_TEXT.jobs[plan.collection.id]:PERSONNEL_TEXT[plan.kind];if(!data)throw Error(`Missing witness definition: ${plan.kind}`);
    const clearedIds=people.filter(p=>matches(plan,p)).map(p=>p.id);if(clearedIds.length<4||clearedIds.length>8||suspects.some(s=>clearedIds.includes(s.id)))throw Error('A clue contradicts the canonical shortlist.');
    return{id:`${plan.kind}:${plan.collection?.id||i}`,kind:plan.kind,collectionId:plan.collection?.id||null,speaker:makeName(usedNames),speakerRole:data.speaker,speakerAppearance:personnelLooks({},null,[],usedLooks),text:format(data.text,values),corroboration:format(data.note,values),hint:format(data.hint,values),clearedIds};
  });
  const result={version:VERSION,runId,caseId:state.currentCaseId??null,campaignId:state._createdAt??null,venueScene:venue.scene,location:venue.location,people:shuffle(people),statements,targetIds:suspects.map(s=>s.id),excludedIds:[],selectedStatement:0,completed:false,gridReviewed:false,correctionNoticeShown:false};
  validatePersonnelRoster(state,suspects,result);return result;
}
const validated=new WeakMap();
export function validatePersonnelRoster(state,suspects,roster,checkPortraits=true){
  if(roster?.version!==VERSION)throw Error('This saved roster uses an older portrait system. Reset the roster to rebuild visible clues.');
  if(roster.caseId!==(state.currentCaseId??null)||roster.campaignId!==(state._createdAt??null))throw Error('Personnel roster belongs to another investigation.');
  if(roster.venueScene!==getPersonnelVenue(state.currentMission).scene)throw Error('Personnel roster belongs to another venue.');
  const expected=new Set(suspects.map(s=>s.id));if(expected.size!==10||!Array.isArray(roster.targetIds)||roster.targetIds.length!==10||new Set(roster.targetIds).size!==10||roster.targetIds.some(id=>!expected.has(id)))throw Error('Personnel roster belongs to another canonical shortlist.');
  if(!Array.isArray(roster.people)||roster.people.length!==50||new Set(roster.people.map(p=>p?.id)).size!==50||roster.people.some(p=>!p||!p.id||!p.name||!p.appearance)||[...expected].some(id=>!roster.people.some(p=>p.id===id)))throw Error('Invalid personnel people list.');
  if(!Array.isArray(roster.statements)||roster.statements.length!==6)throw Error('Invalid personnel statements.');
  const allIds=new Set(roster.people.map(p=>p.id)),cleared=new Set(roster.statements.flatMap(s=>s.clearedIds||[]));
  if(cleared.size!==40||[...cleared].some(id=>expected.has(id)||!allIds.has(id)))throw Error('Invalid personnel solution.');
  for(const statement of roster.statements){
    if(!Array.isArray(statement.clearedIds)||statement.clearedIds.length<4||statement.clearedIds.length>8)throw Error('Invalid witness group.');
    const members=new Set(statement.clearedIds),first=roster.people.find(p=>members.has(p.id)),collection=collections(state.currentMission).find(c=>c.id===statement.collectionId);
    const matching=roster.people.filter(p=>statement.kind==='glasses'?hasPersonnelGlasses(p.appearance):statement.kind==='tattoo'?hasPersonnelTattoo(p.appearance):statement.kind==='floor'?p.floor===first?.floor:statement.kind==='job'&&collection?occupationMatches(collection,p.occupation):false);
    if(matching.length!==members.size||matching.some(p=>!members.has(p.id)))throw Error('A saved visual or occupation clue no longer matches its people.');
  }
  const fingerprint=JSON.stringify([roster.people.map(p=>p.appearance),roster.statements.map(s=>s.speakerAppearance),['faceShape','hairStyle','accessory','tattoos'].map(category=>availablePersonnelOptions(category).map(o=>o.id))]);
  if(checkPortraits&&validated.get(roster)!==fingerprint){
    const seen=new Set();for(const appearance of [...roster.people.map(p=>p.appearance),...roster.statements.map(s=>s.speakerAppearance)]){
      const normalized=normalizePersonnelAppearance(appearance);if(JSON.stringify(normalized)!==JSON.stringify(appearance))throw Error('Saved portrait options are no longer available.');
      const signature=personnelPortraitSignature(appearance);if(seen.has(signature))throw Error('Two personnel portraits look identical. Reset the roster.');seen.add(signature);
    }validated.set(roster,fingerprint);
  }
  if(!Array.isArray(roster.excludedIds)||roster.excludedIds.some(id=>!allIds.has(id)))throw Error('Invalid saved personnel exclusions.');
  return roster;
}
function applyAppearances(suspects,roster){for(const suspect of suspects)suspect.appearance={...roster.people.find(p=>p.id===suspect.id).appearance};}
export function ensurePersonnelRoster(state,suspects){
  try{
    const mission=state.currentMission,index=mission?.caseIndex??state.currentCaseIndex??state.caseIndex;if(!mission||!Number.isInteger(index))throw Error('Missing active mission or campaign case index.');if(index<1)return null;
    let roster=mission.personnelRoster;
    if(!personnelReady()){
      if(roster?.version===VERSION&&roster.completed){validatePersonnelRoster(state,suspects,roster,false);return rememberPersonnelContext(roster,state,suspects);}
      return recoveryRoster(state,suspects);
    }
    if(!roster){roster=buildPersonnelRoster(state,suspects);mission.personnelRoster=roster;requestAutosave();}
    validatePersonnelRoster(state,suspects,roster);applyAppearances(suspects,roster);return rememberPersonnelContext(roster,state,suspects);
  }catch(error){return recoveryRoster(state,suspects,error);}
}
export function rebuildPersonnelRoster(state,suspects,prepare=()=>{}){
  const previous=state.currentMission.personnelRoster,candidate=buildPersonnelRoster(state,suspects);prepare(candidate);
  let backup=null;try{if(previous)backup=JSON.parse(JSON.stringify(previous));}catch{throw Error('The previous roster cannot be backed up; it has not been overwritten.');}
  if(backup)state.currentMission.personnelRosterRecoveryBackup=backup;
  state.currentMission.personnelRoster=candidate;applyAppearances(suspects,candidate);requestAutosave();return rememberPersonnelContext(candidate,state,suspects);
}
export function submitPersonnelShortlist(roster){
  if(roster.completed||roster.recovery)return false;const excluded=new Set(roster.excludedIds||[]);roster.submittedIds=roster.people.filter(p=>!excluded.has(p.id)).map(p=>p.id);roster.completed=true;roster.submittedAt=Date.now();roster.gridReviewed=false;roster.correctionNoticeShown=false;delete roster.correctedIds;delete roster.gridReviewedAt;return true;
}
const ICON_KEYS={shield:'t_a5d1da40b9e00ad88ca7',computer:'t_97d182edfc1ab70ae5bc',broom:'t_a596f1071aad9faeaf13',ticket:'t_f8945c551dff80edadd7',book:'t_a24518d69d3234b81e05',brush:'t_253720b487f2b271b472',briefcase:'t_58706234b3180f72985d',box:'t_a49730180b6b1a65fa43'};
function occupationIcon(job){const key=/secur|guard|CCTV/i.test(job)?'shield':/\bIT\b|network|computer|software|database/i.test(job)?'computer':/clean|janitor|housekeep/i.test(job)?'broom':/ticket|admission|cloakroom/i.test(job)?'ticket':/archiv|educat|guide|docent|research/i.test(job)?'book':/conserv|restor|curat|display/i.test(job)?'brush':/pack|cargo|warehouse|freight|stock/i.test(job)?'box':'briefcase';return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${esc(text(ICON_KEYS[key]))}"/></svg>`;}

function loadStyles(){
  for(const[id,path]of[['personnel-v4',text('t_f13829eddecedcd941b6')],['personnel-avatars',text('t_d976a2ef02321c60c588')]]){if(document.getElementById(id))continue;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(path,import.meta.url).href;document.head.append(link);}
  if(document.getElementById('personnel-canvas-v5'))return;const style=document.createElement('style');style.id='personnel-canvas-v5';style.textContent='.personnel-photo{overflow:hidden}.personnel-photo>canvas,.personnel-witness-photo>canvas{display:block;width:100%;height:100%;object-fit:contain;background:#efe4c8}.personnel-recovery{padding:24px;max-width:760px;margin:auto;white-space:pre-line}.personnel-recovery button{margin:10px;padding:12px;font:inherit;cursor:pointer}.personnel-recovery h2{font-size:24px}';document.head.append(style);
}
export class PersonnelRosterView {
  constructor(scene,roster,onComplete,onClose){
    Object.assign(this,{scene,roster,onComplete,onClose,selectedStatement:0,dead:false,run:0});this.context=personnelContext(roster);this.contextScope=this.context?JSON.stringify([this.context.state.currentCaseId,this.context.state._createdAt,this.context.state.currentMission?.id,this.context.state.currentMission?.scene]):null;loadStyles();
    this.handleClick=this.handleClick.bind(this);this.resize=this.resize.bind(this);this.destroy=this.destroy.bind(this);
    this.element=scene.add.dom(0,0).createFromHTML('<section class="personnel-roster" aria-label="Personnel review"><div class="personnel-recovery"><p role="status">Loading personnel portraits…</p><button type="button" data-close>Back</button></div></section>').setOrigin(0,0).setDepth(2000).setScrollFactor(0);
    this.root=this.element.node.querySelector('.personnel-roster');this.root.addEventListener('click',this.handleClick);scene.scale.on('resize',this.resize);scene.events.once('shutdown',this.destroy);scene.events.once('destroy',this.destroy);this.resize();void this.initialize(false);
  }
  prepareRoster(){}
  onRosterReady(){}
  onRosterUnavailable(){}
  async initialize(retry=false,reset=false){
    const run=++this.run;this.loading=true;
    try{
      if(!await preparePersonnel(this.scene,{retry})||this.dead||run!==this.run)return;
      if(!this.context)throw Error('The personnel state is unavailable. Close and reopen this screen.');
      const{state,suspects}=this.context;
      if(this.contextScope!==JSON.stringify([state.currentCaseId,state._createdAt,state.currentMission?.id,state.currentMission?.scene]))throw Error('The investigation changed. Close and reopen the personnel screen.');
      const roster=reset?rebuildPersonnelRoster(state,suspects,candidate=>this.prepareRoster(candidate)):ensurePersonnelRoster(state,suspects);
      if(!roster)throw Error('Personnel review is not active for this mission.');if(roster.recovery)throw Error(roster.errorMessage||'Personnel data is not ready.');
      this.prepareRoster(roster);if(this.dead||run!==this.run)return;this.roster=roster;this.selectedStatement=Math.max(0,Math.min(roster.selectedStatement||0,roster.statements.length-1));
      this.help?.destroy();this.help=new PersonnelHelpController(this.scene,this,PERSONNEL_TEXT.help);this.help.create();this.render();this.onRosterReady();requestAutosave();
    }catch(error){if(!this.dead&&run===this.run)this.renderRecovery(error);}
    finally{if(run===this.run)this.loading=false;}
  }
  renderRecovery(error){
    this.onRosterUnavailable();
    this.help?.destroy();this.help=null;
    this.root.innerHTML=`<div class="personnel-recovery"><h2>Personnel records need attention</h2><p>${esc(error.message)}</p><p>Retry reloads missing portrait graphics. Reset rebuilds this roster and clears its selections and submission. The previous roster is backed up; the ten canonical suspects are not rerolled. Already spent hints are not refunded.</p><button type="button" data-retry>Retry</button><button type="button" data-reset>Reset roster</button><button type="button" data-close>Back</button></div>`;
  }
  message(value){const node=this.root?.querySelector('[data-message]');if(node)node.textContent=value;}
  resize(){if(!this.element?.node||!this.root)return;const{width,height}=this.scene.scale;Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});Object.assign(this.root.style,{width:`${width}px`,height:`${height}px`});this.help?.resizeModal();}
  render(){
    const ui=PERSONNEL_TEXT.ui;
    this.root.innerHTML=`<header class="personnel-header"><div><h1>${esc(ui.title)}</h1><p>${esc(this.roster.location)} — ${esc(ui.instruction)}</p></div><button type="button" data-close>${esc(ui.back)}</button></header><section class="personnel-testimony"><div class="personnel-witness-photo" data-witness-photo></div><div class="personnel-account"><div class="personnel-witness-bar"><button type="button" data-prev aria-label="Previous witness">&#8249;</button><div data-speaker></div><button type="button" data-next aria-label="Next witness">&#8250;</button></div><blockquote data-statement></blockquote><details><summary>${esc(ui.note)}</summary><p data-corroboration></p></details></div></section><div class="personnel-grid" data-grid></div><footer><button type="button" data-hint>${esc(ui.hint)}</button><p data-message role="status" aria-live="polite"></p><button type="button" data-confirm>${esc(ui.submit)}</button></footer>`;
    const excluded=new Set(this.roster.excludedIds||[]),grid=this.root.querySelector('[data-grid]');
    grid.innerHTML=this.roster.people.map(p=>`<button type="button" class="personnel-card${excluded.has(p.id)?' is-cleared':''}" data-person="${esc(p.id)}" aria-pressed="${excluded.has(p.id)}"><span class="personnel-photo"><canvas data-personnel-canvas aria-label="${esc(p.name)}" role="img"></canvas><span class="personnel-stamp" aria-hidden="true">${esc(ui.cleared)}</span></span><span class="personnel-name">${esc(p.name)}</span><span class="personnel-occupation">${occupationIcon(p.occupation)}<span>${esc(p.occupation)}</span></span><span class="personnel-floor">${esc(floorLabel(p.floor))}</span></button>`).join('');
    const people=new Map(this.roster.people.map(p=>[String(p.id),p]));for(const card of grid.querySelectorAll('[data-person]'))if(!drawPersonnelPortrait(card.querySelector('canvas'),people.get(card.dataset.person).appearance,this.scene))throw Error('A personnel portrait could not be drawn.');
    this.renderStatement();this.updateCount();
  }
  renderStatement(){
    const s=this.roster.statements[this.selectedStatement];if(!s)return;
    this.root.querySelector('[data-speaker]').innerHTML=`<strong>${esc(s.speaker)}</strong><span>${esc(s.speakerRole)}</span>`;
    const host=this.root.querySelector('[data-witness-photo]');host.innerHTML='<canvas data-personnel-canvas role="img"></canvas>';const canvas=host.querySelector('canvas');canvas.setAttribute('aria-label',s.speaker);
    if(!drawPersonnelPortrait(canvas,s.speakerAppearance,this.scene))throw Error('The witness portrait could not be drawn.');
    this.root.querySelector('[data-statement]').textContent=`“${s.text}”`;this.root.querySelector('[data-corroboration]').textContent=s.corroboration;this.root.querySelector('details').open=false;this.help?.refresh();
  }
  updateCount(){const button=this.root?.querySelector('[data-confirm]');if(button)button.disabled=this.roster.completed===true;}
  handleClick(event){
    const b=event.target?.closest?.('button');if(!b||!this.root?.contains(b)||this.help?.modal)return;
    if(b.hasAttribute('data-close')){this.onClose?.();return;}if(this.loading)return;
    if(b.hasAttribute('data-retry')){void this.initialize(true);return;}
    if(b.hasAttribute('data-reset')){if(window.confirm('Reset this personnel roster? Its selections and submission will be cleared. The canonical suspects will not change.'))void this.initialize(true,true);return;}
    if(this.roster.recovery)return;
    try{
      if(b.hasAttribute('data-hint')){this.help?.open(false);return;}
      if(b.hasAttribute('data-prev')||b.hasAttribute('data-next')){this.selectedStatement=(this.selectedStatement+(b.hasAttribute('data-prev')?-1:1)+this.roster.statements.length)%this.roster.statements.length;this.roster.selectedStatement=this.selectedStatement;this.renderStatement();requestAutosave();return;}
      if(b.hasAttribute('data-person')){if(this.roster.completed)return;const ids=new Set(this.roster.excludedIds||[]),id=this.roster.people.find(p=>String(p.id)===b.dataset.person)?.id;if(id==null)return;if(ids.has(id))ids.delete(id);else ids.add(id);this.roster.excludedIds=[...ids];b.classList.toggle('is-cleared',ids.has(id));b.setAttribute('aria-pressed',String(ids.has(id)));requestAutosave();return;}
      if(b.hasAttribute('data-confirm')&&submitPersonnelShortlist(this.roster)){saveGameState();const complete=this.onComplete;this.destroy();complete?.();}
    }catch(error){this.renderRecovery(error);}
  }
  destroy(){if(this.dead)return;this.dead=true;this.run++;this.help?.destroy();this.scene.scale.off('resize',this.resize);this.scene.events.off('shutdown',this.destroy);this.scene.events.off('destroy',this.destroy);this.root?.removeEventListener('click',this.handleClick);this.element?.destroy();this.element=null;this.root=null;}
}
