export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloaderScene' });
    }

    preload() {
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();

        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(710, 500, 500, 50);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xFFFF00, 1);
            progressBar.fillRect(720, 510, 480 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
        });

        // sceny
        this.load.image('background', 'assets/start_1.jpg');
        this.load.image('background2', 'assets/start_2.jpg');
        this.load.image('backgroundset', 'assets/cabinet.jpg');
        this.load.image('backgroundgo', 'assets/GameOver.jpg');
        this.load.image('backgroundpc', 'assets/hiscores.png');
        this.load.image('backgroundhi', 'assets/office.jpg');
        this.load.image('bank', 'assets/bank.jpg');
        this.load.image('alley', 'assets/alley.jpg');
        this.load.image('airport', 'assets/airport.jpg');
        this.load.image('hotel_maid', 'assets/hotel_maid.jpg');
        this.load.image('map', 'assets/map.jpg');
        this.load.image('parking_bg', 'assets/parking.jpg');
        this.load.image('policehq', 'assets/police_hq.jpg');

        // miasta
        this.load.image('berlin', 'assets/Berlin.jpg');
        this.load.image('london', 'assets/London.jpg');
        this.load.image('newdelhi', 'assets/NewDelhi.jpg');
        this.load.image('nyc', 'assets/NYC.jpg');
        this.load.image('paris', 'assets/Paris.jpg');
        this.load.image('warsaw', 'assets/Warsaw.jpg');

        // osoby
        this.load.image('bakier', 'assets/bankier.png');
        this.load.image('bum', 'assets/bum.png');
        this.load.image('maid', 'assets/maid.png');
        this.load.image('parking_npc', 'assets/parking.png');
        this.load.image('police', 'assets/police.png');
        this.load.image('stewardessa', 'assets/stewardessa.png');

        // buttony
        this.load.image('btnStart', 'assets/start.png');
        this.load.image('back', 'assets/back.png');
        this.load.image('next', 'assets/next.png');
        this.load.image('btnExit', 'assets/exit.png');
        this.load.image('btnSettings', 'assets/settings.png');
        this.load.image('btnHiscore', 'assets/hiscore.png');
        this.load.image('atlas', 'assets/atlas.png');
        this.load.image('destination', 'assets/destination.png');
        this.load.image('plane', 'assets/plane.png');
        this.load.image('search', 'assets/search.png');

        // inne
        this.load.image('soundOn', 'assets/sound.png');
        this.load.image('soundOff', 'assets/nsound.png');

        // kontenery
        this.load.image('notes', 'assets/notes.png');
        this.load.image('file', 'assets/file.png');

        // muzyka
        this.load.audio('themeGame', 'assets/audio/game.mp3');

        // json
        this.load.json('suspects', 'assets/data/suspects.json');
        this.load.json('missions', 'assets/data/missions.json');
        this.load.json('locations', 'assets/data/locations.json');
        this.load.json('dialogues', 'assets/data/dialogues.json');
    }

    create() {
        const suspectsData = this.cache.json.get('suspects');
        const missionsData = this.cache.json.get('missions');

        const music = this.registry.get('bgMusic');

        this.input.once('pointerdown', () => {
            if (music && !music.isPlaying) {
                music.play();
            }
        });

        const startBtn = this.add.image(950, 420, 'btnStart').setInteractive();
        startBtn.setScale(0.8);

        this.addHoverEffect(startBtn);

        startBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    addHoverEffect(button) {
        button.on('pointerover', () => button.setScale(0.9));
        button.on('pointerout', () => button.setScale(0.8));
    }
}