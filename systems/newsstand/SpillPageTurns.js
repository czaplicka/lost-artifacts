import { SPILL_BRAND as B } from '../../config/spillBrand.js';

export function pageTurnAccepted(direction,start,end,maxDistance,threshold){
  if(![-1,1].includes(direction))return false;
  const dx=end.x-start.x,dy=end.y-start.y;
  const distance=Math.max(maxDistance||0,Math.hypot(dx,dy));
  if(distance<=10)return true;
  return -dx*direction>=threshold&&Math.abs(dx)>=Math.abs(dy)*1.1;
}

export class SpillPageTurns {
  constructor(reader){
    this.reader=reader;this.scene=reader.scene;this.session=null;this.bounds=null;
    this.dead=false;this.preview=null;
    this.move=pointer=>this.onMove(pointer);
    this.end=pointer=>this.onEnd(pointer);
    this.outside=()=>this.cancel();
    this.cleanup=()=>this.destroy();
    this.scene.input.on('pointermove',this.move);
    this.scene.input.on('pointerup',this.end);
    this.scene.input.on('pointerupoutside',this.outside);
    this.scene.events.once('shutdown',this.cleanup);
    this.scene.events.once('destroy',this.cleanup);
  }
  get active(){return Boolean(this.session);}
  reset(){this.cancel();this.bounds=null;this.preview?.destroy();this.preview=null;}
  cancel(){this.session=null;this.preview?.clear();}
  layout(bounds,index,total){
    this.reset();if(this.dead||!this.reader.isOpen)return;
    this.bounds=bounds;
    const root=this.reader.root,s=this.scene;
    const hitW=Math.max(1,Math.min(52,bounds.width*.14));
    const hitH=Math.max(1,Math.min(48,bounds.height*.07));
    const corner=Math.min(hitW,hitH);
    for(const direction of [-1,1]){
      if(direction<0?index===0:index===total-1)continue;
      const edge=direction<0?bounds.x:bounds.x+bounds.width;
      const bottom=bounds.y+bounds.height;
      const art=s.add.graphics();root.add(art);
      art.fillStyle(B.banner,1);
      if(direction>0)art.fillTriangle(edge-corner,bottom,edge,bottom-corner,edge,bottom);
      else art.fillTriangle(edge,bottom-corner,edge+corner,bottom,edge,bottom);
      art.lineStyle(2,B.accent,1);
      art.lineBetween(edge-direction*corner,bottom,edge,bottom-corner);
      const zone=s.add.zone(direction<0?edge:edge-hitW,bottom-hitH,hitW,hitH)
        .setOrigin(0).setInteractive({useHandCursor:true});
      root.add(zone);
      zone.on('pointerdown',(pointer,_x,_y,event)=>{
        event?.stopPropagation();this.begin(pointer,direction);
      });
      zone.on('pointermove',(pointer,_x,_y,event)=>{
        this.onMove(pointer);event?.stopPropagation();
      });
      zone.on('pointerup',(pointer,_x,_y,event)=>{
        this.onEnd(pointer);event?.stopPropagation();
      });
    }
    this.preview=s.add.graphics();root.add(this.preview);
  }
  begin(pointer,direction){
    if(this.dead||this.session||!this.reader.isOpen||!this.bounds||![-1,1].includes(direction)||
      !Number.isFinite(pointer?.x)||!Number.isFinite(pointer?.y))return;
    const groups=this.reader.groups(),index=this.reader.groupIndex(groups);
    if(!groups[index+direction])return;
    this.session={id:pointer.id,x:pointer.x,y:pointer.y,direction,page:this.reader.page,maxDistance:0};
  }
  onMove(pointer){
    const a=this.session;
    if(!a||pointer?.id!==a.id||!this.bounds||!this.reader.isOpen)return;
    a.maxDistance=Math.max(a.maxDistance,Math.hypot(pointer.x-a.x,pointer.y-a.y));
    const distance=Math.max(0,-(pointer.x-a.x)*a.direction);
    const size=Math.min(130,this.bounds.width*.3,14+distance*.6);
    const edge=a.direction<0?this.bounds.x:this.bounds.x+this.bounds.width;
    const bottom=this.bounds.y+this.bounds.height;
    this.preview?.clear();
    this.preview?.fillStyle(B.banner,.7);
    this.preview?.fillTriangle(edge-a.direction*size,bottom,edge,bottom-size,edge,bottom);
    this.preview?.lineStyle(2,B.accent,1);
    this.preview?.lineBetween(edge-a.direction*size,bottom,edge,bottom-size);
  }
  onEnd(pointer){
    const a=this.session;
    if(!a||pointer?.id!==a.id)return;
    const valid=!this.dead&&this.reader.isOpen&&this.reader.page===a.page&&this.bounds;
    const threshold=this.bounds?Math.max(16,Math.min(56,this.bounds.width*.12)):56;
    const accepted=valid&&pageTurnAccepted(a.direction,a,pointer,a.maxDistance,threshold);
    this.cancel();
    if(accepted)this.reader.turn(a.direction);
  }
  forward(type,pointer){if(type==='pointermove')this.onMove(pointer);if(type==='pointerup')this.onEnd(pointer);}
  destroy(){
    if(this.dead)return;this.dead=true;this.reset();
    this.scene.input.off('pointermove',this.move);this.scene.input.off('pointerup',this.end);
    this.scene.input.off('pointerupoutside',this.outside);
    this.scene.events.off('shutdown',this.cleanup);this.scene.events.off('destroy',this.cleanup);
  }
}
