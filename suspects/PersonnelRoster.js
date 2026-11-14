import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h<12?__dialogueText("suspects/PersonnelRoster.js", "t_7b455f2dd791ffcc1278"):__dialogueText("suspects/PersonnelRoster.js", "t_36e11c186286bdb79b77")}`;
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
      text:`${pick([__dialogueText("suspects/PersonnelRoster.js", "t_3259cd7c1fbf2dc3ded8"),__dialogueText("suspects/PersonnelRoster.js", "t_964b460c427971129122"),__dialogueText("suspects/PersonnelRoster.js", "t_e1e0f9ec60f0dd154242")])}${__dialogueText("suspects/PersonnelRoster.js", "t_36a9e7f1c95b82ffb997")}${c.clue}${__dialogueText("suspects/PersonnelRoster.js", "t_23eeade931d8902dde57")}${situation}${__dialogueText("suspects/PersonnelRoster.js", "t_36a9e7f1c95b82ffb997")}${c.joke}${__dialogueText("suspects/PersonnelRoster.js", "t_6435bdb71889415758f4")}`,
      corroboration:__dialogueText("suspects/PersonnelRoster.js", "t_db537205afc126376015"),
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
  for(const [id,path] of [['personnel-v2',__dialogueText("suspects/PersonnelRoster.js", "t_f13829eddecedcd941b6")],['personnel-avatars',__dialogueText("suspects/PersonnelRoster.js", "t_d976a2ef02321c60c588")]]){
    if(document.getElementById(id))continue;
    const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(path,import.meta.url).href;document.head.append(link);
  }
}
export class PersonnelRosterView {
  constructor(scene,roster,onComplete,onClose){
    this.scene=scene;this.roster=roster;this.onComplete=onComplete;this.onClose=onClose;
    this.selectedStatement=Math.max(0,Math.min(roster.selectedStatement||0,roster.statements.length-1));
    this.handleClick=this.handleClick.bind(this);this.resize=this.resize.bind(this);loadStyles();
    this.element=scene.add.dom(0,0).createFromHTML(`${__dialogueText("suspects/PersonnelRoster.js", "t_7f48cd959ba007fbdc08")}${esc(roster.location||'')}${__dialogueText("suspects/PersonnelRoster.js", "t_c35c1e133be5d9db1c99")}`).setOrigin(0,0).setDepth(2000).setScrollFactor(0);
    this.root=this.element.node.querySelector(__dialogueText("suspects/PersonnelRoster.js", "t_0abdcccbbdd807c54557"));this.root.addEventListener('click',this.handleClick);scene.scale.on('resize',this.resize);this.render();this.resize();
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
      const avatar=wrapper.querySelector(__dialogueText("suspects/PersonnelRoster.js", "t_64781541f2719c61a61f"));avatar.removeAttribute('data-avatar-preview');
      if(person.appearance?.hairHex)avatar.style.setProperty('--hair',person.appearance.hairHex);
      avatar.setAttribute('aria-label',`${__dialogueText("suspects/PersonnelRoster.js", "t_4ebf2947be9412144d12")}${person.name}`);
      return `${__dialogueText("suspects/PersonnelRoster.js", "t_145ee8e5bdb8d9c619cb")}${excluded.has(person.id)?__dialogueText("suspects/PersonnelRoster.js", "t_777741c0f535a5e37e71"):''}${__dialogueText("suspects/PersonnelRoster.js", "t_2dcc6dd830e42ff686fe")}${esc(person.id)}${__dialogueText("suspects/PersonnelRoster.js", "t_b3c0b044207f0ecc4137")}${excluded.has(person.id)}${__dialogueText("suspects/PersonnelRoster.js", "t_f50d324d8a3b2119bca7")}${esc(person.name)}${__dialogueText("suspects/PersonnelRoster.js", "t_0a07f659461970d8d8dc")}${esc(person.occupation)}${__dialogueText("suspects/PersonnelRoster.js", "t_e7968067112a6a975bbf")}${avatar.outerHTML}${__dialogueText("suspects/PersonnelRoster.js", "t_74dbe18716cdd018db34")}${esc(person.name)}${__dialogueText("suspects/PersonnelRoster.js", "t_6d65c3cec938f427f5d1")}${esc(person.occupation)}${__dialogueText("suspects/PersonnelRoster.js", "t_fed48d69b2f478abb2f5")}`;
    }).join('');
    this.renderStatement();this.updateCount();
    if(this.roster.updatedFromPreviousVersion)this.root.querySelector('[data-message]').textContent=__dialogueText("suspects/PersonnelRoster.js", "t_070a69b94aa33997a3b2");
  }
  renderStatement(){
    const s=this.roster.statements[this.selectedStatement];
    this.root.querySelector('[data-speaker]').innerHTML=`<strong>${esc(s.speaker)}</strong><span>${esc(s.speakerRole||__dialogueText("suspects/PersonnelRoster.js", "t_5464a8914419f3a1a237"))}</span>`;
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
