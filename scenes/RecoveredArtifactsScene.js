import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { preloadRecoveredArtifactsAudio,playRecoveredArtifactsAudio,stopRecoveredArtifactsAudio } from './archive/RecoveredArtifactsAudio.js';

export class RecoveredArtifactsScene extends BaseScene {
    constructor() {
        super({ key: 'RecoveredArtifactsScene' });
        this.artifacts = []; this.currentPage = 0; this.itemsPerPage = 4;
        this.cardObjects = []; this.detailPanel = null; this.detailOpen = false;
    }
    init(data) {
        this.gameState = data?.gameState || {};
        this.artifacts = this.gameState?.recoveredArtifacts || [];
        this.currentPage = Math.max(0, Math.min(this.currentPage, Math.max(0, Math.ceil(this.artifacts.length / this.itemsPerPage) - 1)));
        this.cardObjects = []; this.paginationObjects = [];
        this.detailPanel = null; this.detailOpen = false; this.detailClosing = false;
        this.detailArtifact = null; this.closing = false;
    }
    preload() { preloadRecoveredArtifactsAudio(this); }
    create() {
        super.create(); EventBus.emit('hideHUD');
        const { width, height } = this.scale;
        this._buildOverlay(width, height); this._buildHeader(width);
        this._buildGrid(width, height); this._buildPagination(width, height); this._buildCloseButton(width);
        this.escapeHandler = () => this.closeScene();
        this.input.keyboard?.once('keydown-ESC', this.escapeHandler);
        this.events.once('shutdown', () => {
            stopRecoveredArtifactsAudio(this);
            this.input.keyboard?.off('keydown-ESC', this.escapeHandler);
            this.escapeHandler = null; this._disposeDetailPanel();
            this.cardObjects = []; this.paginationObjects = [];
        });
    }
    _buildOverlay(width, height) {
        this.add.rectangle(0, 0, width, height, 0x1a0e05, 0.94).setOrigin(0, 0).setDepth(300);
        const border = this.add.graphics().setDepth(301);
        border.lineStyle(3, 0xc8a84b, 1); border.strokeRect(28, 28, width - 56, height - 56);
        border.lineStyle(1, 0x8b6914, 0.6); border.strokeRect(36, 36, width - 72, height - 72);
        [[44, 44], [width - 44, 44], [44, height - 44], [width - 44, height - 44]].forEach(([cx, cy]) => {
            border.fillStyle(0xc8a84b, 1); border.fillCircle(cx, cy, 6);
        });
    }
    _buildHeader(width) {
        this.add.text(width / 2, 68, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_4002d8e6ea5c5314a250"), {
            fontFamily: 'PressStart2P', fontSize: '18px', color: '#c8a84b', stroke: __dialogueText("scenes/RecoveredArtifactsScene.js", "t_e00a579669b77dab4a01"), strokeThickness: 4
        }).setOrigin(0.5).setDepth(302);
        const count = this.artifacts.length;
        const subtitle = count === 0 ? __dialogueText("scenes/RecoveredArtifactsScene.js", "t_d4be867494b072b7279a") : `${count}${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_5539ec10f4990d953813")}${count !== 1 ? 's' : ''}${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_352be3525b598c75b096")}`;
        this.add.text(width / 2, 102, subtitle, { fontFamily: 'SpecialElite', fontSize: '16px', color: '#a89060' }).setOrigin(0.5).setDepth(302);
        const line = this.add.graphics().setDepth(302); line.lineStyle(1, 0xc8a84b, 0.5); line.lineBetween(80, 118, width - 80, 118);
    }
    _buildGrid(width, height) {
        this.cardObjects.forEach(obj => obj.destroy()); this.cardObjects = [];
        if (this.artifacts.length === 0) { this._buildEmptyState(width, height); return; }
        const startIdx = this.currentPage * this.itemsPerPage;
        const pageItems = this.artifacts.slice(startIdx, startIdx + this.itemsPerPage);
        const cols = 2, rows = 2, cardW = 380, cardH = 200;
        const padX = (width - cols * cardW) / (cols + 1), startY = 145;
        const padY = (height - 160 - startY - rows * cardH) / (rows + 1);
        pageItems.forEach((artifact, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            this._buildArtifactCard(artifact, padX + col * (cardW + padX), startY + padY + row * (cardH + padY), cardW, cardH);
        });
    }
    _buildArtifactCard(artifactData, x, y, w, h) {
        const depth = 303;
        const bg = this.add.graphics().setDepth(depth);
        bg.fillStyle(0x2c1a08, 1); bg.fillRoundedRect(x, y, w, h, 10);
        bg.lineStyle(2, 0xc8a84b, 0.7); bg.strokeRoundedRect(x, y, w, h, 10); this.cardObjects.push(bg);
        const iconKey = artifactData.artifactKey || 'artifact_placeholder';
        if (this.textures.exists(iconKey)) {
            const icon = this.add.image(x + 80, y + h / 2, iconKey).setDisplaySize(100, 100).setDepth(depth + 1); this.cardObjects.push(icon);
        } else {
            const iconBg = this.add.graphics().setDepth(depth + 1);
            iconBg.fillStyle(0x3d2510, 1); iconBg.fillRoundedRect(x + 14, y + 14, 100, h - 28, 8);
            iconBg.lineStyle(1, 0xc8a84b, 0.4); iconBg.strokeRoundedRect(x + 14, y + 14, 100, h - 28, 8); this.cardObjects.push(iconBg);
            this.cardObjects.push(this.add.text(x + 64, y + h / 2, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_6f0781f74be2221b8f0b"), { fontSize: '36px' }).setOrigin(0.5).setDepth(depth + 2));
        }
        const nameText = this.add.text(x + 128, y + 22, artifactData.artifact || __dialogueText("scenes/RecoveredArtifactsScene.js", "t_172ff09667bbca32dc87"), {
            fontFamily: 'PressStart2P', fontSize: '9px', color: '#c8a84b', wordWrap: { width: w - 148 }
        }).setDepth(depth + 1); this.cardObjects.push(nameText);
        const locationStr = [artifactData.city, artifactData.country].filter(Boolean).join(', ');
        const locationText = this.add.text(x + 128, y + 60, `${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_0bcac6d63c2406e80cff")}${locationStr}`, {
            fontFamily: 'SpecialElite', fontSize: '13px', color: '#a89060'
        }).setDepth(depth + 1); this.cardObjects.push(locationText);
        const desc = artifactData.description || '', shortDesc = desc.length > 90 ? desc.substring(0, 87) + '...' : desc;
        const descText = this.add.text(x + 128, y + 82, shortDesc, {
            fontFamily: 'SpecialElite', fontSize: '12px', color: '#d4c49a', wordWrap: { width: w - 148 }, lineSpacing: 2
        }).setDepth(depth + 1); this.cardObjects.push(descText);
        if (artifactData.recoveredAt) {
            this.cardObjects.push(this.add.text(x + w - 10, y + h - 18, artifactData.recoveredAt, {
                fontFamily: 'SpecialElite', fontSize: '11px', color: '#6e5a38'
            }).setOrigin(1, 0.5).setDepth(depth + 1));
        }
        const detailsBtn = this.add.text(x + w - 10, y + 22, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_613ee91c298d3f5f4fdf"), {
            fontFamily: 'SpecialElite', fontSize: '12px', color: '#c8a84b'
        }).setOrigin(1, 0).setDepth(depth + 2).setInteractive({ useHandCursor: true });
        detailsBtn.on('pointerover', () => detailsBtn.setColor('#ffe080'));
        detailsBtn.on('pointerout', () => detailsBtn.setColor('#c8a84b'));
        detailsBtn.on('pointerdown', () => this._openDetailPanel(artifactData)); this.cardObjects.push(detailsBtn);
        const hitZone = this.add.zone(x, y, w, h).setOrigin(0, 0).setDepth(depth - 1).setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => {
            bg.clear(); bg.fillStyle(0x3d2510, 1); bg.fillRoundedRect(x, y, w, h, 10);
            bg.lineStyle(2, 0xffe080, 0.9); bg.strokeRoundedRect(x, y, w, h, 10);
        });
        hitZone.on('pointerout', () => {
            bg.clear(); bg.fillStyle(0x2c1a08, 1); bg.fillRoundedRect(x, y, w, h, 10);
            bg.lineStyle(2, 0xc8a84b, 0.7); bg.strokeRoundedRect(x, y, w, h, 10);
        });
        hitZone.on('pointerdown', () => this._openDetailPanel(artifactData)); this.cardObjects.push(hitZone);
    }
    _buildEmptyState(width, height) {
        this.cardObjects.push(this.add.text(width / 2, height / 2 - 60, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_6f0781f74be2221b8f0b"), { fontSize: '64px' }).setOrigin(0.5).setDepth(303).setAlpha(0.3));
        this.cardObjects.push(this.add.text(width / 2, height / 2 + 20, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_81188a19ba3de95f1c40"), {
            fontFamily: 'PressStart2P', fontSize: '14px', color: '#6e5a38'
        }).setOrigin(0.5).setDepth(303));
        this.cardObjects.push(this.add.text(width / 2, height / 2 + 56, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_9d95b9fa5cc73822595e"), {
            fontFamily: 'SpecialElite', fontSize: '18px', color: '#5a4a28'
        }).setOrigin(0.5).setDepth(303));
    }
    _buildPagination(width, height) {
        const totalPages = Math.ceil(this.artifacts.length / this.itemsPerPage);
        if (totalPages <= 1) return;
        const y = height - 56;
        const prevBtn = this.add.text(width / 2 - 80, y, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_cf8ba9e23746768d376a"), {
            fontFamily: 'PressStart2P', fontSize: '10px', color: this.currentPage === 0 ? '#4a3a1a' : '#c8a84b'
        }).setOrigin(0.5).setDepth(304).setInteractive({ useHandCursor: this.currentPage > 0 });
        if (this.currentPage > 0) {
            prevBtn.on('pointerover', () => prevBtn.setColor('#ffe080')); prevBtn.on('pointerout', () => prevBtn.setColor('#c8a84b'));
            prevBtn.on('pointerdown', () => this._changePage(-1, width, height));
        }
        const pageInfo = this.add.text(width / 2, y, `${this.currentPage + 1}${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_005e1574a2b5c8163046")}${totalPages}`, {
            fontFamily: 'SpecialElite', fontSize: '16px', color: '#a89060'
        }).setOrigin(0.5).setDepth(304);
        const nextBtn = this.add.text(width / 2 + 80, y, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_4066c847882348f43ddc"), {
            fontFamily: 'PressStart2P', fontSize: '10px', color: this.currentPage >= totalPages - 1 ? '#4a3a1a' : '#c8a84b'
        }).setOrigin(0.5).setDepth(304).setInteractive({ useHandCursor: this.currentPage < totalPages - 1 });
        if (this.currentPage < totalPages - 1) {
            nextBtn.on('pointerover', () => nextBtn.setColor('#ffe080')); nextBtn.on('pointerout', () => nextBtn.setColor('#c8a84b'));
            nextBtn.on('pointerdown', () => this._changePage(1, width, height));
        }
        this.paginationObjects = [prevBtn, pageInfo, nextBtn];
    }
    _changePage(delta, width, height) {
        if (this.closing || this.detailOpen || this.detailClosing) return;
        const totalPages = Math.max(1, Math.ceil(this.artifacts.length / this.itemsPerPage));
        const next = Math.max(0, Math.min(totalPages - 1, this.currentPage + delta));
        if (next === this.currentPage) return;
        this.currentPage = next; this._refreshGrid(width, height); playRecoveredArtifactsAudio(this, 'page');
    }
    _refreshGrid(width, height) {
        this.paginationObjects?.forEach(o => o.destroy()); this.paginationObjects = [];
        this._buildGrid(width, height); this._buildPagination(width, height);
    }
    _openDetailPanel(artifactData) {
        if (this.closing || !artifactData || (this.detailOpen && !this.detailClosing && this.detailArtifact === artifactData)) return;
        this._disposeDetailPanel(); this.detailOpen = true; this.detailArtifact = artifactData;
        const { width, height } = this.scale, pw = 680, ph = 420, px = (width - pw) / 2, py = (height - ph) / 2, depth = 400;
        const panel = this.add.container(0, 0).setDepth(depth); this.detailPanel = panel;
        const outsideZone = this.add.zone(0, 0, width, height).setOrigin(0, 0).setInteractive();
        outsideZone.on('pointerdown', pointer => {
            const inPanel = pointer.x >= px && pointer.x <= px + pw && pointer.y >= py && pointer.y <= py + ph;
            if (!inPanel) this._closeDetailPanel();
        }); panel.add(outsideZone);
        const panelBg = this.add.graphics(); panelBg.fillStyle(0x1a0e05, 0.97); panelBg.fillRoundedRect(px, py, pw, ph, 14);
        panelBg.lineStyle(3, 0xc8a84b, 1); panelBg.strokeRoundedRect(px, py, pw, ph, 14); panel.add(panelBg);
        panel.add(this.add.text(px + pw / 2, py + 28, artifactData.artifact || __dialogueText("scenes/RecoveredArtifactsScene.js", "t_b764cdc0eab713746721"), {
            fontFamily: 'PressStart2P', fontSize: '11px', color: '#c8a84b', align: 'center', wordWrap: { width: pw - 60 }
        }).setOrigin(0.5, 0));
        const divLine = this.add.graphics(); divLine.lineStyle(1, 0xc8a84b, 0.4); divLine.lineBetween(px + 30, py + 68, px + pw - 30, py + 68); panel.add(divLine);
        const locationStr = [artifactData.city, artifactData.country].filter(Boolean).join(', ');
        panel.add(this.add.text(px + 36, py + 80, `${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_0bcac6d63c2406e80cff")}${locationStr}`, { fontFamily: 'SpecialElite', fontSize: '15px', color: '#a89060' }));
        panel.add(this.add.text(px + 36, py + 108, artifactData.description || '', {
            fontFamily: 'SpecialElite', fontSize: '14px', color: '#d4c49a', wordWrap: { width: pw - 72 }, lineSpacing: 4
        }));
        if (artifactData.significance) {
            panel.add(this.add.text(px + 36, py + ph - 110, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_968c8c5d6c2bdf755926"), { fontFamily: 'PressStart2P', fontSize: '8px', color: '#c8a84b' }));
            panel.add(this.add.text(px + 36, py + ph - 90, artifactData.significance, {
                fontFamily: 'SpecialElite', fontSize: '13px', color: '#a89060', wordWrap: { width: pw - 72 }, lineSpacing: 3
            }));
        }
        if (artifactData.recoveredAt) {
            panel.add(this.add.text(px + pw - 36, py + ph - 28, `${__dialogueText("scenes/RecoveredArtifactsScene.js", "t_e7e60ab7c4c814141f6c")}${artifactData.recoveredAt}`, {
                fontFamily: 'SpecialElite', fontSize: '12px', color: '#6e5a38'
            }).setOrigin(1, 0.5));
        }
        const closeBtn = this.add.text(px + pw - 20, py + 16, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_be64f28a8d0a6257b2af"), { fontFamily: 'PressStart2P', fontSize: '12px', color: '#c8a84b' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6b6b')); closeBtn.on('pointerout', () => closeBtn.setColor('#c8a84b'));
        closeBtn.on('pointerdown', () => this._closeDetailPanel()); panel.add(closeBtn);
        panel.setAlpha(0); this.tweens.add({ targets: panel, alpha: 1, duration: 200, ease: 'Power2' });
        playRecoveredArtifactsAudio(this, 'paper');
    }
    _disposeDetailPanel() {
        const panel = this.detailPanel;
        if (panel) { this.tweens.killTweensOf(panel); panel.destroy(); }
        this.detailPanel = null; this.detailOpen = false; this.detailClosing = false; this.detailArtifact = null;
    }
    _closeDetailPanel() {
        if (this.closing || !this.detailPanel || this.detailClosing) return;
        const panel = this.detailPanel; this.detailClosing = true;
        this.tweens.killTweensOf(panel); playRecoveredArtifactsAudio(this, 'click');
        this.tweens.add({ targets: panel, alpha: 0, duration: 150, ease: 'Power2', onComplete: () => {
            panel.destroy();
            if (this.detailPanel === panel) { this.detailPanel = null; this.detailOpen = false; this.detailClosing = false; this.detailArtifact = null; }
        }});
    }
    _buildCloseButton(width) {
        const closeBtn = this.add.text(width - 52, 48, __dialogueText("scenes/RecoveredArtifactsScene.js", "t_368d075bc49762386ec9"), {
            fontFamily: 'PressStart2P', fontSize: '9px', color: '#c8a84b', backgroundColor: '#1a0e05', padding: { left: 8, right: 8, top: 6, bottom: 6 }
        }).setOrigin(0.5).setDepth(310).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ffe080')); closeBtn.on('pointerout', () => closeBtn.setColor('#c8a84b'));
        closeBtn.on('pointerdown', () => this.closeScene());
    }
    closeScene() {
        if (this.closing) return;
        this.closing = true; stopRecoveredArtifactsAudio(this); this._disposeDetailPanel();
        this.scene.stop('RecoveredArtifactsScene'); this.scene.resume('OfficeScene');
    }
    static addRecoveredArtifact(gameState, missionData) {
        if (!gameState.recoveredArtifacts) gameState.recoveredArtifacts = [];
        const already = gameState.recoveredArtifacts.some(a => a.missionId === missionData.id); if (already) return;
        const now = new Date(), dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        gameState.recoveredArtifacts.push({
            missionId: missionData.id, artifact: missionData.artifact, city: missionData.city, country: missionData.country,
            description: missionData.description, significance: missionData.significance, artifactKey: missionData.artifactKey, recoveredAt: dateStr
        });
    }
}
