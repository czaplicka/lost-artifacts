import { MargeHRScene } from './MargeHRScene.js';
import { gameState } from '../GameData.js';
import { getMargeBirthdayState } from '../margeBirthdayService.js';
import { margeGiftData as GIFT,getMargeGiftDefinitions,getMargeGiftState,
  getOwnedMargeGifts,giveMargeGift,completeMargeInsuranceHelp } from '../margeGiftService.js';

// Physical access and investigation progress are intentionally separate.
export class MargeHRFloorScene extends MargeHRScene {
  init(data={}){
    super.init(data);this.previewGiftGiven=false;this.previewHelpCompleted=false;this.giftButton=null;
  }
  investigationAvailable(){return this.preview||getMargeBirthdayState().unlocked;}
  state(){
    const state=super.state();
    return{...state,unlocked:this.preview||Number(gameState.casesSolved||0)>=4};
  }
  create(){
    super.create();
    this.giftButton=this.makeSceneButton(575,1024,'BIRTHDAY GIFT',()=>this.openBirthdayGift());
    this.refreshScene();
    if(!this.investigationAvailable())this.showStatus('Welcome to HR. You can speak to Marge, but the insurance investigation has not reached her yet.');
  }
  giftState(){
    if(!this.preview)return getMargeGiftState();
    const birthdayKnown=this.state().completed;
    return{birthdayKnown,giftGiven:this.previewGiftGiven,helpCompleted:this.previewHelpCompleted,ready:birthdayKnown,
      canGive:birthdayKnown&&!this.previewGiftGiven,canDiscuss:birthdayKnown&&this.previewGiftGiven&&!this.previewHelpCompleted};
  }
  refreshScene(){
    super.refreshScene();
    const available=this.investigationAvailable();
    this.finished=!available||this.state().completed;
    if(!available){this.counter?.setVisible(false);this.deductionButton?.setVisible(false);this.help?.hintButton?.setVisible(false);}
    else this.counter?.setVisible(true);
    if(this.giftButton){
      const state=this.giftState();const visible=available&&state.birthdayKnown&&!state.giftGiven&&!this.modal&&!this.dialogue&&!this.closing;
      this.giftButton.setVisible(visible);if(this.giftButton.input)this.giftButton.input.enabled=visible;
    }
  }
  inspect(id){
    if(!this.investigationAvailable()){
      this.showStatus('Personnel files and Marge\'s desk are private. There is nothing to investigate here yet.');return;
    }
    super.inspect(id);
  }
  openDeduction(){if(this.investigationAvailable())super.openDeduction();}
  talkToMarge(){
    if(!this.canExplore())return;
    if(!this.investigationAvailable()){
      this.openFollowupDialogue([
        'Welcome upstairs. Your promotion has been recorded. In triplicate, in case it gets ideas.',
        'If you need help with personnel paperwork, bring the relevant request. Being allowed into HR is not the same as being allowed into every file.',
        'And please do not feed the employee of the month. The cat has already negotiated a benefits package.'
      ],'END CONVERSATION',()=>this.showStatus('You can return when your investigation leads to HR.'));
      return;
    }
    const state=this.giftState();
    if(!state.birthdayKnown){super.talkToMarge();return;}
    if(state.helpCompleted){this.showStatus(GIFT.messages.done);return;}
    if(state.canDiscuss){
      this.openFollowupDialogue(GIFT.helpLines,'END CONVERSATION',()=>{
        const result=this.preview?(this.previewHelpCompleted=true,{success:true,saved:true}):completeMargeInsuranceHelp();
        this.refreshScene();this.showStatus(result.success?GIFT.messages.done+(result.saved===false?` ${GIFT.messages.saveFailed}`:''):'The requirements changed. Please speak to Marge again.');
      });return;
    }
    this.showStatus(state.ready?GIFT.messages.noGift:GIFT.messages.tooEarly);
  }
  openBirthdayGift(){
    if(!this.canExplore()||!this.investigationAvailable())return;
    const state=this.giftState();if(!state.birthdayKnown||state.giftGiven)return;
    if(!state.ready){this.showStatus(GIFT.messages.tooEarly);return;}
    const gifts=this.preview?getMargeGiftDefinitions().map(item=>({...item,quantity:1})):getOwnedMargeGifts();
    const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);
    panel.add(this.add.rectangle(960,530,1280,640,0xe9daba).setStrokeStyle(4,0x8b6842));
    this.modalText(panel,960,280,'A BIRTHDAY GESTURE',32,'#714f2e');
    this.modalText(panel,960,370,this.preview?'PREVIEW: no actual item will be consumed.':'Choose an item you own. One unit is handed over only after the acceptance conversation.',26,'#3c3026',1100);
    if(!gifts.length)this.modalText(panel,960,540,GIFT.messages.noGift,28,'#71583c',1080);
    gifts.forEach((gift,index)=>{
      this.modalButton(panel,960,490+index*95,`${gift.name} / available: ${gift.quantity}`,()=>{
        this.closeModal();
        this.openFollowupDialogue(gift.acceptance,this.preview?'GIVE GIFT / PREVIEW':'GIVE ONE ITEM',()=>{
          const result=this.preview?(this.previewGiftGiven=true,{success:true,saved:true}):giveMargeGift(gift.id);
          this.refreshScene();
          if(result.success)this.showStatus(GIFT.messages.given+(result.saved===false?` ${GIFT.messages.saveFailed}`:''));
          else this.showStatus(result.reason==='missing_item'?'That item is no longer in your inventory. Nothing was handed over.':result.reason==='too_early'?GIFT.messages.tooEarly:result.reason==='already_given'?'Marge has already received her birthday gift.':'The gift could not be handed over.');
        });
      },1000);
    });
    this.modalButton(panel,960,765,'KEEP MY ITEMS',()=>this.closeModal());this.tooltip.setVisible(false);this.refreshScene();
  }
  openFollowupDialogue(lines,finalLabel,onComplete){
    if(!this.canExplore())return;
    const container=this.add.container(0,0);this.root.add(container);this.root.bringToTop(container);
    this.dialogue={container,lines:[...lines],index:0,floorMode:true,onComplete,finalLabel};
    this.makeShield(container);
    container.add(this.add.rectangle(960,890,1840,310,0x0e1d15,0.98).setStrokeStyle(3,0xd7ad62));
    this.modalText(container,960,780,'Marge Gunderson',30,'#ffce81',1700);
    this.dialogue.text=this.modalText(container,960,872,lines[0],30,'#f3ead7',1660);
    this.dialogue.next=this.modalButton(container,960,995,lines.length===1?finalLabel:'CONTINUE',()=>this.nextDialogue());
    this.tooltip.setVisible(false);this.refreshScene();
  }
  nextDialogue(){
    const current=this.dialogue;if(!current?.floorMode){super.nextDialogue();return;}
    if(current.index<current.lines.length-1){current.index++;current.text.setText(current.lines[current.index]);current.next.setText(current.index===current.lines.length-1?current.finalLabel:'CONTINUE');return;}
    const callback=current.onComplete;current.onComplete=null;this.abortDialogue();callback?.();
  }
}
