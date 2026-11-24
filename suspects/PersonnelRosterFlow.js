import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import {
  ensurePersonnelRoster as ensureOriginalPersonnelRoster,
  PersonnelRosterView as BasePersonnelRosterView,
  submitPersonnelShortlist
} from './PersonnelRoster.js';
import { recoveryRoster, personnelContext } from './PersonnelPortraits.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { PersonnelCardZoom } from './PersonnelCardZoom.js';
import { ensurePersonnelAttendance, PersonnelAttendanceView } from './PersonnelAttendance.js';
import {
  normalizePersonnelFlowState, personnelFlowSnapshot,
  personnelFlowChanged, reviewPersonnelShortlist
} from './PersonnelFlowState.js';
import { loadPersonnelFlowTexts } from './PersonnelFlowText.js';
export { submitPersonnelShortlist };

export class PersonnelRosterView extends BasePersonnelRosterView {
  prepareRoster(roster){
    const context=this.context||personnelContext(roster);
    if(!context)throw Error('Personnel case context is unavailable.');
    const before=personnelFlowSnapshot(roster);
    normalizePersonnelFlowState(roster);
    ensurePersonnelAttendance(context.state,roster);
    if(personnelFlowChanged(before,roster))requestAutosave();
  }
  onRosterReady(){
    this.onRosterUnavailable();
    this.attendanceView=new PersonnelAttendanceView(this);
    this.cardZoom=new PersonnelCardZoom(this);
    if(this.roster.submissionRepairNotice){
      const activeRoster=this.roster;
      void loadPersonnelFlowTexts().then(text=>{
        if(!this.dead&&this.roster===activeRoster)this.message(text.submissionReset);
      }).catch(error=>console.error('[PersonnelRosterFlow] Text:',error));
    }
  }
  onRosterUnavailable(){
    this.cardZoom?.destroy();this.cardZoom=null;
    this.attendanceView?.destroy();this.attendanceView=null;
  }
  destroy(){this.onRosterUnavailable();super.destroy();}
}

