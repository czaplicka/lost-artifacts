// Overlay for the supplied New Delhi map. Reference size: 1920 x 1080.
const WATER = [
  [[978,448],[1000,448],[1003,464],[976,464]],
  [[975,506],[1005,506],[1008,547],[970,547]],
  [[617,850],[669,850],[641,913],[628,936],[654,936],[638,973],[547,973],[551,954],[576,931],[589,912]],
  [[450,951],[505,951],[499,970],[449,970]],
  [[663,954],[743,954],[736,969],[658,969]],
  [[888,952],[1098,952],[1101,970],[889,970]]
];
const EXCLUDE=[[[576,921],[598,921],[605,955],[578,966],[564,955]]];
const LAMPS=[[602,633,5],[900,634,4],[1137,631,5],[326,708,4],
  [1104,701,5],[1331,939,8]];
const WALKS=[
  {a:[745,613],b:[755,640],speed:2.5,offset:0,size:0.85,color:0x785d6c},
  {a:[1038,477],b:[1049,497],speed:1.8,offset:6,size:0.5,color:0x697b65},
  {a:[816,679],b:[826,692],speed:2.1,offset:10,size:0.85,color:0x977849}
];
const contains=(x,y,points)=>{
  let yes=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
  }
  return yes;
};
const isWater=(x,y)=>WATER.some(p=>contains(x,y,p))&&!EXCLUDE.some(p=>contains(x,y,p));
export class NewDelhiMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;this.reflections=[];
    WATER.forEach((area,n)=>{
      const xs=area.map(p=>p[0]),ys=area.map(p=>p[1]);
      const x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
      for(let i=0;i<90;i++){
        const x=x0+((i*0.61803398875+n*0.19)%1)*w;
        const y=y0+((i*0.41421356237+n*0.29)%1)*h;
        if(isWater(x-5,y-2)&&isWater(x+5,y+2))this.reflections.push({x,y,phase:i*1.73+n,w:2+i%5});
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||`${s.cityId}_crime`;
    const correctCity=s.cityId==='new_delhi'||s.cityId==='newdelhi';
    const correctTexture=b?.texture?.key===key||['new_delhi','newdelhi'].includes(b?.texture?.key);
    const visible=Boolean(correctCity&&correctTexture&&b?.active&&b.visible&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawLights(t);this.drawPeople(t);this.drawSteam(t);this.drawBirds(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const phase=t*1.25+r.phase,x=r.x+Math.sin(phase*0.4)*0.7;
      g.lineStyle(1,0xd0e6d7,0.07+(Math.sin(phase)+1)*0.1);
      g.lineBetween(x-r.w/2,r.y,x+r.w/2,r.y-0.5);
    }
    for(let i=0;i<9;i++){
      const p=(t*0.28+i*0.173)%1,x=605+(i%3)*9,y=872+Math.floor(i/3)*17;
      if(!isWater(x-7,y-3)||!isWater(x+7,y+3))continue;
      g.lineStyle(1,0xe1e9ce,(1-p)*0.2);g.strokeEllipse(x,y,12*p,4*p);
    }
  }
  drawLights(t){
    const g=this.details;
    LAMPS.forEach(([x,y,r],i)=>{
      const pulse=0.95+Math.sin(t*0.6+i)*0.035;
      for(let k=4;k>=1;k--){g.fillStyle(0xffcd78,0.014*pulse);g.fillCircle(x,y,r*k*0.6);}
      g.fillStyle(0xffe9b0,0.32*pulse);g.fillEllipse(x,y,r*0.4,r*0.7);
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
      g.fillStyle(0x4b3d2b,alpha*0.17);g.fillEllipse(x,y+1,7*s,2*s);
      g.lineStyle(1.5*s,0x4c4941,alpha);
      g.lineBetween(x-s,y-5*s,x-2*s+step*s,y);g.lineBetween(x+s,y-5*s,x+2*s-step*s,y);
      g.fillStyle(a.color,alpha);g.fillRect(x-2.5*s,y-12*s,5*s,7*s);
      g.lineStyle(s,a.color,alpha);g.lineBetween(x-2.5*s,y-10*s,x-3.5*s,y-5*s+step*s);
      g.lineBetween(x+2.5*s,y-10*s,x+3.5*s,y-5*s-step*s);
      g.fillStyle(0xb38a61,alpha);g.fillCircle(x,y-14*s,2*s);
      g.fillStyle(0x41372d,alpha);g.fillEllipse(x,y-15.3*s,4*s,1.6*s);
    }
  }
  drawSteam(t){
    const g=this.details;
    for(let i=0;i<8;i++){
      const p=(t*0.13+i/8)%1;
      const x=1662+p*10+Math.sin(p*5+i)*2,y=943-p*31;
      g.fillStyle(0xf1e4cc,Math.sin(p*Math.PI)*0.035);
      g.fillEllipse(x,y,3+p*8,5+p*8);
    }
  }
  drawBirds(t){
    const g=this.sky;
    // Additional birds, restricted to open sky on either side of the dome.
    for(let i=0;i<5;i++){
      const age=(t+i*0.6)%55;if(age>24)continue;
      const x=70+age*27-i*7,y=88+i*5+Math.sin(age*0.3+i)*3;
      const wing=Math.sin(age*5+i)*2;
      g.lineStyle(1,0x4f514a,Math.max(0,Math.min(0.55,age/2,(24-age)/2)));
      g.lineBetween(x-3,y-wing,x,y);g.lineBetween(x,y,x+3,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    pedestrians:WALKS.length,reflections:this.reflections.length,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
