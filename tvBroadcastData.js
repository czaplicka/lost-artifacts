import {getWorldTVUpdate,buildWorldTVSegment} from './systems/WorldTVReactions.js';
import {normalizeTVCity,tvCityConfig,filterTVCity,tvCaseMatches,makeTVStory,makeTVQuiet} from './systems/TVEditorialModel.js';
export function getTVBroadcast(gameState,tvConfigJson={},options={}){
 const state=gameState||{},cityId=normalizeTVCity(state.currentCityId||state.crimeCityId||'hq'),cfg=tvCityConfig(cityId,tvConfigJson),mission=state.currentMission||null,event=getWorldTVUpdate(state,cityId),sameCase=event&&state.currentCaseId!=null&&String(event.caseId)===String(state.currentCaseId),active=Boolean(mission&&state.isGameActive===true&&state.caseResolved!==true&&state.caseFailed!==true),showActive=active&&!sameCase,rng=typeof options.rng==='function'?options.rng:Math.random,pick=items=>items.length?items[Math.min(items.length-1,Math.max(0,Math.floor(rng()*items.length)))]:null;
 const segments=[],filler=pick(filterTVCity(tvConfigJson.pools?.fillers||[],cityId)),ad=pick(filterTVCity(tvConfigJson.pools?.ads||[],cityId));
 if(filler)segments.push({type:'filler',...filler});if(ad)segments.push({type:'ad',...ad});
 if(showActive){const main=(tvConfigJson.storySegments||[]).find(s=>s.id==='news-main');segments.push(makeTVStory(main,cfg,mission));for(const story of filterTVCity(tvConfigJson.storySegments||[],cityId)){if(story.id!=='news-main'&&tvCaseMatches(story,state))segments.push(makeTVStory(story,cfg,mission));}}
 if(event){const update=buildWorldTVSegment(event,cfg,tvConfigJson);if(update)segments.push(update);}
 if(!segments.some(s=>s.type==='news'))segments.push(makeTVQuiet(cfg,tvConfigJson));
 return {channel:cfg.channel,cityId,cityName:cfg.name,segments};
}
export const getCityAds=(cityId,config={})=>filterTVCity(config.pools?.ads||[],normalizeTVCity(cityId));
export const getCityFillers=(cityId,config={})=>filterTVCity(config.pools?.fillers||[],normalizeTVCity(cityId));
export const getCityTVConfig=(cityId,config={})=>tvCityConfig(normalizeTVCity(cityId),config);
