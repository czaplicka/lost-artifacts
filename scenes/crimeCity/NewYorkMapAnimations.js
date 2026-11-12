// New York overlay. Coordinates refer to the supplied 1920 x 1080 map.
const WATER = [
  [[0,861],[49,862],[167,845],[175,811],[285,811],[285,856],[370,855],
   [397,820],[512,845],[643,859],[825,845],[1040,833],[1100,837],
   [1234,832],[1250,808],[1397,792],[1540,775],[1680,752],[1811,732],
   [1918,704],[1918,1078],[0,1078]],
  [[1018,258],[1115,258],[1141,290],[1063,302],[1044,321],[1074,347],
   [1184,357],[1293,350],[1335,329],[1300,305],[1253,297],[1244,262],
   [1375,280],[1485,288],[1504,305],[1577,314],[1523,337],[1450,376],
   [1350,408],[1260,424],[1211,430],[1206,394],[1180,369],[1148,411],
   [1132,415],[1127,391],[1104,387],[1092,405],[1059,405],[1045,372],[1025,370]],
  [[1818,439],[1864,436],[1865,453],[1918,464],[1918,642],
   [1842,635],[1831,610],[1817,605]]
];
const EXCLUDE = [
  [[159,809],[202,800],[248,905],[241,919],[166,917]],
  [[289,917],[353,903],[558,901],[641,965],[649,1002],[596,1035],[290,1035]],
  [[1100,853],[1210,846],[1240,882],[1489,889],[1498,937],[1450,951],[1120,950],[1094,921]],
  [[1651,803],[1720,791],[1756,824],[1758,852],[1655,860]],
  [[1242,1007],[1328,1008],[1384,1036],[1363,1072],[1255,1079]],
  [[1810,899],[1861,887],[1908,1009],[1895,1039],[1812,1043]],
  [[1870,530],[1919,529],[1919,581],[1868,565]]
];
const BEACONS = [[279,16],[383,7],[654,13],[840,18]];
const inside=(x,y,p)=>{
  let yes=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [xi,yi]=p[i],[xj,yj]=p[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
  }
  return yes;
};
const isWater=(x,y)=>WATER.some(p=>inside(x,y,p))&&!EXCLUDE.some(p=>inside(x,y,p));
const polygon=(g,p,c,a)=>{g.fillStyle(c,a);g.fillPoints(p.map(([x,y])=>({x,y})),true);};
export class NewYorkMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.details,this.sky]=this.layers;this.reflections=[];
    for(let i=0;i<2200;i++){
      const x=((i*0.61803398875)%1)*1920,y=255+((i*0.41421356237)%1)*823;
      if(isWater(x-13,y-3)&&isWater(x+13,y+3))
        this.reflections.push({x,y,phase:i*1.79,w:3+i%13});
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||`${s.cityId}_crime`;
    const cityOK=['new_york_city','newyorkcity'].includes(s.cityId);
    const textureOK=b?.texture?.key===key||['new_york_city','newyorkcity'].includes(b?.texture?.key);
    const visible=Boolean(cityOK&&textureOK&&b?.active&&b.visible&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawBoat(t);this.drawLights(t);this.drawGulls(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const shimmer=(Math.sin(t*1.1+r.phase)+1)/2;
      const x=r.x+Math.sin(t*0.45+r.phase)*1.8,w=r.w*(0.75+shimmer*0.25);
      g.lineStyle(1,0xaacddd,0.04+shimmer*0.18);
      g.lineBetween(x-w/2,r.y,x+w/2,r.y-0.5);
    }
  }
  drawBoat(t){
    const duration=28,age=t%41;if(age>=duration)return;
    const alpha=Math.max(0,Math.min(1,age/2,(duration-age)/2));
    const x=700+age*10,y=905-age*0.7+Math.sin(age*2)*0.35;
    const g=this.details;
    for(let i=0;i<5;i++){
      const wx=x-22-i*8,wy=y+2+i*0.6;
      g.lineStyle(1,0xd7e7df,alpha*(1-i/5)*0.33);
      g.lineBetween(wx-4,wy-2-i,wx+3,wy-1-i);
      g.lineBetween(wx-4,wy+2+i,wx+3,wy+1+i);
    }
    polygon(g,[[x-19,y-2],[x+12,y-4],[x+23,y],[x+10,y+5],[x-18,y+4]],0x304b59,alpha);
    polygon(g,[[x-18,y-4],[x+11,y-6],[x+21,y-2],[x+9,y+2],[x-17,y+1]],0xd6d6bc,alpha);
    polygon(g,[[x-9,y-8],[x+4,y-8],[x+9,y-4],[x-10,y-3]],0xf0e5c9,alpha);
    polygon(g,[[x-7,y-7],[x+3,y-7],[x+6,y-5],[x-8,y-4]],0x597b8b,alpha);
    g.fillStyle(0xc8bb8b,alpha);g.fillRect(x+13,y-3,3,1);
  }
  drawLights(t){
    const g=this.sky;
    BEACONS.forEach(([x,y],i)=>{
      const p=(t+i*0.39)%3.7;
      const alpha=p<0.65?Math.sin(p/0.65*Math.PI)*0.75:0;
      if(!alpha)return;
      g.fillStyle(0xf18c77,alpha*0.07);g.fillCircle(x,y,5);
      g.fillStyle(0xffbc9b,alpha);g.fillRect(x-1,y-1,2,2);
    });
  }
  drawGulls(t){
    const g=this.sky;
    for(let i=0;i<6;i++){
      const age=(t+i*0.8)%63;if(age>30)continue;
      const x=990+age*16-i*7,y=77+i*6+Math.sin(age*0.27+i)*3;
      const wing=Math.sin(age*4+i)*2;
      const alpha=Math.max(0,Math.min(0.48,age/2,(30-age)/2));
      g.lineStyle(1,0xc1ced3,alpha);
      g.lineBetween(x-4,y-wing,x,y);g.lineBetween(x,y,x+4,y-wing);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    reflections:this.reflections.length,motorboats:1,gulls:6,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
