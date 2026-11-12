// London decorative animation overlay. Map coordinates: 1920 x 1080.
const WATER = [
  [[601,851],[670,814],[779,807],[797,822],[875,810],[975,806],[1052,813],[1147,797],[1238,811],[1269,840],[1354,885],[1450,918],[1550,940],[1710,974],[1912,991],[1912,1072],[1260,1072],[1204,1024],[1153,1025],[1139,990],[1074,961],[996,929],[934,934],[900,946],[830,944],[819,924],[768,930],[742,916],[646,929],[594,907]],
  [[887,708],[950,706],[991,709],[1049,707],[1049,744],[888,744]]
];
const EXCLUDE = [
  [[1157,886],[1190,874],[1269,892],[1299,932],[1289,957],[1210,954],[1161,926]],
  [[1269,822],[1290,809],[1336,816],[1366,855],[1351,878],[1291,870]],
  [[982,936],[1003,919],[1045,923],[1073,943],[1119,952],[1151,977],[1153,1012],[1091,1015],[1017,985]],
  [[815,955],[873,934],[974,955],[1061,994],[1141,1033],[1189,1080],[972,1080],[889,1035]]
];
const LAMPS = [[262,809,8],[350,773,5],[455,758,4],[550,769,5],[577,821,10],
  [598,755,4],[781,856,15],[1328,741,4],[1362,751,5],[1439,770,6],
  [1613,794,8],[1781,810,7]];
const contains=(x,y,points)=>{
  let result=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
  }
  return result;
};
const isWater=(x,y)=>WATER.some(p=>contains(x,y,p))&&!EXCLUDE.some(p=>contains(x,y,p));
export class LondonMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.lights,this.weather]=this.layers;
    this.reflections=[];
    for(let i=0;i<1100;i++){
      const x=570+((i*0.61803398875)%1)*1340,y=700+((i*0.41421356237)%1)*370;
      if(isWater(x-13,y-3)&&isWater(x+13,y+3))
        this.reflections.push({x,y,phase:i*1.79,w:3+i%10,gold:i%7===0});
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'london_crime';
    const visible=Boolean(s.cityId==='london'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='london')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawLights(t);this.drawMist(t);this.drawRain(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const shimmer=(Math.sin(t*1.35+r.phase)+1)/2;
      const x=r.x+Math.sin(t*0.45+r.phase)*2,w=r.w*(0.7+0.3*shimmer);
      g.lineStyle(1,r.gold?0xe6ce8f:0x9ac5d7,0.045+shimmer*(r.gold?0.24:0.17));
      g.lineBetween(x-w/2,r.y,x+w/2,r.y-0.5);
    }
    // Small rain rings. Skip land and painted foreground boats.
    for(let i=0;i<36;i++){
      const x=600+((i*0.61803398875)%1)*1290,y=809+((i*0.41421356237)%1)*250;
      if(!isWater(x-9,y-4)||!isWater(x+9,y+4))continue;
      const p=(t*0.55+i*0.173)%1;
      g.lineStyle(1,0xa9cad6,(1-p)*0.16);g.strokeEllipse(x,y,16*p,4*p);
    }
  }
  drawLights(t){
    const g=this.lights;
    LAMPS.forEach(([x,y,r],i)=>{
      const pulse=0.96+Math.sin(t*0.65+i)*0.035;
      for(let k=4;k>=1;k--){
        g.fillStyle(0xffcf77,0.012*pulse);g.fillCircle(x,y,r*k*0.65);
      }
      g.fillStyle(0xffe6a4,0.28*pulse);g.fillEllipse(x,y,r*0.4,r*0.6);
    });
  }
  drawMist(t){
    // Fragmented haze restricted to the water, never a rectangle over the skyline.
    const g=this.weather;
    for(let i=0;i<80;i++){
      const x=580+((i*39+t*5)%1340),y=826+(i%6)*34+Math.sin(t*0.2+i)*3;
      if(!isWater(x-28,y-5)||!isWater(x+28,y+5))continue;
      g.fillStyle(0xb1c6ce,0.012+0.008*(0.5+0.5*Math.sin(t*0.3+i)));
      g.fillEllipse(x,y,56,10);
    }
  }
  drawRain(t){
    const g=this.weather;
    for(let i=0;i<125;i++){
      const speed=155+(i%7)*11;
      const y=((i*97.31+t*speed)%1140)-30;
      const x=((i*173.17-t*28)%1980+1980)%1980-30;
      const length=5+i%5;
      g.lineStyle(1,0xa8c1d2,0.045+(i%4)*0.012);
      g.lineBetween(x,y,x-1.8,y+length);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    reflections:this.reflections.length,rainDrops:125,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
