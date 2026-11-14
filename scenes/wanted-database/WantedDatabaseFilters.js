import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { LS_THEME, LS_PHOTO, THEME_DEFS, lsSet, GENDER_FILTERS, STATUS_FILTERS, SORT_MODES } from './WantedDatabaseConfig.js';

export const WantedDatabaseFilters = {
    createFilterPanel(W) {
        const th = this.th;

        const panelX = 24;
        const panelY = 106;
        const panelW = W - 48;
        const panelH = 94;

        this.makeRect(panelX, panelY, panelW, panelH, th.panel, 0.92, 0.7);

        /* ---------- row 1: search ---------- */

        const r1 = panelY + 10;

        this.makeText(44, r1 + 16, 'QUERY>', 14, {
            color: th.sMid
        }).setOrigin(0, 0.5);

        const boxX = 148;
        const boxW = Math.min(640, Math.floor(W * 0.42));

        this.searchMax = Math.max(8, Math.floor((boxW - 40) / 14));

        this.makeRect(boxX, r1, boxW, 32, 0x000000, 0.6, 0.7);

        this.searchPlaceholder = this.makeText(
            boxX + 30,
            r1 + 16,
            __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_5d8e277b245891630991"),
            10,
            { color: th.sDim }
        ).setOrigin(0, 0.5);

        this.searchText = this.makeText(boxX + 12, r1 + 16, '', 14, {
            shadow: this.glow(th.sMain, 6)
        }).setOrigin(0, 0.5);

        this.cursorOn = true;

        this.cursorTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.cursorOn = !this.cursorOn;
                this.updateSearchText();
            }
        });

        this.updateSearchText();

        this.helpButton = this.makeButton(
            boxX + boxW + 16,
            r1,
            130,
            32,
            __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_42ec4f2e10ade75dbec3"),
            () => this.toggleHelp(),
            11
        );

        this.counterText = this.makeText(W - 44, r1 + 16, '', 14).setOrigin(
            1,
            0.5
        );

        this.updateCounter();

        /* ---------- row 2: filters ---------- */

        const r2 = panelY + 52;

        const statusLabels = STATUS_FILTERS.map((s) => `${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_b38c2113d660280ef051")}${s.label}`);
        const sortLabels = SORT_MODES.map((s) => `${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_22b7180f9ba4d22e2c96")}${s.label}`);
        const imgLabels = [__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_d56b890698b7114b5c0d"), __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_463873d892160c135666")];
        const themeLabels = Object.values(THEME_DEFS).map(
            (t) => `${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_001cf2b5e975c9fa02e1")}${t.label}`
        );

        const maxLen = (arr) => Math.max(...arr.map((s) => s.length));

        const lens = [
            ...GENDER_FILTERS.map((g) => g.label.length),
            maxLen(statusLabels),
            maxLen(sortLabels),
            maxLen(imgLabels),
            maxLen(themeLabels)
        ];

        const labelText = 'GENDER';
        const gap = 10;
        const avail = panelW - 40;

        let size = 8;

        for (const s of [12, 11, 10, 9, 8]) {
            const total =
                labelText.length * s +
                14 +
                lens.reduce((a, n) => a + n * s + 24, 0) +
                gap * lens.length +
                16;

            if (total <= avail) {
                size = s;
                break;
            }
        }

        const widthOf = (chars) => chars * size + 24;

        let x = 44;

        this.makeText(x, r2 + 16, labelText, size, {
            color: th.sMid
        }).setOrigin(0, 0.5);

        x += labelText.length * size + 14;

        this.genderButtons = [];

        for (const filter of GENDER_FILTERS) {
            const w = widthOf(filter.label.length);

            const btn = this.makeButton(
                x,
                r2,
                w,
                32,
                filter.label,
                () => {
                    if (this.browseLocked()) return;

                    this.filterGender = filter.value;
                    this.afterFilterChange();
                },
                size
            );

            btn.value = filter.value;
            this.genderButtons.push(btn);

            x += w + gap;
        }

        x += 16;

        const statusW = widthOf(maxLen(statusLabels));

        this.statusButton = this.makeButton(
            x,
            r2,
            statusW,
            32,
            statusLabels[0],
            () => this.cycleStatus(),
            size
        );

        x += statusW + gap;

        const sortW = widthOf(maxLen(sortLabels));

        this.sortButton = this.makeButton(
            x,
            r2,
            sortW,
            32,
            sortLabels[0],
            () => this.cycleSort(),
            size
        );

        x += sortW + gap;

        const imgW = widthOf(maxLen(imgLabels));

        this.imgButton = this.makeButton(
            x,
            r2,
            imgW,
            32,
            imgLabels[0],
            () => this.togglePhotoFilter(),
            size
        );

        x += imgW + gap;

        const themeW = widthOf(maxLen(themeLabels));

        this.themeButton = this.makeButton(
            x,
            r2,
            themeW,
            32,
            themeLabels[0],
            () => this.switchTheme(),
            size
        );

        this.refreshFilterButtons();
    },

    browseLocked() {
        return (
            !this.session?.active ||
            this.isClosing ||
            this.booting ||
            this.detailPanel?.visible ||
            this.helpPanel?.visible
        );
    },

    refreshFilterButtons() {
        for (const btn of this.genderButtons) {
            btn.setActive(btn.value === this.filterGender);
        }

        const status =
            STATUS_FILTERS.find((s) => s.value === this.filterStatus) ||
            STATUS_FILTERS[0];

        this.statusButton.setLabel(`${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_b38c2113d660280ef051")}${status.label}`);
        this.statusButton.setActive(this.filterStatus !== 'all');

        this.sortButton.setLabel(`${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_22b7180f9ba4d22e2c96")}${SORT_MODES[this.sortIndex].label}`);

        this.imgButton.setLabel(
            this.photoFilterOn ? __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_d56b890698b7114b5c0d") : __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_463873d892160c135666")
        );

        this.imgButton.setActive(this.photoFilterOn);

        this.themeButton.setLabel(
            `${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_001cf2b5e975c9fa02e1")}${this.th.key === 'green' ? 'GREEN' : 'AMBER'}`
        );
    },

    afterFilterChange() {
        this.currentPage = 0;
        this.applyFilters();
        this.refreshFilterButtons();
        this.refreshPage();
    },

    cycleGender() {
        const i = GENDER_FILTERS.findIndex((g) => g.value === this.filterGender);

        this.filterGender =
            GENDER_FILTERS[(i + 1) % GENDER_FILTERS.length].value;

        this.afterFilterChange();
    },

    cycleStatus() {
        if (this.browseLocked()) return;

        const i = STATUS_FILTERS.findIndex((s) => s.value === this.filterStatus);

        this.filterStatus =
            STATUS_FILTERS[(i + 1) % STATUS_FILTERS.length].value;

        this.afterFilterChange();
    },

    cycleSort() {
        if (this.browseLocked()) return;

        this.sortIndex = (this.sortIndex + 1) % SORT_MODES.length;
        this.afterFilterChange();
    },

    togglePhotoFilter() {
        this.photoFilterOn = !this.photoFilterOn;

        this.registry.set('wantedDbPhotoFilter', this.photoFilterOn);
        lsSet(LS_PHOTO, String(this.photoFilterOn));

        for (const entry of this.photoEntries) {
            this.applyPhotoMode(entry);
        }

        if (this.detailPhotoEntry) {
            this.applyPhotoMode(this.detailPhotoEntry);
        }

        this.refreshFilterButtons();
    },

    snapshotUi() {
        return {
            page: this.currentPage,
            search: this.searchQuery,
            gender: this.filterGender,
            status: this.filterStatus,
            sort: this.sortIndex
        };
    },

    switchTheme() {
        if (this.browseLocked()) return;

        const next = this.themeKey === 'green' ? 'amber' : 'green';

        this.registry.set('wantedDbTheme', next);
        lsSet(LS_THEME, next);

        this.scene.restart({
            gameState: this.gameState,
            returnScene: this.returnSceneKey,
            skipBoot: true,
            ui: this.snapshotUi()
        });
    },

    updateSearchText() {
        if (!this.isWantedTextAlive(this.searchText)) return;

        const empty = this.searchQuery.length === 0;

        this.searchPlaceholder?.setVisible(empty);

        this.searchText.setText(
            this.searchQuery + (this.cursorOn ? __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_d2e2adf7177b7a8afddb") : __dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_36a9e7f1c95b82ffb997"))
        );
    },

    updateCounter() {
        if (!this.isWantedTextAlive(this.counterText)) return;
        this.counterText.setText(
            `${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_3c685c915bc39ffc8fe4")}${this.filteredSuspects.length}${__dialogueText("scenes/wanted-database/WantedDatabaseFilters.js", "t_8a5edab282632443219e")}${this.suspects.length}`
        );
    },

    onSearchChanged() {
        this.updateSearchText();

        this.searchDebounce?.remove();

        this.searchDebounce = this.time.delayedCall(140, () => {
            if (!this.session?.active) return;

            this.currentPage = 0;
            this.applyFilters();
            this.refreshPage();
        });
    }
};
