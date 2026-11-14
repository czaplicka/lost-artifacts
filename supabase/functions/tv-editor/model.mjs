export const TV_CITY_DEFAULTS = {
  "hq": {
    "name": "Mark Agency Headquarters",
    "channel": "M.A.N. — Mark Agency Network",
    "landmark": "the Mark Agency evidence vault",
    "newspaper": "The Internal Memorandum",
    "anchorName": "Marvin Bellweather",
    "anchorTitle": "Director of Internal Communications",
    "backgroundKey": "tv_news_hq",
    "presenterKey": "tv_anchor_hq"
  },
  "paris": {
    "name": "Paris",
    "channel": "Canal Mystère 3",
    "landmark": "the Louvre",
    "newspaper": "Le Détective Quotidien",
    "anchorName": "Jean-Michel Dubois",
    "anchorTitle": "Correspondent for Cultural Affairs",
    "backgroundKey": "tv_news_paris",
    "presenterKey": "tv_anchor_paris"
  },
  "warsaw": {
    "name": "Warsaw",
    "channel": "TVP Kultura Extra",
    "landmark": "the Royal Castle",
    "newspaper": "Gazeta Śledcza",
    "anchorName": "Katarzyna Wysocka",
    "anchorTitle": "Senior Cultural Correspondent",
    "backgroundKey": "tv_news_warsaw",
    "presenterKey": "tv_anchor_warsaw"
  },
  "berlin": {
    "name": "Berlin",
    "channel": "RBB Spezial",
    "landmark": "Museum Island",
    "newspaper": "Berliner Kriminal-Post",
    "anchorName": "Helmut Schreiber",
    "anchorTitle": "Head of Cultural Heritage Desk",
    "backgroundKey": "tv_news_berlin",
    "presenterKey": "tv_anchor_berlin"
  },
  "london": {
    "name": "London",
    "channel": "BCC World Service",
    "landmark": "the Tower of London",
    "newspaper": "The Evening Standard-Bearer",
    "anchorName": "Nigel Ashworth",
    "anchorTitle": "Cultural Affairs Editor",
    "backgroundKey": "tv_news_london",
    "presenterKey": "tv_anchor_london"
  },
  "new_delhi": {
    "name": "New Delhi",
    "channel": "DD Heritage Plus",
    "landmark": "the National Museum",
    "newspaper": "Delhi Cultural Times",
    "anchorName": "Priya Sharma",
    "anchorTitle": "Special Correspondent, Heritage & Arts",
    "backgroundKey": "tv_news_new_delhi",
    "presenterKey": "tv_anchor_new_delhi"
  },
  "new_york_city": {
    "name": "New York",
    "channel": "WNYK News 4",
    "landmark": "the Metropolitan Museum",
    "newspaper": "The New York Investigator",
    "anchorName": "Sandra Brooks",
    "anchorTitle": "Investigative Reporter",
    "backgroundKey": "tv_news_new_york",
    "presenterKey": "tv_anchor_new_york"
  }
};
export const DEFAULT_TV_CITY={name:'the City',channel:'World News Network',landmark:'the museum',newspaper:'The Daily Record',anchorName:'Alex Morgan',anchorTitle:'Field Correspondent',backgroundKey:'tv_news_generic',presenterKey:'tv_anchor_generic'};
export const TV_PUBLIC_TOKENS=['city','artifact','scene','sourceLabel','significance','suspectHint','reporterName','stationName'];
export function normalizeTVCity(value){const id=String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_');return ({headquarters:'hq',mark_agency_headquarters:'hq',newdelhi:'new_delhi',new_york:'new_york_city',newyorkcity:'new_york_city'})[id]||id;}
export function readableTV(value,fallback=''){if(typeof value==='number'&&Number.isFinite(value))return String(value);if(typeof value==='string')return value.trim()||fallback;if(value&&typeof value==='object')for(const key of ['label','name','title','artifactName'])if(typeof value[key]==='string'&&value[key].trim())return value[key].trim();return fallback;}
export function tvCityConfig(cityId,config={}){const id=normalizeTVCity(cityId),base=TV_CITY_DEFAULTS[id]||DEFAULT_TV_CITY,entry=Object.entries(config.cityConfigs||{}).find(([key])=>normalizeTVCity(key)===id),local=entry?.[1]||{},cfg={...base};for(const key of ['channel','landmark','anchorTitle','backgroundKey','presenterKey'])if(typeof local[key]==='string'&&local[key].trim())cfg[key]=local[key];if(!TV_CITY_DEFAULTS[id])cfg.name=entry?.[0]||String(id||'the City').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());cfg.stationName=local.stationName||`${cfg.name} Night Report`;cfg.reporterName=local.reporterName||base.anchorName||config.meta?.stationDefaults?.reporterName||DEFAULT_TV_CITY.anchorName;return cfg;}
export function filterTVCity(pool,cityName){const id=normalizeTVCity(cityName);return Array.isArray(pool)?pool.filter(item=>item?.enabled!==false&&(!Array.isArray(item.cities)||!item.cities.length||item.cities.some(c=>normalizeTVCity(c)===id))):[];}
export function tvCaseMatches(segment,state){const c=segment.conditions||{},m=state.currentMission||{},same=(a,b)=>String(a??'').trim().toLowerCase()===String(b??'').trim().toLowerCase();return (!c.caseId||same(c.caseId,state.currentCaseId))&&(!c.artifactKey||same(c.artifactKey,m.artifactKey))&&(!c.sceneId||same(c.sceneId,m.scene))&&(!c.missionCity||normalizeTVCity(c.missionCity)===normalizeTVCity(readableTV(m.city)));}
export function fillTVTemplate(text,tokens){return String(text??'').replace(/\{([\w.]+)\}/g,(match,key)=>Object.hasOwn(tokens,key)?String(tokens[key]??''):match);}
export function buildTVTokens(cfg,mission={}){const sceneId=mission.scene||null,labels={louvre:'the Louvre',tower:'the Tower of London',castle:'the Royal Castle',auction_house:'the Berlin Auction House',havela:'the Chandni Chowk Haveli',dockyard:'the Brooklyn Dockyard'},sourceLabel=labels[sceneId]||(sceneId?String(sceneId).replaceAll('_',' ').replace(/\b\w/g,l=>l.toUpperCase()):'an undisclosed location');return {city:readableTV(mission.city,cfg.name),artifact:readableTV(mission.artifact,readableTV(mission.artifactName,'a priceless artefact')),scene:sourceLabel,sourceLabel,significance:readableTV(mission.significance,readableTV(mission.description,'of immense historical value')),suspectHint:readableTV(mission.clue,readableTV(mission.publicHint,'No public witness description has been released.')),reporterName:cfg.reporterName,stationName:cfg.stationName,destinationHint:readableTV(mission.destinationHint),thiefName:readableTV(mission.thiefName)};}
export function makeTVStory(template,cfg,mission){const tokens=buildTVTokens(cfg,mission),interpolate=text=>fillTVTemplate(text,tokens),lines=Array.isArray(template?.linesTemplate)&&template.linesTemplate.length?template.linesTemplate:['Authorities continue investigating the theft of {artifact} in {city}.','The artefact was taken from {sourceLabel}.','Officials have not announced a court verdict in this investigation.'];return {id:`${mission.id||mission.artifactKey||'mission'}-${template?.id||'news-main'}`,type:'news',title:interpolate(template?.titleTemplate||cfg.stationName),anchorName:interpolate(template?.anchorNameTemplate||cfg.reporterName),label:template?.label||'BREAKING NEWS',badge:template?.badge||'URGENT',channel:template?.channel||cfg.channel,charDelay:template?.charDelay||17,linePause:template?.linePause||260,hold:template?.hold||1400,theme:template?.theme||{},backgroundKey:template?.backgroundKey||cfg.backgroundKey,presenterKey:template?.presenterKey||cfg.presenterKey,caseFacts:{artifact:tokens.artifact,artifactKey:mission.artifactKey||null,city:tokens.city,country:mission.country||null,sceneId:mission.scene||null,sourceLabel:tokens.sourceLabel,sourceWithCity:`${tokens.sourceLabel}, ${tokens.city}`,description:mission.description||null,significance:tokens.significance,publicClue:tokens.suspectHint,missionClue:mission.clue||null},lines:lines.map(interpolate)};}
export function makeTVQuiet(cfg,config={}){const q=config.quietNews||{};return {id:`${cfg.name}-news-no-case-update`,type:'news',title:q.title||cfg.stationName,anchorName:q.anchorName||cfg.reporterName,label:q.label||'NEWS',badge:q.badge||'BULLETIN',channel:q.channel||cfg.channel,charDelay:q.charDelay||17,linePause:q.linePause||260,hold:q.hold||1400,theme:q.theme||{},backgroundKey:q.backgroundKey||cfg.backgroundKey,presenterKey:cfg.presenterKey,lines:Array.isArray(q.lines)&&q.lines.length?q.lines:['You are watching the evening bulletin.','There is no new verified case update in this bulletin.','We now return to our regular programming, which has also declined to make a statement.']};}
