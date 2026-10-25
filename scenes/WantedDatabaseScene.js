import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

/* ============================================================
   CONSTANTS
   ============================================================ */

const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite, "Courier New", monospace';

const toCss = (n) => `#${n.toString(16).padStart(6, '0')}`;

const THEME_DEFS = {
    green: {
        label: 'GREEN',
        main: 0x00ff66,
        hi: 0xb8ffd2,
        mid: 0x00cc55,
        dim: 0x00883d,
        bg: 0x030a05,
        panel: 0x061509,
        panelAlt: 0x0b2415,
        hover: 0x134a2c,
        shadow: 0x003311
    },
    amber: {
        label: 'AMBER',
        main: 0xffb000,
        hi: 0xffe39a,
        mid: 0xd98f00,
        dim: 0x8a5a00,
        bg: 0x0a0600,
        panel: 0x150d02,
        panelAlt: 0x241705,
        hover: 0x4a3008,
        shadow: 0x332200
    }
};

function buildTheme(key) {
    const def = THEME_DEFS[key] || THEME_DEFS.green;

    return {
        ...def,
        key: THEME_DEFS[key] ? key : 'green',
        alert: 0xff4d4d,
        sMain: toCss(def.main),
        sHi: toCss(def.hi),
        sMid: toCss(def.mid),
        sDim: toCss(def.dim),
        sShadow: toCss(def.shadow),
        sAlert: '#ff4d4d'
    };
}

function strHash(str) {
    let h = 5381;
    const s = String(str);

    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }

    return h;
}

const GENDER_FILTERS = [
    { label: 'ALL', value: 'all' },
    { label: 'MALE', value: 'm' },
    { label: 'FEMALE', value: 'f' },
    { label: 'NON-BINARY', value: 'nb' }
];

const STATUS_FILTERS = [
    { label: 'ALL', value: 'all' },
    { label: 'FLAGGED', value: 'flag' },
    { label: 'CLEARED', value: 'clear' },
    { label: 'UNSORTED', value: 'none' }
];

const SORT_MODES = [
    { label: 'FILE #', key: 'file' },
    { label: 'NAME A-Z', key: 'az' },
    { label: 'NAME Z-A', key: 'za' }
];

const DETAIL_FIELDS = [
    'gender',
    'race',
    'hair',
    'eyes',
    'features',
    'accent'
];

const MARGIN_NOTES = [
    'Suspect denies everything. Suspiciously well-rehearsed.',
    'Do NOT make eye contact. Or do. Reports conflict.',
    'Last seen near a getaway vehicle. Or a bus. Hard to say.',
    'Known to carry a very large bag. Bags are large.',
    'Claims to be "just a collector". Of other people\'s things.',
    'Wears a disguise. The disguise is a fake mustache. It is excellent.',
    'Approach with caution. And snacks.',
    'Alibi: "I was at my aunt\'s." Aunt has not been located.',
    'Probably guilty. Statistically, somebody is.',
    'If found, do not mention the mustache.',
    'Once escaped through a revolving door. Twice. Same door.',
    'Has a suspiciously clean criminal record. Too clean. Who cleans it?'
];

const TICKER_ITEMS = [
    'BREAKING: CURATOR INSISTS THE MUSEUM WAS "ALREADY LIKE THAT"',
    'REMINDER: A FAKE MUSTACHE IS NOT AN ALIBI',
    'WARNING: SUSPECTS MAY BE ARMED, DANGEROUS, OR JUST RUDE',
    'TIP LINE OPEN: 1-800-NOT-ME-OFFICER',
    'INTERPOL REMINDS YOU THAT PIGEONS ARE NOT RELIABLE WITNESSES',
    'DO NOT SPILL COFFEE ON THE MAINFRAME (AGAIN)',
    'STOLEN: ONE (1) PRICELESS ARTIFACT. SUSPECTED: EVERYBODY',
    'LOCAL PAWN SHOP DENIES EVER HAVING SEEN ANYTHING SHINY',
    'CLEARANCE LEVEL "DETECTIVE" NOW INCLUDES FREE PENCIL'
];

/* ============================================================
   SCENE
   ============================================================ */

export class WantedDatabaseScene extends BaseScene {
    constructor() {
        super({ key: 'WantedDatabaseScene' });

        this.gameState = {};
        this.CARDS_PER_PAGE = 10;
        this.currentPage = 0;
        this.searchQuery = '';
        this.filterGender = 'all';
        this.filterStatus = 'all';
        this.sortIndex = 0;
    }

