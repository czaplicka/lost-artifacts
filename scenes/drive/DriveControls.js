import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, DRIVE, BALANCE, approach, smooth, rand, pick, clamp } from './DriveShared.js';
export const DriveControls={
  buildInput(){
    this.keys=this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER');
    this._driveDrag=null;this._driveInputFocused=!document.hidden;
    this._driveButtonPointers=new Map();this._driveButtons=[];
    const count=this.input.manager.pointers.length;if(count<4)this.input.addPointer(4-count);
    this.buildDriveButtons();
    const release=p=>{
      if(p)this._driveButtonPointers.delete(p.id);
      if(!p||p.id===this._driveDrag?.id)this._driveDrag=null;
      this.uiHeld=false;this.refreshDriveButtons();
    };
    const blur=()=>{this._driveInputFocused=false;this.resetDriveControls();};
    const focus=()=>{this._driveInputFocused=!document.hidden;this.resetDriveControls();};
    const visibility=()=>{if(document.hidden)blur();else focus();};
    const cancel=()=>this.resetDriveControls();
    this.trackInputEvent(this.input,'pointerdown',(p,over=[])=>{
      if(!this.ready||this.state!=='driving'||this.settlementError||this._driveHold||this.uiHeld||
        !this._driveInputFocused||this._driveDrag||over.length||p.button>0||this._driveButtonPointers.has(p.id))return;
      const point=this.cameras.main.getWorldPoint(p.x,p.y);this._driveDrag={id:p.id,startX:point.x};
    });
    this.trackInputEvent(this.input,'pointerup',release);this.trackInputEvent(this.input,'pointerupoutside',release);
    this.trackInputEvent(this.input,'gameout',()=>{if(this.input.activePointer?.pointerType!=='touch')cancel();});
    if(this.input.keyboard){
      for(const name of ['keydown-SPACE','keydown-ENTER'])this.trackInputEvent(this.input.keyboard,name,e=>{
        if(e?.repeat||this._driveHold||this.settlementError)return;
        if(this.state==='summary'&&this.summaryReady&&!this._cleanupDone)this.leaveScene();
      });
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',e=>{
        if(e?.repeat||this._driveHold?.kind!=='autopilot')return;
        e?.preventDefault?.();this.releaseDriveHold();
      });
    }
    window.addEventListener('blur',blur);window.addEventListener('focus',focus);
    window.addEventListener('pointercancel',cancel);window.addEventListener('touchcancel',cancel);
    document.addEventListener('visibilitychange',visibility);
    let released=false;
    this.releaseDriveInput=()=>{
      if(released)return;released=true;
      window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);
      window.removeEventListener('pointercancel',cancel);window.removeEventListener('touchcancel',cancel);
      document.removeEventListener('visibilitychange',visibility);this.resetDriveControls();
    };
  },
  resetDriveControls(){
    this._driveDrag=null;this._driveButtonPointers?.clear();this.uiHeld=false;this.steerVel=0;this._lastIntent=null;
    for(const key of Object.values(this.keys||{}))key?.reset?.();
    this.refreshDriveButtons();
  },
  buildControlTextures(){
    this.gen('drv_pedal_gas',120,240,g=>{
      g.fillStyle(0x1e1f23);g.fillRect(52,0,16,72);g.fillStyle(0x3a3c42);g.fillRect(55,0,4,72);
      g.fillStyle(0x0e0e11);g.fillRoundedRect(4,58,112,180,16);
      g.fillStyle(0x3b3d43);g.fillRoundedRect(10,64,100,168,12);
      g.fillStyle(0x24252a);for(let y=80;y<220;y+=14)g.fillRoundedRect(20,y,80,6,3);
      g.fillStyle(0x80838c,.55);g.fillRect(16,67,88,4);
    });
    this.gen('drv_pedal_brake',200,180,g=>{
      g.fillStyle(0x1e1f23);g.fillRect(92,0,16,62);g.fillStyle(0x3a3c42);g.fillRect(95,0,4,62);
      g.fillStyle(0x0e0e11);g.fillRoundedRect(4,48,192,128,16);
      g.fillStyle(0x3b3d43);g.fillRoundedRect(10,54,180,116,12);
      g.fillStyle(0x24252a);for(let y=68;y<160;y+=13)g.fillRoundedRect(22,y,156,6,3);
      g.fillStyle(0x80838c,.55);g.fillRect(16,57,168,4);
    });
    this.gen('drv_ctl_wheel',240,240,g=>{
      const R=120;
      g.lineStyle(18,0x26262c);g.lineBetween(R,R,R-92,R+22);g.lineBetween(R,R,R+92,R+22);g.lineBetween(R,R,R,R+96);
      g.lineStyle(28,0x1a1a1f);g.strokeCircle(R,R,R-18);
      g.lineStyle(3,0x4d4d58);g.strokeCircle(R,R,R-5);g.strokeCircle(R,R,R-31);
      g.fillStyle(0x2b2b31);g.fillCircle(R,R,34);g.lineStyle(4,0x6b6b75);g.strokeCircle(R,R,24);
      g.fillStyle(0xd4af37);g.fillRect(R-6,2,12,30);
    });
  },
  // Bottom-left: a steering wheel you press/drag left or right. Bottom-right: brake and gas pedals.
  buildDriveButtons(){
    const {W,H}=this;this.buildControlTextures();
    const active=p=>this.ready&&this.state==='driving'&&!this._driveHold&&!this.settlementError&&this._driveInputFocused&&!(p.button>0);
    const bind=(zone,action)=>{
      zone.on('pointerdown',(p,lx,ly,e)=>{
        e?.stopPropagation?.();if(!active(p))return;
        this._driveButtonPointers.set(p.id,action);if(this._driveDrag?.id===p.id)this._driveDrag=null;this.refreshDriveButtons();
      });
      const up=p=>{if(this._driveButtonPointers.get(p.id)===action)this._driveButtonPointers.delete(p.id);this.refreshDriveButtons();};
      // The wheel keeps tracking a held finger that slides off it; pedals release on exit.
      for(const name of action==='wheel'?['pointerup','pointerupoutside']:['pointerup','pointerout','pointerupoutside'])zone.on(name,up);
    };
    const cx=250,cy=H-150,R=120;
    const plate=this.add.circle(cx,cy,R+14,0x141317,.55).setDepth(224);
    const wheel=this.add.image(cx,cy,'drv_ctl_wheel').setDepth(225);
    const arrow=(x,label)=>this.add.text(x,cy,label,{fontFamily:'PressStart2P',fontSize:this.px(30),color:'#bca784',stroke:'#141317',strokeThickness:6}).setOrigin(.5).setDepth(226);
    const left=arrow(cx-R-48,'<'),right=arrow(cx+R+48,'>');
    const wheelZone=this.add.zone(cx,cy,(R+80)*2,R*2+20).setDepth(227).setInteractive({useHandCursor:true});
    bind(wheelZone,'wheel');
    this._driveWheelCtl={cx,cy,R,plate,wheel,left,right,zone:wheelZone};
    for(const [action,key,x,label,color]of [['brake','drv_pedal_brake',1425,'BRAKE','#e0ab92'],['gas','drv_pedal_gas',1715,'GAS','#bcd39a']]){
      const img=this.add.image(x,H-8,key).setOrigin(.5,1).setDepth(225);
      const t=this.add.text(x,H-8-img.height*.4,label,{fontFamily:'PressStart2P',fontSize:this.px(13),color,stroke:'#0e0e11',strokeThickness:5}).setOrigin(.5).setDepth(226);
      const zone=this.add.zone(x,H-8-img.height/2,img.width+50,img.height+40).setDepth(227).setInteractive({useHandCursor:true});
      bind(zone,action);this._driveButtons.push({action,img,t,zone,baseY:H-8,labelY:t.y});
    }
  },
  // Steering from a finger/mouse held on the control wheel: horizontal distance from its centre.
  wheelControlSteer(){
    const c=this._driveWheelCtl;if(!c||!this._driveInputFocused)return null;
    for(const [id,held]of this._driveButtonPointers||[]){
      if(held!=='wheel')continue;
      const p=this.input.manager.pointers.find(p=>p.id===id);
      if(!p?.isDown){this._driveButtonPointers.delete(id);continue;}
      const d=this.cameras.main.getWorldPoint(p.x,p.y).x-c.cx;
      return Math.sign(d)*clamp((Math.abs(d)-c.R*.12)/(c.R*.7),0,1);
    }return null;
  },
  driveButtonDown(action){
    if(!this._driveInputFocused)return false;
    for(const [id,held]of this._driveButtonPointers||[]){
      const p=this.input.manager.pointers.find(p=>p.id===id);
      if(!p?.isDown){this._driveButtonPointers.delete(id);continue;}if(held===action)return true;
    }return false;
  },
  refreshDriveButtons(){
    const visible=this.ready&&this.state==='driving'&&!this._driveHold&&!this.settlementError,intent=this._lastIntent;
    for(const b of this._driveButtons||[]){
      if(!b.img?.scene)continue;b.img.setVisible(visible);b.t.setVisible(visible);
      // Pedals sink when pressed by touch, mouse or keyboard.
      const down=visible&&(this.driveButtonDown(b.action)||Boolean(intent?.[b.action==='gas'?'throttle':'brake']));
      b.img.setScale(1,down?.86:1).setY(b.baseY+(down?6:0)).setTint(down?0xb8b8b8:0xffffff);
      b.t.setY(b.labelY+(down?16:0));
    }
    const c=this._driveWheelCtl;
    if(c?.wheel?.scene){
      for(const o of [c.plate,c.wheel,c.left,c.right])o.setVisible(visible);
      const s=this.steerVel||0;c.wheel.rotation=s*1.6;
      c.left.setColor(visible&&s< -.15?'#f4e7c1':'#bca784').setScale(s< -.15?1.2:1);
      c.right.setColor(visible&&s>.15?'#f4e7c1':'#bca784').setScale(s>.15?1.2:1);
    }
  },
  getDriveIntent(){
    const k=this.keys;
    const active=this.state==='driving'&&!this._driveHold&&!this.settlementError&&this._driveInputFocused;
    const brake=Boolean(active&&(k?.DOWN?.isDown||k?.S?.isDown||k?.SPACE?.isDown||this.driveButtonDown('brake')));
    return {brake,throttle:Boolean(active&&!brake&&(k?.UP?.isDown||k?.W?.isDown||this.driveButtonDown('gas'))),
      left:Boolean(active&&(k?.LEFT?.isDown||k?.A?.isDown)),
      right:Boolean(active&&(k?.RIGHT?.isDown||k?.D?.isDown))};
  },
  stepDrive(dt){
    if(!Number.isFinite(dt)||dt<=0||this._driveHold)return;
    const driving=this.state==='driving';if(!driving&&this.state!=='arriving')return;
    const intent=this.getDriveIntent();this._lastIntent=intent;this.driveTime+=dt;
    this.invuln=Math.max(0,this.invuln-dt);this.rumbleCd=Math.max(0,this.rumbleCd-dt);
    let steer=Number(intent.right)-Number(intent.left);
    const wheelSteer=driving&&!intent.left&&!intent.right?this.wheelControlSteer():null;
    if(wheelSteer!==null)steer=wheelSteer;
    else if(driving&&this._driveInputFocused&&!intent.left&&!intent.right&&this._driveDrag&&!this.uiHeld){
      const p=this.input.manager.pointers.find(p=>p.id===this._driveDrag.id);
      if(p?.isDown){const point=this.cameras.main.getWorldPoint(p.x,p.y),d=point.x-this._driveDrag.startX;
        steer=Math.sign(d)*clamp(Math.max(0,Math.abs(d)-this.W*.004)/(this.W*.14),0,1);
      }else this._driveDrag=null;
    }
    this.steerVel=smooth(this.steerVel,steer,steer===0?DRIVE.steeringReturn:DRIVE.steeringResponse,dt);
    if(Math.abs(this.steerVel)<.001)this.steerVel=0;
    this.refreshDriveButtons();
    let speed=Math.max(0,Math.min(this.speed,this.speedMul*BASE_SPEED));const previous=speed;
    const offroad=clamp((Math.abs(this.playerX)-.98)/.25,0,1);
    const coffee=driving&&this.clock<this.coffeeUntil?DRIVE.coffeeMultiplier:1;
    const max=DRIVE.maxSpeed*coffee+(DRIVE.offroadMaxSpeed-DRIVE.maxSpeed*coffee)*offroad;
    if(driving){
      if(intent.brake||!this._driveInputFocused)speed-=DRIVE.braking*dt;
      else if(intent.throttle)speed+=DRIVE.acceleration*coffee*(1-offroad*.35)*dt;
      else speed-=(DRIVE.coasting+DRIVE.airResistance*(speed/BASE_SPEED)**2)*dt;
      speed=Math.max(0,speed-DRIVE.offroadDrag*offroad*dt);
      if(speed>max)speed=approach(speed,max,DRIVE.acceleration*dt);
      if(speed<.5&&!intent.throttle)speed=0;
    }else{
      speed=approach(speed,Math.min(DRIVE.arrivalSpeed,Math.sqrt(2*DRIVE.arrivalResponse*Math.max(0,this.L-this.pos))),DRIVE.arrivalResponse*dt);
    }
    this.speed=speed;this.speedMul=speed/BASE_SPEED;
    this.pos=Math.min(this.L,this.pos+(previous+speed)*.5*dt);
    // Steering authority grows with speed; the bend pushes outward with speed squared,
    // so fast cornering needs a firm hand (or a touch of brake) instead of constant wiggling.
    const grip=1-clamp(speed/DRIVE.maxSpeed,0,1)*.18-offroad*.15,sm=speed/BASE_SPEED;
    this.playerX=clamp(this.playerX+(this.steerVel*DRIVE.steeringRate*clamp(speed/(BASE_SPEED*.45),0,1)*grip-
      this.curveAt(this.pos+20)*DRIVE.curveForce*sm*sm)*dt,-1.5,1.5);
    if(offroad>.1&&speed>40&&this.rumbleCd<=0){this.rumbleCd=.25;this.cameras.main.shake(90,.001+offroad*.002);}
    if(driving){
      this.idleTimer-=dt;if(this.idleTimer<=0){this.idleTimer=rand(...BALANCE.idleChat);this.say(pick(FLAVOUR.dinoIdle),3000);}
      if(this.pos>=this.L-80){this.state='arriving';this.arriveTime=0;this.resetDriveControls();this.say(this.town.arrival,3600,true);}
    }else{
      this.arriveTime+=dt;if(this.pos>=this.L){this.speed=0;this.speedMul=0;if(this.arriveTime>1.1)this.showSummary();}
    }
  },
  driveAutopilotPenalty(){return Math.max(1,Math.round(this.L/2200));},
  autopilot(){
    if(this.state!=='driving'||!this.holdDrive('autopilot'))return;
    const dents=this.driveAutopilotPenalty();
    this.showDriveDialog('LET THE CAR HANDLE IT?',
      `Skip the remaining drive and arrive now.\n\nAdds ${dents} dent${dents===1?'':'s'} to the trip.\n`+
      'Remaining pickups will be missed.\n\nIts licence is technically a supermarket receipt.',[
        {label:'KEEP DRIVING',action:()=>this.releaseDriveHold()},
        {label:'USE AUTOPILOT',action:()=>this.confirmDriveAutopilot()}
      ]);
  },
  confirmDriveAutopilot(){
    if(this._driveHold?.kind!=='autopilot'||!this.releaseDriveHold())return;
    this.stats.autopilot=true;this.stats.hits+=this.driveAutopilotPenalty();this.refreshStats();
    this.pos=this.L;this.speed=0;this.speedMul=0;this.steerVel=0;this.showSummary();this.refreshDriveButtons();
  }
};
