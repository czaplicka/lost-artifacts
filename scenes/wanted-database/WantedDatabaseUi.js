import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONT_PIXEL, FONT_TYPE } from './WantedDatabaseConfig.js';
import { audioManager } from '../../managers/AudioManager.js';

export const WantedDatabaseUi = {
    makeText(x, y, text, size = 14, extra = {}) {
        return this.add.text(x, y, text, { fontFamily: FONT_PIXEL, fontSize: `${size}px`, color: this.th.sMain, ...extra });
    },
    makeType(x, y, text, size = 18, extra = {}) {
        return this.add.text(x, y, text, { fontFamily: FONT_TYPE, fontSize: `${size}px`, color: this.th.sMain, ...extra });
    },
    glow(color, blur = 8) { return { offsetX: 0, offsetY: 0, color, blur, stroke: false, fill: true }; },
    makeRect(x, y, width, height, fill = this.th.panel, alpha = 1, strokeAlpha = 0.5, strokeWidth = 1) {
        return this.add.rectangle(x, y, width, height, fill, alpha).setOrigin(0).setStrokeStyle(strokeWidth, this.th.main, strokeAlpha);
    },
    drawBrackets(g, x, y, w, h, len, color, lw = 2, alpha = 1) {
        g.lineStyle(lw, color, alpha); g.beginPath();
        g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y);
        g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len);
        g.moveTo(x + w, y + h - len); g.lineTo(x + w, y + h); g.lineTo(x + w - len, y + h);
        g.moveTo(x + len, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - len); g.strokePath();
    },
    sfx(key) {
        if (this._wantedButtonAudio) { this._wantedButtonAudio.key = key; return; }
        if (!this.session?.active || this._cleanupDone || !this.sys.isActive()) return;
        const mapped = key === 'click_sound' || key === 'pagesound';
        const resolved = mapped ? 'sfx_wanted_ui_click' : key;
        if (!this.cache.audio.exists(resolved)) return;
        try {
            audioManager.init(this);
            audioManager.playSfx(resolved, { volume: audioManager.getSfxVolume() * (mapped ? 0.2 : 1) });
        } catch (error) { console.debug('[WantedDatabaseScene] UI sound unavailable:', error); }
    },
    wantedButtonAudioState() {
        return [this.currentPage, this.searchQuery, this.filterGender, this.filterStatus, this.sortIndex,
            this.photoFilterOn, this.themeKey, this.registry?.get('wantedDbTheme'), this.isClosing,
            this.selectedCard, this.detailPanel?.visible, this.helpPanel?.visible, JSON.stringify(this.marks || {})];
    },
    runWantedButtonAction(onClick) {
        const before = this.wantedButtonAudioState();
        const parent = this._wantedButtonAudio;
        const action = { key: null }; this._wantedButtonAudio = action;
        let completed = false;
        try { onClick(); completed = true; }
        finally {
            this._wantedButtonAudio = parent;
            const after = this.wantedButtonAudioState();
            if (completed && before.some((value, i) => value !== after[i])) {
                this.sfx(action.key || 'click_sound');
            }
        }
    },
    makeButton(x, y, width, height, label, onClick, size = 13) {
        const th = this.th, container = this.add.container(x, y);
        const background = this.makeRect(0, 0, width, height, th.panelAlt, 1, 0.5);
        background.setInteractive({ useHandCursor: true });
        const text = this.makeText(width / 2, height / 2, label, size, { color: th.sMid }).setOrigin(0.5);
        const btn = { container, background, text, active: false, width, height };
        const paint = hover => {
            const lit = hover || btn.active;
            background.setFillStyle(lit ? th.hover : th.panelAlt, 1).setStrokeStyle(1, hover ? th.hi : th.main, lit ? 1 : 0.5);
            text.setColor(lit ? th.sHi : th.sMid);
        };
        btn.setLabel = value => text.setText(value);
        btn.setActive = value => { btn.active = !!value; paint(false); };
        background.on('pointerover', () => paint(true)); background.on('pointerout', () => paint(false));
        background.on('pointerdown', () => {
            if (!this.session?.active || this.isClosing || this.booting) return;
            this.runWantedButtonAction(onClick);
        });
        container.add([background, text]); paint(false); return btn;
    },
    gameClockText() {
        const gs = this.gameState || {};
        const day = Math.max(1, Math.floor(Number(gs.currentDay ?? gs.day) || 1));
        const hour = gs.currentHour ?? gs.hour, minute = gs.currentMinute ?? gs.minute;
        const p = n => String(n).padStart(2, '0');
        if (hour === undefined || hour === null) { const d = new Date(); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
        return `${__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_eb7444abbca4a79ed61b")}${day}${__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_6c179f21e6f62b629055")}${p(Number(hour) || 0)}${__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_e7ac0786668e0ff0f02b")}${p(Number(minute) || 0)}`;
    },
    createHeader(W) {
        const th = this.th;
        this.makeRect(24, 24, W - 48, 72, th.panel, 0.95, 0.8, 2);
        this.makeRect(26, 26, W - 52, 14, th.panelAlt, 1, 0);
        this.makeText(44, 38, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_6df7193e1416e4087b4f"), 12, { color: th.sMid }).setOrigin(0, 0.5);
        this.makeText(44, 68, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_b2d22e46b76d790ec55c"), 9, { color: th.sDim }).setOrigin(0, 0.5);
        this.makeText(W / 2, 62, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_5420703a30f83f1fc37a"), 28, { stroke: th.sShadow, strokeThickness: 4,
            shadow: this.glow(th.sMain, 12) }).setOrigin(0.5);
        this.clockText = this.makeText(W - 44, 80, '', 11, { color: th.sMid }).setOrigin(1, 0.5);
        const updateClock = () => { if (this.isWantedTextAlive(this.clockText)) this.clockText.setText(this.gameClockText()); };
        updateClock(); this.clockTimer = this.time.addEvent({ delay: 1000, loop: true, callback: updateClock });
        this.makeButton(W - 44 - 170, 32, 170, 34, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_00b2bafbfd97d0bf28fb"), () => this.closeAndReturnToOffice(), 12);
    },
    createHelpPanel(W, H) {
        const th = this.th, panel = this.add.container(0, 0).setDepth(150);
        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0).setInteractive();
        overlay.on('pointerdown', () => this.toggleHelp(false)); panel.add(overlay);
        const lines = [
            ['TYPE', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_12cdba210037132068ef")], ['BACKSPACE', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_ced8e91bf5bfd706d108")], ['TAB', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_40687551f7153e30d9b5")],
            ['UP', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_7c1c258c137cc21c56d4")], ['DOWN', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_7b7128a16f467f06693e")], ['LEFT/RIGHT', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_cbbf40703eb23092cf39")],
            [__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_c4b03be817e6b06a2558"), __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_e38487c60c0997623603")], [__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_8d71150230923ed457eb"), __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_bed4a5f4ea42118645de")],
            [__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_c368badebf710d86b1c5"), __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_3a994770b554c020f927")], [__dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_2067a5c8c4d8ab2315b9"), __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_b68d8233fd61c1f9a07f")], ['ESC', __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_ef9d81414fed12b4787b")]
        ];
        const text = lines.map(([k, v]) => `${k.padEnd(13, '.')} ${v}`).join('\n');
        const bw = 760, bh = 140 + lines.length * 30, bx = (W - bw) / 2, by = (H - bh) / 2;
        const bg = this.makeRect(bx, by, bw, bh, th.bg, 0.99, 1, 2).setInteractive();
        bg.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation?.());
        panel.add(bg); panel.add(this.makeRect(bx, by, bw, 44, th.panelAlt, 1, 0.6));
        panel.add(this.makeText(bx + 20, by + 22, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_5893f3fa1257072c26cb"), 16, { shadow: this.glow(th.sMain, 8) }).setOrigin(0, 0.5));
        panel.add(this.makeText(bx + 28, by + 66, text, 12, { lineSpacing: 16 }));
        panel.add(this.makeText(bx + bw / 2, by + bh - 24, __dialogueText("scenes/wanted-database/WantedDatabaseUi.js", "t_5dc9f8e0ee2ae340c026"), 10,
            { color: th.sDim }).setOrigin(0.5));
        return panel;
    },
    toggleHelp(force) {
        if (!this.helpPanel || this.booting) return;
        const show = force ?? !this.helpPanel.visible;
        this.helpPanel.setVisible(show);
    }
};