    init(data = {}) {
        this.gameState = data.gameState || this.gameState || {};
        this.restoreUi = data.ui || null;
        this.noBoot = !!data.skipBoot;
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
        this.booting = false;
        this.listDirty = false;
        this.detailIndex = -1;

        this.cards = [];
        this.cardFilters = [];
        this.detailFilter = null;
        this.typeTweens = [];
        this.bootEvents = [];
        this.masks = [];
        this.selectedCard = null;

        if (!this.gameState.suspectStatus) {
            this.gameState.suspectStatus = {};
        }

        const ui = this.restoreUi || {};

        this.currentPage = ui.page || 0;
        this.searchQuery = ui.search || '';
        this.filterGender = ui.gender || 'all';
        this.filterStatus = ui.status || 'all';
        this.sortIndex = ui.sort || 0;

        this.themeKey = this.registry.get('wantedDbTheme') || 'green';
        this.th = buildTheme(this.themeKey);

        this.photoFilterOn =
            this.registry.get('wantedDbPhotoFilter') !== false;

        this.fxSupported =
            this.renderer?.type === Phaser.WEBGL;

        const cachedSuspects = this.cache.json.get('suspects');

        this.suspects = Array.isArray(cachedSuspects)
            ? cachedSuspects.map((s, i) => ({ ...s, __i: i }))
            : [];

        this.filteredSuspects = [...this.suspects];

        const W = this.scale.width;
        const H = this.scale.height;

        this.applyFilters();

        this.createBackground(W, H);
        this.createCRTEffects(W, H);
        this.createHeader(W);
        this.createFilterPanel(W);

        this.cardContainer = this.add.container(0, 0);

        this.createNavigation(W, H);
        this.createTicker(W, H);

        this.detailPanel = this.createDetailPanel(W, H);
        this.detailPanel.setVisible(false);

        this.helpPanel = this.createHelpPanel(W, H);
        this.helpPanel.setVisible(false);

        this.input.keyboard?.on('keydown', this.onKeyDown, this);

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
        this.createBootSequence(W, H);
    }

    /* ========================================================
       UI HELPERS
       ======================================================== */

    makeText(x, y, text, size = 14, extra = {}) {
        return this.add.text(x, y, text, {
            fontFamily: FONT_PIXEL,
            fontSize: `${size}px`,
            color: this.th.sMain,
            ...extra
        });
    }

    makeType(x, y, text, size = 18, extra = {}) {
        return this.add.text(x, y, text, {
            fontFamily: FONT_TYPE,
            fontSize: `${size}px`,
            color: this.th.sMain,
            ...extra
        });
    }

    glow(color, blur = 8) {
        return {
            offsetX: 0,
            offsetY: 0,
            color,
            blur,
            stroke: false,
            fill: true
        };
    }

    makeRect(
        x,
        y,
        width,
        height,
        fill = this.th.panel,
        alpha = 1,
        strokeAlpha = 0.5,
        strokeWidth = 1
    ) {
        return this.add
            .rectangle(x, y, width, height, fill, alpha)
            .setOrigin(0)
            .setStrokeStyle(strokeWidth, this.th.main, strokeAlpha);
    }

    drawBrackets(g, x, y, w, h, len, color, lw = 2, alpha = 1) {
        g.lineStyle(lw, color, alpha);
        g.beginPath();

        g.moveTo(x, y + len);
        g.lineTo(x, y);
        g.lineTo(x + len, y);

        g.moveTo(x + w - len, y);
        g.lineTo(x + w, y);
        g.lineTo(x + w, y + len);

        g.moveTo(x + w, y + h - len);
        g.lineTo(x + w, y + h);
        g.lineTo(x + w - len, y + h);

        g.moveTo(x + len, y + h);
        g.lineTo(x, y + h);
        g.lineTo(x, y + h - len);

        g.strokePath();
    }

    playSfx(key, volume = 0.25) {
        try {
            if (this.cache.audio.exists(key)) {
                this.sound.play(key, { volume });
            }
        } catch (e) {
            /* sound is optional */
        }
    }

    makeButton(x, y, width, height, label, onClick, size = 13) {
        const th = this.th;
        const container = this.add.container(x, y);

        const background = this.makeRect(
            0,
            0,
            width,
            height,
            th.panelAlt,
            1,
            0.5
        );

        background.setInteractive({ useHandCursor: true });

        const text = this.makeText(
            width / 2,
            height / 2,
            label,
            size,
            { color: th.sMid }
        ).setOrigin(0.5);

        const btn = {
            container,
            background,
            text,
            active: false,
            width,
            height
        };

        const paint = (hover) => {
            const lit = hover || btn.active;

            background
                .setFillStyle(lit ? th.hover : th.panelAlt, 1)
                .setStrokeStyle(
                    1,
                    hover ? th.hi : th.main,
                    lit ? 1 : 0.5
                );

            text.setColor(lit ? th.sHi : th.sMid);
        };

        btn.setLabel = (value) => text.setText(value);

        btn.setActive = (value) => {
            btn.active = !!value;
            paint(false);
        };

        background.on('pointerover', () => paint(true));
        background.on('pointerout', () => paint(false));

        background.on('pointerdown', () => {
            if (!this.session?.active || this.isClosing || this.booting) {
                return;
            }

            this.playSfx('sfx_click');
            onClick();
        });

        container.add([background, text]);
        paint(false);

        return btn;
    }

    /* ========================================================
       BACKGROUND / MONITOR / CRT
       ======================================================== */

