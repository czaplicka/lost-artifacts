import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { BaseScene } from '../scenes/BaseScene.js';
import {
    getAchievementList,
    hasAchievement
} from '../AchievementManager.js';

export class UIScene extends BaseScene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('cog', 'assets/cog.png');
        this.load.image('profile', 'assets/profile.png');
    }

    create() {
        super.create();
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
EventBus.on('agentStatsChanged', this.refreshOpenAgentModal, this);
EventBus.on('gameOver', this.showGameOver, this);

this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    EventBus.off('timeChanged', this.updateHUD, this);
    EventBus.off('scoreChanged', this.updateScore, this);
    EventBus.off('agentStatsChanged', this.refreshOpenAgentModal, this);
    EventBus.off('gameOver', this.showGameOver, this);
});
    }

    // --- METODA OBSŁUGUJĄCA OTWARCIE PROFILU ---
    async openProfileModal() {
  let modalContainer = document.getElementById('profile-modal');

  if (!modalContainer) {
    try {
      const response = await fetch('profile.html');

      if (!response.ok) {
        throw new Error(
          `Could not load profile.html: HTTP ${response.status}`
        );
      }

      const htmlText = await response.text();

      const parser = new DOMParser();

      const documentFragment = parser.parseFromString(
        htmlText,
        'text/html'
      );

      modalContainer = documentFragment.getElementById(
        'profile-modal'
      );

      if (!modalContainer) {
        throw new Error(
          'profile.html does not contain an element with id="profile-modal".'
        );
      }

      document.body.appendChild(modalContainer);

      this.setupModalEvents(
        modalContainer,
        'btn-close-profile'
      );
    } catch (error) {
      console.error(
        '[UIScene] Failed to load profile.html:',
        error
      );

      return;
    }
  }

this.populateProfileModal(modalContainer);

modalContainer.style.display = 'flex';
}

    // --- METODA OBSŁUGUJĄCA OTWARCIE AGENTA ---
