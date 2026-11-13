import { getArchiveCaseId, getMissionReportForm, saveMissionReportIncidentChoice } from '../../archiveReportService.js';
import { getReportIncidentHistory } from '../../managers/ReportIncidentService.js';
import { prepareMissionReportAudio, playMissionReportAudio, stopMissionReportAudio } from '../MissionReportAudio.js';
function paginate(text, width=76, count=8) {
  const lines=[];
  for(const paragraph of String(text).split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/)) {
      if(line && (line+' '+word).length>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    lines.push(line);
  }
  const pages=[];for(let i=0;i<lines.length;i+=count)pages.push(lines.slice(i,i+count).join('\n'));
  return pages.length?pages:[''];
}
function renderSummary(owner,original){
  const drawing=owner.drawing,button=drawing.button;
  const wrapped=function(x,y,label,callback,...args){
    const object=button.call(this,x,y,label,callback,...args);
    if(label==='PRINT REPORT'||label==='COLLECT REPORT'){
      object.removeAllListeners('pointerdown');
      object.on('pointerdown',()=>{
        if(owner.destroyed||!owner.isOpen||owner.suspended||owner.app!=='reports'||
          !owner.scene.sys.isActive()||object.active===false||!object.scene)return;
        callback();
      });
    }
    return object;
  };
  drawing.button=wrapped;
  try{return original.call(owner);}
  finally{if(drawing.button===wrapped)drawing.button=button;}
}
export function installReportIncidentUI(Class) {
  const original=Class.prototype.renderReport;
  const originalPrint=Class.prototype.printReport;
  const originalClose=Class.prototype.close;
  if(typeof originalClose==='function')Class.prototype.close=function(...args){stopMissionReportAudio(this);return originalClose.apply(this,args);};
  Class.prototype.renderReport=function() {
    prepareMissionReportAudio(this.scene);
    if(!this.form?.ok){renderSummary(this,original);return;}
    if(this.incidentCaseId!==this.reportCaseId){this.incidentCaseId=this.reportCaseId;this.incidentMode=null;this.incidentBodyPage=0;this.incidentHistoryPage=0;}
    if(!this.incidentMode) {
      renderSummary(this,original);
      const {x,y,h}=this.window;
      this.drawing.button(x+250,y+h-77,'OBSERVATIONS',()=>{this.persistReport();this.incidentMode='message';this.incidentBodyPage=0;this.render();});
      return;
    }
    const d=this.drawing,b=this.window;
    if(getArchiveCaseId(this.state)!==this.reportCaseId){this.openApp('reports');return;}
    this.form=getMissionReportForm(this.locations(),this.state);
    const history=getReportIncidentHistory().filter(entry=>entry.phase==='resolved');
    d.button(b.x+18,b.y+44,'< SUMMARY',()=>{this.incidentMode=null;this.render();});
    d.button(b.x+210,b.y+44,'MESSAGE',()=>{this.incidentMode='message';this.incidentBodyPage=0;this.render();});
    d.button(b.x+375,b.y+44,'DECISION',()=>{this.incidentMode='decision';this.render();});
    d.button(b.x+550,b.y+44,'HISTORY',()=>{this.incidentMode='history';this.incidentBodyPage=0;this.render();});
    let entry=this.form.incident;
    if(this.incidentMode==='history') {
      if(!history.length){d.text(b.x+25,b.y+105,'No filed observations yet. Consequences appear after Frank accepts a report.',20,'#28454b',b.w-50);return;}
      this.incidentHistoryPage=Math.max(0,Math.min(this.incidentHistoryPage||0,history.length-1));
      entry=history[this.incidentHistoryPage];
      d.button(b.x+18,b.y+b.h-53,'<',()=>{this.incidentHistoryPage=(this.incidentHistoryPage-1+history.length)%history.length;this.incidentBodyPage=0;this.render();});
      d.text(b.x+75,b.y+b.h-43,`${this.incidentHistoryPage+1}/${history.length}`,14,'#28454b');
      d.button(b.x+150,b.y+b.h-53,'>',()=>{this.incidentHistoryPage=(this.incidentHistoryPage+1)%history.length;this.incidentBodyPage=0;this.render();});
    }
    if(!entry){d.text(b.x+25,b.y+105,'No new administrative observation for this report. Previously printed reports remain valid.',20,'#28454b',b.w-50);return;}
    const item=entry.definition, selected=item.choices.find(c=>c.id===entry.choiceId);
    const readonly=this.incidentMode==='history'||entry.phase!=='draft'||this.form.printed||this.form.submitted;
    const heading=d.text(b.x+24,b.y+95,item.subject,20,'#28454b');d.fit(heading,item.subject,b.w-48);
    d.text(b.x+24,b.y+129,`${item.sender} / ${item.channel}`,15,'#526756',b.w-48);
    if(this.incidentMode==='decision') {
      item.choices.forEach((choice,index)=>{
        const oy=b.y+174+index*70, chosen=choice.id===entry.choiceId;
        d.bevel(b.x+22,oy,b.w-44,62,chosen?0xf4df9a:0xe9e5d3);
        d.text(b.x+34,oy+12,`${chosen?'[X]':'[ ]'} ${choice.label}`,17,'#28454b',b.w-70);
        if(!readonly)d.rectangle(b.x+22,oy,b.w-44,62,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{
          if(getArchiveCaseId(this.state)!==this.reportCaseId){this.openApp('reports');return;}
          const result=saveMissionReportIncidentChoice(choice.id,this.locations(),this.state);
          this.notice=result.ok?(result.saved?'Recommendation saved. It locks when printed.':'Choice kept for this session. Save manually.'):'This recommendation can no longer be changed.';
          this.form=getMissionReportForm(this.locations(),this.state);this.render();
        });
      });
      d.text(b.x+24,b.y+396,readonly?'This recommendation is locked.':'Administrative recommendation only. It does not alter case evidence or the verdict.',14,'#526756',b.w-48);
    } else {
      const body=this.incidentMode==='history'?`Your recommendation: ${selected?.label||'None'}\n\nFOLLOW-UP\n${entry.outcome||'Pending'}`:
        `${item.body}\n\n${entry.phase==='resolved'?'FOLLOW-UP\n'+entry.outcome:'Read this message, then open DECISION. The choice locks on printing; follow-up appears after filing.'}`;
      const pages=paginate(body);
      this.incidentBodyPage=Math.max(0,Math.min(this.incidentBodyPage||0,pages.length-1));
      d.text(b.x+24,b.y+174,pages[this.incidentBodyPage],19,'#28454b',b.w-48);
      if(pages.length>1){
        d.button(b.x+b.w-210,b.y+397,'<',()=>{this.incidentBodyPage=(this.incidentBodyPage-1+pages.length)%pages.length;this.render();});
        d.text(b.x+b.w-150,b.y+408,`${this.incidentBodyPage+1}/${pages.length}`,14,'#28454b');
        d.button(b.x+b.w-75,b.y+397,'>',()=>{this.incidentBodyPage=(this.incidentBodyPage+1)%pages.length;this.render();});
      }
    }
    if(this.incidentMode!=='history')d.text(b.x+24,b.y+b.h-32,this.notice||'Personnel consequences are not covered by the printer warranty.',13,'#665535',b.w-48);
  };
  Class.prototype.printReport=function(){
    if(this.destroyed||!this.isOpen||this.suspended||this.app!=='reports'||!this.scene.sys.isActive())return;
    if(this.form?.incident?.phase==='draft' && !this.form.incident.choiceId){
      this.persistReport();this.incidentMode='message';this.incidentBodyPage=0;
      this.notice='Read the message and choose a recommendation in DECISION before printing.';this.render();return;
    }
    if(getArchiveCaseId(this.state)!==this.reportCaseId)return originalPrint.call(this);
    const before=getMissionReportForm(this.locations(),this.state),caseId=this.reportCaseId;
    const result=originalPrint.call(this);
    if(getArchiveCaseId(this.state)===caseId&&this.reportCaseId===caseId&&!before.printed&&this.form?.printed&&!this.form.submitted)playMissionReportAudio(this);
    return result;
  };
}
