import {
    STATE_KEY,
    clone,
    safeId,
    signature,
    getSearchProgress,
    discoverSearchKeywords,
    validateSearchData,
    resolveSearchResults,
    resolveSearch,
    ART_BASE,
    ART_FILES,
    FAILED_ART,
    VISITED,
    THEMES,
    DEFAULT_THEME,
    CLOUD_COLORS,
    BRAND,
    ITEM_HEIGHT,
    TAGLINES,
    HOOTY_LINES,
    ADS,
    AD_CLICKS,
    NO_RESULT_JOKES,
    ABOUT_TIP,
    PRIVACY_TIP,
    slug,
    hash,
    pick,
    titleCase,
    gameState,
    requestAutosave,
    FONTS,
    lerpColor,
    seeded
} from './ComputerSearchShared.js';

export class ComputerSearchWidgets {
    textWidth(value, size = 14) {
        const probe = this.ui.scene.add.text(0, 0, String(value), {
            fontFamily: FONTS.body,
            fontSize: `${size}px`
        }).setVisible(false);

        const width = probe.width;
        probe.destroy();

        return width;
    }

    chipWidth(label, size = 14, maxWidth = 400) {
        return Math.min(
            maxWidth,
            Math.ceil(this.textWidth(label, size)) + 20
        );
    }

    // Flat pixel "tag". Returns its width.

    chip(x, y, label, options = {}) {
        const {
            color = 0x3d6fa8,
            height = 26,
            size = 14,
            maxWidth = 400,
            textColor = '#ffffff',
            onClick = null
        } = options;

        const d = this.ui.drawing;
        const width = this.chipWidth(label, size, maxWidth);

        d.rectangle(x + 2, y + 2, width, height, 0x000000, 0.25);

        const body = d.rectangle(x, y, width, height, color);

        d.frame(x, y, width, height, 0x1b2530, 0.55, 1);

        const text = d.text(x + 10, y, label, size, textColor);

        d.fit(text, label, width - 20);
        text.setY(y + Math.round((height - text.height) / 2));

        if (onClick) {
            body
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () =>
                    body.setFillStyle(lerpColor(color, 0xffffff, 0.22))
                )
                .on('pointerout', () => body.setFillStyle(color))
                .on('pointerdown', () => {
                    this.ui.options.onSfx?.('click');
                    onClick();
                });
        }

