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
    Kotte: 'kotte',
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

// ---------------------------------------------------------------- geography
// [longitude, latitude]. A location in locations.json may override this with
// its own "coordinates": [lon, lat]. A city that is missing here AND has no
// coordinates falls back to its legacy "map": {x, y} pixel position.
export const CITY_COORDINATES = {
    london: [-0.1276, 51.5072],
    paris: [2.3522, 48.8566],
    new_delhi: [77.209, 28.6139],
    warsaw: [21.0122, 52.2297],
    new_york_city: [-74.006, 40.7128],
    berlin: [13.405, 52.52],
    toronto: [-79.3832, 43.6532],
    kotte: [79.9, 6.9],
    islamabad: [73.0479, 33.6844],
    nairobi: [36.8219, -1.2921],
    tokyo: [139.6917, 35.6895],
    // HQ is classified. Officially it is a call centre somewhere warm.
    // Move it wherever the lore says.
    hq: [33.4, 35.1]
};

// Countries that get highlighted on the painted map (ISO 3 codes).
export const GAME_COUNTRIES_ISO3 = [
    'GBR', 'FRA', 'IND', 'POL', 'USA', 'DEU', 'CAN', 'LKA', 'PAK', 'KEN', 'JPN'
];

// Used to highlight countries of cities that are added later.
export const COUNTRY_ISO3 = {
    'united kingdom': 'GBR',
    france: 'FRA',
    india: 'IND',
    poland: 'POL',
    usa: 'USA',
    'united states': 'USA',
    germany: 'DEU',
    canada: 'CAN',
    'sri lanka': 'LKA',
    pakistan: 'PAK',
    kenya: 'KEN',
    japan: 'JPN',
    italy: 'ITA',
    spain: 'ESP',
    egypt: 'EGY',
    brazil: 'BRA',
    australia: 'AUS',
    china: 'CHN',
    russia: 'RUS',
    turkey: 'TUR',
    mexico: 'MEX',
    argentina: 'ARG',
    'south africa': 'ZAF',
    morocco: 'MAR',
    thailand: 'THA',
    greece: 'GRC'
};

export function getCountryIso3(name) {
    return COUNTRY_ISO3[String(name || '').trim().toLowerCase()] || null;
}

