export class WantedDatabaseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WantedDatabaseScene' });
        this.suspects = [];
        this.currentIndex = 0;
        this.cards = [];
        this.selectedCard = null;
        this.CARDS_PER_PAGE = 10; // 2 rzędy po 5
        this.currentPage = 0;
        this.detailPanel = null;
        this.searchQuery = '';
        this.filterGender = 'all';
        this.filteredSuspects = [];
    }

    preload() {
        // Suspects images - ładuj z assets/suspects/
        const suspectIds = [
            'garett_gutter', 'sofia_vargas', 'bert_goodman', 'anne_apple',
            'frank_groot', 'bernard_porter', 'rebecca_muller', 'jacek_kowalski',
            'pablo_fernandez', 'alexandra_ivanova', 'sergei_petrov', 'isabella_rossi',
            'liam_oconnor', 'ava_thompson', 'maximilian_schmidt', 'brendan_ross',
            'bai_williams', 'albert_johnson', 'anna_bocian', 'aleksander_petrov',
            'marie_dubois', 'lotte_chantal'
        ];

        suspectIds.forEach((id, index) => {
            this.load.image(`wanted_${id}`, `assets/suspects/${index + 1}.jpg`);
        });

        this.load.json('suspects', 'assets/data/suspects.json');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.suspects = this.cache.json.get('suspects');
        this.filteredSuspects = [...this.suspects];

        // --- Tło: stara tablica korkowa ---
        this.createBackground(W, H);

        // --- Nagłówek ---
        this.createHeader(W);

        // --- Panel filtrów ---
        this.createFilterPanel(W);

        // --- Siatka kart ---
        this.cardContainer = this.add.container(0, 0);
        this.renderCards(W, H);

        // --- Przyciski nawigacji ---
        this.createNavigation(W, H);

        // --- Panel szczegółów (ukryty na start) ---
        this.detailPanel = this.createDetailPanel(W, H);
        this.detailPanel.setVisible(false);

        // --- Zamknięcie sceny (przycisk WRÓĆ) ---
        this.createBackButton(W, H);

        // --- Input klawiaturowy do zamykania detail ---
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.detailPanel.visible) {
                this.closeDetailPanel();
            }
        });
    }

    createBackground(W, H) {
        // Ciemnozielone tło jak stara tablica ogłoszeń
        this.add.rectangle(0, 0, W, H, 0x1a0e05).setOrigin(0, 0);

        // Tekstura korkowa - losowe plamki
        const corkGraphics = this.add.graphics();
        for (let i = 0; i < 300; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H);
            const alpha = Phaser.Math.FloatBetween(0.02, 0.08);
            corkGraphics.fillStyle(0xc8a96e, alpha);
            corkGraphics.fillCircle(x, y, Phaser.Math.Between(1, 4));
        }

        // Zewnętrzna ramka drewniana
        const frame = this.add.graphics();
        frame.lineStyle(18, 0x5c3a1e, 1);
        frame.strokeRect(9, 9, W - 18, H - 18);
        frame.lineStyle(4, 0x8b5c2a, 1);
        frame.strokeRect(20, 20, W - 40, H - 40);

        // Wewnętrzne tło tablicy (ciemniejsze)
        frame.fillStyle(0x2a1a08, 0.7);
        frame.fillRect(28, 28, W - 56, H - 56);
    }

    createHeader(W) {
        // Tło nagłówka
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x8b0000, 1);
        headerBg.fillRect(28, 28, W - 56, 80);
        headerBg.lineStyle(3, 0xcc0000, 1);
        headerBg.strokeRect(28, 28, W - 56, 80);

        // Ikony gwiazdek po bokach (retro)
        const starStyle = { fontFamily: 'PressStart2P', fontSize: '16px', color: '#FFD700' };
        this.add.text(60, 68, '★', starStyle).setOrigin(0.5, 0.5);
        this.add.text(W - 60, 68, '★', starStyle).setOrigin(0.5, 0.5);

        // Tytuł główny
        this.add.text(W / 2, 52, 'MOST WANTED', {
            fontFamily: 'PressStart2P',
            fontSize: '22px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0.5);

        // Podtytuł
        this.add.text(W / 2, 80, 'INTERNATIONAL CRIMINAL DATABASE', {
            fontFamily: 'SpecialElite',
            fontSize: '13px',
            color: '#ffcc88',
            letterSpacing: 3
        }).setOrigin(0.5, 0.5);
    }

    createFilterPanel(W) {
        const panelY = 115;

        // Tło panelu filtrów
        const filterBg = this.add.graphics();
        filterBg.fillStyle(0x0d0700, 0.8);
        filterBg.fillRoundedRect(28, panelY, W - 56, 45, 4);
        filterBg.lineStyle(1, 0x5c3a1e, 0.8);
        filterBg.strokeRoundedRect(28, panelY, W - 56, 45, 4);

        // Etykieta filtra
        this.add.text(50, panelY + 22, 'FILTER:', {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#aa8866'
        }).setOrigin(0, 0.5);

        // Przyciski filtrów płci
        const filters = [
            { label: 'ALL', value: 'all', x: 140 },
            { label: 'MALE', value: 'm', x: 210 },
            { label: 'FEMALE', value: 'f', x: 280 },
            { label: 'NON-BINARY', value: 'nb', x: 390 }
        ];

        this.filterButtonGraphics = [];
        this.filterButtonTexts = [];
        this.filterMeta = filters;
        this.filterPanelY = panelY;

        filters.forEach((f, idx) => {
            const isActive = this.filterGender === f.value;
            const btnWidth = 60 + (f.label.length > 6 ? 40 : 0);

            const btn = this.add.graphics();
            btn.fillStyle(isActive ? 0x8b0000 : 0x2a1a08, 1);
            btn.fillRoundedRect(f.x - 30, panelY + 8, btnWidth, 28, 3);
            btn.lineStyle(1, isActive ? 0xff4444 : 0x5c3a1e, 1);
            btn.strokeRoundedRect(f.x - 30, panelY + 8, btnWidth, 28, 3);

            const zone = this.add.zone(f.x - 30, panelY + 8, btnWidth, 28).setOrigin(0, 0).setInteractive();
            const btnText = this.add.text(f.x - 30 + btnWidth / 2, panelY + 22, f.label, {
                fontFamily: 'PressStart2P',
                fontSize: '7px',
                color: isActive ? '#FFD700' : '#aa8866'
            }).setOrigin(0.5, 0.5);

            zone.on('pointerdown', () => {
                this.filterGender = f.value;
                this.currentPage = 0;
                this.applyFilters();
                this.refreshFilterButtons();
            });
            zone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
            zone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

            this.filterButtonGraphics.push({ btn, btnWidth, f });
            this.filterButtonTexts.push(btnText);
        });

        // Licznik wyników
        this.counterText = this.add.text(W - 80, panelY + 22, `${this.suspects.length} SUSPECTS`, {
            fontFamily: 'SpecialElite',
            fontSize: '11px',
            color: '#888866'
        }).setOrigin(1, 0.5);
    }

    refreshFilterButtons() {
        const panelY = this.filterPanelY;
        this.filterButtonGraphics.forEach(({ btn, btnWidth, f }, idx) => {
            const isActive = this.filterGender === f.value;
            btn.clear();
            btn.fillStyle(isActive ? 0x8b0000 : 0x2a1a08, 1);
            btn.fillRoundedRect(f.x - 30, panelY + 8, btnWidth, 28, 3);
            btn.lineStyle(1, isActive ? 0xff4444 : 0x5c3a1e, 1);
            btn.strokeRoundedRect(f.x - 30, panelY + 8, btnWidth, 28, 3);
            this.filterButtonTexts[idx].setColor(isActive ? '#FFD700' : '#aa8866');
        });
        this.renderCards(this.scale.width, this.scale.height);
    }

    applyFilters() {
        this.filteredSuspects = this.suspects.filter(s => {
            const genderMatch = this.filterGender === 'all' || s.gender_code === this.filterGender;
            const searchMatch = this.searchQuery === '' ||
                s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                s.skills.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                s.accent.toLowerCase().includes(this.searchQuery.toLowerCase());
            return genderMatch && searchMatch;
        });

        if (this.counterText) {
            this.counterText.setText(`${this.filteredSuspects.length} SUSPECTS`);
        }
    }

    renderCards(W, H) {
        // Wyczyść poprzednie karty
        this.cardContainer.removeAll(true);
        this.cards = [];

        const startX = 55;
        const startY = 175;
        const cardW = 145;
        const cardH = 200;
        const colGap = 22;
        const rowGap = 20;
        const COLS = 5;

        const pageStart = this.currentPage * this.CARDS_PER_PAGE;
        const pageEnd = Math.min(pageStart + COLS * 2, this.filteredSuspects.length);
        const pageSuspects = this.filteredSuspects.slice(pageStart, pageEnd);

        pageSuspects.forEach((suspect, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = startX + col * (cardW + colGap);
            const y = startY + row * (cardH + rowGap);

            const card = this.createWantedCard(suspect, x, y, cardW, cardH);
            this.cardContainer.add(card.elements);
            this.cards.push(card);
        });

        // Puste miejsca (jeśli niepełna strona)
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

    createWantedCard(suspect, x, y, cardW, cardH) {
        const elements = [];

        // Cień karty (efekt pinezki)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRect(x + 3, y + 3, cardW, cardH);
        elements.push(shadow);

        // Tło karty - papier z pożółknieniem
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xf5e6c8, 1);
        cardBg.fillRect(x, y, cardW, cardH);
        cardBg.fillStyle(0xd4b896, 0.3);
        cardBg.fillCircle(x + 20, y + 30, 15);
        cardBg.fillCircle(x + cardW - 15, y + cardH - 20, 10);
        cardBg.lineStyle(2, 0x8b6343, 1);
        cardBg.strokeRect(x, y, cardW, cardH);
        elements.push(cardBg);

        // Czerwona linia na górze (jak prawdziwy wanted poster)
        const topBar = this.add.graphics();
        topBar.fillStyle(0xcc0000, 1);
        topBar.fillRect(x, y, cardW, 22);
        elements.push(topBar);

        // Napis WANTED
        const wantedLabel = this.add.text(x + cardW / 2, y + 11, 'WANTED', {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5);
        elements.push(wantedLabel);

        // Pinezka (czerwona kropka na górze)
        const pin = this.add.graphics();
        pin.fillStyle(0xff2222, 1);
        pin.fillCircle(x + cardW / 2, y + 2, 5);
        pin.fillStyle(0xff8888, 0.7);
        pin.fillCircle(x + cardW / 2 - 1, y + 1, 2);
        elements.push(pin);

        // Zdjęcie podejrzanego
        const imgKey = `wanted_${suspect.id}`;
        const photoY = y + 28;
        const photoH = 95;

        if (this.textures.exists(imgKey)) {
            const img = this.add.image(x + cardW / 2, photoY + photoH / 2, imgKey);
            img.setDisplaySize(cardW - 12, photoH);
            elements.push(img);

            const photoFrame = this.add.graphics();
            photoFrame.lineStyle(2, 0x8b6343, 1);
            photoFrame.strokeRect(x + 6, photoY, cardW - 12, photoH);
            elements.push(photoFrame);
        } else {
            const placeholder = this.add.graphics();
            placeholder.fillStyle(0xc8a96e, 1);
            placeholder.fillRect(x + 6, photoY, cardW - 12, photoH);
            placeholder.lineStyle(2, 0x8b6343, 1);
            placeholder.strokeRect(x + 6, photoY, cardW - 12, photoH);
            elements.push(placeholder);

            const qMark = this.add.text(x + cardW / 2, photoY + photoH / 2, '?', {
                fontFamily: 'PressStart2P', fontSize: '32px', color: '#8b6343'
            }).setOrigin(0.5, 0.5);
            elements.push(qMark);
        }

        // Numer akt
        const caseNum = this.add.text(x + 8, photoY + 3, `#${String(suspect.wantedKey).padStart(3, '0')}`, {
            fontFamily: 'SpecialElite',
            fontSize: '9px',
            color: '#ffffff',
            backgroundColor: '#cc0000',
            padding: { x: 3, y: 1 }
        }).setOrigin(0, 0);
        elements.push(caseNum);

        // Imię podejrzanego
        const nameY = y + 28 + photoH + 8;
        const nameText = this.add.text(x + cardW / 2, nameY, suspect.name.toUpperCase(), {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#1a0800',
            align: 'center',
            wordWrap: { width: cardW - 12 }
        }).setOrigin(0.5, 0);
        elements.push(nameText);

        // Linia oddzielająca
        const divider = this.add.graphics();
        divider.lineStyle(1, 0x8b6343, 0.6);
        divider.lineBetween(x + 6, nameY + 22, x + cardW - 6, nameY + 22);
        elements.push(divider);

        // Akcent (narodowość)
        const infoY = nameY + 28;
        const infoText = this.add.text(x + cardW / 2, infoY, `${suspect.accent.toUpperCase()}`, {
            fontFamily: 'SpecialElite',
            fontSize: '10px',
            color: '#5c3a1e',
            align: 'center'
        }).setOrigin(0.5, 0);
        elements.push(infoText);

        // Główna umiejętność
        const mainSkill = suspect.skills.split(',')[0].trim();
        const skillText = this.add.text(x + cardW / 2, infoY + 16, mainSkill.toUpperCase(), {
            fontFamily: 'SpecialElite',
            fontSize: '9px',
            color: '#8b0000',
            align: 'center',
            wordWrap: { width: cardW - 12 }
        }).setOrigin(0.5, 0);
        elements.push(skillText);

        // Interaktywna strefa - cała karta
        const zone = this.add.zone(x, y, cardW, cardH).setOrigin(0, 0).setInteractive();

        zone.on('pointerover', () => {
            cardBg.clear();
            cardBg.fillStyle(0xfff0d0, 1);
            cardBg.fillRect(x, y, cardW, cardH);
            cardBg.lineStyle(3, 0xcc0000, 1);
            cardBg.strokeRect(x, y, cardW, cardH);
            this.game.canvas.style.cursor = 'pointer';

            shadow.clear();
            shadow.fillStyle(0x000000, 0.7);
            shadow.fillRect(x + 5, y + 5, cardW, cardH);
        });

        zone.on('pointerout', () => {
            cardBg.clear();
            cardBg.fillStyle(0xf5e6c8, 1);
            cardBg.fillRect(x, y, cardW, cardH);
            cardBg.fillStyle(0xd4b896, 0.3);
            cardBg.fillCircle(x + 20, y + 30, 15);
            cardBg.lineStyle(2, 0x8b6343, 1);
            cardBg.strokeRect(x, y, cardW, cardH);
            this.game.canvas.style.cursor = 'default';

            shadow.clear();
            shadow.fillStyle(0x000000, 0.5);
            shadow.fillRect(x + 3, y + 3, cardW, cardH);
        });

        zone.on('pointerdown', () => {
            this.showDetailPanel(suspect);
        });

        elements.push(zone);
        return { elements, suspect };
    }

    createEmptySlot(x, y, cardW, cardH) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x3a2010, 0.4);
        g.strokeRoundedRect(x, y, cardW, cardH, 4);

        const emptyLabel = this.add.text(x + cardW / 2, y + cardH / 2, 'EMPTY\nFILE', {
            fontFamily: 'PressStart2P',
            fontSize: '7px',
            color: '#3a2010',
            align: 'center'
        }).setOrigin(0.5, 0.5).setAlpha(0.4);

        return g;
    }

    createDetailPanel(W, H) {
        const panel = this.add.container(0, 0);
        panel.setDepth(100);

        // Overlay ciemny
        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0, 0);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.closeDetailPanel());
        panel.add(overlay);

        // Wymiary panelu
        const PW = 700;
        const PH = 520;
        const PX = (W - PW) / 2;
        const PY = (H - PH) / 2;

        // Cień panelu
        const panelShadow = this.add.graphics();
        panelShadow.fillStyle(0x000000, 0.8);
        panelShadow.fillRect(PX + 8, PY + 8, PW, PH);
        panel.add(panelShadow);

        // Tło panelu - stary papier
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0xf0ddb8, 1);
        panelBg.fillRect(PX, PY, PW, PH);
        panelBg.fillStyle(0xc8a47a, 0.2);
        panelBg.fillCircle(PX + 50, PY + 80, 40);
        panelBg.fillCircle(PX + PW - 60, PY + PH - 60, 50);
        panelBg.lineStyle(4, 0x8b5c2a, 1);
        panelBg.strokeRect(PX, PY, PW, PH);
        panelBg.lineStyle(1, 0x8b5c2a, 0.4);
        panelBg.strokeRect(PX + 10, PY + 10, PW - 20, PH - 20);
        panel.add(panelBg);

        // Czerwony pasek nagłówka
        const detailHeader = this.add.graphics();
        detailHeader.fillStyle(0x8b0000, 1);
        detailHeader.fillRect(PX, PY, PW, 55);
        panel.add(detailHeader);

        const dossierTitle = this.add.text(PX + PW / 2, PY + 20, '★ CONFIDENTIAL DOSSIER ★', {
            fontFamily: 'PressStart2P',
            fontSize: '11px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5);
        panel.add(dossierTitle);

        const dossierSub = this.add.text(PX + PW / 2, PY + 40, 'LOST ARTIFACTS INTERNATIONAL DETECTIVE AGENCY', {
            fontFamily: 'SpecialElite',
            fontSize: '10px',
            color: '#ffcc88'
        }).setOrigin(0.5, 0.5);
        panel.add(dossierSub);

        // Zdjęcie podejrzanego (duże)
        this.detailPhoto = this.add.image(PX + 30 + 130, PY + 80 + 150, '__DEFAULT').setVisible(false);
        this.detailPhoto.setDisplaySize(260, 300);
        panel.add(this.detailPhoto);

        // Ramka zdjęcia
        const photoFrame = this.add.graphics();
        photoFrame.lineStyle(4, 0x8b5c2a, 1);
        photoFrame.strokeRect(PX + 30, PY + 80, 260, 300);
        const corners = [
            [PX + 25, PY + 75, 20, 20],
            [PX + 300, PY + 75, -20, 20],
            [PX + 25, PY + 390, 20, -20],
            [PX + 300, PY + 390, -20, -20]
        ];
        corners.forEach(([cx, cy, dx, dy]) => {
            photoFrame.lineBetween(cx, cy, cx + dx, cy);
            photoFrame.lineBetween(cx, cy, cx, cy + dy);
        });
        panel.add(photoFrame);

        // WANTED stamp na zdjęciu
        this.detailWantedStamp = this.add.text(PX + 30 + 130, PY + 80 + 260, 'WANTED', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#cc0000',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setAngle(-20).setAlpha(0.75);
        panel.add(this.detailWantedStamp);

        // Linia pionowa oddzielająca
        const divLine = this.add.graphics();
        divLine.lineStyle(2, 0x8b5c2a, 0.6);
        divLine.lineBetween(PX + 310, PY + 70, PX + 310, PY + PH - 20);
        panel.add(divLine);

        // --- Prawa kolumna: info tekstowe ---
        const infoX = PX + 330;
        const infoStartY = PY + 75;
        const lineH = 32;

        // Nazwa podejrzanego
        this.detailName = this.add.text(infoX, infoStartY, '', {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: '#1a0800',
            wordWrap: { width: PW - 340 }
        }).setOrigin(0, 0);
        panel.add(this.detailName);

        // Separator pod nazwą
        const sep = this.add.graphics();
        sep.lineStyle(2, 0x8b0000, 1);
        sep.lineBetween(infoX, infoStartY + 40, PX + PW - 30, infoStartY + 40);
        panel.add(sep);

        // Pola danych
        const fields = ['gender', 'race', 'hair', 'eyes', 'features', 'accent'];
        const fieldLabels = ['GENDER', 'RACE', 'HAIR', 'EYES', 'FEATURES', 'ACCENT'];

        this.detailFields = {};
        fields.forEach((field, i) => {
            const fy = infoStartY + 55 + i * lineH;

            const fieldLabel = this.add.text(infoX, fy, `${fieldLabels[i]}:`, {
                fontFamily: 'PressStart2P',
                fontSize: '7px',
                color: '#8b0000'
            }).setOrigin(0, 0);
            panel.add(fieldLabel);

            this.detailFields[field] = this.add.text(infoX + 110, fy, '', {
                fontFamily: 'SpecialElite',
                fontSize: '14px',
                color: '#2a1a08'
            }).setOrigin(0, 0);
            panel.add(this.detailFields[field]);
        });

        // Sekcja SKILLS
        const skillsY = infoStartY + 55 + fields.length * lineH + 5;
        const skillsBg = this.add.graphics();
        skillsBg.fillStyle(0x8b0000, 0.12);
        skillsBg.fillRoundedRect(infoX - 5, skillsY - 5, PW - 340, 75, 4);
        skillsBg.lineStyle(1, 0x8b0000, 0.4);
        skillsBg.strokeRoundedRect(infoX - 5, skillsY - 5, PW - 340, 75, 4);
        panel.add(skillsBg);

        const skillsLabel = this.add.text(infoX, skillsY, 'KNOWN SKILLS:', {
            fontFamily: 'PressStart2P',
            fontSize: '7px',
            color: '#8b0000'
        }).setOrigin(0, 0);
        panel.add(skillsLabel);

        this.detailSkills = this.add.text(infoX, skillsY + 18, '', {
            fontFamily: 'SpecialElite',
            fontSize: '13px',
            color: '#1a0800',
            wordWrap: { width: PW - 350 }
        }).setOrigin(0, 0);
        panel.add(this.detailSkills);

        // Sekcja HABITUS
        const habitY = skillsY + 80;
        const habitBg = this.add.graphics();
        habitBg.fillStyle(0x1a4400, 0.1);
        habitBg.fillRoundedRect(infoX - 5, habitY - 5, PW - 340, 60, 4);
        habitBg.lineStyle(1, 0x336600, 0.4);
        habitBg.strokeRoundedRect(infoX - 5, habitY - 5, PW - 340, 60, 4);
        panel.add(habitBg);

        const habitLabel = this.add.text(infoX, habitY, 'KNOWN HABITS:', {
            fontFamily: 'PressStart2P',
            fontSize: '7px',
            color: '#336600'
        }).setOrigin(0, 0);
        panel.add(habitLabel);

        this.detailHabitus = this.add.text(infoX, habitY + 18, '', {
            fontFamily: 'SpecialElite',
            fontSize: '13px',
            color: '#1a3300',
            wordWrap: { width: PW - 350 }
        }).setOrigin(0, 0);
        panel.add(this.detailHabitus);

        // Numer akt na dole
        this.detailCaseNum = this.add.text(PX + 30, PY + PH - 35, '', {
            fontFamily: 'SpecialElite',
            fontSize: '11px',
            color: '#8b5c2a'
        }).setOrigin(0, 0);
        panel.add(this.detailCaseNum);

        // Stempel CLASSIFIED
        const classifiedStamp = this.add.text(PX + PW - 40, PY + PH - 40, 'CLASSIFIED', {
            fontFamily: 'PressStart2P',
            fontSize: '9px',
            color: '#cc0000'
        }).setOrigin(1, 1).setAngle(-10).setAlpha(0.5);
        panel.add(classifiedStamp);

        // Przycisk zamknięcia [X]
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0x8b0000, 1);
        closeBtnBg.fillRect(PX + PW - 40, PY + 5, 35, 35);
        closeBtnBg.lineStyle(2, 0xcc4444, 1);
        closeBtnBg.strokeRect(PX + PW - 40, PY + 5, 35, 35);
        panel.add(closeBtnBg);

        const closeBtn = this.add.text(PX + PW - 23, PY + 23, '✕', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#FFD700'
        }).setOrigin(0.5, 0.5);
        panel.add(closeBtn);

        const closeZone = this.add.zone(PX + PW - 40, PY + 5, 35, 35).setOrigin(0, 0).setInteractive();
        closeZone.on('pointerdown', () => this.closeDetailPanel());
        closeZone.on('pointerover', () => {
            closeBtnBg.clear();
            closeBtnBg.fillStyle(0xcc0000, 1);
            closeBtnBg.fillRect(PX + PW - 40, PY + 5, 35, 35);
            this.game.canvas.style.cursor = 'pointer';
        });
        closeZone.on('pointerout', () => {
            closeBtnBg.clear();
            closeBtnBg.fillStyle(0x8b0000, 1);
            closeBtnBg.fillRect(PX + PW - 40, PY + 5, 35, 35);
            this.game.canvas.style.cursor = 'default';
        });
        panel.add(closeZone);

        return panel;
    }

    showDetailPanel(suspect) {
        this.detailName.setText(suspect.name.toUpperCase());

        const fields = ['gender', 'race', 'hair', 'eyes', 'features', 'accent'];
        fields.forEach(f => {
            if (this.detailFields[f]) {
                this.detailFields[f].setText(suspect[f]);
            }
        });

        this.detailSkills.setText(suspect.skills);
        this.detailHabitus.setText(suspect.habitus);
        this.detailCaseNum.setText(
            `CASE FILE: #${String(suspect.wantedKey).padStart(3, '0')} | ID: ${suspect.id.toUpperCase()}`
        );

        // Ustaw zdjęcie
        const imgKey = `wanted_${suspect.id}`;
        if (this.textures.exists(imgKey)) {
            this.detailPhoto.setTexture(imgKey).setVisible(true);
        } else {
            this.detailPhoto.setVisible(false);
        }

        // Animacja wejścia
        this.detailPanel.setVisible(true);
        this.detailPanel.setAlpha(0);
        this.tweens.add({
            targets: this.detailPanel,
            alpha: 1,
            duration: 200,
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
        const navY = H - 55;

        // Pasek nawigacji
        const navBg = this.add.graphics();
        navBg.fillStyle(0x0d0700, 0.9);
        navBg.fillRect(28, navY - 10, W - 56, 50);
        navBg.lineStyle(1, 0x5c3a1e, 0.8);
        navBg.strokeRect(28, navY - 10, W - 56, 50);

        // Przycisk POPRZEDNIA
        const prevBtnBg = this.add.graphics();
        prevBtnBg.fillStyle(0x5c1a00, 1);
        prevBtnBg.fillRoundedRect(50, navY, 100, 30, 4);
        prevBtnBg.lineStyle(1, 0x8b2a00, 1);
        prevBtnBg.strokeRoundedRect(50, navY, 100, 30, 4);

        this.prevBtnText = this.add.text(100, navY + 15, '◄ PREV', {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#ffaa44'
        }).setOrigin(0.5, 0.5);

        const prevZone = this.add.zone(50, navY, 100, 30).setOrigin(0, 0).setInteractive();
        prevZone.on('pointerdown', () => this.prevPage());
        prevZone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
        prevZone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

        // Tekst strony
        this.pageText = this.add.text(W / 2, navY + 15, '', {
            fontFamily: 'SpecialElite',
            fontSize: '13px',
            color: '#aa8844'
        }).setOrigin(0.5, 0.5);

        // Przycisk NASTĘPNA
        const nextBtnBg = this.add.graphics();
        nextBtnBg.fillStyle(0x5c1a00, 1);
        nextBtnBg.fillRoundedRect(W - 150, navY, 100, 30, 4);
        nextBtnBg.lineStyle(1, 0x8b2a00, 1);
        nextBtnBg.strokeRoundedRect(W - 150, navY, 100, 30, 4);

        this.nextBtnText = this.add.text(W - 100, navY + 15, 'NEXT ►', {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#ffaa44'
        }).setOrigin(0.5, 0.5);

        const nextZone = this.add.zone(W - 150, navY, 100, 30).setOrigin(0, 0).setInteractive();
        nextZone.on('pointerdown', () => this.nextPage());
        nextZone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
        nextZone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

        this.prevBtnBg = prevBtnBg;
        this.nextBtnBg = nextBtnBg;
        this.navY = navY;

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
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderCards(this.scale.width, this.scale.height);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.renderCards(this.scale.width, this.scale.height);
        }
    }

    createBackButton(W, H) {
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x1a0800, 1);
        btnBg.fillRoundedRect(W - 185, 33, 155, 36, 4);
        btnBg.lineStyle(2, 0x8b5c2a, 1);
        btnBg.strokeRoundedRect(W - 185, 33, 155, 36, 4);

        const backBtn = this.add.text(W - 107, 51, '⬅ BACK TO OFFICE', {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#aa8844'
        }).setOrigin(0.5, 0.5);

        const zone = this.add.zone(W - 185, 33, 155, 36).setOrigin(0, 0).setInteractive();
        zone.on('pointerdown', () => {
            // Powrót do sceny biura - zmień 'OfficeScene' na właściwą nazwę
            this.scene.start('OfficeScene');
        });
        zone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x3a1800, 1);
            btnBg.fillRoundedRect(W - 185, 33, 155, 36, 4);
            btnBg.lineStyle(2, 0xcc8844, 1);
            btnBg.strokeRoundedRect(W - 185, 33, 155, 36, 4);
            this.game.canvas.style.cursor = 'pointer';
        });
        zone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x1a0800, 1);
            btnBg.fillRoundedRect(W - 185, 33, 155, 36, 4);
            btnBg.lineStyle(2, 0x8b5c2a, 1);
            btnBg.strokeRoundedRect(W - 185, 33, 155, 36, 4);
            this.game.canvas.style.cursor = 'default';
        });
    }
}