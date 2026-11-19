import { AlibiScene as AlibiPanelScene } from './AlibiPanelScene.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';

export class AlibiScene extends AlibiPanelScene {
  renderReply() {
    super.renderReply();

    const panel = this.dialoguePanel;
    const entry = this.entry ?? { witness: this.view.personality.opening };

    showDialogueBubbles(panel, [
      { speaker: 'player', text: entry.detective },
      { speaker: 'npc', text: entry.witness },
      {
        speaker: 'note',
        text: [
          this.historyIndex >= 0 ? 'INTERVIEW HISTORY' : '',
          this.view.state.pendingChallenge ? 'FOLLOW-UP REQUIRED' : '',
          entry.note ? `NOTE: ${entry.note}` : '',
          ...this.guidance,
          this.interviewStatus(),
          ...(this.L.panelY < 180 ? [this.witnessContext().join('\n')] : []),
        ].filter(Boolean).join('\n\n'),
      },
    ]);
  }
}