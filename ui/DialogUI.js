export class DialogUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.lines = [];
        this.currentLineIndex = 0;
        this.typewriterTimer = null;
        this.isTyping = false;

        this.overlay = null;
        this.container = null;
        this.speakerText = null;
        this.bodyText = null;
        this.portraitImage = null;
        this.nextHint = null;

        this.create();
    }

    create() {
        const { width, height } = this.scene.scale;

        this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setDepth(30)
            .setAlpha(0)
            .setVisible(false)
            .setInteractive();

        this.overlay.on('pointerdown', () => {
            this.advance();
        });

        const boxWidth = Math.min(900, width * 0.8);
        const boxHeight = 260;

        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xf0e6d2, 1);
        graphics.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 10);
        graphics.lineStyle(4, 0x2b1e18, 1);
        graphics.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 10);

        this.portraitImage = this.scene.add.image(-boxWidth / 2 + 90, 0, 'portrait_fallback')
            .setDisplaySize(140, 140);

        this.speakerText = this.scene.add.text(-boxWidth / 2 + 180, -boxHeight / 2 + 25, '', {
            fontFamily: 'PressStart2P',
            fontSize: '18px',
            color: '#2b1e18'
        });

        this.bodyText = this.scene.add.text(-boxWidth / 2 + 180, -boxHeight / 2 + 65, '', {
            fontFamily: 'Special Elite',
            fontSize: '22px',
            color: '#1a1a1a',
            wordWrap: { width: boxWidth - 220 },
            lineSpacing: 8
        });

        this.nextHint = this.scene.add.text(boxWidth / 2 - 30, boxHeight / 2 - 30, '▼', {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            color: '#8a1f1f'
        }).setOrigin(0.5).setAlpha(0);

        this.scene.tweens.add({
            targets: this.nextHint,
            y: '+=6',
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.container = this.scene.add.container(width / 2, height - 220, [
            graphics,
            this.portraitImage,
            this.speakerText,
            this.bodyText,
            this.nextHint
        ]);

        this.container.setDepth(31);
        this.container.setAlpha(0);
        this.container.setVisible(false);
    }

    open(entry) {
        this.lines = entry.lines || [];
        this.currentLineIndex = 0;

        this.speakerText.setText(entry.speaker || 'Unknown');

        if (entry.portraitKey && this.scene.textures.exists(entry.portraitKey)) {
            this.portraitImage.setTexture(entry.portraitKey);
        } else {
            this.portraitImage.setTexture('portrait_fallback');
        }

        this.isOpen = true;
        this.overlay.setVisible(true);
        this.container.setVisible(true);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 1,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.showLine(this.currentLineIndex);
            }
        });
    }

    showLine(index) {
        if (index >= this.lines.length) {
            this.close();
            return;
        }

        this.nextHint.setAlpha(0);
        this.typewriteText(this.lines[index]);
    }

    typewriteText(message, speedMs = 22) {
        this.isTyping = true;
        this.bodyText.setText('');

        let visibleText = '';
        const invisiblePad = message.replace(/[^ ]/g, ' ');

        if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
        }

        this.typewriterTimer = this.scene.time.addEvent({
            delay: speedMs,
            loop: true,
            callback: () => {
                if (visibleText.length >= message.length) {
                    this.typewriterTimer.destroy();
                    this.isTyping = false;
                    this.nextHint.setAlpha(1);
                    return;
                }

                visibleText += message[visibleText.length];
                const remaining = invisiblePad.substring(visibleText.length);
                this.bodyText.setText(visibleText + remaining);
            }
        });
    }

    advance() {
        if (!this.isOpen) return;

        if (this.isTyping) {
            this.skipTypewriter();
            return;
        }

        this.currentLineIndex += 1;
        this.showLine(this.currentLineIndex);
    }

    skipTypewriter() {
        if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
        }
        this.bodyText.setText(this.lines[this.currentLineIndex]);
        this.isTyping = false;
        this.nextHint.setAlpha(1);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
        }

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

    destroy() {
        this.close();
        this.container?.destroy(true);
        this.overlay?.destroy();
    }
}