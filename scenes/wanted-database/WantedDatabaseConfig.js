import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_749639cb7eb80c7ff9a7");

const LS_THEME = 'la_wantedDbTheme';
const LS_PHOTO = 'la_wantedDbPhoto';

const toCss = (n) => `#${n.toString(16).padStart(6, '0')}`;

const THEME_DEFS = {
    green: {
        label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_cd9fcbf0c0b40bf7cdb3"),
        main: 0x00ff66,
        hi: 0xb8ffd2,
        mid: 0x00cc55,
        dim: 0x00883d,
        bg: 0x030a05,
        panel: 0x061509,
        panelAlt: 0x0b2415,
        hover: 0x134a2c,
        shadow: 0x003311
    },
    amber: {
        label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_cb4bbac4effc3d074c82"),
        main: 0xffb000,
        hi: 0xffe39a,
        mid: 0xd98f00,
        dim: 0x8a5a00,
        bg: 0x0a0600,
        panel: 0x150d02,
        panelAlt: 0x241705,
        hover: 0x4a3008,
        shadow: 0x332200
    }
};

function buildTheme(key) {
    const def = THEME_DEFS[key] || THEME_DEFS.green;

    return {
        ...def,
        key: THEME_DEFS[key] ? key : 'green',
        alert: 0xff4d4d,
        sMain: toCss(def.main),
        sHi: toCss(def.hi),
        sMid: toCss(def.mid),
        sDim: toCss(def.dim),
        sShadow: toCss(def.shadow),
        sAlert: '#ff4d4d'
    };
}

function strHash(str) {
    let h = 5381;
    const s = String(str);

    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }

    return h;
}

function lsGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function lsSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        /* optional */
    }
}

const BAYER_4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
];

const GENDER_FILTERS = [
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_b5c7aed7cd2a308523e7"), value: 'all' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_9050711d71acc01823c9"), value: 'm' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_cf112cb65cc0fbbbd85e"), value: 'f' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_7515c4d03686e13e7397"), value: 'nb' }
];

const STATUS_FILTERS = [
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_b5c7aed7cd2a308523e7"), value: 'all' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_4560e24b53b5d24ff6fd"), value: 'flag' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_2026e813d70cc656862b"), value: 'clear' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_b0145ff922bc5035a1b0"), value: 'none' }
];

const SORT_MODES = [
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_01d6e89f1c38fdd2ebc0"), key: 'file' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_e2d6bda843a7817392d3"), key: 'az' },
    { label: __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_a1da86260090abf8c493"), key: 'za' }
];

const DETAIL_FIELDS = [
    'gender',
    'race',
    'hair',
    'eyes',
    'features',
    'accent'
];

const MARGIN_NOTES = [
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_769e5e2a9a68add41495"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_f4031c3601e7a6a75f17"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_8fb1ef6cb5de8de1b8c1"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_dfdca790a398136d5d31"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_4a2074df728eebd2a540"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_075ff892b84b77fb6f22"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_de9d6b383f123d158225"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_2171b259c4a85a565335"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_4bae2cfa9473d7cbbf6f"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_824702b05c35724f08fd"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_604420d1e35e9dbb5e3b"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_dc04309e41901113fabc")
];

const TICKER_ITEMS = [
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_3ce18acdeda3d1622bc4"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_b90b78712f0d921e8ebb"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_908db396d133ec693cb1"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_0adec9d01ead33f066fe"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_b7f3642cea78eea996d8"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_d32a6f74c81165a9983a"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_9375f5255616528ca6b6"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_93dad8329fe16462616b"),
    __dialogueText("scenes/wanted-database/WantedDatabaseConfig.js", "t_7e024188eb35ae5abc6e")
];

export { FONT_PIXEL, FONT_TYPE, LS_THEME, LS_PHOTO, toCss, THEME_DEFS, buildTheme, strHash, lsGet, lsSet, BAYER_4, GENDER_FILTERS, STATUS_FILTERS, SORT_MODES, DETAIL_FIELDS, MARGIN_NOTES, TICKER_ITEMS };
