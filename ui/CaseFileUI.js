export class CaseFileUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isAnimating = false;
        this.overlay = null;
        this.container = null;
        this.currentData = null;

        this.artifactText = null;
        this.cityText = null;
        this.descText = null;
        this.significanceText = null;
        this.tiesText = null;
        this.artifactImage = null;

        this.boundToggleHandler = this.onToggleKeyDown.bind(this);

        this.create();
    }

    create() {
        const { width, height } = this.scene.scale;

        this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
            .setDepth(20)
            .setAlpha(0)
            .setVisible(false)
            .setInteractive();

        this.overlay.on('pointerdown', () => {
            this.close();
        });

        const fileBg = this.scene.add.image(0, 0, 'file')
            .setOrigin(0.5)
            .setScale(0.9)
            .setInteractive();

        const closeHint = this.scene.add.text(670, -445, 'X', {
            fontFamily: 'PressStart2P',
            fontSize: '50px',
            color: '#22222200'
        }).setInteractive({ useHandCursor: true });

        closeHint.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.close();
        });

        this.artifactImage = this.scene.add.image(-330, -70, 'artifact_fallback')
            .setDisplaySize(350, 350);

        this.artifactText = this.scene.add.text(-385, 295, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 250 },
            lineSpacing: 10
        }).setOrigin(0.5, 0);

        this.cityText = this.scene.add.text(90, -220, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 430 }
        });

        this.descText = this.scene.add.text(90, -110, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 500 },
            lineSpacing: 8
        });

        this.significanceText = this.scene.add.text(90, 120, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#000000',
            wordWrap: { width: 550 },
            lineSpacing: 8
        });

        this.tiesText = this.scene.add.text(90, 275, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#000000',
            wordWrap: { width: 430 },
            lineSpacing: 10
        });

        this.container = this.scene.add.container(width / 2, height / 2, [
            fileBg,
            closeHint,
            this.artifactImage,
            this.artifactText,
            this.cityText,
            this.descText,
            this.significanceText,
            this.tiesText
        ]);

        this.container.setDepth(21);
        this.container.setScale(0.92);
        this.container.setAlpha(0);
        this.container.setVisible(false);

        this.bindKeyboardShortcut();
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('F');
        this.scene.input.keyboard.on('keydown-F', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping || this.isAnimating) return;

        event.preventDefault();
        event.stopPropagation?.();

        const missionData = this.getMissionData();
        this.toggle(missionData);
    }

    getMissionData() {
        const mission =
            this.scene.gameState?.currentMission ||
            this.scene.currentMission ||
            null;

        if (!mission) {
            return this.currentData || {
                artifact: 'UNKNOWN ARTIFACT',
                city: '',
                country: '',
                description: 'No more data...',
                significance: '',
                clue: 'No more clues...',
                artifactKey: 'artifact_fallback'
            };
        }

        return {
            artifact: mission.artifact || 'UNKNOWN ARTIFACT',
            city: mission.city || '',
            country: mission.country || '',
            description: mission.description || 'No more data...',
            significance: mission.significance || mission.signifance || '',
            clue: mission.clue || 'No more clues...',
            artifactKey: mission.artifactKey || 'artifact_fallback'
        };
    }

    update(data = {}) {
        this.currentData = data;

        this.artifactText.setText(data.artifact || 'UNKNOWN ARTIFACT');

        const locationText =
            data.city && data.country
                ? `${data.city}, ${data.country}`
                : 'UNKNOWN LOCATION';

        this.cityText.setText(locationText);
        this.descText.setText(data.description || 'No more data...');
        this.significanceText.setText(data.significance || data.signifance || '');
        this.tiesText.setText(data.clue || 'No more clues...');

        const textureKey =
            data.artifactKey && this.scene.textures.exists(data.artifactKey)
                ? data.artifactKey
                : 'artifact_fallback';

        if (textureKey === 'artifact_fallback' && data.artifactKey && !this.scene.textures.exists(data.artifactKey)) {
            console.warn(`Brak tekstury artefaktu: "${data.artifactKey}". Użyto fallbacku.`);
        }

        this.artifactImage.setTexture(textureKey);
        this.artifactImage.setDisplaySize(350, 350);

        console.log('caseFile data:', data);
        console.log('resolved textureKey:', textureKey);
        console.log('all textures:', this.scene.textures.getTextureKeys());
    }

    open(data = null) {
        if (this.isAnimating) return;

        const resolvedData = data || this.currentData || this.getMissionData();
        this.update(resolvedData);

        if (this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = true;

        this.overlay.setVisible(true);
        this.container.setVisible(true);

        this.scene.tweens.killTweensOf([this.overlay, this.container]);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 1,
            duration: 220,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });
    }

    close() {
        if (!this.isOpen || this.isAnimating) return;

        this.isAnimating = true;
        this.isOpen = false;

        this.scene.tweens.killTweensOf([this.overlay, this.container]);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.container.setVisible(false);
                this.isAnimating = false;
            }
        });
    }

    toggle(data = null) {
        if (this.isAnimating) return;

        if (this.isOpen) {
            this.close();
        } else {
            this.open(data);
        }
    }

    destroy() {
        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-F', this.boundToggleHandler);
            this.scene.input.keyboard.removeCapture('F');
        }

        this.scene.tweens.killTweensOf([this.overlay, this.container]);

        this.container?.destroy(true);
        this.overlay?.destroy();

        this.container = null;
        this.overlay = null;
        this.artifactImage = null;
        this.artifactText = null;
        this.cityText = null;
        this.descText = null;
        this.significanceText = null;
        this.tiesText = null;
        this.currentData = null;
        this.isOpen = false;
        this.isAnimating = false;
    }
}