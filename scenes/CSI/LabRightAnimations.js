const SCREEN=[1026,377,1107,377,1107,447,1026,447];
const UV_TUBE=[625,571,643,571,643,616,625,616];
const UV_BAR=[827,563,882,573,878,584,826,574];
const TABLE=[598,638,941,642,949,658,625,666,597,651];
const LENS=[[1601,518,44]];

export class LabRightAnimations {
  constructor(scene,view){
    this.scene=scene;this.view=view;this.disposed=false;this.elapsed=0;
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
    this.screen=this.graphics([SCREEN]);this.uvTube=this.graphics([UV_TUBE]);
    this.uvBar=this.graphics([UV_BAR]);this.uvTable=this.graphics([TABLE]);
    this.lens=this.graphics(null,LENS);this.details=this.graphics();this.dust=this.graphics();
    scene.events.on('update',this.update,this);scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }
  graphics(polygons=null,circles=null){
    const g=this.scene.add.graphics().setVisible(false).setScrollFactor(0);this.objects.push(g);
    if(polygons||circles){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});shape.setScrollFactor(0).fillStyle(0xffffff,1);
      if(polygons)for(const p of polygons)shape.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
      if(circles)for(const[x,y,r]of circles)shape.fillCircle(x,y,r);
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
      this.view?.currentView==='lab_c'&&this.view.backgroundKind==='image'&&bg?.active&&bg.visible&&
      bg.texture?.key==='crimelab_right');
    for(const g of this.objects)g.setVisible(visible);if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);this.layout();
    this.drawScreen();this.drawUV();this.drawLens();this.drawDetails();this.drawDust();
  }
  drawScreen(){
    const g=this.screen,t=this.elapsed/1000;g.clear();
    // Transparent overlays preserve the shoe print painted on the monitor.
    g.fillStyle(0x94b9c0,0.035+(Math.sin(t*0.9)+1)*0.02);g.fillRect(1020,370,94,85);
    const y=379+((t*27)%67);
    g.fillStyle(0xd2f5dc,0.31);g.fillRect(1022,y,90,3);
    g.fillStyle(0xc5ecd6,0.07);g.fillRect(1022,y-4,90,11);
    g.lineStyle(1,0x6c9689,0.65);
    for(const[x,yy,dx,dy]of [[1032,384,7,7],[1100,384,-7,7],[1032,440,7,-7],[1100,440,-7,-7]]){
      g.lineBetween(x,yy,x+dx,yy);g.lineBetween(x,yy,x,yy+dy);
    }
    if(Math.floor(t*1.4)%2===0){g.fillStyle(0x537d66,0.8);g.fillRect(1093,439,7,2);}
  }
  drawUV(){
    const t=this.elapsed/1000,p=(Math.sin(t*1.7)+1)/2;
    this.uvTube.clear().fillStyle(0xc3a2ff,0.15+p*0.22).fillRect(622,568,25,52);
    this.uvBar.clear().fillStyle(0xc3a2ff,0.12+p*0.24).fillRect(822,559,65,32);
    const g=this.uvTable;g.clear();
    g.fillStyle(0x9c78d5,0.025+p*0.035);g.fillRect(590,630,365,45);
    const x=605+((t*43)%345);
    g.fillStyle(0xbe9be6,0.085);g.fillRect(x,632,16,40);
  }
  drawLens(){
    const g=this.lens,t=this.elapsed/1000;g.clear();
    const phase=t%7;if(phase>2.2)return;
    const x=1545+phase*46;
    g.lineStyle(4,0xf2ffe0,0.28);g.lineBetween(x,550,x+33,486);
    g.lineStyle(1.3,0xffffff,0.34);g.lineBetween(x+7,550,x+40,486);
  }
  drawDetails(){
    const g=this.details,t=this.elapsed/1000;g.clear();
    // Traveling highlights suggest a polished rim; do not rotate painted film reels.
    for(const[x,y,r]of [[1164,518,16],[1204,515,19]]){
      const a=t*0.9;g.lineStyle(1.4,0xb9c4ac,0.48);
      g.beginPath();g.arc(x,y,r,a,a+0.7,false);g.strokePath();
    }
    g.fillStyle(0xffe9aa,0.025+(Math.sin(t*0.65)+1)*0.02);g.fillEllipse(909,218,133,20);
    const cycle=t%6;
    if(cycle<1.5){
      const a=Math.sin(cycle/1.5*Math.PI),spots=[[1328,461],[1468,631],[1743,696]],p=spots[Math.floor(t/6)%spots.length];
      g.lineStyle(1.2,0xf3efd3,a*0.7);g.lineBetween(p[0]-5,p[1],p[0]+5,p[1]);g.lineBetween(p[0],p[1]-5,p[0],p[1]+5);
    }
  }
  drawDust(){
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(let i=0;i<25;i++){
      const p=((i*0.381966)+t*(0.014+i%4*0.003))%1;
      const x=909+(((i*0.618034)%1)-0.5)*(100+p*180)+Math.sin(t*0.35+i)*6;
      g.fillStyle(0xeee5bd,Math.sin(p*Math.PI)*0.30);g.fillCircle(x,249+p*195,1+(i%3)*0.2);
    }
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update,this);this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();for(const g of this.objects)g.destroy();
    for(const m of this.masks)m.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];this.view=null;
  }
}
