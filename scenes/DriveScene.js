import { BaseScene } from './BaseScene.js';
import { BIOMES, FLAVOUR, HOME_TOWN_ID } from '../config/RoadTripTowns.js';
import { getRoadTripQuote, beginRoadTrip } from '../managers/RoadTripManager.js';
import { Z0, rand } from './drive/DriveShared.js';
import { DriveTextures } from './drive/DriveTextures.js';
import { DriveScenery } from './drive/DriveScenery.js';
import { DriveCockpit } from './drive/DriveCockpit.js';
import { DriveRoad } from './drive/DriveRoad.js';
import { DriveControls } from './drive/DriveControls.js';
import { DriveTrip } from './drive/DriveTrip.js';
import { installDriveEngineAudio } from './drive/DriveEngineAudio.js';
import { CAR_DESIGN, loadCarAssets } from './drive/DriveCarAssets.js';

export class DriveScene extends BaseScene {
  constructor() { super({key:'DriveScene'}); }
  init(data={}) {
    this.driveData={toTownId:HOME_TOWN_ID,...data};
    Object.assign(this,{
      state:'driving', ready:false, quote:null, destination:null,
      _driveRun:Symbol('drive-run'), _driveHold:null, _driveOverlay:null,
      _driveUnbind:null, _driveStartupPanel:null, _driveStartupMessage:null,
      _driveStartupButton:null, _driveStartupExitPending:false,
      pos:0,speed:0,speedMul:0,playerX:0,steerVel:0,clock:0,
      driveTime:0,arriveTime:0,invuln:0,rumbleCd:0,uiTick:0,
      idleTimer:rand(6,9),bubbleUntil:0,bubble:null,_bubbleTimer:null,
      uiHeld:false,coffeeUntil:0,dinoBounce:null,dinoSquash:null,
      travelHud:null,seed:Math.random()*100,objects:[],drops:[],clouds:[],
      stats:{hits:0,coffees:0,coins:0,fines:0,autopilot:false},
      tripId:data.tripId??null,fineSequence:0,pendingFine:null,
      pendingArrival:false,settlementError:null,outcome:null,applied:false,
      summaryReady:false,gate:null,engineAudio:null,_roadWarning:null,
      _roadEventCount:0,_roadLastObstacleId:null,_settlementPanel:null,
      carAssets:null,_carLoadingLabel:null,_carWeatherMask:null,_carMaskGraphics:null,
      _carLoadingUnbind:null,dinoHead:null,dinoTorso:null,carSeat:null,
      stationIndex:Math.floor(Math.random()*FLAVOUR.radio.length)
    });
  }
  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.onSceneShutdown,this);
    this.hideTravelUi();this.state='loading-car';
    const layout=()=>{
      const {width,height}=this.scale.gameSize;
      this.cameras.main.setViewport(0,0,width,height).setZoom(1).setScroll(0,0);
      this._carLoadingLabel?.setPosition(width/2,height/2);
    };
    this._carLoadingLabel=this.add.text(0,0,'PREPARING YOUR VERY RESPECTABLE CAR...',{
      fontFamily:'SpecialElite',fontSize:'24px',color:'#e3d4ad',align:'center',wordWrap:{width:this.scale.gameSize.width*.8}
    }).setOrigin(.5).setDepth(20000);
    this.trackInputEvent(this.scale,Phaser.Scale.Events.RESIZE,layout);layout();
    this._carLoadingUnbind=()=>this.offTrackedInputEvent(this.scale,Phaser.Scale.Events.RESIZE,layout);
    void this.prepareDriveCar();
  }
  async prepareDriveCar(){
    const run=this._driveRun;
    try{
      await loadCarAssets(this);
      if(this._cleanupDone||this._driveRun!==run||!this.sys.isActive())return;
      this._carLoadingUnbind?.();this._carLoadingUnbind=null;
      this._carLoadingLabel?.destroy();this._carLoadingLabel=null;
      this.startPreparedDrive();
    }catch(error){
      if(this._cleanupDone||this._driveRun!==run||!this.sys.isActive())return;
      this._carLoadingUnbind?.();this._carLoadingUnbind=null;
      this._carLoadingLabel?.destroy();this._carLoadingLabel=null;
      this.showDriveStartupError(error);
    }
  }
  startPreparedDrive(){
    try {
      const d=this.driveData;
      this.quote=getRoadTripQuote(d.fromTownId,d.toTownId);
      this.destination=d.nextScene||(this.quote.toId===HOME_TOWN_ID?'HomeCityScene':null);
      if(typeof this.destination!=='string'||!this.destination.trim()||this.destination==='DriveScene')
        throw new Error('No valid arrival scene is configured for this town.');
      this.tripId=beginRoadTrip(this.quote,this.tripId);
    } catch(error) { this.showDriveStartupError(error);return; }
    this.state='driving';
    const W=CAR_DESIGN.width,H=CAR_DESIGN.height;
    Object.assign(this,{W,H,U:1,sx:1,horizonY:H*CAR_DESIGN.horizon,dashTop:H*CAR_DESIGN.dashTop,
      step:4,curveK:.05});
    this.rowCount=Math.ceil((H-this.horizonY)/this.step);
    this.rowCx=new Float32Array(this.rowCount+2);
    this.cullDz=Z0/((this.dashTop-this.horizonY)/(H-this.horizonY))*.92;
    this.hitDz=this.cullDz*1.12;
    this.fromTown=this.quote.fromTown;this.town=this.quote.toTown;
    this.biome=BIOMES[this.town.biome]||BIOMES.meadow;
    this.weather=this.town.weather||'clear';this.L=this.quote.tripLength;
    Object.assign(this,{nextDecorZ:40,nextObstacleZ:900,nextBillboardZ:330,
      nextCamZ:1300+rand(0,600),gateSpawned:false,startSignSpawned:false});
    this.buildTextures();this.buildSky();this.buildWorldLayers();this.buildWeather();
    this.buildDash();this.buildHud();this.buildInput();this.buildPauseControl();
    this.trackInputEvent(this.scale,Phaser.Scale.Events.RESIZE,this.fitDriveCamera);
    this.fitDriveCamera();this.spawnAhead();this.ready=true;
    this.engineAudio=installDriveEngineAudio(this);
    this.cameras.main.fadeIn(450,0,0,0);
    this.time.delayedCall(900,()=>{
      if(this.ready&&!this._cleanupDone)this.say(`${this.town.name}\n${this.town.tagline}`,4200,true);
    });
    if(document.hidden)this.pauseDrive('Your tab is hidden. The trip is paused.');
  }
  buildPauseControl() {
    this.pauseButton=this.add.text(this.W*.975,this.H*.025,'PAUSE [P]',{
      fontFamily:'PressStart2P',fontSize:this.px(10),color:'#ddc99e',backgroundColor:'#252329',
      padding:{x:12*this.U,y:10*this.U}
    }).setOrigin(1,0).setDepth(260).setInteractive({useHandCursor:true});
    this.pauseButton.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation?.();if(!(p.button>0))this.pauseDrive();});
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-P',e=>{
      if(e?.repeat||e?.defaultPrevented||e?.ctrlKey||e?.metaKey||e?.altKey)return;
      e?.preventDefault?.();
      if(this._driveHold?.kind==='pause')this.releaseDriveHold();else this.pauseDrive();
    });
    const blur=()=>this.pauseDrive('You stepped away. Your trip is paused.');
    const visibility=()=>{if(document.hidden)blur();};
    window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
    this._driveUnbind=()=>{
      window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);
      this._driveUnbind=null;
    };
  }
  holdDrive(kind) {
    if(!this.ready||this._cleanupDone||this.settlementError||this._driveHold||!['driving','arriving'].includes(this.state))return false;
    this._driveHold={kind,state:this.state,clockPaused:this.time.paused,
      tweens:this.tweens.getTweens().filter(t=>!t.paused)};
    this.state='paused';this.time.paused=true;
    for(const t of this._driveHold.tweens)t.pause();
    this.resetDriveControls();this.refreshDriveButtons();this.engineAudio?.silence();return true;
  }
  releaseDriveHold() {
    if(!this._driveHold||this._cleanupDone||document.hidden||!document.hasFocus())return false;
    const hold=this._driveHold;this._driveHold=null;
    this._driveOverlay?.destroy(true);this._driveOverlay=null;
    this.time.paused=hold.clockPaused;
    for(const t of hold.tweens)if(this.tweens.has(t))t.resume();
    this.state=hold.state;this.resetDriveControls();this.refreshDriveButtons();return true;
  }
  showDriveDialog(title,message,buttons) {
    const {W,H,U}=this;
    const veil=this.add.rectangle(0,0,W,H,0x0c1018,.84).setOrigin(0).setInteractive();
    veil.on('pointerdown',(p,x,y,e)=>e?.stopPropagation?.());
    const card=this.add.rectangle(W/2,H/2,W*.84,H*.65,0x292326).setStrokeStyle(Math.max(1,2*U),0xb99d65);
    const heading=this.add.text(W/2,H*.245,title,{fontFamily:'PressStart2P',fontSize:this.px(19),color:'#e4c98b',align:'center',wordWrap:{width:W*.73}}).setOrigin(.5);
    const body=this.add.text(W/2,H*.46,message,{fontFamily:'SpecialElite',fontSize:this.px(23),color:'#d8ceba',align:'center',wordWrap:{width:W*.73}}).setOrigin(.5);
    const items=[veil,card,heading,body];
    buttons.forEach((b,i)=>{
      const x=buttons.length===1?W/2:W*(.29+i*.42);
      const button=this.add.text(x,H*.72,b.label,{fontFamily:'PressStart2P',fontSize:this.px(12),color:'#eee0bb',backgroundColor:'#51422f',padding:{x:17*U,y:17*U}}).setOrigin(.5).setInteractive({useHandCursor:true});
      button.on('pointerdown',(p,lx,ly,e)=>{e?.stopPropagation?.();if(p.button>0||document.hidden||!document.hasFocus())return;b.action();});items.push(button);
    });
    this._driveOverlay=this.add.container(0,0,items).setDepth(19000);
  }
  pauseDrive(message='Even detectives need a pit stop.') {
    if(!this.holdDrive('pause'))return false;
    this.showDriveDialog('PIT STOP',message+'\n\nDistance, coffee time and road events are frozen.',[{label:'RESUME [P]',action:()=>this.releaseDriveHold()}]);return true;
  }
  showDriveStartupError(error) {
    if(this._cleanupDone||!this.sys.isActive())return;
    console.error('[DriveScene] Could not start:',error);this.ready=false;this.state='startup-error';
    const message=error?.message||String(error);
    if(this._driveStartupPanel?.scene){this._driveStartupMessage.setText(message);return;}
    const bg=this.add.rectangle(0,0,1,1,0x15111c).setOrigin(0).setInteractive();
    const t=this.add.text(0,0,message,{fontFamily:'SpecialElite',fontSize:'24px',color:'#fff1d0',align:'center'}).setOrigin(.5);
    const b=this.add.text(0,0,'RETURN TO MENU (ESC)',{fontFamily:'PressStart2P',fontSize:'14px',color:'#d4af37',backgroundColor:'#3b2d20',padding:{x:18,y:18}}).setOrigin(.5).setInteractive({useHandCursor:true});
    this._driveStartupMessage=t;this._driveStartupButton=b;
    this._driveStartupPanel=this.add.container(0,0,[bg,t,b]).setDepth(20000);
    const layout=()=>{
      if(!this._driveStartupPanel?.scene||this._cleanupDone)return;
      const {width:w,height:h}=this.scale.gameSize;
      this.cameras.main.setViewport(0,0,w,h).setZoom(1).setScroll(0,0);
      bg.setSize(w,h);t.setPosition(w/2,h*.38).setWordWrapWidth(Math.max(120,w*.84),true);
      b.setPosition(w/2,h*.68).setFontSize(Math.max(8,Math.min(14,Math.floor((w-48)/24))));
    };
    this.trackInputEvent(this.scale,Phaser.Scale.Events.RESIZE,layout);layout();this.cameras.main.fadeIn(150);
    b.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation?.();if(!(p.button>0))void this.returnFromDriveStartupError();});
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',e=>{
      if(e?.repeat||e?.defaultPrevented)return;e?.preventDefault?.();void this.returnFromDriveStartupError();
    });
  }
  async returnFromDriveStartupError() {
    if(this.state!=='startup-error'||this._driveStartupExitPending||this._cleanupDone||!this.sys.isActive())return false;
    const run=this._driveRun;this._driveStartupExitPending=true;this._driveStartupButton?.setAlpha(.5);
    try { if(await this.goto('EnterScene'))return true;throw new Error('The menu could not be opened. Please retry.'); }
    catch(error){
      if(this._driveRun===run&&!this._cleanupDone&&this.sys.isActive()){
        this._driveStartupExitPending=false;this._driveStartupButton?.setAlpha(1);this._driveStartupMessage?.setText(error?.message||String(error));
      }return false;
    }
  }
  disposeDriveRuntime() {
    this._driveUnbind?.();this.engineAudio?.destroy();this.engineAudio=null;
    this.releaseDriveInput?.();this.releaseDriveInput=null;
    if(this._driveHold)this.time.paused=this._driveHold.clockPaused;
    this._driveHold=null;
    if(this._driveOverlay?.scene)this._driveOverlay.destroy(true);this._driveOverlay=null;
    this.clearDriveBubble?.();
    this._carLoadingUnbind?.();this._carLoadingUnbind=null;
    this._carLoadingLabel?.destroy();this._carLoadingLabel=null;
    this._carWeatherMask?.destroy();this._carWeatherMask=null;
    this._carMaskGraphics?.destroy();this._carMaskGraphics=null;
  }
  cleanup() {
    if(this._cleanupDone)return;
    this.ready=false;this.disposeDriveRuntime();
    if(this._driveStartupPanel?.scene)this._driveStartupPanel.destroy(true);
    this._driveStartupPanel=null;this._driveStartupExitPending=true;super.cleanup();
  }
  fitDriveCamera() {
    const {width,height}=this.scale.gameSize;if(!width||!height)return;
    const zoom=Math.min(width/this.W,height/this.H),w=this.W*zoom,h=this.H*zoom;
    this.cameras.main.setViewport((width-w)/2,(height-h)/2,w,h).setZoom(zoom).centerOn(this.W/2,this.H/2);
  }
  px(n){return `${Math.max(8,Math.round(n*this.U))}px`;}
  update(time,delta){
    this.pauseButton?.setVisible(this.ready&&['driving','arriving'].includes(this.state)&&!this.settlementError);
    if(!this.ready||this._cleanupDone||this.settlementError||this._driveHold)return;
    if(!['driving','arriving'].includes(this.state))return;
    const dt=Math.min(Math.max(0,delta/1000),.05);if(!Number.isFinite(dt)||!dt)return;
    this.clock+=dt;this.stepDrive(dt);
    if(!['driving','arriving'].includes(this.state)||this.settlementError)return;
    this.spawnAhead();this.drawRoad();this.updateObjects(dt);if(this.settlementError)return;
    this.updateScenery(dt);this.updateDashboard(dt);
  }
}
export function applyDriveMixins(prototype,entries){
  const owners=new Map(Reflect.ownKeys(prototype).map(k=>[k,'DriveScene'])),pending=[];
  for(const [name,mixin]of entries)for(const key of Reflect.ownKeys(mixin)){
    const descriptor=Object.getOwnPropertyDescriptor(mixin,key);
    if(owners.has(key))throw new Error(`[DriveScene] Mixin collision: ${String(key)} in ${name}; already in ${owners.get(key)}.`);
    owners.set(key,name);pending.push([key,descriptor]);
  }
  for(const [key,descriptor]of pending)Object.defineProperty(prototype,key,descriptor);
}
applyDriveMixins(DriveScene.prototype,[['DriveTextures',DriveTextures],['DriveScenery',DriveScenery],['DriveCockpit',DriveCockpit],['DriveRoad',DriveRoad],['DriveControls',DriveControls],['DriveTrip',DriveTrip]]);
