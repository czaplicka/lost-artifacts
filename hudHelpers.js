export function ensureHud(scene) {
    const hudKey = 'PlayerHudScene';

    if (!scene.scene.get(hudKey)) {
        console.error(`${hudKey} is not registered in the game config.`);
        return null;
    }

    if (!scene.scene.isActive(hudKey)) {
        scene.scene.launch(hudKey);
    }

    scene.scene.bringToTop(hudKey);
    return scene.scene.get(hudKey);
}