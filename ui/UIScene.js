import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        this.scene.bringToTop();
        
        const width = this.cameras.main.width;
        const paddingRight = 40;
        const paddingTop = 40;
        
        const boxWidth = 320;
        const boxHeight = 160;
        const boxX = width - paddingRight - boxWidth;
        const boxY = paddingTop;

        this.calendarBg = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0xf4ecd8, 1.0)
            .setOrigin(0, 0);

        this.calendarBg.setStrokeStyle(4, 0x4a3728);

        this.innerFrame = this.add.graphics();
        this.innerFrame.lineStyle(2, 0xd4a373, 1);
        this.innerFrame.strokeRect(boxX + 4, boxY + 4, boxWidth - 8, boxHeight - 8);

        this.add.rectangle(boxX + 4, boxY + 4, boxWidth - 8, 8, 0xae2012).setOrigin(0, 0);

        const clockX = boxX + 65;
        const clockY = boxY + boxHeight / 2 + 5;
        const clockRadius = 45;

        this.clockGroup = this.add.group();

        const clockFace = this.add.circle(clockX, clockY, clockRadius, 0xffffff)
            .setStrokeStyle(3, 0x4a3728);
        
        const clockCenter = this.add.circle(clockX, clockY, 4, 0x4a3728);

        this.hourHand = this.add.graphics();
        this.minuteHand = this.add.graphics();

        const textStyle = {
            fontFamily: 'PressStart2P',
            fill: '#4a3728',
            shadow: { offsetX: 1, offsetY: 1, color: '#d4a373', blur: 0, fill: true }
        };

        this.dayText = this.add.text(boxX + 135, boxY + 30, 'DAY 1', {
            ...textStyle,
            fontSize: '28px',
            fill: '#ae2012'
        }).setOrigin(0, 0);

        this.timeText = this.add.text(boxX + 135, boxY + 75, '08:00', {
            ...textStyle,
            fontSize: '20px'
        }).setOrigin(0, 0);

        this.partOfDayText = this.add.text(boxX + 135, boxY + 110, 'Morning', {
            ...textStyle,
            fontSize: '14px',
            fill: '#7f5539'
        }).setOrigin(0, 0);

        const scoreBoxWidth = 260;
        const scoreBoxHeight = 100;
        const scoreBoxX = boxX - scoreBoxWidth - 20;
        const scoreBoxY = boxY;

        this.scoreBg = this.add.rectangle(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 0xf4ecd8, 1.0)
            .setOrigin(0, 0)
            .setStrokeStyle(4, 0x4a3728);

        this.scoreInnerFrame = this.add.graphics();
        this.scoreInnerFrame.lineStyle(2, 0xd4a373, 1);
        this.scoreInnerFrame.strokeRect(scoreBoxX + 4, scoreBoxY + 4, scoreBoxWidth - 8, scoreBoxHeight - 8);

        this.add.rectangle(scoreBoxX + 4, scoreBoxY + 4, scoreBoxWidth - 8, 8, 0xae2012).setOrigin(0, 0);

        this.scoreLabel = this.add.text(scoreBoxX + 20, scoreBoxY + 20, 'SCORE', {
            ...textStyle,
            fontSize: '18px',
            fill: '#ae2012'
        }).setOrigin(0, 0);

        this.scoreText = this.add.text(scoreBoxX + 20, scoreBoxY + 52, `${gameState.score || 0}`, {
            ...textStyle,
            fontSize: '24px',
            fill: '#4a3728'
        }).setOrigin(0, 0);

        this.setClockHands(8, 0);
        this.updateScore({ total: gameState.score || 0 });

        EventBus.on('timeChanged', this.updateHUD, this);
        EventBus.on('scoreChanged', this.updateScore, this);
        EventBus.on('gameOver', this.showGameOver, this);

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('timeChanged', this.updateHUD, this);
            EventBus.off('scoreChanged', this.updateScore, this);
            EventBus.off('gameOver', this.showGameOver, this);
        });
    }

    setClockHands(hour, minute) {
        const clockX = this.dayText.x - 70;
        const clockY = this.calendarBg.y + (this.calendarBg.height / 2) + 5;

        this.hourHand.clear();
        this.minuteHand.clear();

        const minuteAngle = ((minute / 60) * Math.PI * 2) - Math.PI / 2;
        const hourAngle = (((hour % 12) / 12) * Math.PI * 2) + ((minute / 60) * (Math.PI * 2 / 12)) - Math.PI / 2;

        this.hourHand.lineStyle(4, 0x4a3728);
        this.hourHand.lineBetween(
            clockX, clockY, 
            clockX + Math.cos(hourAngle) * 25, 
            clockY + Math.sin(hourAngle) * 25
        );

        this.minuteHand.lineStyle(2, 0xae2012);
        this.minuteHand.lineBetween(
            clockX, clockY, 
            clockX + Math.cos(minuteAngle) * 36, 
            clockY + Math.sin(minuteAngle) * 36
        );
    }

    updateHUD(timeData) {
        const h = timeData.hour.toString().padStart(2, '0');
        const m = timeData.minute.toString().padStart(2, '0');

        this.dayText.setText(`DAY ${timeData.day}`);
        this.timeText.setText(`${h}:${m}`);
        this.partOfDayText.setText(timeData.partOfDay);

        this.setClockHands(timeData.hour, timeData.minute);
    }

    updateScore(scoreData) {
        const total =
            typeof scoreData === 'number'
                ? scoreData
                : scoreData?.total ?? gameState.score ?? 0;

        if (this.scoreText) {
            this.scoreText.setText(`${Math.max(0, total)}`);
        }
    }

    showGameOver(reason) {
        this.scene.stop();
        this.scene.start('GameOverScene', { reason: reason });
    }
}