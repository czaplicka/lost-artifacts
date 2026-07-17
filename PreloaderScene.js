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
        this.load.image('parking_bg', 'assets/parking.jpg');
        this.load.image('policehq', 'assets/police_hq.jpg');

        this.load.image('berlin', 'assets/Berlin.jpg');
        this.load.image('london', 'assets/London.jpg');
        this.load.image('newdelhi', 'assets/NewDelhi.jpg');
        this.load.image('newyorkcity', 'assets/NYC.jpg');
        this.load.image('paris', 'assets/Paris.jpg');
        this.load.image('warsaw', 'assets/Warsaw.jpg');

        this.load.image('bakier', 'assets/bankier.png');
        this.load.image('bum', 'assets/bum.png');
        this.load.image('maid', 'assets/maid.png');
        this.load.image('parking_npc', 'assets/parkingowy.png');
        this.load.image('police', 'assets/police.png');
        this.load.image('stewardessa', 'assets/stewardessa.png');

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
        this.load.image('filebutt', 'assets/filebutt.png');

        this.load.image('artifact_crown_jewels', 'assets/artifacts/crown_jewels.png');
        this.load.image('artifact_amber_necklace', 'assets/artifacts/amber_necklace.png');
        this.load.image('artifact_liberty_torch', 'assets/artifacts/liberty_torch.png');
        this.load.image('artifact_mona_lisa', 'assets/artifacts/mona_lisa.png');
        this.load.image('artifact_mughal_dagger', 'assets/artifacts/mughal_dagger.png');
        this.load.image('artifact_prussian_seal', 'assets/artifacts/prussian_seal.png');
        this.load.image('artifact_fallback', 'assets/artifacts/artifact_unknown.png');
    
        this.load.image('soundOn', 'assets/sound.png');
        this.load.image('soundOff', 'assets/nsound.png');

        this.load.image('notes', 'assets/notes.png');
        this.load.image('file', 'assets/file.png');
        this.load.image('mapbg', 'assets/map.png');

        this.load.image('portrait_garrett_gutter', 'assets/suspects/garrett_gutter.jpg');
        this.load.image('portrait_sofia_vargas', 'assets/suspects/sofia_vargas.png');
        this.load.image('portrait_bert_goodman', 'assets/suspects/bert_goodman.png');
        this.load.image('portrait_anne_apple', 'assets/suspects/anne_apple.png');
        this.load.image('portrait_frank_groot', 'assets/suspects/frank_groot.png');
        this.load.image('portrait_bernard_porter', 'assets/suspects/bernard_porter.png');
        this.load.image('portrait_rebecca_muller', 'assets/suspects/rebecca_muller.png');
        this.load.image('portrait_jacek_kowalski', 'assets/suspects/jacek_kowalski.png');
        this.load.image('portrait_pablo_fernandez', 'assets/suspects/pablo_fernandez.png');
        this.load.image('portrait_alexandra_ivanova', 'assets/suspects/alexandra_ivanova.png');
        this.load.image('portrait_sergei_petrov', 'assets/suspects/sergei_petrov.png');
        this.load.image('portrait_isabella_rossi', 'assets/suspects/isabella_rossi.png');
        this.load.image('portrait_liam_oconnor', 'assets/suspects/liam_oconnor.png');

        this.load.audio('themeGame', 'assets/audio/game.mp3');

        this.load.json('suspects', 'assets/data/suspects.json');
        this.load.json('missions', 'assets/data/missions.json');
        this.load.json('locations', 'assets/data/locations.json');
        this.load.json('dialogue', 'assets/data/dialogue.json');
    }

    create() {
    WebFont.load({
        google: {
            families: ['Special Elite', 'Press Start 2P']
        },
        active: async () => {
            await document.fonts.load('16px "Special Elite"');
            await document.fonts.load('24px "Press Start 2P"');
        }
    });
    const music = this.registry.get('bgMusic');


        this.input.once('pointerdown', () => {
            if (music && !music.isPlaying) {
                music.play();
            }
        });


        const startBtn = this.add.image(950, 620, 'btnStart').setInteractive();
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