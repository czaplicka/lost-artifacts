const pendingHudRestores = new WeakMap();

const HUD_KEY = 'PlayerHudScene';
const HUD_WAIT_MAX_FRAMES = 600;
const DEBUG_HUD_HELPERS = false;

export function ensureHud(
  scene,
  { throwOnMissing = true } = {},
) {
  const sceneKey = scene?.sys?.settings?.key || 'unknown';
  const scenePlugin = scene?.scene;
  const manager = scenePlugin?.manager;

  const hud = manager?.keys?.[HUD_KEY] || null;

  if (!hud) {
    const message =
      `[ensureHud] "${HUD_KEY}" is not registered. ` +
      `Called from scene "${sceneKey}".`;

    console.error(message);

    if (throwOnMissing) {
      throw new Error(message);
    }

    return null;
  }

  // Kolejne wywolanie z tej samej sceny zastepuje poprzednie oczekiwanie.
  pendingHudRestores.get(scene)?.();

  let cancelled = false;
  let framesWaited = 0;

  function cleanup() {
    if (cancelled) {
      return;
    }

    cancelled = true;

    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, restoreWhenReady);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    scene.events.off(Phaser.Scenes.Events.SLEEP, cleanup);
    hud.events?.off('hud-ready', restoreWhenReady);

    if (pendingHudRestores.get(scene) === cleanup) {
      pendingHudRestores.delete(scene);
    }
  }

  function applyHudContext() {
    if (
      cancelled
      || scene._cleanupDone
      || !scene.sys.isActive()
      || !scenePlugin.isActive(HUD_KEY)
      || !hud.isHudReady
    ) {
      return false;
    }

    hud.setCurrentGameplayScene(sceneKey);

    return true;
  }

  function restoreWhenReady() {
    if (cancelled) {
      return;
    }

    if (scene._cleanupDone || !scene.sys.isActive()) {
      cleanup();
      return;
    }

    if (!applyHudContext()) {
      framesWaited += 1;

      if (framesWaited >= HUD_WAIT_MAX_FRAMES) {
        console.warn(
          `[ensureHud] "${HUD_KEY}" was not ready after ` +
          `${HUD_WAIT_MAX_FRAMES} frames. Giving up for scene "${sceneKey}".`,
          hud.debugPanelStatus?.(),
        );
        cleanup();
      }

      return;
    }

    if (DEBUG_HUD_HELPERS) {
      console.debug('[ensureHud] HUD restored:', {
        gameplayScene: sceneKey,
        hudReady: hud.isHudReady,
        hudActive: scenePlugin.isActive(HUD_KEY),
        hudVisible: hud.sys.settings.visible,
      });
    }

    cleanup();
  }

  pendingHudRestores.set(scene, cleanup);

  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, restoreWhenReady);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  scene.events.once(Phaser.Scenes.Events.SLEEP, cleanup);

  // HUD laduje panele asynchronicznie i emituje "hud-ready" dopiero po zaladowaniu.
  hud.events?.once('hud-ready', restoreWhenReady);

  if (scenePlugin.isSleeping(HUD_KEY)) {
    scenePlugin.wake(HUD_KEY);
  } else if (scenePlugin.isPaused(HUD_KEY)) {
    scenePlugin.resume(HUD_KEY);
  } else if (!scenePlugin.isActive(HUD_KEY)) {
    scenePlugin.launch(HUD_KEY);
  }

  // Jesli HUD jest juz gotowy, ustawiamy kontekst od razu.
  // Listener zostaje do kolejnego POST_UPDATE i ponawia ustawienie
  // po operacjach z kolejki scen.
  applyHudContext();

  return hud;
}