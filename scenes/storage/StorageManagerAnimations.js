const MODES = {
  agency_storage_manager: 'manager',
  agency_storage_room_v2: 'empty'
};
const SCREENS = [
  { points:[680,136,780,135,780,195,680,195], modes:['empty','manager'] },
  { points:[541,481,626,481,626,551,541,551], modes:['empty','manager'] },
  // Keep the animation above Alex's head, not over his hair or face.
  { points:[1207,288,1297,288,1297,342,1207,342], modes:['manager'] },
  { points:[1207,288,1297,288,1297,365,1207,365], modes:['empty'] },
  { points:[1218,480,1298,480,1298,546,1218,546], modes:['empty'] }
];
const WINDOW_PANES = [
  [269,192,322,208,322,340,269,339],
  [269,370,322,373,322,500,269,505]
];
const CONSOLE_LINES=['STOCK CHECK','ROPES: 12','HOOKS: DENIED','FORMS: MANY','ALL FILED.'];

export class StorageManagerAnimations {
  constructor(scene) {
    this.scene=scene;this.disposed=false;this.elapsed=0;this.variant=null;
    this.objects=[];this.maskedItems=[];this.maskGraphics=[];this.masks=[];
    this.cursorX=547;this.cursorY=489;this.cursorVisible=false;
    const screenMasks=SCREENS.map(s=>this.makeMask([s.points]));
    this.screens=screenMasks.map(mask=>this.masked(this.graphics(),mask));
    this.window=this.masked(this.graphics(),this.makeMask(WINDOW_PANES));
    this.light=this.graphics();this.dust=this.graphics();
    this.console=this.masked(scene.add.text(547,489,'',{
      fontFamily:'monospace',fontSize:'8px',color:'#a8c7a0',lineSpacing:3,padding:0
    }).setDepth(2).setVisible(false),screenMasks[1]);
    this.cursor=this.masked(scene.add.rectangle(547,489,4,7,0xa7c79c)
      .setOrigin(0).setDepth(2).setVisible(false),screenMasks[1]);
    this.objects.push(this.console,this.cursor);
    this.layout();
    scene.events.on('update',this.update,this);scene.scale.on('resize',this.layout,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  graphics() {
    const g=this.scene.add.graphics().setDepth(2).setVisible(false);
    this.objects.push(g);return g;
  }
  makeMask(polygons) {
    const g=this.scene.make.graphics({x:0,y:0,add:false});g.fillStyle(0xffffff,1);
    for(const p of polygons)g.fillPoints(Array.from({length:p.length/2},(_,i)=>({x:p[i*2],y:p[i*2+1]})),true);
    const mask=g.createGeometryMask();this.maskGraphics.push(g);this.masks.push(mask);return mask;
  }
  masked(item,mask){item.setMask(mask);this.maskedItems.push(item);return item;}

  layout() {
    const bg=this.scene.background;if(this.disposed||!bg?.active)return;
    const sx=bg.displayWidth/1920,sy=bg.displayHeight/1080;
    const x=bg.x-bg.displayWidth*(bg.originX??0),y=bg.y-bg.displayHeight*(bg.originY??0);
    for(const item of [...this.objects,...this.maskGraphics])item.setPosition(x,y).setScale(sx,sy)
      .setScrollFactor(bg.scrollFactorX??1,bg.scrollFactorY??1);
    for(const item of this.objects)item.setDepth((bg.depth??0)+2);
    this.console.setPosition(x+547*sx,y+489*sy);
    this.cursor.setPosition(x+this.cursorX*sx,y+this.cursorY*sy);
  }

  update(_time,delta) {
    if(this.disposed)return;
    const s=this.scene,bg=s.background,variant=MODES[bg?.texture?.key];
    const visible=Boolean(!s._storageDisposed&&!s._cleanupDone&&!s.isLeaving&&bg?.active&&bg.visible&&variant);
    for(const item of this.objects)item.setVisible(visible);
    if(!visible)return;
    this.variant=variant;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    for(let i=0;i<this.screens.length;i++)this.screens[i].setVisible(SCREENS[i].modes.includes(variant));
    this.drawScreens();this.updateConsole();this.drawWindow();this.drawLight();this.drawDust();
    this.cursor.setVisible(this.cursorVisible);this.layout();
  }

  drawScreens() {
    const t=this.elapsed/1000;
    for(let i=0;i<this.screens.length;i++) {
      const g=this.screens[i],definition=SCREENS[i];g.clear();
      if(!definition.modes.includes(this.variant))continue;
      const p=definition.points,xs=p.filter((_,j)=>j%2===0),ys=p.filter((_,j)=>j%2===1);
      const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      if(i===1){g.fillStyle(0x162319,0.8);g.fillRect(x,y,w,h);}
      g.fillStyle(0x8fba93,0.035+(Math.sin(t*0.7+i)+1)*0.018);g.fillRect(x,y,w,h);
      g.fillStyle(0x0c1d14,0.08);for(let yy=y;yy<y+h;yy+=4)g.fillRect(x,yy,w,1);
      g.fillStyle(0xb2d2af,0.20);g.fillRect(x,y-3+((t*(15+i*2)+i*17)%(h+6)),w,3);
      if(i===4){
        for(let bar=0;bar<6;bar++){
          const bh=4+(Math.sin(t*1.8+bar)+1)*7;
          g.fillStyle(0x9cc399,0.65);g.fillRect(1227+bar*10,536-bh,5,bh);
        }
      }
    }
  }

  updateConsole() {
    const cycle=this.elapsed%19000;let remaining=Math.floor(cycle/145),current='';const lines=[];
    for(const line of CONSOLE_LINES){
      if(remaining>=line.length+8){lines.push(line);remaining-=line.length+8;}
      else{current=line.slice(0,Math.min(remaining,line.length));break;}
    }
    this.console.setText([...lines,current].slice(0,5).join('\n'));
    const row=Math.min(lines.length,4);
    this.cursorX=547+current.length*4.8;this.cursorY=489+row*11;
    this.cursorVisible=lines.length<CONSOLE_LINES.length&&Math.floor(this.elapsed/550)%2===0;
  }

  drawWindow() {
    const g=this.window,t=this.elapsed/1000;g.clear();
    const x=220+((t*7)%280);
    for(let i=0;i<5;i++){g.fillStyle(0x626b4c,0.018);g.fillEllipse(x+i*6,350,70+i*17,400);}
  }
  drawLight() {
    const g=this.light,t=this.elapsed/1000,pulse=(Math.sin(t*0.45)+1)/2;g.clear();
    g.fillStyle(0xffe3a3,0.025+pulse*0.03);g.fillEllipse(966,117,140,39);
  }
  drawDust() {
    const g=this.dust,t=this.elapsed/1000;g.clear();
    for(let i=0;i<28;i++){
      const px=(i*0.61803398875)%1,py=(i*0.38196601125)%1;
      const p=(py+t*(0.014+(i%4)*0.003))%1,window=i>=18;
      const x=window?350+px*95+p*35+Math.sin(t*0.2+i*1.7)*5:
        970+(px-0.5)*(100+p*165)+Math.sin(t*0.3+i*1.7)*6;
      const y=window?270+p*230:150+p*78;
      g.fillStyle(0xf1e1b4,Math.sin(p*Math.PI)*0.28);g.fillCircle(x,y,0.9+(i%3)*0.2);
    }
  }

  destroy() {
    if(this.disposed)return;this.disposed=true;
    const s=this.scene;
    s.events.off('update',this.update,this);s.scale.off('resize',this.layout,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    for(const item of this.maskedItems)item.clearMask();for(const item of this.objects)item.destroy();
    for(const mask of this.masks)mask.destroy();for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.maskedItems=[];this.maskGraphics=[];this.masks=[];
  }
}