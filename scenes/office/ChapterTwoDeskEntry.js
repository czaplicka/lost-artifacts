import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { getChapterTwoOpening, finishChapterTwoDeskVisit,
  chapterTwoOpeningConfig as config } from '../../chapterTwoOpeningService.js';

export function installChapterTwoDeskEntry(scene) {
  let disposed = false, loading = false, run = 0;
  const button = scene.add.text(0, 0, config.button, {
    fontFamily: 'SpecialElite, monospace', fontSize: '24px', color: '#ffe2a2',
    backgroundColor: '#15271e', padding: { x: 18, y: 12 }
  }).setOrigin(0.5, 0).setDepth(850).setInteractive({ useHandCursor: true }).setVisible(false);
  const current = () => !disposed && !scene._cleanupDone && scene.sys.isActive();
  const available = () => current() && !loading && scene.currentView === 'office' &&
    !scene._officePanelRequest && !scene.getPlayerHudScene()?.isAnyPanelOpen?.() && getChapterTwoOpening().needsDesk;
  const layout = () => button.setPosition(scene.scale.width / 2, Math.max(95, scene.scale.height * 0.16))
    .setFontSize(scene.scale.width < 600 ? 15 : 24);
  const refresh = () => {
    if (disposed) return;
    const visible = available();
    button.setVisible(visible);
    if (button.input) button.input.enabled = visible;
  };
  button.on('pointerdown', async () => {
    if (!available()) return;
    loading = true; const token = ++run; refresh();
    try {
      const { openOfficeDust } = await import('../../officeDustLauncher.js');
      if (!current() || token !== run) return;
      scene.getPlayerHudScene()?.closeAllUIPanels?.();
      const opened = openOfficeDust(scene.game, {
        preview: false,
        onFinished: result => {
          if (disposed || token !== run) return;
          loading = false;
          if (result?.completed) finishChapterTwoDeskVisit();
          refresh();
        }
      });
      if (!opened) { loading = false; refresh(); }
    } catch (error) {
      console.error('[ChapterTwoDeskEntry]', config.messages.loadFailed, error);
      if (!disposed && token === run) { loading = false; button.setText(__dialogueText("scenes/office/ChapterTwoDeskEntry.js", "t_83b8afd27553010f3d17")); refresh(); }
    }
  });
  const destroy = () => {
    if (disposed) return; disposed = true; run++;
    scene.events.off('update', refresh);
    scene.scale.off('resize', layout);
    scene.events.off('shutdown', destroy);
    scene.events.off('destroy', destroy);
    button.destroy();
  };
  layout(); refresh();
  scene.events.on('update', refresh);
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', destroy);
  scene.events.once('destroy', destroy);
  return { destroy };
}
