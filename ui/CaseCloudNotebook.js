import { installCaseNotebook as installLegacyNotebook } from './LegacyCaseCloudNotebook.js';
import { installPlayerCloudNotebook } from './PlayerCloudNotebook.js';
export { notebookKeywordLocation } from './PlayerCloudNotebook.js';
export function installCaseNotebook(ui,scope){
 if(scope==='pi')return installPlayerCloudNotebook(ui);
 return installLegacyNotebook(ui,scope);
}
