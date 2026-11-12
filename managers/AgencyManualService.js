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
if(!Array.isArray(agencyManualData.pages)||!agencyManualData.pages.length)throw new Error('Field manual has no pages.');
const issuer=createManualIssuer({inventory:inventoryManager,story:MainStoryManager,getGameState:()=>gameState,save:saveGameState,template});

export function hasAgencyFieldManual(){return inventoryManager.hasItem(template.id);}
export function isAgencyFieldManual(item){return item?.id===template.id;}
export function getAgencyManualIssueMode(){return issuer.mode();}
export function ensureAgencyFieldManual(){return issuer.issue();}

/** All printed pages of the book, in order. Printed page number = index + 1. */
export function getAgencyManualPages(){return agencyManualData.pages;}

/** Resolves a page id (or a legacy alias) to a page index, or -1 when unknown. */
export function getAgencyManualPageIndex(id){
  const resolved=agencyManualData.aliases?.[id]??id;
  return agencyManualData.pages.findIndex(page=>page.id===resolved);
}

function blockText(block){
  if(!block)return[];
  if(typeof block==='string')return[block];
  if(Array.isArray(block.items))return block.items.map(String);
  if(Array.isArray(block.rows))return block.rows.map(row=>row.join(' / '));
  return[block.title,block.text].filter(Boolean).map(String);
}

/**
 * Legacy helper kept for callers written against the old chapter-based manual.
 * Returns the page (or the contents page for unknown ids) flattened to plain paragraphs.
 */
export function getAgencyManualChapter(id='overview'){
  const index=getAgencyManualPageIndex(id),page=agencyManualData.pages[index>=0?index:0];
  const heading=page.blocks.find(block=>block.t==='h1');
  return{id:page.id,title:heading?.text??page.header??page.id,
    paragraphs:page.blocks.filter(block=>block.t!=='h1').flatMap(blockText).map(text=>text.replace(/\*\*/g,''))};
}