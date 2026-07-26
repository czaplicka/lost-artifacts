import { saveGameState } from '../GameData.js';

export class WarrantUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.gameState = null;
        this.autoCloseTimer = null;
        this.boundToggleHandler = this.onToggleKeyDown.bind(this);

        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0)
            .setDepth(30)
            .setVisible(false);

        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive();

        overlay.on('pointerdown', () => this.close());

        const bg = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width * 0.88,
            height * 0.86,
            0x111111
        )
            .setStrokeStyle(4, 0x44aa44)
            .setInteractive();

        this.container.add([overlay, bg]);

        const title = this.scene.add.text(
            width / 2,
            150,
            'INTERPOL DATABASE - WARRANT SYSTEM',
            {
                fontFamily: 'Special Elite',
                fontSize: '32px',
                color: '#44aa44'
            }
        ).setOrigin(0.5);

        this.container.add(title);

        const closeBtn = this.scene.add.text(width * 0.88, 135, '[X]', {
            fontFamily: 'Special Elite',
            fontSize: '36px',
            color: '#ff4444'
        })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.close());

        this.container.add(closeBtn);

        this.traitButtons = [];
        this.resultObjects = [];

        this.statusText = this.scene.add.text(
            width * 0.76,
            250,
            'SELECT AT LEAST 3 TRAITS\nAND PRESS "SEARCH"...',
            {
                fontFamily: 'Special Elite',
                fontSize: '24px',
                color: '#aaaaaa',
                align: 'center'
            }
        ).setOrigin(0.5);

        this.container.add(this.statusText);

        this.searchBtn = this.scene.add.text(
            width * 0.76,
            350,
            '[ SEARCH DATABASE ]',
            {
                fontFamily: 'Special Elite',
                fontSize: '28px',
                color: '#ffcc00',
                backgroundColor: '#333333',
                padding: { x: 10, y: 10 }
            }
        )
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);

        this.container.add(this.searchBtn);

        this.searchBtn.on('pointerover', () => {
            if (this.isTextUsable(this.searchBtn)) {
                this.searchBtn.setBackgroundColor('#555555');
            }
        });

        this.searchBtn.on('pointerout', () => {
            if (this.isTextUsable(this.searchBtn)) {
                this.searchBtn.setBackgroundColor('#333333');
            }
        });

        this.searchBtn.on('pointerdown', () => {
            const suspectsData = this.scene.cache.json.get('suspects') || [];
            this.executeSearch(suspectsData);
        });

        this.traitsData = {};
        this.currentFilters = {};

        this.bindKeyboardShortcut();
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('W');
        this.scene.input.keyboard.on('keydown-W', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping) return;

        event.preventDefault();
        this.toggle(this.gameState || this.scene.playerMenu?.gameState || this.scene.gameState);
    }

    toggle(gameState) {
        this.isOpen ? this.close() : this.open(gameState);
    }

    isUsable(obj) {
        return !!obj && !!obj.scene && obj.active !== false;
    }

    isTextUsable(obj) {
        return this.isUsable(obj) && typeof obj.setText === 'function';
    }

    safeSetVisible(obj, visible) {
        if (this.isUsable(obj) && typeof obj.setVisible === 'function') {
            obj.setVisible(visible);
        }
    }

    safeSetText(obj, text) {
        if (this.isTextUsable(obj)) {
            obj.setText(text);
        }
    }

    safeSetColor(obj, color) {
        if (this.isTextUsable(obj) && typeof obj.setColor === 'function') {
            obj.setColor(color);
        }
    }

    safeSetBackgroundColor(obj, color) {
        if (this.isTextUsable(obj) && typeof obj.setBackgroundColor === 'function') {
            obj.setBackgroundColor(color);
        }
    }

    safeDestroy(obj) {
        if (this.isUsable(obj) && typeof obj.destroy === 'function') {
            obj.destroy();
        }
    }

    clearAutoCloseTimer() {
        if (this.autoCloseTimer) {
            this.autoCloseTimer.remove(false);
            this.autoCloseTimer = null;
        }
    }

    open(gameState) {
        if (this.isOpen) return;

        const suspectsData = this.scene.cache.json.get('suspects');
        if (!Array.isArray(suspectsData) || suspectsData.length === 0) {
            console.error('WarrantUI: suspects data missing or invalid.');
            return;
        }

        this.isOpen = true;
        this.gameState = gameState;

        this.clearAutoCloseTimer();
        this.clearTraitSelectors();
        this.clearResults();

        this.safeSetVisible(this.container, true);

        this.traitsData = {
            gender: this.getUniqueValues(suspectsData, 'gender'),
            race: this.getUniqueValues(suspectsData, 'race'),
            hair: this.getUniqueValues(suspectsData, 'hair'),
            eyes: this.getUniqueValues(suspectsData, 'eyes'),
            accent: this.getUniqueValues(suspectsData, 'accent'),
            features: this.getUniqueValues(suspectsData, 'features')
        };

        this.currentFilters = {
            gender: 0,
            race: 0,
            hair: 0,
            eyes: 0,
            accent: 0,
            features: 0
        };

        this.buildTraitSelectors();

        this.safeSetText(
            this.statusText,
            'SELECT AT LEAST 3 TRAITS\nAND PRESS "SEARCH"...'
        );
        this.safeSetColor(this.statusText, '#aaaaaa');
        this.safeSetVisible(this.searchBtn, false);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.clearAutoCloseTimer();

        this.clearTraitSelectors();
        this.clearResults();

        this.safeSetVisible(this.container, false);
        this.safeSetVisible(this.searchBtn, false);
        this.safeSetText(
            this.statusText,
            'SELECT AT LEAST 3 TRAITS\nAND PRESS "SEARCH"...'
        );
        this.safeSetColor(this.statusText, '#aaaaaa');
    }

    clearTraitSelectors() {
        this.traitButtons.forEach(obj => this.safeDestroy(obj));
        this.traitButtons = [];
    }

    clearResults() {
        this.resultObjects.forEach(obj => this.safeDestroy(obj));
        this.resultObjects = [];
    }

    getUniqueValues(suspects, key) {
        const values = suspects
            .map(suspect => suspect[key])
            .filter(Boolean);

        const unique = [...new Set(values)];
        unique.unshift('UNKNOWN');
        return unique;
    }

    buildTraitSelectors() {
        const { width } = this.scene.scale;

        const fields = [
            ['gender', 'Gender'],
            ['race', 'Race'],
            ['hair', 'Hair'],
            ['eyes', 'Eyes'],
            ['accent', 'Accent'],
            ['features', 'Feature']
        ];

        const colX = width * 0.11;
        const startY = 250;
        const rowGap = 74;
        const arrowLeftOffset = 180;
        const valueOffset = 230;
        const arrowRightOffset = 470;

        fields.forEach(([key, label], index) => {
            const y = startY + index * rowGap;

            const labelText = this.scene.add.text(colX, y, `${label}:`, {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);

            const leftArrow = this.makeArrow(colX + arrowLeftOffset, y, '<', key, -1);

            const valueText = this.scene.add.text(
                colX + valueOffset,
                y,
                this.traitsData[key][this.currentFilters[key]],
                {
                    fontFamily: 'Special Elite',
                    fontSize: '20px',
                    color: '#ffcc00',
                    backgroundColor: '#222222',
                    padding: { x: 8, y: 6 },
                    fixedWidth: 220,
                    align: 'center'
                }
            ).setOrigin(0, 0.5);

            const rightArrow = this.makeArrow(colX + arrowRightOffset, y, '>', key, 1);

            leftArrow.valueText = valueText;
            rightArrow.valueText = valueText;

            this.container.add([labelText, leftArrow, valueText, rightArrow]);
            this.traitButtons.push(labelText, leftArrow, valueText, rightArrow);
        });

        this.updateStatusText();
    }

    makeArrow(x, y, glyph, key, direction) {
        const arrow = this.scene.add.text(x, y, glyph, {
            fontFamily: 'Special Elite',
            fontSize: '26px',
            color: '#44aa44',
            backgroundColor: '#222222',
            padding: { x: 10, y: 6 }
        })
            .setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });

        arrow.on('pointerover', () => {
            this.safeSetColor(arrow, '#ffcc00');
            this.safeSetBackgroundColor(arrow, '#444444');
        });

        arrow.on('pointerout', () => {
            this.safeSetColor(arrow, '#44aa44');
            this.safeSetBackgroundColor(arrow, '#222222');
        });

        arrow.on('pointerdown', () => {
            if (!this.isOpen) return;
            this.stepTrait(key, direction, arrow.valueText);
        });

        return arrow;
    }

    stepTrait(key, direction, valueText) {
        if (!this.isOpen) return;

        const values = this.traitsData[key];
        const count = values.length;
        this.currentFilters[key] = (this.currentFilters[key] + direction + count) % count;
        this.safeSetText(valueText, values[this.currentFilters[key]]);
        this.updateStatusText();
    }

    updateStatusText() {
        const selectedCount = Object.values(this.currentFilters).filter(value => value > 0).length;

        if (selectedCount >= 3) {
            this.safeSetText(
                this.statusText,
                `SELECTED TRAITS: ${selectedCount}\nPRESS "SEARCH" TO QUERY DATABASE`
            );
            this.safeSetColor(this.statusText, '#44aa44');
            this.safeSetVisible(this.searchBtn, true);
        } else {
            this.safeSetText(
                this.statusText,
                `SELECTED TRAITS: ${selectedCount}\nSELECT AT LEAST 3 TRAITS`
            );
            this.safeSetColor(this.statusText, '#aaaaaa');
            this.safeSetVisible(this.searchBtn, false);
        }
    }

    executeSearch(suspectsData) {
        this.clearResults();
        this.safeSetVisible(this.searchBtn, false);

        this.safeSetText(this.statusText, 'SEARCHING DATABASE...');
        this.safeSetColor(this.statusText, '#44aa44');

        const matches = suspectsData.filter((suspect) => {
            for (const key of Object.keys(this.currentFilters)) {
                const selectedIndex = this.currentFilters[key];
                if (selectedIndex <= 0) continue;

                const selectedValue = this.traitsData[key][selectedIndex];

                if (suspect[key] !== selectedValue) {
                    return false;
                }
            }

            return true;
        });

        this.displayResults(matches);
    }

    displayResults(matches) {
        this.clearResults();

        const { width } = this.scene.scale;
        const resultX = width * 0.76;

        if (!matches.length) {
            const noMatch = this.scene.add.text(resultX, 470, 'NO MATCH FOUND', {
                fontFamily: 'Special Elite',
                fontSize: '28px',
                color: '#ff6666'
            }).setOrigin(0.5);

            this.container.add(noMatch);
            this.resultObjects.push(noMatch);
            this.safeSetText(this.statusText, 'DATABASE SEARCH COMPLETE');
            return;
        }

        this.safeSetText(this.statusText, `MATCHES FOUND: ${matches.length}`);

        matches.slice(0, 4).forEach((suspect, index) => {
            const y = 470 + index * 95;

            const cardBg = this.scene.add.rectangle(
                resultX,
                y,
                360,
                74,
                0x1f1f1f,
                0.95
            )
                .setStrokeStyle(2, 0x44aa44)
                .setInteractive({ useHandCursor: true });

            const portraitKey = suspect.portraitKey;
            let portrait;

            if (portraitKey && this.scene.textures.exists(portraitKey)) {
                portrait = this.scene.add.image(resultX - 145, y, portraitKey)
                    .setDisplaySize(54, 54);
            } else {
                portrait = this.scene.add.rectangle(resultX - 145, y, 54, 54, 0x333333)
                    .setStrokeStyle(2, 0x777777);

                console.warn(`WarrantUI: missing portrait texture for "${suspect.name}" using key "${portraitKey}"`);
            }

            const resultName = this.scene.add.text(resultX - 105, y, suspect.name, {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: '#ffffff',
                wordWrap: { width: 220 }
            }).setOrigin(0, 0.5);

            const cardObjects = [cardBg, portrait, resultName];

            cardObjects.forEach(obj => {
                obj.setInteractive?.({ useHandCursor: true });
                obj.on?.('pointerdown', () => this.issueWarrant(suspect));
                obj.on?.('pointerover', () => {
                    if (!this.isOpen) return;
                    cardBg.setFillStyle(0x2b2b2b, 1);
                    this.safeSetColor(resultName, '#ffcc00');
                });
                obj.on?.('pointerout', () => {
                    if (!this.isOpen) return;
                    cardBg.setFillStyle(0x1f1f1f, 0.95);
                    this.safeSetColor(resultName, '#ffffff');
                });
            });

            this.container.add(cardObjects);
            this.resultObjects.push(...cardObjects);
        });
    }

    issueWarrant(suspect) {
        if (!this.gameState) return;

        this.gameState.issuedWarrant = suspect.name;
        saveGameState();

        this.clearAutoCloseTimer();
        this.clearResults();
        this.safeSetVisible(this.searchBtn, false);
        this.safeSetText(this.statusText, '');

        const { width, height } = this.scene.scale;

        const successPanel = this.scene.add.rectangle(
            width / 2,
            height / 2 + 10,
            width * 0.72,
            height * 0.58,
            0x161616,
            0.98
        ).setStrokeStyle(4, 0xffcc00);

        const successTitle = this.scene.add.text(
            width / 2,
            height / 2 - 235,
            '*** WARRANT ISSUED ***',
            {
                fontFamily: 'Special Elite',
                fontSize: '38px',
                color: '#ffcc00'
            }
        ).setOrigin(0.5);

        const portraitKey = suspect.portraitKey;
        let portrait;

        if (portraitKey && this.scene.textures.exists(portraitKey)) {
            portrait = this.scene.add.image(width * 0.34, height / 2 + 5, portraitKey)
                .setDisplaySize(260, 320);
        } else {
            portrait = this.scene.add.rectangle(width * 0.34, height / 2 + 5, 260, 320, 0x333333)
                .setStrokeStyle(3, 0x777777);

            console.warn(`WarrantUI: missing large portrait texture for "${suspect.name}" using key "${portraitKey}"`);
        }

        const nameText = this.scene.add.text(
            width * 0.53,
            height / 2 - 145,
            suspect.name.toUpperCase(),
            {
                fontFamily: 'Special Elite',
                fontSize: '34px',
                color: '#ffffff',
                wordWrap: { width: 520 }
            }
        ).setOrigin(0, 0);

        const details = [
            `Gender: ${suspect.gender || 'Unknown'}`,
            `Race: ${suspect.race || 'Unknown'}`,
            `Hair: ${suspect.hair || 'Unknown'}`,
            `Eyes: ${suspect.eyes || 'Unknown'}`,
            `Accent: ${suspect.accent || 'Unknown'}`,
            `Feature: ${suspect.features || 'Unknown'}`,
            `Skills: ${suspect.skills || 'Unknown'}`,
            `Habitus: ${suspect.habitus || 'Unknown'}`
        ].join('\n');

        const infoText = this.scene.add.text(
            width * 0.53,
            height / 2 - 85,
            details,
            {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: '#d9d9d9',
                lineSpacing: 10,
                wordWrap: { width: 520 }
            }
        ).setOrigin(0, 0);

        const footerText = this.scene.add.text(
            width / 2,
            height / 2 + 255,
            'INTERPOL AUTHORISATION CONFIRMED - FIELD UNITS NOTIFIED',
            {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: '#80ed99'
            }
        ).setOrigin(0.5);

        const successObjects = [
            successPanel,
            successTitle,
            portrait,
            nameText,
            infoText,
            footerText
        ];

        this.container.add(successObjects);
        this.resultObjects.push(...successObjects);

        this.autoCloseTimer = this.scene.time.delayedCall(4000, () => {
            if (!this.scene || !this.scene.sys) return;
            this.close();
        });
    }

    destroy() {
        this.clearAutoCloseTimer();
        this.clearTraitSelectors();
        this.clearResults();

        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-W', this.boundToggleHandler);
        }

        this.container?.destroy(true);
    }
}