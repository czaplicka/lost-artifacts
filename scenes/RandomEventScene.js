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
            this.title.setText('UNDER THE WEATHER');
            this.body.setText('Your immune system has requested a transfer.\nYou feel like a suspect’s alibi: weak, shaky and unlikely to survive questioning.');
            this.addChoice(`Work: energy costs ×${cfg.illness.workEnergyMultiplier} for ${cfg.illness.workDurationHours} hours.`, () => this.choose('work'));
            this.addChoice(`Rest ${cfg.illness.restHours}h: full energy, then energy costs ×${cfg.illness.recoveryEnergyMultiplier} for ${cfg.illness.recoveryDurationHours}h. The case clock keeps running.`, () => this.choose('rest'));
        } else {
            this.title.setText('ANONYMOUS LETTER');
            if (this.confirming) {
                this.body.setText(`Accept $${cfg.bribe.amount} and close the case?\nThis ends the investigation as a FAILURE, brings a reprimand and reduces integrity.`);
                this.addChoice('Cancel. Keep investigating.', () => { this.confirming = false; this.render(); });
                this.addChoice(`Confirm: accept $${cfg.bribe.amount} and lose the case.`, () => this.choose('accept'));
            } else {
                this.body.setText(`"Close the case. Receive $${cfg.bribe.amount}. Nobody needs to know."\nThe envelope smells of expensive cologne and inexpensive ethics.`);
                this.addChoice('Refuse. Continue investigating.', () => this.choose('refuse'));
                this.addChoice(`Consider the $${cfg.bribe.amount} offer…`, () => { this.confirming = true; this.render(); });
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
            this.status.setText('The paperwork jammed. Check the console.');
        } finally { this.busy = false; }
    }

    async openGameOver() {
        this.clearButtons();
        this.navigationFailed = false;
        const moved = await this.goto('GameOverScene', this.gameOverData);
        if (!moved && this.sys.isActive()) {
            this.navigationFailed = true;
            this.status.setText('Could not open the case report. Retry without accepting the payment again.');
            this.addChoice('Open case report', () => { void this.openGameOver(); });
        }
    }

    update() {
        if (this.busy || this.navigationFailed || this.gameOverData) return;
        if (!RandomEventSystem.current(this.pendingId, this.caseKey)) this.returnToMap();
    }
}