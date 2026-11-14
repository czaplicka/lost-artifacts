import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_pi_document_printer';
const GAIN = 0.3;
const pending = new WeakSet();
const owned = new WeakMap();
function active(ui){
 const scene=ui?.scene;
 return Boolean(ui&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='office-documents'&&
  !scene?._cleanupDone&&scene?.sys?.isActive()&&scene.cache?.audio?.exists(KEY));
}
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
export function stopDocumentPrinterAudio(ui){owned.get(ui)?.stop();}
export function playDocumentPrinterAudio(ui) {
 if(!active(ui))return null;
 const scene=ui.scene;
 stopDocumentPrinterAudio(ui);
 try{
  audioManager.init(scene);
  const sound=audioManager.playSfx(KEY,{gain:GAIN,volume:audioManager.getSfxVolume()*GAIN});
  if(!sound)return null;
  let cleaned=false;
  const cleanup=()=>{
   if(cleaned)return;cleaned=true;
   scene.events.off('update',check);
   for(const name of ['pause','sleep','shutdown','destroy'])scene.events.off(name,stop);
   sound.off('destroy',cleanup);
   if(owned.get(ui)?.sound===sound)owned.delete(ui);
  };
  const stop=()=>{
   cleanup();
   try{audioManager.releaseSound(sound);}catch(error){console.debug('[DocumentPrinterAudio] Cleanup unavailable:',error);}
  };
  const check=()=>{if(!active(ui))stop();};
  owned.set(ui,{sound,stop});
  sound.once('destroy',cleanup);
  scene.events.on('update',check);
  for(const name of ['pause','sleep','shutdown','destroy'])scene.events.once(name,stop);
  return sound;
 }catch(error){console.debug('[DocumentPrinterAudio] Playback unavailable:',error);return null;}
}
