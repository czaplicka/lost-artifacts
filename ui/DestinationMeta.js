// DestinationMeta.js

export const TRANSPORT_UI_META = {
    plane: { icon: '✈', color: 0xd9c27a },
    train: { icon: '🚆', color: 0x8fd3ff },
    bus: { icon: '🚌', color: 0xffb347 },
    ship: { icon: '🚢', color: 0x62b6cb }
};

export const ROUTE_LINE_COLOR = 0xff4f81;
export const ROUTE_SHADOW_COLOR = 0x280812;

export const CITY_ID_MAP = {
    London: 'london',
    Paris: 'paris',
    'New Delhi': 'new_delhi',
    Warsaw: 'warsaw',
    'New York City': 'new_york_city',
    Berlin: 'berlin',
    Toronto: 'toronto',
    kotte: 'kotte',
    Islamabad: 'islamabad',
    Nairobi: 'nairobi',
    Tokyo: 'tokyo',
    'Mark Agency Headquarters': 'hq'
};

export function normalizeCityId(city) {
    if (!city) return null;
    return CITY_ID_MAP[city] || city.toLowerCase().replace(/\s+/g, '_');
}

export function getCityId(cityObj) {
    return cityObj?.id || normalizeCityId(cityObj?.city);
}