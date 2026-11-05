export const WARSAW_PATHS = {
  inn:[[528,980],[573,987],[628,993]],
  frontage:[[858,971],[889,977],[922,983]],
  square:[[702,439],[739,448],[777,457]],
  alley:[[848,686],[857,659],[864,632]],
  boat:[[1512,377],[1560,393],[1610,412]]
};
function route(points){
  let length=0;const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],size=Math.hypot(dx,dy);
    if(size<=0)continue;
    segments.push({a,b,start:length,length:size,ux:dx/size,uy:dy/size});length+=size;
  }
  if(!length)throw new Error('[WarsawAnimations] Invalid route.');
  return{length,segments};
}
function pointAt(r,distance){
  const d=Math.max(0,Math.min(r.length,distance));
  const s=r.segments.find(s=>d<=s.start+s.length)||r.segments[r.segments.length-1];
  const p=(d-s.start)/s.length;
  return{x:s.a[0]+(s.b[0]-s.a[0])*p,y:s.a[1]+(s.b[1]-s.a[1])*p,ux:s.ux,uy:s.uy};
}
const LAMPS=[[210,961],[449,896],[475,861],[805,720],[870,878],[1525,894]];
export class WarsawPanoramaAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.sourceKey=background.texture.key;
    this.graphics=scene.add.graphics().setVisible(false);
    const people=[
      ['inn',0,5.8,0x6b5962,0.9,false],['inn',13,5.3,0x7b7556,0.9,true],
      ['frontage',1,5.1,0x587075,0.9,false],['frontage',8,5.4,0x8c6455,0.85,true],
      ['square',0,4.3,0x5d6759,0.60,false],['square',12,4.1,0x7d6060,0.6,true],
      ['alley',1,4.7,0x525f73,0.72,false],['alley',9,4.2,0x85765e,0.7,true]
    ];
    this.actors=people.map(([path,offset,speed,color,size,reverse])=>({
      kind:'person',offset,speed,color,size,delay:3,
      route:route(reverse?[...WARSAW_PATHS[path]].reverse():WARSAW_PATHS[path])
    }));
    this.boatRoute=route(WARSAW_PATHS.boat);
    this.actors.push({kind:'boat',offset:2,speed:5.5,color:0xe0d3af,size:0.65,delay:8,route:this.boatRoute});
    scene.events.on('update',this.update,this);
    scene.events.on('pause',this.hide,this);scene.events.on('sleep',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);
    this.layout();this.update(0,0);
  }
  hide(){this.graphics?.setVisible(false);}
  layout(){
    const b=this.background;if(this.disposed||!b?.active)return;
    const w=b.displayWidth,h=b.displayHeight;
    this.graphics.setPosition(b.x-w*(b.originX??.5),b.y-h*(b.originY??.5))
      .setScale(w/1920,h/1080).setScrollFactor(b.scrollFactorX??1,b.scrollFactorY??1)
      .setDepth((b.depth??-10)+1);
  }
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene,panel=s.getPlayerHudScene?.()?.isAnyPanelOpen?.()===true;
    const visible=Boolean(s.cityId==='warsaw'&&this.background?.active&&this.background.visible&&
      this.background.texture.key===this.sourceKey&&!s._cleanupDone&&!s.isTransitioning&&
      !s.activePopup&&!s.cityDebug?.enabled&&!panel&&s.uiReady!==false);
    this.graphics.setVisible(visible);if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);this.layout();
    const t=this.elapsed/1000,g=this.graphics;g.clear();
    this.drawWater(g,t);this.drawLamps(g,t);this.drawBirds(g,t);
    const live=[];
    for(const a of this.actors){
      const duration=a.route.length/a.speed,age=(t+a.offset)%(duration+a.delay);
      if(age>=duration)continue;
      const alpha=Math.max(0,Math.min(1,age/1,(duration-age)/1));
      live.push({...a,...pointAt(a.route,age*a.speed),age,alpha});
    }
    live.sort((a,b)=>a.y-b.y);
    for(const a of live){if(a.kind==='person')this.drawPerson(g,a);else this.drawBoat(g,a);}
  }
  drawPerson(g,a){
    const s=a.size,step=Math.sin(a.age*7.5),x=a.x,y=a.y,bob=Math.abs(step)*.4*s;
    g.fillStyle(0x353a34,a.alpha*.17);g.fillEllipse(x,y+1,6*s,2.4*s);
    g.lineStyle(1.5*s,0x41433e,a.alpha);
    g.lineBetween(x-s,y-4*s,x-1.5*s+step*1.2*s,y);
    g.lineBetween(x+s,y-4*s,x+1.5*s-step*1.2*s,y);
    g.fillStyle(a.color,a.alpha);g.fillRect(x-2*s,y-10*s-bob,4*s,6*s);
    g.lineStyle(1.2*s,a.color,a.alpha);
    g.lineBetween(x-2*s,y-9*s-bob,x-3*s,y-5*s+step*s);
    g.lineBetween(x+2*s,y-9*s-bob,x+3*s,y-5*s-step*s);
    g.fillStyle(0xc2a483,a.alpha);g.fillCircle(x,y-12*s-bob,1.9*s);
    g.fillStyle(0x5d5244,a.alpha);g.fillEllipse(x,y-13.1*s-bob,3.8*s,1.6*s);
  }
  polygon(g,points,color,alpha){
    g.fillStyle(color,alpha);g.fillPoints(points,true);g.lineStyle(.7,0x3b4748,alpha*.8);g.strokePoints(points,true);
  }
  drawBoat(g,a){
    const p=(u,v)=>({x:a.x+a.ux*u*a.size-a.uy*v*a.size,y:a.y+a.uy*u*a.size+a.ux*v*a.size*.55});
    const left=p(-24,-7),right=p(-24,7);
    g.lineStyle(1,0xc3d6d9,a.alpha*.6);g.lineBetween(a.x,a.y,left.x,left.y);g.lineBetween(a.x,a.y,right.x,right.y);
    this.polygon(g,[p(17,0),p(9,-6),p(-15,-6),p(-18,0),p(-15,6),p(9,6)],a.color,a.alpha);
    this.polygon(g,[p(-9,-3.5),p(5,-3.5),p(8,0),p(5,3.5),p(-9,3.5)],0x607e8d,a.alpha);
  }
  drawWater(g,t){
    for(let i=0;i<12;i++){
      const phase=(t*.12+i/12)%1,p=pointAt(this.boatRoute,phase*this.boatRoute.length),v=(i%3-1)*7;
      const x=p.x-p.uy*v,y=p.y+p.ux*v;
      g.lineStyle(1,0xc0d2d5,Math.sin(phase*Math.PI)*.23);g.lineBetween(x-4,y+1,x+4,y-1);
    }
  }
  drawLamps(g,t){
    for(let i=0;i<LAMPS.length;i++){
      const[x,y]=LAMPS[i],p=(Math.sin(t*.65+i*1.7)+1)/2;
      g.fillStyle(0xffd990,.025+p*.035);g.fillCircle(x,y,7);
      g.fillStyle(0xffe3ac,.04+p*.06);g.fillCircle(x,y,2);
    }
  }
  drawBirds(g,t){
    const flight=t%28;if(flight<1||flight>9)return;
    const p=(flight-1)/8;
    for(let i=0;i<2;i++){
      const x=30+p*310-i*23,y=109-Math.sin(p*Math.PI)*13+i*8,wing=Math.sin(t*8+i)*2;
      g.lineStyle(1,0x52616b,.52);g.beginPath();g.moveTo(x-4,y-wing);g.lineTo(x,y);g.lineTo(x+4,y-wing);g.strokePath();
    }
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('pause',this.hide,this);s.events.off('sleep',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);s.scale.off('resize',this.layout,this);
    this.graphics?.destroy();this.graphics=null;this.actors=[];
  }
}
