import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { FONTS, lerpColor, seeded } from './ComputerTheme.js';

/*
 * OWL Navigator / Owl Search
 *
 * Optional art (every item has a procedural fallback, so the game works without any PNG):
 *   assets/ui/search/logo.png, logo_small.png, owl.png, owl_lost.png, magnifier.png
 *   assets/ui/search/fav_hotel|organisation|magazine|social|default.png
 *   assets/ui/search/sites/<brand_slug>.png   (brand_slug = page.brand lower-cased, non-alphanumerics -> "_")
 *   Per-page override: "logoKey" + "logoUrl" in piSearch.json (optional).
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
    search_logo: 'logo.png',
    search_logo_small: 'logo_small.png',
    search_owl: 'owl.png',
    search_owl_lost: 'owl_lost.png',
    search_magnifier: 'magnifier.png',
    search_fav_hotel: 'fav_hotel.png',
    search_fav_organisation: 'fav_organisation.png',
    search_fav_magazine: 'fav_magazine.png',
    search_fav_social: 'fav_social.png',
    search_fav_default: 'fav_default.png'
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

export class ComputerSearch {
    constructor(ui) {
        Object.assign(this, {
            ui,
            data: null,
            loading: null,
            error: '',
            terms: [],
            submitted: [],
            results: [],
            view: 'home',
            pageId: null,
            resultPage: 0,
            bodyPage: 0,
            notePage: 0,
            notesOpen: false,
            dead: false,
            controller: null,
            trail: [],
            images: [],
            requested: new Set(),
            tip: '',
            tagline: pick(TAGLINES)
        });

        this.install();
    }

    install() {
        const ui = this.ui;

        if (
            typeof ui.desktop?.render !== 'function' ||
            typeof ui.desktop?.createIcon !== 'function' ||
            typeof ui.monitor?.renderApplication !== 'function'
        ) {
            throw TypeError('[ComputerSearch] Incompatible computer UI');
        }

        const desktop = ui.desktop.render.bind(ui.desktop);

        ui.desktop.render = () => {
            desktop();

            const { x, y } = ui.layout;

            ui.desktop.createIcon(
                x + 152,
                y + 10,
                128,
                'Web Search',
                'globe',
                0x9fc9a9,
                () => ui.openApp('search')
            );
        };

        const application = ui.monitor.renderApplication.bind(ui.monitor);

        ui.monitor.renderApplication = () =>
            ui.app === 'search'
                ? this.render()
                : application();

        const after = () => {
            if (
                !this.dead &&
                !ui.destroyed &&
                ui.isOpen &&
                !ui.suspended &&
                !ui.booting &&
                ui.app === 'search'
            ) {
                this.renderNotebook();
                ui.pin?.();
            }
        };

        if (typeof ui.monitor.render === 'function') {
            const render = ui.monitor.render.bind(ui.monitor);

            ui.monitor.render = () => {
                render();
                after();
            };
        } else if (typeof ui.render === 'function') {
            const render = ui.render.bind(ui);

            ui.render = () => {
                render();
                after();
            };
        } else {
            throw TypeError('[ComputerSearch] Missing render');
        }
    }

    refresh() {
        if (
            !this.dead &&
            !this.ui.destroyed &&
            this.ui.isOpen &&
            !this.ui.suspended &&
            this.ui.app === 'search'
        ) {
            this.ui.render();
        }
    }

    async load() {
        if (this.data || this.loading || this.dead) {
            return this.loading;
        }

        this.error = '';
        this.controller = new AbortController();

        this.loading = (async () => {
            try {
                const response = await fetch(
                    this.ui.options.searchDataUrl ||
                        'assets/data/piSearch.json',
                    { signal: this.controller.signal }
                );

                if (!response.ok) {
                    throw Error(`HTTP ${response.status}`);
                }

                const data = validateSearchData(await response.json());

                if (this.dead) return;

                this.data = data;

                const state = clone(getSearchProgress());

                for (const definition of data.cases) {
                    if (!state.cases[definition.id]) {
                        state.cases[definition.id] = {
                            known: [...(definition.initialKeywords || [])],
                            history: []
                        };
                    }
                }

                if (
                    !data.cases.some(
                        definition =>
                            definition.id === state.selectedCaseId
                    )
                ) {
                    state.selectedCaseId = data.cases[0].id;
                }

                gameState[STATE_KEY] = state;
                requestAutosave();

                this.loadAssets();
            } catch (error) {
                if (!this.dead && error.name !== 'AbortError') {
                    this.error = 'Connection unavailable.';
                    console.error('[ComputerSearch]', error);
                }
            } finally {
                this.loading = null;
                this.refresh();
            }
        })();

        return this.loading;
    }

    /* -------------------------- assets --------------------------- */

    textureOk(key) {
        return Boolean(key) && this.ui.scene.textures.exists(key);
    }

    siteKey(page) {
        return `search_site_${slug(page.brand || page.id)}`;
    }

    addTexture(key, url) {
        if (
            typeof Image === 'undefined' ||
            !key ||
            !url ||
            this.requested.has(key) ||
            FAILED_ART.has(url) ||
            this.ui.scene.textures.exists(key)
        ) {
            return;
        }

        this.requested.add(key);

        const image = new Image();
        this.images.push(image);

        image.onload = () => {
            image.onload = null;
            image.onerror = null;

            if (this.dead || this.ui.destroyed) return;

            if (!this.ui.scene.textures.exists(key)) {
                this.ui.scene.textures.addImage(key, image);
            }

            this.refresh();
        };

        image.onerror = () => {
            image.onload = null;
            image.onerror = null;
            FAILED_ART.add(url);
        };

        image.src = url;
    }

    loadAssets() {
        if (!this.data) return;

        for (const [key, file] of Object.entries(ART_FILES)) {
            this.addTexture(key, ART_BASE + file);
        }

        for (const page of this.data.cases.flatMap(
            definition => definition.pages
        )) {
            this.addTexture(page.imageKey, page.imageUrl);

            this.addTexture(
                page.logoKey || this.siteKey(page),
                page.logoUrl ||
                    `${ART_BASE}sites/${slug(page.brand || page.id)}.png`
            );
        }
    }

    // Kept for backwards compatibility with older callers.
    loadImages() {
        this.loadAssets();
    }

    // Draws a texture contained in a box (aspect ratio preserved). Returns null if missing.
    art(key, x, y, maxWidth, maxHeight) {
        if (!this.textureOk(key)) return null;

        const frame = this.ui.scene.textures.getFrame(key);
        const scale = Math.min(
            maxWidth / frame.width,
            maxHeight / frame.height
        );

        const width = frame.width * scale;
        const height = frame.height * scale;

        return this.ui.drawing.add(
            this.ui.scene.add.image(
                x + (maxWidth - width) / 2,
                y + (maxHeight - height) / 2,
                key
            )
                .setOrigin(0)
                .setDisplaySize(width, height)
        );
    }

    /* --------------------------- state --------------------------- */

    get definition() {
        return this.data?.cases.find(
            definition =>
                definition.id === getSearchProgress().selectedCaseId
        ) || this.data?.cases[0] || null;
    }

    get progress() {
        return getSearchProgress().cases[this.definition?.id] || {
            known: [],
            history: []
        };
    }

    isVisited(id) {
        return VISITED.get(this.definition?.id)?.has(id) || false;
    }

    markVisited(id) {
        const key = this.definition?.id;

        if (!key) return;

        if (!VISITED.has(key)) {
            VISITED.set(key, new Set());
        }

        VISITED.get(key).add(id);
    }

    termLabels(ids) {
        return ids.map(
            id =>
                this.definition?.keywords.find(
                    keyword => keyword.id === id
                )?.label || id
        );
    }

    cloudColor(keyword) {
        const index = Math.max(
            0,
            this.definition.clouds.findIndex(
                cloud => cloud.id === keyword.cloudId
            )
        );

        return CLOUD_COLORS[index % CLOUD_COLORS.length];
    }

    recentSearches(limit) {
        const seen = new Set();
        const recent = [];

        for (const item of [...(this.progress.history || [])].reverse()) {
            const terms = (item.terms || []).filter(id =>
                this.definition.keywords.some(keyword => keyword.id === id)
            );

            if (!terms.length) continue;

            const key = signature(terms);

            if (seen.has(key)) continue;

            seen.add(key);
            recent.push(terms);

            if (recent.length >= limit) break;
        }

        return recent;
    }

    selectCase(id) {
        if (!this.data?.cases.some(definition => definition.id === id)) {
            return;
        }

        const state = clone(getSearchProgress());

        state.selectedCaseId = id;
        gameState[STATE_KEY] = state;

        requestAutosave();

        Object.assign(this, {
            terms: [],
            submitted: [],
            results: [],
            view: 'home',
            pageId: null,
            resultPage: 0,
            bodyPage: 0,
            notePage: 0,
            trail: [],
            tip: ''
        });

        this.refresh();
    }

    selectKeyword(id) {
        if (!this.progress.known.includes(id)) return;

        if (this.terms.includes(id)) {
            this.terms = this.terms.filter(keywordId => keywordId !== id);
        } else if (this.terms.length < 2) {
            this.terms.push(id);
        }

        this.refresh();
    }

    clearQuery() {
        this.terms = [];
        this.refresh();
    }

    runQuery(terms) {
        this.terms = [...terms].slice(0, 2);
        this.search();
    }

    hooty() {
        this.tip = pick(HOOTY_LINES);
        this.refresh();
    }

    say(text) {
        this.tip = text;
        this.refresh();
    }

    goHome() {
        Object.assign(this, {
            view: 'home',
            pageId: null,
            trail: [],
            bodyPage: 0,
            tip: ''
        });

        this.refresh();
    }

    search() {
        if (!this.definition || !this.terms.length) return;

        this.submitted = [...this.terms];

        this.results = resolveSearchResults(
            this.definition,
            this.submitted,
            this.progress.known
        );

        Object.assign(this, {
            view: 'results',
            pageId: null,
            resultPage: 0,
            bodyPage: 0,
            trail: [],
            notesOpen: false,
            tip: ''
        });

        const state = clone(getSearchProgress());
        const progress = state.cases[this.definition.id];

        progress.history = [
            ...(progress.history || []),
            {
                terms: [...this.submitted],
                pageId: this.results[0]?.id || null,
                pageIds: this.results.map(page => page.id)
            }
        ].slice(-40);

        gameState[STATE_KEY] = state;
        requestAutosave();

        this.refresh();
    }

    openPage(id) {
        if (!this.definition?.pages.some(page => page.id === id)) {
            return;
        }

        this.markVisited(id);

        this.trail.push({
            view: this.view,
            pageId: this.pageId,
            bodyPage: this.bodyPage
        });

        this.view = 'page';
        this.pageId = id;
        this.bodyPage = 0;
        this.tip = '';

        this.refresh();
    }

    back() {
        const previous = this.trail.pop();

        if (previous) {
            Object.assign(this, previous);
        } else {
            // From results (or a page opened without history) go one level up.
            this.view =
                this.view === 'page' && this.submitted.length
                    ? 'results'
                    : 'home';

            this.pageId = null;
        }

        this.tip = '';
        this.refresh();
    }

    collect(id) {
        if (
            this.definition.keywords.some(keyword => keyword.id === id) &&
            !this.progress.known.includes(id)
        ) {
            discoverSearchKeywords(this.definition.id, [id]);
        }

        this.refresh();
    }

    /* ------------------------ small widgets ---------------------- */

    textWidth(value, size = 14) {
        const probe = this.ui.scene.add.text(0, 0, String(value), {
            fontFamily: FONTS.body,
            fontSize: `${size}px`
        }).setVisible(false);

        const width = probe.width;
        probe.destroy();

        return width;
    }

    chipWidth(label, size = 14, maxWidth = 400) {
        return Math.min(
            maxWidth,
            Math.ceil(this.textWidth(label, size)) + 20
        );
    }

    // Flat pixel "tag". Returns its width.
    chip(x, y, label, options = {}) {
        const {
            color = 0x3d6fa8,
            height = 26,
            size = 14,
            maxWidth = 400,
            textColor = '#ffffff',
            onClick = null
        } = options;

        const d = this.ui.drawing;
        const width = this.chipWidth(label, size, maxWidth);

        d.rectangle(x + 2, y + 2, width, height, 0x000000, 0.25);

        const body = d.rectangle(x, y, width, height, color);

        d.frame(x, y, width, height, 0x1b2530, 0.55, 1);

        const text = d.text(x + 10, y, label, size, textColor);

        d.fit(text, label, width - 20);
        text.setY(y + Math.round((height - text.height) / 2));

        if (onClick) {
            body
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () =>
                    body.setFillStyle(lerpColor(color, 0xffffff, 0.22))
                )
                .on('pointerout', () => body.setFillStyle(color))
                .on('pointerdown', () => {
                    this.ui.options.onSfx?.('click');
                    onClick();
                });
        }

        return width;
    }

    drawMagnifier(x, y, size = 22, color = 0x4a5a58) {
        const g = this.ui.drawing.add(this.ui.scene.add.graphics());
        const radius = size * 0.32;

        g.lineStyle(Math.max(2, size * 0.1), color, 1);
        g.strokeCircle(x + radius + 1, y + radius + 1, radius);
        g.lineBetween(
            x + radius * 1.9,
            y + radius * 1.9,
            x + size - 2,
            y + size - 2
        );

        return g;
    }

    // Procedural mascot: an owl in a fedora (nod to the adventure-game era).
    drawOwl(cx, cy, scale = 1, mood = 'happy') {
        const d = this.ui.drawing;
        const g = d.add(this.ui.scene.add.graphics());
        const u = value => value * scale;
        const ink = 0x1b2530;

        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(cx + u(4), cy + u(48), u(64), u(10));

        g.fillStyle(0xe0a458, 1);
        g.fillRect(cx - u(16), cy + u(44), u(10), u(5));
        g.fillRect(cx + u(6), cy + u(44), u(10), u(5));

        g.fillStyle(0x7b5b3b, 1);
        g.fillEllipse(cx, cy + u(6), u(72), u(84));
        g.lineStyle(2, ink, 1);
        g.strokeEllipse(cx, cy + u(6), u(72), u(84));

        g.fillStyle(0xf0dfb0, 1);
        g.fillEllipse(cx, cy + u(22), u(44), u(50));

        g.lineStyle(1, 0xb79a62, 1);

        for (let row = 0; row < 3; row++) {
            for (let col = -1; col <= 1; col++) {
                g.strokeCircle(
                    cx + col * u(11) + (row % 2) * u(5),
                    cy + u(14) + row * u(11),
                    u(5)
                );
            }
        }

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - u(15), cy - u(8), u(13));
        g.fillCircle(cx + u(15), cy - u(8), u(13));
        g.lineStyle(2, ink, 1);
        g.strokeCircle(cx - u(15), cy - u(8), u(13));
        g.strokeCircle(cx + u(15), cy - u(8), u(13));

        const lost = mood === 'lost';

        g.fillStyle(ink, 1);
        g.fillCircle(
            cx - u(15) + (lost ? u(4) : 0),
            cy - u(8) + (lost ? -u(3) : 0),
            u(lost ? 4 : 5)
        );
        g.fillCircle(
            cx + u(15) + (lost ? u(4) : 0),
            cy - u(8) + (lost ? -u(3) : 0),
            u(lost ? 4 : 5)
        );

        g.fillStyle(0xe0a458, 1);
        g.fillTriangle(
            cx - u(6),
            cy + u(2),
            cx + u(6),
            cy + u(2),
            cx,
            cy + u(13)
        );
        g.lineStyle(1, ink, 1);
        g.strokeTriangle(
            cx - u(6),
            cy + u(2),
            cx + u(6),
            cy + u(2),
            cx,
            cy + u(13)
        );

        // fedora
        g.fillStyle(0x5a3f2a, 1);
        g.fillRect(cx - u(15), cy - u(44), u(30), u(20));
        g.fillEllipse(cx, cy - u(25), u(62), u(10));
        g.fillStyle(0xd4af37, 1);
        g.fillRect(cx - u(15), cy - u(31), u(30), u(5));
        g.lineStyle(1, ink, 1);
        g.strokeRect(cx - u(15), cy - u(44), u(30), u(20));
        g.strokeEllipse(cx, cy - u(25), u(62), u(10));

        if (lost && scale >= 0.8) {
            d.pixel(
                cx + u(34),
                cy - u(52),
                '?',
                Math.round(u(20)),
                '#a14d35'
            );
        }

        return g;
    }

    // Small owl icon used in the address bar and the connecting screen.
    owlIcon(x, y, size) {
        if (this.art('search_owl', x, y, size, size)) return;

        this.drawOwl(x + size / 2, y + size * 0.47, size / 112);
    }

    favicon(x, y, size, page) {
        const d = this.ui.drawing;
        const theme = THEMES[page.theme] || DEFAULT_THEME;

        d.rectangle(x + 2, y + 2, size, size, 0x000000, 0.18);

        for (const key of [
            page.logoKey,
            this.siteKey(page),
            `search_fav_${page.theme}`,
            'search_fav_default'
        ]) {
            if (this.textureOk(key)) {
                d.rectangle(x, y, size, size, 0xffffff);
                this.art(key, x, y, size, size);
                d.frame(x, y, size, size, 0x1b2530, 0.35, 1);
                return;
            }
        }

        d.rectangle(x, y, size, size, theme.bg);
        d.rectangle(x + 3, y + 3, size - 6, 3, theme.accent);
        d.frame(x, y, size, size, 0x1b2530, 0.6, 1);

        d.pixel(
            x + size / 2,
            y + size / 2 + 3,
            String(page.brand || page.title || '?')
                .trim()
                .charAt(0)
                .toUpperCase(),
            Math.round(size * 0.4),
            theme.fg
        ).setOrigin(0.5);
    }

    brandWidth(size) {
        return BRAND.reduce(
            (total, [word]) => total + this.textWidth(word, size) + 1,
            0
        );
    }

    brand(x, y, size = 36) {
        let currentX = x;

        for (const [word, color] of BRAND) {
            const text = this.ui.drawing.text(
                currentX,
                y,
                word,
                size,
                color
            );

            text.setShadow(2, 2, '#00000033', 0, false, true);
            currentX += text.width + 1;
        }

        return currentX - x;
    }

    /* ---------------------------- render ------------------------- */

    render() {
        const ui = this.ui;
        const drawing = ui.drawing;
        const { x, y, w, h } = ui.layout;

        if (!this.data && !this.loading && !this.error && !this.dead) {
            void this.load();
        }

        const box = {
            x: x + 14,
            y: y + 10,
            w: w - 28,
            h: h - 58
        };

        ui.window = box;

        drawing.bevel(box.x, box.y, box.w, box.h, 0xc6c7bf);

        drawing.rectangle(
            box.x + 4,
            box.y + 4,
            box.w - 8,
            30,
            0x244452
        );

        drawing.pixel(
            box.x + 14,
            box.y + 14,
            'OWL Navigator',
            10,
            '#fff0cc'
        );

        drawing.button(
            box.x + box.w - 45,
            box.y + 3,
            'X',
            () => ui.openApp('desktop')
        );

        drawing.button(
            box.x + 8,
            box.y + 39,
            '<',
            () => this.back(),
            this.view !== 'home'
        );

        drawing.button(
            box.x + 52,
            box.y + 39,
            'Home',
            () => this.goHome(),
            this.view !== 'home'
        );

        const page = this.definition?.pages.find(
            item => item.id === this.pageId
        );

        const addressX = box.x + 128;
        const addressWidth = box.w - 139;

        drawing.bevel(
            addressX,
            box.y + 39,
            addressWidth,
            31,
            0xf6f5e9,
            true
        );

        let addressText = 'www.owlsearch.local';

        if (this.view === 'page') {
            addressText = page?.address || '';
        } else if (this.view === 'results' && this.data) {
            addressText =
                'www.owlsearch.local/search?q=' +
                this.termLabels(this.submitted)
                    .join('+')
                    .replace(/\s+/g, '+');
        }

        if (this.view === 'page' && page) {
            this.favicon(addressX + 9, box.y + 46, 17, page);
        } else {
            this.owlIcon(addressX + 8, box.y + 45, 19);
        }

        const address = drawing.text(
            addressX + 36,
            box.y + 47,
            addressText,
            13,
            '#424d4c'
        );

        drawing.fit(address, address.text, addressWidth - 50);

        const area = {
            x: box.x + 6,
            y: box.y + 78,
            w: box.w - 12,
            h: box.h - 84
        };

        drawing.rectangle(
            area.x,
            area.y,
            area.w,
            area.h,
            0xfaf9f3
        );

        if (!this.data) {
            this.owlIcon(area.x + 25, area.y + 26, 56);

            drawing.text(
                area.x + 96,
                area.y + 40,
                this.error || 'Connecting...',
                18,
                '#535b5c'
            );

            if (this.error) {
                drawing.button(
                    area.x + 96,
                    area.y + 88,
                    'Retry',
                    () => void this.load()
                );
            }

            return;
        }

        if (this.view === 'page' && page) {
            this.drawPage(page, area);
        } else {
            this.drawSearch(area);
        }
    }

    queryBar(x, y, width, options = {}) {
        const { large = false, button = true } = options;
        const d = this.ui.drawing;
        const height = large ? 46 : 38;
        const inputWidth = button ? Math.max(120, width - 118) : width;

        d.bevel(x, y, inputWidth, height, 0xffffff, true);

        const iconSize = large ? 24 : 20;

        if (!this.art('search_magnifier', x + 12, y + (height - iconSize) / 2, iconSize, iconSize)) {
            this.drawMagnifier(x + 12, y + (height - iconSize) / 2, iconSize);
        }

        let currentX = x + 14 + iconSize + 10;

        if (!this.terms.length) {
            const hint = d.text(
                currentX,
                y + (height - 18) / 2,
                'Pick up to 2 clues from your Field Notes...',
                large ? 16 : 14,
                '#a19f90'
            );

            d.fit(hint, hint.text, inputWidth - (currentX - x) - 14);
        }

        const chipMax = Math.max(
            60,
            (inputWidth - (currentX - x) - 50) / 2 - 8
        );

        for (const id of this.terms) {
            const keyword = this.definition.keywords.find(
                item => item.id === id
            );

            if (!keyword) continue;

            currentX +=
                this.chip(
                    currentX,
                    y + 6,
                    keyword.label,
                    {
                        color: this.cloudColor(keyword),
                        height: height - 12,
                        maxWidth: chipMax,
                        onClick: () => this.selectKeyword(id)
                    }
                ) + 8;
        }

        if (this.terms.length) {
            d.text(
                x + inputWidth - 28,
                y + (height - 24) / 2,
                'x',
                22,
                '#8a8878'
            )
                .setPadding(6, 0, 6, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.clearQuery());
        }

        if (button) {
            d.button(
                x + inputWidth + 8,
                y + Math.round((height - 32) / 2),
                'Search',
                () => this.search(),
                this.terms.length > 0
            );
        }
    }

    // Clickable clue chips from the player's notes. Returns the next free y.
    suggestions(x, y, width) {
        const d = this.ui.drawing;

        const known = this.definition.keywords.filter(keyword =>
            this.progress.known.includes(keyword.id)
        );

        if (!known.length) {
            d.text(
                x + width / 2,
                y,
                'Your Field Notes are empty. Go and find a clue first. The napkin will not read itself.',
                14,
                '#8a8d80',
                width
            ).setOrigin(0.5, 0).setAlign('center');

            return y + 48;
        }

        const open = known.filter(
            keyword => !this.terms.includes(keyword.id)
        );

        if (!open.length) return y;

        d.text(x, y, 'From your Field Notes:', 13, '#7a7d72');

        y += 24;

        const full = this.terms.length >= 2;
        const maxRows = 3;
        const rowHeight = 32;

        let currentX = x;
        let row = 0;
        let shown = 0;

        for (const keyword of open) {
            const chipWidth = this.chipWidth(keyword.label, 14, width);

            if (currentX > x && currentX + chipWidth > x + width) {
                if (row + 1 >= maxRows) break;

                row++;
                currentX = x;
            }

            this.chip(
                currentX,
                y + row * rowHeight,
                keyword.label,
                {
                    color: full ? 0x9aa096 : this.cloudColor(keyword),
                    maxWidth: width,
                    onClick: full
                        ? null
                        : () => this.selectKeyword(keyword.id)
                }
            );

            currentX += chipWidth + 8;
            shown++;
        }

        let bottom = y + (row + 1) * rowHeight;

        if (shown < open.length) {
            d.text(
                x,
                bottom,
                `+${open.length - shown} more in your Field Notes`,
                12,
                '#8a8d80'
            );

            bottom += 20;
        }

        return bottom;
    }

    drawSearch(area) {
        if (this.view === 'home') {
            this.drawHome(area);
        } else {
            this.drawResults(area);
        }
    }

    drawHome(area) {
        const d = this.ui.drawing;
        const centerX = area.x + area.w / 2;

        let y = area.y + 30;

        if (this.textureOk('search_logo')) {
            this.art('search_logo', centerX - 270, y, 540, 140);
        } else {
            const brandWidth = this.brandWidth(46);
            const total = 96 + 18 + brandWidth;
            const startX = centerX - total / 2;

            this.drawOwl(startX + 48, y + 62, 1.1);
            this.brand(startX + 114, y + 36, 46);
        }

        y += 150;

        d.text(
            centerX,
            y,
            this.tagline,
            15,
            '#7a7d72'
        ).setOrigin(0.5, 0);

        y += 44;

        const barWidth = Math.min(820, area.w - 100);
        const barX = centerX - barWidth / 2;

        this.queryBar(barX, y, barWidth, { large: true, button: false });

        y += 64;

        d.button(
            centerX - 165,
            y,
            'Owl Search',
            () => this.search(),
            this.terms.length > 0
        );

        d.button(
            centerX + 5,
            y,
            'Feeling Hooty',
            () => this.hooty()
        );

        y += 54;

        if (this.tip) {
            d.text(
                centerX,
                y,
                this.tip,
                14,
                '#a14d35',
                barWidth
            ).setOrigin(0.5, 0).setAlign('center');

            y += 34;
        }

        y = this.suggestions(barX, y, barWidth) + 14;

        const recent = this.recentSearches(3);

        if (recent.length && y < area.y + area.h - 110) {
            d.text(barX, y, 'Recent searches:', 13, '#7a7d72');

            y += 24;

            let currentX = barX;

            for (const terms of recent) {
                const label = this.termLabels(terms).join(' + ');
                const width = this.chipWidth(label, 14, barWidth);

                if (currentX > barX && currentX + width > barX + barWidth) {
                    currentX = barX;
                    y += 32;
                }

                this.chip(currentX, y, label, {
                    color: 0x6b7a74,
                    maxWidth: barWidth,
                    onClick: () => this.runQuery(terms)
                });

                currentX += width + 8;
            }
        }

        const footerY = area.y + area.h - 30;

        d.text(
            centerX - 150,
            footerY,
            'Owl Search',
            13,
            '#81847c'
        ).setOrigin(0, 0);

        for (const [label, offset, line] of [
            ['About', 0, ABOUT_TIP],
            ['Privacy', 80, PRIVACY_TIP]
        ]) {
            d.text(
                centerX - 40 + offset,
                footerY,
                label,
                13,
                '#4b6d9a'
            )
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.say(line));
        }
    }

    drawResults(area) {
        const d = this.ui.drawing;

        if (
            !this.art(
                'search_logo_small',
                area.x + 22,
                area.y + 6,
                190,
                46
            )
        ) {
            this.brand(area.x + 22, area.y + 12, 25);
        }

        this.queryBar(area.x + 232, area.y + 10, area.w - 256);

        d.rectangle(
            area.x + 18,
            area.y + 60,
            area.w - 36,
            1,
            0xd9ddd4
        );

        if (!this.results.length) {
            this.drawNoResults(area);
            return;
        }

        const seed = hash(signature(this.submitted));
        const seconds = (0.11 + seeded(seed)() * 0.6).toFixed(2);
        const count = this.results.length;

        d.text(
            area.x + 25,
            area.y + 68,
            `${count} result${count === 1 ? '' : 's'}  |  ${seconds} seconds`,
            13,
            '#6a6e66'
        );

        if (this.tip) {
            const tip = d.text(
                area.x + area.w - 25,
                area.y + 68,
                this.tip,
                13,
                '#a14d35'
            ).setOrigin(1, 0);

            d.fit(tip, this.tip, area.w * 0.6);
        }

        let y = area.y + 96;

        if (area.h >= 540) {
            y = this.drawAd(area.x + 25, y, area.w - 50, seed);
        }

        const pagerY = area.y + area.h - 58;
        const perPage = Math.max(
            1,
            Math.floor((pagerY - y) / ITEM_HEIGHT)
        );

        const pages = Math.ceil(count / perPage);

        this.resultPage = Math.min(this.resultPage, pages - 1);

        this.results
            .slice(
                this.resultPage * perPage,
                (this.resultPage + 1) * perPage
            )
            .forEach((page, index) => {
                this.drawResult(
                    page,
                    area.x + 25,
                    y + index * ITEM_HEIGHT,
                    area.w - 50
                );
            });

        if (pages > 1) {
            this.owlPager(
                area.x,
                pagerY + 8,
                area.w,
                this.resultPage,
                pages
            );
        }
    }

    drawAd(x, y, width, seed) {
        const d = this.ui.drawing;
        const ad = pick(ADS, seed);

        d.rectangle(x - 6, y, width + 12, 54, 0xf5edc8);
        d.frame(x - 6, y, width + 12, 54, 0xd2c283, 1, 1);

        d.pixel(x + 4, y + 20, 'AD', 9, '#8a6a1f');

        const headline = d.text(x + 44, y + 7, ad[0], 16, '#7a5a12');

        d.fit(headline, ad[0], width - 60);

        d.text(x + 44, y + 30, ad[1], 12, '#6e8a4e');

        d.rectangle(x - 6, y, width + 12, 54, 0xffffff, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.say(pick(AD_CLICKS)));

        return y + 68;
    }

    breadcrumb(address) {
        return String(address || '')
            .replace(/^https?:\/\//, '')
            .split('/')
            .filter(Boolean)
            .join(' > ');
    }

    drawResult(page, x, y, width) {
        const d = this.ui.drawing;
        const visited = this.isVisited(page.id);
        const hasThumb = this.textureOk(page.imageKey);
        const thumbWidth = hasThumb ? 112 : 0;
        const textWidth = width - thumbWidth - 10;

        const hover = d.rectangle(
            x - 10,
            y - 6,
            width + 20,
            ITEM_HEIGHT - 6,
            0xe9efdc,
            0
        );

        this.favicon(x, y, 30, page);

        const siteName = page.brand
            ? titleCase(page.brand)
            : this.breadcrumb(page.address).split(' > ')[0];

        const site = d.text(x + 42, y - 1, siteName, 14, '#2b2f33');

        d.fit(site, siteName, textWidth - 42);

        const crumbText = this.breadcrumb(page.address);
        const crumb = d.text(x + 42, y + 15, crumbText, 12, '#47734d');

        d.fit(crumb, crumbText, textWidth - 42);

        const titleColor = visited ? '#6b3fa0' : '#234b9b';
        const title = d.text(x, y + 36, page.title, 20, titleColor);

        d.fit(title, page.title, textWidth);

        const underline = d.rectangle(
            x,
            y + 36 + title.height - 3,
            title.width,
            1,
            visited ? 0x6b3fa0 : 0x234b9b
        ).setVisible(false);

        const snippet = d.text(
            x,
            y + 64,
            page.snippet || '',
            14,
            '#5e645c',
            textWidth
        );

        snippet.setMaxLines?.(2);

        if (hasThumb) {
            const thumbX = x + width - 104;

            d.rectangle(thumbX - 2, y + 32, 108, 64, 0xffffff);
            this.art(page.imageKey, thumbX, y + 34, 104, 60);
            d.frame(thumbX - 2, y + 32, 108, 64, 0x1b2530, 0.4, 1);
        }

        d.rectangle(
            x - 10,
            y - 6,
            width + 20,
            ITEM_HEIGHT - 6,
            0xffffff,
            0
        )
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                hover.setFillStyle(0xe9efdc, 0.9);
                underline.setVisible(true);
            })
            .on('pointerout', () => {
                hover.setFillStyle(0xe9efdc, 0);
                underline.setVisible(false);
            })
            .on('pointerdown', () => {
                this.ui.options.onSfx?.('click');
                this.openPage(page.id);
            });
    }

    // "Owwwl" pagination, one letter per page.
    owlPager(x, y, width, page, count) {
        const d = this.ui.drawing;
        const letterWidth = 28;
        const total = (count + 2) * letterWidth;
        const startX = x + width / 2 - total / 2;

        d.button(
            startX - 86,
            y + 2,
            'Prev',
            () => {
                this.resultPage = page - 1;
                this.refresh();
            },
            page > 0
        );

        d.text(startX, y, 'O', 28, '#3763aa');

        for (let index = 0; index < count; index++) {
            const active = index === page;
            const letterX = startX + (index + 1) * letterWidth;

            d.text(
                letterX,
                y,
                'w',
                28,
                active ? '#a73b32' : '#3763aa'
            )
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.resultPage = index;
                    this.refresh();
                });

            d.text(
                letterX + 5,
                y + 32,
                String(index + 1),
                12,
                active ? '#a73b32' : '#6a7a9a'
            );
        }

        d.text(
            startX + (count + 1) * letterWidth,
            y,
            'l',
            28,
            '#bd8e25'
        );

        d.button(
            startX + total + 10,
            y + 2,
            'Next',
            () => {
                this.resultPage = page + 1;
                this.refresh();
            },
            page < count - 1
        );
    }

    drawNoResults(area) {
        const d = this.ui.drawing;
        const x = area.x + 50;
        const y = area.y + 100;

        if (!this.art('search_owl_lost', x, y, 150, 150)) {
            this.drawOwl(x + 75, y + 72, 1.4, 'lost');
        }

        const textX = x + 200;
        const textWidth = area.w - textX + area.x - 50;
        const labels = this.termLabels(this.submitted).join(' + ');
        const seed = hash(signature(this.submitted));

        d.text(
            textX,
            y + 4,
            `Nothing found for "${labels}".`,
            22,
            '#434b47',
            textWidth
        );

        const lines = [
            'Suggestions:',
            '- Check that you are searching for the right clue.',
            this.submitted.length > 1
                ? '- Try fewer clues.'
                : '- Try two clues together.',
            '- Your Field Notes are there for a reason.',
            `- ${pick(NO_RESULT_JOKES, seed)}`
        ];

        d.text(
            textX,
            y + 62,
            lines.join('\n'),
            16,
            '#5b625c',
            textWidth
        ).setLineSpacing(9);
    }

    drawPage(page, area) {
        const drawing = this.ui.drawing;
        const theme = THEMES[page.theme] || DEFAULT_THEME;

        drawing.rectangle(
            area.x,
            area.y,
            area.w,
            52,
            theme.bg
        );

        this.favicon(area.x + 14, area.y + 11, 30, page);

        const masthead = drawing.text(
            area.x + 56,
            area.y + 15,
            page.brand || page.title,
            25,
            theme.fg
        );

        drawing.fit(masthead, masthead.text, area.w - 76);

        let linkX = area.x + 20;

        for (const link of page.links || []) {
            const text = drawing.text(
                linkX,
                area.y + 64,
                link.label,
                14,
                '#315279'
            );

            text
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.openPage(link.pageId));

            linkX += text.width + 24;
        }

        let start = area.y + 96;

        if (
            page.imageKey &&
            this.ui.scene.textures.exists(page.imageKey)
        ) {
            drawing.add(
                this.ui.scene.add.image(
                    area.x + area.w - 125,
                    start + 43,
                    page.imageKey
                ).setDisplaySize(200, 86)
            );

            start += 100;
        }

        const title = drawing.text(
            area.x + 22,
            start,
            page.heading || page.title,
            21,
            '#303f3a'
        );

        drawing.fit(title, title.text, area.w - 44);

        const available = Math.max(
            30,
            area.y + area.h - 45 - (start + 38)
        );

        const layouts = this.paginate(
            page.blocks,
            area.w - 44,
            available
        );

        this.bodyPage = Math.min(
            this.bodyPage,
            layouts.length - 1
        );

        for (const item of layouts[this.bodyPage] || []) {
            const text = drawing.text(
                area.x + 22 + item.x,
                start + 38 + item.y,
                item.text,
                16,
                item.keywordId ? '#ffe56c' : '#3b423c'
            );

            if (item.keywordId) {
                const highlight = drawing.rectangle(
                    text.x - 1,
                    text.y,
                    text.width + 2,
                    22,
                    this.progress.known.includes(item.keywordId)
                        ? 0x596150
                        : 0x344841
                );

                this.ui.content.moveBelow(highlight, text);

                text
                    .setInteractive({ useHandCursor: true })
                    .on(
                        'pointerdown',
                        () => this.collect(item.keywordId)
                    );
            }
        }

        if (layouts.length > 1) {
            this.pager(
                area.x + 22,
                area.y + area.h - 34,
                area.w - 44,
                this.bodyPage,
                layouts.length,
                index => {
                    this.bodyPage = index;
                    this.refresh();
                }
            );
        }
    }

    pager(x, y, width, page, count, change) {
        const drawing = this.ui.drawing;

        drawing.button(
            x,
            y,
            '<',
            () => change(page - 1),
            page > 0
        );

        drawing.text(
            x + 55,
            y + 9,
            `${page + 1} / ${count}`,
            13,
            '#657061'
        );

        drawing.button(
            x + width - 40,
            y,
            '>',
            () => change(page + 1),
            page < count - 1
        );
    }

    renderNotebook() {
        if (!this.data) return;

        const ui = this.ui;
        const { width, height } = ui.scene.scale;
        const wide = width >= 1000;

        const paperWidth = wide
            ? Math.min(310, width * 0.27)
            : Math.min(340, width - 24);

        if (wide) {
            const available = width - paperWidth - 30;

            const scale = Math.max(
                0.01,
                Math.min(
                    (available - 12) / 1120,
                    (height - 16) / 800
                )
            );

            ui.content
                .setScale(scale)
                .setPosition(
                    (available - 1120 * scale) / 2,
                    (height - 800 * scale) / 2
                );
        }

        if (!wide) {
            const button = ui.scene.add.text(
                width - 112,
                12,
                this.notesOpen ? 'Close notes' : 'Notes',
                {
                    fontFamily: 'SpecialElite, monospace',
                    fontSize: '15px',
                    color: '#fff1c6',
                    backgroundColor: '#374540',
                    padding: { x: 8, y: 8 }
                }
            ).setInteractive({ useHandCursor: true });

            ui.root.add(button);

            button.on('pointerdown', () => {
                this.notesOpen = !this.notesOpen;
                this.refresh();
            });
        }

        if (!wide && !this.notesOpen) return;

        const paperHeight = Math.min(height - 72, 620);
        const paperX = width - paperWidth - 14;
        const paperY = Math.max(52, (height - paperHeight) / 2);

        const root = ui.scene.add.container(paperX, paperY);
        ui.root.add(root);

        const rectangle = (
            x,
            y,
            w,
            h,
            color,
            alpha = 1
        ) => {
            const object = ui.scene.add.rectangle(
                x,
                y,
                w,
                h,
                color,
                alpha
            ).setOrigin(0);

            root.add(object);

            return object;
        };

        const text = (
            x,
            y,
            value,
            size = 16,
            color = '#3d4034'
        ) => {
            const object = ui.scene.add.text(
                x,
                y,
                value,
                {
                    fontFamily: 'SpecialElite, monospace',
                    fontSize: `${size}px`,
                    color
                }
            );

            root.add(object);

            return object;
        };

        rectangle(
            5,
            7,
            paperWidth,
            paperHeight,
            0,
            0.3
        );

        rectangle(
            0,
            0,
            paperWidth,
            paperHeight,
            0xeee3b8
        ).setInteractive();

        rectangle(
            34,
            12,
            1,
            paperHeight - 24,
            0xbc7466,
            0.55
        );

        for (let y = 65; y < paperHeight - 32; y += 25) {
            rectangle(
                12,
                y,
                paperWidth - 24,
                1,
                0x9baf9a,
                0.35
            );
        }

        for (let y = 30; y < paperHeight - 20; y += 48) {
            root.add(
                ui.scene.add.circle(
                    12,
                    y,
                    4,
                    0x6b6a56,
                    0.7
                )
            );
        }

        text(46, 20, 'FIELD NOTES', 19);

        if (this.data.cases.length > 1) {
            text(46, 43, this.definition.title, 12)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    const nextIndex =
                        (
                            this.data.cases.indexOf(this.definition) + 1
                        ) % this.data.cases.length;

                    this.selectCase(this.data.cases[nextIndex].id);
                });
        }

        const lines = [];
        let line = 0;

        const keywords = this.definition.keywords.filter(
            keyword => this.progress.known.includes(keyword.id)
        );

        for (const keyword of keywords) {
            const maxCharacters = Math.max(
                10,
                Math.floor((paperWidth - 65) / 9)
            );

            let label = '';
            const wrapped = [];

            for (const word of keyword.label.split(' ')) {
                if (
                    label &&
                    (label + ' ' + word).length > maxCharacters
                ) {
                    wrapped.push(label);
                    label = word;
                } else {
                    label = label ? label + ' ' + word : word;
                }
            }

            if (label) {
                wrapped.push(label);
            }

            for (const part of wrapped) {
                lines.push({
                    label: part,
                    id: keyword.id,
                    line: line++
                });
            }
        }

        const rows = Math.max(
            1,
            Math.floor((paperHeight - 116) / 25)
        );

        const pages = Math.max(
            1,
            Math.ceil(line / rows)
        );

        this.notePage = Math.min(
            this.notePage,
            pages - 1
        );

        for (const item of lines.filter(
            entry => Math.floor(entry.line / rows) === this.notePage
        )) {
            text(
                46,
                70 + (item.line % rows) * 25,
                item.label,
                16,
                this.terms.includes(item.id)
                    ? '#a14d35'
                    : '#384b43'
            )
                .setInteractive({ useHandCursor: true })
                .on(
                    'pointerdown',
                    () => this.selectKeyword(item.id)
                );
        }

        if (pages > 1) {
            text(46, paperHeight - 31, '<', 18)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.notePage =
                        (this.notePage + pages - 1) % pages;

                    this.refresh();
                });

            text(
                paperWidth / 2 - 15,
                paperHeight - 28,
                `${this.notePage + 1}/${pages}`,
                13
            );

            text(
                paperWidth - 38,
                paperHeight - 31,
                '>',
                18
            )
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.notePage =
                        (this.notePage + 1) % pages;

                    this.refresh();
                });
        }
    }

    paginate(blocks, width, height) {
        const probe = this.ui.scene.add.text(
            0,
            0,
            '',
            {
                fontFamily: 'SpecialElite, "Special Elite", monospace',
                fontSize: '16px'
            }
        ).setVisible(false);

        const measure = value => {
            probe.setText(value);
            return probe.width;
        };

        const pages = [[]];
        let x = 0;
        let y = 0;

        const nextLine = () => {
            x = 0;
            y += 25;

            if (y + 22 > height) {
                pages.push([]);
                y = 0;
            }
        };

        try {
            for (const block of blocks) {
                for (const part of block) {
                    const id = typeof part === 'object'
                        ? part.keywordId
                        : null;

                    const value = id
                        ? (
                            part.text ||
                            this.definition.keywords.find(
                                keyword => keyword.id === id
                            ).label
                        )
                        : part;

                    for (const token of value
                        .split(/(\s+)/)
                        .filter(Boolean)) {
                        if (/^\s+$/.test(token)) {
                            if (x) {
                                x += measure(' ');
                            }

                            continue;
                        }

                        const emit = chunk => {
                            const textWidth = measure(chunk);

                            if (x && x + textWidth > width) {
                                nextLine();
                            }

                            pages[pages.length - 1].push({
                                text: chunk,
                                keywordId: id,
                                x,
                                y
                            });

                            x += textWidth;
                        };

                        let word = '';

                        for (const character of token) {
                            if (
                                word &&
                                measure(word + character) > width
                            ) {
                                emit(word);
                                nextLine();
                                word = '';
                            }

                            word += character;
                        }

                        if (word) {
                            emit(word);
                        }
                    }
                }

                nextLine();

                if (y) {
                    nextLine();
                }
            }
        } finally {
            probe.destroy();
        }

        if (
            pages.length > 1 &&
            !pages[pages.length - 1].length
        ) {
            pages.pop();
        }

        return pages;
    }

    destroy() {
        this.dead = true;
        this.controller?.abort();

        for (const image of this.images) {
            image.onload = null;
            image.onerror = null;
        }

        this.images = [];
    }
}