// Berlin map overlay. Coordinates: 1920 x 1080.
export const BERLIN_PATHS = {
  carA: [[-35,1049],[90,986],[225,919]],
  carB: [[235,947],[100,1015],[-35,1083]],
  walkA: [[62,993],[125,963],[186,933]],
  walkB: [[363,823],[395,808],[440,789]],
  walkC: [[679,856],[697,846],[716,835]],
  boat: [[828,273],[853,261],[879,250],[904,240]],
  tram: [[2000,962],[1870,897],[1730,827],[1590,757]]
};
export function makeRoute(points) {
  let length=0;const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],size=Math.hypot(dx,dy);
    if(!size)continue;
    segments.push({a,b,start:length,length:size,ux:dx/size,uy:dy/size});length+=size;
  }
  if(!segments.length)throw new Error('Berlin route needs two distinct points');
  return {segments,length};
}
export function sampleRoute(route,distance){
  const d=Math.max(0,Math.min(route.length,distance));
  const s=route.segments.find(s=>d<=s.start+s.length)||route.segments.at(-1);
  const f=Math.max(0,Math.min(1,(d-s.start)/s.length));
  return {x:s.a[0]+(s.b[0]-s.a[0])*f,y:s.a[1]+(s.b[1]-s.a[1])*f,ux:s.ux,uy:s.uy};
}
const polygon=(g,pts,color,alpha=1)=>{
  g.fillStyle(color,alpha);g.fillPoints(pts.map(([x,y])=>({x,y})),true);
};
export class BerlinMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.elapsed=0;this.disposed=false;
    this.layers=['water','traffic','tram','clouds'].map(()=>scene.add.graphics().setVisible(false));
    [this.water,this.graphics,this.tramGraphics,this.clouds]=this.layers;
    this.maskGraphics=scene.make.graphics({x:0,y:0,add:false});
    this.tramMask=this.maskGraphics.createGeometryMask();
    this.tramGraphics.setMask(this.tramMask);
    this.actors=[
      {kind:'car',path:'carA',speed:24,delay:5,offset:0,color:0x477e9d},
      {kind:'car',path:'carB',speed:22,delay:6,offset:6,color:0xb96649},
      {kind:'person',path:'walkA',speed:5,delay:3,offset:0,color:0x765842},
      {kind:'person',path:'walkA',speed:4.8,delay:4,offset:12,color:0x567768,reverse:true},
      {kind:'person',path:'walkB',speed:5.4,delay:3,offset:4,color:0x987653},
      {kind:'person',path:'walkB',speed:5,delay:4,offset:13,color:0x665f82,reverse:true},
      {kind:'person',path:'walkC',speed:4.4,delay:4,offset:0,color:0x426b80},
      {kind:'person',path:'walkC',speed:4.1,delay:4,offset:7,color:0x9d694d,reverse:true},
      {kind:'boat',path:'boat',speed:6,delay:9,offset:3,color:0xede4cb},
      {kind:'tram',path:'tram',speed:30,delay:8,offset:4,color:0xead8ac}
    ].map(a=>({...a,route:makeRoute(a.reverse?[...BERLIN_PATHS[a.path]].reverse():BERLIN_PATHS[a.path])}));
    // Short reflection lanes entirely inside exposed water; no full-map water overlay.
    this.ripples=[
      [[817,294],[889,253]], [[850,288],[928,249]],
      [[593,566],[604,618]], [[604,625],[636,660]],
      [[1108,843],[1190,862]], [[1091,944],[1162,903]],
      [[1005,1024],[1073,985]], [[1546,868],[1610,885]],
      [[1650,905],[1710,935]], [[1785,1000],[1820,1037]]
    ].map(makeRoute);
    scene.events.on('update',this.update,this);
    scene.events.on('sleep',this.hide,this);scene.events.on('pause',this.hide,this);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    scene.scale.on('resize',this.layout,this);
    this.layout();this.update(0,0);
  }
  isCorrectMap(){
    return this.scene.cityId==='berlin'&&this.background?.texture?.key===
      (this.scene.crimeCityConfig?.backgroundKey||'berlin_crime');
  }
  hide(){this.layers?.forEach(g=>g.setVisible(false));}
  layout(){
    const b=this.background;if(this.disposed||!b?.active)return;
    const sx=b.displayWidth/1920,sy=b.displayHeight/1080;
    const x=b.x-b.displayWidth*(b.originX??0.5),y=b.y-b.displayHeight*(b.originY??0.5);
    this.layers.forEach((g,i)=>g.setPosition(x,y).setScale(sx,sy)
      .setScrollFactor(b.scrollFactorX??1,b.scrollFactorY??1).setDepth((b.depth??-10)+0.1+i*0.1));
    this.maskGraphics.setPosition(x,y).setScale(sx,sy)
      .setScrollFactor(b.scrollFactorX??1,b.scrollFactorY??1);
    this.maskGraphics.clear();
    // Visible road to the right of the foreground building. Hard edge = occlusion.
    polygon(this.maskGraphics,[[1698,762],[1920,873],[1920,1010],[1698,899]],0xffffff);
  }
  update(_time,delta){
    if(this.disposed)return;
    const s=this.scene;
    const visible=Boolean(this.isCorrectMap()&&this.background?.active&&this.background.visible&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(Math.max(Number(delta)||0,0),100);
    this.layout();this.layers.forEach(g=>g.clear());
    const t=this.elapsed/1000;this.drawWater(t);this.drawClouds(t);
    const actors=[];
    for(const a of this.actors){
      const duration=a.route.length/a.speed,age=(t+a.offset)%(duration+a.delay);
      if(age>=duration)continue;
      actors.push({...a,...sampleRoute(a.route,age*a.speed),age,
        alpha:a.kind==='tram'?1:Math.max(0,Math.min(1,age/1.2,(duration-age)/1.2))});
    }
    actors.sort((a,b)=>a.y-b.y);
    for(const a of actors){
      if(a.kind==='tram')this.drawVehicle(this.tramGraphics,a,true);
      else if(a.kind==='car')this.drawVehicle(this.graphics,a,false);
      else if(a.kind==='person')this.drawPerson(this.graphics,a);
      else this.drawBoat(this.graphics,a);
    }
  }
  drawVehicle(g,a,tram){
    const L=tram?91:29,W=tram?18:14,H=tram?19:9;
    // Perpendicular axis uses the same projection as the route: no sideways drift.
    const p=(u,v,z=0)=>[a.x+a.ux*u-a.uy*v,a.y+a.uy*u+a.ux*v-z];
    const shape=(pts,c)=>polygon(g,pts,c,a.alpha);
    shape([p(-L/2,-W/2),p(L/2,-W/2),p(L/2,W/2),p(-L/2,W/2)],0x343b3e);
    shape([p(-L/2,W/2),p(L/2,W/2),p(L/2,W/2,H),p(-L/2,W/2,H)],tram?0xa54c36:a.color);
    shape([p(L/2,-W/2),p(L/2,W/2),p(L/2,W/2,H),p(L/2,-W/2,H)],tram?0xb96343:0x355a6b);
    shape([p(-L/2,-W/2,H),p(L/2,-W/2,H),p(L/2,W/2,H),p(-L/2,W/2,H)],tram?0xc8c7ad:a.color);
    if(tram){
      shape([p(-L/2+2,W/2,8),p(L/2-2,W/2,8),p(L/2-2,W/2,17),p(-L/2+2,W/2,17)],0xe5d7ac);
      for(let u=-L/2+5;u<L/2-7;u+=12)
        shape([p(u,W/2,9),p(u+8,W/2,9),p(u+8,W/2,16),p(u,W/2,16)],0x66818a);
      const roof=p(0,0,H),top=p(0,0,H+12);
      g.lineStyle(1,0x42494b,a.alpha);g.lineBetween(roof[0]-8,roof[1],top[0],top[1]);
      g.lineBetween(top[0],top[1],roof[0]+8,roof[1]);
    }else{
      shape([p(-7,-5,H),p(6,-5,H),p(6,5,H),p(-7,5,H)],0xadc8ce);
      shape([p(-6,-4,H+3),p(3,-4,H+3),p(3,4,H+3),p(-6,4,H+3)],a.color);
    }
    for(const u of [-L*0.32,L*0.32]){
      const q=p(u,W/2,0);g.fillStyle(0x283033,a.alpha);g.fillEllipse(q[0],q[1],tram?8:6,5);
    }
  }
  drawPerson(g,a){
    const step=Math.sin(a.age*8),x=a.x,y=a.y;
    g.lineStyle(2,0x384346,a.alpha);
    g.lineBetween(x-1,y-5,x-2+step*1.8,y);g.lineBetween(x+1,y-5,x+2-step*1.8,y);
    g.fillStyle(a.color,a.alpha);g.fillRect(x-2.5,y-12,5,7);
    g.lineStyle(1.5,a.color,a.alpha);g.lineBetween(x-3,y-10,x-4,y-6+step);
    g.lineBetween(x+3,y-10,x+4,y-6-step);
    g.fillStyle(0xcda77d,a.alpha);g.fillCircle(x,y-14,2.4);
    g.fillStyle(0x514638,a.alpha);g.fillEllipse(x,y-15.5,4.8,2);
  }
  drawBoat(g,a){
    const p=(u,v)=>[a.x+a.ux*u-a.uy*v,a.y+a.uy*u+a.ux*v];
    polygon(g,[p(12,0),p(6,-4),p(-10,-4),p(-12,0),p(-10,4),p(6,4)],a.color,a.alpha);
    polygon(g,[p(-6,-2),p(5,-2),p(5,2),p(-6,2)],0x587d8d,a.alpha);
    g.lineStyle(1,0xd1edf0,a.alpha*0.5);
    for(const side of [-1,1]){const q=p(-23,side*6);g.lineBetween(a.x,a.y,q[0],q[1]);}
  }
  drawWater(t){
    const g=this.water;
    this.ripples.forEach((route,i)=>{
      for(let j=0;j<4;j++){
        const phase=(t*0.075+i*0.137+j*0.25)%1;
        const p=sampleRoute(route,phase*route.length);
        const alpha=Math.sin(phase*Math.PI)*0.34;
        const w=4+Math.sin(t*1.4+i+j)*2;
        g.lineStyle(1,j%2?0xc3e8ed:0x8bc7df,alpha);
        g.lineBetween(p.x-w,p.y+1,p.x+w,p.y-1);
      }
    });
  }
  drawClouds(t){
    const g=this.clouds;
    const clouds=[{x:80,y:48,s:0.65,v:4},{x:870,y:32,s:0.5,v:2.8},{x:1570,y:63,s:0.7,v:3.5}];
    for(const c of clouds){
      const x=((c.x+t*c.v+180)%2280)-180,y=c.y,s=c.s;
      g.fillStyle(0xbddce9,0.8);g.fillEllipse(x,y+13*s,160*s,19*s);
      g.fillStyle(0xe6f4f5,0.94);
      g.fillEllipse(x-45*s,y+6*s,56*s,20*s);g.fillEllipse(x-10*s,y,66*s,34*s);
      g.fillEllipse(x+29*s,y+6*s,65*s,24*s);g.fillEllipse(x+65*s,y+10*s,44*s,13*s);
      g.fillStyle(0xf6ffff,0.85);g.fillEllipse(x-16*s,y-7*s,38*s,15*s);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    cars:2,pedestrians:6,boats:1,trams:1,clouds:3,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);
    this.tramGraphics.clearMask();this.tramMask.destroy();this.maskGraphics.destroy();
    this.layers.forEach(g=>g.destroy());this.layers=[];this.actors=[];
  }
}