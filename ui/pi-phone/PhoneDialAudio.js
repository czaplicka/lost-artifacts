import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_pi_rotary_dial';
const pending = new WeakSet();
export function preparePhoneDialAudio(scene) {
 const load=scene?.load;
 if(!load||!scene.cache?.audio||!scene.events||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);
 const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/old-phone-dial-the-number.mp3');if(!load.isLoading())load.start();}
 catch(error){cleanup();console.debug('[PhoneDialAudio] Load unavailable:',error);}
}
export function playPhoneDialAudio(phone) {
 if(phone.destroyed||!phone.isOpen||!phone.scene?.cache?.audio?.exists(KEY))return null;
 try{
  audioManager.init(phone.scene);
  const sound=audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});
  if(sound){
   phone.phoneOneShots??=new Set();phone.phoneOneShots.add(sound);
   sound.once('destroy',()=>phone.phoneOneShots?.delete(sound));
  }
  return sound;
 }catch(error){console.debug('[PhoneDialAudio] Playback unavailable:',error);return null;}
}
export function stopPhoneDialAudio(sound) {
 if(sound){try{audioManager.releaseSound(sound);}catch{}}
}
