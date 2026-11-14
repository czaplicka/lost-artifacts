import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { reflexAccepted,medicalNeedle,recordMedicalHit } from './MedicalReviewModel.js';
export class MedicalTestsController{
  constructor(scene,data){this.scene=scene;this.data=data;this.layer=null;this.kind=null;this.held=false;this.focused=true;this.phase='wait';this.elapsed=0;this.cycle=0;this.hold=0;this.cooldown=0;
    this.keyDown=e=>this.onKey(e);this.keyUp=e=>{if(e.code===__dialogueText("scenes/medical/MedicalTestsController.js", "t_20eac5aae274985fd886"))this.release();};this.pointerUp=()=>this.release();
    this.updateBound=(time,delta)=>this.update(delta);this.blur=()=>{this.focused=false;this.release();};this.focus=()=>{this.focused=true;this.resetRound();};this.visibility=()=>{if(document.hidden)this.blur();else this.focus();};}
  get isOpen(){return Boolean(this.layer);}
  open(kind){
    if(this.isOpen||this.scene.modal||!['reflex','coordination'].includes(kind))return;
    this.kind=kind;this.layer=this.scene.add.container(0,0);this.scene.root.add(this.layer);this.scene.modal=this.layer;this.scene.tooltip?.setVisible(false);
    this.scene.input.keyboard?.on('keydown',this.keyDown);this.scene.input.keyboard?.on('keyup',this.keyUp);this.scene.input.on('pointerup',this.pointerUp);this.scene.events.on('update',this.updateBound);
    window.addEventListener('blur',this.blur);window.addEventListener('focus',this.focus);document.addEventListener('visibilitychange',this.visibility);
    this.focused=!document.hidden;this.resetRound();this.render();
  }
  text(x,y,value,size=24,width=1120){const text=this.scene.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:`${size}px`,color:'#eee0bf',align:'center',wordWrap:{width},lineSpacing:5}).setOrigin(0.5);this.layer.add(text);return text;}
  button(x,y,label,callback){const button=this.scene.add.text(x,y,label,{fontFamily:'SpecialElite',fontSize:'23px',color:'#ffe2a0',backgroundColor:'#31503a',padding:{x:16,y:10}}).setOrigin(0.5).setInteractive({useHandCursor:true});button.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation();if(this.isOpen)callback();});this.layer.add(button);return button;}
  resetRound(){this.phase='wait';this.elapsed=0;this.cycle=0;this.hold=0;this.held=false;this.cooldown=500;this.waitMs=Phaser.Math.Between(1200,2600);if(this.lamp?.active)this.lamp.setFillStyle(0x804339);if(this.signal?.active)this.signal.setText(__dialogueText("scenes/medical/MedicalTestsController.js", "t_4f618185f2ea52536359"));}
  render(){
    this.layer.removeAll(true);const shade=this.scene.add.rectangle(688,384,1376,768,0x000000,0.86).setInteractive();shade.on('pointerdown',(p,x,y,e)=>e?.stopPropagation());this.layer.add(shade);
    this.layer.add(this.scene.add.rectangle(688,420,1220,585,0x14281e).setStrokeStyle(3,0xa58c56));
    this.text(688,168,this.kind==='reflex'?__dialogueText("scenes/medical/MedicalTestsController.js", "t_c34e35601fac46daef9a"):__dialogueText("scenes/medical/MedicalTestsController.js", "t_784d2c05b8e4848215cf"),25);this.button(1190,168,'CLOSE',()=>this.close());
    this.text(688,242,this.kind==='reflex'?__dialogueText("scenes/medical/MedicalTestsController.js", "t_685ef1ca6ddc93864ea5"):__dialogueText("scenes/medical/MedicalTestsController.js", "t_1447514da10c80ff7f90"),23);
    this.counter=this.text(688,308,'',24);
    if(this.scene.progress[this.kind]>=this.data.rounds){this.text(688,440,__dialogueText("scenes/medical/MedicalTestsController.js", "t_08dccf12dc5a2c044b8e"),31);this.button(688,590,__dialogueText("scenes/medical/MedicalTestsController.js", "t_f6a58363856de930519a"),()=>this.close());return;}
    if(this.kind==='reflex'){
      this.lamp=this.scene.add.circle(688,420,65,0x804339);this.layer.add(this.lamp);this.signal=this.text(688,420,'WAIT',27);
      this.button(688,595,__dialogueText("scenes/medical/MedicalTestsController.js", "t_8c08bb6293832b518258"),()=>this.react());
    }else{
      this.layer.add(this.scene.add.rectangle(688,420,720,36,0x07160d).setStrokeStyle(2,0xa58c56));
      const width=this.scene.progress.slow?this.data.slowZoneWidth:this.data.zoneWidth;
      this.layer.add(this.scene.add.rectangle(688,420,720*width,36,0xc8aa62));this.needle=this.scene.add.rectangle(328,420,6,66,0xffffff);this.layer.add(this.needle);
      this.holdText=this.text(688,490,__dialogueText("scenes/medical/MedicalTestsController.js", "t_9f9c9ce17d4fcaa3ebe1"),23);
      this.button(688,595,__dialogueText("scenes/medical/MedicalTestsController.js", "t_6b997baf26f0c90d53fb"),()=>{if(this.cooldown<=0&&this.focused)this.held=true;});
    }
    this.notice=this.text(688,535,__dialogueText("scenes/medical/MedicalTestsController.js", "t_700df7b2e6b8188f0da9"),20);
    this.button(1090,660,this.scene.progress.slow?__dialogueText("scenes/medical/MedicalTestsController.js", "t_312f7c7cff02ae7b9e38"):__dialogueText("scenes/medical/MedicalTestsController.js", "t_b662226023239e326897"),()=>{this.scene.progress.slow=!this.scene.progress.slow;this.scene.persist();this.resetRound();this.render();});
  }
  release(){this.held=false;this.hold=0;}
  onKey(event){if(!this.isOpen||event.repeat||event.ctrlKey||event.metaKey||event.code!==__dialogueText("scenes/medical/MedicalTestsController.js", "t_20eac5aae274985fd886"))return;event.preventDefault();if(this.kind==='reflex')this.react();else if(this.cooldown<=0&&this.focused)this.held=true;}
  react(){
    if(!this.isOpen||this.kind!=='reflex'||this.cooldown>0||!this.focused||this.scene.progress.reflex>=this.data.rounds)return;
    const windowMs=this.scene.progress.slow?this.data.slowReflexWindowMs:this.data.reflexWindowMs;
    if(this.phase==='go'&&reflexAccepted(this.elapsed,windowMs))this.win();
    else{this.resetRound();this.notice?.setText(__dialogueText("scenes/medical/MedicalTestsController.js", "t_adab2685bfcb25a9f226"));}
  }
  win(){this.scene.progress=recordMedicalHit(this.data,this.scene.progress,this.kind);this.scene.persist();this.scene.refreshReview();this.resetRound();this.render();}
  update(delta){
    if(!this.isOpen||!this.focused||this.scene.closing||this.scene.progress[this.kind]>=this.data.rounds)return;
    const dt=Math.max(0,Math.min(Number(delta)||0,100));this.counter?.setText(`${__dialogueText("scenes/medical/MedicalTestsController.js", "t_7d3b8caecc36e2a20b9e")}${this.scene.progress[this.kind]}${__dialogueText("scenes/medical/MedicalTestsController.js", "t_005e1574a2b5c8163046")}${this.data.rounds}`);
    if(this.cooldown>0){this.cooldown=Math.max(0,this.cooldown-dt);return;}
    if(this.kind==='reflex'){
      this.elapsed+=dt;
      if(this.phase==='wait'){this.lamp?.setFillStyle(0x804339);this.signal?.setText(__dialogueText("scenes/medical/MedicalTestsController.js", "t_4f618185f2ea52536359"));if(this.elapsed>=this.waitMs){this.phase='go';this.elapsed=0;this.lamp?.setFillStyle(0x3a9852);this.signal?.setText(__dialogueText("scenes/medical/MedicalTestsController.js", "t_a0f949497a74dde0c63a"));}}
      else if(this.elapsed>(this.scene.progress.slow?this.data.slowReflexWindowMs:this.data.reflexWindowMs)){this.resetRound();this.notice?.setText(__dialogueText("scenes/medical/MedicalTestsController.js", "t_47532985efabe765cae6"));}
    }else{
      this.cycle+=dt;const slow=this.scene.progress.slow,pos=medicalNeedle(this.cycle,slow?this.data.slowPeriodMs:this.data.periodMs),width=slow?this.data.slowZoneWidth:this.data.zoneWidth;
      this.needle?.setX(328+720*pos);this.hold=this.held&&Math.abs(pos-0.5)<=width/2?this.hold+dt:0;
      this.holdText?.setText(`${__dialogueText("scenes/medical/MedicalTestsController.js", "t_be216ac026e7ef82fe5a")}${Math.min(100,Math.floor(100*this.hold/this.data.holdMs))}${__dialogueText("scenes/medical/MedicalTestsController.js", "t_bbf3f11cb5b43e700273")}`);
      if(this.hold>=this.data.holdMs)this.win();
    }
  }
  close(){
    if(!this.layer)return;this.scene.input.keyboard?.off('keydown',this.keyDown);this.scene.input.keyboard?.off('keyup',this.keyUp);this.scene.input.off('pointerup',this.pointerUp);this.scene.events.off('update',this.updateBound);
    window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);document.removeEventListener('visibilitychange',this.visibility);
    const layer=this.layer;this.layer=null;if(this.scene.modal===layer)this.scene.modal=null;layer.destroy(true);this.release();this.scene.lockedUntil=this.scene.time.now+180;
  }
  destroy(){this.close();}
}
