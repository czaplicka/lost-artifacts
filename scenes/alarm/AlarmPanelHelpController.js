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
  refresh(){if(this.scene.preview){this.hintButton?.setText('HINT / TEST');return;}super.refresh();}
  receipt(definition){return this.scene.preview?null:super.receipt(definition);}
  open(instructions=false){
    if(!this.scene.allowed||this.scene.manual||this.scene.hardwareAnimating||isAgencyManualOpen())return;
    // Missing equipment is explained for free, before opening any purchase UI.
    if(!hasAgencyFieldManual()){this.scene.setMessage(agencyManualData.missingMessage);return;}
    if(!this.scene.preview)return super.open(instructions);
    if(this.modal||this.busy||this.destroyed||this.scene.finished)return;
    const definition=this.definition();if(!definition)return;this.pause();this.panel('PREVIEW HINT — NO COST',definition.text);
    this.makeButton(0,215,'BACK TO PANEL',()=>{this.close();this.showEffect(definition,{text:definition.text});},this.modal);
  }
  purchase(method,definition){
    if(!hasAgencyFieldManual()){this.body?.setText(agencyManualData.missingMessage);return;}
    return super.purchase(method,definition);
  }
  panel(title,body){
    if(title==='LAB ASSISTANCE'){title='SERVICE ASSISTANCE';body='The agency manual and local service note are free to read.\nA hint applies their rules to your current panel.';}
    if(title==='LAB HINT')title='PANEL HINT';return super.panel(title,body);
  }
  makeButton(x,y,label,callback,parent=null,enabled=true){
    label=label.replace('ASK LAB TECHNICIAN','ASK TECHNICAL CONTACT').replace('BACK TO ANALYSIS','BACK TO PANEL');
    if(label.startsWith('CUT CORNERS'))label+='\nIntegrity -1';if(label.startsWith('ASK TECHNICAL CONTACT'))label+='\nIntegrity +1';
    return super.makeButton(x,y,label,callback,parent,enabled);
  }
  handleResize(){if(this.modal&&!this.busy)this.close();}
  destroy(){if(this.destroyed)return;this.scene.scale.off('resize',this.handleResize,this);super.destroy();}
}
