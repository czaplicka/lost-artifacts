import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';
import { RandomEventSystem } from '../systems/RandomEventSystem.js';

export class RandomEventScene extends BaseScene {
    constructor() { super({ key: 'RandomEventScene' }); }

    init(data = {}) {
        this.pendingId = data.pendingId;
        this.caseKey = data.caseKey;
        this.pausedKeys = [...(data.paused || [])];
        this.sourceScene = data.sourceScene;
        this.sourceState = gameState.state;
        this.buttons = [];
        this.busy = false;
        this.confirming = false;
        this.navigationFailed = false;
        this.gameOverData = null;
    }

    create() {
        super.create();
        this.scene.setVisible(true);
        this.scene.bringToTop();
        this.cameras.main.resetFX();
        this.cameras.main.setAlpha(1);
        this.input.setTopOnly(true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.restorePaused, this);

        const { width: w, height: h } = this.scale;
        this.w = w;
        this.h = h;
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.88).setInteractive();
        this.add.rectangle(w / 2, h / 2, w * .82, h * .8, 0x302016)
            .setStrokeStyle(4, 0xcda46a);
        this.title = this.add.text(w / 2, h * .2, '', {
            fontFamily: 'PressStart2P', fontSize: `${Math.max(16, Math.round(w * .014))}px`,
            color: '#f3cc80', align: 'center', wordWrap: { width: w * .7 }
        }).setOrigin(.5);
        this.body = this.add.text(w / 2, h * .37, '', {
            fontFamily: 'SpecialElite', fontSize: `${Math.max(18, Math.round(w * .016))}px`,
            color: '#f6ead0', align: 'center', wordWrap: { width: w * .68 }, lineSpacing: 8
        }).setOrigin(.5);
        this.status = this.add.text(w / 2, h * .83, '', {
            fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffc680',
            align: 'center', wordWrap: { width: w * .68 }
        }).setOrigin(.5);
        this.render();
    }

    restorePaused() {
        const keys = this.pausedKeys || [];
        this.pausedKeys = [];
        if (gameState.state !== this.sourceState) return;
        for (const key of keys) {
            if (this.scene.manager.keys[key] && this.scene.isPaused(key)) this.scene.resume(key);
        }
    }

    returnToMap() {
        this.restorePaused();
        const clock = getCaseClockStatus(gameState);
        const mayReturn = gameState.state === this.sourceState && gameState.isGameActive &&
            !gameState.caseFailed && !gameState.caseResolved &&
            !clock.totalExpired && !clock.crimeExpired && !this.game.__baseSceneLeakTestRunning;
        const key = this.sourceScene;
        if (mayReturn && ['CityScene', 'CrimeCityScene'].includes(key)) {
            const source = this.scene.manager.keys[key];
            if (source) {
                if (source.sys.isPaused()) this.game.scene.resume(key);
                else if (source.sys.isSleeping()) this.game.scene.wake(key);
                else if (!source.sys.isActive()) {
                    // resume() nie uruchamia sceny, która została zatrzymana.
                    this.game.scene.start(key, {
                        cityId: gameState.currentCityId || gameState.crimeCityId,
                        fromRandomEvent: true
                    });
                }
                this.game.scene.bringToTop(key);
                for (const hud of ['UIScene', 'PlayerHudScene', 'NewsHud']) {
                    if (this.game.scene.isActive(hud)) this.game.scene.bringToTop(hud);
                }
            }
        }
        this.scene.stop();
    }

    clearButtons() {
        this.buttons.forEach(button => button.destroy());
        this.buttons = [];
    }

    addChoice(label, action) {
        const index = this.buttons.length;
        const button = this.add.text(this.w / 2, this.h * (.59 + index * .115), label, {
            fontFamily: 'SpecialElite', fontSize: `${Math.max(18, Math.round(this.w * .014))}px`,
            color: '#fff0d5', backgroundColor: '#493224', align: 'center',
            wordWrap: { width: this.w * .65 }, padding: { x: 22, y: 14 }
        }).setOrigin(.5).setInteractive({ useHandCursor: true });
        button.on('pointerover', () => button.setColor('#f3cc80'));
        button.on('pointerout', () => button.setColor('#fff0d5'));
        button.on('pointerdown', () => { if (!this.busy) action(); });
        this.buttons.push(button);
    }

    render() {
        const pending = RandomEventSystem.current(this.pendingId, this.caseKey);
        if (!pending) { this.returnToMap(); return; }
        this.clearButtons();
        const cfg = getDifficultyConfig(gameState.difficulty).randomEvents;
        if (pending.type === 'illness') {
            this.title.setText(__dialogueText("scenes/RandomEventScene.js", "t_6d5667d223535c0c6f27"));
            this.body.setText(__dialogueText("scenes/RandomEventScene.js", "t_53b740eb045eabebe718"));
            this.addChoice(`${__dialogueText("scenes/RandomEventScene.js", "t_f386f79eeea745201e9b")}${cfg.illness.workEnergyMultiplier}${__dialogueText("scenes/RandomEventScene.js", "t_ccb2f8fb3cff62792429")}${cfg.illness.workDurationHours}${__dialogueText("scenes/RandomEventScene.js", "t_2a72224e91dbc06381bd")}`, () => this.choose('work'));
            this.addChoice(`${__dialogueText("scenes/RandomEventScene.js", "t_3d839ad739a728da1be3")}${cfg.illness.restHours}${__dialogueText("scenes/RandomEventScene.js", "t_8de03ea7de573c28de39")}${cfg.illness.recoveryEnergyMultiplier}${__dialogueText("scenes/RandomEventScene.js", "t_ccb2f8fb3cff62792429")}${cfg.illness.recoveryDurationHours}${__dialogueText("scenes/RandomEventScene.js", "t_4cf29e2851a432550f76")}`, () => this.choose('rest'));
        } else {
            this.title.setText(__dialogueText("scenes/RandomEventScene.js", "t_161d3b80dde3f5818f03"));
            if (this.confirming) {
                this.body.setText(`${__dialogueText("scenes/RandomEventScene.js", "t_4dffe50c3fc06416eed7")}${cfg.bribe.amount}${__dialogueText("scenes/RandomEventScene.js", "t_69582034a7c73be5e3a7")}`);
                this.addChoice(__dialogueText("scenes/RandomEventScene.js", "t_c6792e640e9d8307de1f"), () => { this.confirming = false; this.render(); });
                this.addChoice(`${__dialogueText("scenes/RandomEventScene.js", "t_a140dc088d46127c0200")}${cfg.bribe.amount}${__dialogueText("scenes/RandomEventScene.js", "t_1c8dc00a6a5af942e3f9")}`, () => this.choose('accept'));
            } else {
                this.body.setText(`${__dialogueText("scenes/RandomEventScene.js", "t_f911b7b0cf2b3cce5148")}${cfg.bribe.amount}${__dialogueText("scenes/RandomEventScene.js", "t_f9c4c74bd877ae51a015")}`);
                this.addChoice(__dialogueText("scenes/RandomEventScene.js", "t_fe2b935d1df98d057a3c"), () => this.choose('refuse'));
                this.addChoice(`${__dialogueText("scenes/RandomEventScene.js", "t_588bc2b416429a131090")}${cfg.bribe.amount}${__dialogueText("scenes/RandomEventScene.js", "t_1da34c5b9c54927be682")}`, () => { this.confirming = true; this.render(); });
            }
        }
    }

    async choose(choice) {
        this.busy = true;
        try {
            const result = RandomEventSystem.choose(this.pendingId, this.caseKey, choice);
            if (!result.ok || !result.gameOver) { this.returnToMap(); return; }
            this.gameOverData = result.gameOver;
            await this.openGameOver();
        } catch (error) {
            console.error('[RandomEventScene] Choice failed.', error);
            this.status.setText(__dialogueText("scenes/RandomEventScene.js", "t_6a97ac970b5362ab88e4"));
        } finally { this.busy = false; }
    }

    async openGameOver() {
        this.clearButtons();
        this.navigationFailed = false;
        const moved = await this.goto('GameOverScene', this.gameOverData);
        if (!moved && this.sys.isActive()) {
            this.navigationFailed = true;
            this.status.setText(__dialogueText("scenes/RandomEventScene.js", "t_ce2fb60a5dcab937aa7a"));
            this.addChoice(__dialogueText("scenes/RandomEventScene.js", "t_3876261e191f1b9b69aa"), () => { void this.openGameOver(); });
        }
    }

    update() {
        if (this.busy || this.navigationFailed || this.gameOverData) return;
        if (!RandomEventSystem.current(this.pendingId, this.caseKey)) this.returnToMap();
    }
}