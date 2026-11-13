import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_pi_evidence_text';
const pending=new WeakSet();
export function prepareEvidenceTextAudio(scene){
 const load=scene?.load;
 if(!load||!scene.cache?.audio||!scene.events||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/evidence_collect.mp3');if(!load.isLoading())load.start();}
 catch(error){cleanup();console.debug('[EvidenceTextAudio] Load unavailable:',error);}
}
export function playEvidenceTextAudio(ui){
 const scene=ui?.scene;
 if(!ui||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting||scene?._cleanupDone||!scene?.sys?.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});}
 catch(error){console.debug('[EvidenceTextAudio] Sound unavailable:',error);}
}
