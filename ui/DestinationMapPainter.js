import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ui/DestinationMapPainter.js
// Pure canvas painting for the destination world map. No Phaser dependency,
// so it can be tested in Node with a mock 2D context.

export const MAP_W = 1920;
export const MAP_H = 1080;
export const MAP_FRAME = { l: 60, t: 150, r: 1860, b: 1000 };

const GEO = { latTop: 77, latBottom: -57, centerLon: 15 };
const D2R = Math.PI / 180;

const MAP_SOURCES = [
    __dialogueText("ui/DestinationMapPainter.js", "t_34e83dc47f4f5e4dd789"),
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
];

// Where the compass rose sits on the PI map (South Atlantic, plenty of room).
export const PI_COMPASS = { lon: -22, lat: -38, radius: 62 };

// ---------------------------------------------------------------- projection
function miller(lat) {
    const clamped = Math.max(-85, Math.min(85, lat));
    return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * clamped * D2R));
}

export function createProjection(frame = MAP_FRAME, geo = GEO) {
    const yTop = miller(geo.latTop);
    const yBottom = miller(geo.latBottom);
    const yMid = (yTop + yBottom) / 2;
    const scale = (frame.b - frame.t) / (yTop - yBottom);
    const cx = (frame.l + frame.r) / 2;
    const cy = (frame.t + frame.b) / 2;
    return {
        frame,
        scale,
        project(lon, lat) {
            return {
                x: cx + (lon - geo.centerLon) * D2R * scale,
                y: cy - (miller(lat) - yMid) * scale
            };
        },
        unproject(x, y) {
            const lon = geo.centerLon + (x - cx) / scale / D2R;
            const ym = yMid - (y - cy) / scale;
            const lat = (Math.atan(Math.exp(ym / 1.25)) - Math.PI / 4) / 0.4 / D2R;
            return { lon, lat };
        }
    };
}

export const PROJECTION = createProjection();

// ---------------------------------------------------------------- helpers
export function mulberry32(seed) {
    let a = seed | 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function inFrame(F, x, y, pad = 0) {
    return x >= F.l + pad && x <= F.r - pad && y >= F.t + pad && y <= F.b - pad;
}

function spacedText(ctx, text, x, y, spacing = 4, align = 'center') {
    const chars = [...String(text)];
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const prev = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => {
        ctx.fillText(ch, cursor, y);
        cursor += widths[i] + spacing;
    });
    ctx.textAlign = prev;
}

function makePattern(ctx, color, size, radius) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = color;
    g.beginPath();
    g.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    g.fill();
    return ctx.createPattern(c, 'repeat');
}

// ---------------------------------------------------------------- boundary data
async function fetchFeatures() {
    for (const url of MAP_SOURCES) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), 15000) : null;
        try {
            const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.features)) throw new Error('Invalid map data');
            return data.features;
        } catch (error) {
            if (url === MAP_SOURCES[MAP_SOURCES.length - 1]) throw error;
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }
    throw new Error('No boundary data');
}

export function prepareCountries(features, projection = PROJECTION) {
    const F = projection.frame;
    const out = [];
    for (const feature of features) {
        const props = {};
        Object.entries(feature.properties || {}).forEach(([k, v]) => {
            props[k.toUpperCase()] = v;
        });
        const codes = [props.ADM0_A3, props.ISO_A3, props.ISO_A3_EH]
            .filter(code => code && code !== '-99');
        const name = String(props.NAME_EN || props.NAME || props.ADMIN || '');
        const geometry = feature.geometry;
        if (!geometry) continue;
        const polygons = geometry.type === __dialogueText("ui/DestinationMapPainter.js", "t_0ef705dd99da0ae4b601") ? [geometry.coordinates] :
            geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        const projected = [];
        for (const polygon of polygons) {
            const rings = [];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            polygon.forEach((ring, ringIndex) => {
                const flat = new Array(ring.length * 2);
                for (let k = 0; k < ring.length; k++) {
                    const p = projection.project(ring[k][0], ring[k][1]);
                    flat[k * 2] = p.x;
                    flat[k * 2 + 1] = p.y;
                    if (ringIndex === 0) {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    }
                }
                rings.push(flat);
            });
            if (!rings.length) continue;
            // antimeridian artefacts (strips across the whole map)
            if (maxX - minX > 1300) continue;
            if (maxX < F.l - 60 || minX > F.r + 60 || maxY < F.t - 60 || minY > F.b + 60) continue;
            projected.push(rings);
        }
        if (projected.length) out.push({ codes: new Set(codes), name, polys: projected });
    }
    return out;
}

