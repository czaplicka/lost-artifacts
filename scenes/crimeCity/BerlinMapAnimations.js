// Coordinates refer to the supplied Berlin map at 1920 x 1080.
// Short exposed stretches only: this is decorative traffic, not a navigation graph.
export const BERLIN_PATHS = {
  carA:[[-30,1040],[80,984],[180,934],[310,869]],
  carB:[[328,894],[210,953],[100,1008],[-30,1073]],
  walkA:[[62,993],[125,963],[186,933]],
  walkB:[[363,823],[395,808],[440,789]],
  walkC:[[679,856],[697,846],[716,835]],
  boat:[[828,273],[853,261],[879,250],[904,240]]
};

export function makeRoute(points) {
  const segments=[];let length=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],size=Math.hypot(dx,dy);
    if(size<=0)continue;
    segments.push({a,b,start:length,length:size,ux:dx/size,uy:dy/size});length+=size;
  }
  if(!segments.length)throw new Error('[Berlin traffic] Route needs two different points.');
  return {segments,length};
}
export function sampleRoute(route,distance) {
  const d=Math.max(0,Math.min(route.length,distance));
  const segment=route.segments.find(s=>d<=s.start+s.length)||route.segments[route.segments.length-1];
  const p=Math.max(0,Math.min(1,(d-segment.start)/segment.length));
  return {x:segment.a[0]+(segment.b[0]-segment.a[0])*p,
    y:segment.a[1]+(segment.b[1]-segment.a[1])*p,ux:segment.ux,uy:segment.uy};
}
const mix=(color,factor)=>{
  const channel=shift=>Math.max(0,Math.min(255,Math.round(((color>>shift)&255)*factor)));
  return (channel(16)<<16)|(channel(8)<<8)|channel(0);
};

