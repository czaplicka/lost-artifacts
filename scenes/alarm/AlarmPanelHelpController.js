import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ForensicHelpController } from '../CSI/ForensicHelpController.js';
import { EventBus } from '../../EventBus.js';
import { hasAgencyFieldManual,agencyManualData } from '../../managers/AgencyManualService.js';
import { isAgencyManualOpen } from '../../ui/AgencyManualReader.js';
export class AlarmPanelHelpController extends ForensicHelpController{
  create(){
    if(this.created||this.destroyed)return;this.created=true;
    this.hintButton=this.scene.makeUiButton(1015,932,'HINT',()=>this.open(false));this.buttons.push(this.hintButton);
    EventBus.on('hints:changed',this.boundRefresh);this.scene.events.on('update',this.boundUpdate);
    this.scene.events.once('shutdown',this.boundDestroy);this.scene.events.once('destroy',this.boundDestroy);
    this.scene.scale.on('resize',this.handleResize,this);this.refresh();
  }
  refresh(){if(this.scene.preview){this.hintButton?.setText(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_f3d9339f7f9eaa186ee2"));return;}super.refresh();}
  receipt(definition){return this.scene.preview?null:super.receipt(definition);}
  open(instructions=false){
    if(!this.scene.allowed||this.scene.manual||this.scene.hardwareAnimating||isAgencyManualOpen())return;
    // Missing equipment is explained for free, before opening any purchase UI.
    if(!hasAgencyFieldManual()){this.scene.setMessage(agencyManualData.missingMessage);return;}
    if(!this.scene.preview)return super.open(instructions);
    if(this.modal||this.busy||this.destroyed||this.scene.finished)return;
    const definition=this.definition();if(!definition)return;this.pause();this.panel(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_ee0f162bac624c99ef1c"),definition.text);
    this.makeButton(0,215,__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_fca6fb219ba19f444741"),()=>{this.close();this.showEffect(definition,{text:definition.text});},this.modal);
  }
  purchase(method,definition){
    if(!hasAgencyFieldManual()){this.body?.setText(agencyManualData.missingMessage);return;}
    return super.purchase(method,definition);
  }
  panel(title,body){
    if(title===__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_aa4c08975bb761f44d5f")){title=__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_90653ea3b3f08e96d708");body=__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_7b3a1cfd948e3780c8f2");}
    if(title===__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_cf340b2b1c0c6eabde3b"))title=__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_54f7ca94f2717e23bf31");return super.panel(title,body);
  }
  makeButton(x,y,label,callback,parent=null,enabled=true){
    label=label.replace(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_887ded7583c53dfaf1b8"),__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_b5493187b35cce813378")).replace(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_e59dd6a4c606d360d6a5"),__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_fca6fb219ba19f444741"));
    if(label.startsWith(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_d1cbbf44341666456748")))label+=__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_9c7fd168c10f116a0ba2");if(label.startsWith(__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_b5493187b35cce813378")))label+=__dialogueText("scenes/alarm/AlarmPanelHelpController.js", "t_314538d65759cb745d17");
    return super.makeButton(x,y,label,callback,parent,enabled);
  }
  handleResize(){if(this.modal&&!this.busy)this.close();}
  destroy(){if(this.destroyed)return;this.scene.scale.off('resize',this.handleResize,this);super.destroy();}
}
