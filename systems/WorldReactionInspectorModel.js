import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { readWorldReactions } from './WorldReactionModel.js';

const SEEN_FIELDS=['officeSeen','npcSeen','townNpcSeen','hospitalNpcSeen','policeNpcSeen',
 'receptionNpcSeen','spyShopNpcSeen','postalNpcSeen'];
const scalar=value=>['string','number','boolean'].includes(typeof value)?value:null;
export function worldInspectorEnabled(location){
 const host=String(location?.hostname||'');
 return ['localhost','127.0.0.1','[::1]'].includes(host)&&
   new URLSearchParams(location?.search||'').get('debugWorld')==='1';
}

function npcAcknowledgements(history,eventId){
 const result=[];
 for(const field of SEEN_FIELDS.filter(name=>name!=='officeSeen')){
  for(const raw of Array.isArray(history[field])?history[field]:[]){
   if(typeof raw!=='string')continue;
   try{
    const parts=JSON.parse(raw);
    if(Array.isArray(parts)&&parts.length>=2&&parts.at(-1)===eventId){
     result.push({field,actor:parts.slice(0,-1).map(scalar)});
    }
   }catch(_){/* Older non-JSON markers are not interpreted as confirmations. */}
  }
 }
 return result;
}

export function buildWorldReactionSnapshot(state){
 const history=readWorldReactions(state),warnings=[],ids=new Set();
 const rows=history.events.map((event,index)=>{
  if(ids.has(event.id))warnings.push(`${__dialogueText("systems/WorldReactionInspectorModel.js", "t_86f2258f5fcf67045522")}${index+1}${__dialogueText("systems/WorldReactionInspectorModel.js", "t_cdb4ee2aea69cc6a8333")}`);
  ids.add(event.id);
  if(!['public','private','agency'].includes(event.visibility))warnings.push(`${__dialogueText("systems/WorldReactionInspectorModel.js", "t_e13cbd3dff3cc81d1d6b")}${index+1}${__dialogueText("systems/WorldReactionInspectorModel.js", "t_cdb4ee2aea69cc6a8333")}`);
  if(event.system==='pi'&&event.visibility==='public')warnings.push(`${__dialogueText("systems/WorldReactionInspectorModel.js", "t_1042ccf7d044742d4d33")}${index+1}${__dialogueText("systems/WorldReactionInspectorModel.js", "t_8eb6378f7a945585df01")}`);
  if(event.caseId==null||event.campaignId==null)warnings.push(`${__dialogueText("systems/WorldReactionInspectorModel.js", "t_dc6e55779394eb642176")}${index+1}${__dialogueText("systems/WorldReactionInspectorModel.js", "t_cdb4ee2aea69cc6a8333")}`);
  return{
   id:scalar(event.id),kind:scalar(event.kind),system:scalar(event.system),
   visibility:scalar(event.visibility),caseId:scalar(event.caseId),campaignId:scalar(event.campaignId),
   title:scalar(event.caseTitle)||scalar(event.artifact)||__dialogueText("systems/WorldReactionInspectorModel.js", "t_ec8bc4e44540004345d0"),city:scalar(event.cityName),
   endingId:scalar(event.endingId),outcomeCode:scalar(event.outcomeCode),source:scalar(event.source),
   createdAt:Number.isFinite(event.createdAt)?event.createdAt:null,
   officeAcknowledged:history.officeSeen.includes(event.id),
   npcAcknowledgements:npcAcknowledgements(history,event.id),
   currentCampaign:String(event.campaignId)===String(state._createdAt)
  };
 }).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const counts={public:0,private:0,agency:0};
 for(const row of rows)if(Object.hasOwn(counts,row.visibility))counts[row.visibility]++;
 const acknowledgements={};
 for(const field of SEEN_FIELDS){
  const value=history[field];
  acknowledgements[field]=Array.isArray(value)?value.length:0;
  if(value!==undefined&&!Array.isArray(value))warnings.push(`${__dialogueText("systems/WorldReactionInspectorModel.js", "t_b7e55f60258d2bd61673")}${field}${__dialogueText("systems/WorldReactionInspectorModel.js", "t_cdb4ee2aea69cc6a8333")}`);
 }
 return{version:1,campaignId:scalar(state._createdAt),total:rows.length,counts,acknowledgements,warnings,rows};
}
