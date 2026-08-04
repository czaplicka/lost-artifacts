import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { GameTimeManager } from '../GameTimeManager.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../AudioManager.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        this.dialogueText = null;
        this.fullIntroText = '';
        this.typingEvent = null;
        this.continueText = null;

        this.backgroundImage = null;
        this.currentVideo = null;
        this.currentVideoKey = null;
        this.currentAudio = null;
        this.handleResizeBound = null;

        this.hasStartedOfficeScene = false;
        this.sequenceStage = 'idle';
        this.sequenceFinished = false;
    }

    create() {
        audioManager.init(this);

        this.scene.wake('UIScene');
        this.timeManager = new GameTimeManager();

        EventBus.emit('advanceTime', 0, 0);

        const dialogueData = this.cache.json.get('dialogue');

        if (!gameState.currentMission || !gameState.currentThief) {
            console.error('GameScene started without initialized gameState.');
            this.scene.start('MenuScene');
            this.scene.launch('UIScene');
            return;
        }

        this.createBackground();

        const backBtn = this.add.image(200, 70, 'back')
            .setInteractive({ useHandCursor: true })
            .setScale(0.5)
            .setDepth(30);

        this.addHoverEffect(backBtn, 0.5, 0.6);
        backBtn.on('pointerdown', () => {
            this.closeAllUIPanels();
            this.destroyCurrentVideo();
            audioManager.stopAllVoice();
            this.scene.start('MenuScene');
        });

        this.createDetectiveSection();
        ensureHud(this);

        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }

        if (!dialogueData || !Array.isArray(dialogueData.gameIntro)) {
            console.error('Brak dialogue.gameIntro w dialogue.json');
            this.dialogueText.setText('Brak intro sprawy.');
            return;
        }

        this.fullIntroText = dialogueData.gameIntro.join('\n');
        this.startIntroSequence();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.typingEvent) {
                this.typingEvent.remove(false);
                this.typingEvent = null;
            }

            this.destroyCurrentVideo();

            if (this.handleResizeBound) {
                this.scale.off('resize', this.handleResizeBound, this);
                this.handleResizeBound = null;
            }
        });
    }

    createBackground() {
        if (this.textures.exists('start_2')) {
            this.backgroundImage = this.add.image(
                this.scale.width / 2,
                this.scale.height / 2,
                'start_2'
            ).setDepth(0);

            this.resizeBackgroundImage();
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        this.handleResizeBound = this.handleResize.bind(this);
        this.scale.on('resize', this.handleResizeBound, this);
    }

    resizeBackgroundImage() {
        if (!this.backgroundImage) return;

        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        const scale = Math.max(
            gameWidth / this.backgroundImage.width,
            gameHeight / this.backgroundImage.height
        );

        this.backgroundImage
            .setPosition(gameWidth / 2, gameHeight / 2)
            .setScale(scale);
    }

    createDetectiveSection() {
        const dialogueBox = this.add.graphics();
        dialogueBox.fillStyle(0x000000, 0.72);
        dialogueBox.fillRoundedRect(90, 720, 1580, 260, 20);
        dialogueBox.lineStyle(4, 0xffff00, 1);
        dialogueBox.strokeRoundedRect(90, 720, 1580, 260, 20);
        dialogueBox.setDepth(20);

        this.dialogueText = this.add.text(140, 748, '', {
            fontFamily: 'PressStart2P',
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 1480 },
            lineSpacing: 14
        }).setDepth(21);

        this.continueText = this.add.text(1180, 920, '', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#ffff99'
        }).setOrigin(1, 1).setDepth(21);
    }

    startIntroSequence() {
        this.sequenceStage = 'video1';
        this.sequenceFinished = false;

        this.playVideo('detectiveIntro', 'detective-intro', () => {
            this.finishSequence();
        });

        this.typeText(this.dialogueText, this.fullIntroText, 24);
    }

    finishSequence() {
        if (this.sequenceFinished) return;
        this.sequenceFinished = true;
        this.sequenceStage = 'done';

        this.destroyCurrentVideo();
        this.goToOfficeScene();
    }

    playVideo(videoKey, audioKey, onComplete) {
        const hasVideo = this.cache.video.exists(videoKey);
        const hasAudio = !!audioKey && this.cache.audio.exists(audioKey);

        if (!hasVideo && !hasAudio) {
            console.warn(`Brak video i audio dla sekwencji: ${videoKey} / ${audioKey}`);
            onComplete?.();
            return;
        }

        this.destroyCurrentVideo();

        let audioFinished = !hasAudio;
        let videoFinished = !hasVideo;

        const tryComplete = () => {
            if (audioFinished && videoFinished) {
                this.destroyCurrentVideo();
                onComplete?.();
            }
        };

        if (hasAudio) {
            this.currentAudio = audioManager.playVoice(audioKey);

            if (this.currentAudio) {
                this.currentAudio.once('complete', () => {
                    if (this.currentAudio) {
                        audioFinished = true;
                        tryComplete();
                    }
                });

                this.currentAudio.once('stop', () => {
                    audioFinished = true;
                    tryComplete();
                });
            } else {
                audioFinished = true;
            }
        }

        if (!hasVideo) {
            tryComplete();
            return;
        }

        const video = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            videoKey
        )
            .setOrigin(0.5)
            .setDepth(5)
            .setVisible(true)
            .setAlpha(1);

        this.currentVideo = video;
        this.currentVideoKey = videoKey;

        video.once('textureready', () => {
            if (this.currentVideo === video) {
                this.resizeVideoCover(video);
            }
        });

        video.once('playing', () => {
            if (this.currentVideo === video) {
                this.resizeVideoCover(video);
            }
        });

        video.once('complete', () => {
            if (this.currentVideo !== video) return;
            videoFinished = true;
            tryComplete();
        });

        video.on('error', (videoObject, error) => {
            console.error(`${videoKey} video error:`, error);
            if (this.currentVideo === video) {
                videoFinished = true;
                tryComplete();
            }
        });

        video.on('unsupported', (videoObject, error) => {
            console.error(`${videoKey} video unsupported:`, error);
            if (this.currentVideo === video) {
                videoFinished = true;
                tryComplete();
            }
        });

        video.play(false);
    }

    resizeVideoCover(video) {
        if (!video || !video.scene) return;

        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        const videoWidth = video.video?.videoWidth || video.width || 1;
        const videoHeight = video.video?.videoHeight || video.height || 1;

        const scale = Math.max(
            gameWidth / videoWidth,
            gameHeight / videoHeight
        );

        video
            .setPosition(gameWidth / 2, gameHeight / 2)
            .setScale(scale);
    }

    destroyCurrentVideo() {
        if (this.currentAudio) {
            const sound = this.currentAudio;
            this.currentAudio = null;

            if (sound.isPlaying) {
                sound.stop();
            }

            if (!sound.pendingRemove) {
                sound.destroy();
            }
        }

        if (!this.currentVideo) return;

        const video = this.currentVideo;
        this.currentVideo = null;
        this.currentVideoKey = null;

        if (video.scene) {
            video.setVisible(false);
            video.setAlpha(0);
            video.stop();
            video.destroy();
        }
    }

    typeText(target, text, speed = 15) {
        if (!target || typeof text !== 'string') return;

        if (this.typingEvent) {
            this.typingEvent.remove(false);
            this.typingEvent = null;
        }

        this.continueText?.setText('');
        target.setText('');

        let index = 0;

        this.typingEvent = this.time.addEvent({
            delay: speed,
            repeat: text.length - 1,
            callback: () => {
                target.setText(text.slice(0, index + 1));
                index++;

                if (index >= text.length) {
                    this.typingEvent = null;
                }
            }
        });
    }

    closeAllUIPanels() {
        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    handleResize() {
        if (this.backgroundImage) {
            this.resizeBackgroundImage();
        }

        if (this.currentVideo && this.currentVideo.scene) {
            this.resizeVideoCover(this.currentVideo);
        }
    }

    goToOfficeScene() {
        if (this.hasStartedOfficeScene) return;
        this.hasStartedOfficeScene = true;

        this.closeAllUIPanels();
        this.destroyCurrentVideo();

        this.cameras.main.fadeOut(350, 0, 0, 0);

        this.time.delayedCall(360, () => {
            this.scene.start('OfficeScene', { gameState });
        });
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}