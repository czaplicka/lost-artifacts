import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_story_call_pickup',GAIN=0.65;
export class StoryCallAudio{
  static preload(scene){if(!scene.cache.audio.exists(KEY))scene.load.audio(KEY,'assets/audio/phone-pick.mp3');}
  constructor(scene,{started=false}={}){
    this.scene=scene;this.started=started;this.destroyed=false;this.sound=null;
    this.onInactive=()=>this.stop();this.onShutdown=()=>this.destroy();
    for(const name of ['pause','sleep'])scene.events.on(name,this.onInactive);
    for(const name of ['shutdown','destroy'])scene.events.once(name,this.onShutdown);
  }
  connected(){
    const s=this.scene;
    if(this.started||this.destroyed||s.closing||s._cleanupDone||!s.sys.isActive())return;
    this.started=true;
    if(s.game.sound.locked||!s.cache.audio.exists(KEY))return;
    try{
      audioManager.init(s);
      this.sound=audioManager.playSfx(KEY,{gain:GAIN,volume:audioManager.getSfxVolume()*GAIN});
      const sound=this.sound;
      sound?.once('destroy',()=>{if(this.sound===sound)this.sound=null;});
    }catch(error){console.debug('[StoryCallAudio] Pickup unavailable:',error);this.sound=null;}
  }
  stop(){const sound=this.sound;this.sound=null;if(sound){try{audioManager.releaseSound(sound);}catch(error){console.debug('[StoryCallAudio] Cleanup failed:',error);}}}
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.stop();
    for(const name of ['pause','sleep'])this.scene.events.off(name,this.onInactive);
    for(const name of ['shutdown','destroy'])this.scene.events.off(name,this.onShutdown);
  }
}
