const WINDOWS = [
  [1490, 112, 1660, 22, 1660, 130, 1490, 205],
  [1490, 259, 1660, 187, 1660, 702, 1490, 625],
  [1754, 225, 1884, 178, 1884, 529, 1850, 533, 1850, 654, 1884, 663, 1884, 797, 1754, 732]
];
const JARS = [{x:560,y:489},{x:634,y:475},{x:850,y:282},{x:962,y:280}];

export class ShopAmbientAnimations {
  constructor(scene, background) {
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.maskGraphics=[];this.masks=[];
    this.window=this.graphics(WINDOWS);
    this.steam=this.graphics();this.light=this.graphics();this.dust=this.graphics();this.glints=this.graphics();
    this.layout();
    scene.events.on('update',this.update,this);
    scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);
    scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  graphics(polygons=null) {
    const g=this.scene.add.graphics().setDepth(3).setVisible(false);
    this.objects.push(g);
    if(polygons){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});
      shape.fillStyle(0xffffff,1);
      for(const p of polygons)shape.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);
      this.masked.push(g);this.maskGraphics.push(shape);this.masks.push(mask);
    }
    return g;
  }

  layout() {
    const bg=this.background;
    if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight;
    const x=bg.x-w*bg.originX,y=bg.y-h*bg.originY;
    for(const g of [...this.objects,...this.maskGraphics])g.setPosition(x,y).setScale(w/1920,h/1080);
  }

  update(_time,delta) {
    if(this.disposed)return;
    const s=this.scene;
    const visible=Boolean(this.background?.active&&this.background.visible&&s.shopRunToken&&
      !s._cleanupDone&&!s.exiting&&!s.buying&&!s.hudPanelOpen&&!s.debugMode);
    for(const g of this.objects)g.setVisible(visible);
    if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    this.layout();
    this.drawWindows();this.drawSteam();this.drawLight();this.drawDust();this.drawGlints();
  }

  drawWindows() {
    const g=this.window,t=this.elapsed/1000;
    g.clear();
    const x=1410+((t*18)%650);
    for(let i=0;i<6;i++){
      g.fillStyle(0x3e514c,0.018);
      g.fillEllipse(x+i*10,390,125+i*16,920);
    }
    const p=t%14;
    if(p<7){
      const xx=1420+p*72;
      g.fillStyle(0xe2e5c6,0.065);
      g.fillPoints([{x:xx,y:90},{x:xx+11,y:90},{x:xx-80,y:800},{x:xx-91,y:800}],true);
    }
  }

  drawSteam() {
    const g=this.steam,t=this.elapsed/1000;
    g.clear();
    for(let i=0;i<6;i++){
      const p=(t*0.19+i/6)%1;
      const origin=i%2===0?{x:128,y:531}:{x:223,y:508};
      const points=[];
      for(let j=0;j<16;j++){
        const u=j/15;
        points.push({x:origin.x+Math.sin(u*5+t*1.1+i)*(4+p*7),y:origin.y-p*65-u*20});
      }
      const alpha=Math.sin(p*Math.PI)*0.26;
      g.lineStyle(5,0xebe2ca,alpha*0.16);g.strokePoints(points,false);
      g.lineStyle(2.3,0xf0e8d6,alpha);g.strokePoints(points,false);
    }
  }

  drawLight() {
    const g=this.light,t=this.elapsed/1000;
    g.clear();
    const pulse=(Math.sin(t*0.65)+1)/2;
    g.fillStyle(0xffdfa0,0.035+pulse*0.035);
    g.fillEllipse(971,178,146,20);
    const led=(Math.sin(t*2.1)+1)/2;
    g.fillStyle(0xef8750,0.08+led*0.13);g.fillCircle(150,427,7);
    g.fillStyle(0xffb267,0.50+led*0.30);g.fillRect(146,423,7,7);
  }

  drawDust() {
    const g=this.dust,t=this.elapsed/1000;
    g.clear();
    for(let i=0;i<32;i++){
      const p=((i*0.381966)+t*(0.015+(i%4)*0.004))%1;
      const width=90+p*260;
      const x=970+(((i*0.618034)%1)-0.5)*width+Math.sin(t*0.3+i)*6;
      g.fillStyle(0xf3dfad,Math.sin(p*Math.PI)*0.34);
      g.fillCircle(x,205+p*380,1+(i%3)*0.25);
    }
  }

  drawGlints() {
    const g=this.glints;g.clear();
    const phase=this.elapsed%5000;
    if(phase>1500)return;
    const p=JARS[Math.floor(this.elapsed/5000)%JARS.length];
    const alpha=Math.sin(phase/1500*Math.PI);
    const size=3+alpha*5;
    g.fillStyle(0xffedbe,alpha*0.12);g.fillCircle(p.x,p.y,size+2);
    g.lineStyle(1.3,0xffefc7,alpha*0.70);
    g.lineBetween(p.x-size,p.y,p.x+size,p.y);
    g.lineBetween(p.x,p.y-size,p.x,p.y+size);
  }

  destroy() {
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update,this);
    this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);
    this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();
    for(const g of this.objects)g.destroy();
    for(const m of this.masks)m.destroy();
    for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
  }
}
