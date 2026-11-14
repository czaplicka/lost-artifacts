import { audioManager } from '../../managers/AudioManager.js';
const ASSETS={paper:['sfx_pi_notebook_paper','paper_rustle.mp3'],page:['sfx_pi_notebook_page','page.mp3']};
const pending=new WeakMap();
export function prepareComputerNotebookAudio(scene){
 const load=scene?.load;if(!load||!scene.events||!scene.cache?.audio)return;
 let keys=pending.get(load);if(!keys){keys=new Set();pending.set(load,keys);}
 let queued=false;
 for(const [key,file] of Object.values(ASSETS)){
  if(scene.cache.audio.exists(key)||keys.has(key))continue;keys.add(key);
  const event=`filecomplete-audio-${key}`;
  const cleanup=()=>{keys.delete(key);if(!keys.size&&pending.get(load)===keys)pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
  const failed=item=>{if(item?.key===key)cleanup();};
  load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
  try{load.audio(key,`assets/audio/${file}`);queued=true;}catch(error){cleanup();console.debug('[ComputerNotebookAudio] Load unavailable:',error);}
 }
 if(queued){try{if(!load.isLoading())load.start();}catch(error){console.debug('[ComputerNotebookAudio] Loader unavailable:',error);}}
}
export function playComputerNotebookAudio(ui,name){
 const scene=ui?.scene,entry=ASSETS[name];
 if(!entry||!ui||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting||scene?._cleanupDone||!scene?.sys?.isActive()||!scene.cache?.audio?.exists(entry[0]))return;
 try{audioManager.init(scene);audioManager.playSfx(entry[0],{volume:audioManager.getSfxVolume()*.25});}
 catch(error){console.debug('[ComputerNotebookAudio] Sound unavailable:',error);}
}
