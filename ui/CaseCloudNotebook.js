import { installCaseNotebook as installLegacyNotebook } from './LegacyCaseCloudNotebook.js';
import { installPlayerCloudNotebook } from './PlayerCloudNotebook.js';
import { installPIOfficeNotebook } from './PIOfficeNotebookIntegration.js';
export { notebookKeywordLocation } from './PlayerCloudNotebook.js';
export function installCaseNotebook(ui,scope){
  if(scope==='pi'){
    if(ui.scene?.sys?.settings?.key==='DetectiveOfficeScene')return installPIOfficeNotebook(ui);
    return installPlayerCloudNotebook(ui);
  }
  return installLegacyNotebook(ui,scope);
}
