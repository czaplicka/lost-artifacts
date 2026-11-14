import { audioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

const MAP_SOURCES = [
    'assets/data/atlas-boundaries.geojson',
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
];

// ---------------------------------------------------------------- palette
const INK = 0x473d2e;
const PAPER = 0xeee5cf;
const SEA = 0xbfd3cb;
const SEA_HOLE = 0xc9d8ce;
const LAND = 0xb7b57f;
const LAND_FAR = 0xdad5b5;
const RED = 0x843f34;
const GOLD = 0xad9561;

// ---------------------------------------------------------------- layout
const PAGE_W = 625;
const PAGE_H = 806;
const COVER_W = 1330;
const COVER_H = 890;
const FRAME = { l: -580, t: -265, r: -65, b: 230 };
const MAP_CX = -322;
const MAP_CY = -15;
const MAP_MAX_W = 425;
const MAP_MAX_H = 385;
const GRID_STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 20, 30, 45];
const NICE_KM = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

// ---------------------------------------------------------------- flavour
const REGION_CODES = {
    'Western Europe': 'WEU',
    'Central Europe': 'CEU',
    'Eastern Europe': 'EEU',
    'Southern Europe': 'SEU',
    'Northern Europe': 'NEU',
    'North America': 'NAM',
    'South America': 'SAM',
    'Central America': 'CAM',
    'South Asia': 'SAS',
    'East Asia': 'EAS',
    'Southeast Asia': 'SEA',
    'Central Asia': 'CAS',
    'Middle East': 'MEA',
    'East Africa': 'EAF',
    'West Africa': 'WAF',
    'North Africa': 'NAF',
    'South Africa': 'SAF',
    'Oceania': 'OCE'
};
const TAB_COLORS = [0x754b43, 0x58654b, 0x3e5661, 0x806943];

const COUNTRY_STAMPS = [
    'APPROVED*', 'EXPENSES DENIED', 'SEE FOOTNOTE 7', 'NOT A VACATION',
    'INTERN CHECKED', 'RECEIPTS PLZ', 'TOP SECRET-ISH', 'COFFEE EXTRA',
    'BRING UMBRELLA'
];
const CITY_STAMPS = [
    'VISIT PENDING', 'TICKET BOOKED?', 'NO REFUNDS', 'GUIDE: MAYBE',
    'SUSPECT NEARBY', 'EAT LOCAL FOOD', 'KEEP RECEIPTS'
];
const AGENT_NOTES = [
    'Borders shown. Escape routes sold separately.',
    'Do not ask locals for directions. Ask for pastries.',
    'Previous agent lost here. Possibly just lunch.',
    'Pack light. Expenses are not that forgiving.',
    'Suspect may be anywhere. Or at the buffet.',
    'Maps may differ from reality. Reality is wrong.',
    'If lost, look confident and nod at monuments.',
    'Agency is not liable for bad coffee abroad.'
];

// ---------------------------------------------------------------- helpers
function mulberry32(seed) {
    let a = seed | 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(value) {
    const s = String(value);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function niceStep(target) {
    return GRID_STEPS.find(step => step >= target) || GRID_STEPS[GRID_STEPS.length - 1];
}

function formatDeg(value) {
    const v = Math.round(value * 100) / 100;
    return Number.isInteger(v) ? String(v) : String(v);
}

function pointInPolygon(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a.y > y) !== (b.y > y) &&
            x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}

function polygonCentroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const f = p.x * q.y - q.x * p.y;
        a += f;
        cx += (p.x + q.x) * f;
        cy += (p.y + q.y) * f;
    }
    if (Math.abs(a) < 1e-6) return null;
    a *= 0.5;
    return { x: cx / (6 * a), y: cy / (6 * a), area: Math.abs(a) };
}

// Sutherland-Hodgman clip against an axis-aligned rectangle {l,t,r,b}
function clipPolygon(poly, rect) {
    let out = poly;
    const clipEdge = (inside, intersect) => {
        const input = out;
        out = [];
        if (!input.length) return;
        let prev = input[input.length - 1];
        for (const cur of input) {
            const curIn = inside(cur), prevIn = inside(prev);
            if (curIn) {
                if (!prevIn) out.push(intersect(prev, cur));
                out.push(cur);
            } else if (prevIn) {
                out.push(intersect(prev, cur));
            }
            prev = cur;
        }
    };
    const atX = x => (a, b) => ({ x, y: a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x) });
    const atY = y => (a, b) => ({ x: a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y), y });
    clipEdge(p => p.x >= rect.l, atX(rect.l));
    clipEdge(p => p.x <= rect.r, atX(rect.r));
    clipEdge(p => p.y >= rect.t, atY(rect.t));
    clipEdge(p => p.y <= rect.b, atY(rect.b));
    return out;
}

function dashedLine(g, x1, y1, x2, y2, dash = 5, gap = 5) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (!len) return;
    const ux = dx / len, uy = dy / len;
    for (let d = 0; d < len; d += dash + gap) {
        const e = Math.min(d + dash, len);
        g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e);
    }
}

function roundedPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ---------------------------------------------------------------- procedural textures
function paintCover(ctx) {
    const rnd = mulberry32(99);
    ctx.save();
    roundedPath(ctx, 0, 0, COVER_W, COVER_H, 14);
    ctx.clip();

    const base = ctx.createLinearGradient(0, 0, 0, COVER_H);
    base.addColorStop(0, '#1f4b40');
    base.addColorStop(1, '#122f27');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    for (let i = 0; i < 14000; i++) {
        const light = rnd() > 0.55;
        ctx.fillStyle = light
            ? `rgba(120,170,140,${0.03 + rnd() * 0.06})`
            : `rgba(0,0,0,${0.05 + rnd() * 0.10})`;
        ctx.fillRect(Math.floor(rnd() * COVER_W), Math.floor(rnd() * COVER_H),
            rnd() > 0.8 ? 2 : 1, rnd() > 0.8 ? 2 : 1);
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < 900; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`;
        ctx.beginPath();
        ctx.arc(rnd() * COVER_W, rnd() * COVER_H, 2 + rnd() * 2.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    const v = ctx.createRadialGradient(COVER_W / 2, COVER_H / 2, COVER_H * 0.35,
        COVER_W / 2, COVER_H / 2, COVER_W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(2, COVER_H - 2); ctx.lineTo(2, 2); ctx.lineTo(COVER_W - 2, 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(COVER_W - 2, 2); ctx.lineTo(COVER_W - 2, COVER_H - 2); ctx.lineTo(2, COVER_H - 2);
    ctx.stroke();

    ctx.setLineDash([7, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(206,178,104,0.8)';
    ctx.strokeRect(8, 8, COVER_W - 16, COVER_H - 16);
    ctx.setLineDash([]);
    ctx.restore();
}

function paintPage(ctx, side) {
    const left = side === 'left';
    const rnd = mulberry32(left ? 1337 : 7331);

    ctx.fillStyle = left ? '#eee5cf' : '#f3ecd9';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // soft mottling
    for (let i = 0; i < 60; i++) {
        const x = rnd() * PAGE_W, y = rnd() * PAGE_H, r = 40 + rnd() * 140;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const warm = rnd() > 0.5;
        grad.addColorStop(0, warm ? 'rgba(168,132,78,0.05)' : 'rgba(255,252,238,0.10)');
        grad.addColorStop(1, 'rgba(168,132,78,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // paper fibres
    ctx.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
        const x = rnd() * PAGE_W, y = rnd() * PAGE_H;
        const len = 4 + rnd() * 14, ang = rnd() * Math.PI * 2;
        ctx.strokeStyle = `rgba(${110 + Math.floor(rnd() * 40)},${90 + Math.floor(rnd() * 30)},60,${0.03 + rnd() * 0.05})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
    }

    // speckles
    for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = `rgba(90,70,40,${0.04 + rnd() * 0.10})`;
        ctx.fillRect(Math.floor(rnd() * PAGE_W), Math.floor(rnd() * PAGE_H),
            rnd() > 0.85 ? 2 : 1, 1);
    }

    // foxing
    for (let i = 0; i < 14; i++) {
        const x = rnd() * PAGE_W, y = rnd() * PAGE_H, r = 3 + rnd() * 8;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        halo.addColorStop(0, 'rgba(150,100,50,0.14)');
        halo.addColorStop(1, 'rgba(150,100,50,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        ctx.fillStyle = `rgba(130,85,40,${0.10 + rnd() * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // one faded coffee ring
    const rx = left ? 470 : 150, ry = left ? 640 : 120;
    ctx.strokeStyle = 'rgba(120,80,40,0.10)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rx, ry, 34, 0.2, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,40,0.05)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(rx, ry, 31, 0.2, Math.PI * 1.85);
    ctx.stroke();

    // edge darkening
    const edge = (x0, y0, x1, y1, rx0, ry0, rw, rh, alpha) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(92,68,36,${alpha})`);
        g.addColorStop(1, 'rgba(92,68,36,0)');
        ctx.fillStyle = g;
        ctx.fillRect(rx0, ry0, rw, rh);
    };
    edge(0, 0, 0, 34, 0, 0, PAGE_W, 34, 0.16);
    edge(0, PAGE_H, 0, PAGE_H - 34, 0, PAGE_H - 34, PAGE_W, 34, 0.16);
    if (left) edge(0, 0, 46, 0, 0, 0, 46, PAGE_H, 0.22);
    else edge(PAGE_W, 0, PAGE_W - 46, 0, PAGE_W - 46, 0, 46, PAGE_H, 0.22);

    // spine shadow
    const spine = left
        ? ctx.createLinearGradient(PAGE_W, 0, PAGE_W - 84, 0)
        : ctx.createLinearGradient(0, 0, 84, 0);
    spine.addColorStop(0, 'rgba(35,26,16,0.52)');
    spine.addColorStop(0.35, 'rgba(35,26,16,0.16)');
    spine.addColorStop(1, 'rgba(35,26,16,0)');
    ctx.fillStyle = spine;
    ctx.fillRect(left ? PAGE_W - 84 : 0, 0, 84, PAGE_H);
}

// ================================================================= AtlasUI
export class AtlasUI {
    static boundariesPromise = null;
    static boundsCache = new WeakMap();

    static ensureTextures(scene) {
        const tm = scene.textures;
        const jobs = [
            ['atlas_cover', COVER_W, COVER_H, ctx => paintCover(ctx)],
            ['atlas_page_left', PAGE_W, PAGE_H, ctx => paintPage(ctx, 'left')],
            ['atlas_page_right', PAGE_W, PAGE_H, ctx => paintPage(ctx, 'right')]
        ];
        jobs.forEach(([key, w, h, paint]) => {
            if (tm.exists(key)) return;
            try {
                const tex = tm.createCanvas(key, w, h);
                if (!tex) return;
                paint(tex.context);
                tex.refresh();
            } catch (error) {
                console.warn('[AtlasUI] Texture failed:', key, error);
                if (tm.exists(key)) tm.remove(key);
            }
        });
        return jobs.every(([key]) => tm.exists(key));
    }

    constructor(scene, countries = []) {
        this.scene = scene;
        this.countries = Array.isArray(countries) ? countries : [];
        this.pages = this.countries.flatMap(country => [
            { type: 'country', country, entry: country },
            ...(Array.isArray(country.cities) ? country.cities : []).map(city => ({
                type: 'city', country, entry: city
            }))
        ]);
        this.pageIndex = 0;
        this.isOpen = false;
        this.destroyed = false;
        this.features = [];
        this.featureRecords = [];
        this.recordCache = new Map();
        this.mapState = 'loading';
        this.tabs = [];
        this.keyBindings = [];
        this.baseX = 0;
        this.baseY = 0;
        this.boundResize = this.layout.bind(this);
        this.boundShutdown = this.destroy.bind(this);
        this.create();
        this.bindKeyboard();
        scene.scale.on('resize', this.boundResize);
        scene.events.once('shutdown', this.boundShutdown);
        this.layout();
        this.refreshPage();
        this.loadBoundaries();
    }

    // ------------------------------------------------------------ building blocks
    add(object) {
        this.book.add(object);
        return object;
    }

    text(x, y, value, size = 20, style = {}) {
        const obj = this.add(this.scene.add.text(x, y, value, {
            fontFamily: 'SpecialElite', fontSize: `${size}px`, color: '#473d2e',
            ...style
        }));
        obj.setResolution?.(2);
        return obj;
    }

    labelPool(count, size, color, alpha) {
        return Array.from({ length: count }, () =>
            this.text(0, 0, '', size, { color }).setAlpha(alpha).setVisible(false));
    }

    create() {
        const { width, height } = this.scene.scale;
        this.texturesOk = AtlasUI.ensureTextures(this.scene);

        this.overlay = this.scene.add.rectangle(width / 2, height / 2,
            width, height, 0x09110f, 0.78)
            .setDepth(20).setVisible(false).setAlpha(0).setInteractive();
        this.overlay.on('pointerdown', () => this.close());
        this.book = this.scene.add.container(0, 0)
            .setDepth(21).setVisible(false).setAlpha(0);

        this.add(this.scene.add.rectangle(0, 0, 1330, 890, 0, 0.001)
            .setInteractive()).on('pointerdown', (p, x, y, event) => {
                event?.stopPropagation();
            });

        this.shadowGfx = this.add(this.scene.add.graphics());
        this.drawShadow();
        if (this.texturesOk) this.cover = this.add(this.scene.add.image(0, 0, 'atlas_cover'));
        this.bookBg = this.add(this.scene.add.graphics());
        this.drawBook();
        if (this.texturesOk) {
            this.pageLeft = this.add(this.scene.add.image(-PAGE_W / 2, -7, 'atlas_page_left'));
            this.pageRight = this.add(this.scene.add.image(PAGE_W / 2, -7, 'atlas_page_right'));
        }
        this.pageDeco = this.add(this.scene.add.graphics());
        this.drawPageDecor();

        this.mapGrid = this.add(this.scene.add.graphics());
        this.drawMapFrame();
        this.mapGraphics = this.add(this.scene.add.graphics());
        this.mapTop = this.add(this.scene.add.graphics());
        this.pulse = this.add(this.scene.add.circle(0, 0, 9, RED, 0)
            .setStrokeStyle(2, RED, 1).setVisible(false));
        this.pulseTween = this.scene.tweens.add({
            targets: this.pulse,
            scale: { from: 1, to: 2.6 },
            alpha: { from: 0.9, to: 0 },
            duration: 1300, repeat: -1, ease: 'Sine.easeOut'
        });
        this.dividerGfx = this.add(this.scene.add.graphics());
        this.caseTagGfx = this.add(this.scene.add.graphics());

        this.createTexts();
        this.createStamp();

        this.prevBtn = this.button(-520, 355, '< PREV', () => this.previousPage());
        this.nextBtn = this.button(520, 355, 'NEXT >', () => this.nextPage());
        this.closeBtn = this.button(632, -414, 'X', () => this.close());
        this.countryBtn = this.button(155, 283, 'COUNTRY', () => {
            const page = this.getCurrentPage();
            if (page) this.openToCountry(page.country.id);
        });
        this.cityBtn = this.button(430, 283, 'CITY FILES', () => {
            const page = this.getCurrentPage();
            if (!page) return;
            const index = this.pages.findIndex(p =>
                p.type === 'city' && p.country === page.country);
            if (index >= 0) this.goToPage(index);
        });
        this.createTabs();

        // page-turn sweeps (always on top inside the book)
        this.sweepRight = this.add(this.scene.add.rectangle(0, -7, PAGE_W, PAGE_H, 0xf3ecd9, 1)
            .setOrigin(0, 0.5).setStrokeStyle(2, 0x9a8a5f, 0.9).setVisible(false));
        this.sweepLeft = this.add(this.scene.add.rectangle(0, -7, PAGE_W, PAGE_H, 0xeee5cf, 1)
            .setOrigin(1, 0.5).setStrokeStyle(2, 0x9a8a5f, 0.9).setVisible(false));
    }

    // ------------------------------------------------------------ static drawing
    drawShadow() {
        const g = this.shadowGfx;
        [[10, 20, 0.10], [6, 13, 0.12], [3, 7, 0.14]].forEach(([dx, dy, a]) => {
            g.fillStyle(0, a).fillRoundedRect(-665 + dx, -445 + dy, COVER_W, COVER_H, 16);
        });
    }

    drawBook() {
        const g = this.bookBg;
        if (!this.texturesOk) {
            g.fillStyle(0x183e35, 1).fillRoundedRect(-665, -445, COVER_W, COVER_H, 14);
            g.fillStyle(PAPER, 1).fillRect(-625, -410, PAGE_W, PAGE_H);
            g.fillStyle(0xf3ecd9, 1).fillRect(0, -410, PAGE_W, PAGE_H);
        }
        g.lineStyle(2, 0x8e8156, 0.85).strokeRoundedRect(-652, -432, 1304, 864, 10);
        g.lineStyle(1, 0x8e8156, 0.4).strokeRoundedRect(-644, -424, 1288, 848, 7);

        // page stack visible under the pages
        for (let i = 4; i >= 0; i--) {
            g.fillStyle(i % 2 ? 0xbcb094 : 0xd0c4a8, 1);
            g.fillRect(-625 + i, -408 + i * 3, 1250 - i * 2, 810);
        }
        if (this.texturesOk) {
            // keep stack beneath the textured pages only
        } else {
            g.fillStyle(PAPER, 1).fillRect(-625, -410, PAGE_W, PAGE_H);
            g.fillStyle(0xf3ecd9, 1).fillRect(0, -410, PAGE_W, PAGE_H);
        }

        // gold corner fittings with rivets
        g.lineStyle(4, GOLD, 1);
        [[-650, -430, 1, 1], [650, -430, -1, 1], [-650, 430, 1, -1], [650, 430, -1, -1]]
            .forEach(([x, y, dx, dy]) => {
                g.lineBetween(x, y, x + dx * 26, y);
                g.lineBetween(x, y, x, y + dy * 26);
                g.fillStyle(0xe2c778, 1).fillCircle(x + dx * 8, y + dy * 8, 3);
                g.fillStyle(0x7a6638, 0.7).fillCircle(x + dx * 8 + 1, y + dy * 8 + 1, 1.2);
            });
    }

    drawPageDecor() {
        const g = this.pageDeco;

        // page borders
        g.lineStyle(1, INK, 0.22);
        g.strokeRect(-612, -398, 578, 782);
        g.strokeRect(34, -398, 578, 782);
        g.lineStyle(1, INK, 0.12);
        g.strokeRect(-607, -393, 568, 772);
        g.strokeRect(39, -393, 568, 772);

        // header / footer double rules
        [-1, 1].forEach(side => {
            const x1 = side * 65, x2 = side * 580;
            g.lineStyle(2, INK, 0.45).lineBetween(x1, -340, x2, -340);
            g.lineStyle(1, INK, 0.25).lineBetween(x1, -336, x2, -336);
            g.lineStyle(1, INK, 0.25).lineBetween(x1, 320, x2, 320);
            g.lineStyle(2, INK, 0.45).lineBetween(x1, 324, x2, 324);
        });

        // map title cartouche
        g.fillStyle(0xe6dcc0, 0.65).fillRect(-580, -327, 515, 52);
        g.lineStyle(2, INK, 0.7).strokeRect(-580, -327, 515, 52);
        g.lineStyle(1, INK, 0.4).strokeRect(-575, -322, 505, 42);
        [[-575, -322], [-70, -322], [-575, -280], [-70, -280]].forEach(([x, y]) => {
            g.fillStyle(INK, 0.6).fillCircle(x, y, 2);
        });

        // agency seal
        g.lineStyle(2, GOLD, 1).strokeCircle(-562, -376, 12);
        g.lineStyle(1, INK, 0.5).strokeCircle(-562, -376, 9);
        g.lineStyle(2, 0x52604b, 1);
        g.beginPath();
        g.moveTo(-567, -371); g.lineTo(-567, -381); g.lineTo(-562, -375);
        g.lineTo(-557, -381); g.lineTo(-557, -371);
        g.strokePath();

        // ribbon bookmark
        const ribbon = [[530, -410], [552, -410], [552, -318], [541, -329], [530, -318]]
            .map(([x, y]) => ({ x, y }));
        g.fillStyle(0, 0.16).fillPoints(ribbon.map(p => ({ x: p.x + 3, y: p.y + 2 })), true);
        g.fillStyle(0x7d2e2a, 1).fillPoints(ribbon, true);
        g.fillStyle(0xa04339, 0.65).fillRect(534, -410, 4, 84);
        g.lineStyle(1, 0x4d1a17, 0.6).strokePoints(ribbon, true);

        // page corner curl
        g.fillStyle(0, 0.10).fillTriangle(PAGE_W, PAGE_H - 7 - 24 + 2, PAGE_W - 24 + 2, PAGE_H - 7, PAGE_W, PAGE_H - 7);
        g.fillStyle(0xdcd0b0, 1).fillTriangle(PAGE_W, PAGE_H - 7 - 26, PAGE_W - 26, PAGE_H - 7, PAGE_W, PAGE_H - 7);
        g.lineStyle(1, 0x9a8a5f, 0.6).lineBetween(PAGE_W, PAGE_H - 7 - 26, PAGE_W - 26, PAGE_H - 7);
    }

    drawMapFrame() {
        const g = this.mapGrid;
        const w = FRAME.r - FRAME.l, h = FRAME.b - FRAME.t;
        g.fillStyle(SEA, 0.5).fillRect(FRAME.l, FRAME.t, w, h);
        const rnd = mulberry32(4242);
        g.lineStyle(1, 0x5f7f84, 0.16);
        for (let i = 0; i < 70; i++) {
            const x = FRAME.l + 14 + rnd() * (w - 40);
            const y = FRAME.t + 14 + rnd() * (h - 40);
            g.beginPath();
            g.moveTo(x, y); g.lineTo(x + 3, y + 2); g.lineTo(x + 6, y);
            g.lineTo(x + 9, y + 2); g.lineTo(x + 12, y);
            g.strokePath();
        }
    }

    createTexts() {
        // left page
        this.text(-545, -383, 'MARK AGENCY', 13, { fontFamily: 'PressStart2P', color: '#52604b' });
        this.text(65, -383, 'INTERNATIONAL FIELD ATLAS', 16, { color: '#69634f' });
        this.mapTitle = this.text(-322, -301, '', 25, {
            color: '#3b3226',
            shadow: { offsetX: 1, offsetY: 1, color: '#fff8e0', blur: 0, fill: true }
        }).setOrigin(0.5);

        this.gridLabels = this.labelPool(16, 11, '#4f5a4d', 0.85);
        this.neighbourLabels = this.labelPool(8, 12, '#6d7258', 0.9);
        this.compassN = this.text(-98, -253, 'N', 13).setOrigin(0.5);

        this.mapMessage = this.text(MAP_CX, -20, 'Loading map...', 18, {
            align: 'center', wordWrap: { width: 370 }, color: '#706b55'
        }).setOrigin(0.5);
        this.markerLabel = this.text(0, 0, '', 16, {
            color: '#6b2f27', backgroundColor: '#eee5cf',
            padding: { left: 5, right: 5, top: 3, bottom: 3 }
        }).setVisible(false);
        this.capitalLabel = this.text(0, 0, '', 12, {
            color: '#473d2e', backgroundColor: '#eee5cf',
            padding: { left: 3, right: 3, top: 1, bottom: 1 }
        }).setVisible(false);

        this.scaleLabel = this.text(0, 0, '', 12, { color: '#5d5a47' }).setOrigin(0, 0.5);
        this.mapCoords = this.text(FRAME.r, 236, '', 9, {
            fontFamily: 'PressStart2P', color: '#6a6a50'
        }).setOrigin(1, 0);
        this.mapCaption = this.text(-580, 256, '', 16, {
            color: '#66664d', wordWrap: { width: 510 }
        });
        this.mapNote = this.text(-580, 280, '', 15, {
            color: '#2f4d80', wordWrap: { width: 510 }
        }).setAngle(-0.8).setAlpha(0.9);

        // right page
        this.caseStampText = this.text(65, -310, '', 15, {
            color: '#7c4338', backgroundColor: '#e6d8bc',
            padding: { left: 10, right: 10, top: 6, bottom: 6 }
        });
        this.countryNameText = this.text(65, -260, '', 36, {
            wordWrap: { width: 510 }, color: '#3b3226',
            shadow: { offsetX: 1, offsetY: 1, color: '#fff8e0', blur: 0, fill: true }
        });
        this.capitalText = this.text(65, -193, '', 21, { wordWrap: { width: 500 } });
        this.regionText = this.text(65, -155, '', 17, { color: '#746a51' });
        this.descriptionText = this.text(65, -110, '', 21, {
            wordWrap: { width: 500 }, lineSpacing: 7
        });
        this.knownLabel = this.text(65, 193, 'KNOWN FOR', 9, {
            fontFamily: 'PressStart2P', color: '#7c725b'
        });
        this.chips = Array.from({ length: 6 }, () => this.text(65, 214, '', 15, {
            color: '#5d4a32', backgroundColor: '#e0d3b3',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setVisible(false));

        this.pageLeftNumber = this.text(-322, 355, '', 15, { color: '#7c725b' }).setOrigin(0.5);
        this.pageRightLabel = this.text(320, 355, '', 15, { color: '#7c725b' }).setOrigin(0.5);
        this.hintText = this.text(0, 415,
            'LEFT / RIGHT: TURN PAGE     A / ESC: CLOSE', 13, {
                color: '#dfd4b4'
            }).setOrigin(0.5);
    }

    createStamp() {
        this.stamp = this.scene.add.container(468, -258);
        this.stampBox = this.scene.add.graphics();
        this.stampText = this.scene.add.text(0, 0, '', {
            fontFamily: 'PressStart2P', fontSize: '11px', color: '#8a3a30'
        }).setOrigin(0.5);
        this.stampText.setResolution?.(2);
        this.stamp.add([this.stampBox, this.stampText]);
        this.stamp.setAngle(7).setAlpha(0.82);
        this.add(this.stamp);
    }

    updateStamp(page) {
        if (!page) {
            this.stamp.setVisible(false);
            return;
        }
        const city = page.type === 'city';
        const pool = city ? CITY_STAMPS : COUNTRY_STAMPS;
        const label = page.entry.stamp ||
            pool[hashString(`${page.type}:${page.entry.id || page.entry.name}`) % pool.length];
        this.stampText.setText(label);
        const w = this.stampText.width + 22, h = this.stampText.height + 14;
        this.stampBox.clear()
            .lineStyle(3, 0x8a3a30, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 4)
            .lineStyle(1, 0x8a3a30, 0.7).strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 2);
        this.stamp.setPosition(558 - w / 2, -258).setVisible(true);
    }

    button(x, y, label, callback, size = 18) {
        const container = this.scene.add.container(x, y);
        const text = this.scene.add.text(0, 0, label, {
            fontFamily: 'SpecialElite', fontSize: `${size}px`, color: '#eee5cf'
        }).setOrigin(0.5);
        text.setResolution?.(2);
        const w = Math.ceil(text.width + 28), h = Math.ceil(text.height + 18);
        const bg = this.scene.add.graphics();
        const hit = this.scene.add.rectangle(0, 0, w, h, 0, 0.001)
            .setInteractive({ useHandCursor: true });
        const draw = hover => {
            bg.clear();
            bg.fillStyle(0, 0.3).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 5);
            bg.fillStyle(hover ? 0x65704b : 0x284c3d, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 5);
            bg.lineStyle(1, hover ? 0xe2c778 : GOLD, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
            bg.lineStyle(1, 0xffffff, 0.12).lineBetween(-w / 2 + 5, -h / 2 + 2, w / 2 - 5, -h / 2 + 2);
        };
        draw(false);
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerdown', (p, lx, ly, event) => {
            event?.stopPropagation();
            if (!this.isOpen || !container.visible) return;
            container.setY(y + 2);
            this.scene.time?.delayedCall(90, () => {
                if (!this.destroyed && container.active) container.setY(y);
            });
            callback();
        });
        container.add([bg, text, hit]);
        return this.add(container);
    }

    createTabs() {
        const regions = [...new Set(this.countries.map(c => c.region).filter(Boolean))];
        const gap = Math.min(85, 570 / Math.max(1, regions.length));
        regions.forEach((region, index) => {
            const code = REGION_CODES[region] ||
                region.split(/\s+/).map(word => word[0]).join('').toUpperCase().slice(0, 3);
            const container = this.scene.add.container(674, -260 + index * gap);
            const gfx = this.scene.add.graphics();
            const label = this.scene.add.text(2, 0, code, {
                fontFamily: 'SpecialElite', fontSize: '15px', color: '#e1d7bd'
            }).setOrigin(0.5);
            label.setResolution?.(2);
            const hit = this.scene.add.rectangle(0, 0, 58, 54, 0, 0.001)
                .setInteractive({ useHandCursor: true });
            const tab = {
                region, container, gfx, label,
                base: TAB_COLORS[index % TAB_COLORS.length],
                active: false, baseX: 674, baseY: -260 + index * gap
            };
            hit.on('pointerover', () => this.drawTab(tab, tab.active, true));
            hit.on('pointerout', () => this.drawTab(tab, tab.active, false));
            hit.on('pointerdown', (p, x, y, event) => {
                event?.stopPropagation();
                if (this.isOpen) this.jumpToContinent(region);
            });
            container.add([gfx, label, hit]);
            this.add(container);
            this.tabs.push(tab);
            this.drawTab(tab, false, false);
        });
    }

    drawTab(tab, active, hover) {
        const w = 58, h = 54, radius = { tl: 0, tr: 8, bl: 0, br: 8 };
        const color = active ? 0x8b7448 : hover ? tab.base + 0x1a1a1a : tab.base;
        tab.gfx.clear();
        tab.gfx.fillStyle(0, 0.25).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, radius);
        tab.gfx.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        tab.gfx.lineStyle(1, 0xd8c9a0, active ? 0.9 : 0.35).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
        tab.label.setColor(active ? '#fff7dd' : '#e1d7bd');
    }

    // ------------------------------------------------------------ layout
    layout() {
        if (this.destroyed) return;
        const { width, height } = this.scene.scale;
        this.overlay.setPosition(width / 2, height / 2).setSize(width, height);
        this.overlay.input?.hitArea?.setTo(0, 0, width, height);
        const scale = Math.max(0.05, Math.min((width - 24) / 1430, (height - 24) / 930, 1));
        this.baseX = width / 2 - 10 * scale;
        this.baseY = height / 2;
        this.book.setPosition(this.baseX, this.baseY).setScale(scale);
    }

    // ------------------------------------------------------------ boundary data
    async loadBoundaries() {
        if (!AtlasUI.boundariesPromise) {
            AtlasUI.boundariesPromise = (async () => {
                for (const url of MAP_SOURCES) {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 15000);
                    try {
                        const response = await fetch(url, { signal: controller.signal });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        if (!Array.isArray(data.features)) throw new Error('Invalid map data');
                        return data.features;
                    } catch (error) {
                        if (url === MAP_SOURCES[MAP_SOURCES.length - 1]) throw error;
                    } finally { clearTimeout(timeout); }
                }
                throw new Error('No boundary data');
            })().catch(error => {
                AtlasUI.boundariesPromise = null;
                throw error;
            });
        }
        try {
            const features = await AtlasUI.boundariesPromise;
            if (this.destroyed) return;
            this.features = features;
            this.featureRecords = features.map(feature => {
                const props = {};
                Object.entries(feature.properties || {}).forEach(([k, v]) => {
                    props[k.toUpperCase()] = v;
                });
                return { feature, props };
            });
            this.recordCache.clear();
            this.mapState = 'ready';
        } catch (error) {
            if (this.destroyed) return;
            console.warn('[AtlasUI] Boundary loading failed:', error);
            this.mapState = 'error';
        }
        this.drawCountryMap();
    }

    normalize(value) { return String(value || '').trim().toLowerCase(); }

    getCountryRecord(country) {
        const key = country.id || country.name;
        if (this.recordCache.has(key)) return this.recordCache.get(key);
        const code = String(country.iso3 || '').toUpperCase();
        const record = this.featureRecords.find(rec => {
            const p = rec.props;
            return (code && [p.ADM0_A3, p.ISO_A3, p.ISO_A3_EH].includes(code)) ||
                [p.ADMIN, p.NAME, p.NAME_LONG, p.NAME_EN].some(name =>
                    this.normalize(name) === this.normalize(country.name));
        });
        this.recordCache.set(key, record);
        return record;
    }

    polygonsOf(geometry) {
        if (!geometry) return [];
        if (geometry.type === 'Polygon') return [geometry.coordinates];
        if (geometry.type === 'MultiPolygon') return geometry.coordinates;
        return [];
    }

    getPolygons(country) {
        let polygons = this.polygonsOf(this.getCountryRecord(country)?.feature?.geometry);
        const bounds = country.mapBounds;
        if (Array.isArray(bounds) && bounds.length === 4) {
            polygons = polygons.filter(polygon => {
                const ring = polygon[0] || [];
                if (!ring.length) return false;
                const lon = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
                const lat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
                return lon >= bounds[0] && lon <= bounds[2] &&
                    lat >= bounds[1] && lat <= bounds[3];
            });
        }
        return polygons;
    }

    ringBounds(ring) {
        let cached = AtlasUI.boundsCache.get(ring);
        if (cached) return cached;
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (let i = 0; i < ring.length; i++) {
            const p = ring[i];
            if (p[0] < minLon) minLon = p[0];
            if (p[0] > maxLon) maxLon = p[0];
            if (p[1] < minLat) minLat = p[1];
            if (p[1] > maxLat) maxLat = p[1];
        }
        cached = { minLon, maxLon, minLat, maxLat };
        AtlasUI.boundsCache.set(ring, cached);
        return cached;
    }

    // ------------------------------------------------------------ map drawing
    hideMapLabels() {
        this.gridLabels.forEach(l => l.setVisible(false));
        this.neighbourLabels.forEach(l => l.setVisible(false));
        this.markerLabel.setVisible(false);
        this.capitalLabel.setVisible(false);
        this.scaleLabel.setVisible(false);
        this.pulse.setVisible(false);
    }

    drawCountryMap() {
        if (this.destroyed) return;
        const g = this.mapGraphics;
        const top = this.mapTop;
        g.clear();
        top.clear();
        this.hideMapLabels();
        this.drawCompass(top);

        const page = this.getCurrentPage();
        if (!page || this.mapState !== 'ready') {
            this.mapMessage.setVisible(true).setText(!page ? 'No country selected.' :
                this.mapState === 'error' ?
                    'Map unavailable.\nThe geography department blames the connection.' :
                    'Retrieving cartographic intelligence...');
            this.drawNeatline(top, [], []);
            return;
        }
        const polygons = this.getPolygons(page.country);
        if (!polygons.length) {
            this.mapMessage.setVisible(true).setText('No boundary data for this entry.');
            this.drawNeatline(top, [], []);
            return;
        }
        this.mapMessage.setVisible(false);

        // ---- projection
        const points = polygons.flatMap(p => p[0] || []);
        const lons = points.map(p => p[0]);
        const lats = points.map(p => p[1]);
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        lons.forEach(v => { if (v < minLon) minLon = v; if (v > maxLon) maxLon = v; });
        lats.forEach(v => { if (v < minLat) minLat = v; if (v > maxLat) maxLat = v; });
        const midLon = (minLon + maxLon) / 2, midLat = (minLat + maxLat) / 2;
        const factor = Math.max(0.15, Math.cos(midLat * Math.PI / 180));
        const scale = Math.min(MAP_MAX_W / Math.max(0.001, (maxLon - minLon) * factor),
            MAP_MAX_H / Math.max(0.001, maxLat - minLat));
        const kx = factor * scale;
        const project = ([lon, lat]) => ({
            x: MAP_CX + (lon - midLon) * kx,
            y: MAP_CY - (lat - midLat) * scale
        });
        const view = {
            minLon: midLon + (FRAME.l - MAP_CX) / kx,
            maxLon: midLon + (FRAME.r - MAP_CX) / kx,
            minLat: midLat - (FRAME.b - MAP_CY) / scale,
            maxLat: midLat - (FRAME.t - MAP_CY) / scale
        };
        const projected = polygons.map(p => p.map(ring => ring.map(project)));
        const mainRecord = this.getCountryRecord(page.country);

        // ---- 1. coastal ripples (main country only)
        [[10, 0.07], [6, 0.10], [3, 0.15]].forEach(([w, a]) => {
            g.lineStyle(w, 0x5f8a8f, a);
            projected.forEach(rings => g.strokePoints(rings[0], true));
        });

        // ---- 2. neighbouring countries
        const neighbours = this.drawNeighbours(g, project, view, mainRecord);
        this.placeNeighbourLabels(neighbours);

        // ---- 3. main country
        projected.forEach(rings => {
            g.fillStyle(0x45462e, 0.18).fillPoints(
                rings[0].map(p => ({ x: p.x + 4, y: p.y + 5 })), true);
        });
        projected.forEach(rings => {
            g.fillStyle(LAND, 1).fillPoints(rings[0], true);
            rings.slice(1).forEach(hole => g.fillStyle(SEA_HOLE, 1).fillPoints(hole, true));
        });

        // ---- 4. hatching
        g.lineStyle(1, INK, 0.11);
        const yTop = Math.max(FRAME.t + 8, MAP_CY - (maxLat - midLat) * scale);
        const yBottom = Math.min(FRAME.b - 8, MAP_CY - (minLat - midLat) * scale);
        for (let y = Math.ceil(yTop / 9) * 9; y <= yBottom; y += 9) {
            projected.forEach(rings => {
                const hits = [];
                rings.forEach(ring => {
                    for (let i = 0; i < ring.length; i++) {
                        const a = ring[i], b = ring[(i + 1) % ring.length];
                        if ((a.y > y) === (b.y > y)) continue;
                        hits.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
                    }
                });
                hits.sort((a, b) => a - b);
                for (let i = 0; i + 1 < hits.length; i += 2) g.lineBetween(hits[i], y, hits[i + 1], y);
            });
        }

        // ---- 5. graticule + labels
        const grid = this.drawGraticule(g, project, view, midLat, midLon);

        // ---- 6. main outline
        g.lineStyle(2, INK, 0.9);
        projected.forEach(rings => rings.forEach(ring => g.strokePoints(ring, true)));

        // ---- 7. frame, scale bar, markers
        this.drawNeatline(top, grid.xs, grid.ys);
        this.drawScaleBar(top, 111.2 / scale);
        this.drawMarkers(top, page, project);
    }

    drawNeighbours(g, project, view, skipRecord) {
        const found = [];
        this.featureRecords.forEach(rec => {
            if (rec === skipRecord) return;
            let best = null;
            this.polygonsOf(rec.feature.geometry).forEach(poly => {
                const ring = poly[0];
                if (!ring || ring.length < 3) return;
                const b = this.ringBounds(ring);
                if (b.maxLon < view.minLon || b.minLon > view.maxLon ||
                    b.maxLat < view.minLat || b.minLat > view.maxLat) return;
                const clipped = clipPolygon(ring.map(project), FRAME);
                if (clipped.length < 3) return;
                g.fillStyle(LAND_FAR, 1).fillPoints(clipped, true);
                g.lineStyle(1, INK, 0.38).strokePoints(clipped, true);
                const c = polygonCentroid(clipped);
                if (c && (!best || c.area > best.area)) best = { ...c, pts: clipped };
            });
            if (best) {
                const p = rec.props;
                found.push({
                    name: String(p.NAME_EN || p.NAME || p.ADMIN || '').toUpperCase(),
                    ...best
                });
            }
        });
        return found;
    }

    placeNeighbourLabels(neighbours) {
        neighbours
            .filter(n => n.name && n.area > 2400)
            .sort((a, b) => b.area - a.area)
            .slice(0, this.neighbourLabels.length)
            .forEach((n, i) => {
                const label = this.neighbourLabels[i];
                label.setText(n.name).setPosition(n.x, n.y);
                label.setOrigin(0.5);
                const inside = pointInPolygon(n.x, n.y, n.pts);
                const fits = label.width + 8 < Math.sqrt(n.area) * 1.6;
                const clear = n.x > FRAME.l + 30 && n.x < FRAME.r - 30 &&
                    n.y > FRAME.t + 20 && n.y < FRAME.b - 20;
                label.setVisible(inside && fits && clear);
            });
    }

    drawGraticule(g, project, view, midLat, midLon) {
        const xs = [], ys = [];
        let used = 0;
        const lonStep = niceStep((view.maxLon - view.minLon) / 4);
        const latStep = niceStep((view.maxLat - view.minLat) / 4);
        g.lineStyle(1, 0x4d5a50, 0.22);

        for (let lon = Math.ceil(view.minLon / lonStep) * lonStep; lon <= view.maxLon; lon += lonStep) {
            const x = project([lon, midLat]).x;
            if (x < FRAME.l + 16 || x > FRAME.r - 16) continue;
            xs.push(x);
            dashedLine(g, x, FRAME.t + 5, x, FRAME.b - 5);
            const label = this.gridLabels[used++];
            if (label) {
                const v = Math.round(lon * 100) / 100;
                label.setOrigin(0, 1).setPosition(x + 3, FRAME.b - 8)
                    .setText(`${formatDeg(Math.abs(v))}°${v >= 0 ? 'E' : 'W'}`).setVisible(true);
            }
        }
        for (let lat = Math.ceil(view.minLat / latStep) * latStep; lat <= view.maxLat; lat += latStep) {
            const y = project([midLon, lat]).y;
            if (y < FRAME.t + 16 || y > FRAME.b - 16) continue;
            ys.push(y);
            dashedLine(g, FRAME.l + 5, y, FRAME.r - 5, y);
            const label = this.gridLabels[used++];
            if (label) {
                const v = Math.round(lat * 100) / 100;
                label.setOrigin(0, 1).setPosition(FRAME.l + 9, y - 1)
                    .setText(`${formatDeg(Math.abs(v))}°${v >= 0 ? 'N' : 'S'}`).setVisible(true);
            }
        }
        return { xs, ys };
    }

    drawNeatline(g, xs, ys) {
        const { l, t, r, b } = FRAME;
        const w = r - l, h = b - t, band = 5;
        const xAll = [l, ...[...xs].sort((a, c) => a - c), r];
        const yAll = [t, ...[...ys].sort((a, c) => a - c), b];
        const fill = i => (i % 2 ? g.fillStyle(PAPER, 1) : g.fillStyle(INK, 0.8));
        for (let i = 0; i < xAll.length - 1; i++) {
            fill(i);
            g.fillRect(xAll[i], t, xAll[i + 1] - xAll[i], band);
            g.fillRect(xAll[i], b - band, xAll[i + 1] - xAll[i], band);
        }
        for (let i = 0; i < yAll.length - 1; i++) {
            fill(i);
            g.fillRect(l, yAll[i], band, yAll[i + 1] - yAll[i]);
            g.fillRect(r - band, yAll[i], band, yAll[i + 1] - yAll[i]);
        }
        g.lineStyle(1, INK, 0.85).strokeRect(l, t, w, h);
        g.lineStyle(1, INK, 0.85).strokeRect(l + band, t + band, w - band * 2, h - band * 2);
        g.lineStyle(1, INK, 0.45).strokeRect(l - 3, t - 3, w + 6, h + 6);
    }

    drawCompass(g) {
        const cx = -98, cy = -224, R = 18;
        g.fillStyle(PAPER, 0.9).fillCircle(cx, cy, R + 3);
        g.lineStyle(1, INK, 0.75).strokeCircle(cx, cy, R + 3);
        g.lineStyle(1, INK, 0.35).strokeCircle(cx, cy, R - 7);
        const diag = Math.SQRT1_2;
        [[diag, -diag], [diag, diag], [-diag, diag], [-diag, -diag]].forEach(([dx, dy]) => {
            const len = R * 0.62, px = -dy, py = dx, w = R * 0.14;
            const tx = cx + dx * len, ty = cy + dy * len;
            g.fillStyle(INK, 0.45).fillTriangle(tx, ty, cx, cy, cx + px * w, cy + py * w);
            g.fillStyle(PAPER, 1).fillTriangle(tx, ty, cx, cy, cx - px * w, cy - py * w);
            g.lineStyle(1, INK, 0.5).strokeTriangle(tx, ty, cx + px * w, cy + py * w, cx - px * w, cy - py * w);
        });
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], i) => {
            const px = -dy, py = dx, w = R * 0.22;
            const tx = cx + dx * R, ty = cy + dy * R;
            g.fillStyle(i === 0 ? RED : INK, 0.92)
                .fillTriangle(tx, ty, cx, cy, cx + px * w, cy + py * w);
            g.fillStyle(PAPER, 1).fillTriangle(tx, ty, cx, cy, cx - px * w, cy - py * w);
            g.lineStyle(1, INK, 0.8).strokeTriangle(tx, ty, cx + px * w, cy + py * w, cx - px * w, cy - py * w);
        });
        g.fillStyle(INK, 1).fillCircle(cx, cy, 2);
    }

    drawScaleBar(g, kmPerPx) {
        let km = NICE_KM[0];
        NICE_KM.forEach(option => { if (option / kmPerPx <= 130) km = option; });
        const px = km / kmPerPx;
        const x0 = FRAME.l, y = 240, h = 5, seg = px / 4;
        for (let i = 0; i < 4; i++) {
            g.fillStyle(i % 2 ? PAPER : INK, 1).fillRect(x0 + i * seg, y, seg, h);
        }
        g.lineStyle(1, INK, 0.9).strokeRect(x0, y, px, h);
        this.scaleLabel.setText(`${km} km`).setPosition(x0 + px + 8, y + h / 2).setVisible(true);
    }

    drawMarkers(g, page, project) {
        const coords = page.type === 'city' ? page.entry.coordinates :
            page.country.capitalCoordinates;
        if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite)) return;
        const inFrame = pt => pt.x > FRAME.l + 8 && pt.x < FRAME.r - 8 &&
            pt.y > FRAME.t + 8 && pt.y < FRAME.b - 8;
        const point = project(coords);
        if (!inFrame(point)) return;

        // capital diamond on city pages (when the city is not the capital)
        const cap = page.country.capitalCoordinates;
        if (page.type === 'city' && Array.isArray(cap) && cap.length === 2 &&
            cap.every(Number.isFinite) && page.country.capital) {
            const cp = project(cap);
            if (inFrame(cp) && Math.hypot(cp.x - point.x, cp.y - point.y) > 26) {
                g.fillStyle(INK, 0.9).fillTriangle(cp.x, cp.y - 6, cp.x - 5, cp.y, cp.x + 5, cp.y);
                g.fillStyle(INK, 0.9).fillTriangle(cp.x, cp.y + 6, cp.x - 5, cp.y, cp.x + 5, cp.y);
                this.capitalLabel.setText(page.country.capital)
                    .setPosition(Math.min(cp.x + 8, FRAME.r - 10 - this.capitalLabel.width), cp.y - 8)
                    .setVisible(true);
            }
        }

        g.fillStyle(PAPER, 1).fillCircle(point.x, point.y, 8);
        g.lineStyle(2, RED, 1).strokeCircle(point.x, point.y, 7);
        g.fillStyle(RED, 1).fillCircle(point.x, point.y, 3);
        g.lineStyle(2, RED, 1);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            g.lineBetween(point.x + dx * 11, point.y + dy * 11, point.x + dx * 17, point.y + dy * 17);
        });
        this.pulse.setPosition(point.x, point.y).setVisible(true);

        this.markerLabel.setText(page.type === 'city' ? page.entry.name : page.country.capital || '')
            .setVisible(true);
        this.markerLabel.setPosition(
            Math.max(FRAME.l + 10, Math.min(point.x + 14, FRAME.r - 10 - this.markerLabel.width)),
            Math.max(FRAME.t + 10, Math.min(point.y - 30, FRAME.b - 38)));
    }

    // ------------------------------------------------------------ page content
    getCurrentPage() { return this.pages[this.pageIndex] || null; }
    getCurrentCountry() { return this.getCurrentPage()?.country || null; }

    fitText(obj, maxW, maxH, start, min) {
        let size = start;
        obj.setFontSize(size);
        while (size > min && (obj.width > maxW || obj.height > maxH)) {
            size--;
            obj.setFontSize(size);
        }
    }

    refreshPage() {
        if (this.destroyed) return;
        const page = this.getCurrentPage();
        const country = page?.country;
        const entry = page?.entry;
        const city = page?.type === 'city';
        const number = String(this.pageIndex + 1).padStart(2, '0');

        // left page
        this.mapTitle.setText((country?.name || 'WORLD ATLAS').toUpperCase());
        this.fitText(this.mapTitle, 470, 40, 25, 13);
        this.mapCaption.setText(city ? `CITY LOCATION: ${entry.name.toUpperCase()}` :
            `${country?.mapLabel || 'COUNTRY OUTLINE'} / REFERENCE ${number}`);
        const note = entry?.agentNote ||
            AGENT_NOTES[hashString(`${page?.type}:${entry?.id || entry?.name}`) % AGENT_NOTES.length];
        this.mapNote.setText(page ? note : '');
        const coords = city ? entry?.coordinates : country?.capitalCoordinates;
        if (Array.isArray(coords) && coords.length === 2 && coords.every(Number.isFinite)) {
            const [lon, lat] = coords;
            this.mapCoords.setText(`${Math.abs(lat).toFixed(2)}${lat >= 0 ? 'N' : 'S'} ` +
                `${Math.abs(lon).toFixed(2)}${lon >= 0 ? 'E' : 'W'}`);
        } else {
            this.mapCoords.setText('');
        }

        // right page header
        this.countryNameText.setText(entry?.name || 'Atlas');
        this.fitText(this.countryNameText, 510, 90, 36, 24);
        this.caseStampText.setText(`${city ? 'CITY' : 'COUNTRY'} FILE / ${country?.iso3 || '--'}`);
        this.caseTagGfx.clear()
            .lineStyle(1, 0x7c4338, 0.8)
            .strokeRect(this.caseStampText.x, this.caseStampText.y,
                this.caseStampText.width, this.caseStampText.height)
            .lineStyle(1, 0x7c4338, 0.35)
            .strokeRect(this.caseStampText.x + 3, this.caseStampText.y + 3,
                this.caseStampText.width - 6, this.caseStampText.height - 6);

        const y = Math.max(-193, this.countryNameText.y + this.countryNameText.height + 14);
        this.capitalText.setY(y).setText(city ? `Country: ${country.name}` :
            `Capital: ${country?.capital || 'Unknown'}`);
        this.regionText.setY(y + this.capitalText.height + 10)
            .setText(`Region: ${country?.region || 'Unknown'}`);

        const dividerY = this.regionText.y + this.regionText.height + 11;
        this.dividerGfx.clear()
            .lineStyle(1, INK, 0.35).lineBetween(65, dividerY, 300, dividerY)
            .lineBetween(330, dividerY, 565, dividerY)
            .fillStyle(INK, 0.55).fillTriangle(315, dividerY - 5, 308, dividerY, 322, dividerY)
            .fillTriangle(315, dividerY + 5, 308, dividerY, 322, dividerY);

        this.descriptionText.setY(dividerY + 13).setText(entry?.description || 'No entries loaded.');
        this.fitText(this.descriptionText, 520, 180 - this.descriptionText.y, 21, 13);

        // known-for chips
        const tokens = String(entry?.knownFor || '').split(',')
            .map(t => t.trim()).filter(Boolean)
            .map(t => t.charAt(0).toUpperCase() + t.slice(1));
        this.knownLabel.setVisible(tokens.length > 0);
        let cursor = 65;
        this.chips.forEach((chip, i) => {
            if (i >= tokens.length) { chip.setVisible(false); return; }
            chip.setText(tokens[i]);
            const fits = cursor + chip.width <= 565;
            chip.setPosition(cursor, 214).setVisible(fits);
            if (fits) cursor += chip.width + 8;
        });

        this.pageLeftNumber.setText(page ? `${city ? 'CITY' : 'MAP'} ${number}` : 'MAP --');
        this.pageRightLabel.setText(page ? `${this.pageIndex + 1} / ${this.pages.length}` : '--');
        this.countryBtn.setVisible(!!page && city);
        this.cityBtn.setVisible(!!country?.cities?.length);
        this.updateStamp(page);

        this.tabs.forEach(tab => {
            const active = tab.region === country?.region;
            tab.active = active;
            tab.container.setX(tab.baseX + (active ? 9 : 0));
            this.drawTab(tab, active, false);
        });
        this.drawCountryMap();
    }

    // ------------------------------------------------------------ navigation
    goToPage(index, sound = true, direction = null) {
        if (!this.pages.length || index < 0 || index >= this.pages.length) return;
        const previous = this.pageIndex;
        this.pageIndex = index;
        this.refreshPage();
        if (sound && this.isOpen && index !== previous) {
            this.playPageTurnFX(direction ?? (index > previous ? 1 : -1));
        }
    }
    previousPage() {
        if (this.pages.length) {
            this.goToPage((this.pageIndex - 1 + this.pages.length) % this.pages.length, true, -1);
        }
    }
    nextPage() {
        if (this.pages.length) {
            this.goToPage((this.pageIndex + 1) % this.pages.length, true, 1);
        }
    }
    jumpToContinent(region) {
        const index = this.pages.findIndex(p => p.type === 'country' && p.country.region === region);
        if (index >= 0) this.goToPage(index);
    }
    matches(entry, value) {
        const needle = this.normalize(value);
        return [entry.id, entry.name, ...(entry.aliases || [])]
            .some(v => this.normalize(v) === needle);
    }
    openToCountry(value) {
        const index = this.pages.findIndex(p => p.type === 'country' && this.matches(p.country, value));
        if (index >= 0) this.goToPage(index, false);
        else {
            const cityIndex = this.pages.findIndex(p => p.type === 'city' && this.matches(p.entry, value));
            if (cityIndex >= 0) this.goToPage(cityIndex, false);
        }
        this.open();
    }
    openToCity(value, countryId = '') {
        const index = this.pages.findIndex(p => p.type === 'city' && this.matches(p.entry, value) &&
            (!countryId || this.matches(p.country, countryId)));
        if (index >= 0) this.goToPage(index, false);
        this.open();
    }

    playPageTurnFX(direction = 1) {
        audioManager.playSfx('pagesound');
        const sweep = direction >= 0 ? this.sweepRight : this.sweepLeft;
        if (!sweep) return;
        this.scene.tweens.killTweensOf(sweep);
        sweep.setVisible(true).setScale(1, 1).setAlpha(1);
        this.scene.tweens.add({
            targets: sweep, scaleX: 0, alpha: 0.6, duration: 260, ease: 'Cubic.easeIn',
            onComplete: () => { if (!this.destroyed) sweep.setVisible(false); }
        });
    }

    bindKeyboard() {
        const keyboard = this.scene.input?.keyboard;
        if (!keyboard) return;
        const bindings = [['keydown-A', () => this.toggle(), false],
            ['keydown-LEFT', () => this.previousPage(), true],
            ['keydown-RIGHT', () => this.nextPage(), true],
            ['keydown-ESC', () => this.close(), true]];
        bindings.forEach(([key, action, onlyOpen]) => {
            const handler = event => {
                const el = document.activeElement;
                if (this.destroyed || event.repeat || el?.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) ||
                    (onlyOpen && !this.isOpen)) return;
                event.preventDefault();
                action();
            };
            keyboard.on(key, handler);
            this.keyBindings.push([key, handler]);
        });
    }

    // ------------------------------------------------------------ open / close
    open() {
        if (this.destroyed) return;
        this.layout();
        this.refreshPage();
        if (this.isOpen) return;
        this.isOpen = true;
        EventBus.emit('hideHUD');
        this.scene.tweens.killTweensOf([this.overlay, this.book]);
        this.overlay.setVisible(true);
        this.book.setVisible(true);
        this.book.setY(this.baseY + 18);
        this.scene.tweens.add({
            targets: [this.overlay, this.book], alpha: 1,
            duration: 200, ease: 'Sine.easeOut'
        });
        this.scene.tweens.add({
            targets: this.book, y: this.baseY,
            duration: 240, ease: 'Cubic.easeOut'
        });
    }

    close() {
        if (this.destroyed || !this.isOpen) return;
        this.isOpen = false;
        this.scene.tweens.killTweensOf([this.overlay, this.book]);
        this.scene.tweens.add({
            targets: [this.overlay, this.book], alpha: 0,
            duration: 150, ease: 'Sine.easeIn', onComplete: () => {
                if (this.destroyed || this.isOpen) return;
                this.overlay.setVisible(false);
                this.book.setVisible(false);
                this.book.setY(this.baseY);
                EventBus.emit('showHUD');
            }
        });
        this.scene.tweens.add({
            targets: this.book, y: this.baseY + 10,
            duration: 150, ease: 'Sine.easeIn'
        });
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    destroy() {
        if (this.destroyed) return;
        const wasOpen = this.isOpen;
        this.destroyed = true;
        this.isOpen = false;
        this.keyBindings.forEach(([key, handler]) => this.scene.input?.keyboard?.off(key, handler));
        this.scene.scale?.off('resize', this.boundResize);
        this.scene.events?.off('shutdown', this.boundShutdown);
        this.pulseTween?.stop();
        this.scene.tweens?.killTweensOf([
            this.overlay, this.book, this.pulse, this.sweepLeft, this.sweepRight
        ]);
        this.book?.destroy(true);
        this.overlay?.destroy();
        this.keyBindings = [];
        this.tabs = [];
        this.features = [];
        this.featureRecords = [];
        this.recordCache.clear();
        if (wasOpen) EventBus.emit('showHUD');
    }
}