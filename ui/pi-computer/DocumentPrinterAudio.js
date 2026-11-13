import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_pi_document_printer';
const pending = new WeakSet();
export function prepareDocumentPrinterAudio(scene) {
 const load=scene?.load;
 if(!load||!scene.cache?.audio||!scene.events||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);
 const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/printer.mp3');if(!load.isLoading())load.start();}
 catch(error){cleanup();console.debug('[DocumentPrinterAudio] Load unavailable:',error);}
}
export function playDocumentPrinterAudio(ui) {
 const scene=ui?.scene;
 if(ui.destroyed||!ui.isOpen||ui.suspended||ui.app!=='office-documents'||!scene?.sys?.isActive()||!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.3});}
 catch(error){console.debug('[DocumentPrinterAudio] Playback unavailable:',error);}
}
