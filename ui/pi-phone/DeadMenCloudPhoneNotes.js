import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONT_TEXT,MON_X,DH } from './PhoneConfig.js';
import { gameState } from '../../GameData.js';
import { cloudCase,cloudTitle } from '../PlayerCloudModel.js';
import { deadMenCloudQuestions } from '../DeadMenCloudModel.js';
import { phoneCaseProgress } from './PhoneInvestigation.js';
import { bindPhoneNotesAction } from './PhoneNotesActions.js';
export function renderDeadMenCloudPhoneNotes(){
 this.clearPaper();
 const inv=this,phone=this.phone,scene=phone.scene;
 const definition=this.searchData?.cases?.find(c=>c.id==='dead_men_calling');if(!definition||!this.active)return;
 const px=24,py=70,width=MON_X-px-18,height=DH-py-24;
 const root=scene.add.container(px,py);this.paper=root;phone.ui.add(root);
 const add=n=>{root.add(n);return n;};
 const text=(x,y,value,size=17,color='#345b68',wrap=width-65)=>add(scene.add.text(x,y,value,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width:wrap},lineSpacing:4}));
 const button=(x,y,label,action,enabled=true)=>{
  const n=text(x,y,label,17,enabled?'#345b68':'#a59779');
  if(enabled)bindPhoneNotesAction(inv,root,n,action);return n;
 };
 add(scene.add.rectangle(0,0,width,height,0xeee1b7).setOrigin(0).setInteractive());text(30,18,__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_9c8c92c07f2da2c4bdb0"),22);
 const clouds=cloudCase(gameState,definition.id).clouds.filter(c=>c.titleKey);
 if(this.dmCloudContact!==this.active.number){this.dmCloudContact=this.active.number;this.dmCloudId=null;this.notePage=0;}
 const active=clouds.find(c=>c.id===this.dmCloudId),choosing=this.phase==='choose'&&!phone.directoryOpen;
 let entries;
 if(active){
  text(30,55,cloudTitle(gameState,definition,active)+' ?',18);
  entries=deadMenCloudQuestions(gameState,definition,active,this.active.topics).map(topic=>({label:topic.questionLabel,action:()=>{
   if(inv.phase!=='choose'||phone.directoryOpen||phone.state!=='connected')return;
   const current=deadMenCloudQuestions(gameState,definition,active,inv.active.topics).find(t=>t.id===topic.id);
   if(!current)return;inv.pending=current;inv.play(current.lines,'response');
  }}));
 }else entries=clouds.map(cloud=>({label:cloudTitle(gameState,definition,cloud)+__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_81d6591c690c70c74282"),action:()=>{inv.dmCloudId=cloud.id;inv.notePage=0;phone.render();}}));
 const top=95,bottom=height-96,pages=[];let used=0,current=[];
 const probe=scene.add.text(0,0,'',{fontFamily:FONT_TEXT,fontSize:'17px',wordWrap:{width:width-65},lineSpacing:4}).setVisible(false);
 try{
  for(const entry of entries){
   probe.setText(entry.label);const h=Math.max(38,probe.height+12);
   if(current.length&&used+h>bottom-top){pages.push(current);current=[];used=0;}
   current.push({...entry,y:top+used});used+=h;
  }
 }finally{probe.destroy();}
 if(current.length)pages.push(current);if(!pages.length)pages.push([]);
 this.notePage=Math.max(0,Math.min(pages.length-1,this.notePage||0));
 for(const entry of pages[this.notePage])button(30,entry.y,entry.label,entry.action,choosing);
 if(!entries.length)text(30,top,active?__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_fe5204006499a29c3f19"):__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_d808b377b1b13766230d"),17,'#786c54');
 button(30,height-82,__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_d463afc6ea8f75cc6b55"),()=>{inv.notePage--;phone.render();},choosing&&this.notePage>0);
 text(width/2,height-80,`${this.notePage+1}/${pages.length}`,14);
 button(width-108,height-82,__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_8188caf087609e305acc"),()=>{inv.notePage++;phone.render();},choosing&&this.notePage<pages.length-1);
 button(30,height-40,active?__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_9e905f09f84609111358"):__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_a1129ed66b026c7ba94c"),()=>{inv.dmCloudId=null;inv.notePage=0;phone.render();},choosing);
 button(190,height-40,__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_57122ddcbe5aaddde50a"),()=>inv.replay(),choosing&&(phoneCaseProgress(definition.id).transcripts||[]).length>0);
 if(choosing){phone.logContainer.setVisible(false);phone.prompt.setVisible(false);phone.statusText.setVisible(true).setText(__dialogueText("ui/pi-phone/DeadMenCloudPhoneNotes.js", "t_90c1a393d4e412163ab2"));}
 if(phone.directoryOpen){root.setVisible(false);phone.ui.bringToTop(phone.dir);}
}
