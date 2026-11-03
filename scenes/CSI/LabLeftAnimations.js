const PANES=[
  [594,0,649,0,649,75,594,62],
  [674,0,741,0,741,102,674,82],
  [766,0,830,26,830,128,766,109],
  [853,38,902,54,902,151,853,136]
];
const TUBES=[
  [517,624,529,624,529,703,517,703], [538,621,548,621,548,706,538,706],
  [557,618,568,618,568,705,557,705], [576,616,587,616,587,705,576,705],
  [597,615,608,615,608,703,597,703], [618,612,630,612,630,700,618,700]
];

export class LabLeftAnimations {
  constructor(scene,view){
    this.scene=scene;this.view=view;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
    this.window=this.graphics(PANES);this.tubes=this.graphics(TUBES);
    this.dust=this.graphics();this.details=this.graphics();
    scene.events.on('update',this.update,this);scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }
  graphics(polygons=null){
    const g=this.scene.add.graphics().setScrollFactor(0).setVisible(false);this.objects.push(g);
    if(polygons){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});shape.setScrollFactor(0).fillStyle(0xffffff,1);
      for(const p of polygons)shape.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);
      this.masked.push(g);this.maskGraphics.push(shape);this.masks.push(mask);
    }
    return g;
  }
  hide(){for(const g of this.objects)g.setVisible(false);}
  layout(){
    const bg=this.view?.background;if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight,x=bg.x-w*(bg.originX??0),y=bg.y-h*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics])g.setPosition(x,y).setScale(w/1920,h/1080)
      .setScrollFactor(bg.scrollFactorX??0,bg.scrollFactorY??0);
    for(const g of this.objects)g.setDepth(bg.depth+1);
  }
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene,bg=this.view?.background;
    const visible=Boolean(s.labRunToken&&!s.labCleanupDone&&!s._cleanupDone&&!s.isExitingLab&&!s.debugMode&&
      this.view?.currentView==='lab_a'&&this.view.backgroundKind==='image'&&
      bg?.active&&bg.visible&&bg.texture?.key==='crimelab_left');
    for(const g of this.objects)g.setVisible(visible);
    if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);this.layout();
    this.drawWindow();this.drawDust();this.drawTubes();this.drawDetails();
  }
  drawWindow(){
    const g=this.window,t=this.elapsed/1000;g.clear();
    const x=490+((t*16)%670);
    for(let i=0;i<5;i++){g.fillStyle(0x716a4f,0.024);g.fillEllipse(x+i*10,65,160+i*18,280);}
    const ray=580+((t*23)%480);
    g.fillStyle(0xfff0bf,0.07);g.fillPoints([{x:ray,y:0},{x:ray+12,y:0},{x:ray-50,y:170},{x:ray-62,y:170}],true);
  }
  drawDust(){
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(let i=0;i<32;i++){
      const p=((i*0.381966)+t*(0.014+(i%4)*0.004))%1;
      const nearLamp=i<12;
      const x=nearLamp?235+(((i*0.618034)%1)-0.5)*(75+p*125)+Math.sin(t*0.35+i)*6:
        750+(((i*0.618034)%1)-0.5)*(140+p*175)+p*75+Math.sin(t*0.3+i)*7;
      const y=nearLamp?548+p*145:185+p*250;
      g.fillStyle(0xf4e4bd,Math.sin(p*Math.PI)*(nearLamp?0.34:0.29));
      g.fillCircle(x,y,1+(i%3)*0.25);
    }
  }
  drawTubes(){
    const g=this.tubes,t=this.elapsed/1000;g.clear();
    const x=510+((t*22)%130);
    g.fillStyle(0xf5f5d6,0.22);g.fillRect(x,611,3,100);
    g.fillStyle(0xf5f5d6,0.07);g.fillRect(x-3,611,10,100);
  }
  drawDetails(){
    const g=this.details,t=this.elapsed/1000;g.clear();
    const glow=(Math.sin(t*0.7)+1)/2;
    g.fillStyle(0xffd78a,0.035+glow*0.035);g.fillEllipse(284,522,67,26);
    // The lid is open: only an idle status lamp, no rotating rotor or analysis progress.
    const led=(Math.sin(t*1.8)+1)/2;
    g.fillStyle(0x9ec8a0,0.08+led*0.1);g.fillCircle(771,671,5);
    g.fillStyle(0xb5dfaf,0.4+led*0.35);g.fillCircle(771,671,1.8);
    const cycle=t%5;
    if(cycle<1.6){
      const spots=[[498,513],[469,650],[398,875],[886,673]];
      const p=spots[Math.floor(t/5)%spots.length],a=Math.sin(cycle/1.6*Math.PI),r=3+a*4;
      g.lineStyle(1.2,0xf5eccc,a*0.65);
      g.lineBetween(p[0]-r,p[1],p[0]+r,p[1]);g.lineBetween(p[0],p[1]-r,p[0],p[1]+r);
    }
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update,this);this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();for(const g of this.objects)g.destroy();
    for(const mask of this.masks)mask.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];this.view=null;
  }
}
