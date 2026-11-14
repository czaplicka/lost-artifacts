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
  constructor(scene,{title,paragraphs=[],people=[],buttonLabel='Continue',onContinue}) {
    this.scene=scene;this.onContinue=onContinue;this.closed=false;
    this.resize=this.resize.bind(this);this.handleClick=this.handleClick.bind(this);
    this.element=scene.add.dom(0,0).createFromHTML(`
      <section data-personnel-notice role="dialog" aria-modal="true" aria-label="${esc(title)}" style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;background:#17110f;color:#2d1d14;pointer-events:auto;font-family:SpecialElite,monospace;">
        <div style="box-sizing:border-box;display:flex;flex-direction:column;width:min(760px,100%);max-height:100%;border:5px solid #69462f;background:#e8d8b3;box-shadow:8px 10px 0 #0006;overflow:hidden;">
          <div style="padding:24px;overflow:auto;min-height:0;overscroll-behavior:contain;">
            <p style="color:#875c43;letter-spacing:2px;font-size:13px;margin:0 0 12px;">MARK AGENCY / INTERNAL CORRESPONDENCE</p>
            <h1 style="color:#722b28;font-size:30px;margin:0 0 24px;">${esc(title)}</h1>
            ${paragraphs.map(text=>`<p style="margin:0 0 18px;line-height:1.5;font-size:20px;">${esc(text)}</p>`).join('')}
            ${people.length?`<section style="margin:24px 0;border-top:1px dashed #795b3e;padding-top:18px;"><h2 style="font-size:21px;margin:0 0 12px;">Corrected shortlist</h2><ul style="margin:0;padding-left:22px;line-height:1.6;font-size:18px;">${people.map(p=>`<li>${esc(p.publicProfile?.displayName||p.name||'Unknown')} <span style="color:#705641;">— ${esc(p.publicProfile?.occupation||p.occupation||'Staff member')}</span></li>`).join('')}</ul></section>`:''}
          </div>
          <footer style="padding:16px 24px;border-top:2px solid #b39569;flex-shrink:0;text-align:right;">
            <button type="button" data-notice-continue style="padding:13px 18px;border:2px solid #492419;background:#75352b;color:#fff0d0;font:inherit;font-size:18px;cursor:pointer;pointer-events:auto;">${esc(buttonLabel)}</button>
          </footer>
        </div>
      </section>`).setOrigin(0,0).setDepth(30000).setScrollFactor(0);
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
