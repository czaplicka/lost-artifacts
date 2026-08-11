import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { NEWSPAPER_CONFIG } from '../assets/data/newspaperConfig.js';
import { EventBus } from '../EventBus.js';

export class PreloaderScene extends BaseScene {
    constructor() {
        super({ key: 'PreloaderScene' });
        this.fillingLevel = 0;
        this.tipIndex = -1;
        this.tipTimer = null;
        this.dotsTimer = null;
        this.loadingReady = false;
        this.uiReady = false;
        this.audioArmed = false;
        this.startBtn = null;
    }
    preload() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height * 0.5;
        const cupX = centerX - 100;
        const cupY = centerY + 100;

        if (this.textures.exists('cozyBackground')) {
            this.add.image(width / 2, height / 2, 'cozyBackground')
                .setDisplaySize(width, height)
                .setDepth(-10);
        } else {
            console.error('Tło cozyBackground nie zostało znalezione!');
            this.cameras.main.setBackgroundColor('#101010');
        }

        this.createCoffeeTextures();
        this.preloadNewspapers();

        this.load.image('background', 'assets/start_1.jpg');
        this.load.image('background2', 'assets/start_2.jpg');
        this.load.image('backgroundset', 'assets/local/cabinet.jpg');
        this.load.image('archive', 'assets/local/archive.jpg');
        this.load.image('enter', 'assets/local/enter.jpg');
        this.load.image('backgroundgo', 'assets/GameOver.jpg');
        this.load.image('backgrounds', 'assets/success.jpg');
        this.load.image('backgroundpc', 'assets/hiscores.png');
        this.load.image('backgroundhi', 'assets/local/office.jpg');
        this.load.image('backgroundoff', 'assets/local/biuro.jpg');
        this.load.image('dossier', 'assets/dossier.png');
        this.load.image('hotel', 'assets/local/hotel.jpg');
        this.load.image('crimelab_left', 'assets/local/crimelab_left.jpg');
        this.load.image('crimelab_center', 'assets/local/crimelab_center.jpg');
        this.load.image('crimelab_right', 'assets/local/crimelab_right.jpg');

        this.load.image('bank_w', 'assets/local/bank_w.jpg');
        this.load.image('alley_w', 'assets/local/alley_w.jpg');
        this.load.image('airport_w', 'assets/local/airport_w.jpg');
        this.load.image('hotel_maid_w', 'assets/local/hotel_maid_w.jpg');
        this.load.image('parking_w', 'assets/local/parking_w.jpg');
        this.load.image('policehq_w', 'assets/local/police_hq_w.jpg');
        this.load.image('restaurant_w', 'assets/local/restaurant_w.jpg');
        this.load.image('garbage_w', 'assets/local/garbage_w.jpg');

        this.load.image('bank_h', 'assets/local/bank_h.jpg');
        this.load.image('alley_h', 'assets/local/alley_h.jpg');
        this.load.image('airport_h', 'assets/local/airport_h.jpg');
        this.load.image('hotel_maid_h', 'assets/local/hotel_maid_h.jpg');
        this.load.image('parking_h', 'assets/local/parking_h.jpg');
        this.load.image('police_hq_h', 'assets/local/police_hq_h.jpg');
        this.load.image('restaurant_h', 'assets/local/restaurant_h.jpg');
        this.load.image('garbage_h', 'assets/local/garbage_h.jpg');

        this.load.image('berlin', 'assets/cities/Berlin.jpg');
        this.load.image('london', 'assets/cities/London.jpg');
        this.load.image('newdelhi', 'assets/cities/NewDelhi.jpg');
        this.load.image('newyorkcity', 'assets/cities/NYC.jpg');
        this.load.image('paris', 'assets/cities/Paris.jpg');
        this.load.image('warsaw', 'assets/cities/Warsaw.jpg');
        this.load.image('nairobi', 'assets/cities/Nairobi.jpg');
        this.load.image('islamabad', 'assets/cities/Islamabad.jpg');
        this.load.image('toronto', 'assets/cities/Toronto.jpg');
        this.load.image('kotto', 'assets/cities/Kotto.jpg');
        this.load.image('tokyo', 'assets/cities/Tokyo.jpg');

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

