import { MargeHRScene } from './MargeHRScene.js';
import { gameState } from '../GameData.js';
import { getMargeBirthdayState } from '../margeBirthdayService.js';
import { margeGiftData as GIFT,margeDisclosureData as DISCLOSURE,getMargeGiftDefinitions,getMargeGiftState,
 getOwnedMargeGifts,giveMargeGift,completeMargeInsuranceHelp,getMargeDisclosure } from '../margeGiftService.js';
import { prepareMargeDisclosure } from '../margeDisclosureModel.js';
import { MargeTrustController } from './hr/MargeTrustController.js';
export class MargeHRFloorScene extends MargeHRScene {
 init(data={}){
  super.init(data);this.previewGiftGiven=false;this.previewHelpCompleted=false;this.previewDisclosure=null;this.giftButton=null;
  this.trust=new MargeTrustController(this,data);
 }
 investigationAvailable(){return this.preview||getMargeBirthdayState().unlocked;}
 state(){const state=super.state();return{...state,unlocked:this.preview||Number(gameState.casesSolved||0)>=4};}
 create(){
  super.create();this.giftButton=this.makeSceneButton(575,1024,'BIRTHDAY GIFT',()=>this.openBirthdayGift());this.refreshScene();
  if(!this.investigationAvailable())this.showStatus('Welcome to HR. You can speak to Marge, but the insurance investigation has not reached her yet.');
 }
 giftState(){
  if(!this.preview)return getMargeGiftState();const birthdayKnown=this.state().completed;
  return{birthdayKnown,giftGiven:this.previewGiftGiven,helpCompleted:this.previewHelpCompleted,ready:birthdayKnown,
   canGive:birthdayKnown&&!this.previewGiftGiven,canDiscuss:birthdayKnown&&this.previewGiftGiven&&!this.previewHelpCompleted};
 }
 disclosure(){return this.preview?this.previewDisclosure:getMargeDisclosure();}
 refreshScene(){
  super.refreshScene();const available=this.investigationAvailable();this.finished=!available||this.state().completed;
  if(!available){this.counter?.setVisible(false);this.deductionButton?.setVisible(false);this.help?.hintButton?.setVisible(false);}else this.counter?.setVisible(true);
  if(this.giftButton){const state=this.giftState(),visible=available&&state.birthdayKnown&&!state.giftGiven&&!this.modal&&!this.dialogue&&!this.closing;this.giftButton.setVisible(visible);if(this.giftButton.input)this.giftButton.input.enabled=visible;}
 }
 inspect(id){if(!this.investigationAvailable()){this.showStatus('Personnel files and Marge\'s desk are private. There is nothing to investigate here yet.');return;}super.inspect(id);}
 openDeduction(){if(this.investigationAvailable())super.openDeduction();}
 talkToMarge(){
  if(!this.canExplore())return;
  if(!this.investigationAvailable()){
   this.openFollowupDialogue([
    'Welcome upstairs. Your promotion has been recorded. In triplicate, in case it gets ideas.',
    'If you need help with personnel paperwork, bring the relevant request. Being allowed into HR is not the same as being allowed into every file.',
    'And please do not feed the employee of the month. The cat has already negotiated a benefits package.'
   ],'END CONVERSATION',()=>this.showStatus('You can return when your investigation leads to HR.'));return;
  }
  const state=this.giftState();
  if(!state.birthdayKnown){super.talkToMarge();return;}
  if(state.helpCompleted){if(this.trust.handleTalk())return;this.reviewDisclosure();return;}
  if(state.canDiscuss){this.openFollowupDialogue(DISCLOSURE.introLines,'CHOOSE YOUR REQUEST',()=>this.openDisclosureChoices());return;}
  this.showStatus(state.ready?GIFT.messages.noGift:GIFT.messages.tooEarly);
 }
 reviewDisclosure(){
  const record=this.disclosure();if(!record){this.showStatus(GIFT.messages.done);return;}
  const choice=record.choice,lines=[DISCLOSURE.messages.reviewTitle,choice.summary,...choice.lines];
  if(choice.document)lines.push(`${choice.document.title}: ${choice.document.text}`);
  this.openFollowupDialogue(lines,'BACK TO HR',()=>this.showStatus(GIFT.messages.done));
 }
 openDisclosureChoices(){
  if(!this.canExplore())return;const state=this.giftState();if(!state.canDiscuss){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.root.bringToTop(panel);this.makeShield(panel);
  panel.add(this.add.rectangle(960,540,1520,860,0xe9daba).setStrokeStyle(4,0x8b6842));
  this.modalText(panel,960,190,DISCLOSURE.title,30,'#714f2e',1370);this.modalText(panel,960,270,DISCLOSURE.choicePrompt,28,'#3c3026',1330);
  this.modalText(panel,960,325,'Your request is recorded when you click an option.\nESC or NOT NOW leaves it undecided.',23,'#71583c',1330);
  DISCLOSURE.choices.forEach((choice,index)=>{
   const y=438+index*132,button=this.add.rectangle(960,y,1380,112,0x243a2d).setStrokeStyle(2,0x8b6842).setInteractive({useHandCursor:true});panel.add(button);
   this.modalText(panel,960,y,`${choice.title}\n${choice.label}`,25,'#ffe3a3',1300);
   button.on('pointerover',()=>button.setFillStyle(0x38553f));button.on('pointerout',()=>button.setFillStyle(0x243a2d));
   button.on('pointerdown',(pointer,x,y,event)=>{event?.stopPropagation();if(this.modal!==panel||this.closing)return;this.confirmDisclosureChoice(choice.id);});
  });
  this.modalButton(panel,960,892,DISCLOSURE.cancelLabel,()=>{if(this.modal!==panel)return;this.closeModal();this.showStatus(DISCLOSURE.messages.cancelled);});this.tooltip.setVisible(false);this.refreshScene();
 }
 confirmDisclosureChoice(choiceId){
  const selected=DISCLOSURE.choices.find(choice=>choice.id===choiceId);if(!selected)return;let result;
  try{
   if(this.preview){result=prepareMargeDisclosure(DISCLOSURE,this.giftState(),this.previewDisclosure,choiceId);if(result.success){this.previewDisclosure=result.record;this.previewHelpCompleted=true;result={...result,saved:true,disclosure:result.record};}}
   else result=completeMargeInsuranceHelp(choiceId);
  }catch(error){console.error('[MargeHR] Request could not be completed:',error);this.showStatus('The request could not be completed. Keep this session open and try again.');return;}
  if(!result.success){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  this.closeModal();const record=result.disclosure??this.disclosure(),lines=record?.choice?.lines??GIFT.helpLines;
  const message=DISCLOSURE.messages.confirmed+(result.saved===false?` ${GIFT.messages.saveFailed}`:'');
  this.refreshScene();this.openFollowupDialogue(lines,'END CONVERSATION',()=>this.showStatus(message));if(result.saved===false)this.showStatus(GIFT.messages.saveFailed);
 }
 openBirthdayGift(){
  if(!this.canExplore()||!this.investigationAvailable())return;const state=this.giftState();if(!state.birthdayKnown||state.giftGiven)return;if(!state.ready){this.showStatus(GIFT.messages.tooEarly);return;}
  const gifts=this.preview?getMargeGiftDefinitions().map(item=>({...item,quantity:1})):getOwnedMargeGifts();
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);panel.add(this.add.rectangle(960,530,1280,640,0xe9daba).setStrokeStyle(4,0x8b6842));
  this.modalText(panel,960,280,'A BIRTHDAY GESTURE',32,'#714f2e');
  this.modalText(panel,960,370,this.preview?'PREVIEW: no actual item will be consumed.':'Choose an item you own. One unit is handed over only after the acceptance conversation.',26,'#3c3026',1100);
  if(!gifts.length)this.modalText(panel,960,540,GIFT.messages.noGift,28,'#71583c',1080);
  gifts.forEach((gift,index)=>{
   this.modalButton(panel,960,490+index*95,`${gift.name} / available: ${gift.quantity}`,()=>{
    this.closeModal();this.openFollowupDialogue(gift.acceptance,this.preview?'GIVE GIFT / PREVIEW':'GIVE ONE ITEM',()=>{
     const result=this.preview?(this.previewGiftGiven=true,{success:true,saved:true}):giveMargeGift(gift.id);this.refreshScene();
     if(result.success)this.showStatus(GIFT.messages.given+(result.saved===false?` ${GIFT.messages.saveFailed}`:''));
     else this.showStatus(result.reason==='missing_item'?'That item is no longer in your inventory. Nothing was handed over.':result.reason==='too_early'?GIFT.messages.tooEarly:result.reason==='already_given'?'Marge has already received her birthday gift.':'The gift could not be handed over.');
    });
   },1000);
  });
  this.modalButton(panel,960,765,'KEEP MY ITEMS',()=>this.closeModal());this.tooltip.setVisible(false);this.refreshScene();
 }
 openFollowupDialogue(lines,finalLabel,onComplete){
  if(!this.canExplore())return;const container=this.add.container(0,0);this.root.add(container);this.root.bringToTop(container);
  this.dialogue={container,lines:[...lines],index:0,floorMode:true,onComplete,finalLabel};this.makeShield(container);container.add(this.add.rectangle(960,890,1840,310,0x0e1d15,.98).setStrokeStyle(3,0xd7ad62));
  this.modalText(container,960,780,'Marge Gunderson',30,'#ffce81',1700);this.dialogue.text=this.modalText(container,960,872,lines[0],30,'#f3ead7',1660);
  this.dialogue.next=this.modalButton(container,960,995,lines.length===1?finalLabel:'CONTINUE',()=>this.nextDialogue());this.tooltip.setVisible(false);this.refreshScene();
 }
 nextDialogue(){
  const current=this.dialogue;if(!current?.floorMode){super.nextDialogue();return;}
  if(current.index<current.lines.length-1){current.index++;current.text.setText(current.lines[current.index]);current.next.setText(current.index===current.lines.length-1?current.finalLabel:'CONTINUE');return;}
  const callback=current.onComplete;current.onComplete=null;this.abortDialogue();callback?.();
 }
}
