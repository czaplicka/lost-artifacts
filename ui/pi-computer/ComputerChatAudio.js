import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_pi_chat_key';
const pending=new WeakSet();
export function prepareComputerChatAudio(scene){
 const load=scene?.load;
 if(!load||!scene.events||!scene.cache?.audio||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/single-key.mp3');if(!load.isLoading())load.start();}
 catch(error){cleanup();console.debug('[ComputerChatAudio] Load unavailable:',error);}
}
export function playComputerChatKey(ui){
 const scene=ui?.scene;
 if(!ui||ui.destroyed||!ui.isOpen||ui.suspended||ui.app!=='chat'||!scene?.sys?.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.15});}
 catch(error){console.debug('[ComputerChatAudio] Sound unavailable:',error);}
}
