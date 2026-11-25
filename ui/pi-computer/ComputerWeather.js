import {gameState} from '../../GameData.js';
import {requestAutosave} from '../../gameStatePersistence.js';
import {getPIWorldDateEpoch,PI_DAY_MS as DAY} from '../../systems/PIWorldCalendar.js';
import {ensureWorldWeather,generatedWeather,WEATHER_STATIONS as STATIONS,WEATHER_LABELS as LABELS} from '../../systems/PIWorldWeather.js';
const APP='weather',KEY=Symbol.for('lost-artifacts.weather.v2'),HOUR=3600000;
const stamp=t=>new Date(t).toISOString().slice(0,16).replace('T',' ');
export class ComputerWeather{
 constructor(ui){this.ui=ui;this.dead=false;ensureWorldWeather();}
 state(){
  const s=gameState.piQuests?.weather,today=getPIWorldDateEpoch();
  return s?.version===2&&Number.isFinite(s.epoch)?{...s,page:Math.max(0,Math.floor(s.page)||0)}:
   {version:2,epoch:today,stormsOnly:false,page:0,selected:null};
 }
 save(s){gameState.piQuests={...gameState.piQuests,weather:s};requestAutosave();this.ui.render();}
 destroy(){this.dead=true;}
 render(b){
  const ui=this.ui,d=ui.drawing,s=this.state(),world=ensureWorldWeather(),x=b.x+16,y=b.y+48,w=b.w-32;
  const text=(a,c,v,size=14,color='#e1ebef',wrap)=>d.text(a,c,v,size,color,wrap);
  const button=(a,c,width,label,fn,active=false)=>{
   d.bevel(a,c,width,27,active?0x8a7037:0x385a6b);text(a+width/2,c+5,label,14,'#fff').setOrigin(0.5,0);
   d.rectangle(a,c,width,27,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(this.dead)return;ui.options.onSfx?.('click');fn();});
  };
  d.rectangle(x,y,w,b.h-92,0x162e3a);d.pixel(x+16,y+14,'WEATHER ARCHIVE',14,'#e6cd81');
  text(x+w-16,y+14,'ALL TIMES UTC',16,'#a7dae4').setOrigin(1,0);
  text(x+16,y+44,'Regional station observations / Hourly archive',13,'#b8cbd2');
  const date=new Date(s.epoch),pad=n=>String(n).padStart(2,'0'),cell=(w-32)/4;
  const fields=[['YEAR',date.getUTCFullYear()],['MONTH',pad(date.getUTCMonth()+1)],['DAY',pad(date.getUTCDate())],['HOUR',pad(date.getUTCHours())+':00']];
  const adjust=(i,delta)=>{
   const t=new Date(s.epoch),day=t.getUTCDate();
   if(i<2){t.setUTCDate(1);if(i===0)t.setUTCFullYear(t.getUTCFullYear()+delta);else t.setUTCMonth(t.getUTCMonth()+delta);
    t.setUTCDate(Math.min(day,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate()));}
   else t.setTime(t.getTime()+delta*(i===2?DAY:HOUR));
   if(t.getUTCFullYear()<1970||t.getUTCFullYear()>2100)return;s.epoch=t.getTime();s.page=0;this.save(s);
  };
  fields.forEach(([label,value],i)=>{const bx=x+16+i*cell;text(bx,y+75,label,12,'#e6cd81');
   button(bx,y+99,30,'-',()=>adjust(i,-1));text(bx+cell/2,y+104,String(value),18,'#fff').setOrigin(0.5,0);
   button(bx+cell-34,y+99,30,'+',()=>adjust(i,1));});
  button(x+16,y+140,150,s.stormsOnly?'STORMS ONLY':'ALL CONDITIONS',()=>{s.stormsOnly=!s.stormsOnly;s.page=0;this.save(s);},s.stormsOnly);
  button(x+180,y+140,100,'TODAY',()=>{s.epoch=getPIWorldDateEpoch();s.page=0;this.save(s);});
  if(s.epoch>=getPIWorldDateEpoch()+DAY){text(x+16,y+200,'No archived observations for future dates.',18,'#f0c28e',w-32);return;}
  const rows=STATIONS.map(station=>({station,reading:generatedWeather(station.id,s.epoch,world)}))
   .filter(row=>!s.stormsOnly||row.reading.condition==='thunderstorm');
  const size=7,pages=Math.max(1,Math.ceil(rows.length/size));s.page=Math.min(s.page,pages-1);
  const col=[x+16,x+w*.29,x+w*.62,x+w*.82];
  ['STATION','REGION','CONDITIONS','TEMP / WIND'].forEach((v,i)=>text(col[i],y+187,v,11,'#e6cd81'));
  if(!rows.length)text(x+16,y+227,'No thunderstorms reported for this hour.',17,'#c4d7dd');
  rows.slice(s.page*size,(s.page+1)*size).forEach(({station,reading:r},i)=>{
   const ry=y+211+i*31;d.rectangle(x+8,ry,w-16,30,s.selected===station.id?0x48636a:i%2?0x1c3947:0x234553);
   text(col[0],ry+6,station.name);text(col[1],ry+6,station.region,13);
   text(col[2],ry+6,LABELS[r.condition],14,r.condition==='thunderstorm'?'#f0cd77':'#d6e7ec');
   text(col[3],ry+6,`${r.temperatureC} C / ${r.windKmh} km/h`,13);
   d.rectangle(x+8,ry,w-16,30,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{s.selected=station.id;this.save(s);});
  });
  button(x+16,y+438,70,'PREV',()=>{s.page=(s.page+pages-1)%pages;this.save(s);});
  text(x+101,y+444,`${s.page+1} / ${pages} - ${rows.length} stations`,14,'#b8cbd2');
  button(x+w-86,y+438,70,'NEXT',()=>{s.page=(s.page+1)%pages;this.save(s);});
  const selected=STATIONS.find(a=>a.id===s.selected);
  if(selected){text(x+16,y+479,`${selected.name}: recent observations (UTC)`,14,'#e6cd81');
   const labels=[];for(let h=-3;h<=0;h++){const t=s.epoch+h*HOUR,r=generatedWeather(selected.id,t,world);labels.push(`${stamp(t).slice(5)} ${LABELS[r.condition]}`);}
   text(x+16,y+503,labels.join('  |  '),12,'#c4d7dd',w-32);
  }else text(x+16,y+485,'Select a station for recent observations.',14,'#b8cbd2');
 }
}
export function installComputerWeather(ui){
 if(ui[KEY])return ui[KEY];const app=new ComputerWeather(ui),restorers=[];
 const wrap=(target,key,fn)=>{const old=target[key],next=fn(old);target[key]=next;restorers.push(()=>{if(target[key]===next)target[key]=old;});};
 const previous=ui.shell.cfg.apps[APP];ui.shell.cfg.apps[APP]={title:'Weather',color:0x83b9cc,kind:null};
 wrap(ui,'openApp',old=>function(id,...args){if(id!==APP)return old.call(this,id,...args);if(this.destroyed||!this.isOpen||this.suspended||this.booting)return;this.menuOpen=false;this.shell.open(APP);this.render();});
 wrap(ui.desktop,'render',old=>function(...args){const result=old.apply(this,args),d=ui.drawing,{x,y}=ui.layout,cx=x+496,cy=y+46,g=ui.scene.add.graphics();d.add(g);
  g.fillStyle(0xe3bc61,1);g.fillCircle(cx+11,cy-9,14);g.fillStyle(0xb6d2dd,1);g.fillCircle(cx-10,cy+1,12);g.fillCircle(cx+3,cy-3,15);g.fillCircle(cx+18,cy+3,10);g.fillRect(cx-13,cy,32,12);
  g.lineStyle(3,0x71b5db,1);for(let i=0;i<3;i++)g.lineBetween(cx-11+i*13,cy+19,cx-16+i*13,cy+28);
  d.text(cx,cy+35,'Weather',15,'#fff').setOrigin(.5,0);d.rectangle(x+436,y+10,120,94,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>ui.openApp(APP));return result;});
 wrap(ui.shell,'drawStartMenu',old=>function(layout,items,...args){const copy=items.slice();if(!copy.some(i=>i.app===APP))copy.unshift({app:APP,label:'Weather',color:0x83b9cc,kind:null});return old.call(this,layout,copy,...args);});
 wrap(ui.monitor,'renderApplication',old=>function(...args){if(ui.app!==APP)return old.apply(this,args);const l=ui.layout,d=ui.drawing,b=ui.shell.rectFor({x:l.x+12,y:l.y+10,w:l.w-24,h:l.h-58});ui.window=b;
  d.bevel(b.x,b.y,b.w,b.h,0xc9c7bb);d.rectangle(b.x+4,b.y+4,b.w-8,34,0x23496d);d.pixel(b.x+16,b.y+15,'WEATHER ARCHIVE',11,'#fff');
  d.button(b.x+b.w-48,b.y+6,'X',()=>{ui.shell.close(APP);ui.render();});app.render(b);d.text(b.x+16,b.y+b.h-28,'Historical observations / UTC',13,'#3a3428');});
 let dead=false;function destroy(){if(dead)return;dead=true;app.destroy();ui.scene.events.off('shutdown',destroy);for(const undo of restorers.reverse())undo();if(previous)ui.shell.cfg.apps[APP]=previous;else delete ui.shell.cfg.apps[APP];delete ui[KEY];}
 const api={destroy};ui[KEY]=api;ui.scene.events.once('shutdown',destroy);wrap(ui,'destroy',old=>function(...args){destroy();return old.apply(this,args);});return api;
}
