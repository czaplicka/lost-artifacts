import MobileFullscreen from '../mobileFullscreen.js';
import { audioManager } from '../AudioManager.js';

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloaderScene' });
        // Zmienna przechowująca wartość maski (od 0 do 1)
        this.fillingLevel = 0;
    }

    preload() {
        const { width, height } = this.scale;

        // --- 0. Tło widoczne od razu ---
        if (this.textures.exists('cozyBackground')) {
            this.add.image(width / 2, height / 2, 'cozyBackground')
                .setDisplaySize(width, height)
                .setDepth(-10);
        } else {
            console.error('Tło cozyBackground nie zostało znalezione!');
            this.cameras.main.setBackgroundColor('#101010');
        }

        // --- 1. Generowanie Tekstur Kubków ---
        // MUSI być wywołane przed stworzeniem obiektów Image!
        this.createCoffeeTextures();

        // --- 2. TU wczytujesz WSZYSTKIE assety właściwej gry ---
         this.load.image('background', 'assets/start_1.jpg');
        this.load.image('background2', 'assets/start_2.jpg');
        this.load.image('backgroundset', 'assets/local/cabinet.jpg');
        this.load.image('backgroundgo', 'assets/GameOver.jpg');
        this.load.image('backgrounds', 'assets/success.jpg');
        this.load.image('backgroundpc', 'assets/hiscores.png');
        this.load.image('backgroundhi', 'assets/local/office.jpg');
        this.load.image('backgroundoff', 'assets/local/biuro.jpg');
        this.load.image('bank', 'assets/local/bank.jpg');
        this.load.image('alley', 'assets/local/alley.jpg');
        this.load.image('airport', 'assets/local/airport.jpg');
        this.load.image('hotel_maid', 'assets/local/hotel_maid.jpg');
        this.load.image('parking_bg', 'assets/local/parking.jpg');
        this.load.image('policehq', 'assets/local/police_hq.jpg');
        this.load.image('restaurant', 'assets/local/restaurant.jpg');
        this.load.image('garbage', 'assets/local/garbage.jpg');

        this.load.image('crimelab_left', 'assets/local/crimelab_left.jpg');
        this.load.image('crimelab_center', 'assets/local/crimelab_center.jpg');
        this.load.image('crimelab_right', 'assets/local/crimelab_right.jpg');

        this.load.image('bankh', 'assets/local/bank_h.jpg');
        this.load.image('alleyh', 'assets/local/alley_h.jpg');
        this.load.image('airporth', 'assets/local/airport_h.jpg');
        this.load.image('hotel_maidh', 'assets/local/hotel_maid_h.jpg');
        this.load.image('parkingh', 'assets/local/parking_h.jpg');
        this.load.image('policehqh', 'assets/local/police_hq_h.jpg');
        this.load.image('restauranth', 'assets/local/restaurant_h.jpg');
        this.load.image('garbageh', 'assets/local/garbage_h.jpg');

        this.load.image('berlin', 'assets/cities/Berlin.jpg');
        this.load.image('london', 'assets/cities/London.jpg');
        this.load.image('newdelhi', 'assets/cities/NewDelhi.jpg');
        this.load.image('newyorkcity', 'assets/cities/NYC.jpg');
        this.load.image('paris', 'assets/cities/Paris.jpg');
        this.load.image('warsaw', 'assets/cities/Warsaw.jpg');

        this.load.image('ber', 'assets/maps/ber.jpg');
        this.load.image('lnd', 'assets/maps/lnd.jpg');
        this.load.image('ndh', 'assets/maps/ndh.jpg');
        this.load.image('nyc', 'assets/maps/nyc.jpg');
        this.load.image('prs', 'assets/maps/prs.jpg');
        this.load.image('waw', 'assets/maps/waw.jpg');

        this.load.image('atlas_poland', 'assets/atlas/poland.png');
        this.load.image('atlas_germany', 'assets/atlas/germany.png');
        this.load.image('atlas_uk', 'assets/atlas/uk.png');
        this.load.image('atlas_india', 'assets/atlas/india.png');
        this.load.image('atlas_west_usa', 'assets/atlas/west_usa.png');
        this.load.image('atlas_east_usa', 'assets/atlas/east_usa.png');
        this.load.image('atlas_france', 'assets/atlas/france.png');
        this.load.image('atlas_bg', 'assets/atlas/atlas.png');

        this.load.image('bankier', 'assets/npc/bankier_w.png');
        this.load.image('fence', 'assets/npc/fence_w.png');
        this.load.image('knajpa', 'assets/npc/knajpa_w.png');
        this.load.image('maid', 'assets/npc/maid_w.png');
        this.load.image('parkingnpc', 'assets/npc/parkingowy_w.png');
        this.load.image('police', 'assets/npc/police_w.png');
        this.load.image('stewardessa', 'assets/npc/stewardesa_w.png');
        this.load.image('bum', 'assets/npc/bum_w.png');

        this.load.image('bankierhindu', 'assets/npc/bankier_h.png');
        this.load.image('fencehindu', 'assets/npc/fence_h.png');
        this.load.image('knajpahindu', 'assets/npc/knajpa_h.png');
        this.load.image('maidhindu', 'assets/npc/maid_h.png');
        this.load.image('parkingnpchindu', 'assets/npc/parkingowy_h.png');
        this.load.image('policehindu', 'assets/npc/police_h.png');
        this.load.image('stewardessahindu', 'assets/npc/stewardesa_h.png');
        this.load.image('bumhindu', 'assets/npc/bum_h.png');

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
        this.load.image('telephone', 'assets/telephone.png');
        this.load.image('crime_board', 'assets/crime_board.png');
        this.load.image('note', 'assets/note.png');
        this.load.image('warrant', 'assets/warrant.png');

        this.load.image('artifact_crown_jewels', 'assets/artifacts/crown_jewels.png');
        this.load.image('artifact_amber_necklace', 'assets/artifacts/amber_necklace.png');
        this.load.image('artifact_liberty_torch', 'assets/artifacts/liberty_torch.png');
        this.load.image('artifact_mona_lisa', 'assets/artifacts/mona_lisa.png');
        this.load.image('artifact_mughal_dagger', 'assets/artifacts/mughal_dagger.png');
        this.load.image('artifact_royal_seal', 'assets/artifacts/royal_seal.png');
        this.load.image('artifact_fallback', 'assets/artifacts/artifact_unknown.png');

        this.load.image('soundOn', 'assets/sound.png');
        this.load.image('soundOff', 'assets/nsound.png');

        this.load.image('notebook_bg', 'assets/ui/notebook_bg.png');
        this.load.image('sketch_base', 'assets/ui/sketch_base.png');
        this.load.image('sketch_eyes', 'assets/ui/sketch_eyes.png');
        this.load.image('sketch_hair', 'assets/ui/sketch_hair.png');
        this.load.image('beard', 'assets/ui/beard.png');
        this.load.image('big_forhead', 'assets/ui/big_forhead.png');
        this.load.image('earings', 'assets/ui/earings.png');
        this.load.image('glasses', 'assets/ui/glasses.png');
        this.load.image('gotee', 'assets/ui/gotee.png');
        this.load.image('long_hair', 'assets/ui/long_hair.png');
        this.load.image('moustache', 'assets/ui/moustache.png');
        this.load.image('neckles', 'assets/ui/neckles.png');
        this.load.image('rainbow_streak', 'assets/ui/rainbow_streak.png');
        this.load.image('scar', 'assets/ui/scar.png');
        this.load.image('tatoo', 'assets/ui/tatoo.png');

        this.load.image('notes', 'assets/notes.png');
        this.load.image('file', 'assets/file.png');
        this.load.image('mapbg', 'assets/map.png');
        this.load.image('phonebook', 'assets/phonebook.jpg');

        this.load.image('unknown', 'assets/suspects/unknown.jpg');
        this.load.image('garett_gutter', 'assets/suspects/garett_gutter.jpg');
        this.load.image('sofia_vargas', 'assets/suspects/sofia_vargas.jpg');
        this.load.image('bert_goodman', 'assets/suspects/bert_goodman.jpg');
        this.load.image('anne_apple', 'assets/suspects/anne_apple.jpg');
        this.load.image('frank_groot', 'assets/suspects/frank_groot.jpg');
        this.load.image('bernard_porter', 'assets/suspects/bernard_porter.jpg');
        this.load.image('rebecca_muller', 'assets/suspects/rebecca_muller.jpg');
        this.load.image('jacek_kowalski', 'assets/suspects/jacek_kowalski.jpg');
        this.load.image('pablo_fernandez', 'assets/suspects/pablo_fernandez.jpg');
        this.load.image('alexandra_ivanova', 'assets/suspects/alexandra_ivanova.jpg');
        this.load.image('sergei_petrov', 'assets/suspects/sergei_petrov.jpg');
        this.load.image('isabella_rossi', 'assets/suspects/isabella_rossi.jpg');
        this.load.image('liam_oconnor', 'assets/suspects/liam_oconnor.jpg');
        this.load.image('ava_thompson', 'assets/suspects/ava_thompson.jpg');
        this.load.image('maximilian_schmidt', 'assets/suspects/maximilian_schmidt.jpg');
        this.load.image('brendan_ross', 'assets/suspects/brendan_ross.jpg');
        this.load.image('bai_williams', 'assets/suspects/bai_williams.jpg');
        this.load.image('albert_johnson', 'assets/suspects/albert_johnson.jpg');
        this.load.image('anna_bocian', 'assets/suspects/anna_bocian.jpg');
        this.load.image('aleksander_petrov', 'assets/suspects/aleksander_petrov.jpg');
        this.load.image('marie_dubois', 'assets/suspects/marie_dubois.jpg');
        this.load.image('lotte_chantal', 'assets/suspects/lotte_chantal.jpg');

        this.load.image('wanted_garett_gutter', 'assets/suspects/1.jpg');
        this.load.image('wanted_sofia_vargas', 'assets/suspects/2.jpg');
        this.load.image('wanted_bert_goodman', 'assets/suspects/3.jpg');
        this.load.image('wanted_anne_apple', 'assets/suspects/4.jpg');
        this.load.image('wanted_frank_groot', 'assets/suspects/5.jpg');
        this.load.image('wanted_bernard_porter', 'assets/suspects/6.jpg');
        this.load.image('wanted_rebecca_muller', 'assets/suspects/7.jpg');
        this.load.image('wanted_jacek_kowalski', 'assets/suspects/8.jpg');
        this.load.image('wanted_pablo_fernandez', 'assets/suspects/9.jpg');
        this.load.image('wanted_alexandra_ivanova', 'assets/suspects/10.jpg');
        this.load.image('wanted_sergei_petrov', 'assets/suspects/11.jpg');
        this.load.image('wanted_isabella_rossi', 'assets/suspects/12.jpg');
        this.load.image('wanted_liam_oconnor', 'assets/suspects/13.jpg');
        this.load.image('wanted_ava_thompson', 'assets/suspects/14.jpg');
        this.load.image('wanted_maximilian_schmidt', 'assets/suspects/15.jpg');
        this.load.image('wanted_brendan_ross', 'assets/suspects/16.jpg');
        this.load.image('wanted_bai_williams', 'assets/suspects/17.jpg');
        this.load.image('wanted_albert_johnson', 'assets/suspects/18.jpg');
        this.load.image('wanted_anna_bocian', 'assets/suspects/19.jpg');
        this.load.image('wanted_aleksander_petrov', 'assets/suspects/20.jpg');
        this.load.image('wanted_marie_dubois', 'assets/suspects/21.jpg');
        this.load.image('wanted_lotte_chantal', 'assets/suspects/22.jpg');

        this.load.image('gg', 'assets/suspects/gg.jpg');
        this.load.image('sv', 'assets/suspects/sv.jpg');
        this.load.image('bg', 'assets/suspects/bg.jpg');
        this.load.image('aa', 'assets/suspects/aa.jpg');
        this.load.image('fg', 'assets/suspects/fg.jpg');
        this.load.image('bp', 'assets/suspects/bp.jpg');
        this.load.image('rm', 'assets/suspects/rm.jpg');
        this.load.image('jk', 'assets/suspects/jk.jpg');
        this.load.image('pf', 'assets/suspects/pf.jpg');
        this.load.image('ai', 'assets/suspects/ai.jpg');
        this.load.image('sp', 'assets/suspects/sp.jpg');
        this.load.image('ir', 'assets/suspects/ir.jpg');
        this.load.image('lo', 'assets/suspects/lo.jpg');
        this.load.image('at', 'assets/suspects/at.jpg');
        this.load.image('ms', 'assets/suspects/ms.jpg');
        this.load.image('br', 'assets/suspects/br.jpg');
        this.load.image('bw', 'assets/suspects/bw.jpg');
        this.load.image('aj', 'assets/suspects/aj.jpg');
        this.load.image('ab', 'assets/suspects/ab.jpg');
        this.load.image('ap', 'assets/suspects/ap.jpg');
        this.load.image('md', 'assets/suspects/md.jpg');
        this.load.image('lc', 'assets/suspects/lc.jpg');

        this.load.video('detectiveIntro', 'assets/video/detective-intro.mp4', true);

        this.load.audio('crimelab_ambient', 'assets/audio/crimelab_ambient.mp3');
        this.load.audio('alleysound', 'assets/audio/alley.mp3');
        this.load.audio('arrestsound', 'assets/audio/arrest.mp3');
        this.load.audio('banksound', 'assets/audio/bank.mp3');
        this.load.audio('citysound', 'assets/audio/city.mp3');
        this.load.audio('click_sound', 'assets/audio/click.mp3');
        this.load.audio('themeGame', 'assets/audio/game.mp3');
        this.load.audio('game_over', 'assets/audio/game_over.mp3');
        this.load.audio('hotelsound', 'assets/audio/hotel.mp3');
        this.load.audio('officescenesound', 'assets/audio/officescene.mp3');
        this.load.audio('pagesound', 'assets/audio/page.mp3');
        this.load.audio('parkingsound', 'assets/audio/parking.mp3');
        this.load.audio('planesound', 'assets/audio/plane.mp3');
        this.load.audio('policesound', 'assets/audio/police.mp3');
        this.load.audio('restaurantsound', 'assets/audio/restaurant.mp3');
        this.load.audio('sfx_dial', 'assets/audio/phone-dial.mp3');
        this.load.audio('sfx_ring', 'assets/audio/phone-ring.mp3');
        this.load.audio('sfx_ringing', 'assets/audio/phone-ringing.mp3');
        this.load.audio('sfx_busy', 'assets/audio/phone-busy.mp3');
        this.load.audio('sfx_pickup', 'assets/audio/phone-pick.mp3');
        this.load.audio('wrong', 'assets/audio/wrong.mp3');
        this.load.audio('correct', 'assets/audio/correct.mp3');
        this.load.audio('successsound', 'assets/audio/success.mp3');

        this.load.audio('detective-intro', 'assets/voice/detective-intro.mp3');

        this.load.css('crime-board-css', 'assets/css/crime-board.css');
        this.load.css('auth-styles-css', 'assets/css/auth-styles.css');

        this.load.image('portrait_fallback', 'assets/portraits/portrait_fallback.png');
        this.load.image('portrait_holmes', 'assets/portraits/holmes.png');
        this.load.image('portrait_csi', 'assets/portraits/csi.png');
        this.load.image('portrait_home', 'assets/portraits/home.png');
        this.load.image('portrait_hq', 'assets/portraits/hq.png');  
        this.load.image('portrait_informant', 'assets/portraits/informant.png');
        this.load.image('portrait_police-station', 'assets/portraits/police-station.png');
        this.load.image('portrait_watson', 'assets/portraits/watson.png');  

        this.load.json('suspects', 'assets/data/suspects.json');
        this.load.json('citysuspects', 'assets/data/citysuspects.json');
        this.load.json('missions', 'assets/data/missions.json');
        this.load.json('locations', 'assets/data/locations.json');
        this.load.json('atlas', 'assets/data/atlas.json');
        this.load.json('dialogue', 'assets/data/dialogue.json');
        this.load.json('dialogue_banker', 'assets/data/dialogue/banker.json');
        this.load.json('dialogue_bum', 'assets/data/dialogue/bum.json');
        this.load.json('dialogue_maid', 'assets/data/dialogue/maid.json');
        this.load.json('dialogue_stewardess', 'assets/data/dialogue/stewardess.json');
        this.load.json('dialogue_police', 'assets/data/dialogue/police.json');
        this.load.json('dialogue_fence', 'assets/data/dialogue/fence.json');
        this.load.json('dialogue_knajpa', 'assets/data/dialogue/knajpa.json');
        this.load.json('dialogue_parkingowy', 'assets/data/dialogue/parkingowy.json');
        this.load.json('city_clues', 'assets/data/city-clues.json');
        this.load.json('suspect_clues', 'assets/data/suspect-clues.json');
        this.load.json('objects-data', 'assets/data/objects.json');
        this.load.json('dialog_csi', 'assets/data/dialogue/csi.json');
        this.load.json('dialog_informant', 'assets/data/dialogue/informant.json');
        this.load.json('dialog_watson', 'assets/data/dialogue/watson.json');
        this.load.json('dialog_holmes', 'assets/data/dialogue/holmes.json');
        this.load.json('dialog_police_station', 'assets/data/dialogue/police-station.json');
        this.load.json('dialog_hq', 'assets/data/dialogue/hq.json');
        this.load.json('dialog_home', 'assets/data/dialogue/home.json');

        this.load.image('louvre_bg', 'assets/crimes/louvre.jpg');
        this.load.tilemapTiledJSON('louvre', 'assets/crimes/louvre.json');
        this.load.image('tower_bg', 'assets/crimes/tower.jpg');
        this.load.tilemapTiledJSON('tower', 'assets/crimes/tower.json');
        this.load.image('castle_bg', 'assets/crimes/castle.jpg');
        this.load.tilemapTiledJSON('castle', 'assets/crimes/castle.json');
        this.load.image('dockyard_bg', 'assets/crimes/dockyard.jpg');
        this.load.tilemapTiledJSON('dockyard', 'assets/crimes/dockyard.json');
        this.load.image('auction_house_bg', 'assets/crimes/auction_house.jpg');
        this.load.tilemapTiledJSON('auction_house', 'assets/crimes/auction_house.json');
        this.load.image('havela_bg', 'assets/crimes/havela.jpg');
        this.load.tilemapTiledJSON('havela', 'assets/crimes/havela.json');


        const centerX = width / 2;
        const centerY = height * 0.5;

        // Pozycja kubka
        const cupX = centerX - 85;
        const cupY = centerY + 105;

        // --- 3. Stworzenie Warstw UI ---
        const shadow = this.add.ellipse(cupX, cupY + 50, 90, 20, 0x000000, 0.3);

        // A. Pusty kontur kubka w tle (zawsze widoczny)
        const emptyCup = this.add.image(cupX, cupY, 'cup_outline');

        // B. Pełny kubek z kawą (Używamy poprawionego klucza 'cup_coffee')
        this.fullCupImage = this.add.image(cupX, cupY, 'cup_coffee');

        // C. Maska Alfa (stopniowo odkrywa 'fullCupImage')
        this.coffeeMask = this.make.graphics({ x: cupX, y: cupY, add: false });
        this.coffeeMask.fillStyle(0xffffff);
        
        // Na początku maska jest pusta (nic nie odkrywa)
        this.updateCoffeeMask(0);

        // Nakładamy maskę na obrazek pełnego kubka
        const mask = this.coffeeMask.createGeometryMask();
        this.fullCupImage.setMask(mask);

        // --- 4. Tekst ---
        const loadingText = this.add.text(centerX, centerY - 128, 'MAKING COFFEE... 0%', {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#f4ebd9'
        }).setOrigin(0.5);

        const fileText = this.add.text(centerX, height - 30, '', {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: '#a38f78',
            wordWrap: { width: width * 0.8 }
        }).setOrigin(0.5);

        // --- 5. Obsługa Progressu Ładowania ---
        this.load.on('progress', (value) => {
            // Płynne napełnianie za pomocą maski (0 -> 1)
            this.updateCoffeeMask(value);

            // Aktualizacja tekstu procentowego
            const percent = Math.round(value * 100);
            loadingText.setText(`MAKING COFFEE... ${percent}%`);
        });

        this.load.on('fileprogress', (file) => {
            // fileText.setText(`Coffee, milk...: ${file.key}`);
        });

        this.load.on('loaderror', (file) => {
            fileText.setText(`Error loading: ${file.key}`).setColor('#ff5555');
        });

        // Płynne czyszczenie UI po zakończeniu ładowania
        this.load.once('complete', () => {
            this.updateCoffeeMask(1);

            this.tweens.add({
                targets: [loadingText, fileText],
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    loadingText.destroy();
                    fileText.destroy();
                }
            });
        });
    }

