import { installAlibiImprovements as installExistingAlibiImprovements } from './AlibiImprovementsBase.js';
import { installAlibiGuidance } from './AlibiGuidanceUI.js';
const KEY=Symbol.for('lostArtifacts.alibiGuidanceBundleV3');
export function installAlibiImprovements(ui,documents){
 if(ui[KEY])return ui[KEY];
 const existing=installExistingAlibiImprovements(ui,documents);
 const guidance=installAlibiGuidance(ui,documents);
 let dead=false;
 const api={destroy(){if(dead)return;dead=true;guidance.destroy();existing?.destroy?.();if(ui[KEY]===api)delete ui[KEY];}};
 ui[KEY]=api;return api;
}
