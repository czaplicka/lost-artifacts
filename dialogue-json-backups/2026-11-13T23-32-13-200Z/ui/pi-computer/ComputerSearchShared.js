import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { FONTS, lerpColor, seeded } from './ComputerTheme.js';

/* Owl Search: optional artwork uses WebP; category favicons use emoji.
 * No favicon files or automatically generated site-logo URLs are requested.
 */

const STATE_KEY = 'piKeywordSearch';

const clone = value => JSON.parse(JSON.stringify(value));

const safeId = value =>
    typeof value === 'string' &&
    /^[a-zA-Z0-9_-]+$/.test(value) &&
    !['__proto__', 'constructor', 'prototype'].includes(value);

const signature = ids => [...new Set(ids)].sort().join('|');

export function getSearchProgress() {
    const state = gameState[STATE_KEY];

    return state?.version === 1 &&
        state.cases &&
        !Array.isArray(state.cases) &&
        typeof state.cases === 'object'
        ? state
        : {
            version: 1,
            selectedCaseId: null,
            cases: {}
        };
}

export function discoverSearchKeywords(caseId, ids) {
    if (
        !safeId(caseId) ||
        !Array.isArray(ids) ||
        !ids.every(safeId)
    ) {
        return false;
    }

    const state = clone(getSearchProgress());
    const progress = state.cases[caseId] || {
        known: [],
        history: []
    };

    progress.known = [
        ...new Set([...(progress.known || []), ...ids])
    ];

    progress.history ||= [];
    state.cases[caseId] = progress;

    gameState[STATE_KEY] = state;
    requestAutosave();

    return true;
}

export function validateSearchData(data) {
    if (
        data?.version !== 1 ||
        !Array.isArray(data.cases) ||
        !data.cases.length
    ) {
        throw Error('Invalid search data');
    }

    const cases = new Set();

    for (const definition of data.cases) {
        if (
            !safeId(definition.id) ||
            cases.has(definition.id)
        ) {
            throw Error('Invalid case');
        }

        cases.add(definition.id);

        if (
            ![
                definition.clouds,
                definition.keywords,
                definition.pages,
                definition.recipes
            ].every(Array.isArray)
        ) {
            throw Error('Incomplete case');
        }

        const clouds = new Set();
        const keys = new Set();
        const pages = new Set();
        const queries = new Set();

        for (const cloud of definition.clouds) {
            if (
                !safeId(cloud.id) ||
                clouds.has(cloud.id) ||
                typeof cloud.title !== 'string'
            ) {
                throw Error('Invalid cloud');
            }

            clouds.add(cloud.id);
        }

        for (const keyword of definition.keywords) {
            if (
                !safeId(keyword.id) ||
                keys.has(keyword.id) ||
                !clouds.has(keyword.cloudId) ||
                typeof keyword.label !== 'string' ||
                !keyword.label.length ||
                keyword.label.length > 80
            ) {
                throw Error('Invalid keyword');
            }

            keys.add(keyword.id);
        }

        const valid = ids =>
            Array.isArray(ids) &&
            ids.every(id => keys.has(id));

        if (!valid(definition.initialKeywords || [])) {
            throw Error('Invalid initial keywords');
        }

        for (const page of definition.pages) {
            if (
                !safeId(page.id) ||
                pages.has(page.id) ||
                typeof page.title !== 'string' ||
                !Array.isArray(page.blocks)
            ) {
                throw Error('Invalid page');
            }

            pages.add(page.id);

            for (const block of page.blocks) {
                if (!Array.isArray(block)) {
                    throw Error('Invalid block');
                }

                for (const part of block) {
                    if (
                        typeof part !== 'string' &&
                        (
                            !part ||
                            !keys.has(part.keywordId) ||
                            (
                                part.text !== undefined &&
                                typeof part.text !== 'string'
                            )
                        )
                    ) {
                        throw Error('Invalid text fragment');
                    }
                }
            }
        }

        for (const page of definition.pages) {
            for (const link of page.links || []) {
                if (
                    !pages.has(link.pageId) ||
                    typeof link.label !== 'string'
                ) {
                    throw Error('Invalid page link');
                }
            }
        }

        for (const recipe of definition.recipes) {
            const targets = recipe.pageIds || [recipe.pageId];

            if (
                !valid(recipe.terms) ||
                recipe.terms.length < 1 ||
                recipe.terms.length > 2 ||
                new Set(recipe.terms).size !== recipe.terms.length ||
                !Array.isArray(targets) ||
                !targets.length ||
                !targets.every(id => pages.has(id))
            ) {
                throw Error('Invalid recipe');
            }

            const querySignature = signature(recipe.terms);

            if (queries.has(querySignature)) {
                throw Error('Duplicate recipe');
            }

            queries.add(querySignature);
        }
    }

    return data;
}

