// ui/DestinationWorldMap.js
// Painted, animated world map used by DestinationsUI.
// Theme "agency": modern spy grid (Mark Agency travel desk).
// Theme "pi":     old expedition map (private investigator office).

import {
    AGENCY_TICKER_LINES,
    GAME_COUNTRIES_ISO3,
    PI_FIELD_NOTES,
    ROUTE_SHADOW_COLOR,
    getCityLonLat,
    getCountryIso3,
    getDestinationTheme
} from './DestinationMeta.js';
import {
    MAP_FRAME,
    MAP_H,
    MAP_W,
    PI_COMPASS,
    PROJECTION,
    ensureFonts,
    loadCountries,
    paintMap,
    placeLabels
} from './DestinationMapPainter.js';

// ---------------------------------------------------------------- texture registry
const TEXTURES = new Map();

function repaintTexture(rec) {
    const manager = rec.manager;
    if (!manager || !manager.exists(rec.key) || manager.get(rec.key) !== rec.tex) {
        TEXTURES.delete(rec.key);
        return;
    }
    const ctx = rec.tex.getContext ? rec.tex.getContext() : rec.tex.context;
    if (!ctx) return;
    try {
        paintMap(ctx, rec.themeId, {
            projection: PROJECTION,
            countries: rec.countries,
            highlight: rec.highlight,
            failed: rec.failed
        });
    } catch (error) {
        console.warn('[DestinationWorldMap] Painting failed:', error);
    }
    rec.tex.refresh();
}

function loadInto(rec) {
    if (rec.loading) return;
    rec.loading = true;
    rec.failed = false;
    Promise.all([
        loadCountries().catch(error => {
            console.warn('[DestinationWorldMap] Boundary loading failed:', error);
            return null;
        }),
        ensureFonts()
    ]).then(([countries]) => {
        rec.loading = false;
        if (countries) rec.countries = countries;
        else rec.failed = true;
        repaintTexture(rec);
    });
}

function ensureMapTexture(scene, themeId, highlight) {
    const key = `destination_map_${themeId}`;
    const manager = scene.textures;
    let rec = TEXTURES.get(key);
    if (rec && (!manager.exists(key) || manager.get(key) !== rec.tex)) {
        TEXTURES.delete(key);
        rec = null;
    }
    if (rec) return key;
    if (manager.exists(key)) manager.remove(key);
    let tex = null;
    try {
        tex = manager.createCanvas(key, MAP_W, MAP_H);
    } catch (error) {
        console.warn('[DestinationWorldMap] Could not create texture:', error);
        return null;
    }
    if (!tex) return null;
    rec = { key, tex, manager, themeId, highlight, countries: null, failed: false, loading: false };
    TEXTURES.set(key, rec);
    repaintTexture(rec);
    loadInto(rec);
    return key;
}

// ---------------------------------------------------------------- geometry helpers
function buildArc(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const lift = Math.min(120, Math.max(14, dist * 0.18));
    let nx = -dy / dist;
    let ny = dx / dist;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const cx = (a.x + b.x) / 2 + nx * lift * 2;
    const cy = (a.y + b.y) / 2 + ny * lift * 2;
    const raw = [];
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        raw.push({
            x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
            y: u * u * a.y + 2 * u * t * cy + t * t * b.y
        });
    }
    return resample(raw, 6);
}

function resample(points, step) {
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
        cumulative[i] = cumulative[i - 1] +
            Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const total = cumulative[cumulative.length - 1];
    const count = Math.max(2, Math.round(total / step) + 1);
    const out = [];
    let j = 0;
    for (let k = 0; k < count; k++) {
        const d = total * k / (count - 1);
        while (j < points.length - 2 && cumulative[j + 1] < d) j++;
        const span = cumulative[j + 1] - cumulative[j] || 1;
        const f = Math.max(0, Math.min(1, (d - cumulative[j]) / span));
        out.push({
            x: points[j].x + (points[j + 1].x - points[j].x) * f,
            y: points[j].y + (points[j + 1].y - points[j].y) * f,
            a: 0
        });
    }
    for (let k = 0; k < out.length; k++) {
        const n = out[Math.min(k + 1, out.length - 1)];
        const p = out[Math.max(k - 1, 0)];
        out[k].a = Math.atan2(n.y - p.y, n.x - p.x);
    }
    return out;
}

function starPoints(cx, cy, outer, inner, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + i * Math.PI / n;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
}

function hexPoints(r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return pts;
}

function makeText(scene, x, y, value, style) {
    const t = scene.add.text(x, y, value, style);
    t.setResolution?.(2);
    return t;
}

