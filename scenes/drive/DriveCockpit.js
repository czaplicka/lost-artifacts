import { dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED,SPEED_DISPLAY,CAMERA_LIMIT,pick,clamp,smooth } from './DriveShared.js';
import { carKey,makeCarPart } from './DriveCarAssets.js';
const text=k=>dialogueText('scenes/DriveScene.js',k);
const SEAT_DROP=85;
export const DriveCockpit={
  buildDash(){
    this._cockpitMotion={previousSpeed:0,acceleration:0,lean:0,pitch:0,needle:0,phase:0};
    this._dinoHeadKick=0;
    this.carCockpit=this.add.image(0,0,carKey('cockpit')).setOrigin(0).setDisplaySize(1920,1080).setDepth(210);
    this.gaugeGfx=this.add.graphics().setDepth(212);
    const label=(x,y,value,size,color)=>this.add.text(x,y,value,{fontFamily:'PressStart2P',fontSize:this.px(size),color,align:'center'}).setOrigin(.5).setDepth(213);
    this.buildGaugePod(label);
    this.rKm=this.add.text(1130,798,'',{fontFamily:'PressStart2P',fontSize:this.px(16),color:'#b6dca9'}).setDepth(213);
    this.rStation=this.add.text(1130,832,'',{fontFamily:'PressStart2P',fontSize:this.px(8),color:'#ddcb92',wordWrap:{width:166}}).setDepth(213);
    this.rLine=this.add.text(1130,857,'',{fontFamily:'SpecialElite',fontSize:this.px(13),color:'#a9bea0',wordWrap:{width:166}}).setDepth(213);
    this.updateStation(false);
    this.radioZone=this.add.zone(1210,852,315,208).setDepth(217).setInteractive({useHandCursor:true});
    this.radioZone.on('pointerdown',()=>{if(!this.ready||this.state!=='driving')return;this.uiHeld=true;this.updateStation(true);});
    this.dice=this.add.container(0,0).setDepth(216);
    this.diceLeft=makeCarPart(this,'diceLeft',1470,70,0);
    this.diceRight=makeCarPart(this,'diceRight',1470,72,0);
    this.dice.add([this.diceLeft,this.diceRight]);
    this.dinoBaseY=582;
    this.dino=this.add.container(1292,this.dinoBaseY).setScale(.65).setDepth(218);
    this.dinoTorso=makeCarPart(this,'dinoTorso',1292,676,0).setPosition(0,0);
    this.dinoHead=makeCarPart(this,'dinoHead',1305,529,0).setPosition(13,-147);
    this.dino.add([this.dinoTorso,this.dinoHead]);
    this.dino.setInteractive(new Phaser.Geom.Rectangle(-150,-245,300,245),Phaser.Geom.Rectangle.Contains);
    this.dino.input.cursor='pointer';
    this.dino.on('pointerdown',()=>{
      if(!this.ready||this.state!=='driving')return;
      this.uiHeld=true;this._dinoHeadKick=.22;this.say(pick(FLAVOUR.dinoClick),2400,true);
    });
    this.wheel=makeCarPart(this,'wheel',682,758,220);
    // Seat sits low and behind the wheel so the whole rim stays readable.
    this.carSeat=makeCarPart(this,'seat',627,1080,219).setY(1080+SEAT_DROP);
    const tint=(this.biome.stars||this.biome.darkness>.15)?0xb9c1ce:this.weather==='rain'?0xe0e1de:0xffffff;
    for(const p of [this.carCockpit,this.diceLeft,this.diceRight,this.dinoTorso,this.dinoHead,this.wheel,this.carSeat])p.setTint(tint);
    this.buildAutopilotButton();
  },
  // The original gauges sit behind the steering wheel, so speed and trip progress live in
  // an add-on display on the centre of the dash, in clear view next to the road.
  buildGaugePod(label){
    const x=1215,y=690,w=330,h=104,g=this.add.graphics().setDepth(212);
    g.fillStyle(0x000000,.35);g.fillRoundedRect(x-w/2+5,y-h/2+7,w,h,10);
    g.fillStyle(0x1a1b20);g.fillRoundedRect(x-w/2,y-h/2,w,h,10);g.lineStyle(3,0xb39b64);g.strokeRoundedRect(x-w/2,y-h/2,w,h,10);
    g.fillStyle(0x0f1a14);g.fillRoundedRect(x-w/2+12,y-h/2+12,186,h-24,5);g.fillRoundedRect(x+52,y-h/2+12,w/2-64,h-24,5);
    this.speedText=label(x-50,y-6,'0',30,'#efe2bb').setOrigin(1,.5);
    label(x-8,y+22,'KM/H',9,'#a79c86').setOrigin(1,.5);
    this.tripPercent=label(x+109,y-14,'0%',15,'#b7c6a0');label(x+109,y+30,'TRIP',8,'#a79c86');
    this._podBar={x:x+66,y:y+8,w:86,h:7};
  },
  buildAutopilotButton(){
    const x=1640,y=728,w=170,h=66;
    this.autoGfx=this.add.graphics().setDepth(215);this.autoGfx.fillStyle(0x24252b,.96);
    this.autoGfx.fillRoundedRect(x-w/2,y-h/2,w,h,5);this.autoGfx.lineStyle(2,0xb39b64);this.autoGfx.strokeRoundedRect(x-w/2,y-h/2,w,h,5);
    this.autoText=this.add.text(x,y,'AUTO PILOT',{fontFamily:'PressStart2P',fontSize:this.px(11),color:'#d4af37',align:'center'}).setOrigin(.5).setDepth(216);
    this.autoGfx.setAlpha(.3);this.autoText.setAlpha(.3);this.autoZone=this.add.zone(x,y,w,h).setDepth(217);
    this.time.delayedCall(2000,()=>{
      if(!this.autoZone?.scene||this._cleanupDone||!['driving','arriving'].includes(this.state))return;
      this.autoGfx.setAlpha(1);this.autoText.setAlpha(1);this.autoZone.setInteractive({useHandCursor:true});
      this.autoZone.on('pointerdown',(p,lx,ly,e)=>{e?.stopPropagation?.();if(p.button>0)return;this.autopilot();});
    });
  },
  buildHud(){
    const {W,H,U}=this;this.hudBar=this.add.graphics().setDepth(230);
    this.add.text(W*.23,H*.03,this.fromTown.short,{fontFamily:'PressStart2P',fontSize:this.px(13),color:'#f4e7c1'}).setOrigin(0,.5).setDepth(231);
    this.add.text(W*.77,H*.03,this.town.short,{fontFamily:'PressStart2P',fontSize:this.px(13),color:'#d4af37'}).setOrigin(1,.5).setDepth(231);
    this.statsText=this.add.text(W/2,H*.066,'',{fontFamily:'PressStart2P',fontSize:this.px(11),color:'#afa891'}).setOrigin(.5).setDepth(231);this.refreshStats();
    this.introText=this.add.text(W/2,H*.21,'W / UP: GAS   S / DOWN / SPACE: BRAKE\nA / D OR LEFT / RIGHT: STEER\nOR USE THE WHEEL AND PEDALS BELOW',{fontFamily:'SpecialElite',fontSize:this.px(24),color:'#f4e7c1',backgroundColor:'#1a1618',align:'center',lineSpacing:5*U,padding:{x:18*U,y:12*U},wordWrap:{width:W*.62}}).setOrigin(.5).setDepth(240);
    this.createTrackedTween({targets:this.introText,alpha:0,delay:6500,duration:800});
  },
  refreshStats(){const s=this.stats;this.statsText?.setText(`COFFEE ${s.coffees}   FINDS $${s.coins}   DENTS ${s.hits}   FINES $${s.fines}`);},
  drawHudBar(progress){
    const {W,H,U}=this,g=this.hudBar,x0=W*.4,x1=W*.6,y=H*.03,cx=x0+(x1-x0)*progress;
    g.clear();g.fillStyle(0x393335);g.fillRect(x0,y-3*U,x1-x0,6*U);g.fillStyle(0xc1a360);g.fillRect(x0,y-3*U,(x1-x0)*progress,6*U);
    g.fillStyle(0xf4e7c1);g.fillTriangle(cx,y-10*U,cx-6*U,y-2*U,cx+6*U,y-2*U);
  },
  clearDriveBubble(){
    this._bubbleTimer?.remove(false);this._bubbleTimer=null;
    const b=this.bubble;this.bubble=null;this.bubbleUntil=0;
    if(b){this.killTrackedTweensOf(b);if(b.scene)b.destroy(true);}
  },
  say(message,ms=2800,force=false){
    if(this._cleanupDone||this._destroyCleanupDone||!this.dino?.scene||(!this.ready&&!force)||this._driveHold)return;
    if(this.bubbleUntil>this.clock&&!force)return;this.clearDriveBubble();
    const {W,H,U}=this,pad=14*U;
    const t=this.add.text(0,0,message,{fontFamily:'SpecialElite',fontSize:this.px(22),color:'#2a1d12',align:'center',wordWrap:{width:W*.28}}).setOrigin(.5,1);
    const w=t.width+pad*2,h=t.height+pad*2,g=this.add.graphics();
    g.fillStyle(0xf6ecc8);g.fillRoundedRect(-w/2,-h,w,h,8*U);g.lineStyle(Math.max(1,3*U),0x3b2d20);g.strokeRoundedRect(-w/2,-h,w,h,8*U);
    g.fillStyle(0xf6ecc8);g.fillTriangle(-10*U,0,10*U,0,0,16*U);t.setPosition(0,-pad);
    const b=this.add.container(clamp(this.dino.x,w/2+10,W-w/2-10),this.dinoBaseY-172,[g,t]).setDepth(300).setAlpha(0);
    this.bubble=b;this.bubbleUntil=this.clock+ms/1000;this.createTrackedTween({targets:b,alpha:1,duration:120});
    this._bubbleTimer=this.time.delayedCall(ms,()=>{
      if(this._cleanupDone||this.bubble!==b||!b.scene)return;this._bubbleTimer=null;this.killTrackedTweensOf(b);
      this.createTrackedTween({targets:b,alpha:0,duration:250,onComplete:()=>{
        if(this.bubble!==b)return;this.bubble=null;this.bubbleUntil=0;if(b.scene)b.destroy(true);
      }});
    });
  },
  floatText(message,color='#ffd84d'){
    const t=this.add.text(this.W/2,this.dashTop-this.H*.08,message,{fontFamily:'PressStart2P',fontSize:this.px(20),color,stroke:'#000000',strokeThickness:Math.max(1,4*this.U)}).setOrigin(.5).setDepth(260);
    this.createTrackedTween({targets:t,y:t.y-70*this.U,alpha:0,duration:900,onComplete:()=>{if(t.scene)t.destroy();}});
  },
  // next: switch station (radio clicked). fadeLine: a new bulletin on the same station.
  updateStation(next,fadeLine=false){
    if(next){this.stationIndex=(this.stationIndex+1)%FLAVOUR.radio.length;if(this._banter){this._banter.radioLine=0;this._banter.flashUntil=0;this._banter.radioTimer=10;}}
    if(next||fadeLine){this.killTrackedTweensOf(this.rStation);this.killTrackedTweensOf(this.rLine);this.rStation.setAlpha(1);
      this.createTrackedTween({targets:next?[this.rStation,this.rLine]:[this.rLine],alpha:{from:.2,to:1},duration:260});}
    const s=FLAVOUR.radio[this.stationIndex];this.rStation.setText(s.name).setColor('#ddcb92');
    this.rLine.setText(this.fitRadioLine(this._banter?this.currentRadioLine():s.line));
  },
  updateDashboard(dt){
    if(!Number.isFinite(dt)||dt<=0||this._driveHold)return;
    const m=this._cockpitMotion,speed=Math.max(0,this.speed),moving=clamp(speed/(BASE_SPEED*.25),0,1),sp=clamp(speed/(BASE_SPEED*1.5),0,1),progress=clamp(this.pos/Math.max(1,this.L),0,1);
    const accel=clamp((speed-m.previousSpeed)/dt/BASE_SPEED,-1.5,.8);m.previousSpeed=speed;
    m.acceleration=smooth(m.acceleration,accel,7,dt);m.lean=smooth(m.lean,-this.steerVel*sp,6,dt);
    m.pitch=smooth(m.pitch,m.acceleration,5,dt);m.needle=smooth(m.needle,sp,10,dt);m.phase+=dt*(5+sp*15);
    const rough=clamp((Math.abs(this.playerX)-.98)/.25,0,1)*moving,v=(Math.sin(m.phase)*.6+Math.sin(m.phase*1.73)*.3)*sp;
    this.wheel.rotation=this.steerVel*1.2;this.wheel.x=682+m.lean*2;this.wheel.y=758+m.pitch*2+v*.5+Math.sin(m.phase*2.1)*rough;
    this.diceLeft.rotation=m.lean*.16+m.pitch*.07+Math.sin(this.clock*2.7)*.025*moving;
    this.diceRight.rotation=m.lean*.13+m.pitch*.06+Math.sin(this.clock*2.4+.8)*.022*moving;
    // The standing body does not bounce: translate old hit feedback into a head wobble.
    if(this.isTweenPlaying(this.dinoBounce)){this.removeTrackedTween(this.dinoBounce);this.dinoBounce=null;this._dinoHeadKick=.28;}
    this.dino.y=this.dinoBaseY;this.dino.rotation=0;this.dinoTorso.rotation=0;
    this._dinoHeadKick*=Math.exp(-dt*5);
    this.dinoHead.rotation=m.lean*.11+m.pitch*.10+Math.sin(this.clock*9)*this._dinoHeadKick+v*.012;
    const g=this.gaugeGfx;g.clear();
    const needle=(cx,cy,r,value)=>{const a=Phaser.Math.DegToRad(135+270*clamp(value,0,1));g.lineStyle(3,0xe6a279);g.lineBetween(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.fillStyle(0xcdbf9a);g.fillCircle(cx,cy,5);};
    needle(576,715,63,m.needle);needle(800,715,63,progress);this.drawHudBar(progress);
    const bar=this._podBar;if(bar){g.fillStyle(0x2c3a2e);g.fillRect(bar.x,bar.y,bar.w,bar.h);g.fillStyle(0xb7c6a0);g.fillRect(bar.x,bar.y,bar.w*progress,bar.h);}
    this.uiTick+=dt;if(this.uiTick>=.1){this.uiTick=0;this.speedText.setText(String(Math.round(speed*SPEED_DISPLAY)));
      this.speedText.setColor(this.speedMul>CAMERA_LIMIT?'#f0a27c':this.clock<this.coffeeUntil&&speed>0?'#b6e8ac':'#efe2bb');this.tripPercent.setText(`${Math.floor(progress*100)}%`);
      this.rKm.setText(`${Math.max(0,(1-progress)*this.quote.km).toFixed(1)}${text('t_7474ac0c56a5235015a8')}`);}
  }
};
