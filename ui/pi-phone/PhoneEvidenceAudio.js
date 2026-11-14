import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_pi_phone_evidence';
const pending=new WeakSet();
export function preparePhoneEvidenceAudio(scene){
 const load=scene?.load;if(!load||!scene.events||!scene.cache?.audio||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/evidence_collect.mp3');if(!load.isLoading())load.start();}catch(error){cleanup();console.debug('[PhoneEvidenceAudio] Load unavailable:',error);}
}
export function playPhoneEvidenceAudio(phone){
 const scene=phone.scene;
 if(phone.destroyed||!phone.isOpen||phone.directoryOpen||!scene.sys.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);const sound=audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});
 if(sound){phone.phoneOneShots??=new Set();phone.phoneOneShots.add(sound);sound.once('destroy',()=>phone.phoneOneShots?.delete(sound));}}
 catch(error){console.debug('[PhoneEvidenceAudio] Sound unavailable:',error);}
}
