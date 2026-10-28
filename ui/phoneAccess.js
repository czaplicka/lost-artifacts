import { inventoryManager } from '../managers/InventoryManager.js';

const LANDLINE_SCENES = new Set([
    'OfficeScene',
    'HotelScene'
]);

export function hasMobilePhone() {
    return inventoryManager.hasItem('mobile_phone');
}

export function getPhoneSceneKey(scene) {
    return (
        scene?.currentGameplaySceneKey ||
        scene?.sys?.settings?.key ||
        null
    );
}

export function canUsePhone(scene) {
    return (
        hasMobilePhone() ||
        LANDLINE_SCENES.has(getPhoneSceneKey(scene))
    );
}