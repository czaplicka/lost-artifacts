import {OPEN_SKIES as C} from '../../assets/data/openSkiesContent.js';
import {openSkiesQuest,openSkiesProgress,openSkiesPackageDue,collectOpenSkiesPackage,readOpenSkiesDocument,registerOpenSkiesData,getOpenSkiesMail,getOpenSkiesCall} from '../../managers/OpenSkiesService.js';
import {getOpenSkiesReportMessages} from '../../managers/OpenSkiesReportService.js';
import {installOpenSkiesResearch} from './OpenSkiesResearch.js';
import {OpenSkiesReportUI} from './OpenSkiesReportUI.js';
const APP='open-skies-file',KEY=Symbol.for('lost-artifacts.open-skies.computer.v1');
export function installOpenSkiesComputer(ui){
 if(ui[KEY])return ui[KEY];
 const scene=ui.scene,docs=ui.documents,restore=[],research=installOpenSkiesResearch(ui),reportUI=new OpenSkiesReportUI(ui);
 const entries=[...C.documents,{id:'research',title:'Research'},{id:'report',title:'Location report'}];
 let dead=false,selected='cover',page=0,audio=null,audioError='',lastCheck=-Infinity;
 const wrap=(target,key,factory)=>{const old=target[key],next=factory(old);target[key]=next;restore.push(()=>{if(target[key]===next)target[key]=old;});};
 registerOpenSkiesData(scene);const previous=ui.shell.cfg.apps[APP];ui.shell.cfg.apps[APP]={title:'Open Skies case file',kind:null,color:0xc9ad6d};
 wrap(docs,'getMail',old=>function(...args){const rows=old.apply(this,args)||[],generated=[...getOpenSkiesReportMessages(),...getOpenSkiesMail()],ids=new Set(generated.map(m=>m.id));return [...generated,...rows.filter(m=>!ids.has(m.id))];});
 wrap(docs,'getClassifieds',old=>function(...args){registerOpenSkiesData(scene);const rows=old.apply(this,args)||[];if(openSkiesQuest())return rows.filter(a=>a.missionId!==C.caseId);return rows.some(a=>a.missionId===C.caseId)?rows:[...rows,C.advert];});
 wrap(ui,'openApp',old=>function(id,...args){if(id!==APP)return old.call(this,id,...args);if(dead||this.destroyed||!this.isOpen||this.suspended||this.booting)return;
  if(!openSkiesProgress()?.collectedAt){this.notice='The foundation materials have not been collected.';this.render();return;}this.menuOpen=false;this.shell.open(APP);this.render();});
 const refresh=()=>{if(!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting)ui.render();};
 function stopAudio(){if(audio){audio.pause();audio.currentTime=0;}}
 function playAudio(){const call=getOpenSkiesCall();if(!call?.audioUrl)return;
  if(!audio){audio=new Audio(call.audioUrl);audio.addEventListener('error',()=>{audioError='The recording could not be loaded.';refresh();});}
  audio.play().catch(e=>{console.error('[OpenSkies] Audio:',e);audioError='Playback failed. Check the audio file.';refresh();});}
 function fileRender(){
  const d=ui.drawing,l=ui.layout,b=ui.shell.rectFor({x:l.x+12,y:l.y+10,w:l.w-24,h:l.h-58});ui.window=b;
  d.bevel(b.x,b.y,b.w,b.h,0xd4cdbb);d.rectangle(b.x+4,b.y+4,b.w-8,34,0x355467);d.pixel(b.x+16,b.y+15,'OPEN SKIES / CASE MATERIALS',10,'#fff');d.button(b.x+b.w-48,b.y+6,'X',()=>{stopAudio();ui.shell.close(APP);ui.render();});
  if(!openSkiesProgress()?.collectedAt){d.text(b.x+20,b.y+64,'Case materials have not been collected.',18,'#352f25');return;}
  const left=b.x+18,top=b.y+57;
  entries.forEach((item,i)=>{const ry=top+i*48;d.bevel(left,ry,225,39,item.id===selected?0xb5bdba:0xe4dcc8);d.text(left+10,ry+11,item.title,15,'#292e30',205);
   d.rectangle(left,ry,225,39,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{stopAudio();selected=item.id;page=0;if(selected==='research')void research.load();else if(selected!=='report')readOpenSkiesDocument(selected);ui.render();});});
  const item=entries.find(d=>d.id===selected)||entries[0],tx=left+247,tw=b.w-285;d.text(tx,top,item.title,22,'#273f4b',tw);
  if(selected==='research')research.render({x:tx,y:top+52,w:tw,h:b.h-145});else if(selected==='report')reportUI.render({x:tx,y:top+52,w:tw,h:b.h-145});
  else{const probe=scene.add.text(-10000,-10000,item.body,{fontFamily:'SpecialElite, monospace',fontSize:'18px',wordWrap:{width:tw}}),lines=probe.getWrappedText(item.body);probe.destroy();
   const chunk=12,pages=Math.max(1,Math.ceil(lines.length/chunk));page=Math.min(page,pages-1);d.text(tx,top+44,lines.slice(page*chunk,(page+1)*chunk).join('\n'),18,'#38332c',tw);
   if(pages>1){d.button(tx,b.y+b.h-87,'PREV',()=>{page=(page+pages-1)%pages;ui.render();});d.button(tx+100,b.y+b.h-87,'NEXT',()=>{page=(page+1)%pages;ui.render();});}
   if(selected==='recording'){const call=getOpenSkiesCall();d.text(tx,top+190,call?`Call received: ${call.date}, ${call.time}\n${call.receivedIn}`:'Call metadata unavailable.',18,'#273f4b',tw);
    d.button(tx,top+265,'PLAY',playAudio,!!call?.audioUrl);d.button(tx+105,top+265,'STOP',stopAudio,!!call?.audioUrl);
    d.text(tx,top+310,audioError||(!call?.audioUrl?'Recording not supplied.':call.audioKind==='environment_preview'?'Environment preview / President dialogue not recorded yet.':''),15,'#6d4836',tw);
   }
  }
  d.text(b.x+18,b.y+b.h-30,'Open Skies Foundation / Case materials',13,'#514837',b.w-36);
 }
 wrap(ui.monitor,'renderApplication',old=>function(...args){if(ui.app===APP)return fileRender();return old.apply(this,args);});
 wrap(docs,'render',old=>function(...args){const result=old.apply(this,args);if(ui.app==='mail'&&ui.selectedId===C.messageId&&openSkiesProgress()?.collectedAt&&ui.window){const b=ui.window;ui.drawing.button(b.x+b.w-210,b.y+6,'CASE FILE',()=>ui.openApp(APP));}return result;});
 const parcel=scene.add.container(0,0).setDepth(2400).setVisible(false),art=scene.add.graphics();parcel.add(art);
 art.fillStyle(0x2a241b,.7);art.fillRoundedRect(-5,-5,190,92,5);art.fillStyle(0xd6b77d,1);art.fillRect(5,4,68,45);art.lineStyle(2,0x6b5135,1);art.strokeRect(5,4,68,45);art.lineBetween(5,4,39,27);art.lineBetween(73,4,39,27);
 const label=scene.add.text(83,7,'OPEN SKIES\nPOSTAL DELIVERY',{fontFamily:'SpecialElite, monospace',fontSize:'13px',color:'#fff0c8'}),hint=scene.add.text(7,61,'COLLECT MATERIALS',{fontFamily:'SpecialElite, monospace',fontSize:'14px',color:'#fff0c8'}),hit=scene.add.rectangle(90,40,190,92,0,0).setInteractive({useHandCursor:true});parcel.add([label,hint,hit]);
 hit.on('pointerdown',pointer=>{if(!scene.canUseOffice?.()||scene.pointerBlocked?.(pointer)||!openSkiesPackageDue())return;if(!collectOpenSkiesPackage().ok)return;parcel.setVisible(false);readOpenSkiesDocument('cover');
  const had=Object.prototype.hasOwnProperty.call(ui.options,'skipBoot'),old=ui.options.skipBoot;try{ui.options.skipBoot=true;ui.open();if(!ui.booting)ui.openApp(APP);}finally{if(had)ui.options.skipBoot=old;else delete ui.options.skipBoot;}});
 function step(){if(dead||ui.destroyed)return;if(audio&&!audio.paused&&(ui.suspended||!ui.isOpen||ui.shell.focusedApp()!==APP))stopAudio();
  const now=scene.time?.now??Date.now();if(now-lastCheck<250)return;lastCheck=now;parcel.setPosition(Math.max(10,scene.scale.width-205),Math.max(10,scene.scale.height-110));const visible=!!scene.canUseOffice?.()&&openSkiesPackageDue();parcel.setVisible(visible);if(hit.input)hit.input.enabled=visible;}
 let disposed=false;function destroy(){if(disposed)return;disposed=true;dead=true;stopAudio();if(audio){audio.removeAttribute('src');audio.load();audio=null;}parcel.destroy(true);scene.events.off('update',step);scene.events.off('shutdown',destroy);for(const undo of restore.reverse())undo();research.destroy();if(previous)ui.shell.cfg.apps[APP]=previous;else delete ui.shell.cfg.apps[APP];delete ui[KEY];}
 const api={destroy};ui[KEY]=api;scene.events.on('update',step);scene.events.once('shutdown',destroy);wrap(ui,'destroy',old=>function(...args){destroy();return old.apply(this,args);});return api;
}
