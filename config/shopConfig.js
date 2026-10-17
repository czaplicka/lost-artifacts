// config/shopConfig.js
//
// Lista produktów zasila hotspoty oraz tablicę TODAY'S STOCK.
//
// label — nazwa produktu na tablicy sklepu.
// x, y — środek hotspotu na tle.
// w, h — szerokość i wysokość hotspotu.
// price — cena jednej transakcji, dodatnia liczba całkowita.
// item — przedmiot dodawany do inventory.
//
// Po dopasowaniu hotspotów w debugowaniu wklej wynik
// do tablicy hotspots poniżej.

export const SHOP_CONFIG = {
  hotspots: [
    {
      id: 'coffee',
      label: 'Coffee',

      x: 320,
      y: 380,
      w: 140,
      h: 160,

      price: 5,

      item: {
        id: 'coffee',
        name: 'Coffee',
        icon: '☕',
        description:
          'Strong coffee. For detectives whose last good night of sleep is now a cold case.',
        type: 'item',
        stackable: true,
        quantity: 1,
        metadata: {}
      }
    },

    {
      id: 'postcards',
      label: 'Postcards',

      x: 620,
      y: 300,
      w: 180,
      h: 120,

      price: 2,

      item: {
        id: 'postcard',
        name: 'Postcard',
        icon: '✉️',
        description:
          'A picturesque postcard. Proof you visited somewhere without enjoying any of it.',
        type: 'item',
        stackable: true,
        quantity: 1,
        metadata: {}
      }
    }
  ],

  stockBoard: {
    x: 16,
    y: 56
  }
};