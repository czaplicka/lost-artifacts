import { TypewriterComparisonScene } from './scenes/TypewriterComparisonScene.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';

export function openTypewriterComparison(game=window.game,{preview=true,onFinished=null}={}) {
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const returnSceneKey=['ArchiveScene','OfficeScene','DetectiveOfficeScene'].find(key=>game.scene.isActive(key));
  if(!returnSceneKey)throw new Error('Open the archive or an office first.');
  if(!preview&&(getCompletedAgencyCaseCount()<5||!MainStoryManager.hasFlag('holly_chapter_two_unlocked')||!MainStoryManager.hasFlag('office_dust_reconstructed')))
    throw new Error('Complete mission five and the office dust investigation first.');
  const key='TypewriterComparisonScene';if(game.scene.isActive(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,TypewriterComparisonScene,false);
  game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
