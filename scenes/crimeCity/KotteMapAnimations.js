// Coordinates refer to the supplied Kotte image, 1920 x 1080.
const LAKE = [[1205,489],[1463,554],[1688,436],[1733,395],[1775,377],[1900,403],[1899,453],[1831,520],[1754,586],[1683,623],[1617,682],[1580,745],[1585,793],[1660,832],[1764,880],[1919,929],[1919,1080],[1653,1080],[1616,1046],[1516,1015],[1449,979],[1357,943],[1265,900],[1197,868],[1110,832],[1088,791],[1147,723],[1193,675],[1210,633],[1184,590],[1128,568],[1074,540],[1067,521]];
const WEST_WATER = [[680,409],[728,390],[856,361],[993,327],[1045,336],[996,358],[965,384],[966,405],[1118,451],[1128,460],[987,514],[932,484],[855,461],[782,446],[716,429]];
const EAST_WATER = [[1470,278],[1549,294],[1645,321],[1726,337],[1816,343],[1902,366],[1910,402],[1819,385],[1742,371],[1690,392],[1636,398],[1620,372],[1618,341],[1557,322],[1480,304]];
const AREAS=[LAKE,WEST_WATER,EAST_WATER];
const LAMPS=[[658,384],[802,431],[923,473],[1052,514],[948,623],[1171,619],[1086,692],[762,722],[528,854],[1134,846],[1194,996],[1601,1040],[260,1029]];
const BOATS=[{a:[1260,746],b:[1435,816],speed:6,offset:0,color:0x936f43},
  {a:[1777,703],b:[1668,645],speed:5,offset:12,color:0xa58659}];
const contains=(x,y,points)=>{
  let yes=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
  }
  return yes;
};
const polygon=(g,p,color,alpha)=>{
  g.fillStyle(color,alpha);g.fillPoints(p.map(([x,y])=>({x,y})),true);
};
export class KotteMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;
    this.ripples=[];
    AREAS.forEach((area,n)=>{
      const xs=area.map(p=>p[0]),ys=area.map(p=>p[1]);
      const x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
      for(let i=0;i<(n===0?330:100);i++){
        const x=x0+((i*0.61803398875+n*0.31)%1)*w;
        const y=y0+((i*0.41421356237+n*0.17)%1)*h;
        if(contains(x-10,y-4,area)&&contains(x+10,y+4,area))
          this.ripples.push({x,y,phase:i*1.71+n,len:3+i%7});
      }
    });
    scene.events.on('update',this.update,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);this.layout();this.update(0,0);
  }
  hide(){this.layers.forEach(g=>g.setVisible(false));}
  layout(){
    const b=this.background;if(this.disposed||!b?.active)return;
    const x=b.x-b.displayWidth*(b.originX??0.5),y=b.y-b.displayHeight*(b.originY??0.5);
    this.layers.forEach((g,i)=>g.setPosition(x,y).setScale(b.displayWidth/1920,b.displayHeight/1080)
      .setDepth((b.depth??-10)+0.1+i*0.1).setScrollFactor(b.scrollFactorX??1,b.scrollFactorY??1));
  }
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'kotte_crime';
    const visible=Boolean(s.cityId==='kotte'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='kotte')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawLights(t);this.drawBoats(t);this.drawBirds(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.ripples){
      const phase=t*1.1+r.phase,alpha=0.07+(Math.sin(phase)+1)*0.095;
      const x=r.x+Math.sin(phase*0.4)*2,w=r.len*(0.8+Math.sin(phase)*0.2);
      g.lineStyle(1,0xb4d3dd,alpha);g.lineBetween(x-w/2,r.y,x+w/2,r.y-0.6);
    }
  }
  drawLights(t){
    const g=this.details;
    LAMPS.forEach(([x,y],i)=>{
      const pulse=0.91+Math.sin(t*0.75+i*1.4)*0.045;
      for(let r=12;r>=3;r-=3){
        g.fillStyle(0xffce74,(0.018+(12-r)*0.002)*pulse);g.fillCircle(x,y,r);
      }
      g.fillStyle(0xffe5a2,0.42*pulse);g.fillEllipse(x,y,3,5);
    });
    // Only add reflections where every segment remains in a water polygon.
    const reflections=[[1208,650],[1095,586],[954,496],[811,453],[1145,883]];
    reflections.forEach(([x,y],i)=>{
      for(let j=0;j<7;j++){
        const yy=y+j*5,xx=x+Math.sin(t*1.2+i+j*1.1)*2,w=3+j*0.6;
        if(!AREAS.some(a=>contains(xx-w,yy,a)&&contains(xx+w,yy,a)))continue;
        this.water.lineStyle(1,0xf5cf85,(1-j/8)*(0.13+0.06*Math.sin(t+i+j)));
        this.water.lineBetween(xx-w,yy,xx+w,yy);
      }
    });
  }
  drawBoats(t){
    const g=this.details;
    for(const boat of BOATS){
      const dx=boat.b[0]-boat.a[0],dy=boat.b[1]-boat.a[1],length=Math.hypot(dx,dy);
      const duration=length/boat.speed,age=(t+boat.offset)%(duration+10);
      if(age>=duration)continue;
      const alpha=Math.max(0,Math.min(1,age/2,(duration-age)/2));
      const x=boat.a[0]+dx*age/duration,y=boat.a[1]+dy*age/duration;
      const ux=dx/length,uy=dy/length;
      const p=(u,v,z=0)=>[x+ux*u-uy*v,y+uy*u+ux*v*0.6-z];
      polygon(g,[p(-17,0),p(-11,-5),p(12,-5),p(19,0),p(12,5),p(-11,5)],0x493d31,alpha);
      polygon(g,[p(-14,0,2),p(-10,-4,2),p(11,-4,2),p(16,0,2),p(11,4,2),p(-10,4,2)],boat.color,alpha);
      polygon(g,[p(-9,-2,3),p(8,-2,3),p(8,2,3),p(-9,2,3)],0xc2ad7c,alpha);
      const head=p(-1,0,8),body=p(-1,0,3);
      g.fillStyle(0x596c68,alpha);g.fillRect(body[0]-2,body[1]-4,4,5);
      g.fillStyle(0xb68e69,alpha);g.fillCircle(head[0],head[1],1.8);
      g.lineStyle(1,0xd0e3df,alpha*0.3);
      for(const side of [-1,1]){const a=p(-19,side*3),b=p(-32,side*8);
        g.lineBetween(a[0],a[1],b[0],b[1]);}
    }
  }
  drawBirds(t){
    const g=this.sky;
    for(let i=0;i<6;i++){
      const age=(t+i*0.5)%62;if(age>44)continue;
      const x=-90+age*49-i*12,y=48+i*6+Math.sin(age*0.27+i)*4;
      const wing=Math.sin(age*5+i)*2.5;
      g.lineStyle(1,0x403f50,Math.max(0,Math.min(0.65,age/2,(44-age)/2)));
      g.lineBetween(x-4,y-wing,x,y);g.lineBetween(x,y,x+4,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,
    texture:this.background?.texture?.key,ripples:this.ripples.length,boats:2,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
