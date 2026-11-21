// Shared by the map labels and the actual local-trip billing.
// Keep current gameplay prices, including the emergency hotel ride.
export const LOCAL_TRAVEL_MONEY = 0;
const LOCAL_TAXI_ENERGY = 3;

export function getCrimeCityLocalTravelCost(nodeId, energyManager) {
  if (nodeId !== 'hotel' && nodeId !== 'shop') {
    throw new Error(`[CrimeCityLocalTravelCosts] Unsupported destination: ${nodeId}`);
  }
  const emergency = nodeId === 'hotel' && energyManager.getCurrentEnergy() <= LOCAL_TAXI_ENERGY;
  return { energy: emergency ? 0 : LOCAL_TAXI_ENERGY, money: LOCAL_TRAVEL_MONEY };
}