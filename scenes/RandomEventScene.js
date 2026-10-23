import { BaseScene } from './BaseScene.js';

export class RandomEventScene extends BaseScene {
    create() {
        // super.create() celowo pominięte — nie chcemy pełnego HUD nad zdarzeniem
        const { event, gameState } = this.scene.settings.data;
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setInteractive();

        this.add.text(width / 2, height * 0.2, event.title, {
            fontFamily: 'PressStart2P', fontSize: '20px', color: '#ffcc00'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.4, event.text + '\n', {
            fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff',
            wordWrap: { width: width * 0.7 }, align: 'center'
        }).setOrigin(0.5);

        event.chooses.forEach((choice, i) => {
            const btn = this.add.text(width / 2, height * 0.6 + i * 48, choice.label, {
                fontFamily: 'PressStart2P', fontSize: '12px', color: '#00ffcc',
                backgroundColor: '#222222', padding: { x: 16, y: 10 }
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerover', () => btn.setColor('#ffffff'));
            btn.on('pointerout', () => btn.setColor('#00ffcc'));
            btn.on('pointerdown', () => {
                this.applyEffects(choice.effects, gameState);
                this.scene.resume(this.scene.manager.scenes.find(s => s !== this.scene && s.scene.isPaused())?.scene.key);
                this.scene.stop();
            });
        });
    }

    applyEffects(effects, gameState) {
        for (const fx of effects) {
            switch (fx.type) {
                case 'addMoney':
                    gameState.money = Math.max(0, gameState.money + fx.value);
                    break;
                case 'reputation':
                    gameState.reputation = (gameState.reputation ?? 50) + fx.value;
                    break;
                case 'energyMultiplier':
                    gameState.energyModifier = { multiplier: fx.value, untilHour: gameState.timeHours + (fx.durationHours ?? 0), untilCured: !!fx.untilCured };
                    break;
                case 'skipHours':
                    gameState.timeHours += fx.value;
                    break;
                case 'caseTip':
                    gameState.pendingCaseTip = true; // odbierz to w systemie wskazówek
                    break;
                case 'gameOver':
                    this.registry.set('gameOverReason', fx.reason);
                    this.scene.stop();
                    this.scene.start('GameOverScene'); // pokaż registry.get('gameOverReason')
                    return;
            }
        }
    }
}