    createBackground(W, H) {
        const th = this.th;
        const g = this.add.graphics();

        // plastic bezel
        g.fillStyle(0x1b1d1a, 1);
        g.fillRect(0, 0, W, H);

        g.lineStyle(2, 0x2e312c, 1);
        g.strokeRect(3, 3, W - 6, H - 6);

        // glass
        g.fillStyle(th.bg, 1);
        g.fillRoundedRect(14, 14, W - 28, H - 28, 28);

        // faint grid
        g.lineStyle(1, th.main, 0.035);

        for (let x = 40; x < W - 20; x += 40) {
            g.lineBetween(x, 16, x, H - 16);
        }

        for (let y = 40; y < H - 20; y += 40) {
            g.lineBetween(16, y, W - 16, y);
        }

        // inner shadow + phosphor edge
        g.lineStyle(8, 0x000000, 0.55);
        g.strokeRoundedRect(14, 14, W - 28, H - 28, 28);

        g.lineStyle(1, th.main, 0.18);
        g.strokeRoundedRect(18, 18, W - 36, H - 36, 24);

        // power LED
        g.fillStyle(th.main, 1);
        g.fillCircle(W - 34, H - 7, 3);

        this.makeRect(
            22,
            22,
            W - 44,
            H - 44,
            0x000000,
            0,
            0.3,
            2
        );
    }

