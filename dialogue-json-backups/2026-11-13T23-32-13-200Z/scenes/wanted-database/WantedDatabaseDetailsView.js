import { DETAIL_FIELDS } from './WantedDatabaseConfig.js';

export const WantedDatabaseDetailsView = {
    createDetailPanel(W, H) {
        const th = this.th;
        const panel = this.add.container(0, 0).setDepth(100);

        const overlay = this.add
            .rectangle(0, 0, W, H, 0x000000, 0.88)
            .setOrigin(0)
            .setInteractive();

        overlay.on('pointerdown', () => this.closeDetailPanel());

        panel.add(overlay);

        const PW = 1140;
        const PH = 760;

        const scale = Math.max(
            0.01,
            Math.min(1, (W - 40) / PW, (H - 40) / PH)
        );

        const content = this.add
            .container((W - PW * scale) / 2, (H - PH * scale) / 2)
            .setScale(scale);

        panel.add(content);

        const background = this.makeRect(
            0,
            0,
            PW,
            PH,
            th.bg,
            0.99,
            1,
            2
        ).setInteractive();

        background.on('pointerdown', (_pointer, _x, _y, event) => {
            event?.stopPropagation?.();
        });

        content.add(background);
        content.add(this.makeRect(6, 6, PW - 12, PH - 12, 0x000000, 0, 0.6, 2));

        // title bar
        content.add(this.makeRect(8, 8, PW - 16, 54, th.panelAlt, 1, 0.6));

        content.add(
            this.makeText(
                25,
                35,
                'CLASSIFIED DOSSIER // INDIVIDUAL PROFILE',
                16,
                { shadow: this.glow(th.sMain, 8) }
            ).setOrigin(0, 0.5)
        );

        this.detailRecText = this.makeText(PW - 100, 35, '', 13, {
            color: th.sMid
        }).setOrigin(1, 0.5);

        content.add(this.detailRecText);

        const close = this.makeButton(
            PW - 52,
            18,
            34,
            34,
            'X',
            () => this.closeDetailPanel(),
            16
        );

        content.add(close.container);

        /* ---------- photo column ---------- */

        const box = { x: 35, y: 85, width: 380, height: 470 };

        this.detailPhotoBox = box;

        content.add(
            this.makeRect(box.x, box.y, box.width, box.height, 0x020805, 1, 0)
        );

        this.detailPhotoEntry = this.createPhotoEntry(content, box);

        // scan bar
        this.detailScan = this.add.container(box.x, box.y).setVisible(false);

        this.detailScan.add([
            this.add
                .rectangle(0, 0, box.width, 34, th.main, 0.08)
                .setOrigin(0)
                .setBlendMode(Phaser.BlendModes.ADD),
            this.add
                .rectangle(0, 34, box.width, 2, th.hi, 0.5)
                .setOrigin(0)
                .setBlendMode(Phaser.BlendModes.ADD)
        ]);

        content.add(this.detailScan);

        this.tweens.add({
            targets: this.detailScan,
            y: box.y + box.height - 36,
            duration: 2600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.detailPhotoStatus = this.makeText(
            box.x + box.width / 2,
            box.y + box.height / 2,
            '',
            14,
            { align: 'center', wordWrap: { width: 340 } }
        ).setOrigin(0.5);

        content.add(this.detailPhotoStatus);

        content.add(
            this.makeRect(
                box.x,
                box.y,
                box.width,
                box.height,
                0x000000,
                0,
                0.8,
                2
            )
        );

        const brackets = this.add.graphics();

        this.drawBrackets(
            brackets,
            box.x + 8,
            box.y + 8,
            box.width - 16,
            box.height - 16,
            26,
            th.hi,
            3,
            0.9
        );

        content.add(brackets);

        this.detailStamp = this.createStamp(
            box.x + box.width / 2,
            box.y + box.height / 2,
            34,
            -14
        );

        content.add(this.detailStamp.container);

        // barcode
        content.add(this.makeRect(35, 565, 380, 42, 0x000000, 0.8, 0.5));

        this.barcodeGfx = this.add.graphics();
        content.add(this.barcodeGfx);

        this.detailCaseNum = this.makeText(35, 622, '', 10, {
            color: th.sDim,
            wordWrap: { width: 380 }
        });

        content.add(this.detailCaseNum);

        this.detailStatusText = this.makeText(35, 648, '', 11);
        content.add(this.detailStatusText);

        /* ---------- info column ---------- */

        const infoX = 450;
        const boxX = infoX - 10;
        const boxW = PW - 40 - boxX;

        this.detailName = this.makeText(infoX, 85, '', 22, {
            wordWrap: { width: PW - 490 },
            shadow: this.glow(th.sMain, 8)
        });

        content.add(this.detailName);

        content.add(
            this.add
                .rectangle(infoX, 125, PW - 35 - infoX, 2, th.main, 0.6)
                .setOrigin(0)
        );

        const statsY = 139;
        const statsH = 236;

        content.add(
            this.makeRect(boxX, statsY, boxW, statsH, th.panel, 0.8, 0.4)
        );

        this.detailStatsTop = statsY + 14;
        this.detailStatsBottom = statsY + statsH - 8;

        this.detailLabels = {};
        this.detailFields = {};

        for (const field of DETAIL_FIELDS) {
            this.detailLabels[field] = this.makeText(
                infoX + 10,
                0,
                `${field.toUpperCase()}:`,
                12,
                { color: th.sDim }
            );

            this.detailFields[field] = this.makeType(infoX + 170, 0, '', 20, {
                wordWrap: { width: PW - 40 - (infoX + 170) - 12 }
            });

            content.add(this.detailLabels[field]);
            content.add(this.detailFields[field]);
        }

        // skills box (klikalne tagi)
        this.skillsBox = { x: boxX, y: 387, w: boxW, h: 100 };

        content.add(
            this.makeRect(boxX, 387, boxW, 100, th.panel, 0.8, 0.5)
        );

        content.add(
            this.makeText(
                boxX + 14,
                397,
                'KNOWN SKILLS:  (CLICK TO SEARCH)',
                12,
                { color: th.sMid }
            )
        );

        // habits box
        content.add(
            this.makeRect(boxX, 499, boxW, 100, th.panel, 0.8, 0.5)
        );

        content.add(
            this.makeText(boxX + 14, 509, 'KNOWN HABITS:', 12, {
                color: th.sMid
            })
        );

        this.detailHabitus = this.makeType(boxX + 14, 533, '', 18, {
            wordWrap: { width: boxW - 28 }
        });

        content.add(this.detailHabitus);

        // margin note
        content.add(this.makeRect(boxX, 611, boxW, 78, 0x000000, 0.5, 0.35));

        content.add(
            this.makeText(boxX + 14, 619, "AGENT'S MARGIN NOTE:", 10, {
                color: th.sDim
            })
        );

        this.detailNote = this.makeType(boxX + 14, 640, '', 16, {
            color: th.sMid,
            wordWrap: { width: boxW - 28 }
        });

        content.add(this.detailNote);

        /* ---------- action buttons ---------- */

        this.flagButton = this.makeButton(
            35,
            704,
            235,
            36,
            '[F] FLAG SUSPECT',
            () => {
                if (this.selectedCard) this.setStatus(this.selectedCard, 'flag');
            },
            12
        );

        this.clearButton = this.makeButton(
            282,
            704,
            235,
            36,
            '[C] CLEAR SUSPECT',
            () => {
                if (this.selectedCard) this.setStatus(this.selectedCard, 'clear');
            },
            12
        );

        const prevRec = this.makeButton(
            PW - 35 - 160 - 12 - 160,
            704,
            160,
            36,
            '< PREV',
            () => this.stepDetail(-1),
            12
        );

        const nextRec = this.makeButton(
            PW - 35 - 160,
            704,
            160,
            36,
            'NEXT >',
            () => this.stepDetail(1),
            12
        );

        content.add([
            this.flagButton.container,
            this.clearButton.container,
            prevRec.container,
            nextRec.container
        ]);

        this.detailContent = content;

        return panel;
    }
};
