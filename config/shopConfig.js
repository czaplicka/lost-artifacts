// config/shopConfig.js
// Dane przedmiotów: assets/data/ItemsCatalog.json.
// Tutaj: ceny, hotspoty, etykiety i dostępność.

import { ItemsLoader } from '../ItemsLoader.js';

await ItemsLoader.load();

function fromCatalog(category, key) {
  const entry = ItemsLoader.get(category, key);

  if (!entry) {
    throw new Error(
      `[shopConfig] Brak "${category}.${key}" w ItemsCatalog.json`
    );
  }

  return {
    ...entry,
    quantity: 1,
    metadata: { ...(entry.metadata || {}) }
  };
}

const CITY_SHELF = {
  x: 1150,
  y: 620,
  w: 140,
  h: 140
};

export const SHOP_CONFIG = {
  rotatingCount: 2,

  hotspots: [
    // ===== STAŁE =====
    {
      id: 'coffee',
      type: 'permanent',
      label: 'Coffee',
      x: 176,
      y: 533,
      w: 220,
      h: 160,
      price: 5,
      item: fromCatalog('consumables', 'coffee')
    },
    {
      id: 'postcards',
      type: 'permanent',
      label: 'Postcards',
      x: 1383,
      y: 506,
      w: 200,
      h: 365,
      price: 2,
      item: fromCatalog('souvenirs', 'postcard')
    },
    {
      id: 'sandwich',
      type: 'permanent',
      label: 'Sandwich',
      x: 1219,
      y: 407,
      w: 125,
      h: 100,
      price: 8,
      item: fromCatalog('consumables', 'sandwich')
    },
    {
      id: 'snow_globe',
      type: 'permanent',
      label: 'Souvenir Snow Globe',
      x: 1093,
      y: 279,
      w: 170,
      h: 95,
      price: 15,
      item: fromCatalog('souvenirs', 'snowGlobe')
    },

    // ===== ROTUJĄCE =====
    {
      id: 'energy_drink',
      type: 'rotating',
      label: 'Energy Drink',
      x: 900,
      y: 380,
      w: 120,
      h: 160,
      price: 7,
      item: fromCatalog('consumables', 'energyDrink')
    },
    {
      id: 'mystery_pie',
      type: 'rotating',
      label: 'Mystery Meat Pie',
      x: 1076,
      y: 409,
      w: 150,
      h: 100,
      price: 4,
      item: fromCatalog('consumables', 'mysteryPie')
    },
    {
      id: 'inflatable_alibi',
      type: 'rotating',
      label: 'Inflatable Alibi',
      x: 603,
      y: 494,
      w: 175,
      h: 255,
      price: 20,
      item: fromCatalog('oddities', 'inflatableAlibi')
    },

    // ===== PAMIĄTKI MIEJSKIE =====
    {
      id: 'souvenir_paris',
      type: 'permanent',
      cities: ['paris'],
      label: 'Tiny Iron Tower',
      ...CITY_SHELF,
      price: 12,
      item: fromCatalog('souvenirs', 'parisTower')
    },
    {
      id: 'souvenir_london',
      type: 'permanent',
      cities: ['london'],
      label: 'Tiny Guard Hat',
      ...CITY_SHELF,
      price: 12,
      item: fromCatalog('souvenirs', 'londonGuardHat')
    },
    {
      id: 'souvenir_berlin',
      type: 'permanent',
      cities: ['berlin'],
      label: 'Wall Chunk (Certified*)',
      x: 910,
      y: 655,
      w: 140,
      h: 140,
      price: 14,
      item: fromCatalog('souvenirs', 'berlinWallChunk')
    },
    {
      id: 'souvenir_nyc',
      type: 'permanent',
      cities: ['new_york_city'],
      label: 'Foam Liberty Crown',
      ...CITY_SHELF,
      price: 12,
      item: fromCatalog('souvenirs', 'nycFoamCrown')
    },
    {
      id: 'souvenir_warsaw',
      type: 'permanent',
      cities: ['warsaw'],
      label: 'Mermaid Magnet',
      x: 912,
      y: 653,
      w: 160,
      h: 125,
      price: 10,
      item: fromCatalog('souvenirs', 'warsawMermaid')
    },
    {
      id: 'souvenir_delhi',
      type: 'permanent',
      cities: ['new_delhi'],
      label: 'Spice Sachet',
      ...CITY_SHELF,
      price: 9,
      item: fromCatalog('souvenirs', 'delhiSpiceSachet')
    },
    {
      id: 'souvenir_kotte',
      type: 'permanent',
      cities: ['kotte'],
      label: 'Tiny Wooden Elephant',
      ...CITY_SHELF,
      price: 9,
      item: fromCatalog('souvenirs', 'kotteElephant')
    },
    {
      id: 'souvenir_toronto',
      type: 'permanent',
      cities: ['toronto'],
      label: 'Maple Syrup Shot',
      ...CITY_SHELF,
      price: 11,
      item: fromCatalog('souvenirs', 'torontoMaple')
    },
    {
      id: 'souvenir_nairobi',
      type: 'permanent',
      cities: ['nairobi'],
      label: 'Carved Giraffe',
      ...CITY_SHELF,
      price: 13,
      item: fromCatalog('souvenirs', 'nairobiGiraffe')
    },
    {
      id: 'souvenir_islamabad',
      type: 'permanent',
      cities: ['islamabad'],
      label: 'Truck Art Keychain',
      ...CITY_SHELF,
      price: 9,
      item: fromCatalog('souvenirs', 'islamabadTruck')
    },
    {
      id: 'souvenir_tokyo',
      type: 'permanent',
      cities: ['tokyo'],
      label: 'Lucky Cat',
      ...CITY_SHELF,
      price: 14,
      item: fromCatalog('souvenirs', 'tokyoLuckyCat')
    }
  ],

  stockBoard: {
    x: 16,
    y: 56
  }
};