        this.load.image('bankier_w', 'assets/npc/bankier_w.png');
        this.load.image('fence_w', 'assets/npc/fence_w.png');
        this.load.image('knajpa_w', 'assets/npc/knajpa_w.png');
        this.load.image('maid_w', 'assets/npc/maid_w.png');
        this.load.image('parkingowy_w', 'assets/npc/parkingowy_w.png');
        this.load.image('police_w', 'assets/npc/police_w.png');
        this.load.image('stewardessa_w', 'assets/npc/stewardesa_w.png');
        this.load.image('bum_w', 'assets/npc/bum_w.png');

        this.load.image('bankier_h', 'assets/npc/bankier_h.png');
        this.load.image('fence_h', 'assets/npc/fence_h.png');
        this.load.image('knajpa_h', 'assets/npc/knajpa_h.png');
        this.load.image('maid_h', 'assets/npc/maid_h.png');
        this.load.image('parkingowy_h', 'assets/npc/parkingowy_h.png');
        this.load.image('police_h', 'assets/npc/police_h.png');
        this.load.image('stewardessa_h', 'assets/npc/stewardesa_h.png');
        this.load.image('bum_h', 'assets/npc/bum_h.png');

        this.load.image('bankier_b', 'assets/npc/bankier_b.png');
        this.load.image('fence_b', 'assets/npc/fence_b.png');
        this.load.image('knajpa_b', 'assets/npc/knajpa_b.png');
        this.load.image('maid_b', 'assets/npc/maid_b.png');
        this.load.image('parkingowy_b', 'assets/npc/parkingowy_b.png');
        this.load.image('police_b', 'assets/npc/police_b.png');
        this.load.image('stewardessa_b', 'assets/npc/stewardesa_b.png');
        this.load.image('bum_b', 'assets/npc/bum_b.png');

        this.load.image('bankier_a', 'assets/npc/bankier_a.png');
        this.load.image('fence_a', 'assets/npc/fence_a.png');
        this.load.image('knajpa_a', 'assets/npc/knajpa_a.png');
        this.load.image('maid_a', 'assets/npc/maid_a.png');
        this.load.image('parkingowy_a', 'assets/npc/parkingowy_a.png');
        this.load.image('police_a', 'assets/npc/police_a.png');
        this.load.image('stewardessa_a', 'assets/npc/stewardesa_a.png');
        this.load.image('bum_a', 'assets/npc/bum_a.png');

        this.load.image('btnRookie', 'assets/rookie.png');
        this.load.image('btnOfficer', 'assets/officer.png');
        this.load.image('btnCaptain', 'assets/captain.png');
        this.load.image('btnStart', 'assets/start.png');
        this.load.image('back', 'assets/back.png');
        this.load.image('next', 'assets/next.png');
        this.load.image('load', 'assets/load.png');
        this.load.image('btnSave', 'assets/save.png');
        this.load.image('btnContinue', 'assets/continue.png');
        this.load.image('btnExit', 'assets/exit.png');
        this.load.image('btnSettings', 'assets/settings.png');
        this.load.image('btnHiscore', 'assets/hiscore.png');
        this.load.image('loginbtn', 'assets/login.png');
        this.load.image('registerbtn', 'assets/register.png');
        this.load.image('atlas', 'assets/atlas.png');
        this.load.image('destination', 'assets/destination.png');
        this.load.image('plane', 'assets/plane.png');
        this.load.image('search', 'assets/search.png');
        this.load.image('filebutt', 'assets/filebutt.png');
        this.load.image('telephone', 'assets/telephone.png');
        this.load.image('crime_board', 'assets/crime_board.png');
        this.load.image('note', 'assets/note.png');
        this.load.image('warrant', 'assets/warrant.png');
        this.load.image('profile', 'assets/profile.png');
        this.load.image('news', 'assets/news.png');
        this.load.image('tv', 'assets/tv.png');

        this.load.image('artifact_crown_jewels', 'assets/artifacts/crown_jewels.png');
        this.load.image('artifact_amber_necklace', 'assets/artifacts/amber_necklace.png');
        this.load.image('artifact_liberty_torch', 'assets/artifacts/liberty_torch.png');
        this.load.image('artifact_mona_lisa', 'assets/artifacts/mona_lisa.png');
        this.load.image('artifact_mughal_dagger', 'assets/artifacts/mughal_dagger.png');
        this.load.image('artifact_royal_seal', 'assets/artifacts/royal_seal.png');
        this.load.image('artifact_fallback', 'assets/artifacts/artifact_unknown.png');

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