export class BerlinMapAnimations {
  constructor(scene,background) {
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.graphics=scene.add.graphics().setVisible(false);
    this.actors=[
      {kind:'car',path:'carA',speed:33,delay:3,offset:1,color:0x376d96,size:1},
      {kind:'car',path:'carB',speed:29,delay:4,offset:6,color:0xb25f46,size:1},
      {kind:'person',path:'walkA',speed:5.4,delay:2,offset:0,color:0x765842,size:1.1},
      {kind:'person',path:'walkA',speed:5.0,delay:4,offset:14,color:0x567768,size:1.0,reverse:true},
      {kind:'person',path:'walkB',speed:5.6,delay:3,offset:4,color:0x987653,size:1.0},
      {kind:'person',path:'walkB',speed:5.1,delay:3,offset:14,color:0x665f82,size:0.95,reverse:true},
      {kind:'person',path:'walkC',speed:4.4,delay:4,offset:0,color:0x426b80,size:0.85},
      {kind:'person',path:'walkC',speed:4.1,delay:4,offset:7,color:0x9d694d,size:0.85,reverse:true},
      {kind:'boat',path:'boat',speed:6.5,delay:9,offset:3,color:0xc4b991,size:0.65}
    ].map(a=>({...a,route:makeRoute(a.reverse?[...BERLIN_PATHS[a.path]].reverse():BERLIN_PATHS[a.path])}));
    scene.events.on('update',this.update,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);
    this.layout();this.update(0,0);
  }
  isCorrectMap() {
    const configured=this.scene.crimeCityConfig?.backgroundKey||'berlin_crime';
    return this.scene.cityId==='berlin'&&this.background?.texture?.key===configured;
  }
  hide(){this.graphics?.setVisible(false);}
  layout(){
    const bg=this.background;if(this.disposed||!bg?.active)return;
    const w=bg.displayWidth,h=bg.displayHeight,x=bg.x-w*(bg.originX??0.5),y=bg.y-h*(bg.originY??0.5);
    this.graphics.setPosition(x,y).setScale(w/1920,h/1080)
      .setScrollFactor(bg.scrollFactorX??1,bg.scrollFactorY??1).setDepth((bg.depth??-10)+1);
  }
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene;
    const panelOpen=s.getPlayerHudScene?.()?.isAnyPanelOpen?.()===true;
    const visible=Boolean(this.isCorrectMap()&&this.background?.active&&this.background.visible&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&!panelOpen&&
      !(s.mapUI?.selectionObjects?.length));
    this.graphics.setVisible(visible);if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);this.layout();
    const t=this.elapsed/1000,g=this.graphics;g.clear();
    this.drawWater(g,t);
    const visibleActors=[];
    for(const a of this.actors){
      const duration=a.route.length/a.speed,cycle=duration+a.delay;
      const age=(t+a.offset)%cycle;
      if(age>=duration)continue;
      const point=sampleRoute(a.route,age*a.speed);
      // Fade only near endpoints, never teleport a fully visible object.
      const fade=Math.min(1,age/0.8,(duration-age)/0.8);
      visibleActors.push({...a,...point,alpha:Math.max(0,fade),age});
    }
    visibleActors.sort((a,b)=>a.y-b.y);
    for(const a of visibleActors){
      if(a.kind==='car')this.drawCar(g,a);
      else if(a.kind==='person')this.drawPerson(g,a);
      else this.drawBoat(g,a);
    }
  }
  polygon(g,points,color,alpha,outline=true){
    g.fillStyle(color,alpha);g.fillPoints(points,true);
    if(outline){g.lineStyle(1,0x293437,alpha*0.9);g.strokePoints(points,true);}
  }
  drawCar(g,a){
    const size=a.size,L=35*size,W=16*size,Z=6*size;
    const point=(u,v,z=0)=>({x:a.x+a.ux*u-a.uy*v,y:a.y+a.uy*u+a.ux*v*0.58-z});
    const body=[point(-L/2,-W/2),point(L/2,-W/2),point(L/2,W/2),point(-L/2,W/2)];
    g.fillStyle(0x233135,a.alpha*0.20);g.fillEllipse(a.x,a.y+3,L+5,10);
    for(const end of [-1,1])for(const side of [-1,1]){
      const p=point(end*L*0.30,side*W*0.44,-1);g.fillStyle(0x263234,a.alpha);g.fillEllipse(p.x,p.y,6,5);
    }
    const top=body.map(p=>({x:p.x,y:p.y-Z}));
    for(let i=0;i<4;i++){
      const j=(i+1)%4;
      this.polygon(g,[body[i],body[j],top[j],top[i]],mix(a.color,0.76),a.alpha);
    }
    this.polygon(g,top,a.color,a.alpha);
    const cabin=[point(-8,-5,Z+5),point(6,-5,Z+5),point(8,5,Z+5),point(-9,5,Z+5)];
    this.polygon(g,cabin,mix(a.color,1.18),a.alpha);
    this.polygon(g,[point(6,-5,Z+5),point(11,-5,Z),point(11,5,Z),point(8,5,Z+5)],0x9bb7bf,a.alpha);
    const light=point(L/2,3,Z*0.5);g.fillStyle(0xe9db9e,a.alpha*0.9);g.fillRect(light.x-1,light.y-1,2,2);
  }
  drawPerson(g,a){
    const s=a.size,step=Math.sin(a.age*8),x=a.x,y=a.y;
    g.fillStyle(0x253132,a.alpha*0.20);g.fillEllipse(x,y+1,8*s,3*s);
    const hipY=y-5*s;
    g.lineStyle(2*s,0x384346,a.alpha);
    g.lineBetween(x-1.5*s,hipY,x-2*s+step*1.8*s,y);
    g.lineBetween(x+1.5*s,hipY,x+2*s-step*1.8*s,y);
    const bob=Math.abs(step)*0.5*s;
    g.fillStyle(a.color,a.alpha);g.fillRect(x-2.5*s,y-12*s-bob,5*s,7*s);
    g.lineStyle(1.6*s,mix(a.color,0.8),a.alpha);
    g.lineBetween(x-2.5*s,y-11*s-bob,x-4*s,y-6*s+step*s);
    g.lineBetween(x+2.5*s,y-11*s-bob,x+4*s,y-6*s-step*s);
    g.fillStyle(0xcda77d,a.alpha);g.fillCircle(x,y-14*s-bob,2.4*s);
    g.fillStyle(0x514638,a.alpha);g.fillEllipse(x,y-15.5*s-bob,4.8*s,2*s);
  }
  drawBoat(g,a){
    const s=a.size;
    const p=(u,v)=>({x:a.x+a.ux*u*s-a.uy*v*s,y:a.y+a.uy*u*s+a.ux*v*s*0.55});
    const wakeA=p(-24,-7),wakeB=p(-24,7);
    g.lineStyle(1,0xc7e3e5,a.alpha*0.6);g.lineBetween(a.x,a.y,wakeA.x,wakeA.y);g.lineBetween(a.x,a.y,wakeB.x,wakeB.y);
    this.polygon(g,[p(19,0),p(10,-7),p(-15,-7),p(-19,0),p(-15,7),p(10,7)],0xebe3c8,a.alpha);
    this.polygon(g,[p(-10,-4),p(7,-4),p(10,0),p(7,4),p(-10,4)],0x567b8d,a.alpha);
  }
  drawWater(g,t){
    for(let i=0;i<9;i++){
      const phase=(t*0.18+i*0.11)%1;
      const p=sampleRoute(this.actors[8].route,phase*this.actors[8].route.length);
      const offset=(i%3-1)*5;
      const x=p.x-p.uy*offset,y=p.y+p.ux*offset;
      g.lineStyle(1,0xa5d3df,Math.sin(phase*Math.PI)*0.22);
      g.lineBetween(x-3,y+1,x+3,y-1);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    cars:2,pedestrians:6,boats:1,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;
    const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);s.scale.off('resize',this.layout,this);
    this.graphics?.destroy();this.graphics=null;this.actors=[];
  }
}
