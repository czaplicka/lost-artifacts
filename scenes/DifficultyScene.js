import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { setupNewGame } from '../gameSetup.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

export class DifficultyScene extends BaseScene {
    constructor() {
        super({ key: 'DifficultyScene' });
        this.authMode = 'guest'; this.playerId = null; this.playerEmail = null;
        this.displayName = __dialogueText("scenes/DifficultyScene.js", "t_5ed8944a85a9763fd315"); this.statusMessage = null; this.isStartingGame = false;
    }
    init(data = {}) {
        this.authMode = data.authMode ?? 'guest';
        this.playerId = data.playerId ?? null;
        this.playerEmail = data.playerEmail ?? null;
        this.displayName = data.displayName ?? __dialogueText("scenes/DifficultyScene.js", "t_5ed8944a85a9763fd315");
        this.isStartingGame = false;
    }
    preload() { preloadMenuActionAudio(this); }
    create() {
        super.create(); audioManager.init(this);
        this.scene.sleep('UIScene');
        const { width, height } = this.scale, centerX = width / 2;
        const bg = this.add.image(centerX, height / 2, 'archive');
        const scaleX = width / bg.width, scaleY = height / bg.height, scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);
        this.add.text(centerX, height * 0.12, __dialogueText("scenes/DifficultyScene.js", "t_897c3417811fe8b81cf5"), {
            fontFamily: 'SpecialElite, monospace', fontSize: '36px', color: '#f3c870', stroke: __dialogueText("scenes/DifficultyScene.js", "t_23761c2acfe2c2c7a3cc"), strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 3, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
        this.add.text(centerX, height * 0.18, __dialogueText("scenes/DifficultyScene.js", "t_b297c39fba51ea6a9707"), {
            fontFamily: 'SpecialElite, monospace', fontSize: '26px', color: '#e5d4a6', stroke: __dialogueText("scenes/DifficultyScene.js", "t_23761c2acfe2c2c7a3cc"), strokeThickness: 4,
            shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
        this.add.text(centerX, height * 0.23, __dialogueText("scenes/DifficultyScene.js", "t_d639b2477262180afe0e"), {
            fontFamily: 'SpecialElite, monospace', fontSize: '22px', color: '#c8b98e', stroke: __dialogueText("scenes/DifficultyScene.js", "t_23761c2acfe2c2c7a3cc"), strokeThickness: 3
        }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
        const btnRookie = this.add.image(centerX, height * 0.44, 'btnRookie').setOrigin(0.5).setInteractive({ useHandCursor: true });
        const btnOfficer = this.add.image(centerX, height * 0.64, 'btnOfficer').setOrigin(0.5).setInteractive({ useHandCursor: true });
        const btnCaptain = this.add.image(centerX, height * 0.84, 'btnCaptain').setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.addHoverEffect(btnRookie); this.addHoverEffect(btnOfficer); this.addHoverEffect(btnCaptain);
        btnRookie.on('pointerdown', () => { this.selectDifficulty('rookie'); });
        btnOfficer.on('pointerdown', () => { this.selectDifficulty('field'); });
        btnCaptain.on('pointerdown', () => { this.selectDifficulty('master'); });
        this.statusMessage = this.add.text(centerX, height * 0.30, '', {
            fontFamily: 'SpecialElite, monospace', fontSize: '17px', color: '#ff9d78', align: 'center', stroke: __dialogueText("scenes/DifficultyScene.js", "t_23761c2acfe2c2c7a3cc"), strokeThickness: 4,
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5).setDepth(300).setScrollFactor(0);
    }
    async selectDifficulty(difficulty) {
        if (this.isStartingGame) return;
        this.isStartingGame = true; this.input.enabled = false;
        playMenuActionAudio(this);
        this.registry.set('difficulty', difficulty);
        const suspectsData = this.cache.json.get('suspects') || [];
        const missionsData = this.cache.json.get('missions') || [];
        const locationsData = this.cache.json.get('locations') || [];
        try {
            await setupNewGame(suspectsData, missionsData, locationsData);
            gameState.difficulty = difficulty;
            this.registry.set('difficulty', difficulty); this.registry.set('gameState', gameState);
            this.registry.set('locationsData', structuredClone(locationsData));
            EventBus.emit('hideHUD'); this.goto('GameScene', { fromSave: false });
        } catch (error) {
            console.error('[DifficultyScene] Failed to prepare a new game:', error);
            this.isStartingGame = false; this.input.enabled = true;
            this.showMessage(__dialogueText("scenes/DifficultyScene.js", "t_281c40e6122fd724b5e2"));
        }
    }
    showMessage(message) {
        if (!this.statusMessage?.active) return;
        this.statusMessage.setText(message);
    }
    addHoverEffect(button, baseScale = 1, hoverScale = 1.05) {
        button.setScale(baseScale);
        button.on('pointerover', () => { button.setScale(hoverScale); });
        button.on('pointerout', () => { button.setScale(baseScale); });
        button.on('pointerdown', () => { button.setScale(baseScale * 0.96); });
        button.on('pointerup', () => { if (!this.isStartingGame) button.setScale(hoverScale); });
    }
}
