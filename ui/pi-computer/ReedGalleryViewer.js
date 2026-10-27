import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords } from './ComputerSearch.js';
import { syncReedBoardEvidence } from '../../managers/PIInvestigationManager.js';
const SEARCH='miramar_demo',QUEST='pi_two_glasses';
export const REED_GALLERY_HOTSPOTS=[
 {id:'badge',x:800/1200,y:432/620,w:56/1200,h:86/620},
 {id:'jacket',x:704/1200,y:258/620,w:344/1200,h:362/620},
 {id:'claire',x:213/1200,y:26/620,w:215/1200,h:289/620},
 {id:'nora',x:758/1200,y:26/620,w:215/1200,h:230/620}
];
export function reedGalleryHit(x,y){return REED_GALLERY_HOTSPOTS.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)||null;}
const word=(keywordId,text)=>({keywordId,text});
const descriptions={
 claire:['The published caption identifies the woman on the left as ',word('claire','Claire Sutton'),'. She is wearing a cream blouse.'],
 nora:['The published caption identifies the woman on the right as ',word('nora','Nora Bell'),'.'],
 jacket:['Nora is wearing a ',word('checked_jacket','green checked jacket'),' with contrasting pocket trim. The photograph does not establish who owns it.'],
 badge:['An orange conference badge with a ',word('swallow_logo','swallow emblem'),'. No name is legible.']
};
const caption=['Left to right: ',word('claire','Claire Sutton'),' and ',word('nora','Nora Bell'),'.'];
export class ReedGalleryViewer{
 constructor(ui){
  Object.assign(this,{ui,active:false,dead:false,overlay:null,page:null,selectedId:null});
  const draw=ui.search.drawPage.bind(ui.search);
  ui.search.drawPage=(page,area)=>{
   draw(page,area);
   if(this.dead||page.imageKey!=='Reed_conference'||!ui.scene.textures.exists(page.imageKey))return;
   this.rememberOpened();
   ui.drawing.rectangle(area.x+area.w-225,area.y+96,200,86,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.open(page));
  };
  const render=ui.monitor.render.bind(ui.monitor);
  ui.monitor.render=()=>{render();if(this.dead)return;if(ui.app!=='search'||!ui.isOpen||ui.suspended||ui.destroyed){this.active=false;this.overlay=null;return;}if(this.active)this.render();};
 }
 accepted(){return Boolean(gameState.piQuests?.quests?.[QUEST]);}
 rememberOpened(){
  if(!this.accepted())return;
  if(!gameState.reedGalleryEvidence?.opened){gameState.reedGalleryEvidence={...(gameState.reedGalleryEvidence||{}),opened:true};requestAutosave();}
  syncReedBoardEvidence();
 }
 inspect(id){
  if(this.dead||!this.active||!this.accepted()||!descriptions[id])return false;
  const old=gameState.reedGalleryEvidence||{};
  gameState.reedGalleryEvidence={...old,opened:true,selectedId:id,inspected:[...new Set([...(old.inspected||[]),id])]};
  this.selectedId=id;requestAutosave();syncReedBoardEvidence();this.ui.render();return true;
 }
 collect(id,parts){
  if(this.dead||!this.active||!this.accepted()||!parts.some(p=>typeof p==='object'&&p.keywordId===id))return false;
  discoverSearchKeywords(SEARCH,[id]);syncReedBoardEvidence();this.ui.render();return true;
 }
 open(page){
  if(this.dead||!this.ui.isOpen||this.ui.suspended||!this.ui.scene.textures.exists(page.imageKey))return;
  this.page=page;this.active=true;const saved=gameState.reedGalleryEvidence?.selectedId;
  this.selectedId=descriptions[saved]?saved:null;this.rememberOpened();this.ui.render();
 }
 close(){this.active=false;this.page=null;this.overlay?.destroy(true);this.overlay=null;if(!this.dead&&this.ui.isOpen&&!this.ui.destroyed)this.ui.render();}
 drawWords(root,parts,x,y,width,size){
  const s=this.ui.scene,probe=s.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`}).setVisible(false);
  const measure=v=>{probe.setText(v);return probe.width;};let xx=0,yy=0;const lh=size+7;
  try{
   for(const part of parts){const id=typeof part==='object'?part.keywordId:null,value=typeof part==='string'?part:part.text;
    for(const token of value.split(/(\s+)/).filter(Boolean)){
     if(/^\s+$/.test(token)){if(xx)xx+=measure(' ');continue;}
     let chunks=[],chunk='';for(const ch of token){if(chunk&&measure(chunk+ch)>width){chunks.push(chunk);chunk='';}chunk+=ch;}if(chunk)chunks.push(chunk);
     for(const text of chunks){const tw=measure(text);if(xx&&xx+tw>width){xx=0;yy+=lh;}
      const t=s.add.text(x+xx,y+yy,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:id?'#ffe56c':'#eee1bf'});root.add(t);
      if(id)t.setInteractive({useHandCursor:true}).on('pointerdown',(p,lx,ly,event)=>{event?.stopPropagation();this.collect(id,parts);});xx+=tw;
     }
    }
   }
  }finally{probe.destroy();}return yy+lh;
 }
 render(){
  const ui=this.ui,s=ui.scene,{width:W,height:H}=s.scale,key=this.page?.imageKey;
  if(!key||!s.textures.exists(key)){this.active=false;return;}
  this.overlay?.destroy(true);const root=s.add.container(0,0);this.overlay=root;ui.root.add(root);root.once('destroy',()=>{if(this.overlay===root)this.overlay=null;});
  const rect=(x,y,w,h,c,a=1)=>{const o=s.add.rectangle(x,y,w,h,c,a).setOrigin(0);root.add(o);return o;};
  rect(0,0,W,H,0x080c10,.98).setInteractive().on('pointerdown',()=>this.close());
  const source=s.textures.get(key).getSourceImage(),size=W<600?14:17,panelH=W<600?178:144;
  const scale=Math.max(.001,Math.min(Math.max(1,W-32)/source.width,Math.max(1,H-panelH-70)/source.height));
  const w=source.width*scale,h=source.height*scale,x=(W-w)/2,y=48;
  rect(x-5,y-5,w+10,h+10,0xe1d5b6).setInteractive();
  const image=s.add.image(x,y,key).setOrigin(0).setDisplaySize(w,h).setInteractive({useHandCursor:true});root.add(image);
  image.on('pointerdown',(pointer,lx,ly,event)=>{event?.stopPropagation();const hit=reedGalleryHit(lx/source.width,ly/source.height);if(hit)this.inspect(hit.id);});
  const panelY=y+h+14,panelX=16,panelW=W-32;
  rect(panelX,panelY,panelW,panelH,0x192b24).setInteractive();
  const captionH=this.drawWords(root,caption,panelX+12,panelY+10,panelW-24,size);
  const parts=descriptions[this.selectedId]||['Inspect the people, jacket or badge in the photograph.'];
  this.drawWords(root,parts,panelX+12,panelY+captionH+19,panelW-24,size);
  const close=s.add.text(W-14,9,'[ CLOSE ]',{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#ffe4a3',backgroundColor:'#24362f',padding:{x:8,y:6}}).setOrigin(1,0).setInteractive({useHandCursor:true});root.add(close);close.on('pointerdown',(p,lx,ly,event)=>{event?.stopPropagation();this.close();});
 }
 destroy(){this.dead=true;this.active=false;this.overlay?.destroy(true);this.overlay=null;this.page=null;}
}
