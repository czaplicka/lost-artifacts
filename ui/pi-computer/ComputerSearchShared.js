import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_49c266baaaa70981ea18"), '#377254']
];

const ITEM_HEIGHT = 108;

const TAGLINES = [
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_08c98ed21d0e62501d42"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_d7b30ea517aa71513b5f"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_4515f639af011b006168"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_98eb9ddec07a72ed01bb"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_2063551e0853a6cdd112")
];

const HOOTY_LINES = [
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_64a782e72f41b6ce52e7"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_be77aab692ccdf844e46"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_75937b962091b71cb894"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_e4d2b9b41a457854d7ee")
];

const ADS = [
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_ff3255f33694f3649736"), __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_ad42efe8b762a8901417")],
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_f945f277d5b121c02274"), __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_2ae564926f51405ceba1")],
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_7a4efb5c1e6190b4a204"), __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_7ec7c97a64d672dcc6bd")],
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_1bf15436044ac8fd31e1"), __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_40d4e6b8ef4bed95b45d")],
    [__dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_55c749af09664ee05f94"), __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_e0cf3acd049287c19fb3")]
];

const AD_CLICKS = [
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_f630b63ed5561cbab275"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_919591f05343fce27a5f"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_58f2832d3fff3ccd0131")
];

const NO_RESULT_JOKES = [
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_96c0b3235cacb65ccd1a"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_3b3d5817fb323dbb20c3"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_65442b51db709d37a660"),
    __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_8416aa1de8ac705b6235")
];

const ABOUT_TIP = __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_3e0b931195f5f0f67bb4");
const PRIVACY_TIP = __dialogueText("ui/pi-computer/ComputerSearchShared.js", "t_cd5d7b0ddea9af533af0");

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