        this.load.image('television', 'assets/television.png');
        this.load.image('tv_news_studio', 'assets/tv/tv_news_studio.jpg');
this.load.image('tv_anchor_generic', 'assets/tv/tv_anchor_generic.jpg');
this.load.image('tv_anchor_genericf', 'assets/tv/tv_anchor_genericf.jpg');

        this.load.image('paper_daily_bg', 'assets/newspapers/paper_daily_bg_1920x1080.png');
        this.load.image('paper_tabloid_bg', 'assets/newspapers/paper_tabloid_bg_1920x1080.png');
        this.load.image('paper_time_bg', 'assets/newspapers/paper_time_bg_1920x1080.png');
        this.load.image('comix1', 'assets/newspapers/comix1.png');
        this.load.image('comix2', 'assets/newspapers/comix2.png');
        this.load.image('newsstand_bg', 'assets/local/newsstand.jpg');
        this.load.image('paper_fallback_blank', 'assets/newspapers/paper_daily_bg_1920x1080.png');
        this.load.image('paper_hq_crimewave_photo', 'assets/newspapers/paper_hq_crimewave_photo.jpg');
        this.load.image('paper_warsaw_vending_photo', 'assets/newspapers/paper_warsaw_vending_photo.jpg');
        this.load.image('paper_berlin_statue_photo', 'assets/newspapers/paper_berlin_statue_photo.jpg');
        this.load.image('paper_london_queue_photo', 'assets/newspapers/paper_london_queue_photo.jpg');
        this.load.image('paper_new_delhi_tea_photo', 'assets/newspapers/paper_new_delhi_tea_photo.jpg');
        this.load.image('paper_new_york_subway_photo', 'assets/newspapers/paper_new_york_subway_photo.jpg');
        this.load.image('paper_paris_cafe_photo', 'assets/newspapers/paper_paris_cafe_photo.jpg');
        this.load.image('paper_hq_case_briefing_photo', 'assets/newspapers/paper_hq_case_briefing_photo.jpg');

        this.load.image(  'tabloid_hq_coffee_machine_photo',  'assets/newspapers/tabloid/hq_coffee_machine_photo.jpg');
this.load.image(  'tabloid_hq_gold_stapler_photo',  'assets/newspapers/tabloid/hq_gold_stapler_photo.jpg');
this.load.image(  'tabloid_hq_sunglasses_photo',  'assets/newspapers/tabloid/hq_sunglasses_photo.jpg');
this.load.image(  'tabloid_hq_window_chair_photo',  'assets/newspapers/tabloid/hq_window_chair_photo.jpg');

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

        this.load.image('evidence_bag', 'assets/csi/evidence_bag.png');
        this.load.image('hair_board', 'assets/csi/hair_board.png');
        this.load.image('hair_strand_blond', 'assets/csi/hair_strand_blond.png');
        this.load.image('hair_strand_black', 'assets/csi/hair_strand_black.png');
        this.load.image('hair_strand_red', 'assets/csi/hair_strand_red.png');
        this.load.image('hair_strand_brown', 'assets/csi/hair_strand_brown.png');
       // this.load.image('microscope_base', 'assets/csi/microscope_base.png');
        this.load.image('step1', 'assets/csi/step1.png');
        this.load.image('step2', 'assets/csi/step2.png');
        this.load.image('step3', 'assets/csi/step3.png');
        this.load.image('tweezers', 'assets/csi/tweezers.png');
        this.load.image('microscope_look', 'assets/csi/microscope_look.png');
        this.load.image('pipette', 'assets/csi/pipette.png');
        //this.load.image('tool_brush', 'assets/csi/tool_brush.png');
        this.load.image('desk1', 'assets/csi/desk1.jpg');

        this.load.video('detectiveIntro', 'assets/video/detective-intro.mp4', true);
        this.load.video('newsstand_video', 'assets/video/newsstand.mp4', 'loadeddata', false, true);

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
        this.load.audio('paper_rustle', 'assets/audio/paper_rustle.mp3');
        this.load.audio('detective-intro', 'assets/voice/detective-intro.mp3');

        this.load.css('crime-board-css', 'assets/css/crime-board.css');
        this.load.css('auth-styles-css', 'assets/css/auth-styles.css');
        this.load.css('modal-css', 'assets/css/modal.css');

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
        this.load.json('dialog_police-station', 'assets/data/dialogue/police-station.json');
        this.load.json('dialog_hq', 'assets/data/dialogue/hq.json');
        this.load.json('dialog_home', 'assets/data/dialogue/home.json')
    this.load.json('tv-config', 'assets/data/tv-config.json');

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



