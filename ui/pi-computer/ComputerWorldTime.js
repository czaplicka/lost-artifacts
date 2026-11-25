import {gameState} from '../../GameData.js';
import {requestAutosave} from '../../gameStatePersistence.js';
import {getPIWorldDateEpoch,zoneParts,resolveZoneTime,localEpoch,timeStamp,zoneOffset} from '../../systems/PIWorldCalendar.js';
const APP='world-time',KEY=Symbol.for('lost-artifacts.world-time.v2');
const CITIES=[['UTC','UTC'],['New York','America/New_York'],['Chicago','America/Chicago'],['Los Angeles','America/Los_Angeles'],['Vancouver','America/Vancouver'],['Mexico City','America/Mexico_City'],['Lima','America/Lima'],['Santiago','America/Santiago'],['Buenos Aires','America/Argentina/Buenos_Aires'],['Rio de Janeiro','America/Sao_Paulo'],['Honolulu','Pacific/Honolulu'],['Anchorage','America/Anchorage'],['London','Europe/London'],['Lisbon','Europe/Lisbon'],['Paris','Europe/Paris'],['Madrid','Europe/Madrid'],['Rome','Europe/Rome'],['Warsaw','Europe/Warsaw'],['Athens','Europe/Athens'],['Istanbul','Europe/Istanbul'],['Cairo','Africa/Cairo'],['Cape Town','Africa/Johannesburg'],['Lagos','Africa/Lagos'],['Nairobi','Africa/Nairobi'],['Dubai','Asia/Dubai'],['Mumbai','Asia/Kolkata'],['Kathmandu','Asia/Kathmandu'],['Bangkok','Asia/Bangkok'],['Singapore','Asia/Singapore'],['Hong Kong','Asia/Hong_Kong'],['Beijing','Asia/Shanghai'],['Tokyo','Asia/Tokyo'],['Seoul','Asia/Seoul'],['Perth','Australia/Perth'],['Adelaide','Australia/Adelaide'],['Sydney','Australia/Sydney'],['Auckland','Pacific/Auckland'],['Apia','Pacific/Apia']];
export {zoneParts as worldTimeParts,resolveZoneTime as resolveWorldTime};
const pad=n=>String(n).padStart(2,'0');
export class ComputerWorldTime{
 constructor(ui){this.ui=ui;}
 get state(){
  const s=gameState.piQuests?.worldTime;
  if(s?.version===2&&CITIES[s.source]&&s.local&&['year','month','day','hour','minute'].every(k=>Number.isInteger(s.local[k])))return {...s,local:{...s.local},page:Math.min(4,Math.max(0,s.page||0))};
  const date=new Date(getPIWorldDateEpoch());return {version:2,source:0,page:0,occurrence:0,local:{year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate(),hour:12,minute:0}};
 }
 save(s){gameState.piQuests={...(gameState.piQuests||{version:1,quests:{}}),worldTime:s};requestAutosave();this.ui.render();}
 change(field,delta){const s=this.state,p=s.local,t=new Date(localEpoch(p));
  if(field==='year'||field==='month'){t.setUTCDate(1);if(field==='year')t.setUTCFullYear(t.getUTCFullYear()+delta);else t.setUTCMonth(t.getUTCMonth()+delta);
   t.setUTCDate(Math.min(p.day,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate()));}
  else t.setTime(t.getTime()+delta*({day:86400000,hour:3600000,minute:60000}[field]));
  if(t.getUTCFullYear()<1970||t.getUTCFullYear()>2100)return;
  s.local={year:t.getUTCFullYear(),month:t.getUTCMonth()+1,day:t.getUTCDate(),hour:t.getUTCHours(),minute:t.getUTCMinutes()};s.occurrence=0;this.save(s);
 }
 render(b){
  const ui=this.ui,d=ui.drawing,s=this.state,x=b.x+18,y=b.y+48,w=b.w-36;
  const button=(a,c,bw,label,fn)=>{d.bevel(a,c,bw,27,0x38586b);d.text(a+bw/2,c+5,label,14,'#fff').setOrigin(.5,0);d.rectangle(a,c,bw,27,0,0).setInteractive({useHandCursor:true}).on('pointerdown',fn);};
  d.rectangle(x,y,w,b.h-96,0x152b3b);d.pixel(x+16,y+16,'WORLD TIME',15,'#e9ce7b');d.text(x+16,y+43,'Date & time converter',16,'#c5d5dc');
  d.text(x+16,y+80,'REFERENCE CITY',13,'#e9ce7b');
  button(x+16,y+103,36,'<',()=>{s.source=(s.source+CITIES.length-1)%CITIES.length;s.occurrence=0;this.save(s);});
  d.text(x+64,y+108,CITIES[s.source][0],19,'#fff');button(x+w-52,y+103,36,'>',()=>{s.source=(s.source+1)%CITIES.length;s.occurrence=0;this.save(s);});
  const cell=(w-32)/5;[['year','YEAR'],['month','MONTH'],['day','DAY'],['hour','HOUR'],['minute','MINUTE']].forEach(([field,label],i)=>{
   const bx=x+16+i*cell;d.text(bx,y+148,label,12,'#b7cbd3');button(bx,y+171,30,'-',()=>this.change(field,-1));
   d.text(bx+cell/2,y+205,field==='year'?String(s.local[field]):pad(s.local[field]),23,'#fff').setOrigin(.5,0);button(bx+cell-34,y+171,30,'+',()=>this.change(field,1));
  });
  let times=[],error='';try{times=resolveZoneTime(s.local,CITIES[s.source][1]);}catch(e){console.error('[WorldTime]',e);error='Time zone data unavailable.';}
  const index=Math.min(s.occurrence||0,Math.max(0,times.length-1)),epoch=times[index];
  if(times.length>1)button(x+16,y+241,w-32,`Repeated hour: ${index+1}/${times.length} - switch`,()=>{s.occurrence=1-index;this.save(s);});
  else d.text(x+16,y+246,error||(times.length?'All rows show the same moment.':'This local time does not exist: clock change.'),14,times.length?'#b7cbd3':'#ffc18a',w-32);
  d.text(x+16,y+284,'CITY',12,'#e9ce7b');d.text(x+w*.43,y+284,'LOCAL DATE / TIME',12,'#e9ce7b');d.text(x+w-120,y+284,'OFFSET',12,'#e9ce7b');
  CITIES.slice(s.page*8,(s.page+1)*8).forEach(([name,zone],i)=>{const ry=y+308+i*23;if(i%2===0)d.rectangle(x+8,ry-1,w-16,23,0x234355);
   let time='--',offset='--';if(Number.isFinite(epoch))try{time=timeStamp(zoneParts(epoch,zone));offset=zoneOffset(epoch,zone);}catch(_){time='Unavailable';}
   d.text(x+16,ry,name,14,'#fff');d.text(x+w*.43,ry,time,14,'#d7ece3');d.text(x+w-120,ry,offset,14,'#d9c98e');});
  button(x+16,y+500,70,'PREV',()=>{s.page=(s.page+4)%5;this.save(s);});d.text(x+100,y+506,`${s.page+1} / 5`,14,'#b7cbd3');button(x+w-86,y+500,70,'NEXT',()=>{s.page=(s.page+1)%5;this.save(s);});
 }
}
export function installComputerWorldTime(ui){
 if(ui[KEY])return ui[KEY];const app=new ComputerWorldTime(ui),restore=[];
 const wrap=(target,key,factory)=>{const old=target[key],next=factory(old);target[key]=next;restore.push(()=>{if(target[key]===next)target[key]=old;});};
 const previous=ui.shell.cfg.apps[APP];ui.shell.cfg.apps[APP]={title:'World Time',color:0x98b9ce,kind:null};
 wrap(ui,'openApp',old=>function(id,...args){if(id!==APP)return old.call(this,id,...args);if(this.destroyed||!this.isOpen||this.suspended||this.booting)return;this.menuOpen=false;this.shell.open(APP);this.render();});
 wrap(ui.desktop,'render',old=>function(...args){const result=old.apply(this,args),{x,y}=ui.layout,d=ui.drawing,cx=x+376,cy=y+46,g=ui.scene.add.graphics();d.add(g);
  g.fillStyle(0x98b9ce,1);g.fillCircle(cx,cy,23);g.lineStyle(2,0x172c40,1);g.strokeCircle(cx,cy,23);g.lineBetween(cx,cy,cx,cy-14);g.lineBetween(cx,cy,cx+11,cy+5);
  d.text(cx,cy+32,'World Time',15,'#fff').setOrigin(.5,0);d.rectangle(x+316,y+10,120,94,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>ui.openApp(APP));return result;});
 wrap(ui.shell,'drawStartMenu',old=>function(layout,items,...args){const copy=items.slice();if(!copy.some(i=>i.app===APP))copy.unshift({app:APP,label:'World Time',color:0x98b9ce,kind:null});return old.call(this,layout,copy,...args);});
 wrap(ui.monitor,'renderApplication',old=>function(...args){if(ui.app!==APP)return old.apply(this,args);const d=ui.drawing,l=ui.layout,b=ui.shell.rectFor({x:l.x+12,y:l.y+10,w:l.w-24,h:l.h-58});ui.window=b;
  d.bevel(b.x,b.y,b.w,b.h,0xc9c7bb);d.rectangle(b.x+4,b.y+4,b.w-8,34,0x23496d);d.pixel(b.x+16,b.y+15,'WORLD TIME',11,'#fff');d.button(b.x+b.w-48,b.y+6,'X',()=>{ui.shell.close(APP);ui.render();});app.render(b);d.text(b.x+16,b.y+b.h-28,'Manual converter / Historical time zones',13,'#3a3428');});
 let dead=false;function destroy(){if(dead)return;dead=true;ui.scene.events.off('shutdown',destroy);for(const undo of restore.reverse())undo();if(previous)ui.shell.cfg.apps[APP]=previous;else delete ui.shell.cfg.apps[APP];delete ui[KEY];}
 const api={destroy};ui[KEY]=api;ui.scene.events.once('shutdown',destroy);wrap(ui,'destroy',old=>function(...args){destroy();return old.apply(this,args);});return api;
}
