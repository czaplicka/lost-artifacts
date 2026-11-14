import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ForensicHelpController } from '../CSI/ForensicHelpController.js';
import { EventBus } from '../../EventBus.js';
import { playTypewriterAudio } from './TypewriterComparisonAudio.js';
export class TypewriterHelpController extends ForensicHelpController {
  create(){
    if(this.created||this.destroyed)return;this.created=true;
    this.hintButton=this.scene.button(960,946,'HINT',()=>this.open(false));this.buttons.push(this.hintButton);
    EventBus.on('hints:changed',this.boundRefresh);this.scene.events.on('update',this.boundUpdate);
    this.scene.events.once('shutdown',this.boundDestroy);this.scene.events.once('destroy',this.boundDestroy);
    this.scene.scale.on('resize',this.handleResize,this);this.refresh();
  }
  refresh(){if(this.scene.preview){this.hintButton?.setText(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_f3d9339f7f9eaa186ee2"));return;}super.refresh();}
  receipt(definition){return this.scene.preview?null:super.receipt(definition);}
  open(instructions=false){
    if(!this.scene.preview)return super.open(instructions);
    if(this.modal||this.busy||this.destroyed||this.scene.finished)return;
    const definition=this.definition();if(!definition)return;
    this.pause();this.panel(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_ee0f162bac624c99ef1c"),definition.text);
    this.makeButton(0,215,__dialogueText("scenes/archive/TypewriterHelpController.js", "t_8ab6c7a2bf1cfec12836"),()=>{this.close();this.showEffect(definition,{text:definition.text});},this.modal);
  }
  panel(title,body){
    if(title===__dialogueText("scenes/archive/TypewriterHelpController.js", "t_aa4c08975bb761f44d5f")){title=__dialogueText("scenes/archive/TypewriterHelpController.js", "t_25df79e101c50ba7112b");body=__dialogueText("scenes/archive/TypewriterHelpController.js", "t_c0a53bf8863eff5c9e86");}
    if(title===__dialogueText("scenes/archive/TypewriterHelpController.js", "t_cf340b2b1c0c6eabde3b"))title=__dialogueText("scenes/archive/TypewriterHelpController.js", "t_fd93869a566263260249");
    const before=this.modal,result=super.panel(title,body);
    if(this.modal&&this.modal!==before)playTypewriterAudio(this.scene,'paper');return result;
  }
  makeButton(x,y,label,callback,parent=null,enabled=true){
    label=label.replace(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_887ded7583c53dfaf1b8"),__dialogueText("scenes/archive/TypewriterHelpController.js", "t_22341168352829bc0859")).replace(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_e59dd6a4c606d360d6a5"),__dialogueText("scenes/archive/TypewriterHelpController.js", "t_8ab6c7a2bf1cfec12836"));
    if(label.startsWith(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_d1cbbf44341666456748")))label+=__dialogueText("scenes/archive/TypewriterHelpController.js", "t_9c7fd168c10f116a0ba2");
    if(label.startsWith(__dialogueText("scenes/archive/TypewriterHelpController.js", "t_22341168352829bc0859")))label+=__dialogueText("scenes/archive/TypewriterHelpController.js", "t_314538d65759cb745d17");
    return super.makeButton(x,y,label,callback,parent,enabled);
  }
  handleResize(){if(this.modal&&!this.busy)this.close();}
  destroy(){if(this.destroyed)return;this.scene.scale.off('resize',this.handleResize,this);super.destroy();}
}