let countriesPromise = null;
export function loadCountries() {
    if (!countriesPromise) {
        countriesPromise = fetchFeatures()
            .then(features => prepareCountries(features))
            .catch(error => {
                countriesPromise = null;
                throw error;
            });
    }
    return countriesPromise;
}

export function ensureFonts() {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
        return Promise.resolve();
    }
    return Promise.all([__dialogueText("ui/DestinationMapPainter.js", "t_d7ecb035e53e3b167e6b"), __dialogueText("ui/DestinationMapPainter.js", "t_e44af1cb7a3385642f4a")]
        .map(font => document.fonts.load(font).catch(() => null))).then(() => null);
}

// ---------------------------------------------------------------- path helpers
function addRings(ctx, rings) {
    for (const flat of rings) {
        if (flat.length < 6) continue;
        ctx.moveTo(flat[0], flat[1]);
        for (let i = 2; i < flat.length; i += 2) ctx.lineTo(flat[i], flat[i + 1]);
        ctx.closePath();
    }
}

function landPath(ctx, countries, filter = null) {
    ctx.beginPath();
    for (const country of countries) {
        if (filter && !filter(country)) continue;
        for (const rings of country.polys) addRings(ctx, rings);
    }
}

function clipFrame(ctx, F) {
    ctx.beginPath();
    ctx.rect(F.l, F.t, F.r - F.l, F.b - F.t);
    ctx.clip();
}

function highlightTest(highlight) {
    return country => {
        for (const code of country.codes) if (highlight.has(code)) return true;
        return false;
    };
}

function drawGraticule(ctx, P, style) {
    const F = P.frame;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash(style.dash || []);
    for (let lon = -180; lon <= 180; lon += 15) {
        const x = P.project(lon, 0).x;
        if (x < F.l - 1 || x > F.r + 1) continue;
        ctx.strokeStyle = lon === 0 ? style.strong : style.color;
        ctx.beginPath();
        ctx.moveTo(x, F.t);
        ctx.lineTo(x, F.b);
        ctx.stroke();
    }
    for (let lat = -60; lat <= 75; lat += 15) {
        const y = P.project(0, lat).y;
        if (y < F.t - 1 || y > F.b + 1) continue;
        ctx.strokeStyle = lat === 0 ? style.strong : style.color;
        ctx.beginPath();
        ctx.moveTo(F.l, y);
        ctx.lineTo(F.r, y);
        ctx.stroke();
    }
    ctx.restore();
}

function degLabel(value, pos, neg) {
    const v = Math.abs(value);
    return value === 0 ? '0' : `${v}${value > 0 ? pos : neg}`;
}

// ================================================================= AGENCY
const AGENCY_OCEANS = [
    { lon: -36, lat: 22, text: __dialogueText("ui/DestinationMapPainter.js", "t_69dcf8ece42c582508ea"), sub: __dialogueText("ui/DestinationMapPainter.js", "t_985895a61fe28c6c30b2") },
    { lon: -130, lat: 6, text: __dialogueText("ui/DestinationMapPainter.js", "t_c0e0ca05f7cd01ece67e"), sub: __dialogueText("ui/DestinationMapPainter.js", "t_b41093a88bfd96d9e3cf") },
    { lon: 78, lat: -25, text: __dialogueText("ui/DestinationMapPainter.js", "t_74d79e3585e39388f196"), sub: __dialogueText("ui/DestinationMapPainter.js", "t_079a8992728aa3c9e073") },
    { lon: 20, lat: -53, text: __dialogueText("ui/DestinationMapPainter.js", "t_52a7309316b196b8dc19"), sub: __dialogueText("ui/DestinationMapPainter.js", "t_f4731f888e0f1aa3e9b4") }
];

