import { installDeadMenTopicPhone } from '../../managers/DeadMenPhoneTopics.js';
import { installDeadMenWebPhone } from '../../managers/DeadMenWebIntegration.js';
import { SFX } from './PhoneConfig.js';
import { installDeadMenPhone } from '../../managers/DeadMenCallingService.js';
import { installDeadMenFollowupPhone } from '../../managers/DeadMenCallingFollowup.js';
import { installDeadMenFinalePhone } from '../../managers/DeadMenCallingFinale.js';
import { installFinancialTracePhone } from '../../managers/FinancialTracePhone.js';
import { preparePhoneDialAudio,playPhoneDialAudio,stopPhoneDialAudio } from './PhoneDialAudio.js';
export const PhoneCalls={
 pickUp(){
  installDeadMenPhone(this);installDeadMenFollowupPhone(this);installDeadMenFinalePhone(this);installDeadMenWebPhone(this);installDeadMenTopicPhone(this);installFinancialTracePhone(this);
  if(this.state!=='on_hook'){this.hangUp();return;}
  preparePhoneDialAudio(this.scene);
  this.state='ready';this.number='';this.status='Dial a three-digit local number.';this.clearLog();this.playOnce(SFX.pickup,.7);
  if(this._hasAudio(SFX.dialTone))this.playOnce(SFX.dialTone,.6);else this.later(250,()=>this.tone(350,.65));this.render();
 },
 hangUp(){this.cancelActivity();this.tone(140,.09,.05);this.state='on_hook';this.number='';this.lines=[];this.lineIndex=0;this.clearLog();this.status='Receiver replaced.';this.render();},
 dialDigit(digit){
  if(this.destroyed||!this.isOpen||this.directoryOpen||this.state!=='ready')return;
  if(typeof digit!=='string'||!/^[0-9]$/.test(digit))return;
  const length=Number(this.data.numberLength)||3;if(this.number.length>=length)return;
  this.state='dialling';this.status='Dialling...';const index=digit==='0'?9:Number(digit)-1,pulses=digit==='0'?10:Number(digit),rotation=60+index*30,run=this.run;
  let dialSound=null;
  this.render();
  this.dialTween=this._tween({targets:this.dial,angle:rotation,duration:200+rotation*2.2,ease:'Sine.easeOut',onUpdate:()=>this.uprightLabels(),onComplete:()=>{
   if(!this.isOpen||this.run!==run){stopPhoneDialAudio(dialSound);return;}
   const duration=220+pulses*70;
   if(!dialSound)for(let i=0;i<pulses;i++)this.later(i*duration/pulses,()=>this.tone(850,.025,.015));
   this.dialTween=this._tween({targets:this.dial,angle:0,duration,ease:'Linear',onUpdate:()=>this.uprightLabels(),onComplete:()=>{
    stopPhoneDialAudio(dialSound);
    if(!this.isOpen||this.run!==run)return;
    this.dialTween=null;this.number+=digit;this.state='ready';this.status='Dial the next digit.';
    if(this.number.length===length)this.startCall();else this.render();
   }});
   if(!this.dialTween)stopPhoneDialAudio(dialSound);
  }});
  if(!this.dialTween)this.state='ready';
  else{dialSound=playPhoneDialAudio(this);if(!dialSound)this.playOnce(SFX.dialSpin,.5);}
 },
 startCall(){
  if(this.ownContact&&this.number===this.ownContact.number){this.finishCall('You are calling yourself. A bold investigative technique.');return;}
  const contact=this.contacts.find(c=>c.number===this.number);if(!contact){this.tone(220,.4);this.finishCall('The number you have dialled is not in service.');return;}
  if(contact.status==='busy'){this.state='busy';this.status='The line is busy. Hang up and try again.';this.render();this.startBusy();return;}
  this.state='ringing';this.status='Ringing...';this.render();this.startRing();this.later(3000,()=>{if(contact.status==='no_answer')this.finishCall('No answer.');else this.connect(contact);});
 },
 startRing(){if(!this.startLoop(SFX.ringback,.7))this.ringSignal();},startBusy(){if(!this.startLoop(SFX.busy,.7))this.busySignal();},
 ringSignal(){if(this.state!=='ringing')return;this.tone(440,.55);this.later(110,()=>this.tone(480,.45));this.later(1600,()=>{if(this.state==='ringing')this.ringSignal();});},
 busySignal(){if(this.state!=='busy')return;this.tone(480,.18);this.later(500,()=>{if(this.state==='busy')this.busySignal();});},
 connect(contact){this.cancelActivity();const data=this.scene.cache.json.get('piPhoneDialogues'),lines=data?.dialogues?.[contact.dialogueId];if(!Array.isArray(lines)||!lines.length){this.finishCall('The caller hangs up without a word.');return;}this.state='connected';this.contactName=contact.name;this.lines=lines;this.lineIndex=0;this.callStart=this.scene.time.now;this.clearLog();this.showDialogueLine();},
 showDialogueLine(){const line=this.lines[this.lineIndex];if(!line){this.finishCall('The call has ended.');return;}const speaker=line.speaker||this.contactName,isYou=String(speaker).trim().toLowerCase()==='you';this.status='';const item=this.addBubble(speaker,line.text||'',isYou);this.typeItem(item);this.render();},
 nextLine(){if(this.state!=='connected')return;if(this.typingItem){this.finishTyping(this.typingItem);return;}this.lineIndex++;this.showDialogueLine();},
 finishCall(message){this.cancelActivity();this.state='ended';if(this.logItems.length){this.addSystemNote(`${message}  Hang up to dial again.`);this.status='';}else this.status=`${message}\n\nHang up to dial again.`;this.render();}
};
