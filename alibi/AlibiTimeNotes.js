import { gameState } from '../GameData.js';
import { getAlibiKnowledge, ALIBI_MISSING_DETAIL } from './AlibiKnowledge.js';

const MINUTES_PER_DAY=1440;
export function formatNoteTime(minute){
  if(!Number.isInteger(minute))return '?';
  const normalized=((minute%MINUTES_PER_DAY)+MINUTES_PER_DAY)%MINUTES_PER_DAY;
  return `${String(Math.floor(normalized/60)).padStart(2,'0')}:${String(normalized%60).padStart(2,'0')}`;
}
function context(caseKey,suspectId,card){
  const subject=gameState.caseData?.alibiCases?.[caseKey]?.suspects?.find(s=>s.suspectId===suspectId);
  const witness=subject?.witnesses?.find(w=>w.timelineCard?.id===card?.id);
  return {subject,witness,known:Boolean(witness&&getAlibiKnowledge(caseKey,witness.npcId).details)};
}
function minute(text){const m=String(text).match(/^([01]\d|2[0-3]):([0-5]\d)$/);return m?Number(m[1])*60+Number(m[2]):null;}
function explicitIntervals(statement){
  const ranges=[];
  // Generated witness times use formatAlibiTime(): two-digit 24-hour HH:MM.
  const pattern=/\b(?:from|throughout|between)\s+([0-2]\d:[0-5]\d)\s*(?:to|until|and|through|[–—-])\s*([0-2]\d:[0-5]\d)\b/gi;
  for(const m of String(statement||'').matchAll(pattern)){
    const start=minute(m[1]),endClock=minute(m[2]);
    if(start===null||endClock===null)continue;
    const endDayOffset=endClock<start?1:0;
    // Store a continuous interval relative to its stated start day. Clock
    // formatting wraps it back to HH:MM; no independent calendar date is inferred.
    const end=endClock+endDayOffset*MINUTES_PER_DAY;
    if(ranges.some(r=>r.startMinute===start&&r.endMinute===end))continue;
    ranges.push({startMinute:start,endMinute:end,endDayOffset,crossesMidnight:endDayOffset===1,
      label:'Claimed observation interval',dayLabel:'Date as stated by witness'});
  }
  return ranges;
}
function intervalLabel(range){
  return `${formatNoteTime(range.startMinute)}–${formatNoteTime(range.endMinute)}${range.crossesMidnight?' (ends next day)':''}`;
}
export function getAlibiTimeNote(caseKey,suspectId,card){
  const {witness,known}=context(caseKey,suspectId,card);
  if(!known)return {eventTime:null,ranges:[],hasKnownScenario:false,detailsLocked:true,eventLabel:'Time not obtained',rangeLabel:'Unknown'};
  const ranges=explicitIntervals(witness.statement);
  const eventTime=Number.isInteger(witness.timelineCard?.minute)?witness.timelineCard.minute:null;
  return {eventTime,ranges,hasKnownScenario:false,detailsLocked:false,
    eventLabel:eventTime===null?'No exact event time stated':`Event: ${formatNoteTime(eventTime)}`,
    rangeLabel:ranges.length?ranges.map(intervalLabel).join(' / '):'No explicit interval stated'};
}
export function getAlibiTimeDetail(caseKey,suspectId,card){
  const note=getAlibiTimeNote(caseKey,suspectId,card);
  if(note.detailsLocked)return ALIBI_MISSING_DETAIL;
  return [note.eventLabel,...note.ranges.map(r=>`${r.dayLabel}: ${intervalLabel(r)} — ${r.label}`),
    !note.ranges.length?'No continuous observation interval was explicitly recorded.':'',
    'These are recorded claims, not independent proof. Check the date and wording in the statement.'].filter(Boolean).join('\n');
}
export function getAlibiCardBody(caseKey,suspectId,card){
  const {known,witness}=context(caseKey,suspectId,card);
  if(!known)return ALIBI_MISSING_DETAIL;
  const note=getAlibiTimeNote(caseKey,suspectId,card);
  const summary=String(witness.timelineCard?.label||'').replace(/^\d{2}:\d{2}\s*[—–-]\s*/,'');
  return [note.eventLabel,note.ranges.length?`Observation: ${note.rangeLabel}`:'No continuous interval recorded',summary].join('\n');
}