function paintAgencyLand(ctx, data) {
    const { countries, highlight } = data;
    const isHi = highlightTest(highlight);

    landPath(ctx, countries);
    ctx.fillStyle = '#0a2433';
    ctx.fill('evenodd');
    const dots = makePattern(ctx, __dialogueText("ui/DestinationMapPainter.js", "t_87917a6788994d95cb97"), 6, 0.9);
    if (dots) {
        ctx.fillStyle = dots;
        ctx.fill('evenodd');
    }

    landPath(ctx, countries, isHi);
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_fdd4860e349e4ef9c67b");
    ctx.fill('evenodd');
    const denseDots = makePattern(ctx, __dialogueText("ui/DestinationMapPainter.js", "t_729328689ed3cca9aefa"), 5, 0.9);
    if (denseDots) {
        ctx.fillStyle = denseDots;
        ctx.fill('evenodd');
    }

    ctx.lineJoin = 'round';
    landPath(ctx, countries);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_bcd4581f3b676b1cdf4d");
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_1ab2e5bdf93dda45ad6c");
    ctx.lineWidth = 1;
    ctx.stroke();

    landPath(ctx, countries, isHi);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_9c61a5322e193d1a6a7d");
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_520458cc188f5116b8a8");
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function paintAgencyFrame(ctx, P) {
    const F = P.frame;
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_70f3105740345ba38280");
    ctx.lineWidth = 1;
    ctx.strokeRect(F.l + 0.5, F.t + 0.5, F.r - F.l, F.b - F.t);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    const L = 46;
    [[F.l - 8, F.t - 8, 1, 1], [F.r + 8, F.t - 8, -1, 1],
        [F.l - 8, F.b + 8, 1, -1], [F.r + 8, F.b + 8, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * L, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * L);
        ctx.stroke();
    });

    ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_3f5b813c7eac9a6f159e");
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_14f0cbbcf9a57578b568");
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_70f3105740345ba38280");
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    for (let lon = -180; lon <= 180; lon += 15) {
        const x = P.project(lon, 0).x;
        if (x < F.l + 12 || x > F.r - 12) continue;
        ctx.beginPath();
        ctx.moveTo(x, F.t - 7);
        ctx.lineTo(x, F.t);
        ctx.stroke();
        ctx.fillText(degLabel(lon, 'E', 'W'), x, F.t - 14);
    }
    ctx.textAlign = 'right';
    for (let lat = -60; lat <= 75; lat += 15) {
        const y = P.project(0, lat).y;
        if (y < F.t + 10 || y > F.b - 10) continue;
        ctx.beginPath();
        ctx.moveTo(F.l - 7, y);
        ctx.lineTo(F.l, y);
        ctx.stroke();
        ctx.fillText(degLabel(lat, 'N', 'S'), F.l - 12, y + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_39fd6949808367941fa2");
    ctx.fillText(__dialogueText("ui/DestinationMapPainter.js", "t_1199dd905e8eed7803fb"), F.l, F.b + 20);
}

export function paintAgency(ctx, data) {
    const P = data.projection;
    const F = P.frame;
    const rnd = mulberry32(2026);

    const bg = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, 120, MAP_W / 2, MAP_H / 2, MAP_W * 0.7);
    bg.addColorStop(0, '#0a1d2b');
    bg.addColorStop(1, '#02060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    ctx.lineWidth = 1;
    for (let x = 0; x <= MAP_W; x += 40) {
        ctx.strokeStyle = x % 200 === 0 ? __dialogueText("ui/DestinationMapPainter.js", "t_031ca91db8c61f2e5758") : __dialogueText("ui/DestinationMapPainter.js", "t_6b0b8b88533cdd0cf544");
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, MAP_H);
        ctx.stroke();
    }
    for (let y = 0; y <= MAP_H; y += 40) {
        ctx.strokeStyle = y % 200 === 0 ? __dialogueText("ui/DestinationMapPainter.js", "t_031ca91db8c61f2e5758") : __dialogueText("ui/DestinationMapPainter.js", "t_6b0b8b88533cdd0cf544");
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(MAP_W, y + 0.5);
        ctx.stroke();
    }
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_dc61d3134edfd17ebc6e");
    for (let x = 0; x <= MAP_W; x += 200) {
        for (let y = 0; y <= MAP_H; y += 200) ctx.fillRect(x - 1, y - 1, 3, 3);
    }

    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_1309a7c275da6e0fec52");
    ctx.fillRect(F.l, F.t, F.r - F.l, F.b - F.t);

    ctx.save();
    clipFrame(ctx, F);
    drawGraticule(ctx, P, {
        color: 'rgba(0,229,255,0.15)', strong: __dialogueText("ui/DestinationMapPainter.js", "t_0344ec0a9c462154e35f"), dash: [2, 6]
    });
    if (data.countries) {
        paintAgencyLand(ctx, data);
    } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_c8497a890136dbdf25a5");
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_2edb25451a3b85ef6ac7");
        ctx.fillText(__dialogueText("ui/DestinationMapPainter.js", "t_1507cb6a4ba5816258f5"), (F.l + F.r) / 2, (F.t + F.b) / 2 - 10);
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_19f51c9f26675d332a10");
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_39fd6949808367941fa2");
        ctx.fillText(data.failed ? __dialogueText("ui/DestinationMapPainter.js", "t_a37a157bb6d354cb6bdb") :
            __dialogueText("ui/DestinationMapPainter.js", "t_5e663d9eb5c24dbbf80c"), (F.l + F.r) / 2, (F.t + F.b) / 2 + 26);
    }

    ctx.textAlign = 'center';
    AGENCY_OCEANS.forEach(({ lon, lat, text, sub }) => {
        const p = P.project(lon, lat);
        if (!inFrame(F, p.x, p.y, 40)) return;
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_19f51c9f26675d332a10");
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_d392468f477dcdb840a8");
        spacedText(ctx, text, p.x, p.y, 6);
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_1e187c4b16f2046adcac");
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_0fda9bcaec94bd61d6ed");
        spacedText(ctx, sub, p.x, p.y + 18, 3);
    });
    ctx.restore();

    paintAgencyFrame(ctx, P);

    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_4e04844dc490d75b83ac");
    for (let y = 0; y < MAP_H; y += 4) ctx.fillRect(0, y, MAP_W, 1);

    const vignette = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.45,
        MAP_W / 2, MAP_H / 2, MAP_W * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, __dialogueText("ui/DestinationMapPainter.js", "t_4c85ca9b7179ff4c5432"));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    // keep rnd referenced for future noise tweaks without lint complaints
    void rnd;
}

