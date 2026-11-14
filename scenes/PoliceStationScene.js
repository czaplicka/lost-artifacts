import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  PoliceStationScene as ExistingPoliceStationScene,
  hasCompletedPolicePIQuest
} from './PoliceStationBaseScene.js';
import { ColdCaseUI } from '../ui/ColdCaseUI.js';
import { audioManager } from '../managers/AudioManager.js';
import { addPoliceWorldReactionOption } from '../ui/WorldPoliceReactionHooks.js';

export { hasCompletedPolicePIQuest };

const AMBIENT_KEY='sfx_home_police_ambient';

export class PoliceStationScene extends ExistingPoliceStationScene {
  init(data){
    super.init(data);
    this.coldCaseUI=null;this.coldCaseLoading=false;this.coldCaseAbort=null;this.stationAmbient=null;
  }
  preload(){
    super.preload();
    if(!this.cache.audio.exists(AMBIENT_KEY))this.load.audio(AMBIENT_KEY,'assets/audio/police.mp3');
  }
  create(){
    super.create();audioManager.init(this);this.startStationAudio();
    this.events.on('wake',this.startStationAudio,this);
    this.events.on('resume',this.startStationAudio,this);
    this.events.on('sleep',this.stopStationAudio,this);
    this.events.on('pause',this.stopStationAudio,this);
  }
  startStationAudio(){
    if(this.disposed||this.navigating||!this.sys.isActive())return;
    audioManager.init(this);
    if(this.stationAmbient?.isPlaying)return;
    this.stationAmbient=audioManager.playAmbient(AMBIENT_KEY,{volume:audioManager.getSfxVolume()*0.28,loop:true});
  }
  stopStationAudio(){
    if(this.stationAmbient)audioManager.releaseSound(this.stationAmbient);
    this.stationAmbient=null;
  }
  canInteract(){return !this.coldCaseUI&&!this.coldCaseLoading&&super.canInteract();}
  showDialogue(id){
    super.showDialogue(id);
    if(!['start','topics'].includes(id)||!this.panel)return;
    const choices=this.panel.querySelector(__dialogueText("scenes/PoliceStationScene.js", "t_e0620ac96572cb04b764"));
    if(!choices||!choices.textContent.includes(__dialogueText("scenes/PoliceStationScene.js", "t_2b687db6298b629d3bcb")))return;
    if(!choices.querySelector('[data-cold-case]')){
      const button=this.makeButton(__dialogueText("scenes/PoliceStationScene.js", "t_05d7c1b8a60634bd05ca"),()=>void this.openColdCase(),this.dialogueVersion);
      button.dataset.coldCase='true';choices.prepend(button);
    }
    addPoliceWorldReactionOption(this,id,{canTalk:hasCompletedPolicePIQuest});
  }
  async openColdCase(){
    if(this.disposed||this.navigating||this.coldCaseUI||this.coldCaseLoading)return;
    this.coldCaseLoading=true;this.coldCaseAbort=new AbortController();
    const token=this.runToken;
    this.showPanel(__dialogueText("scenes/PoliceStationScene.js", "t_832bb16aeb9f95e761e9"),__dialogueText("scenes/PoliceStationScene.js", "t_781e2a2e6d63abb978cc"),[]);
    try{
      const response=await fetch('assets/data/cold-cases/last-gnome-standing.json',{signal:this.coldCaseAbort.signal});
      if(!response.ok)throw new Error(`Case file: HTTP ${response.status}`);
      const data=await response.json();
      if(this.disposed||this.runToken!==token)return;
      this.coldCaseLoading=false;this.closePanel();
      this.coldCaseUI=new ColdCaseUI(this,data,()=>{
        this.coldCaseUI=null;
        if(!this.disposed){this.refreshDebug();this.showDialogue('topics');}
      });
      this.refreshDebug();
    }catch(error){
      if(error.name==='AbortError'||this.disposed||this.runToken!==token)return;
      console.error('[ColdCase]',error);this.coldCaseLoading=false;
      this.showPanel(__dialogueText("scenes/PoliceStationScene.js", "t_b3b9efed9c4da3133e7b"),__dialogueText("scenes/PoliceStationScene.js", "t_ba150429d84dbbd5aa3b"),[
        [__dialogueText("scenes/PoliceStationScene.js", "t_a0c2cc1374d949943e01"),()=>void this.openColdCase()],
        [__dialogueText("scenes/PoliceStationScene.js", "t_4dc8c24acdcd1c8ebb19"),()=>this.showDialogue('topics')]
      ]);
    }finally{if(this.runToken===token)this.coldCaseLoading=false;}
  }
  onKey(event){
    if(this.coldCaseUI){
      if(event.code===__dialogueText("scenes/PoliceStationScene.js", "t_037c968467aa3fd7c059")){event.preventDefault();if(!event.repeat)this.coldCaseUI.escape();}
      return;
    }
    if(this.coldCaseLoading)return;
    super.onKey(event);
  }
  async leave(){
    if(this.coldCaseUI||this.coldCaseLoading||this.disposed||this.navigating)return false;
    this.stopStationAudio();
    try{return await super.leave();}
    finally{if(!this.disposed&&!this.navigating&&this.sys.isActive())this.startStationAudio();}
  }
  disposePolice(){
    this.stopStationAudio();
    this.events.off('wake',this.startStationAudio,this);
    this.events.off('resume',this.startStationAudio,this);
    this.events.off('sleep',this.stopStationAudio,this);
    this.events.off('pause',this.stopStationAudio,this);
    this.coldCaseAbort?.abort();this.coldCaseUI?.destroy(false);this.coldCaseUI=null;
    super.disposePolice();
  }
}
