import { audioManager } from '../../managers/AudioManager.js';
const EFFECTS={page:['sfx_recovered_catalog_page','page.mp3',.25],paper:['sfx_recovered_catalog_detail','paper_rustle.mp3',.25],click:['sfx_recovered_catalog_close','click.mp3',.15]};
const owned=new WeakMap();
export function preloadRecoveredArtifactsAudio(scene){
 for(const[key,file]of Object.values(EFFECTS))if(!scene.cache.audio.exists(key))scene.load.audio(key,`assets/audio/${file}`);
}
export function playRecoveredArtifactsAudio(scene,name){
 const entry=EFFECTS[name];
 if(!entry||scene.closing||scene._cleanupDone||!scene.sys?.isActive()||!scene.cache.audio.exists(entry[0]))return;
 try{
  audioManager.init(scene);
  const sound=audioManager.playSfx(entry[0],{volume:audioManager.getSfxVolume()*entry[2]});
  if(sound){let sounds=owned.get(scene);if(!sounds){sounds=new Set();owned.set(scene,sounds);}sounds.add(sound);sound.once('destroy',()=>sounds.delete(sound));}
 }catch(error){console.debug('[RecoveredArtifactsAudio] Sound unavailable:',error);}
}
export function stopRecoveredArtifactsAudio(scene){
 const sounds=owned.get(scene);owned.delete(scene);
 for(const sound of sounds||[]){try{audioManager.releaseSound(sound);}catch{}}
}