// ================================================================= PI (expedition)
function paintParchment(ctx, rnd) {
    const base = ctx.createLinearGradient(0, 0, MAP_W, MAP_H);
    base.addColorStop(0, '#ead9ab');
    base.addColorStop(1, '#d6bb84');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    for (let i = 0; i < 140; i++) {
        const x = rnd() * MAP_W, y = rnd() * MAP_H, r = 50 + rnd() * 190;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const warm = rnd() > 0.5;
        grad.addColorStop(0, warm ? __dialogueText("ui/DestinationMapPainter.js", "t_bf335e89d45e5acccfd4") : __dialogueText("ui/DestinationMapPainter.js", "t_8e2fb71b90583a6859a6"));
        grad.addColorStop(1, 'rgba(168,132,78,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < 1600; i++) {
        const x = rnd() * MAP_W, y = rnd() * MAP_H;
        const len = 4 + rnd() * 16, ang = rnd() * Math.PI * 2;
        ctx.strokeStyle = `rgba(${110 + Math.floor(rnd() * 40)},${90 + Math.floor(rnd() * 30)},60,${0.03 + rnd() * 0.05})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
    }
    for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = `rgba(90,70,40,${0.04 + rnd() * 0.10})`;
        ctx.fillRect(Math.floor(rnd() * MAP_W), Math.floor(rnd() * MAP_H), rnd() > 0.85 ? 2 : 1, 1);
    }
    for (let i = 0; i < 40; i++) {
        const x = rnd() * MAP_W, y = rnd() * MAP_H, r = 3 + rnd() * 8;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        halo.addColorStop(0, __dialogueText("ui/DestinationMapPainter.js", "t_42dc23214b33160a6356"));
        halo.addColorStop(1, 'rgba(150,100,50,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        ctx.fillStyle = `rgba(130,85,40,${0.10 + rnd() * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawWave(ctx, x, y, len) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.25, y - 4, x + len * 0.5, y);
    ctx.quadraticCurveTo(x + len * 0.75, y + 4, x + len, y);
    ctx.stroke();
}

function drawCompassRose(ctx, x, y, R) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_adbc4b6ef27ab3a01d56");
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8 - Math.PI / 2;
        const len = i % 4 === 0 ? R : (i % 2 === 0 ? R * 0.7 : R * 0.48);
        const w = i % 4 === 0 ? R * 0.11 : R * 0.07;
        const tx = Math.cos(a) * len, ty = Math.sin(a) * len;
        const px = -Math.sin(a) * w, py = Math.cos(a) * w;
        ctx.fillStyle = i === 0 ? '#8b2a1d' : __dialogueText("ui/DestinationMapPainter.js", "t_e41caaae56c6216928eb");
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#efe0b4';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(-px, -py);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_adbc4b6ef27ab3a01d56");
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.lineTo(-px, -py);
        ctx.closePath();
        ctx.stroke();
    }
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_e41caaae56c6216928eb");
    ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_5f0bae70d8fb4e546e7e");
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -R - 12);
    ctx.restore();
}

