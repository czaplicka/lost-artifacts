// config/shopConfig.js
// Sklep NIE definiuje przedmiotów. Bierze je z assets/data/ItemsCatalog.json.
// Tutaj ustawiasz tylko: cenę, pozycję hotspotu i etykietę.
import { ItemsLoader } from '../ItemsLoader.js';

await ItemsLoader.load();

function fromCatalog(category, key) {
  const entry = ItemsLoader.get(category, key);
  if (!entry) {
    throw new Error(`[shopConfig] Brak "${category}.${key}" w ItemsCatalog.json`);
  }
  return {
    ...entry,
    quantity: 1,
    metadata: { ...(entry.metadata || {}) }
  };
}

export const SHOP_CONFIG = {
  hotspots: [
    {
      id: 'coffee', label: 'Coffee', x: 320, y: 380, w: 140, h: 160, price: 5,
      item: fromCatalog('consumables', 'coffee')
    },
    {
      id: 'postcards', label: 'Postcards', x: 620, y: 300, w: 180, h: 120, price: 2,
      item: fromCatalog('souvenirs', 'postcard')
    },
    {
      id: 'energy_drink', label: 'Energy Drink', x: 900, y: 380, w: 120, h: 160, price: 7,
      item: fromCatalog('consumables', 'energyDrink')
    },
    {
      id: 'sandwich', label: 'Sandwich', x: 320, y: 580, w: 160, h: 100, price: 8,
      item: fromCatalog('consumables', 'sandwich')
    },
    {
      id: 'snow_globe', label: 'Souvenir Snow Globe', x: 620, y: 520, w: 120, h: 140, price: 15,
      item: fromCatalog('souvenirs', 'snowGlobe')
    },
    {
      id: 'mystery_pie', label: 'Mystery Meat Pie', x: 900, y: 580, w: 150, h: 100, price: 4,
      item: fromCatalog('consumables', 'mysteryPie')
    },
    {
      id: 'inflatable_alibi', label: 'Inflatable Alibi', x: 1150, y: 400, w: 140, h: 200, price: 20,
      item: fromCatalog('oddities', 'inflatableAlibi')
    }
  ],
  stockBoard: { x: 16, y: 56 }
};