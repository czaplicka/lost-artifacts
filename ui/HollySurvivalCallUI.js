import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { HollyChapterOneCallUI } from './HollyChapterOneCallUI.js';
import { MON_X,MON_Y,GREEN,GREEN_CSS } from './pi-phone/PhoneConfig.js';
export class HollySurvivalCallUI extends HollyChapterOneCallUI{
  setSilenceUntil(time){this.silenceUntil=time;this.render();}
  render(){
    super.render();if(this.destroyed||!this.nextKey)return;
    if((this.silenceUntil||0)>this.scene.time.now)this.nextKey.setLabel(__dialogueText("ui/HollySurvivalCallUI.js", "t_9567c4a49fc415b58d57"));
    else if(!this.typingItem&&this.lines.length&&this.lineIndex>=this.lines.length-1)this.nextKey.setLabel(__dialogueText("ui/HollySurvivalCallUI.js", "t_5e11ef322268653bbe33"));
  }
  update(time){
    super.update(time);if(this.destroyed||!this.silenceUntil)return;
    if(this.silenceUntil>this.scene.time.now){
      this.status.setText(__dialogueText("ui/HollySurvivalCallUI.js", "t_9474647d83b8d5301d2a"));this.wave.clear();this.wave.lineStyle(2,GREEN,0.7);this.wave.lineBetween(MON_X+30,MON_Y+174,MON_X+500,MON_Y+174);
    }else{this.silenceUntil=0;this.status.setText(__dialogueText("ui/HollySurvivalCallUI.js", "t_3b051a970c356f002eed"));this.status.setColor(GREEN_CSS);this.render();}
  }
}
