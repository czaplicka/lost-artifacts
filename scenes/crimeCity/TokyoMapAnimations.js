// Tokyo decorative overlay; coordinates match the supplied 1920 x 1080 map.
const PANELS = [
  {p:[[868,637],[899,638],[899,676],[868,674]],color:0x64c4c7},
  {p:[[907,638],[937,633],[937,674],[907,679]],color:0xe586ad},
  {p:[[813,626],[851,618],[851,665],[813,675]],color:0xf0dca7},
  {p:[[1229,788],[1285,764],[1285,807],[1229,831]],color:0xf69972},
  {p:[[1419,662],[1443,670],[1443,703],[1419,695]],color:0xf3a279},
  {p:[[957,691],[998,691],[998,712],[957,710]],color:0x808ed0}
];
const WATER = [
  [[1401,401],[1432,411],[1435,434],[1419,459],[1405,474],[1396,495],
   [1388,534],[1389,562],[1399,596],[1403,635],[1383,642],[1360,650],
   [1339,674],[1324,672],[1321,646],[1316,610],[1320,576],[1329,547],
   [1341,520],[1353,501],[1367,479],[1380,458],[1393,437]],
  [[1671,864],[1700,853],[1726,875],[1754,892],[1785,904],[1818,924],
   [1818,950],[1792,960],[1769,936],[1748,919],[1711,905],[1675,898]]
];
const EXCLUDE = [
  [[1338,551],[1357,548],[1368,579],[1367,609],[1358,625],[1342,619]],
  [[1329,489],[1377,467],[1397,476],[1394,495],[1360,525],[1330,528]],
  [[1694,848],[1720,842],[1793,871],[1810,891],[1793,913],[1742,904],[1690,877]]
];
const WALKS = [
  {a:[488,1036],b:[505,1009],speed:2.8,offset:0,color:0x737d8b,size:0.85},
  {a:[1643,632],b:[1660,648],speed:2.6,offset:7,color:0x906c68,size:0.65},
  {a:[581,1003],b:[610,1018],speed:3,offset:11,color:0x5a8078,size:0.85}
];
const inside=(x,y,p)=>{
  let yes=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [xi,yi]=p[i],[xj,yj]=p[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
  }
  return yes;
};
const isWater=(x,y)=>WATER.some(p=>inside(x,y,p))&&!EXCLUDE.some(p=>inside(x,y,p));
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const polygon=(g,p,c,a)=>{g.fillStyle(c,a);g.fillPoints(p.map(([x,y])=>({x,y})),true);};
export class TokyoMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.screens,this.details]=this.layers;this.reflections=[];
    WATER.forEach((area,n)=>{
      const xs=area.map(p=>p[0]),ys=area.map(p=>p[1]);
      const x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
      for(let i=0;i<190;i++){
        const x=x0+((i*0.61803398875+n*0.19)%1)*w;
        const y=y0+((i*0.41421356237+n*0.29)%1)*h;
        if(isWater(x-5,y-2)&&isWater(x+5,y+2))this.reflections.push({x,y,phase:i*1.79+n});
      }
    });
    scene.events.on('update',this.update,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);this.layout();this.update(0,0);
  }
  layout(){
    const b=this.background;if(this.disposed||!b?.active)return;
    const x=b.x-b.displayWidth*(b.originX??0.5),y=b.y-b.displayHeight*(b.originY??0.5);
    this.layers.forEach((g,i)=>g.setPosition(x,y).setScale(b.displayWidth/1920,b.displayHeight/1080)
      .setScrollFactor(b.scrollFactorX??1,b.scrollFactorY??1).setDepth((b.depth??-10)+0.1+i*0.1));
  }
  hide(){this.layers.forEach(g=>g.setVisible(false));}
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'tokyo_crime';
    const visible=Boolean(s.cityId==='tokyo'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='tokyo')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawScreens(t);this.drawWater(t);this.drawPeople(t);this.drawBeacon(t);
  }
  drawScreens(t){
    const g=this.screens;
    PANELS.forEach((panel,i)=>{
      const pulse=(Math.sin(t*0.45+i*1.7)+1)/2;
      polygon(g,panel.p,panel.color,0.07+pulse*0.16);
      const [tl,tr,br,bl]=panel.p;
      // Bands stay inside each projected quadrilateral, away from its frame.
      for(let j=0;j<2;j++){
        const p=(t*0.09+i*0.17+j*0.5)%1;
        const start=0.04+p*0.82,end=Math.min(0.95,start+0.08);
        polygon(g,[lerp(tl,bl,start),lerp(tr,br,start),lerp(tr,br,end),lerp(tl,bl,end)],
          0xdceff0,Math.sin(p*Math.PI)*0.12);
      }
    });
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const phase=t*1.15+r.phase,x=r.x+Math.sin(phase*0.4);
      g.lineStyle(1,0xc2dce3,0.05+(Math.sin(phase)+1)*0.09);
      g.lineBetween(x-2,r.y,x+2,r.y-0.7);
    }
  }
  drawPeople(t){
    const g=this.details;
    for(const a of WALKS){
      const duration=Math.hypot(a.b[0]-a.a[0],a.b[1]-a.a[1])/a.speed;
      const age=(t+a.offset)%(duration*2+7);if(age>=duration*2)continue;
      const p=age<duration?age/duration:2-age/duration;
      const x=a.a[0]+(a.b[0]-a.a[0])*p,y=a.a[1]+(a.b[1]-a.a[1])*p,s=a.size;
      const alpha=Math.max(0,Math.min(1,age,(duration*2-age))),step=Math.sin(age*7);
      g.fillStyle(0x303b43,alpha*0.17);g.fillEllipse(x,y+1,7*s,2*s);
      g.lineStyle(1.4*s,0x444c53,alpha);
      g.lineBetween(x-s,y-5*s,x-2*s+step*s,y);g.lineBetween(x+s,y-5*s,x+2*s-step*s,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2.5*s,y-12*s,5*s,7*s);
      g.lineStyle(s,a.color,alpha);g.lineBetween(x-2.5*s,y-10*s,x-3.5*s,y-5*s+step*s);
      g.lineBetween(x+2.5*s,y-10*s,x+3.5*s,y-5*s-step*s);
      g.fillStyle(0xc6ab8f,alpha);g.fillCircle(x,y-14*s,2*s);
      g.fillStyle(0x353b41,alpha);g.fillEllipse(x,y-15.3*s,4*s,1.6*s);
    }
  }
  drawBeacon(t){
    const g=this.details,p=t%4.5;if(p>0.9)return;
    const alpha=Math.sin(p/0.9*Math.PI)*0.65;
    g.fillStyle(0xf69e8b,alpha*0.06);g.fillCircle(968,29,4);
    g.fillStyle(0xffd0af,alpha);g.fillRect(967,28,2,2);
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    panels:PANELS.length,pedestrians:WALKS.length,reflections:this.reflections.length,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
