import { setupNewGame } from '../gameSetup.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';


export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }


    create() {
audioManager.init(this);

if (!audioManager.isMusicPlaying('themeMusic')) {
    audioManager.playMusic('themeMusic', { loop: true });
}

        this.scene.sleep('UIScene');
        const { width, height } = this.scale;

        this.input.once('pointerdown', () => {
            if (this.sound.locked) {
                this.sound.unlock();
            }
        });

        if (this.textures.exists('background')) {
            this.add.image(width / 2, height / 2, 'background')
                .setDisplaySize(width, height);
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        const centerX = width * 0.73;

        const startBtn = this.add.image(centerX, height * 0.39, 'btnStart')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);
        this.addHoverEffect(startBtn);
        startBtn.on('pointerdown', () => this.startNewGame());

        const settingsBtn = this.add.image(centerX, height * 0.54, 'btnSettings')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);
        this.addHoverEffect(settingsBtn);
        settingsBtn.on('pointerdown', () => this.scene.launch('SettingsScene'));

        const hiscoreBtn = this.add.image(centerX, height * 0.69, 'btnHiscore')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);
        this.addHoverEffect(hiscoreBtn);
        hiscoreBtn.on('pointerdown', () => this.scene.start('HighscoreScene'));

        const exitBtn = this.add.image(centerX, height * 0.83, 'btnExit')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);
        this.addHoverEffect(exitBtn);
        exitBtn.on('pointerdown', () => this.scene.start('GameOverScene'));
    }


    async startNewGame() {
        // ① Zablokuj przycisk, żeby nie można było kliknąć dwa razy
        this.input.enabled = false;

        const suspectsData = this.cache.json.get('suspects') || [];
        const missionsData = this.cache.json.get('missions') || [];
        const locationsData = this.cache.json.get('locations') || [];

        try {
            // ② await — czekamy na pełną inicjalizację gameState
            await setupNewGame(suspectsData, missionsData, locationsData);

            this.registry.set('gameState', gameState);
            this.registry.set('locationsData', structuredClone(locationsData));

            // ③ GameScene startuje DOPIERO gdy gameState jest gotowy
            this.scene.start('GameScene');
        } catch (error) {
            console.error('Failed to start new game:', error);

            // ④ Odblokuj input przy błędzie, żeby gracz mógł spróbować ponownie
            this.input.enabled = true;

            this.add.text(this.scale.width / 2, this.scale.height - 80, 'Game data error', {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ff4444',
                backgroundColor: '#000000'
            }).setOrigin(0.5);
        }
    }


    addHoverEffect(button) {
        button.on('pointerover', () => button.setScale(0.9));
        button.on('pointerout', () => button.setScale(0.8));
    }
}