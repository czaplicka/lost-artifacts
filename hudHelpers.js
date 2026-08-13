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