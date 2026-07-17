export class PlayerMenuUI {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.isOpen = false;
        this.isAnimating = false; // Zabezpieczenie przed wielokrotnym klikaniem podczas animacji

        // Wymiary menu
        this.menuWidth = 900;
        this.menuHeight = 150;
        
        // Pozycje na osi Y
        // Zamknięte: schowane pod dolną krawędzią ekranu (Y = 1080)
        // Otwarte: na dole ekranu (Y = 1080 - 150 = 930)
        this.closedY = 1080;
        this.openY = 1080 - this.menuHeight;

        // Główny kontener na menu, umieszczony na dole na środku
        this.container = this.scene.add.container(1920 / 2, this.closedY).setDepth(40);

        // Tworzenie półprzezroczystego tła menu
        const menuBg = this.scene.add.rectangle(0, this.menuHeight / 2, this.menuWidth, this.menuHeight, 0x222222, 0.9)
            .setStrokeStyle(4, 0x8b0000)
            .setInteractive(); // Zatrzymuje kliknięcia w puste miejsce menu
        this.container.add(menuBg);

        // Przycisk wysuwający menu (na stałe widoczny na dole ekranu, lekko wystający)
        this.toggleBtn = this.scene.add.rectangle(1920 / 2, 1080 - 25, 200, 50, 0x8b0000)
            .setInteractive({ useHandCursor: true })
            .setDepth(41);
            
        this.toggleText = this.scene.add.text(1920 / 2, 1080 - 25, 'MENU', {
            fontFamily: 'Press Start 2P', fontSize: '18px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(42);

        // Obsługa kliknięcia w toggle
        this.toggleBtn.on('pointerdown', () => this.toggle());

        // Tworzenie ikon menu
        this.createMenuButtons();
    }

    createMenuButtons() {
        // Tablica przycisków docelowych (z nazwami kluczy Twoich grafik)
        const buttons = [
            { key: 'filebutt', label: 'Casefile', action: () => this.openCasefile() },
            { key: 'atlas', label: 'Notes', action: () => this.openNotes() },
            { key: 'plane', label: 'Destinations', action: () => this.openDestinations() },
            { key: 'search', label: 'Warrant', action: () => this.openWarrant() }
        ];

        const spacing = this.menuWidth / buttons.length;
        const startX = -(this.menuWidth / 2) + (spacing / 2);

        buttons.forEach((btnData, index) => {
            const xPos = startX + (index * spacing);
            
            // Tworzymy grafikę z podanym kluczem
            const btnIcon = this.scene.add.image(xPos, 50, btnData.key)
                .setInteractive({ useHandCursor: true });
            
            // Blokujemy rozmiar ikony na np. 60x60 pikseli, aby ładnie mieściła się w menu
            btnIcon.setDisplaySize(60, 60);
                
            const btnLabel = this.scene.add.text(xPos, 110, btnData.label, {
                fontFamily: 'Special Elite', fontSize: '20px', color: '#ffffff'
            }).setOrigin(0.5);

            // Hover effect: przyciemnia obrazek i zmienia kolor tekstu
            btnIcon.on('pointerover', () => {
                btnIcon.setTint(0xaaaaaa);
                btnLabel.setColor('#ffcc00');
            });
            
            btnIcon.on('pointerout', () => {
                btnIcon.clearTint();
                btnLabel.setColor('#ffffff');
            });

            // Kliknięcie
            btnIcon.on('pointerdown', () => {
                // Jeśli posiadasz plik dźwiękowy o kluczu 'click_sound', zostanie odtworzony
                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }
                
                // Wywołanie przypisanej metody
                btnData.action();
                
                // Automatyczne chowanie menu po kliknięciu wybranej opcji
                this.close(); 
            });

            this.container.add([btnIcon, btnLabel]);
        });
    }

    toggle() {
        if (this.isAnimating) return;
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.isOpen) return;
        this.isAnimating = true;
        this.isOpen = true;

        this.toggleText.setText('CLOSE');

        // Płynna animacja wyjazdu menu z dołu
        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });

        // Przycisk "MENU" jedzie do góry razem z menu
        this.scene.tweens.add({
            targets: [this.toggleBtn, this.toggleText],
            y: this.openY - 25,
            duration: 300,
            ease: 'Power2'
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isAnimating = true;
        this.isOpen = false;

        this.toggleText.setText('MENU');

        // Płynna animacja schowania menu
        this.scene.tweens.add({
            targets: this.container,
            y: this.closedY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });

        // Przycisk "MENU" wraca na sam dół ekranu
        this.scene.tweens.add({
            targets: [this.toggleBtn, this.toggleText],
            y: 1080 - 25,
            duration: 300,
            ease: 'Power2'
        });
    }

    // --- Metody otwierające poszczególne panele ---

    openCasefile() {
        if (this.scene.caseFileUI) {
            this.scene.closeAllUIPanels();
            this.scene.caseFileUI.open(this.gameState.currentMission);
        }
    }

    openNotes() {
        if (this.scene.notesUI) {
            this.scene.closeAllUIPanels();
            this.scene.notesUI.open(this.gameState);
        }
    }

    openDestinations() {
        if (this.scene.destinationsUI) {
            this.scene.closeAllUIPanels();
            this.scene.destinationsUI.open(this.gameState);
        }
    }

    openWarrant() {
        if (this.scene.warrantUI) {
            this.scene.closeAllUIPanels();
            this.scene.warrantUI.open(this.gameState);
        }
    }
}