async openAgentModal() {
    let modalContainer = document.getElementById('agent-modal');

    if (!(modalContainer instanceof HTMLElement)) {
        try {
            const response = await fetch('agent.html', {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(
                    `Could not load agent.html: HTTP ${response.status}`
                );
            }

            const htmlText = await response.text();
            const parser = new DOMParser();
            const documentFragment = parser.parseFromString(
                htmlText,
                'text/html'
            );

            modalContainer = documentFragment.getElementById('agent-modal');

            if (!(modalContainer instanceof HTMLElement)) {
                throw new Error(
                    'agent.html does not contain an element with id="agent-modal".'
                );
            }

            document.body.appendChild(modalContainer);

            this.setupModalEvents(
                modalContainer,
                'btn-close-agent'
            );

            this.setupAgentModalActions(modalContainer);
        } catch (error) {
            console.error(
                '[UIScene] Failed to load agent.html:',
                error
            );

            return;
        }
    }

    this.populateAgentModal(modalContainer);
    modalContainer.style.display = 'flex';
}
renderAchievements(modalContainer) {
    if (!(modalContainer instanceof HTMLElement)) {
        return;
    }

    const achievementGrid = modalContainer.querySelector(
        '#achievement-grid'
    );

    if (!(achievementGrid instanceof HTMLElement)) {
        return;
    }

    const visibleSlots = 4;

    const unlockedAchievements = getAchievementList()
        .filter((achievement) => hasAchievement(achievement.id));

    const lockedAchievements = getAchievementList()
        .filter((achievement) => !hasAchievement(achievement.id));

    const visibleAchievements = [
        ...unlockedAchievements,
        ...lockedAchievements
    ].slice(0, visibleSlots);

    achievementGrid.replaceChildren();

    for (const achievement of visibleAchievements) {
        const unlocked = hasAchievement(achievement.id);

        const item = document.createElement('div');
        item.className = unlocked
            ? 'achievement-item'
            : 'achievement-item locked';

        item.title = unlocked
            ? achievement.description
            : 'Achievement locked';

        const icon = document.createElement('span');
        icon.className = 'achievement-icon';
        icon.textContent = unlocked ? achievement.icon : '🔒';

        const title = document.createElement('span');
        title.className = 'achievement-title';
        title.textContent = unlocked
            ? achievement.title
            : 'CLASSIFIED';

        item.append(icon, title);
        achievementGrid.appendChild(item);
    }

    while (achievementGrid.children.length < visibleSlots) {
        const emptySlot = document.createElement('div');

        emptySlot.className = 'achievement-item locked';
        emptySlot.title = 'Achievement locked';

        const icon = document.createElement('span');
        icon.className = 'achievement-icon';
        icon.textContent = '🔒';

        const title = document.createElement('span');
        title.className = 'achievement-title';
        title.textContent = 'CLASSIFIED';

        emptySlot.append(icon, title);
        achievementGrid.appendChild(emptySlot);
    }
}
updateProfileDifficulty(modalContainer) {
    if (!(modalContainer instanceof HTMLElement)) {
        return;
    }

    const difficultyLabels = {
        rookie: {
            label: 'ROOKIE DETECTIVE',
            description: 'Extra guidance. More retries. Less paperwork.',
        },
        field: {
            label: 'FIELD AGENT',
            description: 'Standard Mark Agency field procedure.',
        },
        master: {
            label: 'MASTER SLEUTH',
            description: 'Fewer second chances. Better coffee not guaranteed.',
        },
    };

    const difficulty = this.registry.get('difficulty')
        || gameState.difficulty
        || 'field';

    const selectedDifficulty = difficultyLabels[difficulty]
        || difficultyLabels.field;

    const difficultyElement = modalContainer.querySelector(
        '#profile-difficulty',
    );

    const descriptionElement = modalContainer.querySelector(
        '#profile-difficulty-description',
    );

    if (difficultyElement) {
        difficultyElement.textContent = selectedDifficulty.label;
    }

    if (descriptionElement) {
        descriptionElement.textContent = selectedDifficulty.description;
    }
}
populateProfileModal(modalContainer) {
    if (!(modalContainer instanceof HTMLElement)) {
        return;
    }

    const aliasElement = modalContainer.querySelector(
        '#profile-alias',
    );

    const rankElement = modalContainer.querySelector(
        '#profile-rank',
    );

    const pointsElement = modalContainer.querySelector(
        '#profile-points',
    );

    const playerName = typeof gameState.playerName === 'string'
        && gameState.playerName.trim()
        ? gameState.playerName.trim()
        : 'Detective';

    const playerRank = typeof gameState.playerRank === 'string'
        && gameState.playerRank.trim()
        ? gameState.playerRank.trim()
        : 'Junior Agent';

    const score = Number.isFinite(gameState.score)
        ? Math.max(0, Math.floor(gameState.score))
        : 0;

    if (aliasElement) {
        aliasElement.textContent = playerName;
    }

    if (rankElement) {
        rankElement.textContent = playerRank;
    }

    if (pointsElement) {
        pointsElement.textContent = score.toLocaleString('en-US');
    }

    this.updateProfileDifficulty(modalContainer);
}

setupAgentModalActions(modalContainer) {
    if (!(modalContainer instanceof HTMLElement)) {
        return;
    }

    if (modalContainer.dataset.agentActionsBound === 'true') {
        return;
    }

    const copyButton = modalContainer.querySelector('#btn-copy-link');
    const toast = modalContainer.querySelector('#toast');

    if (copyButton instanceof HTMLButtonElement && toast instanceof HTMLElement) {
        copyButton.addEventListener('click', async () => {
            try {
                const dossierUrl = new URL(window.location.href);

                dossierUrl.searchParams.set(
                    'agent',
                    gameState.playerName ||
                    gameState.agentName ||
                    'detective'
                );

                await navigator.clipboard.writeText(dossierUrl.toString());

                toast.style.display = 'block';

                window.setTimeout(() => {
                    toast.style.display = 'none';
                }, 2500);
            } catch (error) {
                console.error(
                    '[UIScene] Could not copy dossier link:',
                    error
                );
            }
        });
    }

    modalContainer.dataset.agentActionsBound = 'true';
}

refreshOpenAgentModal() {
    const modalContainer = document.getElementById('agent-modal');

    if (
        modalContainer instanceof HTMLElement &&
        modalContainer.style.display !== 'none'
    ) {
        this.populateAgentModal(modalContainer);
    }
}
    // Podpięcie eventów zamykania i akcji wewnątrz modala
    setupModalEvents(modalContainer, closeBtnId) {
    if (!(modalContainer instanceof HTMLElement)) {
        console.error(
            '[UIScene] Cannot bind modal events: modal container is invalid.',
            {
                modalContainer,
                closeBtnId
            }
        );

        return;
    }

    if (modalContainer.dataset.eventsBound === 'true') {
        return;
    }

    const closeBtn = modalContainer.querySelector(`#${closeBtnId}`);

    if (!closeBtn) {
        console.warn(
            `[UIScene] Modal "${modalContainer.id}" has no close button "#${closeBtnId}".`
        );
    } else {
        closeBtn.addEventListener('click', () => {
            modalContainer.style.display = 'none';
        });
    }

    modalContainer.addEventListener('click', (event) => {
        if (event.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });

    modalContainer.dataset.eventsBound = 'true';
}
populateProfileModal(modalContainer) {
  if (!(modalContainer instanceof HTMLElement)) {
    return;
  }

  const aliasElement = modalContainer.querySelector(
    '#profile-alias'
  );

  const rankElement = modalContainer.querySelector(
    '#profile-rank'
  );

  const pointsElement = modalContainer.querySelector(
    '#profile-points'
  );

  const playerName = typeof gameState.playerName === 'string' &&
    gameState.playerName.trim()
    ? gameState.playerName.trim()
    : 'Detective';

  const playerRank = typeof gameState.playerRank === 'string' &&
    gameState.playerRank.trim()
    ? gameState.playerRank.trim()
    : 'Junior Agent';

  const score = Number.isFinite(gameState.score)
    ? Math.max(0, Math.floor(gameState.score))
    : 0;

  if (aliasElement) {
    aliasElement.textContent = playerName;
  }

  if (rankElement) {
    rankElement.textContent = playerRank;
  }

  if (pointsElement) {
    pointsElement.textContent = score.toLocaleString('en-US');
  }
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

    const safeTotal = Number.isFinite(total)
        ? Math.max(0, Math.floor(total))
        : 0;

    gameState.score = safeTotal;

    if (this.scoreText) {
        this.scoreText.setText(`${safeTotal}`);
    }

    this.refreshOpenAgentModal();
}

    showGameOver(reason) {
        this.scene.stop();
        this.scene.start('GameOverScene', { reason: reason });
    }
}