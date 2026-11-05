import { inventoryManager } from './InventoryManager.js';
import { MainStoryManager } from './MainStoryManager.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { createManualIssuer } from './AgencyManualModel.js';

export const agencyManualData=await loadJson('../assets/data/agencyFieldManual.json',import.meta.url);
await ItemsLoader.load();
const template=ItemsLoader.get('documents','agencyFieldManual');
if(template?.id!==agencyManualData.itemId)throw new Error('Field manual ID does not match ItemsCatalog.json.');
const issuer=createManualIssuer({inventory:inventoryManager,story:MainStoryManager,getGameState:()=>gameState,save:saveGameState,template});
export function hasAgencyFieldManual(){return inventoryManager.hasItem(template.id);}
export function isAgencyFieldManual(item){return item?.id===template.id;}
export function getAgencyManualIssueMode(){return issuer.mode();}
export function ensureAgencyFieldManual(){return issuer.issue();}
export function getAgencyManualChapter(id='overview'){return agencyManualData.chapters.find(chapter=>chapter.id===id)||agencyManualData.chapters[0];}