function drawSerpent(ctx, x, y, s) {
    ctx.save();
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_8a56f4e4076b5b229f40");
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_a64ca6a1213a9588124a");
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
        const cx = x + k * 27 * s;
        ctx.beginPath();
        ctx.arc(cx, y, 12 * s, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y);
    ctx.bezierCurveTo(x - 26 * s, y - 4 * s, x - 20 * s, y - 30 * s, x - 36 * s, y - 28 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 38 * s, y - 28 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_e41caaae56c6216928eb");
    ctx.beginPath();
    ctx.arc(x - 39.5 * s, y - 29.5 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 66 * s, y);
    ctx.bezierCurveTo(x + 80 * s, y - 2 * s, x + 84 * s, y - 16 * s, x + 74 * s, y - 20 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = -1; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(x + k * 16 * s, y + 6 * s, 6 * s, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }
    ctx.restore();
}

function drawKraken(ctx, x, y, s) {
    ctx.save();
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_8a56f4e4076b5b229f40");
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_a64ca6a1213a9588124a");
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y, 15 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_e41caaae56c6216928eb");
    ctx.beginPath();
    ctx.arc(x - 5 * s, y - 3 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.arc(x + 5 * s, y - 3 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 6 * s, y + 14 * s);
        ctx.bezierCurveTo(x + i * 16 * s, y + 30 * s, x + i * 8 * s - 10 * s, y + 38 * s,
            x + i * 14 * s + 8 * s, y + 46 * s);
        ctx.stroke();
    }
    ctx.restore();
}

function paintPILand(ctx, data) {
    const P = data.projection;
    const F = P.frame;
    const { countries, highlight } = data;
    const isHi = highlightTest(highlight);

    ctx.lineJoin = 'round';
    [[16, 0.04], [11, 0.06], [7, 0.08], [3.5, 0.12]].forEach(([w, a]) => {
        landPath(ctx, countries);
        ctx.strokeStyle = `rgba(70,100,100,${a})`;
        ctx.lineWidth = w;
        ctx.stroke();
    });

    landPath(ctx, countries);
    ctx.fillStyle = '#eddcae';
    ctx.fill('evenodd');

    ctx.save();
    landPath(ctx, countries);
    ctx.clip('evenodd');
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_61c380573fc49c12d1ce");
    ctx.lineWidth = 1;
    for (let k = F.l - (F.b - F.t); k < F.r; k += 7) {
        ctx.beginPath();
        ctx.moveTo(k, F.b);
        ctx.lineTo(k + (F.b - F.t), F.t);
        ctx.stroke();
    }
    landPath(ctx, countries);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_5b60b76a29b1d0ff44e5");
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    landPath(ctx, countries, isHi);
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_5488b075e8368f471acb");
    ctx.fill('evenodd');
    ctx.save();
    landPath(ctx, countries, isHi);
    ctx.clip('evenodd');
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_899bb8f525afb0bf42d7");
    ctx.lineWidth = 1;
    for (let k = F.l - (F.b - F.t); k < F.r; k += 5) {
        ctx.beginPath();
        ctx.moveTo(k, F.t);
        ctx.lineTo(k + (F.b - F.t), F.b);
        ctx.stroke();
    }
    ctx.restore();

    landPath(ctx, countries);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_2b2ca15099e38c1bae1b");
    ctx.lineWidth = 1.3;
    ctx.stroke();
    landPath(ctx, countries, isHi);
    ctx.strokeStyle = '#6a2616';
    ctx.lineWidth = 2.2;
    ctx.stroke();
}

const PI_OCEANS = [
    { lon: -36, lat: 18, text: __dialogueText("ui/DestinationMapPainter.js", "t_1e19db94c238e1487b19"), rot: -0.08 },
    { lon: -128, lat: 4, text: __dialogueText("ui/DestinationMapPainter.js", "t_ade4ba57ff4495605cb5"), rot: 0.06 },
    { lon: 78, lat: -22, text: __dialogueText("ui/DestinationMapPainter.js", "t_dab33c75b13f4b32468d"), rot: -0.05 },
    { lon: 20, lat: -52, text: __dialogueText("ui/DestinationMapPainter.js", "t_d4adfcd8a4fe9a782cca"), rot: 0 }
];

function paintPIFrame(ctx, P) {
    const F = P.frame;
    const w = F.r - F.l, h = F.b - F.t;
    const ink = '#3a2815', paper = '#efe0b4';
    const xs = [F.l], ys = [F.t];
    for (let lon = -180; lon <= 180; lon += 15) {
        const x = P.project(lon, 0).x;
        if (x > F.l + 6 && x < F.r - 6) xs.push(x);
    }
    for (let lat = -60; lat <= 75; lat += 15) {
        const y = P.project(0, lat).y;
        if (y > F.t + 6 && y < F.b - 6) ys.push(y);
    }
    xs.push(F.r);
    ys.push(F.b);
    ys.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
        ctx.fillStyle = i % 2 ? paper : ink;
        ctx.fillRect(xs[i], F.t - 8, xs[i + 1] - xs[i], 8);
        ctx.fillRect(xs[i], F.b, xs[i + 1] - xs[i], 8);
    }
    for (let i = 0; i < ys.length - 1; i++) {
        ctx.fillStyle = i % 2 ? paper : ink;
        ctx.fillRect(F.l - 8, ys[i], 8, ys[i + 1] - ys[i]);
        ctx.fillRect(F.r, ys[i], 8, ys[i + 1] - ys[i]);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(F.l, F.t, w, h);
    ctx.strokeRect(F.l - 8, F.t - 8, w + 16, h + 16);
    ctx.lineWidth = 5;
    ctx.strokeRect(F.l - 14, F.t - 14, w + 28, h + 28);
    ctx.lineWidth = 1;
    ctx.strokeRect(F.l - 20, F.t - 20, w + 40, h + 40);

    [[F.l - 14, F.t - 14], [F.r + 14, F.t - 14], [F.l - 14, F.b + 14], [F.r + 14, F.b + 14]]
        .forEach(([x, y]) => {
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.stroke();
        });

    ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_d341612b34bbd75d675a");
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_15a09b06c8ff87339524");
    ctx.textAlign = 'center';
    for (let lon = -180; lon <= 180; lon += 15) {
        const x = P.project(lon, 0).x;
        if (x < F.l + 14 || x > F.r - 14) continue;
        ctx.fillText(degLabel(lon, 'E', 'W'), x, F.t - 26);
    }
    ctx.textAlign = 'right';
    for (let lat = -60; lat <= 75; lat += 15) {
        const y = P.project(0, lat).y;
        if (y < F.t + 10 || y > F.b - 10) continue;
        ctx.fillText(degLabel(lat, 'N', 'S'), F.l - 26, y + 4);
    }
}

export function paintPI(ctx, data) {
    const P = data.projection;
    const F = P.frame;
    const rnd = mulberry32(1936);

    paintParchment(ctx, rnd);

    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_def29de945696d117fc7");
    ctx.fillRect(F.l, F.t, F.r - F.l, F.b - F.t);

    ctx.save();
    clipFrame(ctx, F);

    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_79b78ac2f9be93509f68");
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 260; i++) {
        drawWave(ctx, F.l + rnd() * (F.r - F.l), F.t + rnd() * (F.b - F.t), 10 + rnd() * 14);
    }
    drawGraticule(ctx, P, {
        color: 'rgba(70,50,30,0.17)', strong: __dialogueText("ui/DestinationMapPainter.js", "t_b21aca84af910f106721"), dash: [6, 5]
    });

    if (data.countries) {
        paintPILand(ctx, data);
    } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_0d0c515399ea909878e4");
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_fd734ed4593bb28679dc");
        ctx.fillText(__dialogueText("ui/DestinationMapPainter.js", "t_3633470206f72e52be82"), (F.l + F.r) / 2, (F.t + F.b) / 2 - 8);
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_02d3515b38bf15255f3b");
        ctx.fillText(data.failed ? __dialogueText("ui/DestinationMapPainter.js", "t_93327d3968f1512a5cfb") :
            __dialogueText("ui/DestinationMapPainter.js", "t_1ba1fb6412a80dda30b4"), (F.l + F.r) / 2, (F.t + F.b) / 2 + 28);
    }

    ctx.textAlign = 'center';
    PI_OCEANS.forEach(({ lon, lat, text, rot }) => {
        const p = P.project(lon, lat);
        if (!inFrame(F, p.x, p.y, 40)) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_f621004195117ba4664e");
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_4dc1df755c8833a77b91");
        spacedText(ctx, text.toUpperCase(), 0, 0, 9);
        ctx.restore();
    });

    const monsters = [
        { lon: -42, lat: 38, kind: 'serpent', label: __dialogueText("ui/DestinationMapPainter.js", "t_163d38c2c722b8235f95"), s: 0.9 },
        { lon: -128, lat: -26, kind: 'serpent', label: __dialogueText("ui/DestinationMapPainter.js", "t_54533a769f146eb679bf"), s: 1 },
        { lon: 88, lat: -40, kind: 'kraken', label: __dialogueText("ui/DestinationMapPainter.js", "t_de7e528bf28e02b61815"), s: 1 }
    ];
    monsters.forEach(({ lon, lat, kind, label, s }) => {
        const p = P.project(lon, lat);
        if (!inFrame(F, p.x, p.y, 70)) return;
        if (kind === 'serpent') drawSerpent(ctx, p.x, p.y, s);
        else drawKraken(ctx, p.x, p.y, s);
        ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_bce02b3bb6f041ea2ca5");
        ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_d53a48c0a2e37f2509a2");
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x + 20, p.y + (kind === 'kraken' ? 70 : 34));
    });

    const compass = P.project(PI_COMPASS.lon, PI_COMPASS.lat);
    drawCompassRose(ctx, compass.x, compass.y, PI_COMPASS.radius);
    ctx.restore();

    paintPIFrame(ctx, P);

    // title cartouche
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_1dd7692859069822f5cb");
    ctx.fillRect(600, 30, 720, 92);
    ctx.strokeStyle = '#3a2815';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(600, 30, 720, 92);
    ctx.lineWidth = 1;
    ctx.strokeRect(606, 36, 708, 80);
    [[606, 36], [1314, 36], [606, 116], [1314, 116]].forEach(([x, y]) => {
        ctx.fillStyle = '#3a2815';
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
    });

    // stamp + coffee ring
    ctx.save();
    ctx.translate(1500, 84);
    ctx.rotate(-0.12);
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_4896ecae3f1c3a278dd9");
    ctx.fillStyle = __dialogueText("ui/DestinationMapPainter.js", "t_3a489a1147daa3537c4a");
    ctx.lineWidth = 3;
    ctx.strokeRect(-112, -24, 224, 48);
    ctx.lineWidth = 1;
    ctx.strokeRect(-107, -19, 214, 38);
    ctx.font = __dialogueText("ui/DestinationMapPainter.js", "t_02d3515b38bf15255f3b");
    ctx.textAlign = 'center';
    ctx.fillText(__dialogueText("ui/DestinationMapPainter.js", "t_76d3463ead3719da606b"), 0, 7);
    ctx.restore();

    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_84706047de9635798971");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(1690, 112, 32, 0.2, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_daaa6c522a3e125951b0");
    ctx.beginPath();
    ctx.arc(1690, 112, 29, 0.2, Math.PI * 1.85);
    ctx.stroke();

    // folds
    [[MAP_W / 3, true], [MAP_W * 2 / 3, true], [MAP_H / 2, false]].forEach(([pos, vertical]) => {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_d8fc80b6b7fd86fdb182");
        ctx.beginPath();
        if (vertical) { ctx.moveTo(pos, 0); ctx.lineTo(pos, MAP_H); }
        else { ctx.moveTo(0, pos); ctx.lineTo(MAP_W, pos); }
        ctx.stroke();
        ctx.strokeStyle = __dialogueText("ui/DestinationMapPainter.js", "t_b6c3932a30264654192a");
        ctx.beginPath();
        if (vertical) { ctx.moveTo(pos + 2, 0); ctx.lineTo(pos + 2, MAP_H); }
        else { ctx.moveTo(0, pos + 2); ctx.lineTo(MAP_W, pos + 2); }
        ctx.stroke();
    });

    // burnt edges
    const burn = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.42,
        MAP_W / 2, MAP_H / 2, MAP_W * 0.66);
    burn.addColorStop(0, 'rgba(60,30,10,0)');
    burn.addColorStop(1, __dialogueText("ui/DestinationMapPainter.js", "t_30425355d6aabebf5ab1"));
    ctx.fillStyle = burn;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    [
        [0, 0, 0, 56, 0, 0, MAP_W, 56],
        [0, MAP_H, 0, MAP_H - 56, 0, MAP_H - 56, MAP_W, 56],
        [0, 0, 56, 0, 0, 0, 56, MAP_H],
        [MAP_W, 0, MAP_W - 56, 0, MAP_W - 56, 0, 56, MAP_H]
    ].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, __dialogueText("ui/DestinationMapPainter.js", "t_977c38337bd0b2e8bfea"));
        g.addColorStop(1, 'rgba(70,40,15,0)');
        ctx.fillStyle = g;
        ctx.fillRect(rx, ry, rw, rh);
    });
}

