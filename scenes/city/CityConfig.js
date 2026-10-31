export const ALL_DAY = [
  'Morning',
  'Afternoon',
  'Evening',
  'Night'
];

export const LOCATION_HOURS = {
  bank: ['Morning', 'Afternoon'],
  policehq: ['Morning', 'Afternoon', 'Evening'],
  hotel: ALL_DAY,
  airport: ALL_DAY,
  harbor: ALL_DAY,
  alley: ALL_DAY,
  parking: ALL_DAY,
  restaurant: ['Afternoon', 'Evening'],
  garbage: ALL_DAY,
  shop: ['Morning', 'Afternoon', 'Evening']
};

export const CITY_BACKGROUND_KEYS = {
  london: 'london',
  paris: 'paris',
  new_delhi: 'newdelhi',
  newdelhi: 'newdelhi',
  warsaw: 'warsaw',
  new_york_city: 'newyorkcity',
  newyorkcity: 'newyorkcity',
  berlin: 'berlin',
  toronto: 'toronto',
  nairobi: 'nairobi',
  islamabad: 'islamabad',
  kotte: 'kotte',
  tokyo: 'tokyo',
  hq: 'start'
};

export const NPC_QUESTION_PENALTY = 10;
export const NPC_SCALE = 0.62;
export const NPC_HOVER_SCALE = 0.68;

export const SHOP_TAXI_ENERGY = 3;
export const SHOP_ICON_SIZE = 132;
export const SHOP_LABEL_OFFSET = 82;

export const MINUTES_PER_DAY = 1440;
export const HUD_READY_TIMEOUT = 15000;
