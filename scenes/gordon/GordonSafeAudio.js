import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_gordon_safe_unlock';
const pending=new WeakSet(),sounds=new WeakMap();
export function prepareGordonSafeAudio(scene){
 const load=scene?.load;
 if(!load||!scene.cache?.audio||!scene.events||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/key-lock.mp3');if(!load.isLoading())load.start();}catch(error){cleanup();console.debug('[GordonSafeAudio] Load unavailable:',error);}
}
export function stopGordonSafeAudio(owner){
 const sound=sounds.get(owner);sounds.delete(owner);
 if(sound){try{audioManager.releaseSound(sound);}catch{}}
}
export function playGordonSafeAudio(owner){
 const scene=owner.scene;
 if(owner.destroyed||!owner.isOpen||scene.closing||!scene.sys.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);stopGordonSafeAudio(owner);const sound=audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});
 if(sound){sounds.set(owner,sound);sound.once('destroy',()=>{if(sounds.get(owner)===sound)sounds.delete(owner);});}}
 catch(error){console.debug('[GordonSafeAudio] Sound unavailable:',error);}
}
