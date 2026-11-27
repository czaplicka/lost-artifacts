import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from '../archiveMissingReportService.js';
import { getScoreManager } from '../managers/InvestigationManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { hasAgencyFieldManual } from '../managers/AgencyManualService.js';
import { openAgencyFieldManual,isAgencyManualOpen,closeAgencyFieldManual } from '../ui/AgencyManualReader.js';
import { createAlarmState,restoreAlarmState,buildAlarmSolution,applyAlarmAction,removeAlarmScrew,describeAlarmAction } from './alarm/AlarmPanelModel.js';
import { AlarmPanelHelpController } from './alarm/AlarmPanelHelpController.js';
const WRONG_LINES=[__dialogueText("scenes/AlarmPanelScene.js", "t_1de5caa323000665077c"),__dialogueText("scenes/AlarmPanelScene.js", "t_c3fed8f4e21449816925"),__dialogueText("scenes/AlarmPanelScene.js", "t_9796d1091456c184c413"),__dialogueText("scenes/AlarmPanelScene.js", "t_8ad5f80bd7837b91a668")];
const LEAFLET_TITLE=__dialogueText("scenes/AlarmPanelScene.js", "t_894e75a7c2d37f22aef6");
// Only hardware facts for THIS device. How to begin and how to leave live in the Agency Field Manual, buried on purpose.
const LEAFLET_TEXT=[
  __dialogueText("scenes/AlarmPanelScene.js", "t_55f471ae55cca4d4d0cb"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_e3b07af252daaa4e7598"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_0564bfa3825bbdf70eb3"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_ea133d95fc7eb7514cfb"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_4aac091fd141fa709c9f"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_5bec949e6f2d87d94af1"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_38feff6b81ae99532ae8"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_6d1bd0a3224a36165b81"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_7b77b3c7511b2a89e10c"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_45d679db19f7a1344bf3"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_af83182d50960b326c93"),
  '',
  __dialogueText("scenes/AlarmPanelScene.js", "t_621bdb05122d793df996"),
  __dialogueText("scenes/AlarmPanelScene.js", "t_5781d9c4635129e8f333")
].join('\n');
export class AlarmPanelScene extends BaseScene{
  constructor(){super({key:'AlarmPanelScene'});}
  init(data={}){
    this.preview=data.preview===true;this.mode=data.mode==='gordon_door'?'gordon_door':'museum_log';
    this.contextId=this.mode==='gordon_door'?'gordon_door':data.contextId??gameState.currentCaseId??null;
    this.returnSceneKey=data.returnSceneKey??data.returnScene??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.eventLog=this.mode==='museum_log'&&Array.isArray(data.eventLog)?data.eventLog.filter(line=>typeof line==='string'):[];
    this.bonusClue=this.mode==='museum_log'?(data.bonusClue??null):null;
    this.storageKey=`service_panel:${this.mode}:${this.contextId??'preview'}`;
    this.stateData=null;this.controls=new Map();this.dipKnobs={};this.screws=[];this.manual=null;
    this.hardwareAnimating=false;this.finished=false;this.resolved=false;this.closing=false;this.savedOk=null;
    this.layerStates=[];this.parentPausedByMe=false;this.resultTimers=[];
    this.caseKey=this.mode==='gordon_door'?'holly_missing_husband':String(this.contextId??'preview');this.stationId=this.mode;this.evidenceConfig={id:this.storageKey};
  }
  create(){
    super.create();this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.allowed=this.preview||(this.mode==='gordon_door'?getCompletedAgencyCaseCount()>=7&&MainStoryManager.hasFlag('gordon_dismissal_heard'):this.contextId!==null);
    if(!this.preview&&this.allowed)this.stateData=restoreAlarmState(MainStoryManager.getSideClue(this.storageKey));
    this.stateData??=createAlarmState({serial:String(Phaser.Math.Between(0,99999)).padStart(5,'0'),firmware:Phaser.Utils.Array.GetRandom([__dialogueText("scenes/AlarmPanelScene.js", "t_83a484db31c2f3433f50"),__dialogueText("scenes/AlarmPanelScene.js", "t_53729ef595549a940654")]),sensorsTripped:Phaser.Math.Between(2,5)});
    this.finished=this.stateData.solved;this.resolved=!this.allowed;this.root=this.add.container(0,0);
    this.root.add(this.add.rectangle(720,500,1440,1000,0x000000,0.65));
    this.label(720,55,this.mode==='gordon_door'?__dialogueText("scenes/AlarmPanelScene.js", "t_503dfb41a4c621470333"):__dialogueText("scenes/AlarmPanelScene.js", "t_19ccd87f0d8bd31647e8"),22,'#ffd75e','PressStart2P');
    this.hud=this.label(720,108,'',19,'#c2d2b4');
    this.panel=this.add.rectangle(720,460,1040,670,0x858c8b).setStrokeStyle(5,0x323d39);this.root.add(this.panel);
    this.root.add(this.add.rectangle(720,253,940,174,0x10251a).setStrokeStyle(4,0x253f2a));
    this.displayText=this.add.text(270,180,'',{fontFamily:'SpecialElite, monospace',fontSize:'25px',color:'#a5f3b3',wordWrap:{width:900},lineSpacing:5});this.root.add(this.displayText);
    this.root.add(this.add.text(280,373,__dialogueText("scenes/AlarmPanelScene.js", "t_6bdd39aedadeb040e349"),{fontFamily:'PressStart2P',fontSize:'14px',color:'#17271e'}));
    for(let i=0;i<5;i++){
      const led=this.add.circle(445+i*85,382,15,i<this.stateData.sensorsTripped?0xd54d42:0x402821).setStrokeStyle(3,0x29382b);this.root.add(led);
      if(i<this.stateData.sensorsTripped)this.createTrackedTween({targets:led,alpha:0.45,duration:600,yoyo:true,repeat:-1,delay:i*90});
    }
    [['TEST',0xb48e42],['MEM',0xb48e42],['RESET',0xa44f43],['ENTER',0x39784e]].forEach(([id,color],index)=>this.makeControl(420+index*200,475,id,color));
    this.root.add(this.add.text(280,562,__dialogueText("scenes/AlarmPanelScene.js", "t_5d4d18f32f245459a56a"),{fontFamily:'PressStart2P',fontSize:'13px',color:'#17271e'}));
    for(let id=1;id<=4;id++)this.makeDip(355+(id-1)*110,650,id);
    this.sticker=this.add.text(990,650,`${__dialogueText("scenes/AlarmPanelScene.js", "t_30dac6bddc5f3830bf4c")}${this.stateData.serial}`,{fontFamily:'SpecialElite',fontSize:'28px',color:'#332d23',backgroundColor:'#e8dfc5',padding:{x:14,y:12}}).setOrigin(0.5).setAngle(-4).setVisible(this.stateData.coverOpen);this.root.add(this.sticker);
    this.cover=this.add.rectangle(990,650,280,126,0x69736f).setStrokeStyle(4,0x35443b).setInteractive({useHandCursor:true});this.root.add(this.cover);
    this.cover.on('pointerdown',()=>{if(this.canOperate())this.setMessage(__dialogueText("scenes/AlarmPanelScene.js", "t_a1fb3b6be7d18c045a08"));});
    [[875,609],[1105,691]].forEach(([x,y],id)=>{
      const screw=this.add.text(x,y,__dialogueText("scenes/AlarmPanelScene.js", "t_a318c24216defe206fee"),{fontFamily:'SpecialElite',fontSize:'40px',color:'#17271e'}).setOrigin(0.5).setAngle(45).setInteractive({useHandCursor:true});this.root.add(screw);screw.on('pointerdown',()=>this.removeScrew(id));this.screws.push(screw);
    });
    this.root.add(this.add.text(280,756,__dialogueText("scenes/AlarmPanelScene.js", "t_e3c893a9150bd6ce867d"),{fontFamily:'SpecialElite',fontSize:'18px',color:'#26352b'}));
    this.message=this.label(720,842,'',23,'#ffedb9');this.message.setWordWrapWidth(1260);
    this.continueButton=this.makeUiButton(155,932,this.mode==='gordon_door'?__dialogueText("scenes/AlarmPanelScene.js", "t_146926aaed56cac74d32"):__dialogueText("scenes/AlarmPanelScene.js", "t_ef608c2972d56fd61380"),()=>this.closePanel());this.continueButton.setVisible(this.finished);
    this.makeUiButton(475,932,__dialogueText("scenes/AlarmPanelScene.js", "t_3ce07cf95e3e1d77af94"),()=>this.toggleManual());
    this.agencyManualButton=this.makeUiButton(755,932,__dialogueText("scenes/AlarmPanelScene.js", "t_d6b57c72a54e37961c3e"),()=>this.openAgencyManual());
    this.makeUiButton(1290,932,'BACK',()=>this.closePanel());
    this.help=new AlarmPanelHelpController(this);this.help.create();
    this.refreshPanel();this.layout();
    if(this.finished)this.displayResult();else this.setMessage(this.allowed?__dialogueText("scenes/AlarmPanelScene.js", "t_d83a247cb91814858978"):__dialogueText("scenes/AlarmPanelScene.js", "t_dca1007053b143ee036e"));
    this.trackInputEvent(this.scale,'resize',this.layout);
    this.onBus('inventoryUpdated',()=>this.refreshManualAvailability());
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{
      if(event.repeat)return;if(this.help.modal)this.help.close();else if(this.manual)this.toggleManual();else this.closePanel();
    });
    this.suspendBackground();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      closeAgencyFieldManual();this.resultTimers.forEach(timer=>timer.remove(false));this.help?.destroy();this.restoreBackground();this.onFinished=null;
    });this.persist();
  }
  label(x,y,text,size=23,color='#eee5cf',font='SpecialElite'){
    const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1300}}).setOrigin(0.5);this.root.add(object);return object;
  }
  makeUiButton(x,y,label,callback){
    const button=this.add.text(x,y,label,{fontFamily:'SpecialElite',fontSize:'21px',color:'#ffe0a2',backgroundColor:'#234333',padding:{x:15,y:13}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    button.on('pointerdown',()=>{if(!this.closing&&!this.manual&&!this.hardwareAnimating&&!isAgencyManualOpen())callback();});this.root.add(button);return button;
  }
  canOperate(){return this.allowed&&!this.finished&&!this.closing&&!this.manual&&!this.hardwareAnimating&&!this.help?.modal&&!isAgencyManualOpen();}
  playSfx(key){if(this.cache.audio.exists(key))this.sound.play(key);}
  makeControl(x,y,id,color){
    const box=this.add.rectangle(x,y,168,72,color).setStrokeStyle(4,0x26382d).setInteractive({useHandCursor:true});
    const label=this.add.text(x,y,id,{fontFamily:'PressStart2P',fontSize:'18px',color:'#fff3d1'}).setOrigin(0.5);this.root.add([box,label]);this.controls.set(id,{box,label});
    box.on('pointerdown',()=>{if(this.canOperate()){this.playSfx('click_sound');this.handleAction({type:'button',id});}});
  }
  makeDip(x,y,id){
    this.root.add(this.add.text(x,y-74,String(id),{fontFamily:'PressStart2P',fontSize:'17px',color:'#17271e'}).setOrigin(0.5));
    this.root.add(this.add.rectangle(x,y,50,110,0x26352e).setStrokeStyle(3,0x14241c));
    const knob=this.add.rectangle(x,y+26,42,40,0xd9d9c9).setStrokeStyle(3,0x566456).setInteractive({useHandCursor:true});this.root.add(knob);this.dipKnobs[id]={knob,baseY:y};
    knob.on('pointerdown',()=>{if(!this.canOperate())return;this.playSfx('click_sound');if(id>=3){this.setMessage(`${__dialogueText("scenes/AlarmPanelScene.js", "t_c0343432731d5c1c132e")}${id}${__dialogueText("scenes/AlarmPanelScene.js", "t_3044b7474c640561bd9a")}`);return;}this.handleAction({type:'dip',id,state:!this.stateData.dipStates[id]});});
  }
  score(delta,label){if(this.preview)return 0;const manager=getScoreManager(),before=manager.getSessionPoints();manager.addScoreEvent(delta,label);return manager.getSessionPoints()-before;}
  handleAction(action){
    if(!this.canOperate())return;const result=applyAlarmAction(this.stateData,action);this.stateData=result.state;
    if(result.won){this.onWin();return;}
    if(result.accepted){this.playSfx('sfx_ok');this.setMessage(`${__dialogueText("scenes/AlarmPanelScene.js", "t_474a987f3bbe57fed43b")}${this.stateData.progress}${__dialogueText("scenes/AlarmPanelScene.js", "t_8a5edab282632443219e")}${buildAlarmSolution(this.stateData).length}${__dialogueText("scenes/AlarmPanelScene.js", "t_ea3d55e0c3fb0a24241a")}`);}
    if(result.mistake){const delta=this.score(-50,__dialogueText("scenes/AlarmPanelScene.js", "t_52a86168527ef967e8f0"));this.playSfx('sfx_buzz');this.cameras.main.shake(120,0.004);
      this.setMessage(Phaser.Utils.Array.GetRandom(WRONG_LINES)+(this.preview?__dialogueText("scenes/AlarmPanelScene.js", "t_4eff3a85472946047f2b"):`${__dialogueText("scenes/AlarmPanelScene.js", "t_4f5a2ada1166172aa174")}${delta}${__dialogueText("scenes/AlarmPanelScene.js", "t_a5114d581c6e917458eb")}`)+(result.reset?__dialogueText("scenes/AlarmPanelScene.js", "t_b35e66353b5bec9820fe"):''));}
    this.refreshPanel();this.persist();
  }
  removeScrew(id){
    if(!this.canOperate()||this.stateData.removedScrews.includes(id))return;const result=removeAlarmScrew(this.stateData,id);if(!result.changed)return;
    this.stateData=result.state;this.hardwareAnimating=true;const screw=this.screws[id];screw.disableInteractive();this.playSfx('sfx_screw');this.persist();
    this.createTrackedTween({targets:screw,angle:405,alpha:0,duration:350,onComplete:()=>{
      screw.setVisible(false);this.hardwareAnimating=false;
      if(this.stateData.coverOpen){this.hardwareAnimating=true;this.createTrackedTween({targets:this.cover,x:1180,angle:14,alpha:0,duration:420,onComplete:()=>{this.hardwareAnimating=false;this.refreshPanel();this.setMessage(`${__dialogueText("scenes/AlarmPanelScene.js", "t_973ac2f9aa43f84af2e9")}${this.stateData.serial}${__dialogueText("scenes/AlarmPanelScene.js", "t_90a36e32c7ce64e004a8")}`);}});}
      else{this.refreshPanel();this.setMessage(__dialogueText("scenes/AlarmPanelScene.js", "t_21b6bf98c1e5ff0b99a5"));}
    }});
  }
  refreshManualAvailability(){this.agencyManualButton?.setAlpha(hasAgencyFieldManual()?1:0.6);}
  refreshPanel(){
    const state=this.stateData;this.hud.setText(this.preview?`${__dialogueText("scenes/AlarmPanelScene.js", "t_09ffca79d35fcb841f50")}${state.strikes}`:`${__dialogueText("scenes/AlarmPanelScene.js", "t_8781558c8f9241d9bc6c")}${Number(gameState.score||0)}${__dialogueText("scenes/AlarmPanelScene.js", "t_8d6b255d593adae5b06e")}${state.strikes}`);
    if(!this.finished)this.displayText.setText(`${__dialogueText("scenes/AlarmPanelScene.js", "t_01fe26df4c2586e8137a")}${state.firmware}${__dialogueText("scenes/AlarmPanelScene.js", "t_1af9f07b32ceb55c43b6")}${state.sensorsTripped}${__dialogueText("scenes/AlarmPanelScene.js", "t_916478a253862e780d2a")}${state.coverOpen?state.serial:__dialogueText("scenes/AlarmPanelScene.js", "t_ea2e91ca910f38315a03")}`);
    for(const[id,{knob,baseY}]of Object.entries(this.dipKnobs))knob.setY(baseY+(state.dipStates[id]?-26:26));
    if(!this.hardwareAnimating){
      this.cover.setPosition(990,650).setAngle(0).setAlpha(1).setVisible(!state.coverOpen);if(this.cover.input)this.cover.input.enabled=!state.coverOpen;
      this.sticker.setVisible(state.coverOpen);this.screws.forEach((screw,id)=>{const present=!state.removedScrews.includes(id);screw.setVisible(present).setAlpha(1);if(screw.input)screw.input.enabled=present&&!this.finished;});
    }this.refreshManualAvailability();
  }
  persist(){
    if(this.preview||!this.allowed)return;MainStoryManager.setSideClue(this.storageKey,JSON.parse(JSON.stringify(this.stateData)));
    if(this.mode==='gordon_door'&&this.stateData.solved)MainStoryManager.setFlag('gordon_door_access_bypassed',true);this.savedOk=saveGameState();
  }
  onWin(){
    this.finished=true;let delta=0;
    if(!this.stateData.rewardClaimed&&!this.preview){delta=this.score(200,this.mode==='gordon_door'?__dialogueText("scenes/AlarmPanelScene.js", "t_59337fac3abbd084b760"):__dialogueText("scenes/AlarmPanelScene.js", "t_801e114de0834b99023c"));this.stateData.rewardClaimed=true;}
    this.persist();this.playSfx('sfx_success');this.refreshPanel();this.displayResult();
    this.setMessage(this.mode==='gordon_door'?`${__dialogueText("scenes/AlarmPanelScene.js", "t_38ed31f8c15d7ab968ee")}${this.preview?__dialogueText("scenes/AlarmPanelScene.js", "t_b3db142c293cd42299e1"):`${__dialogueText("scenes/AlarmPanelScene.js", "t_c13f23cc27f966a4eadf")}${delta}${__dialogueText("scenes/AlarmPanelScene.js", "t_7337a9dc3fa258737db2")}`}${__dialogueText("scenes/AlarmPanelScene.js", "t_bf49ec99a89a584ba22c")}`:`${__dialogueText("scenes/AlarmPanelScene.js", "t_f5797c09d8c7240440f8")}${this.preview?__dialogueText("scenes/AlarmPanelScene.js", "t_b3db142c293cd42299e1"):`${__dialogueText("scenes/AlarmPanelScene.js", "t_c13f23cc27f966a4eadf")}${delta}${__dialogueText("scenes/AlarmPanelScene.js", "t_7337a9dc3fa258737db2")}`}`);
  }
  displayResult(){
    this.help.hintButton?.setVisible(false);this.continueButton.setVisible(true);
    if(this.mode==='gordon_door'){this.displayText.setText(__dialogueText("scenes/AlarmPanelScene.js", "t_b1769b980948dc2ab5bb"));return;}
    const lines=this.eventLog.length?this.eventLog:[__dialogueText("scenes/AlarmPanelScene.js", "t_3303f3624ab0e3018055")];this.displayText.setFontSize(20).setText(__dialogueText("scenes/AlarmPanelScene.js", "t_73c9d7dd109dde8e5118"));
    lines.slice(0,4).forEach((line,index)=>this.resultTimers.push(this.time.delayedCall(350*(index+1),()=>this.displayText.setText([__dialogueText("scenes/AlarmPanelScene.js", "t_73c9d7dd109dde8e5118"),...lines.slice(0,index+1)].join(__dialogueText("scenes/AlarmPanelScene.js", "t_01ba4719c80b6fe911b0"))))));
  }
  openAgencyManual(){
    // No chapter id on purpose: the book opens on its cover / bookmark and the player has to find the pages themselves.
    const result=openAgencyFieldManual('overview',{ownerScene:this});if(!result.ok)this.setMessage(result.message);
  }
  toggleManual(){
    if(this.manual){this.manual.destroy(true);this.manual=null;return;}
    if(this.closing||this.hardwareAnimating||this.help?.modal||isAgencyManualOpen())return;
    const panel=this.add.container(0,0);this.manual=panel;this.root.add(panel);
    const shade=this.add.rectangle(720,500,1440,1000,0x000000,0.82).setInteractive();shade.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());panel.add(shade);
    panel.add(this.add.rectangle(720,495,1260,850,0xf1ead8).setStrokeStyle(4,0x8a7f5c));
    // Faint coffee ring, because every leaflet has one.
    panel.add(this.add.circle(1080,700,62,0x000000,0).setStrokeStyle(7,0x8a6a3a,0.18));
    panel.add(this.add.text(145,98,LEAFLET_TITLE,{fontFamily:'PressStart2P, monospace',fontSize:'19px',color:'#173527'}));
    const body=this.add.text(145,150,LEAFLET_TEXT,{fontFamily:'SpecialElite, monospace',fontSize:'23px',color:'#2b2b2b',wordWrap:{width:1150},lineSpacing:4});
    // Shrink the leaflet until it fits above the close button.
    for(let size=23;body.height>660&&size>13;size--)body.setFontSize(size);
    panel.add(body);
    const close=this.add.text(720,862,__dialogueText("scenes/AlarmPanelScene.js", "t_ae3f92be986d344110da"),{fontFamily:'SpecialElite',fontSize:'25px',color:'#ffe2a1',backgroundColor:'#234333',padding:{x:20,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();this.toggleManual();});panel.add(close);this.playSfx('sfx_paper');
  }
  getForensicHelp(){
    const state=this.stateData,instructions=__dialogueText("scenes/AlarmPanelScene.js", "t_86d06d476c9ba76288bd");
    if(!state.coverOpen){const id=[0,1].find(id=>!state.removedScrews.includes(id));return{id:`cover_screw_${id}`,instructions,text:__dialogueText("scenes/AlarmPanelScene.js", "t_17847b7b674eb9f24ba0"),targets:[this.screws[id]].filter(Boolean)};}
    const next=buildAlarmSolution(state)[state.progress];if(!next)return{id:'complete',instructions,text:__dialogueText("scenes/AlarmPanelScene.js", "t_c6df8bed6809e299f8c4"),targets:[this.continueButton]};
    const odd=Number(state.serial.slice(-1))%2===1;
    return{id:`sequence_step_${state.progress}`,instructions,text:`${__dialogueText("scenes/AlarmPanelScene.js", "t_30dac6bddc5f3830bf4c")}${state.serial}${__dialogueText("scenes/AlarmPanelScene.js", "t_c8268ab94f518793d14f")}${odd?__dialogueText("scenes/AlarmPanelScene.js", "t_ca60f1b27e0ab789535d"):__dialogueText("scenes/AlarmPanelScene.js", "t_fa4bdd62c30f1e059be7")}${__dialogueText("scenes/AlarmPanelScene.js", "t_914d13c9c6e425928290")}${state.firmware}${__dialogueText("scenes/AlarmPanelScene.js", "t_0a2d3f8f9b727cf73e6c")}${state.sensorsTripped}${__dialogueText("scenes/AlarmPanelScene.js", "t_8e9f94cd0188b0e72ada")}${describeAlarmAction(next)}${__dialogueText("scenes/AlarmPanelScene.js", "t_36a9e7f1c95b82ffb997")}`+(state.sensorsTripped>3?__dialogueText("scenes/AlarmPanelScene.js", "t_36f662648e52affa03a9"):__dialogueText("scenes/AlarmPanelScene.js", "t_9659c3e1a402c8a12eba")),targets:[next.type==='dip'?this.dipKnobs[next.id]?.knob:this.controls.get(next.id)?.box].filter(Boolean)};
  }
  setMessage(text){this.message.setText(text).setFontSize(23);}
  setDialogue(text){this.message.setText(`${__dialogueText("scenes/AlarmPanelScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(20);}
  layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1440,height/1000);this.root.setScale(s).setPosition((width-1440*s)/2,(height-1000*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
  }
  closePanel(){
    if(this.closing)return;this.closing=true;closeAgencyFieldManual();this.help?.close();this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk,mode:this.mode,eventLog:[...this.eventLog],bonusClue:this.bonusClue});}finally{this.scene.stop();}
  }
}