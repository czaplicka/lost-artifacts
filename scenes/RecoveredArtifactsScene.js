import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
export class RecoveredArtifactsScene extends BaseScene {
    constructor() {
        super({ key: 'RecoveredArtifactsScene' });
        this.artifacts = [];
        this.currentPage = 0;
        this.itemsPerPage = 4;
        this.cardObjects = [];
        this.detailPanel = null;
        this.detailOpen = false;
    }

    init(data) {
        this.gameState = data?.gameState || {};
        // Lista odzyskanych artefaktów przechowywana w gameState.recoveredArtifacts
        // Każdy wpis: { missionId, artifact, city, country, description, significance, artifactKey, recoveredAt }
        this.artifacts = this.gameState?.recoveredArtifacts || [];
    }

    create() {
            super.create();
EventBus.emit('hideHUD');
        const { width, height } = this.scale;

        this._buildOverlay(width, height);
        this._buildHeader(width);
        this._buildGrid(width, height);
        this._buildPagination(width, height);
        this._buildCloseButton(width);

        // Zamknięcie klawiszem ESC
        this.input.keyboard.once('keydown-ESC', () => this.closeScene());
    }

    // ─── OVERLAY / TŁO ────────────────────────────────────────────────────────

    _buildOverlay(width, height) {
        // Półprzezroczyste tło
        this.add.rectangle(0, 0, width, height, 0x1a0e05, 0.94)
            .setOrigin(0, 0)
            .setDepth(300);

        // Ozdobna ramka – styl Indiana Jones
        const border = this.add.graphics().setDepth(301);
        border.lineStyle(3, 0xc8a84b, 1);
        border.strokeRect(28, 28, width - 56, height - 56);
        border.lineStyle(1, 0x8b6914, 0.6);
        border.strokeRect(36, 36, width - 72, height - 72);

        // Narożne ornamenty
        const corners = [[44, 44], [width - 44, 44], [44, height - 44], [width - 44, height - 44]];
        corners.forEach(([cx, cy]) => {
            border.fillStyle(0xc8a84b, 1);
            border.fillCircle(cx, cy, 6);
        });
    }

    // ─── NAGŁÓWEK ─────────────────────────────────────────────────────────────

