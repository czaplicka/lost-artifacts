import { SORT_MODES } from './WantedDatabaseConfig.js';
import { EventBus } from '../../EventBus.js';

export const WantedDatabaseData = {
    resolveSuspects() {
        for (const key of ['suspects', 'suspectData']) {
            const data = this.cache.json.get(key);

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.suspects)
                    ? data.suspects
                    : null;

            if (list && list.length && list.every((s) => s && s.name)) {
                return list;
            }
        }

        return [];
    },

    loadSuspectsFallback() {
        const session = this.session;
        const key = '__wdb_suspects_json';

        this.fallbackJsonKey = key;
        this.updateCounter();
        this.refreshPage();

        this._fallbackComplete = () => {
            if (!session.active || this.session !== session) return;

            const data = this.cache.json.get(key);

            if (Array.isArray(data)) {
                this.suspects = data.map((s, i) => ({ ...s, __i: i }));
                this.applyFilters();
                this.refreshPage();
            }
        };
        this.load.once(`filecomplete-json-${key}`, this._fallbackComplete);

        this.load.json(key, 'assets/data/suspects.json');

        if (!this.load.isLoading()) {
            this.load.start();
        }
    },

    caseKey() {
        const gs = this.gameState || {};
        const mission = gs.currentMission || {};

        return String(
            gs.currentCaseId ?? mission.id ?? mission.missionId ?? 'none'
        );
    },

    readMarks() {
        const wd = this.gameState?.wantedDatabase;

        if (
            wd &&
            typeof wd === 'object' &&
            wd.caseId === this.caseKey() &&
            wd.marks &&
            typeof wd.marks === 'object'
        ) {
            return { ...wd.marks };
        }

        return {};
    },

    writeMarks() {
        const gs = this.gameState;

        if (!gs) return;

        const next = {
            caseId: this.caseKey(),
            marks: { ...this.marks }
        };

        try {
            if (typeof gs.updateState === 'function') {
                gs.updateState({ wantedDatabase: next });
            } else {
                gs.wantedDatabase = next;
            }
        } catch (error) {
            console.warn('[WantedDatabaseScene] Could not save marks:', error);
        }
    },

    statusKey(suspect) {
        return String(suspect.id ?? suspect.__i);
    },

    getStatus(suspect) {
        return this.marks[this.statusKey(suspect)] || null;
    },

    fileNumber(suspect) {
        return String(suspect.wantedKey || 0).padStart(3, '0');
    },

    setStatus(suspect, status) {
        const key = this.statusKey(suspect);

        if (this.marks[key] === status) {
            delete this.marks[key];
        } else {
            this.marks[key] = status;
        }

        this.writeMarks();

        EventBus.emit('suspectStatusChanged', {
            id: suspect.id,
            status: this.marks[key] || null
        });

        for (const card of this.cards) {
            if (card.suspect === suspect) card.setBadge();
        }

        this.updateDetailStatus(suspect);
        this.updateMarksText();

        if (this.filterStatus !== 'all') {
            this.listDirty = true;
        }
    },

    applyFilters() {
        const tokens = String(this.searchQuery || '')
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        const fields = [
            'name',
            'skills',
            'accent',
            'race',
            'hair',
            'eyes',
            'features',
            'habitus',
            'id'
        ];

        const list = this.suspects.filter((suspect) => {
            if (
                this.filterGender !== 'all' &&
                suspect.gender_code !== this.filterGender
            ) {
                return false;
            }

            const status = this.getStatus(suspect);

            if (this.filterStatus === 'flag' && status !== 'flag') return false;
            if (this.filterStatus === 'clear' && status !== 'clear') return false;
            if (this.filterStatus === 'none' && status) return false;

            if (tokens.length) {
                const hay =
                    fields.map((f) => String(suspect[f] || '')).join(' ') +
                    ` #${this.fileNumber(suspect)}`;

                const lower = hay.toLowerCase();

                if (!tokens.every((t) => lower.includes(t))) return false;
            }

            return true;
        });

        const mode = SORT_MODES[this.sortIndex]?.key || 'file';

        list.sort((a, b) => {
            if (mode === 'az' || mode === 'za') {
                const cmp = String(a.name || '').localeCompare(
                    String(b.name || '')
                );

                return mode === 'az' ? cmp : -cmp;
            }

            return (
                (Number(a.wantedKey) || 0) - (Number(b.wantedKey) || 0) ||
                a.__i - b.__i
            );
        });

        this.filteredSuspects = list;

        this.currentPage = Phaser.Math.Clamp(
            this.currentPage,
            0,
            this.totalPages() - 1
        );

        this.updateCounter();
        this.updateMarksText();
    }
};
