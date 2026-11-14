import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_menu_action_click';
export function preloadMenuActionAudio(scene){
 if(!scene.cache.audio.exists(KEY))scene.load.audio(KEY,'assets/audio/click.mp3');
}
export function playMenuActionAudio(scene){
 if(scene._cleanupDone||!scene.sys?.isActive()||!scene.cache.audio.exists(KEY))return null;
 try{audioManager.init(scene);return audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.2});}
 catch(error){console.debug('[MenuActionAudio] Click unavailable:',error);return null;}
}
