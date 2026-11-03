const SCREEN=[1016,488,1116,488,1118,568,1016,569];
const FLASK=[590,543,615,543,621,556,611,564,599,563,590,555];
const POINTS=[[806,365],[896,378],[964,366],[895,447],[976,448],[832,424]];
export class LabCenterAnimations {
  constructor(scene,view){
    this.scene=scene;this.view=view;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.maskGraphics=[];this.masks=[];
    this.screen=this.graphics([SCREEN]);this.map=this.graphics();this.flask=this.graphics([FLASK]);
    this.dust=this.graphics();this.reflections=this.graphics();
    scene.events.on('update',this.update,this);scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);this.update(0,0);
  }
  graphics(polygons=null){
    const g=this.scene.add.graphics().setScrollFactor(0).setVisible(false);this.objects.push(g);
    if(polygons){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});shape.setScrollFactor(0).fillStyle(0xffffff,1);
      for(const p of polygons)shape.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);this.masked.push(g);this.maskGraphics.push(shape);this.masks.push(mask);
    }return g;
  }
  hide(){for(const g of this.objects)g.setVisible(false);}
  layout(){
    const bg=this.view?.background;if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight,x=bg.x-w*(bg.originX??0),y=bg.y-h*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics])g.setPosition(x,y).setScale(w/1920,h/1080).setScrollFactor(bg.scrollFactorX??0,bg.scrollFactorY??0);
    for(const g of this.objects)g.setDepth(bg.depth+1);
  }
  update(_time,delta){
    if(this.disposed)return;const s=this.scene,bg=this.view?.background;
    const visible=Boolean(s.labRunToken&&!s.labCleanupDone&&!s._cleanupDone&&!s.isExitingLab&&!s.debugMode&&
      this.view?.currentView==='lab_b'&&this.view.backgroundKind==='image'&&bg?.active&&bg.visible&&bg.texture?.key==='crimelab_center');
    for(const g of this.objects)g.setVisible(visible);if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);this.layout();this.drawScreen();this.drawMap();this.drawFlask();this.drawDust();this.drawReflections();
  }
  drawScreen(){
    const g=this.screen,t=this.elapsed/1000;g.clear();
    g.fillStyle(0x85e78d,0.035+(Math.sin(t)+1)*0.018);g.fillRect(1013,484,110,90);
    g.fillStyle(0xc0ffc0,0.32);g.fillRect(1020,496+((t*23)%69),53,3);
    g.lineStyle(1,0xb1f3a0,0.65);g.strokeRect(1027,503,39,47);
    g.fillStyle(0x122713,0.45);g.fillRect(1080,536,31,23);
    for(let i=0;i<6;i++){const h=4+(Math.sin(t*2+i*1.2)+1)*7;g.fillStyle(0x9ee97e,0.8);g.fillRect(1082+i*4.5,557-h,2.5,h);}
    if(Math.floor(t*1.5)%2===0){g.fillStyle(0xceffb7,0.9);g.fillRect(1078,524,5,2);}
    g.fillStyle(0x092008,0.1);for(let y=489;y<570;y+=4)g.fillRect(1014,y,108,1);
  }
  drawMap(){
    const g=this.map,t=this.elapsed/1000;g.clear();
    const index=Math.floor(t/2.8)%POINTS.length,[x,y]=POINTS[index],p=(t%2.8)/2.8;
    g.fillStyle(0xf5ce79,0.14);g.fillCircle(x,y,7);g.lineStyle(1.2,0xffd884,(1-p)*0.7);g.strokeCircle(x,y,3+p*13);
    g.fillStyle(0xffe4a3,0.85);g.fillCircle(x,y,2.4);const next=POINTS[(index+1)%POINTS.length];
    g.fillStyle(0xf4dda2,0.65);g.fillCircle(x+(next[0]-x)*p,y+(next[1]-y)*p,1.8);
  }
  drawFlask(){
    const g=this.flask,t=this.elapsed/1000;g.clear();
    for(let i=0;i<5;i++){const p=(t*0.4+i*0.2)%1;g.lineStyle(0.8,0xd8f8ed,Math.sin(p*Math.PI)*0.75);g.strokeCircle(597+i*3.5+Math.sin(t+i),564-p*21,1.1+(i%2)*0.5);}
  }
  drawDust(){
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(let i=0;i<24;i++){const p=((i*0.381966)+t*(0.014+(i%4)*0.004))%1;const x=970+(((i*0.618034)%1)-0.5)*(90+p*180)+Math.sin(t*0.3+i)*6;g.fillStyle(0xf2e7bd,Math.sin(p*Math.PI)*0.30);g.fillCircle(x,248+p*210,0.9+(i%3)*0.25);}
  }
  drawReflections(){
    const g=this.reflections,t=this.elapsed/1000;g.clear();g.fillStyle(0xffedaf,0.025+(Math.sin(t*0.7)+1)*0.02);g.fillEllipse(970,220,126,19);
    const cycle=t%6;if(cycle<1.6){const a=Math.sin(cycle/1.6*Math.PI),points=[[1401,449],[602,543],[1776,432]],p=points[Math.floor(t/6)%3];g.lineStyle(1.2,0xffefd0,a*0.7);g.lineBetween(p[0]-5,p[1],p[0]+5,p[1]);g.lineBetween(p[0],p[1]-5,p[0],p[1]+5);}
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update,this);this.scene.scale.off('resize',this.layout,this);this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();for(const g of this.objects)g.destroy();for(const m of this.masks)m.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];this.view=null;
  }
}
