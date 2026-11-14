export const HOTEL_CONFIG = {
  cheap: {
    id: 'cheap',
    optionId: 'boardingHouse',
    label: 'BOARDING HOUSE',
    tierLabel: 'BUDGET',
    backgroundKey: 'hotel_poor',
    recoveryMultiplier: 0.8,
    description: 'A bed, a roof, and several unexplained noises.',
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  },

  medium: {
    id: 'medium',
    optionId: 'business',
    label: 'BUSINESS HOTEL',
    tierLabel: 'STANDARD',
    backgroundKey: 'hotel',
    recoveryMultiplier: 1,
    description: 'Clean sheets. Suspiciously professional towels.',
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  },

  expensive: {
    id: 'expensive',
    optionId: 'grand',
    label: 'GRAND HOTEL',
    tierLabel: 'LUXURY',
    backgroundKey: 'hotel_lux',
    recoveryMultiplier: 1.3,
    description: 'Your expense report will require creative writing.',
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  }
};