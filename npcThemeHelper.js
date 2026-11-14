import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { NPC_CATALOG } from './npcCatalogData.js';
const THEME_SUFFIXES={white:'w',black:'b',asian:'a',south_asia:'h',olive:'o'};
const THEME_ALIASES={south_asian:'south_asia',hindu:'south_asia'};
const LEGACY_CITY_THEME_FALLBACK={new_delhi:'south_asia',newdelhi:'south_asia',kotte:'south_asia',islamabad:'south_asia',nairobi:'black',tokyo:'asian',london:'white',paris:'white',warsaw:'white',berlin:'white',new_york_city:'white',newyorkcity:'white',toronto:'white'};
function normalizeTheme(themeId){return THEME_ALIASES[themeId]||themeId;}
export function resolveCityNpcTheme(city){if(!city)return 'white';const declared=normalizeTheme(city.npcTheme);if(Object.hasOwn(THEME_SUFFIXES,declared))return declared;return LEGACY_CITY_THEME_FALLBACK[city.id]||'white';}
export function getNpcTextureKey(npcId,themeId='white'){const theme=normalizeTheme(themeId),npc=NPC_CATALOG.npcs[npcId];return npc?.portraits?.[theme]?.key||npc?.portraits?.white?.key||`${npcId}_${THEME_SUFFIXES[theme]||'w'}`;}
export function getNpcLabel(npcId){return NPC_CATALOG.npcs[npcId]?.displayName||__dialogueText("npcThemeHelper.js", "t_5464a8914419f3a1a237");}
export function getNpcRole(npcId){return NPC_CATALOG.npcs[npcId]?.role||__dialogueText("npcThemeHelper.js", "t_5464a8914419f3a1a237");}
export function themeHasAssets(themeId){return Object.hasOwn(THEME_SUFFIXES,normalizeTheme(themeId));}
export function getKnownNpcIds(){return Object.keys(NPC_CATALOG.npcs);}
export function getKnownThemeIds(){return Object.keys(THEME_SUFFIXES);}
const LOCATION_BACKGROUND_ALIASES={hotel:'hotel_maid',hotel_maid:'hotel_maid',parking:'parking',parking_bg:'parking'};
const LOCATION_THEME_SUFFIXES={white:'w',black:'b',asian:'a',south_asia:'h',olive:'o',w:'w',b:'b',a:'a',h:'h',o:'o'};
const LOCATION_THEME_ALIASES={south_asian:'south_asia',hindu:'south_asia'};
const CITY_LOCATION_DEFAULTS={london:'w',paris:'w',warsaw:'w',berlin:'w',new_york_city:'w',newyorkcity:'w',toronto:'w',new_delhi:'h',newdelhi:'h',kotte:'h',islamabad:'h',nairobi:'b',tokyo:'a'};
function normalizeLocationTheme(value){if(typeof value!=='string'||!value.trim())return null;const id=value.trim();return LOCATION_THEME_ALIASES[id]||id;}
function backgroundKeys(value){return(Array.isArray(value)?value:[value]).filter(key=>typeof key==='string'&&key.trim()).map(key=>key.trim());}
export function resolveCityLocationTheme(city){const declared=normalizeLocationTheme(city?.locationTheme);if(declared)return declared;return CITY_LOCATION_DEFAULTS[city?.id]||'w';}
export function getLocationBackgroundCandidates(locationId,cityOrTheme=null){
 if(typeof locationId!=='string'||!locationId)return [];
 const city=cityOrTheme&&typeof cityOrTheme==='object'?cityOrTheme:null;
 const place=city?.cityPlaces?.[locationId],typeId=place?.typeId||locationId,base=LOCATION_BACKGROUND_ALIASES[typeId]||typeId;
 const theme=city?resolveCityLocationTheme(city):normalizeLocationTheme(cityOrTheme)||'w',suffix=Object.hasOwn(LOCATION_THEME_SUFFIXES,theme)?LOCATION_THEME_SUFFIXES[theme]:theme,overrides=city?.locationBackgrounds;
 const candidates=[...backgroundKeys(place?.backgroundKey),...backgroundKeys(overrides?.[locationId]),...(typeId!==locationId?backgroundKeys(overrides?.[typeId]):[]),...(base!==locationId&&base!==typeId?backgroundKeys(overrides?.[base]):[]),`${base}_${suffix}`];
 const previousSuffix=city?CITY_LOCATION_DEFAULTS[city.id]:null;if(previousSuffix)candidates.push(`${base}_${previousSuffix}`);candidates.push(`${base}_w`,base);return [...new Set(candidates)];
}
