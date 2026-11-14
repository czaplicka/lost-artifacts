import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONT_TEXT,MON_X,DH } from './PhoneConfig.js';
import { gameState } from '../../GameData.js';
import { cloudCase,cloudTitle,reedPhoneQuestions } from '../PlayerCloudModel.js';
import { phoneCaseProgress } from './PhoneInvestigation.js';
import { bindPhoneNotesAction } from './PhoneNotesActions.js';
export function renderReedCloudPhoneNotes(){
 this.clearPaper();
 const inv=this,p=this.phone,scene=p.scene;
 const definition=this.searchData?.cases?.find(d=>d.id==='miramar_demo');if(!definition||!this.active)return;
 const x=24,y=70,w=MON_X-x-18,h=DH-y-24;
 const root=scene.add.container(x,y);this.paper=root;p.ui.add(root);
 const add=n=>{root.add(n);return n;};
 const text=(x,y,value,size=17,color='#345b68',width=w-70)=>add(scene.add.text(x,y,value,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:4}));
 const button=(x,y,label,action,enabled=true)=>{
  const n=text(x,y,label,17,enabled?'#345b68':'#a89b7e');
  if(enabled)bindPhoneNotesAction(inv,root,n,action);return n;
 };
 add(scene.add.rectangle(0,0,w,h,0xeee1b7).setOrigin(0).setInteractive());text(30,18,__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_9c8c92c07f2da2c4bdb0"),22);
 const progress=cloudCase(gameState,definition.id),clouds=progress.clouds.filter(c=>c.titleKey);
 const choosing=this.phase==='choose',active=clouds.find(c=>c.id===this.playerTopicCloudId);
 const flags=phoneCaseProgress(definition.id).flags||[];let entries;
 if(active){
  text(30,54,cloudTitle(gameState,definition,active)+' ?',18);
  entries=reedPhoneQuestions(gameState,definition,active,this.active,flags).map(topic=>({label:topic.questionLabel,action:()=>{
   if(inv.phase!=='choose'||p.directoryOpen)return;inv.pending=topic;inv.play(topic.lines,'response');
  }}));
 }else entries=clouds.map(cloud=>({label:cloudTitle(gameState,definition,cloud)+__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_81d6591c690c70c74282"),action:()=>{inv.playerTopicCloudId=cloud.id;inv.notePage=0;p.render();}}));
 const top=95,bottom=h-95,chunks=[];let current=[],used=0;
 const probe=scene.add.text(0,0,'',{fontFamily:FONT_TEXT,fontSize:'17px',wordWrap:{width:w-70},lineSpacing:4}).setVisible(false);
 try{
  for(const entry of entries){
   probe.setText(entry.label);const height=Math.max(38,probe.height+12);
   if(current.length&&used+height>bottom-top){chunks.push(current);current=[];used=0;}
   current.push({...entry,y:top+used});used+=height;
  }
 }finally{probe.destroy();}
 if(current.length)chunks.push(current);if(!chunks.length)chunks.push([]);
 this.notePage=Math.max(0,Math.min(chunks.length-1,this.notePage||0));
 for(const entry of chunks[this.notePage])button(30,entry.y,entry.label,entry.action,choosing&&!p.directoryOpen);
 if(!entries.length)text(30,top,active?__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_4bbb5041488b86ba4ff3"):__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_14b5fd6c115670a7ad16"),17,'#786b53');
 button(30,h-82,__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_d463afc6ea8f75cc6b55"),()=>{inv.notePage--;p.render();},this.notePage>0);
 text(w/2,h-80,`${this.notePage+1}/${chunks.length}`,14);
 button(w-108,h-82,__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_8188caf087609e305acc"),()=>{inv.notePage++;p.render();},this.notePage<chunks.length-1);
 button(30,h-40,active?__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_9e905f09f84609111358"):__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_a1129ed66b026c7ba94c"),()=>{inv.playerTopicCloudId=null;inv.notePage=0;p.render();},choosing);
 button(190,h-40,__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_57122ddcbe5aaddde50a"),()=>inv.replay(),choosing&&(phoneCaseProgress(definition.id).transcripts||[]).length>0);
 if(choosing){p.logContainer.setVisible(false);p.prompt.setVisible(false);p.statusText.setVisible(true).setText(__dialogueText("ui/pi-phone/PlayerCloudPhoneNotes.js", "t_90c1a393d4e412163ab2"));}
 if(p.directoryOpen){root.setVisible(false);p.ui.bringToTop(p.dir);}
}
