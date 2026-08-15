export class DialogUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.lines = [];
        this.currentLineIndex = 0;
        this.typewriterTimer = null;
        this.isTyping = false;
        this.destroyed = false;
        this.choices = [];
        this.onClose = null;

        this.overlay = null;
        this.container = null;
        this.speakerText = null;
        this.bodyText = null;
        this.portraitImage = null;
        this.nextHint = null;
        this.choiceContainer = null;

        this.nextHintTween = null;

        this.boundHandleSceneShutdown = this.destroy.bind(this);

        this.create();
        this.bindSceneLifecycle();
    }

    bindSceneLifecycle() {
        if (!this.scene?.events) return;

        this.scene.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.boundHandleSceneShutdown
        );

        this.scene.events.once(
            Phaser.Scenes.Events.DESTROY,
            this.boundHandleSceneShutdown
        );
    }

    unbindSceneLifecycle() {
        if (!this.scene?.events) return;

        this.scene.events.off(
            Phaser.Scenes.Events.SHUTDOWN,
            this.boundHandleSceneShutdown
        );

        this.scene.events.off(
            Phaser.Scenes.Events.DESTROY,
            this.boundHandleSceneShutdown
        );
    }

    create() {
        const { width, height } = this.scene.scale;
        const boxWidth = Math.min(900, width * 0.8);
        const boxHeight = 260;

        this.overlay = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.5
        )
            .setDepth(30)
            .setAlpha(0)
            .setVisible(false)
            .setInteractive();

        this.overlay.on('pointerdown', () => {
            this.advance();
        });

        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xf0e6d2, 1);
        graphics.fillRoundedRect(
            -boxWidth / 2,
            -boxHeight / 2,
            boxWidth,
            boxHeight,
            10
        );
        graphics.lineStyle(4, 0x2b1e18, 1);
        graphics.strokeRoundedRect(
            -boxWidth / 2,
            -boxHeight / 2,
            boxWidth,
            boxHeight,
            10
        );

        this.portraitImage = this.scene.add.image(
            -boxWidth / 2 + 90,
            0,
            'portrait_fallback'
        ).setDisplaySize(140, 140);

        this.speakerText = this.scene.add.text(
            -boxWidth / 2 + 180,
            -boxHeight / 2 + 25,
            '',
            {
                fontFamily: 'PressStart2P',
                fontSize: '18px',
                color: '#2b1e18'
            }
        );

        this.bodyText = this.scene.add.text(
            -boxWidth / 2 + 180,
            -boxHeight / 2 + 65,
            '',
            {
                fontFamily: 'Special Elite',
                fontSize: '22px',
                color: '#1a1a1a',
                wordWrap: { width: boxWidth - 220 },
                lineSpacing: 8
            }
        );

        this.nextHint = this.scene.add.text(
            boxWidth / 2 - 30,
            boxHeight / 2 - 30,
            '▼',
            {
                fontFamily: 'PressStart2P',
                fontSize: '20px',
                color: '#8a1f1f'
            }
        )
            .setOrigin(0.5)
            .setAlpha(0);

        this.nextHintTween = this.scene.tweens.add({
            targets: this.nextHint,
            y: '+=6',
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.choiceContainer = this.scene.add.container(0, 0);

        this.container = this.scene.add.container(width / 2, height - 220, [
            graphics,
            this.portraitImage,
            this.speakerText,
            this.bodyText,
            this.nextHint,
            this.choiceContainer
        ]);

        this.container.setDepth(31);
        this.container.setAlpha(0);
        this.container.setVisible(false);
    }

    open(entry, options = {}) {
        if (this.destroyed) return;

        this.clearChoices();

        this.lines = entry.lines || [];
        this.currentLineIndex = 0;
        this.choices = options.choices || entry.choices || [];
        this.onClose = typeof options.onClose === 'function'
            ? options.onClose
            : null;

        this.speakerText.setText(entry.speaker || 'Unknown');

        if (entry.portraitKey && this.scene.textures.exists(entry.portraitKey)) {
            this.portraitImage.setTexture(entry.portraitKey);
        } else {
            this.portraitImage.setTexture('portrait_fallback');
        }

        this.isOpen = true;
        this.overlay.setVisible(true);
        this.container.setVisible(true);

        this.scene.tweens.killTweensOf([this.overlay, this.container]);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 1,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                if (this.destroyed) return;
                this.showLine(this.currentLineIndex);
            }
        });
    }

    showLine(index) {
        if (index >= this.lines.length) {
            if (this.choices.length > 0) {
                this.showChoices();
            } else {
                this.close();
            }

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
            this.typewriterTimer = null;
        }

        this.typewriterTimer = this.scene.time.addEvent({
            delay: speedMs,
            loop: true,
            callback: () => {
                if (visibleText.length >= message.length) {
                    this.typewriterTimer?.destroy();
                    this.typewriterTimer = null;
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
        if (!this.isOpen || this.choiceContainer.list.length > 0) return;

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
            this.typewriterTimer = null;
        }

        this.bodyText.setText(this.lines[this.currentLineIndex] || '');
        this.isTyping = false;
        this.nextHint.setAlpha(1);
    }

    showChoices() {
        this.nextHint.setAlpha(0);
        this.bodyText.setText('Choose an option:');

        const buttonWidth = 330;
        const buttonHeight = 42;
        const startY = 35;
        const spacing = 52;

        this.choices.forEach((choice, index) => {
            const y = startY + index * spacing;

            const buttonBg = this.scene.add.rectangle(
                0,
                y,
                buttonWidth,
                buttonHeight,
                0x2b1e18,
                1
            )
                .setOrigin(0.5)
                .setStrokeStyle(2, 0x8a1f1f, 1)
                .setInteractive({ useHandCursor: true });

            const buttonText = this.scene.add.text(
                0,
                y,
                choice.text || 'CONTINUE',
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '12px',
                    color: '#f0e6d2',
                    align: 'center',
                    wordWrap: { width: buttonWidth - 22 }
                }
            ).setOrigin(0.5);

            buttonBg.on('pointerover', () => {
                buttonBg.setFillStyle(0x8a1f1f, 1);
            });

            buttonBg.on('pointerout', () => {
                buttonBg.setFillStyle(0x2b1e18, 1);
            });

            buttonBg.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();

                this.selectChoice(choice);
            });

            this.choiceContainer.add([buttonBg, buttonText]);
        });
    }

    selectChoice(choice) {
        if (!this.isOpen) return;

        const callback = choice?.callback;
        this.choices = [];
        this.clearChoices();
        this.close();

        if (typeof callback === 'function') {
            callback();
        }
    }

    clearChoices() {
        if (!this.choiceContainer) return;

        this.choiceContainer.removeAll(true);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.choices = [];
        this.clearChoices();

        if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
        }

        const callback = this.onClose;
        this.onClose = null;

        this.scene.tweens.killTweensOf([this.overlay, this.container]);

        this.scene.tweens.add({
            targets: [this.overlay, this.container],
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                this.overlay?.setVisible(false);
                this.container?.setVisible(false);

                if (typeof callback === 'function') {
                    callback();
                }
            }
        });
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.isOpen = false;
        this.choices = [];
        this.onClose = null;

        this.unbindSceneLifecycle();

        if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
        }

        if (this.nextHintTween) {
            this.nextHintTween.stop();
            this.nextHintTween.remove();
            this.nextHintTween = null;
        }

        if (this.scene?.tweens) {
            if (this.overlay) this.scene.tweens.killTweensOf(this.overlay);
            if (this.container) this.scene.tweens.killTweensOf(this.container);
            if (this.nextHint) this.scene.tweens.killTweensOf(this.nextHint);
        }

        this.clearChoices();

        this.container?.destroy(true);
        this.overlay?.destroy();

        this.container = null;
        this.overlay = null;
        this.speakerText = null;
        this.bodyText = null;
        this.portraitImage = null;
        this.nextHint = null;
        this.choiceContainer = null;
    }
}