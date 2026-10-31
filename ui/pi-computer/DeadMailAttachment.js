import { DEAD_MAIL_ART, containRect, referenceRect } from '../../config/deadMailArtConfig.js';
import { acquireSideQuestAssets } from '../../managers/SideQuestAssetScope.js';
import { getDeadMailProgress } from '../../managers/DeadMailManager.js';
import { DEAD_MAIL_MESSAGE, DEAD_MAIL_SEARCH, DEAD_MAIL_PHOTO_DETAILS, hasDeadMailCorrespondence,
  markDeadMailMessageRead, inspectDeadMailPhoto, collectDeadMailPhoto, ensureDeadMailSearchDefinition } from '../../managers/DeadMailCorrespondence.js';
import { getSearchProgress } from './ComputerSearch.js';
import { drawEvidenceText } from './EvidenceText.js';

// Uses the existing computer monitor, photo application, drawing helpers and Field Notes.
export class DeadMailAttachment {
  constructor(ui) {
    Object.assign(this,{ui,active:false,dead:false,loading:false,error:'',scope:null,token:null});
    this.originalApplication=ui.monitor.renderApplication;
    this.renderApplication=()=>this.active&&ui.app==='photo'?this.render():this.originalApplication.call(ui.monitor);
    ui.monitor.renderApplication=this.renderApplication;
    this.originalSearchLoad=ui.search.load;
    this.searchLoad=async(...args)=>{
      const result=await this.originalSearchLoad.apply(ui.search,args);
      if(!this.dead){const changed=ensureDeadMailSearchDefinition(ui.search);if(changed&&ui.isOpen&&!ui.suspended&&!ui.destroyed)ui.render();}
      return result;
    };
    ui.search.load=this.searchLoad;
  }
  refresh(){if(!this.dead&&!this.ui.destroyed&&this.ui.isOpen&&!this.ui.suspended)this.ui.render();}
  async open(){
    const ui=this.ui;
    if(this.dead||!ui.isOpen||ui.suspended||!hasDeadMailCorrespondence())return false;
    if(this.active)return true;
    markDeadMailMessageRead(DEAD_MAIL_MESSAGE);
    this.active=true;this.error='';ui.app='photo';ui.selectedId=DEAD_MAIL_MESSAGE;ui.menuOpen=false;ui.notice='';ui.viewToken++;
    this.refresh();await this.load();return this.active;
  }
  async load(){
    if(this.dead||!this.active||this.loading)return;
    const token=Symbol('dead-mail-attachment');this.token=token;this.loading=true;this.error='';
    this.scope?.release();const scope=acquireSideQuestAssets(this.ui.scene.game);this.scope=scope;this.refresh();
    try{
      await Promise.all([scope.ready,this.ui.search.load()]);
      if(this.dead||!this.active||this.token!==token){scope.release();return;}
      if(!this.ui.scene.textures.exists(DEAD_MAIL_ART.photo.key))throw Error('The delivery photograph is missing from the texture cache.');
      ensureDeadMailSearchDefinition(this.ui.search);
      if(this.ui.search.data?.cases.some(c=>c.id===DEAD_MAIL_SEARCH))this.ui.search.selectCase(DEAD_MAIL_SEARCH);
    }catch(error){
      scope.release();
      if(!this.dead&&this.active&&this.token===token){this.error=error.message||String(error);console.error('[DeadMailAttachment]',error);}
    }finally{
      if(!this.dead&&this.token===token){this.loading=false;this.refresh();}
    }
  }
  close(returnToMail=true){
    if(!this.active&&!this.scope)return;
    this.active=false;this.token=null;this.loading=false;this.scope?.release();this.scope=null;
    if(returnToMail&&!this.dead&&!this.ui.destroyed&&this.ui.isOpen){
      Object.assign(this.ui,{app:'mail',selectedId:DEAD_MAIL_MESSAGE,listPage:0,bodyPage:0,notice:'',menuOpen:false});
      this.ui.viewToken++;this.refresh();
    }
  }
  handleKey(event){
    if(!this.active)return false;
    if(event.code==='Escape'){event.preventDefault();this.close();}
    return true; // Do not let Reed's photo editor or Escape handler take over this attachment.
  }
  render(){
    const ui=this.ui,d=ui.drawing,l=ui.layout;
    const b={x:l.x+14,y:l.y+10,w:l.w-28,h:l.h-58};ui.window=b;
    d.bevel(b.x,b.y,b.w,b.h,0xc6c7bf);d.rectangle(b.x+4,b.y+4,b.w-8,30,0x244452);
    d.pixel(b.x+14,b.y+14,'ATTACHMENT — delivery_photo.webp',10,'#fff0cc');
    d.button(b.x+b.w-192,b.y+3,'BACK TO MAIL',()=>this.close());
    if(this.loading||this.error||!ui.scene.textures.exists(DEAD_MAIL_ART.photo.key)){
      d.text(b.x+20,b.y+65,this.error||'Loading delivery photograph...',18,'#383c38',b.w-40);
      if(this.error)d.button(b.x+20,b.y+140,'RETRY',()=>void this.load());return;
    }
    const config=DEAD_MAIL_ART.photo,source=ui.scene.textures.get(config.key).getSourceImage();
    const noteHeight=Math.max(112,Math.min(148,b.h*0.28));
    const frame=containRect(source.width,source.height,{x:b.x+16,y:b.y+43,width:b.w-32,height:Math.max(32,b.h-noteHeight-62)});
    d.add(ui.scene.add.image(frame.x,frame.y,config.key).setOrigin(0).setDisplaySize(frame.width,frame.height));
    for(const caption of config.captions){
      const r=referenceRect(caption.rect,config.reference,frame);
      d.text(r.x+r.width/2,r.y+r.height/2,caption.text,caption.size*frame.width/config.reference.width,caption.color,r.width)
        .setOrigin(0.5).setAlign('center').setLineSpacing(1);
    }
    const p=getDeadMailProgress();
    for(const h of config.hotspots){
      const r=referenceRect(h.rect,config.reference,frame);
      const hit=d.rectangle(r.x,r.y,r.width,r.height,0xe2b558,p.clues.includes(h.id)?0.05:0).setInteractive({useHandCursor:true});
      hit.setName(`dead-mail-attachment:${h.id}`);
      hit.on('pointerdown',()=>{if(inspectDeadMailPhoto(h.id))this.refresh();});
    }
    const noteY=b.y+b.h-noteHeight-10;
    d.rectangle(b.x+12,noteY,b.w-24,noteHeight,0xeee3c4);
    d.text(b.x+26,noteY+8,`DETAILS RECORDED: ${p.clues.length}/3 — click highlighted words to add them to Field Notes.`,14,'#5b604f',b.w-52);
    const detail=DEAD_MAIL_PHOTO_DETAILS[p.selectedPhotoDetail];
    if(!detail){d.text(b.x+26,noteY+40,'Inspect the angel, marker or shipping label in the photograph.',17,'#343e35',b.w-52);return;}
    drawEvidenceText(ui,{blocks:[detail.fragments],x:b.x+26,y:noteY+40,width:b.w-52,
      isKnown:id=>Boolean(getSearchProgress().cases[DEAD_MAIL_SEARCH]?.known?.includes(id)),
      onCollect:()=>{if(collectDeadMailPhoto(p.selectedPhotoDetail))this.refresh();}});
  }
  destroy(){
    if(this.dead)return;this.close(false);this.dead=true;
    if(this.ui.monitor.renderApplication===this.renderApplication)this.ui.monitor.renderApplication=this.originalApplication;
    if(this.ui.search.load===this.searchLoad)this.ui.search.load=this.originalSearchLoad;
  }
}
