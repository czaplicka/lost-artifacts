import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { computeOutcome,applyOutcome,chargeRoadTripFine } from '../../managers/RoadTripManager.js';
import { FINE_AMOUNT,CAMERA_LIMIT,pick } from './DriveShared.js';
export const DriveTrip={
  hideTravelUi(){
    const news=this.getRegisteredScene('NewsHud'),ui=this.getRegisteredScene('UIScene'),dom=document.getElementById('hud-container');
    this.travelHud={news,newsEnabled:news?.hudEnabled,ui,uiVisible:ui?.sys.settings.visible,dom,display:dom?.style.display,
      sleeping:['PlayerHudScene','NewsHud'].filter(k=>this.isSceneActive(k))};
    news?.setHudVisible?.(false);ui?.sys.setVisible(false);if(dom)dom.style.display='none';
    this.sleepPlayerHud();this.sleepSceneIfActive('NewsHud');
  },
  restoreTravelUi(){
    const p=this.travelHud;this.travelHud=null;if(!p)return;
    if(p.dom?.isConnected)p.dom.style.display=p.display;
    if(p.ui&&this.getRegisteredScene('UIScene')===p.ui)p.ui.sys.setVisible(p.uiVisible);
    if(typeof p.newsEnabled==='boolean'&&this.getRegisteredScene('NewsHud')===p.news)p.news.setHudVisible?.(p.newsEnabled);
    for(const k of p.sleeping)if(this.isSceneSleeping(k))this.getRegisteredScene(k)?.sys.wake();
  },
  showSettlementError(error){
    console.error('[DriveScene] Settlement failed:',error);this.settlementError=error;this.resetDriveControls();this.engineAudio?.silence();
    this._settlementPanel?.destroy(true);
    const {W,H,U}=this;
    const veil=this.add.rectangle(0,0,W,H,0x080a10,.85).setOrigin(0).setInteractive();
    veil.on('pointerdown',(p,x,y,e)=>e?.stopPropagation?.());
    const card=this.add.rectangle(W/2,H/2,W*.84,H*.54,0x292326).setStrokeStyle(Math.max(1,2*U),0xb99d65);
    const t=this.add.text(W/2,H*.42,`${error?.message||String(error)}\n\nCheck browser storage, then retry.`,{
      fontFamily:'SpecialElite',fontSize:this.px(23),color:'#fff1d0',align:'center',wordWrap:{width:W*.72}}).setOrigin(.5);
    const retry=this.add.text(W/2,H*.66,'RETRY',{fontFamily:'PressStart2P',fontSize:this.px(16),color:'#e0c481',backgroundColor:'#49382c',padding:{x:22*U,y:14*U}}).setOrigin(.5).setInteractive({useHandCursor:true});
    retry.on('pointerdown',(p,x,y,e)=>{
      e?.stopPropagation?.();if(p.button>0||this._cleanupDone)return;
      this._settlementPanel?.destroy(true);this._settlementPanel=null;this.settlementError=null;this.resetDriveControls();
      if(this.pendingFine)this.settlePendingFine();else if(this.pendingArrival)this.showSummary();
    });
    this._settlementPanel=this.add.container(0,0,[veil,card,t,retry]).setDepth(20000);
  },
  onCam(){
    if(this.state!=='driving'||this.pendingFine||this.settlementError)return;
    if(this.speedMul<=CAMERA_LIMIT){this.say(pick(FLAVOUR.camSafe),2400);return;}
    this.pendingFine={id:`camera-${++this.fineSequence}`,amount:FINE_AMOUNT};this.settlePendingFine();
  },
  settlePendingFine(){
    const p=this.pendingFine;if(!p)return;
    try{
      const r=chargeRoadTripFine(this.quote,this.tripId,p.amount,p.id);
      this.pendingFine=null;this.stats.fines=r.assessed;
      this.cameras.main.flash(110,190,180,150);this.say(pick(FLAVOUR.camFlash),3000,true);
      this.floatText(`FINE: $${p.amount}`,'#e6ad83');this.refreshStats();
    }catch(error){this.showSettlementError(error);}
  },
  showSummary(){
    if(['summary','leaving'].includes(this.state)||this.settlementError||this._driveHold)return;
    this.pendingArrival=true;
    try{this.outcome=applyOutcome(this.quote,computeOutcome(this.quote,this.stats),this.tripId);this.applied=true;this.pendingArrival=false;}
    catch(error){this.showSettlementError(error);return;}
    this.state='summary';this.summaryReady=false;this.speed=0;this.speedMul=0;
    this.resetDriveControls();this.clearDriveBubble();this.engineAudio?.silence();this._roadWarning?.setVisible(false);
    this.autoZone?.disableInteractive();this.radioZone?.disableInteractive();this.dino?.disableInteractive();
    const o=this.outcome,{W,H,U}=this;
    const veil=this.add.rectangle(W/2,H/2,W,H,0x080a10,.78).setDepth(400).setInteractive();
    veil.on('pointerdown',(p,x,y,e)=>e?.stopPropagation?.());
    const pw=W*.76,ph=H*.88,left=-pw/2,top=-ph/2;
    const panel=this.add.container(W/2,H/2+18*U).setDepth(401).setAlpha(0),g=this.add.graphics();
    g.fillStyle(0,.3);g.fillRect(left+10*U,top+12*U,pw,ph);g.fillStyle(0xeee1bb);g.fillRect(left,top,pw,ph);
    g.lineStyle(Math.max(1,2*U),0x6d5943);g.strokeRect(left+7*U,top+7*U,pw-14*U,ph-14*U);
    g.fillStyle(0x241e20);g.fillRect(left,top,pw,ph*.16);panel.add(g);
    const add=(x,y,value,size,color,font='SpecialElite',origin=0,wrap=pw*.86)=>{
      const t=this.add.text(x,y,value,{fontFamily:font,fontSize:this.px(size),color,align:origin===.5?'center':'left',wordWrap:{width:wrap}}).setOrigin(origin,0);panel.add(t);return t;
    };
    add(0,top+ph*.025,'MARK AGENCY / TRAVEL DESK',10,'#bbab8c','PressStart2P',.5);
    add(0,top+ph*.075,'ROAD TRIP REPORT',21,'#e0c481','PressStart2P',.5);
    add(left+pw*.065,top+ph*.19,`${this.fromTown.short} > ${this.town.short}`,23,'#30271e','SpecialElite',0,pw*.63);
    add(left+pw*.94,top+ph*.19,o.autopilot?'DELEGATED':o.hits===0?'DENT FREE':'ARRIVED',11,
      o.hits===0?'#3c6b52':'#904b3a','PressStart2P',1,pw*.29).setAngle(-7);
    const rows=[['Distance',`${o.km} km`],['Travel time',`${o.hours}h ${o.minutes}m`],['Fuel paid',`-$${o.fuel}`],
      ['Dents acquired',String(o.hits)],['Coffee collected',String(o.coffees)],['Road finds received',`+$${o.coins}`],['Fines paid',`-$${o.finesPaid}`]];
    if(o.finesUnpaid>0)rows.push(['Unpaid fines',`$${o.finesUnpaid} still owed`]);
    rows.forEach(([label,value],i)=>{
      const y=top+ph*.285+i*ph*.043;
      if(i%2===0){g.fillStyle(0x624b32,.055);g.fillRect(left+pw*.045,y-ph*.003,pw*.91,ph*.043);}
      add(left+pw*.065,y,label,21,'#493a2b','SpecialElite',0,pw*.52);
      add(left+pw*.935,y,value,21,label==='Road finds received'?'#3c6b52':'#704335','SpecialElite',1,pw*.32);
    });
    g.lineStyle(Math.max(1,U),0x9b8664,.75);g.lineBetween(left+pw*.065,top+ph*.65,left+pw*.935,top+ph*.65);
    const verdict=o.autopilot?FLAVOUR.verdicts.autopilot:o.hits===0?FLAVOUR.verdicts.perfect:o.hits<=2?FLAVOUR.verdicts.minor:FLAVOUR.verdicts.major;
    add(0,top+ph*.67,verdict,20,'#493a2b','SpecialElite',.5,pw*.86);
    const by=top+ph*.855,button=this.add.rectangle(0,by,pw*.6,ph*.077,0x302a25).setStrokeStyle(Math.max(1,2*U),0xb79a61);
    const bt=this.add.text(0,by,'ENTER TOWN',{fontFamily:'PressStart2P',fontSize:this.px(14),color:'#e8d6a6'}).setOrigin(.5);
    panel.add([button,bt]);add(0,top+ph*.925,'SPACE / ENTER TO CONTINUE',9,'#77654c','PressStart2P',.5);
    button.setAlpha(.5);bt.setAlpha(.5);
    const run=this._driveRun;
    this.createTrackedTween({targets:panel,y:H/2,alpha:1,duration:380,delay:100,ease:'Cubic.easeOut',onComplete:()=>{
      const ready=()=>{
        if(this._cleanupDone||this._driveRun!==run||this.state!=='summary'||!button.scene)return;
        if(this.keys?.SPACE?.isDown||this.keys?.ENTER?.isDown){this.time.delayedCall(80,ready);return;}
        this.summaryReady=true;button.setAlpha(1);bt.setAlpha(1);button.setInteractive({useHandCursor:true});
      };ready();
    }});
    button.on('pointerover',()=>button.setFillStyle(0x4a3b2d));button.on('pointerout',()=>button.setFillStyle(0x302a25));
    button.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation?.();if(!(p.button>0)&&this.summaryReady)this.leaveScene();});
  },
  leaveScene(){
    if(this.state!=='summary'||!this.summaryReady||!this.applied||!this.outcome||this.settlementError)return;
    this.state='leaving';const run=this._driveRun;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,async()=>{
      if(!this.sys.isActive()||this._driveRun!==run||this._cleanupDone)return;
      try{
        const moved=await this.goto(this.destination,{...(this.driveData.nextData||{}),fromRoadTrip:true,
          roadTripTownId:this.quote.toId,roadTripOutcome:this.outcome,roadTripId:this.tripId});
        if(!moved)throw new Error('The destination scene could not be opened.');
      }catch(error){
        console.error('[DriveScene] Destination failed:',error);
        if(this.sys.isActive()&&!this._cleanupDone&&this._driveRun===run){this.state='summary';this.uiHeld=false;this.cameras.main.fadeIn(220,0,0,0);}
      }
    });this.cameras.main.fadeOut(450,0,0,0);
  },
  onSceneShutdown(){
    this.ready=false;this.disposeDriveRuntime();this.restoreTravelUi();
    this.objects=[];this.drops=[];this.clouds=[];this._rainParticles=[];
    this._rainStreaks=null;this.wiper=null;this._roadWarning=null;this._driveButtons=[];
    this.pendingFine=null;this.settlementError=null;this._settlementPanel=null;
  }
};
