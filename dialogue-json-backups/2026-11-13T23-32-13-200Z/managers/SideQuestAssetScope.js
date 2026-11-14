export function acquireSideQuestAssets(game, bundle = 'quest:dead_mail') {
  const manager = game?.assets;
  const owner = Symbol(`side-quest:${bundle}`);
  let released = false;
  const unpin = () => manager?.unpin?.(owner);
  const ready = (async () => {
    if (!manager?.ensureBundles) throw new Error('The game AssetManager is unavailable.');
    try {
      if (!Array.isArray(manager.manifest.bundles[bundle])) {
        throw new Error(`Missing bundle ${bundle}. Install the side-quests manifest, then reload the page.`);
      }
      await manager.ensureBundles([bundle], owner, 'Developing the cemetery photographs...');
    } finally {
      if (released) unpin();
    }
  })();
  return {
    ready,
    release() {
      if (released) return;
      released = true;
      unpin();
    }
  };
}
