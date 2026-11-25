import {getOpenSkiesReport,getOpenSkiesReportChoices,editOpenSkiesReport,attachOpenSkiesWeather,
 toggleOpenSkiesReportSource,reviewOpenSkiesReport,submitOpenSkiesLead,canEditOpenSkiesReport,OPEN_SKIES_PATTERNS,
 getOpenSkiesRewardStatus,claimOpenSkiesReward} from '../../managers/OpenSkiesReportService.js';
import {WEATHER_STATIONS,WEATHER_LABELS} from '../../systems/PIWorldWeather.js';
const pad=n=>String(n).padStart(2,'0');
export class OpenSkiesReportUI{
 constructor(ui){this.ui=ui;this.page=0;this.sourcePage=0;this.notice='';this.confirming=null;}
 action(fn){const r=fn();this.notice=r.message||'';this.confirming=null;this.ui.render();}
 render(b){
  const ui=this.ui,d=ui.drawing,x=b.x,y=b.y,w=b.w,state=getOpenSkiesReport(),draft=state.draft,choices=getOpenSkiesReportChoices(),editable=canEditOpenSkiesReport(),reward=getOpenSkiesRewardStatus();
  const text=(a,c,v,size=15,color='#38332c',wrap=w)=>d.text(a,c,v,size,color,wrap);
  const button=(a,c,width,label,fn,active=false,enabled=true)=>{d.bevel(a,c,width,29,enabled?(active?0xb3c6ae:0xe4dcc8):0xc8c3b8);text(a+width/2,c+7,label,14,enabled?'#293936':'#787367',0).setOrigin(.5,0);
   if(enabled)d.rectangle(a,c,width,29,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{ui.options.onSfx?.('click');fn();});};
  button(x,y,120,'FINDINGS',()=>{this.page=0;this.confirming=null;ui.render();},this.page===0);
  button(x+132,y,120,'SOURCES',()=>{this.page=1;this.confirming=null;ui.render();},this.page===1);
  button(x+264,y,120,'REPORT',()=>{this.page=2;this.confirming=null;ui.render();},this.page===2);
  if(this.page===0){
   text(x,y+48,'Proposed place',16,'#273f4b');const selected=choices.towns.find(t=>t.id===draft.townId),cycleTown=delta=>{const a=choices.towns;if(!a.length)return;const i=a.findIndex(t=>t.id===draft.townId),j=i<0?(delta>0?0:a.length-1):(i+delta+a.length)%a.length;this.action(()=>editOpenSkiesReport('townId',a[j].id));};
   button(x,y+73,35,'<',()=>cycleTown(-1),false,editable);text(x+48,y+80,selected?.label||'Choose a researched place',16,'#38332c',w-96);button(x+w-35,y+73,35,'>',()=>cycleTown(1),false,editable);
   text(x,y+122,'Bell strikes',16,'#273f4b');text(x+w/2,y+122,'Local hour (24h)',16,'#273f4b');
   const count=delta=>this.action(()=>editOpenSkiesReport('bellCount',draft.bellCount===null?1:((draft.bellCount-1+delta+12)%12)+1));
   button(x,y+150,35,'-',()=>count(-1),false,editable);text(x+65,y+157,draft.bellCount===null?'--':String(draft.bellCount),18);button(x+120,y+150,35,'+',()=>count(1),false,editable);
   const hx=x+w/2,hour=delta=>this.action(()=>editOpenSkiesReport('localHour',draft.localHour===null?0:(draft.localHour+delta+24)%24));
   button(hx,y+150,35,'-',()=>hour(-1),false,editable);text(hx+53,y+157,draft.localHour===null?'--:--':pad(draft.localHour)+':00',18);button(hx+142,y+150,35,'+',()=>hour(1),false,editable);
   text(x,y+204,'Spacing between the three strikes',16,'#273f4b');const pattern=OPEN_SKIES_PATTERNS.find(p=>p.id===draft.bellPattern),cycle=delta=>{const a=OPEN_SKIES_PATTERNS,i=a.findIndex(p=>p.id===draft.bellPattern),j=i<0?(delta>0?0:a.length-1):(i+delta+a.length)%a.length;this.action(()=>editOpenSkiesReport('bellPattern',a[j].id));};
   button(x,y+232,35,'<',()=>cycle(-1),false,editable);text(x+48,y+239,pattern?.label||'Choose the spacing you heard',15,'#38332c',w-96);button(x+w-35,y+232,35,'>',()=>cycle(1),false,editable);
   [['seaHeard','Sea / surf'],['thunderHeard','Thunder']].forEach(([field,label],i)=>{const yy=y+294+i*43;text(x,yy+7,label,16,'#273f4b');button(x+165,yy,75,'YES',()=>this.action(()=>editOpenSkiesReport(field,true)),draft[field]===true,editable);button(x+252,yy,75,'NO',()=>this.action(()=>editOpenSkiesReport(field,false)),draft[field]===false,editable);});
   text(x,y+386,'Record what you hear. Research terms alone are not evidence.',14,'#75462f');
  }else if(this.page===1){
   text(x,y+51,'Weather observation',17,'#273f4b');const a=draft.weather,s=WEATHER_STATIONS.find(s=>s.id===a?.stationId);
   text(x,y+83,a?`${s?.name||a.stationId} / ${new Date(a.epoch).toISOString().slice(0,16).replace('T',' ')} UTC\n${WEATHER_LABELS[a.reading.condition]} / ${a.reading.temperatureC} C / ${a.reading.windKmh} km/h`:'No weather observation attached.',15);
   button(x,y+139,230,'ATTACH WEATHER SELECTION',()=>this.action(attachOpenSkiesWeather),false,editable);
   text(x,y+181,'Sources: town, parish notice and clock comparison',15,'#273f4b');const pages=Math.max(1,Math.ceil(choices.sources.length/4));this.sourcePage=Math.min(this.sourcePage,pages-1);
   choices.sources.slice(this.sourcePage*4,(this.sourcePage+1)*4).forEach((p,i)=>button(x,y+214+i*36,w,p.label,()=>this.action(()=>toggleOpenSkiesReportSource(p.id)),draft.sourcePageIds.includes(p.id),editable));
   if(!choices.sources.length)text(x,y+216,'Open source pages in OWL first.',15,'#75462f');
   button(x,y+365,70,'PREV',()=>{this.sourcePage=(this.sourcePage+pages-1)%pages;ui.render();});text(x+87,y+373,`${this.sourcePage+1} / ${pages}`,14);button(x+w-70,y+365,70,'NEXT',()=>{this.sourcePage=(this.sourcePage+1)%pages;ui.render();});
  }else if(!editable){
   const done=reward.phase==='completed';text(x,y+55,done?'CASE CLOSED':reward.eligible?'REPORT ACCEPTED':'REPORT LOCKED',20,'#273f4b');
   text(x,y+103,reward.eligible?'Location established: Collioure\nLandmark: Notre-Dame-des-Anges\n\nThe foundation has accepted your report.':'This case cannot be edited.',18);
   if(done)text(x,y+232,`Reward received: $${reward.actualCashPaid??200}\nXP: ${reward.xpGranted??'already recorded'}`,18,'#273f4b');
   else if(reward.eligible){text(x,y+232,'Contract: $200 base reward + 100 XP',17,'#273f4b');
    button(x,y+286,210,reward.phase==='ready'?'CLAIM REWARD':'RETRY SETTLEMENT',()=>this.action(claimOpenSkiesReward),false,!reward.cashUncertain);
    text(x,y+336,reward.cashUncertain?'Cash change needs recovery. Automatic repayment is blocked.':reward.lastError?'Settlement was interrupted. Recorded rewards will not be issued twice.':'Collect the reward for this accepted report.',14,'#75462f');
   }
  }else{
   const town=choices.towns.find(t=>t.id===draft.townId)?.label||'Not selected',a=draft.weather,pattern=OPEN_SKIES_PATTERNS.find(p=>p.id===draft.bellPattern)?.label||'Not selected';
   text(x,y+51,'Location report / $200 base + 100 XP',17,'#273f4b');text(x,y+85,`Place: ${town}\nBell strikes: ${draft.bellCount??'--'} / Local hour: ${draft.localHour===null?'--':pad(draft.localHour)+':00'}\nSpacing: ${pattern}\nSea: ${draft.seaHeard===null?'--':draft.seaHeard?'Yes':'No'} / Thunder: ${draft.thunderHeard===null?'--':draft.thunderHeard?'Yes':'No'}\nWeather: ${a?new Date(a.epoch).toISOString().slice(0,16).replace('T',' ')+' UTC':'None'}\nAttached sources: ${draft.sourcePageIds.length}`,16);
   text(x,y+255,'Review checks completeness only. Submit for assessment.',14,'#75462f');button(x,y+305,140,'REVIEW',()=>this.action(reviewOpenSkiesReport));
   const signature=JSON.stringify(draft),confirm=this.confirming===signature;button(x+154,y+305,170,confirm?'CONFIRM SEND':'SUBMIT REPORT',()=>{const check=reviewOpenSkiesReport();if(!check.ok){this.action(()=>check);return;}if(!confirm){this.confirming=signature;this.notice='Click CONFIRM SEND to submit this report.';ui.render();return;}this.action(submitOpenSkiesLead);});
   const last=state.submissions.at(-1);if(last)text(x,y+359,`Last report: revision ${last.revision}, ${last.sentGameDate}\nStatus: ${last.status==='unsupported'?'Revision required':last.status==='accepted'?'Accepted':'Earlier development lead'}`,14,'#514837');
  }
  if(this.notice)text(x,y+422,this.notice,14,'#75462f');
 }
}
