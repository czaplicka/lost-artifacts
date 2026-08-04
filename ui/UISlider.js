export class UISlider {
    constructor(scene, x, y, width, label, initialValue, onChange) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.value = initialValue;
        this.onChange = onChange;
        this.enabled = true;

        const knobSize = 22;
        this.trackY = y + 38;

        this.labelText = scene.add.text(x, y, label, {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#e8d5a3'
        });

        this.valueText = scene.add.text(x + width, y, '', {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            color: '#c9a227'
        }).setOrigin(1, 0);

        this.track = scene.add.graphics();

        this.knob = scene.add.rectangle(
            x + initialValue * width,
            this.trackY,
            knobSize,
            knobSize,
            0xc9a227
        );
        this.knob.setStrokeStyle(2, 0x3a2a0e);
        this.knob.setInteractive({ useHandCursor: true });
        scene.input.setDraggable(this.knob);

        this.knob.on('dragstart', () => this.knob.setScale(1.2));
        this.knob.on('dragend', () => this.knob.setScale(1.0));
        this.knob.on('pointerover', () => this.knob.setScale(1.15));
        this.knob.on('pointerout', () => this.knob.setScale(1.0));

        this.knob.on('drag', (pointer, dragX) => {
            if (!this.enabled) return;
            this.knob.x = Phaser.Math.Clamp(dragX, this.x, this.x + this.width);
            this.updateValue();
        });

        const hitArea = scene.add.rectangle(
            x + width / 2,
            this.trackY,
            width + knobSize,
            30,
            0x000000,
            0
        );
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', (pointer) => {
            if (!this.enabled) return;
            this.knob.x = Phaser.Math.Clamp(pointer.worldX, this.x, this.x + this.width);
            this.updateValue();
        });

        this.draw();
        this.updateValueText();
    }

    updateValue() {
        this.value = (this.knob.x - this.x) / this.width;
        this.draw();
        this.updateValueText();
        if (this.onChange) this.onChange(this.value);
    }

    updateValueText() {
        this.valueText.setText(Math.round(this.value * 100) + '%');
    }

    draw() {
        this.track.clear();
        this.track.fillStyle(0x3a2a0e);
        this.track.fillRect(this.x, this.trackY - 4, this.width, 8);
        this.track.lineStyle(1, 0x8b6914);
        this.track.strokeRect(this.x, this.trackY - 4, this.width, 8);
        const filledWidth = this.value * this.width;
        this.track.fillStyle(0xc9a227);
        this.track.fillRect(this.x, this.trackY - 4, filledWidth, 8);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        const alpha = enabled ? 1 : 0.4;
        this.knob.setAlpha(alpha);
        this.track.setAlpha(alpha);
        this.labelText.setAlpha(alpha);
        this.valueText.setAlpha(alpha);
    }

    setValue(value) {
        this.value = Phaser.Math.Clamp(value, 0, 1);
        this.knob.x = this.x + this.value * this.width;
        this.draw();
        this.updateValueText();
    }

    destroy() {
        this.labelText.destroy();
        this.valueText.destroy();
        this.track.destroy();
        this.knob.destroy();
    }
}