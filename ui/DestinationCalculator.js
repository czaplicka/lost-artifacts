import { gameState } from '../GameData.js';

import {
  getTravelData
} from '../managers/TravelManager.js';

import {
  getEnergyManager
} from '../managers/EnergyManager.js';

import {
  moneyManager,
  MONEY_SOURCE
} from '../managers/MoneyManager.js';

import {
  canTravelByLand as canTravelByLandFromLocations,
  isTransportAvailable
} from './LocationUI.js';

import {
  TRANSPORT_UI_META
} from './DestinationMeta.js';

const MAP_TRANSPORT_TYPES = [
  'plane',
  'train',
  'bus',
  'ship'
];

export function canTravelByLand(fromCity, toCity) {
  if (!fromCity || !toCity) {
    return false;
  }

  return canTravelByLandFromLocations(
    fromCity,
    toCity
  );
}

export function buildTransportOption(
  transportType,
  fromCity,
  toCity
) {
  if (!fromCity?.city || !toCity?.city) {
    throw new Error(
      'Cannot calculate transport without origin and destination.'
    );
  }

  const meta = TRANSPORT_UI_META[transportType] || {};

  // Ta sama funkcja, której używa wykonanie podróży.
  // Podgląd nie losuje zdarzenia i niczego nie pobiera.
  const travelData = getTravelData(
    fromCity.city,
    toCity.city,
    [fromCity, toCity],
    {
      transportType,
      allowEncounter: false,
      travelEncounter: null
    }
  );

  // Ten sam koszt energii, który sprawdza executeTravel().
  const energyCost = getEnergyManager()
    .getTravelCost(transportType);

  return {
    id: transportType,
    icon: meta.icon || '❔',
    color: meta.color ?? 0xaaaaaa,
    label: travelData.transportLabel,

    travelHours: travelData.travelHours,
    baseTravelHours: travelData.baseTravelHours,

    moneySpent: travelData.moneySpent,
    effectiveMoneySpent: travelData.effectiveMoneySpent,

    energyChange: -energyCost,
    energyCost,

    freeTransferAvailable:
      travelData.freeTransferAvailable
  };
}

export function getTransportOptions(
  fromCity,
  toCity
) {
  if (!fromCity || !toCity) {
    return [];
  }

  return MAP_TRANSPORT_TYPES
    .filter(transportType =>
      isTransportAvailable(
        fromCity,
        toCity,
        transportType
      )
    )
    .map(transportType =>
      buildTransportOption(
        transportType,
        fromCity,
        toCity
      )
    );
}

export function getAvailableAgencyBudget() {
  return moneyManager.getBalance(
    MONEY_SOURCE.AGENCY
  );
}

export function wouldCreateDebt(cost) {
  const safeCost = Math.max(
    0,
    Math.round(Number(cost) || 0)
  );

  const freeTransfers = Math.max(
    0,
    Math.floor(Number(gameState.freeTransfers) || 0)
  );

  if (freeTransfers > 0) {
    return false;
  }

  // Bilety są opłacane z budżetu agencji,
  // a nie z prywatnej gotówki detektywa.
  return safeCost > getAvailableAgencyBudget();
}

export function formatMoney(amount) {
  const safeAmount = Math.max(
    0,
    Math.round(Number(amount) || 0)
  );

  return `$${safeAmount.toLocaleString('en-US')}`;
}