// ================================================================= entry point
export function paintMap(ctx, themeId, data) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    try {
        if (themeId === 'pi') paintPI(ctx, data);
        else paintAgency(ctx, data);
    } finally {
        ctx.restore();
    }
}

// ================================================================= label placement
// items: [{ x, y, w, h }]  (pin centre + label size)
// returns: [{ x, y, dist }] top-left label rect for each item (same order)
export function placeLabels(items, { bounds, obstacles = [] } = {}) {
    const dirs = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
    const dists = [26, 52, 84, 122];
    const rects = obstacles.map(o => ({ ...o }));
    items.forEach(item => rects.push({ x: item.x - 17, y: item.y - 17, w: 34, h: 34 }));

    const overlaps = (r, pad) => rects.some(o =>
        r.x < o.x + o.w + pad && r.x + r.w + pad > o.x &&
        r.y < o.y + o.h + pad && r.y + r.h + pad > o.y);
    const inside = r => !bounds || (r.x >= bounds.l && r.y >= bounds.t &&
        r.x + r.w <= bounds.r && r.y + r.h <= bounds.b);

    const results = new Array(items.length);
    const order = items.map((item, index) => index)
        .sort((a, b) => items[a].y - items[b].y || items[a].x - items[b].x);

    for (const index of order) {
        const item = items[index];
        let best = null;
        outer:
        for (const dist of dists) {
            for (const [dx, dy] of dirs) {
                const k = dx && dy ? 0.75 : 1;
                const ax = item.x + dx * dist * k;
                const ay = item.y + dy * dist * k;
                const x = dx > 0 ? ax : dx < 0 ? ax - item.w : ax - item.w / 2;
                const y = dy > 0 ? ay : dy < 0 ? ay - item.h : ay - item.h / 2;
                const rect = { x, y, w: item.w, h: item.h };
                if (!inside(rect) || overlaps(rect, 3)) continue;
                best = { x, y, dist };
                break outer;
            }
        }
        if (!best) {
            let x = item.x + 24;
            let y = item.y - item.h / 2;
            if (bounds) {
                x = Math.max(bounds.l, Math.min(x, bounds.r - item.w));
                y = Math.max(bounds.t, Math.min(y, bounds.b - item.h));
            }
            best = { x, y, dist: 24 };
        }
        results[index] = best;
        rects.push({ x: best.x, y: best.y, w: item.w, h: item.h });
    }
    return results;
}