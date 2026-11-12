// Decorative overlay for the supplied 1920 x 1080 Islamabad map.
const WATER_AREAS = [
  [[1492,405],[1550,393],[1600,390],[1630,378],[1700,383],[1760,389],[1840,389],[1918,407],[1918,485],[1870,479],[1815,485],[1780,468],[1710,464],[1660,438],[1590,431],[1530,425]],
  [[491,990],[515,968],[555,961],[592,943],[623,946],[637,958],[627,980],[608,1000],[564,1013],[521,1018],[494,1008]],
  [[699,899],[721,887],[755,886],[786,895],[793,906],[773,918],[728,916],[705,908]],
  [[630,1052],[654,1035],[698,1028],[744,1035],[779,1034],[819,1047],[839,1067],[839,1080],[625,1080]]
];
const FOUNTAINS = [{x:744,y:955,rx:19,ry:8,h:38},{x:914,y:956,rx:23,ry:10,h:42}];
const WALKS = [
  {a:[818,922],b:[854,882],speed:3.3,offset:0,color:0x9b805d},
  {a:[887,881],b:[941,905],speed:3.7,offset:8,color:0x647968},
  {a:[1000,618],b:[1058,641],speed:4.3,offset:4,color:0x8d7863},
  {a:[1395,802],b:[1440,820],speed:4,offset:12,color:0x6c758b}
];
const poly=(g,points,color,alpha=1)=>{
  g.fillStyle(color,alpha);g.fillPoints(points.map(([x,y])=>({x,y})),true);
};
const inside=(x,y,points)=>{
  let result=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))result=!result;
  }
  return result;
};
export class IslamabadMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;
    this.reflections=[];
    WATER_AREAS.forEach((points,area)=>{
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
      for(let i=0;i<75;i++){
        const x=x0+((i*0.61803398875+area*0.19)%1)*(x1-x0);
        const y=y0+((i*0.41421356237+area*0.31)%1)*(y1-y0);
        if(inside(x-8,y-3,points)&&inside(x+8,y+3,points))
          this.reflections.push({x,y,phase:i*1.73+area,len:3+i%5});
      }
    });
    scene.events.on('update',this.update,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);
    this.layout();this.update(0,0);
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
    const s=this.scene,b=this.background;
    const configured=s.crimeCityConfig?.backgroundKey||'islamabad_crime';
    const correct=b?.texture?.key===configured||b?.texture?.key==='islamabad';
    const visible=Boolean(s.cityId==='islamabad'&&correct&&b?.active&&b.visible&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());
    const t=this.elapsed/1000;
    this.drawWater(t);this.drawFountains(t);this.drawPeople(t);this.drawBirds(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const shimmer=(Math.sin(t*1.15+r.phase)+1)/2;
      const x=r.x+Math.sin(t*0.6+r.phase)*1.5;
      g.lineStyle(1,0xc4e3e5,0.07+shimmer*0.23);
      g.lineBetween(x-r.len/2,r.y,x+r.len/2,r.y-0.6);
    }
  }
  drawFountains(t){
    const g=this.details;
    FOUNTAINS.forEach((f,index)=>{
      for(let ring=0;ring<3;ring++){
        const p=(t*0.42+ring/3+index*0.12)%1;
        g.lineStyle(1,0xc8eff0,(1-p)*0.35);
        g.strokeEllipse(f.x,f.y,f.rx*2*p,f.ry*2*p);
      }
      for(let jet=0;jet<7;jet++){
        const side=(jet-3)/3;
        const height=f.h*(0.65+0.35*(1-Math.abs(side)))*(0.93+0.07*Math.sin(t*2+jet));
        g.lineStyle(jet===3?2:1,jet%2?0xbce9f1:0xe1f7ee,0.5);
        g.beginPath();
        for(let step=0;step<=16;step++){
          const p=step/16,x=f.x+side*f.rx*0.8*p,y=f.y-4*height*p*(1-p);
          if(step===0)g.moveTo(x,y);else g.lineTo(x,y);
        }
        g.strokePath();
        const p=(t*0.7+jet*0.143)%1;
        const x=f.x+side*f.rx*0.8*p,y=f.y-4*height*p*(1-p);
        g.fillStyle(0xe8ffff,0.7);g.fillRect(Math.round(x),Math.round(y),1,2);
      }
    });
  }
  drawPeople(t){
    const g=this.details;
    for(const a of WALKS){
      const dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],duration=Math.hypot(dx,dy)/a.speed;
      const age=(t+a.offset)%(duration+5);if(age>=duration)continue;
      const p=age/duration,x=a.a[0]+dx*p,y=a.a[1]+dy*p;
      const alpha=Math.min(1,age,(duration-age));
      const step=Math.sin(age*7);
      g.fillStyle(0x253b32,alpha*0.18);g.fillEllipse(x,y+1,6,2);
      g.lineStyle(1.3,0x45483e,alpha);
      g.lineBetween(x-1,y-4,x-1.5+step,y);g.lineBetween(x+1,y-4,x+1.5-step,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2,y-10,4,6);
      g.lineStyle(1,a.color,alpha);g.lineBetween(x-2,y-8,x-3,y-4+step);
      g.lineBetween(x+2,y-8,x+3,y-4-step);
      g.fillStyle(0xb99770,alpha);g.fillCircle(x,y-12,1.8);
      g.fillStyle(0x424036,alpha);g.fillRect(x-2,y-14,4,1);
    }
  }
  drawBirds(t){
    const g=this.sky;
    for(let i=0;i<5;i++){
      const cycle=46,age=(t+i*0.65)%cycle;
      if(age>34)continue;
      const x=-70+age*64-i*12,y=28+i*7+Math.sin(age*0.4+i)*4;
      const wing=1.5+Math.sin(age*5+i)*2;
      const alpha=Math.max(0,Math.min(0.6,age/2,(34-age)/2));
      g.lineStyle(1,0x455761,alpha);
      g.lineBetween(x-4,y-wing,x,y);g.lineBetween(x,y,x+4,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    fountains:2,pedestrians:WALKS.length,reflections:this.reflections.length,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
