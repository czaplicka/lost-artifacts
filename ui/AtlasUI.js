export class AtlasUI {
    constructor(scene, countries = []) {
        this.scene = scene;
        this.countries = Array.isArray(countries) ? countries : [];
        this.isOpen = false;
        this.pageIndex = 0;

        this.boundToggleHandler = this.onToggleKeyDown.bind(this);
        this.boundLeftHandler = this.onLeftKeyDown.bind(this);
        this.boundRightHandler = this.onRightKeyDown.bind(this);
        this.boundResizeHandler = this.onResize.bind(this);

        this.overlay = null;
        this.book = null;
        this.bookBg = null;
        this.leftPageImage = null;

        this.pageLeftNumber = null;
        this.pageRightLabel = null;
        this.caseStampText = null;

        this.countryNameText = null;
        this.capitalText = null;
        this.regionText = null;
        this.descriptionText = null;
        this.knownForText = null;
        this.hintText = null;

        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;

        this.tabs = [];
        this.paperOverlays = [];
        this.pageSound = null;

        this.leftPageFrame = {
            x: 0,
            y: 0,
            width: 1920,
            height: 1047
        };

        this.create();
        this.bindKeyboardShortcuts();
        this.bindResizeHandler();
        this.createSound();
        this.refreshPage();
    }

    create() {
        const { width, height } = this.scene.scale;

        this.overlay = this.scene.add
            .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
            .setDepth(20)
            .setAlpha(0)
            .setVisible(false)
            .setInteractive();

        this.overlay.on('pointerdown', () => this.close());

        this.bookBg = this.scene.add
            .image(0, 0, 'atlas_bg')
            .setOrigin(0.5)
            .setScale(0.92);

        this.leftPageImage = this.scene.add
            .image(this.leftPageFrame.x, this.leftPageFrame.y, 'atlas_fallback')
            .setOrigin(0.5);

        this.createPaperWear();
        this.createTexts();
        this.createButtons();
        this.createTabs();

        this.book = this.scene.add.container(width / 2, height / 2, [
            this.bookBg,
            this.leftPageImage,
            ...this.paperOverlays,
            this.pageLeftNumber,
            this.pageRightLabel,
            this.caseStampText,
            this.countryNameText,
            this.capitalText,
            this.regionText,
            this.descriptionText,
            this.knownForText,
            this.hintText,
            this.prevBtn,
            this.nextBtn,
            this.closeBtn,
            ...this.tabs
        ]);

        this.book.setDepth(21);
        this.book.setScale(0.92);
        this.book.setAlpha(0);
        this.book.setVisible(false);
    }

    // Wywoływane w create() oraz przy każdym resize okna/canvasu
    layout() {
        const { width, height } = this.scene.scale;

        if (this.overlay) {
            this.overlay.setPosition(width / 2, height / 2);
            this.overlay.setSize(width, height);
            // rectangle interactive hit area trzeba odświeżyć ręcznie
            this.overlay.input && this.overlay.setInteractive();
        }

        if (this.book) {
            this.book.setPosition(width / 2, height / 2);
        }
    }

    bindResizeHandler() {
        this.scene.scale.on('resize', this.boundResizeHandler);
    }

    onResize() {
        this.layout();
    }

    fitImageInBox(image, maxWidth, maxHeight) {
        if (!image || !image.width || !image.height) return;

        const scaleX = maxWidth / image.width;
        const scaleY = maxHeight / image.height;
        const scale = Math.min(scaleX, scaleY);

        image.setScale(scale);
    }

    createPaperWear() {
        const rightPageShade = this.scene.add.rectangle(255, 10, 470, 640, 0xd0aa68, 0.03).setAngle(1);
        const rightPageStain = this.scene.add.ellipse(280, 210, 170, 95, 0xa86e36, 0.04).setAngle(-10);
        const topPageFade = this.scene.add.rectangle(250, -285, 440, 70, 0xffffff, 0.04);

        this.paperOverlays.push(rightPageShade, rightPageStain, topPageFade);
    }

    createTexts() {
        this.pageLeftNumber = this.scene.add.text(-485, -425, 'PAGE 01', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#5a3922'
        });

        this.pageRightLabel = this.scene.add.text(145, -445, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#5a3922'
        });

        this.caseStampText = this.scene.add.text(335, -405, '', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#6a3d24',
            backgroundColor: '#d8b57a',
            padding: { left: 10, right: 10, top: 4, bottom: 4 },
            align: 'center'
        }).setOrigin(0.5);

        this.countryNameText = this.scene.add.text(95, -350, '', {
            fontFamily: 'Special Elite',
            fontSize: '34px',
            color: '#2f1d12',
            wordWrap: { width: 470 }
        });

        this.capitalText = this.scene.add.text(95, -285, '', {
            fontFamily: 'Special Elite',
            fontSize: '21px',
            color: '#3e2a1a',
            wordWrap: { width: 470 }
        });

        this.regionText = this.scene.add.text(95, -245, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#5a3922',
            wordWrap: { width: 470 }
        });

        this.descriptionText = this.scene.add.text(95, -180, '', {
            fontFamily: 'Special Elite',
            fontSize: '19px',
            color: '#2f1d12',
            wordWrap: { width: 480 },
            lineSpacing: 8
        });

        this.knownForText = this.scene.add.text(95, 170, '', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#3e2a1a',
            wordWrap: { width: 470 },
            lineSpacing: 8
        });

        this.hintText = this.scene.add.text(95, 360, 'LEFT / RIGHT to turn pages', {
            fontFamily: 'Special Elite',
            fontSize: '16px',
            color: '#7a5a3e'
        });
    }

    createButtons() {
        this.closeBtn = this.scene.add.text(675, -445, '×', {
            fontFamily: 'Arial',
            fontSize: '34px',
            color: '#3b2a1d',
            backgroundColor: '#d9b777',
            padding: { left: 10, right: 10, top: 6, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.prevBtn = this.scene.add.text(-545, 430, '< PREV', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#2f1d12',
            backgroundColor: '#d2b075',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        }).setInteractive({ useHandCursor: true });

        this.nextBtn = this.scene.add.text(470, 430, 'NEXT >', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#2f1d12',
            backgroundColor: '#d2b075',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        }).setInteractive({ useHandCursor: true });

        this.closeBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.close();
        });

        this.prevBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.previousPage();
        });

        this.nextBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.nextPage();
        });
    }

    createTabs() {
        const continents = [
            { id: 'Western Europe', short: 'WE' },
            { id: 'Central Europe', short: 'CE' },
            { id: 'North America', short: 'NA' },
            { id: 'South Asia', short: 'SA' }
        ];

        const startY = -280;
        const gap = 95;

        continents.forEach((continent, index) => {
            const tab = this.scene.add.text(715, startY + index * gap, continent.short, {
                fontFamily: 'Special Elite',
                fontSize: '18px',
                color: '#f7e7bf',
                backgroundColor: '#7b3f22',
                padding: { left: 10, right: 10, top: 16, bottom: 16 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            tab.continentId = continent.id;

            tab.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.jumpToContinent(continent.id);
            });

            this.tabs.push(tab);
        });
    }

    createSound() {
        if (this.scene.sound) {
            this.pageSound = this.scene.sound.add('pagesound', { volume: 0.45 });
        }
    }

    bindKeyboardShortcuts() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('A,LEFT,RIGHT');
        this.scene.input.keyboard.on('keydown-A', this.boundToggleHandler);
        this.scene.input.keyboard.on('keydown-LEFT', this.boundLeftHandler);
        this.scene.input.keyboard.on('keydown-RIGHT', this.boundRightHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping) return;

        event.preventDefault();
        this.toggle();
    }

    onLeftKeyDown(event) {
        if (!this.isOpen) return;
        event.preventDefault();
        this.previousPage();
    }

    onRightKeyDown(event) {
        if (!this.isOpen) return;
        event.preventDefault();
        this.nextPage();
    }

    getCurrentCountry() {
        if (!this.countries.length) return null;
        return this.countries[this.pageIndex];
    }

    openToCountry(countryIdOrName) {
        if (!this.countries?.length) {
            this.open();
            return;
        }

        const needle = String(countryIdOrName || '').trim().toLowerCase();

        const index = this.countries.findIndex(country =>
            String(country.id || '').toLowerCase() === needle ||
            String(country.name || '').toLowerCase() === needle
        );

        if (index >= 0) {
            this.pageIndex = index;
        }

        this.open();
    }

    refreshTabs(currentCountry) {
        this.tabs.forEach(tab => {
            const isActive = currentCountry && tab.continentId === currentCountry.region;

            tab.setStyle({
                color: isActive ? '#fff6d6' : '#f0d7a0',
                backgroundColor: isActive ? '#9a4d28' : '#7b3f22'
            });
        });
    }

    refreshPaperWear() {
        this.paperOverlays.forEach((overlay, index) => {
            overlay.setAlpha(0.025 + ((this.pageIndex + index) % 3) * 0.012);
            overlay.setAngle((this.pageIndex * 2 + index * 3) % 8 - 4);
        });
    }

    refreshPage() {
        const country = this.getCurrentCountry();

        if (!country) {
            this.leftPageImage.setTexture('atlas_fallback');
            this.fitImageInBox(
                this.leftPageImage,
                this.leftPageFrame.width,
                this.leftPageFrame.height
            );
            this.leftPageImage.setPosition(this.leftPageFrame.x, this.leftPageFrame.y);

            this.pageLeftNumber.setText('PAGE 00');
            this.pageRightLabel.setText('');
            this.caseStampText.setText('NO ENTRY');
            this.countryNameText.setText('Atlas');
            this.capitalText.setText('Capital: Unknown');
            this.regionText.setText('Region: Unknown');
            this.descriptionText.setText('No countries loaded.');
            this.knownForText.setText('');
            this.hintText.setText('LEFT / RIGHT to turn pages');
            return;
        }

        const mapKey = country.mapKey || 'atlas_fallback';

        if (this.scene.textures.exists(mapKey)) {
            this.leftPageImage.setTexture(mapKey);
        } else {
            this.leftPageImage.setTexture('atlas_fallback');
        }

        this.leftPageImage.setPosition(this.leftPageFrame.x, this.leftPageFrame.y);
        this.fitImageInBox(
            this.leftPageImage,
            this.leftPageFrame.width,
            this.leftPageFrame.height
        );

        this.pageLeftNumber.setText(`PAGE ${String(this.pageIndex + 1).padStart(2, '0')}`);
        this.pageRightLabel.setText('');
        this.caseStampText.setText(country.region ? country.region.toUpperCase() : 'UNKNOWN REGION');

        this.countryNameText.setText(country.name || 'UNKNOWN COUNTRY');
        this.capitalText.setText(`Capital: ${country.capital || 'Unknown'}`);
        this.regionText.setText(`Region: ${country.region || 'Unknown'}`);
        this.descriptionText.setText(country.description || 'No description available.');
        this.knownForText.setText(country.knownFor ? `Known for: ${country.knownFor}` : '');
        this.hintText.setText('LEFT / RIGHT to turn pages');

        this.refreshTabs(country);
        this.refreshPaperWear();
    }

    playPageTurnFX() {
        if (this.pageSound) {
            this.pageSound.stop();
            this.pageSound.play();
        }

        // Zapisujemy oryginalną pozycję/kąt książki, żeby tween wracał
        // do właściwego środka nawet po ewentualnym resize w trakcie animacji
        const baseX = this.book.x;
        const baseAngle = this.book.angle;

        this.scene.tweens.add({
            targets: this.book,
            x: baseX + 10,
            duration: 70,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => this.book.setX(baseX)
        });

        this.scene.tweens.add({
            targets: this.book,
            angle: baseAngle + 0.6,
            duration: 60,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => this.book.setAngle(baseAngle)
        });

        this.scene.tweens.add({
            targets: this.leftPageImage,
            alpha: 0.82,
            duration: 60,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    previousPage() {
        if (!this.countries.length) return;

        this.pageIndex = Phaser.Math.Wrap(this.pageIndex - 1, 0, this.countries.length);
        this.refreshPage();
        this.playPageTurnFX();
    }

    nextPage() {
        if (!this.countries.length) return;

        this.pageIndex = Phaser.Math.Wrap(this.pageIndex + 1, 0, this.countries.length);
        this.refreshPage();
        this.playPageTurnFX();
    }

    jumpToContinent(regionName) {
        const foundIndex = this.countries.findIndex(country => country.region === regionName);
        if (foundIndex === -1) return;

        this.pageIndex = foundIndex;
        this.refreshPage();
        this.playPageTurnFX();
    }

    open() {
        // Zawsze przelicz layout przed pokazaniem — na wypadek gdyby
        // resize okna nastąpił, gdy atlas był zamknięty
        this.layout();
        this.refreshPage();

        if (this.isOpen) return;
        this.isOpen = true;

        this.overlay.setVisible(true);
        this.book.setVisible(true);

        this.scene.tweens.add({
            targets: [this.overlay, this.book],
            alpha: 1,
            duration: 220,
            ease: 'Power2'
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.scene.tweens.add({
            targets: [this.overlay, this.book],
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.book.setVisible(false);
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    destroy() {
        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-A', this.boundToggleHandler);
            this.scene.input.keyboard.off('keydown-LEFT', this.boundLeftHandler);
            this.scene.input.keyboard.off('keydown-RIGHT', this.boundRightHandler);
        }

        if (this.scene.scale) {
            this.scene.scale.off('resize', this.boundResizeHandler);
        }

        this.book?.destroy(true);
        this.overlay?.destroy();

        this.overlay = null;
        this.book = null;
        this.bookBg = null;
        this.leftPageImage = null;
        this.pageLeftNumber = null;
        this.pageRightLabel = null;
        this.caseStampText = null;
        this.countryNameText = null;
        this.capitalText = null;
        this.regionText = null;
        this.descriptionText = null;
        this.knownForText = null;
        this.hintText = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;
        this.tabs = [];
        this.paperOverlays = [];
        this.pageSound = null;
        this.isOpen = false;
    }
}