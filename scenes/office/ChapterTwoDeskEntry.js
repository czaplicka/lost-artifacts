import {
  getChapterTwoOpening,
  finishChapterTwoDeskVisit,
  chapterTwoOpeningConfig as config
} from '../../chapterTwoOpeningService.js';

export function installChapterTwoDeskEntry(scene) {
  let disposed = false;
  let loading = false;
  let requestId = 0;
  const officeRun = scene._runToken;

  const button = scene.add.text(0, 0, config.button, {
    fontFamily: 'SpecialElite, monospace',
    fontSize: '24px',
    color: '#ffe2a2',
    backgroundColor: '#15271e',
    padding: { x: 18, y: 12 }
  }).setOrigin(0.5, 0).setDepth(850)
    .setInteractive({ useHandCursor: true }).setVisible(false);

  const sameRun = () => !disposed && !scene._cleanupDone && scene._runToken === officeRun;
  const active = () => sameRun() && scene.sys.isActive();
  const canEnter = () => Boolean(
    active() &&
    scene.currentView === 'office' &&
    !scene.uiLocked &&
    !scene._officePanelRequest &&
    !scene.navigation?.isMoving &&
    !scene.agencyComputerUI?.isOpen &&
    !scene.agencyLedgerUI?.isOpen &&
    !scene.saveUI?.isOpen &&
    !scene.getPlayerHudScene?.()?.isAnyPanelOpen?.() &&
    getChapterTwoOpening().needsDesk
  );

  const layout = () => {
    if (!sameRun()) return;
    button.setPosition(scene.scale.width / 2, Math.max(95, scene.scale.height * 0.16))
      .setFontSize(scene.scale.width < 600 ? 15 : 24);
  };

  const refresh = () => {
    if (disposed) return;
    const visible = !loading && canEnter();
    button.setVisible(visible);
    if (button.input) button.input.enabled = visible;
  };

  const open = async () => {
    if (!active() || loading) return false;
    const request = ++requestId;
    const valid = () => sameRun() && request === requestId;
    let launched = false;
    let finished = false;
    loading = true;
    try {
      scene.refreshPanelLock?.();
      if (!canEnter()) return false;
      refresh();
      const { openOfficeDust } = await import('../../officeDustLauncher.js');
      if (!valid() || !active()) return false;
      scene.refreshPanelLock?.();
      // Importing may take time: location, panels and story flags can change.
      if (!canEnter()) return false;
      scene.getPlayerHudScene?.()?.closeAllUIPanels?.();
      launched = Boolean(openOfficeDust(scene.game, {
        preview: false,
        onFinished: result => {
          if (!valid() || finished) return;
          finished = true;
          loading = false;
          try {
            if (result?.completed) finishChapterTwoDeskVisit();
          } catch (error) {
            console.error('[ChapterTwoDeskEntry] Completion failed:', error);
          } finally {
            if (valid()) refresh();
          }
        }
      }));
      return launched;
    } catch (error) {
      console.error('[ChapterTwoDeskEntry]', config.messages.loadFailed, error);
      if (valid()) button.setText('RETRY DESK INVESTIGATION');
      return false;
    } finally {
      if (valid() && !launched) {
        loading = false;
        refresh();
      }
    }
  };

  const onPointerDown = (pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
    void open();
  };

  const destroy = () => {
    if (disposed) return;
    disposed = true;
    requestId++;
    scene.events.off('update', refresh);
    scene.scale.off('resize', layout);
    scene.events.off('shutdown', destroy);
    scene.events.off('destroy', destroy);
    button.removeAllListeners();
    button.destroy();
  };

  button.on('pointerdown', onPointerDown);
  layout();
  refresh();
  scene.events.on('update', refresh);
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', destroy);
  scene.events.once('destroy', destroy);
  return { destroy };
}