    createCRTEffects(W, H) {
        const th = this.th;
        const scanKey = '__wdb_scanlines';
        const noiseKey = '__wdb_noise';

        if (!this.textures.exists(scanKey)) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });

            g.fillStyle(0x000000, 1);
            g.fillRect(0, 0, 4, 2);
            g.generateTexture(scanKey, 4, 4);
            g.destroy();
        }

        if (!this.textures.exists(noiseKey)) {
            const tex = this.textures.createCanvas(noiseKey, 128, 128);
            const ctx = tex.getContext();
            const img = ctx.createImageData(128, 128);

            for (let i = 0; i < img.data.length; i += 4) {
                const v = (Math.random() * 255) | 0;

                img.data[i] = v;
                img.data[i + 1] = v;
                img.data[i + 2] = v;
                img.data[i + 3] = 255;
            }

            ctx.putImageData(img, 0, 0);
            tex.refresh();
        }

        this.crtScanlines = this.add
            .tileSprite(0, 0, W, H, scanKey)
            .setOrigin(0)
            .setAlpha(0.15)
            .setDepth(999);

        this.crtNoise = this.add
            .tileSprite(0, 0, W, H, noiseKey)
            .setOrigin(0)
            .setAlpha(0.04)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(999);

        this.crtBeam = this.add
            .rectangle(0, -60, W, 60, th.main, 0.03)
            .setOrigin(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(999);

        this.tweens.add({
            targets: this.crtBeam,
            y: H,
            duration: 5200,
            repeat: -1,
            ease: 'Linear'
        });

        // glass reflection
        const glare = this.add.graphics().setDepth(998);

        glare.fillStyle(0xffffff, 0.02);
        glare.fillTriangle(16, 16, W * 0.5, 16, 16, H * 0.45);
        glare.fillStyle(0xffffff, 0.012);
        glare.fillTriangle(W * 0.5, 16, W * 0.62, 16, 16, H * 0.62);

        // flicker + static
        this.flickerTimer = this.time.addEvent({
            delay: 80,
            loop: true,
            callback: () => {
                if (!this.crtNoise || !this.crtScanlines) return;

                this.crtNoise.tilePositionX = Math.random() * 128;
                this.crtNoise.tilePositionY = Math.random() * 128;
                this.crtScanlines.setAlpha(0.13 + Math.random() * 0.05);
            }
        });

        // occasional glitch shake
        this.glitchTimer = this.time.addEvent({
            delay: 6500,
            loop: true,
            callback: () => {
                if (Math.random() < 0.45 && !this.booting) {
                    this.cameras.main.shake(90, 0.0016);
                }
            }
        });

        // camera vignette (WebGL only)
        if (this.fxSupported && this.cameras.main.postFX) {
            try {
                this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.3);
            } catch (e) {
                /* ignore, purely cosmetic */
            }
        }
    }

    /* ========================================================
       HEADER
       ======================================================== */

    createHeader(W) {
        const th = this.th;

        this.makeRect(24, 24, W - 48, 72, th.panel, 0.95, 0.8, 2);
        this.makeRect(26, 26, W - 52, 14, th.panelAlt, 1, 0);

        this.makeText(44, 38, '> MARK-OS v2.04', 12, {
            color: th.sMid
        }).setOrigin(0, 0.5);

        this.linkText = this.makeText(
            44,
            68,
            'LINK: INTERPOL-NET [ONLINE]',
            9,
            { color: th.sDim }
        ).setOrigin(0, 0.5);

        const titleSize = W < 1500 ? 22 : 28;

        this.makeText(W / 2, 62, 'MOST WANTED DATABASE', titleSize, {
            stroke: th.sShadow,
            strokeThickness: 4,
            shadow: this.glow(th.sMain, 12)
        }).setOrigin(0.5);

        this.clockText = this.makeText(W - 44, 80, '', 11, {
            color: th.sMid
        }).setOrigin(1, 0.5);

        const updateClock = () => {
            const d = new Date();
            const p = (n) => String(n).padStart(2, '0');

            this.clockText?.setText(
                `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
            );
        };

        updateClock();

        this.clockTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: updateClock
        });

        this.makeButton(
            W - 44 - 170,
            32,
            170,
            34,
            '[ESC] EXIT',
            () => this.closeAndReturnToOffice(),
            12
        );
    }

    /* ========================================================
       FILTER PANEL
       ======================================================== */

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
            'TYPE TO SEARCH NAME / SKILLS / ACCENT...',
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
            '[?] HELP',
            () => this.toggleHelp(),
            11
        );

        this.counterText = this.makeText(
            W - 44,
            r1 + 16,
            '',
            14
        ).setOrigin(1, 0.5);

        this.updateCounter();

        /* ---------- row 2: filters ---------- */

        const r2 = panelY + 52;

        const statusLabels = STATUS_FILTERS.map((s) => `STATUS: ${s.label}`);
        const sortLabels = SORT_MODES.map((s) => `SORT: ${s.label}`);
        const imgLabels = ['IMG: PHOSPHOR', 'IMG: RAW'];
        const themeLabels = Object.values(THEME_DEFS).map(
            (t) => `THEME: ${t.label}`
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
    }

    browseLocked() {
        return (
            !this.session?.active ||
            this.isClosing ||
            this.booting ||
            this.detailPanel?.visible ||
            this.helpPanel?.visible
        );
    }

    refreshFilterButtons() {
        for (const btn of this.genderButtons) {
            btn.setActive(btn.value === this.filterGender);
        }

        const status = STATUS_FILTERS.find(
            (s) => s.value === this.filterStatus
        ) || STATUS_FILTERS[0];

        this.statusButton.setLabel(`STATUS: ${status.label}`);
        this.statusButton.setActive(this.filterStatus !== 'all');

        this.sortButton.setLabel(
            `SORT: ${SORT_MODES[this.sortIndex].label}`
        );

        this.imgButton.setLabel(
            this.photoFilterOn ? 'IMG: PHOSPHOR' : 'IMG: RAW'
        );

        this.imgButton.setActive(this.photoFilterOn);

        this.themeButton.setLabel(`THEME: ${this.th.key === 'green' ? 'GREEN' : 'AMBER'}`);
    }

    afterFilterChange() {
        this.currentPage = 0;
        this.applyFilters();
        this.refreshFilterButtons();
        this.refreshPage();
    }

    cycleGender() {
        const i = GENDER_FILTERS.findIndex(
            (g) => g.value === this.filterGender
        );

        this.filterGender =
            GENDER_FILTERS[(i + 1) % GENDER_FILTERS.length].value;

        this.afterFilterChange();
    }

    cycleStatus() {
        if (this.browseLocked()) return;

        const i = STATUS_FILTERS.findIndex(
            (s) => s.value === this.filterStatus
        );

        this.filterStatus =
            STATUS_FILTERS[(i + 1) % STATUS_FILTERS.length].value;

        this.afterFilterChange();
    }

    cycleSort() {
        if (this.browseLocked()) return;

        this.sortIndex = (this.sortIndex + 1) % SORT_MODES.length;
        this.afterFilterChange();
    }

    togglePhotoFilter() {
        this.photoFilterOn = !this.photoFilterOn;
        this.registry.set('wantedDbPhotoFilter', this.photoFilterOn);

        for (const entry of this.cardFilters) {
            this.applyPhotoMode(entry);
        }

        if (this.detailFilter) {
            this.applyPhotoMode(this.detailFilter);
        }

        this.refreshFilterButtons();
    }

    snapshotUi() {
        return {
            page: this.currentPage,
            search: this.searchQuery,
            gender: this.filterGender,
            status: this.filterStatus,
            sort: this.sortIndex
        };
    }

    switchTheme() {
        if (this.browseLocked()) return;

        const next = this.themeKey === 'green' ? 'amber' : 'green';

        this.registry.set('wantedDbTheme', next);

        this.scene.restart({
            gameState: this.gameState,
            skipBoot: true,
            ui: this.snapshotUi()
        });
    }

    updateSearchText() {
        if (!this.searchText) return;

        const empty = this.searchQuery.length === 0;

        this.searchPlaceholder?.setVisible(empty);

        this.searchText.setText(
            this.searchQuery + (this.cursorOn ? '_' : ' ')
        );
    }

    updateCounter() {
        this.counterText?.setText(
            `RECORDS: ${this.filteredSuspects.length}/${this.suspects.length}`
        );
    }

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

    /* ========================================================
       DATA: FILTER / SORT / STATUS
       ======================================================== */

    statusKey(suspect) {
        return String(suspect.id ?? suspect.__i);
    }

    getStatus(suspect) {
        return this.gameState.suspectStatus?.[this.statusKey(suspect)] || null;
    }

    fileNumber(suspect) {
        return String(suspect.wantedKey || 0).padStart(3, '0');
    }

    setStatus(suspect, status) {
        const map = this.gameState.suspectStatus;
        const key = this.statusKey(suspect);

        if (map[key] === status) {
            delete map[key];
        } else {
            map[key] = status;
        }

        EventBus.emit('suspectStatusChanged', {
            id: suspect.id,
            status: map[key] || null
        });

        for (const card of this.cards) {
            if (card.suspect === suspect) card.setBadge();
        }

        this.updateDetailStatus(suspect);

        if (this.filterStatus !== 'all') {
            this.listDirty = true;
        }
    }

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
                const hay = fields
                    .map((f) => String(suspect[f] || ''))
                    .join(' ')
                    .toLowerCase();

                if (!tokens.every((t) => hay.includes(t))) return false;
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

        const totalPages = Math.max(
            1,
            Math.ceil(list.length / this.CARDS_PER_PAGE)
        );

        this.currentPage = Phaser.Math.Clamp(
            this.currentPage,
            0,
            totalPages - 1
        );

        this.updateCounter();
    }

    /* ========================================================
       TEXTURES
       ======================================================== */

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

    /* ========================================================
       PHOTO FILTER (phosphor monitor look)
       ======================================================== */

    // Crops the image to "cover" the box; focusY biases the crop toward the top (faces).
    fitCover(image, box, textureKey, focusY = 0.5) {
        image.setCrop();
        image.setTexture(textureKey);

        const frame = image.frame;
        const sw = frame.realWidth;
        const sh = frame.realHeight;

        if (!sw || !sh) {
            image.setVisible(false);
            return false;
        }

        const scale = Math.max(box.width / sw, box.height / sh);

        const cw = box.width / scale;
        const ch = box.height / scale;
        const cx = (sw - cw) / 2;
        const cy = (sh - ch) * focusY;

        image
            .setOrigin(0.5)
            .setScale(scale)
            .setPosition(
                box.x - cx * scale + (sw * scale) / 2,
                box.y - cy * scale + (sh * scale) / 2
            )
            .setCrop(cx, cy, cw, ch)
            .setVisible(true);

        return true;
    }

    // Grayscale (WebGL ColorMatrix) + green/amber multiply layer + black-lift layer.
    createPhotoFilter(parent, image, box) {
        const th = this.th;
        let fx = null;

        if (this.fxSupported && image.postFX) {
            try {
                fx = image.postFX.addColorMatrix();

                const m = fx.colorMatrix || fx;

                m.grayscale?.(1, false);
                m.contrast?.(0.25, true);
            } catch (e) {
                fx = null;
            }
        }

        const multiply = this.add
            .rectangle(box.x, box.y, box.width, box.height, th.main, 1)
            .setOrigin(0)
            .setBlendMode(Phaser.BlendModes.MULTIPLY);

        const lift = this.add
            .rectangle(box.x, box.y, box.width, box.height, th.dim, 0.2)
            .setOrigin(0)
            .setBlendMode(Phaser.BlendModes.ADD);

        parent.add([multiply, lift]);

        const entry = {
            fx,
            overlays: [multiply, lift],
            enabled: true
        };

        this.applyPhotoMode(entry);

        return entry;
    }

    applyPhotoMode(entry) {
        const on = this.photoFilterOn && entry.enabled !== false;

        for (const overlay of entry.overlays) {
            overlay.setVisible(on);
        }

        if (entry.fx) {
            entry.fx.active = on;
        }
    }

    /* ========================================================
       STAMPS
       ======================================================== */

    createStamp(x, y, size, angle) {
        const th = this.th;

        const container = this.add
            .container(x, y)
            .setAngle(angle)
            .setVisible(false);

        const box = this.add
            .rectangle(0, 0, 10, 10, 0x000000, 0.45)
            .setStrokeStyle(3, th.alert, 1);

        const text = this.makeText(0, 0, '', size, {
            color: th.sAlert
        }).setOrigin(0.5);

        container.add([box, text]);

        return { container, box, text };
    }

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
    }

    /* ========================================================
       PAGES / CARDS
       ======================================================== */

    clearCards() {
        this.cardContainer?.removeAll(true);
        this.cards = [];
        this.cardFilters = [];
    }

    async refreshPage() {
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
    }

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
                'NO MATCHING RECORDS.\n\nTRY A DIFFERENT QUERY...\nOR CONFESS.',
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

            // staggered "boot-in" animation
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
    }

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
            this.makeText(10, 14, `#${this.fileNumber(suspect)}`, 11)
                .setOrigin(0, 0.5)
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

        // photo box
        const plateH = 58;

        const box = {
            x: 8,
            y: 32,
            width: cardW - 16,
            height: Math.max(40, cardH - 32 - 8 - plateH - 4)
        };

        container.add(
            this.makeRect(
                box.x,
                box.y,
                box.width,
                box.height,
                0x020805,
                1,
                0
            )
        );

        let image = null;

        if (textureKey && this.textures.exists(textureKey)) {
            image = this.add.image(0, 0, textureKey);
            container.add(image);

            if (this.fitCover(image, box, textureKey, 0.3)) {
                const entry = this.createPhotoFilter(container, image, box);
                this.cardFilters.push(entry);
            }
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

        // photo frame + permanent corner brackets
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

        // interaction
        const zone = this.add
            .zone(0, 0, cardW, cardH)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => {
            background
                .setFillStyle(th.hover, 0.95)
                .setStrokeStyle(2, th.hi, 1);

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

            this.playSfx('sfx_click');
            this.showDetailPanel(suspect);
        });

        container.add(zone);

        const card = {
            container,
            suspect,
            setBadge: () => {
                const status = this.getStatus(suspect);

                this.paintStamp(stamp, status);
                image?.setAlpha(status === 'clear' ? 0.4 : 1);
            }
        };

        card.setBadge();

        return card;
    }

    createEmptySlot(x, y, width, height) {
        const th = this.th;
        const container = this.add.container(x, y);

        container.add([
            this.makeRect(0, 0, width, height, 0x000000, 0, 0.2),

            this.makeText(
                width / 2,
                height / 2,
                'NO RECORD',
                12,
                { color: th.sDim }
            ).setOrigin(0.5).setAlpha(0.4)
        ]);

        return container;
    }

    /* ========================================================
       DETAIL PANEL (DOSSIER)
       ======================================================== */

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

        // frame
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

        this.detailPhoto = this.add
            .image(0, 0, '__DEFAULT')
            .setVisible(false);

        content.add(this.detailPhoto);

        this.detailFilter = this.createPhotoFilter(
            content,
            this.detailPhoto,
            box
        );

        this.detailFilter.enabled = false;
        this.applyPhotoMode(this.detailFilter);

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

        // stats box
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

        const createInfoBox = (y, h, label) => {
            content.add(this.makeRect(boxX, y, boxW, h, th.panel, 0.8, 0.5));

            content.add(
                this.makeText(boxX + 14, y + 10, label, 12, {
                    color: th.sMid
                })
            );

            const value = this.makeType(boxX + 14, y + 34, '', 18, {
                wordWrap: { width: boxW - 28 }
            });

            content.add(value);

            return value;
        };

        this.detailSkills = createInfoBox(387, 100, 'KNOWN SKILLS:');
        this.detailHabitus = createInfoBox(499, 100, 'KNOWN HABITS:');

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
    }

    setDetailPhotoState(visible) {
        this.detailPhoto?.setVisible(visible);
        this.detailScan?.setVisible(visible);

        if (this.detailFilter) {
            this.detailFilter.enabled = visible;
            this.applyPhotoMode(this.detailFilter);
        }
    }

    fitDetailPhoto(textureKey) {
        const ok = this.fitCover(
            this.detailPhoto,
            this.detailPhotoBox,
            textureKey,
            0.3
        );

        this.setDetailPhotoState(ok);
    }

    stopTypeTweens() {
        for (const tw of this.typeTweens) {
            tw?.stop?.();
        }

        this.typeTweens = [];
    }

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
    }

    // Shrinks the font until the text fits inside maxH.
    fitText(obj, full, maxH, sizes) {
        for (const size of sizes) {
            obj.setFontSize(size);
            obj.setText(full);

            if (obj.height <= maxH) break;
        }
    }

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
    }

    updateDetailStatus(suspect) {
        if (!suspect || !this.detailStatusText) return;

        const th = this.th;
        const status = this.getStatus(suspect);

        this.paintStamp(this.detailStamp, status);

        if (status === 'flag') {
            this.detailStatusText
                .setText('STATUS: FLAGGED AS SUSPECT')
                .setColor(th.sAlert);
        } else if (status === 'clear') {
            this.detailStatusText
                .setText('STATUS: CLEARED (ALIBI OK)')
                .setColor(th.sMid);
        } else {
            this.detailStatusText
                .setText('STATUS: UNSORTED')
                .setColor(th.sDim);
        }

        this.flagButton.setLabel(status === 'flag' ? '[F] UNFLAG' : '[F] FLAG SUSPECT');
        this.flagButton.setActive(status === 'flag');

        this.clearButton.setLabel(status === 'clear' ? '[C] REINSTATE' : '[C] CLEAR SUSPECT');
        this.clearButton.setActive(status === 'clear');
    }

    async showDetailPanel(suspect) {
        if (!this.session?.active || this.isClosing) return;

        const session = this.session;
        const token = ++this.detailToken;

        this.selectedCard = suspect;
        this.detailIndex = this.filteredSuspects.indexOf(suspect);

        this.stopTypeTweens();

        // static info
        this.detailRecText.setText(
            `REC ${String(this.detailIndex + 1).padStart(2, '0')}/${String(
                this.filteredSuspects.length
            ).padStart(2, '0')}`
        );

        this.detailCaseNum.setText(
            `FILE ID: #${this.fileNumber(suspect)} // REF: ${String(
                suspect.id || ''
            ).toUpperCase()}`
        );

        this.drawBarcode(`${suspect.id}${suspect.name}`);
        this.updateDetailStatus(suspect);

        // texts: measure with the full text, then type them in
        const values = {};

        for (const field of DETAIL_FIELDS) {
            values[field] = String(suspect[field] || 'UNKNOWN');
        }

        this.layoutDetailFields(values);

        const name = String(suspect.name || '').toUpperCase();
        const skills = String(suspect.skills || 'NONE');
        const habitus = String(suspect.habitus || 'NONE');
        const note =
            MARGIN_NOTES[
                strHash(suspect.id ?? suspect.name) % MARGIN_NOTES.length
            ];

        this.fitText(this.detailSkills, skills, 58, [18, 16, 14, 12]);
        this.fitText(this.detailHabitus, habitus, 58, [18, 16, 14, 12]);
        this.fitText(this.detailNote, note, 46, [16, 14, 12]);

        this.typeInto(this.detailName, name, 0);

        DETAIL_FIELDS.forEach((field, i) => {
            this.typeInto(this.detailFields[field], values[field], 60 + i * 70);
        });

        this.typeInto(this.detailSkills, skills, 520);
        this.typeInto(this.detailHabitus, habitus, 640);
        this.typeInto(this.detailNote, note, 760);

        // photo
        this.setDetailPhotoState(false);

        this.detailPhotoStatus
            .setText('LOADING PORTRAIT...')
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
            this.fitDetailPhoto(key);
            this.detailPhotoStatus.setVisible(false);
        } else {
            this.detailPhotoStatus.setText('PORTRAIT\nUNAVAILABLE');
        }
    }

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
    }

    hideDetailPanel() {
        this.detailToken++;
        this.selectedCard = null;
        this.stopTypeTweens();

        if (!this.detailPanel) return;

        this.tweens.killTweensOf(this.detailPanel);
        this.detailPanel.setVisible(false).setAlpha(1);

        this.setDetailPhotoState(false);
    }

    closeDetailPanel() {
        if (!this.detailPanel?.visible) return;

        this.hideDetailPanel();

        if (this.listDirty && this.session?.active) {
            this.listDirty = false;
            this.applyFilters();
            this.refreshPage();
        }
    }

    /* ========================================================
       HELP PANEL
       ======================================================== */

    createHelpPanel(W, H) {
        const th = this.th;
        const panel = this.add.container(0, 0).setDepth(150);

        const overlay = this.add
            .rectangle(0, 0, W, H, 0x000000, 0.85)
            .setOrigin(0)
            .setInteractive();

        overlay.on('pointerdown', () => this.toggleHelp(false));
        panel.add(overlay);

        const lines = [
            ['TYPE', 'SEARCH RECORDS'],
            ['BACKSPACE', 'DELETE LETTER'],
            ['TAB', 'CYCLE GENDER'],
            ['UP', 'CYCLE SORT'],
            ['DOWN', 'CYCLE STATUS'],
            ['LEFT/RIGHT', 'PAGE / RECORD'],
            ['CLICK CARD', 'OPEN DOSSIER'],
            ['F  (DOSSIER)', 'FLAG SUSPECT'],
            ['C  (DOSSIER)', 'CLEAR SUSPECT'],
            ['ESC', 'BACK / CLEAR / EXIT']
        ];

        const text = lines
            .map(([k, v]) => `${k.padEnd(13, '.')} ${v}`)
            .join('\n');

        const bw = 700;
        const bh = 140 + lines.length * 30;
        const bx = (W - bw) / 2;
        const by = (H - bh) / 2;

        const bg = this.makeRect(bx, by, bw, bh, th.bg, 0.99, 1, 2).setInteractive();

        bg.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation?.());

        panel.add(bg);
        panel.add(this.makeRect(bx, by, bw, 44, th.panelAlt, 1, 0.6));

        panel.add(
            this.makeText(bx + 20, by + 22, 'HELP // CONTROLS', 16, {
                shadow: this.glow(th.sMain, 8)
            }).setOrigin(0, 0.5)
        );

        panel.add(
            this.makeText(bx + 28, by + 66, text, 12, { lineSpacing: 16 })
        );

        panel.add(
            this.makeText(
                bx + bw / 2,
                by + bh - 24,
                'PRESS ANY KEY OR CLICK TO RETURN',
                10,
                { color: th.sDim }
            ).setOrigin(0.5)
        );

        return panel;
    }

    toggleHelp(force) {
        if (!this.helpPanel || this.booting) return;

        const show = force ?? !this.helpPanel.visible;

        this.helpPanel.setVisible(show);
    }

    /* ========================================================
       NAVIGATION
       ======================================================== */

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
    }

    totalPages() {
        return Math.max(
            1,
            Math.ceil(this.filteredSuspects.length / this.CARDS_PER_PAGE)
        );
    }

    updateNavButtons() {
        const totalPages = this.totalPages();

        this.pageText?.setText(
            `PAGE ${this.currentPage + 1} / ${totalPages}`
        );

        const canPrev = !this.isPaging && this.currentPage > 0;
        const canNext = !this.isPaging && this.currentPage < totalPages - 1;

        this.prevButton?.container.setAlpha(canPrev ? 1 : 0.3);
        this.nextButton?.container.setAlpha(canNext ? 1 : 0.3);
    }

    prevPage() {
        if (this.isPaging || this.browseLocked() || this.currentPage <= 0) {
            return;
        }

        this.currentPage--;
        this.refreshPage();
    }

    nextPage() {
        if (this.isPaging || this.browseLocked()) return;

        if (this.currentPage >= this.totalPages() - 1) return;

        this.currentPage++;
        this.refreshPage();
    }

    /* ========================================================
       TICKER (bottom news line)
       ======================================================== */

    createTicker(W, H) {
        const th = this.th;
        const y = H - 50;

        this.makeRect(24, y, W - 48, 26, th.panel, 0.95, 0.5);
        this.makeRect(24, y, 84, 26, th.panelAlt, 1, 0.6);

        this.makeText(66, y + 13, 'NEWS>', 10).setOrigin(0.5);

        const left = 24 + 92;
        const right = W - 24 - 6;

        const shuffled = [...TICKER_ITEMS].sort(() => Math.random() - 0.5);

        const ticker = this.makeText(
            right,
            y + 13,
            shuffled.join('   ///   ') + '   ///   ',
            10,
            { color: th.sMid }
        ).setOrigin(0, 0.5);

        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xffffff, 1);
        g.fillRect(left, y, right - left, 26);

        const mask = g.createGeometryMask();

        ticker.setMask(mask);
        this.masks.push({ g, mask });

        const distance = ticker.width + (right - left);

        this.tweens.add({
            targets: ticker,
            x: left - ticker.width,
            duration: distance / 0.07,
            repeat: -1,
            ease: 'Linear',
            onRepeat: () => {
                ticker.x = right;
            }
        });
    }

    /* ========================================================
       BOOT SEQUENCE
       ======================================================== */

    createBootSequence(W, H) {
        if (this.noBoot) {
            this.booting = false;
            return;
        }

        const th = this.th;

        this.booting = true;

        const layer = this.add.container(0, 0).setDepth(2000);

        const g = this.add.graphics();

        g.fillStyle(th.bg, 1);
        g.fillRoundedRect(14, 14, W - 28, H - 28, 28);

        const zone = this.add
            .zone(0, 0, W, H)
            .setOrigin(0)
            .setInteractive();

        zone.on('pointerdown', () => this.endBoot());

        const text = this.makeText(70, 80, '', 14, {
            lineSpacing: 16,
            shadow: this.glow(th.sMain, 8)
        });

        layer.add([g, zone, text]);

        this.bootLayer = layer;

        const lines = [
            'MARK-OS v2.04  (C) 1993 MARK AGENCY',
            'MEMORY CHECK......... 640K OK (NOBODY NEEDS MORE)',
            'DIALING INTERPOL-NET. CONNECTED @ 2400 BAUD',
            'VERIFYING BADGE...... DETECTIVE (PROBABLY)',
            `LOADING FELON FILES.. ${this.suspects.length} RECORDS`,
            'COFFEE LEVEL......... CRITICAL',
            '',
            'READY. PRESS ANY KEY_'
        ];

        const shown = [];
        let i = 0;

        const typer = this.time.addEvent({
            delay: 230,
            repeat: lines.length - 1,
            callback: () => {
                shown.push(lines[i++]);
                text.setText(shown.join('\n'));
            }
        });

        const done = this.time.delayedCall(
            230 * lines.length + 450,
            () => this.endBoot()
        );

        this.bootEvents = [typer, done];
    }

    endBoot() {
        if (!this.booting) return;

        this.booting = false;

        for (const ev of this.bootEvents) ev?.remove?.();

        this.bootEvents = [];

        const layer = this.bootLayer;

        if (!layer) return;

        this.bootLayer = null;

        this.tweens.add({
            targets: layer,
            alpha: 0,
            duration: 220,
            onComplete: () => layer.destroy(true)
        });
    }

    /* ========================================================
       KEYBOARD
       ======================================================== */

    onKeyDown(event) {
        if (!this.session?.active || this.isClosing) return;

        if (this.booting) {
            this.endBoot();
            return;
        }

        const key = event.key;

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
                    event.preventDefault?.();
                    this.stepDetail(-1);
                    break;
                case 'ArrowRight':
                    event.preventDefault?.();
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
                event.preventDefault?.();

                if (this.searchQuery) {
                    this.searchQuery = this.searchQuery.slice(0, -1);
                    this.onSearchChanged();
                }

                return;

            case 'Tab':
                event.preventDefault?.();
                this.cycleGender();
                return;

            case 'ArrowUp':
                event.preventDefault?.();
                this.cycleSort();
                return;

            case 'ArrowDown':
                event.preventDefault?.();
                this.cycleStatus();
                return;

            case 'ArrowLeft':
                event.preventDefault?.();
                this.prevPage();
                return;

            case 'ArrowRight':
                event.preventDefault?.();
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
                event.preventDefault?.();

                if (!this.searchQuery || this.searchQuery.endsWith(' ')) return;
            }

            if (this.searchQuery.length >= this.searchMax) return;

            this.searchQuery += key;
            this.onSearchChanged();
        }
    }

    /* ========================================================
       EXIT
       ======================================================== */

    closeAndReturnToOffice() {
        if (this.isClosing) return;
        this.isClosing = true;

        if (this.scene.isSleeping('UIScene')) {
            this.scene.wake('UIScene');
        }

        this.scene.resume('OfficeScene');
        this.scene.stop();
    }

    /* ========================================================
       CLEANUP
       ======================================================== */

    cleanupScene() {
        if (!this.session?.active) return;

        this.session.active = false;
        this.renderToken++;
        this.detailToken++;

        this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
        this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);

        this.input.keyboard?.off('keydown', this.onKeyDown, this);

        for (const pending of [...this.pendingTextures.values()]) {
            pending.cancel();
        }

        this.pendingTextures.clear();

        this.stopTypeTweens();

        try {
            this.tweens.killAll();
            this.time.removeAllEvents();
        } catch (e) {
            /* scene systems may already be shut down */
        }

        try {
            this.cameras.main.postFX?.clear();
        } catch (e) {
            /* ignore */
        }

        for (const { g, mask } of this.masks) {
            mask?.destroy?.();
            g?.destroy?.();
        }

        this.masks = [];

        this.bootLayer?.destroy?.(true);
        this.bootLayer = null;

        this.helpPanel?.destroy?.(true);
        this.helpPanel = null;

        this.detailPanel?.destroy?.(true);
        this.detailPanel = null;

        this.cardContainer?.destroy?.(true);
        this.cardContainer = null;

        this.crtBeam?.destroy();
        this.crtBeam = null;

        this.crtScanlines?.destroy();
        this.crtScanlines = null;

        this.crtNoise?.destroy();
        this.crtNoise = null;

        for (const key of this.ownedTextures) {
            if (this.textures.exists(key)) {
                this.textures.remove(key);
            }
        }

        this.ownedTextures.clear();

        this.cards = [];
        this.cardFilters = [];
        this.detailFilter = null;
        this.selectedCard = null;
        this.detailPhoto = null;
        this.detailPhotoStatus = null;
        this.isPaging = false;
        this.booting = false;
    }
}