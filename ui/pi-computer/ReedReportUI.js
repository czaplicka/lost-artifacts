import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { getReedResolution, canPrepareReedReport, finishReedReport, validateReedFinale, syncReedReportIntegrity } from '../../managers/ReedResolutionService.js';
import { prepareReportCompletionAudio, reportCompletionButton } from './ReportCompletionAudio.js';
const DRAFT='reed_final_report_draft',SENT='reed_final_report_sent',REPLY='reed_final_report_reply';
export class ReedReportUI{
  constructor(ui){Object.assign(this,{ui,data:null,choice:null,confirmId:null,dead:false,controller:new AbortController()});prepareReportCompletionAudio(ui.scene);this.install();void this.load();}
  async load(){
    try{
      const r=await fetch('assets/data/reedFinale.json',{signal:this.controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);
      const data=validateReedFinale(await r.json());if(this.dead)return;this.data=data;
      syncReedReportIntegrity();
      const pending=getReedResolution();if(pending?.phase==='settling')this.choice=pending.endingId;this.refresh();
    }catch(e){if(!this.dead&&e.name!=='AbortError'){console.error('[ReedReportUI]',e);if(this.ui.isOpen&&this.ui.app==='mail'){this.ui.notice=__dialogueText("ui/pi-computer/ReedReportUI.js", "t_7a18f75d0f4d9e0e9e1b");this.refresh();}}}
  }
  refresh(){if(!this.dead&&this.ui.isOpen&&!this.ui.suspended&&!this.ui.destroyed&&this.ui.app==='mail')this.ui.render();}
  install(){
    const ui=this.ui,docs=ui.documents,mail=docs.getMail.bind(docs);
    docs.getMail=()=>{
      const items=mail().filter(m=>![DRAFT,SENT,REPLY].includes(m.id));if(!this.data)return items;
      const resolution=getReedResolution();
      if(resolution?.phase==='completed'){
        try{syncReedReportIntegrity();}catch(error){if(!this.integrityErrorShown){console.error('[ReedReportUI] Integrity reconciliation failed:',error);this.integrityErrorShown=true;}}
        return [{id:REPLY,from:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_600a842af585c408a8f3"),subject:resolution.responseSubject,date:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_9a264749f9d43669aac5"),body:resolution.response},
        {id:SENT,from:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_700ccb3aba203ee7c273"),subject:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_c43a4c853003ad59f3d4")+this.data.subject,date:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_aa56ad4b2d1623d94be8"),body:resolution.report},...items];}
      if(!canPrepareReedReport(this.data))return items;
      const ending=this.data.endings.find(e=>e.id===(resolution?.endingId||this.choice));
      return [{id:DRAFT,from:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_700ccb3aba203ee7c273"),subject:this.data.subject,date:__dialogueText("ui/pi-computer/ReedReportUI.js", "t_13256c6bc4fc99988287"),body:resolution?.phase===__dialogueText("ui/pi-computer/ReedReportUI.js", "t_0a0dcac5952689a5b7b6")?resolution.report:(ending?.report||__dialogueText("ui/pi-computer/ReedReportUI.js", "t_356a0e4bc1c00e4ec498"))},...items];
    };
    const paged=docs.renderPagedText.bind(docs);
    docs.renderPagedText=(content,x,y,w,h)=>paged(content,x,y,w,ui.app==='mail'&&ui.selectedId===DRAFT?Math.max(40,h-92):h);
    const render=docs.render.bind(docs);docs.render=()=>{render();if(this.data&&ui.app==='mail'&&ui.selectedId===DRAFT)this.render();};
  }
  render(){
    const ui=this.ui,d=ui.drawing,b=ui.window,pending=getReedResolution(),locked=pending?.phase==='settling';
    this.data.endings.forEach((e,i)=>d.button(b.x+312+i*170,b.y+b.h-130,(this.choice===e.id?'* ':'')+e.label,()=>{this.choice=e.id;this.confirmId=null;ui.bodyPage=0;this.refresh();},!locked));
    d.button(b.x+312,b.y+b.h-90,locked?__dialogueText("ui/pi-computer/ReedReportUI.js", "t_8f8babf3332e9e96ffcd"):__dialogueText("ui/pi-computer/ReedReportUI.js", "t_55f3f85fcd19f2b5b428"),()=>{this.confirmId=pending?.endingId||this.choice;this.refresh();},Boolean(pending?.endingId||this.choice));
    if(!this.confirmId)return;const ending=this.data.endings.find(e=>e.id===this.confirmId);if(!ending)return;
    const endingId=this.confirmId;
    d.rectangle(b.x+5,b.y+40,b.w-10,b.h-82,0x0d1915,.95).setInteractive();
    const x=b.x+55,y=b.y+105,w=b.w-110;d.bevel(x,y,w,235,0xe8dec0);
    d.text(x+24,y+22,__dialogueText("ui/pi-computer/ReedReportUI.js", "t_28d378010163aac785c8"),21,'#263d31',w-48);d.text(x+24,y+70,ending.title,18,'#514c39',w-48);
    const reward=pending?.reward??gameState.piQuests?.quests?.[this.data.questId]?.reward;
    d.text(x+24,y+112,`${__dialogueText("ui/pi-computer/ReedReportUI.js", "t_26412fd1cc80be145b09")}${reward}${__dialogueText("ui/pi-computer/ReedReportUI.js", "t_a4cc8eae7933fdbbb120")}`,16,'#514c39',w-48);
    reportCompletionButton(ui,x+24,y+175,'SEND',()=>{
      if(this.dead||this.confirmId!==endingId)return false;
      const completedBefore=getReedResolution()?.phase==='completed';
      const result=finishReedReport(this.data,endingId);this.confirmId=null;ui.notice=result.message;
      const newlyCompleted=result.ok&&!completedBefore&&getReedResolution()?.phase==='completed';
      if(result.ok){ui.selectedId=REPLY;ui.listPage=0;ui.bodyPage=0;}this.refresh();return Boolean(newlyCompleted);
    });
    d.button(x+w-145,y+175,'CANCEL',()=>{this.confirmId=null;this.refresh();});
  }
  destroy(){this.dead=true;this.controller.abort();}
}
