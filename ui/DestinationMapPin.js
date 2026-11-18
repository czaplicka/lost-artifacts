import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";

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

export function makeText(scene, x, y, value, style) {
    const t = scene.add.text(x, y, value, style);
    t.setResolution?.(2);
    return t;
}

// ================================================================= MapPin
export class MapPin {
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
        const rawName = nameOverride || this.city?.city || __dialogueText("ui/DestinationWorldMap.js", "t_2491fe94a7ba027ffff4");
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
