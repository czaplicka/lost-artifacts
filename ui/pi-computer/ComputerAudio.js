import { getDeadMenAudioWorkspace, readDeadMenAudioSource, answerDeadMenAudioComparison } from '../../managers/DeadMenCallingService.js';

export class ComputerAudio {
  constructor(ui) {
    this.ui=ui;
    this.recentId=null;
    this.archiveId=null;
    this.pages={recent:0,archive:0,review:0};
    this.choice=0;
    this.questionId=null;
    this.feedback='';
  }
  live() {
    const ui=this.ui;
    return !ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='audio';
  }
  refresh() {if(this.live())this.ui.render();}
  select(kind,id) {
    if(!this.live())return;
    if(kind==='recent')this.recentId=id;else this.archiveId=id;
    this.pages[kind]=0;
    readDeadMenAudioSource(id);
    this.refresh();
  }
  paged(text,x,y,w,h,key) {
    const ui=this.ui,d=ui.drawing,size=14,lineH=20;
    const probe=ui.scene.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,wordWrap:{width:w}});
    const lines=probe.getWrappedText(text||'');probe.destroy();
    const rows=Math.max(1,Math.floor((h-36)/lineH));
    const count=Math.max(1,Math.ceil(lines.length/rows));
    this.pages[key]=Math.max(0,Math.min(count-1,this.pages[key]||0));
    d.text(x,y,lines.slice(this.pages[key]*rows,(this.pages[key]+1)*rows).join('\n'),size,'#dbe9d2',w).setLineSpacing(6);
    if(count>1) {
      d.button(x,y+h-30,'<',()=>{if(!this.live())return;this.pages[key]--;this.refresh();},this.pages[key]>0);
      d.text(x+46,y+h-22,`${this.pages[key]+1}/${count}`,12,'#b8c4b0');
      d.button(x+100,y+h-30,'>',()=>{if(!this.live())return;this.pages[key]++;this.refresh();},this.pages[key]<count-1);
    }
  }
  panel(kind,title,items,selected,x,y,w,h) {
    const d=this.ui.drawing;
    d.rectangle(x,y,w,h,0x15251e);
    d.text(x+10,y+8,title,16,'#f0d386',w-20);
    if(!items.length){d.text(x+10,y+39,'No sources received yet.',14,'#c8d0bc',w-20);return;}
    items.forEach((source,index)=>{
      const button=d.button(x+10+index*78,y+34,kind==='recent'?`CALL ${index+1}`:`ARCH ${String.fromCharCode(65+index)}`,()=>this.select(kind,source.id));
    });
    const source=items.find(item=>item.id===selected);
    if(!source){d.text(x+10,y+82,'Select a source to read its transcript.',14,'#c8d0bc',w-20);return;}
    this.paged(source.body,x+10,y+80,w-20,h-90,kind);
  }
  render() {
    const ui=this.ui,d=ui.drawing,b=ui.window;
    const data=getDeadMenAudioWorkspace();
    const left=b.x+16,top=b.y+48,width=b.w-32,height=b.h-91;
    d.rectangle(left,top,width,height,0x202e27);
    d.text(left+10,top+8,'OWL AUDIO / DEAD MEN CALLING',18,'#f1d58c',width-20);
    d.text(left+10,top+34,'Transcript comparison — no playable audio files attached.',13,'#bfcab7',width-20);
    if(!data.available){d.text(left+12,top+77,'No case sources available. Accept the case and read the client’s correspondence first.',16,'#e4dfc2',width-24);return;}
    // Opening the application displays one source from each received group.
    if(!data.recent.some(item=>item.id===this.recentId))this.recentId=data.recent[0]?.id||null;
    if(!data.archive.some(item=>item.id===this.archiveId))this.archiveId=data.archive[0]?.id||null;
    for(const id of [this.recentId,this.archiveId])if(id)readDeadMenAudioSource(id);
    const gap=12,panelW=(width-gap)/2;
    const panelY=top+62,panelH=Math.max(150,Math.floor(height*.51));
    this.panel('recent','RECENT VOICEMAILS',data.recent,this.recentId,left,panelY,panelW,panelH);
    this.panel('archive','OLDER RECORDINGS',data.archive,this.archiveId,left+panelW+gap,panelY,panelW,panelH);
    // Refresh readiness after displaying sources; reading never answers questions.
    const state=getDeadMenAudioWorkspace();
    const reviewY=panelY+panelH+10,reviewH=top+height-reviewY;
    d.rectangle(left,reviewY,width,Math.max(1,reviewH),0x142219);
    if(!state.ready||state.done){
      this.paged(state.body,left+10,reviewY+9,width-20,Math.max(45,reviewH-16),'review');return;
    }
    const question=state.question;
    if(!question)return;
    if(this.questionId!==question.id){this.questionId=question.id;this.choice=0;this.feedback='';this.pages.review=0;}
    const text=question.prompt+'\n\nSelected answer: '+question.options[this.choice].label+(this.feedback?'\n\n'+this.feedback:'');
    this.paged(text,left+10,reviewY+9,width-20,Math.max(45,reviewH-56),'review');
    const buttonsY=top+height-35;
    d.button(left+10,buttonsY,'NEXT OPTION',()=>{
      if(!this.live())return;
      this.choice=(this.choice+1)%question.options.length;this.feedback='';this.pages.review=0;this.refresh();
    });
    d.button(left+210,buttonsY,'CHECK ANSWER',()=>{
      if(!this.live())return;
      const result=answerDeadMenAudioComparison(question.id,this.choice);
      this.feedback=result.message;this.pages.review=0;this.refresh();
    });
  }
}
