

export const WantedDatabaseNavigation = {
    createNavigation(W, H) {
        const th = this.th;
        const navY = H - 104;

        this.makeRect(24, navY, W - 48, 46, th.panel, 0.92, 0.6);

        this.prevButton = this.makeButton(
            44,
            navY + 7,
            140,
            32,
            '< PREV',
            () => this.prevPage()
        );

        this.marksText = this.makeText(210, navY + 23, '', 11, {
            color: th.sMid
        }).setOrigin(0, 0.5);

        this.pageText = this.makeText(W / 2, navY + 23, '', 16, {
            shadow: this.glow(th.sMain, 6)
        }).setOrigin(0.5);

        this.nextButton = this.makeButton(
            W - 44 - 140,
            navY + 7,
            140,
            32,
            'NEXT >',
            () => this.nextPage()
        );

        this.updateNavButtons();
        this.updateMarksText();
    },

    updateMarksText() {
        if (!this.isWantedTextAlive(this.marksText)) return;

        let flag = 0;
        let clear = 0;

        for (const suspect of this.suspects) {
            const status = this.getStatus(suspect);

            if (status === 'flag') flag++;
            else if (status === 'clear') clear++;
        }

        const open = Math.max(0, this.suspects.length - flag - clear);

        this.marksText.setText(
            `FLAGGED ${flag}  CLEARED ${clear}  OPEN ${open}`
        );
    },

    totalPages() {
        return Math.max(
            1,
            Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE)
        );
    },

    updateNavButtons() {
        const totalPages = this.totalPages();

        if (this.isWantedTextAlive(this.pageText)) {
            this.pageText.setText(`PAGE ${this.currentPage + 1} / ${totalPages}`);
        }

        const canPrev = !this.isPaging && this.currentPage > 0;
        const canNext = !this.isPaging && this.currentPage < totalPages - 1;

        this.prevButton?.container.setAlpha(canPrev ? 1 : 0.3);
        this.nextButton?.container.setAlpha(canNext ? 1 : 0.3);
    },

    prevPage() {
        if (this.isPaging || this.browseLocked() || this.currentPage <= 0) {
            return;
        }

        this.sfx('pagesound');
        this.currentPage--;
        this.refreshPage();
    },

    nextPage() {
        if (this.isPaging || this.browseLocked()) return;

        if (this.currentPage >= this.totalPages() - 1) return;

        this.sfx('pagesound');
        this.currentPage++;
        this.refreshPage();
    },

    onKeyDown(event) {
        if (!this.session?.active || this.isClosing) return;

        if (this.booting) {
            this.endBoot();
            return;
        }

        const key = event?.key;
        if (typeof key !== 'string') return;

        if (key === '?') {
            this.toggleHelp();
            return;
        }

        if (this.helpPanel?.visible) {
            this.toggleHelp(false);
            return;
        }

        // ---- dossier open ----
        if (this.detailPanel?.visible) {
            switch (key) {
                case 'Escape':
                    this.closeDetailPanel();
                    break;
                case 'ArrowLeft':
                    this.stepDetail(-1);
                    break;
                case 'ArrowRight':
                    this.stepDetail(1);
                    break;
                case 'f':
                case 'F':
                    if (this.selectedCard) this.setStatus(this.selectedCard, 'flag');
                    break;
                case 'c':
                case 'C':
                    if (this.selectedCard) this.setStatus(this.selectedCard, 'clear');
                    break;
                default:
                    break;
            }

            return;
        }

        // ---- browsing ----
        switch (key) {
            case 'Escape':
                if (this.searchQuery) {
                    this.searchQuery = '';
                    this.onSearchChanged();
                } else {
                    this.closeAndReturnToOffice();
                }

                return;

            case 'Backspace':
                if (this.searchQuery) {
                    this.searchQuery = this.searchQuery.slice(0, -1);
                    this.onSearchChanged();
                }

                return;

            case 'Tab':
                this.cycleGender();
                return;

            case 'ArrowUp':
                this.cycleSort();
                return;

            case 'ArrowDown':
                this.cycleStatus();
                return;

            case 'ArrowLeft':
                this.prevPage();
                return;

            case 'ArrowRight':
                this.nextPage();
                return;

            default:
                break;
        }

        if (
            key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            /[a-z0-9 '\-.]/i.test(key)
        ) {
            if (key === ' ') {
                if (!this.searchQuery || this.searchQuery.endsWith(' ')) return;
            }

            if (this.searchQuery.length >= this.searchMax) return;

            this.searchQuery += key;
            this.onSearchChanged();
        }
    }
};
