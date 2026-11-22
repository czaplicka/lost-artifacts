import { dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED,SPEED_DISPLAY,pick,clamp,poly,smooth } from './DriveShared.js';
const text=k=>dialogueText('scenes/DriveScene.js',k);
export const DriveCockpit={
  buildDash(){
    const {W,H,U,dashTop:top}=this;
    this._cockpitMotion={previousSpeed:0,acceleration:0,lean:0,pitch:0,needle:0,phase:0};
    const key=`drv_dash_pack1_${Math.round(W)}x${Math.round(H)}`;
    this.gen(key,Math.round(W),Math.round(H),g=>{
      g.fillStyle(0x101015);g.fillRect(0,0,W,H*.085);g.fillStyle(0x353039);g.fillRect(0,H*.085,W,H*.006);
      g.fillStyle(0x111116);poly(g,[[0,0],[W*.19,0],[W*.075,top+H*.01],[0,top+H*.06]]);
      poly(g,[[W,0],[W*.86,0],[W*.95,top],[W,top+H*.05]]);
      g.lineStyle(Math.max(1,3*U),0x4b4140);g.lineBetween(W*.19,0,W*.075,top+H*.01);g.lineBetween(W*.86,0,W*.95,top);
      g.fillStyle(0xffffff,.025);poly(g,[[W*.27,H*.09],[W*.43,H*.09],[W*.31,top],[W*.15,top]]);
      g.fillStyle(0x141217);g.fillRect(W*.665,H*.085,W*.02,H*.03);g.fillRoundedRect(W*.56,H*.105,W*.22,H*.075,10*U);
      g.fillStyle(0x273139);g.fillRoundedRect(W*.568,H*.113,W*.204,H*.059,6*U);
      g.fillStyle(0xffffff,.045);g.fillRect(W*.58,H*.12,W*.18,H*.012);
      g.fillStyle(0x241e20);poly(g,[[0,top+H*.06],[W*.075,top+H*.01],[W*.35,top-H*.005],
        [W*.65,top-H*.012],[W*.95,top],[W,top+H*.05],[W,H],[0,H]]);
      g.fillStyle(0x17151a);g.fillRect(0,H*.84,W,H*.16);
      g.lineStyle(Math.max(1,3*U),0x695046);g.lineBetween(W*.075,top+H*.01,W*.35,top-H*.005);
      g.lineBetween(W*.35,top-H*.005,W*.65,top-H*.012);g.lineBetween(W*.65,top-H*.012,W*.95,top);
      g.fillStyle(0x090c10);g.fillRoundedRect(W*.265,top+H*.005,W*.28,H*.15,12*U);
      g.lineStyle(Math.max(1,2*U),0x67584b);g.strokeRoundedRect(W*.265,top+H*.005,W*.28,H*.15,12*U);
      for(const gx of [W*.33,W*.48]){
        const gy=top+H*.07,r=H*.05;g.fillStyle(0x141c23);g.fillCircle(gx,gy,r);
        g.lineStyle(Math.max(1,2*U),0xa18f70);g.strokeCircle(gx,gy,r);
        for(let i=0;i<=10;i++){
          const a=Phaser.Math.DegToRad(135+27*i),major=i%2===0;
          g.lineStyle(Math.max(1,(major?2:1)*U),i>=9?0xe68162:0xc7cab5);
          g.lineBetween(gx+Math.cos(a)*r*(major? .72:.82),gy+Math.sin(a)*r*(major? .72:.82),gx+Math.cos(a)*r*.93,gy+Math.sin(a)*r*.93);
        }
      }
      const ix=W*.595,iy=top+H*.012,iw=W*.175,ih=H*.2;
      g.fillStyle(0x0c0d10);g.fillRoundedRect(ix,iy,iw,ih,8*U);g.lineStyle(Math.max(1,2*U),0x67584b);g.strokeRoundedRect(ix,iy,iw,ih,8*U);
      g.fillStyle(0x101e18);g.fillRoundedRect(ix+8*U,iy+8*U,iw-16*U,ih*.67,4*U);
      for(let i=0;i<6;i++){g.fillStyle(0x373332);g.fillRoundedRect(ix+12*U+i*(iw-24*U)/6,iy+ih*.79,(iw-24*U)/6-4*U,ih*.12,2*U);}
      g.fillStyle(0x18171b);g.fillRoundedRect(W*.8,H*.86,W*.03,H*.14,8*U);
      g.fillStyle(0x49403c);g.fillCircle(W*.815,H*.86,W*.022);
    });
    this.add.image(0,0,key).setOrigin(0).setDepth(210);this.gaugeGfx=this.add.graphics().setDepth(212);
    const label=(x,y,value,size,color)=>this.add.text(x,y,value,{fontFamily:'PressStart2P',fontSize:this.px(size),color,align:'center'}).setOrigin(.5).setDepth(213);
    this.speedText=label(W*.405,top+H*.06,'0',23,'#f5e6bb');label(W*.405,top+H*.092,'KM/H',8,'#a59c83');
    label(W*.33,top+H*.132,'SPEED',8,'#a59c83');label(W*.48,top+H*.132,'TRIP',8,'#a59c83');
    const ix=W*.595+16*U,iy=top+H*.012+16*U,iw=W*.175-32*U;
    this.rKm=this.add.text(ix,iy,'',{fontFamily:'PressStart2P',fontSize:this.px(21),color:'#b6e8ac'}).setDepth(213);
    this.rStation=this.add.text(ix,iy+39*U,'',{fontFamily:'PressStart2P',fontSize:this.px(9),color:'#e9d27a',wordWrap:{width:iw}}).setDepth(213);
    this.rLine=this.add.text(ix,iy+62*U,'',{fontFamily:'SpecialElite',fontSize:this.px(15),color:'#a9c8a4',wordWrap:{width:iw}}).setDepth(213);
    this.updateStation(false);
    this.radioZone=this.add.zone(W*.6825,top+H*.112,W*.175,H*.2).setDepth(217).setInteractive({useHandCursor:true});
    this.radioZone.on('pointerdown',()=>{if(!this.ready||this.state!=='driving')return;this.uiHeld=true;this.updateStation(true);});
    this.dice=this.add.container(W*.675,H*.115).setDepth(209).setScale(U);
    const rope=this.add.graphics();rope.lineStyle(3,0xc6c0ad);rope.lineBetween(0,0,-26,105);rope.lineBetween(0,0,22,128);
    this.dice.add([rope,this.add.image(-30,140,'drv_die').setScale(1.15).setAngle(-12),this.add.image(26,160,'drv_die').setScale(1).setAngle(14)]);
    const ds=H*.11/130;this.dinoBaseY=top+H*.012;
    this.dino=this.add.image(W*.52,this.dinoBaseY,'drv_dino').setOrigin(.5,1).setScale(ds).setDepth(214).setInteractive({useHandCursor:true});
    this.dino.on('pointerdown',()=>{
      if(!this.ready||this.state!=='driving')return;this.uiHeld=true;this.say(pick(FLAVOUR.dinoClick),2400,true);
      this.removeTrackedTween(this.dinoSquash);this.dino.setScale(ds);
      this.dinoSquash=this.createTrackedTween({targets:this.dino,scaleY:ds*1.15,scaleX:ds*.92,duration:90,yoyo:true});
    });
    this.wheel=this.add.image(W*.4,H*1.04,`drv_wheel_${this.wheelR}`).setDepth(220);this.buildAutopilotButton();
  },
  buildAutopilotButton(){
    const {W,H,U,dashTop}=this,x=W*.875,y=dashTop+H*.115,w=W*.1,h=H*.075;
    this.autoGfx=this.add.graphics().setDepth(215);this.autoGfx.fillStyle(0x24252b);
    this.autoGfx.fillRoundedRect(x-w/2,y-h/2,w,h,5*U);this.autoGfx.lineStyle(Math.max(1,2*U),0xb39b64);this.autoGfx.strokeRoundedRect(x-w/2,y-h/2,w,h,5*U);
    this.autoText=this.add.text(x,y,'AUTO\nPILOT',{fontFamily:'PressStart2P',fontSize:this.px(11),color:'#d4af37',align:'center',lineSpacing:6*U}).setOrigin(.5).setDepth(216);
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
    this.introText=this.add.text(W/2,H*.235,'W / UP: GAS   S / DOWN / SPACE: BRAKE\nA / D OR LEFT / RIGHT: STEER\nOR HOLD THE DASHBOARD BUTTONS',{fontFamily:'SpecialElite',fontSize:this.px(24),color:'#f4e7c1',backgroundColor:'#1a1618',align:'center',lineSpacing:5*U,padding:{x:18*U,y:12*U},wordWrap:{width:W*.72}}).setOrigin(.5).setDepth(240);
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
    const t=this.add.text(0,0,message,{fontFamily:'SpecialElite',fontSize:this.px(22),color:'#2a1d12',align:'center',wordWrap:{width:W*.3}}).setOrigin(.5,1);
    const w=t.width+pad*2,h=t.height+pad*2,g=this.add.graphics();
    g.fillStyle(0xf6ecc8);g.fillRoundedRect(-w/2,-h,w,h,8*U);g.lineStyle(Math.max(1,3*U),0x3b2d20);g.strokeRoundedRect(-w/2,-h,w,h,8*U);
    g.fillStyle(0xf6ecc8);g.fillTriangle(-10*U,0,10*U,0,0,16*U);t.setPosition(0,-pad);
    const b=this.add.container(clamp(this.dino.x,w/2+10,W-w/2-10),this.dashTop-H*.02,[g,t]).setDepth(300).setAlpha(0);
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
  updateStation(next){
    if(next){this.stationIndex=(this.stationIndex+1)%FLAVOUR.radio.length;this.killTrackedTweensOf(this.rStation);this.killTrackedTweensOf(this.rLine);
      this.createTrackedTween({targets:[this.rStation,this.rLine],alpha:{from:.2,to:1},duration:260});}
    const s=FLAVOUR.radio[this.stationIndex];this.rStation.setText(s.name);this.rLine.setText(s.line);
  },
  updateDashboard(dt){
    const {W,H,U,dashTop:top}=this,m=this._cockpitMotion,speed=Math.max(0,this.speed),moving=clamp(speed/(BASE_SPEED*.25),0,1),sp=clamp(speed/(BASE_SPEED*1.5),0,1),progress=clamp(this.pos/Math.max(1,this.L),0,1);
    const accel=clamp((speed-m.previousSpeed)/dt/BASE_SPEED,-1.5,.8);m.previousSpeed=speed;
    m.acceleration=smooth(m.acceleration,accel,7,dt);m.lean=smooth(m.lean,-this.steerVel*sp,6,dt);
    m.pitch=smooth(m.pitch,m.acceleration,5,dt);m.needle=smooth(m.needle,sp,10,dt);m.phase+=dt*(5+sp*15);
    const rough=clamp((Math.abs(this.playerX)-.98)/.25,0,1)*moving,v=(Math.sin(m.phase)*.6+Math.sin(m.phase*1.73)*.3)*sp;
    this.wheel.rotation=this.steerVel*.6;this.wheel.x=W*.4+m.lean*3*U;this.wheel.y=H*1.04+m.pitch*4*U+v*U+Math.sin(m.phase*2.1)*rough*1.5*U;
    this.dice.rotation=m.lean*.2+m.pitch*.07+Math.sin(this.clock*2.7)*.025*moving+Math.sin(m.phase*1.2)*rough*.025;
    this.dino.rotation=m.lean*.08+m.pitch*.055;
    if(!this.isTweenPlaying(this.dinoBounce))this.dino.y=this.dinoBaseY+v*1.2*U+m.pitch*3*U+Math.sin(m.phase*2.5)*rough*2*U;
    const g=this.gaugeGfx;g.clear();
    const needle=(cx,cy,r,value)=>{const a=Phaser.Math.DegToRad(135+270*clamp(value,0,1));g.lineStyle(Math.max(1,3*U),0xf0a273);g.lineBetween(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.fillStyle(0xd4c6a3);g.fillCircle(cx,cy,r*.13);};
    needle(W*.33,top+H*.07,H*.05*.8,m.needle);needle(W*.48,top+H*.07,H*.05*.8,progress);this.drawHudBar(progress);
    this.uiTick+=dt;if(this.uiTick>=.1){this.uiTick=0;this.speedText.setText(String(Math.round(speed*SPEED_DISPLAY)));
      this.speedText.setColor(this.clock<this.coffeeUntil&&speed>0?'#b6e8ac':'#f5e6bb');
      this.rKm.setText(`${Math.max(0,(1-progress)*this.quote.km).toFixed(1)}${text('t_7474ac0c56a5235015a8')}`);}
  }
};
