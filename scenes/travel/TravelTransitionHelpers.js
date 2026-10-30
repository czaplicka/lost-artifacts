import { gameState } from '../../GameData.js';

import {
  saveGameState
} from '../../gameStatePersistence.js';

import {
  audioManager
} from '../../managers/AudioManager.js';

import {
  getLocationById,
  getLocationByCity
} from '../../ui/LocationUI.js';

import {
  getPassportManager
} from '../../managers/PassportManager.js';

export function playTransportSfx(transport) {
  if (!transport?.sfxKey) {
    return null;
  }

  try {
    return audioManager.playSfx(
      transport.sfxKey,
      {
        volume: transport.sfxVolume ?? 0.5
      }
    );
  } catch (error) {
    console.warn(
      '[TravelTransitionScene] Travel SFX failed:',
      error
    );

    return null;
  }
}

export function getCostAndEnergyText(
  moneySpent,
  energyChange
) {
  const safeMoneySpent =
    Number(moneySpent) || 0;

  const safeEnergyChange =
    Number(energyChange) || 0;

  const costText = safeMoneySpent > 0
    ? `Cost: $${safeMoneySpent}`
    : 'Cost: $0';

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
  if (!travelEncounter) {
    return transport?.clearRouteText ?? '';
  }

  const penalty = Math.max(
    0,
    travelHours - baseTravelHours
  );

  const penaltyText = penalty > 0
    ? ` (+${penalty}h)`
    : '';

  const label =
    travelEncounter.label ||
    'Unexpected delay';

  const message =
    travelEncounter.message ||
    'Something slowed the trip, but the trail is still warm.';

  return `${label}${penaltyText}. ${message}`;
}

export function registerVisitedCity(targetCityId) {
  // Retired travel-phone flags may still exist in older saves.
  gameState.pendingPhoneCall = false;
  gameState.pendingPhoneCallCityId = null;

  if (targetCityId) {
    gameState.addCity(targetCityId);
  }

  saveGameState();

  // Visiting cities no longer schedules an HQ phone call.
  return false;
}

export function stampPassportForArrival(
  scene,
  fromCity,
  targetCityId
) {
  if (!targetCityId) {
    return null;
  }

  const locations =
    scene?.cache?.json?.get('locations') || [];

  const destination = getLocationById(
    targetCityId,
    locations
  );

  if (!destination) {
    console.warn(
      '[TravelTransitionScene] ' +
      'Passport stamp skipped, unknown location id:',
      targetCityId
    );

    return null;
  }

  const origin = getLocationByCity(
    fromCity,
    locations
  );

  const isDomesticTravel =
    origin &&
    origin.country === destination.country;

  if (isDomesticTravel) {
    return null;
  }

  return getPassportManager().stampLocation(
    destination
  );
}

export function cleanupTravelEffects(scene) {
  if (scene.routeTween) {
    scene.routeTween.stop();
    scene.routeTween = null;
  }

  if (Array.isArray(scene.effectObjects)) {
    scene.effectObjects.forEach(object => {
      if (
        object?.active &&
        typeof object.destroy === 'function'
      ) {
        object.destroy();
      }
    });
  }

  scene.effectObjects = [];
  scene.routeGraphics = null;
  scene.baseRoutePoints = null;

  if (scene._travelSfx) {
    audioManager.releaseSound(
      scene._travelSfx
    );

    scene._travelSfx = null;
  }
}