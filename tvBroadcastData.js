import { getWorldTVUpdate, buildWorldTVSegment } from './systems/WorldTVReactions.js';

const CITY_CONFIG={
  hq:{name:'Mark Agency Headquarters',channel:'M.A.N. — Mark Agency Network',landmark:'the Mark Agency evidence vault',newspaper:'The Internal Memorandum',anchorName:'Marvin Bellweather',anchorTitle:'Director of Internal Communications',backgroundKey:'tv_news_hq',presenterKey:'tv_anchor_hq'},
  paris:{name:'Paris',channel:'Canal Mystère 3',landmark:'the Louvre',newspaper:'Le Détective Quotidien',anchorName:'Jean-Michel Dubois',anchorTitle:'Correspondent for Cultural Affairs',backgroundKey:'tv_news_paris',presenterKey:'tv_anchor_paris'},
  warsaw:{name:'Warsaw',channel:'TVP Kultura Extra',landmark:'the Royal Castle',newspaper:'Gazeta Śledcza',anchorName:'Katarzyna Wysocka',anchorTitle:'Senior Cultural Correspondent',backgroundKey:'tv_news_warsaw',presenterKey:'tv_anchor_warsaw'},
  berlin:{name:'Berlin',channel:'RBB Spezial',landmark:'Museum Island',newspaper:'Berliner Kriminal-Post',anchorName:'Helmut Schreiber',anchorTitle:'Head of Cultural Heritage Desk',backgroundKey:'tv_news_berlin',presenterKey:'tv_anchor_berlin'},
  london:{name:'London',channel:'BCC World Service',landmark:'the Tower of London',newspaper:'The Evening Standard-Bearer',anchorName:'Nigel Ashworth',anchorTitle:'Cultural Affairs Editor',backgroundKey:'tv_news_london',presenterKey:'tv_anchor_london'},
  new_delhi:{name:'New Delhi',channel:'DD Heritage Plus',landmark:'the National Museum',newspaper:'Delhi Cultural Times',anchorName:'Priya Sharma',anchorTitle:'Special Correspondent, Heritage & Arts',backgroundKey:'tv_news_new_delhi',presenterKey:'tv_anchor_new_delhi'},
  new_york_city:{name:'New York',channel:'WNYK News 4',landmark:'the Metropolitan Museum',newspaper:'The New York Investigator',anchorName:'Sandra Brooks',anchorTitle:'Investigative Reporter',backgroundKey:'tv_news_new_york',presenterKey:'tv_anchor_new_york'}
};
const DEFAULT_CITY_CONFIG={name:'the City',channel:'World News Network',landmark:'the museum',newspaper:'The Daily Record',anchorName:'Alex Morgan',anchorTitle:'Field Correspondent',backgroundKey:'tv_news_generic',presenterKey:'tv_anchor_generic'};
const CRIME_SCENE_LABELS={louvre:'the Louvre',tower:'the Tower of London',castle:'the Royal Castle',auction_house:'the Berlin Auction House',havela:'the Chandni Chowk Haveli',dockyard:'the Brooklyn Dockyard'};