function prepareFlow(state,suspects){
  const roster=ensureOriginalPersonnelRoster(state,suspects);
  if(!roster||roster.recovery)return{roster,changed:false};
  const before=personnelFlowSnapshot(roster);
  try{
    // Repair the submission without changing people, clues, exclusions or attendance.
    normalizePersonnelFlowState(roster);
    ensurePersonnelAttendance(state,roster);
    return{roster,changed:personnelFlowChanged(before,roster)};
  }catch(error){
    // A submission repair is still a real change, even if attendance needs recovery.
    return{roster:recoveryRoster(state,suspects,error),changed:personnelFlowChanged(before,roster)};
  }
}
export function ensurePersonnelRoster(state,suspects){
  const prepared=prepareFlow(state,suspects);
  if(prepared.changed)requestAutosave();
  return prepared.roster;
}
export function getPersonnelGridGate(state,suspects){
  const prepared=prepareFlow(state,suspects),roster=prepared.roster;
  let changed=prepared.changed;
  const finish=value=>{if(changed)requestAutosave();return value;};
  if(!roster)return finish({type:'ready',roster:null,suspectIds:null});
  if(roster.recovery||!roster.completed)return finish({type:'incomplete',roster,suspectIds:null});
  if(roster.gridReviewed)return finish({type:'ready',roster,suspectIds:[...roster.targetIds]});
  const submitted=new Set(roster.submittedIds);
  const correct=submitted.size===roster.targetIds.length&&roster.targetIds.every(id=>submitted.has(id));
  if(!correct)return finish({type:'correction',roster,suspectIds:[...roster.targetIds]});
  roster.gridReviewed=true;roster.gridReviewedAt=Date.now();changed=true;
  return finish({type:'ready',roster,suspectIds:[...roster.targetIds]});
}
export function acknowledgePersonnelCorrection(roster){
  if(!roster||roster.recovery)return[];
  const repaired=normalizePersonnelFlowState(roster);
  if(!roster.completed){if(repaired)requestAutosave();return[];}
  const reviewed=reviewPersonnelShortlist(roster);
  if(repaired||reviewed)requestAutosave();
  return[...roster.targetIds];
}

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class PersonnelNoticeView {
  constructor(scene,{
    title,paragraphs=[],people=[],
    buttonLabel=__dialogueText('suspects/PersonnelRosterFlow.js','t_31fbef162594de01bab0'),
    onContinue
  }){
    Object.assign(this,{scene,onContinue,closed:false,destroyed:false});
    this.resize=this.resize.bind(this);this.handleClick=this.handleClick.bind(this);
    const names=people.map(p=>p.publicProfile?.displayName||p.name||'');
    const occupations=people.map(p=>p.publicProfile?.occupation||p.occupation||'');
    this.element=scene.add.dom(0,0).createFromHTML(`
      <section data-personnel-notice role="dialog" aria-modal="true" aria-busy="true" aria-label="${esc(title)}" style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;background:#17110f;color:#2d1d14;pointer-events:auto;font-family:SpecialElite,monospace">
        <div style="box-sizing:border-box;display:flex;flex-direction:column;width:min(760px,100%);max-height:100%;border:5px solid #69462f;background:#e8d8b3;box-shadow:8px 10px 0 #0006;overflow:hidden">
          <div style="padding:24px;overflow:auto;min-height:0;overscroll-behavior:contain">
            <p data-notice-header style="color:#875c43;letter-spacing:2px;font-size:13px;margin:0 0 12px"></p>
            <h1 style="color:#722b28;font-size:30px;margin:0 0 24px">${esc(title)}</h1>
            ${paragraphs.map(value=>`<p style="margin:0 0 18px;line-height:1.5;font-size:20px">${esc(value)}</p>`).join('')}
            ${people.length?`<section style="margin:24px 0;border-top:1px dashed #795b3e;padding-top:18px"><h2 data-notice-shortlist style="font-size:21px;margin:0 0 12px"></h2><ul style="margin:0;padding-left:22px;line-height:1.6;font-size:18px">${people.map((_,index)=>`<li><span data-notice-person-name>${esc(names[index])}</span> <span style="color:#705641">— <span data-notice-person-job>${esc(occupations[index])}</span></span></li>`).join('')}</ul></section>`:''}
          </div>
          <footer style="padding:16px 24px;border-top:2px solid #b39569;flex-shrink:0;text-align:right">
            <button type="button" data-notice-continue style="padding:13px 18px;border:2px solid #492419;background:#75352b;color:#fff0d0;font:inherit;font-size:18px;cursor:pointer;pointer-events:auto">${esc(buttonLabel)}</button>
          </footer>
        </div>
      </section>`).setOrigin(0,0).setDepth(30000).setScrollFactor(0);
    this.root=this.element.node.querySelector('[data-personnel-notice]');
    this.root.addEventListener('click',this.handleClick);
    scene.scale.on('resize',this.resize);
    scene.events.once('shutdown',this.destroy,this);
    scene.events.once('destroy',this.destroy,this);
    this.resize();this.root.querySelector('[data-notice-continue]')?.focus();
    void loadPersonnelFlowTexts().then(text=>{
      if(this.destroyed||!this.root)return;
      this.root.querySelector('[data-notice-header]').textContent=text.correspondenceHeader;
      const heading=this.root.querySelector('[data-notice-shortlist]');if(heading)heading.textContent=text.correctedShortlist;
      this.root.querySelectorAll('[data-notice-person-name]').forEach((node,index)=>{node.textContent=names[index]||text.unknownPerson;});
      this.root.querySelectorAll('[data-notice-person-job]').forEach((node,index)=>{node.textContent=occupations[index]||text.staffMember;});
      this.root.setAttribute('aria-busy','false');
    }).catch(error=>{
      console.error('[PersonnelNoticeView] Text catalog unavailable:',error);
      // The supplied title, explanation, known names and continue button remain usable.
      if(this.root){this.root.setAttribute('aria-busy','false');this.root.dataset.textLoadFailed='true';}
    });
  }
  resize(){
    if(!this.element?.node||!this.root)return;
    const{width,height}=this.scene.scale;
    Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});
    Object.assign(this.root.style,{width:`${width}px`,height:`${height}px`});
  }
  handleClick(event){
    const button=event.target?.closest?.('[data-notice-continue]');
    if(!button||!this.root?.contains(button)||this.closed)return;
    this.closed=true;const next=this.onContinue;this.destroy();next?.();
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;
    this.scene.scale.off('resize',this.resize);
    this.scene.events.off('shutdown',this.destroy,this);
    this.scene.events.off('destroy',this.destroy,this);
    this.root?.removeEventListener('click',this.handleClick);
    this.element?.destroy();this.element=null;this.root=null;
  }
}
