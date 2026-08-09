// CHANGED: a missing "PlayerHudScene" registration is a configuration bug
// (someone forgot to add the scene to the Phaser game config), not a
// recoverable runtime condition. Silently returning null just relocates the
// crash to whatever call site forgets to check for it - usually several
// frames away, as a confusing "Cannot read properties of null" with no
// obvious connection to the real cause. Throwing here surfaces the actual
// problem immediately, at the actual source.
export function ensureHud(scene, { throwOnMissing = true } = {}) {
    const hudKey = 'PlayerHudScene';

    if (!scene.scene.get(hudKey)) {
        const message = `[ensureHud] "${hudKey}" is not registered in the game config. ` +
            `Called from scene "${scene?.scene?.key || 'unknown'}".`;

        console.error(message);

        if (throwOnMissing) {
            throw new Error(message);
        }

        return null;
    }

    if (!scene.scene.isActive(hudKey)) {
        scene.scene.launch(hudKey);
    }

    scene.scene.bringToTop(hudKey);
    return scene.scene.get(hudKey);
}