        return width;
    }

    drawMagnifier(x, y, size = 22, color = 0x4a5a58) {
        const g = this.ui.drawing.add(this.ui.scene.add.graphics());
        const radius = size * 0.32;

        g.lineStyle(Math.max(2, size * 0.1), color, 1);
        g.strokeCircle(x + radius + 1, y + radius + 1, radius);
        g.lineBetween(
            x + radius * 1.9,
            y + radius * 1.9,
            x + size - 2,
            y + size - 2
        );

        return g;
    }

    // Procedural mascot: an owl in a fedora (nod to the adventure-game era).

    drawOwl(cx, cy, scale = 1, mood = 'happy') {
        const d = this.ui.drawing;
        const g = d.add(this.ui.scene.add.graphics());
        const u = value => value * scale;
        const ink = 0x1b2530;

        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(cx + u(4), cy + u(48), u(64), u(10));

        g.fillStyle(0xe0a458, 1);
        g.fillRect(cx - u(16), cy + u(44), u(10), u(5));
        g.fillRect(cx + u(6), cy + u(44), u(10), u(5));

        g.fillStyle(0x7b5b3b, 1);
        g.fillEllipse(cx, cy + u(6), u(72), u(84));
        g.lineStyle(2, ink, 1);
        g.strokeEllipse(cx, cy + u(6), u(72), u(84));

        g.fillStyle(0xf0dfb0, 1);
        g.fillEllipse(cx, cy + u(22), u(44), u(50));

        g.lineStyle(1, 0xb79a62, 1);

        for (let row = 0; row < 3; row++) {
            for (let col = -1; col <= 1; col++) {
                g.strokeCircle(
                    cx + col * u(11) + (row % 2) * u(5),
                    cy + u(14) + row * u(11),
                    u(5)
                );
            }
        }

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - u(15), cy - u(8), u(13));
        g.fillCircle(cx + u(15), cy - u(8), u(13));
        g.lineStyle(2, ink, 1);
        g.strokeCircle(cx - u(15), cy - u(8), u(13));
        g.strokeCircle(cx + u(15), cy - u(8), u(13));

        const lost = mood === 'lost';

        g.fillStyle(ink, 1);
        g.fillCircle(
            cx - u(15) + (lost ? u(4) : 0),
            cy - u(8) + (lost ? -u(3) : 0),
            u(lost ? 4 : 5)
        );
        g.fillCircle(
            cx + u(15) + (lost ? u(4) : 0),
            cy - u(8) + (lost ? -u(3) : 0),
            u(lost ? 4 : 5)
        );

        g.fillStyle(0xe0a458, 1);
        g.fillTriangle(
            cx - u(6),
            cy + u(2),
            cx + u(6),
            cy + u(2),
            cx,
            cy + u(13)
        );
        g.lineStyle(1, ink, 1);
        g.strokeTriangle(
            cx - u(6),
            cy + u(2),
            cx + u(6),
            cy + u(2),
            cx,
            cy + u(13)
        );

        // fedora
        g.fillStyle(0x5a3f2a, 1);
        g.fillRect(cx - u(15), cy - u(44), u(30), u(20));
        g.fillEllipse(cx, cy - u(25), u(62), u(10));
        g.fillStyle(0xd4af37, 1);
        g.fillRect(cx - u(15), cy - u(31), u(30), u(5));
        g.lineStyle(1, ink, 1);
        g.strokeRect(cx - u(15), cy - u(44), u(30), u(20));
        g.strokeEllipse(cx, cy - u(25), u(62), u(10));

        if (lost && scale >= 0.8) {
            d.pixel(
                cx + u(34),
                cy - u(52),
                '?',
                Math.round(u(20)),
                '#a14d35'
            );
        }

        return g;
    }

    // Small owl icon used in the address bar and the connecting screen.

    owlIcon(x, y, size) {
        if (this.art('search_owl', x, y, size, size)) return;

        this.drawOwl(x + size / 2, y + size * 0.47, size / 112);
    }

    favicon(x, y, size, page = {}) {
        const icons = {
            hotel: '🏨',
            organisation: '🏛️',
            magazine: '📰',
            social: '💬'
        };
        const theme = THEMES[page.theme] || DEFAULT_THEME;
        const d = this.ui.drawing;
        d.rectangle(x + 1, y + 1, size, size, 0x000000, 0.18);
        d.rectangle(x, y, size, size, 0xfaf9f3);
        d.frame(x, y, size, size, theme.accent, 0.7, 1);

        const icon = this.ui.scene.add.text(
            x + size / 2,
            y + size / 2,
            icons[page.theme] || '🌐',
            {
                fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                fontSize: `${Math.max(10, Math.floor(size * 0.75))}px`,
                color: '#1b2530',
                padding: { x: 0, y: 0 }
            }
        ).setOrigin(0.5);
        d.add(icon);
        return icon;
    }

    brandWidth(size) {
        return BRAND.reduce(
            (total, [word]) => total + this.textWidth(word, size) + 1,
            0
        );
    }

    brand(x, y, size = 36) {
        let currentX = x;

        for (const [word, color] of BRAND) {
            const text = this.ui.drawing.text(
                currentX,
                y,
                word,
                size,
                color
            );

            text.setShadow(2, 2, '#00000033', 0, false, true);
            currentX += text.width + 1;
        }

        return currentX - x;
    }

    /* ---------------------------- render ------------------------- */
}
