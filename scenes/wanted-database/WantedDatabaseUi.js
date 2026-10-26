import { FONT_PIXEL, FONT_TYPE } from './WantedDatabaseConfig.js';
import { audioManager } from '../../managers/AudioManager.js';

export const WantedDatabaseUi = {
    makeText(x, y, text, size = 14, extra = {}) {
        return this.add.text(x, y, text, {
            fontFamily: FONT_PIXEL,
            fontSize: `${size}px`,
            color: this.th.sMain,
            ...extra
        });
    },

    makeType(x, y, text, size = 18, extra = {}) {
        return this.add.text(x, y, text, {
            fontFamily: FONT_TYPE,
            fontSize: `${size}px`,
            color: this.th.sMain,
            ...extra
        });
    },

    glow(color, blur = 8) {
        return {
            offsetX: 0,
            offsetY: 0,
            color,
            blur,
            stroke: false,
            fill: true
        };
    },

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
    },

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
    },

    sfx(key) {
        try {
            audioManager.playSfx(key);
        } catch (e) {
            /* sound is optional */
        }
    },

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

            this.sfx('click_sound');
            onClick();
        });

        container.add([background, text]);
        paint(false);

        return btn;
    },

    gameClockText() {
        const gs = this.gameState || {};

        const day = Math.max(1, Math.floor(Number(gs.currentDay ?? gs.day) || 1));
        const hour = gs.currentHour ?? gs.hour;
        const minute = gs.currentMinute ?? gs.minute;

        const p = (n) => String(n).padStart(2, '0');

        if (hour === undefined || hour === null) {
            const d = new Date();
            return `${p(d.getHours())}:${p(d.getMinutes())}`;
        }

        return `DAY ${day}  ${p(Number(hour) || 0)}:${p(Number(minute) || 0)}`;
    },

    createHeader(W) {
        const th = this.th;

        this.makeRect(24, 24, W - 48, 72, th.panel, 0.95, 0.8, 2);
        this.makeRect(26, 26, W - 52, 14, th.panelAlt, 1, 0);

        this.makeText(44, 38, '> MARK-OS v2.04', 12, {
            color: th.sMid
        }).setOrigin(0, 0.5);

        this.makeText(44, 68, 'LINK: INTERPOL-NET [ONLINE]', 9, {
            color: th.sDim
        }).setOrigin(0, 0.5);

        this.makeText(W / 2, 62, 'MOST WANTED DATABASE', 28, {
            stroke: th.sShadow,
            strokeThickness: 4,
            shadow: this.glow(th.sMain, 12)
        }).setOrigin(0.5);

        this.clockText = this.makeText(W - 44, 80, '', 11, {
            color: th.sMid
        }).setOrigin(1, 0.5);

        const updateClock = () => {
            if (this.isWantedTextAlive(this.clockText)) {
                this.clockText.setText(this.gameClockText());
            }
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
    },

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
            ['CLICK SKILL', 'SEARCH BY SKILL'],
            ['F  (DOSSIER)', 'FLAG SUSPECT'],
            ['C  (DOSSIER)', 'CLEAR SUSPECT'],
            ['ESC', 'BACK / CLEAR / EXIT']
        ];

        const text = lines
            .map(([k, v]) => `${k.padEnd(13, '.')} ${v}`)
            .join('\n');

        const bw = 760;
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

        panel.add(this.makeText(bx + 28, by + 66, text, 12, { lineSpacing: 16 }));

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
    },

    toggleHelp(force) {
        if (!this.helpPanel || this.booting) return;

        const show = force ?? !this.helpPanel.visible;

        this.helpPanel.setVisible(show);
    }
};
