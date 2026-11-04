import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords } from './ComputerSearchCore.js';
import { syncReedBoardEvidence } from '../../managers/PIInvestigationManager.js';

const SEARCH = 'miramar_demo';
const QUEST = 'pi_two_glasses';
const rect = (id,x,y,w,h) => ({id,x:x/1200,y:y/620,w:w/1200,h:h/620});

// Narrow badge areas have priority over the jacket.
export const REED_GALLERY_HOTSPOTS = [
  rect('badge',800,432,56,86),
  rect('jacket',704,258,344,362),
  rect('claire',213,26,215,289),
  rect('nora',758,26,215,230)
];
export const REED_SECOND_GALLERY_HOTSPOTS = [
  rect('badge',684,371,39,54),
  rect('badge',440,344,44,57),
  rect('claire',353,77,160,177),
  rect('nora',660,77,140,166),
  rect('jacket',603,232,259,366)
];
export const REED_GALLERY_HOTSPOTS_BY_PHOTO = {
  conference: REED_GALLERY_HOTSPOTS,
  second: REED_SECOND_GALLERY_HOTSPOTS
};
export function reedGalleryHit(x,y,photoId='conference') {
  return (REED_GALLERY_HOTSPOTS_BY_PHOTO[photoId] || [])
    .find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h) || null;
}

const word = (keywordId,text) => ({keywordId,text});
export const REED_GALLERY_PHOTOS = [
  {id:'conference',key:'Reed_gallery_conference_v3',url:'assets/side_quests/Reed/conference.webp',label:'Reception photograph',hotspots:true},
  {id:'second',key:'Reed_gallery_second_v3',url:'assets/side_quests/Reed/second.webp',label:'Reception photograph II',hotspots:true},
  {id:'third',key:'Reed_gallery_third_v3',url:'assets/side_quests/Reed/third.webp',label:'Conference room'}
];
const descriptions = {
  claire:['The caption identifies the woman on the left as ',word('claire','Claire Sutton'),'.'],
  nora:['The caption identifies the woman on the right as ',word('nora','Nora Bell'),'.'],
  jacket:['A ',word('checked_jacket','green checked jacket'),' with contrasting pocket trim.'],
  badge:['An orange conference badge with a ',word('swallow_logo','swallow emblem'),'.']
};

export class ReedGalleryViewer {
  constructor(ui) {
    Object.assign(this,{ui,active:false,dead:false,page:null,selectedId:null,photoId:'conference',images:[],failures:new Set()});
    this.originalDrawPage = ui.search.drawPage;
    const draw = this.originalDrawPage.bind(ui.search);
    this.wrappedDrawPage = (page,a) => {
      if(this.dead || page.id!=='gallery' || ui.search.definition?.id!==SEARCH) {
        this.active=false;
        return draw(page,a);
      }
      this.page=page;
      this.rememberOpened();
      if(this.active)this.render(a);
      else this.renderGallery(a);
    };
    ui.search.drawPage=this.wrappedDrawPage;
    this.loadImages();
  }

  refresh() {
    const u=this.ui;
    if(!this.dead&&u.isOpen&&!u.destroyed&&!u.suspended&&u.app==='search')u.render();
  }

  loadImages() {
    for(const photo of REED_GALLERY_PHOTOS) {
      if(this.ui.scene.textures.exists(photo.key))continue;
      const image=new Image();
      this.images.push(image);
      image.onload=()=>{
        if(this.dead||this.ui.destroyed)return;
        if(!this.ui.scene.textures.exists(photo.key))this.ui.scene.textures.addImage(photo.key,image);
        this.failures.delete(photo.id);
        this.refresh();
      };
      image.onerror=()=>{
        if(!this.dead){this.failures.add(photo.id);this.refresh();}
      };
      image.src=photo.url;
    }
  }

  accepted() {return Boolean(gameState.piQuests?.quests?.[QUEST]);}
  interactivePhoto() {return Boolean(REED_GALLERY_HOTSPOTS_BY_PHOTO[this.photoId]?.length);}

  rememberOpened() {
    if(!this.accepted())return;
    if(!gameState.reedGalleryEvidence?.opened) {
      gameState.reedGalleryEvidence={...(gameState.reedGalleryEvidence||{}),opened:true};
      requestAutosave();
    }
    syncReedBoardEvidence();
  }

  inspect(id) {
    if(this.dead||!this.active||!this.interactivePhoto()||!this.accepted()||!descriptions[id])return false;
    if(!REED_GALLERY_HOTSPOTS_BY_PHOTO[this.photoId].some(h=>h.id===id))return false;
    const old=gameState.reedGalleryEvidence||{};
    gameState.reedGalleryEvidence={
      ...old,opened:true,selectedId:id,
      inspected:[...new Set([...(old.inspected||[]),id])]
    };
    this.selectedId=id;
    requestAutosave();
    syncReedBoardEvidence();
    this.refresh();
    return true;
  }

  collect(id,parts) {
    if(this.dead||!this.active||!this.interactivePhoto()||!this.selectedId||!this.accepted())return false;
    const shown=descriptions[this.selectedId];
    if(shown!==parts||!parts.some(part=>typeof part==='object'&&part.keywordId===id))return false;
    discoverSearchKeywords(SEARCH,[id]);
    syncReedBoardEvidence();
    this.refresh();
    return true;
  }

