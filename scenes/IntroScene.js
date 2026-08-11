import { BaseScene } from './BaseScene.js';

const FONT_PIXEL = '"Press Start 2P"';
const FONT_TYPE = '"Special Elite"';

const BEATS = [
    { at: 600,  run: 'showLogo' },
    { at: 2300, run: 'flashcards' },
    { at: 3900, run: 'showTagline1' },
    { at: 5500, run: 'showTagline2' },
    { at: 7100, run: 'stampHiring' },
    { at: 8600, run: 'finish' }
];

export class IntroScene extends BaseScene {
    create() {
        super.create();
        this.finished = false;
        this.staticOn = true;

        this.cameras.main.setBackgroundColor('#0a0a0a');
        this.noise = this.add.graphics();

        this.skipHint = this.add.text(
            this.scale.width - 16, this.scale.height - 12,
            'CLICK TO SKIP',
            { fontFamily: FONT_PIXEL, fontSize: '10px', color: '#666655' }
        ).setOrigin(1, 1);
        this.tweens.add({
            targets: this.skipHint, alpha: 0.2,
            duration: 500, yoyo: true, repeat: -1
        });

        BEATS.forEach(b =>
            this.time.delayedCall(b.at, () => this[b.run] && this[b.run]())
        );
        this.time.delayedCall(700, () => {
            this.staticOn = false;
            this.noise.clear();
        });

        this.input.keyboard.on('keydown', () => this.skip());
        this.input.on('pointerdown', () => this.skip());
    }

    update() {
        if (!this.staticOn) return;
        const g = this.noise;
        g.clear();
        for (let i = 0; i < 120; i++) {
            g.fillStyle(0xffffff, Math.random() * 0.08);
            g.fillRect(
                Math.random() * this.scale.width,
                Math.random() * this.scale.height, 2, 2
            );
        }
    }

    playSfx(key) {
        if (this.cache.audio.exists(key)) this.sound.play(key);
    }

    showLogo() {
        const t = this.add.text(
            this.scale.width / 2, this.scale.height / 2 - 40,
            'MARK AGENCY',
            { fontFamily: FONT_PIXEL, fontSize: '42px', color: '#e8e0c8' }
        ).setOrigin(0.5).setScale(3).setAlpha(0);
        this.tweens.add({
            targets: t, scale: 1, alpha: 1,
            duration: 220, ease: 'Back.easeOut'
        });
        this.cameras.main.shake(150, 0.01);
        this.playSfx('sfx_stamp');
    }

    flashcards() {
        const cards = [
            'STOLEN: Golden Idol',
            'STOLEN: Jade Mask',
            'STOLEN: Your Monday'
        ];
        cards.forEach((label, i) => {
            this.time.delayedCall(i * 420, () => {
                const card = this.add.container(
                    this.scale.width / 2, this.scale.height / 2 + 60
                );
                const bg = this.add.rectangle(0, 0, 420, 60, 0xe8e0c8)
                    .setStrokeStyle(3, 0x1a1a1a);
                const txt = this.add.text(0, 0, label, {
                    fontFamily: FONT_TYPE, fontSize: '26px', color: '#1a1a1a'
                }).setOrigin(0.5);
                card.add([bg, txt]);
                card.setAngle(Phaser.Math.Between(-4, 4));
                this.cameras.main.flash(80, 255, 255, 255);
                this.playSfx('sfx_shutter');
                this.time.delayedCall(340, () => card.destroy());
            });
        });
    }

    typewrite(text, y) {
        const t = this.add.text(this.scale.width / 2, y, '', {
            fontFamily: FONT_TYPE, fontSize: '30px', color: '#c9c2a8'
        }).setOrigin(0.5);
        let i = 0;
        this.time.addEvent({
            delay: 35,
            repeat: text.length - 1,
            callback: () => t.setText(text.slice(0, ++i))
        });
    }

    showTagline1() {
        this.typewrite('We find what others lose.', this.scale.height / 2 + 150);
    }

    showTagline2() {
        this.typewrite('Sometimes before they lose it.', this.scale.height / 2 + 195);
    }

    stampHiring() {
        const t = this.add.text(
            this.scale.width / 2, this.scale.height / 2 - 40,
            'NOW HIRING',
            { fontFamily: FONT_PIXEL, fontSize: '36px', color: '#c0392b' }
        ).setOrigin(0.5).setAngle(-12).setScale(4).setAlpha(0);
        this.tweens.add({
            targets: t, scale: 1, alpha: 0.95,
            duration: 180, ease: 'Quad.easeIn'
        });
        this.cameras.main.shake(200, 0.015);
        this.playSfx('sfx_stamp');
    }

    skip() {
        if (this.finished) return;
        this.time.removeAllEvents();
        this.finish(true);
    }

    finish(instant = false) {
        if (this.finished) return;
        this.finished = true;
        this.staticOn = false;
        if (instant) {
            this.scene.start('CharacterCreationScene', { fromIntro: true });
            return;
        }
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CharacterCreationScene', { fromIntro: true });
        });
    }
}