import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {FONT_TEXT,MON_X,DH} from './PhoneConfig.js';
import {gameState} from '../../GameData.js';
import {cloudCase,cloudTitle} from '../PlayerCloudModel.js';
import {alibiCloudQuestions} from '../AlibiCloudModel.js';
import {phoneCaseProgress} from './PhoneInvestigation.js';
import {bindPhoneNotesAction} from './PhoneNotesActions.js';
const CASE='borrowed_alibi';
export function renderAlibiCloudPhoneNotes(){
  this.clearPaper();
  const investigation=this,phone=this.phone,scene=phone.scene;
  const definition=this.searchData?.cases?.find(item=>item.id===CASE);
  if(!definition||!this.active)return;
  const paperX=24,paperY=70,width=MON_X-paperX-18,height=DH-paperY-24;
  const root=scene.add.container(paperX,paperY);this.paper=root;phone.ui.add(root);
  const add=object=>{root.add(object);return object;};
  const text=(x,y,value,size=17,color='#345b68',wrapWidth=width-65)=>add(scene.add.text(x,y,value,{
    fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width:wrapWidth,useAdvancedWrap:true},lineSpacing:4}));
  const button=(x,y,label,action,enabled=true)=>{
    const object=text(x,y,label,17,enabled?'#345b68':'#a59779');
    if(enabled)bindPhoneNotesAction(investigation,root,object,action);return object;
  };
  add(scene.add.rectangle(0,0,width,height,0xeee1b7).setOrigin(0).setInteractive());
  text(30,18,__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_9c8c92c07f2da2c4bdb0"),22);
  const contactId=this.active.id||this.active.number;
  if(this.alibiCloudContact!==contactId){this.alibiCloudContact=contactId;this.alibiCloudId=null;this.notePage=0;}
  const progress=cloudCase(gameState,CASE),clouds=progress.clouds.filter(cloud=>cloud.titleKey);
  const activeCloud=clouds.find(cloud=>cloud.id===this.alibiCloudId);
  const choosing=this.phase==='choose'&&!phone.directoryOpen&&phone.state==='connected';
  const flags=phoneCaseProgress(CASE).flags||[];
  let entries;
  if(activeCloud){
    text(30,55,cloudTitle(gameState,definition,activeCloud)+' ?',18);
    entries=alibiCloudQuestions(gameState,definition,activeCloud,this.active,flags).map(topic=>({label:topic.questionLabel,action:()=>{
      if(investigation.phase!=='choose'||phone.directoryOpen||phone.state!=='connected'||investigation.active?.caseId!==CASE)return;
      const latestCloud=cloudCase(gameState,CASE).clouds.find(cloud=>cloud.id===activeCloud.id);if(!latestCloud)return;
      const currentFlags=phoneCaseProgress(CASE).flags||[];
      const currentTopic=alibiCloudQuestions(gameState,definition,latestCloud,investigation.active,currentFlags).find(item=>item.id===topic.id);
      if(!currentTopic){phone.render();return;}
      investigation.pending=currentTopic;investigation.play(currentTopic.lines,'response');
    }}));
  }else entries=clouds.map(cloud=>({label:cloudTitle(gameState,definition,cloud)+__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_81d6591c690c70c74282"),action:()=>{
    if(investigation.phase!=='choose'||phone.directoryOpen)return;
    investigation.alibiCloudId=cloud.id;investigation.notePage=0;phone.render();
  }}));
  const listTop=95,listBottom=height-96,pages=[];let currentPage=[],usedHeight=0;
  const probe=scene.add.text(0,0,'',{fontFamily:FONT_TEXT,fontSize:'17px',wordWrap:{width:width-65,useAdvancedWrap:true},lineSpacing:4}).setVisible(false);
  try{
    for(const entry of entries){
      probe.setText(entry.label);const itemHeight=Math.max(38,probe.height+12);
      if(currentPage.length&&usedHeight+itemHeight>listBottom-listTop){pages.push(currentPage);currentPage=[];usedHeight=0;}
      currentPage.push({...entry,y:listTop+usedHeight});usedHeight+=itemHeight;
    }
  }finally{probe.destroy();}
  if(currentPage.length)pages.push(currentPage);if(!pages.length)pages.push([]);
  this.notePage=Math.max(0,Math.min(pages.length-1,Number(this.notePage)||0));
  for(const entry of pages[this.notePage])button(30,entry.y,entry.label,entry.action,choosing);
  if(!entries.length)text(30,listTop,activeCloud?__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_fe5204006499a29c3f19"):__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_e9bf758279570baddf99"),17,'#786c54');
  button(30,height-82,__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_d463afc6ea8f75cc6b55"),()=>{investigation.notePage--;phone.render();},choosing&&this.notePage>0);
  text(width/2,height-80,`${this.notePage+1}/${pages.length}`,14);
  button(width-108,height-82,__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_8188caf087609e305acc"),()=>{investigation.notePage++;phone.render();},choosing&&this.notePage<pages.length-1);
  button(30,height-40,activeCloud?__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_9e905f09f84609111358"):__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_a1129ed66b026c7ba94c"),()=>{investigation.alibiCloudId=null;investigation.notePage=0;phone.render();},choosing);
  const transcripts=phoneCaseProgress(CASE).transcripts||[];
  button(190,height-40,__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_57122ddcbe5aaddde50a"),()=>investigation.replay(),choosing&&transcripts.length>0);
  if(choosing){phone.logContainer.setVisible(false);phone.prompt.setVisible(false);phone.statusText.setVisible(true).setText(__dialogueText("ui/pi-phone/AlibiCloudPhoneNotes.js", "t_90c1a393d4e412163ab2"));}
  if(phone.directoryOpen){root.setVisible(false);phone.ui.bringToTop(phone.dir);}
}