function isLonLat(value) {
    return Array.isArray(value) && value.length === 2 &&
        Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

export function getCityLonLat(location) {
    if (!location) return null;
    if (isLonLat(location.coordinates)) return location.coordinates;
    if (isLonLat(location.lonLat)) return location.lonLat;
    const fromTable = CITY_COORDINATES[getCityId(location)];
    return isLonLat(fromTable) ? fromTable : null;
}

// ---------------------------------------------------------------- humor
export const CITY_QUIPS = {
    london: 'LONDON: Weather forecast is "yes". Bring an umbrella and low expectations.',
    paris: 'PARIS: Strike probability 94%. Croissant availability: also 94%.',
    new_delhi: 'NEW DELHI: Spice level is classified. Your stomach has no clearance.',
    warsaw: 'WARSAW: Pierogi reserves are strategic. Do not ask how many.',
    new_york_city: 'NEW YORK: Everyone is walking fast. Nobody is going anywhere.',
    berlin: 'BERLIN: Techno is mandatory after 11 PM. So is queueing.',
    toronto: 'TORONTO: Apologies per minute: 12. Please excuse the statistic.',
    kotte: 'KOTTE: Humidity is personal here. It will hug you.',
    islamabad: 'ISLAMABAD: Tea acceptable at any hour. Refusing it is a mission failure.',
    nairobi: 'NAIROBI: Safari is not covered by the expense policy. We checked twice.',
    tokyo: 'TOKYO: Vending machines outnumber suspects. Still, we count both.',
    hq: 'HQ: Location redacted. Coffee also redacted. Morale: pending.'
};

export function getCityQuip(location) {
    const id = getCityId(location);
    return CITY_QUIPS[id] ||
        `${String(location?.city || 'THIS PLACE').toUpperCase()}: No intel. Bring snacks and confidence.`;
}

export const AGENCY_TICKER_LINES = [
    'UPLINK STABLE. COFFEE LEVELS: CRITICAL.',
    'SATELLITE 7 REPORTS: A LOT OF WATER.',
    'AGENT LAST SEEN IN DUTY-FREE. STATUS: SHOPPING.',
    'REMINDER: EXPENSE REPORTS ARE NOT A PERSONALITY.',
    'DRONE 3 IS FOLLOWING THE WRONG SUSPECT. AGAIN.',
    'ENCRYPTING MAP... PASSWORD IS "PASSWORD1". RELAX.',
    'TRAVEL DESK NOTICE: LAYOVERS BUILD CHARACTER.',
    'THREAT LEVEL: MODERATE. SNACK LEVEL: LOW.',
    'CLASSIFIED ITEM REDACTED BY CLASSIFIED OFFICER.',
    'FUN FACT: THE OCEAN IS NOT A SHORTCUT.',
    'CLEARANCE CHECK: YES(ISH).',
    'TIP: LOOK CONFIDENT. NOBODY CHECKS THE MAP.'
];

export const PI_FIELD_NOTES = [
    'Note to self: never trust a map drawn by a man named Dave.',
    'The X marks the spot. The Y marks the trouble.',
    'Remember: airports are just very expensive caves.',
    'Hat: check. Whip: check. Receipts: lost.',
    'If the map is upside down, so is the budget.',
    'Snakes? Why does it always have to be layovers?',
    'That stain is from yesterday\u2019s coffee. Probably.',
    'Archaeology is 10% digging, 90% waiting for baggage.',
    'Everything belongs in a museum. Especially me, at this pace.',
    'Pack light. The suspect certainly did.',
    'The landlady called again. The rent is also an artefact now.'
];

// ---------------------------------------------------------------- themes
// agency = modern spy grid (Mark Agency travel desk)
// pi     = old expedition map (private investigator office)
export const DESTINATION_THEMES = {
    agency: {
        id: 'agency',
        accent: 0x00e5ff,
        accentCss: '#00e5ff',
        hot: 0xff4f81,
        gold: 0xffcc00,
        goldCss: '#ffcc00',
        ink: 0xffffff,
        fallbackBg: 0x04111b,

        panelTitle: 'Travel dossier',
        panelBg: 0x061018,
        panelAlpha: 0.94,
        panelStroke: 0x00e5ff,
        titleColor: '#9ffcff',
        cityColor: '#ffffff',
        countryColor: '#7fb8c8',
        promptColor: '#ffd166',
        travelColor: '#bfe9f3',
        hoursColor: '#ffd166',
        warnColor: '#ff9d6b',
        errorColor: '#ff6b6b',

        confirmOn: 0x00b8d4,
        confirmOff: 0x2a3a45,
        confirmStroke: 0xe8fdff,
        confirmText: '#ffffff',

        transportIdle: 0x10212c,
        transportText: '#ffffff',
        transportTextSelected: '#06141c',

        hq: {
            fill: 0x0a1e2a, stroke: 0x00e5ff, hover: 0x0f3a4d, text: '#d9fbff',
            blockedFill: 0x1b2229, blockedStroke: 0x5c6b73, blockedText: '#8aa0a8'
        },
        office: {
            fill: 0x1d1a0c, stroke: 0xffcc00, hover: 0x3a3210, text: '#fff3c4'
        },
        closeColor: '#00e5ff',

        labelName: '#ffffff',
        labelNameHot: '#ffcc00',
        labelSub: '#7fb8c8'
    },

    pi: {
        id: 'pi',
        accent: 0x8b2a1d,
        accentCss: '#8b2a1d',
        hot: 0x8b2a1d,
        gold: 0xb8860b,
        goldCss: '#b8860b',
        ink: 0x2b1a0c,
        fallbackBg: 0xd9c08f,

        panelTitle: 'Expedition ledger',
        panelBg: 0xe6d3a1,
        panelAlpha: 0.97,
        panelStroke: 0x4a3320,
        titleColor: '#3b2a18',
        cityColor: '#2a1b0d',
        countryColor: '#6b5233',
        promptColor: '#8b2a1d',
        travelColor: '#3b2a18',
        hoursColor: '#8b2a1d',
        warnColor: '#a0481f',
        errorColor: '#a31f1f',

        confirmOn: 0x8b2a1d,
        confirmOff: 0xb9a77a,
        confirmStroke: 0x3b2a18,
        confirmText: '#fff4d6',

        transportIdle: 0xcdb986,
        transportText: '#2a1b0d',
        transportTextSelected: '#2a1b0d',

        hq: {
            fill: 0xd8c28c, stroke: 0x4a3320, hover: 0xc9b077, text: '#3b2a18',
            blockedFill: 0xbfb08a, blockedStroke: 0x7d6e4d, blockedText: '#7d6e4d'
        },
        office: {
            fill: 0xcfd8a8, stroke: 0x4f5d2a, hover: 0xbfca94, text: '#2b3a14'
        },
        closeColor: '#8b2a1d',

        labelName: '#2a1b0d',
        labelNameHot: '#8b2a1d',
        labelSub: '#7a5c35'
    }
};

export function getDestinationTheme(id) {
    return DESTINATION_THEMES[id] || DESTINATION_THEMES.agency;
}