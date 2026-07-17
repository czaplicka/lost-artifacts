import { advanceInvestigation } from '../gameSetup.js';
export class DestinationsUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;

        this.container = this.scene.add.container(0, 0).setDepth(25).setVisible(false);

        const overlay = this.scene.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive();
        this.container.add(overlay);

        const mapImage = this.scene.add.image(1920/2, 1080/2, 'mapbg');
        this.container.add(mapImage);

        const closeBtn = this.scene.add.text(1750, 100, 'X', { 
            fontFamily: 'Special Elite', fontSize: '55px', color: '#fbff00' 
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.close());
        this.container.add(closeBtn);

        this.activePins = [];
    }

    open(gameState) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.gameState = gameState;
        
        this.clearPins();

        // 1. Sprawdzamy czy są wygenerowane miejsca do podróży
        if (!this.gameState.currentDestinations || this.gameState.currentDestinations.length === 0) {
            console.log("Brak celów podróży. Być może jesteśmy w finałowym mieście.");
            
            // Opcjonalnie: można tu dodać tekst na mapie "NO ESCAPE ROUTE FOUND"
            
            this.container.setVisible(true);
            return;
        }

        // 2. Po prostu przekazujemy stałą tablicę do narysowania
        console.log("Wybrane miasta na mapę (stałe dla tej lokacji): ", this.gameState.currentDestinations.map(c => c.city));
        this.renderCityPins(this.gameState.currentDestinations);
        
        this.container.setVisible(true);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.setVisible(false);
        this.clearPins();
    }

    clearPins() {
        if (this.activePins && this.activePins.length > 0) {
            this.activePins.forEach(pinObj => pinObj.destroy());
            this.activePins = [];
        }
    }

    renderCityPins(citiesDataArray) {
        if (citiesDataArray.length === 0) {
            console.error("renderCityPins otrzymało pustą tablicę!");
            return;
        }

        citiesDataArray.forEach((cityObj) => {
            const cityName = cityObj.city;
            const xPos = cityObj.mapX || 1920 / 2;
            const yPos = cityObj.mapY || 1080 / 2;

            const pinContainer = this.scene.add.container(xPos, yPos);
            
            // Pinezka
            const dot = this.scene.add.circle(0, 0, 15, 0xffcc00)
                .setStrokeStyle(4, 0x8b0000)
                .setInteractive({ useHandCursor: true });

            // Etykieta
            const label = this.scene.add.text(0, 30, cityName, {
                fontFamily: 'Special Elite', fontSize: '24px', color: '#ffffff',
                backgroundColor: '#000000', padding: { x: 5, y: 5 }
            }).setOrigin(0.5);

            pinContainer.add([dot, label]);
            
            // Dodajemy do głównego kontenera i naszej listy do zarządzania
            this.container.add(pinContainer);
            this.activePins.push(pinContainer);

            dot.on('pointerover', () => {
                dot.setFillStyle(0xffffff);
                label.setColor('#ffcc00');
            });
            
            dot.on('pointerout', () => {
                dot.setFillStyle(0xffcc00);
                label.setColor('#ffffff');
            });

            dot.on('pointerdown', () => {
                this.travelToCity(cityName);
            });
        });
    }

        travelToCity(selectedCityName) {
        console.log(`Lecimy do: ${selectedCityName}!`);
        
        // Zamykamy UI
        this.close();
        if (this.scene.closeAllUIPanels) {
            this.scene.closeAllUIPanels();
        }

        // SPRAWDZAMY, CZY GRACZ WYBRAŁ POPRAWNE MIASTO:
        if (selectedCityName === this.gameState.nextTargetCity) {
            console.log("SUKCES! Właściwy trop.");
            
            // Gracz ląduje w mieście
            this.gameState.currentCity = selectedCityName;
            
            // Pobieramy globalne dane o lokacjach i przesuwamy akcję do przodu
            const locationsData = this.scene.cache.json.get('locations');
            advanceInvestigation(locationsData); 

            // Gra przeładowuje scenę, żeby pokazać widoki nowego miasta
            this.scene.scene.restart();

        } else {
            console.log("PORAŻKA. Zły ślad!");
            // Tutaj w przyszłości dodamy logikę uciekającego czasu (kary) za zły wybór!
        }
    }
}