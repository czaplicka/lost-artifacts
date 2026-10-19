// config/shopConfig.js
export const SHOP_CONFIG = {
  hotspots: [
    {
      id: 'coffee', label: 'Coffee', x: 320, y: 380, w: 140, h: 160, price: 5,
      item: {
        id: 'coffee', name: 'Coffee', icon: '☕', type: 'item',
        description: 'Strong coffee. Your sleep schedule has already filed a complaint.',
        stackable: true, quantity: 1, metadata: {}
      }
    },
    {
      id: 'postcards', label: 'Postcards', x: 620, y: 300, w: 180, h: 120, price: 2,
      item: {
        id: 'postcard', name: 'Postcard', icon: '✉️', type: 'item',
        description: 'Wish you were here. Preferably with an alibi.',
        stackable: true, quantity: 1, metadata: {}
      }
    }
  ],
  stockBoard: { x: 16, y: 56 }
};