const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite, "Courier New", monospace';

const LS_THEME = 'la_wantedDbTheme';
const LS_PHOTO = 'la_wantedDbPhoto';

const toCss = (n) => `#${n.toString(16).padStart(6, '0')}`;

const THEME_DEFS = {
    green: {
        label: 'GREEN',
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
        label: 'AMBER',
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
    { label: 'ALL', value: 'all' },
    { label: 'MALE', value: 'm' },
    { label: 'FEMALE', value: 'f' },
    { label: 'NON-BINARY', value: 'nb' }
];

const STATUS_FILTERS = [
    { label: 'ALL', value: 'all' },
    { label: 'FLAGGED', value: 'flag' },
    { label: 'CLEARED', value: 'clear' },
    { label: 'UNSORTED', value: 'none' }
];

const SORT_MODES = [
    { label: 'FILE #', key: 'file' },
    { label: 'NAME A-Z', key: 'az' },
    { label: 'NAME Z-A', key: 'za' }
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
    'Suspect denies everything. Suspiciously well-rehearsed.',
    'Do NOT make eye contact. Or do. Reports conflict.',
    'Last seen near a getaway vehicle. Or a bus. Hard to say.',
    'Known to carry a very large bag. Bags are large.',
    'Claims to be "just a collector". Of other people\'s things.',
    'Wears a disguise. The disguise is a fake mustache. It is excellent.',
    'Approach with caution. And snacks.',
    'Alibi: "I was at my aunt\'s." Aunt has not been located.',
    'Probably guilty. Statistically, somebody is.',
    'If found, do not mention the mustache.',
    'Once escaped through a revolving door. Twice. Same door.',
    'Has a suspiciously clean criminal record. Too clean. Who cleans it?'
];

const TICKER_ITEMS = [
    'BREAKING: CURATOR INSISTS THE MUSEUM WAS "ALREADY LIKE THAT"',
    'REMINDER: A FAKE MUSTACHE IS NOT AN ALIBI',
    'WARNING: SUSPECTS MAY BE ARMED, DANGEROUS, OR JUST RUDE',
    'TIP LINE OPEN: 1-800-NOT-ME-OFFICER',
    'INTERPOL REMINDS YOU THAT PIGEONS ARE NOT RELIABLE WITNESSES',
    'DO NOT SPILL COFFEE ON THE MAINFRAME (AGAIN)',
    'STOLEN: ONE (1) PRICELESS ARTIFACT. SUSPECTED: EVERYBODY',
    'LOCAL PAWN SHOP DENIES EVER HAVING SEEN ANYTHING SHINY',
    'CLEARANCE LEVEL "DETECTIVE" NOW INCLUDES FREE PENCIL'
];

export { FONT_PIXEL, FONT_TYPE, LS_THEME, LS_PHOTO, toCss, THEME_DEFS, buildTheme, strHash, lsGet, lsSet, BAYER_4, GENDER_FILTERS, STATUS_FILTERS, SORT_MODES, DETAIL_FIELDS, MARGIN_NOTES, TICKER_ITEMS };
