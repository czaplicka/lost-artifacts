import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import * as Postal from './PostOfficeManager.js';
import {getPICase} from './PIInvestigationManager.js';
import {POSTAL_DOCUMENTS,POSTAL_EVIDENCE_ART} from '../config/postOfficeEvidenceConfig.js';
export function replyIsWaiting(s=Postal.postalState()){
  const m=s.restante?.clockwork;return Boolean(m&&!m.collected&&s.visits>m.leftVisit);
}
export function canViewPostalDocument(id,s=Postal.postalState()){
  if(!Object.hasOwn(POSTAL_DOCUMENTS,id))return false;
  if(id==='notice')return true;
  if(id==='reward')return s.returnCase.stage==='completed';
  if(id==='reply')return Boolean(s.restante?.clockwork?.collected)&&['reply','completed'].includes(s.returnCase.stage);
  return s.returnCase.stage!=='new';
}
function attachImage(id){
  const investigation=getPICase(Postal.RETURN_CASE);if(!investigation)return;
  const evidenceId=id==='reward'?'postal-ending':id==='reply'?'postal-reply':`postal-return-${id}`;
  const note=investigation.board?.items?.find(item=>item.id===evidenceId);
  if(note){note.image=POSTAL_EVIDENCE_ART[id].url;note.caption=POSTAL_DOCUMENTS[id].title;requestAutosave();}
}
export function inspectPostalDetail(id,spotId){
  if(!canViewPostalDocument(id))return{ok:false,text:'This document is not available yet.'};
  const doc=POSTAL_DOCUMENTS[id],spot=doc.spots.find(s=>s.id===spotId);
  if(!spot)return{ok:false,text:'No readable detail here.'};
  const s=Postal.postalState();
  // Public notices may be read before accepting the case without granting a future clue.
  if(s.returnCase.stage==='new')return{ok:true,text:spot.text,complete:false};
  const views={...(s.evidenceViews||{})},seen=new Set(Array.isArray(views[id])?views[id]:[]);seen.add(spotId);views[id]=[...seen];
  gameState.postOffice={...s,evidenceViews:views};requestAutosave();
  const complete=doc.spots.every(p=>seen.has(p.id));
  if(complete&&doc.clue)Postal.inspectReturnClue(doc.clue);
  if(complete)attachImage(id);
  return{ok:true,text:spot.text,complete};
}
export function postalDocumentSeen(id){
  const doc=POSTAL_DOCUMENTS[id],s=Postal.postalState();
  return Boolean(doc&&doc.spots.every(p=>(s.evidenceViews?.[id]||[]).includes(p.id)));
}
export function syncPostalEvidenceImages(){
  const s=Postal.postalState();for(const id of s.returnCase.clues||[])if(POSTAL_DOCUMENTS[id])attachImage(id);
  if(canViewPostalDocument('reply',s))attachImage('reply');if(canViewPostalDocument('reward',s))attachImage('reward');
}
