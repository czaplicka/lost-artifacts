import { dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR, OBSTACLES } from '../../config/RoadTripTowns.js';
import { Z0, ROAD_HALF, DRAW_DIST, BASE_SPEED, DRIVE, CAMERA_LIMIT, SPEED_DISPLAY, COIN_VALUE, TRACK, BALANCE,rand,pick,clamp } from './DriveShared.js';
const text=k=>dialogueText('scenes/DriveScene.js',k);
export const DriveRoad={
  // Builds the whole route up front: straights, eased bends and the odd S-bend.
  // Curvature is integrated twice (heading, then lateral offset) so the road can be
  // projected with real perspective instead of being bent row by row on screen.
  buildTrack(){
    const {step,startStraight,endStraight}=TRACK,amp=this.biome.curve??1;
    const n=Math.ceil((this.L+DRAW_DIST+400)/step)+2,end=this.L-endStraight;
    const curv=new Float64Array(n),head=new Float64Array(n),off=new Float64Array(n),bends=[];
    let z=startStraight,lastDir=0,sBend=false;
    while(z<end){
      const dir=lastDir&&(sBend||Math.random()<.6)?-lastDir:pick([-1,1]);
      const strength=rand(.4,1)*amp,enter=rand(110,200),hold=rand(140,420),exit=rand(110,200),len=enter+hold+exit;
      if(z+len>end)break;
      bends.push({z,dir,strength,len,signed:false});
      for(let i=Math.floor(z/step),last=Math.min(n-1,Math.ceil((z+len)/step));i<=last;i++){
        const t=i*step-z;let e=t<enter?t/enter:t<enter+hold?1:1-(t-enter-hold)/exit;
        e=clamp(e,0,1);curv[i]=dir*strength*e*e*(3-2*e);
      }
      lastDir=dir;sBend=Math.random()<.3;z+=len+(sBend?rand(15,50):rand(160,480));
    }
    for(let i=1;i<n;i++){head[i]=head[i-1]+curv[i-1]*step;off[i]=off[i-1]+head[i-1]*step;}
    this.track={curv,head,off,n,step};this.bends=bends;this.nextBend=0;
  },
  trackSample(arr,d){
    const t=this.track;if(!t)return 0;
    const f=clamp(d/t.step,0,t.n-1),i=Math.min(t.n-2,Math.floor(f));
    return arr[i]+(arr[i+1]-arr[i])*(f-i);
  },
  curveAt(d){return this.trackSample(this.track?.curv,d);},
  drawRoad(){
    const g=this.roadGfx,{W,H,horizonY:hz,step,rowCount:n,biome:B,span}=this;
    g.clear();g.fillStyle(B.grassA,1);g.fillRect(0,hz,W,H-hz);
    const t=this.track,p0=this.trackSample(t.off,this.pos),h0=this.trackSample(t.head,this.pos);
    for(let i=n-1;i>=0;i--){
      const y=hz+i*step,u=Math.max(.02,(i*step+step*.5)/span),z=this.pos+Z0/u;
      // The camera follows the road heading, so bends open up gradually with distance.
      const x=TRACK.bend*(this.trackSample(t.off,z)-p0-h0*(z-this.pos));
      const hw=u*W*ROAD_HALF,cx=this.vpX+(x-this.playerX)*hw,rh=step+1;
      this.rowCx[i]=cx;const detail=clamp((u-.035)/.16,0,1);
      if(u>.055&&(Math.floor(z/38)&1)){g.fillStyle(B.grassB,detail*.6);g.fillRect(0,y,W,rh);}
      const gravel=hw*.085;g.fillStyle(B.rumbleB,.45);g.fillRect(cx-hw-gravel,y,hw*2+gravel*2,rh);
      g.fillStyle(u>.055&&(Math.floor(z/18)&1)?B.roadA:B.roadB,1);g.fillRect(cx-hw,y,hw*2,rh);
      if(u>.065){g.fillStyle(0,.045*detail);for(const offset of [-.68,-.3,.3,.68])g.fillRect(cx+hw*offset-hw*.0575,y,hw*.115,rh);}
      if(u>.05){
        const ew=Math.max(1,hw*.016);g.fillStyle(B.line,.45+detail*.55);
        g.fillRect(cx-hw*.92-ew/2,y,ew,rh);g.fillRect(cx+hw*.92-ew/2,y,ew,rh);
        if(((z%28)+28)%28<12){const cw=Math.max(1,hw*.022);g.fillStyle(B.line,.5+detail*.5);g.fillRect(cx-cw/2,y,cw,rh);}
        if((Math.floor(z/14)&1)&&u>.09){const aw=Math.max(1,hw*.018);g.fillStyle(B.rumbleA,.65*detail);g.fillRect(cx-hw-aw,y,aw,rh);g.fillRect(cx+hw,y,aw,rh);}
      }
    }this.drawRoadsidePosts();
  },
  drawRoadsidePosts(){
    const {W,H,horizonY:hz,rowCount:n,step,span}=this,g=this.roadGfx;
    const first=Math.ceil((this.pos+Math.max(35,this.cullDz))/72)*72;
    const last=Math.floor(Math.min(this.pos+DRAW_DIST,this.L-100)/72)*72;
    for(let z=last;z>=first;z-=72){
      const u=Z0/(z-this.pos);if(u<.035)continue;
      const y=hz+u*span,cx=this.rowCx[clamp(Math.floor((y-hz)/step),0,n-1)],hw=u*W*ROAD_HALF;
      const a=clamp((u-.03)*(this.weather==='fog'?5:13),0,1);if(a<=.01)continue;
      const h=Math.max(2,u*H*.19),w=Math.max(1,u*W*.009);
      for(const side of [-1,1]){
        const px=cx+side*hw*1.2;if(px< -w||px>W+w)continue;
        g.fillStyle(0,a*.16);g.fillRect(px-w,y-1,w*2.8,Math.max(1,h*.06));
        g.fillStyle(0xe3dfc8,a);g.fillRect(px-w/2,y-h,w,h);
        g.fillStyle(0x252932,a);g.fillRect(px-w/2,y-h*.84,w,h*.28);
        g.fillStyle(side<0?0xf0d9a0:0xdf795c,a);g.fillRect(px-w*.3,y-h*.79,w*.6,h*.12);
      }
    }
  },
  addObject(def){
    const o={kind:'decor',x:0,z:0,s:1,r:0,vx:0,done:false,sprite:null,flip:false,def:null,...def};
    if(!o.sprite){o.sprite=this.add.image(0,0,o.key).setOrigin(.5,1).setVisible(false);o.sprite.setFlipX(Boolean(o.flip));}
    else o.sprite.setVisible(false);
    this.objects.push(o);return o;
  },
  makeBoard(message){
    const c=this.add.container(0,0),g=this.add.graphics();
    g.fillStyle(0x3b2d20);g.fillRect(-120,-70,14,70);g.fillRect(106,-70,14,70);
    g.fillStyle(0xf1e4bd);g.fillRect(-180,-230,360,165);g.lineStyle(8,0x3b2d20);g.strokeRect(-180,-230,360,165);
    const t=this.add.text(0,-148,message,{fontFamily:'PressStart2P',fontSize:'15px',color:'#2a1d12',align:'center',wordWrap:{width:330},lineSpacing:6}).setOrigin(.5);
    c.add([g,t]);return c;
  },
  makeGate(message){
    const {W,H}=this,c=this.add.container(0,0),g=this.add.graphics();
    g.fillStyle(0x2b2118);g.fillRect(-W*.52,-H*.5,W*.06,H*.5);g.fillRect(W*.46,-H*.5,W*.06,H*.5);
    g.fillStyle(0x3b2d20);g.fillRect(-W*.54,-H*.58,W*1.08,H*.14);
    g.lineStyle(5,0xd4af37);g.strokeRect(-W*.54,-H*.58,W*1.08,H*.14);
    const t=this.add.text(0,-H*.51,message,{fontFamily:'PressStart2P',fontSize:`${Math.round(H*.03)}px`,color:'#f4e7c1',align:'center',wordWrap:{width:W},lineSpacing:10}).setOrigin(.5);
    c.add([g,t]);return c;
  },
  // Events start spaced out and tighten as the trip goes on (about 4.5 s apart early, 3 s late).
  roadEventGap(){
    const ramp=clamp(this.pos/Math.max(1,this.L*.8),0,1),spacing=3.5-ramp*1.1;
    return Math.max(620,Math.max(DRIVE.maxSpeed*DRIVE.coffeeMultiplier,this.speed)*spacing*rand(.9,1.1));
  },
  spawnAhead(){
    const horizon=this.pos+DRAW_DIST,L=this.L;
    if(!this._roadWarning?.scene)this._roadWarning=this.add.text(this.W/2,this.H*.135,'',{
      fontFamily:'PressStart2P',fontSize:this.px(12),color:'#f0d7a0',backgroundColor:'#211d22',align:'center',
      lineSpacing:5*this.U,padding:{x:14*this.U,y:10*this.U},wordWrap:{width:this.W*.72}
    }).setOrigin(.5,0).setDepth(245).setVisible(false);
    while(this.nextDecorZ<horizon&&this.nextDecorZ<L-60){this.spawnDecor(this.nextDecorZ);this.nextDecorZ+=rand(55,110);}
    if(!this.startSignSpawned){this.startSignSpawned=true;this.addObject({kind:'billboard',z:160,x:-1.9,s:2.2,sprite:this.makeBoard(this.fromTown.leaving)});}
    // Chevron boards on the outside of each bend, visible well before the turn-in.
    while(this.bends&&this.nextBend<this.bends.length&&this.bends[this.nextBend].z<horizon){
      const b=this.bends[this.nextBend++],count=b.strength>.7?4:3;
      for(let i=0;i<count;i++)this.addObject({kind:'decor',key:'drv_chevron',z:b.z+40+i*60,x:-b.dir*1.32,s:1.9,flip:b.dir<0});
    }
    while(this.nextBillboardZ<horizon&&this.nextBillboardZ<L-400){
      // Local boards come up twice as often as the generic ones.
      const local=this.town.signs||[],pool=[...FLAVOUR.billboards,...local,...local];
      if(pool.length)this.addObject({kind:'billboard',z:this.nextBillboardZ,x:pick([-1,1])*rand(1.8,2.2),s:2.2,sprite:this.makeBoard(pick(pool))});
      this.nextBillboardZ+=rand(650,1000);
    }
    while(this.nextCamZ<horizon&&this.nextCamZ<L-500){
      this.addObject({kind:'cam',key:'drv_cam',z:this.nextCamZ,x:pick([-1,1])*1.55,s:2.6});this.nextCamZ+=rand(...BALANCE.camGap);
    }
    while(this.nextObstacleZ<horizon&&this.nextObstacleZ<L-450){
      const z=this.nextObstacleZ,nearCam=Math.abs(z-this.nextCamZ)<400||this.objects.some(o=>o.kind==='cam'&&Math.abs(o.z-z)<400);
      this.spawnEvent(z,nearCam);this.nextObstacleZ+=this.roadEventGap();
    }
    if(!this.gateSpawned&&L<horizon){this.gateSpawned=true;this.gate=this.addObject({kind:'gate',z:L,x:0,s:1,sprite:this.makeGate(this.town.gate)});}
  },
  spawnDecor(z){
    for(const side of [-1,1]){
      if(Math.random()<.3||!this.biome.decor.length)continue;const [key,s]=pick(this.biome.decor);
      this.addObject({kind:'decor',key,z:z+rand(-12,12),x:side*(1.45+rand(0,1.9)),s,flip:Math.random()<.5});
    }
  },
  spawnEvent(z,nearCam=false){
    this._roadEventCount++;const warmup=this._roadEventCount<=2,roll=Math.random();
    if(!nearCam&&roll<(warmup? .4:.55)){
      let pool=OBSTACLES.filter(o=>(o.biomes.includes('all')||o.biomes.includes(this.biome.id))&&(!warmup||!o.vx));
      const varied=pool.filter(o=>o.id!==this._roadLastObstacleId);if(varied.length)pool=varied;
      if(pool.length){
        // Obstacles can sit in the middle too, so cruising down the centre line is not a free pass.
        const def=pick(pool),x=pick(BALANCE.obstacleLanes);this._roadLastObstacleId=def.id;this.spawnObstacle(def,z,x);
        // Later in the trip a second, static obstacle may block another lane; a gap always remains.
        const statics=pool.filter(o=>!o.vx);
        if(!warmup&&statics.length&&this.pos>this.L*BALANCE.pairFrom&&Math.random()<BALANCE.pairChance){
          const other=BALANCE.obstacleLanes.filter(l=>Math.abs(l-x)>=.75);
          if(other.length)this.spawnObstacle(pick(statics),z+rand(0,30),pick(other));
        }
        return;
      }
    }
    if(!nearCam&&roll>=.55&&roll<.75){this.addObject({kind:'pickup',type:'coffee',key:'drv_coffee',z,x:pick([-.6,0,.6]),s:2.7,r:.34});return;}
    const lane=nearCam?0:pick([-.6,0,.6]),count=BALANCE.coinsMin+Math.floor(Math.random()*(BALANCE.coinsMax-BALANCE.coinsMin+1));
    for(let i=0;i<count;i++)this.addObject({kind:'pickup',type:'coin',key:'drv_coin',z:z+i*26,x:lane,s:2.1,r:.34});
  },
  spawnObstacle(def,z,x){
    if(!def)return null;const o=this.addObject({kind:'obstacle',key:def.key,z,x,s:def.s,r:def.r,def});
    if(def.vx>0){const side=pick([-1,1]);o.x=side*1.15;o.vx=-side*def.vx;o.sprite.setFlipX(o.vx<0);}return o;
  },
  removeObject(index){const o=this.objects[index];if(o?.sprite?.scene)o.sprite.destroy();this.objects.splice(index,1);},
  updateRoadWarning(){
    const label=this._roadWarning;if(!label?.scene)return;
    if(this.state!=='driving'||this.settlementError){label.setVisible(false);return;}
    let nearest=null,distance=Infinity;
    for(const o of this.objects){
      if(o.done||!o.sprite?.scene||!['obstacle','cam'].includes(o.kind))continue;
      const d=o.z-this.pos-this.hitDz,lead=o.kind==='cam'?650:Math.max(400,this.speed*3.2);
      if(d>0&&d<lead&&d<distance){nearest=o;distance=d;}
    }
    if(!nearest){label.setVisible(false);return;}
    if(nearest.kind==='cam'){
      label.setText(`SPEED CAMERA AHEAD\nLIMIT ${Math.floor(BASE_SPEED*CAMERA_LIMIT*SPEED_DISPLAY)} KM/H`);
      label.setColor(this.speedMul>CAMERA_LIMIT?'#f0b492':'#bdd4aa');
    }else{label.setText(nearest.vx?'CROSSING AHEAD':'OBSTACLE AHEAD');label.setColor('#f0d7a0');}
    label.setVisible(true);
  },
  updateObjects(dt){
    const {W,H,horizonY:hz,step,rowCount:n,span}=this;
    for(let k=this.objects.length-1;k>=0;k--){
      const o=this.objects[k];if(!o.sprite?.scene){this.objects.splice(k,1);continue;}
      const dz=o.z-this.pos;if(dz>DRAW_DIST+200){o.sprite.setVisible(false);continue;}
      if(o.vx&&dz<480&&!o.done&&this.state==='driving'&&!this.settlementError)o.x=clamp(o.x+o.vx*dt,-1.4,1.4);
      if(!o.done&&dz<=this.hitDz&&this.state==='driving'&&!this.settlementError){
        o.done=true;const lat=Math.abs(o.x-this.playerX);
        if(o.kind==='obstacle'&&lat<o.r&&this.invuln<=0)this.onHit(o);
        else if(o.kind==='obstacle'&&lat<o.r+.25&&this.invuln<=0)this.onNearMiss();
        else if(o.kind==='pickup'&&lat<o.r)this.onPickup(o);
        else if(o.kind==='cam')this.onCam();
      }
      if(!o.sprite?.scene){this.objects.splice(k,1);continue;}
      if(o.kind!=='gate'&&dz<this.cullDz){this.removeObject(k);continue;}
      if(o.kind==='gate'&&dz<=0){o.sprite.setVisible(false);continue;}
      const u=o.kind==='gate'?Math.min(1,Z0/dz):Z0/dz,y=hz+u*span;
      const idx=clamp(Math.floor((y-hz)/step),0,n-1),alpha=clamp((u-.02)*(this.weather==='fog'?4:12),0,1);
      o.sprite.setVisible(alpha>.02);o.sprite.setPosition(this.rowCx[idx]+o.x*u*W*ROAD_HALF,y);
      o.sprite.setDepth(20+u*100);o.sprite.setAlpha(alpha);o.sprite.setScale(o.kind==='gate'?u:u*this.sx*o.s);
    }this.updateRoadWarning();
  },
  onHit(o){
    this.stats.hits++;this.invuln=1;this.speed*=.3;this.speedMul=this.speed/BASE_SPEED;
    this.cameras.main.shake(150,.004);
    const lines=this.stats.hits===2&&FLAVOUR.dinoSecondDent?.length?FLAVOUR.dinoSecondDent:o.def?.hitLines;
    if(lines?.length)this.say(pick(lines),3200,true);
    this.radioFlash(FLAVOUR.radioFlash?.hit);
    this.floatText(text('t_38ab3e1e1401a1c43009'),'#e6ad83');this.refreshStats();
    const sprite=o.sprite;o.sprite=null;
    if(sprite?.scene)this.createTrackedTween({targets:sprite,y:sprite.y-45*this.U,
      x:sprite.x+(o.x>=this.playerX?65:-65)*this.U,angle:sprite.angle+(o.x>=this.playerX?15:-15),alpha:0,
      duration:260,onComplete:()=>{if(sprite.scene)sprite.destroy();}});
    if(this.dino?.scene){this.removeTrackedTween(this.dinoBounce);this.dino.y=this.dinoBaseY;
      this.dinoBounce=this.createTrackedTween({targets:this.dino,y:this.dinoBaseY-15*this.U,duration:110,yoyo:true});}
  },
  onPickup(o){
    const sprite=o.sprite;o.sprite=null;
    if(o.type==='coffee'){
      this.stats.coffees++;this.coffeeUntil=this.clock+2.5;this.floatText(text('t_81df05a66ddddaa6e6ed'),'#8cff9a');if(Math.random()<.6)this.say(pick(FLAVOUR.dinoCoffee),2400);
    }else{this.stats.coins+=COIN_VALUE;this.floatText(`+$${COIN_VALUE}`);if(this.stats.coins===COIN_VALUE)this.say(pick(FLAVOUR.dinoCoin),2200);}
    this.refreshStats();if(sprite?.scene)this.createTrackedTween({targets:sprite,y:sprite.y-90*this.U,scale:sprite.scale*1.6,alpha:0,duration:260,
      onComplete:()=>{if(sprite.scene)sprite.destroy();}});
  }
};
