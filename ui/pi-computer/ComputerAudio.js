import {
  getDeadMenAudioWorkspace,
  readDeadMenAudioSource,
  answerDeadMenAudioComparison
} from '../../managers/DeadMenCallingService.js';
import { FONTS } from './ComputerTheme.js';

const GAP = 12;

export class ComputerAudio {
  constructor(ui) {
    this.ui=ui;this.recentId=null;this.archiveId=null;
    this.pages={recent:0,archive:0,review:0,prompt:0,feedback:0};
    this.choice=null;this.questionId=null;this.feedback='';this.notice='';
    this.mode='sources';this.sourceGroup='recent';
  }
  live() {
    const ui=this.ui;
    return !ui.destroyed && ui.isOpen && !ui.suspended && ui.app==='audio';
  }
  refresh() {if (this.live()) this.ui.render();}
  select(kind,id) {
    if (!this.live() || !['recent','archive'].includes(kind)) return;
    if (kind==='recent') this.recentId=id;else this.archiveId=id;
    this.pages[kind]=0;readDeadMenAudioSource(id);this.refresh();
  }
  measure(value,size=14,width=0,font='body',padding=false) {
    const probe=this.ui.scene.add.text(0,0,String(value || ''),{
      fontFamily:FONTS[font] || FONTS.body,fontSize:`${size}px`,
      ...(width>0 ? {wordWrap:{width}} : {})
    });
    if (padding) probe.setPadding(12,9,12,7);
    const result={width:probe.width,height:probe.height};probe.destroy();return result;
  }
  buttonFlow(items,x,y,width) {
    const d=this.ui.drawing;
    let xx=x,yy=y,rowHeight=0;
    for (const item of items) {
      const measured=this.measure(item.label,11,0,'pixel',true);
      if (xx>x && xx+measured.width>x+width) {xx=x;yy+=rowHeight+GAP;rowHeight=0;}
      const button=d.button(xx,yy,item.label,()=>{if (this.live()) item.action();},item.enabled!==false);
      if (item.selected) d.frame(xx-2,yy-2,button.width+4,button.height+4,0xf1d58c,1,2);
      xx+=button.width+GAP;rowHeight=Math.max(rowHeight,button.height);
    }
    return yy+rowHeight;
  }
  paged(text,x,y,w,h,key) {
    const ui=this.ui,d=ui.drawing,size=14,lineH=20;
    const probe=ui.scene.add.text(0,0,'',{fontFamily:FONTS.body,fontSize:`${size}px`,wordWrap:{width:w}});
    const lines=probe.getWrappedText(String(text || ''));probe.destroy();
    const rows=Math.max(1,Math.floor((h-36)/lineH));
    const count=Math.max(1,Math.ceil(lines.length/rows));
    this.pages[key]=Math.max(0,Math.min(count-1,this.pages[key] || 0));
    d.text(x,y,lines.slice(this.pages[key]*rows,(this.pages[key]+1)*rows).join('\n'),size,'#dbe9d2',w).setLineSpacing(6);
    if (count>1) {
      d.button(x,y+h-30,'<',()=>{if (!this.live()) return;this.pages[key]--;this.refresh();},this.pages[key]>0);
      d.text(x+46,y+h-22,`${this.pages[key]+1}/${count}`,12,'#b8c4b0');
      d.button(x+100,y+h-30,'>',()=>{if (!this.live()) return;this.pages[key]++;this.refresh();},this.pages[key]<count-1);
    }
  }
  panel(kind,title,items,selected,x,y,w,h) {
    const d=this.ui.drawing;
    d.rectangle(x,y,w,h,0x15251e);
    d.text(x+10,y+8,title,16,'#f0d386',w-20);
    if (!items.length) {
      d.text(x+10,y+40,'No sources received yet. Continue the client interview and check your mail.',14,'#c8d0bc',w-20);return;
    }
    const end=this.buttonFlow(items.map((source,index)=>({
      label:kind==='recent' ? `CALL ${index+1}` : `ARCHIVE ${String.fromCharCode(65+index)}`,
      selected:source.id===selected,action:()=>this.select(kind,source.id)
    })),x+10,y+36,w-20);
    const source=items.find(item=>item.id===selected);
    const bodyY=end+14;
    if (!source) {d.text(x+10,bodyY,'Choose a transcript above.',14,'#c8d0bc',w-20);return;}
    this.paged(source.body,x+10,bodyY,w-20,Math.max(45,y+h-bodyY-10),kind);
  }
  setMode(mode) {if (!this.live()) return;this.mode=mode;this.refresh();}
  renderSources(data,x,y,w,h) {
    if (w>=660) {
      const panelW=(w-GAP)/2;
      this.panel('recent','RECENT CALL TRANSCRIPTS',data.recent,this.recentId,x,y,panelW,h);
      this.panel('archive','ARCHIVE TRANSCRIPTS',data.archive,this.archiveId,x+panelW+GAP,y,panelW,h);
      return;
    }
    const end=this.buttonFlow([
      {label:'RECENT CALLS',selected:this.sourceGroup==='recent',action:()=>{this.sourceGroup='recent';this.refresh();}},
      {label:'ARCHIVES',selected:this.sourceGroup==='archive',action:()=>{this.sourceGroup='archive';this.refresh();}}
    ],x,y,w);
    const kind=this.sourceGroup,panelY=end+GAP;
    this.panel(kind,kind==='recent' ? 'RECENT CALL TRANSCRIPTS' : 'ARCHIVE TRANSCRIPTS',
      data[kind],kind==='recent' ? this.recentId : this.archiveId,x,panelY,w,Math.max(60,y+h-panelY));
  }
  renderQuestion(state,x,y,w,h) {
    const d=this.ui.drawing;
    d.rectangle(x,y,w,h,0x142219);
    if (!state.ready || state.done) {
      const prefix=this.notice ? this.notice+'\n\n' : '';
      this.paged(prefix+state.body,x+12,y+12,w-24,Math.max(45,h-24),'review');return;
    }
    const question=state.question;
    if (!question || !Array.isArray(question.options) || !question.options.length) {
      d.text(x+12,y+12,'No comparison question is currently available.',14,'#e4dfc2',w-24);return;
    }
    if (this.questionId!==question.id) {
      this.questionId=question.id;this.choice=null;this.feedback='';
      this.pages.prompt=0;this.pages.feedback=0;
    }
    const innerW=w-24;
    const optionHeights=question.options.map(option=>Math.max(36,this.measure(option.label,16,innerW-28).height+16));
    const optionsH=optionHeights.reduce((sum,height)=>sum+height,0)+8*(question.options.length-1);
    if (h<optionsH+215) {
      this.paged('Make the Owl Audio window taller to display the question, all answer choices and feedback without overlap.',
        x+12,y+12,innerW,Math.max(45,h-24),'review');return;
    }
    const promptH=Math.max(65,h-optionsH-150);
    const prompt=(this.notice ? this.notice+'\n\n' : '')+question.prompt;
    this.paged(prompt,x+12,y+12,innerW,promptH,'prompt');
    let yy=y+12+promptH+8;
    question.options.forEach((option,index)=>{
      const selected=this.choice===index,height=optionHeights[index];
      const bg=d.rectangle(x+12,yy,innerW,height,selected ? 0x395b3f : 0x263c2d)
        .setInteractive({useHandCursor:true});
      d.frame(x+12,yy,innerW,height,selected ? 0xf1d58c : 0x64816b,1,selected ? 2 : 1);
      d.text(x+24,yy+8,`${index+1}. ${option.label}`,16,selected ? '#fff0bd' : '#dbe9d2',innerW-24);
      bg.on('pointerdown',()=>{
        if (!this.live() || this.questionId!==question.id) return;
        this.choice=index;this.feedback='';this.notice='';this.pages.feedback=0;this.refresh();
      });
      yy+=height+8;
    });
    const selectedText=this.choice===null ? 'No answer selected. Click one of the options above.'
      : `Your selection: ${question.options[this.choice].label}`;
    const selection=d.text(x+12,yy,selectedText,13,'#c3d6bd',innerW);
    yy+=selection.height+8;
    const check=d.button(x+12,yy,'CHECK ANSWER',()=>{
      if (!this.live() || this.questionId!==question.id || this.choice===null) return;
      const result=answerDeadMenAudioComparison(question.id,this.choice);
      if (result.ok) {this.notice=result.message;this.feedback='';}
      else {this.feedback=result.message;this.notice='';}
      this.pages.prompt=0;this.pages.feedback=0;this.pages.review=0;this.refresh();
    },this.choice!==null);
    yy+=check.height+10;
    if (this.feedback) this.paged(this.feedback,x+12,yy,innerW,Math.max(45,y+h-yy-6),'feedback');
  }
  render() {
    const ui=this.ui,d=ui.drawing,b=ui.window;
    const data=getDeadMenAudioWorkspace();
    const x=b.x+16,y=b.y+48,w=b.w-32,h=b.h-91;
    d.rectangle(x,y,w,h,0x202e27);
    d.text(x+10,y+8,'OWL AUDIO / DEAD MEN CALLING',18,'#f1d58c',w-20);
    d.text(x+10,y+34,'Transcript comparison — there are no audio files to play.',13,'#bfcab7',w-20);
    if (!data.available) {
      d.text(x+12,y+78,'Accept the case and read the client’s correspondence to receive the transcripts.',16,'#e4dfc2',w-24);return;
    }
    if (!data.recent.some(item=>item.id===this.recentId)) this.recentId=data.recent[0]?.id || null;
    if (!data.archive.some(item=>item.id===this.archiveId)) this.archiveId=data.archive[0]?.id || null;
    const guidance=d.text(x+10,y+56,
      '1. Read CALL 1–3 and ARCHIVE A–C.  2. Compare exact sentences and [background sound] notes.  3. Open QUESTIONS and select your own answer.',
      14,'#dbe9d2',w-20);
    const navY=y+56+guidance.height+12;
    const navEnd=this.buttonFlow([
      {label:'SOURCES',selected:this.mode==='sources',action:()=>this.setMode('sources')},
      {label:'QUESTIONS',selected:this.mode==='questions',action:()=>this.setMode('questions')}
    ],x+10,navY,w-20);
    const areaY=navEnd+12,areaH=Math.max(80,y+h-areaY-10);
    if (areaH<180) {
      this.paged('Make the Owl Audio window taller to view the transcripts and controls.',
        x+12,areaY+8,w-24,Math.max(45,areaH-16),'review');return;
    }
    // A displayed source is marked as viewed, never as a solved answer.
    if (this.mode==='sources') {
      const visible=w-12>=660 ? [this.recentId,this.archiveId]
        : [this.sourceGroup==='recent' ? this.recentId : this.archiveId];
      for (const id of visible) if (id) readDeadMenAudioSource(id);
    }
    const state=getDeadMenAudioWorkspace();
    if (this.mode==='sources') this.renderSources(state,x+6,areaY,w-12,areaH);
    else this.renderQuestion(state,x+6,areaY,w-12,areaH);
  }
}
