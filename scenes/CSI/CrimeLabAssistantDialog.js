import {
  CrimeLabAssistantDialog as CrimeLabAssistantExitDialog,
} from './CrimeLabAssistantExitDialog.js';
import { showDialogueBubbles } from '../../ui/DialogueBubbles.js';

export class CrimeLabAssistantDialog extends CrimeLabAssistantExitDialog {
  open(options = {}) {
    if (!super.open(options)) return false;

    const panel = this.view;

    // Wspólny styl dymka; przewijanie i odpowiedzi nadal obsługuje CSI.
    showDialogueBubbles({
      L: panel.L,
      scene: panel.scene,
      root: panel.root,
      body: panel.body,
      pageLabel: { setText() {} },
      renderTextPage() {},
    }, [{ speaker: 'npc', text: this.fullText }]);

    // Przeliczamy strony na szerokość dymka, nie starej kolumny.
    // Dotychczasowe opcje odpowiedzi pozostają w panelu.
    panel.setText(this.fullText);

    return true;
  }
}