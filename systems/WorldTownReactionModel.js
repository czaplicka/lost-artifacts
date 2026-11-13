import { latestWorldNewspaperEvent, readWorldReactions } from './WorldReactionModel.js';

const NPCS=new Set(['bartender','regular','guest']);
const RESPONSES={
  bartender:{
    agency_convicted:'The court returned a conviction. That’s a result, then. I’ll still need you to settle your own bill separately.',
    agency_released:'The defendant was released. That’s what the bulletin says. I’m not letting anyone hold a second trial at the bar.',
    agency_suspect_arrested:'Someone’s been detained. The court hasn’t decided the case yet. People tend to stop listening halfway through that sentence.',
    agency_pursuit_escape:'The pursuit ended without an arrest. The bulletin doesn’t give a next destination. I’ve got opinions, not directions.',
    agency_time_expired:'The inquiry ended without a resolution. Not every story gets a neat ending. Most evenings here don’t even get a neat table.'
  },
  regular:{
    agency_convicted:'A conviction. I’ll have to retire at least three theories. A difficult evening for independent research.',
    agency_released:'Released, according to the bulletin. No, I don’t have inside information. I have a newspaper and a carrying voice.',
    agency_suspect_arrested:'An arrest! I was about to announce that I’d solved it. Apparently they’re still insisting on a hearing.',
    agency_pursuit_escape:'They lost the suspect in the chase. I have a theory, naturally. It contains no information you could responsibly use.',
    agency_time_expired:'Still unresolved. I’ve left room in my notebook. Mostly by removing the facts I was never particularly attached to.'
  },
  guest:{
    agency_convicted:'I read the verdict. I’m glad there’s an outcome. I’m less glad about everyone becoming a legal expert before breakfast.',
    agency_released:'They released the defendant. That’s the outcome in the bulletin. I’m not improving it for the sake of the conversation.',
    agency_suspect_arrested:'The report says someone was detained, not convicted. I’d prefer to keep the distinction. It takes very little effort.',
    agency_pursuit_escape:'The chase ended without an arrest. Don’t ask me which way they went. I only know what was in the bulletin.',
    agency_time_expired:'The investigation ended without a resolution. That’s all I know. I’m comfortable leaving a conversation without inventing the missing part.'
  }
};
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const seenKey=(npcId,eventId)=>JSON.stringify(['TavernScene',npcId,eventId]);
function seenEntries(state){
  const value=readWorldReactions(state).townNpcSeen;
  if(value===undefined)return[];
  if(!Array.isArray(value))throw new Error('[WorldTownNPC] Invalid townNpcSeen history; it was not overwritten.');
  return value;
}
export function getTownNpcReaction(state,npcId){
  if(!NPCS.has(npcId))return null;
  const event=latestWorldNewspaperEvent(state,'hq');
  if(!event||event.visibility!=='public'||event.system!=='agency'||!same(event.campaignId,state._createdAt))return null;
  const response=RESPONSES[npcId][event.kind];
  if(!response||seenEntries(state).includes(seenKey(npcId,event.id)))return null;
  return{
    npcId,eventId:event.id,
    text:`The bulletin mentioned the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.\n\n${response}`
  };
}
export function markTownNpcReaction(state,npcId,eventId){
  if(!NPCS.has(npcId))return false;
  const history=readWorldReactions(state);
  const event=history.events.find(item=>item.id===eventId&&item.system==='agency'&&item.visibility==='public'&&same(item.campaignId,state._createdAt));
  if(!event||!RESPONSES[npcId][event.kind])return false;
  const seen=seenEntries(state),key=seenKey(npcId,eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,townNpcSeen:[...seen,key]};
  return true;
}