  open(page,photoId='conference') {
    const photo=REED_GALLERY_PHOTOS.find(p=>p.id===photoId);
    if(this.dead||!photo||!this.ui.scene.textures.exists(photo.key))return;
    this.page=page;this.photoId=photoId;this.active=true;this.selectedId=null;
    this.rememberOpened();this.refresh();
  }
  close() {this.active=false;this.selectedId=null;this.refresh();}

  words(parts,x,y,width,size=16) {
    const u=this.ui,d=u.drawing;
    const probe=u.scene.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`}).setVisible(false);
    const measure=value=>{probe.setText(value);return probe.width;};
    let xx=0,yy=0;
    try {
      for(const part of parts) {
        const id=typeof part==='object'?part.keywordId:null;
        const value=typeof part==='string'?part:part.text;
        for(const token of value.split(/(\s+)/).filter(Boolean)) {
          if(/^\s+$/.test(token)){if(xx)xx+=measure(' ');continue;}
          const chunks=[];let chunk='';
          for(const character of token) {
            if(chunk&&measure(chunk+character)>width){chunks.push(chunk);chunk='';}
            chunk+=character;
          }
          if(chunk)chunks.push(chunk);
          for(const text of chunks) {
            const tw=measure(text);
            if(xx&&xx+tw>width){xx=0;yy+=size+7;}
            const t=d.text(x+xx,y+yy,text,size,id?'#ffe56c':'#eee1bf');
            if(id) {
              const bg=d.rectangle(t.x-1,t.y,t.width+2,size+5,0x344841);
              u.content.moveBelow(bg,t);
              t.setInteractive({useHandCursor:true}).on('pointerdown',(_p,_x,_y,event)=>{
                event?.stopPropagation();
                this.collect(id,parts);
              });
            }
            xx+=tw;
          }
        }
      }
    } finally {probe.destroy();}
    return yy+size+7;
  }

  header(a) {
    const d=this.ui.drawing;
    d.rectangle(a.x,a.y,a.w,48,0x355c47);
    const title=d.text(a.x+18,a.y+12,'OPEN SKIES — PHOTO GALLERY',22,'#f4f0d7');
    d.fit(title,'OPEN SKIES — PHOTO GALLERY',Math.max(40,a.w-(this.active?145:36)));
  }

  renderGallery(a) {
    const u=this.ui,d=u.drawing;
    this.header(a);
    const margin=18,gap=16,cw=(a.w-margin*2-gap*2)/3;
    const ih=Math.min(137,cw*620/1200),top=a.y+78;
    REED_GALLERY_PHOTOS.forEach((photo,index)=>{
      const x=a.x+margin+index*(cw+gap);
      d.rectangle(x-3,top-3,cw+6,ih+6,0xd9d4c4);
      if(u.scene.textures.exists(photo.key)) {
        const image=u.scene.add.image(x,top,photo.key).setOrigin(0).setDisplaySize(cw,ih).setInteractive({useHandCursor:true});
        d.add(image);
        image.on('pointerdown',()=>this.open(this.page,photo.id));
      } else d.text(x+8,top+10,this.failures.has(photo.id)?'Image unavailable':'Loading…',14,'#4b5147',cw-16);
      const label=d.text(x,top+ih+14,photo.label,15,'#315279',cw);
      if(u.scene.textures.exists(photo.key))label.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.open(this.page,photo.id));
    });
    d.text(a.x+20,top+ih+92,'Photography: Martin Cole. Reproduction by permission of the foundation.',14,'#5f665b',a.w-40);
  }

  render(a) {
    const u=this.ui,d=u.drawing;
    const photo=REED_GALLERY_PHOTOS.find(p=>p.id===this.photoId);
    this.header(a);
    d.button(a.x+a.w-116,a.y+6,'BACK',()=>this.close());
    if(!photo||!u.scene.textures.exists(photo.key))return;
    const source=u.scene.textures.get(photo.key).getSourceImage();
    const scale=Math.min((a.w-28)/source.width,Math.max(1,a.h-177)/source.height);
    const w=source.width*scale,h=source.height*scale;
    const x=a.x+(a.w-w)/2,y=a.y+57;
    const image=u.scene.add.image(x,y,photo.key).setOrigin(0).setDisplaySize(w,h);
    d.add(image);
    if(photo.hotspots&&this.interactivePhoto()) {
      image.setInteractive({useHandCursor:true});
      image.on('pointerdown',(_pointer,lx,ly,event)=>{
        event?.stopPropagation();
        const hit=reedGalleryHit(lx/source.width,ly/source.height,photo.id);
        if(hit)this.inspect(hit.id);
      });
    }
    const py=y+h+12;
    d.rectangle(a.x+10,py,a.w-20,Math.max(1,a.y+a.h-py-8),0x192b24);
    if(photo.hotspots&&this.selectedId&&descriptions[this.selectedId]) {
      this.words(descriptions[this.selectedId],a.x+23,py+13,a.w-46);
    } else d.text(a.x+23,py+13,photo.label,16,'#eee1bf');
  }

  destroy() {
    if(this.dead)return;
    this.dead=true;this.active=false;this.page=null;
    for(const image of this.images){image.onload=null;image.onerror=null;}
    this.images=[];
    if(this.ui.search?.drawPage===this.wrappedDrawPage)this.ui.search.drawPage=this.originalDrawPage;
  }
}
