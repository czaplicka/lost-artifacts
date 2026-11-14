import { EscapeTimelineScene } from './scenes/EscapeTimelineScene.js';
import { getEscapeTimelineStory } from './escapeTimelineService.js';
import { getHollySurvivalState } from './hollySurvivalUpdateService.js';
export function openEscapeTimeline(game=window.game,{preview=true,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=['AgencyStorageScene','MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));if(!parent)throw new Error('Open Storage or an agency office first.');
  if(!preview&&(parent!=='AgencyStorageScene'||!getEscapeTimelineStory().eligible))throw new Error('Hear Alex\'s admission after mission eight first.');
  const key='EscapeTimelineScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,EscapeTimelineScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished:result=>{
    try{onFinished?.(result);}finally{
      if(!preview&&result.completed&&getHollySurvivalState().canContact){
        game.events.once(Phaser.Core.Events.POST_STEP,()=>{
          if(!game.scene.isActive(parent))return;
          void import('./hollySurvivalUpdateLauncher.js').then(({openHollySurvivalUpdate})=>{
            if(!game.scene.isActive(parent)||!getHollySurvivalState().canContact)return;
            openHollySurvivalUpdate(game,{preview:false,returnSceneKey:parent});
          }).catch(error=>{
            console.error('[Holly survival update]',error);game.scene.keys[parent]?.showStatus?.('Call Holly from the telephone in your PI office to continue.');
          });
        });
      }
    }
  }});game.scene.bringToTop(key);return true;
}