create() {
    const { width, height } = this.scale;

    const initUi = async () => {
        audioManager.init(this);
        if (this.cache.audio.exists('themeMusic')) {
            audioManager.playMusic('themeMusic');
        }

        this.input.once('pointerdown', () => {
            this.sound.unlock?.();
        });

        const startBtn = this.add.image(width / 2, height * 0.8, 'btnStart')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(startBtn, 0.8, 0.9);

        startBtn.on('pointerdown', async () => {
            const mobileFS = this.registry.get('mobileFS');
            if (mobileFS) {
                await mobileFS.enterFullscreenLandscape();
            }
            this.scene.start('MenuScene');
        });
    };

    if (window.WebFont && typeof window.WebFont.load === 'function') {
        window.WebFont.load({
            google: {
                families: ['Press Start 2P', 'Special Elite', 'Indie Flower']
            },
            active: () => initUi(),
            inactive: () => {
                console.warn('WebFont failed to load, continuing with fallback fonts.');
                initUi();
            }
        });
    } else {
        initUi();
    }
}

    updateCoffeeMask(fillLevel) {
        if (!this.coffeeMask) return;

        this.coffeeMask.clear();
        this.coffeeMask.fillStyle(0xffffff, 1);

        const totalHeight = 110;
        const visibleHeight = totalHeight * fillLevel;

        this.coffeeMask.fillRect(
            -125 * 0.5,
            (totalHeight * 0.5) - visibleHeight,
            125,
            visibleHeight
        );
    }

    createCoffeeTextures() {
        if (this.textures.exists('cup_coffee') && this.textures.exists('cup_outline')) return;

        // ==========================================
        // 1. KONTUR KUBKA (Szkło)
        // ==========================================
        const gOutline = this.make.graphics({ x: 0, y: 0, add: false });

        // Tło szkła
        gOutline.fillStyle(0xffffff, 0.08);
        gOutline.fillRoundedRect(10, 10, 80, 90, { tl: 6, tr: 6, bl: 24, br: 24 });

        // Ucho
        gOutline.lineStyle(4, 0xe2f1f8, 0.5);
        gOutline.strokeCircle(95, 55, 17);
        gOutline.lineStyle(2, 0xffffff, 0.8);
        gOutline.strokeCircle(94, 53, 15);

        // Główny obrys
        gOutline.lineStyle(3, 0xd8ecf8, 0.75);
        gOutline.strokeRoundedRect(10, 10, 80, 90, { tl: 6, tr: 6, bl: 24, br: 24 });

        // Rant
        gOutline.lineStyle(2, 0xffffff, 0.9);
        gOutline.strokeRoundedRect(10, 8, 80, 8, 4);

        // Bliki
        gOutline.fillStyle(0xffffff, 0.35);
        gOutline.fillRoundedRect(16, 18, 5, 72, 2);
        gOutline.fillStyle(0xffffff, 0.2);
        gOutline.fillRoundedRect(82, 60, 3, 30, 1);

        gOutline.generateTexture('cup_outline', 125, 110);
        gOutline.destroy();


        // ==========================================
        // 2. WPEŁNIENIE KAWĄ
        // ==========================================
        const gCoffee = this.make.graphics({ x: 0, y: 0, add: false });

        // Płynna kawa
        gCoffee.fillStyle(0x3d2314, 0.95);
        gCoffee.fillRoundedRect(14, 20, 72, 78, { tl: 2, tr: 2, bl: 20, br: 20 });

        // Espresso
        gCoffee.fillStyle(0x5a351e, 0.9);
        gCoffee.fillRect(14, 20, 72, 35);

        // Crema / Pianka
        gCoffee.fillStyle(0xd7a15c, 1);
        gCoffee.fillRoundedRect(14, 18, 72, 10, 5);

        // Pianka mleczna
        gCoffee.fillStyle(0xf7e8d3, 0.9);
        gCoffee.fillRoundedRect(30, 19, 40, 6, 3);

        // Latte Art (Serce)
        gCoffee.fillStyle(0xfff7ed, 1);
        gCoffee.fillCircle(45, 21, 5);
        gCoffee.fillCircle(55, 21, 5);
        gCoffee.fillTriangle(39, 22, 61, 22, 50, 29);

        gCoffee.generateTexture('cup_coffee', 125, 110);
        gCoffee.destroy();
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
        button.on('pointerover', () => button.setScale(hoverScale));
        button.on('pointerout', () => button.setScale(baseScale));
    }
}