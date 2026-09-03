import { gameState } from '../../GameData.js';
import { saveGameState } from '../../GameStatePersistence.js';
import { audioManager } from '../../AudioManager.js';

export function playTransportSfx(transport) {
  if (!transport?.sfxKey) return null;

  try {
    return audioManager.playSfx(transport.sfxKey, {
      volume: transport.sfxVolume ?? 0.5
    });
  } catch (error) {
    console.warn('[TravelTransitionScene] Travel SFX failed:', error);
    return null;
  }
}

export function getCostAndEnergyText(moneySpent, energyChange) {
  const safeMoneySpent = Number(moneySpent) || 0;
  const safeEnergyChange = Number(energyChange) || 0;

  const costText = safeMoneySpent > 0 ? `Cost: £${safeMoneySpent}` : 'Cost: £0';
  const energyText = safeEnergyChange > 0
    ? `Energy: +${safeEnergyChange}`
    : `Energy: ${safeEnergyChange}`;

  return `${costText}     ${energyText}`;
}

export function getDetailText({
  transport,
  baseTravelHours = 0,
  travelHours = 0,
  travelEncounter = null
}) {
  if (!travelEncounter) return transport.clearRouteText;

  const penalty = Math.max(0, travelHours - baseTravelHours);
  const penaltyText = penalty > 0 ? ` (+${penalty}h)` : '';
  const label = travelEncounter.label || 'Unexpected delay';
  const message = travelEncounter.message || 'Something slowed the trip, but the trail is still warm.';

  return `${label}${penaltyText}. ${message}`;
}

export function registerVisitedCity(targetCityId) {
  if (!targetCityId) return false;

  if (!Array.isArray(gameState.visitedCities)) {
    gameState.visitedCities = [];
  }

  if (!gameState.visitedCities.includes(targetCityId)) {
    gameState.visitedCities.push(targetCityId);
  }

  const reachedThirdCity = gameState.visitedCities.length >= 3 && !gameState.storyPhoneCallTriggered;

  if (reachedThirdCity) {
    gameState.storyPhoneCallTriggered = true;
    gameState.pendingPhoneCall = true;
    gameState.pendingPhoneCallCityId = targetCityId;
  }

  const shouldShowPhoneCall = gameState.pendingPhoneCall === true
    && gameState.pendingPhoneCallCityId === targetCityId;

  saveGameState();
  return shouldShowPhoneCall;
}

export function cleanupTravelEffects(scene) {
  if (scene.routeTween) {
    scene.routeTween.stop();
    scene.routeTween = null;
  }

  if (Array.isArray(scene.effectObjects)) {
    scene.effectObjects.forEach((object) => {
      if (object?.active && typeof object.destroy === 'function') {
        object.destroy();
      }
    });
  }

  scene.effectObjects = [];
  scene.routeGraphics = null;
  scene.baseRoutePoints = null;

  if (!scene._travelSfx) return;

  try {
    if (scene._travelSfx.isPlaying) {
      scene._travelSfx.stop();
    }

    if (!scene._travelSfx.pendingRemove) {
      scene._travelSfx.destroy();
    }
  } catch (error) {
    console.warn('[TravelTransitionScene.cleanupEffects] SFX cleanup failed:', error);
  }

  scene._travelSfx = null;
}