export class WantedDatabaseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WantedDatabaseScene' });
        this.gameState = {};
        this.suspects = [];
        this.currentIndex = 0;
        this.cards = [];
        this.selectedCard = null;
        this.CARDS_PER_PAGE = 10;
        this.currentPage = 0;
        this.detailPanel = null;
        this.searchQuery = '';
        this.filterGender = 'all';
        this.filteredSuspects = [];
        this.isPaging = false;
        this.renderToken = 0;
        this.loadedSuspectTextures = new Set();
    }

    init(data) {
        this.gameState = data?.gameState || this.gameState || {};
    }

    preload() {
        this.load.json('suspects', 'assets/data/suspects.json');
    }

    create() {
        if (this.scene.isActive('UIScene')) {
            this.scene.sleep('UIScene');
        }

        const W = this.scale.width;
        const H = this.scale.height;

        this.suspects = this.cache.json.get('suspects') || [];
        this.filteredSuspects = [...this.suspects];

        this.createBackground(W, H);
        this.createCRTEffects(W, H);
        this.createHeader(W);
        this.createFilterPanel(W);

        this.cardContainer = this.add.container(0, 0);

        this.preloadAllSuspectTextures(() => {
            this.renderCards(W, H);
            this.createNavigation(W, H);
        });

        this.detailPanel = this.createDetailPanel(W, H);
        this.detailPanel.setVisible(false);

        this.createBackButton(W, H);

        this.input.keyboard.on('keydown-ESC', this.handleEsc, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
        this.events.on(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);
    }

    handleEsc() {
        if (this.detailPanel?.visible) {
            this.closeDetailPanel();
        } else {
            this.closeAndReturnToOffice();
        }
    }

    createBackground(W, H) {
        this.add.rectangle(0, 0, W, H, 0x050c08).setOrigin(0, 0);

        const monitorFrame = this.add.graphics();
        monitorFrame.lineStyle(16, 0x121c16, 1);
        monitorFrame.strokeRect(8, 8, W - 16, H - 16);
        monitorFrame.lineStyle(2, 0x00ff66, 0.4);
        monitorFrame.strokeRect(20, 20, W - 40, H - 40);
    }

    createCRTEffects(W, H) {
        const scanlines = this.add.graphics();
        scanlines.fillStyle(0x00ff66, 0.03);
        for (let y = 0; y < H; y += 4) {
            scanlines.fillRect(0, y, W, 2);
        }
        scanlines.setDepth(999);

        const beam = this.add.graphics();
        beam.fillStyle(0x00ff66, 0.04);
        beam.fillRect(0, 0, W, 40);
        beam.setDepth(999);

        this.tweens.add({
            targets: beam,
            y: H,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        const crtOverlay = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0);
        crtOverlay.setDepth(998);

        this.crtFlickerEvent = this.time.addEvent({
            delay: 80,
            loop: true,
            callback: () => {
                crtOverlay.setAlpha(Phaser.Math.FloatBetween(0.01, 0.05));
            }
        });
    }

    createHeader(W) {
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x051a10, 0.9);
        headerBg.fillRect(24, 24, W - 48, 80);
        headerBg.lineStyle(2, 0x00ff66, 0.8);
        headerBg.strokeRect(24, 24, W - 48, 80);

        this.add.text(50, 48, '> INTERPOL_DATABASE_v2.04', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#00ff66'
        });

        this.add.text(W / 2, 64, 'MOST WANTED DATABASE', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#00ff66',
            stroke: '#003311',
            strokeThickness: 4
        }).setOrigin(0.5, 0.5);
    }

    createFilterPanel(W) {
        const panelY = 135;
        const panelH = 50;

        const filterBg = this.add.graphics();
        filterBg.fillStyle(0x05100a, 0.9);
        filterBg.fillRect(24, panelY, W - 48, panelH);
        filterBg.lineStyle(1, 0x00ff66, 0.5);
        filterBg.strokeRect(24, panelY, W - 48, panelH);

        this.add.text(45, panelY + panelH / 2, 'FILTER ', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#00cc55'
        }).setOrigin(0, 0.5);

        const filters = [
            { label: 'ALL', value: 'all' },
            { label: 'MALE', value: 'm' },
            { label: 'FEMALE', value: 'f' },
            { label: 'NON-BINARY', value: 'nb' }
        ];

        this.filterButtonGraphics = [];
        this.filterButtonTexts = [];
        this.filterMeta = filters;
        this.filterPanelY = panelY;

        let currentX = 130;
        const gap = 12;

        filters.forEach((f) => {
            const isActive = this.filterGender === f.value;
            const btnWidth = f.label.length * 10 + 20;

            const btn = this.add.graphics();
            btn.fillStyle(isActive ? 0x00ff66 : 0x081a10, isActive ? 0.3 : 0.8);
            btn.fillRect(currentX, panelY + 9, btnWidth, 32);
            btn.lineStyle(1, 0x00ff66, isActive ? 1 : 0.4);
            btn.strokeRect(currentX, panelY + 9, btnWidth, 32);

            const zone = this.add.zone(currentX, panelY + 9, btnWidth, 32).setOrigin(0, 0).setInteractive();
            const btnText = this.add.text(currentX + btnWidth / 2, panelY + 25, f.label, {
                fontFamily: 'PressStart2P',
                fontSize: '12px',
                color: isActive ? '#00ff66' : '#00aa44'
            }).setOrigin(0.5, 0.5);

            zone.on('pointerdown', () => {
                this.filterGender = f.value;
                this.currentPage = 0;
                this.applyFilters();
                this.refreshFilterButtons();
            });
            zone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
            zone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

            this.filterButtonGraphics.push({ btn, btnWidth, x: currentX, f, zone });
            this.filterButtonTexts.push(btnText);

            currentX += btnWidth + gap;
        });

        this.counterText = this.add.text(W - 45, panelY + panelH / 2, `RECORDS: ${this.filteredSuspects.length}`, {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#00ff66'
        }).setOrigin(1, 0.5);
    }

    refreshFilterButtons() {
        const panelY = this.filterPanelY;
        this.filterButtonGraphics.forEach(({ btn, btnWidth, x, f }, idx) => {
            const isActive = this.filterGender === f.value;
            btn.clear();
            btn.fillStyle(isActive ? 0x00ff66 : 0x081a10, isActive ? 0.3 : 0.8);
            btn.fillRect(x, panelY + 9, btnWidth, 32);
            btn.lineStyle(1, 0x00ff66, isActive ? 1 : 0.4);
            btn.strokeRect(x, panelY + 9, btnWidth, 32);
            this.filterButtonTexts[idx].setColor(isActive ? '#00ff66' : '#00aa44');
        });
        this.refreshPage();
    }

    applyFilters() {
        const q = this.searchQuery.trim().toLowerCase();

        this.filteredSuspects = this.suspects.filter(s => {
            const genderMatch = this.filterGender === 'all' || s.gender_code === this.filterGender;
            const searchMatch = q === '' ||
                (s.name || '').toLowerCase().includes(q) ||
                (s.skills || '').toLowerCase().includes(q) ||
                (s.accent || '').toLowerCase().includes(q);
            return genderMatch && searchMatch;
        });

        if (this.counterText) {
            this.counterText.setText(`RECORDS: ${this.filteredSuspects.length}`);
        }

        const totalPages = Math.max(1, Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE));
        if (this.currentPage >= totalPages) {
            this.currentPage = totalPages - 1;
        }
    }

    preloadAllSuspectTextures(onComplete) {
        const toLoad = [];

        this.suspects.forEach(suspect => {
            const wantedFile = suspect.wantedKey || suspect.id;
            const portraitFile = suspect.portraitKey || suspect.id;

            const wantedKey = `wanted_main_${suspect.id}`;
            const portraitKey = `suspect_portrait_${suspect.id}`;

            if (!this.textures.exists(wantedKey) && !this.loadedSuspectTextures.has(wantedKey)) {
                this.loadedSuspectTextures.add(wantedKey);
                toLoad.push({
                    key: wantedKey,
                    url: `assets/suspects/${wantedFile}.jpg`
                });
            }

            if (!this.textures.exists(portraitKey) && !this.loadedSuspectTextures.has(portraitKey)) {
                this.loadedSuspectTextures.add(portraitKey);
                toLoad.push({
                    key: portraitKey,
                    url: `assets/suspects/${portraitFile}.jpg`
                });
            }
        });

        if (toLoad.length === 0) {
            onComplete?.();
            return;
        }

        toLoad.forEach(item => {
            this.load.image(item.key, item.url);
        });

        this.load.once(Phaser.Loader.Events.COMPLETE, () => {
            onComplete?.();
        });

        if (!this.load.isLoading()) {
            this.load.start();
        }
    }

    refreshPage() {
        this.isPaging = true;
        this.renderToken++;

        if (this.cardContainer) {
            this.cardContainer.removeAll(true);
        }

        this.time.delayedCall(0, () => {
            this.renderCards(this.scale.width, this.scale.height, this.renderToken);
            this.isPaging = false;
        });
    }

    renderCards(W, H, token = this.renderToken) {
        if (!this.cardContainer) return;

        this.cardContainer.removeAll(true);
        this.cards = [];

        const COLS = 5;
        const cardW = 330;
        const cardH = 370;
        const colGap = 32;
        const rowGap = 24;
        const startX = (W - (COLS * cardW + (COLS - 1) * colGap)) / 2;
        const startY = 210;

        const pageStart = this.currentPage * this.CARDS_PER_PAGE;
        const pageEnd = Math.min(pageStart + COLS * 2, this.filteredSuspects.length);
        const pageSuspects = this.filteredSuspects.slice(pageStart, pageEnd);

        pageSuspects.forEach((suspect, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = startX + col * (cardW + colGap);
            const y = startY + row * (cardH + rowGap);

            const card = this.createWantedCard(suspect, x, y, cardW, cardH, token);
            this.cardContainer.add(card.elements);
            this.cards.push(card);
        });

        for (let i = pageSuspects.length; i < COLS * 2; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = startX + col * (cardW + colGap);
            const y = startY + row * (cardH + rowGap);
            const emptyCard = this.createEmptySlot(x, y, cardW, cardH);
            this.cardContainer.add(emptyCard);
        }

        this.updateNavButtons();
    }

    createWantedCard(suspect, x, y, cardW, cardH, token) {
        const elements = [];

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x05100a, 0.9);
        cardBg.fillRect(x, y, cardW, cardH);
        cardBg.lineStyle(2, 0x00ff66, 0.5);
        cardBg.strokeRect(x, y, cardW, cardH);
        elements.push(cardBg);

        const wantedFile = suspect.wantedKey || suspect.id;
        const imgKey = `wanted_main_${suspect.id}`;

        const photoX = x + 10;
        const photoY = y + 10;
        const photoW = cardW - 20;
        const photoH = cardH - 20;

        if (this.textures.exists(imgKey)) {
            const img = this.add.image(photoX + photoW / 2, photoY + photoH / 2, imgKey);
            img.setDisplaySize(photoW, photoH);
            elements.push(img);
        } else {
            const placeholder = this.add.graphics();
            placeholder.fillStyle(0x020805, 1);
            placeholder.fillRect(photoX, photoY, photoW, photoH);
            elements.push(placeholder);
        }

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(photoX, photoY + photoH - 46, photoW, 46);
        elements.push(overlay);

        const photoFrame = this.add.graphics();
        photoFrame.lineStyle(2, 0x00ff66, 0.6);
        photoFrame.strokeRect(photoX, photoY, photoW, photoH);
        elements.push(photoFrame);

        const caseNum = this.add.text(photoX + 6, photoY + 6, `#${String(suspect.wantedKey || 0).padStart(3, '0')}`, {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#00ff66',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        elements.push(caseNum);

        const nameText = this.add.text(x + cardW / 2, photoY + photoH - 38, (suspect.name || '').toUpperCase(), {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: '#00ff66',
            align: 'center',
            wordWrap: { width: photoW - 10 }
        }).setOrigin(0.5, 0);
        elements.push(nameText);

        if (suspect.accent) {
            const accentText = this.add.text(x + cardW / 2, photoY + photoH - 20, suspect.accent.toUpperCase(), {
                fontFamily: 'PressStart2P',
                fontSize: '11px',
                color: '#00cc55',
                align: 'center'
            }).setOrigin(0.5, 0);
            elements.push(accentText);
        }

        const zone = this.add.zone(x, y, cardW, cardH).setOrigin(0, 0).setInteractive();
        zone.on('pointerover', () => {
            cardBg.clear();
            cardBg.fillStyle(0x0a2416, 0.95);
            cardBg.fillRect(x, y, cardW, cardH);
            cardBg.lineStyle(2, 0x66ffaa, 1);
            cardBg.strokeRect(x, y, cardW, cardH);
            this.game.canvas.style.cursor = 'pointer';
        });

        zone.on('pointerout', () => {
            cardBg.clear();
            cardBg.fillStyle(0x05100a, 0.9);
            cardBg.fillRect(x, y, cardW, cardH);
            cardBg.lineStyle(2, 0x00ff66, 0.5);
            cardBg.strokeRect(x, y, cardW, cardH);
            this.game.canvas.style.cursor = 'default';
        });

        zone.on('pointerdown', () => this.showDetailPanel(suspect));
        elements.push(zone);

        return { elements, suspect };
    }

    createEmptySlot(x, y, cardW, cardH) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x00ff66, 0.2);
        g.strokeRect(x, y, cardW, cardH);

        const emptyLabel = this.add.text(x + cardW / 2, y + cardH / 2, 'NO RECORD', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#00aa44',
            align: 'center'
        }).setOrigin(0.5, 0.5).setAlpha(0.3);

        const container = this.add.container(0, 0);
        container.add([g, emptyLabel]);
        return container;
    }

    createDetailPanel(W, H) {
        const panel = this.add.container(0, 0);
        panel.setDepth(100);

        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.88).setOrigin(0, 0);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.closeDetailPanel());
        panel.add(overlay);

        const PW = 1140;
        const PH = 760;
        const PX = (W - PW) / 2;
        const PY = (H - PH) / 2;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x030a06, 0.98);
        panelBg.fillRect(PX, PY, PW, PH);
        panelBg.lineStyle(2, 0x00ff66, 1);
        panelBg.strokeRect(PX, PY, PW, PH);
        panelBg.strokeRect(PX + 6, PY + 6, PW - 12, PH - 12);
        panel.add(panelBg);

        const detailHeader = this.add.graphics();
        detailHeader.fillStyle(0x082012, 1);
        detailHeader.fillRect(PX + 8, PY + 8, PW - 16, 54);
        detailHeader.lineStyle(1, 0x00ff66, 0.6);
        detailHeader.strokeRect(PX + 8, PY + 8, PW - 16, 54);
        panel.add(detailHeader);

        const dossierTitle = this.add.text(PX + 25, PY + 26, '★ CLASSIFIED DOSSIER // INDIVIDUAL PROFILE ★', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#00ff66'
        }).setOrigin(0, 0.5);
        panel.add(dossierTitle);

        const photoX = PX + 35;
        const photoY = PY + 85;
        const photoW = 380;
        const photoH = 510;

        const photoMaskShape = this.make.graphics();
        photoMaskShape.fillStyle(0xffffff);
        photoMaskShape.fillRect(photoX, photoY, photoW, photoH);
        const photoMask = photoMaskShape.createGeometryMask();

        this.detailPhoto = this.add.image(photoX + photoW / 2, photoY + photoH / 2, '__DEFAULT').setVisible(false);
        this.detailPhoto.setMask(photoMask);
        panel.add(this.detailPhoto);

        const photoFrame = this.add.graphics();
        photoFrame.lineStyle(2, 0x00ff66, 0.8);
        photoFrame.strokeRect(photoX, photoY, photoW, photoH);
        panel.add(photoFrame);

        const infoX = PX + 450;
        const infoStartY = PY + 85;

        this.detailName = this.add.text(infoX, infoStartY, '', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#00ff66',
            wordWrap: { width: PW - 490 }
        }).setOrigin(0, 0);
        panel.add(this.detailName);

        const sep = this.add.graphics();
        sep.lineStyle(2, 0x00ff66, 0.6);
        sep.lineBetween(infoX, infoStartY + 42, PX + PW - 35, infoStartY + 42);
        panel.add(sep);

        const attrBox = this.add.graphics();
        attrBox.fillStyle(0x05140b, 0.6);
        attrBox.fillRoundedRect(infoX - 10, infoStartY + 52, PW - 480, 230, 4);
        attrBox.lineStyle(1, 0x00ff66, 0.4);
        attrBox.strokeRoundedRect(infoX - 10, infoStartY + 52, PW - 480, 230, 4);
        panel.add(attrBox);

        const fields = ['gender', 'race', 'hair', 'eyes', 'features', 'accent'];
        const fieldLabels = ['GENDER', 'RACE', 'HAIR', 'EYES', 'FEATURES', 'ACCENT'];
        const lineH = 36;

        this.detailFields = {};
        fields.forEach((field, i) => {
            const fy = infoStartY + 62 + i * lineH;

            const fieldLabel = this.add.text(infoX + 10, fy, `${fieldLabels[i]}:`, {
                fontFamily: 'PressStart2P',
                fontSize: '18px',
                color: '#00aa44'
            }).setOrigin(0, 0);
            panel.add(fieldLabel);

            this.detailFields[field] = this.add.text(infoX + 170, fy, '', {
                fontFamily: 'PressStart2P',
                fontSize: '18px',
                color: '#00ff66'
            }).setOrigin(0, 0);
            panel.add(this.detailFields[field]);
        });

        const skillsY = infoStartY + 300;
        const skillsBg = this.add.graphics();
        skillsBg.fillStyle(0x05140b, 0.8);
        skillsBg.fillRoundedRect(infoX - 10, skillsY, PW - 480, 110, 4);
        skillsBg.lineStyle(1, 0x00ff66, 0.5);
        skillsBg.strokeRoundedRect(infoX - 10, skillsY, PW - 480, 110, 4);
        panel.add(skillsBg);

        const skillsLabel = this.add.text(infoX + 5, skillsY + 10, '▶ KNOWN SKILLS:', {
            fontFamily: 'PressStart2P',
            fontSize: '17px',
            color: '#00cc55'
        }).setOrigin(0, 0);
        panel.add(skillsLabel);

        this.detailSkills = this.add.text(infoX + 5, skillsY + 38, '', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#00ff66',
            wordWrap: { width: PW - 510 }
        }).setOrigin(0, 0);
        panel.add(this.detailSkills);

        const habitY = skillsY + 125;
        const habitBg = this.add.graphics();
        habitBg.fillStyle(0x05140b, 0.8);
        habitBg.fillRoundedRect(infoX - 10, habitY, PW - 480, 110, 4);
        habitBg.lineStyle(1, 0x00ff66, 0.5);
        habitBg.strokeRoundedRect(infoX - 10, habitY, PW - 480, 110, 4);
        panel.add(habitBg);

        const habitLabel = this.add.text(infoX + 5, habitY + 10, '▶ KNOWN HABITS:', {
            fontFamily: 'PressStart2P',
            fontSize: '17px',
            color: '#00cc55'
        }).setOrigin(0, 0);
        panel.add(habitLabel);

        this.detailHabitus = this.add.text(infoX + 5, habitY + 38, '', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#00ff66',
            wordWrap: { width: PW - 510 }
        }).setOrigin(0, 0);
        panel.add(this.detailHabitus);

        this.detailCaseNum = this.add.text(PX + 35, PY + PH - 45, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#00aa44'
        }).setOrigin(0, 0);
        panel.add(this.detailCaseNum);

        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0x082012, 1);
        closeBtnBg.fillRect(PX + PW - 45, PY + 12, 34, 34);
        closeBtnBg.lineStyle(1, 0x00ff66, 0.8);
        closeBtnBg.strokeRect(PX + PW - 45, PY + 12, 34, 34);
        panel.add(closeBtnBg);

        const closeBtn = this.add.text(PX + PW - 28, PY + 29, '✕', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#00ff66'
        }).setOrigin(0.5, 0.5);
        panel.add(closeBtn);

        const closeZone = this.add.zone(PX + PW - 45, PY + 12, 34, 34).setOrigin(0, 0).setInteractive();
        closeZone.on('pointerdown', () => this.closeDetailPanel());
        closeZone.on('pointerover', () => {
            closeBtnBg.clear();
            closeBtnBg.fillStyle(0x00ff66, 0.3);
            closeBtnBg.fillRect(PX + PW - 45, PY + 12, 34, 34);
            closeBtnBg.lineStyle(1, 0x00ff66, 1);
            closeBtnBg.strokeRect(PX + PW - 45, PY + 12, 34, 34);
            this.game.canvas.style.cursor = 'pointer';
        });
        closeZone.on('pointerout', () => {
            closeBtnBg.clear();
            closeBtnBg.fillStyle(0x082012, 1);
            closeBtnBg.fillRect(PX + PW - 45, PY + 12, 34, 34);
            closeBtnBg.lineStyle(1, 0x00ff66, 0.8);
            closeBtnBg.strokeRect(PX + PW - 45, PY + 12, 34, 34);
            this.game.canvas.style.cursor = 'default';
        });
        panel.add(closeZone);

        return panel;
    }

    showDetailPanel(suspect) {
        this.detailName.setText((suspect.name || '').toUpperCase());

        const fields = ['gender', 'race', 'hair', 'eyes', 'features', 'accent'];
        fields.forEach(f => {
            if (this.detailFields[f]) {
                this.detailFields[f].setText(suspect[f] || 'UNKNOWN');
            }
        });

        this.detailSkills.setText(suspect.skills || 'NONE');
        this.detailHabitus.setText(suspect.habitus || 'NONE');
        this.detailCaseNum.setText(
            `FILE ID: #${String(suspect.wantedKey || 0).padStart(3, '0')} // REF: ${String(suspect.id || '').toUpperCase()}`
        );

        const portraitFile = suspect.portraitKey || suspect.id;
        const portraitImgKey = `suspect_portrait_${suspect.id}`;

        const updatePhotoTexture = () => {
            if (!this.textures.exists(portraitImgKey)) return;
            this.detailPhoto.setTexture(portraitImgKey).setVisible(true);
            const frameW = 380;
            const frameH = 510;
            const source = this.textures.get(portraitImgKey).getSourceImage();
            const scale = Math.max(frameW / source.width, frameH / source.height);
            this.detailPhoto.setScale(scale);
        };

        if (this.textures.exists(portraitImgKey)) {
            updatePhotoTexture();
        } else {
            this.detailPhoto.setVisible(false);
        }

        this.detailPanel.setVisible(true);
        this.detailPanel.setAlpha(0);
        this.tweens.add({
            targets: this.detailPanel,
            alpha: 1,
            duration: 150,
            ease: 'Power2'
        });
    }

    closeDetailPanel() {
        this.tweens.add({
            targets: this.detailPanel,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => this.detailPanel.setVisible(false)
        });
    }

    createNavigation(W, H) {
        const navY = H - 65;

        const navBg = this.add.graphics();
        navBg.fillStyle(0x05100a, 0.9);
        navBg.fillRect(24, navY - 10, W - 48, 50);
        navBg.lineStyle(1, 0x00ff66, 0.5);
        navBg.strokeRect(24, navY - 10, W - 48, 50);

        const prevBtnBg = this.add.graphics();
        prevBtnBg.fillStyle(0x081a10, 1);
        prevBtnBg.fillRect(45, navY, 120, 32);
        prevBtnBg.lineStyle(1, 0x00ff66, 0.6);
        prevBtnBg.strokeRect(45, navY, 120, 32);

        this.prevBtnText = this.add.text(105, navY + 16, '◄ PREV', {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: '#00ff66'
        }).setOrigin(0.5, 0.5);

        const prevZone = this.add.zone(45, navY, 120, 32).setOrigin(0, 0).setInteractive();
        prevZone.on('pointerdown', () => this.prevPage());
        prevZone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
        prevZone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

        this.pageText = this.add.text(W / 2, navY + 16, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#00ff66'
        }).setOrigin(0.5, 0.5);

        const nextBtnBg = this.add.graphics();
        nextBtnBg.fillStyle(0x081a10, 1);
        nextBtnBg.fillRect(W - 165, navY, 120, 32);
        nextBtnBg.lineStyle(1, 0x00ff66, 0.6);
        nextBtnBg.strokeRect(W - 165, navY, 120, 32);

        this.nextBtnText = this.add.text(W - 105, navY + 16, 'NEXT ►', {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: '#00ff66'
        }).setOrigin(0.5, 0.5);

        const nextZone = this.add.zone(W - 165, navY, 120, 32).setOrigin(0, 0).setInteractive();
        nextZone.on('pointerdown', () => this.nextPage());
        nextZone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
        nextZone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

        this.updateNavButtons();
    }

    updateNavButtons() {
        const total = this.filteredSuspects.length;
        const totalPages = Math.ceil(total / this.CARDS_PER_PAGE);
        const currentPage = this.currentPage + 1;

        if (this.pageText) {
            this.pageText.setText(`PAGE ${currentPage} / ${Math.max(1, totalPages)}`);
        }
        if (this.prevBtnText) {
            this.prevBtnText.setAlpha(this.currentPage > 0 ? 1 : 0.3);
        }
        if (this.nextBtnText) {
            this.nextBtnText.setAlpha(this.currentPage < totalPages - 1 ? 1 : 0.3);
        }
    }

    prevPage() {
        if (this.isPaging) return;
        if (this.currentPage > 0) {
            this.currentPage--;
            this.refreshPage();
        }
    }

    nextPage() {
        if (this.isPaging) return;
        const totalPages = Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.refreshPage();
        }
    }

    createBackButton(W, H) {
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x081a10, 1);
        btnBg.fillRect(W - 220, 40, 180, 40);
        btnBg.lineStyle(1, 0x00ff66, 0.8);
        btnBg.strokeRect(W - 220, 40, 180, 40);

        this.add.text(W - 130, 60, '[ESC] EXIT', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#00ff66'
        }).setOrigin(0.5, 0.5);

        const zone = this.add.zone(W - 220, 40, 180, 40).setOrigin(0, 0).setInteractive();
        zone.on('pointerdown', () => this.closeAndReturnToOffice());
        zone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x00ff66, 0.2);
            btnBg.fillRect(W - 220, 40, 180, 40);
            btnBg.lineStyle(1, 0x00ff66, 1);
            btnBg.strokeRect(W - 220, 40, 180, 40);
            this.game.canvas.style.cursor = 'pointer';
        });
        zone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x081a10, 1);
            btnBg.fillRect(W - 220, 40, 180, 40);
            btnBg.lineStyle(1, 0x00ff66, 0.8);
            btnBg.strokeRect(W - 220, 40, 180, 40);
            this.game.canvas.style.cursor = 'default';
        });
    }

    closeAndReturnToOffice() {
        if (this.scene.isSleeping('UIScene')) {
            this.scene.wake('UIScene');
        }
        this.scene.stop();
        this.scene.resume('OfficeScene');
    }

    cleanupScene() {
        this.input.keyboard.off('keydown-ESC', this.handleEsc, this);

        if (this.crtFlickerEvent) {
            this.crtFlickerEvent.remove(false);
            this.crtFlickerEvent = null;
        }

        if (this.cardContainer) {
            this.cardContainer.removeAll(true);
        }

        this.loadedSuspectTextures.clear();
        this.isPaging = false;
    }
}