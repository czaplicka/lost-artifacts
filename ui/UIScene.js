import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('cog', 'assets/cog.png');
        this.load.image('profile', 'assets/profile.png');
    }

    create() {
        // Ustawiamy base depth dla całej sceny UI
        const width = this.cameras.main.width;
        const paddingRight = 20;
        const paddingTop = 20;

        const hudWidth = 460;
        const hudHeight = 210;
        const hudX = width - paddingRight - hudWidth;
        const hudY = paddingTop;

        // --- ZEWNĘTRZNA RAMKA KONTENERU ---
        const outerFrame = this.add.graphics().setDepth(1);
        outerFrame.fillStyle(0x2b1e16, 1);
        outerFrame.fillRoundedRect(hudX - 4, hudY - 4, hudWidth + 8, hudHeight + 8, 12);
        outerFrame.fillStyle(0x4a3525, 1);
        outerFrame.fillRoundedRect(hudX, hudY, hudWidth, hudHeight, 8);
        outerFrame.lineStyle(3, 0x8c5e3c, 1);
        outerFrame.strokeRoundedRect(hudX + 2, hudY + 2, hudWidth - 4, hudHeight - 4, 6);

        // --- TŁO JASNE (Tylko dla górnej części: zegar i score) ---
        const topSectionHeight = 135;
        this.add.rectangle(hudX + 8, hudY + 8, hudWidth - 16, topSectionHeight, 0xf4eac1)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xbc986a)
            .setDepth(2);

        const textStyle = {
            fontFamily: 'PressStart2P',
            fill: '#2b1e16',
            shadow: { offsetX: 1, offsetY: 1, color: '#e0c9a6', blur: 0, fill: true }
        };

        // --- ZEGAR I TEKSTY ---
        const clockX = hudX + 68;
        const clockY = hudY + 75;
        const clockRadius = 38;

        const clockGraphics = this.add.graphics().setDepth(3);
        clockGraphics.fillStyle(0x8f5d26, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius + 4);
        clockGraphics.fillStyle(0xdda15e, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius + 2);
        clockGraphics.fillStyle(0xfffcf2, 1);
        clockGraphics.fillCircle(clockX, clockY, clockRadius);
        clockGraphics.lineStyle(3, 0x4a3525, 1);
        clockGraphics.strokeCircle(clockX, clockY, clockRadius);
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

        this.add.circle(clockX, clockY, 4, 0x4a3525).setDepth(5);

        this.hourHand = this.add.graphics().setDepth(4);
        this.minuteHand = this.add.graphics().setDepth(4);
        this.clockCenterPos = { x: clockX, y: clockY };

        this.dayText = this.add.text(clockX + 50, clockY - 30, 'DAY 1', {
            ...textStyle,
            fontSize: '15px',
            fill: '#a71c1c'
        }).setDepth(3);

        this.timeText = this.add.text(clockX + 50, clockY - 5, '08:00', {
            ...textStyle,
            fontSize: '17px',
            fill: '#1b4332'
        }).setDepth(3);

        this.partOfDayText = this.add.text(clockX + 50, clockY + 22, 'MORNING', {
            ...textStyle,
            fontSize: '10px',
            fill: '#7f5539'
        }).setDepth(3);

        // --- SCORE ---
        const scoreX = hudX + hudWidth - 116;
        const scoreY = hudY + 18;
        const scoreW = 96;
        const scoreH = 110;

        const scoreBox = this.add.graphics().setDepth(3);
        scoreBox.fillStyle(0x2b1e16, 1);
        scoreBox.fillRoundedRect(scoreX, scoreY, scoreW, scoreH, 6);
        scoreBox.fillStyle(0x3a2e2b, 1);
        scoreBox.fillRoundedRect(scoreX + 2, scoreY + 2, scoreW - 4, scoreH - 4, 4);

        this.add.text(scoreX + scoreW / 2, scoreY + 18, 'SCORE', {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            fill: '#e9d8a6'
        }).setOrigin(0.5).setDepth(4);

        this.scoreText = this.add.text(scoreX + scoreW / 2, scoreY + 58, `${gameState.score || 0}`, {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            fill: '#ee9b00',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
        }).setOrigin(0.5).setDepth(4);

        // --- IKONY W DOLNEJ CZĘŚCI (CIEMNE TŁO) ---
        const iconY = hudY + 172;
        const playerX = hudX + hudWidth - 85;
        const cogX = hudX + hudWidth - 35;
        const profileX = hudX + hudWidth - 135;

        // Kółka tła pod ikony
        this.add.circle(playerX, iconY, 22, 0x2b1e16).setStrokeStyle(2, 0x8c5e3c, 1).setDepth(3);
        this.add.circle(cogX, iconY, 22, 0x2b1e16).setStrokeStyle(2, 0x8c5e3c, 1).setDepth(3);
        this.add.circle(profileX, iconY, 22, 0x2b1e16).setStrokeStyle(2, 0x8c5e3c, 1).setDepth(3);

        // Ikona gracza (Profil)
        this.playerButton = this.add.image(playerX, iconY, 'player')
            .setOrigin(0.5)
            .setDisplaySize(36, 36)
            .setDepth(5)
            .setInteractive({ useHandCursor: true });

        // KLIKNIĘCIE W PLAYER: Wczytanie i wyświetlenie profile.html
        this.playerButton.on('pointerdown', async () => {
            await this.openProfileModal();
        });

        // Ikona zębatki (Settings)
        this.settingsButton = this.add.image(cogX, iconY, 'cog')
            .setOrigin(0.5)
            .setDisplaySize(32, 32)
            .setDepth(5)
            .setInteractive({ useHandCursor: true });

        this.settingsButton.on('pointerdown', () => {
            console.log('Kliknięto zębatkę!');
            if (!this.scene.isActive('SettingsScene')) {
                this.scene.launch('SettingsScene');
            }
            this.scene.bringToTop('SettingsScene');
        });

        // Ikona profile.png (Agent)
        this.profileButton = this.add.image(profileX, iconY, 'profile')
            .setOrigin(0.5)
            .setDisplaySize(36, 36)
            .setDepth(5)
            .setInteractive({ useHandCursor: true });

        // KLIKNIĘCIE W PROFILE: Wczytanie i wyświetlenie agent.html
        this.profileButton.on('pointerdown', async () => {
            await this.openAgentModal();
        });

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

    // --- METODA OBSŁUGUJĄCA OTWARCIE PROFILU ---
    async openProfileModal() {
        let modalContainer = document.getElementById('profile-modal');

        // Jeśli plik HTML nie jest jeszcze wstrzyknięty do DOM, pobieramy go dynamicznie
        if (!modalContainer) {
            try {
                const response = await fetch('profile.html');
                const htmlContent = await response.text();

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                document.body.appendChild(tempDiv.firstElementChild);

                modalContainer = document.getElementById('profile-modal');
                this.setupModalEvents(modalContainer, 'btn-close-profile');
            } catch (error) {
                console.error('Błąd podczas ładowania profile.html:', error);
                return;
            }
        }

        if (modalContainer) {
            modalContainer.style.display = 'flex';
        }
    }

    // --- METODA OBSŁUGUJĄCA OTWARCIE AGENTA ---
