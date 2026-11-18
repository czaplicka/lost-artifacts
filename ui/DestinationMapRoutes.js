import { ROUTE_SHADOW_COLOR } from './DestinationMeta.js';
import { PROJECTION } from './DestinationMapPainter.js';

const LEFT = PROJECTION.project(-180, 0).x;
const RIGHT = PROJECTION.project(180, 0).x;
const WORLD_WIDTH = RIGHT - LEFT;

function wrapX(x) {
    if (x < LEFT) return x + WORLD_WIDTH;
    if (x > RIGHT) return x - WORLD_WIDTH;
    return x;
}

function traceSegment(a, b, moveTo, lineTo) {
    const dx = b.x - a.x;
    if (Math.abs(dx) > WORLD_WIDTH / 2) {
        const west = dx > 0;
        const exit = west ? LEFT : RIGHT;
        const enter = west ? RIGHT : LEFT;
        const unwrapped = b.x + (west ? -WORLD_WIDTH : WORLD_WIDTH);
        const fraction = (exit - a.x) / (unwrapped - a.x || 1);
        const y = a.y + (b.y - a.y) * fraction;
        lineTo(exit, y);
        moveTo(enter, y);
    }
    lineTo(b.x, b.y);
}

function drawSegment(g, a, b) {
    let x = a.x, y = a.y;
    traceSegment(a, b, (nx, ny) => { x = nx; y = ny; }, (nx, ny) => {
        g.lineBetween(x, y, nx, ny);
    });
}

export function buildArc(a, b) {
    const dxWrapped = b.x - a.x;
    if (Math.abs(dxWrapped) > WORLD_WIDTH / 2) {
        b = { ...b, x: b.x - Math.sign(dxWrapped) * WORLD_WIDTH };
    }
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
    return resample(raw, 6).map(point => ({ ...point, x: wrapX(point.x) }));
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

export const destinationRoutes = {
    // ------------------------------------------------------------ flight network (agency)
    clearNetwork() {
        this.arcs = [];
        this.networkGfx?.clear();
        this.packetGfx?.clear();
    },

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
                if (i % 4 < 2) drawSegment(g, pts[i], pts[i + 1]);
            }
        });
        if (this.active) this.startPackets();
    },

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
    },

    // ------------------------------------------------------------ route
    showRoute(from, to) {
        this.clearRoute();
        if (this.destroyed || !from || !to) return;
        if (Math.hypot(to.x - from.x, to.y - from.y) < 6) return;
        this.route = { pts: buildArc(from, to), progress: 0, phase: 0, loop: 0 };
        this.plane.setVisible(true);
        this.drawRoute();
    },

    clearRoute() {
        this.route = null;
        this.routeGfx?.clear();
        this.plane?.setVisible(false);
    },

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
            for (let i = 1; i <= head; i++) {
                traceSegment(pts[i - 1], pts[i], (x, y) => g.moveTo(x, y), (x, y) => g.lineTo(x, y));
            }
            g.strokePath();
        };

        if (this.themeId === 'agency') {
            polyline(9, ROUTE_SHADOW_COLOR, 0.55);
            polyline(7, t.hot, 0.25);
            g.lineStyle(3, t.hot, 1);
            for (let i = 0; i < head; i++) {
                if ((i + off) % 4 < 2) drawSegment(g, pts[i], pts[i + 1]);
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
    },
};
