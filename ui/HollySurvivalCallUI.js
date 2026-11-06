import { HollyChapterOneCallUI } from './HollyChapterOneCallUI.js';
import { MON_X,MON_Y,GREEN,GREEN_CSS } from './pi-phone/PhoneConfig.js';
export class HollySurvivalCallUI extends HollyChapterOneCallUI{
  setSilenceUntil(time){this.silenceUntil=time;this.render();}
  render(){
    super.render();if(this.destroyed||!this.nextKey)return;
    if((this.silenceUntil||0)>this.scene.time.now)this.nextKey.setLabel('LINE OPEN...');
    else if(!this.typingItem&&this.lines.length&&this.lineIndex>=this.lines.length-1)this.nextKey.setLabel('END CALL');
  }
  update(time){
    super.update(time);if(this.destroyed||!this.silenceUntil)return;
    if(this.silenceUntil>this.scene.time.now){
      this.status.setText('CONNECTED / SILENCE');this.wave.clear();this.wave.lineStyle(2,GREEN,0.7);this.wave.lineBetween(MON_X+30,MON_Y+174,MON_X+500,MON_Y+174);
    }else{this.silenceUntil=0;this.status.setText('CONNECTED / HOLLY');this.status.setColor(GREEN_CSS);this.render();}
  }
}
