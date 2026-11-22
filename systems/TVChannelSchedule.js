import { getTVBroadcast } from '../tvBroadcastData.js';
import {
  TV_STATIONS, TV_WORDS, TV_HERITAGE_STORIES, TV_OTHER_NEWS,
  TV_CITY_NEWS, TV_ACTION_NEWS, TV_CHANNEL_ADS
} from '../dialogues/TVChannelContent.js';

export const TV_CHANNELS = TV_STATIONS.map(station => ({
  ...station,
  url:new URL('../assets/video/tv/' + station.videoFile, import.meta.url).href
}));

function choose(items, index) {
  return items[((index % items.length) + items.length) % items.length];
}

export function buildTVChannelQueue(state, config = {}, channelIndex = 0, cycle = 0) {
  const station = TV_CHANNELS[channelIndex] || TV_CHANNELS[0];
  const round = Number.isFinite(cycle) ? Math.max(0,Math.floor(cycle)) : 0;
  const broadcast = getTVBroadcast(state || {},config);
  const news = (broadcast.segments || []).filter(segment => segment.type === 'news');
  const theft = news.find(segment => segment.caseFacts?.artifact) ||
    news.find(segment => !String(segment.id || '').includes('no-case-update'));
  const publicOther = news.find(segment => !segment.caseFacts && segment !== theft);
  const stationName = `CH ${station.number} · ${station.name.toUpperCase()}`;
  const tickerCount = station.tickers.length;
  const tickers = [0,1].map(offset => station.tickers[(round * 2 + offset) % tickerCount]);
  const decorate = segment => ({
    ...segment, channel:stationName, anchorName:station.anchorName,
    presenterKey:station.anchorKey, presenterTint:station.presenterTint || 0xffffff,
    theme:{...(segment.theme || {}),...station.theme},
    tickerItems:[station.tagline,...tickers,...(segment.tickerItems || [])]
  });

  let bulletin;
  if (station.id === 'reckless') {
    bulletin = {
      ...choose(TV_ACTION_NEWS,round), type:'news', label:TV_WORDS.field,
      badge:TV_WORDS.alive, charDelay:19, linePause:450, hold:7000
    };
  } else if (station.id === 'aurora') {
    bulletin = theft ? {...theft,title:station.bulletinTitle} : {
      ...choose(TV_HERITAGE_STORIES,round),type:'news',label:TV_WORDS.heritage,
      badge:TV_WORDS.bulletin,charDelay:22,linePause:500,hold:6500
    };
  } else {
    const pool = [TV_CITY_NEWS[broadcast.cityId],...TV_OTHER_NEWS].filter(Boolean);
    bulletin = publicOther && round === 0 ? {...publicOther,title:station.bulletinTitle} : {
      ...choose(pool,round),type:'news',label:TV_WORDS.local,
      badge:TV_WORDS.bulletin,charDelay:20,linePause:450,hold:6500
    };
  }
  const advertisement = slot => {
    const selected = choose(TV_CHANNEL_ADS[station.id],round * 2 + slot);
    const lines = [...selected.lines];
    if (station.id === 'reckless') {
      if (slot === 0) lines.push(TV_WORDS.movieWarning);
      else lines.unshift(TV_WORDS.movieAfter);
    }
    return decorate({
      ...selected,lines,type:'ad',label:TV_WORDS.advertisement,badge:TV_WORDS.sponsored,
      hold:6500,charDelay:19,linePause:400
    });
  };
  return [
    decorate({...bulletin,type:'news'}),
    advertisement(0),
    decorate({id:station.id+'-feature',type:'movie',title:station.title,
      label:station.label,badge:TV_WORDS.feature,videoUrl:station.url,lines:[]}),
    advertisement(1)
  ];
}
