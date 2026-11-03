const SCREENS = [
  [468,139,571,150,571,239,468,229],
  [627,161,724,174,724,257,627,246],
  [786,186,872,197,872,274,786,263],
  [470,311,574,316,574,413,470,405],
  [627,330,728,335,728,423,627,418],
  [787,339,868,342,868,429,787,424]
];
const MAP_EMPTY = [976,454,1195,455,1195,605,976,605];
// Only exposed portions of the map; exclude Frank, his fingers and the joke book.
const MAP_FRANK = [976,454,1146,454,1146,542,1035,542,1035,605,976,605];
const LEDS = [
  {x:180,y:82,phase:0},{x:230,y:89,phase:1.5},{x:280,y:96,phase:3},
  {x:333,y:135,phase:4.5},{x:180,y:205,phase:2.4},{x:282,y:218,phase:5},
  {x:357,y:226,phase:0.8},{x:1770,y:592,phase:1},{x:1787,y:592,phase:3.3}
];

export class ArchiveAnimations {
  constructor(scene) {
    this.scene=scene;this.disposed=false;this.elapsed=0;this.variant=null;
    this.objects=[];this.maskedItems=[];this.maskGraphics=[];this.masks=[];
    this.particles=Array.from({length:22},(_,i)=>({
      x:(i*0.61803398875)%1,y:(i*0.38196601125)%1,
      phase:i*1.7,speed:0.012+(i%4)*0.004
    }));
    this.screens=SCREENS.map(points=>this.graphics(points));
    this.mapEmpty=this.graphics(MAP_EMPTY);
    this.mapFrank=this.graphics(MAP_FRANK);
    this.leds=this.graphics();this.meters=this.graphics();this.dust=this.graphics();
    this.coffeeSteam=this.graphics();
    this.layout();
    scene.events.on('update',this.update,this);
    scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);
    scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  graphics(points=null) {
    // Root-level graphics and masks share world coordinates; no nested container masks.
    const g=this.scene.add.graphics().setDepth(2).setVisible(false);
    this.objects.push(g);
    if(points){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});
      shape.fillStyle(0xffffff,1);
      shape.fillPoints(Array.from({length:points.length/2},(_,i)=>({x:points[i*2],y:points[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);
      this.maskedItems.push(g);this.maskGraphics.push(shape);this.masks.push(mask);
    }
    return g;
  }

  layout() {
    const bg=this.scene.background;if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight;
    const x=bg.x-w*(bg.originX??0),y=bg.y-h*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics]) {
      g.setPosition(x,y).setScale(w/1920,h/1080)
        .setScrollFactor(bg.scrollFactorX??1,bg.scrollFactorY??1);
    }
    for(const g of this.objects)g.setDepth((bg.depth??0)+2);
  }

  update(_time,delta) {
    if(this.disposed)return;
    const s=this.scene,bg=s.background,key=bg?.texture?.key;
    const variant=key==='archive'?'empty':key==='archivist'?'frank':null;
    const visible=Boolean(!s._archiveDisposed&&!s._cleanupDone&&!s.isLeaving&&
      !s._documentOpening&&!s._puzzleOpen&&bg?.active&&bg.visible&&variant);
    for(const g of this.objects)g.setVisible(visible);
    if(!visible)return;
    this.variant=variant;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    this.layout();
    this.mapEmpty.setVisible(variant==='empty');
    this.mapFrank.setVisible(variant==='frank');
    this.coffeeSteam.setVisible(variant==='frank');
    this.drawScreens();
    this.drawMap(variant==='frank'?this.mapFrank:this.mapEmpty);
    this.drawLeds();this.drawMeters();this.drawDust();
    if(variant==='frank')this.drawCoffeeSteam();
  }

