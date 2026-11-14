import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {NewspaperLayout} from './NewspaperUI.js';
export class NewspaperPublicationLayout extends NewspaperLayout {
 drawSideStory(container,layout,slot,article,rng){
  if(!article.imageKey)return super.drawSideStory(container,layout,slot,article,rng);
  this.drawBarLabel(container,slot.x,slot.y,slot.id==='secondary_1'?__dialogueText("ui/NewspaperPublicationLayout.js", "t_e37e76492e76a05877c5"):__dialogueText("ui/NewspaperPublicationLayout.js", "t_9e2d3810022336797c3c"));
  const headline=this.fitBlock(container,article.headline||'',{x:slot.x,y:slot.y+layout.barHeight+12,width:slot.width,maxHeight:Math.min(slot.headlineMaxH,100),maxSize:slot.headlineSize,minSize:slot.headlineMin,style:{fontFamily:'SpecialElite',color:'#1e1a16',lineSpacing:4}});
  let cursor=headline.y+headline.height+12;const bottom=slot.y+slot.height;
  const photoH=Math.max(60,Math.min(120,(bottom-cursor)*.4));
  this.drawPhoto(container,article.imageKey,slot.x+8,cursor+8,slot.width-16,photoH,-.5);cursor+=photoH+26;
  if(article.imageCaption){const caption=this.fitBlock(container,article.imageCaption,{x:slot.x,y:cursor,width:slot.width,maxHeight:32,maxSize:12,minSize:9,style:{fontFamily:'SpecialElite',color:'#5a4636',fontStyle:'italic'}});cursor+=caption.height+8;}
  this.fitBlock(container,article.body||'',{x:slot.x,y:cursor,width:slot.width,maxHeight:Math.max(24,bottom-cursor),maxSize:slot.bodySize,minSize:Math.min(slot.bodyMin,11),style:{fontFamily:'SpecialElite',color:'#2b2219',lineSpacing:4}});
 }
 renderTime(container,layout,data){
  super.renderTime(container,layout,data);
  const box=layout.illustration,scene=this.scene;
  if(data.imageKey&&box&&scene.textures.exists(data.imageKey)){
   const frame=scene.textures.get(data.imageKey).get(),scale=Math.max(box.width/frame.width,box.height/frame.height),cw=box.width/scale,ch=box.height/scale,cx=(frame.width-cw)/2,cy=(frame.height-ch)/2;
   container.add(scene.add.rectangle(box.x+box.width/2,box.y+box.height/2,box.width,box.height,0xefe6cf));
   container.add(scene.add.image(box.x-cx*scale,box.y-cy*scale,data.imageKey).setOrigin(0).setScale(scale).setCrop(cx,cy,cw,ch));
   const border=scene.add.graphics();border.lineStyle(4,0x14161f,1);border.strokeRect(box.x,box.y,box.width,box.height);container.add(border);
  }
  if(typeof data.imageCaption==='string'&&data.imageCaption.trim()){
   const c=layout.caption,cx=layout.cover.x+layout.cover.width/2;container.add(scene.add.rectangle(cx,c.y+c.height/2,layout.illustration.width+16,c.height+4,0xefe6cf));
   this.fitBlock(container,scene.fillTemplate?.(data.imageCaption,scene.buildTemplateContext?.()||{})||data.imageCaption,{x:cx,y:c.y,width:layout.illustration.width,maxHeight:c.height,maxSize:13,minSize:9,originX:.5,align:'center',style:{fontFamily:'SpecialElite',color:'#14161f'}});
  }
 }
}
