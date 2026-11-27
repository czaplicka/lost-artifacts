import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { NewspaperLayout } from './NewspaperUI.js';
import { pickOne, WEATHER_TODAY, WEATHER_TOP_NEWS } from './NewspaperContent.js';
import { ensureWorldWeather, generatedWeather, WEATHER_LABELS, WEATHER_STATIONS } from '../systems/PIWorldWeather.js';
import { getPIWorldDateEpoch, PI_DAY_MS } from '../systems/PIWorldCalendar.js';

const HOUR = 3600000;

// Miasto gazety -> stacja pogodowa z appki Weather. Miasta, których id
// zgadza się ze stacją (cape_town, lima, new_york...), nie muszą tu być.
// Brak wpisu = stara, losowa pogoda.
const CITY_STATION = {
  paris: 'marseille',
  new_york_city: 'new_york',
  nyc: 'new_york',
  perpignan: 'roussillon',
  riviera: 'nice',
  mallorca: 'palma',
  oslo: 'bergen',
  dublin: 'cork'
};

const ICON_BY_CONDITION = {
  clear: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
  snow: 'snow',
  thunderstorm: 'storm'
};

const normalizeCity = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export class NewspaperPublicationLayout extends NewspaperLayout {
 drawSideStory(container,layout,slot,article,rng){
  if(!article.imageKey)return super.drawSideStory(container,layout,slot,article,rng);
  this.drawBarLabel(container,slot.x,slot.y,slot.id==='secondary_1'?__dialogueText("ui/NewspaperPublicationLayout.js", "t_e37e76492e76a05877c5"):__dialogueText("ui/NewspaperPublicationLayout.js", "t_9e2d3810022336797c3c"));
  const headline=this.fitBlock(container,article.headline||'',{x:slot.x,y:slot.y+layout.barHeight+12,width:slot.width,maxHeight:Math.min(slot.headlineMaxH,100),maxSize:slot.headlineSize,minSize:slot.headlineMin,style:{fontFamily:'SpecialElite',color:'#1e1a16',lineSpacing:4}});
  let cursor=headline.y+headline.height+12;const bottom=slot.y+slot.height;
  const photoH=Math.max(60,Math.min(120,(bottom-cursor)*.4));
  this.drawPhoto(container,article.imageKey,slot.x+8,cursor+8,slot.width-16,photoH,-.5);cursor+=photoH+26;
  if(article.imageCaption){const caption=this.fitBlock(container,article.imageCaption,{x:slot.x,y:cursor,width:slot.width,maxHeight:32,maxSize:12,minSize:9,style:{fontFamily:'SpecialElite',color:'#5a4636',fontStyle:'italic'}});cursor+=caption.height+8;}
  this.fitBlock(container,article.body||'',{x:slot.x,y:cursor,width:slot.width,maxHeight:Math.max(24,bottom-cursor),maxSize:slot.bodySize,minSize:Math.min(slot.bodyMin,11),style:{fontFamily:'SpecialElite',color:'#2b2219',lineSpacing:4}});
 }

 // Pogoda z gazety = ta sama pogoda co w appce Weather na komputerze.
 getComputerWeather() {
  try {
   const cityId = normalizeCity(this.scene?.cityId);
   const stationId = WEATHER_STATIONS.some(s => s.id === cityId) ? cityId : CITY_STATION[cityId];
   if (!stationId) return null;

   const world = ensureWorldWeather();
   const today = getPIWorldDateEpoch() + 12 * HOUR;
   const now = generatedWeather(stationId, today, world);
   const next = generatedWeather(stationId, today + PI_DAY_MS, world);
   if (!now || !next) return null;

   return { now, next };
  } catch (error) {
   console.warn('[NewspaperLayout] Computer weather unavailable:', error);
   return null;
  }
 }

 drawWeather(container, layout, m, rng) {
  const weather = this.getComputerWeather();
  if (!weather) return super.drawWeather(container, layout, m, rng);

  const { now, next } = weather;

  this.drawBarLabel(container, m.x, m.y, m.label);

  const kind = ICON_BY_CONDITION[now.condition] || 'cloud';
  const centerX = m.x + m.width / 2;

  this.drawWeatherIcon(container, kind, centerX, m.y + 86);

  container.add(this.makeText(centerX, m.y + 152, `${now.temperatureC}°C`, {
   fontFamily: 'SpecialElite', fontSize: '38px', color: '#1e1a16', stroke: '#1e1a16', strokeThickness: 1
  }, 0.5, 0));

  const todayText = WEATHER_TODAY[kind] || WEATHER_TODAY.cloud || '';
  const entries = [
   {
    head: 'TODAY',
    text: `${WEATHER_LABELS[now.condition]}, wind ${now.windKmh} km/h. ${todayText}`.trim()
   },
   {
    head: 'TOMORROW',
    text: `${WEATHER_LABELS[next.condition]}, ${next.temperatureC}°C, wind ${next.windKmh} km/h.`
   },
   {
    head: __dialogueText("ui/NewspaperUI.js", "t_d6abf11bd201a421cd90"),
    text: pickOne(WEATHER_TOP_NEWS, rng)
   }
  ];

  entries.forEach((entry, index) => {
   const y = m.y + 206 + index * 54;

   container.add(this.makeText(m.x + 14, y, entry.head, {
    fontFamily: 'PressStart2P', fontSize: '8px', color: '#8c1d12'
   }, 0, 0));

   this.fitBlock(container, entry.text, {
    x: m.x + 14,
    y: y + 14,
    width: m.width - 28,
    maxHeight: 36,
    maxSize: 15,
    minSize: 10,
    style: { fontFamily: 'SpecialElite', color: '#2b2219', lineSpacing: 2 }
   });
  });
 }

 drawWeatherIcon(container, kind, cx, cy) {
  if (kind !== 'snow') return super.drawWeatherIcon(container, kind, cx, cy);

  super.drawWeatherIcon(container, 'cloud', cx, cy);

  const g = this.scene.add.graphics();
  g.fillStyle(0x3a2c1f, 1);
  [[-22, 30], [0, 38], [22, 30], [-10, 50], [12, 50]].forEach(([dx, dy]) => {
   g.fillCircle(cx + dx, cy + dy, 3.5);
  });
  container.add(g);
 }

 renderTime(container,layout,data){
  super.renderTime(container,layout,data);
  const box=layout.illustration,scene=this.scene;
  if(data.imageKey&&box&&scene.textures.exists(data.imageKey)){
   const frame=scene.textures.get(data.imageKey).get(),scale=Math.max(box.width/frame.width,box.height/frame.height),cw=box.width/scale,ch=box.height/scale,cx=(frame.width-cw)/2,cy=(frame.height-ch)/2;
   container.add(scene.add.rectangle(box.x+box.width/2,box.y+box.height/2,box.width,box.height,0xefe6cf));
   container.add(scene.add.image(box.x-cx*scale,box.y-cy*scale,data.imageKey).setOrigin(0).setScale(scale).setCrop(cx,cy,cw,ch));
   const border=scene.add.graphics();border.lineStyle(4,0x14161f,1);border.strokeRect(box.x,box.y,box.width,box.height);container.add(border);
  }
  if(typeof data.imageCaption==='string'&&data.imageCaption.trim()){
   const c=layout.caption,cx=layout.cover.x+layout.cover.width/2;container.add(scene.add.rectangle(cx,c.y+c.height/2,layout.illustration.width+16,c.height+4,0xefe6cf));
   this.fitBlock(container,scene.fillTemplate?.(data.imageCaption,scene.buildTemplateContext?.()||{})||data.imageCaption,{x:cx,y:c.y,width:layout.illustration.width,maxHeight:c.height,maxSize:13,minSize:9,originX:.5,align:'center',style:{fontFamily:'SpecialElite',color:'#14161f'}});
  }
 }
}