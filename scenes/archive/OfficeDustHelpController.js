import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ForensicHelpController } from '../CSI/ForensicHelpController.js';
import { EventBus } from '../../EventBus.js';
import { playOfficeDustAudio } from './OfficeDustAudio.js';
export class OfficeDustHelpController extends ForensicHelpController {
  create(){
    if(this.destroyed||this.created)return;this.created=true;
    this.hintButton=this.scene.button(955,972,'HINT',()=>this.open(false));this.buttons.push(this.hintButton);
    EventBus.on('hints:changed',this.boundRefresh);this.scene.events.on('update',this.boundUpdate);
    this.scene.events.once('shutdown',this.boundDestroy);this.scene.events.once('destroy',this.boundDestroy);
    this.scene.scale.on('resize',this.handleResize,this);this.refresh();
  }
  refresh(){if(this.scene.preview){this.hintButton?.setText(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_f3d9339f7f9eaa186ee2"));return;}super.refresh();}
  receipt(definition){return this.scene.preview?null:super.receipt(definition);}
  open(instructions=false){
    if(!this.scene.preview)return super.open(instructions);
    if(this.modal||this.busy||this.destroyed||this.scene.finished)return;
    const definition=this.definition();if(!definition)return;
    this.pause();this.panel(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_ee0f162bac624c99ef1c"),definition.text);
    this.makeButton(0,215,__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_a224ade223493a9c49f7"),()=>{this.close();this.showEffect(definition,{text:definition.text});},this.modal);
  }
  panel(title,body){
    if(title===__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_aa4c08975bb761f44d5f")){title=__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_27853b148a3694fc8b63");body=__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_f60b0daa0b50bf39b0d9");}
    if(title===__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_cf340b2b1c0c6eabde3b"))title=__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_fd39cf010137c6692402");
    const before=this.modal,result=super.panel(title,body);
    if(this.modal&&this.modal!==before)playOfficeDustAudio(this.scene,'paper');return result;
  }
  makeButton(x,y,label,callback,parent=null,enabled=true){
    label=label.replace(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_887ded7583c53dfaf1b8"),__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_ab54be8f55c14bfdd304")).replace(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_e59dd6a4c606d360d6a5"),__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_a224ade223493a9c49f7"));
    if(label.startsWith(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_d1cbbf44341666456748")))label+=__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_9c7fd168c10f116a0ba2");
    if(label.startsWith(__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_ab54be8f55c14bfdd304")))label+=__dialogueText("scenes/archive/OfficeDustHelpController.js", "t_314538d65759cb745d17");
    return super.makeButton(x,y,label,callback,parent,enabled);
  }
  handleResize(){if(this.modal&&!this.busy)this.close();}
  destroy(){if(this.destroyed)return;this.scene.scale.off('resize',this.handleResize,this);super.destroy();}
}
