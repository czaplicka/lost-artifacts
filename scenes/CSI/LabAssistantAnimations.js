const BULBS = [
  [404,231],[439,260],[483,266],[520,244],[566,267],[593,239],[642,238],[670,266],
  [719,265],[749,240],[781,265],[829,269],[860,249],[909,278],[960,280],[985,258],
  [1027,278],[1057,250],[1067,295],[1081,326],[1068,359],[1067,402],[1081,444],
  [369,268],[389,305],[367,339],[368,421],[393,459],[370,493]
];
const LIQUID = [953,638,981,628,1007,658,988,670,966,674,947,664];
const MONITOR = [467,516,511,515,523,594,473,604];
const GLASSES = [[815,505,20],[867,506,18]];

export class LabAssistantAnimations {
  constructor(scene) {
    this.scene=scene;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
    this.lights=this.graphics();
    this.liquid=this.graphics([LIQUID]);
    this.bubbles=this.graphics();
    this.monitor=this.graphics([MONITOR]);
    this.glasses=this.graphics(null,GLASSES);
    this.wheel=this.graphics();
    this.dust=this.graphics();
    this.layout();
    scene.events.on('update',this.update,this);
    scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);
    scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  background(){return this.scene.labView?.background;}

  graphics(polygons=null,circles=null) {
    const item=this.scene.add.graphics().setVisible(false).setScrollFactor(0);
    this.objects.push(item);
    if(polygons||circles){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});
      shape.setScrollFactor(0);shape.fillStyle(0xffffff,1);
      if(polygons)for(const p of polygons)shape.fillPoints(
        Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      if(circles)for(const[x,y,r]of circles)shape.fillCircle(x,y,r);
      const mask=shape.createGeometryMask();item.setMask(mask);
      this.masked.push(item);this.masks.push(mask);this.maskGraphics.push(shape);
    }
    return item;
  }

  layout() {
    const bg=this.background();if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight;
    const x=bg.x-w*(bg.originX??0),y=bg.y-h*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics]){
      g.setPosition(x,y).setScale(w/1920,h/1080)
        .setScrollFactor(bg.scrollFactorX??0,bg.scrollFactorY??0);
    }
    for(const g of this.objects)g.setDepth(bg.depth+1);
  }

  update(_time,delta) {
    if(this.disposed)return;
    const s=this.scene,bg=this.background();
    const view=s.labView?.currentView??s.currentView;
    const visible=Boolean(s.labRunToken&&!s.labCleanupDone&&!s._cleanupDone&&!s.isExitingLab&&
      !s.debugMode&&view==='lab_intro'&&bg?.active&&bg.visible&&
      bg.texture?.key==='crimelab_point_assistant');
    for(const g of this.objects)g.setVisible(visible);
    if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    this.layout();
    this.drawLights();this.drawLiquid();this.drawBubbles();
    this.drawMonitor();this.drawGlasses();this.drawWheel();this.drawDust();
  }

  drawLights() {
    const g=this.lights,t=this.elapsed/1000;g.clear();
    for(let i=0;i<BULBS.length;i++){
      const[x,y]=BULBS[i];
      const wave=(Math.sin(t*1.8-i*0.48)+1)/2;
      g.fillStyle(0xffdf81,0.025+wave*0.10);g.fillCircle(x,y,9);
      g.fillStyle(0xfff3b0,0.15+wave*0.38);g.fillEllipse(x,y,4.5,6.5);
    }
    g.fillStyle(0xffe9a8,0.035+(Math.sin(t*0.7)+1)*0.018);
    g.fillEllipse(977,213,129,20);
    for(let i=0;i<3;i++){
      const pulse=(Math.sin(t*1.8+i*2)+1)/2;
      g.fillStyle(0x9edfa3,0.1+pulse*0.35);g.fillCircle(1183+i*10,591,2);
    }
  }

  drawLiquid() {
    const g=this.liquid,t=this.elapsed/1000;g.clear();
    g.fillStyle(0x60e7c2,0.05+(Math.sin(t*1.2)+1)*0.025);g.fillRect(942,625,69,52);
    for(let i=0;i<10;i++){
      const p=(t*(0.3+i%3*0.05)+i*0.137)%1;
      const x=954+(i*11.7)%43+Math.sin(t*1.3+i)*2;
      const y=674-p*46;
      const alpha=Math.sin(p*Math.PI)*0.65;
      g.lineStyle(1,0xd1ffee,alpha);g.strokeCircle(x,y,1.4+(i%3)*0.65);
    }
  }

  drawBubbles() {
    const g=this.bubbles,t=this.elapsed/1000;g.clear();
    for(let i=0;i<5;i++){
      const p=(t*0.25+i*0.2)%1;
      const x=934-p*12+Math.sin(t*0.8+i)*7;
      const y=539-p*60;
      const alpha=Math.sin(p*Math.PI)*0.66;
      g.fillStyle(0x88e8cd,alpha*0.12);g.fillCircle(x,y,2+p*2.8);
      g.lineStyle(1,0xb2f6de,alpha);g.strokeCircle(x,y,2+p*2.8);
      g.fillStyle(0xe3fff0,alpha*0.8);g.fillCircle(x-0.7,y-0.8,0.65);
    }
  }

  drawMonitor() {
    const g=this.monitor,t=this.elapsed/1000;g.clear();
    g.fillStyle(0x99c29b,0.03+(Math.sin(t)+1)*0.02);g.fillRect(460,510,70,100);
    g.fillStyle(0xcee1b3,0.22);g.fillRect(460,514+((t*24)%90),70,3);
    if(Math.floor(t*1.5)%2===0){g.fillStyle(0xc4dbad,0.8);g.fillRect(482,580,7,3);}
  }

  drawGlasses() {
    const g=this.glasses,t=this.elapsed/1000;g.clear();
    const cycle=t%8;
    if(cycle>2.4)return;
    const offset=-27+cycle*24;
    g.lineStyle(3,0xf1ffdc,0.38);
    for(const[x,y]of GLASSES)g.lineBetween(x+offset-6,y+20,x+offset+8,y-20);
  }

  drawWheel() {
    const g=this.wheel,t=this.elapsed/1000;g.clear();
    // Moving rim highlights only. The painted hamster and spokes stay still.
    for(let i=0;i<2;i++){
      const angle=t*0.9+i*Math.PI;
      g.lineStyle(2,0xd8d8b7,0.42);
      g.beginPath();g.arc(1398,664,49,angle,angle+0.55,false);g.strokePath();
    }
  }

  drawDust() {
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(let i=0;i<20;i++){
      const p=((i*0.381966)+t*(0.012+i%4*0.003))%1;
      const x=977+(((i*0.618034)%1)-0.5)*(80+p*130)+Math.sin(t*0.3+i)*5;
      g.fillStyle(0xf2e7be,Math.sin(p*Math.PI)*0.25);
      g.fillCircle(x,241+p*175,0.8+(i%3)*0.2);
    }
  }

  destroy() {
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update,this);
    this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);
    this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();
    for(const g of this.objects)g.destroy();
    for(const mask of this.masks)mask.destroy();
    for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
  }
}
