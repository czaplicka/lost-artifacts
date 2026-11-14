import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_incoming_mobile_tune';
const GAIN=0.65;
export class IncomingMobileAudio {
  static preload(scene){if(!scene.cache.audio.exists(KEY))scene.load.audio(KEY,'assets/audio/mobile-tune.mp3');}
  constructor(scene){
    this.scene=scene;this.sound=null;this.destroyed=false;this.listening=false;
    this.onUnlock=()=>this.play();this.onInactive=()=>this.stop();this.onActive=()=>this.start();this.onShutdown=()=>this.destroy();
    for(const name of ['pause','sleep'])scene.events.on(name,this.onInactive);
    for(const name of ['resume','wake'])scene.events.on(name,this.onActive);
    scene.events.once('shutdown',this.onShutdown);scene.events.once('destroy',this.onShutdown);
  }
  isRinging(){const s=this.scene;return !this.destroyed&&!s.isAnswered&&!s.isEnding&&!s.isShuttingDown&&!s._cleanupDone&&s.sys.isActive();}
  start(){
    if(!this.isRinging())return;
    if(this.scene.game.sound.locked){
      if(!this.listening){this.listening=true;this.scene.game.sound.once('unlocked',this.onUnlock);}return;
    }
    this.play();
  }
  play(){
    this.cancelUnlock();if(!this.isRinging()||this.sound?.isPlaying||!this.scene.cache.audio.exists(KEY))return;
    if(this.sound){audioManager.releaseSound(this.sound);this.sound=null;}
    try{
      audioManager.init(this.scene);
      this.sound=audioManager.playLoopSfx(KEY,{gain:GAIN,volume:audioManager.getSfxVolume()*GAIN});
    }catch(error){console.debug('[IncomingMobileAudio] Ringtone unavailable:',error);this.sound=null;}
  }
  cancelUnlock(){if(!this.listening)return;this.listening=false;this.scene.game.sound.off('unlocked',this.onUnlock);}
  stop(){
    this.cancelUnlock();const sound=this.sound;this.sound=null;
    if(sound){try{audioManager.releaseSound(sound);}catch(error){console.debug('[IncomingMobileAudio] Cleanup failed:',error);}}
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.stop();
    const events=this.scene.events;
    for(const name of ['pause','sleep'])events.off(name,this.onInactive);
    for(const name of ['resume','wake'])events.off(name,this.onActive);
    events.off('shutdown',this.onShutdown);events.off('destroy',this.onShutdown);
  }
}
