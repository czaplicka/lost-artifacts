import {
  AgencyStorageScene as AgencyStorageSkipScene,
} from './AgencyStorageSkipScene.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';

const styledPanels = new WeakSet();

function addAlexBubble(panel) {
  if (!panel?.isOpen || styledPanels.has(panel)) return;

  // Rysujemy dymek już po otwarciu panelu, bez restartowania nagrania.
  // Odtwarzacz Alexa i typewriter nadal korzystają z tego samego obiektu body.
  const initialText = panel._full || panel.body.text || '';
  const previousText = panel.body.text;
  const index = panel.root.getIndex(panel.body);

  showDialogueBubbles({
    L: panel.L,
    scene: panel.scene,
    root: panel.root,
    body: panel.body,
    pageLabel: { setText() {} },
    renderTextPage() {},
  }, [{ speaker: 'npc', text: initialText }]);

  const bubble = panel.root.getAt(index);
  panel.body.setText(previousText);

  // Zostawiamy kolejkę Alexa bez zmian. Styl trzeba tylko przywrócić
  // po każdej nowej kwestii, bo bazowy panel ustawia własny kolor.
  const showLine = panel._showLine.bind(panel);
  panel._showLine = line => {
    showLine(line);
    panel.body.setColor('#f3e7c4');
  };

  // Jeśli panel otworzy się ponownie, grafika zostaje w jego kontenerze.
  // Przy zniszczeniu panelu kontener sprząta ją razem z resztą widoku.
  bubble.setVisible(true);
  styledPanels.add(panel);
}

export class AgencyStorageScene extends AgencyStorageSkipScene {
  startConversation() {
    const opened = super.startConversation();
    if (opened) addAlexBubble(this.storageDialog);
    return opened;
  }
}