               const tips = [
            'A planted clue usually wants to be found too quickly.',
            'Witness confidence is not the same as witness accuracy.',
            'The best liar often tells mostly true things.',
            'A perfect alibi that arrives too fast deserves a second look.',
            'Means without motive is noise. Motive without opportunity is fiction.',
            'Every suspect has a story. Only one has the timeline.',
            'Coffee first. Accusations second.',
            'Interpol uplink unstable. Deduction still operational.',
            'If everyone sounds innocent, someone rehearsed.'
        ];

        const shadow = this.add.ellipse(cupX, cupY + 50, 90, 20, 0x000000, 0.28);
        const vignetteTop = this.add.rectangle(centerX, 0, width, 120, 0x000000, 0.22).setOrigin(0.5, 0);
        const vignetteBottom = this.add.rectangle(centerX, height, width, 150, 0x000000, 0.24).setOrigin(0.5, 1);

        const scanlineOverlay = this.add.graphics();
        scanlineOverlay.fillStyle(0x000000, 0.05);
        for (let y = 0; y < height; y += 4) {
            scanlineOverlay.fillRect(0, y, width, 2);
        }
        scanlineOverlay.setAlpha(0.22);

        this.add.image(cupX, cupY, 'cup_outline');
        this.fullCupImage = this.add.image(cupX, cupY, 'cup_coffee');

        this.coffeeMask = this.make.graphics({ x: cupX, y: cupY, add: false });
        this.coffeeMask.fillStyle(0xffffff, 1);
        this.updateCoffeeMask(0);

        const mask = this.coffeeMask.createGeometryMask();
        this.fullCupImage.setMask(mask);

        const titleText = this.add.text(centerX, centerY - 145, 'MAKING COFFEE 0%', {
            fontFamily: 'PressStart2P',
            fontSize: '20px',
            color: '#f4ebd9',
            align: 'center'
        }).setOrigin(0.5);

        const tipText = this.add.text(centerX, centerY + 452, this.getNextTip(tips), {
            fontFamily: 'PressStart2P',
            fontSize: '25px',
            color: '#f4ebd9',
            align: 'center',
            wordWrap: { width: width * 0.72 }
        }).setOrigin(0.5);

        this.tipTimer = this.time.addEvent({
            delay: 3200,
            loop: true,
            callback: () => {
                this.tweens.add({
                    targets: tipText,
                    alpha: 0,
                    y: tipText.y - 8,
                    duration: 180,
                    onComplete: () => {
                        tipText.setText(this.getNextTip(tips));
                        tipText.setY(centerY + 230);
                        this.tweens.add({
                            targets: tipText,
                            alpha: 1,
                            y: centerY + 222,
                            duration: 220,
                            ease: 'Quad.out'
                        });
                    }
                });
            }
        });

        let dots = '';
        this.dotsTimer = this.time.addEvent({
            delay: 350,
            loop: true,
            callback: () => {
                dots = dots.length >= 3 ? '' : `${dots}.`;
                const percent = Math.round(this.fillingLevel * 100);
                titleText.setText(`MAKING COFFEE${dots} ${percent}%`);
            }
        });

        this.load.on('progress', (value) => {
            this.fillingLevel = value;
            this.updateCoffeeMask(value);
            const percent = Math.round(value * 100);
            titleText.setText(`MAKING COFFEE${dots} ${percent}%`);
        });

