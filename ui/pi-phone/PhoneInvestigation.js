import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  PhoneInvestigation as PhoneInvestigationBase,
  eligiblePhoneRule as originalEligible,
  commitPhoneRule,
  phoneCaseProgress as readPhoneProgress
} from './PhoneInvestigationBase.js';
import { selectAlibiDialogueRule, installAlibiDialogueData } from '../pi-computer/AlibiDialogueData.js';
import { installAlibiClubDialogue, selectAlibiClubRule } from '../pi-computer/AlibiClubDialogue.js';
export * from './PhoneInvestigationBase.js';

export function eligiblePhoneRule(contact,terms,known,flags) {
  if (!Array.isArray(terms) || !terms.length || terms.length>2 || new Set(terms).size!==terms.length
    || !terms.every(id=>known.includes(id))) return null;
  if (contact.caseId==='borrowed_alibi' && contact.number==='428') {
    return selectAlibiClubRule(contact,terms,known,flags);
  }
  return contact.caseId==='borrowed_alibi' ? selectAlibiDialogueRule(contact,terms,known,flags)
    : originalEligible(contact,terms,known,flags);
}
export class PhoneInvestigation extends PhoneInvestigationBase {
  constructor(phone) {
    super(phone);
    installAlibiDialogueData();
    installAlibiClubDialogue();
    this.committingAlibiResponse=false;
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
      '427':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_ebc2454fc91a43a6960a"),
      '428':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_fedae9eebdbc4754f87e"),
      '429':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_9e9c69a942b63c772b33"),
      '430':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_c3c19f9200d40f4ad882"),
      '431':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_815b8fa0e16cd052613c"),
      '432':__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_15810d9448ea5256244e")
    };
    const lines=[{speaker:__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_08b041935798fbf6fd6f"),text:`${__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_1287962b7f5c25b7feb2")}${words}${__dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_cdb4ee2aea69cc6a8333")}`},
      {speaker:this.active.name,text:routes[this.active.number] || __dialogueText("ui/pi-phone/PhoneInvestigation.js", "t_c080376201c055677053")}];
    this.pending={id:'general_enquiry',grantFlags:[],lines};this.play(lines,'response');return true;
  }
  phoneCaseFlags() {return readPhoneProgress(this.active.caseId).flags || [];}
  destroy() {
    if (this.phone?.render===this.completionRender) this.phone.render=this.beforeCompletionRender;
    super.destroy();
  }
}
