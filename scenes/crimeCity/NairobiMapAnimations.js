// Nairobi overlay, coordinates in the supplied 1920 x 1080 map.
const RIVER = [
  [1915,343,5],[1860,350,5],[1815,365,5],[1810,389,6],
  [1750,410,7],[1690,431,9],[1640,455,10],[1624,480,11],
  [1644,508,10],[1680,534,9],[1723,562,10],[1765,597,12],
  [1788,627,13],[1771,658,13],[1725,686,14],[1684,713,14],
  [1644,747,12],[1610,789,13],[1609,825,14],[1630,867,14],[1641,891,10]
];
const WALKS = [
  {a:[699,896],b:[710,928],speed:2.6,offset:0,color:0x527f7d},
  {a:[850,903],b:[860,933],speed:2.5,offset:6,color:0x94744d},
  {a:[935,943],b:[918,969],speed:2.7,offset:11,color:0x87595c},
  {a:[1108,971],b:[1128,996],speed:2.8,offset:3,color:0x5e708c}
];
const segments=[];let riverLength=0;
for(let i=1;i<RIVER.length;i++){
  const a=RIVER[i-1],b=RIVER[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  segments.push({a,b,length,start:riverLength});riverLength+=length;
}
function riverPoint(distance){
  const d=((distance%riverLength)+riverLength)%riverLength;
  const s=segments.find(s=>d<=s.start+s.length)||segments[segments.length-1];
  const p=(d-s.start)/s.length,ux=(s.b[0]-s.a[0])/s.length,uy=(s.b[1]-s.a[1])/s.length;
  return {x:s.a[0]+(s.b[0]-s.a[0])*p,y:s.a[1]+(s.b[1]-s.a[1])*p,
    width:s.a[2]+(s.b[2]-s.a[2])*p,ux,uy};
}
export class NairobiMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.market,this.sky]=this.layers;
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'nairobi_crime';
    const visible=Boolean(s.cityId==='nairobi'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='nairobi')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawRiver(t);this.drawPeople(t);this.drawSteam(t);this.drawBirds(t);
  }
  drawRiver(t){
    const g=this.water;
    for(let i=0;i<85;i++){
      const distance=(i*riverLength/85+t*5)%riverLength,p=riverPoint(distance);
      const offset=Math.sin(i*2.39)*p.width*0.55;
      const x=p.x-p.uy*offset,y=p.y+p.ux*offset;
      // Keep the painted canoe unobscured.
      if(x>1593&&x<1634&&y>746&&y<783)continue;
      const phase=(Math.sin(t*1.1+i*1.79)+1)/2;
      const edge=Math.min(1,distance/25,(riverLength-distance)/25);
      const w=2+(i%4);
      g.lineStyle(1,i%7===0?0xe2cfa1:0xb5d7d7,(0.07+phase*0.17)*edge);
      g.lineBetween(x-p.uy*w,y+p.ux*w*0.5,x+p.uy*w,y-p.ux*w*0.5);
    }
  }
  drawPeople(t){
    const g=this.market;
    for(const a of WALKS){
      const dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],duration=Math.hypot(dx,dy)/a.speed;
      const cycle=duration*2+8,age=(t+a.offset)%cycle;
      if(age>=duration*2)continue;
      const reverse=age>=duration,progress=reverse?2-age/duration:age/duration;
      const x=a.a[0]+dx*progress,y=a.a[1]+dy*progress;
      const alpha=Math.max(0,Math.min(1,age/1.2,(duration*2-age)/1.2));
      const step=Math.sin(age*6.5),bob=Math.abs(step)*0.3;
      g.fillStyle(0x493d28,alpha*0.18);g.fillEllipse(x,y+1,7,2);
      g.lineStyle(1.5,0x49483c,alpha);
      g.lineBetween(x-1,y-5,x-2+step,y);g.lineBetween(x+1,y-5,x+2-step,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2.5,y-12-bob,5,7);
      g.lineStyle(1.2,a.color,alpha);g.lineBetween(x-2.5,y-10-bob,x-3.5,y-5+step);
      g.lineBetween(x+2.5,y-10-bob,x+3.5,y-5-step);
      g.fillStyle(0x916448,alpha);g.fillCircle(x,y-14-bob,2.1);
      g.fillStyle(0x38352c,alpha);g.fillEllipse(x,y-15.3-bob,4.2,1.7);
    }
  }
  drawSteam(t){
    const g=this.market;
    for(let i=0;i<9;i++){
      const p=(t*0.14+i/9)%1;
      const x=1028+Math.sin(p*5+i*0.7)*3+p*9,y=932-p*39;
      const alpha=Math.sin(p*Math.PI)*0.035;
      g.fillStyle(0xf0dfc5,alpha);g.fillEllipse(x,y,4+p*9,6+p*9);
    }
  }
  drawBirds(t){
    const g=this.sky;
    // Stay in the open sky above the central skyline and left of the title.
    for(let i=0;i<5;i++){
      const age=(t+i*0.7)%58;if(age>23)continue;
      const x=811+age*23-i*7,y=52+i*3+Math.sin(age*0.3+i)*2;
      const wing=Math.sin(age*5+i)*2;
      const alpha=Math.max(0,Math.min(0.55,age/2,(23-age)/2));
      g.lineStyle(1,0x66515a,alpha);
      g.lineBetween(x-3,y-wing,x,y);g.lineBetween(x,y,x+3,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    pedestrians:WALKS.length,riverReflections:85,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
