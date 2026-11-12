// Singapore overlay for the supplied 1920 x 1080 map.
const WATER = [
  [[1427,462],[1629,451],[1665,477],[1690,512],[1766,544],[1918,589],
   [1918,606],[1866,626],[1807,614],[1762,604],[1710,586],[1662,579],
   [1630,590],[1616,616],[1559,628],[1537,649],[1520,667],[1488,687],
   [1441,680],[1384,690],[1357,690],[1334,714],[1306,737],[1258,720],
   [1185,681],[1130,656],[1080,636],[1134,622],[1206,607],[1245,591],
   [1292,580],[1318,552],[1353,541],[1382,520],[1404,498]],
  [[1253,329],[1300,329],[1381,346],[1459,371],[1525,396],
   [1565,410],[1521,415],[1456,410],[1415,400],[1376,386],[1351,392],
   [1326,420],[1290,402],[1252,388]],
  [[832,187],[990,187],[999,209],[967,215],[911,221],[896,239],[841,237],[787,220]]
];
const LAMPS=[[1360,674],[1454,682],[1632,577],[1722,591]];
const inside=(x,y,p)=>{
  let yes=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [xi,yi]=p[i],[xj,yj]=p[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
  }
  return yes;
};
const isWater=(x,y)=>WATER.some(p=>inside(x,y,p));
const jetPoint=p=>({x:(1-p)*(1-p)*1555+2*(1-p)*p*1487+p*p*1468,
  y:(1-p)*(1-p)*578+2*(1-p)*p*586+p*p*655});
export class SingaporeMapAnimations {
  constructor(scene,background){
    this.scene=scene;this.background=background;this.disposed=false;this.elapsed=0;
    this.layers=Array.from({length:3},()=>scene.add.graphics().setVisible(false));
    [this.water,this.fountain,this.details]=this.layers;this.reflections=[];
    WATER.forEach((area,n)=>{
      const xs=area.map(p=>p[0]),ys=area.map(p=>p[1]);
      const x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
      for(let i=0;i<210;i++){
        const x=x0+((i*0.61803398875+n*0.19)%1)*w;
        const y=y0+((i*0.41421356237+n*0.29)%1)*h;
        if(isWater(x-8,y-3)&&isWater(x+8,y+3))this.reflections.push({x,y,phase:i*1.79+n,w:3+i%7});
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
    const s=this.scene,b=this.background,key=s.crimeCityConfig?.backgroundKey||'singapore_crime';
    const visible=Boolean(s.cityId==='singapore'&&b?.active&&b.visible&&
      (b.texture?.key===key||b.texture?.key==='singapore')&&
      !s._cleanupDone&&!s.isTransitioning&&!s.isVisitingApartment&&
      !s.getPlayerHudScene?.()?.isAnyPanelOpen?.()&&!s.mapUI?.selectionObjects?.length);
    this.layers.forEach(g=>g.setVisible(visible));if(!visible)return;
    this.elapsed+=Math.min(100,Math.max(0,Number(delta)||0));this.layout();
    this.layers.forEach(g=>g.clear());const t=this.elapsed/1000;
    this.drawWater(t);this.drawMerlion(t);this.drawDetails(t);
  }
  drawWater(t){
    const g=this.water;
    for(const r of this.reflections){
      const phase=t*1.2+r.phase,x=r.x+Math.sin(phase*0.35)*1.3;
      g.lineStyle(1,0xbcdadd,0.05+(Math.sin(phase)+1)*0.09);
      g.lineBetween(x-r.w/2,r.y,x+r.w/2,r.y-0.5);
    }
  }
  drawMerlion(t){
    const g=this.fountain;
    // Transparent highlights animate the painted jet without moving its source.
    for(let i=0;i<24;i++){
      const p=(t*0.62+i/24)%1,a=jetPoint(p),b=jetPoint(Math.min(1,p+0.027));
      const side=Math.sin(i*2.39)*p*2;
      g.lineStyle(1.2,0xe4f4eb,0.12+Math.sin(p*Math.PI)*0.18);
      g.lineBetween(a.x+side,a.y,b.x+side,b.y);
    }
    for(let i=0;i<12;i++){
      const p=(t*0.65+i/12)%1,side=(i%2?1:-1);
      const x=1468+side*(2+p*13),y=654-13*Math.sin(p*Math.PI)+p*5;
      g.fillStyle(0xd9efec,Math.sin(p*Math.PI)*0.45);g.fillRect(x,y,1,2);
    }
    for(let i=0;i<4;i++){
      const p=(t*0.38+i/4)%1;
      g.lineStyle(1,0xc6e4df,(1-p)*0.35);g.strokeEllipse(1468,657,8+p*34,3+p*10);
    }
  }
  drawDetails(t){
    const g=this.details;
    LAMPS.forEach(([x,y],i)=>{
      const alpha=0.03+Math.sin(t*0.6+i)*0.002;
      g.fillStyle(0xffde9b,alpha);g.fillCircle(x,y,6);
      g.fillStyle(0xffedbc,0.22);g.fillEllipse(x,y,2,3);
    });
    for(let i=0;i<10;i++){
      const p=(t*0.14+i/10)%1;
      const x=619+Math.sin(p*6+i)*2+p*7,y=744-p*33;
      g.fillStyle(0xf0e6d1,Math.sin(p*Math.PI)*0.03);g.fillEllipse(x,y,3+p*7,5+p*8);
    }
  }
  debugStatus(){return {enabled:!this.disposed,city:this.scene.cityId,texture:this.background?.texture?.key,
    reflections:this.reflections.length,merlion:true,elapsedMs:Math.round(this.elapsed)};}
  destroy(){
    if(this.disposed)return;this.disposed=true;const s=this.scene;
    s.events.off('update',this.update,this);s.events.off('sleep',this.hide,this);s.events.off('pause',this.hide,this);
    s.events.off('shutdown',this.destroy,this);s.events.off('destroy',this.destroy,this);
    s.scale.off('resize',this.layout,this);this.layers.forEach(g=>g.destroy());this.layers=[];
  }
}
