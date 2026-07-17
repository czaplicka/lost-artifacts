import { saveGameState } from '../gamedata.js';

export class NotesUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;

        // Overlay zamykający
        this.overlay = this.scene.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.6)
            .setOrigin(0)
            .setInteractive()
            .setDepth(20)
            .setVisible(false);

        this.overlay.on('pointerdown', () => this.close());

        this.container = this.scene.add.container(0, 0).setDepth(21).setVisible(false);

        const bg = this.scene.add.image(960, 540, 'notes')
            .setInteractive();
        
        this.container.add(bg);

        // Przycisk zamykania (X)
        const closeBtn = this.scene.add.text(1575, 95, 'X', { 
            fontFamily: 'Special Elite', fontSize: '48px', color: '#000000' 
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.close());
        this.container.add(closeBtn);

        // Zapisy z gry (lewa strona)
        this.gameNotesText = this.scene.add.text(400, 170, '', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#000000',
            wordWrap: { width: 400 },
            lineSpacing: 8,
            padding: { top: 6, bottom: 2 }
        });
        this.container.add(this.gameNotesText);

        // Tytuł notatek gracza (prawa strona)
        this.gameNotesTitleText = this.scene.add.text(1000, 155, 'Your notes', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#000000',
            wordWrap: { width: 400 },
            lineSpacing: 8,
            padding: { top: 6, bottom: 2 }
        });
        this.container.add(this.gameNotesTitleText);

        // Pole tekstowe DOM
        this.playerInputDOM = this.scene.add.dom(1300, 500, 'textarea', 
            'width: 400px; height: 500px; font-family: "Special Elite"; font-size: 22px; background: transparent; border: none; outline: none; resize: none; color: #000000;', 
            ''
        ).setOrigin(0.5);
        
        this.container.add(this.playerInputDOM);

        this.playerInputDOM.node.addEventListener('input', (event) => {
            if (this.isOpen) {
                this.updateNotes(event.target.value);
            }
        });

        // --- NOWY PRZYCISK: CLEAR NOTES ---
        // Umieszczamy go pod polem textarea
        const clearBtn = this.scene.add.text(1300, 780, '[ CLEAR NOTES ]', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#8b0000'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Efekty najechania myszką
        clearBtn.on('pointerover', () => clearBtn.setColor('#ff0000'));
        clearBtn.on('pointerout', () => clearBtn.setColor('#8b0000'));

        // Akcja czyszczenia
        clearBtn.on('pointerdown', () => {
            this.playerInputDOM.node.value = ''; // Czyści widok na ekranie
            this.updateNotes(''); // Czyści zmienną w grze
            saveGameState(); // Od razu zapisuje pusty stan do localStorage
        });

        this.container.add(clearBtn);
    }

    updateNotes(newText) {
        if (this.currentGameState) {
            this.currentGameState.playerNotes = newText;
        }
    } 

    open(gameState) {
        this.isOpen = true;
        this.currentGameState = gameState;
        this.overlay.setVisible(true);
        this.container.setVisible(true);

        let cluesText = "Clues:\n\n\n";
        if (gameState.collectedClues && gameState.collectedClues.length > 0) {
            cluesText += gameState.collectedClues.join('\n- ');
        } else {
            cluesText += "No clues found yet...";
        }
        this.gameNotesText.setText(cluesText);
        this.playerInputDOM.node.value = gameState.playerNotes || '';
    }

    close() {
        if (!this.isOpen) return;
        
        if (this.currentGameState) {
            this.currentGameState.playerNotes = this.playerInputDOM.node.value;
            saveGameState();
        }

        this.isOpen = false;
        this.overlay.setVisible(false);
        this.container.setVisible(false);
    }

    toggle(gameState) {
        this.isOpen ? this.close() : this.open(gameState);
    }
}