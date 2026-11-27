import { BASE_SPEED,rand,clamp,smooth } from './DriveShared.js';
import { makeCarPart,wiperAngle,pointInWiperSweep } from './DriveCarAssets.js';
export const DriveScenery={
  buildSky(){
    const {W,H,horizonY:hz,biome:B}=this;
    this._sceneryMotion={look:0,previousLook:0};
    const sky=this.add.graphics().setDepth(0);
    sky.fillGradientStyle(B.skyTop,B.skyTop,B.skyBottom,B.skyBottom,1);sky.fillRect(0,0,W,hz+4);
    const dark=B.stars||B.darkness>.15,overcast=['rain','fog'].includes(this.weather);
    if(B.stars){const size=Math.max(1,Math.round(this.U*2));for(let i=0;i<90;i++){
      sky.fillStyle(0xf2eee0,rand(.25,.8));sky.fillRect(Math.round(rand(0,W)),Math.round(rand(H*.035,hz*.82)),size,size);
    }}
    const sunX=W*.72,sunY=hz*.55;
    sky.fillStyle(B.sun,overcast? .035:dark? .06:.11);sky.fillCircle(sunX,sunY,hz*.2);
    sky.fillStyle(B.sun,overcast? .28:.9);sky.fillCircle(sunX,sunY,hz*(dark? .065:.085));
    this.clouds=[];
    if(!B.stars)for(let i=0;i<(overcast?8:5);i++){
      const cloud=this.add.image(rand(-W*.1,W*1.1),rand(hz*.12,hz*.65),'drv_cloud').setScale(rand(.8,1.6)*this.sx).setAlpha(overcast?rand(.3,.5):rand(.45,.7)).setDepth(2);
      if(overcast)cloud.setTint(0x9ba4ad);cloud.setData('wind',rand(3,8));cloud.setData('parallax',rand(.7,1.2));this.clouds.push(cloud);
    }
    if(overcast)this.add.rectangle(W/2,hz/2,W,hz,dark?0x18202e:0x6d7c88,this.weather==='rain'? .24:.16).setDepth(3);
  },
  buildWorldLayers(){
    const {W,horizonY:hz}=this;
    this.hillsFar=this.add.tileSprite(0,hz+2,W,this.hillH,this.hillKeyFar).setOrigin(0,1).setAlpha(.72).setDepth(4);
    this.hillsNear=this.add.tileSprite(0,hz+2,W,this.hillH,this.hillKeyNear).setOrigin(0,1).setDepth(5);
    this.roadGfx=this.add.graphics().setDepth(10);
  },
  buildCarWeatherMask(){
    const g=this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0xffffff,1);g.beginPath();g.moveTo(275,115);
    for(const [x,y]of [[1919,103],[1919,599],[1400,576],[905,573],[850,554],[525,552],[420,597],[360,594]])g.lineTo(x,y);
    g.closePath();g.fillPath();
    this._carMaskGraphics=g;this._carWeatherMask=g.createGeometryMask();return this._carWeatherMask;
  },
  buildWeather(){
    const {W,H,horizonY:hz,dashTop,biome:B}=this;
    this.drops=[];this.wiper=null;this.wiperLeft=null;this._rainStreaks=null;this._rainParticles=[];
    this._wiperClock=1.26;this._wiperPreviousAngle=0;
    const mask=this.buildCarWeatherMask(),masked=o=>o.setMask(mask);
    const dark=B.stars||B.darkness>.15,fog=this.weather==='fog',rain=this.weather==='rain';
    const color=dark?B.skyBottom:0xd6ddd7,a=fog? .62:dark? .09:.2;
    const haze=masked(this.add.graphics().setDepth(149));
    haze.fillGradientStyle(color,color,color,color,0,0,a,a);haze.fillRect(0,hz-H*.09,W,H*.09);
    haze.fillGradientStyle(color,color,color,color,a,a,0,0);haze.fillRect(0,hz,W,H*(fog? .23:.12));
    if(fog)masked(this.add.rectangle(W/2,dashTop/2,W,dashTop,dark?0x465061:0xcfd6da,dark? .09:.12).setDepth(150));
    if(B.darkness>0){
      masked(this.add.rectangle(W/2,dashTop/2,W,dashTop,0x000010,B.darkness).setDepth(150));
      masked(this.add.image(W/2,dashTop,'drv_light').setOrigin(.5,1).setScale(W*1.1/512,H*.5/256).setBlendMode(Phaser.BlendModes.ADD).setDepth(151));
    }
    // The supplied artwork is horizontal at rest. Keep it parked even in clear weather.
    this._wiperPivotX=1184;this._wiperPivotY=642;this._wiperLength=740;
    this.wiper=masked(makeCarPart(this,'wiper',1184,600,168).setPosition(this._wiperPivotX,this._wiperPivotY).setAngle(0));
    // Driver-side blade: same artwork and rhythm, so the left half of the glass gets cleared too.
    this._wiperLeftPivotX=470;
    this.wiperLeft=masked(makeCarPart(this,'wiper',1184,600,168).setPosition(this._wiperLeftPivotX,this._wiperPivotY).setAngle(0));
    if(!rain)return;
    masked(this.add.rectangle(W/2,dashTop/2,W,dashTop,0x101a25,dark? .12:.18).setDepth(150));
    this._rainStreaks=masked(this.add.graphics().setDepth(160));
    for(let i=0;i<45;i++)this._rainParticles.push({x:rand(W*.15,W*.98),y:rand(115,dashTop),depth:rand(.3,1),alpha:rand(.08,.22)});
    for(let i=0;i<70;i++){
      const drop=masked(this.add.image(rand(W*.18,W*.94),rand(120,dashTop-15),'drv_drop').setScale(rand(.55,1.25)*this.U).setAlpha(rand(.08,.5)).setDepth(165));
      drop.setData('targetAlpha',rand(.25,.65));drop.setData('recovery',rand(.08,.17));this.drops.push(drop);
    }
  },
  refreshDrops(){
    if(!this.wiper||!this.drops.length)return;
    const angle=this.wiper.angle,previous=this._wiperPreviousAngle??angle;
    const pivots=[this._wiperPivotX,...(this.wiperLeft?[this._wiperLeftPivotX]:[])];
    if(Math.abs(angle-previous)>.001)for(const drop of this.drops){
      if(drop.scene&&pivots.some(px=>pointInWiperSweep(drop.x,drop.y,px,this._wiperPivotY,this._wiperLength,previous,angle)))drop.setAlpha(0);
    }
    this._wiperPreviousAngle=angle;
  },
  updateScenery(dt){
    const sp=Math.max(0,this.speed/BASE_SPEED),turn=this.curveAt(this.pos+60)*sp*2.2,m=this._sceneryMotion;
    m.previousLook=m.look;m.look=smooth(m.look,this.playerX*9*this.sx,4,dt);
    const delta=m.look-m.previousLook;
    this.hillsFar.tilePositionX+=turn*dt*45+delta*.35;this.hillsNear.tilePositionX+=turn*dt*95+delta*.8;
    for(const c of this.clouds){
      c.x-=dt*(c.getData('wind')??5)*this.sx+turn*dt*25*(c.getData('parallax')??1)+delta*.2*(c.getData('parallax')??1);
      const margin=Math.max(this.W*.12,c.displayWidth);if(c.x< -margin)c.x=this.W+margin;else if(c.x>this.W+margin)c.x=-margin;
    }if(this.weather==='rain'&&this.wiper)this.updateDriveRain(dt,sp);
  },
  updateDriveRain(dt,sp){
    const {W,H,U,dashTop}=this,g=this._rainStreaks,minX=W*.15,maxX=W*.98,minY=115;
    g.clear();
    for(const p of this._rainParticles){
      p.y+=H*(.2+p.depth*.35+sp*.08)*dt;p.x-=W*(.025+sp*.015)*p.depth*dt;
      if(p.y>dashTop||p.x<minX){p.y=minY;p.x=rand(minX,maxX);}
      const length=H*(.008+p.depth*.014+sp*.004);g.lineStyle(Math.max(1,U*p.depth),0xc3d7e5,p.alpha);
      g.lineBetween(p.x,p.y,Math.max(minX,p.x-length*.3),Math.min(dashTop,p.y+length));
    }
    for(const d of this.drops)if(d.scene)d.setAlpha(Math.min(d.getData('targetAlpha'),d.alpha+d.getData('recovery')*dt));
    this._wiperClock=(this._wiperClock+dt)%2.41;const angle=wiperAngle(this._wiperClock);this.wiper.setAngle(angle);this.wiperLeft?.setAngle(angle);this.refreshDrops();
  }
};
