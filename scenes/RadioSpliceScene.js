import { BaseScene } from './BaseScene.js';
import { radioSpliceData as DATA,getRadioSpliceStory,storeRadioSplice } from '../radioSpliceService.js';
import { normalizeRadio,placeRadio,evaluateRadio,radioHint } from './archive/RadioSpliceModel.js';
import { TimelineHelpController } from './archive/TimelineHelpController.js';
export class RadioSpliceScene extends BaseScene{
 constructor(){super({key:'RadioSpliceScene'});}
 init(data={}){
  this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
  this.progress=null;this.finished=false;this.resolved=false;this.closing=false;this.selected=null;this.selectedSlot=null;this.inspected=null;
  this.cards=[];this.slotObjects=[];this.conclusionButtons=[];this.modal=null;this.modalIndex=0;this.lockUntil=0;this.timelineHelp=null;this.savedOk=null;
  this.layerStates=[];this.parentPausedByMe=false;this.playingSound=null;this.playbackRun=0;
  this.caseKey='holly_missing_husband';this.stationId='john_radio_splice';this.evidenceConfig={id:'john_radio_splice'};
 }
 audioKey(id){return`john_radio_clip_${id}`;}
 preload(){for(const clip of DATA.clips)if(typeof clip.audio==='string'&&clip.audio.trim()&&!this.cache.audio.exists(this.audioKey(clip.id)))this.load.audio(this.audioKey(clip.id),clip.audio);}
 create(){
  super.create();const story=getRadioSpliceStory();this.allowed=this.preview||story.eligible;this.progress=normalizeRadio(DATA,this.preview?null:story);this.finished=this.progress.completed;this.resolved=!this.allowed;
  this.cameras.main.setBackgroundColor('#121c16');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,510,1440,1020,0x18271e));
  this.label(720,42,DATA.title,22,'#f0ce88','PressStart2P');this.button(1235,972,'BACK',()=>this.closeSplice());
  this.mode=this.label(720,1006,(this.preview?'PREVIEW / ':'')+(DATA.clips.some(c=>this.cache.audio.exists(this.audioKey(c.id)))?'TRANSCRIPT / ATTACHED AUDIO AVAILABLE':'TRANSCRIPT ONLY / NO RECORDED AUDIO ATTACHED'),13,'#baa98e');
  if(this.allowed)this.buildBoard();else this.label(720,470,'Complete mission eleven and the financial enquiry first.',28);
  this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',e=>{if(e.repeat)return;if(this.modal)this.closeModal();else if(this.timelineHelp?.modal)this.timelineHelp.close();else this.closeSplice();});
  this.suspendBackground();this.events.once('shutdown',()=>{this.stopAudio();this.timelineHelp?.destroy();this.restoreBackground();this.onFinished=null;});
 }
 label(x,y,text,size=21,color='#e9dfc8',font='SpecialElite',parent=this.root){const o=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1350},lineSpacing:5}).setOrigin(.5);parent.add(o);return o;}
 button(x,y,text,callback,parent=this.root){const o=this.add.text(x,y,text,{fontFamily:'SpecialElite',fontSize:'21px',color:'#f1d89d',backgroundColor:'#354c39',padding:{x:16,y:11}}).setOrigin(.5).setInteractive({useHandCursor:true});o.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation();if(this.closing||this.time.now<this.lockUntil||(this.modal&&parent!==this.modal))return;this.lockUntil=this.time.now+120;this.stopAudio();callback();});parent.add(o);return o;}
 buildBoard(){
  this.label(720,84,'Arrange requests and replies, then compare the assembled text with the mission summary.',20);
  this.button(260,122,'SOURCE / SUMMARY',()=>this.openSummary());
  this.playButton=this.button(720,122,'NO AUDIO SELECTED',()=>this.playSelected());this.playButton.disableInteractive();
  this.button(1160,122,'READ SEQUENCE',()=>this.openSequence());
  this.label(360,166,'FRAGMENT BANK',19,'#cdbb9a');this.label(1080,166,'ASSEMBLED / EARLIEST TO LATEST',19,'#cdbb9a');
  Phaser.Utils.Array.Shuffle([...DATA.clips]).forEach((clip,i)=>{
   const x=193+(i%2)*344,y=245+Math.floor(i/2)*135;
   const box=this.add.rectangle(x,y,326,112,0xe2d4b6).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
   const title=this.add.text(x,y-34,clip.label,{fontFamily:'SpecialElite',fontSize:'20px',color:'#3f3126'}).setOrigin(.5);
   const text=this.add.text(x,y+12,clip.text.length>76?clip.text.slice(0,73)+'...':clip.text,{fontFamily:'SpecialElite',fontSize:'18px',color:'#534636',align:'center',wordWrap:{width:300}}).setOrigin(.5);this.root.add([box,title,text]);
   box.on('pointerdown',()=>{if(this.blocked())return;this.inspect(clip.id);if(this.finished)return;this.selected=this.selected===clip.id?null:clip.id;this.selectedSlot=null;this.refreshBoard();});this.cards.push({id:clip.id,box});
  });
  for(let i=0;i<DATA.slotCount;i++){
   const y=220+i*73,box=this.add.rectangle(1080,y,630,65,0x304232).setStrokeStyle(2,0x957a58).setInteractive({useHandCursor:true});
   const text=this.add.text(1080,y,'',{fontFamily:'SpecialElite',fontSize:'20px',color:'#f0dfbd',align:'center',wordWrap:{width:600}}).setOrigin(.5);this.root.add([box,text]);box.on('pointerdown',()=>this.chooseSlot(i));this.slotObjects.push({box,text});
  }
  this.root.add(this.add.rectangle(720,736,1360,116,0xe2d4b6).setStrokeStyle(2,0x9b8662));
  this.sourceTitle=this.label(720,701,'SELECT A FRAGMENT / FREE TRANSCRIPT',18,'#74463a');
  this.sourceBody=this.label(720,750,DATA.provenance,20,'#3d332c');this.sourceBody.setWordWrapWidth(1300);
  this.label(720,819,'COMPARE WITH THE MISSION SUMMARY',19,'#cdbb9a');
  DATA.conclusions.forEach((item,i)=>{const button=this.button(260+i*460,864,item.label,()=>{if(this.finished)return;this.progress.conclusion=item.id;this.persist();this.refreshBoard();});this.conclusionButtons.push({id:item.id,button});});
  this.message=this.label(720,918,'Select a fragment and a position. Select two positions to swap them.',20);
  this.checkButton=this.button(265,972,'CHECK ASSEMBLY',()=>this.check());this.clearButton=this.button(600,972,'CLEAR SLOT',()=>this.clearSlot());
  this.timelineHelp=new TimelineHelpController(this);this.timelineHelp.create();this.refreshBoard();if(this.finished)this.showSuccess();
 }
 blocked(){return this.closing||Boolean(this.modal)||Boolean(this.timelineHelp?.modal)||!this.allowed;}
 inspect(id){this.stopAudio();const c=DATA.clips.find(c=>c.id===id);if(!c)return;this.inspected=id;this.sourceTitle.setText(`${c.label} / ${c.speaker}`);this.sourceBody.setText(c.text);const available=this.cache.audio.exists(this.audioKey(id));this.playButton.setText(available?'PLAY SELECTED CLIP':'NO AUDIO / TEXT ONLY');if(available)this.playButton.setInteractive({useHandCursor:true});else this.playButton.disableInteractive();}
 chooseSlot(i){
  if(this.blocked())return;if(this.progress.slots[i])this.inspect(this.progress.slots[i]);if(this.finished)return;
  if(this.selected){this.progress=placeRadio(DATA,this.progress,this.selected,i);this.selected=null;this.selectedSlot=i;this.persist();}
  else if(this.selectedSlot!==null&&this.selectedSlot!==i){const j=this.selectedSlot;[this.progress.slots[j],this.progress.slots[i]]=[this.progress.slots[i],this.progress.slots[j]];this.selectedSlot=null;this.persist();}
  else this.selectedSlot=this.selectedSlot===i?null:i;this.refreshBoard();
 }
 clearSlot(){if(this.finished||this.selectedSlot===null)return;this.progress.slots[this.selectedSlot]=null;this.selectedSlot=null;this.selected=null;this.persist();this.refreshBoard();}
 refreshBoard(){this.cards.forEach(c=>{c.box.setFillStyle(this.progress.slots.includes(c.id)?0xc2c8ae:0xe2d4b6);c.box.setStrokeStyle(this.selected===c.id?4:2,this.selected===c.id?0xe7ac48:0x9b8662);});this.slotObjects.forEach(({box,text},i)=>{const clip=DATA.clips.find(c=>c.id===this.progress.slots[i]);text.setText(`${i+1}. ${clip?clip.label+' / '+clip.text.slice(0,49)+'...':'[ select a fragment ]'}`);box.setStrokeStyle(this.selectedSlot===i?4:2,this.selectedSlot===i?0xe7ac48:0x957a58);});this.conclusionButtons.forEach(({id,button})=>button.setBackgroundColor(this.progress.conclusion===id?'#725337':'#354c39'));}
 getForensicHelp(){const h=radioHint(DATA,this.progress);return{...h,targets:[h.clipId?this.cards.find(c=>c.id===h.clipId)?.box:null,Number.isInteger(h.slotIndex)?this.slotObjects[h.slotIndex]?.box:null,h.conclusionId?this.conclusionButtons.find(c=>c.id===h.conclusionId)?.button:null].filter(Boolean)};}
 setDialogue(text){this.message?.setText(`HINT: ${text}`).setFontSize(18);}
 persist(){if(!this.preview&&this.allowed)this.savedOk=storeRadioSplice(this.progress).saved;}
 check(){if(this.finished||this.blocked())return;this.progress.checks++;const result=evaluateRadio(DATA,this.progress);if(!result.ok){if(Number.isInteger(result.slotIndex))this.selectedSlot=result.slotIndex;this.message.setText(result.message).setFontSize(20);this.persist();this.refreshBoard();return;}this.progress.completed=true;this.finished=true;this.persist();this.showSuccess();}
 showSuccess(){this.checkButton.setVisible(false);this.clearButton.setVisible(false);this.timelineHelp?.hintButton?.setVisible(false);this.conclusionButtons.forEach(c=>c.button.disableInteractive());this.sourceTitle.setText('SUPPORTED: INSTRUCTIONS CHANGED / VOICE NOT AUTHENTICATED');this.sourceBody.setText(DATA.success);this.message.setText(this.preview?'Assembly complete / preview only.':this.savedOk===false?DATA.messages.saveFailed:DATA.messages.complete).setFontSize(20);this.refreshBoard();}
 makeModal(){this.stopAudio();this.modal=this.add.container(0,0);this.root.add(this.modal);const shade=this.add.rectangle(720,510,1440,1020,0x000000,.86).setInteractive();shade.on('pointerdown',(p,x,y,e)=>e?.stopPropagation());this.modal.add(shade);this.modal.add(this.add.rectangle(720,510,1300,760,0x14251a).setStrokeStyle(3,0xa58c56));}
 openSummary(){this.makeModal();this.label(720,245,'SOURCE / WORKING MISSION SUMMARY',28,'#ffe2ae','SpecialElite',this.modal);this.label(720,430,DATA.report,29,'#f0e5cf','SpecialElite',this.modal).setWordWrapWidth(1160);this.label(720,620,DATA.provenance,23,'#c4ccb9','SpecialElite',this.modal).setWordWrapWidth(1160);this.button(720,800,'BACK',()=>this.closeModal(),this.modal);}
 openSequence(){if(this.progress.slots.some(id=>!id)){this.message.setText('Fill all six positions to read the assembled sequence.');return;}this.modalIndex=0;this.makeModal();this.renderSequence();}
 renderSequence(){
  const old=this.modal;this.modal=null;old.destroy(true);this.makeModal();const c=DATA.clips.find(c=>c.id===this.progress.slots[this.modalIndex]);
  this.label(720,230,`ASSEMBLED TRANSCRIPT ${this.modalIndex+1}/${DATA.slotCount} / ${c.label}`,27,'#ffe2ae','SpecialElite',this.modal);
  this.label(720,330,c.speaker,24,'#d7c295','SpecialElite',this.modal);this.label(720,490,c.text,31,'#f0e5cf','SpecialElite',this.modal).setWordWrapWidth(1150);
  if(this.modalIndex>0)this.button(300,760,'PREVIOUS',()=>{this.modalIndex--;this.renderSequence();},this.modal);
  if(this.modalIndex<DATA.slotCount-1)this.button(1140,760,'NEXT',()=>{this.modalIndex++;this.renderSequence();},this.modal);
  this.button(720,820,'BACK TO ASSEMBLY',()=>this.closeModal(),this.modal);
  if(this.progress.slots.every(id=>this.cache.audio.exists(this.audioKey(id))))this.button(720,700,'PLAY ASSEMBLED AUDIO',()=>this.playAudioOrder([...this.progress.slots]),this.modal);
 }
 closeModal(){this.stopAudio();const m=this.modal;this.modal=null;m?.destroy(true);this.lockUntil=this.time.now+180;}
 stopAudio(){this.playbackRun++;const s=this.playingSound;this.playingSound=null;if(s){s.stop();s.destroy();}}
 playSelected(){if(this.inspected)this.playAudioOrder([this.inspected]);}
 playAudioOrder(ids){this.stopAudio();const token=this.playbackRun;const next=index=>{if(token!==this.playbackRun||this.closing||index>=ids.length)return;const key=this.audioKey(ids[index]);if(!this.cache.audio.exists(key))return;try{const sound=this.sound.add(key);this.playingSound=sound;sound.once('complete',()=>{if(this.playingSound===sound)this.playingSound=null;sound.destroy();next(index+1);});if(!sound.play()){sound.destroy();this.playingSound=null;}}catch(error){this.stopAudio();this.message?.setText('Attached audio could not be played. The transcript remains available.');}};next(0);}
 layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1440,height/1020);this.root.setScale(s).setPosition((width-1440*s)/2,(height-1020*s)/2);}
 suspendBackground(){this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(k=>this.isSceneActive(k)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}}
 restoreBackground(){for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;}
 closeSplice(){if(this.closing)return;this.closing=true;this.stopAudio();this.timelineHelp?.close();this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();try{callback?.({preview:this.preview,completed:this.finished,saved:this.savedOk});}finally{this.scene.stop();}}
}