        this.load.once('complete', () => {
            this.fillingLevel = 1;
            this.updateCoffeeMask(1);

            if (this.tipTimer) {
                this.tipTimer.remove(false);
                this.tipTimer = null;
            }

            if (this.dotsTimer) {
                this.dotsTimer.remove(false);
                this.dotsTimer = null;
            }

            this.tweens.add({
                targets: [titleText, tipText, shadow, vignetteTop, vignetteBottom, scanlineOverlay],
                alpha: 0,
                duration: 650,
                ease: 'Quad.out',
                onComplete: () => {
                    titleText.destroy();
                    tipText.destroy();
                    shadow.destroy();
                    vignetteTop.destroy();
                    vignetteBottom.destroy();
                    scanlineOverlay.destroy();
                    this.loadingReady = true;
                    this.tryShowStartButton();
                }
            });
        });
    }

    create() {
        super.create();
        audioManager.init(this);
EventBus.emit('hideHUD');
        const initUi = () => {
            this.uiReady = true;
            this.tryShowStartButton();
        };

        if (window.WebFont && typeof window.WebFont.load === 'function') {
            window.WebFont.load({
                google: {
                    families: ['SpecialElite', 'PressStart2P']
                },
                active: () => initUi(),
                inactive: () => {
                    console.warn('WebFont failed to load, continuing with fallback fonts.');
                    initUi();
                }
            });
        } else {
            console.warn('WebFont is not available, continuing with fallback fonts.');
            initUi();
        }

        const bootAudio = () => {
            if (this.audioArmed) return;
            this.audioArmed = true;
            this.sound.unlock?.();
        };

        if (this.sound.locked) {
            this.input.once('pointerdown', bootAudio);
            this.input.once('keydown', bootAudio);
        } else {
            bootAudio();
        }
    }

    tryShowStartButton() {
        if (!this.loadingReady || !this.uiReady || this.startBtn) return;

        const { width, height } = this.scale;
        this.startBtn = this.add.image(width / 2, height * 0.8, 'btnStart')
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(this.startBtn, 0.8, 0.9);

        this.startBtn.on('pointerdown', async () => {
            const mobileFS = this.registry.get('mobileFS');
            if (mobileFS) {
                await mobileFS.enterFullscreenLandscape();
            }

            this.startThemeMusic();
            this.scene.start('EnterScene');
        });
    }

    startThemeMusic() {
        if (audioManager.isMusicPlaying('themeMusic')) return;
        audioManager.fadeInMusic('themeMusic', { loop: true }, 600);
    }

    getNextTip(tips) {
        if (!tips || tips.length === 0) return '';

        let nextIndex = Phaser.Math.Between(0, tips.length - 1);

        if (tips.length > 1) {
            while (nextIndex === this.tipIndex) {
                nextIndex = Phaser.Math.Between(0, tips.length - 1);
            }
        }

        this.tipIndex = nextIndex;
        return tips[nextIndex];
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
preloadNewspapers() {
  for (const [type, config] of Object.entries(NEWSPAPER_CONFIG)) {
    for (const cityId of config.cities) {
      this.load.json(
        `newspaper_${type}_${cityId}`,
        `assets/data/newspapers/${type}/${cityId}.json`
      );
    }
  }
}
    createCoffeeTextures() {
        if (this.textures.exists('cup_coffee') && this.textures.exists('cup_outline')) return;

        const gOutline = this.make.graphics({ x: 0, y: 0, add: false });

        gOutline.fillStyle(0xffffff, 0.08);
        gOutline.fillRoundedRect(10, 10, 80, 90, { tl: 6, tr: 6, bl: 24, br: 24 });

        gOutline.lineStyle(4, 0xe2f1f8, 0.5);
        gOutline.strokeCircle(95, 55, 17);
        gOutline.lineStyle(2, 0xffffff, 0.8);
        gOutline.strokeCircle(94, 53, 15);

        gOutline.lineStyle(3, 0xd8ecf8, 0.75);
        gOutline.strokeRoundedRect(10, 10, 80, 90, { tl: 6, tr: 6, bl: 24, br: 24 });

        gOutline.lineStyle(2, 0xffffff, 0.9);
        gOutline.strokeRoundedRect(10, 8, 80, 8, 4);

        gOutline.fillStyle(0xffffff, 0.35);
        gOutline.fillRoundedRect(16, 18, 5, 72, 2);
        gOutline.fillStyle(0xffffff, 0.2);
        gOutline.fillRoundedRect(82, 60, 3, 30, 1);

        gOutline.generateTexture('cup_outline', 125, 110);
        gOutline.destroy();

        const gCoffee = this.make.graphics({ x: 0, y: 0, add: false });

        gCoffee.fillStyle(0x3d2314, 0.95);
        gCoffee.fillRoundedRect(14, 20, 72, 78, { tl: 2, tr: 2, bl: 20, br: 20 });

        gCoffee.fillStyle(0x5a351e, 0.9);
        gCoffee.fillRect(14, 20, 72, 35);

        gCoffee.fillStyle(0xd7a15c, 1);
        gCoffee.fillRoundedRect(14, 18, 72, 10, 5);

        gCoffee.fillStyle(0xf7e8d3, 0.9);
        gCoffee.fillRoundedRect(30, 19, 40, 6, 3);

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