import { APPEARANCE_OPTIONS, renderAvatarPreview } from '../ui/characterCreation/AppearanceControls.js';
import { createRandomIdentity } from '../ui/characterCreation/CharacterCreationData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { getPersonnelVenue, getPersonnelCollections } from './PersonnelCollections.js';

const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const occupationOf=s=>s.publicProfile?.occupation||s.occupation||'';
const nameOf=s=>s.publicProfile?.displayName||s.name||'';
function shuffle(items) {
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function clock(minutes) {
  const h=Math.floor(minutes/60)%24,m=minutes%60;
  return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h<12?'a.m.':'p.m.'}`;
}
export function occupationMatches(collection,occupation) {
  return collection.match.test(occupation)||collection.roles.some(role=>normalize(role)===normalize(occupation));
}
function appearanceFor(person,used) {
  const entry=person.restrictedProfile?.forensicAttributes?.hair_color;
  const raw=String(entry?.value??entry??'').toLowerCase().trim();
  const hair=({blond:'blonde',gray:'grey',white:'grey',ginger:'red',auburn:'red'})[raw]||raw;
  if(hair&&!APPEARANCE_OPTIONS.hairColor.options.some(x=>x.id===hair))throw new Error(`Unsupported forensic hair colour: ${raw}`);
  for(let attempt=0;attempt<10000;attempt++){
    const value=createRandomIdentity().appearance;
    if(hair)value.hairColor=hair;
    if(raw==='white')value.hairHex='#e8e4dc';
    if(raw==='auburn')value.hairHex='#793a25';
    value.hairStyle=pick(['neat','messy','bob','long','curly','braids','pixie']);
    const key=JSON.stringify(value);
    if(!used.has(key)){used.add(key);return value;}
  }
  throw new Error('Could not generate distinct personnel portraits.');
}
function chooseCollections(mission,suspects) {
  const available=shuffle(getPersonnelCollections(mission).filter(c=>!suspects.some(s=>occupationMatches(c,occupationOf(s)))));
  // Search rather than relying on a greedy ordering of overlapping departments.
  function search(start,selected){
    if(selected.length===6)return selected;
    if(available.length-start<6-selected.length)return null;
    for(let i=start;i<available.length;i++){
      const c=available[i];
      const conflict=selected.some(other=>c.roles.some(role=>occupationMatches(other,role))||other.roles.some(role=>occupationMatches(c,role)));
      if(!conflict){const result=search(i+1,[...selected,c]);if(result)return result;}
    }
    return null;
  }
  const result=search(0,[]);
  if(!result)throw new Error('This venue needs more compatible staff collections for the current suspect occupations. No unrelated jobs were substituted.');
  return result;
}
export function buildPersonnelRoster(state,suspects) {
  if(suspects.length!==10||new Set(suspects.map(s=>s.id)).size!==10)throw new Error('Personnel roster requires ten distinct canonical suspects.');
  if(suspects.some(s=>!nameOf(s)||!occupationOf(s)))throw new Error('Every canonical suspect needs a name and an occupation.');
  const venue=getPersonnelVenue(state.currentMission);
  const window=state.caseData?.crimeWindow;
  if(!Number.isInteger(window?.startMinute)||!Number.isInteger(window?.endMinute)||window.endMinute<=window.startMinute)throw new Error('Personnel roster requires a valid crime time window.');
  const usedLooks=new Set(),usedNames=new Set(suspects.map(s=>normalize(nameOf(s)))),usedIds=new Set(suspects.map(s=>s.id));
  const people=suspects.map(s=>({id:s.id,name:nameOf(s),occupation:occupationOf(s),appearance:appearanceFor(s,usedLooks)}));
  const selected=chooseCollections(state.currentMission,suspects),sizes=shuffle([8,7,7,6,6,6]),statements=[];
  const caseKey=String(state.currentCaseId||state.currentMission.id||state.currentMission.scene);
  let serial=0;
  for(let index=0;index<selected.length;index++){
    const c=selected[index],roles=shuffle(c.roles),ids=[];
    for(let n=0;n<sizes[index];n++){
      const occupation=roles[n%roles.length];
      let identity,attempt=0;
      do{identity=createRandomIdentity();if(++attempt>10000)throw new Error('Could not generate unique personnel names.');}while(usedNames.has(normalize(identity.name)));
      usedNames.add(normalize(identity.name));
      let id;
      do{id=`personnel:${caseKey}:${++serial}`;}while(usedIds.has(id));
      usedIds.add(id);
      people.push({id,name:identity.name,occupation,appearance:appearanceFor({},usedLooks)});
      ids.push(id);
    }
    const situation=c.situation.replaceAll('{from}',clock(window.startMinute-60)).replaceAll('{to}',clock(window.endMinute+60));
    statements.push({id:`statement:${c.id}`,speaker:createRandomIdentity().name,speakerRole:c.witness,
      text:`${pick(['You mean','Oh,','I remember'])} ${c.clue}? ${situation} ${c.joke} Nobody left before we finished. You can check the recording if you like.`,
      corroboration:'The attendance records and continuous recording have been checked. Everyone described in this account was identified, and their presence covers the time of the theft.',
      clearedIds:ids,collectionId:c.id});
  }
  for(const s of statements){
    const c=selected.find(c=>c.id===s.collectionId),inferred=people.filter(p=>occupationMatches(c,p.occupation)).map(p=>p.id);
    if(inferred.length!==s.clearedIds.length||inferred.some(id=>!s.clearedIds.includes(id)))throw new Error('An occupation clue has ambiguous membership.');
  }
  if(people.length!==50||new Set(statements.flatMap(s=>s.clearedIds)).size!==40)throw new Error('Invalid personnel collection plan.');
  return {version:3,venueScene:venue.scene,venueType:venue.type,location:venue.location,people:shuffle(people),statements:shuffle(statements),targetIds:suspects.map(s=>s.id),excludedIds:[],completed:false,gridReviewed:false,correctionNoticeShown:false,selectedStatement:0};
}
export function ensurePersonnelRoster(state,suspects) {
  const index=state.currentMission?.caseIndex??state.currentCaseIndex??state.caseIndex;
  if(!Number.isInteger(index))throw new Error('Missing campaign case index.');
  if(index<1)return null;
  const mission=state.currentMission;
  if(!mission)throw new Error('Missing active mission.');
  let roster=mission.personnelRoster;
  if(!roster||(roster.version!==3&&!roster.completed)){
    const upgraded=Boolean(roster);
    roster=buildPersonnelRoster(state,suspects);
    if(upgraded)roster.updatedFromPreviousVersion=true;
    mission.personnelRoster=roster;
  }
  const expected=new Set(suspects.map(s=>s.id));
  if(!Array.isArray(roster.targetIds)||roster.targetIds.length!==expected.size||new Set(roster.targetIds).size!==expected.size||roster.targetIds.some(id=>!expected.has(id)))throw new Error('Saved personnel roster does not match this case.');
  if(roster.version===3&&roster.venueScene!==String(mission.scene).trim().toLowerCase())throw new Error('Saved personnel roster belongs to a different crime scene.');
  for(const suspect of suspects){
    const person=roster.people.find(p=>p.id===suspect.id);
    if(!person)throw new Error('Missing canonical suspect in personnel roster.');
    suspect.appearance={...person.appearance};
  }
  saveGameState();return roster;
}
export function submitPersonnelShortlist(roster) {
  if(roster.completed)return false;
  const excluded=new Set(roster.excludedIds||[]);
  roster.submittedIds=roster.people.filter(p=>!excluded.has(p.id)).map(p=>p.id);
  roster.completed=true;roster.submittedAt=Date.now();roster.gridReviewed=false;roster.correctionNoticeShown=false;
  delete roster.correctedIds;delete roster.gridReviewedAt;
  return true;
}
function loadStyles(){
  for(const [id,path] of [['personnel-v2','../assets/css/personnel-roster.css'],['personnel-avatars','../assets/css/character-creation.css']]){
    if(document.getElementById(id))continue;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(path,import.meta.url).href;document.head.append(link);
  }
}
export class PersonnelRosterView {
  constructor(scene,roster,onComplete,onClose){
    this.scene=scene;this.roster=roster;this.onComplete=onComplete;this.onClose=onClose;
    this.selectedStatement=Math.max(0,Math.min(roster.selectedStatement||0,roster.statements.length-1));
    this.handleClick=this.handleClick.bind(this);this.resize=this.resize.bind(this);loadStyles();
    this.element=scene.add.dom(0,0).createFromHTML(`
      <section class="personnel-roster" aria-label="Personnel files">
        <header class="personnel-header"><div><h1>PERSONNEL FILES</h1><p>${esc(roster.location||'')} — Read the accounts. Cross out anyone you can rule out.</p></div><button type="button" data-close>Back</button></header>
        <section class="personnel-testimony" aria-label="Witness statement">
          <div class="personnel-witness-bar"><button type="button" data-prev aria-label="Previous witness">&#8249;</button><div data-speaker></div><button type="button" data-next aria-label="Next witness">&#8250;</button></div>
          <blockquote data-statement></blockquote><details><summary>Investigator's note</summary><p data-corroboration></p></details>
        </section>
        <div class="personnel-grid" data-grid aria-label="People connected to the case"></div>
        <footer><p data-message role="status" aria-live="polite"></p><button type="button" data-confirm>Submit shortlist</button></footer>
      </section>`).setOrigin(0,0).setDepth(2000).setScrollFactor(0);
    this.root=this.element.node.querySelector('.personnel-roster');this.root.addEventListener('click',this.handleClick);scene.scale.on('resize',this.resize);this.render();this.resize();
  }
  resize(){
    if(!this.element?.node)return;
    const {width,height}=this.scene.scale;
    Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});Object.assign(this.root.style,{width:`${width}px`,height:`${height}px`});
  }
  render(){
    const excluded=new Set(this.roster.excludedIds||[]);
    this.root.querySelector('[data-grid]').innerHTML=this.roster.people.map(person=>{
      const wrapper=document.createElement('div');wrapper.innerHTML=renderAvatarPreview({appearance:person.appearance,name:person.name});
      const avatar=wrapper.querySelector('.agency-id-avatar');avatar.removeAttribute('data-avatar-preview');
      if(person.appearance?.hairHex)avatar.style.setProperty('--hair',person.appearance.hairHex);
      avatar.setAttribute('aria-label',`Portrait of ${person.name}`);
      return `<button type="button" class="personnel-card${excluded.has(person.id)?' is-cleared':''}" data-person="${esc(person.id)}" aria-pressed="${excluded.has(person.id)}" aria-label="${esc(person.name)}, ${esc(person.occupation)}"><span class="personnel-photo">${avatar.outerHTML}<span class="personnel-stamp" aria-hidden="true">CLEARED</span></span><span class="personnel-name">${esc(person.name)}</span><span class="personnel-occupation">${esc(person.occupation)}</span></button>`;
    }).join('');
    this.renderStatement();this.updateCount();
    if(this.roster.updatedFromPreviousVersion)this.root.querySelector('[data-message]').textContent='Personnel files updated. Please review the new accounts.';
  }
  renderStatement(){
    const s=this.roster.statements[this.selectedStatement];
    this.root.querySelector('[data-speaker]').innerHTML=`<strong>${esc(s.speaker)}</strong><span>${esc(s.speakerRole||'Witness')}</span>`;
    this.root.querySelector('[data-statement]').textContent=`“${s.text}”`;
    this.root.querySelector('[data-corroboration]').textContent=s.corroboration||'';this.root.querySelector('details').open=false;
  }
  updateCount(){this.root.querySelector('[data-confirm]').disabled=this.roster.completed===true;}
  handleClick(event){
    const button=event.target?.closest?.('button');if(!button||!this.root?.contains(button))return;
    if(button.hasAttribute('data-close')){this.onClose?.();return;}
    if(button.hasAttribute('data-prev')||button.hasAttribute('data-next')){
      this.selectedStatement=(this.selectedStatement+(button.hasAttribute('data-prev')?-1:1)+this.roster.statements.length)%this.roster.statements.length;
      this.roster.selectedStatement=this.selectedStatement;this.renderStatement();saveGameState();return;
    }
    if(button.hasAttribute('data-person')){
      if(this.roster.completed)return;
      const id=button.dataset.person,ids=new Set(this.roster.excludedIds||[]);
      if(ids.has(id))ids.delete(id);else ids.add(id);
      this.roster.excludedIds=[...ids];button.classList.toggle('is-cleared',ids.has(id));button.setAttribute('aria-pressed',String(ids.has(id)));saveGameState();return;
    }
    if(button.hasAttribute('data-confirm')){
      if(!submitPersonnelShortlist(this.roster))return;
      saveGameState();const complete=this.onComplete;this.destroy();complete?.();
    }
  }
  destroy(){this.scene.scale.off('resize',this.resize);this.root?.removeEventListener('click',this.handleClick);this.element?.destroy();this.element=null;this.root=null;}
}
