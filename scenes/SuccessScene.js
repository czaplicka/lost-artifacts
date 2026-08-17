import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { ScoreManager } from '../ScoreManager.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { checkAndAwardAchievements } from '../AchievementManager.js';

export class SuccessScene extends BaseScene {
    constructor() {
        super({ key: 'SuccessScene' });

        this.scoreManager = null;
    }

    create() {
        super.create();
EventBus.emit('hideHUD');
        audioManager.init(this);
        audioManager.stopAllMusic();
        audioManager.stopAllAmbient();
        audioManager.stopAllVoice();
        audioManager.stopAllSfx();
        audioManager.playSfx('successsound');

        this.scene.get('NewsHud').events.emit('setNewspaperVisible', false);
        this.scene.sleep('UIScene');

        this.scoreManager = new ScoreManager();

        this.registerCaseSuccess();
        this.unlockOfficeAfterFirstMission();

        if (!gameState.scoreSaved) {
            const playerName =
                gameState.playerName ||
                gameState.agentName ||
                'Agent';

            const finalScore = Number.isFinite(gameState.score)
                ? gameState.score
                : 0;

            this.scoreManager.saveScore(playerName, finalScore);
            gameState.scoreSaved = true;

            saveGameState();
        }

        const { width, height } = this.scale;
        const centerX = width / 2;

        if (this.textures.exists('backgrounds')) {
            this.add.image(centerX, height / 2, 'backgrounds')
                .setDisplaySize(width, height);
        } else {
            console.warn('Missing texture: backgrounds');
            this.cameras.main.setBackgroundColor('#101010');
        }

        const overlay = this.add.rectangle(
            centerX,
            height / 2,
            width,
            height,
            0x000000,
            0.45
        );

        overlay.setDepth(0);

        const titleSize = Math.max(20, Math.floor(width * 0.04));
        const mainSize = Math.max(14, Math.floor(width * 0.022));
        const bodySize = Math.max(12, Math.floor(width * 0.018));
        const scoreSize = Math.max(14, Math.floor(width * 0.02));
        const textWidth = Math.min(width * 0.8, 760);

        this.add.text(centerX, height * 0.18, 'CASE SOLVED', {
            fontFamily: 'PressStart2P',
            fontSize: `${titleSize}px`,
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            wordWrap: {
                width: textWidth,
                useAdvancedWrap: true
            }
        }).setOrigin(0.5);

        const thiefName = gameState.currentThief?.name || 'Unknown suspect';

        this.add.text(centerX, height * 0.34, `You captured:\n${thiefName}`, {
            fontFamily: 'PressStart2P',
            fontSize: `${mainSize}px`,
            color: '#ffffff',
            align: 'center',
            lineSpacing: 12,
            wordWrap: {
                width: textWidth,
                useAdvancedWrap: true
            }
        }).setOrigin(0.5);

        this.add.text(
            centerX,
            height * 0.52,
            'The artifact is safe.\nThe agency confirms your success.',
            {
                fontFamily: 'PressStart2P',
                fontSize: `${bodySize}px`,
                color: '#f5f5f5',
                align: 'center',
                lineSpacing: 10,
                wordWrap: {
                    width: textWidth,
                    useAdvancedWrap: true
                }
            }
        ).setOrigin(0.5);

        this.add.text(
            centerX,
            height * 0.66,
            `Final score: ${gameState.score || 0}`,
            {
                fontFamily: 'PressStart2P',
                fontSize: `${scoreSize}px`,
                color: '#ffe066',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center',
                wordWrap: {
                    width: textWidth,
                    useAdvancedWrap: true
                }
            }
        ).setOrigin(0.5);

        let nextBtn;

        if (this.textures.exists('next')) {
            nextBtn = this.add.image(centerX, height * 0.84, 'next')
                .setInteractive({ useHandCursor: true });

            const baseScale = Math.min(0.7, width / 1400);
            const hoverScale = baseScale + 0.08;

            nextBtn.setScale(baseScale);
            this.addHoverEffect(nextBtn, baseScale, hoverScale);
        } else {
            console.warn('Missing texture: next');

            nextBtn = this.add.text(centerX, height * 0.84, '[ NEXT ]', {
                fontFamily: 'PressStart2P',
                fontSize: `${Math.max(14, Math.floor(width * 0.018))}px`,
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: {
                    left: 12,
                    right: 12,
                    top: 10,
                    bottom: 10
                },
                align: 'center'
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
        }

        nextBtn.on('pointerdown', () => {
            audioManager.stopSfx('successsound');

            const againSceneExists = this.scene.manager.keys.AgainScene;

            if (!againSceneExists) {
                console.error('AgainScene is not registered in game config.');
                this.scene.start('MenuScene');
                return;
            }

            audioManager.stopAllNonMusic();
            audioManager.stopAllMusic();

            this.scene.start('AgainScene');
        });

        this.scale.on('resize', this.handleResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            audioManager.stopSfx('successsound');
        });
    }

    registerCaseSuccess() {
        const caseId = this.getCurrentCaseId();

        if (!caseId) {
            console.warn(
                '[SuccessScene] Cannot save dossier statistics: missing case ID.'
            );

            return;
        }

        if (!Array.isArray(gameState.completedCaseIds)) {
            gameState.completedCaseIds = [];
        }

        if (!Array.isArray(gameState.successfulArrestCaseIds)) {
            gameState.successfulArrestCaseIds = [];
        }

        let statsChanged = false;

        if (!gameState.completedCaseIds.includes(caseId)) {
            gameState.completedCaseIds.push(caseId);
            gameState.casesSolved = gameState.completedCaseIds.length;
            statsChanged = true;
        }

        if (!gameState.successfulArrestCaseIds.includes(caseId)) {
            gameState.successfulArrestCaseIds.push(caseId);
            gameState.arrests = gameState.successfulArrestCaseIds.length;
            statsChanged = true;
        }

        gameState.caseResolved = true;
        gameState.caseFailed = false;
        gameState.finalArrestResult = 'success';
        const newlyUnlocked = checkAndAwardAchievements();

if (newlyUnlocked.length > 0) {
    console.log(
        '[Achievements] New badges:',
        newlyUnlocked.map((achievement) => achievement.title)
    );
}

        if (statsChanged) {
            saveGameState();

            EventBus.emit('agentStatsChanged', {
                casesSolved: gameState.casesSolved,
                arrests: gameState.arrests
            });
        }
    }
unlockOfficeAfterFirstMission() {
  if (!gameState.progress) {
    gameState.progress = {};
  }

  if (gameState.progress.firstMissionCompleted) {
    return;
  }

  gameState.progress.firstMissionCompleted = true;

  saveGameState();

  EventBus.emit('firstMissionCompleted');

  console.log(
    '[SuccessScene] First mission completed: elevator and archive unlocked.',
  );
}
    getCurrentCaseId() {
        const missionId =
            gameState.currentMission?.id ||
            gameState.currentMission?.missionId ||
            gameState.currentMission?.caseId;

        const thiefId =
            gameState.currentThiefId ||
            gameState.currentThief?.id;

        const cityId =
            gameState.currentCityId ||
            gameState.crimeCityId;

        const rawId = missionId || thiefId || cityId;

        if (typeof rawId !== 'string' && typeof rawId !== 'number') {
            return null;
        }

        return String(rawId);
    }

    handleResize() {
        this.scene.restart();
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => {
            button.setScale(hoverScale);
        });

        button.on('pointerout', () => {
            button.setScale(baseScale);
        });
    }
}