    _buildHeader(width) {
        // Tytuł
        this.add.text(width / 2, 68, 'RECOVERED ARTIFACTS', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#c8a84b',
            stroke: '#1a0e05',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(302);

        // Podtytuł / licznik
        const count = this.artifacts.length;
        const subtitle = count === 0
            ? 'No artifacts recovered yet'
            : `${count} artifact${count !== 1 ? 's' : ''} in the collection`;

        this.add.text(width / 2, 102, subtitle, {
            fontFamily: 'Special Elite',
            fontSize: '16px',
            color: '#a89060'
        }).setOrigin(0.5).setDepth(302);

        // Ozdobna linia pod nagłówkiem
        const line = this.add.graphics().setDepth(302);
        line.lineStyle(1, 0xc8a84b, 0.5);
        line.lineBetween(80, 118, width - 80, 118);
    }

    // ─── SIATKA KART ──────────────────────────────────────────────────────────

    _buildGrid(width, height) {
        // Wyczyść poprzednią stronę
        this.cardObjects.forEach(obj => obj.destroy());
        this.cardObjects = [];

        if (this.artifacts.length === 0) {
            this._buildEmptyState(width, height);
            return;
        }

        const startIdx = this.currentPage * this.itemsPerPage;
        const pageItems = this.artifacts.slice(startIdx, startIdx + this.itemsPerPage);

        const cols = 2;
        const rows = 2;
        const cardW = 380;
        const cardH = 200;
        const padX = (width - cols * cardW) / (cols + 1);
        const startY = 145;
        const padY = (height - 160 - startY - rows * cardH) / (rows + 1);

        pageItems.forEach((artifact, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = padX + col * (cardW + padX);
            const cy = startY + padY + row * (cardH + padY);

            this._buildArtifactCard(artifact, cx, cy, cardW, cardH);
        });
    }

    _buildArtifactCard(artifactData, x, y, w, h) {
        const depth = 303;

        // Tło karty
        const bg = this.add.graphics().setDepth(depth);
        bg.fillStyle(0x2c1a08, 1);
        bg.fillRoundedRect(x, y, w, h, 10);
        bg.lineStyle(2, 0xc8a84b, 0.7);
        bg.strokeRoundedRect(x, y, w, h, 10);
        this.cardObjects.push(bg);

        // Ikona artefaktu (texture z preloaera lub placeholder)
        const iconKey = artifactData.artifactKey || 'artifact_placeholder';
        const hasTexture = this.textures.exists(iconKey);

        if (hasTexture) {
            const icon = this.add.image(x + 80, y + h / 2, iconKey)
                .setDisplaySize(100, 100)
                .setDepth(depth + 1);
            this.cardObjects.push(icon);
        } else {
            // Placeholder – złota ikona
            const iconBg = this.add.graphics().setDepth(depth + 1);
            iconBg.fillStyle(0x3d2510, 1);
            iconBg.fillRoundedRect(x + 14, y + 14, 100, h - 28, 8);
            iconBg.lineStyle(1, 0xc8a84b, 0.4);
            iconBg.strokeRoundedRect(x + 14, y + 14, 100, h - 28, 8);
            this.cardObjects.push(iconBg);

            const iconLabel = this.add.text(x + 64, y + h / 2, '🏺', {
                fontSize: '36px'
            }).setOrigin(0.5).setDepth(depth + 2);
            this.cardObjects.push(iconLabel);
        }

        // Nazwa artefaktu
        const nameText = this.add.text(x + 128, y + 22, artifactData.artifact || 'Unknown Artifact', {
            fontFamily: 'PressStart2P',
            fontSize: '9px',
            color: '#c8a84b',
            wordWrap: { width: w - 148 }
        }).setDepth(depth + 1);
        this.cardObjects.push(nameText);

        // Miasto / kraj
        const locationStr = [artifactData.city, artifactData.country].filter(Boolean).join(', ');
        const locationText = this.add.text(x + 128, y + 60, `📍 ${locationStr}`, {
            fontFamily: 'Special Elite',
            fontSize: '13px',
            color: '#a89060'
        }).setDepth(depth + 1);
        this.cardObjects.push(locationText);

        // Opis (skrócony)
        const desc = artifactData.description || '';
        const shortDesc = desc.length > 90 ? desc.substring(0, 87) + '...' : desc;
        const descText = this.add.text(x + 128, y + 82, shortDesc, {
            fontFamily: 'Special Elite',
            fontSize: '12px',
            color: '#d4c49a',
            wordWrap: { width: w - 148 },
            lineSpacing: 2
        }).setDepth(depth + 1);
        this.cardObjects.push(descText);

        // Data odzyskania
        if (artifactData.recoveredAt) {
            const dateText = this.add.text(x + w - 10, y + h - 18, artifactData.recoveredAt, {
                fontFamily: 'Special Elite',
                fontSize: '11px',
                color: '#6e5a38'
            }).setOrigin(1, 0.5).setDepth(depth + 1);
            this.cardObjects.push(dateText);
        }

        // Interaktywna strefa kliknięcia "szczegóły"
        const detailsBtn = this.add.text(x + w - 10, y + 22, '[ details ]', {
            fontFamily: 'Special Elite',
            fontSize: '12px',
            color: '#c8a84b'
        }).setOrigin(1, 0).setDepth(depth + 2).setInteractive({ useHandCursor: true });

        detailsBtn.on('pointerover', () => detailsBtn.setColor('#ffe080'));
        detailsBtn.on('pointerout', () => detailsBtn.setColor('#c8a84b'));
        detailsBtn.on('pointerdown', () => this._openDetailPanel(artifactData));
        this.cardObjects.push(detailsBtn);

        // Hover na całej karcie
        const hitZone = this.add.zone(x, y, w, h)
            .setOrigin(0, 0)
            .setDepth(depth - 1)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x3d2510, 1);
            bg.fillRoundedRect(x, y, w, h, 10);
            bg.lineStyle(2, 0xffe080, 0.9);
            bg.strokeRoundedRect(x, y, w, h, 10);
        });

        hitZone.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x2c1a08, 1);
            bg.fillRoundedRect(x, y, w, h, 10);
            bg.lineStyle(2, 0xc8a84b, 0.7);
            bg.strokeRoundedRect(x, y, w, h, 10);
        });

        hitZone.on('pointerdown', () => this._openDetailPanel(artifactData));
        this.cardObjects.push(hitZone);
    }

    _buildEmptyState(width, height) {
        const emptyGroup = [];

        const iconText = this.add.text(width / 2, height / 2 - 60, '🏺', {
            fontSize: '64px'
        }).setOrigin(0.5).setDepth(303).setAlpha(0.3);
        emptyGroup.push(iconText);

        const msg1 = this.add.text(width / 2, height / 2 + 20, 'No artifacts recovered yet.', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#6e5a38'
        }).setOrigin(0.5).setDepth(303);
        emptyGroup.push(msg1);

        const msg2 = this.add.text(width / 2, height / 2 + 56, 'Solve missions to fill your collection!', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#5a4a28'
        }).setOrigin(0.5).setDepth(303);
        emptyGroup.push(msg2);

        emptyGroup.forEach(o => this.cardObjects.push(o));
    }

    // ─── PAGINACJA ────────────────────────────────────────────────────────────

    _buildPagination(width, height) {
        const totalPages = Math.ceil(this.artifacts.length / this.itemsPerPage);
        if (totalPages <= 1) return;

        const y = height - 56;

        const prevBtn = this.add.text(width / 2 - 80, y, '◀ PREV', {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: this.currentPage === 0 ? '#4a3a1a' : '#c8a84b'
        }).setOrigin(0.5).setDepth(304)
          .setInteractive({ useHandCursor: this.currentPage > 0 });

        if (this.currentPage > 0) {
            prevBtn.on('pointerover', () => prevBtn.setColor('#ffe080'));
            prevBtn.on('pointerout', () => prevBtn.setColor('#c8a84b'));
            prevBtn.on('pointerdown', () => {
                this.currentPage--;
                this._refreshGrid(width, height);
            });
        }

        const pageInfo = this.add.text(width / 2, y, `${this.currentPage + 1} / ${totalPages}`, {
            fontFamily: 'Special Elite',
            fontSize: '16px',
            color: '#a89060'
        }).setOrigin(0.5).setDepth(304);

        const nextBtn = this.add.text(width / 2 + 80, y, 'NEXT ▶', {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: this.currentPage >= totalPages - 1 ? '#4a3a1a' : '#c8a84b'
        }).setOrigin(0.5).setDepth(304)
          .setInteractive({ useHandCursor: this.currentPage < totalPages - 1 });

        if (this.currentPage < totalPages - 1) {
            nextBtn.on('pointerover', () => nextBtn.setColor('#ffe080'));
            nextBtn.on('pointerout', () => nextBtn.setColor('#c8a84b'));
            nextBtn.on('pointerdown', () => {
                this.currentPage++;
                this._refreshGrid(width, height);
            });
        }

        this.paginationObjects = [prevBtn, pageInfo, nextBtn];
    }

    _refreshGrid(width, height) {
        this.paginationObjects?.forEach(o => o.destroy());
        this._buildGrid(width, height);
        this._buildPagination(width, height);
    }

    // ─── PANEL SZCZEGÓŁÓW ─────────────────────────────────────────────────────

    _openDetailPanel(artifactData) {
        if (this.detailOpen) this._closeDetailPanel();
        this.detailOpen = true;

        const { width, height } = this.scale;
        const pw = 680;
        const ph = 420;
        const px = (width - pw) / 2;
        const py = (height - ph) / 2;
        const depth = 400;

        this.detailPanel = this.add.container(0, 0).setDepth(depth);

        // Tło panelu
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a0e05, 0.97);
        panelBg.fillRoundedRect(px, py, pw, ph, 14);
        panelBg.lineStyle(3, 0xc8a84b, 1);
        panelBg.strokeRoundedRect(px, py, pw, ph, 14);
        this.detailPanel.add(panelBg);

        // Tytuł
        const titleText = this.add.text(px + pw / 2, py + 28, artifactData.artifact || 'Unknown', {
            fontFamily: 'PressStart2P',
            fontSize: '11px',
            color: '#c8a84b',
            align: 'center',
            wordWrap: { width: pw - 60 }
        }).setOrigin(0.5, 0);
        this.detailPanel.add(titleText);

        // Linia
        const divLine = this.add.graphics();
        divLine.lineStyle(1, 0xc8a84b, 0.4);
        divLine.lineBetween(px + 30, py + 68, px + pw - 30, py + 68);
        this.detailPanel.add(divLine);

        // Lokalizacja
        const locationStr = [artifactData.city, artifactData.country].filter(Boolean).join(', ');
        const locText = this.add.text(px + 36, py + 80, `📍 ${locationStr}`, {
            fontFamily: 'Special Elite',
            fontSize: '15px',
            color: '#a89060'
        });
        this.detailPanel.add(locText);

        // Opis
        const descText = this.add.text(px + 36, py + 108, artifactData.description || '', {
            fontFamily: 'Special Elite',
            fontSize: '14px',
            color: '#d4c49a',
            wordWrap: { width: pw - 72 },
            lineSpacing: 4
        });
        this.detailPanel.add(descText);

        // Significance (znaczenie historyczne)
        if (artifactData.significance) {
            const sigLabel = this.add.text(px + 36, py + ph - 110, 'SIGNIFICANCE:', {
                fontFamily: 'PressStart2P',
                fontSize: '8px',
                color: '#c8a84b'
            });
            this.detailPanel.add(sigLabel);

            const sigText = this.add.text(px + 36, py + ph - 90, artifactData.significance, {
                fontFamily: 'Special Elite',
                fontSize: '13px',
                color: '#a89060',
                wordWrap: { width: pw - 72 },
                lineSpacing: 3
            });
            this.detailPanel.add(sigText);
        }

        // Data odzyskania
        if (artifactData.recoveredAt) {
            const recText = this.add.text(px + pw - 36, py + ph - 28, `Recovered: ${artifactData.recoveredAt}`, {
                fontFamily: 'Special Elite',
                fontSize: '12px',
                color: '#6e5a38'
            }).setOrigin(1, 0.5);
            this.detailPanel.add(recText);
        }

        // Przycisk zamknięcia
        const closeBtn = this.add.text(px + pw - 20, py + 16, '✕', {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#c8a84b'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6b6b'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#c8a84b'));
        closeBtn.on('pointerdown', () => this._closeDetailPanel());
        this.detailPanel.add(closeBtn);

        // Zamknięcie kliknięciem poza panelem
        const outsideZone = this.add.zone(0, 0, width, height)
            .setOrigin(0, 0)
            .setDepth(depth - 1)
            .setInteractive();
        outsideZone.on('pointerdown', (pointer) => {
            const inPanel = pointer.x >= px && pointer.x <= px + pw
                         && pointer.y >= py && pointer.y <= py + ph;
            if (!inPanel) {
                outsideZone.destroy();
                this._closeDetailPanel();
            }
        });
        this.detailPanel.add(outsideZone);

        // Animacja wejścia
        this.detailPanel.setAlpha(0);
        this.tweens.add({
            targets: this.detailPanel,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });
    }

    _closeDetailPanel() {
        if (!this.detailPanel) return;
        this.tweens.add({
            targets: this.detailPanel,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.detailPanel?.destroy();
                this.detailPanel = null;
                this.detailOpen = false;
            }
        });
    }

    // ─── PRZYCISK ZAMKNIĘCIA SCENY ────────────────────────────────────────────

    _buildCloseButton(width) {
        const closeBtn = this.add.text(width - 52, 48, '[ CLOSE ]', {
            fontFamily: 'PressStart2P',
            fontSize: '9px',
            color: '#c8a84b',
            backgroundColor: '#1a0e05',
            padding: { left: 8, right: 8, top: 6, bottom: 6 }
        }).setOrigin(0.5).setDepth(310).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffe080'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#c8a84b'));
        closeBtn.on('pointerdown', () => this.closeScene());
    }

    // ─── ZAMKNIĘCIE SCENY ─────────────────────────────────────────────────────

    closeScene() {
        // Przywracamy hotspoty w OfficeScene
        const officeScene = this.scene.get('OfficeScene');
        if (officeScene?.createHotspots) {
            // Jeśli hotspoty zostały wyłączone, odtwarzamy je
        }
        this.scene.stop('RecoveredArtifactsScene');
        this.scene.resume('OfficeScene');
    }

    // ─── METODA STATYCZNA: dodaj artefakt po zakończeniu misji ────────────────
    // Wywołaj np. w SuccessScene: RecoveredArtifactsScene.addRecoveredArtifact(gameState, missionData)

    static addRecoveredArtifact(gameState, missionData) {
        if (!gameState.recoveredArtifacts) {
            gameState.recoveredArtifacts = [];
        }
        const already = gameState.recoveredArtifacts.some(a => a.missionId === missionData.id);
        if (already) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        gameState.recoveredArtifacts.push({
            missionId:    missionData.id,
            artifact:     missionData.artifact,
            city:         missionData.city,
            country:      missionData.country,
            description:  missionData.description,
            significance: missionData.significance,
            artifactKey:  missionData.artifactKey,
            recoveredAt:  dateStr
        });
    }
}