// ================================================================= MapPin
class MapPin {
    constructor(worldMap, city, x, y, options = {}) {
        this.wm = worldMap;
        this.scene = worldMap.scene;
        this.theme = worldMap.theme;
        this.themeId = worldMap.themeId;
        this.city = city;
        this.x = x;
        this.y = y;
        this.isHq = Boolean(options.isHq);
        this.hover = false;
        this.selected = false;
        this.destroyed = false;
        this.tweens = [];
        this.selectTween = null;
        this.labelW = 0;
        this.labelH = 0;

        this.container = this.scene.add.container(x, y);
        this.lead = this.scene.add.graphics();
        this.body = this.scene.add.container(0, 0);
        this.buildBody();
        this.buildLabel(options.labelName, options.labelSub);
        this.hit = this.scene.add.circle(0, 0, 19, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true });
        this.container.add([this.lead, this.body, this.label, this.hit]);
    }

    buildBody() {
        const s = this.scene;
        const t = this.theme;
        this.ping = s.add.circle(0, 0, 10, 0x000000, 0)
            .setStrokeStyle(2, t.accent, 0.9);
        const parts = [this.ping];

        if (this.themeId === 'agency') {
            if (this.isHq) {
                const g = s.add.graphics();
                const hex = hexPoints(16);
                g.fillStyle(0x0b2330, 1).fillPoints(hex, true);
                g.lineStyle(2, t.hot, 1).strokePoints(hex, true);
                g.fillStyle(t.gold, 1).fillPoints(starPoints(0, 0, 9, 3.6, 5), true);
                parts.push(g);
            } else {
                this.ring = s.add.circle(0, 0, 12, 0x000000, 0).setStrokeStyle(2, t.accent, 1);
                this.ticks = s.add.graphics();
                this.ticks.lineStyle(2, t.accent, 1);
                [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
                    this.ticks.lineBetween(dx * 16, dy * 16, dx * 23, dy * 23);
                });
                this.dot = s.add.circle(0, 0, 5, t.gold, 1);
                parts.push(this.ring, this.ticks, this.dot);
            }
        } else if (this.isHq) {
            const g = s.add.graphics();
            g.fillStyle(0x2b1a0c, 0.3).fillCircle(2, 3, 15);
            g.fillStyle(0xefe0b4, 1).fillCircle(0, 0, 15);
            g.lineStyle(2.5, 0x2b1a0c, 1).strokeCircle(0, 0, 15);
            g.fillStyle(0x8b2a1d, 1).fillPoints(starPoints(0, 0, 9, 3.8, 5), true);
            parts.push(g);
        } else {
            const g = s.add.graphics();
            g.lineStyle(9, 0x2b1a0c, 0.32);
            g.lineBetween(-8, -8, 12, 13);
            g.lineBetween(12, -7, -8, 13);
            g.lineStyle(6, 0x8b2a1d, 1);
            g.lineBetween(-10, -10, 10, 10);
            g.lineBetween(10, -10, -10, 10);
            this.ring = s.add.circle(0, 0, 18, 0x000000, 0).setStrokeStyle(2, 0x8b2a1d, 0.55);
            parts.push(this.ring, g);
        }
        this.body.add(parts);
    }

    buildLabel(nameOverride, subOverride) {
        const s = this.scene;
        const t = this.theme;
        const rawName = nameOverride || this.city?.city || 'Unknown city';
        const name = this.themeId === 'agency' ? String(rawName).toUpperCase() : rawName;
        const sub = subOverride || this.city?.country || '';
        this.nameText = makeText(s, 11, 5, name, {
            fontFamily: 'SpecialElite', fontSize: '20px', color: t.labelName
        });
        this.subText = makeText(s, 11, 5 + this.nameText.height - 3,
            this.themeId === 'agency' ? String(sub).toUpperCase() : sub, {
                fontFamily: 'SpecialElite', fontSize: '13px', color: t.labelSub
            });
        this.labelW = Math.ceil(Math.max(this.nameText.width, this.subText.width) + 24);
        this.labelH = Math.ceil(this.nameText.height + this.subText.height + 5);
        this.labelBg = s.add.graphics();
        this.labelHit = s.add.rectangle(0, 0, this.labelW, this.labelH, 0xffffff, 0.001)
            .setOrigin(0).setInteractive({ useHandCursor: true });
        this.label = s.add.container(24, -this.labelH / 2);
        this.label.add([this.labelBg, this.nameText, this.subText, this.labelHit]);
        this.drawLabel();
    }

    drawLabel() {
        const g = this.labelBg;
        const t = this.theme;
        const w = this.labelW;
        const h = this.labelH;
        const hot = this.hover || this.selected;
        g.clear();
        if (this.themeId === 'agency') {
            g.fillStyle(0x03121b, 0.9).fillRect(0, 0, w, h);
            g.lineStyle(1, t.accent, hot ? 0.95 : 0.5).strokeRect(0, 0, w, h);
            g.fillStyle(hot ? t.gold : t.accent, 1).fillRect(0, 0, 4, h);
        } else {
            g.fillStyle(0xf0e1b4, 0.97).fillRect(0, 0, w, h);
            g.lineStyle(hot ? 2 : 1.5, hot ? 0x8b2a1d : 0x4a3320, 1).strokeRect(0, 0, w, h);
            g.fillStyle(0xd9c27a, 0.85).fillPoints([
                { x: -4, y: 4 }, { x: 10, y: -3 }, { x: 17, y: 5 }, { x: 3, y: 12 }
            ], true);
        }
        this.nameText.setColor(hot ? t.labelNameHot : t.labelName);
    }

    placeLabel(x, y, dist) {
        const rx = x - this.x;
        const ry = y - this.y;
        this.label.setPosition(rx, ry);
        this.lead.clear();
        if (dist > 26) {
            const nx = Math.max(rx, Math.min(0, rx + this.labelW));
            const ny = Math.max(ry, Math.min(0, ry + this.labelH));
            const t = this.theme;
            this.lead.lineStyle(1.5, this.themeId === 'agency' ? t.accent : 0x4a3320, 0.8);
            this.lead.lineBetween(0, 0, nx, ny);
        }
    }

    bind(handlers = {}) {
        for (const target of [this.hit, this.labelHit]) {
            target.on('pointerover', () => handlers.onOver?.(this));
            target.on('pointerout', () => handlers.onOut?.(this));
            target.on('pointerdown', (pointer, lx, ly, event) => {
                event?.stopPropagation?.();
                handlers.onDown?.(this);
            });
        }
    }

    setHover(value) {
        if (this.destroyed || this.hover === value) return;
        this.hover = value;
        if (!this.selected) this.body.setScale(value ? 1.18 : 1);
        this.drawLabel();
    }

    setSelected(value) {
        if (this.destroyed) return;
        this.selected = value;
        this.selectTween?.stop?.();
        this.selectTween = null;
        if (this.themeId === 'agency') {
            this.dot?.setFillStyle(value ? 0xffffff : this.theme.gold, 1);
            this.body.setScale(value ? 1.25 : (this.hover ? 1.18 : 1));
            if (this.ticks) {
                if (value) {
                    this.selectTween = this.scene.tweens.add({
                        targets: this.ticks, angle: 360, duration: 2600, repeat: -1
                    });
                } else {
                    this.ticks.setAngle(0);
                }
            }
        } else if (value) {
            this.body.setScale(1.3);
            this.selectTween = this.scene.tweens.add({
                targets: this.body, angle: { from: -7, to: 7 }, duration: 260,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        } else {
            this.body.setAngle(0);
            this.body.setScale(this.hover ? 1.18 : 1);
        }
        this.drawLabel();
    }

    startAnimations() {
        if (this.destroyed || this.tweens.length) return;
        this.tweens.push(this.scene.tweens.add({
            targets: this.ping,
            scale: { from: 1, to: this.isHq ? 2.2 : 2.6 },
            alpha: { from: 0.9, to: 0 },
            duration: 1500, repeat: -1, delay: Math.random() * 1200, ease: 'Sine.easeOut'
        }));
    }

    stopAnimations() {
        this.tweens.forEach(tw => tw?.stop?.());
        this.tweens = [];
        this.ping?.setScale(1).setAlpha(0.9);
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.stopAnimations();
        this.selectTween?.stop?.();
        this.selectTween = null;
        this.container?.destroy(true);
        this.container = null;
    }
}

// ================================================================= DestinationWorldMap
export class DestinationWorldMap {
    constructor(scene, parent, { themeId = 'agency', width = MAP_W, height = MAP_H, extraCountries = [] } = {}) {
        this.scene = scene;
        this.parent = parent;
        this.themeId = themeId === 'pi' ? 'pi' : 'agency';
        this.theme = getDestinationTheme(this.themeId);
        this.projection = PROJECTION;
        this.frame = MAP_FRAME;

        this.active = false;
        this.destroyed = false;
        this.pins = [];
        this.hqPin = null;
        this.herePos = null;
        this.hereMarker = null;
        this.herePulses = [];
        this.sweep = null;
        this.hereTweens = [];
        this.tweens = [];
        this.timers = [];
        this.route = null;
        this.arcs = [];
        this.noteState = { target: '', typed: 0, hold: 0, idx: 0, override: false };
        this.sats = [];

        const highlight = new Set(GAME_COUNTRIES_ISO3);
        extraCountries.forEach(name => {
            const iso = getCountryIso3(name);
            if (iso) highlight.add(iso);
        });

        this.root = scene.add.container(0, 0).setScale(width / MAP_W, height / MAP_H);
        parent.add(this.root);
        this.textureKey = ensureMapTexture(scene, this.themeId, highlight);

        if (this.textureKey) {
            this.baseImage = scene.add.image(0, 0, this.textureKey).setOrigin(0);
        } else {
            this.baseImage = scene.add.rectangle(0, 0, MAP_W, MAP_H, this.theme.fallbackBg).setOrigin(0);
        }
        this.baseImage.setInteractive();
        this.root.add(this.baseImage);

        this.fxLayer = scene.add.container(0, 0);
        this.routeLayer = scene.add.container(0, 0);
        this.pinLayer = scene.add.container(0, 0);
        this.hudLayer = scene.add.container(0, 0);
        this.root.add([this.fxLayer, this.routeLayer, this.pinLayer, this.hudLayer]);

        this.networkGfx = scene.add.graphics();
        this.packetGfx = scene.add.graphics();
        this.fxLayer.add([this.networkGfx, this.packetGfx]);
        this.routeGfx = scene.add.graphics();
        this.routeLayer.add(this.routeGfx);
        this.buildPlane();

        this.buildTitle();
        if (this.themeId === 'agency') this.buildAgencyFx();
        else this.buildPiFx();
        this.buildNote();

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.baseImage.on('pointermove', this.onPointerMove);
        this.baseImage.on('pointerout', this.onPointerOut);
    }

    // ------------------------------------------------------------ public helpers
    getCityPosition(location) {
        const lonLat = getCityLonLat(location);
        if (lonLat) return this.projection.project(lonLat[0], lonLat[1]);
        const legacy = location?.map;
        if (legacy && Number.isFinite(legacy.x) && Number.isFinite(legacy.y)) {
            return { x: legacy.x, y: legacy.y };
        }
        return null;
    }

    // ------------------------------------------------------------ building
    buildTitle() {
        const s = this.scene;
        if (this.themeId === 'agency') {
            this.title = makeText(s, MAP_W / 2, 50, 'GLOBAL OPS GRID', {
                fontFamily: 'PressStart2P', fontSize: '24px', color: '#9ffcff'
            }).setOrigin(0.5);
            this.subtitle = makeText(s, MAP_W / 2, 90, 'MARK AGENCY // TRAVEL DESK // CLEARANCE: YES(ISH)', {
                fontFamily: 'PressStart2P', fontSize: '10px', color: '#4fb4c4'
            }).setOrigin(0.5);
        } else {
            this.title = makeText(s, MAP_W / 2, 66, 'Routes of the Intrepid', {
                fontFamily: 'SpecialElite', fontSize: '40px', color: '#3b2a18'
            }).setOrigin(0.5);
            this.subtitle = makeText(s, MAP_W / 2, 102, '(and slightly underfunded)', {
                fontFamily: 'SpecialElite', fontSize: '18px', color: '#7a5c35'
            }).setOrigin(0.5);
        }
        this.hudLayer.add([this.title, this.subtitle]);
    }

    buildNote() {
        const agency = this.themeId === 'agency';
        this.noteText = makeText(this.scene, 70, 1032, '', {
            fontFamily: agency ? 'PressStart2P' : 'SpecialElite',
            fontSize: agency ? '11px' : '22px',
            color: agency ? '#4fe3f2' : '#5a3f22',
            wordWrap: { width: 1380 }
        });
        this.hudLayer.add(this.noteText);
    }

    buildPlane() {
        const s = this.scene;
        const agency = this.themeId === 'agency';
        const pts = [
            [13, 0], [5, -2.2], [-1, -12], [-4, -12], [-2, -2.5], [-9, -2.2], [-12, -6],
            [-14, -6], [-12.5, 0], [-14, 6], [-12, 6], [-9, 2.2], [-2, 2.5], [-4, 12],
            [-1, 12], [5, 2.2]
        ].map(([x, y]) => ({ x: x * 1.25, y: y * 1.25 }));
        const g = s.add.graphics();
        g.fillStyle(0x000000, 0.3).fillPoints(pts.map(p => ({ x: p.x + 3, y: p.y + 4 })), true);
        g.fillStyle(agency ? 0xffffff : 0x2b1a0c, 1).fillPoints(pts, true);
        g.lineStyle(1.5, agency ? this.theme.hot : 0xefe0b4, 1).strokePoints(pts, true);
        this.plane = s.add.container(0, 0, [g]).setVisible(false);
        this.routeLayer.add(this.plane);
    }

    buildAgencyFx() {
        const s = this.scene;
        const F = this.frame;
        const t = this.theme;

        this.scan = s.add.container(0, F.t - 40);
        this.scan.add([
            s.add.rectangle(F.l, 0, F.r - F.l, 38, t.accent, 0.06).setOrigin(0),
            s.add.rectangle(F.l, 36, F.r - F.l, 2, t.accent, 0.3).setOrigin(0)
        ]);
        this.fxLayer.add(this.scan);

        this.satTrail = s.add.graphics();
        this.fxLayer.add(this.satTrail);
        this.sats = [0, 1].map(i => {
            const g = s.add.graphics();
            g.lineStyle(1.5, t.gold, 1);
            g.lineBetween(-6, 0, 6, 0);
            g.lineBetween(0, -6, 0, 6);
            g.fillStyle(t.gold, 1).fillCircle(0, 0, 2.5);
            this.fxLayer.add(g);
            return { gfx: g, trail: [], last: 0, phase: i * 0.5, waves: i === 0 ? 1.5 : 2, speed: i === 0 ? 1 : 0.7 };
        });

        this.crossGfx = s.add.graphics();
        this.coordsText = makeText(s, F.l + 16, F.t + 14, '', {
            fontFamily: 'PressStart2P', fontSize: '10px', color: '#00e5ff',
            backgroundColor: '#03121b', padding: { x: 6, y: 5 }
        }).setVisible(false);
        this.recDot = makeText(s, 1560, 62, '\u25CF', {
            fontFamily: 'PressStart2P', fontSize: '14px', color: '#ff3b5c'
        }).setOrigin(0.5);
        this.clockText = makeText(s, 1584, 62, 'REC 00:00:00 UTC', {
            fontFamily: 'PressStart2P', fontSize: '11px', color: '#9ffcff'
        }).setOrigin(0, 0.5);
        this.hudLayer.add([this.crossGfx, this.coordsText, this.recDot, this.clockText]);
    }

    buildPiFx() {
        const s = this.scene;
        const F = this.frame;

        this.clouds = [F.t + 150, F.t + 390, F.t + 620].map((y, i) => {
            const c = s.add.container(F.l + 160 + i * 360, y);
            const g = s.add.graphics();
            g.fillStyle(0xfff6df, 0.13);
            g.fillEllipse(0, 0, 170, 40);
            g.fillEllipse(55, -10, 110, 38);
            g.fillEllipse(-55, 8, 100, 30);
            c.add(g);
            this.fxLayer.add(c);
            return c;
        });

        this.ships = [
            { a: this.projection.project(-62, 24), b: this.projection.project(-30, 48), dur: 26000 },
            { a: this.projection.project(62, -12), b: this.projection.project(92, -32), dur: 30000 }
        ].map(def => {
            const g = s.add.graphics();
            g.fillStyle(0x3a2815, 1).fillPoints([
                { x: -18, y: 0 }, { x: 18, y: 0 }, { x: 12, y: 9 }, { x: -12, y: 9 }
            ], true);
            g.lineStyle(2, 0x3a2815, 1).lineBetween(0, 0, 0, -28);
            g.fillStyle(0xf3e6c0, 1).fillPoints([
                { x: 2, y: -26 }, { x: 2, y: -4 }, { x: 19, y: -6 }
            ], true);
            g.lineStyle(1.2, 0x3a2815, 1).strokePoints([
                { x: 2, y: -26 }, { x: 2, y: -4 }, { x: 19, y: -6 }
            ], true);
            g.fillStyle(0x8b2a1d, 1).fillTriangle(0, -28, 0, -22, 9, -25);
            const c = s.add.container(def.a.x, def.a.y, [g]);
            this.fxLayer.add(c);
            return { ...def, node: c, prev: 0 };
        });

        const compass = this.projection.project(PI_COMPASS.lon, PI_COMPASS.lat);
        this.needle = s.add.container(compass.x, compass.y);
        const n = s.add.graphics();
        const R = PI_COMPASS.radius;
        n.fillStyle(0xc0392b, 1).fillTriangle(0, -R * 0.72, -4.5, 0, 4.5, 0);
        n.fillStyle(0xefe0b4, 1).fillTriangle(0, R * 0.72, -4.5, 0, 4.5, 0);
        n.lineStyle(1, 0x3a2815, 1).strokeTriangle(0, -R * 0.72, -4.5, 0, 4.5, 0);
        n.lineStyle(1, 0x3a2815, 1).strokeTriangle(0, R * 0.72, -4.5, 0, 4.5, 0);
        n.fillStyle(0x3a2815, 1).fillCircle(0, 0, 3);
        this.needle.add(n);
        this.fxLayer.add(this.needle);

        this.flicker = s.add.rectangle(0, 0, MAP_W, MAP_H, 0x2a1405, 0.05).setOrigin(0);
        this.fxLayer.add(this.flicker);
    }

    // ------------------------------------------------------------ pins
    clearPins() {
        this.pins.forEach(pin => pin.destroy());
        this.pins = [];
        this.hqPin?.destroy();
        this.hqPin = null;
        this.clearHere();
        this.clearNetwork();
        this.clearRoute();
    }

    addPin(city, handlers = {}) {
        if (this.destroyed) return null;
        const pos = this.getCityPosition(city);
        if (!pos) return null;
        const pin = new MapPin(this, city, pos.x, pos.y);
        pin.bind(handlers);
        this.pinLayer.add(pin.container);
        this.pins.push(pin);
        if (this.active) pin.startAnimations();
        return pin;
    }

    setHeadquarters(hqCity, handlers = {}) {
        if (this.destroyed || !hqCity) return null;
        const pos = this.getCityPosition(hqCity);
        if (!pos) return null;
        this.hqPin?.destroy();
        const agency = this.themeId === 'agency';
        const pin = new MapPin(this, hqCity, pos.x, pos.y, {
            isHq: true,
            labelName: agency ? 'MARK AGENCY HQ' : 'Agency HQ',
            labelSub: agency ? 'LOCATION: CLASSIFIED' : 'location: undisclosed'
        });
        pin.bind(handlers);
        this.pinLayer.add(pin.container);
        this.hqPin = pin;
        if (this.active) pin.startAnimations();
        return pin;
    }

    layoutLabels() {
        const all = [...this.pins, this.hqPin].filter(Boolean);
        if (!all.length) return;
        const F = this.frame;
        const obstacles = [{ x: 1500, y: 640, w: 420, h: 440 }];
        if (this.themeId === 'agency') obstacles.push({ x: F.l, y: F.t, w: 380, h: 36 });
        if (this.herePos) {
            obstacles.push({ x: this.herePos.x - 70, y: this.herePos.y - 76, w: 140, h: 90 });
        }
        const results = placeLabels(
            all.map(pin => ({ x: pin.x, y: pin.y, w: pin.labelW, h: pin.labelH })),
            { bounds: { l: F.l + 8, t: F.t + 8, r: F.r - 8, b: F.b - 8 }, obstacles }
        );
        all.forEach((pin, i) => pin.placeLabel(results[i].x, results[i].y, results[i].dist));
    }

    // ------------------------------------------------------------ "you are here"
    clearHere() {
        this.hereTweens.forEach(tw => tw?.stop?.());
        this.hereTweens = [];
        this.hereMarker?.destroy(true);
        this.hereMarker = null;
        this.sweep?.destroy(true);
        this.sweep = null;
        this.herePulses = [];
        this.herePos = null;
    }

    setCurrentCity(city, { hidden = false } = {}) {
        this.clearHere();
        if (hidden || !city || this.destroyed) return;
        const pos = this.getCityPosition(city);
        if (!pos) return;
        this.herePos = pos;
        const s = this.scene;
        const t = this.theme;
        const marker = s.add.container(pos.x, pos.y);
        this.herePulses = [];

        if (this.themeId === 'agency') {
            for (let i = 0; i < 2; i++) {
                const ring = s.add.circle(0, 0, 14, 0x000000, 0).setStrokeStyle(2, t.accent, 0.8);
                marker.add(ring);
                this.herePulses.push(ring);
            }
            const tag = makeText(s, 0, -48, 'YOU ARE HERE', {
                fontFamily: 'PressStart2P', fontSize: '9px', color: '#03121b',
                backgroundColor: '#00e5ff', padding: { x: 6, y: 4 }
            }).setOrigin(0.5);
            const stem = s.add.graphics();
            stem.lineStyle(2, t.accent, 1).lineBetween(0, -38, 0, -22);
            marker.add([stem, tag]);

            const sweep = s.add.container(pos.x, pos.y);
            const g = s.add.graphics();
            const R = 330;
            const span = Math.PI * 0.4;
            const slices = 26;
            for (let i = 0; i < slices; i++) {
                const a0 = -span + (span * i) / slices;
                const a1 = -span + (span * (i + 1)) / slices;
                g.fillStyle(t.accent, 0.015 + 0.14 * (i / slices) * (i / slices));
                g.beginPath();
                g.moveTo(0, 0);
                g.arc(0, 0, R, a0, a1, false);
                g.closePath();
                g.fillPath();
            }
            g.lineStyle(2, t.accent, 0.55).lineBetween(0, 0, R, 0);
            sweep.add(g);
            this.fxLayer.add(sweep);
            this.sweep = sweep;
        } else {
            const ring = s.add.graphics();
            ring.lineStyle(3, 0x8b2a1d, 0.9);
            ring.beginPath();
            ring.arc(0, 0, 25, -0.3, Math.PI * 2 - 0.9, false);
            ring.strokePath();
            ring.lineStyle(2, 0x8b2a1d, 0.6);
            ring.beginPath();
            ring.arc(0, 0, 28, 0.5, Math.PI * 2 - 0.2, false);
            ring.strokePath();
            const note = makeText(s, 0, -58, 'You are here!', {
                fontFamily: 'SpecialElite', fontSize: '22px', color: '#8b2a1d'
            }).setOrigin(0.5).setAngle(-6);
            const arrow = s.add.graphics();
            arrow.lineStyle(2.5, 0x8b2a1d, 0.9);
            arrow.lineBetween(0, -44, 0, -30);
            arrow.lineBetween(0, -30, -5, -37);
            arrow.lineBetween(0, -30, 5, -37);
            marker.add([ring, arrow, note]);
            this.herePulses.push(ring);
        }
        this.pinLayer.add(marker);
        this.pinLayer.sendToBack(marker);
        this.hereMarker = marker;
        if (this.active) this.startHereAnimations();
    }

    startHereAnimations() {
        if (this.hereTweens.length || !this.hereMarker) return;
        const s = this.scene;
        if (this.themeId === 'agency') {
            this.herePulses.forEach((ring, i) => {
                this.hereTweens.push(s.tweens.add({
                    targets: ring, scale: { from: 1, to: 4 }, alpha: { from: 0.8, to: 0 },
                    duration: 2200, repeat: -1, delay: i * 1100, ease: 'Sine.easeOut'
                }));
            });
            if (this.sweep) {
                this.hereTweens.push(s.tweens.add({
                    targets: this.sweep, rotation: Math.PI * 2, duration: 7000, repeat: -1
                }));
            }
        } else if (this.herePulses[0]) {
            this.hereTweens.push(s.tweens.add({
                targets: this.herePulses[0], angle: { from: -4, to: 4 }, duration: 700,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            }));
        }
    }

    // ------------------------------------------------------------ flight network (agency)
    clearNetwork() {
        this.arcs = [];
        this.networkGfx?.clear();
        this.packetGfx?.clear();
    }

    setNetwork(fromPos, targets = []) {
        this.clearNetwork();
        if (this.themeId !== 'agency' || !fromPos) return;
        this.arcs = targets
            .filter(pos => pos && Math.hypot(pos.x - fromPos.x, pos.y - fromPos.y) > 8)
            .map((pos, i) => ({ pts: buildArc(fromPos, pos), offset: (i * 0.173) % 1 }));
        const g = this.networkGfx;
        g.lineStyle(1.5, this.theme.accent, 0.28);
        this.arcs.forEach(({ pts }) => {
            for (let i = 0; i < pts.length - 1; i++) {
                if (i % 4 < 2) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
            }
        });
        if (this.active) this.startPackets();
    }

    startPackets() {
        if (this.packetTween || !this.arcs.length) return;
        this.packetTween = this.scene.tweens.addCounter({
            from: 0, to: 1, duration: 4200, repeat: -1,
            onUpdate: tween => {
                const v = tween.getValue();
                const g = this.packetGfx;
                if (!g || this.destroyed) return;
                g.clear();
                g.fillStyle(0xffffff, 0.9);
                this.arcs.forEach(({ pts, offset }) => {
                    const k = Math.floor(((v + offset) % 1) * (pts.length - 1));
                    g.fillCircle(pts[k].x, pts[k].y, 2.6);
                });
            }
        });
        this.tweens.push(this.packetTween);
    }

    // ------------------------------------------------------------ route
    showRoute(from, to) {
        this.clearRoute();
        if (this.destroyed || !from || !to) return;
        if (Math.hypot(to.x - from.x, to.y - from.y) < 6) return;
        this.route = { pts: buildArc(from, to), progress: 0, phase: 0, loop: 0 };
        this.plane.setVisible(true);
        this.drawRoute();
    }

    clearRoute() {
        this.route = null;
        this.routeGfx?.clear();
        this.plane?.setVisible(false);
    }

    drawRoute() {
        const r = this.route;
        const g = this.routeGfx;
        if (!r || !g) return;
        const pts = r.pts;
        const head = Math.max(1, Math.floor((pts.length - 1) * r.progress));
        const off = Math.floor(r.phase / 5);
        const t = this.theme;
        g.clear();

        const polyline = (width, color, alpha) => {
            g.lineStyle(width, color, alpha);
            g.beginPath();
            g.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i <= head; i++) g.lineTo(pts[i].x, pts[i].y);
            g.strokePath();
        };

        if (this.themeId === 'agency') {
            polyline(9, ROUTE_SHADOW_COLOR, 0.55);
            polyline(7, t.hot, 0.25);
            g.lineStyle(3, t.hot, 1);
            for (let i = 0; i < head; i++) {
                if ((i + off) % 4 < 2) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
            }
        } else {
            polyline(8, 0xefe0b4, 0.45);
            g.fillStyle(0x8b2a1d, 1);
            for (let i = 0; i <= head; i++) {
                if ((i + off) % 2 === 0) g.fillCircle(pts[i].x, pts[i].y, 3.2);
            }
        }

        const idx = r.progress < 1 ? head : Math.floor(r.loop * (pts.length - 1));
        const p = pts[Math.min(idx, pts.length - 1)];
        this.plane.setPosition(p.x, p.y).setRotation(p.a);
    }

    // ------------------------------------------------------------ notes / ticker
    say(message) {
        if (this.destroyed || !message) return;
        const s = this.noteState;
        if (s.target === message) return;
        s.target = message;
        s.typed = 0;
        s.hold = 0;
        s.override = true;
        if (!this.active) this.noteText?.setText('');
    }

    tickNote() {
        if (this.destroyed || !this.noteText?.active) return;
        const lines = this.themeId === 'agency' ? AGENCY_TICKER_LINES : PI_FIELD_NOTES;
        const s = this.noteState;
        if (!s.target) s.target = lines[s.idx % lines.length];
        if (s.typed < s.target.length) {
            s.typed++;
        } else {
            s.hold += 34;
            if (s.hold > (s.override ? 5600 : 3800)) {
                s.override = false;
                s.idx = (s.idx + 1) % lines.length;
                s.target = lines[s.idx];
                s.typed = 0;
                s.hold = 0;
            }
        }
        const agency = this.themeId === 'agency';
        const blink = Math.floor(this.scene.time.now / 380) % 2 === 0;
        const typing = s.typed < s.target.length;
        const prefix = agency ? '> ' : '\u270E ';
        this.noteText.setText(prefix + s.target.slice(0, s.typed) +
            (agency && (typing || blink) ? '_' : ''));
    }

    // ------------------------------------------------------------ pointer (agency crosshair)
    onPointerMove(pointer, lx, ly) {
        if (!this.active || this.themeId !== 'agency' || !this.crossGfx) return;
        const F = this.frame;
        if (lx < F.l || lx > F.r || ly < F.t || ly > F.b) {
            this.onPointerOut();
            return;
        }
        const g = this.crossGfx;
        g.clear();
        g.lineStyle(1, this.theme.accent, 0.32);
        g.lineBetween(F.l, ly, F.r, ly);
        g.lineBetween(lx, F.t, lx, F.b);
        g.lineStyle(1.5, this.theme.accent, 0.8).strokeCircle(lx, ly, 9);
        const geo = this.projection.unproject(lx, ly);
        let lon = geo.lon;
        if (lon > 180) lon -= 360;
        if (lon < -180) lon += 360;
        this.coordsText.setText(
            `CURSOR ${Math.abs(geo.lat).toFixed(2)}${geo.lat >= 0 ? 'N' : 'S'} ` +
            `${Math.abs(lon).toFixed(2)}${lon >= 0 ? 'E' : 'W'}`).setVisible(true);
    }

    onPointerOut() {
        this.crossGfx?.clear();
        this.coordsText?.setVisible(false);
    }

    // ------------------------------------------------------------ lifecycle
    onUpdate(time, delta) {
        const r = this.route;
        if (!r || this.destroyed) return;
        r.progress = Math.min(1, r.progress + delta / 1100);
        r.phase = (r.phase + delta * 0.03) % 100000;
        if (r.progress >= 1) r.loop = (r.loop + delta / 3400) % 1;
        this.drawRoute();
    }

    track(tween) {
        if (tween) this.tweens.push(tween);
        return tween;
    }

    activate() {
        if (this.active || this.destroyed) return;
        this.active = true;
        this.scene.events.on('update', this.onUpdate);

        const rec = TEXTURES.get(this.textureKey);
        if (rec && !rec.countries && !rec.loading) loadInto(rec);

        this.startAmbient();
        this.startHereAnimations();
        this.pins.forEach(pin => pin.startAnimations());
        this.hqPin?.startAnimations();
        this.startPackets();

        this.noteState.typed = 0;
        this.noteState.hold = 0;
        this.timers.push(this.scene.time.addEvent({
            delay: 34, loop: true, callback: () => this.tickNote()
        }));
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        try { this.scene.events.off('update', this.onUpdate); } catch (e) { /* scene gone */ }
        this.timers.forEach(timer => timer?.remove?.(false));
        this.timers = [];
        this.tweens.forEach(tween => tween?.stop?.());
        this.tweens = [];
        this.packetTween = null;
        this.hereTweens.forEach(tween => tween?.stop?.());
        this.hereTweens = [];
        this.pins.forEach(pin => pin.stopAnimations());
        this.hqPin?.stopAnimations();
        this.onPointerOut();
        this.noteState.override = false;
    }

    startAmbient() {
        const s = this.scene;
        const F = this.frame;

        if (this.themeId === 'agency') {
            this.track(s.tweens.add({
                targets: this.scan, y: { from: F.t - 40, to: F.b },
                duration: 5200, repeat: -1, repeatDelay: 900, ease: 'Linear'
            }));
            this.track(s.tweens.add({
                targets: this.recDot, alpha: { from: 1, to: 0.15 },
                duration: 600, yoyo: true, repeat: -1
            }));
            this.timers.push(s.time.addEvent({
                delay: 1000, loop: true, callback: () => this.updateClock()
            }));
            this.updateClock();
            this.track(s.tweens.addCounter({
                from: 0, to: 1, duration: 46000, repeat: -1,
                onUpdate: tween => this.updateSatellites(tween.getValue())
            }));
        } else {
            this.clouds.forEach((cloud, i) => {
                this.track(s.tweens.add({
                    targets: cloud, x: { from: F.l + 120, to: F.r - 320 },
                    duration: 80000 + i * 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                }));
            });
            this.ships.forEach(ship => {
                this.track(s.tweens.addCounter({
                    from: 0, to: 1, duration: ship.dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                    onUpdate: tween => {
                        const v = tween.getValue();
                        if (!ship.node?.active) return;
                        ship.node.setPosition(
                            ship.a.x + (ship.b.x - ship.a.x) * v,
                            ship.a.y + (ship.b.y - ship.a.y) * v + Math.sin(v * 70) * 2.5);
                        ship.node.setAngle(Math.sin(v * 55) * 3);
                        ship.node.setScale(v >= ship.prev ? 1 : -1, 1);
                        ship.prev = v;
                    }
                }));
            });
            this.track(s.tweens.add({
                targets: this.needle, angle: { from: -14, to: 14 },
                duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            }));
            this.track(s.tweens.add({
                targets: this.flicker, alpha: { from: 0.02, to: 0.12 },
                duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            }));
        }
    }

    updateClock() {
        if (!this.clockText?.active) return;
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        this.clockText.setText(`REC ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    }

    updateSatellites(v) {
        if (this.destroyed || !this.satTrail?.active) return;
        const F = this.frame;
        const cy = (F.t + F.b) / 2;
        const h = F.b - F.t;
        this.satTrail.clear();
        this.sats.forEach(sat => {
            const t = (v * sat.speed * 3 + sat.phase) % 1;
            if (t < sat.last) sat.trail = [];
            sat.last = t;
            const x = F.l + t * (F.r - F.l);
            const y = cy + Math.sin((t * sat.waves + sat.phase) * Math.PI * 2) * h * 0.34;
            sat.gfx.setPosition(x, y);
            sat.trail.push({ x, y });
            if (sat.trail.length > 16) sat.trail.shift();
            for (let i = 1; i < sat.trail.length; i++) {
                this.satTrail.lineStyle(1.5, this.theme.gold, (i / sat.trail.length) * 0.55);
                this.satTrail.lineBetween(sat.trail[i - 1].x, sat.trail[i - 1].y, sat.trail[i].x, sat.trail[i].y);
            }
        });
    }

    destroy() {
        if (this.destroyed) return;
        this.deactivate();
        this.destroyed = true;
        try {
            this.baseImage?.off('pointermove', this.onPointerMove);
            this.baseImage?.off('pointerout', this.onPointerOut);
        } catch (e) { /* already gone */ }
        this.pins.forEach(pin => pin.destroy());
        this.pins = [];
        this.hqPin?.destroy();
        this.hqPin = null;
        this.clearHere();
        this.root?.destroy(true);
        this.root = null;
        this.baseImage = null;
    }
}