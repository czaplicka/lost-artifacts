import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords } from './ComputerSearchCore.js';
import { syncReedBoardEvidence } from '../../managers/PIInvestigationManager.js';
const SEARCH='miramar_demo',QUEST='pi_two_glasses';
export const REED_GALLERY_HOTSPOTS=[{id:'badge',x:800/1200,y:432/620,w:56/1200,h:86/620},{id:'jacket',x:704/1200,y:258/620,w:344/1200,h:362/620},{id:'claire',x:213/1200,y:26/620,w:215/1200,h:289/620},{id:'nora',x:758/1200,y:26/620,w:215/1200,h:230/620}];
export function reedGalleryHit(x,y){return REED_GALLERY_HOTSPOTS.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)||null;}
const word=(keywordId,text)=>({keywordId,text});
export const REED_GALLERY_PHOTOS=[
 {id:'conference',key:'Reed_gallery_conference_v3',url:'assets/side_quests/Reed/conference.webp',label:'Reception photograph',hotspots:true},
 {id:'second',key:'Reed_gallery_second_v3',url:'assets/side_quests/Reed/second.webp',label:'Reception photograph II'},
 {id:'third',key:'Reed_gallery_third_v3',url:'assets/side_quests/Reed/third.webp',label:'Conference room'}
];
const descriptions={claire:['The caption identifies the woman on the left as ',word('claire','Claire Sutton'),'.'],nora:['The caption identifies the woman on the right as ',word('nora','Nora Bell'),'.'],jacket:['A ',word('checked_jacket','green checked jacket'),' with contrasting pocket trim.'],badge:['An orange conference badge with a ',word('swallow_logo','swallow emblem'),'.']};
export class ReedGalleryViewer{
 constructor(ui){
  Object.assign(this,{ui,active:false,dead:false,page:null,selectedId:null,photoId:'conference',images:[],failures:new Set()});
  const draw=ui.search.drawPage.bind(ui.search);ui.search.drawPage=(page,a)=>{
   if(this.dead||page.id!=='gallery'||ui.search.definition?.id!==SEARCH){this.active=false;return draw(page,a);}
   this.page=page;this.rememberOpened();if(this.active)this.render(a);else this.renderGallery(a);
  };this.loadImages();
 }
 refresh(){const u=this.ui;if(!this.dead&&u.isOpen&&!u.destroyed&&!u.suspended&&u.app==='search')u.render();}
 loadImages(){for(const p of REED_GALLERY_PHOTOS){if(this.ui.scene.textures.exists(p.key))continue;const im=new Image();this.images.push(im);im.onload=()=>{if(this.dead||this.ui.destroyed)return;if(!this.ui.scene.textures.exists(p.key))this.ui.scene.textures.addImage(p.key,im);this.failures.delete(p.id);this.refresh();};im.onerror=()=>{if(!this.dead){this.failures.add(p.id);this.refresh();}};im.src=p.url;}}
 accepted(){return Boolean(gameState.piQuests?.quests?.[QUEST]);}
 rememberOpened(){if(!this.accepted())return;if(!gameState.reedGalleryEvidence?.opened){gameState.reedGalleryEvidence={...(gameState.reedGalleryEvidence||{}),opened:true};requestAutosave();}syncReedBoardEvidence();}
 inspect(id){
  if(this.dead||!this.active||this.photoId!=='conference'||!this.accepted()||!descriptions[id])return false;
  const old=gameState.reedGalleryEvidence||{};gameState.reedGalleryEvidence={...old,opened:true,selectedId:id,inspected:[...new Set([...(old.inspected||[]),id])]};this.selectedId=id;requestAutosave();syncReedBoardEvidence();this.refresh();return true;
 }
 collect(id,parts){
  if(this.dead||!this.active||this.photoId!=='conference'||!this.selectedId||!this.accepted())return false;
  const shown=descriptions[this.selectedId];if(shown!==parts||!parts.some(p=>typeof p==='object'&&p.keywordId===id))return false;
  discoverSearchKeywords(SEARCH,[id]);syncReedBoardEvidence();this.refresh();return true;
 }
 open(page,photoId='conference'){const p=REED_GALLERY_PHOTOS.find(p=>p.id===photoId);if(this.dead||!p||!this.ui.scene.textures.exists(p.key))return;this.page=page;this.photoId=photoId;this.active=true;this.selectedId=null;this.rememberOpened();this.refresh();}
 close(){this.active=false;this.selectedId=null;this.refresh();}
 words(parts,x,y,width,size=16){
  const u=this.ui,d=u.drawing,probe=u.scene.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`}).setVisible(false),measure=v=>{probe.setText(v);return probe.width;};let xx=0,yy=0;
  try{for(const part of parts){const id=typeof part==='object'?part.keywordId:null,value=typeof part==='string'?part:part.text;for(const token of value.split(/(\s+)/).filter(Boolean)){
   if(/^\s+$/.test(token)){if(xx)xx+=measure(' ');continue;}let chunks=[],chunk='';for(const ch of token){if(chunk&&measure(chunk+ch)>width){chunks.push(chunk);chunk='';}chunk+=ch;}if(chunk)chunks.push(chunk);
   for(const text of chunks){const tw=measure(text);if(xx&&xx+tw>width){xx=0;yy+=size+7;}const t=d.text(x+xx,y+yy,text,size,id?'#ffe56c':'#eee1bf');if(id){const bg=d.rectangle(t.x-1,t.y,t.width+2,size+5,0x344841);u.content.moveBelow(bg,t);t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.collect(id,parts));}xx+=tw;}
  }}}finally{probe.destroy();}return yy+size+7;
 }
 header(a){const d=this.ui.drawing;d.rectangle(a.x,a.y,a.w,48,0x355c47);d.text(a.x+18,a.y+12,'OPEN SKIES — PHOTO GALLERY',22,'#f4f0d7');}
 renderGallery(a){
  const u=this.ui,d=u.drawing;this.header(a);const margin=18,gap=16,cw=(a.w-margin*2-gap*2)/3,ih=Math.min(137,cw*620/1200),top=a.y+78;
  REED_GALLERY_PHOTOS.forEach((p,i)=>{const x=a.x+margin+i*(cw+gap);d.rectangle(x-3,top-3,cw+6,ih+6,0xd9d4c4);if(u.scene.textures.exists(p.key)){const im=u.scene.add.image(x,top,p.key).setOrigin(0).setDisplaySize(cw,ih).setInteractive({useHandCursor:true});d.add(im);im.on('pointerdown',()=>this.open(this.page,p.id));}else d.text(x+8,top+10,this.failures.has(p.id)?'Image unavailable':'Loading…',14,'#4b5147',cw-16);const t=d.text(x,top+ih+14,p.label,15,'#315279',cw);if(u.scene.textures.exists(p.key))t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.open(this.page,p.id));});
  d.text(a.x+20,top+ih+92,'Photography: Martin Cole. Reproduction by permission of the foundation.',14,'#5f665b',a.w-40);
 }
 render(a){
  const u=this.ui,d=u.drawing,p=REED_GALLERY_PHOTOS.find(p=>p.id===this.photoId);this.header(a);d.button(a.x+a.w-116,a.y+6,'BACK',()=>this.close());if(!p||!u.scene.textures.exists(p.key))return;
  const source=u.scene.textures.get(p.key).getSourceImage(),scale=Math.min((a.w-28)/source.width,Math.max(1,a.h-177)/source.height),w=source.width*scale,h=source.height*scale,x=a.x+(a.w-w)/2,y=a.y+57;
  const im=u.scene.add.image(x,y,p.key).setOrigin(0).setDisplaySize(w,h);d.add(im);if(p.hotspots){im.setInteractive({useHandCursor:true});im.on('pointerdown',(_p,lx,ly)=>{const hit=reedGalleryHit(lx/source.width,ly/source.height);if(hit)this.inspect(hit.id);});}
  const py=y+h+12;d.rectangle(a.x+10,py,a.w-20,a.y+a.h-py-8,0x192b24);
  if(p.hotspots&&this.selectedId)this.words(descriptions[this.selectedId],a.x+23,py+13,a.w-46);else d.text(a.x+23,py+13,p.label,16,'#eee1bf');
 }
 destroy(){this.dead=true;this.active=false;this.page=null;for(const i of this.images){i.onload=null;i.onerror=null;}this.images=[];}
}
