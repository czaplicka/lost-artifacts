import { audioManager } from '../../managers/AudioManager.js';
const ASSETS={click:['sfx_typewriter_mark','click.mp3',.15],wrong:['sfx_typewriter_wrong','wrong.mp3',.25],success:['sfx_typewriter_complete','success.mp3',.35],paper:['sfx_typewriter_help','paper_rustle.mp3',.25]};
const sounds=new WeakMap();
export function preloadTypewriterAudio(scene){
 for(const[key,file]of Object.values(ASSETS))if(!scene.cache.audio.exists(key))scene.load.audio(key,`assets/audio/${file}`);
}
export function playTypewriterAudio(scene,name){
 const entry=ASSETS[name];if(!entry||scene.closing||scene._cleanupDone||!scene.sys.isActive()||!scene.cache.audio.exists(entry[0]))return;
 try{audioManager.init(scene);const sound=audioManager.playSfx(entry[0],{volume:audioManager.getSfxVolume()*entry[2]});
 if(sound){let owned=sounds.get(scene);if(!owned){owned=new Set();sounds.set(scene,owned);}owned.add(sound);sound.once('destroy',()=>owned.delete(sound));}}
 catch(error){console.debug('[TypewriterComparisonAudio] Sound unavailable:',error);}
}
export function stopTypewriterAudio(scene){
 const owned=sounds.get(scene);sounds.delete(scene);
 for(const sound of owned||[]){try{audioManager.releaseSound(sound);}catch{}}
}
