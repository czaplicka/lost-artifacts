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

export class ComputerSearchState {
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
}
