import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { strHash, DETAIL_FIELDS, MARGIN_NOTES } from './WantedDatabaseConfig.js';

export const WantedDatabaseDetails = {
    drawBarcode(seed) {
        const g = this.barcodeGfx;

        g.clear();
        g.fillStyle(this.th.main, 0.9);

        let h = strHash(seed) || 1;
        let x = 8;

        while (x < 372) {
            h = (Math.imul(h, 1664525) + 1013904223) >>> 0;

            const w = 1 + ((h >>> 8) % 4);
            const gap = 1 + ((h >>> 16) % 3);

            if ((h >>> 4) % 5 !== 0) {
                g.fillRect(35 + x, 570, w, 32);
            }

            x += w + gap;
        }
    },

    clearSkillChips() {
        for (const item of this.skillChips || []) {
            const object = item.container ?? item;
            if (object?.scene) object.destroy?.(true);
        }
        this.skillChips = [];
    },

    buildSkillChips(skillsText) {
        this.clearSkillChips();

        const list = String(skillsText || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 8);

        const sb = this.skillsBox;

        if (list.length === 0) {
            const none = this.makeType(sb.x + 14, sb.y + 40, 'NONE', 18);

            this.detailContent.add(none);
            this.skillChips.push(none);
            return;
        }

        const size = 10;
        const h = 26;
        const maxW = sb.w - 28;

        let cx = 0;
        let cy = 0;

        for (const skill of list) {
            const w = skill.length * size + 22;

            if (cx + w > maxW) {
                cx = 0;
                cy += h + 6;
            }

            if (cy > h + 6) break;

            const btn = this.makeButton(
                sb.x + 14 + cx,
                sb.y + 36 + cy,
                w,
                h,
                skill.toUpperCase(),
                () => this.searchBySkill(skill),
                size
            );

            this.detailContent.add(btn.container);
            this.skillChips.push(btn);

            cx += w + 8;
        }
    },

    searchBySkill(skill) {
        if (!this.session?.active) return;

        this.hideDetailPanel();

        this.searchQuery = String(skill).toLowerCase().slice(0, this.searchMax);
        this.updateSearchText();

        this.searchDebounce?.remove();

        this.currentPage = 0;
        this.applyFilters();
        this.refreshPage();
    },

    setDetailPhotoState(visible) {
        this.detailScan?.setVisible(visible);

        if (!visible && this.detailPhotoEntry) {
            this.clearEntry(this.detailPhotoEntry);
        }
    },

    stopTypeTweens() {
        for (const tw of this.typeTweens) {
            tw?.stop?.();
        }

        this.typeTweens = [];
    },

    typeInto(obj, full, delay = 0) {
        const text = String(full);
        const state = { n: 0 };

        obj.setText('');

        const tw = this.tweens.add({
            targets: state,
            n: text.length,
            delay,
            duration: Math.max(80, Math.min(500, text.length * 14)),
            ease: 'Linear',
            onUpdate: () => {
                if (obj.active) obj.setText(text.slice(0, Math.floor(state.n)));
            },
            onComplete: () => {
                if (obj.active) obj.setText(text);
            }
        });

        this.typeTweens.push(tw);
    },

    fitText(obj, full, maxH, sizes) {
        for (const size of sizes) {
            obj.setFontSize(size);
            obj.setText(full);

            if (obj.height <= maxH) break;
        }
    },

    layoutDetailFields(values) {
        let size = 20;

        for (;;) {
            let yPos = this.detailStatsTop;

            for (const field of DETAIL_FIELDS) {
                const text = this.detailFields[field];

                text.setFontSize(size);
                text.setText(values[field]);

                text.setY(yPos);
                this.detailLabels[field].setY(yPos + 5);

                yPos += Math.max(text.height, size * 1.3) + 10;
            }

            if (yPos <= this.detailStatsBottom || size <= 14) break;

            size -= 2;
        }
    },

    updateDetailStatus(suspect) {
        if (!suspect || !this.detailStatusText) return;

        const th = this.th;
        const status = this.getStatus(suspect);

        this.paintStamp(this.detailStamp, status);

        if (status === 'flag') {
            this.detailStatusText
                .setText(__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_234d78bc26f96045ea04"))
                .setColor(th.sAlert);
        } else if (status === 'clear') {
            this.detailStatusText
                .setText(__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_e80ab7640d97123cb860"))
                .setColor(th.sMid);
        } else {
            this.detailStatusText.setText(__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_7640d5c1e7dcffcb1840")).setColor(th.sDim);
        }

        this.flagButton.setLabel(
            status === 'flag' ? __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_ea59ca18a28d250b8ca5") : __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_08974557c5b9962a0deb")
        );
        this.flagButton.setActive(status === 'flag');

        this.clearButton.setLabel(
            status === 'clear' ? __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_2fe489e01af5748b3766") : __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_a042dd802d857cf493ec")
        );
        this.clearButton.setActive(status === 'clear');
    },

    async showDetailPanel(suspect) {
        const startedSession = this.session;
        try {
            if (!this.session?.active || this.isClosing) return;

            const session = this.session;
            const token = ++this.detailToken;

            this.selectedCard = suspect;
            this.detailIndex = this.filteredSuspects.indexOf(suspect);

            this.stopTypeTweens();

            this.detailRecText.setText(
                `${__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_93c6bf47126b4bd144c7")}${String(this.detailIndex + 1).padStart(2, __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_5feceb66ffc86f38d952"))}${__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_8a5edab282632443219e")}${String(
                    this.filteredSuspects.length
                ).padStart(2, __dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_5feceb66ffc86f38d952"))}`
            );

            this.detailCaseNum.setText(
                `${__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_7e9aee7d8c728ed3ed9b")}${this.fileNumber(suspect)}${__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_4c708b1a94f9a2655f80")}${String(
                    suspect.id || ''
                ).toUpperCase()}`
            );

            this.drawBarcode(`${suspect.id}${suspect.name}`);
            this.updateDetailStatus(suspect);

            const values = {};

            for (const field of DETAIL_FIELDS) {
                values[field] = String(suspect[field] || 'UNKNOWN');
            }

            this.layoutDetailFields(values);

            const name = String(suspect.name || '').toUpperCase();
            const habitus = String(suspect.habitus || 'NONE');
            const note =
                MARGIN_NOTES[
                    strHash(suspect.id ?? suspect.name) % MARGIN_NOTES.length
                ];

            this.fitText(this.detailHabitus, habitus, 58, [18, 16, 14, 12]);
            this.fitText(this.detailNote, note, 46, [16, 14, 12]);

            this.buildSkillChips(suspect.skills);

            this.typeInto(this.detailName, name, 0);

            DETAIL_FIELDS.forEach((field, i) => {
                this.typeInto(this.detailFields[field], values[field], 60 + i * 70);
            });

            this.typeInto(this.detailHabitus, habitus, 640);
            this.typeInto(this.detailNote, note, 760);

            this.setDetailPhotoState(false);

            this.detailPhotoStatus
                .setText(__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_0b3d2c0d56a59aaff632"))
                .setVisible(true);

            this.tweens.killTweensOf(this.detailPanel);

            this.detailPanel.setVisible(true).setAlpha(0);

            this.tweens.add({
                targets: this.detailPanel,
                alpha: 1,
                duration: 150,
                ease: 'Power2'
            });

            const key = await this.ensureSuspectTexture(suspect, 'portrait');

            if (
                !session.active ||
                this.session !== session ||
                token !== this.detailToken ||
                !this.detailPanel?.visible
            ) {
                return;
            }

            if (key && this.textures.exists(key)) {
                this.setEntryPhoto(this.detailPhotoEntry, key, 0.3, 2);

                this.detailScan.setVisible(this.detailPhotoEntry.loaded);
                this.detailPhotoStatus.setVisible(false);

                // efekt "wywoływania" zdjęcia
                const e = this.detailPhotoEntry;

                this.tweens.killTweensOf([e.raw, e.baked]);
                e.raw.setAlpha(0);
                e.baked.setAlpha(0);

                this.tweens.add({
                    targets: [e.raw, e.baked],
                    alpha: 1,
                    duration: 450,
                    ease: 'Quad.easeOut'
                });
            } else {
                this.detailPhotoStatus.setText(__dialogueText("scenes/wanted-database/WantedDatabaseDetails.js", "t_c7302f9918102965e896"));
            }
    
        } catch (error) {
            if (startedSession?.active && this.session === startedSession) {
                console.error('[WantedDatabaseScene] showDetailPanel failed:', error);
                this.hideDetailPanel();
            }
        }
    },

    stepDetail(dir) {
        const len = this.filteredSuspects.length;

        if (len < 2 || this.detailIndex < 0) return;

        const idx = (this.detailIndex + dir + len) % len;
        const page = Math.floor(idx / this.CARDS_PER_PAGE);

        if (page !== this.currentPage) {
            this.currentPage = page;
            this.listDirty = true;
        }

        this.showDetailPanel(this.filteredSuspects[idx]);
    },

    hideDetailPanel() {
        this.detailToken++;
        this.selectedCard = null;
        this.stopTypeTweens();

        if (!this.detailPanel?.scene) return;

        this.tweens.killTweensOf(this.detailPanel);
        this.detailPanel.setVisible(false).setAlpha(1);

        this.setDetailPhotoState(false);
    },

    closeDetailPanel() {
        if (!this.detailPanel?.visible) return;

        this.hideDetailPanel();

        if (this.listDirty && this.session?.active) {
            this.listDirty = false;
            this.applyFilters();
            this.refreshPage();
        }
    }
};
