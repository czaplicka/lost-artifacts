

export const WantedDatabaseCards = {
    createStamp(x, y, size, angle) {
        const th = this.th;

        const container = this.add
            .container(x, y)
            .setAngle(angle)
            .setVisible(false);

        const box = this.add
            .rectangle(0, 0, 10, 10, 0x000000, 0.55)
            .setStrokeStyle(3, th.alert, 1);

        const text = this.makeText(0, 0, '', size, {
            color: th.sAlert
        }).setOrigin(0.5);

        container.add([box, text]);

        return { container, box, text };
    },

    paintStamp(stamp, status) {
        if (!stamp) return;

        if (!status) {
            stamp.container.setVisible(false);
            return;
        }

        const th = this.th;
        const flagged = status === 'flag';
        const color = flagged ? th.alert : th.mid;

        stamp.text
            .setText(flagged ? 'FLAGGED' : 'CLEARED')
            .setColor(flagged ? th.sAlert : th.sMid);

        stamp.box
            .setSize(stamp.text.width + 24, stamp.text.height + 16)
            .setStrokeStyle(3, color, 1);

        stamp.container.setVisible(true);
    },

    clearCards() {
        for (const card of this.cards) {
            this.tweens.killTweensOf(card.container);
        }

        this.cardContainer?.removeAll(true);
        this.cards = [];
        this.photoEntries = [];
    },

    async refreshPage() {
        const startedSession = this.session;
        try {
            if (!this.session?.active) return;

            const session = this.session;
            const token = ++this.renderToken;

            this.isPaging = true;

            this.hideDetailPanel();
            this.listDirty = false;

            this.clearCards();
            this.updateNavButtons();

            const start = this.currentPage * this.CARDS_PER_PAGE;

            const pageSuspects = this.filteredSuspects.slice(
                start,
                start + this.CARDS_PER_PAGE
            );

            const loading = this.makeText(
                this.scale.width / 2,
                this.scale.height / 2,
                'LOADING RECORDS...',
                16
            ).setOrigin(0.5);

            this.tweens.add({
                targets: loading,
                alpha: 0.3,
                duration: 350,
                yoyo: true,
                repeat: -1
            });

            this.cardContainer.add(loading);

            const keys = await Promise.all(
                pageSuspects.map((suspect) =>
                    this.ensureSuspectTexture(suspect, 'wanted')
                )
            );

            if (
                !session.active ||
                this.session !== session ||
                token !== this.renderToken
            ) {
                return;
            }

            this.tweens.killTweensOf(loading);
            this.cardContainer.removeAll(true);

            this.renderCards(
                this.scale.width,
                this.scale.height,
                pageSuspects,
                keys
            );

            this.isPaging = false;
            this.updateNavButtons();
    
        } catch (error) {
            if (startedSession?.active && this.session === startedSession) {
                console.error('[WantedDatabaseScene] refreshPage failed:', error);
                this.closeAndReturnToOffice();
            }
        }
    },

    renderCards(W, H, pageSuspects, textureKeys) {
        const COLS = 5;
        const ROWS = 2;

        const gapX = 28;
        const gapY = 20;

        const startY = 214;
        const endY = H - 114;

        if (pageSuspects.length === 0) {
            const msg = this.makeText(
                W / 2,
                (startY + endY) / 2,
                this.suspects.length === 0
                    ? 'LOADING FELON FILES...\n\nPLEASE WAIT.'
                    : 'NO MATCHING RECORDS.\n\nTRY A DIFFERENT QUERY...\nOR CONFESS.',
                18,
                { align: 'center', lineSpacing: 6 }
            ).setOrigin(0.5);

            this.tweens.add({
                targets: msg,
                alpha: 0.5,
                duration: 600,
                yoyo: true,
                repeat: -1
            });

            this.cardContainer.add(msg);
            return;
        }

        const cardW = Math.max(
            120,
            Math.min(340, (W - 64 - (COLS - 1) * gapX) / COLS)
        );

        const cardH = Math.max(
            140,
            Math.min(400, (endY - startY - gapY) / ROWS)
        );

        const totalWidth = COLS * cardW + (COLS - 1) * gapX;
        const startX = (W - totalWidth) / 2;

        for (let i = 0; i < this.CARDS_PER_PAGE; i++) {
            const x = startX + (i % COLS) * (cardW + gapX);
            const y = startY + Math.floor(i / COLS) * (cardH + gapY);

            const suspect = pageSuspects[i];

            if (!suspect) {
                this.cardContainer.add(
                    this.createEmptySlot(x, y, cardW, cardH)
                );

                continue;
            }

            const card = this.createWantedCard(
                suspect,
                x,
                y,
                cardW,
                cardH,
                textureKeys[i]
            );

            card.container.setAlpha(0);
            card.container.y = y + 14;

            this.tweens.add({
                targets: card.container,
                alpha: 1,
                y,
                duration: 220,
                delay: i * 40,
                ease: 'Power2'
            });

            this.cardContainer.add(card.container);
            this.cards.push(card);
        }
    },

    createWantedCard(suspect, x, y, cardW, cardH, textureKey) {
        const th = this.th;
        const container = this.add.container(x, y);

        const background = this.makeRect(
            0,
            0,
            cardW,
            cardH,
            th.panel,
            0.95,
            0.55,
            2
        );

        container.add(background);

        // header strip
        container.add(this.makeRect(2, 2, cardW - 4, 24, th.panelAlt, 1, 0));

        container.add(
            this.makeText(10, 14, `#${this.fileNumber(suspect)}`, 11).setOrigin(
                0,
                0.5
            )
        );

        container.add(
            this.makeText(
                cardW - 10,
                14,
                String(suspect.gender_code || '?').toUpperCase(),
                9,
                { color: th.sMid }
            ).setOrigin(1, 0.5)
        );

        // photo box: plakaty są kwadratami, dół to pusty pergamin
        const plateH = 54;

        const box = {
            x: 8,
            y: 30,
            width: cardW - 16,
            height: Math.max(40, cardH - 30 - 6 - plateH - 4)
        };

        container.add(
            this.makeRect(box.x, box.y, box.width, box.height, 0x020805, 1, 0)
        );

        let entry = null;

        if (textureKey && this.textures.exists(textureKey)) {
            entry = this.createPhotoEntry(container, box);
            this.setEntryPhoto(entry, textureKey, 0, 2);
            this.photoEntries.push(entry);
        } else {
            container.add(
                this.makeText(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                    'NO PHOTO',
                    11,
                    { color: th.sDim }
                ).setOrigin(0.5)
            );
        }

        container.add(
            this.makeRect(
                box.x,
                box.y,
                box.width,
                box.height,
                0x000000,
                0,
                0.7,
                2
            )
        );

        const brackets = this.add.graphics();

        this.drawBrackets(
            brackets,
            box.x + 4,
            box.y + 4,
            box.width - 8,
            box.height - 8,
            12,
            th.main,
            2,
            0.7
        );

        container.add(brackets);

        // name plate
        const plateY = box.y + box.height + 4;

        container.add(
            this.makeRect(8, plateY, cardW - 16, plateH, 0x000000, 0.7, 0.4)
        );

        container.add(
            this.makeText(
                cardW / 2,
                plateY + 6,
                String(suspect.name || '').toUpperCase(),
                10,
                {
                    align: 'center',
                    wordWrap: { width: cardW - 30 },
                    maxLines: 2
                }
            ).setOrigin(0.5, 0)
        );

        if (suspect.accent) {
            container.add(
                this.makeText(
                    cardW / 2,
                    plateY + plateH - 16,
                    String(suspect.accent).toUpperCase(),
                    9,
                    { color: th.sMid }
                ).setOrigin(0.5, 0)
            );
        }

        // status stamp
        const stamp = this.createStamp(
            box.x + box.width / 2,
            box.y + box.height / 2,
            Math.max(10, Math.min(15, Math.floor(box.width / 12))),
            -14
        );

        container.add(stamp.container);

        // hover brackets
        const hoverGfx = this.add.graphics().setVisible(false);

        this.drawBrackets(
            hoverGfx,
            3,
            3,
            cardW - 6,
            cardH - 6,
            22,
            th.hi,
            3,
            1
        );

        container.add(hoverGfx);

        const zone = this.add
            .zone(0, 0, cardW, cardH)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => {
            background.setFillStyle(th.hover, 0.95).setStrokeStyle(2, th.hi, 1);
            hoverGfx.setVisible(true);
        });

        zone.on('pointerout', () => {
            background
                .setFillStyle(th.panel, 0.95)
                .setStrokeStyle(2, th.main, 0.55);

            hoverGfx.setVisible(false);
        });

        zone.on('pointerdown', () => {
            if (
                this.isPaging ||
                this.isClosing ||
                this.booting ||
                this.detailPanel?.visible ||
                this.helpPanel?.visible
            ) {
                return;
            }

            this.sfx('click_sound');
            this.showDetailPanel(suspect);
        });

        container.add(zone);

        const card = {
            container,
            suspect,
            setBadge: () => {
                const status = this.getStatus(suspect);

                this.paintStamp(stamp, status);

                const dim = status === 'clear' ? 0.4 : 1;

                if (entry) {
                    entry.raw.setAlpha(dim);
                    entry.baked.setAlpha(dim);
                }
            }
        };

        card.setBadge();

        return card;
    },

    createEmptySlot(x, y, width, height) {
        const th = this.th;
        const container = this.add.container(x, y);

        container.add([
            this.makeRect(0, 0, width, height, 0x000000, 0, 0.2),

            this.makeText(width / 2, height / 2, 'NO RECORD', 12, {
                color: th.sDim
            })
                .setOrigin(0.5)
                .setAlpha(0.4)
        ]);

        return container;
    }
};
