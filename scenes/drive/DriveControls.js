import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, DRIVE, approach, smooth, rand, pick, clamp } from './DriveShared.js';
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
    this._driveDrag=null;this._driveButtonPointers?.clear();this.uiHeld=false;this.steerVel=0;
    for(const key of Object.values(this.keys||{}))key?.reset?.();
    this.refreshDriveButtons();
  },
  buildDriveButtons(){
    const {W,H,U}=this;
    const defs=[['left','<',.075,.105,0xbca784],['right','>',.195,.105,0xbca784],
      ['brake','BRAKE',.735,.14,0xd2a18b],['gas','GAS',.905,.14,0xb3c791]];
    for(const [action,label,x,width,color]of defs){
      const bg=this.add.rectangle(W*x,H*.93,W*width,H*.105,0x252329,.96)
        .setStrokeStyle(Math.max(1,2*U),color).setDepth(225).setInteractive({useHandCursor:true});
      const t=this.add.text(W*x,H*.93,label,{fontFamily:'PressStart2P',fontSize:this.px(['left','right'].includes(action)?25:13),
        color:`#${color.toString(16)}`}).setOrigin(.5).setDepth(226);
      this._driveButtons.push({action,bg,t,color});
      bg.on('pointerdown',(p,lx,ly,e)=>{
        e?.stopPropagation?.();if(!this.ready||this.state!=='driving'||this._driveHold||this.settlementError||!this._driveInputFocused||p.button>0)return;
        this._driveButtonPointers.set(p.id,action);if(this._driveDrag?.id===p.id)this._driveDrag=null;
        this.refreshDriveButtons();
      });
      const up=p=>{if(this._driveButtonPointers.get(p.id)===action)this._driveButtonPointers.delete(p.id);this.refreshDriveButtons();};
      for(const name of ['pointerup','pointerout','pointerupoutside'])bg.on(name,up);
    }
  },
  driveButtonDown(action){
    if(!this._driveInputFocused)return false;
    for(const [id,held]of this._driveButtonPointers||[]){
      const p=this.input.manager.pointers.find(p=>p.id===id);
      if(!p?.isDown){this._driveButtonPointers.delete(id);continue;}if(held===action)return true;
    }return false;
  },
  refreshDriveButtons(){
    const visible=this.ready&&this.state==='driving'&&!this._driveHold&&!this.settlementError;
    for(const b of this._driveButtons||[]){
      if(!b.bg.scene)continue;b.bg.setVisible(visible);b.t.setVisible(visible);
      b.bg.setFillStyle(visible&&this.driveButtonDown(b.action)?0x554936:0x252329,.96);
    }
  },
  getDriveIntent(){
    const k=this.keys;
    const active=this.state==='driving'&&!this._driveHold&&!this.settlementError&&this._driveInputFocused;
    const brake=Boolean(active&&(k?.DOWN?.isDown||k?.S?.isDown||k?.SPACE?.isDown||this.driveButtonDown('brake')));
    return {brake,throttle:Boolean(active&&!brake&&(k?.UP?.isDown||k?.W?.isDown||this.driveButtonDown('gas'))),
      left:Boolean(active&&(k?.LEFT?.isDown||k?.A?.isDown||this.driveButtonDown('left'))),
      right:Boolean(active&&(k?.RIGHT?.isDown||k?.D?.isDown||this.driveButtonDown('right')))};
  },
  stepDrive(dt){
    if(!Number.isFinite(dt)||dt<=0||this._driveHold)return;
    const driving=this.state==='driving';if(!driving&&this.state!=='arriving')return;
    const intent=this.getDriveIntent();this.refreshDriveButtons();this.driveTime+=dt;
    this.invuln=Math.max(0,this.invuln-dt);this.rumbleCd=Math.max(0,this.rumbleCd-dt);
    let steer=Number(intent.right)-Number(intent.left);
    if(driving&&this._driveInputFocused&&!intent.left&&!intent.right&&this._driveDrag&&!this.uiHeld){
      const p=this.input.manager.pointers.find(p=>p.id===this._driveDrag.id);
      if(p?.isDown){const point=this.cameras.main.getWorldPoint(p.x,p.y),d=point.x-this._driveDrag.startX;
        steer=Math.sign(d)*clamp(Math.max(0,Math.abs(d)-this.W*.004)/(this.W*.14),0,1);
      }else this._driveDrag=null;
    }
    this.steerVel=smooth(this.steerVel,steer,steer===0?DRIVE.steeringReturn:DRIVE.steeringResponse,dt);
    if(Math.abs(this.steerVel)<.001)this.steerVel=0;
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
    const grip=1-clamp(speed/DRIVE.maxSpeed,0,1)*.18-offroad*.15;
    this.playerX=clamp(this.playerX+(this.steerVel*DRIVE.steeringRate*clamp(speed/(BASE_SPEED*.3),0,1)*grip-
      this.curveAt(this.pos+60)*DRIVE.curveForce*(speed/BASE_SPEED))*dt,-1.5,1.5);
    if(offroad>.1&&speed>40&&this.rumbleCd<=0){this.rumbleCd=.25;this.cameras.main.shake(90,.001+offroad*.002);}
    if(driving){
      this.idleTimer-=dt;if(this.idleTimer<=0){this.idleTimer=rand(7,11);this.say(pick(FLAVOUR.dinoIdle),3000);}
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
