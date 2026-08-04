export class UISlider {
    constructor(scene, x, y, width, label, initialValue, onChange) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.value = Phaser.Math.Clamp(initialValue, 0, 1);
        this.onChange = onChange;
        this.enabled = true;

        this.depthBase = 1000;

        const knobSize = 22;
        this.knobSize = knobSize;
        this.trackY = y + 38;

        this.labelText = scene.add.text(x, y, label, {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#e8d5a3'
        }).setDepth(this.depthBase + 1);

        this.valueText = scene.add.text(x + width, y, '', {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#c9a227'
        }).setOrigin(1, 0).setDepth(this.depthBase + 1);

        this.track = scene.add.graphics().setDepth(this.depthBase);

        this.knob = scene.add.rectangle(
            x + this.value * width,
            this.trackY,
            knobSize,
            knobSize,
            0xc9a227
        );
        this.knob.setStrokeStyle(2, 0x3a2a0e);
        this.knob.setInteractive({ useHandCursor: true });
        this.knob.setDepth(this.depthBase + 2);
        scene.input.setDraggable(this.knob);

        this.knob.on('dragstart', () => {
            if (!this.enabled) return;
            this.knob.setScale(1.2);
        });

        this.knob.on('dragend', () => {
            this.knob.setScale(1.0);
        });

        this.knob.on('pointerover', () => {
            if (!this.enabled) return;
            this.knob.setScale(1.15);
        });

        this.knob.on('pointerout', () => {
            this.knob.setScale(1.0);
        });

        this.knob.on('drag', (pointer, dragX) => {
            if (!this.enabled) return;
            this.knob.x = Phaser.Math.Clamp(dragX, this.x, this.x + this.width);
            this.updateValue(false);
        });

        this.hitArea = scene.add.rectangle(
            x + width / 2,
            this.trackY,
            width + knobSize,
            30,
            0x000000,
            0.0001
        );
        this.hitArea.setInteractive({ useHandCursor: true });
        this.hitArea.setDepth(this.depthBase - 1);

        this.hitArea.on('pointerdown', (pointer) => {
            if (!this.enabled) return;
            this.knob.x = Phaser.Math.Clamp(pointer.worldX, this.x, this.x + this.width);
            this.updateValue(false);
        });

        this.draw();
        this.updateValueText();
    }

    updateValue(callChange = true) {
        this.value = Phaser.Math.Clamp((this.knob.x - this.x) / this.width, 0, 1);
        this.draw();
        this.updateValueText();
        if (callChange && this.onChange) this.onChange(this.value);
        if (callChange && this.onChange) this.onChange(this.value);
    }

    updateValueText() {
        this.valueText.setText(Math.round(this.value * 100) + '%');
    }

    draw() {
        this.track.clear();
        this.track.fillStyle(0x3a2a0e, 1);
        this.track.fillRect(this.x, this.trackY - 4, this.width, 8);
        this.track.lineStyle(1, 0x8b6914, 1);
        this.track.strokeRect(this.x, this.trackY - 4, this.width, 8);

        const filledWidth = Math.max(0, this.value * this.width);
        this.track.fillStyle(0xc9a227, 1);
        this.track.fillRect(this.x, this.trackY - 4, filledWidth, 8);
    }

    setEnabled(enabled) {
        this.enabled = enabled;

        const alpha = enabled ? 1 : 0.65;
        this.knob.setAlpha(alpha);
        this.track.setAlpha(alpha);
        this.labelText.setAlpha(alpha);
        this.valueText.setAlpha(alpha);

        if (enabled) {
            this.knob.input.enabled = true;
            this.hitArea.input.enabled = true;
        } else {
            this.knob.input.enabled = false;
            this.hitArea.input.enabled = false;
        }
    }

    setValue(value) {
        this.value = Phaser.Math.Clamp(value, 0, 1);
        this.knob.x = this.x + this.value * this.width;
        this.draw();
        this.updateValueText();
    }

    destroy() {
        if (this.labelText) this.labelText.destroy();
        if (this.valueText) this.valueText.destroy();
        if (this.track) this.track.destroy();
        if (this.knob) this.knob.destroy();
        if (this.hitArea) this.hitArea.destroy();
    }
}