import {
  DEFAULT_INVENTORY_SHOPS
} from './InventoryShopModel.js';

function cloneConfiguration(configuration) {
  if (typeof structuredClone === 'function') {
    return structuredClone(configuration);
  }

  return JSON.parse(
    JSON.stringify(configuration)
  );
}

function validateConfiguration(configuration) {
  if (
    configuration?.version !== 1 ||
    !Array.isArray(
      configuration.city?.hotspots
    ) ||
    !Array.isArray(configuration.spy)
  ) {
    throw new Error(
      'Unsupported inventory shop configuration.'
    );
  }

  return configuration;
}

export const INVENTORY_SHOPS =
  validateConfiguration(
    cloneConfiguration(
      DEFAULT_INVENTORY_SHOPS
    )
  );