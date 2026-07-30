import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        this.scene.bringToTop();

        const width = this.cameras.main.width;
        const paddingRight = 20;
        const paddingTop = 20;

        // Główny panel HUD - stylizowany na retro organizer / biurko detektywa
        const hudWidth = 460;
        const hudHeight = 140;
        const hudX = width - paddingRight - hudWidth;
        const hudY = paddingTop;

        // --- 1. ZEWNĘTRZNA DREWNIANA RAMKA (STYL RETRO 90s) ---
        const outerFrame = this.add.graphics();
        // Zewnętrzny cień / krawędź 3D
        outerFrame.fillStyle(0x2b1e16, 1);
        outerFrame.fillRoundedRect(hudX - 4, hudY - 4, hudWidth + 8, hudHeight + 8, 12);
        // Ciemne drewno
        outerFrame.fillStyle(0x4a3525, 1);
        outerFrame.fillRoundedRect(hudX, hudY, hudWidth, hudHeight, 8);
        // Wewnętrzne ścięcie/złocenie (Bevel effect)
        outerFrame.lineStyle(3, 0x8c5e3c, 1);
        outerFrame.strokeRoundedRect(hudX + 2, hudY + 2, hudWidth - 4, hudHeight - 4, 6);

        // --- 2. TŁO KARTKI (POSTARZANY PAPIER / KARTOTEKA) ---
        const paperBg = this.add.rectangle(hudX + 10, hudY + 10, hudWidth - 20, hudHeight - 20, 0xf4eac1)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xbc986a);

        // --- 3. ZEGAR STYLIZOWANY NA MOSIĘŻNY POCKET WATCH ---
        const clockX = hudX + 75;
        const clockY = hudY + hudHeight / 2;
        const clockRadius = 48;

        const clockGraphics = this.add.graphics();
        // Obudowa zegarka (mosiądz/złoto)
        clockGraphics.fillStyle(0x8f5d26, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius + 5);
        clockGraphics.fillStyle(0xdda15e, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius + 3);

        // Tarcza
        clockGraphics.fillStyle(0xfffcf2, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius);
        clockGraphics.lineStyle(3, 0x4a3525, 1);
        clockGraphics.strokeCircle(clockX, clockY, clockRadius);

        // Podziałka godzinowa na tarczy zegara
        clockGraphics.lineStyle(2, 0x99582a, 1);
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 - Math.PI / 2;
            const r1 = clockRadius - (i % 3 === 0 ? 10 : 5);
            const r2 = clockRadius - 2;
            clockGraphics.lineBetween(
                clockX + Math.cos(angle) * r1,
                clockY + Math.sin(angle) * r1,
                clockX + Math.cos(angle) * r2,
                clockY + Math.sin(angle) * r2
            );
        }

        // Środek zegara
        this.add.circle(clockX, clockY, 4, 0x4a3525).setDepth(2);

        this.hourHand = this.add.graphics().setDepth(1);
        this.minuteHand = this.add.graphics().setDepth(1);
        this.clockCenterPos = { x: clockX, y: clockY };

        // --- 4. SEKCJA CZASU I DATY (TEKSTY) ---
        const textStyle = {
            fontFamily: 'PressStart2P',
            fill: '#2b1e16',
            shadow: { offsetX: 1, offsetY: 1, color: '#e0c9a6', blur: 0, fill: true }
        };

        this.dayText = this.add.text(hudX + 145, hudY + 25, 'DAY 1', {
            ...textStyle,
            fontSize: '22px',
            fill: '#a71c1c'
        });

        this.timeText = this.add.text(hudX + 145, hudY + 58, '08:00', {
            ...textStyle,
            fontSize: '24px',
            fill: '#1b4332' // Elegancka retro zieleń lub czarny
        });

        this.partOfDayText = this.add.text(hudX + 145, hudY + 92, 'MORNING', {
            ...textStyle,
            fontSize: '11px',
            fill: '#7f5539'
        });

        // --- 5. SEKCJA PUNKTÓW (RETRO LUB TABLICZKA DETEKTYWA) ---
        const scoreX = hudX + 310;
        const scoreY = hudY + 20;
        const scoreW = 130;
        const scoreH = 100;

        // Wcięta tabliczka na punkty
        const scoreBox = this.add.graphics();
        scoreBox.fillStyle(0x2b1e16, 1);
        scoreBox.fillRoundedRect(scoreX, scoreY, scoreW, scoreH, 6);
        scoreBox.fillStyle(0x3a2e2b, 1);
        scoreBox.fillRoundedRect(scoreX + 2, scoreY + 2, scoreW - 4, scoreH - 4, 4);

        this.add.text(scoreX + scoreW / 2, scoreY + 18, 'SCORE', {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            fill: '#e9d8a6'
        }).setOrigin(0.5);

        // Licznik punktów stylizowany na zielone/żółte retro cyfry
        this.scoreText = this.add.text(scoreX + scoreW / 2, scoreY + 55, `${gameState.score || 0}`, {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            fill: '#ee9b00',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
        }).setOrigin(0.5);

        // --- INICJALIZACJA I ZDARZENIA ---
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
        const { x: clockX, y: clockY } = this.clockCenterPos;

        this.hourHand.clear();
        this.minuteHand.clear();

        const minuteAngle = ((minute / 60) * Math.PI * 2) - Math.PI / 2;
        const hourAngle = (((hour % 12) / 12) * Math.PI * 2) + ((minute / 60) * (Math.PI * 2 / 12)) - Math.PI / 2;

        // Wskazówka godzinowa (grubsza, ciemna)
        this.hourHand.lineStyle(5, 0x2b1e16);
        this.hourHand.lineBetween(
            clockX, clockY,
            clockX + Math.cos(hourAngle) * 24,
            clockY + Math.sin(hourAngle) * 24
        );

        // Wskazówka minutowa (węższa, czerwony akcent lat 90.)
        this.minuteHand.lineStyle(3, 0xae2012);
        this.minuteHand.lineBetween(
            clockX, clockY,
            clockX + Math.cos(minuteAngle) * 35,
            clockY + Math.sin(minuteAngle) * 35
        );
    }

    updateHUD(timeData) {
        const h = timeData.hour.toString().padStart(2, '0');
        const m = timeData.minute.toString().padStart(2, '0');

        this.dayText.setText(`DAY ${timeData.day}`);
        this.timeText.setText(`${h}:${m}`);
        this.partOfDayText.setText(timeData.partOfDay.toUpperCase());

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