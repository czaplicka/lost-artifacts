import {
    STATE_KEY,
    clone,
    safeId,
    signature,
    getSearchProgress,
    discoverSearchKeywords,
    validateSearchData,
    resolveSearchResults,
    resolveSearch,
    ART_BASE,
    ART_FILES,
    FAILED_ART,
    VISITED,
    THEMES,
    DEFAULT_THEME,
    CLOUD_COLORS,
    BRAND,
    ITEM_HEIGHT,
    TAGLINES,
    HOOTY_LINES,
    ADS,
    AD_CLICKS,
    NO_RESULT_JOKES,
    ABOUT_TIP,
    PRIVACY_TIP,
    slug,
    hash,
    pick,
    titleCase,
    gameState,
    requestAutosave,
    FONTS,
    lerpColor,
    seeded
} from './ComputerSearchShared.js';

import { ComputerSearchAssets } from './ComputerSearchAssets.js';
import { ComputerSearchState } from './ComputerSearchState.js';
import { ComputerSearchWidgets } from './ComputerSearchWidgets.js';
import { ComputerSearchPages } from './ComputerSearchPages.js';
import { ComputerSearchNotebook } from './ComputerSearchNotebook.js';
import { ComputerSearchHome } from './ComputerSearchHome.js';
import { ComputerSearchResults } from './ComputerSearchResults.js';

export { getSearchProgress, discoverSearchKeywords, validateSearchData, resolveSearchResults, resolveSearch } from './ComputerSearchShared.js';

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

for (const module of [
    ComputerSearchAssets,
    ComputerSearchState,
    ComputerSearchWidgets,
    ComputerSearchPages,
    ComputerSearchNotebook,
    ComputerSearchHome,
    ComputerSearchResults
]) {
    const descriptors = Object.getOwnPropertyDescriptors(module.prototype);
    delete descriptors.constructor;
    Object.defineProperties(ComputerSearch.prototype, descriptors);
}
