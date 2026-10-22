import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class WantedDatabaseScene extends BaseScene {
    constructor() {
        super({ key: 'WantedDatabaseScene' });

        this.gameState = {};
        this.CARDS_PER_PAGE = 10;
        this.currentPage = 0;
        this.searchQuery = '';
        this.filterGender = 'all';
    }

    init(data = {}) {
        this.gameState = data.gameState || this.gameState || {};
    }

    create() {
        super.create();

        EventBus.emit('hideHUD');

        this.session = { active: true };
        this.ownedTextures = new Set();
        this.pendingTextures = new Map();

        this.renderToken = 0;
        this.detailToken = 0;
        this.isPaging = false;
        this.isClosing = false;

        this.cards = [];
        this.selectedCard = null;

        this.currentPage = 0;
        this.searchQuery = '';
        this.filterGender = 'all';

        const cachedSuspects = this.cache.json.get('suspects');

        this.suspects = Array.isArray(cachedSuspects)
            ? cachedSuspects
            : [];

        this.filteredSuspects = [...this.suspects];

        const W = this.scale.width;
        const H = this.scale.height;

        this.createBackground(W, H);
        this.createCRTEffects(W, H);
        this.createHeader(W);
        this.createFilterPanel(W);

        this.cardContainer = this.add.container(0, 0);

        this.detailPanel = this.createDetailPanel(W, H);
        this.detailPanel.setVisible(false);

        this.createNavigation(W, H);
        this.createBackButton(W, H);

        this.input.keyboard?.on(
            'keydown-ESC',
            this.handleEsc,
            this
        );

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.cleanupScene,
            this
        );

        this.events.once(
            Phaser.Scenes.Events.DESTROY,
            this.cleanupScene,
            this
        );

        this.refreshPage();
    }

    // -------------------- UI HELPERS --------------------

    makeText(x, y, text, size = 14, extra = {}) {
        return this.add.text(x, y, text, {
            fontFamily: 'PressStart2P',
            fontSize: `${size}px`,
            color: '#00ff66',
            ...extra
        });
    }

    makeRect(
        x,
        y,
        width,
        height,
        fill = 0x05100a,
        alpha = 1,
        strokeAlpha = 0.5,
        strokeWidth = 1
    ) {
        return this.add
            .rectangle(x, y, width, height, fill, alpha)
            .setOrigin(0)
            .setStrokeStyle(
                strokeWidth,
                0x00ff66,
                strokeAlpha
            );
    }

    makeButton(x, y, width, height, label, onClick, size = 13) {
        const container = this.add.container(x, y);

        const background = this.makeRect(
            0,
            0,
            width,
            height,
            0x081a10,
            1,
            0.6
        );

        background.setInteractive({ useHandCursor: true });

        const text = this.makeText(
            width / 2,
            height / 2,
            label,
            size
        ).setOrigin(0.5);

        background.on('pointerover', () => {
            background
                .setFillStyle(0x103c23, 1)
                .setStrokeStyle(1, 0x66ffaa, 1);
        });

        background.on('pointerout', () => {
            background
                .setFillStyle(0x081a10, 1)
                .setStrokeStyle(1, 0x00ff66, 0.6);
        });

        background.on('pointerdown', () => {
            if (!this.session?.active || this.isClosing) return;
            onClick();
        });

        container.add([background, text]);

        return { container, background, text };
    }

    // -------------------- BACKGROUND / CRT --------------------

    createBackground(W, H) {
        this.add
            .rectangle(0, 0, W, H, 0x050c08)
            .setOrigin(0);

        this.makeRect(
            8,
            8,
            W - 16,
            H - 16,
            0x000000,
            0,
            1,
            16
        ).setStrokeStyle(16, 0x121c16, 1);

        this.makeRect(
            20,
            20,
            W - 40,
            H - 40,
            0x000000,
            0,
            0.4,
            2
        );
    }

    createCRTEffects(W, H) {
        const key = '__wanted_database_scanlines';

        if (!this.textures.exists(key)) {
            const graphics = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0x00ff66, 1);
            graphics.fillRect(0, 0, 4, 2);
            graphics.generateTexture(key, 4, 4);
            graphics.destroy();

            this.ownedTextures.add(key);
        }

        this.crtScanlines = this.add
            .tileSprite(0, 0, W, H, key)
            .setOrigin(0)
            .setAlpha(0.03)
            .setDepth(999);

        this.crtBeam = this.add
            .rectangle(0, -40, W, 40, 0x00ff66, 0.025)
            .setOrigin(0)
            .setDepth(999);

        this.tweens.add({
            targets: this.crtBeam,
            y: H,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    createHeader(W) {
        this.makeRect(
            24,
            24,
            W - 48,
            80,
            0x051a10,
            0.9,
            0.8,
            2
        );

        this.makeText(
            50,
            48,
            '> INTERPOL_DATABASE_v2.04',
            16
        );

        this.makeText(
            W / 2,
            64,
            'MOST WANTED DATABASE',
            28,
            {
                stroke: '#003311',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    // -------------------- FILTERS --------------------

    createFilterPanel(W) {
        const panelY = 135;
        const panelH = 50;

        this.makeRect(
            24,
            panelY,
            W - 48,
            panelH,
            0x05100a,
            0.9
        );

        this.makeText(
            45,
            panelY + panelH / 2,
            'FILTER',
            14,
            { color: '#00cc55' }
        ).setOrigin(0, 0.5);

        const filters = [
            { label: 'ALL', value: 'all' },
            { label: 'MALE', value: 'm' },
            { label: 'FEMALE', value: 'f' },
            { label: 'NON-BINARY', value: 'nb' }
        ];

        this.filterButtons = [];

        let x = 130;

        for (const filter of filters) {
            const width = filter.label.length * 10 + 20;

            const button = this.makeButton(
                x,
                panelY + 9,
                width,
                32,
                filter.label,
                () => {
                    if (this.detailPanel?.visible) return;

                    this.filterGender = filter.value;
                    this.currentPage = 0;

                    this.applyFilters();
                    this.refreshFilterButtons();
                    this.refreshPage();
                },
                12
            );

            this.filterButtons.push({
                ...button,
                value: filter.value
            });

            x += width + 12;
        }

        this.counterText = this.makeText(
            W - 45,
            panelY + panelH / 2,
            `RECORDS: ${this.filteredSuspects.length}`,
            14
        ).setOrigin(1, 0.5);

        this.refreshFilterButtons();
    }

    refreshFilterButtons() {
        for (const button of this.filterButtons) {
            const active = button.value === this.filterGender;

            button.background
                .setFillStyle(
                    active ? 0x104c2a : 0x081a10,
                    1
                )
                .setStrokeStyle(
                    1,
                    0x00ff66,
                    active ? 1 : 0.4
                );

            button.text.setColor(
                active ? '#00ff66' : '#00aa44'
            );
        }
    }

    applyFilters() {
        const query = String(this.searchQuery || '')
            .trim()
            .toLowerCase();

        this.filteredSuspects = this.suspects.filter((suspect) => {
            const genderMatch =
                this.filterGender === 'all' ||
                suspect.gender_code === this.filterGender;

            const searchMatch =
                !query ||
                ['name', 'skills', 'accent'].some((field) =>
                    String(suspect[field] || '')
                        .toLowerCase()
                        .includes(query)
                );

            return genderMatch && searchMatch;
        });

        this.counterText?.setText(
            `RECORDS: ${this.filteredSuspects.length}`
        );

        const totalPages = Math.max(
            1,
            Math.ceil(
                this.filteredSuspects.length /
                this.CARDS_PER_PAGE
            )
        );

        this.currentPage = Phaser.Math.Clamp(
            this.currentPage,
            0,
            totalPages - 1
        );
    }

    // -------------------- TEXTURES --------------------

    getTextureSpec(suspect, type) {
        if (type === 'wanted') {
            const file = suspect.wantedKey || suspect.id;

            return {
                sharedKey: `wanted_${suspect.id}`,
                privateKey: `__wanted_db_poster_${suspect.id}`,
                url: `assets/suspects/${file}.jpg`
            };
        }

        const file = suspect.portraitKey || suspect.id;

        return {
            sharedKey: String(file),
            privateKey: `__wanted_db_portrait_${suspect.id}`,
            url: `assets/suspects/${file}.jpg`
        };
    }

    getExistingTextureKey(spec) {
        if (this.textures.exists(spec.sharedKey)) {
            return spec.sharedKey;
        }

        if (this.textures.exists(spec.privateKey)) {
            return spec.privateKey;
        }

        return null;
    }

    ensureSuspectTexture(suspect, type) {
        const spec = this.getTextureSpec(suspect, type);
        const existing = this.getExistingTextureKey(spec);

        if (existing) {
            return Promise.resolve(existing);
        }

        if (!this.session?.active) {
            return Promise.resolve(null);
        }

        const key = spec.privateKey;
        const pending = this.pendingTextures.get(key);

        if (pending) {
            return pending.promise;
        }

        const session = this.session;
        const completeEvent = `filecomplete-image-${key}`;

        let resolvePromise;

        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;

            this.load.off(completeEvent, onComplete);
            this.load.off(
                Phaser.Loader.Events.FILE_LOAD_ERROR,
                onError
            );

            this.pendingTextures.delete(key);
            resolvePromise(result);
        };

        const onComplete = () => {
            if (!session.active) {
                finish(null);
                return;
            }

            this.ownedTextures.add(key);
            finish(key);
        };

        const onError = (file) => {
            if (file?.key !== key) return;

            console.warn(
                '[WantedDatabaseScene] Image failed:',
                spec.url
            );

            finish(null);
        };

        this.pendingTextures.set(key, {
            promise,
            cancel: () => finish(null)
        });

        this.load.once(completeEvent, onComplete);

        this.load.on(
            Phaser.Loader.Events.FILE_LOAD_ERROR,
            onError
        );

        this.load.image(key, spec.url);

        if (!this.load.isLoading()) {
            this.load.start();
        }

        return promise;
    }

    // -------------------- PAGES --------------------

    async refreshPage() {
        if (!this.session?.active) return;

        const session = this.session;
        const token = ++this.renderToken;

        this.isPaging = true;

        this.closeDetailPanel();
        this.cardContainer.removeAll(true);
        this.cards = [];

        this.updateNavButtons();

        const start = this.currentPage * this.CARDS_PER_PAGE;

        const pageSuspects = this.filteredSuspects.slice(
            start,
            start + this.CARDS_PER_PAGE
        );

        this.loadingText = this.makeText(
            this.scale.width / 2,
            this.scale.height / 2,
            'LOADING RECORDS...',
            16
        ).setOrigin(0.5);

        this.cardContainer.add(this.loadingText);

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

        this.cardContainer.removeAll(true);
        this.loadingText = null;

        this.renderCards(
            this.scale.width,
            this.scale.height,
            pageSuspects,
            keys
        );

        this.isPaging = false;
        this.updateNavButtons();
    }

    renderCards(W, H, pageSuspects, textureKeys) {
        const COLS = 5;
        const ROWS = 2;

        const gapX = 32;
        const gapY = 24;

        const startY = 210;

        const cardW = Math.max(
            1,
            Math.min(
                330,
                (W - 64 - (COLS - 1) * gapX) / COLS
            )
        );

        const cardH = Math.max(
            1,
            Math.min(
                370,
                (H - startY - 110 - gapY) / ROWS
            )
        );

        const totalWidth =
            COLS * cardW + (COLS - 1) * gapX;

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

            this.cardContainer.add(card.container);
            this.cards.push(card);
        }
    }

    createWantedCard(suspect, x, y, cardW, cardH, textureKey) {
        const container = this.add.container(x, y);

        const background = this.makeRect(
            0,
            0,
            cardW,
            cardH,
            0x05100a,
            0.9,
            0.5,
            2
        );

        container.add(background);

        const photoW = Math.max(1, cardW - 20);
        const photoH = Math.max(1, cardH - 20);

        if (textureKey && this.textures.exists(textureKey)) {
            const image = this.add.image(
                cardW / 2,
                cardH / 2,
                textureKey
            );

            image.setDisplaySize(photoW, photoH);
            container.add(image);
        } else {
            container.add(
                this.makeRect(
                    10,
                    10,
                    photoW,
                    photoH,
                    0x020805,
                    1,
                    0
                )
            );
        }

        container.add(
            this.makeRect(
                10,
                10 + photoH - 46,
                photoW,
                46,
                0x000000,
                0.8,
                0
            )
        );

        container.add(
            this.makeRect(
                10,
                10,
                photoW,
                photoH,
                0x000000,
                0,
                0.6,
                2
            )
        );

        container.add(
            this.makeText(
                16,
                16,
                `#${String(suspect.wantedKey || 0).padStart(3, '0')}`,
                12,
                {
                    backgroundColor: '#000000',
                    padding: { x: 4, y: 2 }
                }
            )
        );

        container.add(
            this.makeText(
                cardW / 2,
                10 + photoH - 38,
                String(suspect.name || '').toUpperCase(),
                10,
                {
                    align: 'center',
                    wordWrap: { width: photoW - 10 }
                }
            ).setOrigin(0.5, 0)
        );

        if (suspect.accent) {
            container.add(
                this.makeText(
                    cardW / 2,
                    10 + photoH - 20,
                    String(suspect.accent).toUpperCase(),
                    11,
                    { color: '#00cc55' }
                ).setOrigin(0.5, 0)
            );
        }

        const zone = this.add
            .zone(0, 0, cardW, cardH)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => {
            background
                .setFillStyle(0x0a2416, 0.95)
                .setStrokeStyle(2, 0x66ffaa, 1);
        });

        zone.on('pointerout', () => {
            background
                .setFillStyle(0x05100a, 0.9)
                .setStrokeStyle(2, 0x00ff66, 0.5);
        });

        zone.on('pointerdown', () => {
            if (
                this.isPaging ||
                this.isClosing ||
                this.detailPanel?.visible
            ) {
                return;
            }

            this.showDetailPanel(suspect);
        });

        container.add(zone);

        return { container, suspect };
    }

    createEmptySlot(x, y, width, height) {
        const container = this.add.container(x, y);

        container.add([
            this.makeRect(
                0,
                0,
                width,
                height,
                0x000000,
                0,
                0.2
            ),

            this.makeText(
                width / 2,
                height / 2,
                'NO RECORD',
                14,
                { color: '#00aa44' }
            ).setOrigin(0.5).setAlpha(0.3)
        ]);

        return container;
    }

    // -------------------- DETAIL PANEL --------------------

    createDetailPanel(W, H) {
        const panel = this.add.container(0, 0).setDepth(100);

        const overlay = this.add
            .rectangle(0, 0, W, H, 0x000000, 0.88)
            .setOrigin(0)
            .setInteractive();

        overlay.on('pointerdown', () => {
            this.closeDetailPanel();
        });

        panel.add(overlay);

        // Wewnętrzny układ zachowuje rozmiar oryginału.
        const PW = 1140;
        const PH = 760;

        const scale = Math.max(
            0.01,
            Math.min(1, (W - 40) / PW, (H - 40) / PH)
        );

        const content = this.add.container(
            (W - PW * scale) / 2,
            (H - PH * scale) / 2
        ).setScale(scale);

        panel.add(content);

        const background = this.makeRect(
            0,
            0,
            PW,
            PH,
            0x030a06,
            0.98,
            1,
            2
        ).setInteractive();

        // Blokuje kliknięcie w przyciemniające tło pod panelem.
        background.on('pointerdown', (_pointer, _x, _y, event) => {
            event.stopPropagation();
        });

        content.add(background);

        content.add(
            this.makeRect(
                6,
                6,
                PW - 12,
                PH - 12,
                0x000000,
                0,
                1,
                2
            )
        );

        content.add(
            this.makeRect(
                8,
                8,
                PW - 16,
                54,
                0x082012,
                1,
                0.6
            )
        );

        content.add(
            this.makeText(
                25,
                26,
                'CLASSIFIED DOSSIER // INDIVIDUAL PROFILE',
                18
            ).setOrigin(0, 0.5)
        );

        this.detailPhotoBox = {
            x: 35,
            y: 85,
            width: 380,
            height: 510
        };

        this.detailPhoto = this.add
            .image(225, 340, '__DEFAULT')
            .setVisible(false);

        content.add(this.detailPhoto);

        this.detailPhotoStatus = this.makeText(
            225,
            340,
            '',
            14,
            {
                align: 'center',
                wordWrap: { width: 340 }
            }
        ).setOrigin(0.5);

        content.add(this.detailPhotoStatus);

        content.add(
            this.makeRect(
                35,
                85,
                380,
                510,
                0x000000,
                0,
                0.8,
                2
            )
        );

        const infoX = 450;
        const infoY = 85;

        this.detailName = this.makeText(
            infoX,
            infoY,
            '',
            24,
            { wordWrap: { width: PW - 490 } }
        );

        content.add(this.detailName);

        content.add(
            this.add
                .rectangle(
                    infoX,
                    infoY + 42,
                    PW - 35 - infoX,
                    2,
                    0x00ff66,
                    0.6
                )
                .setOrigin(0)
        );

        content.add(
            this.makeRect(
                infoX - 10,
                infoY + 52,
                PW - 480,
                230,
                0x05140b,
                0.6,
                0.4
            )
        );

        const fields = [
            'gender',
            'race',
            'hair',
            'eyes',
            'features',
            'accent'
        ];

        this.detailFields = {};

        fields.forEach((field, index) => {
            const y = infoY + 62 + index * 36;

            content.add(
                this.makeText(
                    infoX + 10,
                    y,
                    `${field.toUpperCase()}:`,
                    18,
                    { color: '#00aa44' }
                )
            );

            this.detailFields[field] = this.makeText(
                infoX + 170,
                y,
                '',
                18,
                { wordWrap: { width: 440 } }
            );

            content.add(this.detailFields[field]);
        });

        const createInfoBox = (y, label) => {
            content.add(
                this.makeRect(
                    infoX - 10,
                    y,
                    PW - 480,
                    110,
                    0x05140b,
                    0.8,
                    0.5
                )
            );

            content.add(
                this.makeText(
                    infoX + 5,
                    y + 10,
                    label,
                    17,
                    { color: '#00cc55' }
                )
            );

            const value = this.makeText(
                infoX + 5,
                y + 38,
                '',
                18,
                { wordWrap: { width: PW - 510 } }
            );

            content.add(value);

            return value;
        };

        this.detailSkills = createInfoBox(
            infoY + 300,
            'KNOWN SKILLS:'
        );

        this.detailHabitus = createInfoBox(
            infoY + 425,
            'KNOWN HABITS:'
        );

        this.detailCaseNum = this.makeText(
            35,
            PH - 45,
            '',
            16,
            { color: '#00aa44' }
        );

        content.add(this.detailCaseNum);

        const close = this.makeButton(
            PW - 45,
            12,
            34,
            34,
            'X',
            () => this.closeDetailPanel(),
            18
        );

        content.add(close.container);

        return panel;
    }

    fitDetailPhoto(textureKey) {
        const box = this.detailPhotoBox;
        const photo = this.detailPhoto;

        photo.setCrop();
        photo.setTexture(textureKey);

        const frame = photo.frame;
        const sourceW = frame.realWidth;
        const sourceH = frame.realHeight;

        if (!sourceW || !sourceH) {
            photo.setVisible(false);
            return;
        }

        const scale = Math.max(
            box.width / sourceW,
            box.height / sourceH
        );

        const cropW = box.width / scale;
        const cropH = box.height / scale;

        photo
            .setOrigin(0.5)
            .setPosition(
                box.x + box.width / 2,
                box.y + box.height / 2
            )
            .setScale(scale)
            .setCrop(
                (sourceW - cropW) / 2,
                (sourceH - cropH) / 2,
                cropW,
                cropH
            )
            .setVisible(true);
    }

    async showDetailPanel(suspect) {
        if (!this.session?.active || this.isClosing) return;

        const session = this.session;
        const token = ++this.detailToken;

        this.selectedCard = suspect;

        this.detailName.setText(
            String(suspect.name || '').toUpperCase()
        );

        for (const [field, text] of Object.entries(this.detailFields)) {
            text.setText(String(suspect[field] || 'UNKNOWN'));
        }

        this.detailSkills.setText(
            String(suspect.skills || 'NONE')
        );

        this.detailHabitus.setText(
            String(suspect.habitus || 'NONE')
        );

        this.detailCaseNum.setText(
            `FILE ID: #${String(suspect.wantedKey || 0).padStart(3, '0')}` +
            ` // REF: ${String(suspect.id || '').toUpperCase()}`
        );

        this.detailPhoto.setVisible(false);
        this.detailPhotoStatus
            .setText('LOADING PORTRAIT...')
            .setVisible(true);

        this.tweens.killTweensOf(this.detailPanel);

        this.detailPanel
            .setVisible(true)
            .setAlpha(0);

        this.tweens.add({
            targets: this.detailPanel,
            alpha: 1,
            duration: 150,
            ease: 'Power2'
        });

        const key = await this.ensureSuspectTexture(
            suspect,
            'portrait'
        );

        if (
            !session.active ||
            this.session !== session ||
            token !== this.detailToken ||
            !this.detailPanel?.visible
        ) {
            return;
        }

        if (key && this.textures.exists(key)) {
            this.fitDetailPhoto(key);
            this.detailPhotoStatus.setVisible(false);
        } else {
            this.detailPhotoStatus.setText('PORTRAIT UNAVAILABLE');
        }
    }

    closeDetailPanel() {
        this.detailToken++;
        this.selectedCard = null;

        if (!this.detailPanel) return;

        this.tweens.killTweensOf(this.detailPanel);
        this.detailPanel.setVisible(false).setAlpha(1);
        this.detailPhoto?.setVisible(false);
    }

    // -------------------- NAVIGATION --------------------

    createNavigation(W, H) {
        const navY = H - 65;

        this.makeRect(
            24,
            navY - 10,
            W - 48,
            50,
            0x05100a,
            0.9
        );

        this.prevButton = this.makeButton(
            45,
            navY,
            120,
            32,
            '< PREV',
            () => this.prevPage()
        );

        this.pageText = this.makeText(
            W / 2,
            navY + 16,
            '',
            16
        ).setOrigin(0.5);

        this.nextButton = this.makeButton(
            W - 165,
            navY,
            120,
            32,
            'NEXT >',
            () => this.nextPage()
        );

        this.updateNavButtons();
    }

    updateNavButtons() {
        const totalPages = Math.max(
            1,
            Math.ceil(
                this.filteredSuspects.length /
                this.CARDS_PER_PAGE
            )
        );

        this.pageText?.setText(
            `PAGE ${this.currentPage + 1} / ${totalPages}`
        );

        const canPrev =
            !this.isPaging && this.currentPage > 0;

        const canNext =
            !this.isPaging &&
            this.currentPage < totalPages - 1;

        this.prevButton?.container.setAlpha(canPrev ? 1 : 0.3);
        this.nextButton?.container.setAlpha(canNext ? 1 : 0.3);
    }

    prevPage() {
        if (
            this.isPaging ||
            this.detailPanel?.visible ||
            this.currentPage <= 0
        ) {
            return;
        }

        this.currentPage--;
        this.refreshPage();
    }

    nextPage() {
        if (this.isPaging || this.detailPanel?.visible) return;

        const totalPages = Math.ceil(
            this.filteredSuspects.length / this.CARDS_PER_PAGE
        );

        if (this.currentPage >= totalPages - 1) return;

        this.currentPage++;
        this.refreshPage();
    }

    createBackButton(W, H) {
        this.makeButton(
            W - 220,
            40,
            180,
            40,
            '[ESC] EXIT',
            () => this.closeAndReturnToOffice(),
            14
        );
    }

    handleEsc() {
        if (this.detailPanel?.visible) {
            this.closeDetailPanel();
        } else {
            this.closeAndReturnToOffice();
        }
    }

    closeAndReturnToOffice() {
        if (this.isClosing) return;
        this.isClosing = true;

        if (this.scene.isSleeping('UIScene')) {
            this.scene.wake('UIScene');
        }

        this.scene.resume('OfficeScene');
        this.scene.stop();
    }

    // -------------------- CLEANUP --------------------

    cleanupScene() {
        if (!this.session?.active) return;

        this.session.active = false;
        this.renderToken++;
        this.detailToken++;

        this.events.off(
            Phaser.Scenes.Events.SHUTDOWN,
            this.cleanupScene,
            this
        );

        this.events.off(
            Phaser.Scenes.Events.DESTROY,
            this.cleanupScene,
            this
        );

        this.input.keyboard?.off(
            'keydown-ESC',
            this.handleEsc,
            this
        );

        for (const pending of [...this.pendingTextures.values()]) {
            pending.cancel();
        }

        this.pendingTextures.clear();

        if (this.detailPanel) {
            this.tweens.killTweensOf(this.detailPanel);
            this.detailPanel.destroy(true);
            this.detailPanel = null;
        }

        if (this.cardContainer) {
            this.cardContainer.destroy(true);
            this.cardContainer = null;
        }

        if (this.crtBeam) {
            this.tweens.killTweensOf(this.crtBeam);
            this.crtBeam.destroy();
            this.crtBeam = null;
        }

        if (this.crtScanlines) {
            this.crtScanlines.destroy();
            this.crtScanlines = null;
        }

        for (const key of this.ownedTextures) {
            if (this.textures.exists(key)) {
                this.textures.remove(key);
            }
        }

        this.ownedTextures.clear();

        this.cards = [];
        this.selectedCard = null;
        this.detailPhoto = null;
        this.detailPhotoStatus = null;
        this.loadingText = null;
        this.isPaging = false;
    }
}