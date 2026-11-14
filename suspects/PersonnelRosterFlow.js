import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  ensurePersonnelRoster as ensureOriginalPersonnelRoster,
  PersonnelRosterView,
  submitPersonnelShortlist
} from './PersonnelRoster.js';
import { saveGameState } from '../gameStatePersistence.js';

export { PersonnelRosterView, submitPersonnelShortlist };

const TEST_FIRST_MISSION = true;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function normalizeFlowState(roster) {
  roster.gridReviewed=roster.gridReviewed===true;
  roster.correctionNoticeShown=roster.correctionNoticeShown===true;
  if(roster.completed&&!Array.isArray(roster.submittedIds)) {
    const excluded=new Set(roster.excludedIds||[]);
    roster.submittedIds=roster.people.filter(p=>!excluded.has(p.id)).map(p=>p.id);
  }
  if(roster.completed) {
    const available=new Set(roster.people.map(p=>p.id));
    if(new Set(roster.submittedIds).size!==roster.submittedIds.length||roster.submittedIds.some(id=>!available.has(id))) {
      throw new Error('Saved personnel shortlist contains invalid IDs.');
    }
  }
  return roster;
}
export function ensurePersonnelRoster(state,suspects) {
  const mission=state.currentMission;
  if(!mission)throw new Error('Personnel review requires an active mission.');
  const index=mission.caseIndex??state.currentCaseIndex??state.caseIndex;
  if(!Number.isInteger(index))throw new Error('Missing campaign case index.');
  let roster;
  if(TEST_FIRST_MISSION&&index===0) {
    const temporaryMission={...mission,caseIndex:1};
    roster=ensureOriginalPersonnelRoster({currentMission:temporaryMission,currentCaseIndex:1,caseIndex:1,
      currentCaseId:state.currentCaseId,caseData:state.caseData},suspects);
    mission.personnelRoster=roster;
    if(roster)roster.firstMissionTest=true;
  } else roster=ensureOriginalPersonnelRoster(state,suspects);
  if(!roster)return null;
  normalizeFlowState(roster);saveGameState();return roster;
}
export function getPersonnelGridGate(state,suspects) {
  const roster=ensurePersonnelRoster(state,suspects);
  if(!roster)return{type:'ready',roster:null,suspectIds:null};
  if(!roster.completed)return{type:'incomplete',roster,suspectIds:null};
  if(roster.gridReviewed)return{type:'ready',roster,suspectIds:[...roster.targetIds]};
  const submitted=new Set(roster.submittedIds);
  const correct=submitted.size===roster.targetIds.length&&roster.targetIds.every(id=>submitted.has(id));
  if(!correct)return{type:'correction',roster,suspectIds:[...roster.targetIds]};
  roster.gridReviewed=true;roster.gridReviewedAt=Date.now();saveGameState();
  return{type:'ready',roster,suspectIds:[...roster.targetIds]};
}
export function acknowledgePersonnelCorrection(roster) {
  if(!roster?.completed)throw new Error('Cannot review an unsubmitted personnel shortlist.');
  roster.correctedIds=[...roster.targetIds];
  roster.gridReviewed=true;roster.gridReviewedAt=Date.now();roster.correctionNoticeShown=true;
  saveGameState();return[...roster.targetIds];
}
export class PersonnelNoticeView {
  constructor(scene,{title,paragraphs=[],people=[],buttonLabel=__dialogueText("suspects/PersonnelRosterFlow.js", "t_31fbef162594de01bab0"),onContinue}) {
    this.scene=scene;this.onContinue=onContinue;this.closed=false;
    this.resize=this.resize.bind(this);this.handleClick=this.handleClick.bind(this);
    this.element=scene.add.dom(0,0).createFromHTML(`${__dialogueText("suspects/PersonnelRosterFlow.js", "t_2e64c80ed043321145a8")}${esc(title)}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_7029b8e289bd339554ee")}${esc(title)}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_cf72b43ccb21f25cfe0f")}${paragraphs.map(text=>`${__dialogueText("suspects/PersonnelRosterFlow.js", "t_01c404f28cdf0e5b23f4")}${esc(text)}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_75276f3cd0194a647ce8")}`).join('')}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_6ba6c11bd8700086c8f0")}${people.length?`${__dialogueText("suspects/PersonnelRosterFlow.js", "t_f112666656e9a300ba7b")}${people.map(p=>`${__dialogueText("suspects/PersonnelRosterFlow.js", "t_f1e1affdd6308460b7a1")}${esc(p.publicProfile?.displayName||p.name||__dialogueText("suspects/PersonnelRosterFlow.js", "t_b764cdc0eab713746721"))}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_76b60927b4e969919709")}${esc(p.publicProfile?.occupation||p.occupation||__dialogueText("suspects/PersonnelRosterFlow.js", "t_48b96e4c334ce913aa98"))}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_bfa69182cac9c884061a")}`).join('')}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_79b85d0b040977f4df4c")}`:''}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_4c074287da5575ef7768")}${esc(buttonLabel)}${__dialogueText("suspects/PersonnelRosterFlow.js", "t_e1fa45551d800192d9ac")}`).setOrigin(0,0).setDepth(30000).setScrollFactor(0);
    this.root=this.element.node.querySelector('[data-personnel-notice]');
    this.root.addEventListener('click',this.handleClick);scene.scale.on('resize',this.resize);
    this.resize();this.root.querySelector('[data-notice-continue]')?.focus();
  }
  resize() {
    if(!this.element?.node||!this.root)return;
    const {width,height}=this.scene.scale;
    Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});
    Object.assign(this.root.style,{width:`${width}px`,height:`${height}px`});
  }
  handleClick(event) {
    const button=event.target?.closest?.('[data-notice-continue]');
    if(!button||!this.root?.contains(button)||this.closed)return;
    this.closed=true;const next=this.onContinue;this.destroy();next?.();
  }
  destroy() {
    this.scene.scale.off('resize',this.resize);
    this.root?.removeEventListener('click',this.handleClick);
    this.element?.destroy();this.element=null;this.root=null;
  }
}
