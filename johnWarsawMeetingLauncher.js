import { WarsawMeetingScene } from './scenes/WarsawMeetingScene.js';
import { getWarsawMeeting } from './johnWarsawMeetingService.js';
export function openWarsawMeeting(game=window.game,{preview=true,returnSceneKey='DetectiveOfficeScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getWarsawMeeting().eligible)return false;
 if(!game.scene.isActive(returnSceneKey))throw new Error('Open the PI office first.');if(!preview&&returnSceneKey!=='DetectiveOfficeScene')throw new Error('Start this private enquiry from the PI office.');
 const key='WarsawMeetingScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,WarsawMeetingScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
