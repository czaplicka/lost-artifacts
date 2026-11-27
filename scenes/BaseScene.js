import { BaseScene as BaseSceneCore } from './BaseSceneCore.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { installPIInventory, isPIInventoryScene } from '../ui/PIInventoryUI.js';
import { installWorldReactions, queueWorldOfficeReaction } from '../systems/WorldReactionSystem.js';
import { installSpyShopWorldReactions } from '../ui/WorldSpyShopReactionHooks.js';
import { installPostOfficeWorldReactions } from '../ui/WorldPostOfficeReactionHooks.js';
import { installWorldReactionInspector } from '../ui/WorldReactionInspector.js';
import { installStartupTheme } from '../managers/StartupTheme.js';
import { installCityWeather, uninstallCityWeather } from '../systems/CityWeatherManager.js';
import { installPigeonReturnCalls } from '../systems/PigeonReturnCalls.js';
import { installRainThunderAudio, uninstallRainThunderAudio } from '../systems/RainThunderAudio.js';
import { installSceneMonologues, uninstallSceneMonologues } from '../systems/SceneMonologues.js';
import { installCityDayNight, uninstallCityDayNight } from '../systems/CityDayNightManager.js';
import { installForensicValidation } from './CSI/ForensicValuePolicy.js';
import { installCsiSessionPolicy } from './CSI/CsiSessionRuntime.js';

export class BaseScene extends BaseSceneCore {
  constructor(config) {
    super(config);
    installForensicValidation(this, config, () => BaseScene.prototype.create.call(this));
    // Installed after validation so the session wraps the validated init/create.
    // Only the CSI analysis keys are affected; every other scene is left as it is.
    installCsiSessionPolicy(this);
  }
  create() {
    super.create();
    installSceneMonologues(this);installStartupTheme(this);
    installWorldReactions(this.game);queueWorldOfficeReaction(this);
    installSpyShopWorldReactions(this);installPostOfficeWorldReactions(this);
    installWorldReactionInspector(this.game);
    this.events.off(Phaser.Scenes.Events.CREATE,this.createPIInventory,this);
    if(isPIInventoryScene(this)) this.events.once(Phaser.Scenes.Events.CREATE,this.createPIInventory,this);
    installCityWeather(this);installCityDayNight(this);
    installPigeonReturnCalls(this.game);installRainThunderAudio(this);
  }
  createPIInventory(){installPIInventory(this);}
  getInventoryManager(){return isPIInventoryScene(this)?piInventoryManager:inventoryManager;}
  addInventoryItem(item){return this.getInventoryManager().addItem(item);}
  removeInventoryItem(id){return this.getInventoryManager().removeItem(id);}
  getInventoryItem(id){return this.getInventoryManager().getItem(id);}
  hasInventoryItem(id){return this.getInventoryManager().hasItem(id);}
  getAllInventoryItems(){return this.getInventoryManager().getAllItems();}
  getSelectedInventoryItem(){return this.getInventoryManager().getSelectedItem();}
  openInventory(){return isPIInventoryScene(this)?this.piInventoryUI?.open()??false:inventoryManager.open();}
  closeInventory(){return isPIInventoryScene(this)?this.piInventoryUI?.close():inventoryManager.close();}
  cleanup(){
    if(this._cleanupDone)return;
    uninstallSceneMonologues(this);
    this.events.off(Phaser.Scenes.Events.CREATE,this.createPIInventory,this);
    uninstallRainThunderAudio(this);uninstallCityDayNight(this);uninstallCityWeather(this);
    super.cleanup();
    const ui=this.piInventoryUI;this.piInventoryUI=null;ui?.destroy();
  }
}
