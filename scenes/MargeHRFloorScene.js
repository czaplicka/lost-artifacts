import { dialogueText } from '../dialogues/DialogueText.js';
import { MargeHRScene } from './MargeHRScene.js';
import { gameState } from '../GameData.js';
import { getMargeBirthdayState } from '../margeBirthdayService.js';
import { margeGiftData as GIFT, margeDisclosureData as DISCLOSURE, getMargeGiftDefinitions, getMargeGiftState,
  getOwnedMargeGifts, giveMargeGift, completeMargeInsuranceHelp, getMargeDisclosure } from '../margeGiftService.js';
import { prepareMargeDisclosure } from '../margeDisclosureModel.js';
import { MargeTrustController } from './hr/MargeTrustController.js';
const T=id=>dialogueText('scenes/MargeHRFloorScene.js',id);
export class MargeHRFloorScene extends MargeHRScene {
 init(data={}){
  super.init(data);this.previewGiftGiven=false;this.previewHelpCompleted=false;this.previewDisclosure=null;this.giftButton=null;
  this.trust=new MargeTrustController(this,data);
 }
 investigationAvailable(){return this.preview||getMargeBirthdayState().unlocked;}
 state(){const state=super.state();return{...state,unlocked:this.preview||Number(gameState.casesSolved||0)>=4};}
 create(){
  super.create();this.giftButton=this.makeSceneButton(575,1024,T('t_5501f64c6fd69630f3ef'),()=>this.openBirthdayGift());this.refreshScene();
  if(!this.investigationAvailable())this.showStatus(T('t_244fde798023e2dd2183'));
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
 inspect(id){if(!this.investigationAvailable()){this.showStatus(T('t_80f2d84c743e9aa8e87e'));return;}super.inspect(id);}
 openDeduction(){if(this.investigationAvailable())super.openDeduction();}
 talkToMarge(){
  if(!this.canExplore())return;
  if(!this.investigationAvailable()){
   this.openFollowupDialogue([T('t_c1bbfa4f9bec97a81aa9'),T('t_289d7524d22e1b579479'),T('t_de634c17f61cd7357e80')],
    T('t_1cad2a01acc725060cad'),()=>this.showStatus(T('t_72fb7cdf956356f839b3')));return;
  }
  const state=this.giftState();
  if(!state.birthdayKnown){super.talkToMarge();return;}
  if(state.helpCompleted){if(this.trust.handleTalk())return;this.reviewDisclosure();return;}
  if(state.canDiscuss){this.openFollowupDialogue(DISCLOSURE.introLines,T('t_cd23a3f08a1b9f1af041'),()=>this.openDisclosureChoices());return;}
  this.showStatus(state.ready?GIFT.messages.noGift:GIFT.messages.tooEarly);
 }
 reviewDisclosure(){
  const record=this.disclosure();if(!record){this.showStatus(GIFT.messages.done);return;}
  const choice=record.choice,lines=[DISCLOSURE.messages.reviewTitle,choice.summary,...choice.lines];
  if(choice.document)lines.push(`${choice.document.title}: ${choice.document.text}`);
  this.openFollowupDialogue(lines,T('t_120dba1199e0363fa2ed'),()=>this.showStatus(GIFT.messages.done));
 }
 openDisclosureChoices(){
  if(!this.canExplore())return;const state=this.giftState();
  if(!state.canDiscuss){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  let panel=null;
  panel=this.openMargeChoicePanel({
   text:[DISCLOSURE.title,DISCLOSURE.choicePrompt,T('t_42f4b266c57b9b525075')].join('\n\n'),
   topics:DISCLOSURE.choices.map(choice=>({id:choice.id,label:`${choice.title}\n${choice.label}`,
    onSelect:()=>{if(this.modal===panel&&!this.closing)this.confirmDisclosureChoice(choice.id);}})),
   onLeave:()=>{if(this.modal!==panel)return;this.closeModal();this.showStatus(DISCLOSURE.messages.cancelled);}
  });
 }
 confirmDisclosureChoice(choiceId){
  const selected=DISCLOSURE.choices.find(choice=>choice.id===choiceId);if(!selected)return;let result;
  try{
   if(this.preview){result=prepareMargeDisclosure(DISCLOSURE,this.giftState(),this.previewDisclosure,choiceId);if(result.success){this.previewDisclosure=result.record;this.previewHelpCompleted=true;result={...result,saved:true,disclosure:result.record};}}
   else result=completeMargeInsuranceHelp(choiceId);
  }catch(error){console.error('[MargeHR] Request could not be completed:',error);this.showStatus(T('t_4aad677c80dc7df26bea'));return;}
  if(!result.success){this.showStatus(DISCLOSURE.messages.unavailable);return;}
  this.closeModal();const record=result.disclosure??this.disclosure(),lines=record?.choice?.lines??GIFT.helpLines;
  const message=DISCLOSURE.messages.confirmed+(result.saved===false?` ${GIFT.messages.saveFailed}`:'');
  this.refreshScene();this.openFollowupDialogue(lines,T('t_1cad2a01acc725060cad'),()=>this.showStatus(message));
  if(result.saved===false)this.showStatus(GIFT.messages.saveFailed);
 }
 openBirthdayGift(){
  if(!this.canExplore()||!this.investigationAvailable())return;const state=this.giftState();
  if(!state.birthdayKnown||state.giftGiven)return;if(!state.ready){this.showStatus(GIFT.messages.tooEarly);return;}
  const gifts=this.preview?getMargeGiftDefinitions().map(item=>({...item,quantity:1})):getOwnedMargeGifts();
  const panel=this.add.container(0,0);this.modal=panel;this.root.add(panel);this.makeShield(panel);
  panel.add(this.add.rectangle(960,530,1280,640,0xe9daba).setStrokeStyle(4,0x8b6842));
  this.modalText(panel,960,280,T('t_bb49c1ed238caf7eb521'),32,'#714f2e');
  this.modalText(panel,960,370,this.preview?T('t_d0979366c80391add1c1'):T('t_c7e41fa96dbd50ef02c2'),26,'#3c3026',1100);
  if(!gifts.length)this.modalText(panel,960,540,GIFT.messages.noGift,28,'#71583c',1080);
  gifts.forEach((gift,index)=>{
   this.modalButton(panel,960,490+index*95,`${gift.name}${T('t_2e5ef29df7c3791ea31e')}${gift.quantity}`,()=>{
    this.closeModal();this.openFollowupDialogue(gift.acceptance,this.preview?T('t_9b35f855b13c337158aa'):T('t_24e2fa2835dc75d654df'),()=>{
     const result=this.preview?(this.previewGiftGiven=true,{success:true,saved:true}):giveMargeGift(gift.id);this.refreshScene();
     if(result.success)this.showStatus(GIFT.messages.given+(result.saved===false?` ${GIFT.messages.saveFailed}`:''));
     else this.showStatus(result.reason==='missing_item'?T('t_dec683a8b59f3edfb4b6'):result.reason==='too_early'?GIFT.messages.tooEarly:result.reason==='already_given'?T('t_2752f92e4103d6daa36e'):T('t_2ed38ad37c5468d4fb02'));
    });
   },1000);
  });
  this.modalButton(panel,960,765,T('t_ab061f52b096c1e5740e'),()=>this.closeModal());this.tooltip.setVisible(false);this.refreshScene();
 }
 openFollowupDialogue(lines,finalLabel,onComplete){
  return this.openMargeDialogue(lines,{speaker:T('t_b320722db0e853429bc7'),finalLabel,onComplete,floorMode:true});
 }
 nextDialogue(){super.nextDialogue();}
}
