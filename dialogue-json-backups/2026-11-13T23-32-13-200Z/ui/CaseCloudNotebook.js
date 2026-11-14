import { installCaseNotebook as installLegacyNotebook } from './LegacyCaseCloudNotebook.js';
import { installPlayerCloudNotebook } from './PlayerCloudNotebook.js';
import { installPIOfficeNotebook } from './PIOfficeNotebookIntegration.js';
import { installNotebookWordBankToggle } from './NotebookWordBankToggle.js';

export { notebookKeywordLocation } from './PlayerCloudNotebook.js';

export function installCaseNotebook(ui, scope) {
  if (scope === 'pi') {
    const previousRoots = new Set(document.querySelectorAll('.pcn'));
    const notebook = ui.scene?.sys?.settings?.key === 'DetectiveOfficeScene'
      ? installPIOfficeNotebook(ui)
      : installPlayerCloudNotebook(ui);
    installNotebookWordBankToggle(ui, notebook, previousRoots);
    return notebook;
  }
  return installLegacyNotebook(ui, scope);
}
