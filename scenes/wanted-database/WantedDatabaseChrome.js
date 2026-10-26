import { TICKER_ITEMS } from './WantedDatabaseConfig.js';

export const WantedDatabaseChrome = {
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

        this.makeRect(22, 22, W - 44, H - 44, 0x000000, 0, 0.3, 2);
    },

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

        const glare = this.add.graphics().setDepth(998);

        glare.fillStyle(0xffffff, 0.02);
        glare.fillTriangle(16, 16, W * 0.5, 16, 16, H * 0.45);
        glare.fillStyle(0xffffff, 0.012);
        glare.fillTriangle(W * 0.5, 16, W * 0.62, 16, 16, H * 0.62);

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

        this.glitchTimer = this.time.addEvent({
            delay: 6500,
            loop: true,
            callback: () => {
                if (Math.random() < 0.45 && !this.booting) {
                    this.cameras.main.shake(90, 0.0016);
                }
            }
        });

        // winieta kamery (WebGL, Phaser 3.60+), czysto kosmetyczna
        if (this.renderer?.type === Phaser.WEBGL && this.cameras.main.postFX) {
            try {
                this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.3);
            } catch (e) {
                /* ignore */
            }
        }
    },

    createTicker(W, H) {
        const th = this.th;
        const y = H - 50;

        this.makeRect(24, y, W - 48, 26, th.panel, 0.95, 0.5);
        this.makeRect(24, y, 84, 26, th.panelAlt, 1, 0.6);

        this.makeText(66, y + 13, 'NEWS>', 10).setOrigin(0.5);

        const left = 24 + 92;
        const right = W - 24 - 6;

        const items = [...TICKER_ITEMS].sort(() => Math.random() - 0.5);

        const mission = this.gameState?.currentMission;

        if (mission) {
            const art =
                typeof mission.artifact === 'string'
                    ? mission.artifact
                    : mission.artifact?.label || mission.artifact?.name || '';

            const city = typeof mission.city === 'string' ? mission.city : '';

            if (art && city) {
                items.unshift(
                    `ACTIVE CASE: ${art} // ${city}. SUSPECTS: ALL OF YOU`.toUpperCase()
                );
            }
        }

        const ticker = this.makeText(
            right,
            y + 13,
            items.join('   ///   ') + '   ///   ',
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
    },

    createBootSequence(W, H) {
        if (this.noBoot || this.registry.get('wantedDbBooted')) {
            this.booting = false;
            return;
        }

        this.registry.set('wantedDbBooted', true);

        const th = this.th;

        this.booting = true;

        const layer = this.add.container(0, 0).setDepth(2000);

        const g = this.add.graphics();

        g.fillStyle(th.bg, 1);
        g.fillRoundedRect(14, 14, W - 28, H - 28, 28);

        const zone = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();

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
    },

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
};
