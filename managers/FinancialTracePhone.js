import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { financialTraceData as DATA,getFinancialTraceStory,storeFinancialTrace } from '../financialTraceService.js';
import { advanceFinancialCompany } from '../scenes/financial/FinancialTraceModel.js';
export function installFinancialTracePhone(p){
 if(p._financialTraceInstalled||!p.investigation)return;p._financialTraceInstalled=true;
 let active=false,review=false;const originalContacts=p.investigation.contacts.bind(p.investigation);
 p.investigation.contacts=()=>{
  const base=originalContacts(),s=getFinancialTraceStory();if(!s.eligible||!s.alteredId)return base;
  const used=new Set([...(p.data.contacts||[]),...base].map(c=>c.number));
  const number=[DATA.company.number,...Array.from({length:20},(_,i)=>String(780+i))].find(n=>!used.has(n));
  return number?[...base,{...DATA.company,number}]:base;
 };
 const connect=p.connect.bind(p);p.connect=contact=>{
  if(contact.id!==DATA.company.id){active=false;return connect(contact);}
  const s=getFinancialTraceStory();if(!s.eligible||!s.alteredId){p.finishCall(__dialogueText("managers/FinancialTracePhone.js", "t_4a7e6d414c5230639894"));return;}
  p.cancelActivity();p.investigation.resetCall();active=true;review=s.companyCompleted;p.state='connected';p.contactName=DATA.company.name;
  p.lines=structuredClone(DATA.companyLines);p.lineIndex=review?0:s.companyLine;p.callStart=p.scene.time.now;p.clearLog();p.showDialogueLine();
 };
 const next=p.nextLine.bind(p);p.nextLine=()=>{
  if(!active)return next();if(p.state!=='connected'||p.directoryOpen)return;
  if(p.typingItem){p.finishTyping(p.typingItem);return;}
  if(review){if(p.lineIndex<p.lines.length-1){p.lineIndex++;p.showDialogueLine();}else{active=false;p.finishCall(__dialogueText("managers/FinancialTracePhone.js", "t_c346b4f5de19e4ba2cd9"));}return;}
  const s=advanceFinancialCompany(DATA,getFinancialTraceStory()),result=storeFinancialTrace(s);
  if(!result.success){active=false;p.finishCall(__dialogueText("managers/FinancialTracePhone.js", "t_cd897b50f7ade02be092"));return;}
  if(s.companyCompleted){active=false;p.finishCall(DATA.messages.complete+(result.saved?'':`${__dialogueText("managers/FinancialTracePhone.js", "t_36a9e7f1c95b82ffb997")}${DATA.messages.saveFailed}`));}
  else{p.lineIndex=s.companyLine;p.showDialogueLine();}
 };
 const hang=p.hangUp.bind(p);p.hangUp=()=>{active=false;return hang();};const close=p.close.bind(p);p.close=()=>{active=false;return close();};
}
