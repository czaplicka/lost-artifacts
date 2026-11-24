import { PERSONNEL_TEXT } from './PersonnelRoster.js';
import { formatPersonnelClock as sharedPersonnelClock, joinPersonnelInstructions } from './PersonnelClock.js';
const ATTENDANCE_VERSION=1;
const STYLE_ID='personnel-attendance-styles';
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function integer(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function substitute(text,values){return String(text??'').replace(/\{(\w+)\}/g,(all,key)=>values[key]??all);}
function attendanceText(key){
  const value=PERSONNEL_TEXT.attendance?.[key];
  if(typeof value!=='string')throw Error(`Missing personnel attendance text: ${key}. Install the text catalog and reload the game.`);
  return value;
}
export function formatPersonnelClock(minute,withDay=false){return sharedPersonnelClock(minute,withDay,PERSONNEL_TEXT.attendance?.clockDay);}
function crimeWindowOf(state){
  const window=state.caseData?.crimeWindow;
  if(!Number.isInteger(window?.startMinute)||!Number.isInteger(window?.endMinute)||window.endMinute<=window.startMinute)throw Error('Personnel access records require a valid crime time window.');
  return{startMinute:window.startMinute,endMinute:window.endMinute};
}
export function personnelLogExcludesWindow(log,window){return log?.verified===true&&(log.lastExitMinute<window.startMinute||log.firstEntryMinute>window.endMinute);}
export function getTimeClearedPersonnelIds(roster){const window=roster.attendance?.crimeWindow;if(!window)return[];return roster.people.filter(person=>personnelLogExcludesWindow(person.accessLog,window)).map(person=>person.id);}
function validate(roster,window){
  const people=roster.people,targets=new Set(roster.targetIds);
  if(!Array.isArray(people)||people.length!==50||new Set(people.map(p=>p.id)).size!==50||targets.size!==10||[...targets].some(id=>!people.some(p=>p.id===id)))throw Error('Personnel access records require the existing fifty people and ten canonical suspects.');
  const cleared=new Set(roster.statements.flatMap(s=>s.clearedIds||[]));
  if(cleared.size!==40||[...targets].some(id=>cleared.has(id))||[...cleared].some(id=>!people.some(p=>p.id===id)))throw Error('Personnel access records cannot change the existing forty-person solution.');
  if(roster.attendance){
    const pairs=new Set();
    for(const person of people){const log=person.accessLog;
      if(!Number.isInteger(log?.firstEntryMinute)||!Number.isInteger(log?.lastExitMinute)||log.firstEntryMinute>=log.lastExitMinute||log.verified!==true)throw Error('Saved personnel access records are invalid.');
      pairs.add(`${log.firstEntryMinute}:${log.lastExitMinute}`);
      if(targets.has(person.id)&&personnelLogExcludesWindow(log,window))throw Error('An access record contradicts the canonical shortlist.');
    }
    if(pairs.size!==people.length)throw Error('Saved personnel access records contain duplicate time pairs.');
    for(const id of getTimeClearedPersonnelIds(roster))if(!cleared.has(id))throw Error('An access record excludes someone outside the existing solution.');
  }
}
function categoryHint(statement,people){
  const ids=new Set(statement.clearedIds||[]),jobs=[...new Set(people.filter(p=>ids.has(p.id)).map(p=>p.occupation).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'en'));
  return jobs.length?substitute(attendanceText('jobCategoryHint'),{jobs:jobs.join('; ')}):statement.hint;
}
function uniqueLog(factory,used){for(let attempt=0;attempt<10000;attempt++){const log=factory(),key=`${log.firstEntryMinute}:${log.lastExitMinute}`;if(log.firstEntryMinute<log.lastExitMinute&&!used.has(key)){used.add(key);return{...log,verified:true};}}throw Error('Could not generate varied personnel access records.');}
export function ensurePersonnelAttendance(state,roster){
  if(!roster)return null;const window=crimeWindowOf(state);
  if(roster.attendance?.version===ATTENDANCE_VERSION){
    const saved=roster.attendance.crimeWindow;if(!saved||saved.startMinute!==window.startMinute||saved.endMinute!==window.endMinute)throw Error('Saved personnel access records belong to a different crime window.');
    validate(roster,window);return roster;
  }
  if(roster.attendance)throw Error('Unsupported personnel attendance version.');validate(roster,window);
  const people=roster.people.map(person=>({...person})),offsets=[25,35,45,55,70,85,100,115,130,145,160,175],leads=shuffle(offsets),tails=shuffle(offsets);
  const statements=roster.statements.map((statement,index)=>{
    const next={...statement},from=window.startMinute-leads[index%leads.length]-Math.floor(index/leads.length),to=window.endMinute+tails[index%tails.length]+Math.floor(index/tails.length);
    next.alibiStartMinute=from;next.alibiEndMinute=to;
    const data=next.kind==='job'?PERSONNEL_TEXT.jobs?.[next.collectionId]:PERSONNEL_TEXT[next.kind];
    const member=people.find(p=>(next.clearedIds||[]).includes(p.id));
    const floor=member?.floor===0?PERSONNEL_TEXT.ui.ground:substitute(PERSONNEL_TEXT.ui.floor,{floor:member?.floor});
    const values={from:formatPersonnelClock(from,true),to:formatPersonnelClock(to,true),floor};
    if(data){next.text=substitute(data.text,values);next.corroboration=substitute(data.note,values);next.hint=substitute(data.hint,values);}
    if(next.kind==='job')next.hint=categoryHint(next,people);return next;
  });
  const targetIds=new Set(roster.targetIds),outside=shuffle(people.filter(p=>!targetIds.has(p.id))).slice(0,8),early=new Set(outside.slice(0,4).map(p=>p.id)),late=new Set(outside.slice(4).map(p=>p.id)),used=new Set();
  for(const person of people){
    const accounts=statements.filter(s=>(s.clearedIds||[]).includes(person.id));
    const before=Math.min(window.startMinute,...accounts.map(s=>s.alibiStartMinute)),after=Math.max(window.endMinute,...accounts.map(s=>s.alibiEndMinute));
    person.accessLog=uniqueLog(()=>{
      if(early.has(person.id)){const lastExitMinute=before-integer(45,150);return{firstEntryMinute:lastExitMinute-integer(45,240),lastExitMinute};}
      if(late.has(person.id)){const firstEntryMinute=after+integer(45,150);return{firstEntryMinute,lastExitMinute:firstEntryMinute+integer(45,240)};}
      return{firstEntryMinute:before-integer(45,240),lastExitMinute:after+integer(45,240)};
    },used);
  }
  const attendance={version:ATTENDANCE_VERSION,mode:'first-entry-last-exit',crimeWindow:window,verifiedPerimeter:true,intermediateTripsOmitted:true};
  validate({...roster,people,statements,attendance},window);roster.people=people;roster.statements=statements;roster.attendance=attendance;return roster;
}
const ENTER='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v18h-7M3 12h13M11 7l5 5-5 5"/></svg>';
const EXIT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3H3v18h7M9 12h12M16 7l5 5-5 5"/></svg>';
function installStyles(){
  if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`.personnel-roster .personnel-access-times{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px;width:100%;padding-right:32px;flex-shrink:0;color:#463925;font:12px SpecialElite,monospace;font-variant-numeric:tabular-nums;line-height:1.3;text-align:left}.personnel-access-times>span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.personnel-access-times svg{display:block;width:13px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}.personnel-roster .personnel-access-context{flex-shrink:0;border:1px solid #b49a70;padding:7px 10px;background:#f7edd4;font-size:13px;line-height:1.35}.personnel-access-context .personnel-access-window{display:block;color:#71392e;font-size:16px;margin-bottom:2px}.personnel-access-context details{margin-top:3px}.personnel-access-context summary{cursor:pointer;width:fit-content}.personnel-access-context p{margin:5px 0 0}@media(max-width:700px){.personnel-roster .personnel-access-context{font-size:12px;padding:5px 7px}.personnel-access-context .personnel-access-window{font-size:14px}}`;
  document.head.append(style);
}
export class PersonnelAttendanceView {
  constructor(view){
    Object.assign(this,{view,root:view.root,destroyed:false,banner:null,observer:null});this.destroy=this.destroy.bind(this);
    if(!this.root||!view.roster.attendance)return;installStyles();this.installHintReview();this.installBanner();this.decorate();
    const grid=this.root.querySelector('[data-grid]');if(grid){this.observer=new MutationObserver(()=>this.decorate());this.observer.observe(grid,{childList:true,subtree:true});}
    view.scene.events.once('shutdown',this.destroy);view.scene.events.once('destroy',this.destroy);
  }
  installHintReview(){
    const help=this.view.help;if(!help)return;
    this.help=help;this.previousHelpText=help.text;
    const previous=help.text&&typeof help.text==='object'?help.text:{};
    this.patchedHelpText={...previous,instructions:joinPersonnelInstructions(previous.instructions,attendanceText('hintInstructions'))};
    help.text=this.patchedHelpText;
    this.previousReceipt=help.receipt;
    if(typeof this.previousReceipt==='function'){
      const original=this.previousReceipt;
      this.receiptWrapper=function(definition){const receipt=original.call(this,definition);return receipt?{...receipt,text:definition.text}:null;};
      help.receipt=this.receiptWrapper;
    }
    help.refresh?.();
  }
  installBanner(){
    const window=this.view.roster.attendance.crimeWindow,banner=document.createElement('div');banner.className='personnel-access-context';
    const time=document.createElement('span');time.className='personnel-access-window';time.setAttribute('data-access-window','');
    time.textContent=substitute(attendanceText('theftWindow'),{from:formatPersonnelClock(window.startMinute,true),to:formatPersonnelClock(window.endMinute,true)});
    const summary=document.createElement('span');summary.textContent=attendanceText('gateSummary');
    const details=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('p');title.textContent=attendanceText('gateDetailsTitle');body.textContent=attendanceText('gateDetails');details.append(title,body);banner.append(time,summary,details);
    const header=this.root.querySelector('.personnel-header');if(header)header.after(banner);else this.root.prepend(banner);this.banner=banner;
  }
  decorate(){
    if(this.destroyed||!this.root)return;
    const byId=new Map(this.view.roster.people.map(p=>[String(p.id),p]));
    for(const card of this.root.querySelectorAll('[data-grid] [data-person]')){
      if(card.querySelector('[data-access-times]'))continue;const person=byId.get(card.dataset.person);if(!person?.accessLog)continue;
      const bar=document.createElement('span');bar.className='personnel-access-times';bar.setAttribute('data-access-times','');
      for(const[label,value,icon]of[[attendanceText('firstEntry'),person.accessLog.firstEntryMinute,ENTER],[attendanceText('lastExit'),person.accessLog.lastExitMinute,EXIT]]){
        const item=document.createElement('span');item.title=substitute(attendanceText('timeTooltip'),{label,time:formatPersonnelClock(value,true)});item.setAttribute('aria-label',item.title);item.innerHTML=icon;
        const time=document.createElement('span');time.textContent=formatPersonnelClock(value);item.append(time);bar.append(item);
      }card.prepend(bar);
    }
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.observer?.disconnect();this.observer=null;this.banner?.remove();this.banner=null;
    const help=this.help;
    if(help){if(this.receiptWrapper&&help.receipt===this.receiptWrapper)help.receipt=this.previousReceipt;if(help.text===this.patchedHelpText)help.text=this.previousHelpText;}
    this.view.scene.events.off('shutdown',this.destroy);this.view.scene.events.off('destroy',this.destroy);this.root=null;
  }
}
