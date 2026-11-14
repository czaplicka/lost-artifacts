import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { audioManager } from '../../managers/AudioManager.js';

export const WantedDatabaseNavigation = {
    createNavigation(W, H) {
        const th = this.th, navY = H - 104;
        this.makeRect(24, navY, W - 48, 46, th.panel, 0.92, 0.6);
        this.prevButton = this.makeButton(44, navY + 7, 140, 32, __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_86af811671fe29fad1d2"), () => this.prevPage());
        this.marksText = this.makeText(210, navY + 23, '', 11, { color: th.sMid }).setOrigin(0, 0.5);
        this.pageText = this.makeText(W / 2, navY + 23, '', 16, { shadow: this.glow(th.sMain, 6) }).setOrigin(0.5);
        this.nextButton = this.makeButton(W - 44 - 140, navY + 7, 140, 32, __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_58b85f2ea88bf1a9ba16"), () => this.nextPage());
        this.updateNavButtons(); this.updateMarksText();
    },
    updateMarksText() {
        if (!this.isWantedTextAlive(this.marksText)) return;
        let flag = 0, clear = 0;
        for (const suspect of this.suspects) {
            const status = this.getStatus(suspect);
            if (status === 'flag') flag++;
            else if (status === 'clear') clear++;
        }
        const open = Math.max(0, this.suspects.length - flag - clear);
        this.marksText.setText(`${__dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_0f5f1c42c7eba7ef6a75")}${flag}${__dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_a6b05dfeb45ffdda42c9")}${clear}${__dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_d8a8092d3570c9db6f20")}${open}`);
    },
    totalPages() { return Math.max(1, Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE)); },
    updateNavButtons() {
        const totalPages = this.totalPages();
        if (this.isWantedTextAlive(this.pageText)) this.pageText.setText(`${__dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_f8119b8ecd8507346fa7")}${this.currentPage + 1}${__dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_005e1574a2b5c8163046")}${totalPages}`);
        const canPrev = !this.isPaging && this.currentPage > 0;
        const canNext = !this.isPaging && this.currentPage < totalPages - 1;
        this.prevButton?.container.setAlpha(canPrev ? 1 : 0.3);
        this.nextButton?.container.setAlpha(canNext ? 1 : 0.3);
    },
    prevPage() {
        if (this.isPaging || this.browseLocked() || this.currentPage <= 0) return;
        this.sfx('pagesound'); this.currentPage--; this.refreshPage();
    },
    nextPage() {
        if (this.isPaging || this.browseLocked()) return;
        if (this.currentPage >= this.totalPages() - 1) return;
        this.sfx('pagesound'); this.currentPage++; this.refreshPage();
    },
    playSearchKeySound() {
        if (!this.session?.active || this.isClosing || this.booting || this._cleanupDone || !this.sys.isActive()) return;
        if (!this.cache.audio.exists('sfx_wanted_search_key')) return;
        try {
            audioManager.init(this);
            audioManager.playSfx('sfx_wanted_search_key', { volume: audioManager.getSfxVolume() * 0.2 });
        } catch (error) { console.debug('[WantedDatabaseScene] Search sound unavailable:', error); }
    },
    onKeyDown(event) {
        if (!this.session?.active || this.isClosing) return;
        if (this.booting) { this.endBoot(); return; }
        const key = event?.key;
        if (typeof key !== 'string') return;
        const command = action => this.runWantedButtonAction(action);
        if (key === '?') { command(() => this.toggleHelp()); return; }
        if (this.helpPanel?.visible) { command(() => this.toggleHelp(false)); return; }
        if (this.detailPanel?.visible) {
            switch (key) {
                case __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_037c968467aa3fd7c059"): command(() => this.closeDetailPanel()); break;
                case 'ArrowLeft': command(() => this.stepDetail(-1)); break;
                case 'ArrowRight': command(() => this.stepDetail(1)); break;
                case 'f': case 'F':
                    if (this.selectedCard) command(() => this.setStatus(this.selectedCard, 'flag'));
                    break;
                case 'c': case 'C':
                    if (this.selectedCard) command(() => this.setStatus(this.selectedCard, 'clear'));
                    break;
                default: break;
            }
            return;
        }
        switch (key) {
            case __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_037c968467aa3fd7c059"):
                if (this.searchQuery) {
                    this.searchQuery = ''; this.playSearchKeySound(); this.onSearchChanged();
                } else command(() => this.closeAndReturnToOffice());
                return;
            case __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_292fffe328d07afdaba6"):
                if (this.searchQuery) {
                    this.searchQuery = this.searchQuery.slice(0, -1); this.playSearchKeySound(); this.onSearchChanged();
                }
                return;
            case __dialogueText("scenes/wanted-database/WantedDatabaseNavigation.js", "t_90ddf1963abb36c9921c"): command(() => this.cycleGender()); return;
            case 'ArrowUp': command(() => this.cycleSort()); return;
            case 'ArrowDown': command(() => this.cycleStatus()); return;
            case 'ArrowLeft': command(() => this.prevPage()); return;
            case 'ArrowRight': command(() => this.nextPage()); return;
            default: break;
        }
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && /[a-z0-9 '\-.]/i.test(key)) {
            if (key === ' ' && (!this.searchQuery || this.searchQuery.endsWith(' '))) return;
            if (this.searchQuery.length >= this.searchMax) return;
            this.searchQuery += key; this.playSearchKeySound(); this.onSearchChanged();
        }
    }
};
