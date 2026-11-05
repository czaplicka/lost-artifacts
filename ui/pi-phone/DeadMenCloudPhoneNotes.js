import { FONT_TEXT, MON_X, DH } from './PhoneConfig.js';
import { gameState } from '../../GameData.js';
import { cloudCase,cloudTitle } from '../PlayerCloudModel.js';
import { deadMenCloudQuestions } from '../DeadMenCloudModel.js';
import { phoneCaseProgress } from './PhoneInvestigation.js';

export function renderDeadMenCloudPhoneNotes(){
 this.clearPaper();
 const inv=this,phone=this.phone,scene=phone.scene;
 const definition=this.searchData?.cases?.find(c=>c.id==='dead_men_calling');if(!definition)return;
 const px=24,py=70,width=MON_X-px-18,height=DH-py-24;
 const root=scene.add.container(px,py);this.paper=root;phone.ui.add(root);
 const add=n=>{root.add(n);return n;};
 const text=(x,y,value,size=17,color='#345b68',wrap=width-65)=>add(scene.add.text(x,y,value,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width:wrap},lineSpacing:4}));
 const button=(x,y,label,action,enabled=true)=>{
  const n=text(x,y,label,17,enabled?'#345b68':'#a59779');
  if(enabled)n.setInteractive({useHandCursor:true}).on('pointerdown',(_p,_x,_y,event)=>{event?.stopPropagation();action();});return n;
 };
 add(scene.add.rectangle(0,0,width,height,0xeee1b7).setOrigin(0).setInteractive());
 text(30,18,'CASE TOPICS',22);
 const clouds=cloudCase(gameState,definition.id).clouds.filter(c=>c.titleKey);
 if(this.dmCloudContact!==this.active.number){this.dmCloudContact=this.active.number;this.dmCloudId=null;this.notePage=0;}
 const active=clouds.find(c=>c.id===this.dmCloudId),choosing=this.phase==='choose'&&!phone.directoryOpen;
 let entries;
 if(active){
  text(30,55,cloudTitle(gameState,definition,active)+' ?',18);
  entries=deadMenCloudQuestions(gameState,definition,active,this.active.topics).map(topic=>({label:topic.questionLabel,action:()=>{
   if(inv.phase!=='choose'||phone.directoryOpen||phone.state!=='connected')return;
   // Re-check the currently available stage before beginning a response.
   const current=deadMenCloudQuestions(gameState,definition,active,inv.active.topics).find(t=>t.id===topic.id);
   if(!current)return;inv.pending=current;inv.play(current.lines,'response');
  }}));
 }else entries=clouds.map(cloud=>({label:cloudTitle(gameState,definition,cloud)+' ?',action:()=>{inv.dmCloudId=cloud.id;inv.notePage=0;phone.render();}}));
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
 if(!entries.length)text(30,top,active?'No question is supported by the details in this cloud at this stage.':'Create and name a cloud in CASE NOTES on the computer first.',17,'#786c54');
 button(30,height-82,'< PAGE',()=>{inv.notePage--;phone.render();},choosing&&this.notePage>0);
 text(width/2,height-80,`${this.notePage+1}/${pages.length}`,14);
 button(width-108,height-82,'PAGE >',()=>{inv.notePage++;phone.render();},choosing&&this.notePage<pages.length-1);
 button(30,height-40,active?'[ TOPICS ]':'[ REFRESH ]',()=>{inv.dmCloudId=null;inv.notePage=0;phone.render();},choosing);
 button(190,height-40,'[ READ LAST ]',()=>inv.replay(),choosing&&(phoneCaseProgress(definition.id).transcripts||[]).length>0);
 if(choosing){phone.logContainer.setVisible(false);phone.prompt.setVisible(false);phone.statusText.setVisible(true).setText('Choose a topic from your named clouds.');}
 if(phone.directoryOpen){root.setVisible(false);phone.ui.bringToTop(phone.dir);}
}
