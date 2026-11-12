// Toronto map overlay. Reference coordinates: 1920 x 1080.
const WATER = [
  [[1880,663],[1918,674],[1918,1078],[1284,1078],[1346,1034],[1410,987],
   [1482,941],[1536,890],[1583,848],[1642,799],[1715,754],[1752,740],
   [1803,756],[1827,744],[1802,729],[1768,725],[1791,713],[1836,722],
   [1892,708],[1898,689],[1866,680]]
];
const EXCLUDE = [
  [[1532,879],[1570,838],[1585,827],[1591,806],[1637,811],[1660,833],
   [1719,842],[1761,861],[1795,883],[1814,926],[1838,944],[1840,975],
   [1810,998],[1738,996],[1627,964],[1573,932]],
  [[1796,687],[1849,683],[1891,694],[1880,716],[1824,719],[1798,707]]
];
const LAMPS = [[1125,838,5],[1023,908,6],[1220,1020,6],[1335,941,5],
  [1436,867,5],[1558,781,4],[1521,682,4],[246,1025,6],[875,644,4],[1129,669,4]];
const WALKS = [
  {a:[1370,933],b:[1399,909],speed:3,offset:0,color:0x697d83,size:0.85},
  {a:[1464,858],b:[1491,837],speed:2.7,offset:6,color:0x997958,size:0.8},
  {a:[1300,997],b:[1325,978],speed:2.9,offset:10,color:0x8d656d,size:0.9}
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
export class TorontoMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;this.reflections=[];
    for(let i=0;i<950;i++){
      const x=1280+((i*0.61803398875)%1)*638,y=662+((i*0.41421356237)%1)*414;
      if(isWater(x-11,y-3)&&isWater(x+11,y+3))
        this.reflections.push({x,y,phase:i*1.79,w:3+i%9,gold:i%9===0});
    }
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'toronto_crime';
    const visible=Boolean(s.cityId==='toronto'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='toronto')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawLights(t);this.drawPeople(t);this.drawSteam(t);this.drawGulls(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const phase=t*1.15+r.phase,x=r.x+Math.sin(phase*0.4)*1.5;
      const shimmer=(Math.sin(phase)+1)/2,w=r.w*(0.8+0.2*shimmer);
      g.lineStyle(1,r.gold?0xe6d19d:0xb7d7e3,0.04+shimmer*0.18);
      g.lineBetween(x-w/2,r.y,x+w/2,r.y-0.5);
    }
  }
  drawLights(t){
    const g=this.details;
    LAMPS.forEach(([x,y,r],i)=>{
      const pulse=0.96+Math.sin(t*0.6+i)*0.025;
      for(let k=4;k>=1;k--){g.fillStyle(0xffd78b,0.014*pulse);g.fillCircle(x,y,r*k*0.6);}
      g.fillStyle(0xffedbe,0.27*pulse);g.fillEllipse(x,y,r*0.45,r*0.7);
    });
  }
  drawPeople(t){
    const g=this.details;
    for(const a of WALKS){
      const duration=Math.hypot(a.b[0]-a.a[0],a.b[1]-a.a[1])/a.speed;
      const age=(t+a.offset)%(duration*2+6);if(age>=duration*2)continue;
      const p=age<duration?age/duration:2-age/duration;
      const x=a.a[0]+(a.b[0]-a.a[0])*p,y=a.a[1]+(a.b[1]-a.a[1])*p,s=a.size;
      const alpha=Math.max(0,Math.min(1,age,(duration*2-age))),step=Math.sin(age*7);
      g.fillStyle(0x3d4542,alpha*0.16);g.fillEllipse(x,y+1,7*s,2*s);
      g.lineStyle(1.4*s,0x444c53,alpha);
      g.lineBetween(x-s,y-5*s,x-2*s+step*s,y);g.lineBetween(x+s,y-5*s,x+2*s-step*s,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2.5*s,y-12*s,5*s,7*s);
      g.lineStyle(s,a.color,alpha);g.lineBetween(x-2.5*s,y-10*s,x-3.5*s,y-5*s+step*s);
      g.lineBetween(x+2.5*s,y-10*s,x+3.5*s,y-5*s-step*s);
      g.fillStyle(0xc2a27e,alpha);g.fillCircle(x,y-14*s,2*s);
      g.fillStyle(0x47413c,alpha);g.fillEllipse(x,y-15.3*s,4*s,1.6*s);
    }
  }
  drawSteam(t){
    const g=this.details;
    for(let i=0;i<10;i++){
      const p=(t*0.13+i/10)%1;
      const x=1143+Math.sin(p*6+i)*2+p*6,y=647-p*28;
      g.fillStyle(0xeee6d9,Math.sin(p*Math.PI)*0.03);g.fillEllipse(x,y,3+p*7,5+p*8);
    }
  }
  drawGulls(t){
    const g=this.sky;
    // Flight corridor stays left of the CN Tower and above the skyline.
    for(let i=0;i<5;i++){
      const age=(t+i*0.65)%58;if(age>26)continue;
      const x=520+age*21-i*7,y=80+i*5+Math.sin(age*0.3+i)*3;
      const wing=Math.sin(age*4+i)*2;
      g.lineStyle(1,0xd4dfe1,Math.max(0,Math.min(0.5,age/2,(26-age)/2)));
      g.lineBetween(x-4,y-wing,x,y);g.lineBetween(x,y,x+4,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    reflections:this.reflections.length,pedestrians:WALKS.length,gulls:5,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
