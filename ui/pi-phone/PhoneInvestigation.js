import {
  PhoneInvestigation as PhoneInvestigationBase,
  eligiblePhoneRule as originalEligible,
  commitPhoneRule,
  phoneCaseProgress as readPhoneProgress
} from './PhoneInvestigationBase.js';
import { selectAlibiDialogueRule, installAlibiDialogueData } from '../pi-computer/AlibiDialogueData.js';
export * from './PhoneInvestigationBase.js';

export function eligiblePhoneRule(contact,terms,known,flags) {
  if (!Array.isArray(terms) || !terms.length || terms.length>2 || new Set(terms).size!==terms.length
    || !terms.every(id=>known.includes(id))) return null;
  return contact.caseId==='borrowed_alibi' ? selectAlibiDialogueRule(contact,terms,known,flags)
    : originalEligible(contact,terms,known,flags);
}
export class PhoneInvestigation extends PhoneInvestigationBase {
  constructor(phone) {
    super(phone);installAlibiDialogueData();this.committingAlibiResponse=false;
    this.beforeCompletionRender=phone.render;
    const previous=phone.render.bind(phone);
    this.completionRender=(...args)=>{
      const result=previous(...args);this.commitCompletedAlibiResponse();return result;
    };
    phone.render=this.completionRender;
  }
  commitCompletedAlibiResponse() {
    const p=this.phone,topic=this.pending,last=p.lines?.[p.lines.length-1];
    const bubble=p.logItems?.[p.logItems.length-1];
    if (this.committingAlibiResponse || this.dead || this.active?.caseId!=='borrowed_alibi'
      || this.phase!=='response' || !topic || !p.isOpen || p.destroyed || p.directoryOpen
      || p.state!=='connected' || p.typingItem || !last || p.lineIndex!==p.lines.length-1
      || !bubble || bubble.typing || bubble.full!==last.text) return;
    this.committingAlibiResponse=true;
    try {commitPhoneRule(this.active.caseId,topic,p.lines);this.pending=null;}
    finally {this.committingAlibiResponse=false;}
  }
  ask() {
    if (this.active?.caseId!=='borrowed_alibi') return super.ask();
    if (this.phase!=='choose' || !this.selected.length || this.phone.directoryOpen) return false;
    const flags=this.phoneCaseFlags();
    const topic=eligiblePhoneRule(this.active,this.selected,this.known(this.active.caseId),flags);
    if (topic) {this.pending=topic;this.play(topic.lines,'response');return true;}
    const definition=this.searchData?.cases.find(c=>c.id===this.active.caseId);
    const words=this.selected.map(id=>definition?.keywords.find(k=>k.id===id)?.label || id).join(' + ');
    const routes={
      '427':'I can check Tuesday service, explain our receipt procedure or give you the receipts email. A customer record requires their written permission.',
      '428':'Ask about the Dinner Companion package, then request its free sample. I cannot verify an actual restaurant visit or disclose customers.',
      '429':'If you dispute my dinner account, compare the original messages, the sample reference and the restaurant evidence. Which part have you established?',
      '430':'Keep my account separate from the others. If you are matching it to a sample, use its actual reference and check the restaurant evidence.',
      '431':'State the dinner evidence you have checked. The company incident is a separate question; my employer’s name is not itself a contradiction.',
      '432':'I can confirm the Tuesday break-in statement or check a specific physical description volunteered by a witness. Restaurant orders belong with the restaurant.'
    };
    const lines=[{speaker:'You',text:`I wanted to ask about ${words}.`},
      {speaker:this.active.name,text:routes[this.active.number] || 'Please separate the person, source document and claim you want checked.'}];
    this.pending={id:'general_enquiry',grantFlags:[],lines};this.play(lines,'response');return true;
  }
  phoneCaseFlags() {return readPhoneProgress(this.active.caseId).flags || [];}
  destroy() {
    if (this.phone?.render===this.completionRender) this.phone.render=this.beforeCompletionRender;
    super.destroy();
  }
}
