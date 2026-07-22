import { ensureHud } from './hudHelpers.js';

export class TravelTransitionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TravelTransitionScene' });
        this.transitionData = {};
        this.canContinue = false;
        this.isLeaving = false;
        this.continueHint = null;
    }

    init(data) {
        this.transitionData = data || {};
        this.canContinue = false;
        this.isLeaving = false;
    }

    create() {
        this.scene.sleep('UIScene');

        const { width, height } = this.scale;
        const camera = this.cameras.main;

        const {
            fromCity = 'Unknown',
            toCity = 'Unknown',
            toCityId = null,
            cityId = null,
            travelHours = 0,
            status = 'CONTINUE'
        } = this.transitionData;

        ensureHud(this);

        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }

        camera.fadeIn(400, 0, 0, 0);

        this.add.rectangle(width / 2, height / 2, width, height, 0x07111a, 1);

        this.add.text(width / 2, 90, 'TRAVEL LOG', {
            fontFamily: 'PressStart2P',
            fontSize: '28px',
            color: '#f4e7c1'
        }).setOrigin(0.5);

        this.add.text(width / 2, 170, `${fromCity} → ${toCity}`, {
            fontFamily: 'Special Elite',
            fontSize: '34px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(width / 2, 225, `Travel time: +${travelHours}h`, {
            fontFamily: 'Special Elite',
            fontSize: '28px',
            color: '#ffd166'
        }).setOrigin(0.5);

        this.add.text(width / 2, 285, 'Following the trail...', {
            fontFamily: 'Special Elite',
            fontSize: '30px',
            color: '#d6e4f0'
        }).setOrigin(0.5);

        const detailText = this.getDetailText(status);

        this.add.text(width / 2, 355, detailText, {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#d9d9d9',
            align: 'center',
            wordWrap: { width: Math.min(760, width * 0.7) }
        }).setOrigin(0.5);

        this.drawTravelLine(width, height);

        this.continueHint = this.add.text(width / 2, height - 70, 'Please wait...', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#9aa6b2'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.continueHint,
            alpha: { from: 0.35, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1
        });

        this.time.delayedCall(2600, () => {
            if (this.isLeaving || !this.continueHint) return;

            this.canContinue = true;
            this.continueHint.setText('Click to continue');
            this.continueHint.setColor('#f4e7c1');
        });

        this.input.once('pointerdown', () => {
            if (!this.canContinue || this.isLeaving) return;
            this.leaveScene();
        });

        this.time.delayedCall(4500, () => {
            if (this.isLeaving) return;
            this.leaveScene();
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.removeAllListeners();
        });
    }

    leaveScene() {
        if (this.isLeaving) return;
        this.isLeaving = true;

        const { status, cityId, toCityId } = this.transitionData;
        const targetCityId = cityId || toCityId || null;

        const camera = this.cameras.main;

        camera.fadeOut(450, 0, 0, 0);

        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            console.log('TravelTransition ->', {
                destinationScene: 'CityScene',
                targetCityId,
                transitionData: this.transitionData
            });

            if (!targetCityId) {
                console.error('TravelTransitionScene: missing target city id', this.transitionData);
                this.scene.start('MenuScene');
                return;
            }

            this.scene.start('CityScene', {
                cityId: targetCityId,
                investigationStatus: status,
                isFinalShowdown: status === 'FINAL_SHOWDOWN'
            });
        });
    }

    drawTravelLine(width, height) {
        const graphics = this.add.graphics();

        graphics.lineStyle(4, 0xd9c27a, 0.9);
        graphics.beginPath();
        graphics.moveTo(width * 0.22, height * 0.62);
        graphics.lineTo(width * 0.78, height * 0.62);
        graphics.strokePath();

        this.add.circle(width * 0.22, height * 0.62, 10, 0xffffff, 1);
        this.add.circle(width * 0.78, height * 0.62, 10, 0xd9c27a, 1);

        const plane = this.add.text(width * 0.5, height * 0.62 - 18, '✈', {
            fontFamily: 'Special Elite',
            fontSize: '32px',
            color: '#f4e7c1'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: plane,
            x: width * 0.78,
            duration: 1800,
            ease: 'Sine.easeInOut'
        });
    }

getDetailText(status) {
    switch (status) {
        case 'FINAL_SHOWDOWN':
            return 'The case is tightening around a single name. One decision now will settle everything.';
        case 'FALSE_LEAD':
            return 'Not every road rewards the chase. Sometimes the silence says more than the witnesses do.';
        case 'CRIME_SCENE_REACHED':
        case 'CONTINUE':
        default:
            return 'Another stop, another layer of the story, another chance to read the room correctly.';
    }
}
}