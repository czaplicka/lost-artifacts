const STORAGE = 'postal-hotspot-editor:v1';
export class PostalHotspotEditor {
  constructor(scene) {
    this.scene = scene; this.enabled = false; this.selected = null; this.drag = null;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
      if (saved?.version === 1) {
        for (const [view, entries] of Object.entries(saved.views || {})) {
          const pool = view.startsWith('document:') ? scene.documents[view.slice(9)]?.spots : scene.config[view];
          for (const item of entries) {
            const target = pool?.find(p => p.id === item.id);
            if (target) this.applyNumbers(target, item);
          }
        }
        for (const [id, entry] of Object.entries(saved.overlays || {})) {
          if (scene.documents[id]?.overlay) this.applyNumbers(scene.documents[id].overlay, entry);
        }
      }
    } catch (error) { console.warn('[Postal editor] Saved layout unavailable:', error); }
    this.move = pointer => this.onMove(pointer);
    this.up = () => { if (this.drag) { this.drag = null; this.save(); } };
    scene.input.on('pointermove', this.move); scene.input.on('pointerup', this.up);
    scene.input.on('pointerupoutside', this.up);
  }
  applyNumbers(target, source) {
    for (const key of ['x','y','w','h']) if (Number.isFinite(source[key])) target[key] = key === 'w' || key === 'h' ? Math.max(12, source[key]) : source[key];
  }
  toggle() { this.enabled = !this.enabled; this.drag = null; this.selected = null; this.scene.closeModal(); this.scene.renderView(); }
  build() {
    const s = this.scene;
    this.layer?.destroy(true); this.layer = null;
    if (!this.enabled) return;
    this.layer = s.add.container(0, 0).setDepth(9000);
    const blocker = s.add.zone(0,0,s.scale.width,s.scale.height).setOrigin(0).setInteractive();
    this.layer.add(blocker);
    const targets = s.spots().map(cfg => ({cfg, overlay: false}));
    const overlay = s.view === 'document' && s.documents[s.documentId]?.overlay;
    if (overlay) targets.push({cfg: overlay, overlay: true});
    const {s: scale,x,y} = s.fit;
    for (const target of targets) {
      const cfg = target.cfg;
      const cx = cfg.x + (target.overlay ? cfg.w / 2 : 0);
      const cy = cfg.y + (target.overlay ? cfg.h / 2 : 0);
      const selected = this.selected?.cfg === cfg;
      const rect = s.add.rectangle(x+cx*scale,y+cy*scale,cfg.w*scale,cfg.h*scale,
        target.overlay ? 0x44ddff : 0xffcc44, .08).setStrokeStyle(selected ? 3 : 1, target.overlay ? 0x44ddff : 0xffcc44)
        .setInteractive({useHandCursor:true});
      this.layer.add(rect);
      rect.on('pointerdown', (pointer,lx,ly,event) => {
        event?.stopPropagation(); this.selected = target;
        this.drag = {target, mode:'move', px:pointer.x, py:pointer.y, start:{...cfg}};
        this.refresh();
      });
      if (!selected) continue;
      for (const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
        const handle = s.add.rectangle(x+(cx+sx*cfg.w/2)*scale,y+(cy+sy*cfg.h/2)*scale,12,12,0xffffff)
          .setStrokeStyle(1,0x111111).setInteractive({useHandCursor:true});
        this.layer.add(handle);
        handle.on('pointerdown',(pointer,lx,ly,event)=>{
          event?.stopPropagation(); this.drag={target,mode:'resize',sx,sy,px:pointer.x,py:pointer.y,start:{...cfg}};
        });
      }
    }
  }
  refresh() { this.scene.renderView(); }
  onMove(pointer) {
    if (!this.enabled || !this.drag) return;
    const {target,mode,start,px,py,sx,sy} = this.drag;
    const dx=(pointer.x-px)/this.scene.fit.s, dy=(pointer.y-py)/this.scene.fit.s;
    const cfg=target.cfg;
    if (mode==='move') { cfg.x=Math.round(start.x+dx); cfg.y=Math.round(start.y+dy); }
    else {
      cfg.w=Math.max(12,Math.round(start.w+dx*sx)); cfg.h=Math.max(12,Math.round(start.h+dy*sy));
      const shiftX=(cfg.w-start.w)*sx/2, shiftY=(cfg.h-start.h)*sy/2;
      const cx=start.x+(target.overlay?start.w/2:0)+shiftX;
      const cy=start.y+(target.overlay?start.h/2:0)+shiftY;
      cfg.x=Math.round(cx-(target.overlay?cfg.w/2:0)); cfg.y=Math.round(cy-(target.overlay?cfg.h/2:0));
    }
    this.refresh();
  }
  layout() {
    const s=this.scene, views={};
    const numbers=cfg=>Object.fromEntries(['x','y','w','h'].map(k=>[k,cfg[k]]));
    for (const [view,spots] of Object.entries(s.config)) views[view]=spots.map(cfg=>({id:cfg.id,...numbers(cfg)}));
    const overlays={};
    for (const [id,doc] of Object.entries(s.documents)) {
      views['document:'+id]=doc.spots.map(cfg=>({id:cfg.id,...numbers(cfg)}));
      if(doc.overlay)overlays[id]=numbers(doc.overlay);
    }
    return {version:1,views,overlays};
  }
  save() { try {localStorage.setItem(STORAGE,JSON.stringify(this.layout()));}catch(error){console.warn('[Postal editor] Cannot save layout:',error);} }
  export() {
    console.log('[Postal editor] Layout\n'+JSON.stringify(this.layout(),null,2));
    console.log('POST_OFFICE_HOTSPOTS\n'+JSON.stringify(this.scene.config,null,2));
    console.log('POSTAL_DOCUMENTS\n'+JSON.stringify(this.scene.documents,null,2));
  }
  key(event) {
    if(event.code==='KeyD'){event.preventDefault();this.toggle();return true;}
    if(!this.enabled)return false;
    if(event.code==='KeyC'){event.preventDefault();this.export();return true;}
    const cfg=this.selected?.cfg;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(cfg&&directions[event.code]){
      event.preventDefault();const [dx,dy]=directions[event.code],step=event.shiftKey?10:1;
      cfg.x+=dx*step;cfg.y+=dy*step;this.save();this.refresh();
    }
    return true;
  }
  destroy() {
    if(this.enabled)this.save();
    this.scene.input.off('pointermove',this.move);this.scene.input.off('pointerup',this.up);
    this.scene.input.off('pointerupoutside',this.up);this.layer?.destroy(true);this.layer=null;
  }
}
