const SCREENS = [
  [468,139,571,150,571,239,468,229], [627,161,724,174,724,257,627,246],
  [786,186,872,197,872,274,786,263], [470,311,574,316,574,413,470,405],
  [627,330,728,335,728,423,627,418], [787,339,868,342,868,429,787,424]
];
const MAP_EMPTY=[976,454,1195,455,1195,605,976,605];
const MAP_FRANK=[976,454,1146,454,1146,542,1035,542,1035,605,976,605];
const LEDS=[
  {x:180,y:82,phase:0},{x:230,y:89,phase:1.5},{x:280,y:96,phase:3},
  {x:333,y:135,phase:4.5},{x:180,y:205,phase:2.4},{x:282,y:218,phase:5},
  {x:357,y:226,phase:0.8},{x:1770,y:592,phase:1},{x:1787,y:592,phase:3.3}
];
// Tune only these source-background coordinates if the reel rims are misaligned.
const REELS=[
  {x:159,y:596,width:154,height:163,speed:-0.78},
  {x:331,y:589,width:154,height:153,speed:-0.70}
];
const REEL_SIZE=192;
const REEL_FPS=20;
let nextReelId=0;

export class ArchiveAnimations {
  constructor(scene){
    this.scene=scene;this.disposed=false;this.elapsed=0;this.variant=null;
    this.objects=[];this.maskedItems=[];this.maskGraphics=[];this.masks=[];
    this.reels=[];this.reelSource=null;this.reelSourceKey=null;this.failedReelSource=null;this.lastReelFrame=-1;
    this.particles=Array.from({length:28},(_,i)=>({
      x:(i*0.61803398875)%1,y:(i*0.38196601125)%1,phase:i*1.7,speed:0.016+(i%4)*0.004
    }));
    this.screens=SCREENS.map(p=>this.graphics(p));
    this.mapEmpty=this.graphics(MAP_EMPTY);this.mapFrank=this.graphics(MAP_FRANK);
    this.leds=this.graphics();this.meters=this.graphics();this.dust=this.graphics();
    this.coffeeSteam=this.graphics();
    this.layout();
    scene.events.on('update',this.update,this);scene.scale.on('resize',this.layout,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  graphics(points=null){
    const g=this.scene.add.graphics().setDepth(2).setVisible(false);this.objects.push(g);
    if(points){
      const shape=this.scene.make.graphics({x:0,y:0,add:false});shape.fillStyle(0xffffff,1);
      shape.fillPoints(Array.from({length:points.length/2},(_,i)=>({x:points[i*2],y:points[i*2+1]})),true);
      const mask=shape.createGeometryMask();g.setMask(mask);
      this.maskedItems.push(g);this.maskGraphics.push(shape);this.masks.push(mask);
    }return g;
  }

  hide(){for(const g of this.objects)g.setVisible(false);}

  releaseReels(){
    for(const reel of this.reels){
      reel.image.destroy();
      this.objects=this.objects.filter(item=>item!==reel.image);
      this.scene.textures.remove(reel.key);
    }
    this.reels=[];this.reelSource=null;this.reelSourceKey=null;this.lastReelFrame=-1;
  }

  prepareReels(bg){
    if(!bg?.texture?.getSourceImage)return;
    const source=bg.texture.getSourceImage(),sourceKey=bg.texture.key;
    if(this.reelSource===source&&this.reelSourceKey===sourceKey&&this.reels.length===REELS.length)return;
    if(this.failedReelSource===source)return;
    this.releaseReels();
    const sourceWidth=source.naturalWidth||source.width;
    const sourceHeight=source.naturalHeight||source.height;
    if(!sourceWidth||!sourceHeight)return;
    try{
      for(const placement of REELS){
        const stamp=document.createElement('canvas');stamp.width=REEL_SIZE;stamp.height=REEL_SIZE;
        const ctx=stamp.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(source,
          (placement.x-placement.width/2)*sourceWidth/1920,
          (placement.y-placement.height/2)*sourceHeight/1080,
          placement.width*sourceWidth/1920,placement.height*sourceHeight/1080,
          0,0,REEL_SIZE,REEL_SIZE);
        const key=`archive-reel-motion-${++nextReelId}`;
        const texture=this.scene.textures.createCanvas(key,REEL_SIZE,REEL_SIZE);
        if(!texture)throw new Error('Could not create reel texture.');
        let image;
        try{image=this.scene.add.image(0,0,key).setOrigin(0.5).setVisible(false);}
        catch(error){this.scene.textures.remove(key);throw error;}
        this.objects.push(image);this.reels.push({...placement,stamp,key,texture,image});
      }
      this.reelSource=source;this.reelSourceKey=sourceKey;this.failedReelSource=null;
      this.drawReels(true);
    }catch(error){
      this.releaseReels();this.failedReelSource=source;
      console.warn('[ArchiveAnimations] Reel extraction skipped; other effects remain active:',error);
    }
  }

  drawReels(force=false){
    const frame=Math.floor(this.elapsed/(1000/REEL_FPS));
    if(!force&&frame===this.lastReelFrame)return;
    this.lastReelFrame=frame;const t=this.elapsed/1000,half=REEL_SIZE/2;
    for(const reel of this.reels){
      const ctx=reel.texture.getContext();ctx.clearRect(0,0,REEL_SIZE,REEL_SIZE);
      ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.beginPath();ctx.arc(half,half,half-0.7,0,Math.PI*2);ctx.clip();
      ctx.translate(half,half);ctx.rotate(t*reel.speed);
      ctx.drawImage(reel.stamp,-half,-half,REEL_SIZE,REEL_SIZE);ctx.restore();
      reel.texture.refresh();
    }
  }

  layout(){
    const bg=this.scene.background;if(this.disposed||!bg?.active)return;
    const sx=bg.displayWidth/1920,sy=bg.displayHeight/1080;
    const x=bg.x-bg.displayWidth*(bg.originX??0),y=bg.y-bg.displayHeight*(bg.originY??0);
    for(const g of [...this.objects,...this.maskGraphics])g.setPosition(x,y).setScale(sx,sy)
      .setScrollFactor(bg.scrollFactorX??1,bg.scrollFactorY??1);
    for(const g of this.objects)g.setDepth((bg.depth??0)+2);
    for(const reel of this.reels)reel.image
      .setPosition(x+reel.x*sx,y+reel.y*sy)
      .setDisplaySize(reel.width*sx,reel.height*sy);
  }

  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene,bg=s.background,key=bg?.texture?.key;
    const variant=key==='archive'?'empty':key==='archivist'?'frank':null;
    const visible=Boolean(!s._archiveDisposed&&!s._cleanupDone&&!s.isLeaving&&
      !s._documentOpening&&!s._puzzleOpen&&bg?.active&&bg.visible&&variant);
    if(!visible){this.hide();return;}
    this.variant=variant;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    this.prepareReels(bg);
    for(const g of this.objects)g.setVisible(true);
    this.layout();
    this.mapEmpty.setVisible(variant==='empty');this.mapFrank.setVisible(variant==='frank');
    this.coffeeSteam.setVisible(variant==='frank');
    this.drawReels();this.drawScreens();this.drawMap(variant==='frank'?this.mapFrank:this.mapEmpty);
    this.drawLeds();this.drawMeters();this.drawDust();if(variant==='frank')this.drawCoffeeSteam();
  }

  drawScreens(){
    const t=this.elapsed/1000;
    for(let i=0;i<this.screens.length;i++){
      const g=this.screens[i],p=SCREENS[i],xs=p.filter((_,j)=>j%2===0),ys=p.filter((_,j)=>j%2===1);
      const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      g.clear();g.fillStyle(0x8ac8ad,0.04+(Math.sin(t*0.8+i)+1)*0.025);g.fillRect(x,y,w,h);
      g.fillStyle(0x102a25,0.09);for(let line=y;line<y+h;line+=4)g.fillRect(x,line,w,1);
      const scanY=y-5+((t*(24+i*1.7)+i*19)%(h+10));
      g.fillStyle(0xb4dfce,0.31);g.fillRect(x,scanY,w,3);
      // Small changing activity bar; painted security images remain visible.
      const activity=(Math.sin(t*1.8+i*1.2)+1)/2;
      g.fillStyle(0x9ee3bc,0.65);g.fillRect(x+6,y+h-7,8+activity*(w-20),2);
    }
  }

  drawMap(g){
    const t=this.elapsed/1000,phase=(t%3)/3,pulse=(Math.sin(phase*Math.PI*2)+1)/2;
    // Every point lies in the exposed upper part even when Frank is present.
    const points=[[1004,491],[1080,520],[1104,478]],leg=Math.floor(t/5)%points.length;
    const p=(t%5)/5,a=points[leg],b=points[(leg+1)%points.length];
    const x=a[0]+(b[0]-a[0])*p,y=a[1]+(b[1]-a[1])*p;
    g.clear();g.fillStyle(0xe56b57,0.11+pulse*0.09);g.fillCircle(x,y,11+pulse*2);
    g.lineStyle(1.2,0xf3a17b,(1-phase)*0.72);g.strokeCircle(x,y,4+phase*14);
    g.fillStyle(0xffb08a,0.95);g.fillCircle(x,y,3.1);
  }

  drawLeds(){
    const g=this.leds,t=this.elapsed/1000;g.clear();
    for(const led of LEDS){
      const cycle=(t+led.phase)%4.8,dip=cycle>3.9&&cycle<4.5;
      if(dip){g.fillStyle(0x162d2b,0.72);g.fillRect(led.x-3.5,led.y-3.5,7,7);}
      else{g.fillStyle(0x9ae3a3,0.15+(Math.sin(t*1.4+led.phase)+1)*0.075);g.fillCircle(led.x,led.y,5.5);}
    }
  }

  drawMeters(){
    const g=this.meters,t=this.elapsed/1000;g.clear();
    for(let i=0;i<2;i++){
      const x=i===0?218:272,y=i===0?778:771;
      const angle=-Math.PI/2+Math.sin(t*2.3+i*1.4)*0.49;
      g.lineStyle(1.3,0x684c39,0.95);g.lineBetween(x,y,x+Math.cos(angle)*13,y+Math.sin(angle)*13);
    }
    // Backing strips cover only the existing luminous meter slots, not the server panel.
    for(let i=0;i<6;i++){
      const level=(Math.sin(t*1.7+i*1.1)+1)/2,x=1773+i*15;
      g.fillStyle(0x172e30,0.72);g.fillRect(x,935,3,55);
      g.fillStyle(0xa5dfc9,0.72);g.fillRect(x,990-(7+level*46),3,7+level*46);
    }
  }

  drawDust(){
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(const p of this.particles){
      const progress=(p.y+t*p.speed)%1,width=75+progress*180;
      const x=1470+(p.x-0.5)*width+Math.sin(t*0.3+p.phase)*5,y=378+progress*165;
      g.fillStyle(0xf0dfb5,Math.sin(progress*Math.PI)*0.34);g.fillCircle(x,y,1+(Math.sin(p.phase)+1)*0.25);
    }
  }

  drawCoffeeSteam(){
    const g=this.coffeeSteam,t=this.elapsed/1000;g.clear();
    for(let i=0;i<4;i++){
      const progress=(t*0.20+i/4)%1,points=[];
      for(let j=0;j<16;j++){const u=j/15;points.push({x:771+Math.sin(t*0.9+i+u*5)*(3+progress*6),y:734-progress*64-u*20});}
      const alpha=Math.sin(progress*Math.PI)*0.30;
      g.lineStyle(5,0xd4dfd7,alpha*0.14);g.strokePoints(points,false);g.lineStyle(2.2,0xe2e9de,alpha);g.strokePoints(points,false);
    }
  }

  destroy(){
    if(this.disposed)return;this.disposed=true;
    const s=this.scene;
    s.events.off('update',this.update,this);s.scale.off('resize',this.layout,this);
    s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    this.releaseReels();
    for(const g of this.maskedItems)g.clearMask();for(const g of this.objects)g.destroy();
    for(const mask of this.masks)mask.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masks=[];this.maskGraphics=[];this.maskedItems=[];this.particles=[];
    this.failedReelSource=null;
  }
}