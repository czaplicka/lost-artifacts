import { setupNewGame } from './gameSetup.js';
import { gameState } from './gamedata.js';
import { PlayerMenuUI } from './ui/PlayerMenuUI.js';
import { CaseFileUI } from './ui/CaseFileUI.js';
import { NotesUI } from './ui/NotesUI.js';
import { WarrantUI } from './ui/WarrantUI.js';
import { DestinationsUI } from './ui/DestinationsUI.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.dialogueText = null;
        this.fullIntroText = '';
        this.caseFileUI = null;
    }

    create() {
        const suspectsData = this.cache.json.get('suspects');
        const missionsData = this.cache.json.get('missions');
        const locationsData = this.cache.json.get('locations');
        const dialogueData = this.cache.json.get('dialogue');

        // Setup gry
        setupNewGame(suspectsData, missionsData, locationsData);

        // Tło
        this.add.image(0, 0, 'background2')
            .setOrigin(0, 0)
            .setDisplaySize(1920, 1080);

        // Przycisk powrotu
        const backBtn = this.add.image(200, 70, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.5)
            .setDepth(30);

        this.addHoverEffect(backBtn, 0.5, 0.6);
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // 1. Tworzymy elementy UI natychmiast (bez delayedCall), aby text obiekt istniał
        this.createDetectiveSection();

        // 2. Inicjalizacja paneli UI (na razie są ukryte z tyłu)
        this.caseFileUI = new CaseFileUI(this);
        this.notesUI = new NotesUI(this);
        this.warrantUI = new WarrantUI(this);
        this.destinationsUI = new DestinationsUI(this);

        // 3. Inicjalizacja rozwijanego menu
        this.playerMenu = new PlayerMenuUI(this, gameState);

        // 4. Logika dialogu
        if (!dialogueData || !Array.isArray(dialogueData.gameIntro)) {
            console.error('Brak dialogue.gameIntro w dialogue.json');
            return;
        }

        this.fullIntroText = dialogueData.gameIntro.join('\n');
        this.typeText(this.dialogueText, this.fullIntroText, 24);
    }

    createDetectiveSection() {
        const dialogueBox = this.add.graphics();
        dialogueBox.fillStyle(0x000000, 0.72);
        dialogueBox.fillRoundedRect(90, 700, 1180, 260, 20);
        dialogueBox.lineStyle(4, 0xFFFF00, 1);
        dialogueBox.strokeRoundedRect(90, 700, 1180, 260, 20);

        this.dialogueText = this.add.text(140, 748, '', {
            fontFamily: 'PressStart2P', // Pamiętaj, aby nazwa fontu dokładnie zgadzała się z tą w CSS/WebFont
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 1040 },
            lineSpacing: 14
        });
    }
closeAllUIPanels() {
        // Jeśli dany panel istnieje i ma metodę close(), to ją wywołujemy
        if (this.caseFileUI) this.caseFileUI.close();
        if (this.notesUI) this.notesUI.close();
        
        // Dodaj pozostałe panele, kiedy już je stworzysz:
        if (this.destinationsUI) this.destinationsUI.close();
        if (this.warrantUI) this.warrantUI.close();
    }
    typeText(target, text, speed = 20) {
        target.setText('');
        let index = 0;

        this.time.addEvent({
            delay: speed,
            repeat: text.length - 1,
            callback: () => {
                target.setText(text.slice(0, index + 1));
                index++;
            }
        });
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}