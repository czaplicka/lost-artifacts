// config/spyShopConfig.js
export const SPY_SHOP_CONFIG = {
  // Set this to the actual image path when your background is ready.
  // Example: backgroundUrl: 'assets/local/spyshop.webp',
backgroundUrl: 'assets/local/spyshop.webp',
backgroundKey: 'pi_spy_shop_background',
  title: 'DISCREET ELECTRONICS',
  subtitle: 'Repairs. Accessories. Plausible deniability.',
  // Normalised coordinates: x/y are the centre; w/h are width and height.
  hotspots: [
    { id: 'exit', label: 'Exit', action: 'exit', x: 0.14, y: 0.49, w: 0.18, h: 0.65 },
    { id: 'shopkeeper', label: 'Shopkeeper', action: 'talk', x: 0.48, y: 0.42, w: 0.22, h: 0.42 },
    { id: 'equipment', label: 'Browse Equipment', action: 'browse', x: 0.80, y: 0.48, w: 0.29, h: 0.65 }
  ],
  products: [
    { category: 'equipment', key: 'camera' },
    { category: 'equipment', key: 'mobilePhone' },
    { category: 'oddities', key: 'rubberDuck' },
    { category: 'equipment', key: 'coolSpyGadget' },
    { category: 'misc', key: 'piBadge' },
    { category: 'documents', key: 'detectiveMonthly' }
  ],
  dialogue: [
    { question: 'What do you sell?', answer: 'Electronics. If anyone asks, you bought batteries. If nobody asks, you still bought batteries.' },
    { question: 'Is all this legal?', answer: 'Every item comes with a perfectly ordinary receipt. What you do with the receipt is between you and your accountant.' },
    { question: 'Why the rubber duck?', answer: 'Waterproof. Low maintenance. Excellent under pressure. No other customer has questioned its qualifications.' },
    { question: 'Does the badge make me a police officer?', answer: 'No. It makes you a private investigator with a badge. The difference becomes important at roadblocks.' }
  ]
};
