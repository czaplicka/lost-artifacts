import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ForensicHelpController } from '../CSI/ForensicHelpController.js';
import { EventBus } from '../../EventBus.js';
export class MargeHRHelpController extends ForensicHelpController {
  create(){
    if(this.created||this.destroyed)return;this.created=true;
    this.hintButton=this.scene.makeSceneButton(1580,1024,'HINT',()=>this.open(false));this.buttons.push(this.hintButton);
    EventBus.on('hints:changed',this.boundRefresh);this.scene.events.on('update',this.boundUpdate);
    this.scene.events.once('shutdown',this.boundDestroy);this.scene.events.once('destroy',this.boundDestroy);
    this.scene.scale.on('resize',this.handleResize,this);this.refresh();
  }
  refresh(){if(this.scene.preview){this.hintButton?.setText(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_f3d9339f7f9eaa186ee2"));return;}super.refresh();}
  receipt(definition){return this.scene.preview?null:super.receipt(definition);}
  open(instructions=false){
    if(this.scene.modal||this.scene.dialogue)return;
    if(!this.scene.preview)return super.open(instructions);
    if(this.modal||this.busy||this.destroyed||this.scene.finished)return;
    const definition=this.definition();if(!definition)return;this.pause();this.panel(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_ee0f162bac624c99ef1c"),definition.text);
    this.makeButton(0,215,__dialogueText("scenes/hr/MargeHRHelpController.js", "t_120dba1199e0363fa2ed"),()=>{this.close();this.showEffect(definition,{text:definition.text});},this.modal);
  }
  panel(title,body){
    if(title===__dialogueText("scenes/hr/MargeHRHelpController.js", "t_aa4c08975bb761f44d5f")){title=__dialogueText("scenes/hr/MargeHRHelpController.js", "t_27853b148a3694fc8b63");body=__dialogueText("scenes/hr/MargeHRHelpController.js", "t_f60b0daa0b50bf39b0d9");}
    if(title===__dialogueText("scenes/hr/MargeHRHelpController.js", "t_cf340b2b1c0c6eabde3b"))title=__dialogueText("scenes/hr/MargeHRHelpController.js", "t_284d03879213d8d5e2e5");return super.panel(title,body);
  }
  makeButton(x,y,label,callback,parent=null,enabled=true){
    label=label.replace(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_887ded7583c53dfaf1b8"),__dialogueText("scenes/hr/MargeHRHelpController.js", "t_ab54be8f55c14bfdd304")).replace(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_e59dd6a4c606d360d6a5"),__dialogueText("scenes/hr/MargeHRHelpController.js", "t_120dba1199e0363fa2ed"));
    if(label.startsWith(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_d1cbbf44341666456748")))label+=__dialogueText("scenes/hr/MargeHRHelpController.js", "t_9c7fd168c10f116a0ba2");if(label.startsWith(__dialogueText("scenes/hr/MargeHRHelpController.js", "t_ab54be8f55c14bfdd304")))label+=__dialogueText("scenes/hr/MargeHRHelpController.js", "t_314538d65759cb745d17");
    return super.makeButton(x,y,label,callback,parent,enabled);
  }
  handleResize(){if(this.modal&&!this.busy)this.close();}
  destroy(){if(this.destroyed)return;this.scene.scale.off('resize',this.handleResize,this);super.destroy();}
}
