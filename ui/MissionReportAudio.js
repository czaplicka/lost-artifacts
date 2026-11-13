import { audioManager } from '../managers/AudioManager.js';
const KEY='sfx_agency_report_printer';
const pending=new WeakSet(),sounds=new WeakMap();
export function prepareMissionReportAudio(scene){
 const load=scene?.load;
 if(!load||!scene.cache?.audio||!scene.events||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/printer.mp3');if(!load.isLoading())load.start();}
 catch(error){cleanup();console.debug('[MissionReportAudio] Load unavailable:',error);}
}
export function stopMissionReportAudio(owner){
 const sound=sounds.get(owner);sounds.delete(owner);
 if(sound){try{audioManager.releaseSound(sound);}catch{}}
}
export function playMissionReportAudio(owner){
 const scene=owner.scene;
 if(!owner.root||scene._cleanupDone||!scene.sys.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);stopMissionReportAudio(owner);const sound=audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});
 if(sound){sounds.set(owner,sound);sound.once('destroy',()=>{if(sounds.get(owner)===sound)sounds.delete(owner);});}}
 catch(error){console.debug('[MissionReportAudio] Sound unavailable:',error);}
}
