export class CaseFileUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.overlay = null;
        this.container = null;

        this.artifactText = null;
        this.cityText = null;
        this.descText = null;
        this.significanceText = null;
        this.tiesText = null;
        this.artifactImage = null;

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

        const closeHint = this.scene.add.text(700, -465, 'X', {
            fontFamily: 'PressStart2P',
            fontSize: '40px',
            color: '#22222200'
        }).setInteractive({ useHandCursor: true });

        closeHint.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.close();
        });

        this.artifactImage = this.scene.add.image(-400, -70, 'artifact_fallback')
            .setDisplaySize(250, 250);

        this.artifactText = this.scene.add.text(-420, 335, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 250 },
            lineSpacing: 10
        }).setOrigin(0.5, 0);

        this.cityText = this.scene.add.text(75, -220, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 430 }
        });

        this.descText = this.scene.add.text(75, -110, '', {
            fontFamily: 'Special Elite',
            fontSize: '24px',
            color: '#000000',
            wordWrap: { width: 500 },
            lineSpacing: 8
        });

        this.significanceText = this.scene.add.text(75, 133, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#000000',
            wordWrap: { width: 550 },
            lineSpacing: 8
        });

        this.tiesText = this.scene.add.text(75, 305, '', {
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
    }

    update(data = {}) {
        this.artifactText.setText(data.artifact || 'UNKNOWN ARTIFACT');

        const locationText =
            data.city && data.country
                ? `${data.city}, ${data.country}`
                : 'UNKNOWN LOCATION';

        this.cityText.setText(locationText);
        this.descText.setText(data.description || 'No more data...');
        this.significanceText.setText(data.significance || data.signifance || '');
        this.tiesText.setText(data.clue || 'No more clues...');

        if (data.artifactKey) {
            if (this.scene.textures.exists(data.artifactKey)) {
                this.artifactImage.setTexture(data.artifactKey);
            } else {
                console.warn(`Brak tekstury artefaktu: "${data.artifactKey}". Użyto fallbacku.`);
                this.artifactImage.setTexture('artifact_fallback');
            }
        } else {
            this.artifactImage.setTexture('artifact_fallback');
        }
    }

    open(data = null) {
        if (data) {
            this.update(data);
        }

        if (this.isOpen) return;
        this.isOpen = true;

        this.overlay.setVisible(true);
        this.container.setVisible(true);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 1,
            duration: 220,
            ease: 'Power2'
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.container.setVisible(false);
            }
        });
    }

    toggle(data = null) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(data);
        }
    }
}