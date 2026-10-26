export const photoDebugAllowed = () => typeof window!=='undefined' && ['127.0.0.1','localhost'].includes(window.location.hostname);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function constrainPhotoHotspot(c){
  c.w=clamp(c.w,.005,1);c.h=clamp(c.h,.005,1);
  c.x=clamp(c.x,0,1-c.w);c.y=clamp(c.y,0,1-c.h);return c;
}
export class PhotoHotspotEditor{
  constructor(owner){Object.assign(this,{owner,enabled:false,index:0,views:[],bounds:null,text:null});}
  get available(){const ui=this.owner.ui;return photoDebugAllowed()&&!this.owner.dead&&ui.isOpen&&!ui.suspended&&ui.app==='photo';}
  begin(bounds){this.views=[];this.bounds=bounds;this.text=null;}
  attach(object,cfg,index){
    if(!photoDebugAllowed())return;
    const scene=this.owner.ui.scene;this.views.push({object,cfg,index});
    scene.input.setDraggable(object,this.enabled);
    object.on('pointerdown',()=>{if(this.enabled){this.index=index;this.sync();}});
    let offset=null;
    const local=pointer=>{
      const matrix=this.owner.ui.content.getWorldTransformMatrix();
      return matrix.applyInverse(pointer.worldX??pointer.x,pointer.worldY??pointer.y);
    };
    object.on('dragstart',pointer=>{
      if(!this.enabled)return;
      this.index=index;const point=local(pointer);offset={x:point.x-object.x,y:point.y-object.y};this.sync();
    });
    object.on('drag',pointer=>{
      if(!this.enabled||!offset||!this.available)return;
      const point=local(pointer),b=this.bounds;
      cfg.x=(point.x-offset.x-b.x)/b.w;cfg.y=(point.y-offset.y-b.y)/b.h;
      constrainPhotoHotspot(cfg);this.sync();
    });
    object.on('dragend',()=>{offset=null;});
  }
  drawHelp(x,y,width){
    if(!photoDebugAllowed()||!this.enabled)return;
    this.text=this.owner.ui.drawing.text(x,y,'',12,'#173d2e',width);this.sync();
  }
  sync(){
    const b=this.bounds;if(!b)return;
    for(const {object,cfg,index} of this.views){
      object.setPosition(b.x+cfg.x*b.w,b.y+cfg.y*b.h).setSize(cfg.w*b.w,cfg.h*b.h);
      object.input?.hitArea?.setTo(0,0,cfg.w*b.w,cfg.h*b.h);
      object.setFillStyle(0x00ff88,this.enabled ? .17 : 0);
      object.setStrokeStyle(this.enabled?2:0,index===this.index?0xff44ff:0x00ff88);
    }
    const c=this.views[this.index]?.cfg;
    this.text?.setText([
      `LOCAL DEBUG: ${c?.id||'—'}  x:${c?.x.toFixed(4)} y:${c?.y.toFixed(4)} w:${c?.w.toFixed(4)} h:${c?.h.toFixed(4)}`,
      'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
      'Tab / Shift+Tab: select | C: export | D: close. Discoveries disabled.'
    ].join('\n'));
  }
  handleKey(event){
    if(!this.available||event.ctrlKey||event.metaKey)return false;
    const target=event.target;
    if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return false;
    if(event.code==='KeyD'){
      event.preventDefault();if(!event.repeat){this.enabled=!this.enabled;this.owner.refresh();}return true;
    }
    if(!this.enabled)return false;
    if(event.code==='Escape'){event.preventDefault();this.enabled=false;this.owner.refresh();return true;}
    if(event.code==='KeyC'){
      event.preventDefault();if(!event.repeat){console.log('COPY INTO assets/data/piPhotoQuest.json -> photo.hotspots:');console.log(JSON.stringify(this.owner.data.photo.hotspots,null,2));}return true;
    }
    if(event.code==='Tab'){
      event.preventDefault();this.index=(this.index+(event.shiftKey?-1:1)+this.views.length)%Math.max(1,this.views.length);this.sync();return true;
    }
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))return false;
    event.preventDefault();const c=this.views[this.index]?.cfg,b=this.bounds;if(!c||!b)return true;
    const horizontal=event.code==='ArrowLeft'||event.code==='ArrowRight';
    const direction=event.code==='ArrowLeft'||event.code==='ArrowUp'?-1:1;
    const step=(event.altKey?1:5)/(horizontal?b.w:b.h);
    const key=event.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');
    c[key]+=direction*step;constrainPhotoHotspot(c);this.sync();return true;
  }
  destroy(){this.enabled=false;this.views=[];this.bounds=null;this.text=null;}
}
