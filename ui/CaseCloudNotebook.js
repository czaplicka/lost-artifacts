import { installCaseNotebook as installLegacyNotebook } from './LegacyCaseCloudNotebook.js';
import { installPlayerCloudNotebook } from './PlayerCloudNotebook.js';
import { installPIOfficeNotebook } from './PIOfficeNotebookIntegration.js';
import { installNotebookWordBankToggle } from './NotebookWordBankToggle.js';
import { installNotebookBoardPins } from './NotebookBoardPins.js';
import { installAgencyNotebook } from './AgencyNotebook.js';

export { notebookKeywordLocation } from './PlayerCloudNotebook.js';

export function installCaseNotebook(ui,scope){
  if(scope==='agency')return installAgencyNotebook(ui);
  if(scope==='pi'){
    const previousRoots=new Set(document.querySelectorAll('.pcn'));
    const notebook=ui.scene?.sys?.settings?.key==='DetectiveOfficeScene'
      ?installPIOfficeNotebook(ui):installPlayerCloudNotebook(ui);
    installNotebookWordBankToggle(ui,notebook,previousRoots);
    installNotebookBoardPins(ui,notebook,previousRoots);
    return notebook;
  }
  return installLegacyNotebook(ui,scope);
}
