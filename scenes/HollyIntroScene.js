import { HollyIntroScene as HollyIntroTrustScene } from './HollyIntroTrustScene.js';
import { dialogueText } from '../dialogues/DialogueText.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';

const DETECTIVE = dialogueText(
  'scenes/HollyIntroScene.js',
  't_1e954e77ee4e5253c6c5'
);

function attachBubbleView(panel) {
  const setSpeaker = panel.setSpeaker.bind(panel);
  const setText = panel.setText.bind(panel);

  let side = 'npc';
  let bubble = null;

  panel.setSpeaker = speaker => {
    side = speaker?.name === DETECTIVE ? 'player' : 'npc';
    return setSpeaker(speaker);
  };

  panel.setText = (text, options) => {
    bubble?.destroy();

    // Wspólny moduł ustawia wygląd i położenie dymka.
    // Odtwarzaniem kwestii nadal steruje panel Holly.
    const view = {
      L: panel.L,
      scene: panel.scene,
      root: panel.root,
      body: panel.body,
      pageLabel: { setText() {} },
      renderTextPage() {},
    };

    const index = panel.root.getIndex(panel.body);

    // Strony z modułu alibi nie są tutaj używane: Holly ma własną kolejkę.
    showDialogueBubbles(view, [{ speaker: side, text }]);
    bubble = panel.root.getAt(index);

    return setText(text, options);
  };

  return panel;
}

export class HollyIntroScene extends HollyIntroTrustScene {
  ensureDialoguePanel() {
    if (this.dialoguePanel?.isOpen) return this.dialoguePanel;

    return attachBubbleView(super.ensureDialoguePanel());
  }
}