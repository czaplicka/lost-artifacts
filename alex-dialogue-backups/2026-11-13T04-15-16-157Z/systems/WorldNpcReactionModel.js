import { latestOfficeReaction, readWorldReactions } from './WorldReactionModel.js';

const NPCS=new Set(['archivist_drebin','alex_murphy']);
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const LINES={
  alex_murphy:{
    agency_convicted:[
      'Heard about the verdict. Nice work. I’m still counting the equipment back in.',
      'Legal says congratulations. Stores says check your pockets.'
    ],
    agency_released:[
      'The court released them. Then that’s what goes in the record.',
      'We don’t issue replacement verdicts. I checked the catalogue.'
    ],
    agency_time_expired:[
      'Ran out of time? Equipment back on the counter, please.',
      'We can replace a torch. The extra afternoon is still on back order.'
    ],
    agency_suspect_arrested:[
      'You got someone in cuffs. Good.',
      'I’ll wait for the court before ordering the commemorative mugs.'
    ],
    agency_pursuit_escape:[
      'Lost them in the chase? Right.',
      'Put the footwear complaint in writing. The shoes have already submitted theirs.'
    ],
    agency_arrest_missing_warrant:[
      'You remembered the handcuffs and forgot the warrant.',
      'That’s a very physical interpretation of procedure.'
    ],
    agency_arrest_warrant_mismatch:[
      'The warrant had the wrong name?',
      'Try not to solve that with a different pen.'
    ],
    agency_empty_apartment:[
      'Empty flat? At least the handcuffs are still in stock.',
      'Don’t mark them as surplus. Management gets ideas.'
    ],
    agency_wrong_arrest_attempt:[
      'Wrong lead, no suspect. Not the operation you wanted.',
      'The forms still want completing. They have no sense of occasion.'
    ]
  },
  archivist_drebin:{
    agency_convicted:[
      'A conviction. Excellent. A conclusion with a court attached.',
      'The verdict belongs with the report. They tend to drift apart if left unsupervised.'
    ],
    agency_released:[
      'The court released the defendant. The archive will record that outcome.',
      'An inconvenient result still gets a folder. We are remarkably inclusive that way.'
    ],
    agency_time_expired:[
      'Unresolved when the time ran out. That goes in the record too.',
      'An unfinished enquiry is not an empty folder. Please don’t make me demonstrate the difference.'
    ],
    agency_suspect_arrested:[
      'An arrest is recorded. A verdict is not.',
      'They are different entries. I have spent years defending this distinction from enthusiastic handwriting.'
    ],
    agency_pursuit_escape:[
      'The pursuit ended without a detention. I’ll keep the description precise.',
      '“Almost” is not a recognised case status.'
    ],
    agency_arrest_missing_warrant:[
      'No warrant, no completed arrest.',
      'Leaving the document out does not make the file lighter in any useful sense.'
    ],
    agency_arrest_warrant_mismatch:[
      'The warrant names someone else. Keep that discrepancy in the report.',
      'The archive does not accept retroactive spelling corrections to people.'
    ],
    agency_empty_apartment:[
      'The address was reached. The suspect was not found there.',
      'I shall resist the temptation to file a statement from the furniture.'
    ],
    agency_wrong_arrest_attempt:[
      'An operation based on the wrong lead, with no suspect detained.',
      'That is what the record says. Do not improve it on the way to my desk.'
    ]
  }
};

function seenKey(npcId,eventId){return JSON.stringify([npcId,eventId]);}
function seenEntries(state){
  const value=readWorldReactions(state).npcSeen;
  if(value===undefined)return[];
  if(!Array.isArray(value))throw new Error('[WorldNPC] Invalid npcSeen history; it was not overwritten.');
  return value;
}
export function getWorldNpcReaction(state,npcId,{caseId=null}={}){
  if(!NPCS.has(npcId))return null;
  const event=latestOfficeReaction(state,'agency');
  if(!event||!['public','agency'].includes(event.visibility)||
    (caseId!==null&&!same(event.caseId,caseId)))return null;
  const lines=LINES[npcId][event.kind];
  if(!lines||seenEntries(state).includes(seenKey(npcId,event.id)))return null;
  return{
    npcId,eventId:event.id,
    lines:[`About the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.`,...lines]
  };
}
export function markWorldNpcReaction(state,npcId,eventId){
  if(!NPCS.has(npcId))return false;
  const history=readWorldReactions(state);
  if(!history.events.some(event=>event.id===eventId&&event.system==='agency'&&same(event.campaignId,state._createdAt)))return false;
  const seen=seenEntries(state),key=seenKey(npcId,eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,npcSeen:[...seen,key]};
  return true;
}
