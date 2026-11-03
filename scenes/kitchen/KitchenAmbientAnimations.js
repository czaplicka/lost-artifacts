const WINDOW_PANES = [
  [1595,178,1713,164,1713,284,1595,296],
  [1745,162,1908,151,1908,280,1745,285],
  [1595,316,1713,309,1713,452,1595,452],
  [1745,310,1908,307,1908,452,1745,451],
  [1595,480,1713,479,1713,602,1595,590],
  [1745,481,1908,482,1908,615,1745,605]
];

export class KitchenAmbientAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
    this.window=this.graphics(WINDOW_PANES);this.steam=this.graphics();
    this.details=this.graphics();this.drip=this.graphics();
    this.layout();
    // Game events keep running while this Scene is still in its preload phase.
    scene.game.events.on('poststep',this.tick,this);
    scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.tick(0,0);
  }
  graphics(polygons=null){
    const g=this.scene.add.graphics().setScrollFactor(0).setVisible(false);this.objects.push(g);
    if(polygons){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});shape.setScrollFactor(0).fillStyle(0xffffff,1);
      for(const p of polygons)shape.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);this.masked.push(g);this.masks.push(mask);this.maskGraphics.push(shape);
    }return g;
  }
  layout(){
    const bg=this.background;if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight,x=bg.x-w*(bg.originX??0),y=bg.y-h*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics])g.setPosition(x,y).setScale(w/1920,h/1080);
    // Below the loading UI (depth 0), above its background (depth -10).
    for(const g of this.objects)g.setDepth((bg.depth??-10)+1);
  }
  tick(_time,delta){
    if(this.disposed)return;
    const visible=Boolean(this.background?.active&&this.background.visible&&this.scene._runToken);
    for(const g of this.objects)g.setVisible(visible);if(!visible)return;
    const dt=Number.isFinite(delta)?delta:(this.scene.game.loop?.delta??16.67);
    this.elapsed+=Math.min(Math.max(dt,0),100);this.layout();
    this.drawSteam();this.drawDetails();this.drawWindow();this.drawDrip();
  }
  drawSteam(){
    const g=this.steam,t=this.elapsed/1000;g.clear();
    for(let i=0;i<4;i++){
      const p=(t*0.21+i*0.25)%1,points=[];
      const x=718+Math.sin(t*0.8+i)*6,y=616-p*74;
      for(let j=0;j<17;j++){const u=j/16;points.push({x:x+Math.sin(u*5+t+i)*(3+p*6),y:y-u*23});}
      const alpha=Math.sin(p*Math.PI)*0.30;
      g.lineStyle(5,0xd9dfca,alpha*0.14);g.strokePoints(points,false);
      g.lineStyle(2.4,0xebedde,alpha);g.strokePoints(points,false);
    }
  }
  drawDetails(){
    const g=this.details,t=this.elapsed/1000;g.clear();
    const pulse=(Math.sin(t*1.5)+1)/2;
    g.fillStyle(0x9bd59a,0.12+pulse*0.12);g.fillEllipse(389,629,55,16);
    g.fillStyle(0xb7e2ad,0.4+pulse*0.3);g.fillRect(371,625,34,5);
    for(const[x,y,phase]of [[693,452,0],[693,474,1.5],[908,454,3],[909,474,4.5]]){
      const alpha=0.12+(Math.sin(t*1.3+phase)+1)*0.15;
      g.fillStyle(0xd6e3b5,alpha);g.fillRect(x-3,y-2,8,5);
    }
    const glow=(Math.sin(t*0.7)+1)/2;
    g.fillStyle(0xffefb0,0.025+glow*0.03);
    g.fillPoints([{x:363,y:177},{x:836,y:217},{x:824,y:230},{x:356,y:188}],true);
  }
  drawWindow(){
    const g=this.window,t=this.elapsed/1000;g.clear();
    const lights=[[1609,345],[1676,389],[1782,364],[1812,411],[1879,339],[1806,548],[1658,577]];
    for(let i=0;i<lights.length;i++){
      const[x,y]=lights[i],p=(Math.sin(t*0.42+i*1.9)+1)/2;
      g.fillStyle(0xe5d6a4,p*0.52);g.fillRect(x,y,5,7);
    }
    const x=1540+((t*12)%440);
    g.fillStyle(0xa0b0c0,0.035);g.fillRect(x,160,16,470);
  }
  drawDrip(){
    const g=this.drip,t=this.elapsed/1000;g.clear();
    const cycle=t%6.5;
    if(cycle<0.7){
      const p=cycle/0.7;
      g.fillStyle(0xb0c8cc,0.42);g.fillEllipse(1682,858+p*p*85,2.6,4+p*2);
    }else if(cycle<1.25){
      const p=(cycle-0.7)/0.55;
      g.lineStyle(1,0xa9c4c7,(1-p)*0.40);g.strokeEllipse(1682,945,3+p*20,2+p*6);
    }
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.scene.game.events.off('poststep',this.tick,this);
    this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();for(const g of this.objects)g.destroy();
    for(const m of this.masks)m.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
  }
}
