import { PigeonLoftScene as PigeonLoftBase } from './PigeonLoftScene.js';
import { getPigeonLoft } from '../managers/PigeonManager.js';
import { pigeonNeedsName, confirmPigeonName } from '../managers/PigeonNaming.js';
import { openPigeonNameInput } from '../ui/PigeonNameInput.js';
import { pigeonNamingText as t } from '../dialogues/PigeonNamingText.js';

export class PigeonLoftScene extends PigeonLoftBase {
  create(){
    this.namingSession=null;this.pigeonNameEditor=null;
    super.create();
    const cleanup=()=>{this.pigeonNameEditor?.destroy();this.pigeonNameEditor=null;this.namingSession=null;};
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
  }

  buildHud(){
    const original=this.state;
    if(!original)return super.buildHud();
    this.state={...original,birds:original.birds.map(bird=>pigeonNeedsName(bird)?{...bird,name:t('unnamed')}:bird)};
    try{return super.buildHud();}finally{this.state=original;}
  }

  showTip(label,sx,sy){
    const bird=this.state?.birds?.find(entry=>pigeonNeedsName(entry)&&label===entry.name+'  (click to talk)');
    return super.showTip(bird?t('unnamed')+'  (click to talk)':label,sx,sy);
  }

  birdOf(slot){
    const bird=super.birdOf(slot);
    return bird&&pigeonNeedsName(bird)?{...bird,name:t('unnamed')}:bird;
  }

  openBirdDialogue(slot,options={}){
    if(this.leaving||this.debugMode||this._cleanupDone||this.pigeonNameEditor)return;
    const bird=super.birdOf(slot);
    if(!bird)return super.openBirdDialogue(slot,options);
    if(this.namingSession?.id!==bird.id)this.namingSession=null;
    if(bird.status!=='flying'&&pigeonNeedsName(bird)&&!this.namingSession){
      this.namingSession={id:bird.id,slot,stage:0,renaming:false};
    }
    if(this.namingSession&&bird.status!=='flying'){
      const text=this.namingSession.stage===0?
        t(this.namingSession.renaming?'renameIntro':'intro'):t('proposal');
      return super.openBirdDialogue(slot,{...options,text});
    }
    return super.openBirdDialogue(slot,options);
  }

  birdTopics(bird){
    const session=this.namingSession;
    if(session?.id===bird.id&&bird.status!=='flying'){
      return [{id:'pigeon-name-dialogue',label:t(session.stage===0?'next':'choose'),state:'accent',onSelect:()=>{
        if(this.pigeonNameEditor||this.leaving||this._cleanupDone)return;
        if(session.stage===0){session.stage=1;this.openBirdDialogue(session.slot);}
        else this.choosePigeonName(session);
      }}];
    }
    return super.birdTopics(bird).map(topic=>topic.id==='rename'?{...topic,onSelect:()=>{
      if(this.leaving||this.debugMode||this.pigeonNameEditor)return;
      this.namingSession={id:bird.id,slot:bird.slot,stage:0,renaming:true};
      this.openBirdDialogue(bird.slot);
    }}:topic);
  }

  choosePigeonName(session){
    if(this.pigeonNameEditor||this.namingSession!==session)return;
    const bird=getPigeonLoft().birds.find(entry=>entry.id===session.id);
    if(!bird||bird.status==='flying')return;
    this.pigeonNameEditor=openPigeonNameInput(this,{
      initialValue:session.renaming?bird.name:'',
      onCancel:()=>{this.pigeonNameEditor=null;},
      onConfirm:name=>{
        if(this.leaving||this._cleanupDone||!this.sys.isActive()||this.namingSession!==session||!this.pigeonNameEditor)return {ok:false,message:t('unavailable')};
        const result=confirmPigeonName(session.id,name);
        if(!result.ok)return result;
        // Input owns its DOM cleanup; clear scene reference before redrawing.
        this.pigeonNameEditor=null;this.namingSession=null;
        this.renderLoft();
        this.openBirdDialogue(session.slot,{text:name===t('suggestion')?t('namedWatson'):t('named',{name:result.name})});
        return result;
      }
    });
  }

  closeDialogue(){
    this.pigeonNameEditor?.destroy();this.pigeonNameEditor=null;this.namingSession=null;
    return super.closeDialogue();
  }
}
