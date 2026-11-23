import { dialogueText } from '../../dialogues/DialogueText.js';

const INSTALLED = Symbol('pi-new-mail-button');
const source = 'ui/pi-computer/ReedContactMail.js';
const composeLabel = 't_ea1d31c7cc79a22e408d';
const normalize = value => String(value ?? '').trim().toUpperCase();

export function installPINewMailButton(ui, documents, rawButton) {
  if (documents[INSTALLED]) return documents[INSTALLED];
  const drawing = ui.drawing;
  const filteredButton = drawing.button;
  if (typeof rawButton !== 'function' || typeof filteredButton !== 'function') return null;
  let dead = false;

  function button(x, y, label, ...args) {
    const box = ui.window;
    const isCompose = !dead && ui.app === 'mail' && box &&
      normalize(label) === normalize(dialogueText(source, composeLabel));
    if (isCompose) {
      // While the mailbox renders, ui.window is its contentBox (y + 44).
      // Keep NEW MAIL on the actual title bar, above INBOX / ARCHIVE / TRASH.
      const top = box.y - (documents.mailbox?.renderingMail ? 44 : 0);
      return rawButton.call(this, box.x + box.w - 264, top + 6, 'NEW MAIL', ...args);
    }
    return filteredButton.call(this, x, y, label, ...args);
  }

  function destroy() {
    if (dead) return;
    dead = true;
    // The core filter's shutdown handler runs first, so restore its original too.
    if (drawing.button === button) drawing.button = rawButton;
    if (documents[INSTALLED] === api) delete documents[INSTALLED];
    ui.scene.events.off('shutdown', destroy);
    ui.scene.events.off('destroy', destroy);
  }

  const api = { destroy };
  documents[INSTALLED] = api;
  drawing.button = button;
  ui.scene.events.once('shutdown', destroy);
  ui.scene.events.once('destroy', destroy);
  return api;
}
