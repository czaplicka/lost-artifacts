import { BASE_SPEED,rand,clamp,smooth } from './DriveShared.js';
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
      const cloud=this.add.image(rand(-W*.1,W*1.1),rand(hz*.12,hz*.65),'drv_cloud')
        .setScale(rand(.8,1.6)*this.sx).setAlpha(overcast?rand(.3,.5):rand(.45,.7)).setDepth(2);
      if(overcast)cloud.setTint(0x9ba4ad);
      cloud.setData('wind',rand(3,8));cloud.setData('parallax',rand(.7,1.2));this.clouds.push(cloud);
    }
    if(overcast)this.add.rectangle(W/2,hz/2,W,hz,dark?0x18202e:0x6d7c88,this.weather==='rain'? .24:.16).setDepth(3);
  },
  buildWorldLayers(){
    const {W,horizonY:hz}=this;
    this.hillsFar=this.add.tileSprite(0,hz+2,W,this.hillH,this.hillKeyFar).setOrigin(0,1).setAlpha(.72).setDepth(4);
    this.hillsNear=this.add.tileSprite(0,hz+2,W,this.hillH,this.hillKeyNear).setOrigin(0,1).setDepth(5);
    this.roadGfx=this.add.graphics().setDepth(10);
  },
  buildWeather(){
    const {W,H,horizonY:hz,dashTop,biome:B}=this;
    this.drops=[];this.wiper=null;this._rainStreaks=null;this._rainParticles=[];
    this._wiperClock=0;this._wiperPreviousAngle=-78;
    const dark=B.stars||B.darkness>.15,fog=this.weather==='fog',rain=this.weather==='rain';
    const color=dark?B.skyBottom:0xd6ddd7,a=fog? .62:dark? .09:.2;
    const haze=this.add.graphics().setDepth(149);
    haze.fillGradientStyle(color,color,color,color,0,0,a,a);haze.fillRect(0,hz-H*.09,W,H*.09);
    haze.fillGradientStyle(color,color,color,color,a,a,0,0);haze.fillRect(0,hz,W,H*(fog? .23:.12));
    if(fog)this.add.rectangle(W/2,dashTop/2,W,dashTop,dark?0x465061:0xcfd6da,dark? .09:.12).setDepth(150);
    if(B.darkness>0){
      this.add.rectangle(W/2,dashTop/2,W,dashTop,0x000010,B.darkness).setDepth(150);
      this.add.image(W/2,dashTop,'drv_light').setOrigin(.5,1).setScale(W*1.1/512,H*.5/256)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(151);
    }
    if(!rain)return;
    this.add.rectangle(W/2,dashTop/2,W,dashTop,0x101a25,dark? .12:.18).setDepth(150);
    this._rainStreaks=this.add.graphics().setDepth(160);
    for(let i=0;i<45;i++)this._rainParticles.push({x:rand(W*.04,W*.96),y:rand(H*.09,dashTop),depth:rand(.3,1),alpha:rand(.08,.22)});
    for(let i=0;i<70;i++){
      const drop=this.add.image(rand(W*.08,W*.92),rand(H*.1,dashTop-H*.015),'drv_drop')
        .setScale(rand(.55,1.25)*this.U).setAlpha(rand(.08,.5)).setDepth(165);
      drop.setData('targetAlpha',rand(.25,.65));drop.setData('recovery',rand(.08,.17));this.drops.push(drop);
    }
    this._wiperPivotX=W*.52;this._wiperPivotY=dashTop-H*.005;this._wiperLength=H*.36;
    this.wiper=this.add.rectangle(this._wiperPivotX,this._wiperPivotY,Math.max(2,7*this.U),this._wiperLength,0x08090b)
      .setOrigin(.5,1).setAngle(-78).setDepth(168);
  },
  refreshDrops(){
    if(!this.wiper||!this.drops.length)return;
    const angle=this.wiper.angle,previous=this._wiperPreviousAngle??angle;
    for(const drop of this.drops){
      if(!drop.scene)continue;
      const dx=drop.x-this._wiperPivotX,dy=drop.y-this._wiperPivotY,a=Math.atan2(dx,-dy)*180/Math.PI;
      if(Math.hypot(dx,dy)<=this._wiperLength&&a>=Math.min(previous,angle)-4&&a<=Math.max(previous,angle)+4)drop.setAlpha(0);
    }this._wiperPreviousAngle=angle;
  },
  updateScenery(dt){
    const sp=Math.max(0,this.speed/BASE_SPEED),turn=this.curveAt(this.pos+250)*sp,m=this._sceneryMotion;
    m.previousLook=m.look;m.look=smooth(m.look,this.playerX*9*this.sx,4,dt);
    const delta=m.look-m.previousLook;
    this.hillsFar.tilePositionX+=turn*dt*45+delta*.35;this.hillsNear.tilePositionX+=turn*dt*95+delta*.8;
    for(const c of this.clouds){
      c.x-=dt*(c.getData('wind')??5)*this.sx+turn*dt*25*(c.getData('parallax')??1)+delta*.2*(c.getData('parallax')??1);
      const margin=Math.max(this.W*.12,c.displayWidth);
      if(c.x< -margin)c.x=this.W+margin;else if(c.x>this.W+margin)c.x=-margin;
    }if(this.weather==='rain'&&this.wiper)this.updateDriveRain(dt,sp);
  },
  updateDriveRain(dt,sp){
    const {W,H,U,dashTop}=this,g=this._rainStreaks,minX=W*.04,maxX=W*.96,minY=H*.09;
    g.clear();
    for(const p of this._rainParticles){
      p.y+=H*(.2+p.depth*.35+sp*.08)*dt;p.x-=W*(.025+sp*.015)*p.depth*dt;
      if(p.y>dashTop||p.x<minX){p.y=minY;p.x=rand(minX,maxX);}
      const length=H*(.008+p.depth*.014+sp*.004);
      g.lineStyle(Math.max(1,U*p.depth),0xc3d7e5,p.alpha);
      g.lineBetween(p.x,p.y,Math.max(minX,p.x-length*.3),Math.min(dashTop,p.y+length));
    }
    for(const d of this.drops)if(d.scene)d.setAlpha(Math.min(d.getData('targetAlpha'),d.alpha+d.getData('recovery')*dt));
    const outward=.68,back=.58,pause=1.15;
    this._wiperClock=(this._wiperClock+dt)%(outward+back+pause);
    let a=-78;if(this._wiperClock<outward)a=-78+(1-Math.cos(this._wiperClock/outward*Math.PI))*.5*96;
    else if(this._wiperClock<outward+back)a=18-(1-Math.cos((this._wiperClock-outward)/back*Math.PI))*.5*96;
    this.wiper.setAngle(a);this.refreshDrops();
  }
};
