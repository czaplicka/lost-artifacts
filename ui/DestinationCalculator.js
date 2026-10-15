// DestinationCalculator.js
import { getUnifiedTravelManager } from '../managers/UnifiedTravelManager.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { getCityId, normalizeCityId, TRANSPORT_UI_META } from './DestinationMeta.js';

export function canTravelByLand(fromCity, toCity) {
    if (!fromCity || !toCity) return false;
    if (fromCity.country === toCity.country) return true;

    const region = fromCity.travelRegion;
    if (region !== toCity.travelRegion) return false;

    return region === 'europe' || region === 'north_america';
}

export function buildTransportOption(transportType, fromCity, toCity) {
    const travelManager = getUnifiedTravelManager();
    const meta = TRANSPORT_UI_META[transportType] || {};
    const rule = travelManager.getTransportRule(transportType);

    const travelData = travelManager.calculateTravelBetweenLocations(
        fromCity,
        toCity,
        transportType,
        { allowEncounter: false }
    );

    return {
        id: transportType,
        icon: meta.icon || '❔',
        color: meta.color ?? 0xaaaaaa,
        label: rule.label,
        travelHours: travelData.totalTravelHours,
        baseTravelHours: travelData.baseTravelHours,
        moneySpent: travelData.moneyCost,
        energyChange: -travelData.energyCost
    };
}

export function getTransportOptions(fromCity, toCity) {
    if (!fromCity || !toCity) return [];

    const options = [];

    if (fromCity.airport && toCity.airport) {
        options.push(buildTransportOption('plane', fromCity, toCity));
    }

    if (fromCity.trainStation && toCity.trainStation && canTravelByLand(fromCity, toCity)) {
        options.push(buildTransportOption('train', fromCity, toCity));
    }

    if (fromCity.busStation && toCity.busStation && canTravelByLand(fromCity, toCity)) {
        options.push(buildTransportOption('bus', fromCity, toCity));
    }

    if (fromCity.harbor && toCity.harbor) {
        options.push(buildTransportOption('ship', fromCity, toCity));
    }

    return options;
}

export function getAvailableAgencyBudget() {
    return moneyManager.getBalance(MONEY_SOURCE.AGENCY);
}

export function wouldCreateDebt(cost) {
    const safeCost = Math.max(0, Math.round(Number(cost) || 0));
    const availableFunds =
        moneyManager.getBalance(MONEY_SOURCE.CASH) +
        moneyManager.getBalance(MONEY_SOURCE.AGENCY);

    return safeCost > availableFunds;
}

export function formatMoney(amount) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    return `$${safeAmount.toLocaleString('en-US')}`;
}