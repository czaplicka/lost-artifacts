import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    london: __dialogueText("ui/DestinationMeta.js", "t_0385f29a7e04050050e5"),
    paris: __dialogueText("ui/DestinationMeta.js", "t_3fd0e83798bf102f7172"),
    new_delhi: __dialogueText("ui/DestinationMeta.js", "t_58ee069c75b4c62a1093"),
    warsaw: __dialogueText("ui/DestinationMeta.js", "t_fa59d732719d862cfefa"),
    new_york_city: __dialogueText("ui/DestinationMeta.js", "t_a30e0760b43c82faccab"),
    berlin: __dialogueText("ui/DestinationMeta.js", "t_6e25aa0151ce6332d182"),
    toronto: __dialogueText("ui/DestinationMeta.js", "t_422a4343f213f7759a6a"),
    kotte: __dialogueText("ui/DestinationMeta.js", "t_4322b93cfa0f8a028320"),
    islamabad: __dialogueText("ui/DestinationMeta.js", "t_cdd55b594fb5023122a5"),
    nairobi: __dialogueText("ui/DestinationMeta.js", "t_bb928593ad425e98636e"),
    tokyo: __dialogueText("ui/DestinationMeta.js", "t_2e24808fbd15fa2f958f"),
    hq: __dialogueText("ui/DestinationMeta.js", "t_51a67ff163097149caa3")
};

export function getCityQuip(location) {
    const id = getCityId(location);
    return CITY_QUIPS[id] ||
        `${String(location?.city || __dialogueText("ui/DestinationMeta.js", "t_09414855d35d53b1be06")).toUpperCase()}${__dialogueText("ui/DestinationMeta.js", "t_66e4970a86ce3581fbdd")}`;
}

export const AGENCY_TICKER_LINES = [
    __dialogueText("ui/DestinationMeta.js", "t_ceb755fc389aa13e62b0"),
    __dialogueText("ui/DestinationMeta.js", "t_4e241ab0f0c5197bea28"),
    __dialogueText("ui/DestinationMeta.js", "t_e97e356ec700397586e1"),
    __dialogueText("ui/DestinationMeta.js", "t_2ca0cfe9136f5ce8f3c9"),
    __dialogueText("ui/DestinationMeta.js", "t_8ed7f3458940badc2f0f"),
    __dialogueText("ui/DestinationMeta.js", "t_a54260345f7027293c2d"),
    __dialogueText("ui/DestinationMeta.js", "t_0fb1d29a3f0b94e51b0d"),
    __dialogueText("ui/DestinationMeta.js", "t_fd42bdbfb8411c2cb327"),
    __dialogueText("ui/DestinationMeta.js", "t_bfb2238037ca144c9cd8"),
    __dialogueText("ui/DestinationMeta.js", "t_66157d5ec518a7f056e8"),
    __dialogueText("ui/DestinationMeta.js", "t_010e73b324d4c6560aab"),
    __dialogueText("ui/DestinationMeta.js", "t_d5265b1ae083190c33ad")
];

export const PI_FIELD_NOTES = [
    __dialogueText("ui/DestinationMeta.js", "t_884628f956df69c2ef3a"),
    __dialogueText("ui/DestinationMeta.js", "t_4cc8bf498f737bced4a2"),
    __dialogueText("ui/DestinationMeta.js", "t_df10336034f62c168820"),
    __dialogueText("ui/DestinationMeta.js", "t_14a0922e44ccbf2a9f1f"),
    __dialogueText("ui/DestinationMeta.js", "t_580a42ce0bddfc594f18"),
    __dialogueText("ui/DestinationMeta.js", "t_f30593a056d014c5ca6e"),
    __dialogueText("ui/DestinationMeta.js", "t_7b2c693facb1c0b6c00b"),
    __dialogueText("ui/DestinationMeta.js", "t_b257bd3ff5db2fca3eb5"),
    __dialogueText("ui/DestinationMeta.js", "t_448e7c7fd65e9febd9d8"),
    __dialogueText("ui/DestinationMeta.js", "t_5bf731ea050aec10b8bf"),
    __dialogueText("ui/DestinationMeta.js", "t_3e8d3b3ac1a793f9ea1f")
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

        panelTitle: __dialogueText("ui/DestinationMeta.js", "t_4749991ebc69a760d82c"),
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
            fill: 0x0a1e2a, stroke: 0x00e5ff, hover: 0x0f3a4d, text: __dialogueText("ui/DestinationMeta.js", "t_2d0f6e8213940bdb2b18"),
            blockedFill: 0x1b2229, blockedStroke: 0x5c6b73, blockedText: '#8aa0a8'
        },
        office: {
            fill: 0x1d1a0c, stroke: 0xffcc00, hover: 0x3a3210, text: __dialogueText("ui/DestinationMeta.js", "t_6bee238daf9a980b31a4")
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

        panelTitle: __dialogueText("ui/DestinationMeta.js", "t_cdbc56ee8758fa5033f9"),
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
            fill: 0xd8c28c, stroke: 0x4a3320, hover: 0xc9b077, text: __dialogueText("ui/DestinationMeta.js", "t_b4f2be10329a6d83d047"),
            blockedFill: 0xbfb08a, blockedStroke: 0x7d6e4d, blockedText: '#7d6e4d'
        },
        office: {
            fill: 0xcfd8a8, stroke: 0x4f5d2a, hover: 0xbfca94, text: __dialogueText("ui/DestinationMeta.js", "t_65f6894c279952cf98e5")
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

// BEGIN SINGAPORE CITY INTEGRATION v1
CITY_ID_MAP.Singapore = 'singapore';
CITY_COORDINATES.singapore = [103.8198, 1.3521];
if (!GAME_COUNTRIES_ISO3.includes('SGP')) GAME_COUNTRIES_ISO3.push('SGP');
COUNTRY_ISO3.singapore = 'SGP';
CITY_QUIPS.singapore = __dialogueText("ui/DestinationMeta.js", "t_878bbec23394bbe06662");
// END SINGAPORE CITY INTEGRATION v1
