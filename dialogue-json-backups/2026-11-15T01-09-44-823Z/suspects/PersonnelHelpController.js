import { ForensicHelpController } from '../scenes/CSI/ForensicHelpController.js';
import { hintManager } from '../managers/HintManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { EventBus } from '../EventBus.js';

export class PersonnelHelpController extends ForensicHelpController {
  constructor(scene,view,text){
    super(scene);this.view=view;this.text=text;
    this.previousEvidenceType=scene.evidenceType;
    this.assignedEvidenceType=scene.evidenceType===undefined;
    if(this.assignedEvidenceType)scene.evidenceType='personnel_roster';
  }
  create(){
    if(this.created||this.destroyed)return;
    this.created=true;
    EventBus.on('hints:changed',this.boundRefresh);
    this.scene.events.once('shutdown',this.boundDestroy);
    this.scene.events.once('destroy',this.boundDestroy);
  }
  definition(){
    const statement=this.view.roster.statements[this.view.selectedStatement];
    if(!statement)return null;
    return {id:statement.id,instructions:this.text.instructions,text:statement.hint,targets:[]};
  }
  key(definition){return JSON.stringify(['personnel-v4',this.view.roster.caseId,this.view.roster.runId,definition.id]);}
  refresh(){
    if(this.destroyed||!this.view.root)return;
    const definition=this.definition(),button=this.view.root.querySelector('[data-hint]');
    if(button)button.textContent=definition&&this.receipt(definition)?'Review hint':'Hint';
  }
  panel(title,body){const modal=super.panel(this.text.title,body);this.resizeModal();return modal;}
  resizeModal(){
    if(!this.modal)return;
    const {width,height}=this.scene.scale;
    this.modal.setPosition(width/2,height/2).setScale(Math.min(1,(width-24)/740,(height-24)/600));
  }
  pause(){
    super.pause();
    const node=this.view.element?.node;
    if(node){this.domStyle={visibility:node.style.visibility,pointerEvents:node.style.pointerEvents};node.style.visibility='hidden';node.style.pointerEvents='none';}
  }
  resume(){
    super.resume();
    const node=this.view.element?.node;
    if(node&&this.domStyle)Object.assign(node.style,this.domStyle);
  }
  open(instructions=false){
    if(this.modal||this.busy||this.destroyed||this.view.roster.completed)return;
    const energy=getEnergyManager();
    if(energy.isForcedSleepActive()||energy.isManualSleepActive()){this.view.message(this.text.sleep);return;}
    const definition=this.definition();if(!definition)return;
    this.pause();
    const receipt=this.receipt(definition);
    if(instructions||receipt){
      this.panel(this.text.title,instructions?definition.instructions:receipt.text);
      this.makeButton(0,215,this.text.close,()=>{this.close();if(receipt&&!instructions)this.showEffect(definition,receipt);},this.modal);
      return;
    }
    this.panel(this.text.title,this.text.intro);
    const count=hintManager.getAvailableCount();
    this.makeButton(0,-10,this.text.free.replace('{count}',count),()=>this.purchase('free_hint',definition),this.modal,count>0);
    this.makeButton(0,75,this.text.bad,()=>this.purchase('cut_corners',definition),this.modal,energy.canAfford(5).ok);
    this.makeButton(0,160,this.text.good,()=>this.purchase('squad_help',definition),this.modal,energy.canAfford(10).ok);
    this.makeButton(0,250,this.text.close,()=>this.close(),this.modal);
  }
  showEffect(definition,receipt){
    if(this.destroyed)return;
    this.view.message(receipt.text);
  }
  destroy(){
    if(this.destroyed)return;
    super.destroy();
    if(this.assignedEvidenceType&&this.scene.evidenceType==='personnel_roster')this.scene.evidenceType=this.previousEvidenceType;
  }
}
