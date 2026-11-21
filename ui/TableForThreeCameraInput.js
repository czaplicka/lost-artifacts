import { cameraPoint, cameraFrame, hasUsableCameraFrame } from './TableForThreeCameraGeometry.js';
export class TableForThreeCameraInput {
  constructor(canvas, options) {
    this.canvas=canvas;this.options=options;this.frame=null;this.gesture=null;this.busy=false;this.destroyed=false;this.bindings=[];
    canvas.tabIndex=0;canvas.setAttribute('aria-label','Observation camera. Drag a frame, then press Enter to take a photograph. Escape clears the frame.');
    const listen=(name,handler)=>{canvas.addEventListener(name,handler);this.bindings.push([name,handler]);};
    listen('pointerdown',e=>this.down(e));listen('pointermove',e=>this.move(e));listen('pointerup',e=>this.up(e));
    listen('pointercancel',e=>{if(this.gesture?.id===e.pointerId)this.cancel();});
    listen('lostpointercapture',e=>{if(this.gesture?.id===e.pointerId)this.cancel();});
    listen('keydown',e=>{
      if(!this.active()||e.repeat)return;
      if(e.key==='Enter'){e.preventDefault();void this.capture();}
      else if(e.key==='Escape'){e.preventDefault();this.clear();}
    });
    this.refresh();
  }
  active(){return !this.destroyed && !this.busy && this.options.isActive();}
  refresh(){if(this.destroyed)return;this.options.draw(this.frame);this.options.onFrame(this.frame,{busy:this.busy,dragging:!!this.gesture});}
  down(e){
    if(!this.active()||this.gesture||e.button!==0||e.isPrimary===false)return;
    const point=cameraPoint(e,this.canvas.getBoundingClientRect());if(!point)return;
    this.gesture={id:e.pointerId,start:point,previous:this.frame?{...this.frame}:null};
    try{this.canvas.setPointerCapture(e.pointerId);}catch{this.gesture=null;return;}
    this.canvas.focus({preventScroll:true});this.frame=null;this.refresh();
  }
  move(e){
    if(!this.gesture||this.gesture.id!==e.pointerId)return;
    if(!this.active()){this.cancel();return;}
    const point=cameraPoint(e,this.canvas.getBoundingClientRect());if(!point)return;
    this.frame=cameraFrame(this.gesture.start,point);this.refresh();
  }
  up(e){
    if(!this.gesture||this.gesture.id!==e.pointerId)return;
    if(!this.active()){this.cancel();return;}
    const rect=this.canvas.getBoundingClientRect(),point=cameraPoint(e,rect),gesture=this.gesture;
    this.gesture=null;
    try{this.canvas.releasePointerCapture(e.pointerId);}catch{}
    const frame=point?cameraFrame(gesture.start,point):null;
    this.frame=hasUsableCameraFrame(frame)&&frame.w*rect.width>=6&&frame.h*rect.height>=6?frame:gesture.previous;
    this.refresh();
  }
  cancel(){
    const gesture=this.gesture;if(!gesture)return;
    this.gesture=null;this.frame=gesture.previous;
    try{this.canvas.releasePointerCapture(gesture.id);}catch{}
    this.refresh();
  }
  clear(){if(!this.active())return;this.cancel();this.frame=null;this.refresh();}
  async capture(){
    if(!this.active()||this.gesture||!hasUsableCameraFrame(this.frame))return;
    this.busy=true;this.refresh();
    try{
      const result=await this.options.onCapture({...this.frame});
      if(!this.destroyed&&!result?.ok)this.options.onStatus(result?.reason||'The photograph could not be recorded. Adjust the frame and try again.');
    }catch(error){if(!this.destroyed)this.options.onStatus(error?.message||'The photograph could not be recorded.');}
    finally{if(!this.destroyed){this.busy=false;this.refresh();}}
  }
  destroy(){
    if(this.destroyed)return;
    this.cancel();this.destroyed=true;
    for(const [name,handler]of this.bindings)this.canvas.removeEventListener(name,handler);
    this.bindings=[];this.options=null;
  }
}
