export class PlayerMenuUI {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.isOpen = false;
        this.isAnimating = false;

        const { width, height } = this.scene.scale;

        this.menuWidth = Math.min(900, width * 0.9);
        this.menuHeight = 150;

        this.closedY = height;
        this.openY = height - this.menuHeight;

        this.container = this.scene.add.container(width / 2, this.closedY).setDepth(40);

        const menuBg = this.scene.add.rectangle(0, this.menuHeight / 2, this.menuWidth, this.menuHeight, 0x222222, 0.9)
            .setStrokeStyle(4, 0x8b0000)
            .setInteractive();

        this.container.add(menuBg);

        this.toggleBtn = this.scene.add.rectangle(width / 2, height - 25, 200, 50, 0x8b0000)
            .setInteractive({ useHandCursor: true })
            .setDepth(41);

        this.toggleText = this.scene.add.text(width / 2, height - 25, 'MENU', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setDepth(42)
            .setInteractive({ useHandCursor: true });

        this.toggleBtn.on('pointerdown', () => this.toggle());
        this.toggleText.on('pointerdown', () => this.toggle());

        this.createMenuButtons();
    }

    createMenuButtons() {
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

            const btnIcon = this.scene.add.image(xPos, 50, btnData.key)
                .setInteractive({ useHandCursor: true })
                .setDisplaySize(60, 60);

            const btnLabel = this.scene.add.text(xPos, 110, btnData.label, {
                fontFamily: 'Special Elite',
                fontSize: '20px',
                color: '#ffffff'
            }).setOrigin(0.5);

            btnIcon.on('pointerover', () => {
                btnIcon.setTint(0xaaaaaa);
                btnLabel.setColor('#ffcc00');
            });

            btnIcon.on('pointerout', () => {
                btnIcon.clearTint();
                btnLabel.setColor('#ffffff');
            });

            btnIcon.on('pointerdown', () => {
                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }

                btnData.action();
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

        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });

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

        this.scene.tweens.add({
            targets: this.container,
            y: this.closedY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });

        this.scene.tweens.add({
            targets: [this.toggleBtn, this.toggleText],
            y: this.scene.scale.height - 25,
            duration: 300,
            ease: 'Power2'
        });
    }

    openCasefile() {
        if (!this.scene.caseFileUI) return;

        this.scene.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};
        const caseFileData = {
            artifact: mission.artifact,
            city: mission.city,
            country: mission.country,
            description: mission.description,
            significance: mission.significance,
            clue: mission.clue,
            artifactKey: mission.artifactKey
        };

        this.scene.caseFileUI.open(caseFileData);
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