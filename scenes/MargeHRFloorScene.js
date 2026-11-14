import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  super.create();this.giftButton=this.makeSceneButton(575,1024,__dialogueText("scenes/MargeHRFloorScene.js", "t_5501f64c6fd69630f3ef"),()=>this.openBirthdayGift());this.refreshScene();
  if(!this.investigationAvailable())this.showStatus(__dialogueText("scenes/MargeHRFloorScene.js", "t_244fde798023e2dd2183"));
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
 inspect(id){if(!this.investigationAvailable()){this.showStatus(__dialogueText("scenes/MargeHRFloorScene.js", "t_80f2d84c743e9aa8e87e"));return;}super.inspect(id);}
 openDeduction(){if(this.investigationAvailable())super.openDeduction();}
 talkToMarge(){
  if(!this.canExplore())return;
  if(!this.investigationAvailable()){
   this.openFollowupDialogue([
    __dialogueText("scenes/MargeHRFloorScene.js", "t_c1bbfa4f9bec97a81aa9"),
    __dialogueText("scenes/MargeHRFloorScene.js", "t_289d7524d22e1b579479"),
    __dialogueText("scenes/MargeHRFloorScene.js", "t_de634c17f61cd7357e80")
   ],__dialogueText("scenes/MargeHRFloorScene.js", "t_1cad2a01acc725060cad"),()=>this.showStatus(__dialogueText("scenes/MargeHRFloorScene.js", "t_72fb7cdf956356f839b3")));return;
  }
  const state=this.giftState();
  if(!state.birthdayKnown){super.talkToMarge();return;}
  if(state.helpCompleted){if(this.trust.handleTalk())return;this.reviewDisclosure();return;}
  if(state.canDiscuss){this.openFollowupDialogue(DISCLOSURE.introLines,__dialogueText("scenes/MargeHRFloorScene.js", "t_cd23a3f08a1b9f1af041"),()=>this.openDisclosureChoices());return;}
  this.showStatus(state.ready?GIFT.messages.noGift:GIFT.messages.tooEarly);
 }
 reviewDisclosure(){
  const record=this.disclosure();if(!record){this.showStatus(GIFT.messages.done);return;}
  const choice=record.choice,lines=[DISCLOSURE.messages.reviewTitle,choice.summary,...choice.lines];
  if(choice.document)lines.push(`${choice.document.title}: ${choice.document.text}`);
  this.openFollowupDialogue(lines,__dialogueText("scenes/MargeHRFloorScene.js", "t_120dba1199e0363fa2ed"),()=>this.showStatus(GIFT.messages.done));
 }
 openDisclosureChoices(){
  if(!this.canExplore())return;const state=this.giftState();if(!state.canDiscuss){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.root.bringToTop(panel);this.makeShield(panel);
  panel.add(this.add.rectangle(960,540,1520,860,0xe9daba).setStrokeStyle(4,0x8b6842));
  this.modalText(panel,960,190,DISCLOSURE.title,30,'#714f2e',1370);this.modalText(panel,960,270,DISCLOSURE.choicePrompt,28,'#3c3026',1330);
  this.modalText(panel,960,325,__dialogueText("scenes/MargeHRFloorScene.js", "t_42f4b266c57b9b525075"),23,'#71583c',1330);
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
  }catch(error){console.error('[MargeHR] Request could not be completed:',error);this.showStatus(__dialogueText("scenes/MargeHRFloorScene.js", "t_4aad677c80dc7df26bea"));return;}
  if(!result.success){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  this.closeModal();const record=result.disclosure??this.disclosure(),lines=record?.choice?.lines??GIFT.helpLines;
  const message=DISCLOSURE.messages.confirmed+(result.saved===false?` ${GIFT.messages.saveFailed}`:'');
  this.refreshScene();this.openFollowupDialogue(lines,__dialogueText("scenes/MargeHRFloorScene.js", "t_1cad2a01acc725060cad"),()=>this.showStatus(message));if(result.saved===false)this.showStatus(GIFT.messages.saveFailed);
 }
 openBirthdayGift(){
  if(!this.canExplore()||!this.investigationAvailable())return;const state=this.giftState();if(!state.birthdayKnown||state.giftGiven)return;if(!state.ready){this.showStatus(GIFT.messages.tooEarly);return;}
  const gifts=this.preview?getMargeGiftDefinitions().map(item=>({...item,quantity:1})):getOwnedMargeGifts();
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);panel.add(this.add.rectangle(960,530,1280,640,0xe9daba).setStrokeStyle(4,0x8b6842));
  this.modalText(panel,960,280,__dialogueText("scenes/MargeHRFloorScene.js", "t_bb49c1ed238caf7eb521"),32,'#714f2e');
  this.modalText(panel,960,370,this.preview?__dialogueText("scenes/MargeHRFloorScene.js", "t_d0979366c80391add1c1"):__dialogueText("scenes/MargeHRFloorScene.js", "t_c7e41fa96dbd50ef02c2"),26,'#3c3026',1100);
  if(!gifts.length)this.modalText(panel,960,540,GIFT.messages.noGift,28,'#71583c',1080);
  gifts.forEach((gift,index)=>{
   this.modalButton(panel,960,490+index*95,`${gift.name}${__dialogueText("scenes/MargeHRFloorScene.js", "t_2e5ef29df7c3791ea31e")}${gift.quantity}`,()=>{
    this.closeModal();this.openFollowupDialogue(gift.acceptance,this.preview?__dialogueText("scenes/MargeHRFloorScene.js", "t_9b35f855b13c337158aa"):__dialogueText("scenes/MargeHRFloorScene.js", "t_24e2fa2835dc75d654df"),()=>{
     const result=this.preview?(this.previewGiftGiven=true,{success:true,saved:true}):giveMargeGift(gift.id);this.refreshScene();
     if(result.success)this.showStatus(GIFT.messages.given+(result.saved===false?` ${GIFT.messages.saveFailed}`:''));
     else this.showStatus(result.reason==='missing_item'?__dialogueText("scenes/MargeHRFloorScene.js", "t_dec683a8b59f3edfb4b6"):result.reason==='too_early'?GIFT.messages.tooEarly:result.reason==='already_given'?__dialogueText("scenes/MargeHRFloorScene.js", "t_2752f92e4103d6daa36e"):__dialogueText("scenes/MargeHRFloorScene.js", "t_2ed38ad37c5468d4fb02"));
    });
   },1000);
  });
  this.modalButton(panel,960,765,__dialogueText("scenes/MargeHRFloorScene.js", "t_ab061f52b096c1e5740e"),()=>this.closeModal());this.tooltip.setVisible(false);this.refreshScene();
 }
 openFollowupDialogue(lines,finalLabel,onComplete){
  if(!this.canExplore())return;const container=this.add.container(0,0);this.root.add(container);this.root.bringToTop(container);
  this.dialogue={container,lines:[...lines],index:0,floorMode:true,onComplete,finalLabel};this.makeShield(container);container.add(this.add.rectangle(960,890,1840,310,0x0e1d15,.98).setStrokeStyle(3,0xd7ad62));
  this.modalText(container,960,780,__dialogueText("scenes/MargeHRFloorScene.js", "t_b320722db0e853429bc7"),30,'#ffce81',1700);this.dialogue.text=this.modalText(container,960,872,lines[0],30,'#f3ead7',1660);
  this.dialogue.next=this.modalButton(container,960,995,lines.length===1?finalLabel:'CONTINUE',()=>this.nextDialogue());this.tooltip.setVisible(false);this.refreshScene();
 }
 nextDialogue(){
  const current=this.dialogue;if(!current?.floorMode){super.nextDialogue();return;}
  if(current.index<current.lines.length-1){current.index++;current.text.setText(current.lines[current.index]);current.next.setText(current.index===current.lines.length-1?current.finalLabel:__dialogueText("scenes/MargeHRFloorScene.js", "t_628db0c7598820b10176"));return;}
  const callback=current.onComplete;current.onComplete=null;this.abortDialogue();callback?.();
 }
}