  drawScreens() {
    const t=this.elapsed/1000;
    for(let i=0;i<this.screens.length;i++) {
      const g=this.screens[i],points=SCREENS[i];
      const xs=points.filter((_,j)=>j%2===0),ys=points.filter((_,j)=>j%2===1);
      const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      g.clear();
      g.fillStyle(0x8ac8ad,0.035+(Math.sin(t*0.8+i)+1)*0.023);g.fillRect(x,y,w,h);
      g.fillStyle(0x102a25,0.075);for(let line=y;line<y+h;line+=4)g.fillRect(x,line,w,1);
      const scanY=y-5+((t*(17+i*1.3)+i*19)%(h+10));
      g.fillStyle(0xb4dfce,0.22);g.fillRect(x,scanY,w,3);
    }
  }

  drawMap(g) {
    const phase=(this.elapsed%3000)/3000,pulse=(Math.sin(phase*Math.PI*2)+1)/2;
    const x=1080,y=520;
    g.clear();
    g.fillStyle(0xe56b57,0.10+pulse*0.07);g.fillCircle(x,y,10+pulse*2);
    g.lineStyle(1.2,0xf3a17b,(1-phase)*0.60);g.strokeCircle(x,y,4+phase*13);
    g.fillStyle(0xf19b77,0.80+pulse*0.2);g.fillCircle(x,y,3);
  }

  drawLeds() {
    const g=this.leds,t=this.elapsed/1000;g.clear();
    for(const led of LEDS) {
      const cycle=(t+led.phase)%5.8,dip=cycle>4.8&&cycle<5.3;
      if(dip){
        g.fillStyle(0x162d2b,0.62);g.fillRect(led.x-3.5,led.y-3.5,7,7);
      }else{
        const alpha=0.10+(Math.sin(t+led.phase)+1)*0.055;
        g.fillStyle(0x9ae3a3,alpha);g.fillCircle(led.x,led.y,5);
      }
    }
  }

  drawMeters() {
    const g=this.meters,t=this.elapsed/1000;g.clear();
    for(let i=0;i<2;i++) {
      const x=i===0?218:272,y=i===0?778:771;
      const angle=-Math.PI/2+Math.sin(t*1.35+i*1.4)*0.42;
      g.lineStyle(1.2,0x684c39,0.8);g.lineBetween(x,y,x+Math.cos(angle)*13,y+Math.sin(angle)*13);
    }
    for(let i=0;i<6;i++) {
      const level=(Math.sin(t*0.9+i*1.1)+1)/2;
      g.fillStyle(0x95d0bb,0.055+level*0.16);g.fillRect(1773+i*15,935,3,55);
    }
  }

  drawDust() {
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(const p of this.particles) {
      const progress=(p.y+t*p.speed)%1,width=75+progress*180;
      const x=1470+(p.x-0.5)*width+Math.sin(t*0.3+p.phase)*5,y=378+progress*165;
      g.fillStyle(0xf0dfb5,Math.sin(progress*Math.PI)*0.28);
      g.fillCircle(x,y,0.9+(Math.sin(p.phase)+1)*0.2);
    }
  }

  drawCoffeeSteam() {
    const g=this.coffeeSteam,t=this.elapsed/1000;g.clear();
    for(let i=0;i<3;i++) {
      const progress=(t*0.18+i/3)%1,points=[];
      for(let j=0;j<15;j++) {
        const u=j/14;
        points.push({x:771+Math.sin(t*0.9+i+u*5)*(3+progress*5),y:734-progress*58-u*18});
      }
      const alpha=Math.sin(progress*Math.PI)*0.23;
      g.lineStyle(5,0xd4dfd7,alpha*0.14);g.strokePoints(points,false);
      g.lineStyle(2,0xe2e9de,alpha);g.strokePoints(points,false);
    }
  }

  destroy() {
    if(this.disposed)return;this.disposed=true;
    const scene=this.scene;
    scene.events.off('update',this.update,this);scene.scale.off('resize',this.layout,this);
    scene.events.off('shutdown',this.destroy,this);scene.events.off('destroy',this.destroy,this);
    for(const g of this.maskedItems)g.clearMask();for(const g of this.objects)g.destroy();
    for(const mask of this.masks)mask.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masks=[];this.maskGraphics=[];this.maskedItems=[];this.particles=[];
  }
}