function getCrimeSceneLabel(id){
  if(!id)return'an undisclosed location';
  return CRIME_SCENE_LABELS[id]||String(id).replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
}
function normalizeCrimeCityId(value){
  if(!value)return null;
  const id=String(value).trim().toLowerCase();
  const aliases={hq:'hq',headquarters:'hq',mark_agency_headquarters:'hq',paris:'paris',warsaw:'warsaw',berlin:'berlin',london:'london',new_delhi:'new_delhi',newdelhi:'new_delhi',new_york_city:'new_york_city',newyorkcity:'new_york_city'};
  return aliases[id]||id;
}
function getCityConfig(cityId,tvConfig){
  const cfg=CITY_CONFIG[normalizeCrimeCityId(cityId)]||DEFAULT_CITY_CONFIG;
  const local=tvConfig?.cityConfigs?.[cfg.name]||{};
  const defaults=tvConfig?.meta?.stationDefaults||{};
  return{
    ...cfg,
    stationName:local.stationName||`${cfg.name} Night Report`,
    reporterName:local.reporterName||cfg.anchorName||defaults.reporterName||DEFAULT_CITY_CONFIG.anchorName
  };
}
function pickRandom(items){return Array.isArray(items)&&items.length?items[Math.floor(Math.random()*items.length)]:null;}
function filterPoolByCity(pool,cityName){
  return Array.isArray(pool)?pool.filter(item=>!Array.isArray(item.cities)||!item.cities.length||item.cities.includes(cityName)):[];
}
function buildActiveMissionNews(cfg,mission,tvConfig){
  const template=(tvConfig?.storySegments||[]).find(segment=>segment.id==='news-main');
  const artifact=mission?.artifact||mission?.artifactName||'a priceless artefact';
  const crimeCity=mission?.city||cfg.name;
  const sceneId=mission?.scene||null;
  const sourceLabel=getCrimeSceneLabel(sceneId);
  const significance=mission?.significance||mission?.description||'of immense historical value';
  const publicClue=mission?.clue||mission?.publicHint||'No public witness description has been released.';
  const tokens={
    '{city}':crimeCity,'{artifact}':artifact,'{scene}':sourceLabel,'{sourceLabel}':sourceLabel,
    '{significance}':significance,'{suspectHint}':publicClue,
    '{destinationHint}':mission?.destinationHint||'','{thiefName}':mission?.thiefName||'',
    '{reporterName}':cfg.reporterName,'{stationName}':cfg.stationName
  };
  const interpolate=(text='')=>Object.entries(tokens).reduce((result,[token,value])=>result.replaceAll(token,String(value??'')),String(text));
  const fallback=[
    'Authorities continue investigating the theft of {artifact} in {city}.',
    'The artefact was taken from {sourceLabel}.',
    'Officials have not announced a court verdict in this investigation.'
  ];
  const lines=Array.isArray(template?.linesTemplate)&&template.linesTemplate.length?template.linesTemplate:fallback;
  return{
    id:`${mission?.id||mission?.artifactKey||'mission'}-news-main`,type:template?.type||'news',
    title:interpolate(template?.titleTemplate||cfg.stationName),
    anchorName:interpolate(template?.anchorNameTemplate||cfg.reporterName),
    label:template?.label||'BREAKING NEWS',badge:template?.badge||'URGENT',channel:template?.channel||cfg.channel,
    charDelay:template?.charDelay||17,linePause:template?.linePause||260,hold:template?.hold||1400,theme:template?.theme||{},
    backgroundKey:cfg.backgroundKey,presenterKey:cfg.presenterKey,
    caseFacts:{artifact,artifactKey:mission?.artifactKey||null,city:crimeCity,country:mission?.country||null,
      sceneId,sourceLabel,sourceWithCity:`${sourceLabel}, ${crimeCity}`,description:mission?.description||null,
      significance,publicClue,missionClue:mission?.clue||null},
    lines:lines.map(interpolate)
  };
}
function buildQuietNews(cfg){
  return{
    id:`${cfg.name}-news-no-case-update`,type:'news',title:cfg.stationName,
    anchorName:cfg.reporterName,label:'NEWS',badge:'BULLETIN',channel:cfg.channel,
    charDelay:17,linePause:260,hold:1400,theme:{},
    backgroundKey:cfg.backgroundKey,presenterKey:cfg.presenterKey,
    lines:[
      'You are watching the evening bulletin.',
      'There is no new verified case update in this bulletin.',
      'We now return to our regular programming, which has also declined to make a statement.'
    ]
  };
}
export function getTVBroadcast(gameState,tvConfigJson={}){
  const state=gameState||{};
  const cityId=normalizeCrimeCityId(state.currentCityId||state.crimeCityId||'hq');
  const cfg=getCityConfig(cityId,tvConfigJson);
  const mission=state.currentMission||null;
  const event=getWorldTVUpdate(state,cityId);
  const sameCase=event&&state.currentCaseId!=null&&String(event.caseId)===String(state.currentCaseId);
  const hasActiveMission=Boolean(mission&&state.isGameActive===true&&state.caseResolved!==true&&state.caseFailed!==true);
  const showActiveMission=hasActiveMission&&!sameCase;
  const filler=pickRandom(filterPoolByCity(tvConfigJson?.pools?.fillers||[],cfg.name));
  const ad=pickRandom(filterPoolByCity(tvConfigJson?.pools?.ads||[],cfg.name));
  const segments=[];
  if(filler)segments.push({type:'filler',...filler});
  if(ad)segments.push({type:'ad',...ad});
  if(showActiveMission)segments.push(buildActiveMissionNews(cfg,mission,tvConfigJson));
  if(event){
    const update=buildWorldTVSegment(event,cfg,tvConfigJson);
    if(update)segments.push(update);
  }
  if(!segments.some(segment=>segment.type==='news'))segments.push(buildQuietNews(cfg));
  return{channel:cfg.channel,cityId,cityName:cfg.name,segments};
}
export const getCityAds=(cityId,tvConfigJson)=>{
  const cfg=getCityConfig(normalizeCrimeCityId(cityId),tvConfigJson);
  return filterPoolByCity(tvConfigJson?.pools?.ads||[],cfg.name);
};
export const getCityFillers=(cityId,tvConfigJson)=>{
  const cfg=getCityConfig(normalizeCrimeCityId(cityId),tvConfigJson);
  return filterPoolByCity(tvConfigJson?.pools?.fillers||[],cfg.name);
};
export const getCityTVConfig=(cityId,tvConfigJson)=>getCityConfig(normalizeCrimeCityId(cityId),tvConfigJson);
