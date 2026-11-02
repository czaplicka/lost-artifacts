import { CrashTimelineScene } from './scenes/CrashTimelineScene.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { getHollyChapterOneState } from './hollyChapterOneService.js';

export function openCrashTimeline(game = window.game, { preview = true, onFinished = null } = {}) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  const returnSceneKey = ['ArchiveScene','AgencyStorageScene'].find(key=>game.scene.isActive(key));
  if (!returnSceneKey) throw new Error('Open the archive or storage room first.');
  if (!preview && (getCompletedAgencyCaseCount() < 4 ||
      !MainStoryManager.hasFlag('redacted_report_decoded') ||
      !MainStoryManager.hasFlag('alex_crash_account_heard'))) {
    throw new Error('Complete mission four, decode the report and hear Alex\'s crash account first.');
  }
  const key='CrashTimelineScene';
  if(game.scene.isActive(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,CrashTimelineScene,false);
  game.scene.start(key,{
    preview,returnSceneKey,
    onFinished: result => {
      try { onFinished?.(result); }
      finally {
        if (!preview && result?.completed && getHollyChapterOneState().canContact) {
          // Let the timeline finish its shutdown and the parent finish its resume first.
          game.events.once(Phaser.Core.Events.POST_STEP, () => {
            void import('./hollyChapterOneLauncher.js').then(({openHollyChapterOneFinale}) => {
              if (!game.scene.isActive(returnSceneKey)) return;
              openHollyChapterOneFinale(game,{preview:false,returnSceneKey});
            }).catch(error=>console.error('[Holly finale] Could not open the call:',error));
          });
        }
      }
    }
  });
  game.scene.bringToTop(key);return true;
}