async openAgentModal() {
    let modalContainer = document.getElementById('agent-modal');

    if (!modalContainer) {
        try {
            const response = await fetch('agent.html');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            modalContainer = doc.getElementById('agent-modal');

            if (modalContainer) {
                document.body.appendChild(modalContainer);
                this.setupModalEvents(modalContainer, 'btn-close-agent');
            } else {
                console.error('Brak elementu #agent-modal w pliku agent.html');
                return;
            }
        } catch (error) {
            console.error('Błąd wczytywania agent.html:', error);
            return;
        }
    }

    if (modalContainer) {
        modalContainer.style.display = 'flex';
    }
}

    // Podpięcie eventów zamykania i akcji wewnątrz modala
    setupModalEvents(modalContainer, closeBtnId) {
        const closeBtn = document.getElementById(closeBtnId);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalContainer.style.display = 'none';
            });
        }

        modalContainer.addEventListener('click', (e) => {
            if (e.target.id === modalContainer.id) {
                modalContainer.style.display = 'none';
            }
        });
    }

    setClockHands(hour, minute) {
        const { x: clockX, y: clockY } = this.clockCenterPos;

        this.hourHand.clear();
        this.minuteHand.clear();

        const minuteAngle = ((minute / 60) * Math.PI * 2) - Math.PI / 2;
        const hourAngle = (((hour % 12) / 12) * Math.PI * 2) + ((minute / 60) * (Math.PI * 2 / 12)) - Math.PI / 2;

        this.hourHand.lineStyle(5, 0x2b1e16);
        this.hourHand.lineBetween(
            clockX, clockY,
            clockX + Math.cos(hourAngle) * 20,
            clockY + Math.sin(hourAngle) * 20
        );

        this.minuteHand.lineStyle(3, 0xae2012);
        this.minuteHand.lineBetween(
            clockX, clockY,
            clockX + Math.cos(minuteAngle) * 28,
            clockY + Math.sin(minuteAngle) * 28
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