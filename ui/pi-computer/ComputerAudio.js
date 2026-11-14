import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { getDeadMenAudioWorkspace,readDeadMenAudioSource,answerDeadMenAudioComparison } from '../../managers/DeadMenCallingService.js';
import { FONTS } from './ComputerTheme.js';
import { computerUiCanInteract,playComputerUiClick } from './ComputerUiAudio.js';
import { computerActionButton } from './ComputerActionButton.js';
const GAP=12;
export class ComputerAudio{
 constructor(ui){
  this.ui=ui;this.recentId=null;this.archiveId=null;this.pages={recent:0,archive:0,review:0,prompt:0,feedback:0};
  this.choice=null;this.questionId=null;this.feedback='';this.notice='';this.mode='sources';this.sourceGroup='recent';
 }
 live(){return computerUiCanInteract(this.ui)&&!this.ui.booting&&this.ui.app==='audio';}
 refresh(){if(this.live())this.ui.render();}
 select(kind,id){
  if(!this.live()||!['recent','archive'].includes(kind))return;
  if(kind==='recent')this.recentId=id;else this.archiveId=id;
  this.pages[kind]=0;readDeadMenAudioSource(id);this.refresh();
 }
 measure(value,size=14,width=0,font='body',padding=false){
  const probe=this.ui.scene.add.text(0,0,String(value||''),{fontFamily:FONTS[font]||FONTS.body,fontSize:`${size}px`,...(width>0?{wordWrap:{width}}:{})});
  if(padding)probe.setPadding(12,9,12,7);const result={width:probe.width,height:probe.height};probe.destroy();return result;
 }
 buttonFlow(items,x,y,width){
  const d=this.ui.drawing;let xx=x,yy=y,rowHeight=0;
  for(const item of items){
   const measured=this.measure(item.label,11,0,'pixel',true);
   if(xx>x&&xx+measured.width>x+width){xx=x;yy+=rowHeight+GAP;rowHeight=0;}
   const button=computerActionButton(this.ui,xx,yy,item.label,()=>{
    if(!this.live())return;item.action();return item.selected?undefined:'click';
   },item.enabled!==false);
   if(item.selected)d.frame(xx-2,yy-2,button.width+4,button.height+4,0xf1d58c,1,2);
   xx+=button.width+GAP;rowHeight=Math.max(rowHeight,button.height);
  }return yy+rowHeight;
 }
 paged(text,x,y,w,h,key){
  const ui=this.ui,d=ui.drawing,size=14,lineH=20;
  const probe=ui.scene.add.text(0,0,'',{fontFamily:FONTS.body,fontSize:`${size}px`,wordWrap:{width:w}});
  const lines=probe.getWrappedText(String(text||''));probe.destroy();
  const rows=Math.max(1,Math.floor((h-36)/lineH)),count=Math.max(1,Math.ceil(lines.length/rows));
  this.pages[key]=Math.max(0,Math.min(count-1,this.pages[key]||0));
  d.text(x,y,lines.slice(this.pages[key]*rows,(this.pages[key]+1)*rows).join('\n'),size,'#dbe9d2',w).setLineSpacing(6);
  if(count>1){
   const sourceId=key==='recent'?this.recentId:key==='archive'?this.archiveId:this.questionId;
   const turn=delta=>{
    if(!this.live())return;
    const current=key==='recent'?this.recentId:key==='archive'?this.archiveId:this.questionId;if(current!==sourceId)return;
    const before=this.pages[key],next=Math.max(0,Math.min(count-1,before+delta));if(next===before)return;
    this.pages[key]=next;this.refresh();return 'click';
   };
   computerActionButton(ui,x,y+h-30,'<',()=>turn(-1),this.pages[key]>0);
   d.text(x+46,y+h-22,`${this.pages[key]+1}/${count}`,12,'#b8c4b0');
   computerActionButton(ui,x+100,y+h-30,'>',()=>turn(1),this.pages[key]<count-1);
  }
 }
 panel(kind,title,items,selected,x,y,w,h){
  const d=this.ui.drawing;d.rectangle(x,y,w,h,0x15251e);d.text(x+10,y+8,title,16,'#f0d386',w-20);
  if(!items.length){d.text(x+10,y+40,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_bfb50011f1a49aa91f9a"),14,'#c8d0bc',w-20);return;}
  const end=this.buttonFlow(items.map((source,index)=>({label:kind===__dialogueText("ui/pi-computer/ComputerAudio.js", "t_034a7e52c5c9534b709d")?`${__dialogueText("ui/pi-computer/ComputerAudio.js", "t_b2c73f0821600884e08d")}${index+1}`:`${__dialogueText("ui/pi-computer/ComputerAudio.js", "t_f1cb38668b33bd5a6448")}${String.fromCharCode(65+index)}`,selected:source.id===selected,action:()=>this.select(kind,source.id)})),x+10,y+36,w-20);
  const source=items.find(item=>item.id===selected),bodyY=end+14;
  if(!source){d.text(x+10,bodyY,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_2bd32fffea2614ff27f6"),14,'#c8d0bc',w-20);return;}
  this.paged(source.body,x+10,bodyY,w-20,Math.max(45,y+h-bodyY-10),kind);
 }
 setMode(mode){if(!this.live())return;this.mode=mode;this.refresh();}
 renderSources(data,x,y,w,h){
  if(w>=660){const panelW=(w-GAP)/2;this.panel('recent',__dialogueText("ui/pi-computer/ComputerAudio.js", "t_d3445eb3229986182f3a"),data.recent,this.recentId,x,y,panelW,h);this.panel('archive',__dialogueText("ui/pi-computer/ComputerAudio.js", "t_68a640e066a0abf69e3b"),data.archive,this.archiveId,x+panelW+GAP,y,panelW,h);return;}
  const end=this.buttonFlow([
   {label:__dialogueText("ui/pi-computer/ComputerAudio.js", "t_2bece585042c170fa05f"),selected:this.sourceGroup==='recent',action:()=>{this.sourceGroup='recent';this.refresh();}},
   {label:__dialogueText("ui/pi-computer/ComputerAudio.js", "t_f95d29ef128a3b578982"),selected:this.sourceGroup==='archive',action:()=>{this.sourceGroup='archive';this.refresh();}}
  ],x,y,w);
  const kind=this.sourceGroup,panelY=end+GAP;
  this.panel(kind,kind==='recent'?__dialogueText("ui/pi-computer/ComputerAudio.js", "t_d3445eb3229986182f3a"):__dialogueText("ui/pi-computer/ComputerAudio.js", "t_68a640e066a0abf69e3b"),data[kind],kind==='recent'?this.recentId:this.archiveId,x,panelY,w,Math.max(60,y+h-panelY));
 }
 renderQuestion(state,x,y,w,h){
  const d=this.ui.drawing;d.rectangle(x,y,w,h,0x142219);
  if(!state.ready||state.done){const prefix=this.notice?this.notice+'\n\n':'';this.paged(prefix+state.body,x+12,y+12,w-24,Math.max(45,h-24),'review');return;}
  const question=state.question;
  if(!question||!Array.isArray(question.options)||!question.options.length){d.text(x+12,y+12,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_3aa6b49f6e853b1cf120"),14,'#e4dfc2',w-24);return;}
  if(this.questionId!==question.id){this.questionId=question.id;this.choice=null;this.feedback='';this.pages.prompt=0;this.pages.feedback=0;}
  const innerW=w-24,optionHeights=question.options.map(option=>Math.max(36,this.measure(option.label,16,innerW-28).height+16));
  const optionsH=optionHeights.reduce((sum,height)=>sum+height,0)+8*(question.options.length-1);
  if(h<optionsH+215){this.paged(__dialogueText("ui/pi-computer/ComputerAudio.js", "t_5596cb009d85ce5c98fe"),x+12,y+12,innerW,Math.max(45,h-24),'review');return;}
  const promptH=Math.max(65,h-optionsH-150),prompt=(this.notice?this.notice+'\n\n':'')+question.prompt;
  this.paged(prompt,x+12,y+12,innerW,promptH,'prompt');let yy=y+12+promptH+8;
  const token=this.ui.viewToken;
  question.options.forEach((option,index)=>{
   const selected=this.choice===index,height=optionHeights[index];
   const bg=d.rectangle(x+12,yy,innerW,height,selected?0x395b3f:0x263c2d).setInteractive({useHandCursor:true});
   d.frame(x+12,yy,innerW,height,selected?0xf1d58c:0x64816b,1,selected?2:1);
   d.text(x+24,yy+8,`${index+1}. ${option.label}`,16,selected?'#fff0bd':'#dbe9d2',innerW-24);
   bg.on('pointerdown',()=>{
    if(!this.live()||this.questionId!==question.id||this.ui.viewToken!==token||bg.active===false||!bg.scene)return;
    const changed=this.choice!==index;this.choice=index;this.feedback='';this.notice='';this.pages.feedback=0;
    if(changed)playComputerUiClick(this.ui);this.refresh();
   });yy+=height+8;
  });
  const selectedText=this.choice===null?__dialogueText("ui/pi-computer/ComputerAudio.js", "t_3c3b48f4aace25dbe2f6"):`${__dialogueText("ui/pi-computer/ComputerAudio.js", "t_d72bb1b932be90014994")}${question.options[this.choice].label}`;
  const selection=d.text(x+12,yy,selectedText,13,'#c3d6bd',innerW);yy+=selection.height+8;
  const check=computerActionButton(this.ui,x+12,yy,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_1bdb867eafc7fdd5df9b"),()=>{
   if(!this.live()||this.questionId!==question.id||this.choice===null)return;
   const result=answerDeadMenAudioComparison(question.id,this.choice);
   if(result.ok){this.notice=result.message;this.feedback='';}else{this.feedback=result.message;this.notice='';}
   this.pages.prompt=0;this.pages.feedback=0;this.pages.review=0;this.refresh();return 'click';
  },this.choice!==null);
  yy+=check.height+10;if(this.feedback)this.paged(this.feedback,x+12,yy,innerW,Math.max(45,y+h-yy-6),'feedback');
 }
 render(){
  const ui=this.ui,d=ui.drawing,b=ui.window,data=getDeadMenAudioWorkspace(),x=b.x+16,y=b.y+48,w=b.w-32,h=b.h-91;
  d.rectangle(x,y,w,h,0x202e27);d.text(x+10,y+8,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_7af9ba3ec31b617be1a8"),18,'#f1d58c',w-20);
  d.text(x+10,y+34,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_1692d43ef2ab447ffeca"),13,'#bfcab7',w-20);
  if(!data.available){d.text(x+12,y+78,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_68868a7fa2bd9a40c3e9"),16,'#e4dfc2',w-24);return;}
  if(!data.recent.some(item=>item.id===this.recentId))this.recentId=data.recent[0]?.id||null;
  if(!data.archive.some(item=>item.id===this.archiveId))this.archiveId=data.archive[0]?.id||null;
  const guidance=d.text(x+10,y+56,__dialogueText("ui/pi-computer/ComputerAudio.js", "t_3d30b97e0e470a6dec3c"),14,'#dbe9d2',w-20);
  const navY=y+56+guidance.height+12,navEnd=this.buttonFlow([
   {label:__dialogueText("ui/pi-computer/ComputerAudio.js", "t_03d463b7203aa1add0c5"),selected:this.mode==='sources',action:()=>this.setMode('sources')},
   {label:__dialogueText("ui/pi-computer/ComputerAudio.js", "t_23cbbc9800cd708a85ed"),selected:this.mode==='questions',action:()=>this.setMode('questions')}
  ],x+10,navY,w-20);
  const areaY=navEnd+12,areaH=Math.max(80,y+h-areaY-10);
  if(areaH<180){this.paged(__dialogueText("ui/pi-computer/ComputerAudio.js", "t_68b492084f5368dbed42"),x+12,areaY+8,w-24,Math.max(45,areaH-16),'review');return;}
  if(this.mode==='sources'){
   const visible=w-12>=660?[this.recentId,this.archiveId]:[this.sourceGroup==='recent'?this.recentId:this.archiveId];
   for(const id of visible)if(id)readDeadMenAudioSource(id);
  }
  const state=getDeadMenAudioWorkspace();
  if(this.mode==='sources')this.renderSources(state,x+6,areaY,w-12,areaH);else this.renderQuestion(state,x+6,areaY,w-12,areaH);
 }
}
