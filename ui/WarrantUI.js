export class WarrantUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;

        this.container = this.scene.add.container(0, 0).setDepth(30).setVisible(false);

        const overlay = this.scene.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.8)
            .setOrigin(0).setInteractive();
        
        const bg = this.scene.add.rectangle(1920 / 2, 1080 / 2, 1500, 850, 0x111111)
            .setStrokeStyle(4, 0x44aa44).setInteractive();
            
        this.container.add([overlay, bg]);

        const title = this.scene.add.text(1920 / 2, 180, 'INTERPOL DATABASE - WARRANT SYSTEM', {
            fontFamily: 'Special Elite', fontSize: '32px', color: '#44aa44'
        }).setOrigin(0.5);
        this.container.add(title);

        const closeBtn = this.scene.add.text(1600, 160, '[X]', {
            fontFamily: 'Special Elite', fontSize: '36px', color: '#ff4444'
        }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
        this.container.add(closeBtn);

        this.traitButtons = [];
        this.resultsTexts = [];
        
        // Prawa strona: status
        this.statusText = this.scene.add.text(1350, 260, 'SELECT AT LEAST 3 TRAITS\nAND PRESS "SEARCH"...', {
            fontFamily: 'Special Elite', fontSize: '24px', color: '#aaaaaa', align: 'center'
        }).setOrigin(0.5);
        this.container.add(this.statusText);

        // Przycisk "SEARCH"
        this.searchBtn = this.scene.add.text(1350, 360, '[ SEARCH DATABASE ]', {
            fontFamily: 'Special Elite', fontSize: '28px', color: '#ffcc00', backgroundColor: '#333333', padding: {x: 10, y: 10}
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
        this.container.add(this.searchBtn);

        this.searchBtn.on('pointerover', () => this.searchBtn.setBackgroundColor('#555555'));
        this.searchBtn.on('pointerout', () => this.searchBtn.setBackgroundColor('#333333'));
        this.searchBtn.on('pointerdown', () => {
            const suspectsData = this.scene.cache.json.get('suspects');
            this.executeSearch(suspectsData);
        });
    }

    open(gameState) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.container.setVisible(true);
        this.gameState = gameState;

        const suspectsData = this.scene.cache.json.get('suspects');

        // Wyciąganie tagów po przecinku ze zbiorczych ciągów znaków
        const getSplitValues = (key) => {
            let allItems = [];
            suspectsData.forEach(s => {
                if (s[key]) {
                    let items = s[key].split(',').map(item => item.trim());
                    allItems = allItems.concat(items);
                }
            });
            const unique = [...new Set(allItems)];
            unique.unshift('UNKNOWN');
            return unique;
        };

        const uniqueSkills = getSplitValues('skills');
        const uniqueHabitus = getSplitValues('habitus');

        // Uporządkowana lista dla interfejsu (lewa i prawa kolumna)
        this.traitsData = {
            gender: this.getUniqueValues(suspectsData, 'gender'),
            race: this.getUniqueValues(suspectsData, 'race'), 
            hair: this.getUniqueValues(suspectsData, 'hair'),
            eyes: this.getUniqueValues(suspectsData, 'eyes'),
            accent: this.getUniqueValues(suspectsData, 'accent'),
            features: this.getUniqueValues(suspectsData, 'features'),
            // Rozdzielone umiejętności gracza
            skill_1: uniqueSkills,
            skill_2: uniqueSkills,
            skill_3: uniqueSkills,
            // Rozdzielone nawyki gracza
            habit_1: uniqueHabitus,
            habit_2: uniqueHabitus,
            habit_3: uniqueHabitus
        };

        // Stan filtrów (0 = UNKNOWN)
        this.currentFilters = {
            gender: 0, race: 0, hair: 0, eyes: 0, accent: 0, features: 0,
            skill_1: 0, skill_2: 0, skill_3: 0,
            habit_1: 0, habit_2: 0, habit_3: 0
        };

        this.buildTraitSelectors();
        this.updateStatusText();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.setVisible(false);
        this.clearUI();
        this.searchBtn.setVisible(false);
    }

    clearUI() {
        this.traitButtons.forEach(btn => btn.destroy());
        this.traitButtons = [];
        this.resultsTexts.forEach(txt => txt.destroy());
        this.resultsTexts = [];
    }

    getUniqueValues(suspects, key) {
        const values = suspects.map(s => s[key]).filter(v => v); 
        const unique = [...new Set(values)]; 
        unique.unshift('UNKNOWN'); 
        return unique;
    }

    buildTraitSelectors() {
        this.clearUI();
        
        const keys = Object.keys(this.traitsData);
        // Połowa kluczy poleci do lewej kolumny, połowa do prawej
        const half = Math.ceil(keys.length / 2);

        keys.forEach((traitKey, index) => {
            // Obliczanie pozycji (kolumna i wiersz)
            const isRightColumn = index >= half;
            const columnIndex = isRightColumn ? index - half : index;
            
            const startX = isRightColumn ? 750 : 250;
            const startY = 260 + (columnIndex * 65);

            // Wyświetlanie etykiety np. SKILL 1: zamiast SKILL_1:
            const displayLabel = traitKey.replace('_', ' ').toUpperCase();

            const label = this.scene.add.text(startX, startY, displayLabel + ':', {
                fontFamily: 'Special Elite', fontSize: '24px', color: '#ffffff'
            }).setOrigin(0, 0.5);

            const currentValue = this.traitsData[traitKey][this.currentFilters[traitKey]];
            const valueText = this.scene.add.text(startX + 180, startY, currentValue.toUpperCase(), {
                fontFamily: 'Special Elite', fontSize: '24px', color: '#44aa44', backgroundColor: '#222222', padding: {x: 10, y: 5}
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            valueText.on('pointerdown', () => {
                if (this.scene.sound.get('click_sound')) this.scene.sound.play('click_sound');

                let nextIndex = this.currentFilters[traitKey] + 1;
                if (nextIndex >= this.traitsData[traitKey].length) {
                    nextIndex = 0; 
                }
                this.currentFilters[traitKey] = nextIndex;
                valueText.setText(this.traitsData[traitKey][nextIndex].toUpperCase());
                
                this.updateStatusText();
            });

            this.container.add([label, valueText]);
            this.traitButtons.push(label, valueText);
        });
    }

    updateStatusText() {
        this.resultsTexts.forEach(txt => txt.destroy());
        this.resultsTexts = [];

        let activeTraitsCount = 0;
        Object.keys(this.currentFilters).forEach(key => {
            if (this.currentFilters[key] > 0) activeTraitsCount++;
        });

        if (activeTraitsCount < 3) {
            this.statusText.setText(`TRAITS PROVIDED: ${activeTraitsCount}/3\n\nSELECT AT LEAST 3 TRAITS\nTO ENABLE SEARCH...`);
            this.statusText.setColor('#aaaaaa');
            this.searchBtn.setVisible(false); 
        } else {
            this.statusText.setText(`TRAITS PROVIDED: ${activeTraitsCount}\n\nREADY FOR SEARCH.`);
            this.statusText.setColor('#ffcc00');
            this.searchBtn.setVisible(true); 
        }
    }

    executeSearch(suspectsData) {
        this.resultsTexts.forEach(txt => txt.destroy());
        this.resultsTexts = [];
        this.searchBtn.setVisible(false);

        this.statusText.setText('SEARCHING DATABASE...');
        this.statusText.setColor('#44aa44');

        const matches = suspectsData.filter(suspect => {
            for (let key of Object.keys(this.currentFilters)) {
                let selectedIndex = this.currentFilters[key];
                if (selectedIndex > 0) {
                    let selectedValue = this.traitsData[key][selectedIndex];
                    
                    // Odczyt podziału UI (np. "skill_1" sprawdza w JSONie klucz "skills")
                    let jsonKey = key;
                    if (key.startsWith('skill_')) jsonKey = 'skills';
                    if (key.startsWith('habit_')) jsonKey = 'habitus';

                    if (jsonKey === 'skills' || jsonKey === 'habitus') {
                        if (!suspect[jsonKey] || !suspect[jsonKey].includes(selectedValue)) {
                            return false;
                        }
                    } else {
                        if (suspect[jsonKey] !== selectedValue) {
                            return false; 
                        }
                    }
                }
            }
            return true;
        });

        this.displayResults(matches);
    }

    displayResults(matches) {
        if (matches.length === 0) {
            this.statusText.setText('NO MATCHES FOUND.\nCHANGE FILTERS AND SEARCH AGAIN.');
            this.statusText.setColor('#ff4444');
            return;
        }

        if (matches.length > 3) {
            this.statusText.setText(`TOO MANY MATCHES (${matches.length}).\nNARROW DOWN YOUR SEARCH.`);
            this.statusText.setColor('#ffaa00');
            return;
        }

        this.statusText.setText(`MATCHES FOUND: ${matches.length}\nCLICK NAME TO ISSUE WARRANT:`);
        this.statusText.setColor('#44aa44');

        let startY = 400;
        matches.forEach((suspect, index) => {
            const portraitKey = suspect.portraitKey || 'suspect_placeholder'; 
            
            const portraitImg = this.scene.add.image(1200, startY + (index * 110), portraitKey)
                .setDisplaySize(90, 90);

            const suspectEntry = this.scene.add.text(1270, startY + (index * 110), `[ ${suspect.name.toUpperCase()} ]`, {
                fontFamily: 'Special Elite', fontSize: '26px', color: '#ffcc00'
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            suspectEntry.on('pointerover', () => suspectEntry.setColor('#ffffff'));
            suspectEntry.on('pointerout', () => suspectEntry.setColor('#ffcc00'));

            suspectEntry.on('pointerdown', () => {
                this.issueWarrant(suspect);
            });

            this.container.add([portraitImg, suspectEntry]);
            this.resultsTexts.push(portraitImg, suspectEntry);
        });
    }

    issueWarrant(suspect) {
        this.gameState.issuedWarrant = suspect.name;

        this.clearUI();
        this.searchBtn.setVisible(false);
        this.statusText.setText('');
        
        const successTitle = this.scene.add.text(1920/2, 1080/2 - 50, '*** WARRANT ISSUED ***', {
            fontFamily: 'Special Elite', fontSize: '36px', color: '#ffcc00'
        }).setOrigin(0.5);

        const successDesc = this.scene.add.text(1920/2, 1080/2 + 30, `AUTHORIZING ARREST FOR: ${suspect.name.toUpperCase()}`, {
            fontFamily: 'Special Elite', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        this.container.add([successTitle, successDesc]);
        this.resultsTexts.push(successTitle, successDesc);

        this.scene.time.delayedCall(3000, () => {
            this.close();
        });
    }
}