import { gameState } from '../GameData.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getKnownApartmentIdentityClues, getApartmentIdentityContext } from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getBoardEvidenceRecord } from './BoardEvidenceModel.js';

function write(record,state=gameState) {
  const key=getEvidenceCaseKey(state);
  const caseData={...(state.caseData || {}),boardEvidenceCases:{
    ...(state.caseData?.boardEvidenceCases || {}),[key]:record
  }};
  if(typeof state.updateState==='function')state.updateState({caseData});else state.caseData=caseData;
  requestAutosave();
}
export function captureApartmentInventory(state=gameState) {
  if(!state.currentMission)return false;
  const previous=getBoardEvidenceRecord(state);
  const next=JSON.parse(JSON.stringify(previous));
  next.materials ||= {};next.recoveredArtifacts ||= [];
  for(const raw of inventoryManager.getAllItems()) {
    if(!raw?.metadata?.apartment || Number(raw.quantity ?? 1)<=0 || !evidenceMatchesCase(raw,state))continue;
    const item=readApartmentEvidence(raw);
    next.materials[raw.id]={name:raw.name || item.label || 'Apartment material',originalId:item.originalId};
    const key=item.artifactKey;
    if(item.isArtifact===true && key && key===state.currentMission.artifactKey &&
      !next.recoveredArtifacts.some(entry=>entry.artifactKey===key)) {
      next.recoveredArtifacts.push({artifactKey:key,name:raw.name || item.label,
        sourceItemId:raw.id,recoveredAt:new Date().toISOString()});
    }
  }
  if(JSON.stringify(previous)===JSON.stringify(next))return false;
  write(next,state);return true;
}
export function recordEnvelopeViewed(raw,state=gameState) {
  if(!raw?.id || !raw.metadata?.apartment || !evidenceMatchesCase(raw,state) ||
    !inventoryManager.hasItem(raw.id))return false;
  const context=getApartmentIdentityContext(state);
  if(!context)return false;
  const originalId=raw.metadata.apartment.originalId;
  const clue=getKnownApartmentIdentityClues(state).find(entry=>entry.id===originalId);
  if(!clue || clue.category!=='eyes')return false;
  const previous=getBoardEvidenceRecord(state);
  if(previous.envelopeViewed?.clue?.id===clue.id)return true;
  write({...previous,envelopeViewed:{
    inventoryItemId:raw.id,actualId:context.actualId,
    viewedAt:new Date().toISOString(),clue:JSON.parse(JSON.stringify(clue))
  }},state);
  return true;
}
export function recordWarrantIdentity(scene,suspect,state=gameState) {
  if(!state.arrestWarrantIssued || !suspect?.id || String(state.warrantSuspectId)!==String(suspect.id))return false;
  let image='';
  for(const key of [suspect.portraitKey,suspect.imageKey,suspect.spriteKey,suspect.photoKey,suspect.suspectImageKey]) {
    if(!key || !scene.textures.exists(key))continue;
    const source=scene.textures.get(key).getSourceImage();
    const src=source?.currentSrc || source?.src;
    if(typeof src==='string' && src){image=src;break;}
  }
  const previous=getBoardEvidenceRecord(state);
  const warrant={id:String(suspect.id),name:suspect.name || state.warrantSuspectName,image};
  if(JSON.stringify(previous.warrant)===JSON.stringify(warrant))return true;
  write({...previous,warrant},state);return true;
}
// Read-only migration from actual carried items; never from generated apartment contents.
EventBus.on('itemAdded',()=>captureApartmentInventory());
