// config/shopConfig.js
//
// Asortyment sklepu i obszary klikania na tle shop.jpg.
// Ta sama lista zasila hotspoty oraz tablicę TODAY'S STOCK.
//
// x, y — środek hotspotu.
// w, h — szerokość i wysokość hotspotu.
// price — cena jednego zakupu.
// item — dane przedmiotu dodawanego do inventory.

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
        type: 'item',
        label: 'Coffee',
        stackable: true,
        quantity: 1
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
        type: 'item',
        label: 'Postcard',
        stackable: true,
        quantity: 1
      }
    }
  ],

  stockBoard: {
    x: 16,
    y: 56
  }
};