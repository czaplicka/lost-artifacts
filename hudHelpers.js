const pendingHudRestores = new WeakMap();

export function ensureHud(
  scene,
  { throwOnMissing = true } = {},
) {
  const hudKey = 'PlayerHudScene';
  const sceneKey = scene?.sys?.settings?.key || 'unknown';
  const scenePlugin = scene?.scene;
  const manager = scenePlugin?.manager;

  const hud = manager?.keys?.[hudKey] || null;

  if (!hud) {
    const message =
      `[ensureHud] "${hudKey}" is not registered. ` +
      `Called from scene "${sceneKey}".`;

    console.error(message);

    if (throwOnMissing) {
      throw new Error(message);
    }

    return null;
  }

  // Kolejne wywołanie z tej samej sceny zastępuje
  // poprzednie oczekiwanie zamiast dodawać drugi listener.
  pendingHudRestores.get(scene)?.();

  let cancelled = false;

  const cleanup = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;

    scene.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      restoreWhenReady,
    );

    scene.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      cleanup,
    );

    scene.events.off(
      Phaser.Scenes.Events.DESTROY,
      cleanup,
    );

    scene.events.off(
      Phaser.Scenes.Events.SLEEP,
      cleanup,
    );

    if (pendingHudRestores.get(scene) === cleanup) {
      pendingHudRestores.delete(scene);
    }
  };

  const applyHudContext = () => {
    if (
      cancelled
      || scene._cleanupDone
      || !scene.sys.isActive()
      || !scenePlugin.isActive(hudKey)
      || !hud.isHudReady
    ) {
      return false;
    }

    hud.setCurrentGameplayScene(sceneKey);

    return true;
  };

  const restoreWhenReady = () => {
    if (cancelled) {
      return;
    }

    if (scene._cleanupDone || !scene.sys.isActive()) {
      cleanup();
      return;
    }

    if (!applyHudContext()) {
      return;
    }

    console.debug('[ensureHud] HUD restored:', {
      gameplayScene: sceneKey,
      hudReady: hud.isHudReady,
      hudActive: scenePlugin.isActive(hudKey),
      hudVisible: hud.sys.settings.visible,
    });

    cleanup();
  };

  pendingHudRestores.set(scene, cleanup);

  scene.events.on(
    Phaser.Scenes.Events.POST_UPDATE,
    restoreWhenReady,
  );

  scene.events.once(
    Phaser.Scenes.Events.SHUTDOWN,
    cleanup,
  );

  scene.events.once(
    Phaser.Scenes.Events.DESTROY,
    cleanup,
  );

  scene.events.once(
    Phaser.Scenes.Events.SLEEP,
    cleanup,
  );

  if (scenePlugin.isSleeping(hudKey)) {
    scenePlugin.wake(hudKey);
  } else if (scenePlugin.isPaused(hudKey)) {
    scenePlugin.resume(hudKey);
  } else if (!scenePlugin.isActive(hudKey)) {
    scenePlugin.launch(hudKey);
  }

  // Jeśli HUD już istnieje i jest gotowy, pokazujemy go teraz.
  // Listener pozostaje do kolejnego POST_UPDATE, aby ponowić
  // ustawienie kontekstu po operacjach z kolejki scen.
  applyHudContext();

  return hud;
}