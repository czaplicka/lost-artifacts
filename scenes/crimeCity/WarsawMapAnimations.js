// Warsaw map overlay. Reference size: 1920 x 1080.
const WATER = [
  [[1246,274],[1488,274],[1570,303],[1620,317],[1372,321],[1322,310]],
  [[1415,364],[1540,360],[1605,363],[1650,367],[1783,389],[1880,411],
   [1918,414],[1918,471],[1876,472],[1830,480],[1785,482],
   [1780,502],[1825,528],[1872,548],[1918,560],[1918,594],
   [1853,568],[1795,540],[1733,514],[1675,481],[1600,447],[1510,413],[1455,392]]
];
const EXCLUDE = [
  [[1499,278],[1535,274],[1579,288],[1573,309],[1525,306],[1497,292]],
  [[1664,368],[1706,359],[1754,379],[1803,403],[1818,424],[1798,441],[1742,429],[1680,403]],
  [[1811,380],[1841,371],[1904,389],[1912,406],[1881,418],[1836,407]],
  [[1638,449],[1674,443],[1739,476],[1739,500],[1709,506],[1651,480]]
];
const LAMPS = [[209,962,5],[451,895,5],[473,859,5],[869,878,5],
  [1522,896,4],[849,613,3],[805,723,3],[582,554,3]];
const WALKS = [
  {a:[728,432],b:[754,445],speed:2,offset:0,size:0.55,color:0x6f7987},
  {a:[865,550],b:[879,578],speed:2.3,offset:7,size:0.65,color:0x8c6a5a},
  {a:[601,510],b:[613,533],speed:2,offset:12,size:0.6,color:0x64796d}
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
export class WarsawMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;this.reflections=[];
    for(let i=0;i<950;i++){
      const x=1245+((i*0.61803398875)%1)*672,y=274+((i*0.41421356237)%1)*321;
      if(isWater(x-8,y-3)&&isWater(x+8,y+3))this.reflections.push({x,y,phase:i*1.79,w:2+i%7});
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'warsaw_crime';
    const visible=Boolean(s.cityId==='warsaw'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='warsaw')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawLights(t);this.drawPeople(t);this.drawSmoke(t);this.drawBirds(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const phase=t*1.1+r.phase,x=r.x+Math.sin(phase*0.4);
      g.lineStyle(1,0xb5d0d8,0.04+(Math.sin(phase)+1)*0.08);
      g.lineBetween(x-r.w/2,r.y,x+r.w/2,r.y-0.5);
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
      g.fillStyle(0x45413b,alpha*0.16);g.fillEllipse(x,y+1,7*s,2*s);
      g.lineStyle(1.4*s,0x45474c,alpha);
      g.lineBetween(x-s,y-5*s,x-2*s+step*s,y);g.lineBetween(x+s,y-5*s,x+2*s-step*s,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2.5*s,y-12*s,5*s,7*s);
      g.lineStyle(s,a.color,alpha);g.lineBetween(x-2.5*s,y-10*s,x-3.5*s,y-5*s+step*s);
      g.lineBetween(x+2.5*s,y-10*s,x+3.5*s,y-5*s-step*s);
      g.fillStyle(0xc2a27e,alpha);g.fillCircle(x,y-14*s,2*s);
      g.fillStyle(0x47413c,alpha);g.fillEllipse(x,y-15.3*s,4*s,1.6*s);
    }
  }
  drawSmoke(t){
    const g=this.sky;
    for(let i=0;i<12;i++){
      const p=(t*0.075+i/12)%1;
      const x=1126+p*18+Math.sin(p*6+i)*2,y=320-p*46;
      g.fillStyle(0xc4bfb7,Math.sin(p*Math.PI)*0.025);g.fillEllipse(x,y,3+p*12,5+p*13);
    }
  }
  drawBirds(t){
    const g=this.sky;
    for(let i=0;i<6;i++){
      const age=(t+i*0.65)%58;if(age>26)continue;
      const x=780+age*21-i*7,y=76+i*4+Math.sin(age*0.3+i)*3;
      const wing=Math.sin(age*4+i)*2;
      g.lineStyle(1,0x555a61,Math.max(0,Math.min(0.5,age/2,(26-age)/2)));
      g.lineBetween(x-3,y-wing,x,y);g.lineBetween(x,y,x+3,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    reflections:this.reflections.length,pedestrians:WALKS.length,birds:6,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
