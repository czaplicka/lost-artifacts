import { getPigeonLoft } from '../../managers/PigeonManager.js';
import { pigeonNeedsName, confirmPigeonName } from '../../managers/PigeonNaming.js';
import { openPigeonNameInput } from '../../ui/PigeonNameInput.js';
import { pigeonNamingText as t } from '../../dialogues/PigeonNamingText.js';

export class PigeonLoftNaming {
  constructor(scene) { this.scene = scene; }
  displayName(bird) { return pigeonNeedsName(bird) ? t('unnamed') : bird.name; }
  presentBird(bird) { return pigeonNeedsName(bird) ? { ...bird, name: t('unnamed') } : bird; }
  tipLabel(label) {
    const normalized = String(label).replace(/\u00a0/g, ' ');
    const bird = this.scene.state?.birds?.find(entry => pigeonNeedsName(entry) &&
      normalized === entry.name + '  (click to talk)');
    return bird ? t('unnamed') + '  (click to talk)' : label;
  }
  beforeOpen(slot, options = {}) {
    const s = this.scene;
    if (s.leaving || s.debugMode || s._cleanupDone || s.pigeonNameEditor) return null;
    const bird = s.state?.slots?.find(entry => entry.slot === slot)?.bird;
    if (!bird) return options;
    if (s.namingSession?.id !== bird.id) s.namingSession = null;
    if (bird.status !== 'flying' && pigeonNeedsName(bird) && !s.namingSession) {
      s.namingSession = { id: bird.id, slot, stage: 0, renaming: false };
    }
    const session = s.namingSession;
    if (session && bird.status !== 'flying') {
      const text = session.stage === 0 ? t(session.renaming ? 'renameIntro' : 'intro') : t('proposal');
      return { ...options, text };
    }
    return options;
  }
  topics(bird) {
    const s = this.scene, session = s.namingSession;
    if (session?.id !== bird.id || bird.status === 'flying') return null;
    return [{ id: 'pigeon-name-dialogue', label: t(session.stage === 0 ? 'next' : 'choose'), state: 'accent',
      onSelect: () => {
        if (s.namingSession !== session || s.pigeonNameEditor || s.leaving || s._cleanupDone) return;
        if (session.stage === 0) { session.stage = 1; s.openBirdDialogue(session.slot); }
        else this.choose(session);
      }
    }];
  }
  startRename(bird) {
    const s = this.scene;
    if (s.leaving || s.debugMode || s._cleanupDone || s.pigeonNameEditor) return;
    s.namingSession = { id: bird.id, slot: bird.slot, stage: 0, renaming: true };
    s.openBirdDialogue(bird.slot);
  }
  choose(session) {
    const s = this.scene;
    if (s.pigeonNameEditor || s.namingSession !== session) return;
    const bird = getPigeonLoft().birds.find(entry => entry.id === session.id);
    if (!bird || bird.status === 'flying') return;
    // Usuwamy capture klawiatury panelu PRZED otwarciem pola DOM.
    // Nie wołamy closeDialogue(), bo skasowałoby sesję nadawania imienia.
    s.dialogue?.destroy();
    s.dialogue = null;
    try {
      s.pigeonNameEditor = openPigeonNameInput(s, {
        initialValue: session.renaming ? bird.name : '',
        onCancel: () => {
          s.pigeonNameEditor = null;
          if (s.namingSession === session && !s.leaving && !s._cleanupDone && s.sys.isActive()) {
            s.openBirdDialogue(session.slot);
          }
        },
        onConfirm: name => {
          if (s.leaving || s._cleanupDone || !s.sys.isActive() ||
            s.namingSession !== session || !s.pigeonNameEditor) return { ok: false, message: t('unavailable') };
          const result = confirmPigeonName(session.id, name);
          if (!result.ok) return result;
          s.pigeonNameEditor = null;
          s.namingSession = null;
          s.renderLoft();
          s.openBirdDialogue(session.slot, { text: name === t('suggestion') ?
            t('namedWatson') : t('named', { name: result.name }) });
          return result;
        }
      });
    } catch (error) {
      s.pigeonNameEditor = null;
      s.openBirdDialogue(session.slot);
      s.showToast(error.message || t('failed'), 'error');
    }
  }
  reset() {
    const s = this.scene;
    const editor = s.pigeonNameEditor;
    s.pigeonNameEditor = null;
    s.namingSession = null;
    editor?.destroy();
  }
  destroy() { this.reset(); }
}