export function resolveSearchResults(definition, terms, known) {
    if (
        !Array.isArray(terms) ||
        !terms.length ||
        terms.length > 2 ||
        new Set(terms).size !== terms.length ||
        !terms.every(id => known.includes(id))
    ) {
        return [];
    }

    const recipe = definition.recipes.find(
        item => signature(item.terms) === signature(terms)
    );

    return recipe
        ? (recipe.pageIds || [recipe.pageId])
            .map(id => definition.pages.find(page => page.id === id))
            .filter(Boolean)
        : [];
}

export function resolveSearch(definition, terms, known) {
    return resolveSearchResults(definition, terms, known)[0] || null;
}

/* ------------------------------------------------------------------ */
/*  Presentation constants                                             */
/* ------------------------------------------------------------------ */

const ART_BASE = 'assets/ui/search/';

const ART_FILES = {
    search_logo: 'logo.webp',
    search_logo_small: 'logo_small.webp',
    search_owl: 'owl.webp',
    search_owl_lost: 'owl_lost.webp',
    search_magnifier: 'magnifier.webp',
};

// Art URLs that returned an error: never requested again this session.
const FAILED_ART = new Set();

// Pages the player has opened this session (per case).
const VISITED = new Map();

const THEMES = {
    hotel: { bg: 0x263e44, fg: '#f3dfb4', accent: 0xc9a24a },
    organisation: { bg: 0x355c47, fg: '#f4f0d7', accent: 0x7fbf98 },
    magazine: { bg: 0x663849, fg: '#fff0e7', accent: 0xd98aa3 },
    social: { bg: 0x344f77, fg: '#ffffff', accent: 0x7fa8ec }
};

const DEFAULT_THEME = { bg: 0x364d5e, fg: '#ffffff', accent: 0x8aa4b8 };

const CLOUD_COLORS = [0x3d6fa8, 0xa5573b, 0x4c8a5e, 0x8a5aa5];

const BRAND = [
    ['O', '#3763aa'],
    ['w', '#a73b32'],
    ['l', '#bd8e25'],
    ['Search', '#377254']
];

const ITEM_HEIGHT = 108;

const TAGLINES = [
    'Find the thing. Ignore the other things.',
    'Now with 12% more owl.',
    'Smarter than a pigeon. Slightly.',
    'Search like nobody is watching. We are watching.',
    'Results may contain owls.'
];

const HOOTY_LINES = [
    'Owl Search is feeling lucky. Owl Search is usually wrong.',
    'The lucky button was disabled by the legal department.',
    'You are not lucky. You are a detective. Pick a clue.',
    'The owl consulted the stars. The stars said: "Use your Field Notes."'
];

const ADS = [
    ['Binocular Barn: see further, judge harder.', 'www.binocularbarn.local'],
    ['Quick-dry trench coats. Rain not included.', 'www.trenchco.local'],
    ['Detective Donuts. Stakeout-approved since 1974.', 'www.detectivedonuts.local'],
    ['Marker pens that actually work. We checked.', 'www.pensplus.local'],
    ['Is your partner a spy? Probably not. Buy a nicer lamp.', 'www.lampsandlies.local']
];

const AD_CLICKS = [
    'You clicked an ad. Somewhere, a pigeon got paid.',
    'Ad clicked. The owl thanks you. The owl has bills.',
    'That was an ad. Focus, detective.'
];

const NO_RESULT_JOKES = [
    'The owl is trying its best.',
    'Even the owl looked behind the sofa.',
    'The internet is big. Your clue is specific. It happens.',
    'No results. Not even a suspicious pigeon.'
];

const ABOUT_TIP = 'Owl Search was founded by an owl. This is not legal advice.';
const PRIVACY_TIP = 'We never track you. The owl just happens to know where you are.';

const slug = value =>
    String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const hash = value => {
    let result = 2166136261;

    for (let index = 0; index < value.length; index++) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }

    return result >>> 0;
};

const pick = (list, seed = null) =>
    list[
        seed === null
            ? Math.floor(Math.random() * list.length)
            : seed % list.length
    ];

const titleCase = value =>
    String(value || '')
        .toLowerCase()
        .replace(/(^|\s)\S/g, character => character.toUpperCase());


export { STATE_KEY, clone, safeId, signature, ART_BASE, ART_FILES, FAILED_ART, VISITED, THEMES, DEFAULT_THEME, CLOUD_COLORS, BRAND, ITEM_HEIGHT, TAGLINES, HOOTY_LINES, ADS, AD_CLICKS, NO_RESULT_JOKES, ABOUT_TIP, PRIVACY_TIP, slug, hash, pick, titleCase, gameState, requestAutosave, FONTS, lerpColor, seeded };
